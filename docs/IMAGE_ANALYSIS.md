# PropertyVision — Image Upload & Analysis Deep Dive

This document follows one photo from the agent's file picker to the list of features Claude returns. It covers every step in the pipeline, the reason behind each design choice, and the edge cases a rebuild needs to handle.

Companion to `PROJECT_HANDOVER.md`, which covers the whole app.

---

## 1. Pipeline overview

```
 BROWSER                                                         SERVER (Route Handler)                ANTHROPIC API
 ───────                                                         ──────────────────────                ─────────────
 <input type=file multiple>
        │ FileList
        ▼
 [A] Validate each file (≤5 MB, image/*)  ──reject──► error Dialog
        │ valid File[]
        ▼
 [B] For each file, in parallel:
       preview = URL.createObjectURL(file)
       base64  = compressImage(file)  ── resize ≤1568px, JPEG q0.85
        │ ImageData[]
        ▼
 [C] Merge into state (cap 40, total ≤150 MB, auto-select first 20 on first upload)
        │
        ▼
 [D] Agent toggles selection (max 20), removes images
        │
        ▼  click "Generate"
 [E] POST /api/analyze-property
     { images: [{data, mediaType}] (selected only), propertyDetails }
                                                   ───────────►  [F] content-length ≤150 MB? else 413
                                                                 [G] Zod validate (1–20 images, media types) else 400
                                                                 [H] Build vision request:
                                                                     system (cached) +
                                                                     [instruction text (cached),
                                                                      image₁ … imageₙ (last cached)]
                                                                                              ────────►  [I] model fallback × retry
                                                                                              ◄────────      Claude returns text
                                                                 [J] extractJson → JSON.parse → Zod
                                                                     → IdentifiedFeature[]
                                                                 [K] features → copywriting call (text only)
                                                   ◄───────────  200 { features, descriptions }
 [L] Render features + descriptions
```

Relevant files:

| Step | File | Symbol |
|---|---|---|
| A–D | `components/property-upload.tsx` | `handleFileChange`, `toggleSelection`, `selectAll`, `deselectAll`, `removeImage` |
| B | `lib/utils.ts` | `compressImage` |
| E | `app/demo/page.tsx` | `handleGenerate` |
| F–K | `app/api/analyze-property/route.ts` | `POST`, `RequestBodySchema`, `analyzeImages`, `createClaudeMessage`, `callClaudeWithRetry`, `extractJson`, `FeaturesArraySchema` |
| Limits | `lib/constants.ts` | `MAX_IMAGES`, `MAX_IMAGES_FOR_ANALYSIS`, `MAX_IMAGE_SIZE`, `MAX_TOTAL_SIZE` |
| Types | `lib/types.ts` | `ImageData`, `IdentifiedFeature` |

---

## 2. Limits at a glance

| Limit | Value | Enforced where | Measured against |
|---|---|---|---|
| Per-file size | 5 MB (`MAX_IMAGE_SIZE`) | Client, before compression | Original `file.size` |
| Images held in the UI | 40 (`MAX_IMAGES`) | Client (`.slice(0, 40)`) | Count |
| Total size in the UI | 150 MB (`MAX_TOTAL_SIZE`) | Client | Sum of **original** sizes |
| Images sent for analysis | 20 (`MAX_IMAGES_FOR_ANALYSIS`) | Client selection logic **and** server Zod `.max(20)` | Count |
| Minimum images per request | 1 | Client (button disabled) **and** server Zod `.min(1)` | Count |
| Request body size | 150 MB | Server, best effort via the `content-length` header | Bytes on the wire |
| Allowed media types | jpeg, png, gif, webp | Server Zod enum | `mediaType` string |
| Resize target | Longest edge ≤ 1568 px | Client `compressImage` | Pixels |

Why there are two image limits (40 uploaded, 20 analysed): an agent usually has more photos than are useful to analyse. Keeping 40 in the UI lets them upload a whole shoot and then choose the 20 most informative shots. That keeps the cost and latency of the vision call bounded.

---

## 3. Client side

### 3.1 The `ImageData` record

Each uploaded image is stored in React state (in `app/demo/page.tsx`, passed down to `PropertyUpload`) as:

```ts
interface ImageData {
  file: File;         // original File, kept but never sent
  preview: string;    // blob: object URL of the ORIGINAL file, used for <img src>
  base64: string;     // compressed JPEG, raw base64 with NO "data:image/jpeg;base64," prefix
  mediaType: string;  // always 'image/jpeg' (compression re-encodes everything as JPEG)
  size: number;       // ORIGINAL file.size in bytes, used for the MB badge and limit checks
  selected: boolean;  // true means it is included in the API request
}
```

**Design choice: compress when the file is uploaded, not when Generate is clicked.** The base64 string is computed as soon as each file is added. Clicking Generate then only has to map the selected images, with no waiting on encoding. The trade-off is memory: a compressed string for every one of the 40 images (about 300–500 KB of base64 each) is held in state, which is roughly 20 MB at most. That is acceptable.

**Why preview the original rather than the compressed version:** creating an object URL is instant and costs no extra memory. The thumbnails are only 128 px tall, so using the full-resolution original makes no visible difference.

### 3.2 Step A: picking and validating files

The drop zone is a `<div>` that calls `fileInputRef.current?.click()` on a hidden input:

```html
<input type="file" multiple accept="image/*" class="hidden" onChange={handleFileChange} />
```

`handleFileChange` turns `e.target.files` into an array and filters it:

```ts
const validFiles = files.filter((file) => {
  if (file.size > MAX_IMAGE_SIZE) { errorToShow = { title: 'File Too Large', … }; return false; }
  if (!file.type.startsWith('image/')) { errorToShow = { title: 'Invalid File Type', … }; return false; }
  return true;
});
if (errorToShow) setTimeout(() => showError(errorToShow!.title, errorToShow!.message), 0);
```

Details:
- The size check runs **before** the type check, so a 6 MB PDF is reported as "too large", not as "invalid type".
- Only the **last** error found is shown, because `errorToShow` is overwritten each time. If three files fail, the agent sees one message.
- Invalid files are dropped silently apart from that one message. The valid files in the same batch still go through.
- The error is shown in a shadcn `Dialog` (`errorModal` state), not in the page-level error banner.
- `accept="image/*"` is only a hint to the OS picker. The `file.type` check is the real client-side guard.

### 3.3 Step B: compression (`compressImage` in `lib/utils.ts`)

```ts
export async function compressImage(file: File): Promise<string> {
  const MAX_DIMENSION = 1568;
  const JPEG_QUALITY = 0.85;

  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);

      let { width, height } = img;
      if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
        const scale = MAX_DIMENSION / Math.max(width, height);
        width = Math.round(width * scale);
        height = Math.round(height * scale);
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) { reject(new Error('Failed to get canvas context')); return; }

      ctx.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL('image/jpeg', JPEG_QUALITY).split(',')[1]);
    };

    img.onerror = () => { URL.revokeObjectURL(objectUrl); reject(new Error('Failed to load image')); };
    img.src = objectUrl;
  });
}
```

Step by step:

1. **Decode.** The browser decodes the file through an `<img>` element loaded from a temporary object URL. That URL is revoked straight after load or error, so it doesn't leak.
2. **Scale.** If either dimension is over 1568 px, the image is scaled so the **longest** edge is exactly 1568, keeping its aspect ratio. Smaller images are never upscaled. For example:
   - 4032×3024 (12 MP phone photo) becomes 1568×1176
   - 6000×4000 (DSLR) becomes 1568×1045
   - 1200×800 stays 1200×800
3. **Re-encode.** The image is drawn to an off-screen canvas and exported as JPEG at quality 0.85. The `data:image/jpeg;base64,` prefix is removed with `.split(',')[1]` because the Anthropic API expects raw base64.

**Why 1568 px?** It matches Anthropic's vision guidance: images whose long edge is over about 1568 px are downscaled by the API anyway, so sending more pixels only adds upload time. The API also caps images by total pixel count (about 1.15 megapixels at the time of writing). A 1568×1176 image is about 1.84 MP, so the API still downscales it a little on its side. If you want to remove that server-side resize completely, target about 1.15 MP instead, for example `scale = Math.min(1, Math.sqrt(1_150_000 / (w*h)), 1568 / Math.max(w,h))`. Check Anthropic's current vision docs, because newer models may accept higher resolutions.

**Why JPEG at 0.85?** Property photos are photographic, which is exactly what JPEG handles well, and 0.85 shows no artefacts a vision model would notice. A typical 3–5 MB phone photo shrinks to about **200–400 KB**, a reduction of roughly 90% or more. Base64 then adds about 33%, so each image is about 270–530 KB in the JSON body. Twenty images come to roughly 5–11 MB per request, well below the Messages API's request size limit.

**Side effects of re-encoding to JPEG:**
- **All images become JPEG.** This is why `mediaType` is hard-coded to `'image/jpeg'` in `handleFileChange`, whatever the original format.
- **Transparency is lost.** Transparent pixels in PNG or WebP become **black** in the JPEG output, because the canvas starts transparent and JPEG has no alpha channel. Property photos almost never have transparency, but a floor-plan PNG with a transparent background would become black-on-black. To fix this, fill the canvas white before drawing: `ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, width, height);`.
- **Animated GIFs** keep only their first frame.
- **EXIF orientation** is honoured by modern browsers when drawing an `<img>` to a canvas (the default `image-orientation: from-image`), so portrait phone photos come out upright. EXIF metadata such as GPS location is **removed** by re-encoding, which is a small privacy benefit.

**Unused helpers:** `lib/utils.ts` also exports `fileToBase64` (FileReader, no resizing) and `getImageMediaType` (guesses the media type from the file extension). Nothing calls them. They date from before compression was added and could be deleted.

### 3.4 Step C: merging into state

All valid files are compressed **in parallel**:

```ts
const convertedFiles = await Promise.all(validFiles.map(async (file) => ({
  file,
  preview: URL.createObjectURL(file),
  base64: await compressImage(file),
  mediaType: 'image/jpeg',
  size: file.size,
  selected: false,
})));
```

Then a functional state update merges them into the existing list:

```ts
setImages((prevImages) => {
  const newImages = [...prevImages, ...convertedFiles].slice(0, MAX_IMAGES);   // cap at 40

  const newTotalSize = newImages.reduce((t, img) => t + img.size, 0);
  if (newTotalSize > MAX_TOTAL_SIZE) {                                        // 150 MB of ORIGINAL sizes
    setTimeout(() => showError('Total Size Exceeded', …), 0);
    return prevImages;                                                        // reject the WHOLE batch
  }

  if (prevImages.length === 0) {                                              // first upload only
    return newImages.map((img, idx) => ({ ...img, selected: idx < MAX_IMAGES_FOR_ANALYSIS }));
  }
  return newImages;
});
```

Behaviour to be aware of:
- **Files past the 40th are dropped silently** by `.slice`, with no message.
- **The size check is all or nothing.** If the batch would push the total over 150 MB, none of the batch is added.
- **Auto-selection only happens on the first upload.** The first 20 images are pre-selected. Images added in later batches arrive **unselected**, so the agent has to tick them.
- **Error dialogs go through `setTimeout(…, 0)`.** Calling `setErrorModal` inside another state updater would mean setting state during the update, so it is deferred to the next tick. In React Strict Mode (development only) updaters run twice, so the dialog may be triggered twice. That is harmless because the second call sets the same state.
- Because the pixels are compressed, the 150 MB total can never really be reached with 40 × 5 MB files (the most is 200 MB of originals). The check is essentially a ceiling on originals, not on what is sent. See §6.

### 3.5 Step D: selection and removal

**Toggle** (click a thumbnail):

```ts
if (!isCurrentlySelected && currentSelected >= MAX_IMAGES_FOR_ANALYSIS) {
  setTimeout(() => showError('Selection Limit Reached', …), 0);
  return prevImages;
}
newImages[index] = { ...newImages[index], selected: !isCurrentlySelected };
```

- **"Select First 20"** sets `selected = idx < 20` for every image. This means it selects the first 20 **by position**, which *replaces* any custom selection.
- **"Deselect All"** clears every selection.
- **Remove (×)** revokes that image's preview object URL and filters it out. `e.stopPropagation()` stops the click from also toggling selection.
- **"Create Another"** in the demo page revokes every preview URL before clearing state.

**Visual state per thumbnail:**
- Selected: `ring-4 ring-primary` border, a check icon in the top left and a "For AI" badge in the bottom right.
- Always: the original file size in MB in the bottom left.

The counter shows `{selected} of 20 photos selected for AI analysis` and `{n} total photos uploaded`. The total size line turns red if it goes over the limit.

### 3.6 Step E: sending the request

In `app/demo/page.tsx` → `handleGenerate`:

```ts
const selectedImages = images.filter((img) => img.selected);
if (selectedImages.length === 0) { setError('Please select at least one photo for AI analysis'); return; }

const imageData = selectedImages.map((img) => ({ data: img.base64, mediaType: img.mediaType }));

await fetch('/api/analyze-property', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ images: imageData, propertyDetails }),
});
```

- **Only selected images are sent.** `file`, `preview`, `size` and `selected` stay in the browser.
- **Order is kept.** Images are sent in grid order, which is also the order Claude sees them in.
- The payload is plain JSON, not `multipart/form-data`. That keeps the handler simple (`req.json()`), at the cost of the 33% base64 overhead.
- **Loading state:** `loading = true` shows the `LoadingState` overlay and disables the button.
- **Error handling:** any non-2xx response becomes the generic message "Failed to analyze property". The server's error body is not read.

---

## 4. Server side

### 4.1 Step F: size guard

```ts
const contentLength = req.headers.get('content-length');
if (contentLength && parseInt(contentLength) > MAX_TOTAL_SIZE) {
  return NextResponse.json({ error: 'Request too large' }, { status: 413 });
}
```

This is **best effort** only. The header can be missing (chunked encoding) or wrong. App Router Route Handlers have no built-in body size setting, and `export const config = { api: { bodyParser } }` is a Pages Router pattern that App Router silently ignores. Real limits must be set by the hosting platform (Vercel's function payload limit, nginx `client_max_body_size`, and so on).

> On Vercel, serverless function request bodies are capped at about 4.5 MB. Ten or more compressed images will go over that, so check the limit on the platform you deploy to, or switch to uploading images directly to object storage and sending URLs.

### 4.2 Step G: request validation

```ts
const RequestBodySchema = z.object({
  images: z.array(z.object({
    data: z.string().min(1),
    mediaType: z.enum(['image/jpeg', 'image/png', 'image/gif', 'image/webp']),
  })).min(1).max(20),
  propertyDetails: z.object({ … }),
});

const parseResult = RequestBodySchema.safeParse(body);
if (!parseResult.success) {
  return NextResponse.json({ error: 'Invalid request', details: parseResult.error.flatten() }, { status: 400 });
}
```

- **The 20-image cap is enforced again on the server,** so a modified client can't send 100 images.
- **`mediaType` is restricted** to the four formats the Anthropic API accepts. HEIC, TIFF and others are rejected with a 400, not passed on to the API.
- **`data` is not checked as valid base64** or checked against its declared type. A bad payload is caught later, when the Anthropic API returns a 400, which the route maps to a generic 500. A stricter rebuild could add `.regex(/^[A-Za-z0-9+/]+=*$/)` and a per-image maximum length. The API itself rejects any image over 5 MB.

### 4.3 Step H: building the vision request (`analyzeImages`)

The Messages API request has this shape:

```ts
{
  model,                        // injected by createClaudeMessage (fallback loop)
  max_tokens: 4096,             // VISION_MAX_TOKENS: room for 15–30 features as JSON
  system: [
    { type: 'text', text: <analyst persona>, cache_control: { type: 'ephemeral' } },
  ],
  messages: [{
    role: 'user',
    content: [
      { type: 'text', text: <task/instructions/output_format/examples>, cache_control: { type: 'ephemeral' } },
      { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: '<img 1>' } },
      { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: '<img 2>' } },
      …
      { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: '<img N>' },
        cache_control: { type: 'ephemeral' } },          // ← only on the LAST image
    ],
  }],
}
```

The code that builds the image blocks:

```ts
...images.map((img, i) => ({
  type: 'image' as const,
  source: {
    type: 'base64' as const,
    media_type: img.mediaType as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp',
    data: img.data,
  },
  ...(i === images.length - 1 ? { cache_control: { type: 'ephemeral' as const } } : {}),
})),
```

**Why this order and these cache points:**

- **Instructions come first, before the images.** The text block is fixed and identical on every request, so it caches well. Anthropic's general guidance is to put images *before* the question for best results, so putting the images first is worth testing in a rebuild. Doing that would change which prefix gets cached.
- **Cache breakpoints.** A `cache_control` marker caches the **whole prompt prefix up to and including** that block. There are three markers:
  1. **The system prompt,** which is identical on every request and is always a cache hit after the first request within 5 minutes.
  2. **The instruction text,** so the system prompt plus the instructions (also fixed) are cached together.
  3. **The last image,** which caches the system prompt, the instructions and **all the images**. This only gives a cache hit if the *same images in the same order* are sent again within 5 minutes, for example when the agent retries after an error. Otherwise it is a cache *write*, which costs slightly more than normal input tokens.

  That is 3 of the 4 breakpoints allowed per request.
  
  **Caveat:** prompt caching only applies once a prefix reaches a minimum length (about 1024–4096 tokens depending on the model). The system prompt plus instructions alone are far below that, so breakpoints 1 and 2 probably never create a cache entry on their own. Breakpoint 3, with the images included, easily goes over the minimum. You can check this with `usage.cache_creation_input_tokens` and `usage.cache_read_input_tokens` on the response. The code doesn't log these at present, and adding that logging would be worth doing.
- **Typing.** Because content blocks carry `cache_control`, `messages` is typed as `PromptCachingBetaMessageParam[]` (from `@anthropic-ai/sdk/resources/beta/prompt-caching/messages`). With SDK 0.32.1, the standard `MessageParam` rejects the extra field.
- **Images are not labelled.** Claude receives N unlabelled images. It is not told "Image 1: kitchen" and cannot refer to images by number. If you want features linked back to specific photos, add a text block such as `Image 3:` before each image and ask for an `imageIndex` field in the output.
- **The `mediaType` cast** is safe because Zod has already narrowed the value to that union. The `analyzeImages` signature just takes `string`.

**The prompts** (quoted in full in `PROJECT_HANDOVER.md` §7.5):
- **The system prompt** sets the persona: a UK property analyst looking for buyer-relevant features, such as period details, modern improvements, outdoor space, character features and condition. It asks for specifics: colours, materials, details.
- **The user text** is XML-structured with `<task>`, `<instructions>` (5 categories, plus a feature name and a specific detail for each), `<output_format>` (JSON array only, no markdown) and `<examples>` (4 sample features). The examples anchor both the JSON format and the level of detail expected, such as "Indian sandstone patio" rather than "nice patio".

### 4.4 Step I: calling the API with fallback and retry

```
createClaudeMessage
  for model in ['claude-opus-4-7', 'claude-sonnet-4-6', 'claude-haiku-4-5-20251001']:
     callClaudeWithRetry(() => anthropic.messages.create({ model, ...params }))
         attempt 1 ── 529/500/503 ──► wait 1s
         attempt 2 ── 529/500/503 ──► wait 2s
         attempt 3 ── any error ──► throw
     on NotFoundError (404 model unavailable) → try next model
     on any other error                       → throw immediately
```

- **What is retried:** only 529 (overloaded), 500 and 503.
- **What is not retried:**
  - 400s: bad image, too large, invalid request
  - 401 (bad key)
  - 429 (rate limited). In a rebuild, adding 429 and reading its `retry-after` header is worth doing.
- **Only a missing model triggers fallback.** An overloaded Opus does **not** fall back to Sonnet. It retries Opus three times and then fails.
- **Worst-case time for the vision call:** 3 attempts × (model latency) + 3 s of backoff. The SDK also has its own default retries (2) and timeout (10 min) underneath this wrapper, so a stuck request can take much longer. Set `timeout` and `maxRetries` on the `Anthropic` client if you need tighter limits.
- **Parameters that are not sent:** no `temperature` (Claude 4.x returns a 400) and no assistant prefill (also a 400).

### 4.5 Step J: parsing and validating the response

```ts
const rawText = message.content[0].type === 'text' ? message.content[0].text : '';
const text = extractJson(rawText);                    // strip ```json fences if present

try {
  const parsed = JSON.parse(text);
  return FeaturesArraySchema.parse(parsed);           // z.array({ feature: min(1), detail: min(1) })
} catch (error: unknown) {
  console.error('❌ Vision analysis parse failed:', …);
  console.error('Raw response preview:', text.substring(0, 500));
  throw new Error('Vision analysis returned malformed output. Please try again.');
}
```

- **Only `content[0]` is read.** If the model ever returned more than one text block, the rest would be ignored.
- **`extractJson`** handles the most common failure, where the model wraps the JSON in a Markdown fence despite being told not to. Its regex is anchored with `^…$`, so it only removes a fence around the **whole** response. A response with a preamble (`Here are the features:\n```json …`) would not match, and `JSON.parse` would fail. A more robust version would find the first `[` and the last `]`.
- **`stop_reason` is not checked.** If `max_tokens` (4096) is reached with many images, the JSON is cut off and the parse fails with a generic 500. Logging or handling `message.stop_reason === 'max_tokens'` would make this easier to diagnose.
- **An empty array `[]` is valid.** The copywriting prompt then says "No specific features identified from photos".
- **Validation errors are logged on the server only.** The client gets `{ error: 'Failed to analyze property. Please try again.' }` with status 500.

### 4.6 Step K: handing features to the copywriting call

The validated `IdentifiedFeature[]` is:
1. turned into bullet points (`- ${f.feature}: ${f.detail}`) inside a `<features_identified>` block in the text-only copywriting prompt
2. returned unchanged to the client in the response as `features`

No images are sent to the second call, which keeps it cheap.

### 4.7 Example output

For 8 photos of a Victorian semi, the vision step typically returns 10–15 items like these:

```json
[
  { "feature": "Period Features", "detail": "Original cast-iron fireplace with tiled inserts and timber surround in the front reception" },
  { "feature": "Bay Window", "detail": "Full-height square bay with replacement sash-style double glazing flooding the lounge with light" },
  { "feature": "Kitchen", "detail": "Shaker-style units in sage green with oak butcher-block worktops and a Belfast sink" },
  { "feature": "Rear Garden", "detail": "Lawned garden with a paved patio, timber fencing and a garden shed" }
]
```

---

## 5. Cost and performance

**Tokens:** Anthropic estimates image tokens as roughly `(width × height) / 750`, after any server-side downscaling. With the API's ~1.15 MP cap, each image costs at most about **1,500–1,600 input tokens**:

| Images | Approx. image tokens | + prompt text | Approx. vision input |
|---|---|---|---|
| 1 | ~1.6k | ~0.6k | ~2.2k |
| 8 | ~12.5k | ~0.6k | ~13k |
| 20 | ~31k | ~0.6k | ~32k |

Output is usually 800–2,000 tokens of JSON. Multiply by the current per-model prices for Opus, Sonnet or Haiku. The fallback order puts the **most expensive** model first, so choose the order deliberately.

**Latency:** Uploading the payload is fast because of client-side compression. The vision call dominates the total time (roughly 10–25 s for 8–20 images on Opus), followed by the copywriting call (roughly 5–10 s). The two calls run in sequence, so the UI's "15–30 seconds" note is realistic for a typical request.

**Browser memory:** compression runs `Promise.all` across the whole batch, so 40 large photos are decoded at the same time. On low-memory mobile devices this can cause a noticeable pause or a tab crash. Limiting concurrency (for example, 4 at a time) would fix this.

---

## 6. Known issues and recommended fixes

| # | Issue | Impact | Fix |
|---|---|---|---|
| 1 | **Drag and drop isn't implemented**, though the UI says "Click to upload or drag and drop" | Dropping files does nothing (the browser may open the image instead) | Add `onDragOver={e => e.preventDefault()}` and `onDrop` that sends `e.dataTransfer.files` through the same path as `handleFileChange` |
| 2 | **No try/catch around `Promise.all(compressImage…)`** | A single file the browser can't decode (e.g. **HEIC** in Chrome/Firefox, where `file.type` is `image/heic` and passes the `image/*` check) rejects the whole batch. That is an unhandled rejection: nothing is added and no message is shown | Use `Promise.allSettled`, keep the successful files and report the failed ones in the dialog |
| 3 | **The file input isn't reset** after selection | Choosing the same file again (for example, after removing it) doesn't fire `onChange` | Set `e.target.value = ''` at the end of `handleFileChange` |
| 4 | **Limits are measured against original sizes**, not the compressed payload | The 150 MB total limit has little to do with actual request size | Track `compressedSize = base64.length * 0.75` and enforce limits on that, or drop the total check, since the 20-image cap already bounds the payload |
| 5 | **Only the last validation error is shown**; files over 40 are dropped silently | The agent doesn't know why some photos are missing | Collect all errors and list them in the dialog, and report how many were dropped by the cap |
| 6 | **Array index used as the React `key`** for thumbnails | Removing an image can briefly show the wrong image in a transition | Give each `ImageData` an `id` (`crypto.randomUUID()`) and use it as the key |
| 7 | **"Select First 20" replaces a custom selection** | Surprising if the agent has hand-picked photos | Rename it, or make it "select up to 20 including current selections" |
| 8 | **Transparent PNG/WebP turns black** | Floor plans or logos come out unreadable | Fill the canvas white before `drawImage` |
| 9 | **Resize target (1568 long edge) is above the API's ~1.15 MP cap** | The API still downscales a little, so a few hundred KB per image are uploaded for nothing | Scale to fit both the 1568 edge and ~1.15 MP |
| 10 | **Images are unlabelled in the prompt** | Features can't be traced back to a photo | Add an `Image n:` text block before each image, and ask for `imageIndex` in the output |
| 11 | **`extractJson` only handles a fence wrapping the whole response** | A preamble before the fence causes a parse failure and a 500 | Fall back to slicing from the first `[` to the last `]` |
| 12 | **`stop_reason` is not checked** | Truncated JSON shows up as a generic "malformed output" | Log it and throw a specific error when `stop_reason === 'max_tokens'`, or raise `VISION_MAX_TOKENS` |
| 13 | **Cache effectiveness is never measured** | No way to tell whether caching saves anything | Log `message.usage` (including cache read and write tokens) |
| 14 | **The host's body limit may be lower than the payload** (e.g. about 4.5 MB on Vercel serverless) | Large selections fail at the platform level before the handler runs | Check the platform limits, or upload to object storage and send URLs (`source: { type: 'url', url }`) instead of base64 |
| 15 | **Unused helpers** `fileToBase64` and `getImageMediaType` | Dead code | Delete them |

---

## 7. Minimal reimplementation checklist

1. `<input type="file" multiple accept="image/*">` with a click-to-open drop zone, plus drag and drop.
2. Per file: reject anything over 5 MB or not `image/*`. Create an object URL for the preview. Resize to fit 1568 px / ~1.15 MP on a canvas, filled white first. Export as JPEG at q0.85 and remove the `data:` prefix.
3. Store `{ id, file, preview, base64, mediaType: 'image/jpeg', size, selected }`. Cap the list at 40. Auto-select the first 20 on the first upload. Enforce the 20-image selection limit.
4. Revoke object URLs when images are removed or the form is reset.
5. POST `{ images: selected.map(i => ({ data: i.base64, mediaType: i.mediaType })), propertyDetails }` as JSON.
6. Server: check `content-length`, then Zod-validate (1–20 images, 4 allowed media types).
7. Build the Messages request: a cached system prompt, then a cached instruction text block, then the image blocks with `cache_control` on the last one. Set `max_tokens` to 4096 and send no `temperature` or prefill.
8. Wrap the call in a model fallback (on 404) and a retry with backoff (on 529/500/503).
9. Run `content[0].text`, then `extractJson`, `JSON.parse` and the Zod `z.array({ feature, detail })` check. On failure, log the raw preview on the server and return a generic 500.
10. Pass the features to the text-only copywriting call and return `{ features, descriptions }`.
