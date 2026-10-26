# Design system

**Feel:** soft, warm, handmade, calm. Picture-book and wooden toys, not neon arcade.

## Mascot: Blini

A round, warm little pancake-blob (a *blini* is a small pancake) with rosy cheeks and a curl of steam on top. Drawn in SVG in `src/components/Blini.tsx`, with three poses:

| Pose | Used on |
|---|---|
| `wave` | Hello screen; Parent Corner home |
| `happy` | Parent gate, family code screen, app icon |
| `sleepy` | Bedtime fade, "all toys off" room |

Body `#F6C978`, highlight `#F9D892`, arms `#EDB765`, features `#4A3A2A`, cheeks `#F2948F` at 50%.

## Colour themes (`src/settings/themes.ts`)

Each theme has a background, a second surface, an ink colour and six soft toy colours. Each toy also has one clear accent (`TOYS[].accent` in `schema.ts`).

| Theme | bg | bg2 | ink |
|---|---|---|---|
| Sky (default) | `#EAF4FB` | `#D5E9F6` | `#3B4A5A` |
| Peach | `#FDF0E7` | `#F8DECD` | `#5A4038` |
| Mint | `#EAF7F0` | `#D2EDDE` | `#355247` |
| Lavender | `#F3EEFA` | `#E3D9F3` | `#46405A` |
| Night-calm | `#29252F` | `#35303D` | `#E9DDC9` |

Night-calm swaps the toy colours for dimmer, warmer ones and lowers paint and bubble opacity.

## Tokens (`src/styles.css`, `:root`)

- **Radii:** `--radius-s` 10px, `--radius-m` 18px, `--radius-l` 28px, `--radius-round` 999px
- **Spacing:** 4 / 8 / 12 / 16 / 24 / 32 / 48 px (`--space-1` … `--space-7`)
- **Motion:** `--ease-soft` `cubic-bezier(.45,.05,.25,1)`, `--ease-spring` `cubic-bezier(.34,1.56,.64,1)`; durations quick 180ms, calm 450ms, room slide 750ms. `prefers-reduced-motion` is respected.
- **Type:** Nunito (variable), bundled locally. Almost no type in the kid app, apart from numbers in Counting Stars.

## Kid-app layout rules

- Top-left: toy-menu bubble (76px). Top-right: faint parent hold-circle (44px, hold 3s).
- Bottom corners: previous and next bubbles (76px) showing the neighbouring toy's icon.
- Toys keep their main interactive things clear of the top and bottom 110px.
- No flashing and no sudden full-screen changes: rooms slide, overlays fade.

## Sound

C-major pentatonic (C D E G A) over several octaves. Three voicings: marimba (default), chimes, music box. Pops add a short pitch drop. Celebrations are slow arpeggios. Everything passes through a low-pass filter (5.5 kHz) and a compressor, with a parent-set volume cap.
