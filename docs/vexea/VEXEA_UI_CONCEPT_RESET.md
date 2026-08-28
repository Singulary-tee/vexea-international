# VEXEA UI Concept Reset

## Decision

The previous loading and battle-pass directions are discarded. The next authoring pass must change the visual premise, not rearrange the same geometry. The pentagon combat graph remains the only surviving direction and is not part of this reset.

## Loading: one object, not a progress diagram

The loading screen should use one meaningful **VEXEA facility status object**: a large, low-detail wordmark/emblem plate or a single equipment silhouette that is incomplete at rest and becomes whole as the real progress advances. The object itself is the feedback. Progress is communicated by a single material change across that object, such as a clean red-to-dirty-white reveal seam or a restrained stencil pass, while a compact percentage and state label remain subordinate.

The motion should be a continuous transformation of that one object. At the beginning, the mark is a dark uncommitted plate. During loading, one continuous reveal travels through the mark and exposes its finished material. At completion, the reveal seam exits and the completed mark holds. There is no independent progress line, ring, contour network, box, station array, or decorative endpoint. The user’s attached VEXEA logo loading reference is the compositional anchor: one centered object, one progress-driven transformation, one label.

If a real VEXEA wordmark asset cannot be used in the standalone lab, the prototype must use a clearly labeled neutral stand-in with the same silhouette logic rather than inventing a second abstract symbol.

## Battle pass: one destination, not a reward inventory

The battle-pass screen should use one meaningful **season destination**: a large current reward or season milestone that the player is approaching. The surrounding information should be a small set of **distance markers** that explain where the player is relative to that destination. Rewards are not represented as four competing containers. A single selected reward can be shown as the destination; claimed/unlocked/locked are communicated through a compact status treatment and text, not by animating multiple cards.

The motion should be a single approach-and-arrival event. The current progress marker travels along a restrained path toward the destination only when XP changes. The destination changes state once on arrival: a quiet material or stamp transition from unavailable to ready. Nearby milestones do not slide, reorder, or independently animate. The layout should be a vertical composition at phone width and remain deterministic when the destination is claimed, with no absolute-positioned reward elements that can drift.

## Hard deletion list

The next prototype must not contain a standalone horizontal progress line for loading, an abstract contour network, a travelling box, a route with stations, a radial loading diagram, a reward rail, a ledger, a grid of equal cards, a card carousel, or a repeated tier entrance. Any one of these appearing as the primary visual means the premise has not been changed enough.

## Research basis

Progress indicators must communicate system status and reflect the actual process; a determinate indicator is appropriate when completion can be detected, while indeterminate motion is appropriate when it cannot [1]. Long waits benefit from visible progress and explanatory state, but the progress treatment should not be mistaken for the main product experience [2]. Battle-pass systems separate a reward track from core-game progression and rely on clear reward access states; the interface must make the current reward and unlock condition understandable before adding presentation [3]. The practical consequence is to make one object or destination carry the visual story and keep the measured progress/state text authoritative.

## References

[1]: https://m2.material.io/components/progress-indicators "Material Design: Progress indicators"
[2]: https://www.nngroup.com/articles/progress-indicators/ "Nielsen Norman Group: Progress Indicators Make a Slow System Less Insufferable"
[3]: https://uxdesign.cc/battle-pass-systems-d3e36ae11f72 "UX Collective: Designing premium pass systems in games"

## V4 authoring checkpoint

The v4 candidate changes the premise again. Loading is one progress-revealed VEXEA wordmark: one object, one material reveal, one honest percentage. Battle pass is one season docket: one destination reward, one current tier, and a quiet state record for nearby states. The v4 browser review and 390px/desktop captures show both stages contained and readable. They remain approval candidates only.

The runnable approval page is `vexea_ui_redesign_gauntlet_v4.html` at the temporary HTTP URL already used for the motion lab.
