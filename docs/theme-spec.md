# MPC Sample Hardware-Inspired Theme Specification

This document specifies an industrial hardware UI theme inspired by the standalone sampler aesthetic of the classic 1988 MPC60 and the modern portable **MPC Sample** groovebox.

---

## 1. Colour Palette & WCAG AA Contrast Ratios

Colours below are sampled directly from high-resolution studio product photographs of the hardware (front faceplate, 2.4" OLED display & glossy bezel, 16-pad well, and rear silkscreen panel), with foregrounds verified for **WCAG 2.1 AA** compliance ($\ge 4.5:1$ for normal text, $\ge 3.0:1$ for large text and UI components).

### Sampled Hardware Palette (CSS Custom Properties)

| Token | Hex | Hardware Origin |
| :--- | :--- | :--- |
| `--mpc-body-light` | `#E6E3DF` | Top faceplate warm retro-white / light putty grey |
| `--mpc-body-mid` | `#D0CCC9` | Molded side/rear chassis warm industrial grey |
| `--mpc-body-recess` | `#BEBBB6` | Recessed port bay & fader well shadow grey |
| `--mpc-wrist-rest` | `#969696` | Padded lower palm rest mid-grey |
| `--mpc-bezel-black` | `#0C0C0C` | Glossy upper display bezel & speaker surround |
| `--mpc-screen-bg` | `#08090C` | 2.4" colour OLED screen background |
| `--mpc-screen-text` | `#F6F2F1` | Screen primary crisp white readout |
| `--mpc-screen-yellow` | `#E8C811` | Screen waveform & sequence header yellow (`Seq A01`) |
| `--mpc-screen-cyan` | `#38B6E8` | Screen loop / parameter bar cyan (`Loop`, `RT Swing`) |
| `--mpc-screen-magenta` | `#FF3877` | Screen beat counter magenta (`1 2 3 4`) |
| `--mpc-pad-well` | `#2B2E38` | Dark slate-navy 4x4 pad grid housing (`#373A44` to `#2B2E38`) |
| `--mpc-pad-off` | `#969696` | Unlit thick grey rubber pad surface |
| `--mpc-pad-card` | `#B8B5B0` | Elevated rubber pad surface (lightened for readable card text) |
| `--mpc-pad-text` | `#141518` | Deep charcoal ink on pad/card surfaces |
| `--mpc-pad-led-green` | `#2EE65A` | Pad 1 backlit RGB velocity green |
| `--mpc-pad-led-lime` | `#C8F526` | Active pad bank backlit RGB lime/chartreuse glow |
| `--mpc-pad-led-orange` | `#FF9E2C` | Mode button / Pad FX backlit amber-orange |
| `--mpc-pad-led-cyan` | `#72B8DD` | Pad Play (`CHOP`, `LOOP`, `MUTE`) ice-blue |
| `--mpc-btn-grey` | `#595C66` | Standard function button charcoal grey (`SAMPLE`, `SEQ`, `SHIFT`) |
| `--mpc-silkscreen` | `#1E1F23` | Primary chassis silkscreen ink |
| `--mpc-silkscreen-muted` | `#373A44` | Secondary chassis sub-label silkscreen ink |
| `--mpc-accent-red` | `#A6192E` | Vintage 1988 crimson-red panel accent & record strip (`#C41E3A` on dark) |
| `--mpc-focus-ring` | `#FF9E2C` | High-visibility amber-orange focus indicator |

### WCAG 2.1 Contrast Verification Table

| Foreground | Background | Ratio | Level | Usage Context |
| :--- | :--- | :--- | :--- | :--- |
| `--mpc-screen-text` (`#F6F2F1`) | `--mpc-bezel-black` (`#0C0C0C`) | **17.60:1** | AAA | Header / screen primary title & body |
| `--mpc-silkscreen` (`#1E1F23`) | `--mpc-body-light` (`#E6E3DF`) | **12.87:1** | AAA | Page body copy & primary headings |
| `--mpc-screen-text` (`#F6F2F1`) | `--mpc-pad-well` (`#2B2E38`) | **12.18:1** | AAA | Silkscreen labels inside dark pad grid well |
| `--mpc-screen-yellow` (`#E8C811`) | `--mpc-bezel-black` (`#0C0C0C`) | **11.83:1** | AAA | Screen waveform & active header highlights |
| `--mpc-silkscreen` (`#1E1F23`) | `--mpc-body-mid` (`#D0CCC9`) | **10.32:1** | AAA | Text on secondary panels & recessed wells |
| `--mpc-pad-text` (`#141518`) | `--mpc-pad-card` (`#B8B5B0`) | **8.93:1** | AAA | Mod card title & description on pad surface |
| `--mpc-silkscreen-muted` (`#373A44`) | `--mpc-body-light` (`#E6E3DF`) | **8.87:1** | AAA | Secondary metadata & silkscreen sub-labels |
| `--mpc-pad-text` (`#141518`) | `--mpc-pad-led-orange` (`#FF9E2C`) | **8.85:1** | AAA | Active orange mode button text (`PAD FX`) |
| `--mpc-screen-cyan` (`#38B6E8`) | `--mpc-bezel-black` (`#0C0C0C`) | **8.41:1** | AAA | Screen parameter & link text |
| `--mpc-pad-text` (`#141518`) | `--mpc-pad-led-cyan` (`#72B8DD`) | **8.36:1** | AAA | Active blue filter button text (`CHOP`/`LOOP`) |
| `#FFFFFF` | `--mpc-btn-grey` (`#595C66`) | **6.67:1** | AA | Unpressed function button label (`SAMPLE`/`SEQ`) |
| `--mpc-pad-text` (`#141518`) | `--mpc-pad-off` (`#969696`) | **6.17:1** | AA | Authentic unlit rubber pad surface text |
| `--mpc-accent-red` (`#A6192E`) | `--mpc-body-light` (`#E6E3DF`) | **5.86:1** | AA | Vintage red section headers & callouts |
| `--mpc-screen-magenta` (`#FF3877`) | `--mpc-bezel-black` (`#0C0C0C`) | **5.67:1** | AA | Screen beat counter / status badge text |

---

## 2. Hardware Motifs Mapped to Site UI

1. **Page Background = Device Body (`--mpc-body-light`)**
   - Warm light putty-grey matte plastic finish (`#E6E3DF`) with subtle recessed panel containers (`#D0CCC9`) and thin `1px` machined seams.
2. **Site Header = Top Glossy Bezel & 2.4" Colour Screen (`--mpc-bezel-black`)**
   - Full-width or inset dark top bezel (`#0C0C0C`) housing an LCD/OLED readout bar.
   - Features the 3-segment soft-key tab bar at the top (`Trim | Tune | Filter`), waveform yellow title text (`#E8C811`), cyan metadata (`#38B6E8`), and a decorative vertical LED peak meter (green/amber/red bars) on the right.
   - **Typography Recommendation**:
     - Display / Screen Header: **`IBM Plex Mono`** (SIL Open Font License 1.1, Google Fonts) or **`JetBrains Mono`** (OFL 1.1) for crisp technical parameter readouts; optional **`Silkscreen`** (OFL 1.1, Google Fonts) at `0.75rem–0.875rem` strictly for short LCD tab badges.
     - Silkscreen Labels & Body: **`Inter`** or **`Space Grotesk`** (OFL 1.1) with `font-weight: 700`, `text-transform: uppercase`, and `letter-spacing: 0.08em` to emulate stamped hardware silkscreen labels (`FULL LEVEL`, `16 LEVELS`).
3. **Mod Catalog Grid & Cards = 16 RGB Velocity Pads in Slate-Navy Well**
   - Wrap the card grid in a recessed dark slate-navy well (`--mpc-pad-well: #2B2E38`, `padding: 1.25rem`, `border-radius: 8px`) or place cards directly on the chassis with a dark rubber bezel border.
   - Each **Mod Card** acts as a thick tactile rubber pad: rounded square (`border-radius: 6px`), subtle top highlight bevel, `3px` bottom physical depth edge, and numbered pad silkscreen (`01 FULL LEVEL`, `02 HALF SEQ`) along the bottom rim.
   - **Hover / Focus "Lit" State**: Translates `1px` down and illuminates its bottom/outer edge with an RGB underglow (`box-shadow`) colour-coded by mod category:
     - *Audio / Synth*: Lime-Green (`--mpc-pad-led-green: #2EE65A`)
     - *UI / Workflow*: Pad-Play Cyan (`--mpc-pad-led-cyan: #72B8DD`)
     - *FX / Processing*: Mode Amber-Orange (`--mpc-pad-led-orange: #FF9E2C`)
     - *System / Firmware*: Record Crimson (`#FF3877`)
4. **Category Filter = Hardware Mode & Pad Play Button Rows**
   - Pill-rectangular tactile plastic buttons (`border-radius: 4px`) with dark recessed sockets (`2px` solid `#1E1F23`).
   - Inactive buttons use matte charcoal (`#595C66`) with white uppercase text; active filter buttons light up in backlit **Mode Orange (`#FF9E2C`)** or **Pad Play Blue (`#72B8DD`)** with dark `#141518` text.
5. **Sort & Search = Screen Parameter Controls & K1–K3 Macro Knobs**
   - Search input styled as an inset OLED parameter field (`background: #08090C`, `color: #E8C811`, monospace font, cyan focus border).
   - Sort dropdowns styled after the **K1 / K2 / K3** rotary encoder collars with a circular dial indicator icon and silkscreened sub-label underneath.
6. **Badges & Tags = Silkscreened Sub-Labels & Record LED Strips**
   - Compact uppercase rectangular stamps (`font-size: 0.75rem`, `letter-spacing: 0.06em`) with a horizontal colour bar underneath (mirroring the `SAMPLE RECORD` / `PLAY` LED indicator strip buttons on the bottom-right of the unit).

---

## 3. Light vs. Dark Mode Recommendation

- **Recommendation: Ship the Hardware Light Grey (`#E6E3DF`) as the ONE default theme. Do NOT build a separate dark mode.**
- **Rationale**:
  1. **Iconic Identity**: The defining visual signature of both the 1988 MPC60 and the MPC Sample is the **high-contrast juxtaposition** of the warm light-grey chassis against the jet-black top screen bezel (`#0C0C0C`) and dark slate-navy pad well (`#2B2E38`).
  2. **Built-in Dark Surfaces**: Because the header (screen bezel) and the mod grid housing (pad well) are already dark surfaces, the default theme naturally provides dark-mode eye comfort where users look most, while preserving unmistakable hardware authenticity. Inverting the chassis to dark grey erases the MPC60 tribute and makes it look like a generic dark web template.

---

## 4. Guardrails & Usability Rules

1. **No Trademarks or Logos**: Never render the "AKAI professional" serif wordmark, the "MPC SAMPLE" custom stencil logo, or official product photography. Use strictly "inspired-by" geometric primitives, colour palettes, and generic audio terminology.
2. **Readable Typography Floor**: Never set body copy in pixel/bitmap fonts. Keep body text at `1rem` (`16px`, minimum line-height `1.5`) in a clean sans-serif, and reserve monospace/uppercase silkscreen styling for headers, buttons, and short metadata labels (`\ge 0.75rem` / `12px`).
3. **Motion & `prefers-reduced-motion`**: Pad press transitions and RGB LED glow pulses must be instant or disabled when `@media (prefers-reduced-motion: reduce)` matches. Never use flashing or strobing LED meters.
4. **Usability Over Skeuomorphism**: Do not replace standard web scrollbars or dropdowns with custom rotary-drag knobs that break keyboard navigation or screen readers. Use standard `<button>`, `<input type="search">`, and `<select>` elements styled with hardware surface tokens.

---

## 5. Ready-to-Paste CSS Block

```css
:root {
  /* Chassis & Surfaces */
  --mpc-body-light: #E6E3DF;
  --mpc-body-mid: #D0CCC9;
  --mpc-body-recess: #BEBBB6;
  --mpc-bezel-black: #0C0C0C;
  --mpc-screen-bg: #08090C;
  --mpc-pad-well: #2B2E38;
  --mpc-pad-card: #B8B5B0;
  --mpc-btn-grey: #595C66;

  /* Typography & Silkscreen Ink */
  --mpc-silkscreen: #1E1F23;
  --mpc-silkscreen-muted: #373A44;
  --mpc-pad-text: #141518;
  --mpc-screen-text: #F6F2F1;

  /* Hardware Accents & RGB Pad LEDs */
  --mpc-accent-red: #A6192E;
  --mpc-screen-yellow: #E8C811;
  --mpc-screen-cyan: #38B6E8;
  --mpc-screen-magenta: #FF3877;
  --mpc-pad-led-green: #2EE65A;
  --mpc-pad-led-orange: #FF9E2C;
  --mpc-pad-led-cyan: #72B8DD;
  --mpc-focus-ring: #FF9E2C;

  /* Fonts */
  --font-sans: 'Inter', system-ui, -apple-system, sans-serif;
  --font-mono: 'IBM Plex Mono', ui-monospace, monospace;
}

body {
  background-color: var(--mpc-body-light);
  color: var(--mpc-silkscreen);
  font-family: var(--font-sans);
  line-height: 1.5;
}

/* Header: Glossy Top Bezel + 2.4" OLED Screen */
.header {
  background-color: var(--mpc-bezel-black);
  color: var(--mpc-screen-text);
  border-bottom: 4px solid var(--mpc-body-recess);
  padding: 1rem 1.5rem;
  font-family: var(--font-mono);
}

.header__screen {
  background-color: var(--mpc-screen-bg);
  border: 2px solid #262930;
  border-radius: 4px;
  padding: 0.75rem 1rem;
  box-shadow: inset 0 2px 6px rgba(0, 0, 0, 0.8);
}

.header__title {
  color: var(--mpc-screen-yellow);
  font-size: 1.25rem;
  font-weight: 700;
  letter-spacing: 0.04em;
}

/* Mod Card: Tactile Rubber Pad inside Dark Pad Well */
.card {
  --pad-glow: var(--mpc-pad-led-green);
  background-color: var(--mpc-pad-card);
  color: var(--mpc-pad-text);
  border-radius: 6px;
  border: 2px solid #1E2028;
  padding: 1.25rem;
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.45),
    0 4px 0 #181A20;
  transition: transform 120ms ease, box-shadow 120ms ease, border-color 120ms ease;
}

.card:hover,
.card:focus-within {
  transform: translateY(1px);
  border-color: var(--pad-glow);
  box-shadow:
    inset 0 0 12px rgba(255, 255, 255, 0.25),
    0 3px 0 #181A20,
    0 0 14px var(--pad-glow);
}

/* Category Filter Button: Hardware Mode / Pad Play Key */
.button {
  background-color: var(--mpc-btn-grey);
  color: #FFFFFF;
  font-family: var(--font-sans);
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  padding: 0.5rem 0.875rem;
  border-radius: 4px;
  border: 2px solid var(--mpc-silkscreen);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.2), 0 2px 0 var(--mpc-silkscreen);
  cursor: pointer;
}

.button[aria-pressed="true"],
.button--active {
  background-color: var(--mpc-pad-led-orange);
  color: var(--mpc-pad-text);
  box-shadow: 0 0 10px rgba(255, 158, 44, 0.5), 0 1px 0 var(--mpc-silkscreen);
  transform: translateY(1px);
}

/* Silkscreen Badge / LED Strip Chip */
.chip {
  display: inline-flex;
  align-items: center;
  background-color: var(--mpc-body-mid);
  color: var(--mpc-silkscreen);
  font-family: var(--font-mono);
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  padding: 0.2rem 0.5rem;
  border-radius: 3px;
  border-bottom: 3px solid var(--mpc-accent-red);
}

:focus-visible {
  outline: 3px solid var(--mpc-focus-ring);
  outline-offset: 2px;
}

@media (prefers-reduced-motion: reduce) {
  .card,
  .button {
    transition: none;
  }
}
```

---

## 6. Reference Image URLs

1. **Front Faceplate & 2.4" Screen Waveform View (Official CDN)**:
   `https://s3.amazonaws.com/cdn.freshdesk.com/data/helpdesk/attachments/production/69187054487/original/gLIX_yjrNvoj1cD5JB3CU88SIBuSlmxXyw.png?1774264024`
2. **Angled Hardware Studio Shot with Lit RGB Pads & Sequencer Screen (Sound On Sound Review)**:
   `https://dt7v1i9vyp3mf.cloudfront.net/styles/news_large/s3/imagelibrary/A/AkaiMPCSample_01-1EhmvJQTVg58YUXYC_LeugbWDDZACDeC.jpg`
3. **Rear Panel Chassis & Crimson Silkscreen Typography Detail (Sound On Sound Review)**:
   `https://dt7v1i9vyp3mf.cloudfront.net/styles/news_large/s3/imagelibrary/A/AkaiMPCSample_02-ZbCRDL8EkgatJhMo0on92EAL.WunfUd2.jpg`
