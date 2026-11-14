# Contributing

## Adding images

Drop media under `static/mods/<mod-id>/` — no YAML edits required. `scripts/build-data.js` picks them up on the next `npm run dev` / `npm run build`.

| File | Purpose |
| --- | --- |
| `static/mods/<id>/logo.svg` (or `.png` / `.webp` / `.jpg`) | Square logo shown on cards and the detail header |
| `static/mods/<id>/screenshots/01-foo.png` | Device screenshots / photos (any of `.png` `.webp` `.jpg` `.gif`) |

- Filename order is alphabetical / numeric (`00-…`, `01-…`, `02-…`).
- Prefer ≤ **500 KB** per file (`npm test` warns above that).
- A folder under `static/mods/` without a matching `data/mods/<id>.yaml` fails validation (catches typos).

### Screenshot tips

MPC Sample screen captures (small, pixel-ish) and photos of the device are both fine. The site uses `image-rendering: pixelated` when screenshots are scaled up. Placeholders named `*-placeholder.*` are demo assets — replace them with real media when you have it.
