# Verified on the wrist — 2026-08-03

Real captures from the Pixel Watch 4 (426 × 426), taken while reviewing that
day's changes. **This is not the state sweep** — see `docs/states/` for that,
and note that everything in there is currently stale.

## What these are, and what they are not

They cover the **first** of two batches of changes made that day. The watch
battery died before the second batch could be installed, so these frames show:

- the battery gauge tracking `BATTERY_PERCENT`, including the coral low state
- the weekday + chipped day-of-month date
- the cream (formerly coral) temperature
- the sweat beads clearing the eye arcs
- the hero's screen-left arm dropping when asleep

They do **not** show anything from the second batch: the footsteps icon, the nose
fix, the blob repositioning, the rebuilt Zzz, the companion's round sleeping
mouth, the sunny cocktail, the startled storm face, the umbrella canopy/handle
change, or the ambient transition timing. Those are all committed and building
but have never been rendered on hardware.

Do not use these as a reference for how the face looks now. Use them as evidence
that the listed five items work, and as before/after for the two details below.

## Frames

| file | what it shows |
|---|---|
| `0-baseline.png` | the face with real data, real triggers, nothing firing |
| `1-sweating.png` | heart-rate trigger forced on — sweat beads above the eyes |
| `5-night.png` | night forced on — closed eyes, snoring mouth, arm down, Zzz |
| `battery-100.png` | gauge full, green |
| `battery-50.png` | gauge half — proof the `<Transform>` on `width` is live |
| `battery-low-7.png` | gauge a coral sliver, digits coral, at a real 7% |

## Details, magnified

Nearest-neighbour crops, so a "pixel" here is a real device pixel.

| file | what it shows |
|---|---|
| `detail-sweat-clears-eyes.png` | the fixed bead placement, ~5px clear of the arcs |
| `detail-sleeping-arm.png` | the resting arm after the second pass — the first attempt sat 2px off the foot and read as a third leg |
| `detail-nose-artifact.png` | **the accidental nose.** The faint dash between the companion's eyes and mouth was never drawn: it is a 1px sliver of the mouth ellipse surviving the body-coloured rectangle that masks its top half, because both started at the same y. Now fixed by overshooting the mask. |
| `detail-old-steps-icon.png` | **the old steps icon**, and why it needed replacing — the sole-plus-heel footprint read as nothing but a big circle and a small circle at 26px |

The two `detail-` files marked in bold are **before** shots of things that have
since changed. They are kept because the artefacts are hard to describe and easy
to reintroduce.
