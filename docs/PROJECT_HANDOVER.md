# PropertyVision — Technical Handover

A complete description of PropertyVision, detailed enough to rebuild it from scratch.

---

## 1. What it does

PropertyVision is a single-page web app for **UK estate agents**. The agent:

1. **Uploads property photos.** Up to 40 can be uploaded, and up to 20 of those are selected for AI analysis.
2. **Fills in property details:** address, price, type, bedrooms, bathrooms, target buyer and optional extra notes.
3. **Clicks Generate.** The server makes **two Claude API calls in sequence**:
   - **Vision analysis:** Claude looks at the photos and returns a list of notable features (`{ feature, detail }[]`).
   - **Copywriting:** Claude combines those features with the form details and writes three marketing descriptions:
     - **Rightmove:** 800–1000 characters, professional
     - **Zoopla:** 600–800 characters, conversational
     - **Social media:** 150–200 characters, punchy, with 1–2 emojis and a call to action
4. **Reviews the results.** The app shows the identified features and the three descriptions, each with a character count and a Copy button.

There is no database, no authentication and no persistence. Each request stands alone.

---

## 2. Tech stack

| Concern | Choice | Version |
|---|---|---|
| Framework | Next.js App Router | 15.5.x |
| Language | TypeScript, `strict: true` | 5.x |
| UI runtime | React | 19 |
| Styling | Tailwind CSS v3 + `tailwindcss-animate` | 3.4.x |
| Components | shadcn/ui (Radix Dialog, Slot), `class-variance-authority`, `clsx`, `tailwind-merge` | — |
| Icons | `lucide-react` | 0.468 |
| AI | `@anthropic-ai/sdk` | 0.32.1 |
| Validation | `zod` | 4.x |
| Font | Sora from `next/font/google` (weights 400/500/600/700) | — |
| Dev env | Devcontainer `mcr.microsoft.com/devcontainers/javascript-node:20` | Node 20 |

`package.json` also pins `postcss` to `8.5.15` for Next.js through `overrides`.

### Scripts

```bash
npm run dev        # next dev on port 3000
npm run build      # next build
npm run start      # next start
npm run typecheck  # tsc --noEmit (run after any back-end change)
```

ESLint is **not configured**. `npm run lint` starts an interactive setup.

### Environment

`.env.local`:

```bash
ANTHROPIC_API_KEY=sk-ant-...          # required. lib/claude.ts throws at import time if it's missing
CLAUDE_MODEL=claude-opus-4-7          # listed in the example file but NOT read by the code
NEXT_PUBLIC_APP_URL=http://localhost:3000   # listed but not used
```

### `tsconfig.json` essentials

- `strict: true`, `moduleResolution: "bundler"`, `jsx: "preserve"`, `noEmit: true`
- Path alias: `"@/*": ["./*"]` (the project root, with no `src/` folder)
- `global.d.ts` declares `*.css`, `*.scss` and `*.sass` modules

---

## 3. File structure

```
app/
  layout.tsx                      # Root layout: Sora font, metadata, imports globals.css
  page.tsx                        # redirect('/demo')
  demo/page.tsx                   # 'use client': the whole app UI and state
  globals.css                     # Tailwind layers + HSL CSS variable theme (light + .dark)
  api/analyze-property/route.ts   # The only API route: validate → vision → copywriting
components/
  property-upload.tsx             # Upload, compress, select/deselect, remove, error dialog
  property-form.tsx               # Controlled form for PropertyDetails
  results-display.tsx             # Features grid + 3 description cards with copy
  loading-state.tsx               # Full-screen modal spinner shown while loading
  ui/                             # shadcn: button, card, dialog, input, label, select, textarea
lib/
  claude.ts                       # Anthropic client, model fallback list, token constants
  constants.ts                    # Dropdown options, limits, character limits
  types.ts                        # Shared interfaces
  utils.ts                        # cn(), formatBytes, formatPrice, fileToBase64, compressImage, getImageMediaType
docs/                             # This handover, IMAGE_ANALYSIS.md, OPTIMIZATION_GUIDE.md
components.json                   # shadcn config (style "radix-vega", baseColor neutral, RSC on, lucide)
tailwind.config.ts                # shadcn-style theme mapped to CSS variables
next.config.js                    # images.domains ['localhost']; nothing else
```

> **Note:** `components/ui/select.tsx` is **not** the Radix shadcn Select. It is a styled native `<select>` wrapped in `forwardRef`, so `<option>` children and plain `onChange` events work. Keep this if you want the form's single `handleChange` pattern to work.

---

## 4. Data model (`lib/types.ts`)

```ts
export interface PropertyDetails {
  address: string;
  bedrooms: number;          // 1–10
  bathrooms: number;         // 1–4
  propertyType: 'detached' | 'semi-detached' | 'terraced' | 'end-terrace' | 'bungalow'
    | 'cottage' | 'townhouse' | 'flat' | 'studio' | 'maisonette' | 'penthouse' | 'other';
  price: number;             // GBP, > 0
  keyFeatures?: string;      // free text, max 500 chars (enforced server-side)
  targetBuyer: 'first-time-buyer' | 'young-professional' | 'family' | 'upsizer'
    | 'downsizer' | 'retiree' | 'investor' | 'buy-to-let' | 'commuter';
}

export interface IdentifiedFeature { feature: string; detail: string; }

export interface GeneratedDescriptions { rightmove: string; zoopla: string; social: string; }

export interface AnalysisResult {
  features: IdentifiedFeature[];
  descriptions: GeneratedDescriptions;
}

// Client-only: one uploaded image
export interface ImageData {
  file: File;
  preview: string;    // object URL for <img src>
  base64: string;     // compressed JPEG, base64 without the data: prefix
  mediaType: string;  // always 'image/jpeg' after compression
  size: number;       // ORIGINAL file size in bytes (used for limit checks)
  selected: boolean;  // whether it's sent for AI analysis
}
```

## 5. Constants (`lib/constants.ts`)

```ts
PROPERTY_TYPES   // { value, label }[]: Detached House, Semi-Detached House, Terraced House,
                 // End of Terrace, Bungalow, Cottage, Townhouse, Flat/Apartment, Studio Flat,
                 // Maisonette, Penthouse, Other
TARGET_BUYERS    // First-Time Buyer, Young Professional, Family, Upsizer, Downsizer, Retiree,
                 // Investor, Buy-to-Let Landlord, Commuter
CHARACTER_LIMITS = { rightmove: 1000, zoopla: 800, social: 200 }  // display only
BEDROOM_OPTIONS  = [1..10]
BATHROOM_OPTIONS = [1..4]
MAX_IMAGES = 40                 // total uploadable
MAX_IMAGES_FOR_ANALYSIS = 20    // max sent to Claude (also the server-side max)
MAX_IMAGE_SIZE = 5 MB           // per original file
MAX_TOTAL_SIZE = 150 MB         // total of original files; also the server's content-length cap
```

---

## 6. API contract: `POST /api/analyze-property`

### Request (JSON)

```json
{
  "images": [
    { "data": "<base64 without data: prefix>", "mediaType": "image/jpeg" }
  ],
  "propertyDetails": {
    "address": "Stoneygate, Leicester",
    "price": 350000,
    "bedrooms": 3,
    "bathrooms": 2,
    "propertyType": "semi-detached",
    "targetBuyer": "family",
    "keyFeatures": "South-facing garden, off-street parking"
  }
}
```

It is validated with Zod (`RequestBodySchema`) using `safeParse`:

- `images`: 1–20 items. `data` is a non-empty string. `mediaType` is one of `image/jpeg | image/png | image/gif | image/webp`.
- `propertyDetails`: exactly the enums and ranges in section 4. `price` must be positive. `keyFeatures` is optional and at most 500 characters.

### Responses

| Status | When | Body |
|---|---|---|
| 200 | Success | `{ features: IdentifiedFeature[], descriptions: { rightmove, zoopla, social } }` |
| 400 | Zod validation failure | `{ error: 'Invalid request', details: <zodError.flatten()> }` |
| 413 | `content-length` header > 150 MB (best effort only) | `{ error: 'Request too large' }` |
| 503 | Every fallback model returned 404 / not found | `{ error: 'Service temporarily unavailable. Please try again.' }` |
| 500 | Anything else, including malformed Claude output | `{ error: 'Failed to analyze property. Please try again.' }` |

**Rule:** never return `error.message` to the client. Log it on the server and return a generic string.

### Request lifecycle

```
POST
 ├─ content-length > MAX_TOTAL_SIZE?  → 413
 ├─ req.json() → RequestBodySchema.safeParse → fail → 400
 ├─ analyzeImages(images)                     → IdentifiedFeature[]   (Claude call #1)
 ├─ generateDescriptions(details, features)   → {rightmove,zoopla,social} (Claude call #2)
 └─ 200 { features, descriptions }
 catch (error: unknown)
   ├─ NotFoundError (all models gone) → 503
   └─ else                            → 500
```

---

## 7. Claude integration: the core of the app

### 7.1 Client and config (`lib/claude.ts`)

```ts
import Anthropic from '@anthropic-ai/sdk';

if (!process.env.ANTHROPIC_API_KEY) {
  throw new Error('Missing ANTHROPIC_API_KEY environment variable');
}

export const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export const CLAUDE_MODEL_FALLBACKS = [
  'claude-opus-4-7',
  'claude-sonnet-4-6',
  'claude-haiku-4-5-20251001',
];

export const MAX_TOKENS = 2000;         // copywriting call
export const VISION_MAX_TOKENS = 4096;  // vision call
```

### 7.2 Model fallback + retry (in `route.ts`)

There are two nested layers:

1. **`createClaudeMessage(params)`** loops through `CLAUDE_MODEL_FALLBACKS`. It moves on to the next model **only** on `NotFoundError` (HTTP 404 / `not_found_error`, meaning the model ID isn't available). Any other error is rethrown immediately. If the last model also 404s, it rethrows, and the route maps that to 503.
2. **`callClaudeWithRetry(fn, maxRetries = 3)`** wraps each model attempt. It retries only on status **529 (overloaded), 500 or 503**, with exponential backoff of 1s, then 2s, then it throws.

```ts
async function callClaudeWithRetry<T>(fn: () => Promise<T>, maxRetries = 3): Promise<T> {
  for (let i = 0; i < maxRetries; i++) {
    try { return await fn(); }
    catch (error: unknown) {
      const status = (error as { status?: number })?.status;
      const retryable = status === 529 || status === 500 || status === 503;
      if (!retryable || i === maxRetries - 1) throw error;
      await new Promise(r => setTimeout(r, 2 ** i * 1000));
    }
  }
  throw new Error('Max retries exceeded');
}
```

The `messages` parameter is typed as `PromptCachingBetaMessageParam[]` (from `@anthropic-ai/sdk/resources/beta/prompt-caching/messages`). With SDK 0.32.1, the standard `MessageParam` type doesn't allow `cache_control` on content blocks, so the stricter type would fail `tsc`. The call itself is the normal `anthropic.messages.create({ model, ...params })`.

### 7.3 Critical API gotchas for Claude 4.x models

These were learned the hard way, and each one causes a 400 error or a parse failure:

- **Do NOT pass `temperature`.** It returns a 400 on the Claude 4.x models used here, so the code sends only `model`, `max_tokens`, `system` and `messages`. `docs/OPTIMIZATION_GUIDE.md` still mentions temperatures (0.3 / 0.7), which is **out of date**.
- **Do NOT use assistant prefill** (`{ role: 'assistant', content: '[' }`) to force JSON. The models reject it with a 400. `docs/OPTIMIZATION_GUIDE.md` still recommends prefill, which is **out of date**.
- **Claude may wrap JSON in ```` ```json ```` fences** even when told not to. Always strip them before `JSON.parse`:

```ts
function extractJson(text: string): string {
  const trimmed = text.trim();
  const match = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/);
  return match ? match[1] : trimmed;
}
```

- **Always validate the parsed output with Zod.** If parsing or validation fails, log the error and the first 500 characters of the raw output on the server, then throw a generic error (which becomes a 500).

```ts
const FeaturesArraySchema = z.array(z.object({
  feature: z.string().min(1),
  detail:  z.string().min(1),
}));

const DescriptionsSchema = z.object({
  rightmove: z.string().min(100),
  zoopla:    z.string().min(100),
  social:    z.string().min(50),
});
```

### 7.4 Prompt caching

`cache_control: { type: 'ephemeral' }` (5-minute cache) is placed on:

- the **system prompt** text block in both calls
- the **user instruction text block** in the vision call
- the **last image** in the vision call. A breakpoint caches everything before it, so the whole image set is cached. That helps when the same photos are resent within 5 minutes.

That is three breakpoints, within the API's limit of four.

### 7.5 Call #1: vision analysis (`analyzeImages`)

- `max_tokens: 4096`
- **System prompt** (cached):

```
You are a professional property analyst for UK estate agents. Your expertise is identifying distinctive features from property photos that help sell homes.

Focus on features buyers care about:
- Period details (Victorian/Edwardian features, original elements)
- Modern improvements (contemporary kitchens, updated bathrooms)
- Outdoor space (gardens, patios, parking, balconies)
- Character features (fireplaces, bay windows, high ceilings, natural light)
- Condition and presentation

Be specific and descriptive. Capture colors, materials, and distinctive details.
```

- **User message content:** `[ textBlock (cached), ...imageBlocks (last one cached) ]`. Each image block looks like this:

```ts
{ type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data } }
```

- **User instruction text** (XML-structured):

```
<task>
Analyze these property photos and identify notable features
</task>

<instructions>
Examine each image and identify features in these categories:
1. Period features and architectural character
2. Modern improvements and renovations
3. Outdoor spaces and external features
4. Room types, layouts, and distinctive details
5. Overall style, condition, and presentation

For each feature, provide:
- Feature name (category or room type)
- Specific detail (materials, colors, condition, notable aspects)
</instructions>

<output_format>
Return ONLY a JSON array with this structure:
[
  {
    "feature": "Feature Category or Room Type",
    "detail": "Specific descriptive detail about what makes it notable"
  }
]

No preamble, no markdown, no explanation - just the JSON array.
</output_format>

<examples>
[
  {"feature": "Period Features", "detail": "Original Victorian sash windows with working shutters and ornate coving throughout"},
  {"feature": "Modern Kitchen", "detail": "Contemporary handleless units in high-gloss white with Quartz worktops and integrated Siemens appliances"},
  {"feature": "Master Bedroom", "detail": "Spacious double room with feature wall in sage green, fitted wardrobes and large skylight"},
  {"feature": "Rear Garden", "detail": "South-facing landscaped garden with Indian sandstone patio, raised beds and mature planting"}
]
</examples>
```

- **Parsing:** read `message.content[0]` if its type is `text`. Then run `extractJson`, `JSON.parse` and `FeaturesArraySchema.parse`, in that order.

### 7.6 Call #2: copywriting (`generateDescriptions`)

- `max_tokens: 2000`
- **System prompt** (cached):

```
You are an expert property copywriter for UK estate agents. You write compelling, accurate property descriptions that sell homes.

Your writing style:
- Professional yet engaging
- Focuses on lifestyle benefits, not just features
- Highlights what makes THIS property special
- Avoids generic estate agent clichés
- Natural, human tone (not obviously AI-written)
- Always factually accurate based on provided information
```

- **User message** (a single string, filled in from the form and the features found in call #1):

```
<task>
Create three marketing descriptions for this property
</task>

<property_details>
Type: ${propertyType}
Bedrooms: ${bedrooms}
Bathrooms: ${bathrooms}
Location: ${address}
Price: £${price.toLocaleString()}
Target Buyer: ${targetBuyer}
${keyFeatures ? `Additional Info: ${keyFeatures}` : ''}
</property_details>

<features_identified>
${features.length ? features.map(f => `- ${f.feature}: ${f.detail}`).join('\n')
                  : 'No specific features identified from photos'}
</features_identified>

<instructions>
Create 3 versions optimized for different platforms:

1. RIGHTMOVE (800-1000 characters):
   - Professional, comprehensive tone
   - Compelling opening sentence that hooks the reader
   - Highlight all key selling points
   - Include lifestyle benefits for ${targetBuyer}
   - End with strong call to action
   - Use features identified from photos

2. ZOOPLA (600-800 characters):
   - Slightly more casual, conversational tone
   - Focus on lifestyle and practical benefits
   - Shorter sentences and paragraphs
   - Emphasize location and community
   - Appeal to ${targetBuyer} lifestyle

3. SOCIAL MEDIA (150-200 characters):
   - Instagram/Facebook friendly
   - Punchy, exciting, engaging
   - Use 1-2 relevant emojis
   - Key selling point + price + location
   - Call to action: "Link in bio" or "DM to book viewing"

Make each sound natural and specific to THIS property.
Focus on what makes it special and valuable to ${targetBuyer} buyers.
</instructions>

<output_format>
Return ONLY a JSON object:
{
  "rightmove": "...",
  "zoopla": "...",
  "social": "..."
}

No preamble, no markdown, no explanation - just the JSON object.
</output_format>
```

- **Parsing:** `extractJson`, then `JSON.parse`, then `DescriptionsSchema.parse`. The server logs the character count of each description.

### 7.7 Why two calls instead of one

- It separates the two jobs. Vision extraction should be factual and structured, while copywriting is creative, and each call gets a focused system prompt.
- The features list is a useful output in its own right, and it is shown in the UI.
- The copywriting call is text-only, so it is cheap. It could be re-run later (for example, a "regenerate copy" feature) without resending the images.

---

## 8. Front end

### 8.1 Routing and layout

- `app/page.tsx` calls `redirect('/demo')`.
- `app/layout.tsx` sets `<html lang="en">`, applies the Sora font class to `<body>` and defines the metadata title "PropertyVision - Intelligent Property Marketing".
- `app/demo/page.tsx` is a **client component** (`'use client'`) that owns all state:

```ts
images: ImageData[]
propertyDetails: PropertyDetails   // initial: { address:'', bedrooms:3, bathrooms:2,
                                   //   propertyType:'detached', price:0, keyFeatures:'', targetBuyer:'family' }
results: AnalysisResult | null
loading: boolean
error: string | null
```

**Flow:**

- If `results` is null, the page shows `PropertyUpload`, `PropertyForm`, an error banner and the "3. Generate Descriptions (N photos)" button.
- If `results` is set, the page shows `ResultsDisplay` and a "Create Another" button. "Create Another" revokes all preview object URLs and resets the state.
- While `loading` is true, `LoadingState` overlays the page as a fixed full-screen modal. It shows a spinner, three static steps and the note "This usually takes 15-30 seconds".
- **The Generate button is disabled** while loading, when there are no images, when no images are selected, when the address is empty or when the price is 0 or less.
- **On submit,** the page sends only the **selected** images as `{ data: base64, mediaType }` with `fetch('/api/analyze-property', { method: 'POST', body: JSON.stringify({ images, propertyDetails }) })`. If `!response.ok`, it shows the generic message "Failed to analyze property". It does not display the server's error text.

### 8.2 `PropertyUpload`

- A dashed drop zone opens a hidden `<input type="file" multiple accept="image/*">` when clicked.
- **Validation on select:** a file larger than 5 MB, or one whose `file.type` doesn't start with `image/`, is rejected and an error is shown in a shadcn `Dialog`. The error is shown via `setTimeout(…, 0)` so no state is set during render.
- **Client-side compression** (`compressImage` in `lib/utils.ts`):
  - The file is loaded into an `Image` through an object URL.
  - If either side is larger than **1568 px** (Claude's effective vision resolution), the image is scaled so its longest side is 1568.
  - It is drawn to a `<canvas>` and exported with `toDataURL('image/jpeg', 0.85)`, keeping only the base64 part.
  - A typical 5 MB photo shrinks to about 200–400 KB, which keeps the request payload small. Every image is sent as `image/jpeg`.
- Uploaded images are appended to the list and capped at 40. If the total **original** size would go over 150 MB, the update is rejected with an error dialog.
- **Auto-selection:** on the *first* upload, the first 20 images are selected automatically. Later uploads arrive unselected.
- Clicking a thumbnail toggles its selection. Selection stops at 20, with a "Selection Limit Reached" dialog.
- There are "Select First 20" and "Deselect All" controls, plus a hover × button that removes an image and revokes its object URL.
- **Thumbnail overlays:** a check or circle in the top left, the size in MB in the bottom left and a "For AI" badge on selected images. Below the grid there is a summary line with the uploaded count and total size, which turns red when over the limit.

### 8.3 `PropertyForm`

- It is a controlled component with props `{ propertyDetails, onChange }`. A single `handleChange` reads `e.target.name` and converts `bedrooms`, `bathrooms` and `price` with `Number()`.
- **Fields:**
  - Address/Location (text input)
  - Price £ (number input, shown empty when 0)
  - Property Type (select)
  - Target Buyer (select)
  - Bedrooms (select)
  - Bathrooms (select)
  - Additional Features (textarea, 3 rows)
- The fields sit in a 2-column grid on `md` screens and wider.

### 8.4 `ResultsDisplay`

- **"Identified Features" card:** a grid with 2 columns on `md` and wider. Each tile shows the feature name in bold with the detail in muted text.
- **Three `DescriptionCard`s:**
  - Each card shows a title, `length / limit characters` and a Copy button. The button uses `navigator.clipboard.writeText` and shows "Copied" for 2 seconds.
  - **Paragraph formatting** (`formatDescription`):
    - If the text contains blank-line breaks, split on those.
    - Otherwise, split into sentences on `(?<=[.!?])\s+(?=[A-Z])`. If there are more than 2 sentences, group them into paragraphs of 2.

### 8.5 Styling

- The shadcn setup uses **HSL CSS variables** in `globals.css`, in `:root` and `.dark` blocks. Dark mode is class-based, but nothing currently toggles it.
- **Palette:**
  - primary: blue `213 92% 44%`
  - accent: amber `42 92% 61%`
  - background: cool grey `211 21% 96%`
  - radius: `0.75rem`
- The body background adds two fixed radial gradients: a primary tint at the top left and an accent tint at the bottom right.
- `tailwind.config.ts` is the standard shadcn config. It maps the colours to `hsl(var(--x))`, sets the container to centred with `2rem` padding and a `2xl` width of `1400px`, and includes the accordion keyframes and the `tailwindcss-animate` plugin.

---

## 9. Conventions (enforced in this codebase)

- **Errors:**
  - Always write `catch (error: unknown)` and narrow with `instanceof` or a type assertion. Never use `error: any`.
  - Never send `error.message` to the client.
  - Status codes: 400 for validation, 413 for too large, 503 when all models are unavailable, 500 for anything else.
- **Validation:**
  - Validate every request body with Zod `safeParse` before using it.
  - Validate every Claude JSON response with Zod before using it.
- **TypeScript:**
  - No `any`.
  - Use `PromptCachingBetaMessageParam[]` for messages whose blocks carry `cache_control`.
- **Components:**
  - Server Components by default. Add `'use client'` only where interactivity or browser APIs are needed. All four feature components and the demo page are client components.
- **Body size:**
  - Don't add `export const config = { api: { bodyParser } }`. That is a Pages Router pattern and App Router silently ignores it.
  - Route Handler body limits are enforced at the infrastructure level (Vercel, nginx). The route's `content-length` check is only a best-effort guard.
- **Dependencies:** before adding one, check whether Zod, shadcn/ui or built-in Next.js/React already covers the need.

---

## 10. Known gaps and quirks (worth fixing in a rebuild)

1. **Drag and drop is advertised but not implemented.** The drop zone says "Click to upload or drag and drop", but there are no `onDrop` or `onDragOver` handlers.
2. **Size limits use original file sizes, not compressed ones.** Limits are checked against `file.size`, while the payload actually sent is the compressed JPEG. The 150 MB total limit is therefore much stricter than the real request size.
3. **Uploads are processed in parallel.** All images are compressed before the 40-image cap is applied, so a batch of 100 files is still processed first.
4. **Server error text is never shown.** The client only checks `response.ok` and always displays "Failed to analyze property".
5. **Two env vars are unused.** `CLAUDE_MODEL` and `NEXT_PUBLIC_APP_URL` are in `.env.local.example`, but the model list is hard-coded in `lib/claude.ts`.
6. **Character ranges are guidance only.** The 800–1000, 600–800 and 150–200 ranges are requested in the prompt but not enforced. Zod only checks minimums of 100, 100 and 50, so the UI can show a count above the limit.
7. **Some docs are outdated.** The root `README.md` says "up to 8 images" and "Sonnet 4". `docs/OPTIMIZATION_GUIDE.md` recommends temperature and prefill. Treat this handover as the up-to-date reference.
8. **No streaming, no timeout handling and no rate limiting.** A request runs two sequential model calls, taking roughly 15–30 seconds or longer. On serverless hosting, raise the function timeout (for example, `export const maxDuration = 60` in the route on Vercel).
9. **Deprecated Next config.** `next.config.js` uses the deprecated `images.domains`. It is harmless, since `next/image` isn't used.
10. **Thumbnails use array indices as keys.** Removing an image can briefly misassociate state.

---

## 11. Rebuild checklist

1. Create the project with `npx create-next-app@15 --ts --tailwind --app` (no `src/`, alias `@/*`).
2. Run `npx shadcn init`, then add `button card dialog input label textarea`. Hand-write `ui/select.tsx` as a styled native `<select>`.
3. Install `@anthropic-ai/sdk zod lucide-react tailwindcss-animate`.
4. Add the `globals.css` theme variables and gradient background, and the Sora font in the layout.
5. Write `lib/types.ts`, `lib/constants.ts`, `lib/utils.ts` (including `compressImage`) and `lib/claude.ts`.
6. Write `app/api/analyze-property/route.ts`:
   - Zod request schema, content-length check
   - `extractJson`, retry, model fallback
   - the two prompt functions with caching
   - Zod response validation, status-code mapping
7. Build the components: `PropertyUpload`, `PropertyForm`, `ResultsDisplay` and `LoadingState`.
8. Build `/demo` to own the state and make the POST request. Redirect `/` to `/demo`.
9. Add `.env.local` with `ANTHROPIC_API_KEY`. Run `npm run typecheck`, then `npm run dev`.
10. Test with 5–10 real property photos. Check that both calls return valid JSON and that the three descriptions fall within their character ranges.
