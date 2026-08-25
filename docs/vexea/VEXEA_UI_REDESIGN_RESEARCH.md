# VEXEA UI Redesign Research

**Purpose:** First-principles redesign brief for the rejected spider graph, loading system, and battle-pass candidates. This is research and authoring guidance only; it does not approve a production implementation.

## User quality gate

The user’s acceptance filter is strict. Reject pure primitives when the result is only one to three basic shapes plus a uniform stroke. Complexity is acceptable only when every element has an intentional size, weight, gap, and role. Outer structure may be strongest, secondary structures medium, and ticks/markers/text anchors lightest. Stroke widths, radii, lengths, and gaps must feel measured. Busy, soft, blobby, cramped, or eye-assembled compositions fail. Fills must remain inside their containers, and markers must share one shape language and sit exactly on their track or axis.

> Prefer measured, hierarchical geometry with deliberate stroke scales and breathing room. Reject both trivial primitives and dense, equal-weight, cartoonish arrangements.

## Research findings applied to the redesign

The GameAnalytics telemetry reference classifies line charts as appropriate for change over time, bar charts for quantities, funnel charts for progression, and radar graphs as useful for comparison between games [1]. The practical implication for VEXEA is that the visual must communicate why its geometry exists; a graph that only displays a polygon is not enough. The redesigned stats candidate therefore needs a stronger instrument frame, measured labels, and a clear reading sequence rather than another isolated pentagon.

The same reference describes progression as a sequence whose narrowing or state changes communicate movement through stages [1]. The battle-pass redesign should therefore make the player’s current position, next meaningful reward, and completed path read as one hierarchy. It should not present six equal cards as the primary composition. Rewards should be grouped into a progression spine with a focal current/next station and restrained peripheral context.

The Game UI Database classifies Loading Screen as a distinct screen category and notes that it can be animated or used to display tips and lore [2]. This supports a loading treatment with a communicative state and a secondary information layer, but does not justify a generic progress line with decorative ticks. The new candidate should have a deliberate visual reason for each moving layer: a system state carrier, an authored continuity object, and a restrained phase/message area.

The Battle Pass design reference describes linear, page-based, multi-track, and currency-based progression systems, and highlights the tension between player choice, time-to-value, and meaningful rewards [3]. For VEXEA’s visual candidate this means the shape should make the track logic legible first: current position, accessible next rewards, and locked future context. It should avoid turning every tier into an equal visual event or using motion to simulate value.

## Redesign languages

| Candidate | New language | Primary communication | Rejected failure to avoid |
|---|---|---|---|
| Stats | **Instrument dial + evidence bands** | Read a contractor profile and compare strengths without relying on a single polygon silhouette | Paint.exe pentagon, equal-weight rings, floating dots |
| Loading | **Mechanical calibration assembly** | The system is actively preparing, transferring, or exiting; progress is continuous and stateful | Line + ticks with no authored structure, generic spinner, decorative glow |
| Battle pass | **Progression ledger with current station** | Where the player is, what is next, and what is already secured | Six equal cards, primitive cut corners, reward carousel, endless pulses |

## Authoring constraints for the new candidates

Each candidate must be phone-first. The effect stage is separated from controls, has one clear focal hierarchy, and remains inspectable without hover. Each replay begins from a clean state, ends cleanly, and supports reduced motion. The rejected candidate can remain visible in a comparison panel only as a diagnostic reference; the new candidate must stand alone as the authored direction.

The next pass should prioritize authored geometry over more shapes. A good result may use fewer elements than the rejected candidate, but each element must carry a readable role. Motion must reveal structure, carry state, or preserve spatial continuity. It must not be added merely to make a static composition feel busier.

## First live gauntlet review

The new standalone gauntlet opens cleanly and exposes one replay control per redesign plus a reduced-motion switch. The profile instrument is no longer a free-floating pentagon: it reads as a bounded housing with sector bands, exact evidence rails, a central readout, and a restrained amber reading anchor. The loading assembly reads as a bounded transfer mechanism: the shutters provide the strongest structure, the carrier has a single route, station marks are subordinate, and the lamp supplies the final state cue. These are authoring observations only; phone-first capture review remains required.

## Phone-first and desktop capture review

The fresh 390px capture preserves the sequence and keeps controls outside every active stage. The profile instrument’s evidence bands remain readable at phone width, the loading assembly stacks its two variants without overlap, and the progression ledger becomes a contained vertical spine rather than a casual horizontal rail. The desktop capture preserves the stronger housing, shutter, carrier, and current-station hierarchy. The new candidates now meet the structural review bar for a user approval pass, but they remain visual candidates rather than contracts.

Focused phone review found two remaining risks to address before delivery. The profile sectors are structurally clear but can become too dim at full-page capture scale, so the next refinement should increase contrast through stroke hierarchy rather than adding more shapes. The loading carrier and route read correctly, but the phase message is partially occluded by the carrier during transit; the message must move to a reserved lower label rail so the state remains readable throughout the animation. The ledger’s vertical solution is contained and legible; the current station’s amber emphasis is appropriately limited to one station.

The corrected live loading replay now keeps the state message in the reserved lower rail while the carrier crosses the route. The label remains readable in the browser viewport, and the route, four station marks, shutters, and end lamp retain distinct roles without adding extra decorative layers.

## Final gauntlet capture review

The final 390px capture shows the three rebuilt candidates as separate vertical approval surfaces. The profile instrument keeps the evidence rails readable beneath the radial housing. The loading assembly stacks the two state variants with the carrier and lower message rail contained inside each window. The progression ledger fits vertically without horizontal scrolling and keeps the amber emphasis on the current/next station only.

The final desktop capture preserves the same hierarchy at a larger scale: the profile housing is the strongest structure, the loading shutters and carrier carry the transfer story, and the ledger spine plus current station carry progression. These are stronger authored candidates than the rejected primitives, but they remain visual approval candidates and must not be promoted into contracts without the user’s next approval.

The focused desktop crops confirm the profile instrument is materially more authored than the rejected polygon: the housing, sector bands, evidence bars, central readout, and amber anchor have distinct weights and roles. The loading crop confirms the shutters, carrier, route, stations, end lamp, and lower message rail are spatially separated; the carrier no longer covers the state text. The progression ledger remains included in the same gauntlet and is ready for the user’s separate visual decision.

The focused ledger crops confirm the new composition is not just a row of equal cards: the continuous progress spine is the primary structure, the current/next station is the only warm focal point, secured stations are quieter, and locked stations recede. On mobile, the same hierarchy becomes a vertical ledger with a single rail and no horizontal overflow.

## Second-pass failure diagnosis

The user rejected the first redesign pass for a specific reason: each composition still accumulated too many structures before establishing a single clear job. The next pass therefore has a stricter sequence: define the one thing the player must understand, draw only the geometry that carries that understanding, then add one motion event that reveals or confirms it. Any element that does not improve the first read is removed.

### Stats graph role

The current VEXEA profile surface calls the visualization `COMBAT PROFILE RADAR` and supplies five real values: DMG 85, ACC 72, MOB 90, SRV 68, and TAC 80. Its role is **at-a-glance comparison of five combat attributes for one contractor profile**, not a dossier, instrument, or decorative identity mark. The redesign must make the five attribute names and their relative values immediately legible. The chart itself should be a compact comparison aid beside the existing career metrics, with one baseline and one data shape; supporting text must not compete with the plot. The motion should reveal the data shape once, then stop.

### Loading reference language

The attached loading references establish a much simpler visual language than the first transfer assembly. They show a dark field, a central horizontal progress carrier, and a small number of interlocking open contours moving or resolving around that carrier. The intended read is not a machine interior with a box travelling across a route. It is a single continuous loading mark: one progress line, two or three deliberate contour segments, and one state label. The contour gaps and overlaps provide authorship; extra panels, stations, lamps, and far-end boxes are not required and should be removed.

### Battle-pass runtime semantics

The current dedicated battle-pass screen has 51 tiers, a flat 10 XP per tier, free-track rewards every five tiers, separate unlocked and claimed state, and no premium rewards populated yet. The redesign must therefore test against actual states instead of placeholder cards: locked, unlocked-but-unclaimed, claimed, and the current tier. A candidate is invalid if the current tier, claim affordance, or locked state moves out of alignment at mobile width. The first redesign’s grid and animation should be replaced by a state-safe single-focus progression strip or bounded vertical sequence that can be measured at both widths.

### Required second-pass tests

The next candidate must be tested in four states: initial/rest, mid-animation, completed, and replay after completion. Battle pass must additionally be tested with locked, ready, claimed, and current states visible together. The mobile capture must include the complete active stage and its controls; no crop may hide an overflow bug. The loading label must remain separate from the moving contour, and the graph must remain interpretable if all motion is disabled.

## Live v2 browser checkpoint

The runnable v2 lab loads successfully through HTTP. The graph now reads as an explicit five-axis combat attribute comparison: labels, values, one normalized contour, and five matching bars are visible without a dossier-like instrument wrapper. The loading candidate now follows the attached reference language closely: a dark field, one horizontal progress line, and a small number of open interlocking contour segments. The former far-end carrier box, station array, shutters, and machine interior are removed.

The second-pass mid-animation mobile capture was inspected separately from the settled capture. The graph reveals one contour over the five-axis scale without adding a second shape. The loading mark exposes its interlocking segments and single progress line without a travelling box. The battle pass retains the same tier order while the spine and stations enter; no state changes position or becomes ready accidentally. The settled capture returns to clean, readable rest states with no animation residue.

The live replay-after-completion test initially found a real battle-pass defect: tiers retained their entry translation after the animation class cleared. That was corrected with an explicit settled transform rule. The retest reports `run: false`, `settled: true`, `overflow: false`, and all four states remain intact: tier 05 CLAIMED, tier 06 CURRENT / READY, tier 10 UNLOCKED, and tier 15 LOCKED. Every tier now settles at transform matrix translation 0.

The refreshed post-fix mobile capture was inspected after the retest. The four battle-pass states remain in one vertical sequence, the locked tier stays visually recessed, the current tier remains the only warm focal point, and the replay/reset controls stay below the stage. The graph and loading contour remain contained above it with no control overlap.

## Third-pass live review

The v3 lab is served through the existing runnable HTTP endpoint. The new loading candidate is a single dark-field mark with one determinate progress rule and interlocking open segments; the previous transfer box and contour-system scaffolding are not reused. The new battle-pass candidate is a focus sheet: one current reward receives the visual weight, while nearby claimed, current/ready, unlocked, and locked states remain a quiet explicit list. It is not a rail, ledger, or horizontally scrolling card system.

The 390px capture was inspected in full. The loading mark stays contained and readable, and the battle-pass focus sheet stacks cleanly with the current reward above the state list. The desktop capture preserves the same hierarchy without adding a second competing structure. These remain approval candidates only.

## Latest user decision

The user’s decision history rejected the early loading contour, transfer assembly, wake field, season crest, rail, ledger, and docket experiments. Those historical candidates remain excluded. The user subsequently accepted the final v7 directions: the horizontal loading bar with authored fill/head/sheen behavior and the full-season battle-pass progression line with visible free and premium tracks, milestone prizes, nearest reward, and tier-50 key reward. Those final directions are documented in `VEXEA_UI_LOADING_BATTLEPASS_CONTRACT.md`. The pentagon graph remains the surviving graph foundation and is documented separately as an approval-gated candidate unless a later explicit promotion is recorded.

## References

[1]: https://www.gameanalytics.com/blog/top-visualizations-for-game-telemetry-data "Top visualizations for game telemetry data — GameAnalytics"
[2]: https://www.gameuidatabase.com/index.php?&scrn=3 "Game UI Database — Loading Screen category"
[3]: https://www.gamemakers.com/p/understanding-battle-pass-game-design "The Complete Guide to Battle Pass Design & Monetization"
