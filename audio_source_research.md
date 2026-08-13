# VEXEA Audio Source Research — License-Safe Candidates

Date: 2026-08-13

## Verified sources

### 1. Sonniss GameAudioGDC archive
- URL: https://sonniss.com/gameaudiogdc/
- License statement on page: the archive sounds are royalty-free and commercially usable; attribution is not required; they may be used on unlimited projects permanently.
- Explicit restriction: raw standalone files must not be resold or redistributed as a sound-effect library; AI/ML training is prohibited.
- Best use: environmental/industrial ambiences, mechanical details, drone/engine design layers, impacts, wind, and polished production effects.
- Caveat: downloads may require a site workflow. Track original pack/version and selected-file provenance in the project source manifest.

### 2. Pixabay content
- URL: https://pixabay.com/service/license-summary/
- License summary: content may be used free of charge, without attribution, and may be modified/adapted, subject to prohibited uses.
- Relevant restriction: do not sell/distribute the source file on a standalone basis; check for third-party rights (recognizable trademarks/brands, etc.).
- Best use: individual wind, atmosphere, interface, generic mechanical, and music candidates where item-level provenance is recorded.

### 3. OpenGameArt: The Free Firearm Sound Library
- Page: https://opengameart.org/content/the-free-firearm-sound-library
- License: CC0 / public domain. Page quotes the original library as "CC0 NO RIGHTS RESERVED" and allows use without royalty or credit for personal/professional applications.
- Files: Prepared SFX Library (7z archive, 194 MB) and raw/prepared links to the original collection.
- Best use: source material for player pistol/rifle, humanoid firearm, UGV turret, and rifle-quadcopter fire/reload variants. Design should still process/distinguish derivative game cues before integration.

### 4. OpenGameArt CC0 Sound Effects collection
- Page: https://opengameart.org/content/cc0-sound-effects
- Page states "Sound effects with attribution not required" and links individual CC0 packs including firearm effects, grass/sand/stone footsteps, level-up/power-up/coin sounds, hurt/death, robot voice, machine shutdown, beeps, scrapes, and loopable ambience.
- Best use: supporting UI, footsteps, pickup/level/economy, damage, and generic mechanical one-shots. Each chosen sub-pack must have its individual license reviewed before download.

## Initial sourcing recommendation
- Use the Free Firearm Sound Library (CC0) for core ballistic source recordings.
- Use CC0 OpenGameArt sub-packs only after per-pack verification for low-complexity UI/footstep/surface sounds.
- Use Sonniss GameAudioGDC samples or a licensed commercial pack for the nuanced industrial ambience, servo, rotor, engine, wind, and impact material that needs richer production quality.
- Use Pixabay only for isolated sounds after logging item URL, author, and licensing snapshot.
- Do not treat any source asset as a separately redistributable item. Upload only processed/trimmed, game-integrated deliverables to the private R2 bucket, retain a provenance manifest in the repo.

## Source URLs
1. https://sonniss.com/gameaudiogdc/
2. https://pixabay.com/service/license-summary/
3. https://opengameart.org/content/the-free-firearm-sound-library
4. https://opengameart.org/content/cc0-sound-effects

### 5. OpenGameArt: 100 CC0 SFX
- URL: https://opengameart.org/content/100-cc0-sfx
- License: the page explicitly displays CC0/public domain.
- Contents: explosion, three machine loops, metal, hits, shots, switches, slams, springs, tools, and miscellaneous impacts.
- Downloaded source archive: `audio_sources/cc0_explosion_mechanical/100-CC0-SFX.zip`.
- Best use: grenade/bomber explosion source layer, C4/mine impacts, mechanical transitions, hit/damage layers, empty/interaction clicks, and UGV/humanoid mechanical source material.

### 6. OpenGameArt: 100 CC0 SFX #2
- URL: https://opengameart.org/content/100-cc0-sfx-2
- License: the page explicitly displays CC0/public domain.
- Contents: ambient, machine, construction-site, road, water, and wind-like loops; metal, hit, item, switch, wood, and footstep effects.
- Downloaded source archive: `audio_sources/cc0_utility_ambience/sfx_100_v2.zip`.
- Best use: first-pass interior/exterior ambience, UGV/drone mechanical layers, utility interactions, impacts, and filler environmental details.

### 7. OpenGameArt: Factory ambiance (third-music candidate)
- URL: https://opengameart.org/content/factory-ambiance
- License: the page explicitly displays CC0/public domain.
- File: `Factory.ogg` (2.5 MB).
- Stated use: background track for an industrial complex.
- Recommendation: retain it as the leading third-track candidate, but audition it alongside the two existing VEXEA tracks before publishing. It is appropriately restrained and may function better as an ambient menu/match layer than a strongly melodic theme.

### 8. Multi-surface footstep pack
- URL: https://opengameart.org/content/footsteps-on-different-surfaces
- Overall license: CC-BY 3.0.
- Contents: normal/concrete, grass/dirt, gravel/rubble, metal, tile, water, wood, plus mechanical and other footsteps.
- Downloaded source archive: `audio_sources/footsteps_multisurface/footsteps.zip`.
- Embedded source notes: gravel is CC0; concrete/boots, grass, metal, tile, and mechanical sources are CC-BY 3.0 and require credit. The wood source references the original creator but the embedded file has no license URL, so do not ship wood cues until its upstream licensing is separately verified.

### 9. Fantozzi footstep pack
- URL: https://opengameart.org/content/fantozzis-footsteps-grasssand-stone
- License: CC0/public domain.
- Contents: 12 individually sliced grass/sand and stone/hard-surface steps, supplied as Ogg Vorbis and FLAC.
- Downloaded source archive: `audio_sources/footsteps_cc0/Fantozzi-footsteps.7z`.
- Best use: a no-attribution fallback for gravel/ground and hard/concrete-like movement variations.
