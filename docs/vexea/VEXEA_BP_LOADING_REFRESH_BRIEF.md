# VEXEA Battle Pass and Loading Refresh Brief

## Repository truth

The current runtime has two loading owners. The splash screen uses a fixed 7.50rem horizontal bar whose fill is updated from real preload completion, then fades before the user can initialize. Match entry uses `LoadingScreen` and `LoadingOrchestrator`; real phases include checking cache, downloading assets, preloading audio, preloading VFX textures, building the map, loading combat assets, prewarming shaders, and waiting for server confirmation. The redesign must preserve a horizontal progress carrier and allow both fast phases and a long server-ready hold without pretending that progress is advancing.

The current battle-pass data model is `BP_SEASON_01` with indices 0 through 50, ten XP per tier, free rewards at tiers 5, 10, 15, 20, 25, 30, 35, 40, 45, and 50, and `premiumReward: null` reserved in the current shared model. The requested visual candidate must nevertheless show the premium track as an explicit purchased-track surface so the eventual additive data model has a clear visual home. It must show the full season line, nearest reward, key reward, and both free and premium tracks.

## Visual direction

Loading keeps the horizontal bar. The authored motion belongs to the carrier itself: a calibrated split, a restrained moving head, a narrow pass-through sweep, and a terminal lock that makes completion feel intentional without turning the bar into a dashboard. The phase label may update because it is already part of runtime semantics, but it must not become a decorative content block.

Battle pass uses one continuous full-season horizontal progression line on desktop. Rewards are attached at measured tier positions throughout all 50 tiers, with a quiet free track and an equally visible premium track. The nearest reachable reward is the focal point through a controlled local reveal; the key reward at tier 50 is visually distinct but not louder than the current station. Claimed, ready, locked, and premium-locked states have clear visual roles. On mobile, the same progression becomes a vertical line with the same tier ordering and no horizontal overflow.

## Rejection constraints

Do not create a widget demo with explanatory cards, a season ledger, a reward carousel, a circle-based pass, or unrelated reward panels. Do not replace the loading bar with a separate object. Do not use all 51 tiers as equally loud objects. Use the full season in the line geometry, but show only selected reward marks at actual reward tiers and keep empty tiers as measured ticks.

## V7 verification checkpoint

The v7 loading candidate keeps the horizontal carrier and uses a single narrow sheen plus a measured leading head. The pass uses 51 tier positions derived from the current shared season, ten reward milestones per track, a tier-15 nearest reward, and tier-50 finale rewards. The 390px capture exposed a real current-pin placement bug inherited from the earlier vertical ledger experiment; it was corrected to tier 12, and the duplicated next/finale labels were reduced. A second endpoint test found the tier-50 transformed marks expanding the internal grid’s scroll rectangle; the endpoint was kept inside the measured track and the pass field remains stage-contained. Final mobile and desktop captures were rendered after these corrections.
