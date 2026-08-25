# Contract Calibration Review

**Reviewed artifacts:** `contract_calibration_board_desktop.png` at 1280×1100 and `contract_calibration_board_mobile.png` at 390×1200.

## Desktop eye review

The queue reference panel is legible and visibly communicates the measured target ratios: a large faint outer boundary, smaller primary ring, attached dense tick band, and interior cadence. The world-space proxy is intentionally relative rather than camera-accurate; the explosion proxy is clearly the largest ring, fire is materially smaller, the decal is smaller again, and the impact spark is only a small contact. The tracer is visibly elongated instead of a dot, with the brightest portion near its source/middle. The muzzle proxy is short and directional.

The timing bars communicate the intended ordering without implying simultaneous stacking: muzzle is brief, impact dust is shorter than barrel smoke, explosion is sub-second, and fire has the longest local envelope. Weapon-family bars are progressive and bounded; the shotgun’s shorter tracer value is visibly distinct from its larger muzzle multiplier.

## Mobile eye review

The board remains readable at 390px width. The queue reference is visible without control overlap, the world-space proxies remain separable, and the timing rows retain their labels and values. The lower weapon-family panel continues below the viewport as expected because the board is a scrollable document, not a production UI stage. No element was visibly oversized enough to invalidate the stated relative values.

## Decision

The contract values are visually plausible as a preflight specification and are not being presented as final in-game camera measurements. Live gameplay capture remains mandatory before production acceptance. The documents explicitly require Gemini to compare the values against the latest repository and to record any screenshot-proven correction instead of silently duplicating constants.
