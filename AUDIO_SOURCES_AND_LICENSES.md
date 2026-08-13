# VEXEA Audio Source and License Record

This document records the provenance of the first-pass R2 audio library. Files were normalized into Opus; short variants use trimming, tempo adjustment, downmixing for spatial playback, or loudness normalization. These transformations do not alter the underlying license obligations.

| Source collection | License | Original author / publisher | Source URL | Use in VEXEA |
|---|---|---|---|---|
| The Free Firearm Sound Library | CC0 1.0 / public domain | Ben Jaszczak, Brian Nelson, Kevin Heras, Matthew Nanney | https://opengameart.org/content/the-free-firearm-sound-library | Player pistol/rifle/SMG and distinct humanoid, UGV, and rifle-quadcopter weapon discharges |
| Fantozzi's Footsteps (Grass/Sand & Stone) | CC0 1.0 / public domain | Fantozzi; package submitted by qubodup | https://opengameart.org/content/fantozzis-footsteps-grasssand-stone | Hard-surface and ground movement variants |
| 100 CC0 SFX | CC0 1.0 / public domain | rubberduck | https://opengameart.org/content/100-cc0-sfx | Explosion, equipment placement, mechanical, metal, hit, UI, and interaction layers |
| 100 CC0 SFX #2 | CC0 1.0 / public domain | rubberduck | https://opengameart.org/content/100-cc0-sfx-2 | Ambient, mechanical, wind, utility, UI, and wood-footstep source layers |
| 30 CC0 SFX loops | CC0 1.0 / public domain | rubberduck | https://opengameart.org/content/30-cc0-sfx-loops | Quadcopter, bomber, recon, UGV, UAV, jammer, commander, and ambient loops |
| Footsteps on different surfaces | CC-BY 3.0 and CC0, per embedded license files | congusbongus package; underlying creators include swuing, Ali_6868, Eelke, Lee Barkovich, and ceberation | https://opengameart.org/content/footsteps-on-different-surfaces | Gravel, metal, and robotic step variants; credit is required for the CC-BY elements below |
| Factory ambiance | CC0 1.0 / public domain | yd | https://opengameart.org/content/factory-ambiance | Third music track, `factory_ambience.opus` |

## Required credit for CC-BY selections

The following shipped files derive from the `Footsteps on different surfaces` package and should be included in an in-game credits page, attribution document, or equivalent distribution notice.

| R2 asset family | Required credit | License |
|---|---|---|
| `Audio/Sfx/Locomotion/walk_metal_*` and `run_metal_*` | Derived from “fboots on aluminum ladder 01” by Eelke, https://freesound.org/people/Eelke/sounds/462598/ | CC-BY 3.0 |
| `Audio/Sfx/Drones/quadruped_step.opus` and `humanoid_mechanical_step.opus` | Derived from “Robotic mechanic step sounds” by Lee Barkovich, http://www.archive.org/details/Berklee44Barkovich | CC-BY 3.0 |

The gravel files originate from the CC0 Gravel Footsteps collection by Ali_6868. Attribution is not legally required for those files, but the source is retained for traceability.

## Deliberate exclusions

The wood files from the multi-surface footstep package were not used because their embedded note identifies the original source without an upstream license. Wood movement in this first pass instead uses the CC0 `100 CC0 SFX #2` collection. A Freesound helicopter loop was evaluated but excluded because it requires a separate authenticated download path.

## Technical normalization policy

All R2 audio is Opus encoded at 48 kHz in an Ogg-compatible container, uses `.opus` filenames, and has `audio/ogg` object metadata. World-space sounds are mono; UI, ambience, and music are stereo. The reproducible transformations are defined in `tools/build_audio_pack.sh`.
