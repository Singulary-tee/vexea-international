export type BlockoutPoint = { x: number; y: number; z: number };
export type BlockoutFootprintPoint = { x: number; z: number };

export type BlockoutElement = {
  id: string;
  name: string;
  kind: string;
  category: string;
  replaceWith: string;
  x: number;
  y: number;
  z: number;
  sizeX: number;
  height: number;
  sizeZ: number;
  floors: number;
  floorHeight: number;
  color: number;
  surface: string;
  tags: string[];
  width?: number;
  points?: BlockoutPoint[];
  footprint?: BlockoutFootprintPoint[];
};

export const blockoutContract = {
  contractId: "vexea_full_map_blockout_v2",
  mapId: "vexea_map_01_gameplay_first",
  source: "accepted OpenCV-derived image-first spatial catalog",
  purpose: "Named replaceable blockout composition for spatial review only; runtime gameplay topology remains authoritative elsewhere.",
  footprint: { sizeX: 840, sizeZ: 560, origin: { x: 0, z: 0 } },
  referenceHumanMeters: 1.8,
  rules: [
    "Every blockout element is named, tagged, dimensioned, colored, and assigned a replacement target.",
    "Buildings are closed masses or explicit non-enterable facades; no gameplay zone is implied to be a building.",
    "Surface segments carry intentional material and grade differences rather than a single flat ground plane.",
    "The core remains at the far end of the route and drone access/kill logic is represented separately from architecture.",
    "This layer is never imported into the runtime map as presentation geometry.",
  ],
  gameplayReferences: [
    "zone_spawn", "zone_warehouse", "zone_transition", "zone_industrial", "zone_vertical", "zone_plant", "zone_core",
    "image_deployment_plant", "image_camera_threshold", "volume_security_camera_sector", "connector_plant_threshold",
  ],
};

export const blockoutKindColors: Record<string, number> = {
  BUILDING_MASS: 0x8d9ba0,
  SURFACE_SEGMENT: 0x687b78,
  ROUTE_SEGMENT: 0xc39a5e,
  WALL_BOUNDARY: 0x9d7563,
  COVER: 0xb68b59,
  TERRAIN_SEGMENT: 0x74614c,
  WATER_EDGE: 0x3e7484,
  TUNNEL: 0x796b8a,
  AIR_ACCESS: 0x5a8e98,
  GROUND_DEPLOYMENT: 0x9c705e,
  KILL_ZONE: 0xad6758,
  CAMERA_SECTOR: 0x5a8a92,
  PLAYER_SPAWN: 0x7c9b69,
  UAV_OPENING: 0x5b8992,
  FACADE: 0xb27b62,
};

const tags = (...values: string[]) => values;

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
  color = blockoutKindColors[kind] ?? 0x687175,
  options: Partial<Pick<BlockoutElement, "floors" | "floorHeight" | "tags" | "footprint">> = {},
): BlockoutElement {
  return {
    id,
    name,
    kind,
    category,
    replaceWith,
    x,
    y,
    z,
    sizeX,
    height,
    sizeZ,
    floors: options.floors ?? Math.max(1, Math.round(height / 4)),
    floorHeight: options.floorHeight ?? 3.6,
    color,
    surface,
    tags: options.tags ?? tags("BLOCKOUT", "IMAGE_DERIVED", "STRUCTURE_BLOCKING"),
    footprint: options.footprint,
  };
}

function route(
  id: string,
  name: string,
  category: string,
  replaceWith: string,
  points: BlockoutPoint[],
  width: number,
  surface: string,
  color = blockoutKindColors.ROUTE_SEGMENT,
  extraTags: string[] = [],
): BlockoutElement {
  const first = points[0];
  const last = points[points.length - 1];
  const sizeX = Math.max(1, Math.abs(last.x - first.x));
  const sizeZ = Math.max(1, Math.abs(last.z - first.z));
  return {
    id,
    name,
    kind: "ROUTE_SEGMENT",
    category,
    replaceWith,
    x: (first.x + last.x) / 2,
    y: Math.min(...points.map((point) => point.y)),
    z: (first.z + last.z) / 2,
    sizeX,
    height: 0.18,
    sizeZ,
    floors: 0,
    floorHeight: 0,
    color,
    surface,
    width,
    points,
    tags: tags("BLOCKOUT", "IMAGE_DERIVED", "STRUCTURE_BLOCKING", ...extraTags),
  };
}

const openCvTags = tags("BLOCKOUT", "IMAGE_DERIVED", "OPEN_CV_CONTOUR", "IMAGE_IMPORT_CANDIDATE", "STRUCTURE_BLOCKING");
const surfaceTags = tags("BLOCKOUT", "IMAGE_DERIVED", "OPEN_CV_REGION", "IMAGE_IMPORT_CANDIDATE", "DENSE_FABRIC");
const cleanupTags = tags("BLOCKOUT", "IMAGE_DERIVED", "CLEANUP_BLOCKING", "STRUCTURE_BLOCKING");
const gameplayTags = tags("BLOCKOUT", "IMAGE_DERIVED", "GAMEPLAY_ANCHOR");

export const blockoutElements: BlockoutElement[] = [
  // The image-first pressure/plant hosts retained by the local slice review.
  rect("image_building_020_cleanBuilding", "Pressure plant shell host", "BUILDING_MASS", "building-mass", "volumetric plant shell", 216, 6.04, 65, 134, 31.32, 150, "CONCRETE", 0x89999e, { floors: 6, floorHeight: 4.8, tags: openCvTags }),
  rect("image_building_022_cleanBuilding", "Raised service annex", "BUILDING_MASS", "building-mass", "closed service annex", 275, 6.04, 44, 54, 18, 58, "CONCRETE", 0x89999e, { floors: 3, floorHeight: 4.8, tags: openCvTags }),
  rect("image_building_023_cleanBuilding", "Threshold utility hall", "BUILDING_MASS", "building-mass", "service-bay shell", 188, 6.04, -34, 46, 13, 34, "CONCRETE", 0x6e7f84, { floors: 2, floorHeight: 5, tags: openCvTags }),
  rect("image_building_024_cleanBuilding", "Plant side workshop", "BUILDING_MASS", "building-mass", "closed workshop", 143, 0.08, 40, 38, 9, 34, "CONCRETE", 0x6e7f84, { floors: 2, floorHeight: 4.5, tags: openCvTags }),
  rect("image_building_025_cleanBuilding", "Pressure yard utility block", "BUILDING_MASS", "building-mass", "utility block", 90, 0.03, 88, 32, 8, 25, "CONCRETE", 0x6e7f84, { floors: 2, floorHeight: 4, tags: openCvTags }),
  rect("image_building_026_cleanBuilding", "North maintenance hall", "BUILDING_MASS", "building-mass", "maintenance hall", 42, 0.03, 65, 48, 12, 54, "CONCRETE", 0x89999e, { floors: 2, floorHeight: 5, tags: openCvTags }),
  rect("image_building_027_cleanBuilding", "West operations block", "BUILDING_MASS", "building-mass", "operations block", -24, 0.03, 35, 42, 16, 38, "CONCRETE", 0x89999e, { floors: 3, floorHeight: 4.8, tags: openCvTags }),
  rect("image_building_028_cleanBuilding", "Low gate service building", "BUILDING_MASS", "building-mass", "gate service building", -74, 0.03, -18, 34, 7, 29, "CONCRETE", 0x6e7f84, { floors: 1, floorHeight: 4.5, tags: openCvTags }),
  rect("image_building_029_cleanBuilding", "Far-end core mass", "BUILDING_MASS", "building-mass", "closed core structure", 330, 6.04, 54, 72, 42, 76, "CONCRETE", 0xe8ecea, { floors: 8, floorHeight: 4.8, tags: openCvTags }),
  rect("image_surface_pressure_yard", "Pressure yard hardstand", "SURFACE_SEGMENT", "image-ground", "segmented asphalt and gravel yard", 74, 0.03, 76, 156, 0.24, 108, "ASPHALT", 0x354348, { floors: 0, floorHeight: 0, tags: surfaceTags }),
  rect("image_surface_plant_apron", "Raised plant apron", "SURFACE_SEGMENT", "image-route-surface", "raised service apron with curb and drains", 190, 6.04, 22, 164, 0.30, 74, "CONCRETE", 0x8b8e83, { floors: 0, floorHeight: 0, tags: surfaceTags }),

  // Broad map structure: deliberate height, material, route and boundary grammar.
  rect("blockout_floor_pressure_yard", "Pressure yard floor segment", "SURFACE_SEGMENT", "blockout-floor-segment", "segmented asphalt hardstand", 42, 0.03, 79, 188, 0.24, 124, "ASPHALT", 0x354348, { floors: 0, floorHeight: 0, tags: cleanupTags }),
  rect("blockout_floor_transition_court", "Transition court floor segment", "SURFACE_SEGMENT", "blockout-floor-segment", "concrete transition court", 143, 0.08, 30, 82, 0.24, 96, "MIXED", 0x647568, { floors: 0, floorHeight: 0, tags: cleanupTags }),
  rect("blockout_floor_raised_apron", "Raised plant apron floor segment", "SURFACE_SEGMENT", "blockout-floor-segment", "raised apron and drainage system", 221, 6.04, 26, 164, 0.30, 86, "CONCRETE", 0x8b8e83, { floors: 0, floorHeight: 0, tags: cleanupTags }),
  rect("blockout_floor_core_terrace", "Core terrace floor segment", "SURFACE_SEGMENT", "blockout-floor-segment", "terraced concrete core approach", 322, 9.04, 46, 102, 0.30, 92, "CONCRETE", 0x8b8e83, { floors: 0, floorHeight: 0, tags: cleanupTags }),
  rect("blockout_facade_warehouse_north", "North warehouse backdrop facade", "BUILDING_MASS", "facade-non-enterable", "closed backdrop warehouse", 70, 0.03, 152, 190, 30, 30, "CONCRETE", 0xb9c6c8, { floors: 6, floorHeight: 5, tags: cleanupTags }),
  rect("blockout_facade_service_south", "South service backdrop facade", "BUILDING_MASS", "facade-non-enterable", "closed low service frontage", 160, 0.08, -90, 190, 14, 26, "CONCRETE", 0x89999e, { floors: 2, floorHeight: 5, tags: cleanupTags }),
  rect("blockout_facade_core_backdrop", "Far-end core backdrop", "BUILDING_MASS", "facade-non-enterable", "closed core backdrop", 356, 9.04, 54, 84, 42, 78, "CONCRETE", 0xe8ecea, { floors: 8, floorHeight: 4.8, tags: cleanupTags }),
  rect("blockout_tower_plant", "Raised plant tower mass", "BUILDING_MASS", "building-mass", "volumetric plant tower", 250, 6.04, 72, 42, 54, 40, "CONCRETE", 0xe8ecea, { floors: 10, floorHeight: 4.8, tags: openCvTags }),
  rect("blockout_service_shed_west", "West service shed mass", "BUILDING_MASS", "building-mass", "closed low service shed", 132, 0.08, 48, 28, 12, 22, "CONCRETE", 0x89999e, { floors: 2, floorHeight: 4.5, tags: cleanupTags }),
  rect("blockout_cover_pressure_island", "Pressure yard directional cover", "COVER", "cover-directional", "cast concrete and steel hard cover", 93, 0.03, 79, 22, 2.8, 4, "CONCRETE", 0xb68b59, { floors: 0, floorHeight: 0, tags: tags("BLOCKOUT", "IMAGE_DERIVED", "CLEANUP_BLOCKING", "COVER_INTENTIONAL") }),
  rect("blockout_cover_transition_wing", "Transition court L-cover", "COVER", "cover-directional", "angled service-wall cover", 156, 0.08, 26, 18, 2.4, 5, "CONCRETE", 0xb68b59, { floors: 0, floorHeight: 0, tags: tags("BLOCKOUT", "IMAGE_DERIVED", "CLEANUP_BLOCKING", "COVER_INTENTIONAL") }),
  rect("blockout_wall_pressure_boundary", "Pressure yard west boundary", "WALL_BOUNDARY", "wall-boundary", "chainlink and solid utility wall", -2, 0.03, 74, 0.6, 4, 118, "CONCRETE", 0x9d7563, { floors: 0, floorHeight: 0, tags: cleanupTags }),
  rect("blockout_wall_plant_edge", "Raised plant edge wall", "WALL_BOUNDARY", "wall-boundary", "guarded retaining edge", 190, 6.04, -18, 160, 4, 0.6, "CONCRETE", 0x9d7563, { floors: 0, floorHeight: 0, tags: cleanupTags }),
  rect("blockout_terrain_north_rise", "North terrain rise", "TERRAIN_SEGMENT", "terrain-incline", "graded dirt and rock embankment", 82, 0.03, 184, 156, 14, 48, "DIRT", 0x76644f, { floors: 0, floorHeight: 0, tags: surfaceTags }),
  rect("blockout_terrain_east_cut", "East plant cut", "TERRAIN_SEGMENT", "terrain-incline", "rock cut with planted verge", 330, 6.04, 118, 72, 18, 48, "MIXED", 0x76644f, { floors: 0, floorHeight: 0, tags: surfaceTags }),
  rect("blockout_water_south_edge", "South drainage water edge", "WATER_EDGE", "water-edge", "drainage channel and wet edge", 174, -0.4, -132, 312, 0.6, 22, "MIXED", 0x2d6b82, { floors: 0, floorHeight: 0, tags: surfaceTags }),

  route("route_spawn_to_pressure", "Ground route from spawn yard", "image-route-surface", "segmented asphalt route", [{ x: -110, y: 0.03, z: -10 }, { x: -50, y: 0.03, z: 30 }, { x: 28, y: 0.03, z: 70 }, { x: 94, y: 0.03, z: 78 }], 14, "ASPHALT", 0xb88a3a, ["DENSE_FABRIC"]),
  route("route_pressure_to_threshold", "Pressure yard to threshold route", "image-route-surface", "curbed asphalt-to-concrete route", [{ x: 94, y: 0.03, z: 78 }, { x: 138, y: 0.08, z: 64 }, { x: 172, y: 0.08, z: 42 }, { x: 190, y: 6.04, z: 28 }], 12, "MIXED", 0xb88a3a, ["DENSE_FABRIC"]),
  route("route_threshold_to_plant", "Raised apron service route", "image-route-covered", "raised service apron route", [{ x: 190, y: 6.04, z: 28 }, { x: 232, y: 6.04, z: 25 }, { x: 280, y: 6.04, z: 44 }], 11, "CONCRETE", 0x4f776e, ["DENSE_FABRIC"]),
  route("route_plant_to_core", "Plant to far-end core route", "image-route-surface", "terraced core approach", [{ x: 280, y: 6.04, z: 44 }, { x: 320, y: 9.04, z: 48 }, { x: 350, y: 9.04, z: 54 }], 12, "CONCRETE", 0xb88a3a),
  route("route_covered_retreat", "Covered retreat route", "image-route-covered", "guarded covered service route", [{ x: 145, y: 6.04, z: 0 }, { x: 195, y: 6.04, z: 0 }, { x: 250, y: 6.04, z: 8 }], 10, "MIXED", 0x4f776e, ["DENSE_FABRIC"]),

  rect("blockout_stair_plant_access", "Plant pedestrian stair", "ROUTE_SEGMENT", "stair-interior", "30-rise physical stair assembly", 160, 0.08, -18, 8, 6, 14, "CONCRETE", 0xe2b36b, { floors: 0, floorHeight: 0, tags: tags("BLOCKOUT", "IMAGE_DERIVED", "STRUCTURE_BLOCKING", "STAIR_INTERIOR") }),
  rect("blockout_ramp_threshold", "Threshold ground ramp", "ROUTE_SEGMENT", "entrance-player", "18 m closed service ramp", 180, 0.08, 38, 18, 6, 18, "CONCRETE", 0xf0c36f, { floors: 0, floorHeight: 0, tags: tags("BLOCKOUT", "IMAGE_DERIVED", "STRUCTURE_BLOCKING", "ENTRANCE_ROUTE") }),
  rect("blockout_uav_opening_plant", "Plant roof UAV opening", "UAV_OPENING", "air-access-opening", "large roof aperture", 228, 6.04, 74, 26, 15, 18, "MIXED", 0x5b8992, { floors: 0, floorHeight: 0, tags: tags("BLOCKOUT", "IMAGE_DERIVED", "GAMEPLAY_ANCHOR", "UAV_ACCESS") }),
  rect("blockout_tunnel_threshold", "Threshold service tunnel", "TUNNEL", "tunnel-interior", "covered utility passage", 204, 2.5, -28, 12, 4, 42, "CONCRETE", 0x8476a1, { floors: 0, floorHeight: 0, tags: tags("BLOCKOUT", "IMAGE_DERIVED", "GAMEPLAY_ANCHOR", "TUNNEL_ROUTE") }),
  rect("blockout_air_lane_plant", "Plant air access volume", "AIR_ACCESS", "air-access-volume", "drone ingress lane", 232, 18, 64, 76, 24, 56, "MIXED", 0x5e8c9b, { floors: 0, floorHeight: 0, tags: tags("BLOCKOUT", "IMAGE_DERIVED", "GAMEPLAY_ANCHOR", "AIR_ACCESS") }),
  rect("blockout_ground_deployment_pressure", "Pressure yard ground deployment", "GROUND_DEPLOYMENT", "ground-deployment", "concealed vehicle deployment court", 58, 0.03, 84, 42, 3, 32, "ASPHALT", 0x9c705e, { floors: 0, floorHeight: 0, tags: gameplayTags }),
  rect("blockout_ground_deployment_plant", "Plant pursuit deployment", "GROUND_DEPLOYMENT", "ground-deployment", "raised pursuit deployment pocket", 244, 6.04, 32, 34, 3, 26, "CONCRETE", 0x9c705e, { floors: 0, floorHeight: 0, tags: gameplayTags }),
  rect("blockout_kill_zone_pressure", "Pressure yard concealed kill zone", "KILL_ZONE", "concealed-kill-zone", "closed static turret enclosure", 27, 0.03, 115, 18, 5, 16, "CONCRETE", 0xad6758, { floors: 0, floorHeight: 0, tags: tags("BLOCKOUT", "IMAGE_DERIVED", "GAMEPLAY_ANCHOR", "CLOSED_KILL_ZONE") }),
  rect("blockout_kill_zone_threshold", "Threshold concealed kill zone", "KILL_ZONE", "concealed-kill-zone", "guarded plant service enclosure", 210, 6.04, -4, 20, 6, 16, "CONCRETE", 0xad6758, { floors: 0, floorHeight: 0, tags: tags("BLOCKOUT", "IMAGE_DERIVED", "GAMEPLAY_ANCHOR", "CLOSED_KILL_ZONE") }),
  rect("blockout_camera_sector_threshold", "Threshold security camera sector", "CAMERA_SECTOR", "security-camera-sector", "destructible security-camera sector", 204, 6.04, 18, 38, 12, 32, "MIXED", 0x5a8a92, { floors: 0, floorHeight: 0, tags: tags("BLOCKOUT", "IMAGE_DERIVED", "GAMEPLAY_ANCHOR", "CAMERA_SECTOR") }),
  rect("blockout_player_spawn_pressure", "Pressure player spawn", "PLAYER_SPAWN", "player-spawn-volume", "player spawn and cover start", -112, 0.03, -12, 24, 2, 20, "ASPHALT", 0x7c9b69, { floors: 0, floorHeight: 0, tags: gameplayTags }),
];

export const blockoutLegend = [
  { kind: "BUILDING_MASS", label: "closed building mass" },
  { kind: "SURFACE_SEGMENT", label: "material/grade floor segment" },
  { kind: "ROUTE_SEGMENT", label: "route or physical climb" },
  { kind: "WALL_BOUNDARY", label: "boundary or retaining edge" },
  { kind: "COVER", label: "intentional cover" },
  { kind: "TERRAIN_SEGMENT", label: "terrain rise/cut" },
  { kind: "WATER_EDGE", label: "water/drainage edge" },
  { kind: "TUNNEL", label: "covered passage" },
  { kind: "AIR_ACCESS", label: "drone air-access volume" },
  { kind: "GROUND_DEPLOYMENT", label: "ground deployment" },
  { kind: "KILL_ZONE", label: "concealed kill zone" },
  { kind: "CAMERA_SECTOR", label: "destructible camera sector" },
  { kind: "PLAYER_SPAWN", label: "player spawn" },
];
