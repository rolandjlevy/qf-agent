# QuoteFetch logo assets

Concept AE, "Page of sliding slabs", with a Geist Bold wordmark. This pack replaces the earlier "Sliced into speed" pack: same file names, same places, so it's a straight swap.

Every SVG is outlined paths, so nothing depends on a font being installed.

## Colours

| Name | Hex | Use |
|---|---|---|
| Slab light | #6F8DFF | Top slab |
| Slab mid | #4A69EC | Middle slab |
| Slab dark (brand blue) | #2446D8 | Bottom slab; the main accent colour for the UI |
| Ink | #16181D | Wordmark on light backgrounds |
| Paper | #F4F3EF | Wordmark on dark backgrounds |
| Night | #15161A | App icon background |

The slab colours work on both light and dark backgrounds; only the wordmark colour changes.

Wordmark typeface: Geist Bold (700), SIL Open Font License. It's already outlined in these files. The website can keep IBM Plex Sans for its own text.

## Where each file goes (Next.js App Router)

- `nextjs-app/favicon.ico`, `icon.svg`, `apple-icon.png`, `manifest.webmanifest` → `app/`. Next.js picks them up by file name and writes the `<link>` tags. Remove any older favicon from `app/` or `public/` first.
- `png/icon-192.png`, `icon-512.png`, `icon-maskable-512.png`, `og-image.png` → `public/`. The manifest already points at the icons.
- `react/Logo.jsx` → `components/`. In the header: `<Logo className="h-8 w-auto" />`. On a dark background: `tone="onDark"`. One colour that follows the text colour: `tone="mono"`. Icon only: `variant="mark"`.
- Social share image: in `app/layout.js` metadata, set `openGraph: { images: ["/og-image.png"] }`.

## The other files

- `svg/quotefetch-logo*.svg`: the full logo in brand, on-dark, black and white. For print, email signatures, invoices and anything outside the website.
- `svg/quotefetch-mark*.svg`: the icon alone, in brand, black and white. The brand mark works on dark backgrounds too.
- `svg/quotefetch-app-icon.svg`: the rounded-square app icon on the dark background.
- `png/quotefetch-logo.png`, `quotefetch-logo-on-dark.png`, `quotefetch-mark.png`: raster copies for places that won't take SVG.

## Using it well

- Minimum size: the full logo at 24px tall, the mark alone at 16px.
- Clear space: keep at least the height of one slab clear on every side.
- The one-colour versions (black, white, mono) rely on the gaps between the slabs, so use those for embroidery, vinyl and stamps rather than the three-tone version.
- Don't change the slab order or colours, stretch the logo, or add effects.
