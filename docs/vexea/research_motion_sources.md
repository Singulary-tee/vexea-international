# Motion Research Notes

## Emil Kowalski: 7 Practical Animation Tips

Source: https://emilkowal.ski/ui/7-practical-animation-tips

The article recommends keeping routine UI animations generally under 300ms, using custom easing curves where they improve natural response, and removing animations or hover interactions when the interaction is seen tens or hundreds of times per day. It also recommends a short initial delay for tooltips but no delay or animation when moving between already-open tooltips. These principles support immediate icon feedback, short tab/filter transitions, and no theatrical motion for frequent keyboard-driven interactions.

## Emil Kowalski: You Don't Need Animations

Source: https://emilkowal.ski/ui/you-dont-need-animations

The article frames animation as purposeful when it explains a change, preserves spatial consistency, confirms an action, or adds occasional delight. It warns that frequent animations can make interfaces feel slow, annoying, and less trustworthy. It recommends no animation for actions repeated hundreds of times per day, and gives 180ms as a more responsive dropdown duration than 400ms. It also emphasizes that the goal is a better interface, not animation for its own sake.

## VEXEA application

For VEXEA, frequent icon hover/press feedback should be a short color/opacity response rather than a travel animation. Settings sliders should respond immediately and use only a restrained thumb/track response. Internal tab changes may use a short local content transition when the direction is spatially clear, but the selected tab state itself should not lag behind the input. Rare states such as match found, battle-pass claim, extraction success, or a faction commitment may earn a longer staged treatment because they communicate a meaningful state change and occur less often.

References:

[1]: https://emilkowal.ski/ui/7-practical-animation-tips "7 Practical Animation Tips"
[2]: https://emilkowal.ski/ui/you-dont-need-animations "You Don't Need Animations"
