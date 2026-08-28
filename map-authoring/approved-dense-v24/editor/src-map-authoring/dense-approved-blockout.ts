import type { BlockoutElement, BlockoutPoint } from "./blockout-data";

const approvedTags = ["BLOCKOUT", "IMAGE_DERIVED", "APPROVED_DENSE_BLOCKOUT", "STRUCTURE_BLOCKING"];
const surfaceTags = [...approvedTags, "DENSE_FABRIC"];
const gameplayTags = [...approvedTags, "GAMEPLAY_ANCHOR"];

function rect(
  id: string,
  name: string,
  kind: string,
  category: string,
  replaceWith: string,
  x: number,
  y: number,
  z: number,
  sizeX: number,
  height: number,
  sizeZ: number,
  surface: string,
  color: number,
  tags = approvedTags,
  floors = height > 0 ? Math.max(1, Math.round(height / 4)) : 0,
): BlockoutElement {
  return { id, name, kind, category, replaceWith, x, y, z, sizeX, height, sizeZ, floors, floorHeight: floors ? height / floors : 0, color, surface, tags };
}

function route(
  id: string,
  name: string,
  replaceWith: string,
  points: BlockoutPoint[],
  width: number,
  surface: string,
  color = 0xd0a24e,
): BlockoutElement {
  const first = points[0];
  const last = points[points.length - 1];
  return {
    id,
    name,
    kind: "ROUTE_SEGMENT",
    category: "approved-dense-route",
    replaceWith,
    x: (first.x + last.x) / 2,
    y: Math.min(...points.map((point) => point.y)),
    z: (first.z + last.z) / 2,
    sizeX: Math.max(1, Math.abs(last.x - first.x)),
    height: 0.22,
    sizeZ: Math.max(1, Math.abs(last.z - first.z)),
    floors: 0,
    floorHeight: 0,
    color,
    surface,
    width,
    points,
    tags: surfaceTags,
  };
}

const building = (id: string, name: string, x: number, z: number, sx: number, h: number, sz: number, category = "approved-building-mass", y = 0, color = h >= 30 ? 0xd8e0df : h >= 20 ? 0xb8c5c5 : 0x879699) => rect(id, name, "BUILDING_MASS", category, "volumetric industrial building with real depth", x, y, z, sx, h, sz, "CONCRETE", color, approvedTags, Math.max(1, Math.round(h / 4)));
const service = (id: string, name: string, x: number, z: number, sx: number, sz: number, h = 6, y = 0) => rect(id, name, "BUILDING_MASS", "approved-service-mass", "grounded service annex or utility enclosure", x, y, z, sx, h, sz, "MIXED", 0x6e7d7d, approvedTags, Math.max(1, Math.round(h / 4)));
const surface = (id: string, name: string, x: number, y: number, z: number, sx: number, h: number, sz: number, material: string, color: number, tags = surfaceTags) => rect(id, name, "SURFACE_SEGMENT", "approved-ground-segment", "segmented grounded surface with curb/drain hierarchy", x, y, z, sx, h, sz, material, color, tags, 0);
const cover = (id: string, name: string, x: number, y: number, z: number, sx: number, h: number, sz: number, surface = "CONCRETE") => rect(id, name, "COVER", "approved-directional-cover", "profiled deliberate combat cover", x, y, z, sx, h, sz, surface, 0x6f7b76, [...gameplayTags, "COVER_INTENTIONAL"]);

export const denseApprovedBlockoutElements: BlockoutElement[] = [
  building("dense_gatehouse", "Gatehouse / west arrival control", -292, 142, 70, 11, 55, "approved-gatehouse"),
  building("dense_north_service_shed", "North service shed / 2 floors", -184, 80, 118, 16, 48),
  building("dense_pressure_store", "Pressure store / closed warehouse", 26, 138, 78, 14, 48),
  building("dense_loading_hall", "Loading hall / enterable warehouse", -66, 62, 112, 18, 92),
  building("dense_maintenance_block", "Maintenance block / workshop", -184, -20, 104, 15, 86),
  building("dense_processing_hall", "Processing hall / 5 floors / raised base", 214, 26, 138, 28, 154, "approved-plant-mass", 6),
  building("dense_service_tower", "Service tower / high vertical landmark", 258, 48, 58, 40, 58, "approved-tower-mass", 6),
  building("dense_plant_annex", "Plant annex / enterable service mass", 304, -92, 76, 16, 62, "approved-plant-mass"),
  building("dense_security_hall", "Security hall / raised threshold", 38, -144, 112, 18, 58, "approved-security-mass", 6),
  building("dense_core_yard_shelter", "Core yard shelter / cover building", -66, -230, 72, 13, 58, "approved-core-yard"),
  building("dense_core_operations_hall", "Core operations hall / 6 floors / far-end objective", 48, -258, 142, 34, 76, "approved-core-mass"),
  building("dense_core_service_wing", "Core service wing / far-end flank", 160, -240, 68, 18, 58, "approved-core-mass"),
  service("dense_yard_utility_stack", "Yard utility stack / service court", 112, 78, 54, 44, 17),
  service("dense_substation", "East substation / fenced electrical node", 374, 54, 62, 60, 12),
  service("dense_concrete_mix_court", "Concrete and mix court / service court", -80, -18, 40, 34, 5),
  service("dense_deployment_bay_shelter", "Enclosed deployment bay shelter", -94, -65, 46, 32, 6),
  service("dense_surveillance_anchor_west", "West surveillance anchor enclosure", -96, -148, 34, 30, 7),
  service("dense_surveillance_anchor_east", "East surveillance anchor enclosure", 142, -148, 34, 30, 7),
  service("dense_checkpoint_court_north", "Checkpoint court north service room", 8, -184, 38, 22, 6),
  service("dense_checkpoint_court_south", "Checkpoint court south service room", 72, -184, 38, 22, 6),

  // Ground segments in the approved image layout: no single plane is used as the blockout surface.
  surface("dense_surface_spawn_apron", "Spawn safe apron / paved", -340, 0.1, 210, 0.24, 48, 44, "MIXED", 0x687b78),
  surface("dense_surface_gate_square", "Gate square / mixed hardstand", -292, 0.12, 120, 0.22, 74, 72, "MIXED", 0x647568),
  surface("dense_surface_north_court", "North service court / concrete", -176, 0.12, 110, 0.22, 42, 38, "CONCRETE", 0x8b8e83),
  surface("dense_surface_pressure_yard", "Open pressure yard / fixed-wing sky yard", 78, 0.14, 164, 0.22, 120, 114, "CONCRETE", 0x7f9aa5),
  surface("dense_surface_switchyard", "Switchyard / segmented electrical court", 78, 0.16, 150, 0.22, 124, 132, "MIXED", 0x647568),
  surface("dense_surface_mix_court", "Concrete mix courts", -75, 0.12, 84, 0.22, 68, 52, "CONCRETE", 0x8b8e83),
  surface("dense_surface_security_threshold", "Security threshold / raised concrete", 38, 6.14, -144, 0.22, 140, 72, "CONCRETE", 0x8b8e83),
  surface("dense_surface_core_terrace", "Far-end core terrace / concrete", 48, 0.18, -258, 0.22, 190, 116, "CONCRETE", 0x8b8e83),
  surface("dense_surface_plant_incline", "Plant incline / graded mixed surface", 248, 3.0, -64, 0.28, 92, 112, "MIXED", 0x76644f, [...surfaceTags, "GRADE_CHANGE"]),
  surface("dense_surface_east_runoff", "East runoff reservoir / water edge", 426, -0.4, 28, 10, 0.6, 512, "WATER", 0x2d6b82),
  { ...surface("dense_surface_west_green_court", "West service green court segment", -258, -0.02, 26, 250, 0.18, 290, "MIXED", 0x4f6b59), footprint: [{ x: -404, z: 262 }, { x: -214, z: 262 }, { x: -112, z: 144 }, { x: -124, z: -142 }, { x: -306, z: -176 }, { x: -404, z: -74 }] },
  { ...surface("dense_surface_switchyard_green_court", "Switchyard planted court segment", 76, -0.02, 40, 194, 0.18, 212, "MIXED", 0x526f5b), footprint: [{ x: -28, z: 154 }, { x: 158, z: 154 }, { x: 188, z: 78 }, { x: 174, z: -90 }, { x: -26, z: -90 }, { x: -48, z: 38 }] },
  { ...surface("dense_surface_plant_green_court", "East plant green court segment", 286, -0.02, 10, 210, 0.18, 330, "MIXED", 0x4c6656), footprint: [{ x: 168, z: 164 }, { x: 374, z: 164 }, { x: 396, z: 54 }, { x: 382, z: -188 }, { x: 194, z: -184 }, { x: 168, z: -98 }] },
  { ...surface("dense_surface_core_green_court", "Core approach planted court segment", 44, -0.02, -228, 270, 0.18, 132, "MIXED", 0x536c5a), footprint: [{ x: -164, z: -176 }, { x: 190, z: -176 }, { x: 216, z: -294 }, { x: -162, z: -294 }] },

  // Main and covered routes retained as named image-derived segments.
  route("dense_route_west_arrival", "West perimeter arrival road", "segmented asphalt perimeter route", [{ x: -438, y: 0.1, z: 190 }, { x: -380, y: 0.1, z: 190 }, { x: -350, y: 0.1, z: 160 }, { x: -340, y: 0.1, z: 120 }], 14, "ASPHALT"),
  route("dense_route_north_exit", "North exit to ridgeline road", "segmented asphalt exit route", [{ x: -260, y: 0.1, z: 292 }, { x: -260, y: 0.1, z: 250 }, { x: -300, y: 0.1, z: 230 }], 12, "ASPHALT"),
  route("dense_route_rear_alley", "Rear alley behind north service shed", "curbed service alley", [{ x: -340, y: 0.1, z: 170 }, { x: -260, y: 0.1, z: 170 }, { x: -180, y: 0.1, z: 164 }, { x: -90, y: 0.1, z: 164 }, { x: -24, y: 0.1, z: 158 }], 10, "MIXED"),
  route("dense_route_north_ring", "North ring around switchyard", "segmented north ring route", [{ x: -90, y: 0.1, z: 156 }, { x: 40, y: 0.1, z: 156 }, { x: 176, y: 0.1, z: 150 }, { x: 250, y: 0.1, z: 126 }], 12, "ASPHALT"),
  route("dense_route_bare_spine", "Bare spine / vertical link", "straight service spine", [{ x: -12, y: 0.1, z: 162 }, { x: -12, y: 0.1, z: 70 }, { x: -12, y: 0.1, z: -44 }], 10, "MIXED"),
  route("dense_route_cross_link", "Cross-link between switchyard and processing hall", "curbed cross-link route", [{ x: 154, y: 0.1, z: 142 }, { x: 182, y: 0.1, z: 70 }, { x: 180, y: 6.1, z: 10 }, { x: 180, y: 6.1, z: -70 }], 11, "MIXED"),
  route("dense_route_south_retreat", "South retreat lane", "covered-capable retreat route", [{ x: -58, y: 0.1, z: -58 }, { x: 30, y: 0.1, z: -66 }, { x: 122, y: 0.1, z: -68 }, { x: 190, y: 6.1, z: -74 }], 12, "ASPHALT"),
  route("dense_route_security_approach", "Security approach / checkpoint court", "raised threshold approach", [{ x: 38, y: 0.1, z: -74 }, { x: 38, y: 6.1, z: -116 }, { x: 38, y: 6.1, z: -178 }], 12, "CONCRETE"),
  route("dense_route_core_approach", "Plant to far-end core approach", "terraced objective approach", [{ x: 214, y: 6.1, z: -116 }, { x: 180, y: 0.1, z: -178 }, { x: 120, y: 0.1, z: -220 }, { x: 48, y: 0.1, z: -258 }], 12, "CONCRETE"),
  route("dense_route_plant_service_flank", "East plant service flank", "curbed plant flank route", [{ x: 322, y: 0.1, z: 152 }, { x: 352, y: 0.1, z: 80 }, { x: 360, y: 0.1, z: -10 }, { x: 360, y: 0.1, z: -108 }, { x: 314, y: 0.1, z: -160 }], 12, "ASPHALT"),
  route("dense_route_core_service_loop", "Core service loop", "closed core service loop", [{ x: -132, y: 0.1, z: -234 }, { x: -100, y: 0.1, z: -286 }, { x: 48, y: 0.1, z: -304 }, { x: 198, y: 0.1, z: -278 }, { x: 204, y: 0.1, z: -224 }], 11, "ASPHALT"),
  route("dense_route_tunnel_xray", "Tunnel / X-ray below-grade passage", "covered below-grade tunnel", [{ x: 38, y: 6.1, z: -184 }, { x: 38, y: -4, z: -212 }, { x: 96, y: -4, z: -228 }, { x: 154, y: -4, z: -250 }], 10, "MIXED", 0x8d79b0),

  // Dense switchyard and service-court structures. Each is named so it can later be replaced by a sourced/procedural family.
  service("dense_switchgear_01", "Switchyard transformer 01", 22, 84, 18, 24, 6), service("dense_switchgear_02", "Switchyard transformer 02", 72, 84, 18, 24, 6), service("dense_switchgear_03", "Switchyard transformer 03", 122, 84, 18, 24, 6),
  service("dense_switchgear_04", "Switchyard transformer 04", 22, 38, 18, 24, 6), service("dense_switchgear_05", "Switchyard transformer 05", 72, 38, 18, 24, 6), service("dense_switchgear_06", "Switchyard transformer 06", 122, 38, 18, 24, 6),
  service("dense_switchgear_07", "Switchyard transformer 07", 22, -12, 18, 24, 6), service("dense_switchgear_08", "Switchyard transformer 08", 72, -12, 18, 24, 6), service("dense_switchgear_09", "Switchyard transformer 09", 122, -12, 18, 24, 6),
  service("dense_switchgear_10", "Switchyard transformer 10", 22, -58, 18, 24, 6), service("dense_switchgear_11", "Switchyard transformer 11", 72, -58, 18, 24, 6), service("dense_switchgear_12", "Switchyard transformer 12", 122, -58, 18, 24, 6),
  service("dense_service_pod_01", "North ring service pod 01", -32, 122, 16, 22, 5), service("dense_service_pod_02", "North ring service pod 02", 164, 112, 16, 22, 5), service("dense_service_pod_03", "Plant flank service pod 03", 286, 112, 18, 24, 6), service("dense_service_pod_04", "Plant flank service pod 04", 286, 16, 18, 24, 6), service("dense_service_pod_05", "Plant flank service pod 05", 286, -18, 18, 24, 6), service("dense_service_pod_06", "South lane service pod 06", 176, -104, 18, 24, 5),
  service("dense_gate_pod_01", "Gate square utility pod 01", -340, 126, 18, 20, 5),   service("dense_gate_pod_02", "Gate square utility pod 02", -242, 112, 18, 20, 5),   service("dense_gate_pod_03", "Loading court utility pod 03", -110, 121, 18, 24, 6),   service("dense_gate_pod_04", "Loading court utility pod 04", 2, 98, 18, 24, 6),

  // Deliberate cover and route-edge blocks.
  cover("dense_cover_gate_square", "Gate square directional cover", -284, 0.2, 112, 26, 2.8, 5),
  cover("dense_cover_loading_south", "Loading hall south corner cover", -116, 0.2, 14, 18, 2.4, 5),
  cover("dense_cover_mix_court", "Concrete mix court cover", -82, 0.2, -44, 24, 2.2, 5),
  cover("dense_cover_switchyard_north", "Switchyard north directional cover", 88, 0.2, 132, 28, 2.4, 5),
  cover("dense_cover_switchyard_south", "Switchyard south directional cover", 92, 0.2, -82, 32, 2.4, 5),
  cover("dense_cover_security_west", "Security approach west cover", -30, 6.2, -128, 18, 2.4, 5),
  cover("dense_cover_security_east", "Security approach east cover", 108, 6.2, -128, 18, 2.4, 5),
  cover("dense_cover_checkpoint_mouth", "Checkpoint tunnel-mouth barricade", 38, 6.2, -194, 20, 2.8, 5),
  cover("dense_cover_core_west", "Core approach west cover", -34, 0.2, -220, 22, 2.8, 5),
  cover("dense_cover_core_east", "Core approach east cover", 134, 0.2, -220, 22, 2.8, 5),

  // Verticality, air access, deployment, camera, spawn, and kill-zone records remain explicit.
  rect("dense_stair_plant_threshold", "Plant threshold pedestrian stair / 30 rises", "ROUTE_SEGMENT", "stair-interior", "30-rise physical stair assembly", 192, 0.1, -118, 8, 6, 14, "CONCRETE", 0xe2b36b, gameplayTags),
  rect("dense_stair_core_threshold", "Core approach pedestrian stair / 30 rises", "ROUTE_SEGMENT", "stair-interior", "30-rise physical stair assembly", 154, 0.1, -202, 8, 6, 14, "CONCRETE", 0xe2b36b, gameplayTags),
  rect("dense_ramp_loading_threshold", "Loading-to-plant vehicle ramp", "ROUTE_SEGMENT", "entrance-player", "18 m closed service ramp", 184, 0.1, 42, 18, 6, 18, "CONCRETE", 0xf0c36f, gameplayTags),
  rect("dense_uav_open_pressure_yard", "Open-sky fixed-wing yard", "AIR_ACCESS", "air-access-volume", "open roof and quadcopter ingress volume", 78, 0.2, 102, 100, 20, 84, "OPEN_SKY", 0x5b8992, gameplayTags),
  rect("dense_uav_plant_roof_opening", "Processing roof UAV opening", "UAV_OPENING", "air-access-opening", "large roof aperture for quadcopters", 214, 34, 26, 32, 12, 24, "OPEN_SKY", 0x5b8992, gameplayTags),
  rect("dense_ground_deployment_west", "West enclosed ground-unit deployment bays", "GROUND_DEPLOYMENT", "ground-deployment", "closed deployment compound", -112, 0.2, -64, 38, 4, 28, "CONCRETE", 0x9c705e, gameplayTags),
  rect("dense_ground_deployment_core", "Core pursuit deployment pocket", "GROUND_DEPLOYMENT", "ground-deployment", "raised pursuit deployment pocket", 168, 0.2, -180, 34, 4, 28, "CONCRETE", 0x9c705e, gameplayTags),
  rect("dense_kill_zone_west", "West perimeter concealed kill zone", "KILL_ZONE", "concealed-kill-zone", "closed static-turret enclosure", -352, 0.2, 94, 24, 6, 22, "CONCRETE", 0xad6758, gameplayTags),
  rect("dense_kill_zone_plant", "Plant threshold concealed kill zone", "KILL_ZONE", "concealed-kill-zone", "guarded plant service enclosure", 220, 6.2, -48, 24, 6, 18, "CONCRETE", 0xad6758, gameplayTags),
  rect("dense_camera_sector_security", "Security hall destructible camera sector", "CAMERA_SECTOR", "security-camera-sector", "destructible camera sector", 38, 6.2, -112, 72, 12, 48, "MIXED", 0x5a8a92, gameplayTags),
  rect("dense_player_spawn_west", "Contractor spawn / safe west apron", "PLAYER_SPAWN", "player-spawn-volume", "player spawn and safe apron", -348, 0.2, 210, 42, 3, 34, "MIXED", 0x7c9b69, gameplayTags),

  // Perimeter terrain and waterbody boundaries frame the playable campus rather than floating in empty space.
  rect("dense_terrain_west_ridge", "West mountain boundary / rock cut", "TERRAIN_SEGMENT", "mountain-boundary", "grounded rock and planted ridge", -418, 0, 20, 22, 14, 500, "DIRT", 0x74614c, surfaceTags),
  rect("dense_terrain_north_ridge", "North mountain boundary / ridge line", "TERRAIN_SEGMENT", "mountain-boundary", "grounded rock ridge", -20, 0, 294, 780, 14, 22, "DIRT", 0x74614c, surfaceTags),
  rect("dense_terrain_south_ridge", "South mountain boundary / core cut", "TERRAIN_SEGMENT", "mountain-boundary", "grounded rock ridge", -20, 0, -302, 780, 14, 24, "DIRT", 0x74614c, surfaceTags),
  rect("dense_terrain_east_ridge", "East runoff ridge / plant cut", "TERRAIN_SEGMENT", "mountain-boundary", "grounded rock and planted east ridge", 418, 0, -10, 22, 16, 470, "MIXED", 0x74614c, surfaceTags),
];
