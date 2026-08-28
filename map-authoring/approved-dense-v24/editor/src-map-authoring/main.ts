import * as THREE from "three/webgpu";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { HDRLoader } from "three/examples/jsm/loaders/HDRLoader.js";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { abs, color, float, fract, mix, positionLocal, positionWorld, smoothstep } from "three/tsl";
import { blockoutContract, blockoutElements, blockoutKindColors, blockoutLegend, type BlockoutElement } from "./blockout-data";
import { imageContourSeedElements, imageContourSeedStats } from "./image-contour-seed";
import { denseApprovedBlockoutElements } from "./dense-approved-blockout";
import { pressurePlantSliceDetails, type PressurePlantSliceDetail } from "./pressure-plant-slice-details";
import { addLowShedCameraFacingForecourt } from "./pressure-plant-forecourt";
import { addPlantWestServiceFrontage } from "./pressure-plant-shell-frontage";
import { addTreeRoutePlantingStrip } from "./pressure-plant-planting-strip";
import { addPressureYardGroundFinish } from "./pressure-plant-ground-finish";
import { addPressureYardCoverRhythm } from "./pressure-plant-cover-rhythm";
import { addPressurePlantCameraGroundHierarchy } from "./pressure-plant-camera-ground-hierarchy";
import { addPressurePlantCameraLightTower } from "./pressure-plant-camera-light-tower";
import { addPressurePlantCameraProcessCatwalk } from "./pressure-plant-camera-process-catwalk";

type SpaceRole = "INSERTION" | "TRANSITION" | "OPEN_PRESSURE" | "INDUSTRIAL" | "VERTICAL_LINK" | "THRESHOLD" | "CORE";
type ViewMode = "perspective" | "top" | "axon";
type ReviewMode = "site" | "gameplay" | "systems" | "slice" | "core_approach" | "blockout" | "custom";

type SpaceRecord = {
  id: string;
  displayName: string;
  role: SpaceRole;
  description: string;
  center: { x: number; z: number };
  size: { x: number; z: number };
  height: number;
  floorY: number;
  color: number;
  tags: string[];
  gameplay: string[];
};

type RouteRecord = {
  id: string;
  displayName: string;
  kind: "PRIMARY" | "FLANK" | "ELEVATED";
  points: Array<{ x: number; y: number; z: number }>;
  spaces: string[];
};

type VolumeRecord = {
  id: string;
  displayName: string;
  kind: "PLAYER_SPAWN" | "AIR_ACCESS" | "GROUND_DEPLOYMENT" | "CONCEALED_KILL_ZONE" | "CAMERA_SECTOR";
  center: { x: number; y: number; z: number };
  size: { x: number; y: number; z: number };
  color: number;
  description: string;
  linkedZone?: string;
  droneClasses?: string[];
  closedArchitectureRequired?: boolean;
};

type BuildingMassRecord = {
  id: string;
  displayName: string;
  zone: string;
  kind: "GATEHOUSE" | "WAREHOUSE" | "WORKSHOP" | "PLANT" | "SECURITY" | "CORE" | "SERVICE";
  center: { x: number; z: number };
  size: { x: number; z: number };
  height: number;
  floorY: number;
  description: string;
};

type ConnectorRecord = {
  id: string;
  displayName: string;
  kind: "ARRIVAL_ROAD" | "LOADING_COURT" | "COVERED_LANE" | "PLANT_THRESHOLD" | "SECURITY_APPROACH";
  points: Array<{ x: number; y: number; z: number }>;
  width: number;
  color: number;
  linkedSpaces: string[];
  description: string;
};

type SiteFabricRecord = {
  id: string;
  displayName: string;
  kind: "CAMPUS_SURFACE" | "ROAD" | "COURT" | "SERVICE_BAND" | "PERIMETER_WALL";
  center: { x: number; y: number; z: number };
  size: { x: number; y: number; z: number };
  color: number;
  description: string;
};

type AuthoringAssetRecord = {
  id: string;
  displayName: string;
  kind: "MODEL" | "MATERIAL" | "HDRI";
  source: string;
  localPath: string;
  license: "CC0" | "CC-BY-4.0" | "ORIGINAL";
  role: string;
  runtimeNote: string;
};

type RuntimeZoneRecord = {
  id: string;
  displayName: string;
  authoringSpace: string;
  threatLevel: number;
  airAccess: boolean;
  playerSpawn: boolean;
  droneSpawn: boolean;
  droneSpawnClasses: string[];
  authoringBounds: { center: { x: number; y: number; z: number }; halfSize: { x: number; y: number; z: number } };
  commanderUse: string;
  semanticAnchor?: string;
};

type CombatSpaceRecord = {
  id: string;
  zone: string;
  coverProfile: "LOW" | "MIXED" | "HIGH";
  exposureProfile: "OPEN" | "MIXED" | "ENCLOSED";
  playerUse: string;
  playerCounterplay: string[];
  commanderPressure: string[];
  coverDetailIds?: string[];
};

const spaces: SpaceRecord[] = [
  {
    id: "space_insertion_edge",
    displayName: "Insertion Edge",
    role: "INSERTION",
    description: "A believable perimeter arrival: service road, security approach, and a first sightline into the facility.",
    center: { x: -292, z: 178 },
    size: { x: 190, z: 152 },
    height: 10,
    floorY: 0,
    color: 0x5e7f86,
    tags: ["PLAYER SPAWN", "LOW THREAT", "PERIMETER"],
    gameplay: ["player spawn", "safe staging", "limited drone access"],
  },
  {
    id: "space_service_district",
    displayName: "Service District",
    role: "TRANSITION",
    description: "A layered access district of loading, maintenance, and administrative edges that gives the team its first route choice.",
    center: { x: -158, z: 66 },
    size: { x: 230, z: 174 },
    height: 16,
    floorY: 0,
    color: 0x7a7566,
    tags: ["FIRST ROUTE SPLIT", "GROUND COVER", "CAMERA DENSE"],
    gameplay: ["first surveillance threshold", "ground-unit staging", "flank connector"],
  },
  {
    id: "space_open_pressure_yard",
    displayName: "Open Pressure Yard",
    role: "OPEN_PRESSURE",
    description: "A broad operational yard that makes aerial pressure visible and creates a strong fixed-wing event space.",
    center: { x: 78, z: 102 },
    size: { x: 300, z: 190 },
    height: 3,
    floorY: 0,
    color: 0x65755e,
    tags: ["AIR ACCESS", "FIXED-WING SPACE", "EXPOSURE"],
    gameplay: ["aerial deployment", "long sightline", "cover islands"],
  },
  {
    id: "space_industrial_plant",
    displayName: "Industrial Plant",
    role: "INDUSTRIAL",
    description: "The dense working heart of the map: large masses, nav-mesh lanes, vertical service access, and heavy ground pressure.",
    center: { x: 226, z: -34 },
    size: { x: 266, z: 226 },
    height: 23,
    floorY: 6,
    color: 0x765f56,
    tags: ["NAV MESH", "GROUND PRESSURE", "VERTICAL ROUTE"],
    gameplay: ["wheeled drone hold", "robot dog pursuit", "roof access"],
  },
  {
    id: "space_bridge_maintenance",
    displayName: "Maintenance Bridge",
    role: "VERTICAL_LINK",
    description: "A raised maintenance connector between the open yard and security threshold, providing a risky combat route and a meaningful bridge node for commander topology.",
    center: { x: 178, z: -18 },
    size: { x: 112, z: 76 },
    height: 9,
    floorY: 26,
    color: 0x6d7070,
    tags: ["BRIDGE NODE", "ELEVATED ROUTE", "EXPOSURE"],
    gameplay: ["elevated combat route", "bridge zone", "camera-visible transition"],
  },
  {
    id: "space_security_threshold",
    displayName: "Security Threshold",
    role: "THRESHOLD",
    description: "A compressed, controlled approach where surveillance and access control intensify before the final core complex.",
    center: { x: 52, z: -145 },
    size: { x: 190, z: 126 },
    height: 15,
    floorY: 11,
    color: 0x62576c,
    tags: ["SURVEILLANCE GATE", "VERTICAL LINK", "ESCALATION"],
    gameplay: ["camera blackout value", "humanoid anchor", "last approach split"],
  },
  {
    id: "space_core_complex",
    displayName: "Remote Core Complex",
    role: "CORE",
    description: "The destination at the far end of the route, staged for an eight-second hold with multiple contestable approaches.",
    center: { x: 52, z: -257 },
    size: { x: 212, z: 104 },
    height: 30,
    floorY: 16,
    color: 0x5c4d47,
    tags: ["OBJECTIVE", "MULTI-APPROACH", "HIGH THREAT"],
    gameplay: ["objective terminal", "8 second hold", "drone contest"],
  },
];

const runtimeZones: RuntimeZoneRecord[] = [
  {
    id: "zone_spawn",
    displayName: "Contractor Insertion",
    authoringSpace: "space_insertion_edge",
    threatLevel: 0,
    airAccess: true,
    playerSpawn: true,
    droneSpawn: false,
    droneSpawnClasses: [],
    authoringBounds: { center: { x: -292, y: 0, z: 178 }, halfSize: { x: 95, y: 30, z: 76 } },
    commanderUse: "Player entry and low-threat staging; no autonomous drone deployment.",
  },
  {
    id: "zone_courtyard",
    displayName: "Service Courtyard",
    authoringSpace: "space_service_district",
    threatLevel: 1,
    airAccess: true,
    playerSpawn: false,
    droneSpawn: true,
    droneSpawnClasses: ["RECON", "ROTARY_SHOOTER", "BOMBER"],
    authoringBounds: { center: { x: -158, y: 0, z: 66 }, halfSize: { x: 115, y: 30, z: 87 } },
    commanderUse: "First route split and camera-dense transition; conceal ground deployment behind service architecture.",
  },
  {
    id: "zone_warehouse",
    displayName: "Warehouse / Pressure Yard",
    authoringSpace: "space_open_pressure_yard",
    semanticAnchor: "mass_loading_hall",
    threatLevel: 2,
    airAccess: true,
    playerSpawn: false,
    droneSpawn: true,
    droneSpawnClasses: ["RECON", "ROTARY_SHOOTER", "BOMBER", "FIXED_WING"],
    authoringBounds: { center: { x: 78, y: 0, z: 102 }, halfSize: { x: 150, y: 30, z: 95 } },
    commanderUse: "Open-air pressure space for aerial visibility, fixed-wing strafes, and exposed combat transitions.",
  },
  {
    id: "zone_bridge",
    displayName: "Maintenance Bridge",
    authoringSpace: "space_bridge_maintenance",
    threatLevel: 2,
    airAccess: true,
    playerSpawn: false,
    droneSpawn: true,
    droneSpawnClasses: ["RECON", "ROTARY_SHOOTER"],
    authoringBounds: { center: { x: 178, y: 26, z: -18 }, halfSize: { x: 56, y: 18, z: 38 } },
    commanderUse: "Elevated bridge node connecting courtyard/yard pressure to plant and security routes.",
  },
  {
    id: "zone_plant",
    displayName: "Industrial Plant",
    authoringSpace: "space_industrial_plant",
    threatLevel: 3,
    airAccess: true,
    playerSpawn: false,
    droneSpawn: true,
    droneSpawnClasses: ["WHEELED", "ROBOT_DOG", "HUMANOID"],
    authoringBounds: { center: { x: 226, y: 6, z: -34 }, halfSize: { x: 133, y: 30, z: 113 } },
    commanderUse: "Dense combat space for nav-mesh ground pressure, pursuit, and roof/maintenance exposure.",
  },
  {
    id: "zone_tunnels",
    displayName: "Low Service Tunnels",
    authoringSpace: "space_security_threshold",
    threatLevel: 4,
    airAccess: false,
    playerSpawn: false,
    droneSpawn: true,
    droneSpawnClasses: ["WHEELED", "ROBOT_DOG", "HUMANOID"],
    authoringBounds: { center: { x: 52, y: 11, z: -145 }, halfSize: { x: 95, y: 24, z: 63 } },
    commanderUse: "Low-clearance final approach; air units are excluded and ground deployment is concealed by closed service architecture.",
  },
  {
    id: "zone_core",
    displayName: "LLM Core Objective",
    authoringSpace: "space_core_complex",
    threatLevel: 5,
    airAccess: false,
    playerSpawn: false,
    droneSpawn: false,
    droneSpawnClasses: [],
    authoringBounds: { center: { x: 52, y: 16, z: -257 }, halfSize: { x: 106, y: 30, z: 52 } },
    commanderUse: "Final objective space; no normal deployment volume; players must hold the core terminal continuously.",
  },
];

const combatSpaces: CombatSpaceRecord[] = [
  {
    id: "combat_spawn_apron",
    zone: "zone_spawn",
    coverProfile: "MIXED",
    exposureProfile: "MIXED",
    playerUse: "Regroup, choose the first combat lane, and establish the arrival-road sightline before entering the contested campus.",
    playerCounterplay: ["gatehouse hard cover", "service-road edge cover", "camera destruction before the first route split"],
    commanderPressure: ["limited early pressure", "camera observation", "route-adjacent recon staging only"],
    coverDetailIds: ["detail_spawn_kill_zone_approach_cover"],
  },
  {
    id: "combat_service_courtyard",
    zone: "zone_courtyard",
    coverProfile: "HIGH",
    exposureProfile: "MIXED",
    playerUse: "Fight through loading and maintenance edges while splitting toward the warehouse yard or covered service flank.",
    playerCounterplay: ["loading-hall cover", "utility-cabinet micro-cover", "camera blackout", "crossfire around the court corners"],
    commanderPressure: ["recon confirmation", "rotary pressure over the court", "concealed ground deployment behind service architecture"],
    coverDetailIds: ["detail_courtyard_cover_barrier", "detail_courtyard_cover_crates"],
  },
  {
    id: "combat_warehouse_pressure",
    zone: "zone_warehouse",
    coverProfile: "MIXED",
    exposureProfile: "OPEN",
    playerUse: "Cross a visible working yard using cover islands and hardstand edges while deciding whether to push the plant threshold or take the elevated branch.",
    playerCounterplay: ["pressure-store cover", "yard utility stack", "loading-court edge", "short camera-denial windows"],
    commanderPressure: ["fixed-wing event space", "bomber approach", "rotary suppression", "recon tagging across long sightlines"],
    coverDetailIds: ["detail_warehouse_cover_island"],
  },
  {
    id: "combat_maintenance_bridge",
    zone: "zone_bridge",
    coverProfile: "LOW",
    exposureProfile: "OPEN",
    playerUse: "Take a fast but exposed elevated combat route that bypasses some ground pressure while remaining contestable from plant and threshold sightlines.",
    playerCounterplay: ["bridge rail cover", "timed crossing under surveillance blackout", "drop to plant service apron"],
    commanderPressure: ["rotary shooter lane", "recon confirmation", "bridge denial from adjacent plant elevations"],
  },
  {
    id: "combat_industrial_plant",
    zone: "zone_plant",
    coverProfile: "HIGH",
    exposureProfile: "MIXED",
    playerUse: "Fight through dense industrial lanes, roof/service transitions, and nav-mesh pockets where ground units can pursue around hard cover.",
    playerCounterplay: ["processing-hall cover", "plant annex pocket", "roofline route choice", "utility-stack sightline breaks"],
    commanderPressure: ["wheeled drone hold", "robot-dog pursuit", "humanoid anchor pressure", "vertical re-engagement"],
    coverDetailIds: ["detail_plant_cover_barrier"],
  },
  {
    id: "combat_tunnel_threshold",
    zone: "zone_tunnels",
    coverProfile: "HIGH",
    exposureProfile: "ENCLOSED",
    playerUse: "Compress the squad into a high-threat ground-combat approach where air pressure drops but contact, flanking, and objective timing become more important.",
    playerCounterplay: ["service-mouth cover", "short sightline clearing", "fallback to plant threshold", "camera denial at the security hall"],
    commanderPressure: ["wheeled deployment", "robot-dog pursuit", "humanoid anchor", "closed kill-zone staging"],
    coverDetailIds: ["detail_tunnel_cover_barricade"],
  },
  {
    id: "combat_core_contest",
    zone: "zone_core",
    coverProfile: "MIXED",
    exposureProfile: "MIXED",
    playerUse: "Contest and hold the terminal for eight uninterrupted seconds while preserving at least two approach directions and readable squad cover.",
    playerCounterplay: ["core hall cover", "service-wing approach", "core-yard shelter", "damage-free hold discipline"],
    commanderPressure: ["route-aware ground response", "surveillance restoration", "final contest deployment outside the objective volume"],
  },
];

const buildingMasses: BuildingMassRecord[] = [
  { id: "mass_gatehouse", displayName: "Perimeter Gatehouse", zone: "space_insertion_edge", kind: "GATEHOUSE", center: { x: -292, z: 142 }, size: { x: 72, z: 38 }, height: 11, floorY: 0, description: "Readable arrival architecture that hides the insertion staging edge." },
  { id: "mass_service_shed_north", displayName: "North Service Shed", zone: "space_service_district", kind: "SERVICE", center: { x: -176, z: 80 }, size: { x: 104, z: 58 }, height: 13, floorY: 0, description: "A low service volume that creates the first ground-unit deployment concealment." },
  { id: "mass_loading_hall", displayName: "Loading Hall", zone: "space_service_district", kind: "WAREHOUSE", center: { x: -66, z: 62 }, size: { x: 124, z: 96 }, height: 18, floorY: 0, description: "A major block that divides the first route choice without sealing the district." },
  { id: "mass_maintenance_block", displayName: "Maintenance Block", zone: "space_service_district", kind: "WORKSHOP", center: { x: -184, z: -20 }, size: { x: 124, z: 74 }, height: 14, floorY: 0, description: "A lower workshop mass supporting a service flank and hidden access." },
  { id: "mass_pressure_store", displayName: "Pressure Store", zone: "space_open_pressure_yard", kind: "WAREHOUSE", center: { x: 26, z: 138 }, size: { x: 88, z: 52 }, height: 10, floorY: 0, description: "A small edge mass that gives the open yard a readable cover anchor." },
  { id: "mass_yard_silo", displayName: "Yard Utility Stack", zone: "space_open_pressure_yard", kind: "SERVICE", center: { x: 126, z: 78 }, size: { x: 66, z: 54 }, height: 16, floorY: 0, description: "A vertical utility mass that breaks the long yard sightline." },
  { id: "mass_plant_main", displayName: "Main Processing Hall", zone: "space_industrial_plant", kind: "PLANT", center: { x: 214, z: -26 }, size: { x: 158, z: 122 }, height: 30, floorY: 6, description: "The dominant industrial volume with ground lanes, roof access, and vertical pressure." },
  { id: "mass_plant_annex", displayName: "Plant Annex", zone: "space_industrial_plant", kind: "WORKSHOP", center: { x: 304, z: -92 }, size: { x: 74, z: 84 }, height: 18, floorY: 0, description: "A lower annex that makes the plant edge navigable and gives ground drones a pocket." },
  { id: "mass_plant_tower", displayName: "Plant Service Tower", zone: "space_industrial_plant", kind: "SERVICE", center: { x: 258, z: 48 }, size: { x: 46, z: 46 }, height: 45, floorY: 6, description: "A vertical landmark and maintenance connection, not a gameplay zone." },
  { id: "mass_security_hall", displayName: "Security Hall", zone: "space_security_threshold", kind: "SECURITY", center: { x: 38, z: -144 }, size: { x: 126, z: 62 }, height: 19, floorY: 11, description: "A compressed surveillance threshold before the final approach." },
  { id: "mass_core_hall", displayName: "Core Operations Hall", zone: "space_core_complex", kind: "CORE", center: { x: 48, z: -258 }, size: { x: 154, z: 78 }, height: 34, floorY: 16, description: "The destination architecture containing the objective and its contestable approaches." },
  { id: "mass_core_service", displayName: "Core Service Wing", zone: "space_core_complex", kind: "SERVICE", center: { x: 148, z: -240 }, size: { x: 62, z: 54 }, height: 16, floorY: 16, description: "A service wing that supports a second objective approach." },
  { id: "mass_core_yard", displayName: "Core Yard Shelter", zone: "space_core_complex", kind: "SERVICE", center: { x: -66, z: -230 }, size: { x: 96, z: 68 }, height: 8, floorY: 0, description: "A low sheltered yard that prevents the core from becoming a single exposed box." },
];

const connectors: ConnectorRecord[] = [
  {
    id: "connector_arrival_road",
    displayName: "Perimeter Arrival Road",
    kind: "ARRIVAL_ROAD",
    points: [{ x: -388, y: 0, z: 218 }, { x: -344, y: 0, z: 178 }, { x: -292, y: 0, z: 178 }, { x: -216, y: 0, z: 126 }],
    width: 18,
    color: 0xd0a46a,
    linkedSpaces: ["space_insertion_edge", "space_service_district"],
    description: "A readable service-road arrival that makes the player insertion edge feel like a real perimeter, not a spawn rectangle.",
  },
  {
    id: "connector_loading_court",
    displayName: "Loading Court",
    kind: "LOADING_COURT",
    points: [{ x: -216, y: 0.4, z: 126 }, { x: -126, y: 0.4, z: 112 }, { x: -44, y: 0.4, z: 118 }],
    width: 42,
    color: 0xb9a887,
    linkedSpaces: ["space_service_district", "space_open_pressure_yard"],
    description: "A broad hardstand that explains the first route split and provides a believable open transition into the yard.",
  },
  {
    id: "connector_covered_service_lane",
    displayName: "Covered Service Lane",
    kind: "COVERED_LANE",
    points: [{ x: -204, y: 0.8, z: 18 }, { x: -108, y: 3.6, z: -26 }, { x: 0, y: 8, z: -82 }],
    width: 15,
    color: 0x8da6a0,
    linkedSpaces: ["space_service_district", "space_industrial_plant", "space_security_threshold"],
    description: "A screened service connection for ground-unit pressure, with roof cover and a clear alternative to the exposed spine.",
  },
  {
    id: "connector_plant_threshold",
    displayName: "Plant Threshold",
    kind: "PLANT_THRESHOLD",
    points: [{ x: 132, y: 7, z: 92 }, { x: 178, y: 10, z: 42 }, { x: 190, y: 12, z: -20 }, { x: 132, y: 17, z: -103 }],
    width: 28,
    color: 0x9b7666,
    linkedSpaces: ["space_open_pressure_yard", "space_industrial_plant"],
    description: "A deliberate compression from the open yard into the plant, establishing the map's first major enclosure change.",
  },
  {
    id: "connector_security_approach",
    displayName: "Final Security Approach",
    kind: "SECURITY_APPROACH",
    points: [{ x: 132, y: 17, z: -103 }, { x: 52, y: 22, z: -145 }, { x: 52, y: 23, z: -208 }, { x: 52, y: 23, z: -257 }],
    width: 22,
    color: 0xb47561,
    linkedSpaces: ["space_industrial_plant", "space_security_threshold", "space_core_complex"],
    description: "A visually legible final approach that turns the remote core into a destination with a controlled escalation sequence.",
  },
];

const siteFabric: SiteFabricRecord[] = [
  {
    id: "fabric_campus_surface",
    displayName: "Campus Ground Surface",
    kind: "CAMPUS_SURFACE",
    center: { x: -10, y: -0.32, z: -18 },
    size: { x: 820, y: 0.32, z: 540 },
    color: 0x2a3234,
    description: "The continuous paved/compacted campus datum beneath all gameplay spaces; not a zone and not a building.",
  },
  {
    id: "fabric_arrival_road",
    displayName: "Arrival Road Surface",
    kind: "ROAD",
    center: { x: -250, y: -0.12, z: 156 },
    size: { x: 300, y: 0.24, z: 72 },
    color: 0x3b4447,
    description: "A broad service-road surface that establishes the believable player arrival and perimeter scale.",
  },
  {
    id: "fabric_loading_apron",
    displayName: "Loading Apron Surface",
    kind: "COURT",
    center: { x: -72, y: -0.08, z: 92 },
    size: { x: 222, y: 0.26, z: 120 },
    color: 0x4b4f4d,
    description: "Hardstand between service buildings and the pressure yard, giving the first route split a physical explanation.",
  },
  {
    id: "fabric_pressure_yard_surface",
    displayName: "Pressure Yard Surface",
    kind: "COURT",
    center: { x: 92, y: -0.08, z: 102 },
    size: { x: 250, y: 0.26, z: 146 },
    color: 0x424846,
    description: "A broad open working yard with enough surface continuity for aerial exposure and readable cover islands.",
  },
  {
    id: "fabric_plant_apron",
    displayName: "Plant Service Apron",
    kind: "SERVICE_BAND",
    center: { x: 220, y: -0.06, z: -62 },
    size: { x: 196, y: 0.3, z: 142 },
    color: 0x465052,
    description: "A stained service apron around the plant that makes heavy industrial access and ground-drone lanes legible.",
  },
  {
    id: "fabric_core_apron",
    displayName: "Core Approach Court",
    kind: "COURT",
    center: { x: 52, y: -0.08, z: -214 },
    size: { x: 246, y: 0.26, z: 72 },
    color: 0x494746,
    description: "The final hardstand before the core complex; it creates space for contestable approaches instead of a single doorway.",
  },
  {
    id: "fabric_west_perimeter_wall",
    displayName: "West Perimeter Wall",
    kind: "PERIMETER_WALL",
    center: { x: -404, y: 2, z: -18 },
    size: { x: 10, y: 4.5, z: 500 },
    color: 0x303a3e,
    description: "A continuous contemporary security boundary that encloses the arrival and conceals the perimeter deployment pocket.",
  },
  {
    id: "fabric_north_perimeter_wall",
    displayName: "North Perimeter Wall",
    kind: "PERIMETER_WALL",
    center: { x: -8, y: 1.7, z: 252 },
    size: { x: 800, y: 4, z: 10 },
    color: 0x303a3e,
    description: "A readable outer boundary that explains why the facility is a controlled site rather than an arbitrary blockout edge.",
  },
];

const routes: RouteRecord[] = [
  {
    id: "route_primary_spine",
    displayName: "Primary Spine",
    kind: "PRIMARY",
    points: [
      { x: -292, y: 1, z: 178 },
      { x: -216, y: 1, z: 126 },
      { x: -44, y: 1, z: 118 },
      { x: 132, y: 7, z: 92 },
      { x: 226, y: 12, z: 28 },
      { x: 132, y: 17, z: -103 },
      { x: 52, y: 22, z: -145 },
      { x: 52, y: 23, z: -257 },
    ],
    spaces: ["space_insertion_edge", "space_service_district", "space_open_pressure_yard", "space_industrial_plant", "space_security_threshold", "space_core_complex"],
  },
  {
    id: "route_service_flank",
    displayName: "Service Flank",
    kind: "FLANK",
    points: [
      { x: -292, y: 1, z: 178 },
      { x: -344, y: 1, z: 70 },
      { x: -272, y: 2, z: -25 },
      { x: -108, y: 4, z: -26 },
      { x: 0, y: 11, z: -82 },
      { x: 52, y: 22, z: -145 },
      { x: 52, y: 23, z: -257 },
    ],
    spaces: ["space_insertion_edge", "space_service_district", "space_industrial_plant", "space_security_threshold", "space_core_complex"],
  },
  {
    id: "route_elevated_maintenance",
    displayName: "Elevated Maintenance Link",
    kind: "ELEVATED",
    points: [
      { x: 178, y: 28, z: 52 },
      { x: 220, y: 32, z: -18 },
      { x: 144, y: 35, z: -78 },
      { x: 52, y: 35, z: -145 },
    ],
    spaces: ["space_industrial_plant", "space_bridge_maintenance", "space_security_threshold"],
  },
];

const volumes: VolumeRecord[] = [
  {
    id: "volume_player_insertion",
    displayName: "Contractor Spawn / Perimeter Gate",
    kind: "PLAYER_SPAWN",
    center: { x: -292, y: 1.2, z: 178 },
    size: { x: 112, y: 2.4, z: 72 },
    color: 0x75d6b4,
    description: "Human-contractor insertion apron with hard cover, clear team staging, and a readable first sightline toward the service district.",
    linkedZone: "zone_spawn",
  },
  {
    id: "volume_air_pressure_yard",
    displayName: "Air Access / Yard",
    kind: "AIR_ACCESS",
    center: { x: 74, y: 28, z: 102 },
    size: { x: 286, y: 45, z: 176 },
    color: 0xa6a0ff,
    description: "Open air corridor for rotary, bomber, recon, and fixed-wing pressure.",
    linkedZone: "zone_warehouse",
    droneClasses: ["RECON", "ROTARY_SHOOTER", "BOMBER", "FIXED_WING"],
  },
  {
    id: "volume_ground_service_staging",
    displayName: "Ground Deployment / Service",
    kind: "GROUND_DEPLOYMENT",
    center: { x: -168, y: 8, z: -4 },
    size: { x: 84, y: 16, z: 62 },
    color: 0xd4a268,
    description: "Concealed ground staging through service access and maintenance lanes.",
    linkedZone: "zone_courtyard",
    droneClasses: ["WHEELED", "ROBOT_DOG", "HUMANOID"],
    closedArchitectureRequired: true,
  },
  {
    id: "volume_plant_bay_staging",
    displayName: "Ground Deployment / Plant Bay",
    kind: "GROUND_DEPLOYMENT",
    center: { x: 276, y: 14, z: -80 },
    size: { x: 68, y: 22, z: 78 },
    color: 0xd4a268,
    description: "Nav-mesh-connected deployment pocket for wheeled drones and robot dogs.",
    linkedZone: "zone_plant",
    droneClasses: ["WHEELED", "ROBOT_DOG", "HUMANOID"],
    closedArchitectureRequired: true,
  },
  {
    id: "volume_perimeter_kill_zone",
    displayName: "Concealed Kill Zone / Perimeter",
    kind: "CONCEALED_KILL_ZONE",
    center: { x: -380, y: 9, z: 34 },
    size: { x: 34, y: 18, z: 104 },
    color: 0xf07561,
    description: "Screened perimeter service compound: deployment is hidden by architecture, not magic.",
    linkedZone: "zone_spawn",
    droneClasses: ["WHEELED", "ROBOT_DOG", "HUMANOID"],
    closedArchitectureRequired: true,
  },
  {
    id: "volume_tunnel_kill_zone",
    displayName: "Concealed Kill Zone / Tunnel",
    kind: "CONCEALED_KILL_ZONE",
    center: { x: 144, y: 10, z: -190 },
    size: { x: 48, y: 20, z: 30 },
    color: 0xf07561,
    description: "A lower service mouth that can stage ground pressure before the final threshold.",
    linkedZone: "zone_tunnels",
    droneClasses: ["WHEELED", "ROBOT_DOG", "HUMANOID"],
    closedArchitectureRequired: true,
  },
  {
    id: "volume_security_camera_sector",
    displayName: "Camera Sector / Threshold",
    kind: "CAMERA_SECTOR",
    center: { x: 52, y: 22, z: -145 },
    size: { x: 190, y: 34, z: 126 },
    color: 0x62d5c8,
    description: "Dense surveillance region where Recon disruption materially changes commander awareness.",
    linkedZone: "zone_tunnels",
  },
];

const environmentDetails = [
  { id: "detail_kill_zone_west_wall", displayName: "Kill Zone / West Closure", kind: "KILL_ZONE_WALL", position: { x: -413, y: 0, z: 34 }, size: { x: 1.8, y: 9, z: 112 }, color: 0x59666a, description: "Procedural closed-compound wall that hides the perimeter deployment pocket from the arrival road.", treatment: "PROCEDURAL", status: "AUTHORING BLOCKOUT" },
  { id: "detail_kill_zone_east_wall", displayName: "Kill Zone / East Closure", kind: "KILL_ZONE_WALL", position: { x: -349, y: 0, z: 34 }, size: { x: 1.8, y: 9, z: 112 }, color: 0x59666a, description: "Procedural wall edge that makes the concealed volume read as a service compound rather than an arbitrary box.", treatment: "PROCEDURAL", status: "AUTHORING BLOCKOUT" },
  { id: "detail_kill_zone_north_wall", displayName: "Kill Zone / Rear Closure", kind: "KILL_ZONE_WALL", position: { x: -381, y: 0, z: 90 }, size: { x: 66, y: 9, z: 1.8 }, color: 0x59666a, description: "Rear closure that removes the illusion of a spawn volume floating in open space.", treatment: "PROCEDURAL", status: "AUTHORING BLOCKOUT" },
  { id: "detail_kill_zone_gate", displayName: "Kill Zone / Service Gate", kind: "SECURITY_GATE", position: { x: -381, y: 0, z: -18 }, size: { x: 18, y: 6, z: 1.8 }, color: 0x9b754f, description: "Readable service gate at the only obvious access point into the perimeter compound.", treatment: "PROCEDURAL", status: "AUTHORING BLOCKOUT" },
  { id: "detail_kill_zone_turret_01", displayName: "Kill Zone / Turret Mount A", kind: "TURRET_MOUNT", position: { x: -389, y: 0, z: 10 }, size: { x: 3.8, y: 5.2, z: 3.8 }, color: 0xd16f4b, description: "Static turret-emplacement datum retained for placement and route-story intent; scene presentation is replaced by the original contemporary turret GLB.", treatment: "PROCEDURAL", status: "REPLACED BY ORIGINAL GLB" },
  { id: "detail_kill_zone_turret_02", displayName: "Kill Zone / Turret Mount B", kind: "TURRET_MOUNT", position: { x: -389, y: 0, z: 72 }, size: { x: 3.8, y: 5.2, z: 3.8 }, color: 0xd16f4b, description: "Second static turret-emplacement datum retained for placement and route-story intent; scene presentation is replaced by the original contemporary turret GLB.", treatment: "PROCEDURAL", status: "REPLACED BY ORIGINAL GLB" },
  { id: "detail_service_cabinet", displayName: "Service District / Utility Cabinet", kind: "UTILITY_CABINET", position: { x: -238, y: 0, z: 96 }, size: { x: 3.2, y: 4.4, z: 2.2 }, color: 0x68736f, description: "Small electrical cabinet that gives the service edge a believable utility rhythm and cover-scale reference.", treatment: "PROCEDURAL", status: "AUTHORING BLOCKOUT" },
  { id: "detail_service_light_pole", displayName: "Arrival / Floodlight Pole", kind: "LIGHT_POLE", position: { x: -312, y: 0, z: 126 }, size: { x: 1.4, y: 12, z: 1.4 }, color: 0x465257, description: "Tall service light anchor for the arrival road; practical lighting will be authored after the HDRI comparison pass.", treatment: "PROCEDURAL", status: "AUTHORING BLOCKOUT" },
  { id: "detail_arrival_bollard_a", displayName: "Arrival / Bollard A", kind: "BOLLARD", position: { x: -258, y: 0, z: 151 }, size: { x: 1.2, y: 1.6, z: 1.2 }, color: 0xd18b4e, description: "Human-scale vehicle-control bollard at the service-road threshold.", treatment: "PROCEDURAL", status: "AUTHORING BLOCKOUT" },
  { id: "detail_arrival_bollard_b", displayName: "Arrival / Bollard B", kind: "BOLLARD", position: { x: -244, y: 0, z: 149 }, size: { x: 1.2, y: 1.6, z: 1.2 }, color: 0xd18b4e, description: "Paired bollard that establishes the width and behavior of the player-facing service gate.", treatment: "PROCEDURAL", status: "AUTHORING BLOCKOUT" },
  { id: "detail_arrival_camera_housing", displayName: "Arrival / Destructible Camera Housing", kind: "CAMERA_HOUSING", position: { x: -272, y: 5.8, z: 132 }, size: { x: 1.6, y: 1.2, z: 0.9 }, color: 0x6db7b0, description: "Player-facing surveillance anchor above the arrival edge; represents a destructible camera before the final camera GLB is selected.", treatment: "PROCEDURAL", status: "CAMERA GLB SWAP REQUIRED" },
  { id: "detail_gate_access_sign", displayName: "Kill Zone / Access Warning Frame", kind: "SIGNAGE_FRAME", position: { x: -381, y: 0, z: -18 }, size: { x: 14, y: 4.8, z: 0.7 }, color: 0xd18b4e, description: "High-contrast warning frame above the only obvious compound access point; reinforces that this is a closed security area.", treatment: "PROCEDURAL", status: "AUTHORING BLOCKOUT" },
  { id: "detail_service_drain_channel", displayName: "Service District / Drainage Channel", kind: "DRAIN_CHANNEL", position: { x: -180, y: 0.04, z: 112 }, size: { x: 42, y: 0.12, z: 0.8 }, color: 0x394649, description: "Linear drainage cue along the loading edge; adds a believable hardstand transition and a low cover seam without becoming gameplay truth.", treatment: "PROCEDURAL", status: "AUTHORING BLOCKOUT" },
  { id: "detail_service_pipe_rack", displayName: "Service District / Pipe Rack", kind: "PIPE_RACK", position: { x: -136, y: 0, z: 28 }, size: { x: 18, y: 5.4, z: 3.2 }, color: 0x5e6a67, description: "Compact utility rack that gives the service flank a horizontal industrial rhythm and a readable upper silhouette.", treatment: "PROCEDURAL", status: "AUTHORING BLOCKOUT" },
  { id: "detail_courtyard_cover_barrier", displayName: "Courtyard / Deployment Cover Barrier", kind: "COMBAT_COVER", position: { x: -150, y: 0, z: -4 }, size: { x: 20, y: 1.8, z: 3.2 }, color: 0x7d8582, description: "PBR-authored jersey barrier with steel lifting loops and hazard bands; gives contractors a readable crossfire break without sealing the service lane.", treatment: "PROCEDURAL_PBR_AUTHORED", status: "PBR TREATMENT PASS" },
  { id: "detail_courtyard_cover_crates", displayName: "Courtyard / Service Crate Cover", kind: "COMBAT_COVER", position: { x: -206, y: 0, z: -14 }, size: { x: 8, y: 3.2, z: 7 }, color: 0x89745c, description: "PBR-authored stacked maintenance crates with offset seams and steel corner guards; creates a human-scale pocket around the concealed ground staging edge.", treatment: "PROCEDURAL_PBR_AUTHORED", status: "PBR TREATMENT PASS" },
  { id: "detail_warehouse_cover_island", displayName: "Warehouse / Yard Cover Island", kind: "COMBAT_COVER", position: { x: 92, y: 0, z: 104 }, size: { x: 24, y: 1.6, z: 3.2 }, color: 0x7d8582, description: "PBR-authored segmented hardstand barrier with steel end plates; breaks the open pressure-yard sightline while preserving aerial exposure and fixed-wing readability.", treatment: "PROCEDURAL_PBR_AUTHORED", status: "PBR TREATMENT PASS" },
  { id: "detail_plant_cover_barrier", displayName: "Plant Bay / Nav-Mesh Cover Barrier", kind: "COMBAT_COVER", position: { x: 258, y: 0, z: -78 }, size: { x: 22, y: 1.8, z: 3.4 }, color: 0x697571, description: "PBR-authored concrete barrier with service-side steel bracing; gives the squad a short lateral break while ground drones retain a route around the staging pocket.", treatment: "PROCEDURAL_PBR_AUTHORED", status: "PBR TREATMENT PASS" },
  { id: "detail_tunnel_cover_barricade", displayName: "Tunnel Mouth / Combat Barricade", kind: "COMBAT_COVER", position: { x: 144, y: 0, z: -174 }, size: { x: 18, y: 2.0, z: 2.8 }, color: 0x6c7575, description: "PBR-authored service barricade with offset steel rails and reflective warning tabs; supports a deliberate ground-combat pause before the security threshold.", treatment: "PROCEDURAL_PBR_AUTHORED", status: "PBR TREATMENT PASS" },
  { id: "detail_spawn_kill_zone_approach_cover", displayName: "Perimeter / Kill-Zone Approach Cover", kind: "COMBAT_COVER", position: { x: -332, y: 0, z: -4 }, size: { x: 16, y: 1.5, z: 3.4 }, color: 0x707977, description: "PBR-authored Jersey-style barrier with high-contrast hazard tabs outside the perimeter compound gate; gives contractors a deliberate breach-side break while keeping the turret warning visible.", treatment: "PROCEDURAL_PBR_AUTHORED", status: "PBR TREATMENT PASS" },
] as const;

const environmentKit = {
  version: "0.9.0-pbr-combat-cover",
  assets: [
    {
      id: "asset_polyhaven_chainlink_fence_1k",
      displayName: "Poly Haven Modular Chainlink Fence / 1K",
      kind: "MODEL",
      source: "https://polyhaven.com/a/modular_chainlink_fence",
      localPath: "/assets/models/polyhaven/modular_chainlink_fence/modular_chainlink_fence_1k.gltf",
      license: "CC0",
      role: "West-perimeter barrier and readable concealed-kill-zone cue.",
      runtimeNote: "1K glTF plus shared bin and six 1K JPG maps; normalize to 8.1 m segment width; use instancing or clone-once geometry in runtime.",
    },
    {
      id: "asset_kenney_van_cc0",
      displayName: "Kenney Car Kit / Service Van",
      kind: "MODEL",
      source: "https://kenney.nl/assets/car-kit",
      localPath: "/assets/models/kenney/car_kit/van.glb",
      license: "CC0",
      role: "Camera-dominant arrival service van replacement; adds a sourced vehicle silhouette without becoming gameplay cover or changing the authored traffic placement.",
      runtimeNote: "Single embedded-texture GLB from Kenney Car Kit; normalize to the existing 5.4 m service-van footprint, retain the procedural van as a removable fallback, and keep the asset outside gameplay truth.",
    },
    {
      id: "asset_polyhaven_old_military_crate_1k",
      displayName: "Poly Haven Old Military Crate / 1K",
      kind: "MODEL",
      source: "https://polyhaven.com/a/old_military_crate",
      localPath: "/assets/models/polyhaven/old_military_crate/old_military_crate_1k.gltf",
      license: "CC0",
      role: "Texture-backed maintenance cargo in the arrival loading cluster and right service apron.",
      runtimeNote: "1K glTF with shared binary payload; normalize to approximately 1.2 m width and use only as grouped presentation cargo outside authoritative combat-cover records.",
    },
    {
      id: "asset_polyhaven_portable_welding_cart_1k",
      displayName: "Poly Haven Portable Welding Cart / 1K",
      kind: "MODEL",
      source: "https://polyhaven.com/a/portable_welding_cart",
      localPath: "/assets/models/polyhaven/portable_welding_cart/portable_welding_cart_1k.gltf",
      license: "CC0",
      role: "Worn workshop welding cart at the camera-facing arrival service edge; grounds the loading story with a real tool-and-cylinder silhouette.",
      runtimeNote: "29K-triangle 1K glTF with shared binary payload and diffuse, ARM, and OpenGL normal JPEG maps; normalize to approximately 1.2 m width and keep as presentation-only service detail outside gameplay cover truth.",
    },
    {
      id: "asset_polyhaven_portable_generator_1k",
      displayName: "Poly Haven Portable Generator / 1K",
      kind: "MODEL",
      source: "https://polyhaven.com/a/portable_generator",
      localPath: "/assets/models/polyhaven/portable_generator/portable_generator_1k.gltf",
      license: "CC0",
      role: "Service-district hero prop beside the utility cabinet and loading edge.",
      runtimeNote: "26K-triangle 1K glTF with four 1K JPG maps; normalize to approximately 1.15 m width, keep as one semantic prop instance, and replace or hide without changing deployment truth.",
    },
    {
      id: "asset_polyhaven_industrial_storage_cart_1k",
      displayName: "Poly Haven Industrial Storage Cart / 1K",
      kind: "MODEL",
      source: "https://polyhaven.com/a/industrial_storage_cart",
      localPath: "/assets/models/polyhaven/industrial_storage_cart/industrial_storage_cart_1k.gltf",
      license: "CC0",
      role: "Presentation-only service-court occupancy that makes the loading edge read as an active industrial work area; it is not a vehicle, cover, or gameplay datum.",
      runtimeNote: "Official 1K glTF with shared binary payload and three 1K JPG maps; bounds-normalize to a 2.4 m maximum horizontal span, solve bottom-center contact at the camera-visible court, and keep outside gameplay truth.",
    },
    {
      id: "asset_sketchfab_warehouse_forklift_gameready_1k",
      displayName: "Warehouse Forklift Gameready / 1K — Kamran Mughal",
      kind: "MODEL",
      source: "https://sketchfab.com/3d-models/warehouse-forklift-gameready-94e21059f00c4e989c6403ada034516e",
      localPath: "/assets/models/sketchfab/warehouse_forklift_gameready/warehouse_forklift_gameready_1k.glb",
      license: "CC-BY-4.0",
      role: "Camera-visible presentation-only industrial vehicle anchor at the plant service hardstand; it is not gameplay cover or a route datum.",
          runtimeNote: "Sketchfab converted 1K GLB, 7,786 faces / approximately 7.8K triangles; author credit required: Kamran Mughal (@absologixemployee). Canonical presentation asset with explicit `forkliftAsset=0` opt-out; bounds-normalize to a 4.2 m maximum horizontal vehicle span, solve bottom contact, and keep outside gameplay truth.",
    },
    {
      id: "asset_polyhaven_security_camera_02_1k",
      displayName: "Poly Haven Security Camera 02 / 1K",
      kind: "MODEL",
      source: "https://polyhaven.com/a/security_camera_02",
      localPath: "/assets/models/polyhaven/security_camera_02/security_camera_02_1k.gltf",
      license: "CC0",
      role: "Destructible surveillance anchor mounted above the closed kill-zone gate.",
      runtimeNote: "12K-triangle 1K glTF with three 1K JPG maps; normalize to approximately 0.45 m width; keep as one semantic camera prop and replace with the runtime camera system without changing the kill-zone volume.",
    },
    {
      id: "asset_original_static_turret_v1",
      displayName: "VEXEA Original Industrial Static Turret / GLB",
      kind: "MODEL",
      source: "https://github.com/Singulary-tee/vexea-international",
      localPath: "/assets/models/procedural/industrial_static_turret_v1.glb",
      license: "ORIGINAL",
      role: "Contemporary closed-compound warning emplacement for both perimeter kill-zone positions.",
      runtimeNote: "Original 17 KB GLB authored from 15 deterministic primitive parts and 732 triangles: weathered concrete plinth, oxidized steel housing, restrained warning panels, muzzle brake, service box, and surveillance sensor. Replace or refine without changing the kill-zone volume or turret mount datum.",
    },
    {
      id: "asset_polyhaven_factory_wall_2k",
      displayName: "Poly Haven Factory Wall / 2K",
      kind: "MATERIAL",
      source: "https://polyhaven.com/a/factory_wall",
      localPath: "/assets/materials/polyhaven/factory_wall/",
      license: "CC0",
      role: "Representative corrugated facade treatment for plant and loading architecture.",
      runtimeNote: "2K JPG diffuse, normal, and roughness maps; tile in world-space facade panels instead of covering every graybox mass.",
    },
    {
      id: "asset_ambientcg_road012a_2k",
      displayName: "ambientCG Road 012 A / 2K",
      kind: "MATERIAL",
      source: "https://ambientcg.com/view?id=Road012A",
      localPath: "/assets/materials/ambientcg/road012a/",
      license: "CC0",
      role: "Worn industrial asphalt for arrival road, loading apron, pressure yard, and plant service apron.",
      runtimeNote: "2K JPG color, roughness, normal GL, AO, and displacement maps; use color/roughness/normal in the bench and reserve AO/displacement for final runtime experiments.",
    },
    {
      id: "asset_polyhaven_kloofendal_overcast_puresky_1k",
      displayName: "Poly Haven Kloofendal Overcast Pure Sky / 1K",
      kind: "HDRI",
      source: "https://polyhaven.com/a/kloofendal_overcast_puresky",
      localPath: "/assets/hdri/polyhaven/kloofendal_overcast_puresky_1k.hdr",
      license: "CC0",
      role: "Sky-only incoming-rain overcast environment with layered storm cloud structure; provides cool diffuse industrial daylight without a visible location or courtyard competing with the map.",
      runtimeNote: "1K Radiance HDR downloaded from the Poly Haven pure-sky source; use as the single active scene environment/background while retaining warm practical service and surveillance lights.",
    },
    {
      id: "asset_polyhaven_overcast_soil_puresky_1k",
      displayName: "Poly Haven Overcast Soil Pure Sky / 1K",
      kind: "HDRI",
      source: "https://polyhaven.com/a/overcast_soil_puresky",
      localPath: "/assets/hdri/polyhaven/overcast_soil_puresky_1k.hdr",
      license: "CC0",
      role: "Archived calm overcast pure-sky comparison; not the active environment.",
      runtimeNote: "1K Radiance HDR retained as a comparison asset only; do not use it for the active presentation while Kloofendal is under review.",
    },
    {
      id: "asset_polyhaven_overcast_industrial_courtyard_1k",
      displayName: "Poly Haven Overcast Industrial Courtyard / 1K",
      kind: "HDRI",
      source: "https://polyhaven.com/a/overcast_industrial_courtyard",
      localPath: "/assets/hdri/polyhaven/overcast_industrial_courtyard_1k.hdr",
      license: "CC0",
      role: "Archived overcast industrial environment retained for comparison only; not the active sky/background.",
      runtimeNote: "Existing 1K HDR retained as a non-active comparison asset; do not use it for the locked presentation capture while the pure-sky candidate is under review.",
    },
  ] satisfies AuthoringAssetRecord[],
  proceduralDetails: environmentDetails,
  materialBindings: [
    { material: "asset_polyhaven_factory_wall_2k", surfaces: ["mass_gatehouse", "mass_service_shed_north", "mass_loading_hall", "mass_maintenance_block", "mass_pressure_store", "mass_yard_silo", "mass_plant_main", "mass_plant_annex", "mass_plant_tower", "mass_security_hall", "mass_core_hall", "mass_core_service", "mass_core_yard"] },
    { material: "asset_ambientcg_road012a_2k", surfaces: ["fabric_arrival_road", "fabric_loading_apron", "fabric_pressure_yard_surface", "fabric_plant_apron", "fabric_core_apron"] },
  ],
  coverTreatment: {
    strategy: "PROCEDURAL_PBR_AUTHORED",
    sourceMaterials: ["asset_polyhaven_factory_wall_2k", "asset_ambientcg_road012a_2k"],
    geometryGrammar: ["jersey_barrier", "maintenance_crate_stack", "steel_lifting_loop", "service_rail", "hazard_tab"],
    gameplayRule: "Cover geometry is visual and collision-intent evidence only; combat-space bindings remain authoritative.",
    downloadFallback: "Poly Haven old_military_crate and modular_industrial_pipes_01 remain source-verified but are not runtime dependencies until CDN delivery is stable.",
  },
  lighting: {
    hdri: "asset_polyhaven_kloofendal_overcast_puresky_1k",
    backgroundMode: "HDRI_BACKGROUND",
    keyLight: "cool incoming-rain overcast key plus restrained warm service and surveillance practicals",
  },
  performance: {
    authoringTarget: "60 FPS on a mid-range desktop with forceWebGL fallback",
    sourcedModelBudget: "< 250K visible triangles in the authoring slice",
    textureBudget: "1K prop textures; 2K hero material textures; 1K HDRI",
    runtimeRule: "Keep sourced assets semantically grouped and swappable; do not bake them into gameplay truth.",
  },
};

const topology = {
  version: "0.9.0-pbr-combat-cover",
  id: "vexea_map_01_gameplay_first",
  displayName: "VEXEA Facility / Far-End Industrial Campus Vertical Slice",
  worldSize: { x: 840, z: 560 },
  coordinateSystem: {
    units: "meters",
    up: "Y",
    origin: "map center",
    note: "Broad-shape authoring coordinates. Runtime spec extraction will convert to the game map contract.",
  },
  spaces,
  routes,
  volumes,
  buildingMasses,
  connectors,
  siteFabric,
  combatSpaces,
  environmentKit,
  runtimeContract: {
    mode: {
      id: "STANDARD",
      playerCount: { min: 5, max: 10 },
      matchDurationSeconds: 480,
      respawn: { enabled: true, delaySeconds: 5 },
      lossCondition: "TIMEOUT",
    },
    zones: runtimeZones,
    spawnVolumes: {
      player: ["volume_player_insertion"],
      drone: ["volume_ground_service_staging", "volume_plant_bay_staging", "volume_perimeter_kill_zone", "volume_tunnel_kill_zone"],
      aerial: ["volume_air_pressure_yard"],
      surveillance: ["volume_security_camera_sector"],
    },
    topology: {
      sequence: ["zone_spawn", "zone_courtyard", "zone_warehouse", "zone_plant", "zone_core"],
      adjacency: {
        zone_spawn: ["zone_courtyard"],
        zone_courtyard: ["zone_spawn", "zone_warehouse", "zone_bridge"],
        zone_warehouse: ["zone_courtyard", "zone_tunnels", "zone_plant"],
        zone_bridge: ["zone_courtyard", "zone_plant"],
        zone_plant: ["zone_warehouse", "zone_bridge", "zone_core"],
        zone_tunnels: ["zone_warehouse", "zone_core"],
        zone_core: ["zone_plant", "zone_tunnels"],
      },
      bridgeNode: "zone_bridge",
      objectiveApproaches: ["route_primary_spine", "route_service_flank"],
      note: "The authored maintenance bridge is an explicit runtime bridge node; the two ground approaches and elevated link remain contestable combat routes rather than stealth-only lanes.",
    },
    playerObjective: {
      zone: "zone_core",
      terminalId: "objective_llm_core",
      proximityRadius: 3,
      holdTimeSeconds: 8,
      resetOnDamage: true,
      resetOnExit: true,
      terminalDamageable: false,
    },
    commander: {
      decisionIntervalSeconds: 8,
      intel: "semantic zone summaries",
      playerPresenceRequires: ["active_camera_line_of_sight", "active_drone_line_of_sight", "unsilenced_fire_acoustic_detection"],
      cameraLoss: "Destroyed cameras leave coverage dark until another valid reporting source restores awareness.",
      deploymentRule: "Drone groups deploy only through authored deployment volumes or valid route-adjacent staging envelopes; no open-ground pop-in.",
    },
    combat: {
      playerRole: "armed human contractor",
      droneRole: "autonomous opposing unit",
      playerControlsDrones: false,
      mapPriority: "combat_push_with_cover_route_choice_surveillance_denial_and_objective_contest",
    },
  },
  productionGates: {
    status: "AUTHORING_VERTICAL_SLICE_GAMEPLAY_ALIGNED",
    representativeScope: ["arrival_road", "service_district_edge", "pressure_yard", "maintenance_bridge", "plant_facade", "security_threshold", "core_hold_space"],
    gates: [
      { id: "ground_route_read", target: "Arrival-to-core route remains legible at perspective scale with sourced facade and asphalt response." },
      { id: "kill_zone_read", target: "Perimeter kill zone reads as a closed service compound with fence geometry before any spawn event." },
      { id: "objective_read", target: "Remote core remains visually destination-scale and has at least two contestable approaches." },
      { id: "runtime_zone_alignment", target: `${runtimeZones.length} runtime-compatible zones are explicitly mapped, including zone_bridge as a distinct elevated combat node.` },
      { id: "standard_mode_alignment", target: "STANDARD is encoded as a 5–10 player, 480-second, respawn-enabled cooperative PvE match with timeout loss." },
      { id: "objective_contract", target: "The core terminal requires an uninterrupted 8-second hold within 3 m and resets on damage or exit." },
      { id: "commander_semantics", target: "Camera/LOS/acoustic reporting and authored drone deployment envelopes are explicit without making players drone operators." },
      { id: "combat_space_grammar", target: `${combatSpaces.length} runtime zones each specify player counterplay, cover/exposure profile, and commander pressure for cooperative PvE combat.` },
      { id: "combat_cover_read", target: "Six physical combat-cover blockouts are bound to five route zones, including the perimeter breach, courtyard, pressure yard, plant bay, and tunnel mouth." },
      { id: "static_turret_emplacements", target: "Two contemporary static turret GLBs replace the kill-zone mount placeholders while preserving their placement datums and closed-compound warning." },
      { id: "asset_swap_boundary", target: "Sourced assets remain grouped by semantic role and can be removed without changing gameplay truth." },
      { id: "runtime_bridge", target: "Authoring environmentKit and runtimeContract are not runtime-authoritative until MapLoader and the map registry accept the expanded contract." },
      { id: "runtime_projection_preview", target: "scripts/validate-map-bridge.mjs projects seven authored zones, thirteen masses, one player insertion volume, one gate datum, and one surveillance prop into MapLoader shape while preserving explicit coordinate and semantic warnings; preview only." },
      { id: "pbr_combat_cover_treatment", target: "Six physical combat-cover anchors use authored industrial geometry grammar with locally verified PBR material bindings, while their gameplay IDs and route-zone bindings remain unchanged." }
    ],
    nextPass: "Wire the opt-in projected spec through objective, physics, minimap, compass, drone deployment, and commander observation contexts; then iterate the vertical-slice camera and replace remaining procedural service details with verified props where delivery is reliable."
  },
  objective: {
    id: "objective_llm_core",
    space: "space_core_complex",
    position: { x: 52, y: 23, z: -257 },
    holdTimeSeconds: 8,
    proximityRadius: 3,
    resetOnDamage: true,
    resetOnExit: true,
    terminalDamageable: false,
    approachRoutes: ["route_primary_spine", "route_service_flank"],
  },
  humanReference: {
    bodyHeight: 1.8,
    eyeHeight: 1.62,
    shoulderWidth: 0.48,
    crouchHeight: 1.05,
  },
  authoring: {
    pass: "TOPOLOGY_11_PBR_COMBAT_COVER",
    intent: "Author a far-end combat objective and connected industrial spaces that honor the cooperative PvE match, human contractor combat loop, commander information model, and authored drone deployment semantics.",
    finalAssetWorkStarted: true,
  },
};

const canvas = document.getElementById("authoring-canvas") as HTMLCanvasElement;
canvas.style.touchAction = "none";
const canvasWrap = document.getElementById("canvas-wrap") as HTMLDivElement;
const visualPassButton = document.getElementById("load-visual-pass") as HTMLButtonElement;
const urlParams = new URLSearchParams(window.location.search);
const orthographicBlockoutMode = urlParams.get("blockout") === "1" || urlParams.get("review") === "blockout";
const blockoutMacroOverlay = urlParams.get("macro") === "1";
const imageSeedOverlay = orthographicBlockoutMode && urlParams.get("imageSeed") === "1";
const imageSemanticUnderlay = orthographicBlockoutMode && urlParams.get("imageUnderlay") === "1";
const approvedDenseVisualMode = urlParams.get("approvedDense") === "1";
const activeBlockoutElements = orthographicBlockoutMode || approvedDenseVisualMode ? denseApprovedBlockoutElements : blockoutElements;
const blockoutVolumesOverlay = orthographicBlockoutMode && urlParams.get("volumes") === "1";
const inspectMode = urlParams.get("inspect") === "1" || urlParams.get("mode") === "inspect";
const presentationMode = !inspectMode && urlParams.get("presentation") === "1";
const headlessMode = urlParams.get("headless") === "1";
const fullQualityPresentation = presentationMode && urlParams.get("full") === "1";
const sliceScope = urlParams.get("slice") ?? (presentationMode ? "arrival_service" : "off");
const arrivalServiceSliceScope = sliceScope === "arrival_service";
const pressurePlantSliceScope = sliceScope === "pressure_plant";
const pressurePlantSliceBuildingIds = new Set(["mass_pressure_store", "mass_yard_silo", "mass_plant_main", "mass_plant_annex", "mass_plant_tower"]);
const pressurePlantSliceFabricIds = new Set(["fabric_pressure_yard_surface", "fabric_plant_apron"]);
const pressurePlantSliceConnectorIds = new Set(["connector_plant_threshold"]);
const fastAuthoringMode = !presentationMode && !headlessMode && urlParams.get("full") !== "1";
const litePreview = inspectMode || fastAuthoringMode || headlessMode || urlParams.get("lite") === "1" || (presentationMode && !fullQualityPresentation) || window.matchMedia("(pointer: coarse)").matches || window.innerWidth < 900;
let visualPassPromise: Promise<void> | null = null;
const bootVeil = document.getElementById("boot-veil") as HTMLDivElement;
const bootProgress = document.getElementById("boot-progress") as HTMLDivElement;
const rendererDot = document.getElementById("renderer-dot") as HTMLSpanElement;
const rendererStatus = document.getElementById("renderer-status") as HTMLSpanElement;
const statusMessage = document.getElementById("status-message") as HTMLSpanElement;
const viewLabel = document.getElementById("view-label") as HTMLSpanElement;
const reviewLabel = document.getElementById("review-label") as HTMLSpanElement;
const inspector = document.getElementById("inspector") as HTMLDivElement;
const spaceList = document.getElementById("space-list") as HTMLDivElement;
const validationList = document.getElementById("validation-list") as HTMLDivElement;
const selectionCount = document.getElementById("selection-count") as HTMLSpanElement;
const viewportHudTitle = document.getElementById("viewport-hud-title") as HTMLDivElement;
const viewportHudCopy = document.getElementById("viewport-hud-copy") as HTMLDivElement;
const exportBlockoutButton = document.getElementById("export-blockout") as HTMLButtonElement;
const fpsReadout = document.getElementById("fps-readout") as HTMLSpanElement;
const selectionReticle = document.getElementById("selection-reticle") as HTMLDivElement;
const inspectModeButton = document.getElementById("inspect-mode") as HTMLButtonElement;
const readinessState = document.getElementById("readiness-state") as HTMLSpanElement;
const modeReadout = document.getElementById("mode-readout") as HTMLSpanElement;
const startupReadout = document.getElementById("startup-readout") as HTMLSpanElement;
const visualPassReadout = document.getElementById("visual-pass-readout") as HTMLSpanElement;
const frameReadout = document.getElementById("frame-readout") as HTMLSpanElement;
const readinessDetail = document.getElementById("readiness-detail") as HTMLDivElement;
const readinessStartedAt = performance.now();
let rendererReadyAt = 0;
let blockoutReadyAt = 0;
let visualPassStartedAt = 0;
let visualPassReadyAt = 0;
let measuredFps = 0;
let frameTimeTotal = 0;
let frameTimeSamples = 0;
let averageFrameTimeMs = 0;
let firstVisualFrameTimeMs = 0;
let steadyFrameTimeMs = 0;
let steadyMeasuredFps = 0;

function formatReadinessMs(timestamp: number) {
  return timestamp > 0 ? `${Math.round(timestamp - readinessStartedAt)} ms` : "--";
}

function readinessSnapshot() {
  return {
    mode: presentationMode ? "locked-presentation" : inspectMode ? "interactive-inspect" : litePreview ? "fast-authoring" : "full-authoring",
    rendererReadyMs: rendererReadyAt > 0 ? Math.round(rendererReadyAt - readinessStartedAt) : null,
    blockoutReadyMs: blockoutReadyAt > 0 ? Math.round(blockoutReadyAt - readinessStartedAt) : null,
    visualPassReadyMs: visualPassReadyAt > 0 ? Math.round(visualPassReadyAt - readinessStartedAt) : null,
    averageFrameTimeMs: averageFrameTimeMs > 0 ? Number(averageFrameTimeMs.toFixed(1)) : null,
    measuredFps,
    firstVisualFrameTimeMs: firstVisualFrameTimeMs > 0 ? Number(firstVisualFrameTimeMs.toFixed(1)) : null,
    steadyFrameTimeMs: steadyFrameTimeMs > 0 ? Number(steadyFrameTimeMs.toFixed(1)) : null,
    steadyMeasuredFps,
  };
}

async function measureSteadyStatePerformance() {
  if (steadyFrameTimeMs > 0 || !renderer || !scene || !camera) return;
  const warmupStart = performance.now();
  renderer.render(scene, camera);
  firstVisualFrameTimeMs = performance.now() - warmupStart;
  const samples: number[] = [];
  for (let index = 0; index < 5; index += 1) {
    const start = performance.now();
    renderer.render(scene, camera);
    samples.push(performance.now() - start);
  }
  const average = samples.reduce((sum, value) => sum + value, 0) / samples.length;
  steadyFrameTimeMs = average;
  steadyMeasuredFps = Math.max(1, Math.round(1000 / Math.max(average, 0.1)));
  updateReadinessPanel();
}

function updateReadinessPanel() {
  const mode = presentationMode ? "LOCKED" : inspectMode ? "INSPECT" : litePreview ? "FAST" : "FULL";
  modeReadout.textContent = mode;
  startupReadout.textContent = formatReadinessMs(blockoutReadyAt);
  visualPassReadout.textContent = visualPassReadyAt > 0 ? formatReadinessMs(visualPassReadyAt) : visualPassStartedAt > 0 ? "loading" : "deferred";
  frameReadout.textContent = steadyFrameTimeMs > 0 ? `${steadyMeasuredFps} FPS / ${steadyFrameTimeMs.toFixed(1)} ms steady` : measuredFps > 0 ? `${measuredFps} FPS / ${averageFrameTimeMs.toFixed(1)} ms load` : "warming";
  readinessState.textContent = visualPassReadyAt > 0 ? "READY" : blockoutReadyAt > 0 ? "BLOCKOUT" : "BOOT";
  readinessDetail.textContent = presentationMode
    ? "Locked camera and full-quality capture path."
    : inspectMode
      ? "Orbit, pan, zoom, and tap inspection are enabled."
      : "Fast blockout is ready; visual assets remain deferred.";
}

const practicalGlowTexture = (() => {
  const glowCanvas = document.createElement("canvas");
  glowCanvas.width = 128;
  glowCanvas.height = 128;
  const context = glowCanvas.getContext("2d");
  if (context) {
    const gradient = context.createRadialGradient(64, 64, 0, 64, 64, 64);
    gradient.addColorStop(0, "rgba(255,255,255,0.95)");
    gradient.addColorStop(0.16, "rgba(255,220,174,0.78)");
    gradient.addColorStop(0.48, "rgba(255,166,103,0.24)");
    gradient.addColorStop(1, "rgba(255,140,80,0)");
    context.fillStyle = gradient;
    context.fillRect(0, 0, 128, 128);
  }
  const texture = new THREE.CanvasTexture(glowCanvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
})();

function addPracticalGlowSprite(parent: THREE.Object3D, position: { x: number; y: number; z: number }, colorHex: number, scale: number, opacity = 0.34) {
  const glow = new THREE.Sprite(new THREE.SpriteMaterial({
    map: practicalGlowTexture,
    color: colorHex,
    transparent: true,
    opacity,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    depthTest: true,
  }));
  glow.position.set(position.x, position.y, position.z);
  glow.scale.set(scale, scale, 1);
  glow.renderOrder = 8;
  parent.add(glow);
  return glow;
}

function addAuthoringSky() {
  const skyMaterial = new THREE.MeshBasicNodeMaterial();
  const height = positionLocal.y.div(float(1400)).add(0.5).saturate();
  const neutralSkyCandidate = urlParams.get("skyCandidate") !== "warm";
  const warmHorizon = color(neutralSkyCandidate ? 0xd5d8d3 : 0xf3a66a);
  const middleDusk = color(neutralSkyCandidate ? 0x9ca5a6 : 0x9b695d);
  const coolZenith = color(neutralSkyCandidate ? 0x68757c : 0x293640);
  const middleBand = smoothstep(float(0.11), float(0.52), height);
  const zenithBand = smoothstep(float(0.5), float(0.94), height);
  skyMaterial.colorNode = mix(mix(warmHorizon, middleDusk, middleBand), coolZenith, zenithBand);
  skyMaterial.side = THREE.BackSide;
  skyMaterial.depthWrite = false;
  skyMaterial.fog = false;
  const sky = new THREE.Mesh(new THREE.SphereGeometry(1400, 32, 16), skyMaterial);
  sky.name = "procedural_authoring_sky";
  sky.renderOrder = -10;
  sky.visible = urlParams.get("hdriBackground") === "off" && urlParams.get("mapOverview") !== "1";
  scene.add(sky);
  if (presentationMode) {
    const cloudCanvas = document.createElement("canvas");
    cloudCanvas.width = 1024;
    cloudCanvas.height = 256;
    const cloudContext = cloudCanvas.getContext("2d");
    if (cloudContext) {
      cloudContext.clearRect(0, 0, cloudCanvas.width, cloudCanvas.height);
      const cloudBands = [
        { x: 80, y: 128, width: 340, height: 48, alpha: 0.5 },
        { x: 300, y: 92, width: 420, height: 62, alpha: 0.4 },
        { x: 600, y: 142, width: 360, height: 44, alpha: 0.46 },
        { x: 840, y: 78, width: 300, height: 52, alpha: 0.32 },
      ];
      for (const band of cloudBands) {
        const gradient = cloudContext.createRadialGradient(band.x, band.y, 4, band.x, band.y, band.width * 0.5);
        gradient.addColorStop(0, `rgba(58, 60, 68, ${band.alpha})`);
        gradient.addColorStop(0.55, `rgba(58, 60, 68, ${band.alpha * 0.58})`);
        gradient.addColorStop(1, "rgba(74, 71, 82, 0)");
        cloudContext.fillStyle = gradient;
        cloudContext.beginPath();
        cloudContext.ellipse(band.x, band.y, band.width * 0.5, band.height, 0, 0, Math.PI * 2);
        cloudContext.fill();
      }
      const cloudTexture = new THREE.CanvasTexture(cloudCanvas);
      cloudTexture.colorSpace = THREE.SRGBColorSpace;
      const cloudMaterial = new THREE.MeshBasicMaterial({ map: cloudTexture, transparent: true, opacity: 0.94, depthWrite: false, fog: false, side: THREE.DoubleSide });
      const cloudPlane = new THREE.Mesh(new THREE.PlaneGeometry(980, 250), cloudMaterial);
      cloudPlane.name = "presentation_dusk_cloud_bands";
      cloudPlane.position.set(-250, 38, 160);
      cloudPlane.lookAt(-399, 1.78, 227.5);
      cloudPlane.renderOrder = -9;
      scene.add(cloudPlane);
    }
  }
}

const scene = new THREE.Scene();
  scene.background = new THREE.Color(urlParams.get("skyCandidate") !== "warm" ? 0x7b878b : 0x654b4b);
addAuthoringSky();
  const fogDisabled = urlParams.get("fog") === "off";
  scene.fog = orthographicBlockoutMode || fogDisabled || urlParams.get("mapOverview") === "1" || (approvedDenseVisualMode && urlParams.get("fog") !== "on") ? null : new THREE.FogExp2(urlParams.get("skyCandidate") !== "warm" ? 0x788285 : 0xb28b8c, fullQualityPresentation ? 0.0040 : 0.0024);
const perspectiveCamera = new THREE.PerspectiveCamera(42, 1, 0.1, 2000);
const orthographicCamera = new THREE.OrthographicCamera(-420, 420, 280, -280, 0.1, 2200);
orthographicCamera.up.set(0, 0, -1);
const camera: THREE.PerspectiveCamera = orthographicBlockoutMode ? (orthographicCamera as unknown as THREE.PerspectiveCamera) : perspectiveCamera;
camera.position.set(610, 510, 700);
const controls = new OrbitControls(camera, canvas);
controls.target.set(-20, 3, -35);
controls.enableDamping = false;
controls.dampingFactor = 0.08;
controls.maxPolarAngle = Math.PI * 0.49;
controls.minDistance = 180;
controls.maxDistance = 1250;
controls.enablePan = true;
controls.screenSpacePanning = true;
controls.rotateSpeed = 0.34;
controls.zoomSpeed = 0.58;
controls.panSpeed = 0.28;

let renderer: THREE.WebGPURenderer;
let viewMode: ViewMode = "top";
let reviewMode: ReviewMode = orthographicBlockoutMode ? "blockout" : pressurePlantSliceScope ? "slice" : "site";
let showZones = false;
let showMasses = true;
let showConnectors = true;
let showFabric = true;
let showPaths = true;
let showVolumes = true;
let showHuman = true;
let showGrid = true;
let showAssets = true;
let showDetails = true;
let showBlockout = orthographicBlockoutMode;
let showBlockoutTags = orthographicBlockoutMode;
let showXray = orthographicBlockoutMode;
let selectedId: string | null = null;
let selectedObject: THREE.Object3D | null = null;
const selectableObjects: THREE.Object3D[] = [];
const objectById = new Map<string, THREE.Object3D>();
const zoneObjects: THREE.Object3D[] = [];
const buildingObjects: THREE.Object3D[] = [];
const connectorObjects: THREE.Object3D[] = [];
const fabricObjects: THREE.Object3D[] = [];
const volumeObjects: THREE.Object3D[] = [];
const pathObjects: THREE.Object3D[] = [];
const humanObjects: THREE.Object3D[] = [];
const gridObjects: THREE.Object3D[] = [];
const assetObjects: THREE.Object3D[] = [];
  const detailObjects: THREE.Object3D[] = [];
  const pressurePlantSliceObjects: THREE.Object3D[] = [];
  const pressurePlantSliceAssets: THREE.Object3D[] = [];
  let pressurePlantSliceRoot: THREE.Group | null = null;
  const densityObjects: THREE.Object3D[] = [];
  const blockoutObjects: THREE.Object3D[] = [];
  const blockoutTagObjects: THREE.Object3D[] = [];
  const arrivalPresentationRoadSurfaces: Array<{ mesh: THREE.Mesh; length: number; width: number }> = [];
  const environmentDiagnostics: string[] = [];
let frames = 0;
let lastFpsTime = performance.now();
let renderDirty = true;
let renderSettleUntil = 0;
let isInteracting = false;
let lastRenderAt = 0;
let animationLoopActive = false;
const interactiveRenderIntervalMs = 120;

function startRenderLoop() {
  if (!renderer || animationLoopActive) return;
  animationLoopActive = true;
  renderer.setAnimationLoop(render);
}

function stopRenderLoop() {
  if (!renderer || !animationLoopActive) return;
  renderer.setAnimationLoop(null);
  animationLoopActive = false;
}

function requestRender() {
  renderDirty = true;
  startRenderLoop();
}

controls.addEventListener("start", () => {
  isInteracting = true;
  requestRender();
});
controls.addEventListener("change", requestRender);
controls.addEventListener("end", () => {
  isInteracting = false;
  renderSettleUntil = performance.now() + 240;
  requestRender();
});

function makeGroundMaterial() {
  const material = new THREE.MeshStandardNodeMaterial();
  const worldX = positionWorld.x;
  const worldZ = positionWorld.z;
  const roadCenterZ = worldX.add(float(388)).mul(float(-0.91)).add(float(218));
  const roadDistance = abs(worldZ.sub(roadCenterZ));
  const roadMask = float(1.0).sub(smoothstep(float(8.5), float(22.0), roadDistance));
  const apronMask = float(1.0).sub(smoothstep(float(22.0), float(48.0), roadDistance));
  const wear = smoothstep(float(0.18), float(0.82), fract(worldX.mul(float(0.037)).add(worldZ.mul(float(0.061)))));
  const broadWear = smoothstep(float(0.22), float(0.78), fract(worldX.mul(float(0.011)).add(worldZ.mul(float(0.019)))));
  const fineWear = smoothstep(float(0.14), float(0.88), fract(worldX.mul(float(0.083)).add(worldZ.mul(float(0.127)))));
  const asphaltBase = mix(color(0x242e2f), color(0x46504e), wear.mul(float(0.34)));
  const asphalt = mix(asphaltBase, color(0x182426), broadWear.mul(float(0.22)).add(fineWear.mul(float(0.08))));
  const apronBase = mix(color(0x535a57), color(0x746d62), wear.mul(float(0.3)));
  const apron = mix(apronBase, color(0x424a48), broadWear.mul(float(0.14)));
  const gravel = mix(color(0x393d39), color(0x59534a), wear.mul(float(0.26)));
  const base = mix(gravel, apron, apronMask);
  material.colorNode = mix(base, asphalt, roadMask);
  const wetnessRoughness = mix(float(0.72), float(0.93), broadWear.mul(float(0.72)).add(fineWear.mul(float(0.16))));
  material.roughnessNode = urlParams.get("groundWetness") === "on" ? mix(float(0.98), wetnessRoughness, roadMask) : mix(float(0.98), float(0.88), roadMask);
  material.metalness = 0.03;
  material.userData = { semanticSurface: "procedural_ground_splat", surfaceFamilies: ["asphalt", "concrete", "gravel"] };
  return material;
}

function makeSpaceMaterial(hex: number) {
  return new THREE.MeshStandardMaterial({ color: hex, roughness: 0.86, metalness: 0.1, transparent: true, opacity: 0.78 });
}

function makeObjectiveMaterial() {
  const material = new THREE.MeshStandardNodeMaterial();
  material.colorNode = color(0xff7b32);
  material.emissiveNode = color(0xff4d22);
  material.roughness = 0.36;
  material.metalness = 0.35;
  return material;
}

function addGrid() {
  const grid = new THREE.GridHelper(1000, 50, 0x2a3a3e, 0x182328);
  grid.position.y = -0.48;
  gridObjects.push(grid);
  scene.add(grid);
}

let arrivalContactShadowTexture: THREE.CanvasTexture | null = null;
let arrivalHeadlightPoolTexture: THREE.CanvasTexture | null = null;

function getArrivalHeadlightPoolTexture() {
  if (arrivalHeadlightPoolTexture) return arrivalHeadlightPoolTexture;
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 256;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Unable to create arrival headlight-pool canvas");
  const gradient = context.createRadialGradient(128, 112, 8, 128, 128, 128);
  gradient.addColorStop(0, "rgba(255, 214, 156, 0.7)");
  gradient.addColorStop(0.34, "rgba(255, 168, 96, 0.34)");
  gradient.addColorStop(0.72, "rgba(255, 135, 70, 0.11)");
  gradient.addColorStop(1, "rgba(255, 110, 56, 0)");
  context.fillStyle = gradient;
  context.fillRect(0, 0, 256, 256);
  arrivalHeadlightPoolTexture = new THREE.CanvasTexture(canvas);
  arrivalHeadlightPoolTexture.colorSpace = THREE.SRGBColorSpace;
  arrivalHeadlightPoolTexture.needsUpdate = true;
  return arrivalHeadlightPoolTexture;
}

function getArrivalContactShadowTexture() {
  if (arrivalContactShadowTexture) return arrivalContactShadowTexture;
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 256;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Unable to create arrival contact-shadow canvas");
  const gradient = context.createRadialGradient(128, 128, 6, 128, 128, 128);
  gradient.addColorStop(0, "rgba(8, 12, 13, 0.68)");
  gradient.addColorStop(0.42, "rgba(8, 12, 13, 0.42)");
  gradient.addColorStop(0.78, "rgba(8, 12, 13, 0.14)");
  gradient.addColorStop(1, "rgba(8, 12, 13, 0)");
  context.fillStyle = gradient;
  context.fillRect(0, 0, 256, 256);
  arrivalContactShadowTexture = new THREE.CanvasTexture(canvas);
  arrivalContactShadowTexture.colorSpace = THREE.SRGBColorSpace;
  arrivalContactShadowTexture.needsUpdate = true;
  return arrivalContactShadowTexture;
}

function addArrivalContactShadow(parent: THREE.Object3D, name: string, position: { x: number; z: number }, sizeX: number, sizeZ: number, rotationY: number, opacity = 0.44) {
  const shadow = new THREE.Mesh(
    new THREE.PlaneGeometry(1, 1),
    new THREE.MeshBasicMaterial({
      color: 0x101619,
      map: getArrivalContactShadowTexture(),
      transparent: true,
      opacity,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2,
    }),
  );
  shadow.name = name;
  shadow.rotation.x = -Math.PI / 2;
  shadow.rotation.y = rotationY;
  shadow.scale.set(sizeX, sizeZ, 1);
  shadow.position.set(position.x, 0.112, position.z);
  shadow.renderOrder = 2;
  shadow.userData.visualLayer = "street-shadow";
  parent.add(shadow);
}

function addPracticalLight(id: string, position: { x: number; y: number; z: number }, colorHex: number, intensity: number, distance: number) {
  const light = new THREE.PointLight(colorHex, intensity, distance, 2);
  light.position.set(position.x, position.y, position.z);
  light.userData.visualCue = id;
  scene.add(light);

  const fixture = new THREE.Mesh(
    new THREE.BoxGeometry(0.72, 0.16, 0.72),
    new THREE.MeshBasicMaterial({ color: colorHex, toneMapped: false }),
  );
  fixture.position.copy(light.position);
  fixture.userData.visualCue = id;
  scene.add(fixture);
  addPracticalGlowSprite(scene, position, colorHex, 5.5, 0.24);
}

function addGround() {
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(840, 560), makeGroundMaterial());
  ground.name = "legacy_flat_ground";
  ground.userData.legacyFlatGround = true;
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.5;
  ground.receiveShadow = !litePreview || fullQualityPresentation;
  ground.userData.authoringRecord = { id: "ground", displayName: "Map Ground", kind: "GROUND" };
  scene.add(ground);

  const perimeter = new THREE.LineSegments(
    new THREE.EdgesGeometry(new THREE.BoxGeometry(840, 0.1, 560)),
    new THREE.LineBasicMaterial({ color: 0x46545a, transparent: true, opacity: 0.8 }),
  );
  perimeter.name = "legacy_flat_ground_perimeter";
  perimeter.userData.legacyFlatGround = true;
  perimeter.position.y = -0.45;
  scene.add(perimeter);
}

const tiledTextureCache = new Map<string, THREE.Texture>();

function cloneTiledTexture(source: THREE.Texture, repeatX: number, repeatY: number, colorSpace?: THREE.ColorSpace) {
  const key = `${source.uuid}:${Math.max(1, repeatX)}:${Math.max(1, repeatY)}:${colorSpace ?? ""}`;
  const cached = tiledTextureCache.get(key);
  if (cached) return cached;
  const cloned = source.clone();
  cloned.wrapS = THREE.RepeatWrapping;
  cloned.wrapT = THREE.RepeatWrapping;
  cloned.repeat.set(Math.max(1, repeatX), Math.max(1, repeatY));
  cloned.anisotropy = 4;
  if (colorSpace) cloned.colorSpace = colorSpace;
  cloned.needsUpdate = true;
  tiledTextureCache.set(key, cloned);
  return cloned;
}

let arrivalConcreteTexture: THREE.CanvasTexture | null = null;

function getArrivalConcreteTexture() {
  if (arrivalConcreteTexture) return arrivalConcreteTexture;
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 512;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Unable to create arrival concrete texture");
  context.fillStyle = "#747a77";
  context.fillRect(0, 0, canvas.width, canvas.height);
  let seed = 4811;
  const random = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  for (let index = 0; index < 150; index += 1) {
    const x = random() * canvas.width;
    const y = random() * canvas.height;
    const radius = 2 + random() * 10;
    context.globalAlpha = 0.035 + random() * 0.075;
    context.fillStyle = random() > 0.48 ? "#d0d0c4" : "#384344";
    context.fillRect(x, y, radius * (1.2 + random() * 2.4), radius * 0.32);
  }
  context.globalAlpha = 0.42;
  context.strokeStyle = "#4e5856";
  context.lineWidth = 3;
  for (const x of [96, 192, 288, 384]) {
    context.beginPath();
    context.moveTo(x, 0);
    context.lineTo(x, canvas.height);
    context.stroke();
  }
  context.globalAlpha = 0.2;
  context.strokeStyle = "#bac0b8";
  context.lineWidth = 2;
  for (const y of [128, 256, 384]) {
    context.beginPath();
    context.moveTo(0, y);
    context.lineTo(canvas.width, y);
    context.stroke();
  }
  const edgeWash = context.createLinearGradient(0, 0, 0, canvas.height);
  edgeWash.addColorStop(0, "rgba(20, 29, 29, 0.02)");
  edgeWash.addColorStop(0.75, "rgba(20, 29, 29, 0.02)");
  edgeWash.addColorStop(1, "rgba(20, 29, 29, 0.25)");
  context.globalAlpha = 1;
  context.fillStyle = edgeWash;
  context.fillRect(0, 0, canvas.width, canvas.height);
  arrivalConcreteTexture = new THREE.CanvasTexture(canvas);
  arrivalConcreteTexture.colorSpace = THREE.SRGBColorSpace;
  arrivalConcreteTexture.wrapS = THREE.RepeatWrapping;
  arrivalConcreteTexture.wrapT = THREE.RepeatWrapping;
  arrivalConcreteTexture.repeat.set(1.4, 1);
  arrivalConcreteTexture.needsUpdate = true;
  return arrivalConcreteTexture;
}

let pressureConcreteTexture: THREE.CanvasTexture | null = null;

function getPressureConcreteTexture() {
  if (pressureConcreteTexture) return pressureConcreteTexture;
  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = 1024;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Unable to create pressure concrete texture");
  context.fillStyle = "#777a74";
  context.fillRect(0, 0, canvas.width, canvas.height);
  let seed = 17173;
  const random = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  const broadStains = [
    [0.18, 0.26, 0.34, 0.16, "rgba(33, 42, 41, 0.16)"],
    [0.74, 0.38, 0.28, 0.22, "rgba(205, 199, 181, 0.11)"],
    [0.34, 0.78, 0.52, 0.12, "rgba(47, 55, 51, 0.13)"],
    [0.82, 0.82, 0.22, 0.17, "rgba(215, 207, 186, 0.08)"],
  ] as const;
  for (const [x, y, rx, ry, fill] of broadStains) {
    context.save();
    context.translate(canvas.width * x, canvas.height * y);
    context.rotate((random() - 0.5) * 0.22);
    context.scale(canvas.width * rx, canvas.height * ry);
    context.beginPath();
    context.ellipse(0, 0, 1, 1, 0, 0, Math.PI * 2);
    context.fillStyle = fill;
    context.fill();
    context.restore();
  }
  for (let index = 0; index < 1700; index += 1) {
    const x = random() * canvas.width;
    const y = random() * canvas.height;
    const radius = 0.7 + random() * 2.8;
    context.globalAlpha = 0.08 + random() * 0.2;
    context.fillStyle = random() > 0.5 ? "#c7c5b7" : "#343e3d";
    context.beginPath();
    context.ellipse(x, y, radius * (0.7 + random() * 1.7), radius * (0.55 + random() * 0.85), random() * Math.PI, 0, Math.PI * 2);
    context.fill();
  }
  context.globalAlpha = 0.42;
  context.strokeStyle = "#444d4a";
  context.lineWidth = 4;
  for (const x of [118, 356, 736, 914]) {
    context.beginPath();
    context.moveTo(x, 0);
    context.lineTo(x + 18, 310);
    context.lineTo(x - 10, 664);
    context.lineTo(x + 12, canvas.height);
    context.stroke();
  }
  context.globalAlpha = 0.3;
  context.strokeStyle = "#c2c4b8";
  context.lineWidth = 3;
  for (const y of [204, 528, 822]) {
    context.beginPath();
    context.moveTo(0, y);
    context.lineTo(280, y + 12);
    context.moveTo(340, y - 8);
    context.lineTo(700, y + 10);
    context.moveTo(760, y + 7);
    context.lineTo(canvas.width, y - 4);
    context.stroke();
  }
  context.globalAlpha = 0.24;
  context.strokeStyle = "#242d2d";
  context.lineWidth = 5;
  for (const y of [116, 694]) {
    context.beginPath();
    context.moveTo(0, y);
    context.bezierCurveTo(180, y - 16, 300, y + 25, 470, y + 2);
    context.bezierCurveTo(650, y - 22, 790, y + 22, canvas.width, y - 2);
    context.stroke();
  }
  context.globalAlpha = 1;
  const edgeWash = context.createLinearGradient(0, 0, 0, canvas.height);
  edgeWash.addColorStop(0, "rgba(27, 35, 34, 0.02)");
  edgeWash.addColorStop(0.76, "rgba(27, 35, 34, 0.04)");
  edgeWash.addColorStop(1, "rgba(22, 28, 28, 0.22)");
  context.fillStyle = edgeWash;
  context.fillRect(0, 0, canvas.width, canvas.height);
  pressureConcreteTexture = new THREE.CanvasTexture(canvas);
  pressureConcreteTexture.colorSpace = THREE.SRGBColorSpace;
  pressureConcreteTexture.wrapS = THREE.RepeatWrapping;
  pressureConcreteTexture.wrapT = THREE.RepeatWrapping;
  pressureConcreteTexture.needsUpdate = true;
  return pressureConcreteTexture;
}

let arrivalAsphaltMacroTexture: THREE.CanvasTexture | null = null;

function getArrivalAsphaltMacroTexture() {
  if (arrivalAsphaltMacroTexture) return arrivalAsphaltMacroTexture;
  const canvas = document.createElement("canvas");
  canvas.width = 768;
  canvas.height = 768;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Unable to create arrival asphalt macro texture");
  context.clearRect(0, 0, canvas.width, canvas.height);
  let seed = 9173;
  const random = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  for (let index = 0; index < 180; index += 1) {
    const x = random() * canvas.width;
    const y = random() * canvas.height;
    const radiusX = 8 + random() * 46;
    const radiusY = 2 + random() * 16;
    context.save();
    context.translate(x, y);
    context.rotate((random() - 0.5) * 0.28);
    context.globalAlpha = 0.14 + random() * 0.18;
    context.fillStyle = random() > 0.48 ? "#111819" : "#c0c1b2";
    context.beginPath();
    context.ellipse(0, 0, radiusX, radiusY, 0, 0, Math.PI * 2);
    context.fill();
    context.restore();
  }
  context.lineCap = "round";
  for (let index = 0; index < 14; index += 1) {
    const x = 24 + random() * (canvas.width - 48);
    const y = 110 + random() * (canvas.height - 220);
    context.globalAlpha = 0.18 + random() * 0.14;
    context.strokeStyle = index % 3 === 0 ? "#111719" : "#8d918a";
    context.lineWidth = 2 + random() * 4;
    context.beginPath();
    context.moveTo(x, y);
    context.bezierCurveTo(x + 50, y - 8, x + 120, y + 10, x + 200, y + (random() - 0.5) * 22);
    context.stroke();
  }
  for (const [x, y, radius] of [[148, 522, 42], [382, 392, 31], [590, 214, 36], [618, 626, 28]] as Array<[number, number, number]>) {
    const oil = context.createRadialGradient(x, y, 2, x, y, radius);
    oil.addColorStop(0, "rgba(7, 12, 13, 0.58)");
    oil.addColorStop(0.46, "rgba(12, 18, 18, 0.32)");
    oil.addColorStop(1, "rgba(12, 18, 18, 0)");
    context.globalAlpha = 1;
    context.fillStyle = oil;
    context.fillRect(x - radius, y - radius, radius * 2, radius * 2);
  }
  arrivalAsphaltMacroTexture = new THREE.CanvasTexture(canvas);
  arrivalAsphaltMacroTexture.colorSpace = THREE.SRGBColorSpace;
  arrivalAsphaltMacroTexture.needsUpdate = true;
  return arrivalAsphaltMacroTexture;
}

function addArrivalAsphaltMacroOverlays() {
  const macroTexture = getArrivalAsphaltMacroTexture();
  for (const surface of arrivalPresentationRoadSurfaces) {
    const parent = surface.mesh.parent;
    if (!parent) continue;
    const macro = new THREE.Mesh(new THREE.PlaneGeometry(surface.length, surface.width), new THREE.MeshBasicMaterial({
      map: macroTexture,
       color: 0x4f5b57,
      transparent: true,
       opacity: 0.9,
      blending: THREE.MultiplyBlending,
      premultipliedAlpha: true,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -3,
      polygonOffsetUnits: -3,
    }));
    macro.name = `${surface.mesh.name || "arrival_road"}_macro_grime_overlay`;
    macro.rotation.x = -Math.PI / 2;
    macro.rotation.y = surface.mesh.rotation.y;
    macro.position.copy(surface.mesh.position);
    macro.position.y += 0.046;
    macro.userData.visualLayer = "street-canyon-surface";
    macro.userData.environmentMaterial = "procedural asphalt macro grime and repair overlay";
    parent.add(macro);

    const gutterMaterial = new THREE.MeshBasicMaterial({
      color: 0x182122,
      transparent: true,
      opacity: 0.34,
      blending: THREE.MultiplyBlending,
      premultipliedAlpha: true,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -4,
      polygonOffsetUnits: -4,
    });
    for (const gutterSide of [-1, 1]) {
      const gutter = new THREE.Mesh(new THREE.PlaneGeometry(surface.length * 0.96, Math.min(0.86, surface.width * 0.12)), gutterMaterial.clone());
      gutter.name = `${surface.mesh.name || "arrival_road"}_gutter_grime_${gutterSide < 0 ? "left" : "right"}`;
      gutter.rotation.x = -Math.PI / 2;
      gutter.rotation.y = surface.mesh.rotation.y;
      gutter.position.copy(surface.mesh.position);
      gutter.position.y += 0.064;
      gutter.position.x += Math.sin(surface.mesh.rotation.y) * gutterSide * (surface.width * 0.44);
      gutter.position.z += Math.cos(surface.mesh.rotation.y) * gutterSide * (surface.width * 0.44);
      gutter.userData.visualLayer = "street-canyon-surface";
      gutter.userData.environmentMaterial = "procedural curb-edge grime strip";
      parent.add(gutter);
    }

    if (surface.width >= 12) {
      const lanePolishMaterial = new THREE.MeshPhysicalMaterial({
        color: 0x10191b,
        roughness: 0.24,
        metalness: 0.035,
        clearcoat: 0.68,
        clearcoatRoughness: 0.12,
        transparent: true,
        opacity: 0.34,
        depthWrite: false,
        polygonOffset: true,
        polygonOffsetFactor: -5,
        polygonOffsetUnits: -5,
      });
      for (const laneSide of [-1, 1]) {
        const lane = new THREE.Mesh(new THREE.PlaneGeometry(surface.length * 0.9, Math.min(1.18, surface.width * 0.11)), lanePolishMaterial.clone());
        lane.name = `${surface.mesh.name || "arrival_road"}_tire_polish_lane_${laneSide < 0 ? "left" : "right"}`;
        lane.rotation.x = -Math.PI / 2;
        lane.rotation.y = surface.mesh.rotation.y;
        lane.position.copy(surface.mesh.position);
        lane.position.y += 0.073;
        lane.position.x += Math.sin(surface.mesh.rotation.y) * laneSide * (surface.width * 0.22);
        lane.position.z += Math.cos(surface.mesh.rotation.y) * laneSide * (surface.width * 0.22);
        lane.userData.visualLayer = "street-canyon-surface";
        lane.userData.environmentMaterial = "physical tire-polish response";
        parent.add(lane);
      }
      const repairMaterial = new THREE.MeshStandardMaterial({
        color: 0x222d2e,
        roughness: 0.9,
        metalness: 0.02,
        transparent: true,
        opacity: 0.54,
        depthWrite: false,
        polygonOffset: true,
        polygonOffsetFactor: -6,
        polygonOffsetUnits: -6,
      });
      for (const localX of [-surface.length * 0.28, surface.length * 0.14]) {
        const repair = new THREE.Mesh(new THREE.PlaneGeometry(0.16, surface.width * 0.78), repairMaterial.clone());
        repair.name = `${surface.mesh.name || "arrival_road"}_transverse_repair_${Math.round(localX)}`;
        repair.rotation.x = -Math.PI / 2;
        repair.rotation.y = surface.mesh.rotation.y;
        repair.position.copy(surface.mesh.position);
        repair.position.y += 0.076;
        repair.position.x += Math.cos(surface.mesh.rotation.y) * localX;
        repair.position.z -= Math.sin(surface.mesh.rotation.y) * localX;
        repair.userData.visualLayer = "street-canyon-surface";
        repair.userData.environmentMaterial = "presentation asphalt transverse repair seam";
        parent.add(repair);
      }

      const centerDashMaterial = new THREE.MeshBasicMaterial({
        color: 0xb9b5a5,
        transparent: true,
        opacity: 0.38,
        depthWrite: false,
        polygonOffset: true,
        polygonOffsetFactor: -7,
        polygonOffsetUnits: -7,
      });
      const dashCount = Math.max(1, Math.floor(surface.length / 18));
      for (let dashIndex = 0; dashIndex < dashCount; dashIndex += 1) {
        const localX = -surface.length * 0.42 + (dashIndex + 0.5) * (surface.length * 0.84 / dashCount);
        const dash = new THREE.Mesh(new THREE.PlaneGeometry(Math.min(3.6, surface.length * 0.12), 0.14), centerDashMaterial.clone());
        dash.name = `${surface.mesh.name || "arrival_road"}_center_dash_${dashIndex}`;
        dash.rotation.x = -Math.PI / 2;
        dash.rotation.y = surface.mesh.rotation.y;
        dash.position.copy(surface.mesh.position);
        dash.position.y += 0.082;
        dash.position.x += Math.cos(surface.mesh.rotation.y) * localX;
        dash.position.z -= Math.sin(surface.mesh.rotation.y) * localX;
        dash.userData.visualLayer = "street-canyon-surface";
        dash.userData.environmentMaterial = "presentation center lane marking";
        parent.add(dash);
      }
    }
  }

  const connectorArrival = objectById.get("connector_arrival_road");
  if (connectorArrival instanceof THREE.Group) {
    connectorArrival.children.forEach((segment, segmentIndex) => {
      if (!(segment instanceof THREE.Group)) return;
      const slab = segment.children.find((candidate) => candidate instanceof THREE.Mesh && candidate.userData.connectorRoadSlab === true);
      if (!(slab instanceof THREE.Mesh)) return;
      const dimensions = slab.userData.connectorDimensions as { length: number; width: number } | undefined;
      if (!dimensions) return;
      const connectorMacro = new THREE.Mesh(new THREE.PlaneGeometry(dimensions.length * 0.98, dimensions.width * 0.94), new THREE.MeshBasicMaterial({
        map: macroTexture,
         color: 0x243033,
         transparent: true,
         opacity: 0.82,
        blending: THREE.MultiplyBlending,
        premultipliedAlpha: true,
        depthWrite: false,
        polygonOffset: true,
        polygonOffsetFactor: -6,
        polygonOffsetUnits: -6,
      }));
      connectorMacro.name = `connector_arrival_road_segment_${segmentIndex}_macro_grime_overlay`;
      connectorMacro.rotation.x = -Math.PI / 2;
      connectorMacro.position.set(0, 0.846, 0);
      connectorMacro.renderOrder = 4;
      connectorMacro.userData.visualLayer = "street-canyon-surface";
      connectorMacro.userData.environmentMaterial = "procedural asphalt macro grime on visible connector slab";
      segment.add(connectorMacro);

      const connectorLaneMaterial = new THREE.MeshPhysicalMaterial({
        color: 0x10191b,
        roughness: 0.2,
        metalness: 0.03,
        clearcoat: 0.76,
        clearcoatRoughness: 0.1,
        transparent: true,
         opacity: 0.64,
         depthWrite: false,
        polygonOffset: true,
        polygonOffsetFactor: -7,
        polygonOffsetUnits: -7,
      });
      for (const laneSide of [-1, 1]) {
        const lane = new THREE.Mesh(new THREE.PlaneGeometry(dimensions.length * 0.88, Math.min(1.7, dimensions.width * 0.15)), connectorLaneMaterial.clone());
        lane.name = `connector_arrival_road_segment_${segmentIndex}_tire_polish_${laneSide < 0 ? "left" : "right"}`;
        lane.rotation.x = -Math.PI / 2;
        lane.position.set(0, 0.851, laneSide * dimensions.width * 0.22);
        lane.renderOrder = 5;
        lane.userData.visualLayer = "street-canyon-surface";
        lane.userData.environmentMaterial = "physical tire-polish response on visible connector slab";
        segment.add(lane);
      }
      if (segmentIndex === 0) {
        const wetPatchMaterial = new THREE.MeshBasicMaterial({ map: getArrivalHeadlightPoolTexture(), color: 0x26383a, transparent: true, opacity: 0.34, premultipliedAlpha: true, depthWrite: false, blending: THREE.MultiplyBlending, polygonOffset: true, polygonOffsetFactor: -9, polygonOffsetUnits: -9 });
        for (const [localX, localZ, scaleX, scaleZ] of [[-18, -3.2, 5.5, 1.5], [2, 3.6, 4.6, 1.15], [20, -1.4, 6.2, 1.35]] as Array<[number, number, number, number]>) {
          const wetPatch = new THREE.Mesh(new THREE.CircleGeometry(1, 32), wetPatchMaterial.clone());
          wetPatch.name = `connector_arrival_road_segment_${segmentIndex}_wet_patch_${localX}`;
          wetPatch.rotation.x = -Math.PI / 2;
          wetPatch.position.set(localX, 0.858, localZ);
          wetPatch.scale.set(scaleX, scaleZ, 1);
          wetPatch.renderOrder = 5;
          wetPatch.userData.visualLayer = "street-canyon-surface";
          wetPatch.userData.environmentMaterial = "physical damp asphalt patch on visible connector slab";
          segment.add(wetPatch);
        }
      }
      const broadRepairMaterial = new THREE.MeshStandardMaterial({
        color: 0x293638,
        roughness: 0.94,
        metalness: 0.02,
        transparent: true,
        opacity: 0.58,
        depthWrite: false,
        polygonOffset: true,
        polygonOffsetFactor: -8,
        polygonOffsetUnits: -8,
      });
      for (const [localX, localZ, width, height, rotation] of [[-11, -2.4, 7.8, 2.2, -0.05], [14, 2.8, 6.6, 1.7, 0.08]] as Array<[number, number, number, number, number]>) {
        const broadRepair = new THREE.Mesh(new THREE.PlaneGeometry(width, height), broadRepairMaterial.clone());
        broadRepair.name = `connector_arrival_road_segment_${segmentIndex}_broad_repair_${localX}`;
        broadRepair.rotation.x = -Math.PI / 2;
        broadRepair.rotation.z = rotation;
        broadRepair.position.set(localX, 0.862, localZ);
        broadRepair.renderOrder = 5;
        broadRepair.userData.visualLayer = "street-canyon-surface";
        broadRepair.userData.environmentMaterial = "broad worn asphalt repair panel on visible connector slab";
        segment.add(broadRepair);
      }
      const connectorRepairMaterial = new THREE.MeshStandardMaterial({
        color: 0x202a2b,
        roughness: 0.92,
        metalness: 0.02,
        transparent: true,
         opacity: 0.64,
         depthWrite: false,
        polygonOffset: true,
        polygonOffsetFactor: -8,
        polygonOffsetUnits: -8,
      });
      for (const localX of [-dimensions.length * 0.24, dimensions.length * 0.18]) {
        const repair = new THREE.Mesh(new THREE.PlaneGeometry(0.14, dimensions.width * 0.76), connectorRepairMaterial.clone());
        repair.name = `connector_arrival_road_segment_${segmentIndex}_repair_${Math.round(localX)}`;
        repair.rotation.x = -Math.PI / 2;
        repair.position.set(localX, 0.853, 0);
        repair.renderOrder = 5;
        repair.userData.visualLayer = "street-canyon-surface";
        repair.userData.environmentMaterial = "presentation asphalt repair seam on visible connector slab";
        segment.add(repair);
      }

      const connectorDashMaterial = new THREE.MeshBasicMaterial({
        color: 0xb8b4a5,
        transparent: true,
        opacity: 0.42,
        depthWrite: false,
        polygonOffset: true,
        polygonOffsetFactor: -9,
        polygonOffsetUnits: -9,
      });
      const connectorDashCount = Math.max(1, Math.floor(dimensions.length / 22));
      for (let dashIndex = 0; dashIndex < connectorDashCount; dashIndex += 1) {
        const localX = -dimensions.length * 0.42 + (dashIndex + 0.5) * (dimensions.length * 0.84 / connectorDashCount);
        const dash = new THREE.Mesh(new THREE.PlaneGeometry(Math.min(4.2, dimensions.length * 0.11), 0.14), connectorDashMaterial.clone());
        dash.name = `connector_arrival_road_segment_${segmentIndex}_center_dash_${dashIndex}`;
        dash.rotation.x = -Math.PI / 2;
        dash.position.set(localX, 0.86, 0);
        dash.renderOrder = 6;
        dash.userData.visualLayer = "street-canyon-surface";
        dash.userData.environmentMaterial = "presentation center lane marking on visible connector slab";
        segment.add(dash);
      }

      const connectorShoulderMaterial = new THREE.MeshStandardMaterial({ color: 0x5d5a52, roughness: 0.98, metalness: 0.02, transparent: true, opacity: 0.92 });
      const connectorCurbMaterial = new THREE.MeshStandardMaterial({ color: 0x6d716b, roughness: 0.96, metalness: 0.03 });
      const connectorGutterMaterial = new THREE.MeshStandardMaterial({ color: 0x20292a, roughness: 0.94, metalness: 0.12 });
      const connectorDrainMaterial = new THREE.MeshStandardMaterial({ color: 0x151d1e, roughness: 0.78, metalness: 0.44 });
      for (const side of [-1, 1]) {
        const shoulder = new THREE.Mesh(new THREE.BoxGeometry(dimensions.length * 0.94, 0.038, 0.68), connectorShoulderMaterial.clone());
        shoulder.name = `connector_arrival_road_segment_${segmentIndex}_gravel_shoulder_${side < 0 ? "left" : "right"}`;
        shoulder.position.set(0, 0.823, side * (dimensions.width * 0.5 + 0.38));
        shoulder.receiveShadow = true;
        shoulder.userData.visualLayer = "street-canyon-surface";
        shoulder.userData.environmentMaterial = "presentation gravel shoulder transition";
        segment.add(shoulder);
        const curb = new THREE.Mesh(new THREE.BoxGeometry(dimensions.length * 0.94, 0.16, 0.24), connectorCurbMaterial);
        curb.name = `connector_arrival_road_segment_${segmentIndex}_low_curb_${side < 0 ? "left" : "right"}`;
        curb.position.set(0, 0.86, side * (dimensions.width * 0.5 + 0.78));
        curb.castShadow = true;
        curb.receiveShadow = true;
        curb.userData.visualLayer = "street-canyon-surface";
        curb.userData.environmentMaterial = "presentation low concrete curb transition";
        segment.add(curb);
        const gutter = new THREE.Mesh(new THREE.BoxGeometry(dimensions.length * 0.94, 0.035, 0.28), connectorGutterMaterial);
        gutter.name = `connector_arrival_road_segment_${segmentIndex}_gutter_${side < 0 ? "left" : "right"}`;
        gutter.position.set(0, 0.884, side * (dimensions.width * 0.5 + 0.28));
        gutter.receiveShadow = true;
        gutter.userData.visualLayer = "street-canyon-surface";
        gutter.userData.environmentMaterial = "presentation dark curb gutter";
        segment.add(gutter);
        for (const localX of [-dimensions.length * 0.28, dimensions.length * 0.08, dimensions.length * 0.34]) {
          const drain = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.045, 0.22), connectorDrainMaterial);
          drain.name = `connector_arrival_road_segment_${segmentIndex}_drain_${side < 0 ? "left" : "right"}_${Math.round(localX)}`;
          drain.position.set(localX, 0.91, side * (dimensions.width * 0.5 + 0.28));
          drain.userData.visualLayer = "street-canyon-surface";
          drain.userData.environmentMaterial = "presentation storm-drain grate";
          segment.add(drain);
        }
      }
    });
  }
}

function applyRoadMaterial(colorMap: THREE.Texture, normalMap: THREE.Texture, roughnessMap: THREE.Texture) {
  for (const surfaceId of environmentKit.materialBindings.find((binding) => binding.material === "asset_ambientcg_road012a_2k")?.surfaces ?? []) {
    const mesh = objectById.get(surfaceId);
    const record = siteFabric.find((candidate) => candidate.id === surfaceId);
    if (!(mesh instanceof THREE.Mesh) || !record) continue;
    const material = new THREE.MeshStandardMaterial({
      map: cloneTiledTexture(colorMap, record.size.x / 18, record.size.z / 18, THREE.SRGBColorSpace),
      normalMap: cloneTiledTexture(normalMap, record.size.x / 18, record.size.z / 18),
      roughnessMap: cloneTiledTexture(roughnessMap, record.size.x / 18, record.size.z / 18),
      color: surfaceId === "fabric_arrival_road" ? 0x242e2d : 0xffffff,
      roughness: surfaceId === "fabric_arrival_road" ? 0.9 : 0.9,
      metalness: 0.025,
    });
    material.normalScale.set(0.42, 0.42);
    material.userData = { sourceAsset: "asset_ambientcg_road012a_2k", semanticSurface: surfaceId };
    mesh.material = material;
    mesh.userData.environmentMaterial = "ambientCG Road012A / 2K";
  }

  const arrivalRoad = objectById.get("connector_arrival_road");
  if (arrivalRoad instanceof THREE.Group) {
    arrivalRoad.traverse((child) => {
      if (!(child instanceof THREE.Mesh) || child.userData.connectorRoadSlab !== true) return;
      const dimensions = child.userData.connectorDimensions as { length: number; width: number } | undefined;
      if (!dimensions) return;
      const material = new THREE.MeshStandardMaterial({
        map: cloneTiledTexture(colorMap, dimensions.length / 12, dimensions.width / 12, THREE.SRGBColorSpace),
        normalMap: cloneTiledTexture(normalMap, dimensions.length / 12, dimensions.width / 12),
        roughnessMap: cloneTiledTexture(roughnessMap, dimensions.length / 12, dimensions.width / 12),
      color: 0x1a2425,
      roughness: 0.82,
      metalness: 0.025,
    });
    material.normalScale.set(0.86, 0.86);
      material.userData = { sourceAsset: "asset_ambientcg_road012a_2k", semanticSurface: "connector_arrival_road" };
      child.material = material;
      child.userData.environmentMaterial = "ambientCG Road012A / 2K — arrival connector";
    });
  }

  const cameraExtension = scene.getObjectByName("density_arrival_site_fabric_road_camera_extension");
  if (cameraExtension instanceof THREE.Mesh) {
    const material = new THREE.MeshPhysicalMaterial({
      map: cloneTiledTexture(colorMap, 11, 2.2, THREE.SRGBColorSpace),
      normalMap: cloneTiledTexture(normalMap, 11, 2.2),
      roughnessMap: cloneTiledTexture(roughnessMap, 11, 2.2),
      color: 0x3a4743,
      roughness: 0.7,
      metalness: 0.025,
      clearcoat: 0.3,
      clearcoatRoughness: 0.2,
      reflectivity: 0.58,
    });
    material.normalScale.set(0.72, 0.72);
    material.userData = { sourceAsset: "asset_ambientcg_road012a_2k", semanticSurface: "presentation_arrival_road_camera_extension" };
    cameraExtension.material = material;
    cameraExtension.visible = urlParams.get("roadExtension") !== "off";
    cameraExtension.userData.environmentMaterial = "ambientCG Road012A / 2K — presentation camera extension";
  }

  for (const surface of arrivalPresentationRoadSurfaces) {
    const material = new THREE.MeshPhysicalMaterial({
      map: cloneTiledTexture(colorMap, surface.length / 12, surface.width / 12, THREE.SRGBColorSpace),
      normalMap: cloneTiledTexture(normalMap, surface.length / 12, surface.width / 12),
      roughnessMap: cloneTiledTexture(roughnessMap, surface.length / 12, surface.width / 12),
      color: 0x303a38,
      roughness: 0.7,
      metalness: 0.025,
      clearcoat: 0.42,
      clearcoatRoughness: 0.24,
      reflectivity: 0.56,
    });
    material.normalScale.set(0.94, 0.94);
    material.userData = { sourceAsset: "asset_ambientcg_road012a_2k", semanticSurface: "presentation_arrival_road" };
    surface.mesh.material = material;
    surface.mesh.userData.environmentMaterial = "ambientCG Road012A / 2K — presentation arrival road";
  }
  addArrivalAsphaltMacroOverlays();
}

function applyCombatCoverMaterials(factoryColor: THREE.Texture, factoryNormal: THREE.Texture, factoryRoughness: THREE.Texture, roadColor: THREE.Texture, roadNormal: THREE.Texture, roadRoughness: THREE.Texture) {
  for (const record of environmentDetails.filter((candidate) => candidate.kind === "COMBAT_COVER")) {
    const group = objectById.get(record.id);
    if (!(group instanceof THREE.Group)) continue;
    group.traverse((child) => {
      if (!(child instanceof THREE.Mesh)) return;
      const surface = child.userData.coverSurface as "body" | "steel" | "warning" | undefined;
      if (!surface || surface === "warning") return;
      const isBody = surface === "body";
      const colorMap = isBody ? factoryColor : roadColor;
      const normalMap = isBody ? factoryNormal : roadNormal;
      const roughnessMap = isBody ? factoryRoughness : roadRoughness;
      const material = new THREE.MeshStandardMaterial({
        map: cloneTiledTexture(colorMap, Math.max(1, record.size.x / 7), Math.max(1, record.size.y / 2.2), THREE.SRGBColorSpace),
        normalMap: cloneTiledTexture(normalMap, Math.max(1, record.size.x / 7), Math.max(1, record.size.y / 2.2)),
        roughnessMap: cloneTiledTexture(roughnessMap, Math.max(1, record.size.x / 7), Math.max(1, record.size.y / 2.2)),
        color: isBody ? 0x858b87 : 0x566260,
        roughness: isBody ? 0.9 : 0.7,
        metalness: isBody ? 0.16 : 0.5,
      });
      material.normalScale.set(isBody ? 0.34 : 0.24, isBody ? 0.34 : 0.24);
      material.userData = { sourceAsset: isBody ? "asset_polyhaven_factory_wall_2k" : "asset_ambientcg_road012a_2k", semanticSurface: record.id, coverSurface: surface };
      child.material = material;
      child.userData.environmentMaterial = isBody ? "Poly Haven Factory Wall / 2K — cover body" : "ambientCG Road012A / 2K — cover steel treatment";
    });
  }
}

function applyApprovedDenseFacadePbr(colorMap: THREE.Texture, normalMap: THREE.Texture, roughnessMap: THREE.Texture) {
  const root = scene.getObjectByName("approved_dense_visual_facade_depth");
  if (!(root instanceof THREE.Group)) return;
  for (const texture of [colorMap, normalMap, roughnessMap]) {
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(5.5, 3.2);
  }
  const sharedMaterial = new THREE.MeshStandardMaterial({
    map: colorMap,
    normalMap,
    roughnessMap,
    color: 0x87918b,
    roughness: 0.88,
    metalness: 0.24,
  });
  sharedMaterial.normalScale.set(0.42, 0.42);
  sharedMaterial.userData = { sourceAsset: "asset_polyhaven_factory_wall_2k", facadeTreatment: "APPROVED_DENSE_BLOCKOUT_SHARED" };
  root.traverse((object) => {
    if (!(object instanceof THREE.Mesh) || object.userData.visualDetail !== "approved-dense-volumetric-wall") return;
    object.material = sharedMaterial;
    object.userData.environmentMaterial = "Poly Haven Factory Wall / 2K — shared approved dense facade";
  });
}

function applyFacadeMaterial(colorMap: THREE.Texture, normalMap: THREE.Texture, roughnessMap: THREE.Texture) {
  const treatments: Record<string, { color: number; roughness: number; metalness: number; normal: number }> = {
    GATEHOUSE: { color: 0x9a8470, roughness: 0.88, metalness: 0.18, normal: 0.46 },
    SERVICE: { color: 0x7e8a84, roughness: 0.86, metalness: 0.24, normal: 0.5 },
    WAREHOUSE: { color: 0x8f928c, roughness: 0.9, metalness: 0.2, normal: 0.54 },
    WORKSHOP: { color: 0x7d7069, roughness: 0.88, metalness: 0.2, normal: 0.5 },
    PLANT: { color: 0x687873, roughness: 0.82, metalness: 0.3, normal: 0.58 },
    SECURITY: { color: 0x64727a, roughness: 0.76, metalness: 0.34, normal: 0.54 },
    CORE: { color: 0x5b6565, roughness: 0.8, metalness: 0.3, normal: 0.56 },
  };
  for (const surfaceId of environmentKit.materialBindings.find((binding) => binding.material === "asset_polyhaven_factory_wall_2k")?.surfaces ?? []) {
    const mesh = objectById.get(surfaceId);
    const mass = buildingMasses.find((candidate) => candidate.id === surfaceId);
    if (!(mesh instanceof THREE.Mesh) || !mass) continue;
    const treatment = treatments[mass.kind] ?? treatments.SERVICE;
    const material = new THREE.MeshStandardMaterial({
      map: cloneTiledTexture(colorMap, mass.size.x / 14, mass.height / 4.5, THREE.SRGBColorSpace),
      normalMap: cloneTiledTexture(normalMap, mass.size.x / 14, mass.height / 4.5),
      roughnessMap: cloneTiledTexture(roughnessMap, mass.size.x / 14, mass.height / 4.5),
      color: treatment.color,
      roughness: treatment.roughness,
      metalness: treatment.metalness,
    });
    material.normalScale.set(treatment.normal, treatment.normal);
    material.userData = { sourceAsset: "asset_polyhaven_factory_wall_2k", semanticSurface: surfaceId, facadeTreatment: mass.kind };
    mesh.material = material;
    mesh.userData.environmentMaterial = `Poly Haven Factory Wall / 2K — ${mass.kind.toLowerCase()} treatment`;
  }
}

let arrivalFacadeWeatherTexture: THREE.CanvasTexture | null = null;

function getArrivalFacadeWeatherTexture() {
  if (arrivalFacadeWeatherTexture) return arrivalFacadeWeatherTexture;
  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = 512;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Unable to create arrival facade weather texture");
  context.clearRect(0, 0, canvas.width, canvas.height);
  let seed = 3817;
  const random = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  context.lineCap = "round";
  for (let index = 0; index < 22; index += 1) {
    const x = 18 + random() * (canvas.width - 36);
    const startY = random() * 80;
    const length = 90 + random() * 300;
    const width = 2 + random() * 7;
    const gradient = context.createLinearGradient(x, startY, x, startY + length);
    gradient.addColorStop(0, "rgba(24, 29, 28, 0.28)");
    gradient.addColorStop(0.18, "rgba(34, 37, 34, 0.17)");
    gradient.addColorStop(1, "rgba(34, 37, 34, 0)");
    context.globalAlpha = 0.5 + random() * 0.5;
    context.strokeStyle = gradient;
    context.lineWidth = width;
    context.beginPath();
    context.moveTo(x, startY);
    context.bezierCurveTo(x - 6, startY + length * 0.32, x + 5, startY + length * 0.62, x + (random() - 0.5) * 10, startY + length);
    context.stroke();
  }
  for (const y of [168, 338, 456]) {
    context.globalAlpha = 0.16;
    context.strokeStyle = "#161e1e";
    context.lineWidth = 5;
    context.beginPath();
    context.moveTo(0, y + (random() - 0.5) * 4);
    context.lineTo(canvas.width, y + (random() - 0.5) * 4);
    context.stroke();
  }
  for (let index = 0; index < 26; index += 1) {
    const x = random() * canvas.width;
    const y = 394 + random() * 104;
    const radius = 16 + random() * 54;
    const grime = context.createRadialGradient(x, y, 2, x, y, radius);
    grime.addColorStop(0, "rgba(22, 27, 26, 0.24)");
    grime.addColorStop(1, "rgba(22, 27, 26, 0)");
    context.globalAlpha = 0.7;
    context.fillStyle = grime;
    context.fillRect(x - radius, y - radius, radius * 2, radius * 2);
  }
  arrivalFacadeWeatherTexture = new THREE.CanvasTexture(canvas);
  arrivalFacadeWeatherTexture.colorSpace = THREE.SRGBColorSpace;
  arrivalFacadeWeatherTexture.needsUpdate = true;
  return arrivalFacadeWeatherTexture;
}

function addArrivalFacadeWeatherOverlay(child: THREE.Mesh, dimensions: { x: number; y: number; z: number }) {
  if (child.userData.arrivalWeatherApplied === true || !child.parent) return;
  const weather = new THREE.Mesh(new THREE.PlaneGeometry(dimensions.x, dimensions.y), new THREE.MeshBasicMaterial({
    map: getArrivalFacadeWeatherTexture(),
    transparent: true,
    opacity: 0.42,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -2,
    polygonOffsetUnits: -2,
  }));
  weather.name = `${child.name || "arrival_facade"}_weather_overlay`;
  weather.position.set(child.position.x, child.position.y, child.position.z + dimensions.z / 2 + 0.018);
  weather.rotation.copy(child.rotation);
  weather.userData.visualLayer = "street-canyon-facade-weather";
  weather.userData.environmentMaterial = "procedural facade grime, seam, and rain-streak overlay";
  child.parent.add(weather);

  const waterlineMaterial = new THREE.MeshStandardMaterial({
    color: 0x263233,
    roughness: 0.9,
    metalness: 0.18,
    transparent: true,
    opacity: 0.62,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -3,
    polygonOffsetUnits: -3,
  });
  const waterline = new THREE.Mesh(new THREE.BoxGeometry(dimensions.x * 0.96, 0.24, 0.16), waterlineMaterial);
  waterline.name = `${child.name || "arrival_facade"}_stained_service_course`;
  waterline.position.set(child.position.x, 1.72, child.position.z + dimensions.z / 2 + 0.11);
  waterline.receiveShadow = true;
  waterline.userData.visualLayer = "street-canyon-facade-weather";
  waterline.userData.environmentMaterial = "presentation stained concrete service course";
  child.parent.add(waterline);

  if (dimensions.y > 8) {
    const upperBandMaterial = new THREE.MeshStandardMaterial({
      color: 0x46504e,
      roughness: 0.84,
      metalness: 0.28,
      transparent: true,
      opacity: 0.34,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -3,
      polygonOffsetUnits: -3,
    });
    const upperBand = new THREE.Mesh(new THREE.BoxGeometry(dimensions.x * 0.94, 0.16, 0.12), upperBandMaterial);
    upperBand.name = `${child.name || "arrival_facade"}_upper_service_band`;
    upperBand.position.set(child.position.x, Math.min(dimensions.y - 1.2, 6.4), child.position.z + dimensions.z / 2 + 0.1);
    upperBand.userData.visualLayer = "street-canyon-facade-weather";
    upperBand.userData.environmentMaterial = "presentation facade maintenance band";
    child.parent.add(upperBand);
  }

  if (dimensions.x > 10) {
    const facadeLayer = new THREE.Group();
    facadeLayer.name = `${child.name || "arrival_facade"}_panel_history`;
    facadeLayer.position.copy(child.position);
    facadeLayer.rotation.copy(child.rotation);
    facadeLayer.userData.visualLayer = "street-canyon-facade-panel-history";
    const seamMaterial = new THREE.MeshStandardMaterial({ color: 0x1d2829, roughness: 0.92, metalness: 0.16, transparent: true, opacity: 0.28, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4 });
    const seamCount = Math.max(3, Math.min(9, Math.round(dimensions.x / 4.4)));
    for (let index = 1; index < seamCount; index += 1) {
      const x = -dimensions.x / 2 + (dimensions.x * index) / seamCount;
      const seam = new THREE.Mesh(new THREE.BoxGeometry(0.045, dimensions.y * 0.78, 0.035), seamMaterial);
      seam.position.set(x, dimensions.y * 0.52, dimensions.z / 2 + 0.045);
      seam.userData.visualLayer = "facade-panel-seam";
      facadeLayer.add(seam);
    }
    const rustMaterial = new THREE.MeshStandardMaterial({ color: 0x7f4d39, roughness: 0.88, metalness: 0.08, transparent: true, opacity: 0.34, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -5, polygonOffsetUnits: -5 });
    const rustPositions = [-0.34, 0.08, 0.31];
    rustPositions.forEach((xRatio, index) => {
      const streak = new THREE.Mesh(new THREE.BoxGeometry(0.14 + index * 0.035, 1.25 + index * 0.22, 0.03), rustMaterial);
      streak.position.set(dimensions.x * xRatio, Math.min(dimensions.y - 1.4, 4.25) - index * 0.45, dimensions.z / 2 + 0.052);
      streak.rotation.z = (index - 1) * 0.035;
      streak.userData.visualLayer = "facade-rust-streak";
      facadeLayer.add(streak);
    });
    child.parent.add(facadeLayer);
  }
  child.userData.arrivalWeatherApplied = true;
}

function applyArrivalServiceSliceRebuildMaterials(factoryColor: THREE.Texture, factoryNormal: THREE.Texture, factoryRoughness: THREE.Texture, roadColor: THREE.Texture, roadNormal: THREE.Texture, roadRoughness: THREE.Texture) {
  const root = scene.getObjectByName("arrival_service_slice_rebuild");
  if (!root) return;
  root.traverse((child) => {
    if (!(child instanceof THREE.Mesh) || !(child.material instanceof THREE.MeshStandardMaterial)) return;
    const isRoad = /road|sidewalk|curb|drain|lane_mark|hardstand|yard/i.test(child.name);
    const [colorMap, normalMap, roughnessMap] = isRoad ? [roadColor, roadNormal, roadRoughness] : [factoryColor, factoryNormal, factoryRoughness];
    const repeat = isRoad ? (child.name.includes("lane_mark") ? [1.0, 1.0] : [3.4, 1.6]) : [2.2, 2.0];
    child.material.map = cloneTiledTexture(colorMap, repeat[0], repeat[1], THREE.SRGBColorSpace);
    child.material.normalMap = cloneTiledTexture(normalMap, repeat[0], repeat[1]);
    child.material.roughnessMap = cloneTiledTexture(roughnessMap, repeat[0], repeat[1]);
    child.material.normalScale.set(isRoad ? 0.42 : 0.5, isRoad ? 0.42 : 0.5);
    child.material.roughness = isRoad ? 0.84 : 0.82;
    child.material.needsUpdate = true;
    child.userData.environmentMaterial = isRoad ? "ambientCG Road012A / 2K — arrival slice segmented route" : "Poly Haven Factory Wall / 2K — arrival slice volumetric industrial family";
  });
}

function applyArrivalCanyonFacadeMaterial(colorMap: THREE.Texture, normalMap: THREE.Texture, roughnessMap: THREE.Texture) {
  const root = scene.getObjectByName("density_arrival_canyon_composition");
  if (!root) return;
  const facadeMaterialMode = urlParams.get("facadeMaterial");
  const structuredFacadeCandidate = facadeMaterialMode !== "plain";
  const usePhysicalFacade = facadeMaterialMode !== "structured" && facadeMaterialMode !== "plain";
  root.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) return;
    const isShell = child.userData.streetFacadeShell === true;
    const isPanel = child.userData.arrivalFacadePanel === true;
    if (!isShell && !isPanel) return;
    const dimensions = child.userData.streetFacadeDimensions as { x: number; y: number; z: number } | undefined;
    if (!dimensions) return;
    const horizontalTiling = isPanel ? Math.max(0.8, dimensions.x / 3.8) : dimensions.x / 7.5;
    const verticalTiling = isPanel ? Math.max(0.65, dimensions.y / 2.5) : dimensions.y / 4.2;
    const tint = child.userData.arrivalFacadeTint as number | undefined ?? (child.name.includes("left_setback") ? 0x6e6856 : child.name.includes("right") ? 0x58767a : 0x4b4541);
    const materialOptions = {
      map: cloneTiledTexture(colorMap, horizontalTiling, verticalTiling, THREE.SRGBColorSpace),
      normalMap: cloneTiledTexture(normalMap, horizontalTiling, verticalTiling),
      roughnessMap: cloneTiledTexture(roughnessMap, horizontalTiling, verticalTiling),
      color: tint,
      roughness: structuredFacadeCandidate ? (isPanel ? 0.82 : 0.76) : isPanel ? 0.92 : 0.9,
      metalness: structuredFacadeCandidate ? (isPanel ? 0.24 : 0.28) : isPanel ? 0.18 : 0.2,
    };
    const material = structuredFacadeCandidate && usePhysicalFacade
      ? new THREE.MeshPhysicalMaterial({ ...materialOptions, clearcoat: 0.16, clearcoatRoughness: 0.42, reflectivity: 0.56 })
      : new THREE.MeshStandardMaterial(materialOptions);
    const facadeNormalScale = structuredFacadeCandidate
      ? (isPanel ? 0.9 : child.name.includes("left_setback") ? 1.0 : 0.88)
      : (isPanel ? 0.52 : child.name.includes("left_setback") ? 0.82 : 0.68);
    material.normalScale.set(facadeNormalScale, facadeNormalScale);
    material.userData = { sourceAsset: "asset_polyhaven_factory_wall_2k", semanticSurface: child.name || "arrival facade panel", facadeTreatment: "ARRIVAL_STREET_CANYON" };
    child.material = material;
    child.userData.environmentMaterial = "Poly Haven Factory Wall / 2K — arrival street canyon";
    if (isShell) addArrivalFacadeWeatherOverlay(child, dimensions);
  });
  const serviceTrailer = root.getObjectByName("density_arrival_right_apron_service_trailer");
  serviceTrailer?.traverse((child) => {
    if (!(child instanceof THREE.Mesh) || !child.name.includes("service_trailer_side_panel")) return;
    const material = new THREE.MeshStandardMaterial({
      map: cloneTiledTexture(colorMap, 3.6, 1.3, THREE.SRGBColorSpace),
      normalMap: cloneTiledTexture(normalMap, 3.6, 1.3),
      roughnessMap: cloneTiledTexture(roughnessMap, 3.6, 1.3),
      color: 0x718783,
      roughness: 0.7,
      metalness: 0.28,
    });
    material.normalScale.set(0.62, 0.62);
    material.userData = { sourceAsset: "asset_polyhaven_factory_wall_2k", semanticSurface: child.name, facadeTreatment: "ARRIVAL_SERVICE_TRAILER" };
    child.material = material;
    child.userData.environmentMaterial = "Poly Haven Factory Wall / 2K — service trailer corrugated treatment";
  });
}

function applyArrivalResetFacadeMaterial(colorMap: THREE.Texture, normalMap: THREE.Texture, roughnessMap: THREE.Texture) {
  const rootNames = [
    "density_arrival_right_frontage_visual_reset",
    "density_arrival_right_setback_visual_reset_annex",
    "density_arrival_left_setback_visual_reset",
  ];
  const surfacePrefixes = [
    "arrival_reset_frontage_deep_service_wall",
    "arrival_reset_frontage_cladding_panel_",
    "arrival_reset_frontage_camera_end_wall",
    "arrival_reset_frontage_camera_end_lower_recess",
    "arrival_reset_annex_deep_service_wall",
    "arrival_reset_annex_lower_course",
    "arrival_reset_annex_louver_backing_",
    "arrival_reset_annex_camera_end_wall",
    "arrival_reset_annex_camera_end_lower_recess",
  ];
  for (const rootName of rootNames) {
    const root = scene.getObjectByName(rootName);
    if (!root) continue;
    root.traverse((child) => {
      if (!(child instanceof THREE.Mesh) || !surfacePrefixes.some((prefix) => child.name.startsWith(prefix))) return;
      const material = child.material;
      if (Array.isArray(material) || !(material instanceof THREE.MeshStandardMaterial || material instanceof THREE.MeshPhysicalMaterial)) return;
      const isPanel = child.name.includes("cladding_panel") || child.name.includes("louver_backing");
      const horizontalTiling = isPanel ? 1.8 : 4.2;
      const verticalTiling = isPanel ? 2.8 : 2.1;
      material.map = cloneTiledTexture(colorMap, horizontalTiling, verticalTiling, THREE.SRGBColorSpace);
      material.normalMap = cloneTiledTexture(normalMap, horizontalTiling, verticalTiling);
      material.roughnessMap = cloneTiledTexture(roughnessMap, horizontalTiling, verticalTiling);
      material.roughness = isPanel ? 0.78 : 0.82;
      material.metalness = isPanel ? 0.26 : 0.22;
      material.normalScale.set(isPanel ? 0.62 : 0.52, isPanel ? 0.62 : 0.52);
      const facadeTone = urlParams.get("facadeTone");
      if (facadeTone === "cool") material.color.setHex(isPanel ? 0xa7bfbc : 0x8ea8a5);
      if (facadeTone === "neutral") material.color.setHex(isPanel ? 0x8f938a : 0x6e746e);
      material.needsUpdate = true;
      child.userData.environmentMaterial = "Poly Haven Factory Wall / 2K — reset facade PBR surface";
    });
  }
}

const pressureTextureBudgeted = new WeakSet<THREE.Texture>();

function budgetPressureTexture(texture: THREE.Texture, maxDimension = 1024) {
  if (pressureTextureBudgeted.has(texture)) return;
  const image = texture.image as (CanvasImageSource & { width?: number; height?: number }) | undefined;
  const width = image?.width ?? 0;
  const height = image?.height ?? 0;
  const largest = Math.max(width, height);
  if (!image || !width || !height || largest <= maxDimension) {
    pressureTextureBudgeted.add(texture);
    return;
  }
  const scale = maxDimension / largest;
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(width * scale));
  canvas.height = Math.max(1, Math.round(height * scale));
  const context = canvas.getContext("2d");
  if (!context) return;
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  texture.image = canvas;
  texture.needsUpdate = true;
  texture.userData.pressureTextureBudget = maxDimension;
  pressureTextureBudgeted.add(texture);
}

function budgetPressureModelTextures(model: THREE.Object3D) {
  model.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) return;
    const materials = Array.isArray(child.material) ? child.material : [child.material];
    materials.forEach((material) => {
      const texturedMaterial = material as THREE.Material & {
        map?: THREE.Texture | null;
        normalMap?: THREE.Texture | null;
        roughnessMap?: THREE.Texture | null;
        metalnessMap?: THREE.Texture | null;
        aoMap?: THREE.Texture | null;
        emissiveMap?: THREE.Texture | null;
        alphaMap?: THREE.Texture | null;
      };
      for (const texture of [texturedMaterial.map, texturedMaterial.normalMap, texturedMaterial.roughnessMap, texturedMaterial.metalnessMap, texturedMaterial.aoMap, texturedMaterial.emissiveMap, texturedMaterial.alphaMap]) {
        if (texture) budgetPressureTexture(texture);
      }
    });
  });
}

function configureLoadedModel(model: THREE.Object3D) {
  model.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      // Prepared GLBs retain their authored PBR response and receive the scene shadow;
      // the surrounding procedural architecture owns the cast-shadow silhouettes.
      child.castShadow = false;
      child.receiveShadow = true;
      child.frustumCulled = true;
    }
  });
  if (pressurePlantSliceScope) budgetPressureModelTextures(model);
}

const polyhavenIndustrialPipeKitAsset = {
  id: "asset_polyhaven_modular_industrial_pipes_01_2k",
  displayName: "Poly Haven Modular Industrial Pipes 01 / 2K",
  kind: "MODEL",
  source: "https://polyhaven.com/a/modular_industrial_pipes_01",
  localPath: "/assets/models/polyhaven/modular_industrial_pipes_01/modular_industrial_pipes_01_2k.gltf",
  license: "CC0",
  role: "Sourced rusted pipe modules replace the weak procedural pipe cylinders inside the existing supported service rack.",
  runtimeNote: "2K glTF from the Poly Haven modular industrial pipe kit; 12K-triangle source asset with six 2K JPG maps and shared binary payload. Use a small cloned subset with uniform scale, visible flange/valve details, explicit rack support, frustum culling, and page-local loading.",
} satisfies AuthoringAssetRecord;

async function loadIndustrialPipeKitAsset() {
  const asset = polyhavenIndustrialPipeKitAsset;
  const gltf = await new GLTFLoader().loadAsync(asset.localPath);
  const source = gltf.scene;
  source.updateMatrixWorld(true);
  const rack = scene.getObjectByName("arrival_slice_supported_pipe_rack");
  if (!rack) throw new Error("Scoped pipe rack target is missing");
  const pipe02 = source.getObjectByName("modular_industrial_pipes_01_pipe02");
  const pipe05 = source.getObjectByName("modular_industrial_pipes_01_pipe05");
  const pipe08 = source.getObjectByName("modular_industrial_pipes_01_pipe08");
  if (!pipe02 || !pipe05 || !pipe08) throw new Error("Required Poly Haven pipe modules are missing");

  const hall = scene.getObjectByName("arrival_slice_right_service_hall");
  if (hall) {
    const riser = new THREE.Group();
    riser.name = "asset_polyhaven_factory_threshold_subset_service_riser";
    riser.position.set(2.8, 0, 6.25);
    riser.userData.presentationModule = "Poly Haven service riser terminating at the loading-bay threshold";
    riser.userData.planId = "asset_arrival_threshold_service_riser";
    riser.userData.hostId = "arrival_slice_right_service_hall";
    riser.userData.supportClass = "SUPPORTED";
    hall.add(riser);
    const plateMaterial = new THREE.MeshStandardMaterial({ color: 0x30383a, roughness: 0.84, metalness: 0.46 });
    const plate = new THREE.Mesh(new THREE.BoxGeometry(2.9, 2.8, 0.12), plateMaterial);
    plate.name = "arrival_slice_threshold_service_riser_equipment_plate";
    plate.position.set(0, 1.62, 0.12);
    plate.castShadow = fullQualityPresentation;
    plate.receiveShadow = true;
    riser.add(plate);
    const attachRiserModule = (sourceModule: THREE.Object3D, id: string, position: [number, number, number], rotation: [number, number, number]) => {
      const module = sourceModule.clone(true);
      module.name = id;
      module.position.set(...position);
      module.rotation.set(...rotation);
      module.userData.sourcedAssetId = asset.id;
      module.userData.sourcedAssetSource = asset.source;
      module.userData.presentationModule = "Poly Haven pipe module inside the hall-owned threshold service riser";
      configureLoadedModel(module);
      riser.add(module);
      assetObjects.push(module);
      selectableObjects.push(module);
      objectById.set(id, module);
    };
    attachRiserModule(pipe02, "asset_polyhaven_factory_threshold_subset_riser_straight_a", [-0.72, 1.62, 0.26], [Math.PI / 2, 0, 0]);
    attachRiserModule(pipe02, "asset_polyhaven_factory_threshold_subset_riser_straight_b", [0.72, 1.62, 0.26], [Math.PI / 2, 0, 0]);
    attachRiserModule(pipe05, "asset_polyhaven_factory_threshold_subset_riser_elbow", [0.72, 2.56, 0.26], [0, Math.PI / 2, 0]);
    attachRiserModule(pipe08, "asset_polyhaven_factory_threshold_subset_riser_valve", [-0.72, 2.56, 0.26], [0, 0, 0]);
  }

  rack.traverse((child) => {
    if (child instanceof THREE.Mesh && child.name.startsWith("arrival_slice_pipe_rack_pipe_")) child.visible = false;
  });
  const attach = (sourceModule: THREE.Object3D, id: string, position: [number, number, number], rotationY = Math.PI / 2, scale = 1) => {
    const module = sourceModule.clone(true);
    module.name = id;
    module.position.set(...position);
    module.rotation.y = rotationY;
    module.scale.setScalar(scale);
    module.userData.authoringRecord = {
      type: "asset",
      id,
      displayName: asset.displayName,
      kind: asset.kind,
      source: asset.source,
      localPath: asset.localPath,
      license: asset.license,
      role: "Sourced Poly Haven pipe module inside the existing supported service rack.",
      runtimeNote: asset.runtimeNote,
    } satisfies AuthoringAssetRecord & { type: "asset" };
    configureLoadedModel(module);
    rack.add(module);
    assetObjects.push(module);
    selectableObjects.push(module);
    objectById.set(id, module);
  };
  for (const [index, x] of [-2.0, 0, 2.0].entries()) attach(pipe02, `asset_polyhaven_pipe_rack_straight_${index}`, [x, 4.28, 0], Math.PI / 2, 1.0);
  attach(pipe05, "asset_polyhaven_pipe_rack_elbow_valve", [2.0, 4.28, 1.02], 0, 1.0);
  attach(pipe08, "asset_polyhaven_pipe_rack_flanged_valve", [-2.0, 4.28, -1.02], 0, 1.0);
  rack.userData.sourcedPipeKit = { source: asset.source, license: asset.license, model: asset.localPath, moduleCount: 5, resolution: "2K" };
}

async function loadFenceAsset() {
  const asset = environmentKit.assets.find((candidate) => candidate.id === "asset_polyhaven_chainlink_fence_1k")!;
  const gltf = await new GLTFLoader().loadAsync(asset.localPath);
  const source = gltf.scene;
  source.updateMatrixWorld(true);
  const bounds = new THREE.Box3().setFromObject(source);
  const size = bounds.getSize(new THREE.Vector3());
  const segmentWidth = Math.max(size.x, size.z);
  const scale = 8.1 / Math.max(0.01, segmentWidth);
  const fencePositions = [
    { id: "asset_fence_gatehouse", x: -398, z: 168, rotation: Math.PI / 2, description: "Real chain-link kit at the player-facing perimeter arrival." },
    { id: "asset_fence_perimeter_kill_zone", x: -398, z: 34, rotation: Math.PI / 2, description: "Closed-off perimeter deployment cue beside the concealed kill zone." },
    { id: "asset_fence_arrival_apron", x: -338, z: 211, rotation: 0.56, description: "Presentation-only chain-link boundary separating the right loading apron from the arrival road." },
  ];
  for (const placement of fencePositions) {
    const instance = source.clone(true);
    instance.name = placement.id;
    instance.scale.setScalar(scale);
    instance.position.set(placement.x, 0, placement.z);
    instance.rotation.y = placement.rotation;
    instance.userData.authoringRecord = {
      type: "asset",
      id: placement.id,
      displayName: asset.displayName,
      kind: asset.kind,
      source: asset.source,
      localPath: asset.localPath,
      license: asset.license,
      role: placement.description,
      runtimeNote: asset.runtimeNote,
    } satisfies AuthoringAssetRecord & { type: "asset" };
    configureLoadedModel(instance);
    assetObjects.push(instance);
    selectableObjects.push(instance);
    objectById.set(placement.id, instance);
    scene.add(instance);
  }
}

async function loadPortableGeneratorAsset() {
  const asset = environmentKit.assets.find((candidate) => candidate.id === "asset_polyhaven_portable_generator_1k")!;
  const gltf = await new GLTFLoader().loadAsync(asset.localPath);
  const source = gltf.scene;
  source.updateMatrixWorld(true);
  const bounds = new THREE.Box3().setFromObject(source);
  const size = bounds.getSize(new THREE.Vector3());
  const scale = 1.15 / Math.max(0.01, Math.max(size.x, size.z));
  const instance = source.clone(true);
  instance.name = "asset_portable_generator_service_yard";
  instance.scale.setScalar(scale);
  instance.position.set(-232, 0, 94);
  instance.rotation.y = Math.PI * 0.12;
  instance.userData.authoringRecord = {
    type: "asset",
    id: "asset_portable_generator_service_yard",
    displayName: asset.displayName,
    kind: asset.kind,
    source: asset.source,
    localPath: asset.localPath,
    license: asset.license,
    role: "Single service-yard hero prop beside the utility cabinet; establishes portable power and maintenance activity without becoming cover truth.",
    runtimeNote: asset.runtimeNote,
  } satisfies AuthoringAssetRecord & { type: "asset" };
  configureLoadedModel(instance);
  assetObjects.push(instance);
  selectableObjects.push(instance);
  objectById.set("asset_portable_generator_service_yard", instance);
  scene.add(instance);

  const arrivalInstance = source.clone(true);
  arrivalInstance.name = "asset_portable_generator_arrival_loading";
  arrivalInstance.scale.setScalar(scale * 1.08);
  arrivalInstance.position.set(-343, 0, 223.5);
  arrivalInstance.rotation.y = -Math.PI * 0.2;
  arrivalInstance.userData.authoringRecord = {
    type: "asset",
    id: "asset_portable_generator_arrival_loading",
    displayName: asset.displayName,
    kind: asset.kind,
    source: asset.source,
    localPath: asset.localPath,
    license: asset.license,
    role: "Second presentation-only generator beside the arrival apron lorry, grounding the service frontage with a real maintenance prop.",
    runtimeNote: asset.runtimeNote,
  } satisfies AuthoringAssetRecord & { type: "asset" };
  configureLoadedModel(arrivalInstance);
  assetObjects.push(arrivalInstance);
  selectableObjects.push(arrivalInstance);
  objectById.set("asset_portable_generator_arrival_loading", arrivalInstance);
  scene.add(arrivalInstance);
}

async function loadKenneyArrivalVehicleAsset() {
  const asset = environmentKit.assets.find((candidate) => candidate.id === "asset_kenney_van_cc0")!;
  const vanCandidate = urlParams.get("vanCandidate");
  const useAuthoredMainVan = vanCandidate !== "kenney" && vanCandidate !== "prepared";
  const candidatePath = vanCandidate === "prepared" ? "/assets/models/kenney/car_kit/candidates/van_prepared.glb" : asset.localPath;
  const gltf = await new GLTFLoader().loadAsync(candidatePath);
  const source = gltf.scene;
  source.updateMatrixWorld(true);
  const sourceBounds = new THREE.Box3().setFromObject(source);
  const sourceSize = sourceBounds.getSize(new THREE.Vector3());
  // Keep the sourced van as a readable human-scale arrival anchor without letting
  // its stylized cargo silhouette fill the locked frame.
  const scale = 3.35 / Math.max(0.01, Math.max(sourceSize.x, sourceSize.z));
  const instance = source.clone(true);
  instance.name = "asset_kenney_arrival_service_van";
  instance.scale.setScalar(scale);
  instance.updateMatrixWorld(true);
  const scaledBounds = new THREE.Box3().setFromObject(instance);
  instance.position.set(-388.5, -scaledBounds.min.y, 216.5);
  instance.rotation.y = -0.42;
  instance.userData.authoringRecord = {
    type: "asset",
    id: "asset_kenney_arrival_service_van",
    displayName: asset.displayName,
    kind: asset.kind,
    source: asset.source,
    localPath: asset.localPath,
    license: asset.license,
    role: asset.role,
    runtimeNote: asset.runtimeNote,
  } satisfies AuthoringAssetRecord & { type: "asset" };
  const tyreMaterial = new THREE.MeshStandardMaterial({ color: 0x111617, roughness: 0.96, metalness: 0.01 });
  const bodyMaterial = new THREE.MeshPhysicalMaterial({ color: 0x667472, roughness: 0.54, metalness: 0.18, clearcoat: 0.26, clearcoatRoughness: 0.24, reflectivity: 0.58 });
  const windowMaterial = new THREE.MeshPhysicalMaterial({ color: 0x142528, roughness: 0.16, metalness: 0.18, clearcoat: 0.7, clearcoatRoughness: 0.12, reflectivity: 0.82 });
  const trimMaterial = new THREE.MeshStandardMaterial({ color: 0x202a2b, roughness: 0.72, metalness: 0.42 });
  const lampMaterial = new THREE.MeshStandardMaterial({ color: 0xffc777, emissive: 0xf06d34, emissiveIntensity: 1.35, roughness: 0.26, metalness: 0.08 });
  const tailMaterial = new THREE.MeshStandardMaterial({ color: 0x7b2721, emissive: 0x3c0907, emissiveIntensity: 0.6, roughness: 0.34, metalness: 0.08 });
  instance.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) return;
    child.castShadow = true;
    child.receiveShadow = true;
    const childName = child.name.toLowerCase();
    if (childName.includes("wheel")) {
      child.material = tyreMaterial;
      return;
    }
    const sourceMaterial = Array.isArray(child.material) ? child.material[0] : child.material;
    const preservedMaterial = sourceMaterial?.clone?.() ?? bodyMaterial.clone();
    if (preservedMaterial instanceof THREE.MeshStandardMaterial || preservedMaterial instanceof THREE.MeshPhysicalMaterial) {
      preservedMaterial.roughness = Math.min(preservedMaterial.roughness, 0.56);
      preservedMaterial.metalness = Math.min(Math.max(preservedMaterial.metalness, 0.08), 0.34);
      preservedMaterial.envMapIntensity = 0.9;
    }
    child.material = preservedMaterial;
  });
  const addVehicleDetail = (name: string, geometry: THREE.BufferGeometry, material: THREE.Material, position: [number, number, number], rotation: [number, number, number] = [0, 0, 0]) => {
    const detail = new THREE.Mesh(geometry, material);
    detail.name = name;
    detail.position.set(...position);
    detail.rotation.set(...rotation);
    detail.castShadow = true;
    detail.receiveShadow = true;
    detail.userData.visualLayer = "sourced-vehicle-detail";
    instance.add(detail);
  };
  addVehicleDetail("arrival_van_windshield", new THREE.BoxGeometry(1.12, 0.46, 0.035), windowMaterial, [0, 0.78, 1.31], [0.12, 0, 0]);
  for (const side of [-1, 1]) {
    addVehicleDetail(`arrival_van_side_window_${side < 0 ? "left" : "right"}`, new THREE.BoxGeometry(0.035, 0.44, 0.92), windowMaterial, [side * 0.77, 0.77, 0.42], [0, 0, 0]);
    addVehicleDetail(`arrival_van_side_mirror_${side < 0 ? "left" : "right"}`, new THREE.BoxGeometry(0.08, 0.11, 0.18), trimMaterial, [side * 0.86, 0.79, 0.98], [0, 0, 0]);
    addVehicleDetail(`arrival_van_headlamp_${side < 0 ? "left" : "right"}`, new THREE.BoxGeometry(0.2, 0.13, 0.04), lampMaterial, [side * 0.4, 0.48, 1.34], [0, 0, 0]);
    addVehicleDetail(`arrival_van_tail_lamp_${side < 0 ? "left" : "right"}`, new THREE.BoxGeometry(0.16, 0.18, 0.04), tailMaterial, [side * 0.48, 0.55, -1.43], [0, 0, 0]);
    addVehicleDetail(`arrival_van_wheel_hub_${side < 0 ? "left" : "right"}_front`, new THREE.CylinderGeometry(0.12, 0.12, 0.07, 16), trimMaterial, [side * 0.43, 0.3, 0.76], [0, 0, Math.PI / 2]);
    addVehicleDetail(`arrival_van_wheel_hub_${side < 0 ? "left" : "right"}_rear`, new THREE.CylinderGeometry(0.12, 0.12, 0.07, 16), trimMaterial, [side * 0.43, 0.3, -0.76], [0, 0, Math.PI / 2]);
  }
  addVehicleDetail("arrival_van_front_grille", new THREE.BoxGeometry(0.58, 0.16, 0.045), trimMaterial, [0, 0.36, 1.34]);
  addVehicleDetail("arrival_van_front_bumper", new THREE.BoxGeometry(1.35, 0.1, 0.12), trimMaterial, [0, 0.25, 1.3]);
  for (const side of [-1, 1]) {
    for (const axleZ of [-0.82, 0.82]) {
      addVehicleDetail(`arrival_van_tire_${side < 0 ? "left" : "right"}_${axleZ < 0 ? "rear" : "front"}`, new THREE.CylinderGeometry(0.27, 0.27, 0.14, 14), tyreMaterial, [side * 0.76, 0.32, axleZ], [0, 0, Math.PI / 2]);
      addVehicleDetail(`arrival_van_fender_ring_${side < 0 ? "left" : "right"}_${axleZ < 0 ? "rear" : "front"}`, new THREE.TorusGeometry(0.29, 0.036, 8, 16), trimMaterial, [side * 0.82, 0.32, axleZ], [0, Math.PI / 2, 0]);
    }
  }
  const addArrivalVanHeadlights = (vehicle: THREE.Object3D, prefix: string) => {
    for (const side of [-1, 1]) {
      const target = new THREE.Object3D();
      target.name = `${prefix}_headlight_target_${side < 0 ? "left" : "right"}`;
      target.position.set(side * 0.42, 0.06, 5.8);
      vehicle.add(target);
      const headlight = new THREE.SpotLight(0xffd6a0, 5.5, 15, 0.42, 0.62, 2);
      headlight.name = `${prefix}_headlight_spot_${side < 0 ? "left" : "right"}`;
      headlight.position.set(side * 0.4, 0.5, 1.4);
      headlight.target = target;
      headlight.castShadow = false;
      headlight.userData.visualLayer = "sourced-vehicle-light";
      vehicle.add(headlight);
      const glow = new THREE.Mesh(new THREE.SphereGeometry(0.09, 10, 8), lampMaterial);
      glow.name = `${prefix}_headlight_glow_${side < 0 ? "left" : "right"}`;
      glow.position.set(side * 0.4, 0.48, 1.37);
      glow.userData.visualLayer = "sourced-vehicle-light";
      vehicle.add(glow);
    }
    const pool = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: getArrivalHeadlightPoolTexture(), color: 0xffa05c, transparent: true, opacity: 0.24, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }));
    pool.name = `${prefix}_headlight_pool`;
    pool.rotation.x = -Math.PI / 2;
    pool.position.set(0, 0.86, 3.9);
    pool.scale.set(2.6, 5.4, 1);
    pool.renderOrder = 5;
    pool.userData.visualLayer = "sourced-vehicle-light";
    vehicle.add(pool);
  };
  addVehicleDetail("arrival_van_rear_door_seam", new THREE.BoxGeometry(1.18, 0.82, 0.026), trimMaterial, [0, 0.67, -1.38]);
  const vehicleLiveryMaterial = new THREE.MeshStandardMaterial({ color: 0xb17448, roughness: 0.76, metalness: 0.18, emissive: 0x1b0d07, emissiveIntensity: 0.12 });
  for (const side of [-1, 1]) {
    addVehicleDetail(`arrival_van_lower_livery_${side < 0 ? "left" : "right"}`, new THREE.BoxGeometry(0.04, 0.14, 1.9), vehicleLiveryMaterial, [side * 0.805, 0.56, 0]);
  }
  addVehicleDetail("arrival_van_front_lower_valance", new THREE.BoxGeometry(1.22, 0.16, 0.05), trimMaterial, [0, 0.43, 1.36]);
  addVehicleDetail("arrival_van_front_hood_break", new THREE.BoxGeometry(1.16, 0.06, 0.62), bodyMaterial, [0, 0.68, 0.98]);
  const roofRackMaterial = new THREE.MeshStandardMaterial({ color: 0x202a2b, roughness: 0.72, metalness: 0.58 });
  for (const x of [-0.5, 0.5]) {
    addVehicleDetail(`arrival_van_roof_rack_rail_${x < 0 ? "left" : "right"}`, new THREE.BoxGeometry(0.08, 0.08, 1.55), roofRackMaterial, [x, 1.22, 0]);
    for (const z of [-0.68, 0.68]) {
      addVehicleDetail(`arrival_van_roof_rack_support_${x < 0 ? "left" : "right"}_${z < 0 ? "rear" : "front"}`, new THREE.BoxGeometry(0.08, 0.18, 0.08), roofRackMaterial, [x, 1.13, z]);
    }
  }
  for (const z of [-0.68, 0.68]) {
    addVehicleDetail(`arrival_van_roof_rack_crossbar_${z < 0 ? "rear" : "front"}`, new THREE.BoxGeometry(1.08, 0.08, 0.08), roofRackMaterial, [0, 1.22, z]);
  }
  configureLoadedModel(instance);
  const proceduralFallback = scene.getObjectByName("density_arrival_maintenance_van");
  instance.visible = !useAuthoredMainVan;
  instance.scale.setScalar(scale * 0.86);
  instance.position.x += 1.8;
  instance.position.z -= 2.4;
  if (proceduralFallback) {
    proceduralFallback.visible = false;
    proceduralFallback.userData.forceHidden = true;
  }
  if (!useAuthoredMainVan) assetObjects.push(instance);
  selectableObjects.push(instance);
  objectById.set(instance.name, instance);
  scene.add(instance);

  if (useAuthoredMainVan) {
    const authoredVan = new THREE.Group();
    authoredVan.name = "density_arrival_authored_maintenance_van";
    authoredVan.position.copy(instance.position);
    authoredVan.rotation.y = instance.rotation.y;
    authoredVan.userData.visualLayer = "authored-vehicle-detail";
    authoredVan.userData.presentationModule = "authored primary maintenance van default";
    authoredVan.userData.authoringRecord = {
      type: "detail",
      id: "density_arrival_authored_maintenance_van",
      displayName: "Authored Primary Maintenance Van",
      role: "Presentation-only replacement for the camera-dominant arrival service van; retains the sourced Kenney raw and prepared controls without changing traffic placement or gameplay truth.",
      runtimeNote: "Rounded procedural industrial van with beveled body shells, glazing, panel seams, safety livery, rack, refined front fascia, service hardware, lamps, and contact shadow; removable from the authoring presentation layer.",
    };
    const vanBodyMaterial = new THREE.MeshPhysicalMaterial({ color: 0x3f5858, roughness: 0.43, metalness: 0.24, clearcoat: 0.38, clearcoatRoughness: 0.18, reflectivity: 0.68 });
    const vanPanelMaterial = new THREE.MeshStandardMaterial({ color: 0x627672, roughness: 0.57, metalness: 0.22 });
    const vanTrimMaterial = new THREE.MeshStandardMaterial({ color: 0x1d282a, roughness: 0.7, metalness: 0.54 });
    const vanGlassMaterial = new THREE.MeshPhysicalMaterial({ color: 0x102a30, roughness: 0.12, metalness: 0.16, clearcoat: 0.82, clearcoatRoughness: 0.09, reflectivity: 0.9 });
    const vanTyreMaterial = new THREE.MeshStandardMaterial({ color: 0x101617, roughness: 0.95, metalness: 0.015 });
    const vanLampMaterial = new THREE.MeshStandardMaterial({ color: 0xffc777, roughness: 0.24, metalness: 0.06, emissive: 0xf16931, emissiveIntensity: 1.28 });
    const vanTailMaterial = new THREE.MeshStandardMaterial({ color: 0x762a25, roughness: 0.34, metalness: 0.08, emissive: 0x360806, emissiveIntensity: 0.52 });
    const vanSafetyMaterial = new THREE.MeshStandardMaterial({ color: 0xb46e43, roughness: 0.68, metalness: 0.14, emissive: 0x261007, emissiveIntensity: 0.08 });
    const addVanPart = (name: string, geometry: THREE.BufferGeometry, material: THREE.Material, position: [number, number, number], rotation: [number, number, number] = [0, 0, 0]) => {
      const part = new THREE.Mesh(geometry, material);
      part.name = name;
      part.position.set(...position);
      part.rotation.set(...rotation);
      part.castShadow = true;
      part.receiveShadow = true;
      part.userData.visualLayer = "authored-vehicle-detail";
      authoredVan.add(part);
      return part;
    };
    addVanPart("authored_van_lower_body", new RoundedBoxGeometry(1.94, 0.95, 3.38, 10, 0.18), vanBodyMaterial, [0, 0.87, 0]);
    addVanPart("authored_van_front_cowl", new RoundedBoxGeometry(1.88, 0.52, 0.82, 10, 0.14), vanBodyMaterial, [0, 1.18, 1.42]);
    addVanPart("authored_van_cab_shell", new RoundedBoxGeometry(1.88, 1.28, 1.78, 10, 0.2), vanPanelMaterial, [0, 1.45, 0.58]);
    addVanPart("authored_van_rear_cargo_shell", new RoundedBoxGeometry(1.9, 1.32, 1.55, 10, 0.18), vanBodyMaterial, [0, 1.45, -0.78]);
    addVanPart("authored_van_front_bumper", new RoundedBoxGeometry(1.62, 0.14, 0.16, 6, 0.045), vanTrimMaterial, [0, 0.46, 1.89]);
    addVanPart("authored_van_front_grille", new RoundedBoxGeometry(0.7, 0.19, 0.05, 6, 0.025), vanTrimMaterial, [0, 0.87, 1.94]);
    addVanPart("authored_van_windshield", new THREE.ShapeGeometry((() => { const shape = new THREE.Shape(); shape.moveTo(-0.66, -0.25); shape.lineTo(0.66, -0.25); shape.lineTo(0.54, 0.26); shape.lineTo(-0.54, 0.26); shape.closePath(); return shape; })()), vanGlassMaterial, [0, 1.66, 1.49], [0.08, 0, 0]);
    for (const side of [-1, 1]) {
      addVanPart(`authored_van_cab_window_${side < 0 ? "left" : "right"}`, new RoundedBoxGeometry(0.05, 0.46, 0.98, 5, 0.02), vanGlassMaterial, [side * 0.98, 1.66, 0.62], [0, 0, 0]);
      addVanPart(`authored_van_cargo_window_${side < 0 ? "left" : "right"}`, new RoundedBoxGeometry(0.045, 0.42, 0.72, 5, 0.02), vanGlassMaterial, [side * 0.98, 1.66, -0.62], [0, 0, 0]);
      addVanPart(`authored_van_safety_band_${side < 0 ? "left" : "right"}`, new RoundedBoxGeometry(0.045, 0.13, 2.55, 4, 0.015), vanSafetyMaterial, [side * 0.99, 0.98, 0]);
      addVanPart(`authored_van_side_mirror_${side < 0 ? "left" : "right"}`, new RoundedBoxGeometry(0.12, 0.12, 0.2, 4, 0.03), vanTrimMaterial, [side * 1.04, 1.34, 1.15]);
      addVanPart(`authored_van_headlamp_${side < 0 ? "left" : "right"}`, new RoundedBoxGeometry(0.25, 0.16, 0.05, 4, 0.025), vanLampMaterial, [side * 0.52, 1.12, 1.94]);
      addVanPart(`authored_van_tail_lamp_${side < 0 ? "left" : "right"}`, new RoundedBoxGeometry(0.18, 0.24, 0.05, 4, 0.025), vanTailMaterial, [side * 0.74, 1.05, -1.63]);
      addVanPart(`authored_van_door_seam_${side < 0 ? "left" : "right"}`, new THREE.BoxGeometry(0.018, 0.72, 0.026), vanTrimMaterial, [side * 0.994, 1.26, -0.04]);
      for (const axleZ of [-1.02, 1.0]) {
        addVanPart(`authored_van_tyre_${side < 0 ? "left" : "right"}_${axleZ < 0 ? "rear" : "front"}`, new THREE.CylinderGeometry(0.35, 0.35, 0.2, 24), vanTyreMaterial, [side * 1.02, 0.43, axleZ], [0, 0, Math.PI / 2]);
        addVanPart(`authored_van_fender_${side < 0 ? "left" : "right"}_${axleZ < 0 ? "rear" : "front"}`, new THREE.TorusGeometry(0.38, 0.045, 10, 24), vanTrimMaterial, [side * 1.04, 0.44, axleZ], [0, Math.PI / 2, 0]);
      }
    }
    for (const z of [-1.15, -0.42, 0.3]) {
      addVanPart(`authored_van_roof_rack_crossbar_${z}`, new THREE.BoxGeometry(1.42, 0.08, 0.08), vanTrimMaterial, [0, 2.17, z]);
    }
    for (const side of [-1, 1]) {
      addVanPart(`authored_van_roof_rack_rail_${side < 0 ? "left" : "right"}`, new THREE.BoxGeometry(0.08, 0.08, 1.5), vanTrimMaterial, [side * 0.62, 2.17, -0.42]);
      addVanPart(`authored_van_rear_ladder_rail_${side < 0 ? "left" : "right"}`, new THREE.BoxGeometry(0.08, 0.78, 0.08), vanTrimMaterial, [side * 0.5, 1.55, -1.69]);
      for (const y of [1.34, 1.58, 1.82]) addVanPart(`authored_van_rear_ladder_rung_${side}_${y}`, new THREE.BoxGeometry(0.92, 0.06, 0.06), vanTrimMaterial, [0, y, -1.69]);
    }
    addVanPart("authored_van_roof_beacon", new THREE.CylinderGeometry(0.1, 0.1, 0.12, 16), vanLampMaterial, [0, 2.28, 0.7]);
    if (urlParams.get("vanDetail") !== "base") {
      addVanPart("authored_van_refined_front_grille_header", new RoundedBoxGeometry(0.86, 0.09, 0.06, 5, 0.02), vanTrimMaterial, [0, 1.03, 1.985]);
      addVanPart("authored_van_refined_front_grille_lower", new RoundedBoxGeometry(0.86, 0.08, 0.06, 5, 0.02), vanTrimMaterial, [0, 0.74, 1.985]);
      for (const side of [-1, 1]) {
        addVanPart(`authored_van_refined_front_grille_jamb_${side < 0 ? "left" : "right"}`, new RoundedBoxGeometry(0.08, 0.34, 0.06, 4, 0.02), vanTrimMaterial, [side * 0.43, 0.88, 1.985]);
        addVanPart(`authored_van_refined_fog_lamp_${side < 0 ? "left" : "right"}`, new RoundedBoxGeometry(0.18, 0.11, 0.05, 4, 0.02), vanLampMaterial, [side * 0.7, 0.65, 1.985]);
        addVanPart(`authored_van_refined_windshield_pillar_${side < 0 ? "left" : "right"}`, new RoundedBoxGeometry(0.08, 0.58, 0.06, 4, 0.02), vanTrimMaterial, [side * 0.58, 1.66, 1.515], [0.08, 0, side * 0.06]);
        addVanPart(`authored_van_refined_hood_seam_${side < 0 ? "left" : "right"}`, new THREE.BoxGeometry(0.026, 0.04, 0.62), vanTrimMaterial, [side * 0.69, 1.39, 1.34], [0.08, 0, 0]);
        addVanPart(`authored_van_refined_door_handle_${side < 0 ? "left" : "right"}`, new RoundedBoxGeometry(0.22, 0.06, 0.04, 4, 0.015), vanTrimMaterial, [side * 1.0, 1.28, 0.38], [0, 0, 0]);
      }
      addVanPart("authored_van_refined_front_bumper_guard", new RoundedBoxGeometry(1.42, 0.11, 0.12, 6, 0.035), vanTrimMaterial, [0, 0.54, 1.98]);
      addVanPart("authored_van_refined_front_license_plate", new RoundedBoxGeometry(0.48, 0.14, 0.035, 4, 0.02), vanSafetyMaterial, [0, 0.68, 2.02]);
      addVanPart("authored_van_refined_roof_service_box", new RoundedBoxGeometry(0.58, 0.18, 0.72, 5, 0.06), vanPanelMaterial, [0.36, 2.22, -0.72]);
      addVanPart("authored_van_refined_roof_service_box_lid", new THREE.BoxGeometry(0.68, 0.04, 0.78), vanTrimMaterial, [0.36, 2.33, -0.72]);
      addVanPart("authored_van_refined_roof_service_box_band", new THREE.BoxGeometry(0.6, 0.06, 0.05), vanSafetyMaterial, [0.36, 2.25, -1.08]);
    }
    const vanLight = new THREE.PointLight(0xffa45f, 1.45, 7, 2);
    vanLight.position.set(0, 1.03, 1.94);
    authoredVan.add(vanLight);
    configureLoadedModel(authoredVan);
    detailObjects.push(authoredVan);
    scene.add(authoredVan);
    addArrivalContactShadow(authoredVan, "density_arrival_authored_maintenance_van_contact_shadow", { x: 0, z: 0 }, 5.8, 3.1, 0, 0.68);
    if (urlParams.get("heroVehicle") !== "legacy") {
      authoredVan.visible = false;
      const heroVan = new THREE.Group();
      heroVan.name = "density_arrival_authored_hero_service_van_reset";
      heroVan.position.copy(instance.position);
      heroVan.rotation.y = instance.rotation.y;
      if (urlParams.get("heroPlacement") !== "legacy") {
        heroVan.position.x += 2.8;
        heroVan.position.z += 1.15;
        heroVan.rotation.y += 0.12;
      }
      heroVan.userData.visualLayer = "authored-vehicle-detail";
      heroVan.userData.presentationModule = "hero service van visual reset";
      heroVan.userData.authoringRecord = {
        type: "detail",
        id: "density_arrival_authored_hero_service_van_reset",
        displayName: "Authored Hero Service Van Visual Reset",
        role: "Presentation-only replacement for the camera-dominant arrival van. It uses a side-profile-extruded body and explicit service-vehicle construction while retaining raw Kenney, prepared Kenney, and base-authored controls without changing traffic placement or gameplay truth.",
        runtimeNote: "Extruded sloped service-van silhouette, recessed glazing, wheel arches, service doors, grille, lamps, roof rack, and contact shadow; removable with heroVehicle=legacy.",
      };
      const heroBodyMaterial = new THREE.MeshPhysicalMaterial({ color: 0x536b6a, roughness: 0.36, metalness: 0.22, clearcoat: 0.46, clearcoatRoughness: 0.16, reflectivity: 0.78 });
      const heroPanelMaterial = new THREE.MeshStandardMaterial({ color: 0x71807b, roughness: 0.58, metalness: 0.22 });
      const heroTrimMaterial = new THREE.MeshStandardMaterial({ color: 0x1b2729, roughness: 0.68, metalness: 0.62 });
      const heroGlassMaterial = new THREE.MeshPhysicalMaterial({ color: 0x0d2b31, roughness: 0.1, metalness: 0.14, clearcoat: 0.86, clearcoatRoughness: 0.08, reflectivity: 0.94 });
      const heroTireMaterial = new THREE.MeshStandardMaterial({ color: 0x0f1516, roughness: 0.96, metalness: 0.01 });
      const heroHubMaterial = new THREE.MeshStandardMaterial({ color: 0x65716c, roughness: 0.46, metalness: 0.72 });
      const heroLampMaterial = new THREE.MeshStandardMaterial({ color: 0xffc87d, roughness: 0.24, metalness: 0.06, emissive: 0xf16e35, emissiveIntensity: 1.22 });
      const heroTailMaterial = new THREE.MeshStandardMaterial({ color: 0x792824, roughness: 0.32, metalness: 0.08, emissive: 0x360806, emissiveIntensity: 0.52 });
      const heroSafetyMaterial = new THREE.MeshStandardMaterial({ color: 0xb47549, roughness: 0.7, metalness: 0.12, emissive: 0x240c06, emissiveIntensity: 0.08 });
      const addHeroPart = (name: string, geometry: THREE.BufferGeometry, material: THREE.Material, position: [number, number, number], rotation: [number, number, number] = [0, 0, 0]) => {
        const part = new THREE.Mesh(geometry, material);
        part.name = name;
        part.position.set(...position);
        part.rotation.set(...rotation);
        part.castShadow = true;
        part.receiveShadow = true;
        part.userData.visualLayer = "authored-vehicle-detail";
        heroVan.add(part);
        return part;
      };
      const profile = new THREE.Shape();
      profile.moveTo(-1.72, 0.38);
      profile.lineTo(-1.72, 1.72);
      profile.lineTo(-1.56, 1.93);
      profile.lineTo(-0.28, 1.96);
      profile.lineTo(0.12, 1.82);
      profile.lineTo(0.48, 1.58);
      profile.lineTo(1.02, 1.46);
      profile.lineTo(1.48, 1.25);
      profile.lineTo(1.7, 0.92);
      profile.lineTo(1.7, 0.38);
      profile.closePath();
      const heroProfileGeometry = new THREE.ExtrudeGeometry(profile, { depth: 1.72, steps: 2, bevelEnabled: true, bevelSegments: 3, bevelSize: 0.055, bevelThickness: 0.055 });
      heroProfileGeometry.rotateY(-Math.PI / 2);
      heroProfileGeometry.translate(0.86, 0, 0);
      addHeroPart("arrival_hero_van_extruded_body_profile", heroProfileGeometry, heroBodyMaterial, [0, 0, 0]);
      addHeroPart("arrival_hero_van_lower_rocker", new RoundedBoxGeometry(1.86, 0.28, 3.34, 8, 0.06), heroTrimMaterial, [0, 0.46, 0]);
      addHeroPart("arrival_hero_van_front_bumper", new RoundedBoxGeometry(1.72, 0.16, 0.18, 6, 0.04), heroTrimMaterial, [0, 0.52, 1.78]);
      addHeroPart("arrival_hero_van_front_grille_surround", new RoundedBoxGeometry(0.92, 0.32, 0.06, 6, 0.02), heroTrimMaterial, [0, 0.88, 1.82]);
      addHeroPart("arrival_hero_van_front_grille_insert", new RoundedBoxGeometry(0.58, 0.18, 0.035, 5, 0.015), heroHubMaterial, [0, 0.88, 1.865]);
      for (const y of [0.8, 0.89, 0.98]) addHeroPart(`arrival_hero_van_front_grille_slat_${y}`, new THREE.BoxGeometry(0.62, 0.025, 0.045), heroTrimMaterial, [0, y, 1.9]);
      addHeroPart("arrival_hero_van_front_license_plate", new RoundedBoxGeometry(0.52, 0.14, 0.035, 4, 0.02), heroSafetyMaterial, [0, 0.64, 1.88]);
      addHeroPart("arrival_hero_van_windshield", new THREE.ShapeGeometry((() => { const shape = new THREE.Shape(); shape.moveTo(-0.62, -0.25); shape.lineTo(0.62, -0.25); shape.lineTo(0.5, 0.25); shape.lineTo(-0.5, 0.25); shape.closePath(); return shape; })()), heroGlassMaterial, [0, 1.62, 1.38], [0.1, 0, 0]);
      for (const side of [-1, 1]) {
        addHeroPart(`arrival_hero_van_cab_side_glass_${side < 0 ? "left" : "right"}`, new RoundedBoxGeometry(0.05, 0.5, 0.98, 6, 0.025), heroGlassMaterial, [side * 0.9, 1.58, 0.58]);
        addHeroPart(`arrival_hero_van_cargo_side_glass_${side < 0 ? "left" : "right"}`, new RoundedBoxGeometry(0.05, 0.54, 1.02, 6, 0.025), heroGlassMaterial, [side * 0.9, 1.55, -0.78]);
        addHeroPart(`arrival_hero_van_side_safety_band_${side < 0 ? "left" : "right"}`, new RoundedBoxGeometry(0.05, 0.12, 2.62, 4, 0.015), heroSafetyMaterial, [side * 0.94, 0.82, -0.04]);
        addHeroPart(`arrival_hero_van_side_mirror_${side < 0 ? "left" : "right"}`, new RoundedBoxGeometry(0.12, 0.12, 0.22, 4, 0.03), heroTrimMaterial, [side * 1.0, 1.35, 1.08]);
        addHeroPart(`arrival_hero_van_front_lamp_${side < 0 ? "left" : "right"}`, new RoundedBoxGeometry(0.26, 0.16, 0.05, 4, 0.02), heroLampMaterial, [side * 0.54, 1.12, 1.88]);
        addHeroPart(`arrival_hero_van_rear_lamp_${side < 0 ? "left" : "right"}`, new RoundedBoxGeometry(0.2, 0.28, 0.05, 4, 0.02), heroTailMaterial, [side * 0.74, 1.02, -1.76]);
        addHeroPart(`arrival_hero_van_side_door_seam_${side < 0 ? "left" : "right"}`, new THREE.BoxGeometry(0.024, 0.9, 0.035), heroTrimMaterial, [side * 0.95, 1.2, -0.06]);
        for (const axleZ of [-1.02, 0.98]) {
          addHeroPart(`arrival_hero_van_tire_${side < 0 ? "left" : "right"}_${axleZ < 0 ? "rear" : "front"}`, new THREE.CylinderGeometry(0.36, 0.36, 0.22, 24), heroTireMaterial, [side * 0.98, 0.45, axleZ], [0, 0, Math.PI / 2]);
          addHeroPart(`arrival_hero_van_hub_${side < 0 ? "left" : "right"}_${axleZ < 0 ? "rear" : "front"}`, new THREE.CylinderGeometry(0.16, 0.16, 0.24, 20), heroHubMaterial, [side * 1.1, 0.45, axleZ], [0, 0, Math.PI / 2]);
          addHeroPart(`arrival_hero_van_wheel_arch_${side < 0 ? "left" : "right"}_${axleZ < 0 ? "rear" : "front"}`, new THREE.TorusGeometry(0.4, 0.045, 10, 28), heroTrimMaterial, [side * 1.03, 0.45, axleZ], [0, Math.PI / 2, 0]);
        }
      }
      addHeroPart("arrival_hero_van_rear_door_panel", new RoundedBoxGeometry(1.36, 1.18, 0.08, 6, 0.03), heroPanelMaterial, [0, 1.25, -1.76]);
      addHeroPart("arrival_hero_van_rear_door_seam", new THREE.BoxGeometry(0.035, 1.02, 0.04), heroTrimMaterial, [0, 1.28, -1.83]);
      addHeroPart("arrival_hero_van_rear_step", new RoundedBoxGeometry(1.24, 0.12, 0.3, 5, 0.03), heroTrimMaterial, [0, 0.52, -1.82]);
      const heroRack = new THREE.Group();
      heroRack.name = "arrival_hero_van_roof_service_rack";
      heroVan.add(heroRack);
      const rackRail = (name: string, geometry: THREE.BufferGeometry, position: [number, number, number]) => addHeroPart(name, geometry, heroTrimMaterial, position);
      rackRail("arrival_hero_van_roof_rack_left", new RoundedBoxGeometry(0.1, 0.1, 1.58, 4, 0.02), [-0.62, 2.1, -0.38]);
      rackRail("arrival_hero_van_roof_rack_right", new RoundedBoxGeometry(0.1, 0.1, 1.58, 4, 0.02), [0.62, 2.1, -0.38]);
      for (const z of [-1.08, -0.38, 0.32]) rackRail(`arrival_hero_van_roof_rack_crossbar_${z}`, new RoundedBoxGeometry(1.42, 0.1, 0.1, 4, 0.02), [0, 2.1, z]);
      for (const side of [-1, 1]) addHeroPart(`arrival_hero_van_rear_ladder_rail_${side < 0 ? "left" : "right"}`, new RoundedBoxGeometry(0.08, 0.88, 0.08, 4, 0.02), heroTrimMaterial, [side * 0.48, 1.42, -1.83]);
      for (const y of [1.24, 1.48, 1.72]) addHeroPart(`arrival_hero_van_rear_ladder_rung_${y}`, new RoundedBoxGeometry(0.9, 0.06, 0.06, 4, 0.015), heroTrimMaterial, [0, y, -1.88]);
      addHeroPart("arrival_hero_van_roof_service_case", new RoundedBoxGeometry(0.64, 0.2, 0.82, 5, 0.05), heroPanelMaterial, [0.28, 2.24, -0.72]);
      addHeroPart("arrival_hero_van_roof_service_case_lid", new RoundedBoxGeometry(0.74, 0.05, 0.9, 4, 0.02), heroTrimMaterial, [0.28, 2.37, -0.72]);
      for (const side of [-1, 1]) {
        addHeroPart(`arrival_hero_van_service_door_panel_${side < 0 ? "left" : "right"}`, new RoundedBoxGeometry(0.045, 0.78, 1.48, 6, 0.035), heroPanelMaterial, [side * 0.97, 1.08, -0.52]);
        addHeroPart(`arrival_hero_van_service_door_seam_${side < 0 ? "left" : "right"}`, new THREE.BoxGeometry(0.028, 0.72, 0.035), heroTrimMaterial, [side * 1.0, 1.1, -0.52]);
        addHeroPart(`arrival_hero_van_service_door_latch_${side < 0 ? "left" : "right"}`, new RoundedBoxGeometry(0.07, 0.12, 0.05, 4, 0.015), heroHubMaterial, [side * 1.02, 1.28, 0.12]);
        addHeroPart(`arrival_hero_van_cab_window_pillar_${side < 0 ? "left" : "right"}`, new RoundedBoxGeometry(0.055, 0.54, 0.08, 4, 0.02), heroTrimMaterial, [side * 0.94, 1.58, 0.1]);
        addHeroPart(`arrival_hero_van_cargo_window_pillar_${side < 0 ? "left" : "right"}`, new RoundedBoxGeometry(0.055, 0.58, 0.08, 4, 0.02), heroTrimMaterial, [side * 0.94, 1.55, -0.28]);
        addHeroPart(`arrival_hero_van_side_step_${side < 0 ? "left" : "right"}`, new RoundedBoxGeometry(0.16, 0.1, 1.3, 5, 0.025), heroTrimMaterial, [side * 1.02, 0.56, -0.34]);
      }
      addHeroPart("arrival_hero_van_roof_beacon", new THREE.CylinderGeometry(0.11, 0.11, 0.14, 18), heroLampMaterial, [-0.32, 2.26, 0.62]);
      const heroVanLight = new THREE.PointLight(0xffa45f, 1.35, 7, 2);
      heroVanLight.position.set(0, 1.08, 1.9);
      heroVan.add(heroVanLight);
      addArrivalVanHeadlights(heroVan, "arrival_hero_van_reset");
      configureLoadedModel(heroVan);
      detailObjects.push(heroVan);
      scene.add(heroVan);
      addArrivalContactShadow(heroVan, "density_arrival_authored_hero_service_van_reset_contact_shadow", { x: 0, z: 0 }, 5.8, 3.1, 0, 0.68);
    }
  } else {
    addArrivalContactShadow(instance, "asset_kenney_arrival_service_van_contact_shadow", { x: 0, z: 0 }, 5.8, 3.1, 0, 0.68);
  }

  const proceduralPickup = scene.getObjectByName("density_arrival_parked_pickup");
  if (proceduralPickup) {
    proceduralPickup.visible = false;
    proceduralPickup.userData.forceHidden = true;
  }
  const pickupInstance = instance.clone(true);
  pickupInstance.name = "asset_kenney_arrival_service_pickup";
  pickupInstance.position.set(-381.5, instance.position.y, 213.5);
  pickupInstance.rotation.y = -0.74;
  const useAuthoredPickup = urlParams.get("pickupCandidate") !== "kenney";
  const showPickup = urlParams.get("pickup") === "on";
  pickupInstance.visible = !useAuthoredPickup && showPickup;
  addArrivalVanHeadlights(instance, "asset_kenney_arrival_service_van");
  addArrivalVanHeadlights(pickupInstance, "asset_kenney_arrival_service_pickup");
  pickupInstance.userData.authoringRecord = {
    type: "asset",
    id: "asset_kenney_arrival_service_pickup",
    displayName: asset.displayName,
    kind: asset.kind,
    source: asset.source,
    localPath: asset.localPath,
    license: asset.license,
    role: "Second presentation-only sourced service vehicle replacing the procedural arrival pickup in the locked street frame.",
    runtimeNote: asset.runtimeNote,
  } satisfies AuthoringAssetRecord & { type: "asset" };
  configureLoadedModel(pickupInstance);
  if (!useAuthoredPickup) assetObjects.push(pickupInstance);
  selectableObjects.push(pickupInstance);
  objectById.set(pickupInstance.name, pickupInstance);
  scene.add(pickupInstance);
  if (useAuthoredPickup) {
    const authoredTruck = new THREE.Group();
    authoredTruck.name = "density_arrival_authored_maintenance_pickup";
    authoredTruck.position.copy(pickupInstance.position);
    authoredTruck.rotation.y = pickupInstance.rotation.y;
    authoredTruck.userData.visualLayer = "sourced-vehicle-detail";
    authoredTruck.userData.presentationModule = "authored maintenance pickup default";
    const truckBodyMaterial = new THREE.MeshPhysicalMaterial({ color: 0x536866, roughness: 0.46, metalness: 0.22, clearcoat: 0.34, clearcoatRoughness: 0.2, reflectivity: 0.64 });
    const truckPanelMaterial = new THREE.MeshStandardMaterial({ color: 0x6e817d, roughness: 0.58, metalness: 0.2 });
    const truckTrimMaterial = new THREE.MeshStandardMaterial({ color: 0x20292b, roughness: 0.72, metalness: 0.52 });
    const truckGlassMaterial = new THREE.MeshPhysicalMaterial({ color: 0x122a2f, roughness: 0.13, metalness: 0.18, clearcoat: 0.78, clearcoatRoughness: 0.1, reflectivity: 0.86 });
    const truckTyreMaterial = new THREE.MeshStandardMaterial({ color: 0x121819, roughness: 0.94, metalness: 0.02 });
    const truckLampMaterial = new THREE.MeshStandardMaterial({ color: 0xffc273, roughness: 0.28, metalness: 0.08, emissive: 0xf06a2e, emissiveIntensity: 1.25 });
    const truckSafetyMaterial = new THREE.MeshStandardMaterial({ color: 0xb77448, roughness: 0.7, metalness: 0.12, emissive: 0x2a1108, emissiveIntensity: 0.1 });
    const addTruckPart = (name: string, geometry: THREE.BufferGeometry, material: THREE.Material, position: [number, number, number], rotation: [number, number, number] = [0, 0, 0]) => {
      const part = new THREE.Mesh(geometry, material);
      part.name = name;
      part.position.set(...position);
      part.rotation.set(...rotation);
      part.castShadow = true;
      part.receiveShadow = true;
      part.userData.visualLayer = "sourced-vehicle-detail";
      authoredTruck.add(part);
      return part;
    };
    addTruckPart("authored_pickup_lower_body", new RoundedBoxGeometry(1.82, 0.92, 3.38, 8, 0.16), truckBodyMaterial, [0, 0.86, 0]);
    addTruckPart("authored_pickup_cab", new RoundedBoxGeometry(1.76, 1.3, 1.72, 8, 0.2), truckPanelMaterial, [0, 1.42, 0.55]);
    addTruckPart("authored_pickup_hood", new RoundedBoxGeometry(1.72, 0.42, 0.76, 8, 0.12), truckBodyMaterial, [0, 1.1, 1.55]);
    addTruckPart("authored_pickup_bed_floor", new RoundedBoxGeometry(1.72, 0.54, 1.2, 6, 0.1), truckBodyMaterial, [0, 1.08, -1.05]);
    addTruckPart("authored_pickup_bed_rail_left", new RoundedBoxGeometry(0.1, 0.46, 1.34, 4, 0.035), truckTrimMaterial, [-0.86, 1.55, -1.05]);
    addTruckPart("authored_pickup_bed_rail_right", new RoundedBoxGeometry(0.1, 0.46, 1.34, 4, 0.035), truckTrimMaterial, [0.86, 1.55, -1.05]);
    addTruckPart("authored_pickup_bed_tailgate", new RoundedBoxGeometry(1.74, 0.72, 0.1, 5, 0.04), truckPanelMaterial, [0, 1.28, -1.64]);
    const windshieldShape = new THREE.Shape();
    windshieldShape.moveTo(-0.62, -0.22);
    windshieldShape.lineTo(0.62, -0.22);
    windshieldShape.lineTo(0.5, 0.25);
    windshieldShape.lineTo(-0.5, 0.25);
    windshieldShape.closePath();
    addTruckPart("authored_pickup_windshield", new THREE.ShapeGeometry(windshieldShape), truckGlassMaterial, [0, 1.62, 1.43], [0.08, 0, 0]);
    const sideWindowShape = new THREE.Shape();
    sideWindowShape.moveTo(-0.47, -0.22);
    sideWindowShape.lineTo(0.42, -0.2);
    sideWindowShape.lineTo(0.34, 0.24);
    sideWindowShape.lineTo(-0.34, 0.26);
    sideWindowShape.closePath();
    for (const side of [-1, 1]) addTruckPart(`authored_pickup_side_window_${side < 0 ? "left" : "right"}`, new THREE.ShapeGeometry(sideWindowShape), truckGlassMaterial, [side * 0.89, 1.62, 0.55], [0, side * Math.PI / 2, 0]);
    addTruckPart("authored_pickup_front_grille", new RoundedBoxGeometry(0.72, 0.18, 0.05, 4, 0.025), truckTrimMaterial, [0, 0.86, 1.94]);
    addTruckPart("authored_pickup_front_bumper", new RoundedBoxGeometry(1.56, 0.14, 0.16, 5, 0.045), truckTrimMaterial, [0, 0.45, 1.86]);
    for (const side of [-1, 1]) {
      for (const axleZ of [-1.05, 1.0]) {
        addTruckPart(`authored_pickup_tyre_${side < 0 ? "left" : "right"}_${axleZ < 0 ? "rear" : "front"}`, new THREE.CylinderGeometry(0.34, 0.34, 0.18, 20), truckTyreMaterial, [side * 0.93, 0.42, axleZ], [0, 0, Math.PI / 2]);
        addTruckPart(`authored_pickup_fender_${side < 0 ? "left" : "right"}_${axleZ < 0 ? "rear" : "front"}`, new THREE.TorusGeometry(0.37, 0.045, 8, 20), truckTrimMaterial, [side * 0.95, 0.43, axleZ], [0, Math.PI / 2, 0]);
      }
    }
    for (const side of [-1, 1]) {
      addTruckPart(`authored_pickup_headlamp_${side < 0 ? "left" : "right"}`, new RoundedBoxGeometry(0.24, 0.15, 0.05, 4, 0.025), truckLampMaterial, [side * 0.5, 1.11, 1.94]);
      addTruckPart(`authored_pickup_bed_marker_${side < 0 ? "left" : "right"}`, new THREE.BoxGeometry(0.08, 0.16, 0.05), truckSafetyMaterial, [side * 0.84, 1.48, -1.62]);
    }
    for (const x of [-0.58, 0.58]) {
      addTruckPart(`authored_pickup_rack_post_${x < 0 ? "left" : "right"}`, new THREE.BoxGeometry(0.08, 0.7, 0.08), truckTrimMaterial, [x, 1.82, -1.08]);
      addTruckPart(`authored_pickup_rack_rail_${x < 0 ? "left" : "right"}`, new THREE.BoxGeometry(0.08, 0.08, 1.25), truckTrimMaterial, [x, 2.12, -1.08]);
    }
    addTruckPart("authored_pickup_rack_crossbar", new THREE.BoxGeometry(1.24, 0.08, 0.08), truckTrimMaterial, [0, 2.12, -1.08]);
    const truckLight = new THREE.PointLight(0xffa45f, 1.8, 7, 2);
    truckLight.position.set(0, 1.05, 1.9);
    authoredTruck.add(truckLight);
    configureLoadedModel(authoredTruck);
    detailObjects.push(authoredTruck);
    authoredTruck.visible = showPickup;
    scene.add(authoredTruck);
    const pickupShadowName = "density_arrival_authored_maintenance_pickup_contact_shadow";
    addArrivalContactShadow(authoredTruck, pickupShadowName, { x: 0, z: 0 }, 5.5, 2.9, 0, 0.48);
    const authoredPickupShadow = scene.getObjectByName(pickupShadowName);
    if (authoredPickupShadow) authoredPickupShadow.visible = showPickup;
  } else {
    const pickupShadowName = "asset_kenney_arrival_service_pickup_contact_shadow";
    addArrivalContactShadow(pickupInstance, pickupShadowName, { x: 0, z: 0 }, 5.5, 2.8, 0, 0.46);
    const sourcedPickupShadow = scene.getObjectByName(pickupShadowName);
    if (sourcedPickupShadow) sourcedPickupShadow.visible = showPickup;
  }
}

async function loadOldMilitaryCrateAsset() {
  const asset = environmentKit.assets.find((candidate) => candidate.id === "asset_polyhaven_old_military_crate_1k")!;
  const gltf = await new GLTFLoader().loadAsync(asset.localPath);
  const source = gltf.scene;
  source.updateMatrixWorld(true);
  const bounds = new THREE.Box3().setFromObject(source);
  const size = bounds.getSize(new THREE.Vector3());
  const scale = 1.25 / Math.max(0.01, Math.max(size.x, size.z));
  const placements = [
    { id: "asset_old_military_crate_arrival_loading", position: { x: -347.5, y: 0, z: 222.8 }, rotation: -0.32, role: "Texture-backed cargo crate beside the arrival loading lorry; reinforces a working service edge without becoming gameplay cover." },
    { id: "asset_old_military_crate_arrival_apron", position: { x: -326.5, y: 0, z: 225.8 }, rotation: 0.2, role: "Second texture-backed cargo crate on the right service apron, grouped with drums and pallet activity to establish accumulated maintenance traffic." },
    { id: "asset_old_military_crate_arrival_foreground", position: { x: -374.0, y: 0, z: 229.0 }, rotation: -0.18, role: "Camera-facing texture-backed cargo crate at the arrival service-yard edge; provides a real material anchor between the foreground van and the right loading apron." },
  ];
  for (const placement of placements) {
    const instance = source.clone(true);
    instance.name = placement.id;
    instance.scale.setScalar(scale);
    instance.position.set(placement.position.x, placement.position.y, placement.position.z);
    instance.rotation.y = placement.rotation;
    instance.userData.authoringRecord = {
      type: "asset",
      id: placement.id,
      displayName: asset.displayName,
      kind: asset.kind,
      source: asset.source,
      localPath: asset.localPath,
      license: asset.license,
      role: placement.role,
      runtimeNote: asset.runtimeNote,
    } satisfies AuthoringAssetRecord & { type: "asset" };
    configureLoadedModel(instance);
    assetObjects.push(instance);
    selectableObjects.push(instance);
    objectById.set(placement.id, instance);
    scene.add(instance);
  }
}
async function loadPortableWeldingCartAsset() {
  const asset = environmentKit.assets.find((candidate) => candidate.id === "asset_polyhaven_portable_welding_cart_1k")!;
  const weldingPath = urlParams.get("weldingCandidate") === "original"
    ? asset.localPath
    : "/assets/models/polyhaven/portable_welding_cart/candidates/portable_welding_cart_prepared.glb";
  const gltf = await new GLTFLoader().loadAsync(weldingPath);
  const source = gltf.scene;
  source.updateMatrixWorld(true);
  const bounds = new THREE.Box3().setFromObject(source);
  const size = bounds.getSize(new THREE.Vector3());
  const scale = 1.25 / Math.max(0.01, Math.max(size.x, size.z));
  const instance = source.clone(true);
  instance.name = "asset_portable_welding_cart_arrival_service";
  instance.scale.setScalar(scale);
  const relocateWeldingCart = urlParams.get("weldingCandidate") !== "original";
  instance.position.set(relocateWeldingCart ? -359.5 : -377.0, 0, relocateWeldingCart ? 219.0 : 228.5);
  instance.rotation.y = relocateWeldingCart ? -Math.PI * 0.08 : -Math.PI * 0.28;
  instance.userData.authoringRecord = {
    type: "asset",
    id: "asset_portable_welding_cart_arrival_service",
    displayName: asset.displayName,
    kind: asset.kind,
    source: asset.source,
    localPath: weldingPath,
    license: asset.license,
      role: "Camera-visible presentation-only welding cart at the right arrival service edge; adds worn cylinders, hoses, and workshop specificity without becoming cover truth.",
    runtimeNote: asset.runtimeNote,
  } satisfies AuthoringAssetRecord & { type: "asset" };
  configureLoadedModel(instance);
  assetObjects.push(instance);
  selectableObjects.push(instance);
  objectById.set("asset_portable_welding_cart_arrival_service", instance);
  scene.add(instance);
}

async function loadPressurePlantSliceAssets() {
  if (!pressurePlantSliceRoot) throw new Error("Pressure-plant slice root unavailable");
  const facadeRecord = pressurePlantSliceDetails.find((record) => record.kind === "FACADE_MODULE_DATUM");
  const cartRecord = pressurePlantSliceDetails.find((record) => record.kind === "WELDING_CART_DATUM");
  if (facadeRecord) {
    const facadeAsset = polyhavenFactoryThresholdAsset;
    const useSourcedFacade = urlParams.get("facadeAsset") === "1";
    const gltf = await new GLTFLoader().loadAsync(facadeAsset.localPath);
    const instance = gltf.scene;
    instance.name = "asset_pressure_plant_selective_facade_assembly";
    instance.updateMatrixWorld(true);
    const sourceBounds = new THREE.Box3().setFromObject(instance);
    const sourceSize = sourceBounds.getSize(new THREE.Vector3());
    const horizontalScale = facadeRecord.size.x / Math.max(0.01, Math.max(sourceSize.x, sourceSize.z));
    instance.scale.setScalar(horizontalScale);
    instance.updateMatrixWorld(true);
    const scaledBounds = new THREE.Box3().setFromObject(instance);
    const scaledCenter = scaledBounds.getCenter(new THREE.Vector3());
    instance.position.set(facadeRecord.position.x - scaledCenter.x, facadeRecord.position.y - scaledBounds.min.y, facadeRecord.position.z - scaledCenter.z - 4.4);
    instance.rotation.y = facadeRecord.rotationY + Math.PI;
    instance.userData.pressurePlantSlice = true;
    instance.userData.pressurePlantDetailId = facadeRecord.id;
    instance.userData.hostId = facadeRecord.hostId;
    instance.userData.hostSocket = facadeRecord.hostSocket;
    instance.userData.supportClass = facadeRecord.supportClass;
    instance.userData.pressurePlantAssetRole = "selective_facade_asset";
    instance.userData.presentationSuppressed = !useSourcedFacade;
    instance.userData.authoringRecord = {
      type: "asset",
      id: instance.name,
      displayName: facadeAsset.displayName,
      kind: facadeAsset.kind,
      source: facadeAsset.source,
      localPath: facadeAsset.localPath,
      license: facadeAsset.license,
      role: "Selective prepared facade assembly for the plant threshold; the volumetric image-derived plant mass remains the depth, roof, rear, and ground closure owner.",
      runtimeNote: "Uniform horizontal normalization to the 28 m datum with bottom contact solved against the raised plant apron; excluded from gameplay truth and bounded to pressure_plant_slice_v1.",
    } satisfies AuthoringAssetRecord & { type: "asset" };
    configureLoadedModel(instance);
    instance.visible = useSourcedFacade;
    pressurePlantSliceRoot.add(instance);
    pressurePlantSliceAssets.push(instance);
    assetObjects.push(instance);
    selectableObjects.push(instance);
    objectById.set(instance.name, instance);
    const fallback = objectById.get(facadeRecord.id);
    if (fallback) {
      fallback.visible = !useSourcedFacade;
      fallback.userData.presentationSuppressed = useSourcedFacade;
    }
    const cameraFacade = instance.clone(true);
    cameraFacade.name = "asset_pressure_plant_camera_background_facade";
    cameraFacade.position.set(0, 0, 0);
    cameraFacade.rotation.set(0, facadeRecord.rotationY + Math.PI, 0);
    cameraFacade.updateMatrixWorld(true);
    const cameraFacadeBounds = new THREE.Box3().setFromObject(cameraFacade);
    const cameraFacadeCenter = cameraFacadeBounds.getCenter(new THREE.Vector3());
    cameraFacade.position.set(74.0 - cameraFacadeCenter.x, -cameraFacadeBounds.min.y, 45.0 - cameraFacadeCenter.z);
    cameraFacade.updateMatrixWorld(true);
    // The forced locked-camera A/B sweep showed this 175k-triangle clone has
    // no visible effect in the pressure frame. Keep provenance and opt-in access,
    // but suppress it by default so the shell remains the sole depth owner.
    cameraFacade.visible = urlParams.get("cameraBackgroundFacade") === "1";
    cameraFacade.userData.pressurePlantSlice = true;
    cameraFacade.userData.pressurePlantDetailId = facadeRecord.id;
    cameraFacade.userData.hostId = facadeRecord.hostId;
    cameraFacade.userData.hostSocket = facadeRecord.hostSocket;
    cameraFacade.userData.supportClass = facadeRecord.supportClass;
    cameraFacade.userData.authoringRecord = {
      type: "asset",
      id: cameraFacade.name,
      displayName: facadeAsset.displayName,
      kind: facadeAsset.kind,
      source: facadeAsset.source,
      localPath: facadeAsset.localPath,
      license: facadeAsset.license,
      role: "Opt-in selective prepared facade assembly for left/midground background depth; suppressed by default after locked-camera A/B proof because it is screen-invisible in pressure_midroute_player; presentation-only, not a gameplay mass or route closure.",
      runtimeNote: "Clone of the existing 28 m selective facade treatment, bounds-based bottom contact solved, visual-only world datum centered at (74,0,45), and kept separate from the semantic plant-shell owner.",
    } satisfies AuthoringAssetRecord & { type: "asset" };
    configureLoadedModel(cameraFacade);
    pressurePlantSliceRoot.add(cameraFacade);
    pressurePlantSliceAssets.push(cameraFacade);
    assetObjects.push(cameraFacade);
    selectableObjects.push(cameraFacade);
    objectById.set(cameraFacade.name, cameraFacade);


    // One readable maintenance occupancy anchor. The existing source generator is
    // deliberately enlarged only to its documented ~1.15 m datum, then grounded by
    // bounds rather than by guessed origin offsets.
    const generatorPath = "/assets/models/polyhaven/portable_generator/portable_generator_1k.gltf";
    const generatorGltf = await new GLTFLoader().loadAsync(generatorPath);
    const generatorSource = generatorGltf.scene;
    generatorSource.updateMatrixWorld(true);
    const generatorSourceBounds = new THREE.Box3().setFromObject(generatorSource);
    const generatorSourceSize = generatorSourceBounds.getSize(new THREE.Vector3());
    const generator = generatorSource.clone(true);
    generator.name = "asset_pressure_plant_west_loading_generator";
    generator.scale.setScalar(1.35 / Math.max(0.01, Math.max(generatorSourceSize.x, generatorSourceSize.z)));
    generator.position.set(0, 0, 0);
    generator.rotation.y = -Math.PI * 0.18;
    generator.updateMatrixWorld(true);
    const generatorBounds = new THREE.Box3().setFromObject(generator);
    const generatorCenter = generatorBounds.getCenter(new THREE.Vector3());
    // Projection-checked service sequence landmark: (137, 0.75, 82)
    // remains in the open shell-side court and separates the generator from the bays.
    generator.position.set(137.0 - generatorCenter.x, -generatorBounds.min.y, 82.0 - generatorCenter.z);
    generator.updateMatrixWorld(true);
    generator.userData.pressurePlantSlice = true;
    generator.userData.pressurePlantDetailId = "slice_plant_welding_cart_datum";
    generator.userData.hostId = facadeRecord.hostId;
    generator.userData.hostSocket = "image_plant_building_south_west_loading_bay_floor";
    generator.userData.supportClass = "GROUNDED";
    generator.userData.pressurePlantAssetRole = "service_bay_occupancy_anchor";
    generator.userData.authoringRecord = {
      type: "asset",
      id: generator.name,
      displayName: "Poly Haven Portable Generator / 1K",
      kind: "MODEL",
      source: "https://polyhaven.com/a/portable_generator",
      localPath: generatorPath,
      license: "CC0",
      role: "One camera-visible maintenance generator inside the west loading court; readable occupancy only, never gameplay cover or a moved semantic prop datum.",
      runtimeNote: "Bounds-based contact solve at bounds-center world (137,0,82) in the projection-checked shell-side service sequence beside the sourced carts, with a 1.35 m maximum horizontal source extent; presentation-only and bounded to pressure_plant_slice_v1.",
    } satisfies AuthoringAssetRecord & { type: "asset" };
    configureLoadedModel(generator);
    pressurePlantSliceRoot.add(generator);
    pressurePlantSliceAssets.push(generator);
    assetObjects.push(generator);
    selectableObjects.push(generator);
    objectById.set(generator.name, generator);
    environmentDiagnostics.push("PRESSURE_FACADE_GLB:OK");
  }
  if (cartRecord) {
    const cartPath = "/assets/models/polyhaven/portable_welding_cart/portable_welding_cart_1k.gltf";
    const gltf = await new GLTFLoader().loadAsync(cartPath);
    const instance = gltf.scene;
    instance.name = "asset_pressure_plant_welding_cart";
    instance.updateMatrixWorld(true);
    const sourceBounds = new THREE.Box3().setFromObject(instance);
    const sourceSize = sourceBounds.getSize(new THREE.Vector3());
    const scale = cartRecord.size.x / Math.max(0.01, Math.max(sourceSize.x, sourceSize.z));
    instance.scale.setScalar(scale);
    instance.updateMatrixWorld(true);
    const scaledBounds = new THREE.Box3().setFromObject(instance);
    const scaledCenter = scaledBounds.getCenter(new THREE.Vector3());
    instance.position.set(cartRecord.position.x - scaledCenter.x, cartRecord.position.y - scaledBounds.min.y, cartRecord.position.z - scaledCenter.z);
    instance.rotation.y = cartRecord.rotationY;
    instance.userData.pressurePlantSlice = true;
    instance.userData.pressurePlantDetailId = cartRecord.id;
    instance.userData.hostId = cartRecord.hostId;
    instance.userData.hostSocket = cartRecord.hostSocket;
    instance.userData.supportClass = cartRecord.supportClass;
    instance.userData.owner = cartRecord.hostId;
    instance.userData.authoringRecord = {
      type: "asset",
      id: instance.name,
      displayName: "Poly Haven Portable Welding Cart / Prepared 1K",
      kind: "MODEL",
      source: "https://polyhaven.com/a/portable_welding_cart",
      localPath: cartPath,
      license: "CC0",
      role: "One presentation-only maintenance cart on the plant service level; it is not cover and does not alter the service route.",
      runtimeNote: "Uniform scale to the 1.25 m local datum with bottom-center contact solved against the raised plant apron; bounded to pressure_plant_slice_v1.",
    } satisfies AuthoringAssetRecord & { type: "asset" };
    configureLoadedModel(instance);
    pressurePlantSliceRoot.add(instance);
    pressurePlantSliceAssets.push(instance);
    assetObjects.push(instance);
    selectableObjects.push(instance);
    objectById.set(instance.name, instance);
    const cameraServiceCart = instance.clone(true);
    cameraServiceCart.name = "asset_pressure_plant_camera_service_cart";
    cameraServiceCart.position.set(0, 0, 0);
    cameraServiceCart.scale.copy(instance.scale).multiplyScalar(1.9);
    cameraServiceCart.rotation.set(0, cartRecord.rotationY + Math.PI * 0.18, 0);
    cameraServiceCart.updateMatrixWorld(true);
    const cameraCartBounds = new THREE.Box3().setFromObject(cameraServiceCart);
    const cameraCartCenter = cameraCartBounds.getCenter(new THREE.Vector3());
    // Projection-checked open hardstand occupancy landmark: (82, 1, 70).
    cameraServiceCart.position.set(82.0 - cameraCartCenter.x, -cameraCartBounds.min.y, 70.0 - cameraCartCenter.z);
    cameraServiceCart.updateMatrixWorld(true);
    cameraServiceCart.userData.pressurePlantSlice = true;
    cameraServiceCart.userData.authoringRecord = {
      type: "asset",
      id: cameraServiceCart.name,
      displayName: "Poly Haven Portable Welding Cart / Prepared 1K",
      kind: "MODEL",
      source: "https://polyhaven.com/a/portable_welding_cart",
      localPath: cartPath,
      license: "CC0",
      role: "Presentation-only welding cart on the camera-facing pressure route; not cover and not a route anchor.",
      runtimeNote: "Clone of the prepared plant cart with a 1.9x presentation multiplier near its 1.25 m datum, recomputed center/bottom contact solve, and visual-only bounds-center world datum at (82,0,70) in the projection-checked open hardstand service sequence; not gameplay cover.",
    } satisfies AuthoringAssetRecord & { type: "asset" };
    configureLoadedModel(cameraServiceCart);
    pressurePlantSliceRoot.add(cameraServiceCart);
    pressurePlantSliceAssets.push(cameraServiceCart);
    assetObjects.push(cameraServiceCart);
    selectableObjects.push(cameraServiceCart);
    objectById.set(cameraServiceCart.name, cameraServiceCart);
    const fallback = objectById.get(cartRecord.id);
    if (fallback) {
      fallback.visible = false;
      fallback.userData.presentationSuppressed = true;
    }
    environmentDiagnostics.push("PRESSURE_WELDING_GLB:OK");

    const storageCartAsset = environmentKit.assets.find((asset) => asset.id === "asset_polyhaven_industrial_storage_cart_1k");
    if (storageCartAsset) {
      const storageCartGltf = await new GLTFLoader().loadAsync(storageCartAsset.localPath);
      const storageCartSource = storageCartGltf.scene;
      storageCartSource.updateMatrixWorld(true);
      const storageCartSourceBounds = new THREE.Box3().setFromObject(storageCartSource);
      const storageCartSourceSize = storageCartSourceBounds.getSize(new THREE.Vector3());
      const storageCart = storageCartSource.clone(true);
      storageCart.name = "asset_pressure_plant_camera_storage_cart";
      storageCart.scale.setScalar(2.4 / Math.max(0.01, Math.max(storageCartSourceSize.x, storageCartSourceSize.z)));
      storageCart.position.set(0, 0, 0);
      storageCart.rotation.y = Math.PI * 0.16;
      storageCart.updateMatrixWorld(true);
      const storageCartBounds = new THREE.Box3().setFromObject(storageCart);
      const storageCartCenter = storageCartBounds.getCenter(new THREE.Vector3());
      // Projection-checked open hardstand occupancy landmark: (92, 1, 70).
      storageCart.position.set(92.0 - storageCartCenter.x, -storageCartBounds.min.y, 70.0 - storageCartCenter.z);
      storageCart.updateMatrixWorld(true);
      storageCart.userData.pressurePlantSlice = true;
      storageCart.userData.pressurePlantDetailId = cartRecord.id;
      storageCart.userData.hostId = cartRecord.hostId;
      storageCart.userData.hostSocket = "image_plant_building_south_west_loading_bay_floor";
      storageCart.userData.supportClass = "GROUNDED";
      storageCart.userData.pressurePlantAssetRole = "service_court_occupancy_anchor";
      storageCart.userData.authoringRecord = {
        type: "asset",
        id: storageCart.name,
        displayName: storageCartAsset.displayName,
        kind: storageCartAsset.kind,
        source: storageCartAsset.source,
        localPath: storageCartAsset.localPath,
        license: storageCartAsset.license,
        role: storageCartAsset.role,
        runtimeNote: "Bounds-based contact solve at bounds-center world (92,0,70), projected inside the open hardstand service sequence beside the existing sourced forklift; 2.4 m maximum horizontal presentation span, visual occupancy only, and not a substitute for a full vehicle.",
      } satisfies AuthoringAssetRecord & { type: "asset" };
      configureLoadedModel(storageCart);
      pressurePlantSliceRoot.add(storageCart);
      pressurePlantSliceAssets.push(storageCart);
      assetObjects.push(storageCart);
      selectableObjects.push(storageCart);
      objectById.set(storageCart.name, storageCart);
      environmentDiagnostics.push("PRESSURE_STORAGE_CART_GLB:OK");
    }

    const forkliftAsset = environmentKit.assets.find((asset) => asset.id === "asset_sketchfab_warehouse_forklift_gameready_1k");
    const useSourcedForklift = urlParams.get("forkliftAsset") !== "0";
    if (forkliftAsset && useSourcedForklift) {
      try {
        const forkliftGltf = await new GLTFLoader().loadAsync(forkliftAsset.localPath);
        const forkliftSource = forkliftGltf.scene;
        forkliftSource.updateMatrixWorld(true);
        const forkliftSourceBounds = new THREE.Box3().setFromObject(forkliftSource);
        const forkliftSourceSize = forkliftSourceBounds.getSize(new THREE.Vector3());
        const forklift = forkliftSource.clone(true);
        forklift.name = "asset_pressure_plant_camera_warehouse_forklift";
        forklift.scale.setScalar(4.2 / Math.max(0.01, Math.max(forkliftSourceSize.x, forkliftSourceSize.z)));
        forklift.position.set(0, 0, 0);
        forklift.rotation.y = 0;
        forklift.updateMatrixWorld(true);
        const forkliftBounds = new THREE.Box3().setFromObject(forklift);
        const forkliftCenter = forkliftBounds.getCenter(new THREE.Vector3());
        // Projection-checked open loading-pocket landmark: (72, 1.3, 72),
        // screen x≈419/y≈327, behind the existing fence/tree edge and clear of cover.
        forklift.position.set(72.0 - forkliftCenter.x, -forkliftBounds.min.y, 72.0 - forkliftCenter.z);
        forklift.updateMatrixWorld(true);
        forklift.userData.pressurePlantSlice = true;
        forklift.userData.pressurePlantDetailId = cartRecord.id;
        forklift.userData.hostId = cartRecord.hostId;
        forklift.userData.hostSocket = "image_plant_building_south_west_loading_bay_floor";
        forklift.userData.supportClass = "GROUNDED";
        forklift.userData.pressurePlantAssetRole = "service_hardstand_vehicle_occupancy";
        forklift.userData.authoringRecord = {
          type: "asset",
          id: forklift.name,
          displayName: forkliftAsset.displayName,
          kind: forkliftAsset.kind,
          source: forkliftAsset.source,
          localPath: forkliftAsset.localPath,
          license: forkliftAsset.license,
          role: forkliftAsset.role,
           runtimeNote: "Bounds-based contact solve at bounds-center world (72,0,72), chosen from locked-camera projection for the open left loading pocket behind the existing fence/tree edge; source GLB axes were verified before normalization and the side-readable yaw is fixed at 0 radians; 4.2 m maximum horizontal vehicle span, CC-BY attribution retained, and presentation-only outside gameplay truth.",
        } satisfies AuthoringAssetRecord & { type: "asset" };
        configureLoadedModel(forklift);
        pressurePlantSliceRoot.add(forklift);
        pressurePlantSliceAssets.push(forklift);
        assetObjects.push(forklift);
        selectableObjects.push(forklift);
        objectById.set(forklift.name, forklift);
        environmentDiagnostics.push("PRESSURE_FORKLIFT_GLB:OK");
      } catch (error) {
        console.warn("Pressure forklift asset unavailable", error);
        environmentDiagnostics.push("PRESSURE_FORKLIFT_GLB:FAIL");
      }
    }
  }
  const fenceRecord = pressurePlantSliceDetails.find((record) => record.kind === "FENCE_BOUNDARY");
  if (fenceRecord && urlParams.get("fenceAsset") === "1") {
    try {
      const fenceAsset = environmentKit.assets.find((candidate) => candidate.id === "asset_polyhaven_chainlink_fence_1k");
    if (fenceAsset) {
      const gltf = await new GLTFLoader().loadAsync(fenceAsset.localPath);
      const source = gltf.scene;
      source.updateMatrixWorld(true);
      const sourceBounds = new THREE.Box3().setFromObject(source);
      const sourceWidth = Math.max(sourceBounds.getSize(new THREE.Vector3()).x, sourceBounds.getSize(new THREE.Vector3()).z);
      const segmentScale = 8.1 / Math.max(0.01, sourceWidth);
      const assembly = new THREE.Group();
      assembly.name = "asset_pressure_plant_chainlink_boundary";
      assembly.position.set(fenceRecord.position.x, fenceRecord.position.y, fenceRecord.position.z);
      assembly.rotation.y = fenceRecord.rotationY;
      assembly.userData.pressurePlantSlice = true;
      assembly.userData.pressurePlantDetailId = fenceRecord.id;
      assembly.userData.hostId = fenceRecord.hostId;
      assembly.userData.hostSocket = fenceRecord.hostSocket;
      assembly.userData.supportClass = fenceRecord.supportClass;
      assembly.userData.owner = fenceRecord.hostId;
      assembly.userData.authoringRecord = { type: "asset", id: assembly.name, displayName: fenceAsset.displayName, kind: fenceAsset.kind, source: fenceAsset.source, localPath: fenceAsset.localPath, license: fenceAsset.license, role: "Short plant-edge chainlink boundary with four supported segments; presentation-only route framing.", runtimeNote: "Uniform 8.1 m segment normalization with bottom-contact correction; bounded to pressure_plant_slice_v1." } satisfies AuthoringAssetRecord & { type: "asset" };
      for (let segment = 0; segment < 4; segment += 1) {
        const instance = source.clone(true);
        instance.name = `asset_pressure_plant_chainlink_segment_${segment + 1}`;
        instance.scale.setScalar(segmentScale);
        instance.position.set(-12.15 + segment * 8.1, 0, 0);
        instance.updateMatrixWorld(true);
        const scaledBounds = new THREE.Box3().setFromObject(instance);
        instance.position.y = -scaledBounds.min.y;
        configureLoadedModel(instance);
        assembly.add(instance);
      }
      const endPostMaterial = pressureSliceMaterial(fenceRecord, 0x4b5856, 0.62, 0.68);
      const endCapMaterial = pressureSliceMaterial(fenceRecord, 0x9b9b8c, 0.72, 0.28);
      for (const endX of [-16.15, 16.15]) {
        const endPost = new THREE.Mesh(new RoundedBoxGeometry(0.24, 3.5, 0.24, 4, 0.04), endPostMaterial);
        endPost.name = `asset_pressure_plant_chainlink_end_post_${endX < 0 ? "left" : "right"}`;
        endPost.position.set(endX, 1.75, 0);
        endPost.userData.pressurePlantSlice = true;
        endPost.userData.pressurePlantDetailId = fenceRecord.id;
        endPost.userData.authoringRecord = { type: "asset", id: endPost.name, displayName: fenceAsset.displayName, kind: fenceAsset.kind, source: fenceAsset.source, localPath: fenceAsset.localPath, license: fenceAsset.license, role: "Sourced chainlink span end termination with grounded steel post.", runtimeNote: "Bounded end termination added to the normalized four-segment chainlink span." } satisfies AuthoringAssetRecord & { type: "asset" };
        assembly.add(endPost);
        const endCap = new THREE.Mesh(new RoundedBoxGeometry(0.36, 0.08, 0.36, 3, 0.02), endCapMaterial);
        endCap.name = `${endPost.name}_cap`;
        endCap.position.set(endX, 3.54, 0);
        endCap.userData.pressurePlantSlice = true;
        endCap.userData.pressurePlantDetailId = fenceRecord.id;
        endCap.userData.authoringRecord = { type: "asset", id: endCap.name, displayName: fenceAsset.displayName, kind: fenceAsset.kind, source: fenceAsset.source, localPath: fenceAsset.localPath, license: fenceAsset.license, role: "Sourced chainlink span end cap.", runtimeNote: "Bounded cap added to the normalized chainlink end post." } satisfies AuthoringAssetRecord & { type: "asset" };
        assembly.add(endCap);
        const shoe = new THREE.Mesh(new RoundedBoxGeometry(0.72, 0.08, 0.72, 3, 0.03), endCapMaterial);
        shoe.name = `${endPost.name}_base_shoe`;
        shoe.position.set(endX, 0.04, 0);
        shoe.userData.pressurePlantSlice = true;
        shoe.userData.pressurePlantDetailId = fenceRecord.id;
        shoe.userData.authoringRecord = { type: "asset", id: shoe.name, displayName: fenceAsset.displayName, kind: fenceAsset.kind, source: fenceAsset.source, localPath: fenceAsset.localPath, license: fenceAsset.license, role: "Sourced chainlink grounded base shoe.", runtimeNote: "Bounded base shoe added to enforce grounded fence contact." } satisfies AuthoringAssetRecord & { type: "asset" };
        assembly.add(shoe);
      }
      const legibilityMaterial = new THREE.MeshStandardMaterial({ color: 0x96a19b, roughness: 0.72, metalness: 0.62, transparent: true, opacity: 0.78, side: THREE.DoubleSide, depthWrite: false });
      const legibilityPositions: number[] = [];
      const legibilityIndices: number[] = [];
      const addLegibilitySegment = (a: THREE.Vector2, b: THREE.Vector2) => {
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const length = Math.max(0.001, Math.hypot(dx, dy));
        const nx = (-dy / length) * 0.038;
        const ny = (dx / length) * 0.038;
        const base = legibilityPositions.length / 3;
        legibilityPositions.push(a.x - nx, a.y - ny, -0.055, a.x + nx, a.y + ny, -0.055, b.x + nx, b.y + ny, -0.055, b.x - nx, b.y - ny, -0.055);
        legibilityIndices.push(base, base + 1, base + 2, base, base + 2, base + 3);
      };
      const legibilityWidth = 31.4;
      const legibilityHeight = 2.9;
      const legibilityColumns = 16;
      const legibilityRows = 4;
      const legibilityCellWidth = legibilityWidth / legibilityColumns;
      const legibilityCellHeight = legibilityHeight / legibilityRows;
      for (let column = 0; column < legibilityColumns; column += 1) {
        for (let row = 0; row < legibilityRows; row += 1) {
          const centerX = -legibilityWidth / 2 + legibilityCellWidth * (column + 0.5);
          const centerY = 0.18 + legibilityCellHeight * (row + 0.5);
          const halfWidth = legibilityCellWidth * 0.44;
          const halfHeight = legibilityCellHeight * 0.44;
          const points = [
            new THREE.Vector2(centerX, centerY + halfHeight),
            new THREE.Vector2(centerX + halfWidth, centerY),
            new THREE.Vector2(centerX, centerY - halfHeight),
            new THREE.Vector2(centerX - halfWidth, centerY),
          ];
          for (let edge = 0; edge < 4; edge += 1) addLegibilitySegment(points[edge], points[(edge + 1) % 4]);
        }
      }
      const legibilityGeometry = new THREE.BufferGeometry();
      legibilityGeometry.setAttribute("position", new THREE.Float32BufferAttribute(legibilityPositions, 3));
      legibilityGeometry.setIndex(legibilityIndices);
      legibilityGeometry.computeVertexNormals();
      const legibilityPanel = new THREE.Mesh(legibilityGeometry, legibilityMaterial);
      legibilityPanel.name = "asset_pressure_plant_chainlink_legibility_panel";
      legibilityPanel.position.set(0, 0, -0.04);
      legibilityPanel.userData.pressurePlantSlice = true;
      legibilityPanel.userData.pressurePlantDetailId = fenceRecord.id;
      legibilityPanel.userData.authoringRecord = { type: "asset", id: legibilityPanel.name, displayName: fenceAsset.displayName, kind: fenceAsset.kind, source: fenceAsset.source, localPath: fenceAsset.localPath, license: fenceAsset.license, role: "Sourced chainlink legibility companion with larger diamond cells; supplements but does not replace the downloaded fence geometry.", runtimeNote: "Bounded four-segment overlay kept inside the selected chainlink asset assembly for player-scale readability." } satisfies AuthoringAssetRecord & { type: "asset" };
      assembly.add(legibilityPanel);
      pressurePlantSliceRoot.add(assembly);
      pressurePlantSliceAssets.push(assembly);
      assetObjects.push(assembly);
      selectableObjects.push(assembly);
      objectById.set(assembly.name, assembly);
      const fallback = objectById.get(fenceRecord.id);
      if (fallback) {
        fallback.visible = false;
        fallback.userData.presentationSuppressed = true;
      }
      environmentDiagnostics.push("PRESSURE_FENCE_GLB:OK");
      }
    } catch (error) {
      environmentDiagnostics.push(`PRESSURE_FENCE_GLB:FAIL ${String(error)}`);
      console.warn("[MapAuthoring] Chainlink GLB unavailable; keeping the bounded procedural fence fallback.", error);
    }
  }
  const treeRecord = pressurePlantSliceDetails.find((record) => record.kind === "TREE_CLUSTER");
  if (treeRecord?.localPath && treeRecord.lodPath) {
    // Keep the original Poly Haven aliases and files as provenance, but use the
    // source-derived, geometry-reduced 512 glTF for the presentation runtime. One
    // fetch is cloned into the far tier, avoiding both the original 95 MB BIN and
    // a second tree transfer while remaining fully sourced (never procedural).
    const preparedTreePath = "/assets/models/polyhaven/tree_small_02_lod/served_512/tree_small_02_distance_lod_012_512.gltf";
    const preparedGltf = await new GLTFLoader().loadAsync(preparedTreePath);
    const closeGltf = preparedGltf;
    const lodGltf = { scene: preparedGltf.scene.clone(true) };
    const normalizeTree = (tree: THREE.Object3D) => {
      tree.updateMatrixWorld(true);
      const sourceBounds = new THREE.Box3().setFromObject(tree);
      const sourceSize = sourceBounds.getSize(new THREE.Vector3());
      tree.scale.setScalar(treeRecord.size.y / Math.max(0.01, sourceSize.y));
      tree.updateMatrixWorld(true);
      const scaledBounds = new THREE.Box3().setFromObject(tree);
      const scaledCenter = scaledBounds.getCenter(new THREE.Vector3());
      tree.position.set(-scaledCenter.x, -scaledBounds.min.y, -scaledCenter.z);
      return tree;
    };
    const closeTree = normalizeTree(closeGltf.scene);
    const farTree = normalizeTree(lodGltf.scene);
    const lod = new THREE.LOD();
    lod.name = "asset_pressure_plant_windbreak_tree";
    lod.position.set(treeRecord.position.x, treeRecord.position.y, treeRecord.position.z);
    lod.rotation.y = treeRecord.rotationY;
    lod.addLevel(closeTree, 0);
    lod.addLevel(farTree, 34);
    lod.userData.pressurePlantSlice = true;
    lod.userData.pressurePlantDetailId = treeRecord.id;
    lod.userData.hostId = treeRecord.hostId;
    lod.userData.owner = treeRecord.hostId;
    lod.userData.hostSocket = treeRecord.hostSocket;
    lod.userData.supportClass = treeRecord.supportClass;
    lod.userData.pressurePlantAssetRole = "sourced_realistic_windbreak_tree";
    lod.userData.authoringRecord = {
      type: "asset",
      id: lod.name,
      displayName: treeRecord.displayName,
      kind: "MODEL",
      source: treeRecord.source ?? "https://polyhaven.com/a/tree_small_02",
      localPath: treeRecord.localPath,
      license: "CC0",
      role: "One sourced, presentation-only industrial-edge tree replacing the rejected procedural canopy; it is not cover and does not alter route truth.",
      runtimeNote: `Poly Haven source-derived prepared GLB with 0.12 geometry target and 512 px textures, bottom-center contact solved against the pressure yard; one loaded scene is cloned for the 34 m tier to avoid duplicate transfer; original CC0 aliases remain retained for provenance and bounded to pressure_plant_slice_v1.`,
    } satisfies AuthoringAssetRecord & { type: "asset" };
    configureLoadedModel(lod);
    lod.visible = true;
    pressurePlantSliceRoot.add(lod);
    pressurePlantSliceAssets.push(lod);
    assetObjects.push(lod);
    selectableObjects.push(lod);
    objectById.set(lod.name, lod);

    // One additional sourced clone completes the planting-edge relationship in
    // the visible service court. It shares the prepared source geometry/materials
    // with the first LOD and is not a procedural tree or gameplay cover object.
    const serviceTree = new THREE.LOD();
    serviceTree.name = "asset_pressure_plant_service_tree";
    serviceTree.position.set(78.0, 0.0, 82.0);
    serviceTree.rotation.y = -0.18;
    serviceTree.addLevel(closeTree.clone(true), 0);
    serviceTree.addLevel(farTree.clone(true), 34);
    serviceTree.userData.pressurePlantSlice = true;
    serviceTree.userData.pressurePlantDetailId = treeRecord.id;
    serviceTree.userData.hostId = treeRecord.hostId;
    serviceTree.userData.owner = treeRecord.hostId;
    serviceTree.userData.hostSocket = "pressure_yard_service_court_planting_edge";
    serviceTree.userData.supportClass = "GROUNDED";
    serviceTree.userData.pressurePlantAssetRole = "sourced_realistic_service_court_tree";
    serviceTree.userData.authoringRecord = {
      type: "asset",
      id: serviceTree.name,
      displayName: "Poly Haven Tree Small 02 / Prepared 512 sourced clone",
      kind: "MODEL",
      source: treeRecord.source ?? "https://polyhaven.com/a/tree_small_02",
      localPath: preparedTreePath,
      license: "CC0",
      role: "One restrained sourced presentation-only tree clone completing the service-court planted edge; not cover and not a route anchor.",
      runtimeNote: "Projection-checked bounds-center world (78,0,82), grounded by the same normalized prepared source LOD as the primary tree; shared geometry/materials avoid another transfer and the clone remains outside gameplay truth.",
    } satisfies AuthoringAssetRecord & { type: "asset" };
    configureLoadedModel(serviceTree);
    serviceTree.visible = true;
    pressurePlantSliceRoot.add(serviceTree);
    pressurePlantSliceAssets.push(serviceTree);
    assetObjects.push(serviceTree);
    selectableObjects.push(serviceTree);
    objectById.set(serviceTree.name, serviceTree);

    // A restrained third clone closes the right service-court depth band. It
    // shares the single prepared source load and is kept outside gameplay truth.
    const rightServiceTree = new THREE.LOD();
    rightServiceTree.name = "asset_pressure_plant_right_service_tree";
    rightServiceTree.position.set(128.0, 0.0, 91.0);
    rightServiceTree.rotation.y = 0.26;
    rightServiceTree.scale.setScalar(0.82);
    rightServiceTree.addLevel(closeTree.clone(true), 0);
    rightServiceTree.addLevel(farTree.clone(true), 34);
    rightServiceTree.userData.pressurePlantSlice = true;
    rightServiceTree.userData.pressurePlantDetailId = treeRecord.id;
    rightServiceTree.userData.hostId = treeRecord.hostId;
    rightServiceTree.userData.owner = treeRecord.hostId;
    rightServiceTree.userData.hostSocket = "pressure_yard_right_service_court_planting_edge";
    rightServiceTree.userData.supportClass = "GROUNDED";
    rightServiceTree.userData.pressurePlantAssetRole = "sourced_realistic_right_service_tree";
    rightServiceTree.userData.authoringRecord = {
      type: "asset",
      id: rightServiceTree.name,
      displayName: "Poly Haven Tree Small 02 / Prepared 512 sourced right-court clone",
      kind: "MODEL",
      source: treeRecord.source ?? "https://polyhaven.com/a/tree_small_02",
      localPath: preparedTreePath,
      license: "CC0",
      role: "One restrained sourced presentation-only tree clone framing the right service-court depth edge; not cover and not a route anchor.",
      runtimeNote: "Projection-checked bounds-center world (128,0,91), 0.82 presentation scale, grounded by the normalized prepared source LOD, shared geometry/materials, and bounded to pressure_plant_slice_v1; outside gameplay truth.",
    } satisfies AuthoringAssetRecord & { type: "asset" };
    configureLoadedModel(rightServiceTree);
    rightServiceTree.visible = true;
    pressurePlantSliceRoot.add(rightServiceTree);
    pressurePlantSliceAssets.push(rightServiceTree);
    assetObjects.push(rightServiceTree);
    selectableObjects.push(rightServiceTree);
    objectById.set(rightServiceTree.name, rightServiceTree);

    const fallback = objectById.get(treeRecord.id);
    if (fallback) {
      fallback.visible = false;
      fallback.userData.presentationSuppressed = true;
    }
    environmentDiagnostics.push("PRESSURE_TREE_GLB:OK");
  }
  const rockRecord = pressurePlantSliceDetails.find((record) => record.id === "slice_plant_rock_cut");
  if (rockRecord?.localPath) {
    const gltf = await new GLTFLoader().loadAsync(rockRecord.localPath);
    const instance = gltf.scene;
    instance.name = "asset_pressure_plant_nicholas01_rock_cluster";
    instance.updateMatrixWorld(true);
    const sourceBounds = new THREE.Box3().setFromObject(instance);
    const sourceSize = sourceBounds.getSize(new THREE.Vector3());
    const scale = Math.min(5.0 / Math.max(0.01, sourceSize.y), 8.0 / Math.max(0.01, sourceSize.x), 6.0 / Math.max(0.01, sourceSize.z));
    instance.scale.setScalar(scale);
    instance.updateMatrixWorld(true);
    const scaledBounds = new THREE.Box3().setFromObject(instance);
    const scaledCenter = scaledBounds.getCenter(new THREE.Vector3());
    instance.position.set(rockRecord.position.x - scaledCenter.x, rockRecord.position.y - scaledBounds.min.y, rockRecord.position.z - scaledCenter.z);
    instance.rotation.y = rockRecord.rotationY;
    instance.userData.pressurePlantSlice = true;
    instance.userData.pressurePlantDetailId = rockRecord.id;
    instance.userData.hostId = rockRecord.hostId;
    instance.userData.hostSocket = rockRecord.hostSocket;
    instance.userData.supportClass = rockRecord.supportClass;
    instance.userData.pressurePlantAssetRole = "sourced_realistic_rock_cluster";
    instance.userData.authoringRecord = {
      type: "asset",
      id: instance.name,
      displayName: rockRecord.displayName,
      kind: "MODEL",
      source: rockRecord.source ?? "https://sketchfab.com/3d-models/plants-scene-free-5425c959e480400e957cd52c6f59c3dc",
      localPath: rockRecord.localPath,
      license: "CC-BY-4.0",
      role: "One bounded presentation-only rock cluster extracted from the user-provided Nicholas01 plant scene; it explains the plant runoff edge without becoming cover or altering route truth.",
      runtimeNote: "Prepared from selected Rock meshes, transforms baked, bottom contact solved against the plant-edge host, and scene-wide ground/grass excluded; author credit required and source page carries NoAI restriction.",
    } satisfies AuthoringAssetRecord & { type: "asset" };
    configureLoadedModel(instance);
    instance.visible = true;
    pressurePlantSliceRoot.add(instance);
    pressurePlantSliceAssets.push(instance);
    assetObjects.push(instance);
    selectableObjects.push(instance);
    objectById.set(instance.name, instance);
    const fallback = objectById.get(rockRecord.id);
    fallback?.traverse((child) => {
      const role = (child.userData.authoringRecord as { role?: string } | undefined)?.role ?? "";
      if (/rock_form/i.test(role)) child.userData.presentationSuppressed = true;
    });
    environmentDiagnostics.push("PRESSURE_ROCK_GLB:OK");
  }
  const pipeRecord = pressurePlantSliceDetails.find((record) => record.kind === "PIPE_RACK");
  if (pipeRecord) {
    const pipeAsset = polyhavenIndustrialPipeKitAsset;
    const gltf = await new GLTFLoader().loadAsync(pipeAsset.localPath);
    const source = gltf.scene;
    source.updateMatrixWorld(true);
    const pipe02 = source.getObjectByName("modular_industrial_pipes_01_pipe02");
    const pipe05 = source.getObjectByName("modular_industrial_pipes_01_pipe05");
    const pipe08 = source.getObjectByName("modular_industrial_pipes_01_pipe08");
    if (!pipe02 || !pipe05 || !pipe08) throw new Error("Required pressure pipe modules are missing");
    const assembly = new THREE.Group();
    assembly.name = "asset_pressure_plant_process_pipes";
    assembly.position.set(pipeRecord.position.x + pressurePlantPipeRackVisualOffsetX, pipeRecord.position.y, pipeRecord.position.z + pressurePlantPipeRackVisualOffsetZ);
    assembly.rotation.y = pipeRecord.rotationY;
    assembly.userData.pressurePlantSlice = true;
    assembly.userData.hostRelativeVisualOffset = { x: pressurePlantPipeRackVisualOffsetX, y: 0, z: pressurePlantPipeRackVisualOffsetZ };
    assembly.userData.pressurePlantDetailId = pipeRecord.id;
    assembly.userData.hostId = pipeRecord.hostId;
    assembly.userData.hostSocket = pipeRecord.hostSocket;
    assembly.userData.supportClass = pipeRecord.supportClass;
    assembly.userData.authoringRecord = { type: "asset", id: assembly.name, displayName: pipeAsset.displayName, kind: pipeAsset.kind, source: pipeAsset.source, localPath: pipeAsset.localPath, license: pipeAsset.license, role: "Five selected high-detail pipe modules replacing the weak procedural cylinders inside the supported threshold rack.", runtimeNote: pipeAsset.runtimeNote } satisfies AuthoringAssetRecord & { type: "asset" };
    const rackScale = 0.92;
    const attachModule = (moduleSource: THREE.Object3D, id: string, position: [number, number, number], rotationY: number) => {
      const module = moduleSource.clone(true);
      module.name = id;
      module.position.set(...position);
      module.rotation.y = rotationY;
      module.scale.setScalar(rackScale);
      module.userData.sourcedAssetId = pipeAsset.id;
      module.userData.sourcedAssetSource = pipeAsset.source;
      configureLoadedModel(module);
      assembly.add(module);
    };
    attachModule(pipe02, "asset_pressure_plant_pipe_straight_low", [-4.5 * rackScale, 1.9 * rackScale, 0], Math.PI / 2);
    attachModule(pipe02, "asset_pressure_plant_pipe_straight_mid", [0, 4.05 * rackScale, 0], Math.PI / 2);
    attachModule(pipe02, "asset_pressure_plant_pipe_straight_high", [4.5 * rackScale, 6.2 * rackScale, 0], Math.PI / 2);
    attachModule(pipe05, "asset_pressure_plant_pipe_elbow_valve", [4.5 * rackScale, 4.05 * rackScale, 0.82 * rackScale], 0);
    attachModule(pipe08, "asset_pressure_plant_pipe_flanged_valve", [-4.5 * rackScale, 1.9 * rackScale, -0.82 * rackScale], 0);
    const saddleMaterial = pressureSliceMaterial(pipeRecord, 0x4a5654, 0.66, 0.58);
    for (const [index, x] of [-4.5, 0, 4.5].entries()) {
      const saddle = new THREE.Mesh(new RoundedBoxGeometry(0.92, 0.2, 1.2, 4, 0.08), saddleMaterial);
      saddle.position.set(x * rackScale, [1.25, 3.4, 5.55][index] * rackScale, 0);
      saddle.userData.pressurePlantSlice = true;
      saddle.userData.pressurePlantDetailId = pipeRecord.id;
      saddle.userData.authoringRecord = { type: "pressure-plant-detail", ...pipeRecord, role: `sourced_pipe_supported_saddle_${index + 1}`, socket: `rack_pipe_saddle_${index + 1}` };
      assembly.add(saddle);
    }
    pressurePlantSliceRoot.add(assembly);
    pressurePlantSliceAssets.push(assembly);
    assetObjects.push(assembly);
    selectableObjects.push(assembly);
    objectById.set(assembly.name, assembly);
    const fallback = objectById.get(pipeRecord.id);
    fallback?.traverse((child) => {
      const role = (child.userData.authoringRecord as { role?: string } | undefined)?.role ?? "";
      if (/process_pipe|pipe_collar|pipe_elbow|pipe_termination/i.test(role)) {
        child.visible = false;
        child.userData.presentationSuppressed = true;
      }
    });
    environmentDiagnostics.push("PRESSURE_PIPING_GLB:OK");
  }
  const generatorAsset = environmentKit.assets.find((candidate) => candidate.id === "asset_polyhaven_portable_generator_1k");
  if (generatorAsset) {
    const gltf = await new GLTFLoader().loadAsync(generatorAsset.localPath);
    const source = gltf.scene;
    source.updateMatrixWorld(true);
    const sourceBounds = new THREE.Box3().setFromObject(source);
    const sourceSize = sourceBounds.getSize(new THREE.Vector3());
    const scale = 1.15 / Math.max(0.01, Math.max(sourceSize.x, sourceSize.z));
    const generator = source.clone(true);
    generator.name = "asset_pressure_plant_camera_generator";
    generator.scale.setScalar(scale);
    generator.position.set(0, 0, 0);
    generator.rotation.y = -Math.PI * 0.16;
    generator.updateMatrixWorld(true);
    const generatorBounds = new THREE.Box3().setFromObject(generator);
    const generatorCenter = generatorBounds.getCenter(new THREE.Vector3());
    generator.position.set(102.0 - generatorCenter.x, -generatorBounds.min.y, 77.0 - generatorCenter.z);
    generator.updateMatrixWorld(true);
    generator.userData.pressurePlantSlice = true;
    generator.userData.pressurePlantDetailId = "slice_pressure_service_control_cabinet";
    generator.userData.hostId = "fabric_pressure_yard_surface";
    generator.userData.hostSocket = "pressure_yard_service_control_pad";
    generator.userData.supportClass = "GROUNDED";
    generator.userData.authoringRecord = {
      type: "asset",
      id: generator.name,
      displayName: generatorAsset.displayName,
      kind: generatorAsset.kind,
      source: generatorAsset.source,
      localPath: generatorAsset.localPath,
      license: generatorAsset.license,
      role: "Single presentation-only portable generator beside the camera-visible pressure service route; not cover and not a semantic replacement for the utility cabinet.",
      runtimeNote: "Prepared Poly Haven 1K GLB at approximately 1.15 m width, bounds-based center/bottom contact solved, visual-only world datum centered at (102,0,77) in the camera-visible service court.",
    } satisfies AuthoringAssetRecord & { type: "asset" };
    configureLoadedModel(generator);
    pressurePlantSliceRoot.add(generator);
    pressurePlantSliceAssets.push(generator);
    assetObjects.push(generator);
    selectableObjects.push(generator);
    objectById.set(generator.name, generator);
    environmentDiagnostics.push("PRESSURE_GENERATOR_GLB:OK");
  }
}

async function loadSecurityCameraAsset() {
  const asset = environmentKit.assets.find((candidate) => candidate.id === "asset_polyhaven_security_camera_02_1k")!;
  const gltf = await new GLTFLoader().loadAsync(asset.localPath);
  const source = gltf.scene;
  source.updateMatrixWorld(true);
  const bounds = new THREE.Box3().setFromObject(source);
  const size = bounds.getSize(new THREE.Vector3());
  const scale = 0.52 / Math.max(0.01, Math.max(size.x, size.z));
  const instance = source.clone(true);
  instance.name = "asset_security_camera_kill_zone";
  instance.scale.setScalar(scale);
  instance.position.set(-381, 6.55, -17.2);
  instance.rotation.y = Math.PI;
  instance.userData.authoringRecord = {
    type: "asset",
    id: "asset_security_camera_kill_zone",
    displayName: asset.displayName,
    kind: asset.kind,
    source: asset.source,
    localPath: asset.localPath,
    license: asset.license,
    role: "Destructible surveillance anchor above the only obvious compound access point; communicates commander visibility and the consequence of camera disruption.",
    runtimeNote: asset.runtimeNote,
  } satisfies AuthoringAssetRecord & { type: "asset" };
  configureLoadedModel(instance);
  assetObjects.push(instance);
  selectableObjects.push(instance);
  objectById.set("asset_security_camera_kill_zone", instance);
  scene.add(instance);

  const arrivalInstance = source.clone(true);
  arrivalInstance.name = "asset_security_camera_arrival_apron";
  arrivalInstance.scale.setScalar(scale * 1.12);
  arrivalInstance.position.set(-343, 9.65, 226.4);
  arrivalInstance.rotation.y = -0.68;
  arrivalInstance.userData.authoringRecord = {
    type: "asset",
    id: "asset_security_camera_arrival_apron",
    displayName: asset.displayName,
    kind: asset.kind,
    source: asset.source,
    localPath: asset.localPath,
    license: asset.license,
    role: "Presentation-only surveillance camera mounted above the arrival apron shed, making the commander-facing industrial frontage legible before combat begins.",
    runtimeNote: asset.runtimeNote,
  } satisfies AuthoringAssetRecord & { type: "asset" };
  configureLoadedModel(arrivalInstance);
  assetObjects.push(arrivalInstance);
  selectableObjects.push(arrivalInstance);
  objectById.set("asset_security_camera_arrival_apron", arrivalInstance);
  scene.add(arrivalInstance);
}

async function loadStaticTurretAsset() {
  const asset = environmentKit.assets.find((candidate) => candidate.id === "asset_original_static_turret_v1")!;
  const gltf = await new GLTFLoader().loadAsync(asset.localPath);
  const source = gltf.scene;
  source.updateMatrixWorld(true);
  const bounds = new THREE.Box3().setFromObject(source);
  const size = bounds.getSize(new THREE.Vector3());
  const scale = 4.6 / Math.max(0.01, Math.max(size.x, size.z));
  const placements = [
    { id: "asset_static_turret_kill_zone_a", x: -389, z: 10, datumId: "detail_kill_zone_turret_01" },
    { id: "asset_static_turret_kill_zone_b", x: -389, z: 72, datumId: "detail_kill_zone_turret_02" },
  ];
  for (const placement of placements) {
    const placeholder = objectById.get(placement.datumId);
    if (placeholder) placeholder.visible = false;
    const instance = source.clone(true);
    instance.name = placement.id;
    instance.scale.setScalar(scale);
    instance.position.set(placement.x, 0, placement.z);
    instance.rotation.y = Math.PI / 2;
    instance.userData.authoringRecord = {
      type: "asset",
      id: placement.id,
      displayName: asset.displayName,
      kind: asset.kind,
      source: asset.source,
      localPath: asset.localPath,
      license: asset.license,
      role: `Original static turret GLB replacing ${placement.datumId} at the closed perimeter kill zone.`,
      runtimeNote: asset.runtimeNote,
    } satisfies AuthoringAssetRecord & { type: "asset" };
    configureLoadedModel(instance);
    assetObjects.push(instance);
    selectableObjects.push(instance);
    objectById.set(placement.id, instance);
    scene.add(instance);
  }
}

async function loadBarrel03Candidate() {
  if (urlParams.get("barrelCandidate") !== "prepared") return;
  const foregroundServiceCage = scene.getObjectByName("density_arrival_foreground_service_cage");
  if (!foregroundServiceCage) throw new Error("Foreground service cage unavailable for Barrel 03 candidate");
  const source = (await new GLTFLoader().loadAsync("/assets/models/polyhaven/barrel_03/candidates/barrel_03_prepared.glb")).scene;
  source.updateMatrixWorld(true);
  const sourceBounds = new THREE.Box3().setFromObject(source);
  const sourceSize = sourceBounds.getSize(new THREE.Vector3());
  const scale = 0.76 / Math.max(0.01, Math.max(sourceSize.x, sourceSize.z));
  for (const [index, placement] of [[0, [-1.25, 0, 0.08]], [1, [0, 0, -0.04]], [2, [1.25, 0, -0.08]]] as Array<[number, [number, number, number]]>) {
    const instance = source.clone(true);
    instance.name = `asset_polyhaven_barrel_03_arrival_apron_${index}`;
    instance.scale.setScalar(scale);
    instance.position.set(placement[0], 0, placement[1]);
    instance.rotation.y = placement[2];
    instance.userData.authoringRecord = {
      type: "asset",
      id: instance.name,
      displayName: "Poly Haven Barrel 03 / Prepared 1K",
      kind: "MODEL",
      source: "https://polyhaven.com/a/barrel_03",
      localPath: "/assets/models/polyhaven/barrel_03/candidates/barrel_03_prepared.glb",
      license: "CC0",
      role: "Opt-in camera-visible occupancy replacement for one foreground service-cage steel drum; does not become gameplay cover or alter the service apron layout.",
      runtimeNote: "Prepared through portable Blender 5.2.0 LTS with bottom-center pivot, packed 1K maps, 3052 triangles, and an 1831-triangle LOD candidate.",
    } satisfies AuthoringAssetRecord & { type: "asset" };
    configureLoadedModel(instance);
    assetObjects.push(instance);
    selectableObjects.push(instance);
    objectById.set(instance.name, instance);
    foregroundServiceCage.add(instance);
  }
  for (const x of [-1.25, 0, 1.25]) {
    const body = scene.getObjectByName(`density_arrival_foreground_service_cage_drum_body_${x}`);
    const band = scene.getObjectByName(`density_arrival_foreground_service_cage_drum_band_${x}`);
    if (body) body.visible = false;
    if (band) band.visible = false;
  }
}

async function loadOriginalBlenderHeroVehicle() {
  const heroVehicleMode = urlParams.get("heroVehicle") ?? "gmc";
  if (heroVehicleMode !== "blender" && heroVehicleMode !== "blender_bevel" && heroVehicleMode !== "gmc" && heroVehicleMode !== "zuk") return;
  try {
    const blenderHeroPath = heroVehicleMode === "gmc"
      ? "/assets/models/sketchfab_gmc_motorhome/candidates/gmc_motorhome_prepared_grounded.glb"
      : heroVehicleMode === "zuk"
        ? "/assets/models/sketchfab_zuk/candidates/zuk_prepared_grounded.glb"
        : heroVehicleMode === "blender_bevel"
          ? "/assets/models/original_service_van/candidates/vexea_service_van_prepared_bevel.glb"
          : "/assets/models/original_service_van/candidates/vexea_service_van_prepared.glb";
    const gltf = await new GLTFLoader().loadAsync(blenderHeroPath);
    const instance = gltf.scene;
    const isGmc = heroVehicleMode === "gmc";
    const isZuk = heroVehicleMode === "zuk";
    instance.name = isGmc ? "asset_sketchfab_gmc_arrival_environment_vehicle" : isZuk ? "asset_sketchfab_zuk_arrival_environment_vehicle" : "density_arrival_original_blender_hero_service_van";
    instance.scale.setScalar(isGmc ? 0.67 : isZuk ? 0.84 : 0.72);
    instance.position.set(isGmc ? -383.3 : isZuk ? -383.9 : -383.9, 0, isGmc ? 215.4 : isZuk ? 215.25 : 215.25);
    instance.rotation.y = isGmc ? 0.06 + Math.PI : isZuk ? -0.18 + Math.PI : -0.18 + Math.PI;
    instance.userData.visualLayer = "authored-vehicle-detail";
    instance.userData.presentationModule = isGmc ? "authenticated Sketchfab GMC Motorhome environment vehicle candidate" : isZuk ? "authenticated Sketchfab Żuk environment vehicle candidate" : "original portable-Blender hero service van candidate";
    instance.userData.provenance = isGmc
      ? "Lionsharp Studios Sketchfab GMC model, downloaded from the authenticated public page and prepared through portable Blender 5.2.0 LTS; CC BY 4.0 attribution required."
      : isZuk
        ? "Lionsharp Studios Sketchfab Żuk model, downloaded from the authenticated public page and prepared through portable Blender 5.2.0 LTS; CC BY 4.0 attribution required."
        : "Original mesh authored from scratch in portable Blender 5.2.0 LTS; prepared with bottom-center pivot, bevel, and LOD manifest.";
    instance.userData.license = isGmc || isZuk ? "CC-BY-4.0" : "ORIGINAL";
    configureLoadedModel(instance);
    const proceduralHero = scene.getObjectByName("density_arrival_authored_hero_service_van_reset");
    if (proceduralHero) proceduralHero.visible = false;
    const proceduralHeroShadow = scene.getObjectByName("density_arrival_authored_hero_service_van_reset_contact_shadow");
    if (proceduralHeroShadow) proceduralHeroShadow.visible = false;
    detailObjects.push(instance);
    scene.add(instance);
    addArrivalContactShadow(instance, "density_arrival_original_blender_hero_service_van_contact_shadow", { x: 0, z: 0 }, 5.2, 2.85, 0, 0.7);
    environmentDiagnostics.push("ORIGINAL_HERO_VAN:OK");
  } catch (error) {
    environmentDiagnostics.push(`ORIGINAL_HERO_VAN:FAIL ${String(error)}`);
    console.error("[MapAuthoring] Original Blender hero van unavailable; keeping procedural hero.", error);
  }
}

async function loadSecondarySourcedVehicle() {
  const secondaryVehicleMode = urlParams.get("secondaryVehicle") ?? (fullQualityPresentation ? "fiat" : "off");
  if (secondaryVehicleMode !== "zuk" && secondaryVehicleMode !== "fiat") return;
  const isFiat = secondaryVehicleMode === "fiat";
  const sourcePath = isFiat
    ? "/assets/models/sketchfab_fiat_punto_gt/candidates/fiat_punto_gt_prepared_grounded.glb"
    : "/assets/models/sketchfab_zuk/candidates/zuk_prepared_grounded.glb";
  const source = (await new GLTFLoader().loadAsync(sourcePath)).scene;
  const instance = source.clone(true);
  instance.name = isFiat ? "asset_sketchfab_fiat_arrival_secondary_environment_vehicle" : "asset_sketchfab_zuk_arrival_secondary_environment_vehicle";
  instance.scale.setScalar(isFiat ? 1.0 : 0.62);
  instance.position.set(isFiat ? -371.5 : -371.5, 0, isFiat ? 212.5 : 212.5);
  instance.rotation.y = (isFiat ? 0.12 : 0.12) + Math.PI;
  instance.userData.visualLayer = "street-story-density";
  instance.userData.presentationModule = isFiat
    ? "authenticated Sketchfab Fiat Punto GT secondary arrival environment vehicle"
    : "authenticated Sketchfab Żuk secondary arrival environment vehicle";
  instance.userData.authoringRecord = {
    type: "asset",
    id: instance.name,
    displayName: isFiat ? "Lionsharp Fiat Punto GT / Prepared Secondary Environment Vehicle" : "Lionsharp Żuk / Prepared Secondary Environment Vehicle",
    kind: "MODEL",
    source: isFiat
      ? "https://sketchfab.com/3d-models/free-1995-fiat-punto-gt-48db6facb4b64e99b60f36b8c01185e1"
      : "https://sketchfab.com/3d-models/free-zuk-3d-model-bb4OJb5V4L0hgYjM3vtGvPB7ZMt",
    localPath: sourcePath,
    license: "CC-BY-4.0",
    role: isFiat
      ? "Presentation-only parked-worker car that tests a lighter, lower silhouette in the arrival background without changing gameplay traffic placement or active environment asset records."
      : "Presentation-only background utility vehicle that adds real-world occupancy behind the GMC hero without changing gameplay traffic placement or active environment asset records.",
    runtimeNote: isFiat
      ? "Authenticated source, attribution logged in vehicle-source-research-2026-08-23.md; prepared through portable Blender 5.2.0 LTS with grounded bottom-center pivot and runtime LOD. Enable with secondaryVehicle=fiat or disable with secondaryVehicle=off."
      : "Authenticated source, attribution logged in vehicle-source-research-2026-08-23.md; prepared through portable Blender 5.2.0 LTS with grounded bottom-center pivot and runtime LOD. Disable with secondaryVehicle=off.",
  } satisfies AuthoringAssetRecord & { type: "asset" };
  configureLoadedModel(instance);
  detailObjects.push(instance);
  selectableObjects.push(instance);
  objectById.set(instance.name, instance);
  scene.add(instance);
  addArrivalContactShadow(
    instance,
    `${instance.name}_contact_shadow`,
    { x: 0, z: 0 },
    isFiat ? 3.3 : 4.2,
    isFiat ? 1.8 : 2.2,
    0,
    isFiat ? 0.42 : 0.48,
  );
  environmentDiagnostics.push(isFiat ? "SECONDARY_FIAT:OK" : "SECONDARY_ZUK:OK");
}

async function loadPolyhavenModularFactoryFacadeCandidate() {
  const modularFacadeMode = urlParams.get("modularFacade") ?? "off";
  if (modularFacadeMode !== "on" && modularFacadeMode !== "assembled") return;
  const isAssembled = modularFacadeMode === "assembled";
  const facadePath = isAssembled
    ? "/assets/models/polyhaven_modular_factory_facade/candidates/modular_factory_facade_arrival_assembly_prepared.glb"
    : "/assets/models/polyhaven_modular_factory_facade/candidates/modular_factory_facade_prepared_mobile.glb";
  const gltf = await new GLTFLoader().loadAsync(facadePath);
  const instance = gltf.scene;
  instance.name = isAssembled ? "asset_polyhaven_modular_factory_facade_arrival_assembly_candidate" : "asset_polyhaven_modular_factory_facade_arrival_candidate";
  instance.scale.setScalar(isAssembled ? 1.0 : 0.58);
  instance.position.set(-354, 0, 211);
  instance.rotation.y = 0.56 + Math.PI;
  instance.userData.visualLayer = "street-canyon-facade-massing";
  instance.userData.presentationModule = isAssembled ? "Poly Haven Modular Factory Facade selective assembled arrival candidate" : "Poly Haven Modular Factory Facade whole-kit diagnostic candidate";
  instance.userData.authoringRecord = {
    type: "asset",
    id: instance.name,
    displayName: isAssembled ? "Poly Haven Modular Factory Facade / Selective Assembly / 2K" : "Poly Haven Modular Factory Facade / Whole Kit / 2K",
    kind: "MODEL",
    source: "https://polyhaven.com/a/modular_factory_facade",
    localPath: facadePath,
    license: "CC0",
    role: "Opt-in presentation replacement for the camera-dominant right arrival shell; uses the verified CC0 modular brick, loading-door, garage, trim, and window PBR families without changing gameplay mass records.",
    runtimeNote: isAssembled
      ? "Selective assembly of real Poly Haven garage-bay, brick, and window modules through portable Blender 5.2.0 LTS; 70,940 prepared triangles, 35,453 LOD triangles, 13 embedded images, 15m height, and bottom-center pivot. Enable with modularFacade=assembled."
      : "Prepared from the official 2K Poly Haven glTF through portable Blender 5.2.0 LTS; 104,654 prepared triangles, 52,296 LOD triangles, 15 embedded images, and bottom-center pivot. Whole-kit layout is diagnostic-only; enable with modularFacade=on.",
  } satisfies AuthoringAssetRecord & { type: "asset" };
  configureLoadedModel(instance);
  const resetFrontage = scene.getObjectByName("density_arrival_right_frontage_visual_reset");
  if (resetFrontage) resetFrontage.visible = false;
  detailObjects.push(instance);
  selectableObjects.push(instance);
  objectById.set(instance.name, instance);
  scene.add(instance);
  environmentDiagnostics.push("MODULAR_FACTORY_FACADE:OK");
}

const polyhavenFactoryThresholdAsset = {
  id: "asset_polyhaven_modular_factory_threshold_subset_2k",
  displayName: "Poly Haven Modular Factory Facade / Loading-Bay Threshold Subset / 2K",
  kind: "MODEL",
  source: "https://polyhaven.com/a/modular_factory_facade",
  localPath: "/assets/models/polyhaven/modular_factory_facade/modular_factory_facade_1k.gltf",
  license: "CC0",
  role: "Camera-facing loading-bay threshold attached to the right service hall; replaces one repetitive frontage rhythm with a real garage-door, plinth, parapet, mullion, and canopy assembly while the existing volumetric hall remains the depth and closure owner.",
  runtimeNote: "Explicit six-mesh subset exported from the official Poly Haven Modular Factory Facade prepared assembly through portable Blender 5.2.0 LTS. One 2K garage-door material family plus five low-triangle structural frame modules; presentation-only, page-local, frustum-culled, and excluded from the active gameplay environment-asset contract.",
} satisfies AuthoringAssetRecord;

async function loadPolyhavenFactoryThresholdSubset() {
  const asset = polyhavenFactoryThresholdAsset;
  const gltf = await new GLTFLoader().loadAsync(asset.localPath);
  const instance = gltf.scene;
  instance.name = "asset_polyhaven_factory_threshold_subset";
  instance.scale.setScalar(1.0);
  instance.position.set(-354, 0, 211);
  instance.rotation.y = 0.56 + Math.PI;
  instance.userData.visualLayer = "arrival-service-threshold-subset";
  instance.userData.presentationModule = "Poly Haven selective loading-bay threshold subset";
  instance.userData.authoringRecord = {
    type: "asset",
    id: instance.name,
    displayName: asset.displayName,
    kind: asset.kind,
    source: asset.source,
    localPath: asset.localPath,
    license: asset.license,
    role: asset.role,
    runtimeNote: asset.runtimeNote,
  } satisfies AuthoringAssetRecord & { type: "asset" };
  instance.userData.hostId = "arrival_slice_right_service_hall";
  instance.userData.anchor = "arrival_slice_right_service_hall";
  instance.userData.supportClass = "GROUNDED";
  configureLoadedModel(instance);
  const rebuild = scene.getObjectByName("arrival_service_slice_rebuild");
  (rebuild ?? scene).add(instance);
  assetObjects.push(instance);
  selectableObjects.push(instance);
  objectById.set(instance.name, instance);
  const hall = scene.getObjectByName("arrival_slice_right_service_hall");
  for (const name of [
    "arrival_slice_bay_1_recess",
    "arrival_slice_bay_1_header",
    "arrival_slice_bay_1_canopy",
    "arrival_slice_bay_1_threshold",
    "arrival_slice_bay_1_safety_band",
    "arrival_slice_bay_1_work_light",
    "arrival_slice_bay_1_jamb_left",
    "arrival_slice_bay_1_jamb_right",
  ]) {
    hall?.getObjectByName(name) && (hall.getObjectByName(name)!.visible = false);
  }
  environmentDiagnostics.push("MODULAR_FACTORY_FACADE:OK");
}

async function loadFullMapPreparedTrees(parkDirtColor: THREE.Texture, parkDirtNormal: THREE.Texture, parkDirtRoughness: THREE.Texture) {
  const preparedTreePath = "/assets/models/polyhaven/tree_small_02_lod/served_512/tree_small_02_distance_lod_012_512.gltf";
  const preparedGltf = await new GLTFLoader().loadAsync(preparedTreePath);
  const source = preparedGltf.scene;
  source.updateMatrixWorld(true);
  const sourceBounds = new THREE.Box3().setFromObject(source);
  const sourceSize = sourceBounds.getSize(new THREE.Vector3());
  const normalizeTree = (tree: THREE.Object3D, targetHeight: number) => {
    tree.updateMatrixWorld(true);
    tree.scale.setScalar(targetHeight / Math.max(0.01, sourceSize.y));
    tree.updateMatrixWorld(true);
    const bounds = new THREE.Box3().setFromObject(tree);
    const center = bounds.getCenter(new THREE.Vector3());
    tree.position.set(-center.x, -bounds.min.y, -center.z);
    return tree;
  };
  const placements = [
    { id: "asset_full_map_insertion_tree", x: -340, z: 184, height: 8.4, rotation: -0.14, host: "space_insertion_edge", edge: "insertion planted verge" },
    { id: "asset_full_map_service_court_tree", x: -158, z: 138, height: 7.2, rotation: 0.24, host: "space_service_district", edge: "service court planted verge" },
    { id: "asset_full_map_pressure_yard_tree", x: 82, z: 184, height: 9.0, rotation: -0.32, host: "space_open_pressure_yard", edge: "pressure yard north planted verge" },
    { id: "asset_full_map_pressure_yard_service_tree", x: 60, z: 176, height: 8.6, rotation: 0.12, host: "dense_surface_pressure_yard", edge: "pressure yard southwest planted verge" },
    { id: "asset_full_map_plant_verge_tree", x: 330, z: 118, height: 8.0, rotation: 0.18, host: "space_industrial_plant", edge: "plant edge planted verge" },
    { id: "asset_full_map_core_yard_tree", x: -102, z: -230, height: 7.4, rotation: -0.22, host: "space_core_complex", edge: "core yard planted verge" },
  ];
  for (const placement of placements) {
    const closeTree = normalizeTree(source.clone(true), placement.height);
    const farTree = normalizeTree(source.clone(true), placement.height);
    const lod = new THREE.LOD();
    lod.name = placement.id;
    lod.position.set(placement.x, 0, placement.z);
    lod.rotation.y = placement.rotation;
    lod.addLevel(closeTree, 0);
    lod.addLevel(farTree, 42);
    lod.userData.fullMapSourcedVegetation = true;
    lod.userData.hostId = placement.host;
    lod.userData.hostSocket = placement.edge;
    lod.userData.supportClass = "GROUNDED";
    lod.userData.pressurePlantAssetRole = "sourced_realistic_full_map_edge_tree";
    lod.userData.authoringRecord = {
      type: "asset",
      id: lod.name,
      displayName: "Poly Haven Tree Small 02 / Prepared 512 full-map sourced clone",
      kind: "MODEL",
      source: "https://polyhaven.com/a/tree_small_02",
      localPath: preparedTreePath,
      license: "CC0",
      role: `Sourced presentation-only vegetation at the ${placement.edge}; it is not cover and does not alter route or gameplay truth.`,
      runtimeNote: `One source-derived prepared 512 GLTF load cloned into six deliberate full-map planted edges; target height ${placement.height.toFixed(1)} m, bottom-center contact solved, and LOD swaps at 42 m.`,
    } satisfies AuthoringAssetRecord & { type: "asset" };
    configureLoadedModel(lod);

    const island = new THREE.Mesh(
      new RoundedBoxGeometry(13.5, 0.18, 9.5, 0.8, 3),
      new THREE.MeshStandardMaterial({
        map: cloneTiledTexture(parkDirtColor, 2.4, 1.8, THREE.SRGBColorSpace),
        normalMap: cloneTiledTexture(parkDirtNormal, 2.4, 1.8),
        roughnessMap: cloneTiledTexture(parkDirtRoughness, 2.4, 1.8),
        color: 0x8a7454,
        roughness: 0.96,
        metalness: 0.01,
      }),
    );
    island.name = `${placement.id}_park_dirt_island`;
    island.position.set(placement.x, 0.09, placement.z);
    island.rotation.y = placement.rotation * 0.35;
    island.receiveShadow = true;
    island.userData.visualLayer = "full-map-park-dirt-planting-island";
    island.userData.hostId = placement.host;
    island.userData.supportClass = "GROUNDED";
    island.userData.sourceAsset = "asset_polyhaven_park_dirt_2k";

    const curb = new THREE.Mesh(
      new RoundedBoxGeometry(14.2, 0.28, 10.2, 0.7, 3),
      new THREE.MeshStandardMaterial({ color: 0x6d7168, roughness: 0.88, metalness: 0.18 }),
    );
    curb.name = `${placement.id}_concrete_edge`;
    curb.position.set(placement.x, 0.14, placement.z);
    curb.rotation.y = island.rotation.y;
    curb.userData.visualLayer = "full-map-planting-island-concrete-edge";
    curb.userData.hostId = placement.host;
    curb.userData.supportClass = "GROUNDED";

    const planting = new THREE.Group();
    planting.name = `${placement.id}_grounded_planting_system`;
    planting.userData.visualLayer = "full-map-grounded-sourced-vegetation";
    planting.userData.hostId = placement.host;
    planting.add(curb, island, lod);
    scene.add(planting);
    assetObjects.push(lod);
    selectableObjects.push(lod);
    objectById.set(lod.name, lod);
  }
  environmentDiagnostics.push("FULL_MAP_TREES:OK");
}

async function loadApprovedDenseSourcedTreesLite() {
  try {
    const textureLoader = new THREE.TextureLoader();
    const [parkDirtColor, parkDirtNormal, parkDirtRoughness] = await Promise.all([
      textureLoader.loadAsync("/assets/materials/polyhaven/park_dirt/park_dirt_diff_2k.jpg"),
      textureLoader.loadAsync("/assets/materials/polyhaven/park_dirt/park_dirt_nor_gl_2k.jpg"),
      textureLoader.loadAsync("/assets/materials/polyhaven/park_dirt/park_dirt_rough_2k.jpg"),
    ]);
    await loadFullMapPreparedTrees(parkDirtColor, parkDirtNormal, parkDirtRoughness);
    environmentDiagnostics.push("FULL_MAP_TREES:OK");
    requestRender();
  } catch (error) {
    environmentDiagnostics.push(`FULL_MAP_TREES:FAIL ${String(error)}`);
    console.error("[MapAuthoring] Approved dense sourced vegetation unavailable; keeping planted-edge records.", error);
  }
}

async function loadApprovedDenseSourcedOccupancyLite() {
  const root = new THREE.Group();
  root.name = "approved_dense_sourced_occupancy";
  root.userData.visualLayer = "approved-dense-sourced-occupancy";
  const placements = [
    { id: "asset_approved_dense_forklift", path: "/assets/models/sketchfab/warehouse_forklift_gameready/warehouse_forklift_gameready_1k.glb", x: 84, z: 124, maxSpan: 5.5, yaw: 0, displayName: "Warehouse Forklift Gameready / 1K", source: "https://sketchfab.com/3d-models/warehouse-forklift-gameready", license: "CC-BY-4.0", },
    { id: "asset_approved_dense_generator", path: "/assets/models/polyhaven/portable_generator/portable_generator_1k.gltf", x: 120, z: 124, maxSpan: 2.2, yaw: -Math.PI * 0.18, displayName: "Poly Haven Portable Generator / 1K", source: "https://polyhaven.com/a/portable_generator", license: "CC0" },
    { id: "asset_approved_dense_welding_cart", path: "/assets/models/polyhaven/portable_welding_cart/portable_welding_cart_1k.gltf", x: 108, z: 124, maxSpan: 3.0, yaw: Math.PI * 0.16, displayName: "Poly Haven Portable Welding Cart / 1K", source: "https://polyhaven.com/a/portable_welding_cart", license: "CC0" },
    { id: "asset_approved_dense_storage_cart", path: "/assets/models/polyhaven/industrial_storage_cart/industrial_storage_cart_1k.gltf", x: 96, z: 124, maxSpan: 3.0, yaw: Math.PI * 0.22, displayName: "Poly Haven Industrial Storage Cart / 1K", source: "https://polyhaven.com/a/industrial_storage_cart", license: "CC0" },
  ];
  for (const placement of placements) {
    try {
      const gltf = await new GLTFLoader().loadAsync(placement.path);
      const instance = gltf.scene;
      instance.name = placement.id;
      instance.updateMatrixWorld(true);
      const sourceBounds = new THREE.Box3().setFromObject(instance);
      const sourceSize = sourceBounds.getSize(new THREE.Vector3());
      instance.scale.setScalar(placement.maxSpan / Math.max(0.01, Math.max(sourceSize.x, sourceSize.z)));
      instance.position.set(0, 0, 0);
      instance.rotation.y = placement.yaw;
      instance.updateMatrixWorld(true);
      const bounds = new THREE.Box3().setFromObject(instance);
      const center = bounds.getCenter(new THREE.Vector3());
      instance.position.set(placement.x - center.x, -bounds.min.y, placement.z - center.z);
      instance.updateMatrixWorld(true);
      instance.userData.visualLayer = "approved-dense-sourced-occupancy";
      instance.userData.supportClass = "GROUNDED";
      instance.userData.hostId = "approved_dense_service_hardstand";
      instance.userData.hostSocket = "service_hardstand_floor";
      instance.userData.sourceAsset = placement.id;
      instance.userData.authoringRecord = { type: "asset", id: placement.id, displayName: placement.displayName, kind: "MODEL", source: placement.source, localPath: placement.path, license: placement.license as "CC0" | "CC-BY-4.0" | "ORIGINAL", role: "Presentation-only functional service occupancy on the approved dense map; not cover, not a route anchor, and not gameplay truth.", runtimeNote: `Uniform bounds normalization to ${placement.maxSpan.toFixed(2)} m maximum horizontal span, bottom-contact solved at world (${placement.x},0,${placement.z}), and fixed service-hardstand yaw.` } satisfies AuthoringAssetRecord & { type: "asset" };
      configureLoadedModel(instance);
      root.add(instance);
      assetObjects.push(instance);
      selectableObjects.push(instance);
      objectById.set(instance.name, instance);
    } catch (error) {
      environmentDiagnostics.push(`APPROVED_DENSE_OCCUPANCY_FAIL:${placement.id}`);
      console.warn(`[MapAuthoring] Approved dense occupancy unavailable for ${placement.id}`, error);
    }
  }
  if (root.children.length > 0) {
    scene.add(root);
    environmentDiagnostics.push(`APPROVED_DENSE_OCCUPANCY:OK:${root.children.length}`);
    requestRender();
  }
}

async function loadApprovedDenseFacadePbrLite() {
  try {
    const textureLoader = new THREE.TextureLoader();
    const [factoryColor, factoryNormal, factoryRoughness] = await Promise.all([
      textureLoader.loadAsync("/assets/materials/polyhaven/factory_wall/factory_wall_diff_2k.jpg"),
      textureLoader.loadAsync("/assets/materials/polyhaven/factory_wall/factory_wall_nor_gl_2k.jpg"),
      textureLoader.loadAsync("/assets/materials/polyhaven/factory_wall/factory_wall_rough_2k.jpg"),
    ]);
    applyApprovedDenseFacadePbr(factoryColor, factoryNormal, factoryRoughness);
    environmentDiagnostics.push("APPROVED_DENSE_PBR:OK");
    requestRender();
  } catch (error) {
    environmentDiagnostics.push(`APPROVED_DENSE_PBR:FAIL ${String(error)}`);
    console.error("[MapAuthoring] Approved dense lightweight Factory Wall pass unavailable; retaining solid authored facade materials.", error);
  }
}

async function loadApprovedDenseGroundMaterialsLite() {
  try {
    const textureLoader = new THREE.TextureLoader();
    const [roadColor, roadNormal, roadRoughness, dirtColor, dirtNormal, dirtRoughness] = await Promise.all([
      textureLoader.loadAsync("/assets/materials/ambientcg/road012a/Road012A_2K-JPG_Color.jpg"),
      textureLoader.loadAsync("/assets/materials/ambientcg/road012a/Road012A_2K-JPG_NormalGL.jpg"),
      textureLoader.loadAsync("/assets/materials/ambientcg/road012a/Road012A_2K-JPG_Roughness.jpg"),
      textureLoader.loadAsync("/assets/materials/polyhaven/dirt_floor/dirt_floor_diff_2k.jpg"),
      textureLoader.loadAsync("/assets/materials/polyhaven/dirt_floor/dirt_floor_nor_gl_2k.jpg"),
      textureLoader.loadAsync("/assets/materials/polyhaven/dirt_floor/dirt_floor_rough_2k.jpg"),
    ]);
    for (const texture of [roadColor, roadNormal, roadRoughness]) {
      texture.wrapS = THREE.RepeatWrapping;
      texture.wrapT = THREE.RepeatWrapping;
      texture.repeat.set(4.2, 3.4);
    }
    for (const texture of [dirtColor, dirtNormal, dirtRoughness]) {
      texture.wrapS = THREE.RepeatWrapping;
      texture.wrapT = THREE.RepeatWrapping;
      texture.repeat.set(2.5, 2.5);
    }
    const road = new THREE.MeshStandardMaterial({ map: roadColor, normalMap: roadNormal, roughnessMap: roadRoughness, color: 0x6f7c77, roughness: 0.94, metalness: 0.02, normalScale: new THREE.Vector2(0.34, 0.34) });
    const mixed = new THREE.MeshStandardMaterial({ map: roadColor, normalMap: roadNormal, roughnessMap: roadRoughness, color: 0x7c8174, roughness: 0.92, metalness: 0.03, normalScale: new THREE.Vector2(0.24, 0.24) });
    const dirt = new THREE.MeshStandardMaterial({ map: dirtColor, normalMap: dirtNormal, roughnessMap: dirtRoughness, color: 0x8a7358, roughness: 0.95, metalness: 0, normalScale: new THREE.Vector2(0.46, 0.46) });
    const concrete = new THREE.MeshStandardMaterial({ color: 0x858a84, roughness: 0.9, metalness: 0.03, normalMap: dirtNormal, normalScale: new THREE.Vector2(0.08, 0.08) });
    const water = new THREE.MeshPhysicalMaterial({ color: 0x2c687a, roughness: 0.2, metalness: 0.18, transmission: 0.04, clearcoat: 0.32, clearcoatRoughness: 0.16 });
    const materialFor = (surface: string) => surface === "ASPHALT" ? road : surface === "DIRT" ? dirt : surface === "CONCRETE" ? concrete : surface === "WATER" ? water : mixed;
    let changed = 0;
    blockoutObjects.forEach((root) => root.traverse((object) => {
      if (!(object instanceof THREE.Mesh) || !object.userData.blockoutMesh) return;
      const record = object.userData.authoringRecord as { surface?: string } | undefined;
      const material = materialFor(record?.surface ?? "MIXED");
      object.material = material.clone();
      object.material.transparent = false;
      object.material.opacity = 1;
      object.material.depthTest = true;
      object.material.depthWrite = true;
      object.castShadow = true;
      object.receiveShadow = true;
      changed += 1;
    }));
    environmentDiagnostics.push(`APPROVED_DENSE_GROUND_PBR:OK:${changed}`);
    requestRender();
  } catch (error) {
    environmentDiagnostics.push(`APPROVED_DENSE_GROUND_PBR:FAIL ${String(error)}`);
    console.warn("[MapAuthoring] Approved dense ground PBR unavailable; retaining solid authored surface materials.", error);
  }
}

async function loadApprovedDenseServiceForecourt() {
  try {
    const textureLoader = new THREE.TextureLoader();
    const [color, normal, roughness] = await Promise.all([
      textureLoader.loadAsync("/assets/materials/ambientcg/road012a/Road012A_2K-JPG_Color.jpg"),
      textureLoader.loadAsync("/assets/materials/ambientcg/road012a/Road012A_2K-JPG_NormalGL.jpg"),
      textureLoader.loadAsync("/assets/materials/ambientcg/road012a/Road012A_2K-JPG_Roughness.jpg"),
    ]);
    for (const texture of [color, normal, roughness]) {
      texture.wrapS = THREE.RepeatWrapping;
      texture.wrapT = THREE.RepeatWrapping;
      texture.repeat.set(6.5, 5.2);
    }
    const root = new THREE.Group();
    root.name = "approved_dense_service_forecourt";
    root.userData.visualLayer = "approved-dense-service-forecourt";
    root.userData.hostId = "dense_surface_pressure_yard";
    root.userData.presentationOnly = true;
    root.userData.authoringRecord = { type: "blockout-detail", id: root.name, kind: "SURFACE_SEGMENT", role: "Presentation-only beveled camera-side service forecourt hosted by the pressure-yard surface; does not replace route or gameplay truth.", supportClass: "GROUNDED" };
    const material = new THREE.MeshStandardMaterial({ map: color, normalMap: normal, roughnessMap: roughness, color: 0x737b76, roughness: 0.96, metalness: 0.03, normalScale: new THREE.Vector2(0.28, 0.28) });
    const slab = new THREE.Mesh(new RoundedBoxGeometry(190, 0.18, 124, 2.2, 4), material);
    slab.name = "approved_dense_service_forecourt_beveled_surface";
    slab.position.set(80, 0.02, 183);
    slab.receiveShadow = true;
    slab.userData.visualDetail = "approved-dense-beveled-service-forecourt";
    slab.userData.hostId = "dense_surface_pressure_yard";
    root.add(slab);
    scene.add(root);
    environmentDiagnostics.push("APPROVED_DENSE_FORECOURT_PBR:OK");
    requestRender();
  } catch (error) {
    environmentDiagnostics.push(`APPROVED_DENSE_FORECOURT_PBR:FAIL ${String(error)}`);
    console.warn("[MapAuthoring] Approved dense service forecourt PBR unavailable; retaining named pressure-yard surface.", error);
  }
}

function addApprovedDenseServiceLighting() {
  addPracticalLight("approved_dense_loading_practical_left", { x: 80, y: 7.2, z: 109 }, 0xffbd72, 2.0, 18);
  addPracticalLight("approved_dense_loading_practical_mid", { x: 104, y: 7.2, z: 109 }, 0xffbd72, 2.2, 20);
  addPracticalLight("approved_dense_loading_practical_right", { x: 128, y: 7.2, z: 109 }, 0xffbd72, 1.8, 18);
  environmentDiagnostics.push("APPROVED_DENSE_SERVICE_LIGHTS:OK:3");
  requestRender();
}

function addApprovedDenseTerrainRidges() {
  const root = new THREE.Group();
  root.name = "approved_dense_terrain_ridges";
  root.userData.visualLayer = "approved-dense-terrain-ridges";
  root.userData.presentationOnly = true;
  const material = new THREE.MeshStandardMaterial({ color: 0x665b4c, roughness: 0.98, metalness: 0.02 });
  const createRidge = (id: string, length: number, depth: number, height: number, position: [number, number, number], rotationY: number) => {
    const shape = new THREE.Shape();
    shape.moveTo(-depth / 2, 0);
    shape.lineTo(depth / 2, 0);
    shape.lineTo(depth * 0.22, height);
    shape.lineTo(-depth * 0.28, height * 0.72);
    shape.closePath();
    const geometry = new THREE.ExtrudeGeometry(shape, { depth: length, bevelEnabled: true, bevelSegments: 2, bevelSize: 0.7, bevelThickness: 0.4, curveSegments: 2 });
    geometry.translate(0, 0, -length / 2);
    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = id;
    mesh.position.set(...position);
    mesh.rotation.y = rotationY;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.userData.visualDetail = "approved-dense-sloped-terrain-ridge";
    mesh.userData.authoringRecord = { type: "blockout-detail", id, kind: "TERRAIN_PRESENTATION", role: "Presentation-only sloped mountain/runoff ridge replacing the rectangular terrain panel in perspective; semantic terrain segment remains authoritative.", supportClass: "GROUNDED" };
    root.add(mesh);
  };
  createRidge("approved_dense_north_sloped_ridge", 780, 22, 14, [-20, 0, 294], Math.PI / 2);
  createRidge("approved_dense_south_sloped_ridge", 780, 24, 14, [-20, 0, -302], Math.PI / 2);
  createRidge("approved_dense_west_sloped_ridge", 500, 22, 14, [-418, 0, 20], 0);
  createRidge("approved_dense_east_sloped_ridge", 470, 22, 16, [418, 0, -10], 0);
  scene.add(root);
  environmentDiagnostics.push("APPROVED_DENSE_TERRAIN_RIDGES:OK:4");
}

async function loadApprovedDenseFencesLite() {
  try {
    const asset = environmentKit.assets.find((candidate) => candidate.id === "asset_polyhaven_chainlink_fence_1k");
    if (!asset) throw new Error("Approved dense chain-link fence asset is missing");
    const gltf = await new GLTFLoader().loadAsync(asset.localPath);
    const source = gltf.scene;
    source.updateMatrixWorld(true);
    const bounds = new THREE.Box3().setFromObject(source);
    const size = bounds.getSize(new THREE.Vector3());
    const scale = 8.1 / Math.max(0.01, Math.max(size.x, size.z));
    const root = new THREE.Group();
    root.name = "approved_dense_sourced_kill_zone_fences";
    root.userData.visualLayer = "approved-dense-sourced-kill-zone-fences";
    const placements = [
      { id: "asset_approved_dense_fence_west_kill_zone", hostId: "dense_kill_zone_west", x: -352, z: 107, yaw: 0.02, role: "Sourced chain-link closure on the west concealed kill-zone perimeter; visual cue only, semantic kill-zone record remains authoritative." },
      { id: "asset_approved_dense_fence_plant_kill_zone", hostId: "dense_kill_zone_plant", x: 220, z: -60, yaw: Math.PI / 2, role: "Sourced chain-link closure at the plant threshold kill-zone mouth; visual cue only, semantic kill-zone record remains authoritative." },
      { id: "asset_approved_dense_fence_core_approach", hostId: "dense_camera_sector_security", x: 38, z: -144, yaw: 0, role: "Sourced chain-link security boundary at the core approach camera sector; presentation-only boundary." },
    ];
    for (const placement of placements) {
      const instance = source.clone(true);
      instance.name = placement.id;
      instance.scale.setScalar(scale);
      instance.position.set(placement.x, 0, placement.z);
      instance.rotation.y = placement.yaw;
      instance.userData.hostId = placement.hostId;
      instance.userData.supportClass = "GROUNDED";
      instance.userData.authoringRecord = {
        type: "asset",
        id: placement.id,
        displayName: asset.displayName,
        kind: asset.kind,
        source: asset.source,
        localPath: asset.localPath,
        license: asset.license,
        role: placement.role,
        runtimeNote: "Bounds-normalized Poly Haven chain-link panel with bottom-contact world placement; not a semantic replacement for its host record.",
      } satisfies AuthoringAssetRecord & { type: "asset" };
      configureLoadedModel(instance);
      root.add(instance);
      assetObjects.push(instance);
      selectableObjects.push(instance);
      objectById.set(instance.name, instance);
    }
    scene.add(root);
    environmentDiagnostics.push("APPROVED_DENSE_FENCES:OK:3");
    requestRender();
  } catch (error) {
    environmentDiagnostics.push(`APPROVED_DENSE_FENCES:FAIL ${String(error)}`);
    console.warn("[MapAuthoring] Approved dense sourced fence cues unavailable; retaining named kill-zone records.", error);
  }
}

function addApprovedDenseServiceEdgeHierarchy() {
  const root = new THREE.Group();
  root.name = "approved_dense_service_edge_hierarchy";
  root.userData.visualLayer = "approved-dense-service-edge-hierarchy";
  root.userData.hostId = "dense_surface_pressure_yard";
  root.userData.authoringRecord = {
    type: "blockout-detail",
    id: root.name,
    kind: "SURFACE_EDGE",
    role: "Presentation-only curb, drainage, and loading-apron hierarchy for the approved pressure-yard hardstand; does not replace route or cover truth.",
    hostId: "dense_surface_pressure_yard",
    supportClass: "GROUNDED",
  };
  const curb = new THREE.MeshStandardMaterial({ color: 0x5e6965, roughness: 0.88, metalness: 0.08 });
  const drain = new THREE.MeshStandardMaterial({ color: 0x1c2626, roughness: 0.92, metalness: 0.3 });
  const apron = new THREE.MeshStandardMaterial({ color: 0x686f6b, roughness: 0.9, metalness: 0.1 });
  const marking = new THREE.MeshBasicMaterial({ color: 0xc49a45, toneMapped: false });
  const add = (id: string, geometry: THREE.BufferGeometry, material: THREE.Material, position: [number, number, number]) => {
    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = id;
    mesh.position.set(...position);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.userData.visualDetail = "approved-dense-service-edge";
    mesh.userData.hostId = "dense_surface_pressure_yard";
    root.add(mesh);
  };
  add("approved_dense_pressure_yard_east_curb", new RoundedBoxGeometry(1.8, 0.22, 35, 0.1, 2), curb, [137.1, 0.19, 124]);
  add("approved_dense_pressure_yard_north_curb", new RoundedBoxGeometry(98, 0.22, 1.8, 0.1, 2), curb, [88, 0.19, 107.8]);
  add("approved_dense_pressure_yard_east_drain", new RoundedBoxGeometry(0.22, 0.06, 34, 0.06, 2), drain, [136.0, 0.13, 124]);
  add("approved_dense_pressure_yard_north_drain", new RoundedBoxGeometry(97, 0.06, 0.22, 0.06, 2), drain, [88, 0.13, 106.8]);
  add("approved_dense_pressure_yard_loading_apron", new RoundedBoxGeometry(76, 0.14, 2.8, 0.16, 2), apron, [86, 0.11, 109.8]);
  for (const x of [62, 86, 110]) add(`approved_dense_loading_bay_marking_${x}`, new RoundedBoxGeometry(10, 0.035, 0.18, 0.04, 1), marking, [x, 0.2, 108.65]);
  const canopySteel = new THREE.MeshStandardMaterial({ color: 0x34403f, roughness: 0.76, metalness: 0.56 });
  add("approved_dense_loading_canopy_roof", new RoundedBoxGeometry(58, 0.28, 10, 0.22, 3), canopySteel, [96, 6.7, 124]);
  add("approved_dense_loading_canopy_front_beam", new RoundedBoxGeometry(58, 0.34, 0.34, 0.1, 2), canopySteel, [96, 5.8, 129]);
  for (const x of [70, 96, 122]) add(`approved_dense_loading_canopy_post_${x}`, new RoundedBoxGeometry(0.4, 6.0, 0.4, 0.1, 2), canopySteel, [x, 3.0, 128.5]);
  scene.add(root);
  environmentDiagnostics.push("APPROVED_DENSE_EDGE_HIERARCHY:OK:13");
  environmentDiagnostics.push("APPROVED_DENSE_LOADING_CANOPY:OK:5");
}

async function loadApprovedDenseSourcedPipeSystemLite() {
  try {
    const asset = polyhavenIndustrialPipeKitAsset;
    const gltf = await new GLTFLoader().loadAsync(asset.localPath);
    const source = gltf.scene;
    source.updateMatrixWorld(true);
    const pipe02 = source.getObjectByName("modular_industrial_pipes_01_pipe02");
    const pipe05 = source.getObjectByName("modular_industrial_pipes_01_pipe05");
    const pipe08 = source.getObjectByName("modular_industrial_pipes_01_pipe08");
    if (!pipe02 || !pipe05 || !pipe08) throw new Error("Required approved dense pipe modules are missing");
    const root = new THREE.Group();
    root.name = "approved_dense_sourced_pipe_rack";
    root.position.set(130, 0.14, 132);
    root.rotation.y = 0;
    root.userData.visualLayer = "approved-dense-sourced-pipe-system";
    root.userData.hostId = "dense_surface_pressure_yard";
    root.userData.hostSocket = "pressure_yard_service_hardstand";
    root.userData.supportClass = "SUPPORTED";
    root.userData.authoringRecord = {
      type: "asset",
      id: root.name,
      displayName: asset.displayName,
      kind: asset.kind,
      source: asset.source,
      localPath: asset.localPath,
      license: asset.license,
      role: "Sourced modular pipe rack on the approved pressure-yard hardstand; presentation-only industrial service system, not cover or route truth.",
      runtimeNote: "Five selected Poly Haven modules at shared 0.72 scale with explicit grounded steel supports and bounds-safe hardstand placement.",
    } satisfies AuthoringAssetRecord & { type: "asset" };
    const rackScale = 0.72;
    const steel = new THREE.MeshStandardMaterial({ color: 0x3a4746, roughness: 0.72, metalness: 0.58 });
    const plateMaterial = new THREE.MeshStandardMaterial({ color: 0x4e5957, roughness: 0.82, metalness: 0.44 });
    for (const x of [-5.2, 0, 5.2]) {
      const post = new THREE.Mesh(new RoundedBoxGeometry(0.52, 7.2, 0.52, 0.12, 2), steel);
      post.position.set(x, 3.6, 0);
      post.castShadow = true;
      post.receiveShadow = true;
      root.add(post);
      const plate = new THREE.Mesh(new RoundedBoxGeometry(1.2, 0.16, 1.2, 0.08, 2), plateMaterial);
      plate.position.set(x, 0.08, 0);
      plate.castShadow = true;
      plate.receiveShadow = true;
      root.add(plate);
    }
    for (const y of [2.85, 5.1]) {
      const crossbar = new THREE.Mesh(new RoundedBoxGeometry(11.6, 0.24, 0.24, 0.08, 2), steel);
      crossbar.position.set(0, y, 0);
      crossbar.castShadow = true;
      crossbar.receiveShadow = true;
      crossbar.userData.visualDetail = "approved-dense-pipe-rack-supported-crossbar";
      root.add(crossbar);
    }
    const attach = (moduleSource: THREE.Object3D, id: string, position: [number, number, number], rotationY: number) => {
      const module = moduleSource.clone(true);
      module.name = id;
      module.position.set(...position);
      module.rotation.y = rotationY;
      module.scale.setScalar(rackScale);
      module.userData.sourcedAssetId = asset.id;
      module.userData.sourcedAssetSource = asset.source;
      module.userData.authoringRecord = {
        type: "asset",
        id,
        displayName: asset.displayName,
        kind: asset.kind,
        source: asset.source,
        localPath: asset.localPath,
        license: asset.license,
        role: "Sourced pipe rack module on the approved dense service hardstand.",
        runtimeNote: "Uniform rack scale, explicit steel support ownership, and fixed hardstand host socket.",
      } satisfies AuthoringAssetRecord & { type: "asset" };
      configureLoadedModel(module);
      root.add(module);
    };
    attach(pipe02, "asset_approved_dense_pipe_straight_low", [-5.2, 1.85, 0], Math.PI / 2);
    attach(pipe02, "asset_approved_dense_pipe_straight_mid", [0, 4.0, 0], Math.PI / 2);
    attach(pipe02, "asset_approved_dense_pipe_straight_high", [5.2, 6.15, 0], Math.PI / 2);
    attach(pipe05, "asset_approved_dense_pipe_elbow_valve", [5.2, 4.0, 0.82], 0);
    attach(pipe08, "asset_approved_dense_pipe_flanged_valve", [-5.2, 1.85, -0.82], 0);
    configureLoadedModel(root);
    assetObjects.push(root);
    selectableObjects.push(root);
    objectById.set(root.name, root);
    scene.add(root);
    environmentDiagnostics.push("APPROVED_DENSE_PIPING:OK:5");
    requestRender();
  } catch (error) {
    environmentDiagnostics.push(`APPROVED_DENSE_PIPING:FAIL ${String(error)}`);
    console.warn("[MapAuthoring] Approved dense sourced pipe system unavailable; retaining named pipe-rack blockout record.", error);
  }
}

async function loadApprovedDenseSkyOnly() {
  try {
    const hdri = await new HDRLoader().loadAsync("/assets/hdri/polyhaven/kloofendal_overcast_puresky_1k.hdr");
    hdri.mapping = THREE.EquirectangularReflectionMapping;
    scene.environment = hdri;
    scene.background = hdri;
    scene.environmentIntensity = 0.34;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.02;
    environmentDiagnostics.push("HDRI_PURE_SKY_OVERCAST:OK");
    requestRender();
  } catch (error) {
    environmentDiagnostics.push(`HDRI:FAIL ${String(error)}`);
    console.error("[MapAuthoring] Approved dense sky-only environment unavailable; keeping neutral blockout background.", error);
  }
}

async function loadEnvironmentKit() {  let loadedCount = 0;
  try {
    const textureLoader = new THREE.TextureLoader();
    const [factoryColor, factoryNormal, factoryRoughness, roadColor, roadNormal, roadRoughness, dirtFloorColor, dirtFloorNormal, dirtFloorRoughness, parkDirtColor, parkDirtNormal, parkDirtRoughness] = await Promise.all([
      textureLoader.loadAsync("/assets/materials/polyhaven/factory_wall/factory_wall_diff_2k.jpg"),
      textureLoader.loadAsync("/assets/materials/polyhaven/factory_wall/factory_wall_nor_gl_2k.jpg"),
      textureLoader.loadAsync("/assets/materials/polyhaven/factory_wall/factory_wall_rough_2k.jpg"),
      textureLoader.loadAsync("/assets/materials/ambientcg/road012a/Road012A_2K-JPG_Color.jpg"),
      textureLoader.loadAsync("/assets/materials/ambientcg/road012a/Road012A_2K-JPG_NormalGL.jpg"),
      textureLoader.loadAsync("/assets/materials/ambientcg/road012a/Road012A_2K-JPG_Roughness.jpg"),
      textureLoader.loadAsync("/assets/materials/polyhaven/dirt_floor/dirt_floor_diff_2k.jpg"),
      textureLoader.loadAsync("/assets/materials/polyhaven/dirt_floor/dirt_floor_nor_gl_2k.jpg"),
      textureLoader.loadAsync("/assets/materials/polyhaven/dirt_floor/dirt_floor_rough_2k.jpg"),
      textureLoader.loadAsync("/assets/materials/polyhaven/park_dirt/park_dirt_diff_2k.jpg"),
      textureLoader.loadAsync("/assets/materials/polyhaven/park_dirt/park_dirt_nor_gl_2k.jpg"),
      textureLoader.loadAsync("/assets/materials/polyhaven/park_dirt/park_dirt_rough_2k.jpg"),
    ]);
    if (pressurePlantSliceScope) {
      for (const texture of [factoryColor, factoryNormal, factoryRoughness, roadColor, roadNormal, roadRoughness, dirtFloorColor, dirtFloorNormal, dirtFloorRoughness, parkDirtColor, parkDirtNormal, parkDirtRoughness]) budgetPressureTexture(texture);
    }
    applyFacadeMaterial(factoryColor, factoryNormal, factoryRoughness);
    if ((orthographicBlockoutMode || approvedDenseVisualMode) && urlParams.get("densePbr") === "1") applyApprovedDenseFacadePbr(factoryColor, factoryNormal, factoryRoughness);
    applyArrivalCanyonFacadeMaterial(factoryColor, factoryNormal, factoryRoughness);
    const facadeTone = urlParams.get("facadeTone");
    let resetColor = factoryColor;
    let resetNormal = factoryNormal;
    let resetRoughness = factoryRoughness;
    if (facadeTone === "steel") {
      resetColor = await textureLoader.loadAsync("/assets/materials/polyhaven/factory_wall/factory_wall_diff_2k_steel_derivative.jpg");
    }
    if (facadeTone === "corrugated") {
      [resetColor, resetNormal, resetRoughness] = await Promise.all([
        textureLoader.loadAsync("/assets/materials/ambientcg/corrugatedsteel009/CorrugatedSteel009_2K-JPG_Color.jpg"),
        textureLoader.loadAsync("/assets/materials/ambientcg/corrugatedsteel009/CorrugatedSteel009_2K-JPG_NormalGL.jpg"),
        textureLoader.loadAsync("/assets/materials/ambientcg/corrugatedsteel009/CorrugatedSteel009_2K-JPG_Roughness.jpg"),
      ]);
    }
    applyArrivalResetFacadeMaterial(resetColor, resetNormal, resetRoughness);
    applyRoadMaterial(roadColor, roadNormal, roadRoughness);
    applyPressurePlantSliceAsphaltPbr(roadColor, roadNormal, roadRoughness);
    applyPressurePlantSliceFacadePbr(factoryColor, factoryNormal, factoryRoughness);
    applyPressurePlantSliceConcretePbr();
    applyPressurePlantSliceSoilPbr(dirtFloorColor, dirtFloorNormal, dirtFloorRoughness, parkDirtColor, parkDirtNormal, parkDirtRoughness);
    if (!pressurePlantSliceScope && !arrivalServiceSliceScope && !orthographicBlockoutMode) {
      try {
        await loadFullMapPreparedTrees(parkDirtColor, parkDirtNormal, parkDirtRoughness);
        loadedCount += 1;
      } catch (error) {
        environmentDiagnostics.push(`FULL_MAP_TREES:FAIL ${String(error)}`);
        console.warn("[MapAuthoring] Full-map prepared vegetation unavailable; keeping the tagged planted-edge records without vegetation.", error);
      }
    }
    applyArrivalServiceSliceRebuildMaterials(factoryColor, factoryNormal, factoryRoughness, roadColor, roadNormal, roadRoughness);
    applyCombatCoverMaterials(factoryColor, factoryNormal, factoryRoughness, roadColor, roadNormal, roadRoughness);
    loadedCount += 2;
    environmentDiagnostics.push("PBR:OK");
  } catch (error) {
    environmentDiagnostics.push(`PBR:FAIL ${String(error)}`);
    console.error("[MapAuthoring] PBR vertical slice unavailable; keeping procedural surface fallback.", error);
  }

  try {
    const hdriPath = "/assets/hdri/polyhaven/kloofendal_overcast_puresky_1k.hdr";
    const hdri = await new HDRLoader().loadAsync(hdriPath);
    hdri.mapping = THREE.EquirectangularReflectionMapping;
    scene.environment = hdri;
    if (urlParams.get("hdriBackground") !== "off") scene.background = hdri;
    scene.environmentIntensity = 0.34;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    const arrivalExposure = urlParams.get("exposure") === "dim" ? 0.96 : 1.04;
    renderer.toneMappingExposure = arrivalExposure;
    loadedCount += 1;
    environmentDiagnostics.push("HDRI_PURE_SKY_OVERCAST:OK");
  } catch (error) {
    environmentDiagnostics.push(`HDRI:FAIL ${String(error)}`);
    console.error("[MapAuthoring] Industrial HDRI unavailable; keeping procedural sky fallback.", error);
  }

  if (pressurePlantSliceScope) {
    try {
      await loadPressurePlantSliceAssets();
      loadedCount += 2;
    } catch (error) {
      environmentDiagnostics.push(`PRESSURE_SLICE_ASSETS:FAIL ${String(error)}`);
      console.error("[MapAuthoring] Pressure-plant prepared assets unavailable; keeping local procedural facades and cart fallback.", error);
    }
    statusMessage.textContent = `Pressure-plant visual pass ${loadedCount}/3 complete / ${environmentDiagnostics.join(" / ")}.`;
    requestRender();
    return;
  }

  const mapOverviewMode = urlParams.get("mapOverview") === "1" || ((orthographicBlockoutMode || approvedDenseVisualMode) && urlParams.get("denseDetail") === "1");
  if (!mapOverviewMode) {
  try {
    await loadIndustrialPipeKitAsset();
    environmentDiagnostics.push("PIPING:OK");
  } catch (error) {
    environmentDiagnostics.push(`PIPING:FAIL ${String(error)}`);
    console.error("[MapAuthoring] Poly Haven modular pipe kit unavailable; keeping the supported procedural rack pipe fallback.", error);
  }

  try {
    await loadFenceAsset();
    loadedCount += 1;
    environmentDiagnostics.push("MODEL:OK");
  } catch (error) {
    environmentDiagnostics.push(`MODEL:FAIL ${String(error)}`);
    console.error("[MapAuthoring] Chain-link model unavailable; keeping procedural perimeter fallback.", error);
  }

  try {
    await loadPortableGeneratorAsset();
    loadedCount += 1;
    environmentDiagnostics.push("PROP:OK");
  } catch (error) {
    environmentDiagnostics.push(`PROP:FAIL ${String(error)}`);
    console.error("[MapAuthoring] Portable generator unavailable; keeping procedural service-detail fallback.", error);
  }

  try {
    await loadKenneyArrivalVehicleAsset();
    await loadOriginalBlenderHeroVehicle();
    loadedCount += 1;
    environmentDiagnostics.push("VEHICLE:OK");
  } catch (error) {
    environmentDiagnostics.push(`VEHICLE:FAIL ${String(error)}`);
    console.error("[MapAuthoring] Kenney arrival vehicle unavailable; keeping procedural service-van fallback.", error);
  }

  try {
    await loadSecondarySourcedVehicle();
  } catch (error) {
    environmentDiagnostics.push(`SECONDARY_ZUK:FAIL ${String(error)}`);
    console.error("[MapAuthoring] Secondary Żuk unavailable; keeping the GMC hero without the background utility vehicle.", error);
  }

  try {
    await loadPolyhavenFactoryThresholdSubset();
  } catch (error) {
    environmentDiagnostics.push(`MODULAR_FACTORY_FACADE:FAIL ${String(error)}`);
    console.error("[MapAuthoring] Poly Haven loading-bay threshold subset unavailable; keeping the procedural hall frontage.", error);
  }

  try {
    await loadPolyhavenModularFactoryFacadeCandidate();
  } catch (error) {
    environmentDiagnostics.push(`MODULAR_FACTORY_FACADE_DIAGNOSTIC:FAIL ${String(error)}`);
    console.error("[MapAuthoring] Poly Haven Modular Factory Facade diagnostic candidate unavailable; keeping the selected threshold subset.", error);
  }

  try {
    await loadOldMilitaryCrateAsset();
    loadedCount += 1;
    environmentDiagnostics.push("CARGO:OK");
  } catch (error) {
    environmentDiagnostics.push(`CARGO:FAIL ${String(error)}`);
    console.error("[MapAuthoring] Old military crate unavailable; keeping procedural cargo fallback.", error);
  }
  try {
    await loadPortableWeldingCartAsset();
    loadedCount += 1;
    environmentDiagnostics.push("WELDING:OK");
  } catch (error) {
    environmentDiagnostics.push(`WELDING:FAIL ${String(error)}`);
    console.error("[MapAuthoring] Portable welding cart unavailable; keeping procedural workshop-detail fallback.", error);
  }
  try {
    await loadBarrel03Candidate();
    if (urlParams.get("barrelCandidate") === "prepared") {
      loadedCount += 1;
      environmentDiagnostics.push("BARREL_CANDIDATE:OK");
    }
  } catch (error) {
    environmentDiagnostics.push(`BARREL_CANDIDATE:FAIL ${String(error)}`);
    console.error("[MapAuthoring] Barrel 03 candidate unavailable; keeping the procedural apron drums.", error);
  }

  try {
    await loadSecurityCameraAsset();
    loadedCount += 1;
    environmentDiagnostics.push("SURVEILLANCE:OK");
  } catch (error) {
    environmentDiagnostics.push(`SURVEILLANCE:FAIL ${String(error)}`);
    console.error("[MapAuthoring] Security camera unavailable; keeping authored camera-housing placeholder.", error);
  }

  try {
    await loadStaticTurretAsset();
    loadedCount += 1;
    environmentDiagnostics.push("TURRET:OK");
  } catch (error) {
    environmentDiagnostics.push(`TURRET:FAIL ${String(error)}`);
    console.error("[MapAuthoring] Original static turret unavailable; keeping turret mount datum fallback.", error);
  }
  }
  if (mapOverviewMode) environmentDiagnostics.push("FULL_MAP_OPTIONAL_ASSET_LOADERS:SKIPPED");
  statusMessage.textContent = `Visual enhancement pass ${loadedCount}/9 complete / ${environmentDiagnostics.join(" / ")}.`;
  requestRender();
}

function blockoutMaterial(element: BlockoutElement, opacity: number) {
  const material = new THREE.MeshBasicMaterial({ color: element.color, transparent: true, opacity, depthWrite: !imageSemanticUnderlay, fog: false, side: THREE.DoubleSide });
  material.userData = { blockoutMaterial: true, blockoutBaseOpacity: opacity, blockoutXrayOpacity: Math.min(opacity * 0.62, 0.34) };
  return material;
}

function blockoutLabel(element: BlockoutElement) {
  const labelCanvas = document.createElement("canvas");
  labelCanvas.width = 768;
  labelCanvas.height = 128;
  const context = labelCanvas.getContext("2d");
  if (context) {
    context.clearRect(0, 0, labelCanvas.width, labelCanvas.height);
    context.fillStyle = "rgba(7,11,14,0.88)";
    context.fillRect(0, 0, labelCanvas.width, labelCanvas.height);
    context.strokeStyle = `#${element.color.toString(16).padStart(6, "0")}`;
    context.lineWidth = 3;
    context.strokeRect(2, 2, labelCanvas.width - 4, labelCanvas.height - 4);
    context.fillStyle = "#f0f4f3";
    context.font = "bold 22px IBM Plex Mono, monospace";
    context.fillText(element.name, 14, 31);
    context.fillStyle = `#${element.color.toString(16).padStart(6, "0")}`;
    context.font = "16px IBM Plex Mono, monospace";
    context.fillText(`${element.id}  /  REPLACE: ${element.replaceWith}`, 14, 58);
    context.fillStyle = "#aebbc0";
    context.font = "14px IBM Plex Mono, monospace";
    context.fillText(`DIM: ${element.sizeX} × ${element.height} × ${element.sizeZ} m  /  FLOORS: ${element.floors}  /  FLOOR H: ${element.floorHeight} m`, 14, 82);
    context.fillStyle = "#aebbc0";
    context.font = "13px IBM Plex Mono, monospace";
    context.fillText(`TAG: BLOCKOUT  ·  ${element.tags.slice(2, 6).join(" · ")}`, 14, 106);
  }
  const texture = new THREE.CanvasTexture(labelCanvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const material = new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: false, depthWrite: false, fog: false, opacity: 0.92 });
  const sprite = new THREE.Sprite(material);
  const labelWidth = Math.min(160, Math.max(72, element.name.length * 2.15 + 36));
  sprite.scale.set(labelWidth, 26, 1);
  sprite.userData.blockoutTag = true;
  sprite.userData.authoringRecord = { type: "blockout", ...element };
  return sprite;
}

function addBlockoutElement(root: THREE.Group, element: BlockoutElement) {
  // The orthographic image-first proof view must show only geometry actually emitted by
  // the OpenCV pipeline. Gameplay anchors and calibrated route chains remain in the
  // catalog for contract/traversal validation, but they are metadata until they have
  // a corresponding mask component; otherwise they visually masquerade as old layout.
  const isOpenCvGeometry = element.tags.includes("OPEN_CV_CONTOUR") || element.tags.includes("OPEN_CV_REGION");
  const isTraceableCleanup = element.tags.includes("CLEANUP_BLOCKING");
  const isTraceableStructure = element.tags.includes("STRUCTURE_BLOCKING");
  const isGameplayVolume = ["AIR_ACCESS", "GROUND_DEPLOYMENT", "KILL_ZONE", "CAMERA_SECTOR", "PLAYER_SPAWN"].includes(element.kind);
  const isApprovedDenseElement = element.tags.includes("APPROVED_DENSE_BLOCKOUT");
  if (orthographicBlockoutMode && !imageSeedOverlay && (!(isOpenCvGeometry || isTraceableCleanup || isTraceableStructure || isApprovedDenseElement) || (element.kind === "ROUTE_SEGMENT" && !isApprovedDenseElement) || element.tags.includes("IMAGE_MASK_FALLBACK"))) return;
  if (orthographicBlockoutMode && !imageSeedOverlay && isGameplayVolume && !blockoutVolumesOverlay) return;
  if (imageSemanticUnderlay && orthographicBlockoutMode && element.kind === "ROUTE_SEGMENT") return;
  const group = new THREE.Group();
  group.name = element.id;
  group.userData.blockout = true;
  group.userData.authoringRecord = { type: "blockout", ...element };
  const denseFabricElement = element.tags.includes("DENSE_FABRIC");
  const imageSeedElement = element.tags.includes("IMAGE_IMPORT_CANDIDATE");
  const imageDerivedElement = element.tags.includes("IMAGE_DERIVED");
  const imageFirstReadable = imageSemanticUnderlay && orthographicBlockoutMode;
  const baseOpacity = imageSeedElement
    ? 0.12
    : imageDerivedElement
              ? isTraceableStructure ? element.category === "blockout-floor-segment" ? 0.72 : element.category === "facade-non-enterable" ? 0.84 : element.category === "entrance-player" ? 0.94 : element.category === "stair-interior" ? 0.78 : 0.82 : element.kind === "BUILDING_MASS" ? (imageFirstReadable ? 0.06 : 0.98) : element.kind === "ROUTE_SEGMENT" ? 0 : element.kind === "COVER" ? (imageFirstReadable ? 0.36 : 0.76) : element.kind === "SURFACE_SEGMENT" ? element.category === "image-ground" ? (imageFirstReadable ? 0.10 : 0.22) : element.category === "image-route-surface" ? (imageFirstReadable ? 0.5 : 0.96) : element.category === "image-route-covered" ? (imageFirstReadable ? 0.42 : 0.88) : 0.24 : element.kind === "TERRAIN_SEGMENT" ? 0.28 : element.kind === "WATER_EDGE" ? 0.58 : element.kind === "AIR_ACCESS" || element.kind === "CAMERA_SECTOR" ? 0.035 : element.kind === "TUNNEL" ? 0.28 : 0.24

      : denseFabricElement
        ? element.kind === "BUILDING_MASS" ? 0.84 : element.kind === "SURFACE_SEGMENT" ? 0.58 : element.kind === "WALL_BOUNDARY" ? 0.82 : element.kind === "ROUTE_SEGMENT" ? 0.92 : element.kind === "COVER" ? 0.9 : 0.7
        : element.kind === "BUILDING_MASS" ? 0.48 : element.kind === "SURFACE_SEGMENT" ? 0.28 : element.kind === "TUNNEL" || element.kind === "AIR_ACCESS" || element.kind === "GROUND_DEPLOYMENT" || element.kind === "KILL_ZONE" || element.kind === "CAMERA_SECTOR" ? 0.24 : 0.6;
  const imageBuildingColor = element.height >= 36 ? 0xe8ecea : element.height >= 21 ? 0xb9c6c8 : element.height >= 11 ? 0x89999e : 0x6e7f84;
  const imageRoadColor = element.category === "image-route-covered"
    ? 0x4f776e
    : element.surface === "ASPHALT" ? 0xb88a3a
      : element.surface === "CONCRETE" ? 0x8b8e83
        : element.surface === "DIRT" ? 0x786449
          : element.surface === "MIXED" ? 0x6f816e
            : 0x687175;
  const imageGroundColor = element.surface === "ASPHALT" ? 0x354348 : element.surface === "CONCRETE" ? 0x8a8c82 : element.surface === "DIRT" ? 0x786449 : element.surface === "MIXED" ? 0x647568 : 0x687175;
  const imageTerrainColor = element.kind === "TERRAIN_SEGMENT" ? 0x76644f : element.kind === "WATER_EDGE" ? 0x2d6b82 : element.kind === "TUNNEL" ? 0x8476a1 : element.kind === "AIR_ACCESS" || element.kind === "CAMERA_SECTOR" ? 0x5e8c9b : element.color;
  const readableColor = element.category === "image-route-surface" || element.category === "image-route-covered"
    ? imageRoadColor
    : element.category === "image-ground" ? imageGroundColor
      : imageTerrainColor;
  const renderElement = imageDerivedElement && (element.kind === "BUILDING_MASS" || element.category === "image-route-surface" || element.category === "image-route-covered" || element.category === "image-ground" || ["TERRAIN_SEGMENT", "WATER_EDGE", "TUNNEL", "AIR_ACCESS", "CAMERA_SECTOR"].includes(element.kind))
    ? { ...element, color: element.kind === "BUILDING_MASS" ? imageBuildingColor : readableColor }
    : element;
  const solidApprovedElement = approvedDenseVisualMode && urlParams.get("solid") !== "0" && !isGameplayVolume && ["BUILDING_MASS", "SURFACE_SEGMENT", "ROUTE_SEGMENT", "COVER", "TERRAIN_SEGMENT", "WALL_BOUNDARY", "WATER_EDGE"].includes(element.kind);
  const material = blockoutMaterial(renderElement, solidApprovedElement ? Math.max(0.88, imageDerivedElement && element.kind === "BUILDING_MASS" && !imageFirstReadable ? 0.94 : baseOpacity) : imageDerivedElement && element.kind === "BUILDING_MASS" && !imageFirstReadable ? 0.94 : baseOpacity);
  if (solidApprovedElement) {
    material.transparent = false;
    material.depthTest = true;
    material.depthWrite = true;
  }
  if (imageDerivedElement && element.kind !== "BUILDING_MASS") {
    const isSurfaceLayer = !isTraceableStructure && (element.kind === "SURFACE_SEGMENT" || element.kind === "TERRAIN_SEGMENT" || element.kind === "WATER_EDGE" || element.kind === "TUNNEL");
    material.depthTest = !imageFirstReadable && !isSurfaceLayer;
    material.depthWrite = false;
  }
  const addBox = (position: { x: number; y: number; z: number }, sizeX: number, sizeY: number, sizeZ: number, angle = 0) => {
    const geometry = new THREE.BoxGeometry(Math.max(0.25, sizeX), Math.max(0.08, sizeY), Math.max(0.25, sizeZ));
    const mesh = new THREE.Mesh(geometry, material.clone());
    mesh.position.set(position.x, position.y, position.z);
    mesh.rotation.y = angle;
    const structureRenderLayer = element.category === "blockout-floor-segment" ? 16 : element.category === "facade-non-enterable" ? 14 : element.category === "entrance-player" ? 18 : element.category === "stair-interior" ? 16 : 12;
    mesh.renderOrder = isTraceableStructure ? structureRenderLayer : (element.kind === "SURFACE_SEGMENT" || element.kind === "TERRAIN_SEGMENT" || element.kind === "WATER_EDGE" || element.kind === "TUNNEL") ? -10 : 10;
    mesh.userData.blockout = true;
    mesh.userData.blockoutMesh = true;
    mesh.userData.authoringRecord = { type: "blockout", ...element };
    group.add(mesh);
    const edgeColor = isTraceableStructure ? element.category === "blockout-floor-segment" ? 0xe2b36b : element.category === "facade-non-enterable" ? 0xb4775f : element.category === "entrance-player" ? 0xf0c36f : 0xd7a461 : blockoutKindColors[element.kind];
    const edgeOpacity = isTraceableStructure ? 0.92 : imageSeedElement ? 0.66 : imageDerivedElement && imageFirstReadable ? 0.3 : 0.88;
    const edge = new THREE.LineSegments(new THREE.EdgesGeometry(geometry), new THREE.LineBasicMaterial({ color: edgeColor, transparent: true, opacity: edgeOpacity, depthTest: false, depthWrite: false, fog: false }));
    edge.position.copy(mesh.position);
    edge.rotation.copy(mesh.rotation);
    edge.renderOrder = mesh.renderOrder + 1;
    edge.userData.blockout = true;
    edge.userData.blockoutMesh = true;
    edge.userData.authoringRecord = { type: "blockout", ...element };
    group.add(edge);
    selectableObjects.push(mesh, edge);
    objectById.set(element.id, mesh);
  };
  const addFootprint = () => {
    const footprint = element.footprint ?? [];
    const shape = new THREE.Shape();
    footprint.forEach((point, index) => {
      const localX = point.x - element.x;
      const localZ = -(point.z - element.z);
      if (index === 0) shape.moveTo(localX, localZ);
      else shape.lineTo(localX, localZ);
    });
    shape.closePath();
    const geometry = new THREE.ExtrudeGeometry(shape, { depth: Math.max(0.08, element.height), bevelEnabled: false, curveSegments: 1, steps: 1 });
    geometry.rotateX(-Math.PI / 2);
    const mesh = new THREE.Mesh(geometry, material.clone());
    mesh.position.set(element.x, element.y, element.z);
    const structureRenderLayer = element.category === "blockout-floor-segment" ? 16 : element.category === "facade-non-enterable" ? 14 : element.category === "entrance-player" ? 18 : element.category === "stair-interior" ? 16 : 12;
    mesh.renderOrder = isTraceableStructure ? structureRenderLayer : (element.kind === "SURFACE_SEGMENT" || element.kind === "TERRAIN_SEGMENT" || element.kind === "WATER_EDGE" || element.kind === "TUNNEL") ? -10 : 10;
    mesh.userData.blockout = true;
    mesh.userData.blockoutMesh = true;
    mesh.userData.authoringRecord = { type: "blockout", ...element };
    group.add(mesh);
    const edgeColor = isTraceableStructure ? element.category === "blockout-floor-segment" ? 0xe2b36b : element.category === "facade-non-enterable" ? 0xb4775f : element.category === "entrance-player" ? 0xf0c36f : 0xd7a461 : blockoutKindColors[element.kind];
    const edgeOpacity = isTraceableStructure ? 0.92 : imageSeedElement ? 0.66 : imageDerivedElement && imageFirstReadable ? 0.3 : 0.88;
    const edge = new THREE.LineSegments(new THREE.EdgesGeometry(geometry), new THREE.LineBasicMaterial({ color: edgeColor, transparent: true, opacity: edgeOpacity, depthTest: false, depthWrite: false, fog: false }));
    edge.position.copy(mesh.position);
    edge.userData.blockout = true;
    edge.userData.blockoutMesh = true;
    edge.userData.authoringRecord = { type: "blockout", ...element };
    group.add(edge);
    if (isTraceableStructure && element.category === "blockout-floor-segment") {
      const levelGeometry = new THREE.BufferGeometry();
      const levelPoints: THREE.Vector3[] = [];
      element.footprint!.forEach((point, index, points) => {
        const next = points[(index + 1) % points.length];
        levelPoints.push(new THREE.Vector3(point.x - element.x, 0, -(point.z - element.z)), new THREE.Vector3(next.x - element.x, 0, -(next.z - element.z)));
      });
      levelGeometry.setFromPoints(levelPoints);
      const levelGuide = new THREE.LineSegments(levelGeometry, new THREE.LineBasicMaterial({ color: 0xf0b84f, transparent: true, opacity: 0.98, depthTest: false, depthWrite: false, fog: false }));
      levelGuide.position.set(element.x, element.y, element.z);
      levelGuide.renderOrder = 25;
      levelGuide.userData.blockout = true;
      levelGuide.userData.blockoutMesh = true;
      levelGuide.userData.authoringRecord = { type: "blockout", ...element };
      group.add(levelGuide);
      selectableObjects.push(levelGuide);
    }
    selectableObjects.push(mesh, edge);
    objectById.set(element.id, mesh);
  };

  if (element.footprint && element.footprint.length >= 3) {
    addFootprint();
    const label = blockoutLabel(element);
    label.position.set(element.x, element.y + Math.max(element.height + 4, 5), element.z);
    root.add(label);
    blockoutTagObjects.push(label);
  } else if (element.points && element.points.length > 1) {
    element.points.slice(0, -1).forEach((start, index) => {
      const end = element.points![index + 1];
      const dx = end.x - start.x;
      const dz = end.z - start.z;
      const length = Math.hypot(dx, dz);
      const angle = -Math.atan2(dz, dx);
      addBox({ x: (start.x + end.x) / 2, y: (start.y + end.y) / 2 + element.height / 2, z: (start.z + end.z) / 2 }, length, element.height, element.width ?? 8, angle);
    });
    const label = blockoutLabel(element);
    const first = element.points[0];
    label.position.set(first.x, first.y + 5, first.z);
    root.add(label);
    blockoutTagObjects.push(label);
  } else {
    const wireOnly = element.kind === "UAV_OPENING";
    addBox({ x: element.x, y: element.y + element.height / 2, z: element.z }, element.sizeX, element.height, element.sizeZ);
    const label = blockoutLabel(element);
    label.position.set(element.x, element.y + Math.max(element.height + 4, 5), element.z);
    root.add(label);
    blockoutTagObjects.push(label);
    if (wireOnly) {
      const mesh = group.children.find((child) => child instanceof THREE.Mesh) as THREE.Mesh | undefined;
      if (mesh) (mesh.material as THREE.MeshBasicMaterial).opacity = 0.035;
    }
  }
  root.add(group);
}

function addApprovedDenseFacadeDetailLayer() {
  const root = new THREE.Group();
  root.name = "approved_dense_visual_facade_depth";
  root.userData.visualLayer = "approved-dense-facade-depth";
  root.userData.blockoutReference = true;
  const wallPalette = [0x697878, 0x7f8985, 0x566565, 0x8c9691];
  const steel = new THREE.MeshStandardMaterial({ color: 0x263235, roughness: 0.78, metalness: 0.46 });
  const trim = new THREE.MeshStandardMaterial({ color: 0x9caa9f, roughness: 0.7, metalness: 0.62 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x152329, roughness: 0.32, metalness: 0.5, emissive: 0x071419, emissiveIntensity: 0.28 });
  const glass = new THREE.MeshBasicMaterial({ color: 0x294347 });
  const plinth = new THREE.MeshStandardMaterial({ color: 0x414d4b, roughness: 0.92, metalness: 0.18 });
  const records = denseApprovedBlockoutElements.filter((element) => element.kind === "BUILDING_MASS");
  records.forEach((record, index) => {
    const group = new THREE.Group();
    group.name = `${record.id}_visual_facade_depth`;
    group.userData.visualLayer = "approved-dense-facade-depth";
    group.userData.hostBlockoutId = record.id;
    const baseY = record.y;
    const wall = new THREE.Mesh(new RoundedBoxGeometry(Math.max(4, record.sizeX - 1.2), Math.max(1, record.height - 0.8), Math.max(4, record.sizeZ - 1.2), 0.55, 3), new THREE.MeshStandardMaterial({ color: wallPalette[index % wallPalette.length], roughness: 0.88, metalness: 0.22 }));
    wall.position.set(record.x, baseY + record.height / 2 + 0.45, record.z);
    wall.castShadow = true;
    wall.receiveShadow = true;
    wall.userData.visualDetail = "approved-dense-volumetric-wall";
    group.add(wall);
    const base = new THREE.Mesh(new RoundedBoxGeometry(record.sizeX + 1.8, 0.58, record.sizeZ + 1.8, 0.22, 2), plinth);
    base.position.set(record.x, baseY + 0.29, record.z);
    base.castShadow = true;
    base.receiveShadow = true;
    base.userData.visualDetail = "approved-dense-grounded-plinth";
    group.add(base);
    const roof = new THREE.Mesh(new RoundedBoxGeometry(Math.max(4, record.sizeX - 0.2), 0.46, Math.max(4, record.sizeZ - 0.2), 0.18, 2), steel);
    roof.position.set(record.x, baseY + record.height + 0.78, record.z);
    roof.castShadow = true;
    roof.userData.visualDetail = "approved-dense-roof-cap";
    group.add(roof);
    const frontZ = record.z + record.sizeZ / 2 + 0.72;
    const band = new THREE.Mesh(new RoundedBoxGeometry(Math.max(8, record.sizeX * 0.72), Math.min(1.4, Math.max(0.55, record.height * 0.05)), 0.34, 0.12, 2), trim);
    band.position.set(record.x, baseY + Math.min(record.height * 0.58, 12), frontZ);
    band.userData.visualDetail = "approved-dense-facade-band";
    group.add(band);
    const bayCount = record.sizeX >= 110 ? 3 : record.sizeX >= 70 ? 2 : 1;
    const bayWidth = Math.min(24, Math.max(7, record.sizeX / (bayCount + 2)));
    for (let bay = 0; bay < bayCount; bay += 1) {
      const localX = (bay - (bayCount - 1) / 2) * (bayWidth + 7);
      const doorHeight = Math.min(11, Math.max(5.2, record.height * 0.42));
      const door = new THREE.Mesh(new RoundedBoxGeometry(bayWidth, doorHeight, 0.3, 0.08, 2), dark);
      door.position.set(record.x + localX, baseY + 1.0 + doorHeight / 2, frontZ + 0.22);
      door.userData.visualDetail = "approved-dense-recessed-loading-door";
      group.add(door);
      const lintel = new THREE.Mesh(new RoundedBoxGeometry(bayWidth + 1.8, 0.46, 0.46, 0.08, 2), steel);
      lintel.position.set(record.x + localX, door.position.y + doorHeight / 2 + 0.42, frontZ + 0.3);
      lintel.userData.visualDetail = "approved-dense-loading-lintel";
      group.add(lintel);
      for (const side of [-1, 1]) {
        const jamb = new THREE.Mesh(new RoundedBoxGeometry(0.52, doorHeight + 0.86, 0.46, 0.08, 2), trim);
        jamb.position.set(record.x + localX + side * (bayWidth / 2 + 0.28), door.position.y, frontZ + 0.3);
        jamb.userData.visualDetail = "approved-dense-loading-jamb";
        group.add(jamb);
      }
    }
    const levelCount = record.height >= 48 ? 4 : record.height >= 24 ? 3 : 2;
    const windowColumns = Math.min(7, Math.max(2, Math.floor(record.sizeX / 22)));
    const windowWidth = Math.min(6.4, Math.max(2.3, (record.sizeX * 0.72) / Math.max(1, windowColumns) - 1.4));
    const windowHeight = record.height >= 48 ? 2.15 : 1.65;
    const windowGeometry = new THREE.PlaneGeometry(windowWidth, windowHeight);
    const frontWindows = new THREE.InstancedMesh(windowGeometry, glass, windowColumns * levelCount);
    frontWindows.name = `${record.id}_front_window_grid`;
    frontWindows.userData.visualDetail = "approved-dense-industrial-window-grid";
    frontWindows.userData.hostBlockoutId = record.id;
    frontWindows.castShadow = false;
    frontWindows.receiveShadow = true;
    const windowMatrix = new THREE.Matrix4();
    const windowQuaternion = new THREE.Quaternion();
    let windowIndex = 0;
    for (let level = 0; level < levelCount; level += 1) {
      const usableHeight = Math.max(2, record.height - 10);
      const y = baseY + 6 + level * usableHeight / (levelCount - 1);
      for (let column = 0; column < windowColumns; column += 1) {
        const x = record.x + (column - (windowColumns - 1) / 2) * Math.max(4.2, record.sizeX * 0.72 / Math.max(1, windowColumns - 1));
        windowMatrix.compose(new THREE.Vector3(x, y, frontZ + 0.18), windowQuaternion, new THREE.Vector3(1, 1, 1));
        frontWindows.setMatrixAt(windowIndex, windowMatrix);
        windowIndex += 1;
      }
    }
    frontWindows.instanceMatrix.needsUpdate = true;
    group.add(frontWindows);
    const rooftop = new THREE.Mesh(new RoundedBoxGeometry(Math.max(4, record.sizeX * 0.12), Math.max(1.6, Math.min(4.2, record.height * 0.12)), Math.max(4, record.sizeZ * 0.12), 0.25, 2), steel);
    rooftop.position.set(record.x + record.sizeX * 0.2, baseY + record.height + 2.7, record.z - record.sizeZ * 0.12);
    rooftop.castShadow = true;
    rooftop.userData.visualDetail = "approved-dense-rooftop-service-unit";
    group.add(rooftop);
    if (record.height >= 24) {
      for (let level = 0; level < 3; level += 1) {
        const parapet = new THREE.Mesh(new RoundedBoxGeometry(record.sizeX * 0.84, 0.24, 0.32, 0.08, 2), trim);
        parapet.position.set(record.x, baseY + record.height * 0.34 + level * record.height * 0.22, record.z + record.sizeZ / 2 + 0.5);
        parapet.userData.visualDetail = "approved-dense-elevated-facade-rail";
        group.add(parapet);
      }
    }
    root.add(group);
  });
  scene.add(root);
}

function addBlockoutLayer() {
  const root = new THREE.Group();
  root.name = "full_map_tagged_blockout";
  root.userData.blockout = true;
  root.userData.visualLayer = "full-map-blockout-only";
  root.userData.contract = blockoutContract;
  root.userData.denseFabricOnly = false;
  root.userData.imageSeedOverlay = imageSeedOverlay;
  root.userData.imageSemanticUnderlay = imageSemanticUnderlay;
  blockoutObjects.push(root);
  const baseElementsForReview = activeBlockoutElements;
  const elementsForReview = imageSeedOverlay && orthographicBlockoutMode ? [...baseElementsForReview, ...imageContourSeedElements] : baseElementsForReview;
  elementsForReview.forEach((element) => addBlockoutElement(root, element));
  if (imageSemanticUnderlay && orthographicBlockoutMode) {
    new THREE.TextureLoader().load("/map-authoring-output/vexea-orthographic-clean-semantic-map-v2-alpha.png", (texture) => {
      texture.colorSpace = THREE.SRGBColorSpace;
      const geometry = new THREE.PlaneGeometry(840, 560);
      geometry.rotateX(-Math.PI / 2);
      const material = new THREE.MeshBasicMaterial({ map: texture, transparent: true, opacity: 0.58, depthWrite: false, depthTest: false, side: THREE.DoubleSide, fog: false });
      const mesh = new THREE.Mesh(geometry, material);
      mesh.name = "image_first_semantic_underlay";
      mesh.position.y = -0.75;
      mesh.userData.blockout = true;
      mesh.userData.imageUnderlay = true;
      root.add(mesh);
      requestRender();
    });
  }
  scene.add(root);
}

function updateBlockoutAppearance() {
  blockoutObjects.forEach((root) => root.traverse((object) => {
    const material = (object as THREE.Mesh).material as THREE.Material & { userData?: Record<string, number>; opacity?: number } | undefined;
    if (material?.userData?.blockoutMaterial) {
      material.opacity = showXray ? material.userData.blockoutXrayOpacity : material.userData.blockoutBaseOpacity;
      material.depthTest = !showXray && !imageSemanticUnderlay;
      material.depthWrite = !showXray && !imageSemanticUnderlay;
    }
    if (object.userData.blockoutTag && material) material.opacity = showBlockoutTags ? 0.92 : 0;
    if (approvedDenseVisualMode && viewMode === "perspective" && object.userData.blockoutMesh && (object.type === "Line" || object.type === "LineSegments") && material) {
      material.opacity = 0;
    }
  }));
}

function addSpace(space: SpaceRecord) {
  const group = new THREE.Group();
  group.name = space.id;
  group.position.set(space.center.x, space.floorY, space.center.z);
  group.userData.authoringRecord = { type: "space", ...space };

  const geometry = new THREE.BoxGeometry(space.size.x, space.height, space.size.z);
  const mesh = new THREE.Mesh(geometry, makeSpaceMaterial(space.color));
  mesh.position.y = space.height / 2;
  mesh.userData.authoringRecord = { type: "space", ...space };
  group.add(mesh);

  const edge = new THREE.LineSegments(
    new THREE.EdgesGeometry(geometry),
    new THREE.LineBasicMaterial({ color: space.color, transparent: true, opacity: 0.92 }),
  );
  edge.position.y = space.height / 2;
  edge.userData.authoringRecord = { type: "space", ...space };
  group.add(edge);

  if (space.role === "OPEN_PRESSURE") {
    const island = new THREE.Mesh(
      new THREE.BoxGeometry(space.size.x * 0.18, 4, space.size.z * 0.22),
      new THREE.MeshStandardMaterial({ color: 0x303b37, roughness: 0.92 }),
    );
    island.position.set(-space.size.x * 0.2, 2, -space.size.z * 0.08);
    island.userData.authoringRecord = { type: "space", ...space };
    group.add(island);
  }

  zoneObjects.push(group);
  selectableObjects.push(mesh, edge);
  objectById.set(space.id, mesh);
  scene.add(group);
}

function addBuildingMass(mass: BuildingMassRecord) {
  const group = new THREE.Group();
  group.name = mass.id;
  group.position.set(mass.center.x, mass.floorY, mass.center.z);
  group.userData.authoringRecord = { type: "building", ...mass };
  group.userData.pressurePlantSliceHost = pressurePlantSliceScope && pressurePlantSliceBuildingIds.has(mass.id);

  const geometry = new THREE.BoxGeometry(mass.size.x, mass.height, mass.size.z);
  const massColor = mass.kind === "PLANT" ? 0x746b63 : mass.kind === "CORE" ? 0x5c6468 : mass.kind === "SECURITY" ? 0x56636a : mass.kind === "WAREHOUSE" ? 0x68747a : mass.kind === "WORKSHOP" ? 0x647174 : 0x6c7679;
  const material = new THREE.MeshStandardMaterial({ color: massColor, roughness: 0.82, metalness: 0.1, transparent: true, opacity: 0.92 });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.y = mass.height / 2;
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.userData.authoringRecord = { type: "building", ...mass };
  group.add(mesh);

  const roofHeight = mass.kind === "PLANT" || mass.kind === "CORE" ? 2.4 : 1.4;
  const roofGeometry = new THREE.BoxGeometry(Math.max(18, mass.size.x * 0.92), roofHeight, Math.max(14, mass.size.z * 0.9));
  const roof = new THREE.Mesh(roofGeometry, new THREE.MeshStandardMaterial({ color: mass.kind === "PLANT" ? 0x4e5758 : 0x4b5559, roughness: 0.9, metalness: 0.16 }));
  roof.position.y = mass.height + roofHeight / 2;
  roof.castShadow = true;
  roof.receiveShadow = true;
  roof.userData.authoringRecord = { type: "building", ...mass };
  group.add(roof);

  const foundation = new THREE.Mesh(
    new RoundedBoxGeometry(Math.max(16, mass.size.x * 0.94), 0.72, Math.max(12, mass.size.z * 0.92), 0.3, 2),
    new THREE.MeshStandardMaterial({ color: 0x4b5555, roughness: 0.9, metalness: 0.2 }),
  );
  foundation.position.set(0, 0.36, 0);
  foundation.castShadow = true;
  foundation.receiveShadow = true;
  foundation.userData.visualDetail = "grounded-building-plinth";
  foundation.userData.authoringRecord = { type: "building", ...mass };
  group.add(foundation);

  if (mass.kind === "PLANT" || mass.kind === "SERVICE" || mass.kind === "SECURITY" || mass.kind === "CORE") {
    const serviceHeight = Math.min(8, Math.max(3, mass.height * 0.16));
    const serviceGeometry = new THREE.BoxGeometry(Math.max(8, mass.size.x * 0.16), serviceHeight, Math.max(8, mass.size.z * 0.22));
    const service = new THREE.Mesh(serviceGeometry, new THREE.MeshStandardMaterial({ color: 0x394548, roughness: 0.86, metalness: 0.22 }));
    service.position.set(-mass.size.x * 0.22, mass.height + roofHeight + serviceHeight / 2, 0);
    service.castShadow = true;
    service.userData.authoringRecord = { type: "building", ...mass };
    group.add(service);
  }

  const facadeBand = new THREE.Mesh(
    new THREE.BoxGeometry(Math.max(12, mass.size.x * 0.72), Math.min(2.2, Math.max(0.8, mass.height * 0.07)), 0.8),
    new THREE.MeshStandardMaterial({ color: mass.kind === "CORE" ? 0xd08b53 : 0x87979a, roughness: 0.74, metalness: 0.24 }),
  );
  facadeBand.position.set(0, Math.min(mass.height * 0.52, 11), mass.size.z / 2 + 0.5);
  facadeBand.userData.authoringRecord = { type: "building", ...mass };
  group.add(facadeBand);

  const frontZ = mass.size.z / 2 + 0.62;
  const bayCount = Math.min(8, Math.max(3, Math.floor(mass.size.x / 26)));
  const bayWidth = mass.size.x / bayCount;
  const ribMaterial = new THREE.MeshStandardMaterial({ color: 0x313d40, roughness: 0.76, metalness: 0.42 });
  const darkGlassMaterial = new THREE.MeshStandardMaterial({ color: 0x17252b, roughness: 0.28, metalness: 0.38, emissive: 0x0d2227, emissiveIntensity: 0.42 });
  for (let bay = 0; bay < bayCount; bay += 1) {
    const x = -mass.size.x / 2 + bayWidth * (bay + 0.5);
    const rib = new THREE.Mesh(new THREE.BoxGeometry(0.72, Math.max(4, mass.height * 0.78), 0.34), ribMaterial);
    rib.position.set(x, Math.max(3.2, mass.height * 0.48), frontZ);
    rib.castShadow = true;
    rib.receiveShadow = true;
    rib.userData.visualDetail = "facade-steel-rib";
    group.add(rib);
  }

  if (mass.kind === "WAREHOUSE" || mass.kind === "WORKSHOP" || mass.kind === "SERVICE" || mass.kind === "SECURITY") {
    const doorCount = Math.min(3, Math.max(1, Math.floor(mass.size.x / 58)));
    const doorWidth = Math.min(22, mass.size.x / (doorCount + 1));
    for (let door = 0; door < doorCount; door += 1) {
      const x = (door - (doorCount - 1) / 2) * (doorWidth + 8);
      const loadingDoor = new THREE.Mesh(new THREE.BoxGeometry(doorWidth, Math.min(11, Math.max(6, mass.height * 0.56)), 0.42), darkGlassMaterial);
      loadingDoor.position.set(x, Math.min(7.4, mass.height * 0.42), frontZ + 0.14);
      loadingDoor.userData.visualDetail = "loading-bay-door";
      group.add(loadingDoor);
      const lintel = new THREE.Mesh(new THREE.BoxGeometry(doorWidth + 1.8, 0.56, 0.7), ribMaterial);
      lintel.position.set(x, loadingDoor.position.y + loadingDoor.geometry.parameters.height / 2 + 0.45, frontZ + 0.18);
      lintel.userData.visualDetail = "loading-bay-lintel";
      group.add(lintel);
      const jambHeight = loadingDoor.geometry.parameters.height + 0.9;
      for (const jambOffset of [-1, 1]) {
        const jamb = new THREE.Mesh(new THREE.BoxGeometry(0.62, jambHeight, 0.7), ribMaterial);
        jamb.position.set(x + jambOffset * (doorWidth * 0.5 + 0.3), loadingDoor.position.y, frontZ + 0.18);
        jamb.userData.visualDetail = "loading-bay-jamb";
        group.add(jamb);
      }
      const threshold = new THREE.Mesh(
        new RoundedBoxGeometry(doorWidth + 2.2, 0.28, 2.8, 0.16, 2),
        new THREE.MeshStandardMaterial({ color: 0x56605d, roughness: 0.84, metalness: 0.28 }),
      );
      threshold.position.set(x, 0.88, frontZ + 1.35);
      threshold.userData.visualDetail = "loading-bay-grounded-threshold";
      group.add(threshold);
      const canopy = new THREE.Mesh(
        new RoundedBoxGeometry(doorWidth + 3.0, 0.34, 3.4, 0.18, 2),
        new THREE.MeshStandardMaterial({ color: 0x313d3e, roughness: 0.72, metalness: 0.48 }),
      );
      canopy.position.set(x, loadingDoor.position.y + loadingDoor.geometry.parameters.height / 2 + 1.25, frontZ + 1.55);
      canopy.userData.visualDetail = "loading-bay-shallow-canopy";
      group.add(canopy);
    }
  } else {
    const windowCount = Math.min(6, bayCount);
    const windowWidth = Math.max(4, mass.size.x / (windowCount + 1) * 0.62);
    for (let windowIndex = 0; windowIndex < windowCount; windowIndex += 1) {
      const x = -mass.size.x * 0.36 + windowIndex * (mass.size.x * 0.72 / Math.max(1, windowCount - 1));
      const window = new THREE.Mesh(new THREE.BoxGeometry(windowWidth, 1.6, 0.26), darkGlassMaterial);
      window.position.set(x, Math.min(mass.height * 0.7, 8.5), frontZ + 0.15);
      window.userData.visualDetail = "clerestory-strip";
      group.add(window);
    }
  }

  if (mass.kind === "PLANT" || mass.kind === "CORE" || mass.kind === "SERVICE") {
    const unit = new THREE.Mesh(new THREE.BoxGeometry(Math.max(4, mass.size.x * 0.12), 2.4, Math.max(4, mass.size.z * 0.12)), new THREE.MeshStandardMaterial({ color: 0x263235, roughness: 0.82, metalness: 0.34 }));
    unit.position.set(mass.size.x * 0.22, mass.height + roofHeight + 1.2, -mass.size.z * 0.12);
    unit.castShadow = true;
    unit.receiveShadow = true;
    unit.userData.visualDetail = "rooftop-service-unit";
    group.add(unit);
  }

  const edge = new THREE.LineSegments(
    new THREE.EdgesGeometry(geometry),
    new THREE.LineBasicMaterial({ color: 0xb7c2c7, transparent: true, opacity: 0.5 }),
  );
  edge.position.y = mass.height / 2;
  edge.userData.authoringRecord = { type: "building", ...mass };
  group.add(edge);

  const roofEdge = new THREE.LineSegments(new THREE.EdgesGeometry(roofGeometry), new THREE.LineBasicMaterial({ color: 0xc5d0d0, transparent: true, opacity: 0.34 }));
  roofEdge.position.y = mass.height + roofHeight / 2;
  roofEdge.userData.authoringRecord = { type: "building", ...mass };
  group.add(roofEdge);

  buildingObjects.push(group);
  selectableObjects.push(mesh, edge);
  objectById.set(mass.id, mesh);
  scene.add(group);
}

function addConnector(connector: ConnectorRecord) {
  const group = new THREE.Group();
  group.name = connector.id;
  group.userData.authoringRecord = { type: "connector", ...connector };
  group.userData.pressurePlantSliceHost = pressurePlantSliceScope && pressurePlantSliceConnectorIds.has(connector.id);

  connector.points.slice(0, -1).forEach((start, index) => {
    const end = connector.points[index + 1];
    const dx = end.x - start.x;
    const dz = end.z - start.z;
    const length = Math.hypot(dx, dz);
    const angle = -Math.atan2(dz, dx);
    const segment = new THREE.Group();
    segment.position.set((start.x + end.x) / 2, (start.y + end.y) / 2, (start.z + end.z) / 2);
    segment.rotation.y = angle;

    const slabGeometry = new THREE.BoxGeometry(length, 0.8, connector.width);
    const slab = new THREE.Mesh(slabGeometry, new THREE.MeshStandardMaterial({ color: 0x303a3d, roughness: 0.96, metalness: 0.05, transparent: true, opacity: 0.96 }));
    slab.userData.connectorRoadSlab = connector.kind === "ARRIVAL_ROAD";
    slab.userData.connectorDimensions = { length, width: connector.width };
    slab.position.y = 0.4;
    slab.castShadow = true;
    slab.receiveShadow = true;
    slab.userData.authoringRecord = { type: "connector", ...connector };
    segment.add(slab);

    const edge = new THREE.LineSegments(new THREE.EdgesGeometry(slabGeometry), new THREE.LineBasicMaterial({ color: connector.color, transparent: true, opacity: 0.82 }));
    edge.position.y = 0.4;
    edge.userData.authoringRecord = { type: "connector", ...connector };
    segment.add(edge);

    const centerMark = new THREE.Mesh(new THREE.BoxGeometry(length * 0.78, 0.04, 0.12), new THREE.MeshBasicMaterial({ color: connector.color, transparent: true, opacity: 0.72 }));
    centerMark.position.y = 0.84;
    segment.add(centerMark);
    if (connector.kind === "ARRIVAL_ROAD" && index < 2) {
      const manholeMaterial = new THREE.MeshStandardMaterial({ color: 0x263032, roughness: 0.72, metalness: 0.68 });
      const manholeInsetMaterial = new THREE.MeshStandardMaterial({ color: 0x1a2223, roughness: 0.9, metalness: 0.46 });
      const manhole = new THREE.Mesh(new THREE.CylinderGeometry(1.08, 1.08, 0.055, 24), manholeMaterial);
      manhole.name = `arrival_road_manhole_${index}`;
      manhole.position.set(length * (index === 0 ? 0.56 : 0.42), 0.838, index === 0 ? -2.6 : 2.8);
      manhole.receiveShadow = true;
      segment.add(manhole);
      const manholeInset = new THREE.Mesh(new THREE.RingGeometry(0.72, 0.9, 24), manholeInsetMaterial);
      manholeInset.name = `arrival_road_manhole_ring_${index}`;
      manholeInset.position.set(manhole.position.x, 0.871, manhole.position.z);
      manholeInset.rotation.x = -Math.PI / 2;
      segment.add(manholeInset);
      for (let boltIndex = 0; boltIndex < 6; boltIndex += 1) {
        const boltAngle = boltIndex / 6 * Math.PI * 2;
        const bolt = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.025, 8), manholeInsetMaterial);
        bolt.position.set(manhole.position.x + Math.cos(boltAngle) * 0.91, 0.879, manhole.position.z + Math.sin(boltAngle) * 0.91);
        bolt.rotation.x = -Math.PI / 2;
        segment.add(bolt);
      }
      const drainMaterial = new THREE.MeshStandardMaterial({ color: 0x172021, roughness: 0.92, metalness: 0.54 });
      const drain = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.04, 3.2), drainMaterial);
      drain.name = `arrival_road_edge_drain_${index}`;
      drain.position.set(length * (index === 0 ? 0.76 : 0.72), 0.846, -connector.width * 0.42);
      drain.receiveShadow = true;
      segment.add(drain);
      for (let grateIndex = 0; grateIndex < 5; grateIndex += 1) {
        const grateBar = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.025, 2.8), manholeInsetMaterial);
        grateBar.position.set(drain.position.x - 0.13 + grateIndex * 0.065, 0.873, drain.position.z);
        segment.add(grateBar);
      }
      const patchMaterial = new THREE.MeshStandardMaterial({ color: 0x46504d, roughness: 0.96, metalness: 0.02 });
      const patchSpecs = index === 0
        ? [[-length * 0.22, -3.8, 6.8, 1.65], [length * 0.02, 3.0, 4.8, 1.3]]
        : [[-length * 0.16, 3.4, 7.6, 1.5]];
      patchSpecs.forEach(([localX, localZ, patchLength, patchWidth], patchIndex) => {
        const patch = new THREE.Mesh(new THREE.BoxGeometry(patchLength, 0.045, patchWidth), patchMaterial);
        patch.name = `arrival_road_repair_patch_${index}_${patchIndex}`;
        patch.position.set(localX, 0.846, localZ);
        patch.rotation.y = (patchIndex % 2 === 0 ? -1 : 1) * 0.035;
        patch.receiveShadow = true;
        patch.userData.visualLayer = "street-canyon-surface";
        patch.userData.environmentMaterial = "presentation opaque asphalt repair patch on visible connector slab";
        segment.add(patch);
        const patchSeamMaterial = new THREE.MeshStandardMaterial({ color: 0x232c2d, roughness: 0.99, metalness: 0.01 });
        const seam = new THREE.Mesh(new THREE.BoxGeometry(patchLength + 0.12, 0.018, 0.055), patchSeamMaterial);
        seam.position.set(localX, 0.873, localZ - patchWidth * 0.5);
        seam.rotation.y = patch.rotation.y;
        segment.add(seam);
      });
    }
    group.add(segment);
  });

  connectorObjects.push(group);
  selectableObjects.push(...group.children.flatMap((segment) => segment.children.filter((child) => child.userData.authoringRecord)));
  objectById.set(connector.id, group);
  scene.add(group);
}

function addSiteFabric(record: SiteFabricRecord) {
  const group = new THREE.Group();
  group.name = record.id;
  group.position.set(record.center.x, record.center.y, record.center.z);
  group.userData.authoringRecord = { type: "fabric", ...record };
  group.userData.pressurePlantSliceHost = pressurePlantSliceScope && pressurePlantSliceFabricIds.has(record.id);

  const materialColor = record.kind === "ROAD" ? 0x3b4447 : record.kind === "COURT" ? 0x4b4f4d : record.kind === "SERVICE_BAND" ? 0x465052 : record.kind === "PERIMETER_WALL" ? 0x303a3e : record.color;
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(record.size.x, record.size.y, record.size.z),
    new THREE.MeshStandardMaterial({ color: materialColor, roughness: 0.96, metalness: 0.03, transparent: true, opacity: record.kind === "PERIMETER_WALL" ? 0.94 : 0.98 }),
  );
  mesh.position.y = record.size.y / 2;
  mesh.castShadow = record.kind === "PERIMETER_WALL";
  mesh.receiveShadow = true;
  mesh.userData.authoringRecord = { type: "fabric", ...record };
  group.add(mesh);

  const edge = new THREE.LineSegments(
    new THREE.EdgesGeometry(new THREE.BoxGeometry(record.size.x, record.size.y, record.size.z)),
    new THREE.LineBasicMaterial({ color: record.color, transparent: true, opacity: record.kind === "CAMPUS_SURFACE" ? 0.18 : 0.6 }),
  );
  edge.position.y = record.size.y / 2;
  edge.userData.authoringRecord = { type: "fabric", ...record };
  group.add(edge);

  if (record.kind === "ROAD" || record.kind === "COURT") {
    const marking = new THREE.Mesh(
      new THREE.BoxGeometry(Math.max(8, record.size.x * 0.55), 0.035, 0.16),
      new THREE.MeshBasicMaterial({ color: record.color, transparent: true, opacity: 0.62 }),
    );
    marking.position.set(0, record.size.y + 0.02, 0);
    group.add(marking);
  }

  if (record.id === "fabric_arrival_road") {
    const wearCanvas = document.createElement("canvas");
    wearCanvas.width = 768;
    wearCanvas.height = 256;
    const wearContext = wearCanvas.getContext("2d");
    if (wearContext) {
      wearContext.fillStyle = "rgba(34, 43, 42, 0.78)";
      wearContext.fillRect(0, 0, wearCanvas.width, wearCanvas.height);
      let state = 19;
      for (let index = 0; index < 180; index += 1) {
        state = (state * 1664525 + 1013904223) >>> 0;
        const x = state % wearCanvas.width;
        state = (state * 1664525 + 1013904223) >>> 0;
        const y = state % wearCanvas.height;
        state = (state * 1664525 + 1013904223) >>> 0;
        const width = 4 + (state % 42);
        state = (state * 1664525 + 1013904223) >>> 0;
        const height = 2 + (state % 9);
        wearContext.fillStyle = `rgba(150, 163, 157, ${0.035 + (state % 22) / 1000})`;
        wearContext.fillRect(x, y, width, height);
      }
      wearContext.fillStyle = "rgba(18, 25, 25, 0.16)";
      wearContext.fillRect(188, 0, 44, wearCanvas.height);
      wearContext.fillRect(520, 0, 38, wearCanvas.height);
    }
    const wearTexture = new THREE.CanvasTexture(wearCanvas);
    wearTexture.colorSpace = THREE.SRGBColorSpace;
    const wearMaterial = new THREE.MeshBasicMaterial({ map: wearTexture, color: 0x8b9590, transparent: true, opacity: 0.42, premultipliedAlpha: true, depthWrite: false, blending: THREE.MultiplyBlending, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
    const wear = new THREE.Mesh(new THREE.PlaneGeometry(record.size.x * 0.98, record.size.z * 0.98), wearMaterial);
    wear.name = "density_arrival_site_fabric_road_mottled_wear";
    wear.rotation.x = -Math.PI / 2;
    wear.position.y = record.size.y + 0.035;
    wear.renderOrder = 3;
    wear.userData.visualLayer = "street-canyon-surface";
    wear.userData.environmentMaterial = "procedural mottled asphalt grain and wheel-track wear";
    group.add(wear);
    const foregroundRoadMaterial = new THREE.MeshStandardMaterial({ color: 0x303b39, roughness: 0.9, metalness: 0.03 });
    const foregroundRoad = new THREE.Mesh(new THREE.BoxGeometry(record.size.x * 0.92, 0.08, 42), foregroundRoadMaterial);
    foregroundRoad.name = "density_arrival_site_fabric_road_camera_extension";
    foregroundRoad.position.set(0, record.size.y + 0.04, record.size.z * 0.5 + 21);
    foregroundRoad.receiveShadow = true;
    foregroundRoad.userData.visualLayer = "street-canyon-surface";
    foregroundRoad.userData.presentationRoadExtension = true;
    foregroundRoad.userData.environmentMaterial = "presentation-only arrival roadway foreground extension";
    group.add(foregroundRoad);
    scene.attach(foregroundRoad);
    const foregroundTrackMaterial = new THREE.MeshStandardMaterial({ color: 0x1f2929, roughness: 0.72, metalness: 0.05, transparent: true, opacity: 0.42, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
    for (const x of [-34, 34]) {
      const track = new THREE.Mesh(new THREE.BoxGeometry(18, 0.018, 40), foregroundTrackMaterial);
      track.position.set(x, record.size.y + 0.085, record.size.z * 0.5 + 21);
      track.userData.visualLayer = "street-canyon-surface";
      track.userData.environmentMaterial = "presentation wheel-track darkening";
      group.add(track);
    }
  }

  if (record.id === "fabric_loading_apron" || record.id === "fabric_pressure_yard_surface") {
    const jointMaterial = new THREE.MeshStandardMaterial({ color: 0x303737, roughness: 0.98, metalness: 0.02, transparent: true, opacity: 0.48, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
    const jointY = record.size.y + 0.027;
    const xJoints = record.id === "fabric_loading_apron" ? [-80, -22, 36, 94] : [ -88, -24, 40, 104 ];
    const zJoints = record.id === "fabric_loading_apron" ? [-42, 4, 50] : [-52, 6, 64];
    for (const x of xJoints) {
      const joint = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.025, record.size.z * 0.9), jointMaterial);
      joint.position.set(x, jointY, 0);
      joint.userData.visualLayer = "apron-control-joint";
      group.add(joint);
    }
    for (const z of zJoints) {
      const joint = new THREE.Mesh(new THREE.BoxGeometry(record.size.x * 0.9, 0.025, 0.09), jointMaterial);
      joint.position.set(0, jointY, z);
      joint.userData.visualLayer = "apron-control-joint";
      group.add(joint);
    }
    const edgeCourse = new THREE.Mesh(new THREE.BoxGeometry(record.size.x * 0.94, 0.12, 0.34), new THREE.MeshStandardMaterial({ color: 0x3d4441, roughness: 0.94, metalness: 0.05, transparent: true, opacity: 0.72 }));
    edgeCourse.position.set(0, record.size.y + 0.05, -record.size.z * 0.47);
    edgeCourse.userData.visualLayer = "apron-service-edge-course";
    group.add(edgeCourse);
  }

  fabricObjects.push(group);
  selectableObjects.push(mesh, edge);
  objectById.set(record.id, mesh);
  scene.add(group);
}

function addGroundDensity() {
  const pipeMaterial = new THREE.MeshStandardMaterial({ color: 0x566260, roughness: 0.66, metalness: 0.56 });
  const darkPipeMaterial = new THREE.MeshStandardMaterial({ color: 0x2a3335, roughness: 0.76, metalness: 0.48 });
  const palletMaterial = new THREE.MeshStandardMaterial({ color: 0x655444, roughness: 0.9, metalness: 0.04 });
  const crateMaterial = new THREE.MeshStandardMaterial({ color: 0x59615e, roughness: 0.82, metalness: 0.26 });
  const stainMaterial = new THREE.MeshStandardMaterial({ color: 0x171d1d, roughness: 0.98, metalness: 0.02, transparent: true, opacity: 0.62, depthWrite: false });

  const addGroup = (name: string, position: { x: number; y?: number; z: number }) => {
    const group = new THREE.Group();
    group.name = name;
    group.position.set(position.x, position.y ?? 0, position.z);
    group.userData.visualLayer = "ground-density";
    densityObjects.push(group);
    scene.add(group);
    return group;
  };

  const addPipeRun = (name: string, start: { x: number; z: number }, end: { x: number; z: number }, y: number, radius: number, material: THREE.Material) => {
    const group = addGroup(name, { x: 0, z: 0 });
    const dx = end.x - start.x;
    const dz = end.z - start.z;
    const length = Math.hypot(dx, dz);
    const pipe = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, length, 10), material);
    pipe.rotation.z = Math.PI / 2;
    pipe.rotation.y = Math.atan2(dz, dx);
    pipe.position.set((start.x + end.x) / 2, y, (start.z + end.z) / 2);
    pipe.castShadow = true;
    pipe.receiveShadow = true;
    group.add(pipe);
    const supportMaterial = new THREE.MeshStandardMaterial({ color: 0x343d3e, roughness: 0.84, metalness: 0.38 });
    for (const t of [0.18, 0.5, 0.82]) {
      const support = new THREE.Mesh(new THREE.BoxGeometry(0.22, 2.2, 0.22), supportMaterial);
      support.position.set(start.x + dx * t, y - 0.9, start.z + dz * t);
      support.castShadow = true;
      group.add(support);
    }
    return group;
  };

  addPipeRun("density_service_pipe_run", { x: -226, z: 32 }, { x: -104, z: 32 }, 3.2, 0.54, pipeMaterial);
  addPipeRun("density_loading_pipe_run", { x: -144, z: 112 }, { x: -50, z: 112 }, 2.7, 0.42, darkPipeMaterial);
  addPipeRun("density_plant_pipe_run", { x: 184, z: -54 }, { x: 286, z: -54 }, 3.8, 0.62, pipeMaterial);

  const addPalletStack = (name: string, position: { x: number; z: number }, count: number, rotationY = 0) => {
    const group = addGroup(name, position);
    group.rotation.y = rotationY;
    const pallet = new THREE.Mesh(new THREE.BoxGeometry(4.8, 0.24, 3.2), palletMaterial);
    pallet.position.y = 0.12;
    pallet.castShadow = true;
    pallet.receiveShadow = true;
    group.add(pallet);
    for (let index = 0; index < count; index += 1) {
      const crate = new THREE.Mesh(new THREE.BoxGeometry(3.9, 1.35, 2.6), crateMaterial);
      crate.position.set((index % 2) * 0.16 - 0.08, 0.92 + Math.floor(index / 2) * 1.42, (index % 3) * 0.12 - 0.12);
      crate.castShadow = true;
      crate.receiveShadow = true;
      group.add(crate);
      const band = new THREE.Mesh(new THREE.BoxGeometry(4.0, 0.12, 0.16), pipeMaterial);
      band.position.set(crate.position.x, crate.position.y + 0.1, crate.position.z - 1.22);
      group.add(band);
    }
    return group;
  };

  addPalletStack("density_loading_pallet_stack", { x: -24, z: 112 }, 4, 0.08);
  addPalletStack("density_pressure_yard_pallet_stack", { x: 74, z: 94 }, 6, -0.14);
  addPalletStack("density_plant_service_stack", { x: 284, z: -32 }, 4, 0.22);

  const addCableTray = (name: string, start: { x: number; z: number }, end: { x: number; z: number }, y: number) => {
    const group = addGroup(name, { x: 0, z: 0 });
    const dx = end.x - start.x;
    const dz = end.z - start.z;
    const length = Math.hypot(dx, dz);
    const tray = new THREE.Mesh(new THREE.BoxGeometry(length, 0.42, 1.8), darkPipeMaterial);
    tray.rotation.y = -Math.atan2(dz, dx);
    tray.position.set((start.x + end.x) / 2, y, (start.z + end.z) / 2);
    tray.castShadow = true;
    tray.receiveShadow = true;
    group.add(tray);
    for (const t of [0.18, 0.5, 0.82]) {
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.24, y, 0.24), pipeMaterial);
      post.position.set(start.x + dx * t, y / 2, start.z + dz * t);
      post.castShadow = true;
      group.add(post);
    }
    return group;
  };
  addCableTray("density_service_cable_tray", { x: -176, z: 128 }, { x: -44, z: 128 }, 7.2);
  addCableTray("density_plant_cable_tray", { x: 166, z: -8 }, { x: 300, z: -8 }, 8.4);

  const addOilStain = (name: string, position: { x: number; z: number }, size: { x: number; z: number }, rotationY: number) => {
    const group = addGroup(name, position);
    group.rotation.y = rotationY;
    const stain = new THREE.Mesh(new THREE.CircleGeometry(1, 24), stainMaterial);
    stain.scale.set(size.x, size.z, 1);
    stain.rotation.x = -Math.PI / 2;
    stain.position.y = 0.035;
    group.add(stain);
    const inner = new THREE.Mesh(new THREE.CircleGeometry(0.58, 20), new THREE.MeshStandardMaterial({ color: 0x263031, roughness: 1, metalness: 0.02, transparent: true, opacity: 0.42, depthWrite: false }));
    inner.scale.set(size.x * 0.66, size.z * 0.48, 1);
    inner.rotation.x = -Math.PI / 2;
    inner.position.y = 0.042;
    group.add(inner);
    return group;
  };
  addOilStain("density_arrival_oil_stain", { x: -338, z: 166 }, { x: 8.5, z: 3.2 }, 0.24);
  addOilStain("density_loading_oil_stain", { x: -82, z: 118 }, { x: 6.2, z: 2.6 }, -0.42);
  addOilStain("density_plant_oil_stain", { x: 226, z: -44 }, { x: 9.2, z: 3.8 }, 0.16);
}

function addStreetStoryDensity() {
  const curbMaterial = new THREE.MeshStandardMaterial({ color: 0x69716e, roughness: 0.94, metalness: 0.05 });
  const sidewalkMaterial = new THREE.MeshStandardMaterial({ map: getArrivalConcreteTexture(), color: 0xffffff, roughness: 0.93, metalness: 0.02 });
  const sidewalkVariantMaterial = sidewalkMaterial.clone();
  sidewalkVariantMaterial.color.setHex(0xd0c8b9);
  sidewalkVariantMaterial.roughness = 0.97;
  const accessSteelMaterial = new THREE.MeshStandardMaterial({ color: 0x3e4849, roughness: 0.72, metalness: 0.58 });
  const sidewalkJointMaterial = new THREE.MeshStandardMaterial({ color: 0x4f5756, roughness: 0.99, metalness: 0.01, transparent: true, opacity: 0.72, depthWrite: false });
  const drainMaterial = new THREE.MeshStandardMaterial({ color: 0x273031, roughness: 0.7, metalness: 0.72 });
  const safetyMaterial = new THREE.MeshStandardMaterial({ color: 0xb26e3e, roughness: 0.72, metalness: 0.14 });
  const vehicleBodyMaterial = new THREE.MeshPhysicalMaterial({ color: 0x4d5d60, roughness: 0.68, metalness: 0.22, clearcoat: 0.34, clearcoatRoughness: 0.18, reflectivity: 0.6 });
  const vehicleGlassMaterial = new THREE.MeshPhysicalMaterial({ color: 0x102a34, roughness: 0.1, metalness: 0.34, clearcoat: 0.82, clearcoatRoughness: 0.06, reflectivity: 0.86, emissive: 0x07161c, emissiveIntensity: 0.34 });
  const tyreMaterial = new THREE.MeshStandardMaterial({ color: 0x15191a, roughness: 0.98, metalness: 0.01 });

  const addGroup = (name: string, position: { x: number; y?: number; z: number }) => {
    const group = new THREE.Group();
    group.name = name;
    group.position.set(position.x, position.y ?? 0, position.z);
    group.userData.visualLayer = "street-story-density";
    densityObjects.push(group);
    scene.add(group);
    return group;
  };

  const addRoadEdge = (name: string, side: -1 | 1) => {
    const group = addGroup(name, { x: 0, z: 0 });
    const points = [
      { x: -388, z: 218 },
      { x: -344, z: 178 },
      { x: -292, z: 178 },
      { x: -216, z: 126 },
    ];
    for (let index = 0; index < points.length - 1; index += 1) {
      const start = points[index];
      const end = points[index + 1];
      const dx = end.x - start.x;
      const dz = end.z - start.z;
      const length = Math.hypot(dx, dz);
      const nx = -dz / Math.max(0.01, length);
      const nz = dx / Math.max(0.01, length);
      const angle = -Math.atan2(dz, dx);
      const centerX = (start.x + end.x) / 2;
      const centerZ = (start.z + end.z) / 2;
      const curbOffset = side * 10.4;
      const sidewalkOffset = side * 12.5;

      const curb = new THREE.Mesh(new THREE.BoxGeometry(length, 0.36, 0.42), curbMaterial);
      curb.position.set(centerX + nx * curbOffset, 0.18, centerZ + nz * curbOffset);
      curb.rotation.y = angle;
      curb.castShadow = true;
      curb.receiveShadow = true;
      group.add(curb);

      const slabCount = Math.max(2, Math.ceil(length / 24));
      const slabLength = length / slabCount - 0.12;
      for (let slabIndex = 0; slabIndex < slabCount; slabIndex += 1) {
        const slabT = (slabIndex + 0.5) / slabCount;
        const slab = new THREE.Mesh(new THREE.BoxGeometry(slabLength, 0.16, 3.2), slabIndex % 2 === 0 ? sidewalkMaterial : sidewalkVariantMaterial);
        slab.position.set(start.x + dx * slabT + nx * sidewalkOffset, 0.08, start.z + dz * slabT + nz * sidewalkOffset);
        slab.rotation.y = angle;
        slab.receiveShadow = true;
        slab.userData.presentationRole = "segmented-concrete-sidewalk-slab";
        group.add(slab);
      }
      const sidewalkEdge = new THREE.Mesh(new THREE.BoxGeometry(length, 0.035, 0.12), sidewalkJointMaterial);
      sidewalkEdge.position.set(centerX + nx * (sidewalkOffset + side * 1.42), 0.17, centerZ + nz * (sidewalkOffset + side * 1.42));
      sidewalkEdge.rotation.y = angle;
      sidewalkEdge.userData.presentationRole = "sidewalk-curb-edge";
      group.add(sidewalkEdge);
      for (let slabIndex = 1; slabIndex < slabCount; slabIndex += 1) {
        const t = slabIndex / slabCount;
        const joint = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.035, 3.12), sidewalkJointMaterial);
        joint.position.set(start.x + dx * t + nx * sidewalkOffset, 0.17, start.z + dz * t + nz * sidewalkOffset);
        joint.rotation.y = angle;
        joint.userData.presentationRole = "sidewalk-expansion-joint";
        group.add(joint);
      }
      for (const t of [0.22, 0.74]) {
        const drain = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.045, 0.28), drainMaterial);
        drain.position.set(start.x + dx * t + nx * (curbOffset + 0.03), 0.4, start.z + dz * t + nz * (curbOffset + 0.03));
        drain.rotation.y = angle;
        group.add(drain);
      }

      if (side === 1) {
        for (const t of [0.12, 0.32, 0.54, 0.76, 0.92]) {
          const bollard = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.22, 1.25, 8), accessSteelMaterial);
          bollard.position.set(start.x + dx * t + nx * (sidewalkOffset + 0.6), 0.63, start.z + dz * t + nz * (sidewalkOffset + 0.6));
          bollard.castShadow = true;
          group.add(bollard);
          const band = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.12, 0.34), safetyMaterial);
          band.position.set(bollard.position.x, 0.86, bollard.position.z);
          group.add(band);
        }
      }
    }
  };

  addRoadEdge("density_arrival_curb_north", 1);
  addRoadEdge("density_arrival_curb_south", -1);

  const arrivalRoadSurfaceGroup = addGroup("density_arrival_pbr_road_surface", { x: 0, z: 0 });
  arrivalRoadSurfaceGroup.userData.visualLayer = "street-canyon-surface";
  const arrivalRoadPoints = [
    { x: -388, z: 218 },
    { x: -344, z: 178 },
    { x: -292, z: 178 },
    { x: -216, z: 126 },
  ];
  const arrivalRoadDeckY = 0.045;
  const arrivalRoadFallbackMaterial = new THREE.MeshStandardMaterial({ color: 0x343b3c, roughness: 0.94, metalness: 0.02 });
  const arrivalSurfacePatchMaterial = new THREE.MeshStandardMaterial({ color: 0x46504d, roughness: 0.96, metalness: 0.02 });
  const arrivalSurfacePatchSeamMaterial = new THREE.MeshStandardMaterial({ color: 0x222b2c, roughness: 0.99, metalness: 0.01 });
  const arrivalPuddleMaterial = new THREE.MeshPhysicalMaterial({ color: 0x5d7578, roughness: 0.08, metalness: 0.26, clearcoat: 0.9, clearcoatRoughness: 0.04, reflectivity: 0.9, transparent: true, opacity: 0.5, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3 });
  for (let segmentIndex = 0; segmentIndex < arrivalRoadPoints.length - 1; segmentIndex += 1) {
    const start = arrivalRoadPoints[segmentIndex];
    const end = arrivalRoadPoints[segmentIndex + 1];
    const length = Math.hypot(end.x - start.x, end.z - start.z);
    const roadSurface = new THREE.Mesh(new THREE.BoxGeometry(length, 0.08, 17.2), arrivalRoadFallbackMaterial);
    roadSurface.position.set((start.x + end.x) / 2, arrivalRoadDeckY, (start.z + end.z) / 2);
    roadSurface.rotation.y = -Math.atan2(end.z - start.z, end.x - start.x);
    roadSurface.receiveShadow = true;
    roadSurface.userData.environmentMaterial = "ambientCG Road012A / 2K — presentation arrival road fallback";
    arrivalRoadSurfaceGroup.add(roadSurface);
    arrivalPresentationRoadSurfaces.push({ mesh: roadSurface, length, width: 17.2 });
    const patchSpecs = segmentIndex === 0
      ? [[length * -0.22, -3.4, 8.4, 1.7, -0.035], [length * 0.18, 3.1, 5.8, 1.2, 0.028]]
      : segmentIndex === 1
        ? [[length * -0.12, 3.25, 6.4, 1.35, -0.022]]
        : [];
    patchSpecs.forEach(([localX, localZ, patchLength, patchWidth, rotation], patchIndex) => {
      const patch = new THREE.Mesh(new THREE.BoxGeometry(patchLength, 0.035, patchWidth), arrivalSurfacePatchMaterial);
      patch.name = `density_arrival_pbr_road_surface_patch_${segmentIndex}_${patchIndex}`;
      patch.position.copy(roadSurface.position);
      patch.position.x += Math.cos(roadSurface.rotation.y) * localX + Math.sin(roadSurface.rotation.y) * localZ;
      patch.position.z += -Math.sin(roadSurface.rotation.y) * localX + Math.cos(roadSurface.rotation.y) * localZ;
      patch.position.y = arrivalRoadDeckY + 0.053;
      patch.rotation.y = roadSurface.rotation.y + rotation;
      patch.receiveShadow = true;
      patch.userData.visualLayer = "street-canyon-surface";
      patch.userData.environmentMaterial = "presentation opaque asphalt repair patch on visible arrival surface";
      arrivalRoadSurfaceGroup.add(patch);
      const seam = new THREE.Mesh(new THREE.BoxGeometry(patchLength + 0.16, 0.018, 0.055), arrivalSurfacePatchSeamMaterial);
      seam.name = `density_arrival_pbr_road_surface_patch_seam_${segmentIndex}_${patchIndex}`;
      seam.position.copy(patch.position);
      seam.position.y = arrivalRoadDeckY + 0.075;
      seam.position.x += Math.sin(patch.rotation.y) * (-patchWidth * 0.5);
      seam.position.z += Math.cos(patch.rotation.y) * (-patchWidth * 0.5);
      seam.rotation.y = patch.rotation.y;
      arrivalRoadSurfaceGroup.add(seam);
    });
    const puddleSpecs = segmentIndex === 0
      ? [[length * -0.08, 2.5, 3.4, 0.55, -0.12]]
      : segmentIndex === 1
        ? [[length * 0.08, -2.7, 5.4, 0.72, -0.04]]
        : segmentIndex === 2
          ? [[length * -0.12, 2.3, 4.0, 0.64, 0.1]]
          : [];
    puddleSpecs.forEach(([localX, localZ, radiusX, radiusZ, rotation], puddleIndex) => {
      const puddle = new THREE.Mesh(new THREE.CircleGeometry(1, 20), arrivalPuddleMaterial.clone());
      puddle.name = `density_arrival_pbr_road_surface_puddle_${segmentIndex}_${puddleIndex}`;
      puddle.rotation.x = -Math.PI / 2;
      puddle.rotation.y = roadSurface.rotation.y + rotation;
      puddle.scale.set(radiusX, radiusZ, 1);
      puddle.position.copy(roadSurface.position);
      puddle.position.x += Math.cos(roadSurface.rotation.y) * localX + Math.sin(roadSurface.rotation.y) * localZ;
      puddle.position.z += -Math.sin(roadSurface.rotation.y) * localX + Math.cos(roadSurface.rotation.y) * localZ;
      puddle.position.y = arrivalRoadDeckY + 0.063;
      puddle.renderOrder = 4;
      puddle.userData.visualLayer = "street-canyon-surface";
      puddle.userData.environmentMaterial = "presentation wet pavement reflection patch";
      arrivalRoadSurfaceGroup.add(puddle);
    });
  }

  const arrivalRoadEdgeCourseMaterial = new THREE.MeshStandardMaterial({
    color: 0x293536,
    roughness: 0.98,
    metalness: 0.04,
    transparent: true,
    opacity: 0.82,
    depthWrite: false,
  });
  for (const [edgeZ, width] of [[191.35, 1.7], [120.65, 1.35]] as Array<[number, number]>) {
    const edgeCourse = new THREE.Mesh(new THREE.BoxGeometry(294, 0.045, width), arrivalRoadEdgeCourseMaterial.clone());
    edgeCourse.name = `density_arrival_road_service_edge_course_${edgeZ > 150 ? "near" : "far"}`;
    edgeCourse.position.set(-250, 0.092, edgeZ);
    edgeCourse.receiveShadow = true;
    edgeCourse.userData.visualLayer = "street-canyon-surface";
    edgeCourse.userData.environmentMaterial = "presentation road-to-apron service edge course";
    arrivalRoadSurfaceGroup.add(edgeCourse);
  }
  const arrivalRoadNearTransition = new THREE.Mesh(
    new THREE.BoxGeometry(294, 0.028, 0.72),
    new THREE.MeshStandardMaterial({ color: 0x5e625b, roughness: 0.98, metalness: 0.02, transparent: true, opacity: 0.72, depthWrite: false }),
  );
  arrivalRoadNearTransition.name = "density_arrival_road_near_apron_transition";
  arrivalRoadNearTransition.position.set(-250, 0.089, 193.05);
  arrivalRoadNearTransition.receiveShadow = true;
  arrivalRoadNearTransition.userData.visualLayer = "street-canyon-surface";
  arrivalRoadNearTransition.userData.environmentMaterial = "presentation compacted shoulder transition";
  arrivalRoadSurfaceGroup.add(arrivalRoadNearTransition);

  const wetBandGroup = addGroup("density_arrival_road_wet_specular_bands", { x: 0, z: 0 });
  wetBandGroup.userData.visualLayer = "street-canyon-surface";
  const wetBandMaterial = new THREE.MeshPhysicalMaterial({
    color: 0x25383d,
    roughness: 0.2,
    metalness: 0.04,
    clearcoat: 0.72,
    clearcoatRoughness: 0.08,
    reflectivity: 0.62,
    transparent: true,
    opacity: 0.58,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -1,
    polygonOffsetUnits: -1,
  });
  const addWetBand = (start: { x: number; z: number }, end: { x: number; z: number }, width: number, offset: number, opacity: number) => {
    const dx = end.x - start.x;
    const dz = end.z - start.z;
    const length = Math.hypot(dx, dz);
    const nx = -dz / Math.max(0.01, length);
    const nz = dx / Math.max(0.01, length);
    const band = new THREE.Mesh(new THREE.PlaneGeometry(length * 0.82, width), wetBandMaterial.clone());
    const bandMaterial = band.material as THREE.MeshPhysicalMaterial;
    bandMaterial.opacity = opacity;
    band.rotation.x = -Math.PI / 2;
    band.rotation.y = -Math.atan2(dz, dx);
    band.position.set((start.x + end.x) / 2 + nx * offset, 0.096, (start.z + end.z) / 2 + nz * offset);
    band.userData.environmentMaterial = "procedural wet asphalt clearcoat band";
    wetBandGroup.add(band);
  };
  addWetBand({ x: -386, z: 216 }, { x: -348, z: 181 }, 2.2, -1.7, 0.62);
  addWetBand({ x: -338, z: 178 }, { x: -298, z: 178 }, 2.5, 1.35, 0.54);
  addWetBand({ x: -289, z: 176 }, { x: -224, z: 132 }, 1.9, -1.15, 0.48);

  const roadMarkingGroup = addGroup("density_arrival_faded_lane_marks", { x: 0, z: 0 });
  const fadedMarkingMaterial = new THREE.MeshStandardMaterial({ color: 0x9a8e76, roughness: 0.96, metalness: 0.02, transparent: true, opacity: 0.68, depthWrite: false });
  const arrivalMarkingPoints = [
    { x: -388, z: 218 },
    { x: -344, z: 178 },
    { x: -292, z: 178 },
    { x: -216, z: 126 },
  ];
  for (let segmentIndex = 0; segmentIndex < 3; segmentIndex += 1) {
    const start = arrivalMarkingPoints[segmentIndex];
    const end = arrivalMarkingPoints[segmentIndex + 1];
    const dx = end.x - start.x;
    const dz = end.z - start.z;
    const length = Math.hypot(dx, dz);
    const angle = -Math.atan2(dz, dx);
    for (const t of [0.18, 0.46, 0.74]) {
      const dash = new THREE.Mesh(new THREE.BoxGeometry(Math.min(3.5, length * 0.15), 0.028, 0.17), fadedMarkingMaterial);
      dash.position.set(start.x + dx * t, 0.065, start.z + dz * t);
      dash.rotation.y = angle;
      roadMarkingGroup.add(dash);
    }
  }
  const roadWearGroup = addGroup("density_arrival_foreground_road_wear", { x: 0, z: 0 });
  const repairedAsphaltMaterial = new THREE.MeshStandardMaterial({ color: 0x1c2424, roughness: 0.96, metalness: 0.02, transparent: true, opacity: 0.82, depthWrite: false });
  const tireWearMaterial = new THREE.MeshStandardMaterial({ color: 0x101718, roughness: 0.88, metalness: 0.015, transparent: true, opacity: 0.58, depthWrite: false });
  const wetPatchMaterial = new THREE.MeshStandardMaterial({ color: 0x4c6066, roughness: 0.2, metalness: 0.18, transparent: true, opacity: 0.38, depthWrite: false });
  for (const [x, z, width, length, angle] of [
    [-383, 213.5, 6.8, 2.4, 0.74],
    [-369, 200.8, 8.8, 1.8, 0.74],
    [-350, 182.8, 5.2, 2.2, 0.56],
  ] as Array<[number, number, number, number, number]>) {
    const patch = new THREE.Mesh(new THREE.BoxGeometry(width, 0.018, length), repairedAsphaltMaterial);
    patch.position.set(x, 0.082, z);
    patch.rotation.y = angle;
    roadWearGroup.add(patch);
  }
  for (const [x, z, offset] of [
    [-381.5, 211.5, -2.4],
    [-368.8, 199.5, -2.5],
  ] as Array<[number, number, number]>) {
    const tireBand = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.02, 7.6), tireWearMaterial);
    tireBand.position.set(x + offset, 0.09, z);
    tireBand.rotation.y = 0.74;
    roadWearGroup.add(tireBand);
  }
  for (const [x, z, width, length] of [
    [-376.8, 207.2, 3.6, 1.15],
    [-357.6, 188.7, 2.8, 0.92],
  ] as Array<[number, number, number, number]>) {
    const wetPatch = new THREE.Mesh(new THREE.BoxGeometry(width, 0.022, length), wetPatchMaterial);
    wetPatch.position.set(x, 0.1, z);
    wetPatch.rotation.y = 0.74;
    roadWearGroup.add(wetPatch);
  }

  const utilityPoleMaterial = new THREE.MeshStandardMaterial({ color: 0x343d3d, roughness: 0.84, metalness: 0.42 });
  const arrivalStreetHeading = 0.56;
  const utilityGroup = addGroup("density_arrival_left_utility_poles", { x: 0, z: 0 });
  const utilityPositions = [
    { x: -397, z: 216, y: 8.5 },
    { x: -379, z: 198, y: 8.0 },
    { x: -349, z: 180, y: 7.4 },
  ];
  for (const position of utilityPositions) {
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.2, position.y, 8), utilityPoleMaterial);
    pole.position.set(position.x, position.y / 2, position.z);
    pole.castShadow = true;
    utilityGroup.add(pole);
    const crossarm = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.14, 0.14), utilityPoleMaterial);
    crossarm.position.set(position.x, position.y - 0.55, position.z);
    crossarm.rotation.y = arrivalStreetHeading;
    utilityGroup.add(crossarm);
    for (const side of [-1, 1]) {
      const insulator = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.34, 8), safetyMaterial);
      insulator.position.set(position.x + side * Math.cos(arrivalStreetHeading) * 0.9, position.y - 0.28, position.z - side * Math.sin(arrivalStreetHeading) * 0.9);
      utilityGroup.add(insulator);
    }
  }
  const cableTubeMaterial = new THREE.MeshStandardMaterial({ color: 0x20292a, roughness: 0.86, metalness: 0.42 });
  const cableCurve = new THREE.CatmullRomCurve3(utilityPositions.map((position, index) => new THREE.Vector3(position.x, position.y - 0.3 - (index === 1 ? 1.2 : 0), position.z)));
  const cable = new THREE.Mesh(new THREE.TubeGeometry(cableCurve, 24, 0.035, 6, false), cableTubeMaterial);
  cable.name = "density_arrival_left_utility_catenary";
  cable.castShadow = fullQualityPresentation;
  utilityGroup.add(cable);
  const sidewalkSeamMaterial = new THREE.MeshStandardMaterial({ color: 0x5d6462, roughness: 0.98, metalness: 0.02 });
  for (const position of [{ x: -384, z: 211 }, { x: -369, z: 197 }, { x: -338, z: 181 }]) {
    const seam = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.035, 3.0), sidewalkSeamMaterial);
    seam.position.set(position.x, 0.18, position.z);
    seam.rotation.y = arrivalStreetHeading;
    utilityGroup.add(seam);
  }

  const dumpsterMaterial = new THREE.MeshStandardMaterial({ color: 0x3e4b4b, roughness: 0.86, metalness: 0.42 });
  const dumpsterAccent = new THREE.MeshStandardMaterial({ color: 0xb66e3f, roughness: 0.72, metalness: 0.18 });
  const addDumpster = (name: string, position: { x: number; z: number }, rotationY: number) => {
    const group = addGroup(name, position);
    group.rotation.y = rotationY;
    const body = new THREE.Mesh(new THREE.BoxGeometry(4.6, 1.35, 2.5), dumpsterMaterial);
    body.position.y = 0.82;
    body.castShadow = true;
    body.receiveShadow = true;
    group.add(body);
    const rim = new THREE.Mesh(new THREE.BoxGeometry(4.9, 0.18, 2.72), dumpsterAccent);
    rim.position.y = 1.55;
    group.add(rim);
    for (const x of [-1.55, 0, 1.55]) {
      const rib = new THREE.Mesh(new THREE.BoxGeometry(0.16, 1.2, 2.62), accessSteelMaterial);
      rib.position.set(x, 0.86, 0);
      group.add(rib);
    }
    for (const x of [-1.55, 1.55]) {
      const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.18, 8), tyreMaterial);
      wheel.rotation.x = Math.PI / 2;
      wheel.position.set(x, 0.22, 0.92);
      group.add(wheel);
    }
    return group;
  };

  const addStreetLight = (name: string, position: { x: number; z: number }, rotationY: number) => {
    const group = addGroup(name, position);
    group.rotation.y = rotationY;
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.22, 7.8, 8), accessSteelMaterial);
    pole.position.y = 3.9;
    pole.castShadow = true;
    group.add(pole);
    const arm = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.14, 0.14), accessSteelMaterial);
    arm.position.set(1.05, 7.52, 0);
    group.add(arm);
    const fixture = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.26, 0.42), new THREE.MeshStandardMaterial({ color: 0xffc47e, roughness: 0.38, metalness: 0.16, emissive: 0x6b3212, emissiveIntensity: 0.7 }));
    fixture.position.set(2.2, 7.34, 0);
    group.add(fixture);
    const localLight = new THREE.PointLight(0xffa35e, 22, 38, 2);
    localLight.position.set(2.2, 6.9, 0);
    group.add(localLight);
    const groundPool = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 6.8), new THREE.MeshBasicMaterial({
      map: practicalGlowTexture,
      color: 0xff9a58,
      transparent: true,
      opacity: 0.24,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2,
    }));
    groundPool.name = `${name}_warm_ground_pool`;
    groundPool.rotation.x = -Math.PI / 2;
    groundPool.position.set(2.2, 0.088, 0);
    groundPool.renderOrder = 3;
    groundPool.userData.visualLayer = "street-light-pool";
    groundPool.userData.environmentMaterial = "presentation warm practical ground pool";
    group.add(groundPool);
    return group;
  };

  addDumpster("density_arrival_service_dumpster", { x: -371.5, z: 199.5 }, 0.56);
  addStreetLight("density_arrival_foreground_light", { x: -369, z: 205 }, 0.56);

  const roadWearMaterial = new THREE.MeshStandardMaterial({ color: 0x202829, roughness: 0.98, metalness: 0.02, transparent: true, opacity: 0.36, depthWrite: false });
  const roadMetalMaterial = new THREE.MeshStandardMaterial({ color: 0x586161, roughness: 0.84, metalness: 0.68 });
  const addRoadWear = (name: string, position: { x: number; z: number }, size: { x: number; z: number }, rotationY: number) => {
    const group = addGroup(name, position);
    group.rotation.y = rotationY;
    const patch = new THREE.Mesh(new THREE.CircleGeometry(1, 20), roadWearMaterial);
    patch.scale.set(size.x, size.z, 1);
    patch.rotation.x = -Math.PI / 2;
    patch.position.y = 0.055;
    group.add(patch);
    return group;
  };
  addRoadWear("density_arrival_tire_wear_near", { x: -373, z: 207 }, { x: 2.8, z: 0.62 }, 0.56);
  addRoadWear("density_arrival_tire_wear_foreground_left", { x: -392, z: 224 }, { x: 6.6, z: 0.46 }, 0.56);
  addRoadWear("density_arrival_tire_wear_foreground_right", { x: -382, z: 214 }, { x: 5.2, z: 0.5 }, 0.56);
  addRoadWear("density_arrival_tire_wear_mid", { x: -343, z: 181 }, { x: 3.6, z: 0.72 }, -0.18);
  const roadPatchMaterial = new THREE.MeshStandardMaterial({ color: 0x746b68, roughness: 0.98, metalness: 0.01, transparent: true, opacity: 0.23, depthWrite: false });
  for (const [index, patchData] of ([
    [{ x: -397, z: 229 }, { x: 3.1, z: 1.35 }, 0.38],
    [{ x: -386, z: 218 }, { x: 2.2, z: 1.05 }, -0.44],
    [{ x: -366, z: 199 }, { x: 3.6, z: 1.45 }, 0.28],
    [{ x: -349, z: 187 }, { x: 2.8, z: 1.05 }, -0.22],
  ] as Array<[{ x: number; z: number }, { x: number; z: number }, number]>).entries()) {
    const patch = new THREE.Mesh(new THREE.CircleGeometry(1, 18), roadPatchMaterial);
    patch.position.set(patchData[0].x, 0.063 + index * 0.0002, patchData[0].z);
    patch.scale.set(patchData[1].x, patchData[1].z, 1);
    patch.rotation.set(-Math.PI / 2, 0, patchData[2]);
    scene.add(patch);
  }
  const roadMarkMaterial = new THREE.MeshStandardMaterial({ color: 0xb2a38c, roughness: 0.92, metalness: 0.02, transparent: true, opacity: 0.58, depthWrite: false });
  for (const [index, position] of [{ x: -392, z: 220 }, { x: -382, z: 214 }, { x: -372, z: 208 }, { x: -362, z: 202 }, { x: -352, z: 196 }, { x: -342, z: 190 }].entries()) {
    const dash = new THREE.Mesh(new THREE.BoxGeometry(4.1 - index * 0.22, 0.035, 0.18), roadMarkMaterial);
    dash.position.set(position.x, 0.095, position.z);
    dash.rotation.y = 0.56;
    scene.add(dash);
  }
  const apronEdgeMark = new THREE.Mesh(new THREE.BoxGeometry(18.5, 0.035, 0.14), roadMarkMaterial);
  apronEdgeMark.position.set(-342, 0.097, 194.5);
  apronEdgeMark.rotation.y = 0.56;
  scene.add(apronEdgeMark);
  const roadJointMaterial = new THREE.MeshStandardMaterial({ color: 0x343c3d, roughness: 0.98, metalness: 0.02, transparent: true, opacity: 0.48, depthWrite: false });
  for (const [index, position] of [{ x: -379, z: 210 }, { x: -363, z: 195 }, { x: -339, z: 179 }].entries()) {
    const joint = new THREE.Mesh(new THREE.BoxGeometry(14.2 - index * 0.8, 0.035, 0.08), roadJointMaterial);
    joint.position.set(position.x, 0.062, position.z);
    joint.rotation.y = 0.56;
    scene.add(joint);
  }
  for (const position of [{ x: -397, z: 228 }, { x: -365, z: 198 }, { x: -316, z: 178 }]) {
    const manhole = new THREE.Mesh(new THREE.CylinderGeometry(0.72, 0.72, 0.06, 16), roadMetalMaterial);
    manhole.position.set(position.x, 0.12, position.z);
    manhole.receiveShadow = true;
    const group = addGroup("density_arrival_service_manhole", { x: 0, z: 0 });
    group.add(manhole);
  }

  const arrivalGantry = addGroup("density_arrival_utility_gantry", { x: -374, z: 203 });
  const arrivalRoadHeading = 0.56;
  arrivalGantry.rotation.y = arrivalRoadHeading + Math.PI / 2;
  for (const x of [-8.1, 8.1]) {
    const gantryPost = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.24, 6.8, 8), accessSteelMaterial);
    gantryPost.position.set(x, 3.4, 0);
    gantryPost.castShadow = true;
    arrivalGantry.add(gantryPost);
    const foot = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.18, 0.72), safetyMaterial);
    foot.position.set(x, 0.09, 0);
    arrivalGantry.add(foot);
  }
  const gantryBeam = new THREE.Mesh(new THREE.BoxGeometry(16.5, 0.24, 0.24), accessSteelMaterial);
  gantryBeam.position.y = 6.62;
  gantryBeam.castShadow = true;
  arrivalGantry.add(gantryBeam);
  for (const x of [-5.2, 0, 5.2]) {
    const gantrySignal = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.34, 0.24), new THREE.MeshStandardMaterial({ color: 0xffb06b, roughness: 0.34, metalness: 0.2, emissive: 0x6b2f12, emissiveIntensity: 0.48 }));
    gantrySignal.position.set(x, 6.28, 0);
    arrivalGantry.add(gantrySignal);
  }

  const addServiceVan = (name: string, position: { x: number; z: number }, rotationY: number, bodyColor: number) => {
    const group = addGroup(name, position);
    group.rotation.y = rotationY;
    const bodyMaterial = vehicleBodyMaterial.clone();
    bodyMaterial.color.setHex(bodyColor);
    const body = new THREE.Mesh(new RoundedBoxGeometry(5.4, 1.28, 2.32, 3, 0.18), bodyMaterial);
    body.position.y = 1.02;
    body.castShadow = true;
    body.receiveShadow = true;
    group.add(body);

    const cab = new THREE.Mesh(new RoundedBoxGeometry(1.92, 1.48, 2.16, 3, 0.16), bodyMaterial);
    cab.position.set(1.45, 1.46, 0);
    cab.castShadow = true;
    cab.receiveShadow = true;
    group.add(cab);

    const windshield = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.62, 1.7), vehicleGlassMaterial);
    windshield.position.set(2.43, 1.63, 0);
    group.add(windshield);
    const vanFrontTrimMaterial = new THREE.MeshStandardMaterial({ color: 0x1f2b2e, roughness: 0.7, metalness: 0.58 });
    const grille = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.34, 1.02), vanFrontTrimMaterial);
    grille.position.set(2.51, 1.02, 0);
    group.add(grille);
    for (const y of [0.91, 1.02, 1.13]) {
      const grilleSlat = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.035, 1.18), vanFrontTrimMaterial);
      grilleSlat.position.set(2.56, y, 0);
      group.add(grilleSlat);
    }
    const windshieldHeader = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.08, 1.86), vanFrontTrimMaterial);
    windshieldHeader.position.set(2.5, 1.98, 0);
    group.add(windshieldHeader);
    for (const z of [-0.94, 0.94]) {
      const windshieldSide = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.62, 0.08), vanFrontTrimMaterial);
      windshieldSide.position.set(2.5, 1.63, z);
      group.add(windshieldSide);
    }
          const sideWindowBand = new THREE.Mesh(new THREE.BoxGeometry(0.92, 0.58, 2.22), vehicleGlassMaterial);
      sideWindowBand.position.set(1.45, 1.66, 0);
      group.add(sideWindowBand);
      const cabSideWindowGeometry = new THREE.BoxGeometry(0.92, 0.56, 0.06);
      for (const z of [-1.17, 1.17]) {
        const cabSideWindow = new THREE.Mesh(cabSideWindowGeometry, vehicleGlassMaterial);
        cabSideWindow.position.set(1.46, 1.68, z);
        group.add(cabSideWindow);
      }
      const cabWindowDividerMaterial = new THREE.MeshStandardMaterial({ color: 0x263437, roughness: 0.56, metalness: 0.52 });
      for (const z of [-1.205, 1.205]) {
        const divider = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.64, 0.05), cabWindowDividerMaterial);
        divider.position.set(1.46, 1.68, z);
        group.add(divider);
      }
      const sideDoorOutlineMaterial = new THREE.MeshStandardMaterial({ color: 0x344245, roughness: 0.8, metalness: 0.3 });
      for (const z of [-1.205, 1.205]) {
        const doorLower = new THREE.Mesh(new THREE.BoxGeometry(1.62, 0.06, 0.05), sideDoorOutlineMaterial);
        doorLower.position.set(1.3, 1.02, z);
        group.add(doorLower);
        const doorRear = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.9, 0.05), sideDoorOutlineMaterial);
        doorRear.position.set(0.48, 1.42, z);
        group.add(doorRear);
      }

      const undercarriage = new THREE.Mesh(new THREE.BoxGeometry(4.1, 0.32, 2.48), tyreMaterial);
    undercarriage.position.set(-0.15, 0.48, 0);
    group.add(undercarriage);
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(5.44, 0.16, 0.08), safetyMaterial);
    stripe.position.set(0, 1.14, -1.18);
    group.add(stripe);

    if (name.includes("arrival")) {
      const wheelGeometry = new THREE.CylinderGeometry(0.38, 0.38, 0.22, 10);
      const wheelHubMaterial = new THREE.MeshStandardMaterial({ color: 0x8d9691, roughness: 0.64, metalness: 0.72 });
      const hubGeometry = new THREE.CylinderGeometry(0.13, 0.13, 0.24, 10);
      for (const x of [-1.65, 1.65]) {
        for (const z of [-1.08, 1.08]) {
          const wheel = new THREE.Mesh(wheelGeometry, tyreMaterial);
          wheel.rotation.x = Math.PI / 2;
          wheel.position.set(x, 0.48, z);
          wheel.castShadow = true;
          group.add(wheel);
          const sidewall = new THREE.Mesh(new THREE.TorusGeometry(0.39, 0.045, 6, 14), tyreMaterial);
          sidewall.rotation.x = Math.PI / 2;
          sidewall.position.set(x, 0.48, z + (z > 0 ? 0.12 : -0.12));
          group.add(sidewall);
          const hub = new THREE.Mesh(hubGeometry, wheelHubMaterial);
          hub.rotation.x = Math.PI / 2;
          hub.position.set(x, 0.48, z + (z > 0 ? 0.13 : -0.13));
          group.add(hub);
        }
      }
      const sideTrimMaterial = new THREE.MeshStandardMaterial({ color: 0x29383a, roughness: 0.72, metalness: 0.5 });
      const sidePanelSeamGeometry = new THREE.BoxGeometry(0.045, 0.98, 0.05);
      for (const x of [-1.22, 0.05, 1.08]) {
        const seam = new THREE.Mesh(sidePanelSeamGeometry, sideTrimMaterial);
        seam.position.set(x, 1.03, -1.19);
        group.add(seam);
      }
      const lowerSideSkirt = new THREE.Mesh(new THREE.BoxGeometry(4.85, 0.13, 0.06), sideTrimMaterial);
      lowerSideSkirt.position.set(-0.25, 0.68, -1.19);
      group.add(lowerSideSkirt);
      const servicePanelMaterial = new THREE.MeshStandardMaterial({ color: 0x314348, roughness: 0.82, metalness: 0.28 });
      const servicePanelInset = new THREE.Mesh(new THREE.BoxGeometry(1.72, 0.62, 0.06), servicePanelMaterial);
      servicePanelInset.position.set(-0.52, 1.43, -1.205);
      group.add(servicePanelInset);
      const servicePanelTop = new THREE.Mesh(new THREE.BoxGeometry(1.78, 0.06, 0.08), sideTrimMaterial);
      servicePanelTop.position.set(-0.52, 1.77, -1.23);
      group.add(servicePanelTop);
      const sideStepMaterial = new THREE.MeshStandardMaterial({ color: 0x293538, roughness: 0.68, metalness: 0.46 });
      const sideStep = new THREE.Mesh(new THREE.BoxGeometry(1.18, 0.12, 0.42), sideStepMaterial);
      sideStep.position.set(0.92, 0.63, -1.33);
      group.add(sideStep);
      const sideHandle = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.07, 0.06), new THREE.MeshStandardMaterial({ color: 0xd29a62, roughness: 0.5, metalness: 0.42 }));
      sideHandle.position.set(0.78, 1.45, -1.2);
      group.add(sideHandle);
      const sideMarker = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.13, 0.22), new THREE.MeshStandardMaterial({ color: 0xe4b16b, roughness: 0.38, metalness: 0.12, emissive: 0x4d2510, emissiveIntensity: 0.2 }));
      sideMarker.position.set(-1.9, 1.18, -1.2);
      group.add(sideMarker);
      const rearLampMaterial = new THREE.MeshStandardMaterial({ color: 0xb93f31, roughness: 0.48, metalness: 0.08, emissive: 0x2a0805, emissiveIntensity: 0.16 });
      const headLampMaterial = new THREE.MeshStandardMaterial({ color: 0xe0c18d, roughness: 0.34, metalness: 0.08, emissive: 0x5a3a1e, emissiveIntensity: 0.26 });
      const bumperMaterial = new THREE.MeshStandardMaterial({ color: 0x293538, roughness: 0.68, metalness: 0.46 });
      const bumperFront = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.3, 2.5), bumperMaterial);
      bumperFront.position.set(2.74, 0.62, 0);
      group.add(bumperFront);
      const bumperRear = bumperFront.clone();
      bumperRear.position.x = -2.74;
      group.add(bumperRear);
      for (const z of [-0.72, 0.72]) {
        const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.36, 0.38), rearLampMaterial);
        lamp.position.set(-2.82, 1.2, z);
        group.add(lamp);
        const headlamp = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.28, 0.34), headLampMaterial);
        headlamp.position.set(2.82, 1.18, z);
        group.add(headlamp);
      }
      for (const z of [-0.66, 0.66]) {
        const rearDoorSeam = new THREE.Mesh(new THREE.BoxGeometry(0.035, 1.92, 0.06), bumperMaterial);
        rearDoorSeam.position.set(-2.83, 1.38, z);
        group.add(rearDoorSeam);
      }
      for (const z of [-0.98, 0.98]) {
        const mirrorArm = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.05, 0.05), bumperMaterial);
        mirrorArm.position.set(2.14, 1.69, z);
        mirrorArm.rotation.y = z < 0 ? -0.18 : 0.18;
        group.add(mirrorArm);
      }
      const roofBeacon = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.18, 10), safetyMaterial);
      roofBeacon.position.set(1.45, 2.34, 0);
      group.add(roofBeacon);
      for (const z of [-1.18, 1.18]) {
        const mirror = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.18, 0.18), bumperMaterial);
        mirror.position.set(2.2, 1.72, z);
        group.add(mirror);
      }
      addArrivalContactShadow(group, `${name}_vehicle_contact_shadow`, { x: 0, z: 0 }, 5.5, 2.8, 0, 0.42);
    }
    return group;
  };

  addServiceVan("density_arrival_maintenance_van", { x: -389.5, z: 220.5 }, -0.74, 0x2f4447);
  const arrivalMidVan = addServiceVan("density_arrival_mid_service_van", { x: -380, z: 201 }, -0.74, 0x806655);
  arrivalMidVan.scale.setScalar(0.78);
  const arrivalFarVan = addServiceVan("density_arrival_far_service_van", { x: -345, z: 187 }, -0.74, 0x4e6264);
  arrivalFarVan.scale.setScalar(0.7);
  const arrivalParkedPickup = addServiceVan("density_arrival_parked_pickup", { x: -381.5, z: 213.5 }, -0.74, 0x7a6155);
  arrivalParkedPickup.scale.setScalar(0.72);
  const arrivalApronPickup = addServiceVan("density_arrival_right_apron_pickup", { x: -338, z: 220 }, arrivalStreetHeading + Math.PI, 0x586a68);
  arrivalApronPickup.scale.setScalar(0.82);

  const arrivalLorry = addGroup("density_arrival_right_apron_service_lorry", { x: -349, z: 222 });
  arrivalLorry.rotation.y = arrivalStreetHeading;
  const lorryBodyMaterial = new THREE.MeshPhysicalMaterial({ color: 0x68736f, roughness: 0.66, metalness: 0.24, clearcoat: 0.3, clearcoatRoughness: 0.18, reflectivity: 0.58 });
  const lorryTrimMaterial = new THREE.MeshStandardMaterial({ color: 0x354044, roughness: 0.7, metalness: 0.54 });
  const lorryBody = new THREE.Mesh(new RoundedBoxGeometry(5.8, 2.65, 2.52, 3, 0.2), lorryBodyMaterial);
  lorryBody.position.set(-0.72, 1.78, 0);
  lorryBody.castShadow = true;
  lorryBody.receiveShadow = true;
  arrivalLorry.add(lorryBody);
  const lorryRoofMaterial = new THREE.MeshPhysicalMaterial({ color: 0x3f4a47, roughness: 0.82, metalness: 0.2, clearcoat: 0.18, clearcoatRoughness: 0.26 });
  const lorryRoofPanel = new THREE.Mesh(new THREE.BoxGeometry(5.46, 0.06, 2.3), lorryRoofMaterial);
  lorryRoofPanel.position.set(-0.72, 3.14, 0);
  lorryRoofPanel.castShadow = true;
  arrivalLorry.add(lorryRoofPanel);
  for (const x of [-2.68, -1.22, 0.24, 1.7]) {
    const roofRib = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 2.18), lorryTrimMaterial);
    roofRib.position.set(x, 3.19, 0);
    arrivalLorry.add(roofRib);
  }
  const lorryRoofFrontRail = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.11, 2.34), lorryTrimMaterial);
  lorryRoofFrontRail.position.set(2.04, 3.17, 0);
  arrivalLorry.add(lorryRoofFrontRail);
  const lorryCab = new THREE.Mesh(new RoundedBoxGeometry(1.9, 1.92, 2.34, 3, 0.18), lorryBodyMaterial);
  lorryCab.position.set(2.62, 1.46, 0);
  lorryCab.castShadow = true;
  arrivalLorry.add(lorryCab);
  const lorryWindow = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.76, 1.78), vehicleGlassMaterial);
  lorryWindow.position.set(3.6, 1.66, 0);
  arrivalLorry.add(lorryWindow);
  const lorrySideWindows = new THREE.Mesh(new THREE.BoxGeometry(0.92, 0.72, 2.4), vehicleGlassMaterial);
  lorrySideWindows.position.set(2.64, 1.66, 0);
  arrivalLorry.add(lorrySideWindows);
  const lorryLowerRail = new THREE.Mesh(new THREE.BoxGeometry(5.95, 0.18, 0.14), safetyMaterial);
  lorryLowerRail.position.set(-0.62, 0.64, -1.31);
  arrivalLorry.add(lorryLowerRail);
  const lorryRear = new THREE.Mesh(new THREE.BoxGeometry(0.16, 2.45, 2.62), lorryTrimMaterial);
  lorryRear.position.set(-3.66, 1.62, 0);
  arrivalLorry.add(lorryRear);
  const lorryRearDoorMaterial = new THREE.MeshPhysicalMaterial({ color: 0x4e5c5d, roughness: 0.82, metalness: 0.18, clearcoat: 0.18, clearcoatRoughness: 0.28 });
  for (const z of [-0.66, 0.66]) {
    const rearDoor = new THREE.Mesh(new THREE.BoxGeometry(0.06, 1.76, 1.14), lorryRearDoorMaterial);
    rearDoor.position.set(-3.77, 1.65, z);
    rearDoor.castShadow = true;
    arrivalLorry.add(rearDoor);
    const doorUpperRail = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 1.24), lorryTrimMaterial);
    doorUpperRail.position.set(-3.82, 2.55, z);
    arrivalLorry.add(doorUpperRail);
    const doorLowerRail = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 1.24), lorryTrimMaterial);
    doorLowerRail.position.set(-3.82, 0.78, z);
    arrivalLorry.add(doorLowerRail);
    const doorHandle = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.18, 0.07), safetyMaterial);
    doorHandle.position.set(-3.84, 1.7, z + (z > 0 ? -0.18 : 0.18));
    arrivalLorry.add(doorHandle);
    const rearLamp = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.3, 0.24), new THREE.MeshStandardMaterial({ color: 0xb33d2c, roughness: 0.5, metalness: 0.12, emissive: 0x310b08, emissiveIntensity: 0.22 }));
    rearLamp.position.set(-3.84, 1.04, z + (z > 0 ? 0.45 : -0.45));
    arrivalLorry.add(rearLamp);
  }
  const lorryRearDoorSeam = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.82, 0.07), lorryTrimMaterial);
  lorryRearDoorSeam.position.set(-3.84, 1.66, 0);
  arrivalLorry.add(lorryRearDoorSeam);
  const lorryRearDirtBand = new THREE.Mesh(new THREE.BoxGeometry(0.075, 0.34, 2.38), new THREE.MeshStandardMaterial({ color: 0x2b3536, roughness: 0.98, metalness: 0.02, transparent: true, opacity: 0.72, depthWrite: false }));
  lorryRearDirtBand.position.set(-3.85, 0.64, 0);
  arrivalLorry.add(lorryRearDirtBand);
  const lorryRearPlate = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.18, 0.48), new THREE.MeshStandardMaterial({ color: 0xc4b58f, roughness: 0.66, metalness: 0.16 }));
  lorryRearPlate.position.set(-3.86, 0.96, 0);
  arrivalLorry.add(lorryRearPlate);
  const lorryRearBumper = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.22, 2.7), lorryTrimMaterial);
  lorryRearBumper.position.set(-3.86, 0.38, 0);
  arrivalLorry.add(lorryRearBumper);
  const lorryReflectiveBand = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.12, 2.44), safetyMaterial);
  lorryReflectiveBand.position.set(-3.87, 0.84, 0);
  arrivalLorry.add(lorryReflectiveBand);
  const lorryBumper = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.34, 2.52), lorryTrimMaterial);
  lorryBumper.position.set(3.62, 0.52, 0);
  arrivalLorry.add(lorryBumper);
  const lorryWheelGeometry = new THREE.CylinderGeometry(0.46, 0.46, 0.24, 10);
  for (const x of [-2.45, 1.95]) {
    for (const z of [-1.22, 1.22]) {
      const wheel = new THREE.Mesh(lorryWheelGeometry, tyreMaterial);
      wheel.rotation.x = Math.PI / 2;
      wheel.position.set(x, 0.48, z);
      wheel.castShadow = true;
      arrivalLorry.add(wheel);
      const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.3, 10), lorryTrimMaterial);
      hub.rotation.x = Math.PI / 2;
      hub.position.set(x, 0.48, z + (z > 0 ? 0.13 : -0.13));
      arrivalLorry.add(hub);
    }
  }
  const lorryGrille = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.42, 1.25), lorryTrimMaterial);
  lorryGrille.position.set(3.74, 1.04, 0);
  arrivalLorry.add(lorryGrille);
  for (const y of [0.91, 1.04, 1.17]) {
    const grilleSlat = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.035, 1.42), lorryTrimMaterial);
    grilleSlat.position.set(3.81, y, 0);
    arrivalLorry.add(grilleSlat);
  }
  for (const z of [-0.78, 0.78]) {
    const lorryLamp = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.28, 0.34), new THREE.MeshStandardMaterial({ color: 0xe5c18a, roughness: 0.32, metalness: 0.12, emissive: 0x5d3518, emissiveIntensity: 0.24 }));
    lorryLamp.position.set(3.82, 1.42, z);
    arrivalLorry.add(lorryLamp);
  }
  for (const x of [-3.0, -1.6, -0.2, 1.2]) {
    const cargoSeam = new THREE.Mesh(new THREE.BoxGeometry(0.07, 2.42, 0.12), lorryTrimMaterial);
    cargoSeam.position.set(x, 1.78, -1.31);
    arrivalLorry.add(cargoSeam);
  }
  const lorryMarker = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.28, 0.46), safetyMaterial);
  lorryMarker.position.set(-3.76, 1.14, -0.88);
  arrivalLorry.add(lorryMarker);
  addArrivalContactShadow(arrivalLorry, "density_arrival_right_apron_service_lorry_contact_shadow", { x: -0.25, z: 0 }, 6.9, 2.9, 0, 0.48);
  // Keep the service lorry present as a near-scale cue, but prevent it from occluding the arrival corridor.
  arrivalLorry.scale.setScalar(0.54);
  arrivalLorry.position.x += 5.5;
  arrivalLorry.position.z += 10.5;

  const apronCanopy = addGroup("density_arrival_right_apron_loading_canopy", { x: -350, z: 218 });
  apronCanopy.rotation.y = arrivalStreetHeading + Math.PI;
  const canopySteel = new THREE.MeshStandardMaterial({ color: 0x354144, roughness: 0.72, metalness: 0.58 });
  const canopyRoofMaterial = new THREE.MeshStandardMaterial({ color: 0x59615e, roughness: 0.84, metalness: 0.32 });
  const canopySafety = new THREE.MeshStandardMaterial({ color: 0xc17a49, roughness: 0.72, metalness: 0.16, emissive: 0x2f1509, emissiveIntensity: 0.16 });
  const canopyRoof = new THREE.Mesh(new THREE.BoxGeometry(27, 0.22, 4.6), canopyRoofMaterial);
  canopyRoof.position.y = 6.35;
  canopyRoof.castShadow = true;
  apronCanopy.add(canopyRoof);
  const canopyFascia = new THREE.Mesh(new THREE.BoxGeometry(27.4, 0.38, 0.2), canopySteel);
  canopyFascia.position.set(0, 6.05, 2.22);
  apronCanopy.add(canopyFascia);
  for (const x of [-12.2, -4.1, 4.1, 12.2]) {
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.24, 6.0, 0.24), canopySteel);
    post.position.set(x, 3.0, 1.82);
    post.castShadow = true;
    apronCanopy.add(post);
    const brace = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.16, 3.9), canopySteel);
    brace.position.set(x, 5.62, 0.0);
    brace.rotation.x = -0.16;
    apronCanopy.add(brace);
  }
  for (const x of [-8.2, 0, 8.2]) {
    const bayMarker = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.86, 0.08), canopySafety);
    bayMarker.position.set(x, 5.42, 2.34);
    apronCanopy.add(bayMarker);
    const dockLamp = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.18, 0.34), new THREE.MeshStandardMaterial({ color: 0xffbd73, roughness: 0.34, metalness: 0.12, emissive: 0x783713, emissiveIntensity: 0.8 }));
    dockLamp.position.set(x, 5.72, 2.18);
    apronCanopy.add(dockLamp);
    const dockPool = new THREE.PointLight(0xffa15f, 12, 22, 2);
    dockPool.position.set(x, 5.35, 1.5);
    apronCanopy.add(dockPool);
  }

  const curbServiceRack = addGroup("density_arrival_curb_service_rack", { x: -374.5, z: 204.5 });
  curbServiceRack.rotation.y = -0.74;
  const rackSteel = new THREE.MeshStandardMaterial({ color: 0x343d3d, roughness: 0.78, metalness: 0.56 });
  const rackWood = new THREE.MeshStandardMaterial({ color: 0x755f49, roughness: 0.88, metalness: 0.06 });
  for (const x of [-1.7, 1.7]) {
    const upright = new THREE.Mesh(new THREE.BoxGeometry(0.14, 2.4, 0.14), rackSteel);
    upright.position.set(x, 1.2, 0);
    curbServiceRack.add(upright);
  }
  for (const y of [0.35, 1.25, 2.18]) {
    const shelf = new THREE.Mesh(new THREE.BoxGeometry(3.7, 0.14, 1.25), rackSteel);
    shelf.position.set(0, y, 0);
    curbServiceRack.add(shelf);
  }
  for (const [x, y, z] of [[-0.92, 0.78, 0], [0.55, 1.68, 0], [0.95, 0.78, 0.08]] as Array<[number, number, number]>) {
    const crate = new THREE.Mesh(new THREE.BoxGeometry(0.92, 0.72, 0.84), rackWood);
    crate.position.set(x, y, z);
    curbServiceRack.add(crate);
  }
  const rackBaseMaterial = new THREE.MeshStandardMaterial({ color: 0x4e514b, roughness: 0.96, metalness: 0.08 });
  const rackBase = new THREE.Mesh(new THREE.BoxGeometry(4.35, 0.16, 1.48), rackBaseMaterial);
  rackBase.position.set(0, 0.08, 0);
  rackBase.receiveShadow = true;
  curbServiceRack.add(rackBase);
  for (const x of [-1.7, 1.7]) {
    const foot = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.12, 0.52), rackSteel);
    foot.position.set(x, 0.2, 0);
    foot.receiveShadow = true;
    curbServiceRack.add(foot);
  }
  const rackBackBrace = new THREE.Mesh(new THREE.BoxGeometry(3.35, 0.11, 0.11), rackSteel);
  rackBackBrace.position.set(0, 1.02, -0.56);
  rackBackBrace.rotation.z = 0.1;
  curbServiceRack.add(rackBackBrace);
  const rackSign = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.42, 0.12), safetyMaterial);
  rackSign.position.set(0, 2.55, 0);
  curbServiceRack.add(rackSign);
  addArrivalContactShadow(curbServiceRack, "density_arrival_curb_service_rack_contact_shadow", { x: 0, z: 0 }, 4.8, 2.05, 0, 0.34);

  addServiceVan("density_loading_service_van", { x: -126, z: 120 }, 0.12, 0x75624d);
  addServiceVan("density_core_service_van", { x: 146, z: -208 }, Math.PI, 0x4d5b56);

  const arrivalGate = addGroup("density_arrival_gate_frame", { x: -292, z: 178 });
  const gateSteel = new THREE.MeshStandardMaterial({ color: 0x384447, roughness: 0.68, metalness: 0.62 });
  const gateConcrete = new THREE.MeshStandardMaterial({ color: 0x686b66, roughness: 0.94, metalness: 0.05 });
  const gateSafety = new THREE.MeshStandardMaterial({ color: 0xd48745, roughness: 0.72, metalness: 0.12, emissive: 0x2d1308, emissiveIntensity: 0.12 });
  for (const side of [-1, 1]) {
    const pier = new THREE.Mesh(new THREE.BoxGeometry(1.35, 5.8, 1.35), gateConcrete);
    pier.position.set(0, 2.9, side * 10.2);
    pier.castShadow = false;
    pier.receiveShadow = true;
    arrivalGate.add(pier);
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.32, 6.7, 0.32), gateSteel);
    post.position.set(0, 3.35, side * 10.2);
    arrivalGate.add(post);
    const beacon = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.28, 0.62), gateSafety);
    beacon.position.set(0, 6.82, side * 10.2);
    arrivalGate.add(beacon);
  }
  const gateCrossbeam = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.22, 20.4), gateSteel);
  gateCrossbeam.position.set(0, 6.72, 0);
  gateCrossbeam.castShadow = true;
  arrivalGate.add(gateCrossbeam);
  const gateArm = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.22, 18.7), gateSafety);
  gateArm.position.set(0.6, 4.85, 0);
  gateArm.rotation.x = -0.28;
  arrivalGate.add(gateArm);
  const gateSign = new THREE.Mesh(new THREE.BoxGeometry(0.18, 1.35, 7.4), new THREE.MeshStandardMaterial({ color: 0x1e2c30, roughness: 0.58, metalness: 0.34, emissive: 0x09171a, emissiveIntensity: 0.22 }));
  gateSign.position.set(-0.12, 7.28, -8.85);
  gateSign.rotation.y = -2.69;
  gateSign.castShadow = true;
  arrivalGate.add(gateSign);
  for (const y of [6.7, 7.86]) {
    const signBand = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.12, 7.6), gateSafety);
    signBand.position.set(-0.24, y, -8.85);
    signBand.rotation.y = -2.69;
    arrivalGate.add(signBand);
  }

  const addAccessStructure = (name: string, position: { x: number; z: number }, rotationY: number, width: number, height: number) => {
    const group = addGroup(name, position);
    group.rotation.y = rotationY;
    const stairDepth = 4.2;
    const stair = new THREE.Mesh(new THREE.BoxGeometry(width, 0.22, stairDepth), accessSteelMaterial);
    stair.position.set(0, height / 2, -0.35);
    stair.rotation.x = -Math.atan2(height, stairDepth);
    stair.castShadow = true;
    stair.receiveShadow = true;
    group.add(stair);

    const landing = new THREE.Mesh(new THREE.BoxGeometry(width + 0.6, 0.24, 2.6), accessSteelMaterial);
    landing.position.set(0, height, 1.35);
    landing.castShadow = true;
    landing.receiveShadow = true;
    group.add(landing);

    const support = new THREE.Mesh(new THREE.BoxGeometry(width + 0.36, 0.22, 0.22), accessSteelMaterial);
    support.position.set(0, height / 2, 1.65);
    support.castShadow = true;
    group.add(support);
    const rail = new THREE.Mesh(new THREE.BoxGeometry(width + 0.36, 1.1, 2.65), accessSteelMaterial);
    rail.position.set(0, height + 0.55, 1.35);
    group.add(rail);
    const topRail = new THREE.Mesh(new THREE.BoxGeometry(width + 0.6, 0.16, 0.16), accessSteelMaterial);
    topRail.position.set(0, height + 1.1, 2.56);
    group.add(topRail);
    const canopy = new THREE.Mesh(new THREE.BoxGeometry(width + 1.0, 0.14, 2.7), new THREE.MeshStandardMaterial({ color: 0x59625e, roughness: 0.82, metalness: 0.34 }));
    canopy.position.set(0, height + 2.2, 1.35);
    canopy.castShadow = true;
    group.add(canopy);
    return group;
  };

  addAccessStructure("density_loading_facade_access", { x: -122, z: 111.5 }, 0, 7.2, 4.6);
  addAccessStructure("density_plant_facade_access", { x: 288, z: -48.5 }, Math.PI * 0.5, 6.2, 5.2);

  const signageGroup = addGroup("density_loading_frontage_signage", { x: -58, z: 111.4 });
  const signFrame = new THREE.Mesh(new THREE.BoxGeometry(10.5, 3.0, 0.18), accessSteelMaterial);
  signFrame.position.y = 4.4;
  signFrame.castShadow = true;
  signageGroup.add(signFrame);
  const signPanel = new THREE.Mesh(new THREE.BoxGeometry(9.5, 2.1, 0.12), new THREE.MeshStandardMaterial({ color: 0x354a4c, roughness: 0.58, metalness: 0.28, emissive: 0x102628, emissiveIntensity: 0.24 }));
  signPanel.position.set(0, 4.4, -0.12);
  signageGroup.add(signPanel);
  for (const x of [-3.3, 0, 3.3]) {
    const marker = new THREE.Mesh(new THREE.BoxGeometry(1.45, 0.18, 0.05), safetyMaterial);
    marker.position.set(x, 4.4, -0.2);
    signageGroup.add(marker);
  }

  const arrivalCatwalk = addGroup("density_arrival_frontage_catwalk", { x: -334, z: 160 });
  const catwalkDeck = new THREE.Mesh(new THREE.BoxGeometry(38, 0.24, 2.6), accessSteelMaterial);
  catwalkDeck.position.set(0, 8.8, 0);
  catwalkDeck.receiveShadow = true;
  arrivalCatwalk.add(catwalkDeck);
  const catwalkSupports = new THREE.Mesh(new THREE.BoxGeometry(0.28, 9.0, 0.28), accessSteelMaterial);
  catwalkSupports.position.set(-16.6, 4.5, 0.8);
  arrivalCatwalk.add(catwalkSupports);
  const catwalkRearSupport = catwalkSupports.clone();
  catwalkRearSupport.position.x = 16.6;
  arrivalCatwalk.add(catwalkRearSupport);
  const catwalkRail = new THREE.Mesh(new THREE.BoxGeometry(38.4, 1.1, 0.14), accessSteelMaterial);
  catwalkRail.position.set(0, 9.35, 1.18);
  arrivalCatwalk.add(catwalkRail);
  const catwalkCanopy = new THREE.Mesh(new THREE.BoxGeometry(39.5, 0.14, 2.8), new THREE.MeshStandardMaterial({ color: 0x59625e, roughness: 0.82, metalness: 0.34 }));
  catwalkCanopy.position.set(0, 11.15, 0);
  arrivalCatwalk.add(catwalkCanopy);

  densityObjects
    .filter((object) => object.userData.visualLayer === "street-story-density")
    .forEach((object) => object.traverse((child) => {
      if (child instanceof THREE.Mesh) child.castShadow = !litePreview || fullQualityPresentation;
    }));
}

function addArrivalCanyonComposition() {
  const root = new THREE.Group();
  root.name = "density_arrival_canyon_composition";
  root.userData.visualLayer = "street-canyon";
  densityObjects.push(root);
  scene.add(root);
  const arrivalHorizonGlow = addPracticalGlowSprite(root, { x: -286, y: 34, z: 168 }, 0xf2a46d, 68, 0.22);
  arrivalHorizonGlow.name = "presentation_arrival_horizon_backlight";
  arrivalHorizonGlow.userData.visualLayer = "street-canyon-atmosphere";

  const shellMaterial = new THREE.MeshStandardMaterial({ color: 0x817066, roughness: 0.9, metalness: 0.2 });
  const coolShellMaterial = new THREE.MeshStandardMaterial({ color: 0x4e6265, roughness: 0.84, metalness: 0.3 });
  const parapetMaterial = new THREE.MeshStandardMaterial({ color: 0x303a3b, roughness: 0.76, metalness: 0.62 });
  const windowMaterial = new THREE.MeshStandardMaterial({ color: 0x18262a, roughness: 0.26, metalness: 0.44, emissive: 0x0b1719, emissiveIntensity: 0.22 });
  const awningMaterial = new THREE.MeshStandardMaterial({ color: 0x625d55, roughness: 0.84, metalness: 0.34 });
  const warmWindowMaterial = new THREE.MeshStandardMaterial({ color: 0xffc982, roughness: 0.3, metalness: 0.08, emissive: 0x6d3518, emissiveIntensity: 0.55 });
  const baseCourseMaterial = new THREE.MeshStandardMaterial({ color: 0x3d4848, roughness: 0.82, metalness: 0.34 });
  const concretePlinthMaterial = new THREE.MeshStandardMaterial({ color: 0x8c8174, roughness: 0.96, metalness: 0.04 });
  const warmMasonryMaterial = new THREE.MeshStandardMaterial({ color: 0x815c50, roughness: 0.94, metalness: 0.05 });
  const paintedSheetMaterial = new THREE.MeshStandardMaterial({ color: 0x6d7977, roughness: 0.86, metalness: 0.32 });
  const weatheredConcreteMaterial = new THREE.MeshStandardMaterial({ color: 0x9a8d7d, roughness: 0.98, metalness: 0.03 });

  const addFrontage = (name: string, center: { x: number; z: number }, dimensions: { x: number; y: number; z: number }, rotationY: number, rows: number, material: THREE.Material) => {
    const facade = new THREE.Group();
    facade.name = name;
    facade.position.set(center.x, 0, center.z);
    facade.rotation.y = rotationY;
    root.add(facade);

    const shell = new THREE.Mesh(new THREE.BoxGeometry(dimensions.x, dimensions.y, dimensions.z), material);
    shell.name = `${name}_shell`;
    shell.position.y = dimensions.y / 2;
    shell.castShadow = fullQualityPresentation;
    shell.receiveShadow = true;
    shell.userData.streetFacadeShell = true;
    shell.userData.streetFacadeDimensions = dimensions;
    facade.add(shell);
    const plinth = new THREE.Mesh(new THREE.BoxGeometry(dimensions.x * 0.94, 0.86, 0.22), concretePlinthMaterial);
    plinth.position.set(0, 0.52, dimensions.z / 2 + 0.16);
    plinth.receiveShadow = true;
    facade.add(plinth);
    const baseCourse = new THREE.Mesh(new THREE.BoxGeometry(dimensions.x * 0.9, 1.12, 0.16), baseCourseMaterial);
    baseCourse.position.set(0, 1.34, dimensions.z / 2 + 0.23);
    baseCourse.castShadow = fullQualityPresentation;
    facade.add(baseCourse);
    if (name.includes("left_setback")) {
      const leftPierMaterial = new THREE.MeshStandardMaterial({ color: 0x2d3738, roughness: 0.78, metalness: 0.62 });
      for (const x of [-11.2, -5.6, 0, 5.6, 11.2]) {
        const pier = new THREE.Mesh(new THREE.BoxGeometry(0.34, dimensions.y - 1.0, 0.42), leftPierMaterial);
        pier.name = `${name}_proud_i_pier_${x}`;
        pier.position.set(x, (dimensions.y - 1.0) / 2 + 0.5, dimensions.z / 2 + 0.54);
        pier.castShadow = fullQualityPresentation;
        pier.receiveShadow = true;
        pier.userData.visualLayer = "street-canyon-facade-massing";
        facade.add(pier);
      }
      const leftSplashBand = new THREE.Mesh(new THREE.BoxGeometry(dimensions.x * 0.88, 1.2, 0.2), baseCourseMaterial);
      leftSplashBand.name = `${name}_dark_splash_zone_plinth`;
      leftSplashBand.position.set(0, 1.15, dimensions.z / 2 + 0.48);
      leftSplashBand.receiveShadow = true;
      leftSplashBand.userData.visualLayer = "street-canyon-facade-massing";
      facade.add(leftSplashBand);
      const leftRoofGutter = new THREE.Mesh(new THREE.BoxGeometry(dimensions.x * 0.92, 0.16, 0.3), parapetMaterial);
      leftRoofGutter.name = `${name}_roof_gutter_cap`;
      leftRoofGutter.position.set(0, dimensions.y - 0.42, dimensions.z / 2 + 0.55);
      leftRoofGutter.castShadow = fullQualityPresentation;
      facade.add(leftRoofGutter);
      const leftRollupMaterial = new THREE.MeshStandardMaterial({ color: 0x293537, roughness: 0.82, metalness: 0.56 });
      const leftDoorFrameMaterial = new THREE.MeshStandardMaterial({ color: 0x1f292a, roughness: 0.7, metalness: 0.7 });
      const leftDoorLampMaterial = new THREE.MeshStandardMaterial({ color: 0xffb16d, roughness: 0.3, metalness: 0.08, emissive: 0x713218, emissiveIntensity: 1.1 });
      for (const doorX of [-7.2, 6.4]) {
        const door = new THREE.Mesh(new THREE.BoxGeometry(4.55, 2.35, 0.1), leftRollupMaterial);
        door.name = `${name}_rollup_service_door_${doorX}`;
        door.position.set(doorX, 2.48, dimensions.z / 2 + 0.32);
        door.receiveShadow = true;
        facade.add(door);
        const header = new THREE.Mesh(new THREE.BoxGeometry(4.86, 0.16, 0.2), leftDoorFrameMaterial);
        header.position.set(doorX, 3.7, dimensions.z / 2 + 0.4);
        facade.add(header);
        for (const side of [-1, 1]) {
          const jamb = new THREE.Mesh(new THREE.BoxGeometry(0.16, 2.5, 0.2), leftDoorFrameMaterial);
          jamb.position.set(doorX + side * 2.34, 2.48, dimensions.z / 2 + 0.4);
          facade.add(jamb);
        }
        const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.16, 0.1), leftDoorLampMaterial);
        lamp.position.set(doorX, 3.98, dimensions.z / 2 + 0.42);
        facade.add(lamp);
      }
    }

    if (name.includes("left_near_maintenance")) {
      const leftNearCladdingMaterial = new THREE.MeshStandardMaterial({ color: 0x5d625c, roughness: 0.86, metalness: 0.34 });
      const leftNearCladding = new THREE.Mesh(new THREE.BoxGeometry(dimensions.x * 0.96, dimensions.y * 0.7, 0.13), leftNearCladdingMaterial);
      leftNearCladding.name = `${name}_continuous_corrugated_cladding`;
      leftNearCladding.position.set(0, dimensions.y * 0.56, dimensions.z / 2 + 0.36);
      leftNearCladding.receiveShadow = true;
      leftNearCladding.userData.visualLayer = "street-canyon-facade-massing";
      facade.add(leftNearCladding);
      const claddingRibMaterial = new THREE.MeshStandardMaterial({ color: 0x303a38, roughness: 0.82, metalness: 0.58 });
      const ribCount = Math.max(8, Math.floor(dimensions.x / 1.1));
      for (let ribIndex = 0; ribIndex < ribCount; ribIndex += 1) {
        const rib = new THREE.Mesh(new THREE.BoxGeometry(0.075, dimensions.y * 0.66, 0.12), claddingRibMaterial);
        rib.position.set(-dimensions.x * 0.46 + ribIndex * dimensions.x * 0.92 / Math.max(1, ribCount - 1), dimensions.y * 0.56, dimensions.z / 2 + 0.46);
        rib.castShadow = fullQualityPresentation;
        facade.add(rib);
      }
      for (const y of [2.0, 4.15, 6.15]) {
        const seamBand = new THREE.Mesh(new THREE.BoxGeometry(dimensions.x * 0.94, 0.09, 0.14), claddingRibMaterial);
        seamBand.position.set(0, y, dimensions.z / 2 + 0.47);
        facade.add(seamBand);
      }
      const leftNearRearWall = new THREE.Mesh(new THREE.BoxGeometry(dimensions.x * 0.92, dimensions.y * 0.76, 0.34), paintedSheetMaterial);
      leftNearRearWall.name = `${name}_rear_corrugated_occluder_wall`;
      leftNearRearWall.position.set(0, dimensions.y * 0.44, -0.12);
      leftNearRearWall.castShadow = fullQualityPresentation;
      leftNearRearWall.receiveShadow = true;
      leftNearRearWall.userData.streetFacadeShell = true;
      leftNearRearWall.userData.arrivalFacadeTint = 0x46504d;
      leftNearRearWall.userData.streetFacadeDimensions = { x: dimensions.x * 0.92, y: dimensions.y * 0.76, z: 0.34 };
      facade.add(leftNearRearWall);
    }

    if (name.includes("right")) {
      const rightPilasterMaterial = new THREE.MeshStandardMaterial({ color: 0x263538, roughness: 0.72, metalness: 0.68 });
      const pilasterXs = [-dimensions.x * 0.42, -dimensions.x * 0.14, dimensions.x * 0.14, dimensions.x * 0.42];
      for (const x of pilasterXs) {
        const pilaster = new THREE.Mesh(new THREE.BoxGeometry(0.46, Math.max(5.4, dimensions.y - 1.9), 0.42), rightPilasterMaterial);
        pilaster.position.set(x, Math.max(3.3, (dimensions.y - 1.2) / 2), dimensions.z / 2 + 0.42);
        pilaster.castShadow = fullQualityPresentation;
        pilaster.receiveShadow = true;
        pilaster.userData.visualDetail = "arrival-right-frontage-i-pilaster";
        facade.add(pilaster);
      }
      const rightGutter = new THREE.Mesh(new THREE.BoxGeometry(dimensions.x * 0.88, 0.16, 0.28), rightPilasterMaterial);
      rightGutter.position.set(0, dimensions.y - 1.05, dimensions.z / 2 + 0.48);
      rightGutter.castShadow = fullQualityPresentation;
      facade.add(rightGutter);
      for (const x of [-dimensions.x * 0.35, dimensions.x * 0.36]) {
        const downspout = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, Math.max(5.2, dimensions.y - 1.2), 8), rightPilasterMaterial);
        downspout.position.set(x, Math.max(3.0, (dimensions.y - 1.0) / 2), dimensions.z / 2 + 0.58);
        downspout.castShadow = fullQualityPresentation;
        facade.add(downspout);
        const outlet = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.14, 0.72), rightPilasterMaterial);
        outlet.position.set(x, 1.28, dimensions.z / 2 + 0.74);
        facade.add(outlet);
      }
      const serviceConduit = new THREE.Mesh(new THREE.BoxGeometry(dimensions.x * 0.74, 0.14, 0.18), rightPilasterMaterial);
      serviceConduit.position.set(0, 2.18, dimensions.z / 2 + 0.58);
      facade.add(serviceConduit);
      for (const x of [-dimensions.x * 0.23, dimensions.x * 0.23]) {
        const junctionBox = new THREE.Mesh(new THREE.BoxGeometry(0.82, 0.68, 0.18), new THREE.MeshStandardMaterial({ color: 0x4a5b58, roughness: 0.78, metalness: 0.42 }));
        junctionBox.position.set(x, 2.62, dimensions.z / 2 + 0.66);
        facade.add(junctionBox);
      }
    }
    const lowerFacadeMaterial = name.includes("left") ? warmMasonryMaterial : paintedSheetMaterial;
    const lowerBayCount = Math.max(4, Math.floor(dimensions.x / 5.2));
    const lowerBayWidth = dimensions.x * 0.84 / lowerBayCount;
    for (let bayIndex = 0; bayIndex < lowerBayCount; bayIndex += 1) {
      const bay = new THREE.Mesh(new THREE.BoxGeometry(lowerBayWidth - 0.16, 2.36, 0.16), lowerFacadeMaterial);
      bay.position.set(-dimensions.x * 0.42 + lowerBayWidth * (bayIndex + 0.5), 2.72, dimensions.z / 2 + 0.28);
      bay.receiveShadow = true;
      facade.add(bay);
      const seam = new THREE.Mesh(new THREE.BoxGeometry(0.08, 2.42, 0.18), parapetMaterial);
      seam.position.set(bay.position.x + lowerBayWidth * 0.5 - 0.08, 2.72, dimensions.z / 2 + 0.38);
      facade.add(seam);
    }

    const parapet = new THREE.Mesh(new THREE.BoxGeometry(dimensions.x + 1.4, 0.72, dimensions.z + 0.8), parapetMaterial);
    parapet.position.y = dimensions.y + 0.36;
    parapet.castShadow = fullQualityPresentation;
    facade.add(parapet);

    const windowGeometry = new THREE.BoxGeometry(2.8, 1.45, 0.08);
    const windowCount = rows * 6;
    const windows = new THREE.InstancedMesh(windowGeometry, windowMaterial, windowCount);
    const dummy = new THREE.Object3D();
    let instance = 0;
    for (let row = 0; row < rows; row += 1) {
      for (let column = 0; column < 6; column += 1) {
        dummy.position.set(-dimensions.x * 0.38 + column * dimensions.x * 0.15, 4.1 + row * 4.35, dimensions.z / 2 + 0.08);
        dummy.updateMatrix();
        windows.setMatrixAt(instance, dummy.matrix);
        instance += 1;
      }
    }
    windows.instanceMatrix.needsUpdate = true;
    facade.add(windows);

    const revealMaterial = new THREE.MeshStandardMaterial({ color: 0x20292b, roughness: 0.72, metalness: 0.34 });
    const reveals = new THREE.InstancedMesh(new THREE.BoxGeometry(3.18, 1.82, 0.08), revealMaterial, windowCount);
    const verticalFrames = new THREE.InstancedMesh(new THREE.BoxGeometry(0.11, 1.62, 0.14), parapetMaterial, windowCount * 2);
    const horizontalFrames = new THREE.InstancedMesh(new THREE.BoxGeometry(2.96, 0.11, 0.14), parapetMaterial, windowCount * 2);
    const warmWindowPositions: Array<{ x: number; y: number }> = [];
    let revealIndex = 0;
    let verticalIndex = 0;
    let horizontalIndex = 0;
    for (let row = 0; row < rows; row += 1) {
      for (let column = 0; column < 6; column += 1) {
        const windowX = -dimensions.x * 0.38 + column * dimensions.x * 0.15;
        const windowY = 4.1 + row * 4.35;
        dummy.position.set(windowX, windowY, dimensions.z / 2 + 0.02);
        dummy.rotation.set(0, 0, 0);
        dummy.updateMatrix();
        reveals.setMatrixAt(revealIndex, dummy.matrix);
        revealIndex += 1;
        for (const xOffset of [-1.42, 1.42]) {
          dummy.position.set(windowX + xOffset, windowY, dimensions.z / 2 + 0.15);
          dummy.updateMatrix();
          verticalFrames.setMatrixAt(verticalIndex, dummy.matrix);
          verticalIndex += 1;
        }
        for (const yOffset of [-0.82, 0.82]) {
          dummy.position.set(windowX, windowY + yOffset, dimensions.z / 2 + 0.15);
          dummy.updateMatrix();
          horizontalFrames.setMatrixAt(horizontalIndex, dummy.matrix);
          horizontalIndex += 1;
        }
        if ((row * 6 + column) % 7 === 1) warmWindowPositions.push({ x: windowX, y: windowY });
      }
    }
    reveals.instanceMatrix.needsUpdate = true;
    verticalFrames.instanceMatrix.needsUpdate = true;
    horizontalFrames.instanceMatrix.needsUpdate = true;
    facade.add(reveals, verticalFrames, horizontalFrames);
    const warmWindows = new THREE.InstancedMesh(new THREE.BoxGeometry(2.48, 1.12, 0.06), warmWindowMaterial, Math.max(1, warmWindowPositions.length));
    warmWindowPositions.forEach((position, index) => {
      dummy.position.set(position.x, position.y, dimensions.z / 2 + 0.19);
      dummy.rotation.set(0, 0, 0);
      dummy.updateMatrix();
      warmWindows.setMatrixAt(index, dummy.matrix);
    });
    warmWindows.instanceMatrix.needsUpdate = true;
    facade.add(warmWindows);

    const panelMaterial = new THREE.MeshStandardMaterial({ color: name.includes("left") ? 0x765d52 : 0x566267, roughness: 0.9, metalness: 0.16 });
    const panelTrimMaterial = new THREE.MeshStandardMaterial({ color: 0x313a3a, roughness: 0.76, metalness: 0.58 });
    const panelMaterials = [panelMaterial, warmMasonryMaterial, paintedSheetMaterial, weatheredConcreteMaterial];
    if (name.includes("left_near_maintenance")) {
      const bayBackingMaterial = new THREE.MeshStandardMaterial({ color: 0x293638, roughness: 0.92, metalness: 0.38 });
      const bayBacking = new THREE.Mesh(new THREE.BoxGeometry(5.5, 3.35, 0.12), bayBackingMaterial);
      bayBacking.position.set(-3.45, 2.18, dimensions.z / 2 + 0.2);
      bayBacking.userData.streetFacadeShell = true;
      bayBacking.userData.arrivalFacadeTint = 0x5e625f;
      bayBacking.userData.streetFacadeDimensions = { x: 5.5, y: 3.35, z: 0.12 };
      facade.add(bayBacking);
      const bayRibMaterial = new THREE.MeshStandardMaterial({ color: 0x202b2d, roughness: 0.82, metalness: 0.58 });
      for (const ribX of [-5.75, -4.62, -3.49, -2.36, -1.23]) {
        const rib = new THREE.Mesh(new THREE.BoxGeometry(0.09, 3.05, 0.16), bayRibMaterial);
        rib.position.set(ribX, 2.22, dimensions.z / 2 + 0.3);
        facade.add(rib);
      }
      const bayHeader = new THREE.Mesh(new THREE.BoxGeometry(5.8, 0.18, 0.24), panelTrimMaterial);
      bayHeader.position.set(-3.45, 3.92, dimensions.z / 2 + 0.34);
      facade.add(bayHeader);
      const bayCanopy = new THREE.Mesh(new THREE.BoxGeometry(6.2, 0.14, 1.0), awningMaterial);
      bayCanopy.position.set(-3.45, 4.18, dimensions.z / 2 + 0.72);
      bayCanopy.rotation.x = -0.08;
      facade.add(bayCanopy);
      const bayLamp = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.12, 0.22), warmWindowMaterial);
      bayLamp.position.set(-3.45, 3.7, dimensions.z / 2 + 0.48);
      facade.add(bayLamp);
    }
    for (let row = 0; row < Math.max(0, rows - 1); row += 1) {
      for (let column = 0; column < 3; column += 1) {
        const panelX = -dimensions.x * 0.3 + column * dimensions.x * 0.3;
        const panelY = 6.18 + row * 4.35;
        const panel = new THREE.Mesh(new THREE.BoxGeometry(dimensions.x * 0.17, 2.18, 0.08), panelMaterials[(column + (name.includes("right") ? 1 : 0)) % panelMaterials.length]);
        panel.position.set(panelX, panelY, dimensions.z / 2 + 0.05);
        panel.userData.arrivalFacadePanel = true;
        panel.userData.arrivalFacadeTint = name.includes("right") ? 0x677878 : column === 1 ? 0x6d5b52 : 0x765f58;
        panel.userData.streetFacadeDimensions = { x: dimensions.x * 0.17, y: 2.18, z: 0.08 };
        facade.add(panel);
        const panelTop = new THREE.Mesh(new THREE.BoxGeometry(dimensions.x * 0.19, 0.1, 0.14), panelTrimMaterial);
        panelTop.position.set(panelX, panelY + 1.15, dimensions.z / 2 + 0.14);
        facade.add(panelTop);
        const panelSeam = new THREE.Mesh(new THREE.BoxGeometry(0.07, 2.08, 0.13), panelTrimMaterial);
        panelSeam.position.set(panelX + dimensions.x * 0.085, panelY, dimensions.z / 2 + 0.14);
        facade.add(panelSeam);
      }
    }
    if (name.includes("left")) {
      const brickColumns = Math.max(8, Math.floor(dimensions.x / 2.4));
      const brickRows = 2;
      const masonryBacking = new THREE.Mesh(new THREE.BoxGeometry(dimensions.x * 0.86, 1.72, 0.08), baseCourseMaterial);
      masonryBacking.position.set(0, 2.68, dimensions.z / 2 + 0.12);
      facade.add(masonryBacking);
      const brickCount = brickColumns * brickRows;
      const brickMasonry = new THREE.InstancedMesh(new THREE.BoxGeometry(2.35, 0.62, 0.1), warmMasonryMaterial, brickCount);
      const brickStep = dimensions.x * 0.82 / brickColumns;
      let brickIndex = 0;
      for (let row = 0; row < brickRows; row += 1) {
        for (let column = 0; column < brickColumns; column += 1) {
          const offset = row % 2 === 1 ? brickStep * 0.5 : 0;
          dummy.position.set(-dimensions.x * 0.41 + ((column * brickStep + offset) % (dimensions.x * 0.82)), 2.22 + row * 0.84, dimensions.z / 2 + 0.22);
          dummy.rotation.set(0, 0, 0);
          dummy.updateMatrix();
          brickMasonry.setMatrixAt(brickIndex, dummy.matrix);
          brickIndex += 1;
        }
      }
      brickMasonry.instanceMatrix.needsUpdate = true;
      brickMasonry.userData.arrivalBrickVeneer = true;
      facade.add(brickMasonry);
      for (const x of [-dimensions.x * 0.34, dimensions.x * 0.02, dimensions.x * 0.36]) {
        const masonryPier = new THREE.Mesh(new THREE.BoxGeometry(0.34, 2.5, 0.18), weatheredConcreteMaterial);
        masonryPier.position.set(x, 2.45, dimensions.z / 2 + 0.29);
        facade.add(masonryPier);
      }
    }

    const awnings = new THREE.InstancedMesh(new THREE.BoxGeometry(7.6, 0.16, 1.4), awningMaterial, 3);
    for (let index = 0; index < 3; index += 1) {
      dummy.position.set(-dimensions.x * 0.3 + index * dimensions.x * 0.3, 3.0, dimensions.z / 2 + 0.72);
      dummy.rotation.x = -0.08;
      dummy.updateMatrix();
      awnings.setMatrixAt(index, dummy.matrix);
    }
    awnings.instanceMatrix.needsUpdate = true;
    facade.add(awnings);

    if (name.includes("left")) {
      const dockSupportMaterial = new THREE.MeshStandardMaterial({ color: 0x303a3b, roughness: 0.78, metalness: 0.62 });
      const dockSupportCount = 3;
      for (let supportIndex = 0; supportIndex < dockSupportCount; supportIndex += 1) {
        const supportX = -dimensions.x * 0.3 + supportIndex * dimensions.x * 0.3;
        for (const side of [-1, 1]) {
          const support = new THREE.Mesh(new THREE.BoxGeometry(0.18, 3.15, 0.18), dockSupportMaterial);
          support.position.set(supportX + side * 3.25, 1.56, dimensions.z / 2 + 1.34);
          support.castShadow = fullQualityPresentation;
          support.receiveShadow = true;
          support.userData.visualDetail = "arrival-left-loading-awning-support";
          facade.add(support);
          const footPlate = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.08, 0.48), dockSupportMaterial);
          footPlate.position.set(support.position.x, 0.08, support.position.z);
          footPlate.receiveShadow = true;
          facade.add(footPlate);
          const brace = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 1.35), dockSupportMaterial);
          brace.position.set(support.position.x, 2.72, dimensions.z / 2 + 0.92);
          brace.rotation.x = side * 0.34;
          facade.add(brace);
        }
      }
    }

    const serviceDoorMaterial = new THREE.MeshStandardMaterial({ color: 0x263438, roughness: 0.42, metalness: 0.5, emissive: 0x071013, emissiveIntensity: 0.16 });
    const serviceDoor = new THREE.Mesh(new THREE.BoxGeometry(Math.min(6.2, dimensions.x * 0.22), 3.05, 0.18), serviceDoorMaterial);
    serviceDoor.position.set(dimensions.x * 0.28, 1.7, dimensions.z / 2 + 0.11);
    facade.add(serviceDoor);
    const serviceDoorHeader = new THREE.Mesh(new THREE.BoxGeometry(Math.min(6.8, dimensions.x * 0.24), 0.22, 0.28), awningMaterial);
    serviceDoorHeader.position.set(serviceDoor.position.x, 3.32, dimensions.z / 2 + 0.22);
    facade.add(serviceDoorHeader);

    const dockDoorWidth = Math.min(5.8, dimensions.x * 0.18);
    for (let dockIndex = 0; dockIndex < 2; dockIndex += 1) {
      const dockX = -dimensions.x * 0.34 + dockIndex * dimensions.x * 0.24;
      const dockDoor = new THREE.Mesh(new THREE.BoxGeometry(dockDoorWidth, 4.4, 0.14), serviceDoorMaterial);
      dockDoor.position.set(dockX, 2.35, dimensions.z / 2 + 0.12);
      facade.add(dockDoor);
      for (let slat = 0; slat < 4; slat += 1) {
        const slatMesh = new THREE.Mesh(new THREE.BoxGeometry(dockDoorWidth + 0.18, 0.08, 0.2), parapetMaterial);
        slatMesh.position.set(dockX, 0.72 + slat * 0.96, dimensions.z / 2 + 0.22);
        facade.add(slatMesh);
      }
      const dockSill = new THREE.Mesh(new THREE.BoxGeometry(dockDoorWidth + 0.8, 0.3, 0.7), parapetMaterial);
      dockSill.position.set(dockX, 0.22, dimensions.z / 2 + 0.34);
      facade.add(dockSill);
    }

    const ribs = new THREE.InstancedMesh(new THREE.BoxGeometry(0.24, dimensions.y + 0.8, 0.2), parapetMaterial, 7);
    for (let index = 0; index < 7; index += 1) {
      dummy.position.set(-dimensions.x * 0.46 + index * dimensions.x * 0.153, dimensions.y / 2, dimensions.z / 2 + 0.14);
      dummy.rotation.set(0, 0, 0);
      dummy.updateMatrix();
      ribs.setMatrixAt(index, dummy.matrix);
    }
    ribs.instanceMatrix.needsUpdate = true;
    facade.add(ribs);

    const fireEscapes = new THREE.InstancedMesh(new THREE.BoxGeometry(10.5, 0.16, 2.5), parapetMaterial, 2);
    const escapeRails = new THREE.InstancedMesh(new THREE.BoxGeometry(10.9, 0.9, 0.12), parapetMaterial, 2);
    for (let index = 0; index < 2; index += 1) {
      const y = 7.2 + index * 6.4;
      dummy.position.set(-dimensions.x * 0.18 + index * dimensions.x * 0.36, y, dimensions.z / 2 + 1.15);
      dummy.rotation.set(0, 0, 0);
      dummy.updateMatrix();
      fireEscapes.setMatrixAt(index, dummy.matrix);
      dummy.position.z = dimensions.z / 2 + 2.34;
      dummy.position.y = y + 0.48;
      dummy.updateMatrix();
      escapeRails.setMatrixAt(index, dummy.matrix);
    }
    fireEscapes.instanceMatrix.needsUpdate = true;
    escapeRails.instanceMatrix.needsUpdate = true;
    facade.add(fireEscapes, escapeRails);

    const serviceBoxes = new THREE.InstancedMesh(new THREE.BoxGeometry(2.2, 1.5, 1.4), parapetMaterial, 2);
    for (let index = 0; index < 2; index += 1) {
      dummy.position.set(-dimensions.x * 0.28 + index * dimensions.x * 0.52, dimensions.y + 1.15, -dimensions.z * 0.12);
      dummy.rotation.set(0, index * 0.16, 0);
      dummy.updateMatrix();
      serviceBoxes.setMatrixAt(index, dummy.matrix);
    }
    serviceBoxes.instanceMatrix.needsUpdate = true;
    facade.add(serviceBoxes);

    const roofEquipment = new THREE.Group();
    roofEquipment.name = `${name}_roof_service_silhouette`;
    const roofTank = new THREE.Mesh(new THREE.CylinderGeometry(1.05, 1.05, 2.3, 10), coolShellMaterial);
    roofTank.position.set(-dimensions.x * 0.24, dimensions.y + 1.55, -dimensions.z * 0.12);
    roofTank.castShadow = true;
    roofEquipment.add(roofTank);
    const roofTankCap = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.2, 0.14, 10), parapetMaterial);
    roofTankCap.position.set(roofTank.position.x, dimensions.y + 2.72, roofTank.position.z);
    roofEquipment.add(roofTankCap);
    for (const x of [-dimensions.x * 0.03, dimensions.x * 0.14]) {
      const vent = new THREE.Mesh(new THREE.BoxGeometry(0.82, 1.6, 0.82), parapetMaterial);
      vent.position.set(x, dimensions.y + 0.8, -dimensions.z * 0.1);
      roofEquipment.add(vent);
      const ventCap = new THREE.Mesh(new THREE.BoxGeometry(1.04, 0.12, 1.04), awningMaterial);
      ventCap.position.set(x, dimensions.y + 1.62, -dimensions.z * 0.1);
      roofEquipment.add(ventCap);
    }
    facade.add(roofEquipment);

    const servicePipes = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.12, 0.12, dimensions.y + 1.2, 8), parapetMaterial, 3);
    for (let index = 0; index < 3; index += 1) {
      dummy.position.set(-dimensions.x * 0.4 + index * dimensions.x * 0.4, (dimensions.y + 1.2) / 2, dimensions.z / 2 + 0.52);
      dummy.rotation.set(0, 0, 0);
      dummy.updateMatrix();
      servicePipes.setMatrixAt(index, dummy.matrix);
    }
    servicePipes.instanceMatrix.needsUpdate = true;
    facade.add(servicePipes);

    const upperBandMaterial = new THREE.MeshStandardMaterial({ color: 0x414a4a, roughness: 0.72, metalness: 0.5 });
    for (let row = 0; row < rows; row += 1) {
      const bandY = 3.22 + row * 4.35;
      const sill = new THREE.Mesh(new THREE.BoxGeometry(dimensions.x * 0.86, 0.12, 0.24), upperBandMaterial);
      sill.position.set(0, bandY, dimensions.z / 2 + 0.16);
      facade.add(sill);
      const lintel = new THREE.Mesh(new THREE.BoxGeometry(dimensions.x * 0.86, 0.14, 0.22), upperBandMaterial);
      lintel.position.set(0, bandY + 1.78, dimensions.z / 2 + 0.15);
      facade.add(lintel);
    }

    const fireEscapeStairs = new THREE.Group();
    fireEscapeStairs.name = `${name}_fire_escape_stairs`;
    for (let index = 0; index < 2; index += 1) {
      const y = 7.2 + index * 6.4;
      const stair = new THREE.Group();
      stair.position.set(-dimensions.x * 0.18 + index * dimensions.x * 0.36, y - 1.55, dimensions.z / 2 + 1.48);
      for (let step = 0; step < 5; step += 1) {
        const tread = new THREE.Mesh(new THREE.BoxGeometry(0.92, 0.12, 1.72), parapetMaterial);
        tread.position.set((step - 2) * 0.82, step * 0.32, step * 0.08);
        stair.add(tread);
      }
      for (const z of [0.55, 2.35]) {
        const stringer = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.1, 0.1), parapetMaterial);
        stringer.position.set(0, 0.68, z);
        stringer.rotation.z = -0.36;
        stair.add(stringer);
      }
      fireEscapeStairs.add(stair);
    }
    facade.add(fireEscapeStairs);

    const frontServiceRun = new THREE.Mesh(new THREE.BoxGeometry(dimensions.x * 0.78, 0.14, 0.14), parapetMaterial);
    frontServiceRun.position.set(0, Math.min(dimensions.y - 1.0, 9.6), dimensions.z / 2 + 0.56);
    facade.add(frontServiceRun);

    const upperOfficeGlass = new THREE.MeshStandardMaterial({ color: 0x344d50, roughness: 0.3, metalness: 0.36, emissive: 0x101b1d, emissiveIntensity: 0.16 });
    const occupiedOfficeGlass = new THREE.MeshStandardMaterial({ color: 0x6a6659, roughness: 0.38, metalness: 0.22, emissive: 0x442719, emissiveIntensity: 0.36 });
    const upperOfficeFrame = new THREE.MeshStandardMaterial({ color: 0x2a3435, roughness: 0.76, metalness: 0.56 });
    const windowRevealMaterial = new THREE.MeshStandardMaterial({ color: 0x151e20, roughness: 0.9, metalness: 0.12 });
    if (name.includes("left")) {
      const lobbyGlow = new THREE.Mesh(new THREE.BoxGeometry(4.2, 2.1, 0.14), warmWindowMaterial);
      lobbyGlow.position.set(0, 2.4, dimensions.z / 2 + 0.08);
      facade.add(lobbyGlow);
      const upperWindowCount = Math.max(3, Math.floor(dimensions.x / 6));
      const upperWindowWidth = Math.min(4.1, dimensions.x / (upperWindowCount + 1) * 0.7);
      for (let windowIndex = 0; windowIndex < upperWindowCount; windowIndex += 1) {
        const windowX = -dimensions.x * 0.39 + (windowIndex + 0.5) * dimensions.x * 0.78 / upperWindowCount;
        const upperWindowY = Math.min(dimensions.y - 1.6, 7.8);
        const upperWindowMaterial = windowIndex % 4 === 1 ? occupiedOfficeGlass : upperOfficeGlass;
        const upperReveal = new THREE.Mesh(new THREE.BoxGeometry(upperWindowWidth + 0.34, 1.78, 0.16), windowRevealMaterial);
        upperReveal.position.set(windowX, upperWindowY, dimensions.z / 2 + 0.1);
        facade.add(upperReveal);
        const upperWindow = new THREE.Mesh(new THREE.BoxGeometry(upperWindowWidth, 1.42, 0.08), upperWindowMaterial);
        upperWindow.position.set(windowX, upperWindowY, dimensions.z / 2 + 0.22);
        facade.add(upperWindow);
        const windowSill = new THREE.Mesh(new THREE.BoxGeometry(upperWindowWidth + 0.18, 0.1, 0.16), upperOfficeFrame);
        windowSill.position.set(windowX, upperWindow.position.y - 0.78, dimensions.z / 2 + 0.24);
        facade.add(windowSill);
        const windowMullion = new THREE.Mesh(new THREE.BoxGeometry(0.1, 1.52, 0.14), upperOfficeFrame);
        windowMullion.position.set(windowX, upperWindow.position.y, dimensions.z / 2 + 0.25);
        facade.add(windowMullion);
      }
      const lowerOfficeY = Math.min(dimensions.y - 2.8, 5.3);
      const lowerOfficeBacking = new THREE.Mesh(new THREE.BoxGeometry(dimensions.x * 0.78, 2.12, 0.12), new THREE.MeshStandardMaterial({ color: 0x202c2e, roughness: 0.78, metalness: 0.42 }));
      lowerOfficeBacking.position.set(0, lowerOfficeY, dimensions.z / 2 + 0.12);
      facade.add(lowerOfficeBacking);
      const lowerOfficeCount = Math.max(3, Math.floor(dimensions.x / 6.5));
      const lowerOfficeWidth = Math.min(3.8, dimensions.x / (lowerOfficeCount + 1) * 0.68);
      for (let windowIndex = 0; windowIndex < lowerOfficeCount; windowIndex += 1) {
        const windowX = -dimensions.x * 0.35 + (windowIndex + 0.5) * dimensions.x * 0.7 / lowerOfficeCount;
        const lowerWindowMaterial = windowIndex % 3 === 1 ? occupiedOfficeGlass : upperOfficeGlass;
        const lowerReveal = new THREE.Mesh(new THREE.BoxGeometry(lowerOfficeWidth + 0.34, 1.82, 0.16), windowRevealMaterial);
        lowerReveal.position.set(windowX, lowerOfficeY, dimensions.z / 2 + 0.1);
        facade.add(lowerReveal);
        const lowerWindow = new THREE.Mesh(new THREE.BoxGeometry(lowerOfficeWidth, 1.46, 0.08), lowerWindowMaterial);
        lowerWindow.position.set(windowX, lowerOfficeY, dimensions.z / 2 + 0.22);
        facade.add(lowerWindow);
        for (const offsetX of [-lowerOfficeWidth * 0.5, lowerOfficeWidth * 0.5]) {
          const mullion = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.62, 0.14), upperOfficeFrame);
          mullion.position.set(windowX + offsetX, lowerOfficeY, dimensions.z / 2 + 0.25);
          facade.add(mullion);
        }
        const sill = new THREE.Mesh(new THREE.BoxGeometry(lowerOfficeWidth + 0.18, 0.1, 0.16), upperOfficeFrame);
        sill.position.set(windowX, lowerOfficeY - 0.8, dimensions.z / 2 + 0.24);
        facade.add(sill);
      }
      if (name.includes("left_near_maintenance")) {
        const nearLoadingBackingMaterial = new THREE.MeshStandardMaterial({ color: 0x202a2c, roughness: 0.92, metalness: 0.42 });
        const nearLoadingBacking = new THREE.Mesh(new THREE.BoxGeometry(7.6, 3.22, 0.16), nearLoadingBackingMaterial);
        nearLoadingBacking.position.set(2.55, 2.72, dimensions.z / 2 + 0.28);
        facade.add(nearLoadingBacking);
        const nearLoadingFrameMaterial = new THREE.MeshStandardMaterial({ color: 0x273334, roughness: 0.78, metalness: 0.68 });
        for (const x of [2.55 - 3.92, 2.55 + 3.92]) {
          const jamb = new THREE.Mesh(new THREE.BoxGeometry(0.18, 3.62, 0.22), nearLoadingFrameMaterial);
          jamb.position.set(x, 2.72, dimensions.z / 2 + 0.42);
          facade.add(jamb);
        }
        for (let ribIndex = 0; ribIndex < 8; ribIndex += 1) {
          const rib = new THREE.Mesh(new THREE.BoxGeometry(0.06, 3.02, 0.14), nearLoadingFrameMaterial);
          rib.position.set(2.55 - 3.38 + ribIndex * 0.966, 2.72, dimensions.z / 2 + 0.4);
          facade.add(rib);
        }
        const nearLoadingHeader = new THREE.Mesh(new THREE.BoxGeometry(8.05, 0.2, 0.22), nearLoadingFrameMaterial);
        nearLoadingHeader.position.set(2.55, 4.56, dimensions.z / 2 + 0.42);
        facade.add(nearLoadingHeader);
        const nearLoadingCanopy = new THREE.Mesh(new THREE.BoxGeometry(9.0, 0.14, 2.1), new THREE.MeshStandardMaterial({ color: 0x596361, roughness: 0.84, metalness: 0.42 }));
        nearLoadingCanopy.position.set(2.55, 4.94, dimensions.z / 2 + 0.82);
        nearLoadingCanopy.castShadow = true;
        facade.add(nearLoadingCanopy);
        const nearLoadingThresholdMaterial = new THREE.MeshStandardMaterial({ color: 0xb8874f, roughness: 0.72, metalness: 0.14 });
        const nearLoadingThreshold = new THREE.Mesh(new THREE.BoxGeometry(7.3, 0.14, 0.2), nearLoadingThresholdMaterial);
        nearLoadingThreshold.position.set(2.55, 1.18, dimensions.z / 2 + 0.46);
        facade.add(nearLoadingThreshold);
      }
      const signCanvas = document.createElement("canvas");
      signCanvas.width = 768;
      signCanvas.height = 160;
      const signContext = signCanvas.getContext("2d");
      if (signContext) {
        signContext.fillStyle = "#1d292b";
        signContext.fillRect(0, 0, signCanvas.width, signCanvas.height);
        signContext.fillStyle = "#c47e46";
        signContext.fillRect(0, 0, 18, signCanvas.height);
        signContext.fillStyle = "#d8d1bd";
        signContext.font = "700 58px Arial, sans-serif";
        signContext.letterSpacing = "3px";
        signContext.fillText("SERVICE / BAY 02", 46, 98);
      }
      const serviceSignTexture = new THREE.CanvasTexture(signCanvas);
      serviceSignTexture.colorSpace = THREE.SRGBColorSpace;
      serviceSignTexture.anisotropy = 4;
      const serviceSignMaterial = new THREE.MeshStandardMaterial({ map: serviceSignTexture, roughness: 0.68, metalness: 0.22, emissive: 0x120c08, emissiveIntensity: 0.18 });
      const serviceSign = new THREE.Mesh(new THREE.BoxGeometry(Math.min(6.8, dimensions.x * 0.3), 1.42, 0.1), serviceSignMaterial);
      serviceSign.position.set(0, 3.98, dimensions.z / 2 + 0.34);
      facade.add(serviceSign);
      const serviceSignCap = new THREE.Mesh(new THREE.BoxGeometry(serviceSign.scale.x * 6.8, 0.1, 0.18), upperOfficeFrame);
      serviceSignCap.position.set(0, 4.72, dimensions.z / 2 + 0.39);
      facade.add(serviceSignCap);
    } else if (name === "density_arrival_left_setback_frontage") {
      const setbackSignCanvas = document.createElement("canvas");
      setbackSignCanvas.width = 768;
      setbackSignCanvas.height = 112;
      const setbackSignContext = setbackSignCanvas.getContext("2d");
      if (setbackSignContext) {
        setbackSignContext.fillStyle = "#263033";
        setbackSignContext.fillRect(0, 0, 768, 112);
        setbackSignContext.fillStyle = "#9f6846";
        setbackSignContext.fillRect(0, 0, 14, 112);
        setbackSignContext.fillStyle = "#d1c4a9";
        setbackSignContext.font = "700 40px Arial, sans-serif";
        setbackSignContext.fillText("PERIMETER WORKS  /  GATE 04", 36, 70);
      }
      const setbackSignTexture = new THREE.CanvasTexture(setbackSignCanvas);
      setbackSignTexture.colorSpace = THREE.SRGBColorSpace;
      const setbackSignMaterial = new THREE.MeshStandardMaterial({ map: setbackSignTexture, color: 0x857867, roughness: 0.84, metalness: 0.14, emissive: 0x100b08, emissiveIntensity: 0.1 });
      const setbackSign = new THREE.Mesh(new THREE.BoxGeometry(9.6, 0.9, 0.1), setbackSignMaterial);
      setbackSign.name = "density_arrival_left_setback_frontage_facility_sign";
      setbackSign.position.set(-dimensions.x * 0.18, 8.25, dimensions.z / 2 + 0.4);
      setbackSign.userData.visualLayer = "street-canyon-signage";
      facade.add(setbackSign);
      for (const x of [-dimensions.x * 0.18 - 4.88, -dimensions.x * 0.18 + 4.88]) {
        const signPost = new THREE.Mesh(new THREE.BoxGeometry(0.1, 1.18, 0.1), upperOfficeFrame);
        signPost.position.set(x, 7.78, dimensions.z / 2 + 0.4);
        facade.add(signPost);
      }
    } else if (name === "density_arrival_left_frontage") {
      const loadingDoorMaterial = new THREE.MeshStandardMaterial({ color: 0x3b4545, roughness: 0.9, metalness: 0.42 });
      const loadingDoor = new THREE.Mesh(new THREE.BoxGeometry(8.4, 3.65, 0.14), loadingDoorMaterial);
      loadingDoor.position.set(dimensions.x * 0.18, 3.02, dimensions.z / 2 + 0.3);
      loadingDoor.receiveShadow = true;
      loadingDoor.userData.arrivalFacadePanel = true;
      loadingDoor.userData.arrivalFacadeTint = 0x465250;
      loadingDoor.userData.streetFacadeDimensions = { x: 8.4, y: 3.65, z: 0.14 };
      facade.add(loadingDoor);
      const loadingDoorFrameMaterial = new THREE.MeshStandardMaterial({ color: 0x252f31, roughness: 0.76, metalness: 0.62 });
      for (const x of [dimensions.x * 0.18 - 4.28, dimensions.x * 0.18 + 4.28]) {
        const jamb = new THREE.Mesh(new THREE.BoxGeometry(0.18, 4.02, 0.2), loadingDoorFrameMaterial);
        jamb.position.set(x, 3.02, dimensions.z / 2 + 0.42);
        facade.add(jamb);
      }
      const loadingHeader = new THREE.Mesh(new THREE.BoxGeometry(8.75, 0.2, 0.2), loadingDoorFrameMaterial);
      loadingHeader.position.set(dimensions.x * 0.18, 5.0, dimensions.z / 2 + 0.42);
      facade.add(loadingHeader);
      for (let ribIndex = 0; ribIndex < 9; ribIndex += 1) {
        const rib = new THREE.Mesh(new THREE.BoxGeometry(0.055, 3.42, 0.13), loadingDoorFrameMaterial);
        rib.position.set(dimensions.x * 0.18 - 3.78 + ribIndex * 0.945, 3.02, dimensions.z / 2 + 0.4);
        facade.add(rib);
      }
      const loadingStripeMaterial = new THREE.MeshStandardMaterial({ color: 0xb8954e, roughness: 0.72, metalness: 0.14 });
      const loadingStripe = new THREE.Mesh(new THREE.BoxGeometry(8.2, 0.16, 0.08), loadingStripeMaterial);
      loadingStripe.position.set(dimensions.x * 0.18, 1.34, dimensions.z / 2 + 0.43);
      facade.add(loadingStripe);
      const leftSignCanvas = document.createElement("canvas");
      leftSignCanvas.width = 768;
      leftSignCanvas.height = 112;
      const leftSignContext = leftSignCanvas.getContext("2d");
      if (leftSignContext) {
        leftSignContext.fillStyle = "#283234";
        leftSignContext.fillRect(0, 0, 768, 112);
        leftSignContext.fillStyle = "#a96d46";
        leftSignContext.fillRect(0, 0, 14, 112);
        leftSignContext.fillStyle = "#d3c4a4";
        leftSignContext.font = "700 42px Arial, sans-serif";
        leftSignContext.fillText("SOUTH YARD  /  BAY 02", 36, 70);
      }
      const leftSignTexture = new THREE.CanvasTexture(leftSignCanvas);
      leftSignTexture.colorSpace = THREE.SRGBColorSpace;
      const leftSignMaterial = new THREE.MeshStandardMaterial({ map: leftSignTexture, color: 0x887d69, roughness: 0.82, metalness: 0.16, emissive: 0x100c08, emissiveIntensity: 0.12 });
      const leftSign = new THREE.Mesh(new THREE.BoxGeometry(7.9, 0.88, 0.1), leftSignMaterial);
      leftSign.name = "density_arrival_left_frontage_facility_sign";
      leftSign.position.set(-dimensions.x * 0.2, 7.35, dimensions.z / 2 + 0.4);
      leftSign.userData.visualLayer = "street-canyon-signage";
      facade.add(leftSign);
      for (const x of [-dimensions.x * 0.2 - 4.05, -dimensions.x * 0.2 + 4.05]) {
        const signPost = new THREE.Mesh(new THREE.BoxGeometry(0.1, 1.2, 0.1), loadingDoorFrameMaterial);
        signPost.position.set(x, 6.88, dimensions.z / 2 + 0.4);
        facade.add(signPost);
      }
    } else if (name.includes("right")) {
      const rightOfficeY = Math.min(dimensions.y - 2.0, 9.2);
      const rightOfficeBacking = new THREE.Mesh(new THREE.BoxGeometry(dimensions.x * 0.76, 2.28, 0.14), windowRevealMaterial);
      rightOfficeBacking.position.set(0, rightOfficeY, dimensions.z / 2 + 0.1);
      facade.add(rightOfficeBacking);
      const rightOfficeCount = Math.max(3, Math.floor(dimensions.x / 7));
      const rightOfficeWidth = Math.min(4.2, dimensions.x / (rightOfficeCount + 1) * 0.72);
      for (let windowIndex = 0; windowIndex < rightOfficeCount; windowIndex += 1) {
        const windowX = -dimensions.x * 0.34 + (windowIndex + 0.5) * dimensions.x * 0.68 / rightOfficeCount;
        const rightWindowMaterial = windowIndex % 4 === 2 ? occupiedOfficeGlass : upperOfficeGlass;
        const rightReveal = new THREE.Mesh(new THREE.BoxGeometry(rightOfficeWidth + 0.54, 1.98, 0.38), windowRevealMaterial);
        rightReveal.position.set(windowX, rightOfficeY, dimensions.z / 2 + 0.02);
        facade.add(rightReveal);
        const rightWindow = new THREE.Mesh(new THREE.BoxGeometry(rightOfficeWidth, 1.42, 0.06), rightWindowMaterial);
        rightWindow.position.set(windowX, rightOfficeY, dimensions.z / 2 + 0.29);
        facade.add(rightWindow);
        for (const offsetX of [-rightOfficeWidth * 0.5, 0, rightOfficeWidth * 0.5]) {
          const jamb = new THREE.Mesh(new THREE.BoxGeometry(offsetX === 0 ? 0.12 : 0.14, 1.72, 0.34), upperOfficeFrame);
          jamb.position.set(windowX + offsetX, rightOfficeY, dimensions.z / 2 + 0.38);
          facade.add(jamb);
        }
        const sill = new THREE.Mesh(new THREE.BoxGeometry(rightOfficeWidth + 0.34, 0.14, 0.4), upperOfficeFrame);
        sill.position.set(windowX, rightOfficeY - 0.86, dimensions.z / 2 + 0.34);
        facade.add(sill);
        const canopy = new THREE.Mesh(new THREE.BoxGeometry(rightOfficeWidth + 0.42, 0.12, 0.72), upperOfficeFrame);
        canopy.position.set(windowX, rightOfficeY + 0.92, dimensions.z / 2 + 0.48);
        canopy.rotation.x = -0.08;
        canopy.castShadow = fullQualityPresentation;
        facade.add(canopy);
      }
      const rightRoofSteel = new THREE.MeshStandardMaterial({ color: 0x263234, roughness: 0.78, metalness: 0.62 });
      const rightRoofConcrete = new THREE.MeshStandardMaterial({ color: 0x656b67, roughness: 0.92, metalness: 0.08 });
      const rightRoofParapet = new THREE.Mesh(new THREE.BoxGeometry(dimensions.x * 0.94, 0.34, 0.86), rightRoofSteel);
      rightRoofParapet.position.set(0, dimensions.y + 0.16, 0);
      rightRoofParapet.castShadow = fullQualityPresentation;
      facade.add(rightRoofParapet);
      for (const [index, x] of [-dimensions.x * 0.25, dimensions.x * 0.23].entries()) {
        const hvac = new THREE.Mesh(new RoundedBoxGeometry(2.7, 1.25, 1.85, 2, 0.12), rightRoofConcrete);
        hvac.position.set(x, dimensions.y + 0.78, -0.02);
        hvac.castShadow = fullQualityPresentation;
        facade.add(hvac);
        const hvacGrille = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.58, 0.08), rightRoofSteel);
        hvacGrille.position.set(x, dimensions.y + 0.78, dimensions.z / 2 + 0.49);
        facade.add(hvacGrille);
        const servicePipe = new THREE.Mesh(new THREE.CylinderGeometry(0.08 + index * 0.02, 0.08 + index * 0.02, 1.5, 8), rightRoofSteel);
        servicePipe.position.set(x + 0.9, dimensions.y + 0.78, 0.1);
        servicePipe.rotation.z = Math.PI / 2;
        facade.add(servicePipe);
      }
      const roofVent = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.34, 2.3, 10), rightRoofSteel);
      roofVent.position.set(dimensions.x * 0.35, dimensions.y + 1.18, 0.1);
      roofVent.castShadow = fullQualityPresentation;
      facade.add(roofVent);
      const roofVentCap = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.16, 10), upperOfficeFrame);
      roofVentCap.position.set(dimensions.x * 0.35, dimensions.y + 2.36, 0.1);
      facade.add(roofVentCap);
      if (name === "density_arrival_right_frontage") {
        const loadingBay = new THREE.Group();
        loadingBay.name = "density_arrival_right_frontage_loading_bay_recess";
        loadingBay.userData.visualLayer = "street-canyon-facade-massing";
        const bayX = serviceDoor.position.x;
        const bayFrontZ = dimensions.z / 2 + 0.72;
        const baySteel = new THREE.MeshStandardMaterial({ color: 0x263335, roughness: 0.8, metalness: 0.62 });
        const bayShadow = new THREE.MeshStandardMaterial({ color: 0x101719, roughness: 0.92, metalness: 0.18 });
        const bayWarm = new THREE.MeshStandardMaterial({ color: 0xa36540, roughness: 0.7, metalness: 0.16, emissive: 0x1b0d08, emissiveIntensity: 0.22 });
        const opening = new THREE.Mesh(new THREE.BoxGeometry(7.2, 4.1, 0.18), bayShadow);
        opening.position.set(bayX, 2.45, dimensions.z / 2 + 0.16);
        opening.receiveShadow = true;
        loadingBay.add(opening);
        const canopy = new THREE.Mesh(new THREE.BoxGeometry(8.8, 0.2, 2.7), baySteel);
        canopy.position.set(bayX, 4.85, bayFrontZ);
        canopy.rotation.x = -0.08;
        canopy.castShadow = fullQualityPresentation;
        loadingBay.add(canopy);
        const fascia = new THREE.Mesh(new THREE.BoxGeometry(8.9, 0.48, 0.22), baySteel);
        fascia.position.set(bayX, 4.57, dimensions.z / 2 + 1.93);
        fascia.castShadow = fullQualityPresentation;
        loadingBay.add(fascia);
        for (const x of [bayX - 3.85, bayX + 3.85]) {
          const column = new THREE.Mesh(new THREE.BoxGeometry(0.24, 4.5, 0.24), baySteel);
          column.position.set(x, 2.25, bayFrontZ + 0.7);
          column.castShadow = fullQualityPresentation;
          loadingBay.add(column);
          const foot = new THREE.Mesh(new THREE.BoxGeometry(0.54, 0.12, 0.54), baySteel);
          foot.position.set(x, 0.08, bayFrontZ + 0.7);
          loadingBay.add(foot);
        }
        const dockSlab = new THREE.Mesh(new THREE.BoxGeometry(8.2, 0.18, 2.0), baySteel);
        dockSlab.position.set(bayX, 0.18, bayFrontZ + 0.65);
        dockSlab.receiveShadow = true;
        loadingBay.add(dockSlab);
        for (const x of [bayX - 2.6, bayX, bayX + 2.6]) {
          const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.08, 0.18), bayWarm);
          lamp.position.set(x, 4.56, dimensions.z / 2 + 1.96);
          loadingBay.add(lamp);
        }
        facade.add(loadingBay);
        const stair = new THREE.Group();
        stair.name = "density_arrival_right_frontage_external_service_stair";
        stair.position.set(-7.0, 0, 1.35);
        stair.userData.visualLayer = "street-canyon-facade-massing";
        facade.add(stair);
        const stairSteel = new THREE.MeshStandardMaterial({ color: 0x283638, roughness: 0.72, metalness: 0.66 });
        const stairRust = new THREE.MeshStandardMaterial({ color: 0x81523d, roughness: 0.86, metalness: 0.2 });
        const landingLower = new THREE.Mesh(new THREE.BoxGeometry(8.6, 0.18, 2.45), stairSteel);
        landingLower.position.set(0, 4.8, 0);
        landingLower.castShadow = fullQualityPresentation;
        stair.add(landingLower);
        const landingUpper = new THREE.Mesh(new THREE.BoxGeometry(8.6, 0.18, 2.45), stairSteel);
        landingUpper.position.set(0, 9.6, 0);
        landingUpper.castShadow = fullQualityPresentation;
        stair.add(landingUpper);
        for (const x of [-3.95, 3.95]) {
          const post = new THREE.Mesh(new THREE.BoxGeometry(0.18, 10.2, 0.18), stairSteel);
          post.position.set(x, 5.1, 0.72);
          post.castShadow = fullQualityPresentation;
          stair.add(post);
          const rail = new THREE.Mesh(new THREE.BoxGeometry(0.16, 1.0, 2.55), stairSteel);
          rail.position.set(x, 5.42, 0.0);
          stair.add(rail);
          const upperRail = rail.clone();
          upperRail.position.y = 10.22;
          stair.add(upperRail);
        }
        for (const z of [-0.9, 0.9]) {
          const rail = new THREE.Mesh(new THREE.BoxGeometry(9.7, 0.16, 0.16), stairSteel);
          rail.position.set(0, 5.4, z);
          stair.add(rail);
          const upperRail = rail.clone();
          upperRail.position.y = 10.2;
          stair.add(upperRail);
        }
        const stairAngle = -0.62;
        const stringerLength = 6.9;
        for (const z of [-1.1, 1.1]) {
          const stringer = new THREE.Mesh(new THREE.BoxGeometry(stringerLength, 0.16, 0.16), stairSteel);
          stringer.position.set(0, 7.15, z);
          stringer.rotation.z = stairAngle;
          stringer.castShadow = fullQualityPresentation;
          stair.add(stringer);
        }
        for (let step = 0; step < 8; step += 1) {
          const progress = step / 7;
          const tread = new THREE.Mesh(new THREE.BoxGeometry(0.78, 0.16, 2.25), stairRust);
          tread.position.set(-2.7 + step * 0.78, 5.15 + progress * 3.55, 0);
          tread.rotation.z = stairAngle;
          tread.castShadow = fullQualityPresentation;
          stair.add(tread);
        }
        for (const x of [-3.1, 3.1]) {
          const wallBracket = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.16, 1.1), stairSteel);
          wallBracket.position.set(x, 4.55, 0.72);
          wallBracket.rotation.x = Math.PI / 2;
          stair.add(wallBracket);
          const upperBracket = wallBracket.clone();
          upperBracket.position.y = 9.35;
          stair.add(upperBracket);
        }
        stair.userData.environmentMaterial = "external industrial fire escape stair and landing";
      }
      if (name === "density_arrival_right_frontage" && urlParams.get("frontageDetail") !== "base") {
        const serviceBayGroup = new THREE.Group();
        serviceBayGroup.name = "density_arrival_right_frontage_service_bay_rhythm";
        serviceBayGroup.userData.visualLayer = "street-canyon-facade-massing";
        serviceBayGroup.userData.presentationModule = "right frontage recessed service bay rhythm";
        serviceBayGroup.userData.authoringRecord = {
          type: "detail",
          id: "density_arrival_right_frontage_service_bay_rhythm",
          displayName: "Right Frontage Recessed Service Bays",
          role: "Presentation-only working-bay rhythm attached to the camera-visible arrival frontage; creates depth and practical occupation without changing the building-mass or connector truth.",
          runtimeNote: "Four recessed bay fronts with upper glazing, structural jambs, shallow canopies, safety band, sills, and work lights; removable with frontageDetail=base.",
        };
        facade.add(serviceBayGroup);
        const bayDark = new THREE.MeshStandardMaterial({ color: 0x172123, roughness: 0.88, metalness: 0.24, emissive: 0x050c0e, emissiveIntensity: 0.14 });
        const bayFrame = new THREE.MeshStandardMaterial({ color: 0x253235, roughness: 0.68, metalness: 0.72 });
        const bayPanel = new THREE.MeshStandardMaterial({ color: 0x526965, roughness: 0.82, metalness: 0.36 });
        const bayGlass = new THREE.MeshPhysicalMaterial({ color: 0x17363a, roughness: 0.2, metalness: 0.12, clearcoat: 0.66, clearcoatRoughness: 0.16, emissive: 0x0b2326, emissiveIntensity: 0.24 });
        const baySafety = new THREE.MeshStandardMaterial({ color: 0xb16b43, roughness: 0.74, metalness: 0.14, emissive: 0x250e07, emissiveIntensity: 0.08 });
        const bayLampMaterial = new THREE.MeshStandardMaterial({ color: 0xffc279, roughness: 0.26, metalness: 0.06, emissive: 0xf16931, emissiveIntensity: 1.22 });
        const addBayPart = (namePart: string, geometry: THREE.BufferGeometry, material: THREE.Material, position: [number, number, number]) => {
          const part = new THREE.Mesh(geometry, material);
          part.name = namePart;
          part.position.set(...position);
          part.castShadow = fullQualityPresentation;
          part.receiveShadow = true;
          part.userData.visualLayer = "street-canyon-facade-massing";
          serviceBayGroup.add(part);
          return part;
        };
        const bayZ = dimensions.z / 2 + 0.56;
        const bayCenters = [-11.3, -3.8, 3.8, 11.3];
        for (const [index, bayX] of bayCenters.entries()) {
          const recess = addBayPart(`arrival_right_service_bay_recess_${index}`, new THREE.BoxGeometry(5.7, 3.55, 0.16), bayDark, [bayX, 2.48, bayZ]);
          recess.userData.arrivalFacadePanel = true;
          recess.userData.arrivalFacadeTint = 0x263638;
          recess.userData.streetFacadeDimensions = { x: 5.7, y: 3.55, z: 0.16 };
          addBayPart(`arrival_right_service_bay_upper_glazing_${index}`, new THREE.BoxGeometry(4.85, 0.82, 0.06), bayGlass, [bayX, 4.22, bayZ + 0.12]);
          addBayPart(`arrival_right_service_bay_header_${index}`, new THREE.BoxGeometry(5.95, 0.14, 0.22), bayFrame, [bayX, 4.46, bayZ + 0.2]);
          for (const side of [-1, 1]) addBayPart(`arrival_right_service_bay_jamb_${index}_${side < 0 ? "left" : "right"}`, new THREE.BoxGeometry(0.16, 4.1, 0.22), bayFrame, [bayX + side * 2.92, 2.45, bayZ + 0.2]);
          addBayPart(`arrival_right_service_bay_canopy_${index}`, new THREE.BoxGeometry(6.25, 0.16, 1.1), bayFrame, [bayX, 4.86, bayZ + 0.62]);
          addBayPart(`arrival_right_service_bay_safety_band_${index}`, new THREE.BoxGeometry(5.42, 0.14, 0.08), baySafety, [bayX, 0.72, bayZ + 0.16]);
          addBayPart(`arrival_right_service_bay_floor_sill_${index}`, new THREE.BoxGeometry(5.4, 0.16, 0.44), bayPanel, [bayX, 0.35, bayZ + 0.3]);
          addBayPart(`arrival_right_service_bay_lamp_${index}`, new THREE.BoxGeometry(0.62, 0.1, 0.16), bayLampMaterial, [bayX, 4.62, bayZ + 0.9]);
        }
        addBayPart("arrival_right_service_bay_upper_service_rail", new THREE.BoxGeometry(30.5, 0.12, 0.12), bayFrame, [0, 5.48, bayZ + 0.34]);
        addBayPart("arrival_right_service_bay_lower_service_rail", new THREE.BoxGeometry(30.5, 0.1, 0.1), bayFrame, [0, 0.94, bayZ + 0.22]);
        const bayLightLeft = new THREE.PointLight(0xffa467, 0.52, 8, 2);
        bayLightLeft.position.set(-4.2, 4.5, bayZ + 0.74);
        serviceBayGroup.add(bayLightLeft);
        const bayLightRight = new THREE.PointLight(0xffa467, 0.52, 8, 2);
        bayLightRight.position.set(4.2, 4.5, bayZ + 0.74);
        serviceBayGroup.add(bayLightRight);
      }
      if (name === "density_arrival_right_frontage" && urlParams.get("frontageCore") !== "base") {
        const serviceCore = new THREE.Group();
        serviceCore.name = "density_arrival_right_frontage_glazed_service_core";
        serviceCore.userData.visualLayer = "street-canyon-facade-massing";
        serviceCore.userData.presentationModule = "right frontage glazed service core";
        serviceCore.userData.authoringRecord = {
          type: "detail",
          id: "density_arrival_right_frontage_glazed_service_core",
          displayName: "Right Frontage Glazed Service Core",
          role: "Presentation-only framed stair and service-lift enclosure on the camera-visible frontage; adds a recognizable vertical working-facility element without changing the building mass, route, or gameplay volumes.",
          runtimeNote: "Steel frame, three glazed landings, shallow stair flights, service door, mullions, canopy, and restrained work light; removable with frontageCore=base.",
        };
        facade.add(serviceCore);
        const coreSteel = new THREE.MeshStandardMaterial({ color: 0x27383a, roughness: 0.68, metalness: 0.72 });
        const coreEdge = new THREE.MeshStandardMaterial({ color: 0x59615e, roughness: 0.82, metalness: 0.38 });
        const coreGlass = new THREE.MeshPhysicalMaterial({ color: 0x21434a, roughness: 0.2, metalness: 0.12, clearcoat: 0.62, clearcoatRoughness: 0.16, transmission: 0.05, emissive: 0x0c2529, emissiveIntensity: 0.24 });
        const coreInterior = new THREE.MeshStandardMaterial({ color: 0x4c3d36, roughness: 0.88, metalness: 0.08, emissive: 0x28120b, emissiveIntensity: 0.16 });
        const coreSafety = new THREE.MeshStandardMaterial({ color: 0xb7774c, roughness: 0.74, metalness: 0.12, emissive: 0x220b06, emissiveIntensity: 0.08 });
        const coreLamp = new THREE.MeshStandardMaterial({ color: 0xffc47a, roughness: 0.28, metalness: 0.06, emissive: 0x743214, emissiveIntensity: 1.12 });
        const addCorePart = (namePart: string, geometry: THREE.BufferGeometry, material: THREE.Material, position: [number, number, number], rotation: [number, number, number] = [0, 0, 0]) => {
          const part = new THREE.Mesh(geometry, material);
          part.name = namePart;
          part.position.set(...position);
          part.rotation.set(...rotation);
          part.castShadow = fullQualityPresentation;
          part.receiveShadow = true;
          part.userData.visualLayer = "street-canyon-facade-massing";
          serviceCore.add(part);
          return part;
        };
        const coreX = Math.min(dimensions.x * 0.34, 12.4);
        const coreZ = dimensions.z / 2 + 0.72;
        const coreWidth = 4.9;
        const coreDepth = 2.25;
        const coreHeight = 9.8;
        addCorePart("arrival_frontage_service_core_back", new THREE.BoxGeometry(coreWidth, coreHeight, 0.14), coreInterior, [coreX, coreHeight / 2, coreZ - coreDepth / 2]);
        addCorePart("arrival_frontage_service_core_canopy", new RoundedBoxGeometry(coreWidth + 0.7, 0.18, coreDepth + 0.7, 5, 0.05), coreEdge, [coreX, 10.18, coreZ + 0.1]);
        for (const x of [coreX - coreWidth / 2, coreX + coreWidth / 2]) {
          addCorePart(`arrival_frontage_service_core_front_post_${x < coreX ? "left" : "right"}`, new RoundedBoxGeometry(0.2, coreHeight, 0.2, 4, 0.03), coreSteel, [x, coreHeight / 2, coreZ + coreDepth / 2]);
          addCorePart(`arrival_frontage_service_core_back_post_${x < coreX ? "left" : "right"}`, new RoundedBoxGeometry(0.18, coreHeight, 0.18, 4, 0.03), coreSteel, [x, coreHeight / 2, coreZ - coreDepth / 2]);
        }
        for (const y of [2.8, 5.8, 8.8]) {
          addCorePart(`arrival_frontage_service_core_front_glazing_${y}`, new THREE.BoxGeometry(coreWidth - 0.36, 2.18, 0.07), coreGlass, [coreX, y, coreZ + coreDepth / 2 + 0.06]);
          addCorePart(`arrival_frontage_service_core_mullion_${y}`, new THREE.BoxGeometry(0.12, 2.18, 0.12), coreSteel, [coreX, y, coreZ + coreDepth / 2 + 0.14]);
          addCorePart(`arrival_frontage_service_core_floor_${y}`, new THREE.BoxGeometry(coreWidth + 0.2, 0.18, coreDepth + 0.32), coreEdge, [coreX, y - 1.23, coreZ + 0.1]);
          addCorePart(`arrival_frontage_service_core_floor_rail_${y}`, new THREE.BoxGeometry(coreWidth + 0.3, 0.12, 0.12), coreSafety, [coreX, y - 0.66, coreZ + coreDepth / 2 + 0.55]);
        }
        addCorePart("arrival_frontage_service_core_lower_door", new RoundedBoxGeometry(2.15, 2.62, 0.1, 5, 0.04), coreSteel, [coreX, 1.42, coreZ + coreDepth / 2 + 0.08]);
        addCorePart("arrival_frontage_service_core_lower_door_glass", new THREE.BoxGeometry(1.28, 1.42, 0.04), coreGlass, [coreX, 1.64, coreZ + coreDepth / 2 + 0.16]);
        addCorePart("arrival_frontage_service_core_door_handle", new THREE.BoxGeometry(0.08, 0.32, 0.09), coreSafety, [coreX + 0.72, 1.42, coreZ + coreDepth / 2 + 0.2]);
        for (const side of [-1, 1]) {
          addCorePart(`arrival_frontage_service_core_side_glass_${side < 0 ? "left" : "right"}`, new THREE.BoxGeometry(0.07, 8.6, coreDepth - 0.18), coreGlass, [coreX + side * (coreWidth / 2 - 0.08), 5.2, coreZ]);
          addCorePart(`arrival_frontage_service_core_side_rail_${side < 0 ? "left" : "right"}`, new THREE.BoxGeometry(0.12, 8.7, coreDepth + 0.3), coreSteel, [coreX + side * (coreWidth / 2 + 0.12), 5.2, coreZ]);
        }
        for (const [step, y] of [[0, 0.42], [1, 0.74], [2, 1.06], [3, 1.38], [4, 1.70]] as Array<[number, number]>) {
          addCorePart(`arrival_frontage_service_core_step_${step}`, new THREE.BoxGeometry(1.55, 0.16, 0.66), coreEdge, [coreX - 1.14 + step * 0.48, y, coreZ + coreDepth / 2 + 0.45], [0, 0, -0.08]);
        }
        for (const x of [coreX - 1.85, coreX + 1.85]) addCorePart(`arrival_frontage_service_core_base_foot_${x < coreX ? "left" : "right"}`, new RoundedBoxGeometry(0.56, 0.22, 0.72, 4, 0.04), coreSteel, [x, 0.11, coreZ]);
        addCorePart("arrival_frontage_service_core_lamp", new RoundedBoxGeometry(0.78, 0.12, 0.18, 4, 0.03), coreLamp, [coreX - 1.2, 8.45, coreZ + coreDepth / 2 + 0.22]);
        const corePoint = new THREE.PointLight(0xffa467, 0.52, 8, 2);
        corePoint.position.set(coreX - 1.2, 8.1, coreZ + coreDepth / 2 + 0.4);
        serviceCore.add(corePoint);
      }
      if (name === "density_arrival_right_frontage" && urlParams.get("frontageHoist") !== "base") {
        const hoistGroup = new THREE.Group();
        hoistGroup.name = "density_arrival_right_frontage_maintenance_hoist";
        hoistGroup.userData.visualLayer = "street-canyon-facade-massing";
        hoistGroup.userData.presentationModule = "right frontage maintenance hoist";
        hoistGroup.userData.authoringRecord = {
          type: "detail",
          id: "density_arrival_right_frontage_maintenance_hoist",
          displayName: "Right Frontage Maintenance Hoist",
          role: "Presentation-only wall-mounted service hoist on the camera-visible frontage; reinforces active industrial maintenance without changing the building mass, route, or gameplay volumes.",
          runtimeNote: "Supported access platform, guard rails, lift arm, cable drum, hanging hook, safety stripe, and practical lamp; removable with frontageHoist=base.",
        };
        facade.add(hoistGroup);
        const hoistSteel = new THREE.MeshStandardMaterial({ color: 0x263638, roughness: 0.72, metalness: 0.72 });
        const hoistEdge = new THREE.MeshStandardMaterial({ color: 0x5b625d, roughness: 0.82, metalness: 0.4 });
        const hoistSafety = new THREE.MeshStandardMaterial({ color: 0xb87448, roughness: 0.74, metalness: 0.14, emissive: 0x240c06, emissiveIntensity: 0.08 });
        const hoistLamp = new THREE.MeshStandardMaterial({ color: 0xffc47a, roughness: 0.28, metalness: 0.08, emissive: 0x743214, emissiveIntensity: 1.12 });
        const addHoistPart = (namePart: string, geometry: THREE.BufferGeometry, material: THREE.Material, position: [number, number, number], rotation: [number, number, number] = [0, 0, 0]) => {
          const part = new THREE.Mesh(geometry, material);
          part.name = namePart;
          part.position.set(...position);
          part.rotation.set(...rotation);
          part.castShadow = fullQualityPresentation;
          part.receiveShadow = true;
          part.userData.visualLayer = "street-canyon-facade-massing";
          hoistGroup.add(part);
          return part;
        };
        const hoistX = dimensions.x * 0.26;
        const hoistZ = dimensions.z / 2 + 0.92;
        addHoistPart("arrival_frontage_hoist_platform", new RoundedBoxGeometry(5.2, 0.18, 1.7, 5, 0.05), hoistEdge, [hoistX, 3.18, hoistZ + 0.45]);
        addHoistPart("arrival_frontage_hoist_platform_back", new THREE.BoxGeometry(4.8, 0.14, 0.14), hoistSteel, [hoistX, 3.62, hoistZ - 0.34]);
        for (const x of [hoistX - 2.2, hoistX + 2.2]) {
          addHoistPart(`arrival_frontage_hoist_rail_post_${x < hoistX ? "left" : "right"}`, new THREE.BoxGeometry(0.16, 1.12, 0.16), hoistSteel, [x, 3.74, hoistZ + 0.98]);
          addHoistPart(`arrival_frontage_hoist_wall_rail_${x < hoistX ? "left" : "right"}`, new THREE.BoxGeometry(0.18, 7.1, 0.18), hoistSteel, [x, 4.2, hoistZ - 0.28]);
          addHoistPart(`arrival_frontage_hoist_rail_brace_${x < hoistX ? "left" : "right"}`, new THREE.BoxGeometry(0.12, 3.7, 0.12), hoistEdge, [x, 1.55, hoistZ + 0.2], [0, 0, x < hoistX ? -0.52 : 0.52]);
        }
        addHoistPart("arrival_frontage_hoist_top_arm", new RoundedBoxGeometry(5.0, 0.18, 0.2, 4, 0.04), hoistSteel, [hoistX, 7.78, hoistZ + 0.18]);
        addHoistPart("arrival_frontage_hoist_safety_stripe", new THREE.BoxGeometry(4.6, 0.12, 0.07), hoistSafety, [hoistX, 3.06, hoistZ + 1.33]);
        const cableDrum = addHoistPart("arrival_frontage_hoist_cable_drum", new THREE.CylinderGeometry(0.42, 0.42, 0.3, 16), hoistSteel, [hoistX + 1.25, 7.35, hoistZ + 0.2], [0, 0, Math.PI / 2]);
        cableDrum.castShadow = fullQualityPresentation;
        addHoistPart("arrival_frontage_hoist_cable", new THREE.CylinderGeometry(0.035, 0.035, 3.7, 8), hoistSteel, [hoistX + 1.25, 5.55, hoistZ + 0.2]);
        addHoistPart("arrival_frontage_hoist_hook", new THREE.TorusGeometry(0.18, 0.04, 8, 16, Math.PI * 1.4), hoistSafety, [hoistX + 1.25, 3.62, hoistZ + 0.2], [Math.PI / 2, 0, 0]);
        addHoistPart("arrival_frontage_hoist_work_lamp", new RoundedBoxGeometry(0.68, 0.12, 0.18, 4, 0.03), hoistLamp, [hoistX - 1.55, 7.12, hoistZ + 0.26]);
        const hoistPoint = new THREE.PointLight(0xffa467, 0.48, 7, 2);
        hoistPoint.position.set(hoistX - 1.55, 6.85, hoistZ + 0.46);
        hoistGroup.add(hoistPoint);
      }
    }
  };

  // The first arrival segment runs southeast from (-388,218) toward (-344,178).
  // Frontages sit on opposite sides of that centerline, with deliberately thin
  // street-edge depth so they frame the road without becoming camera-facing occluders.
  const roadHeading = 0.56;
  addFrontage("density_arrival_left_frontage", { x: -392, z: 208 }, { x: 34, y: 13, z: 0.7 }, roadHeading, 2, shellMaterial);
  addFrontage("density_arrival_left_near_maintenance_frontage", { x: -398, z: 220 }, { x: 16, y: 8, z: 0.7 }, roadHeading, 2, shellMaterial);
  addFrontage("density_arrival_right_frontage", { x: -354, z: 211 }, { x: 32, y: 15, z: 0.7 }, roadHeading + Math.PI, 2, coolShellMaterial);
  // Setback frontage layers provide a believable urban/industrial street canyon and
  // a stepped skyline while remaining thin presentation-only shells outside the route.
  addFrontage("density_arrival_left_setback_frontage", { x: -382, z: 194 }, { x: 30, y: 18, z: 0.7 }, roadHeading, 3, coolShellMaterial);
  addFrontage("density_arrival_right_setback_frontage", { x: -342, z: 192 }, { x: 30, y: 19, z: 0.7 }, roadHeading + Math.PI, 3, shellMaterial);

  if (urlParams.get("arrivalReset") !== "legacy") {
    const legacyRightFrontage = root.getObjectByName("density_arrival_right_frontage");
    if (legacyRightFrontage) legacyRightFrontage.visible = false;
    const legacyRightSetback = root.getObjectByName("density_arrival_right_setback_frontage");
    if (legacyRightSetback) legacyRightSetback.visible = false;

    const resetFrontage = new THREE.Group();
    resetFrontage.name = "density_arrival_right_frontage_visual_reset";
    resetFrontage.position.set(-354, 0, 211);
    resetFrontage.rotation.y = roadHeading + Math.PI;
    resetFrontage.userData.visualLayer = "street-canyon-facade-massing";
    resetFrontage.userData.presentationModule = "coherent right arrival factory elevation visual reset";
    resetFrontage.userData.authoringRecord = {
      type: "detail",
      id: "density_arrival_right_frontage_visual_reset",
      displayName: "Arrival Right Frontage Visual Reset",
      role: "Presentation-only replacement elevation for the camera-dominant arrival shell. It preserves the existing building mass and all gameplay/runtime records while replacing the weak blockout rendering with a coherent service-factory facade.",
      runtimeNote: "Deep cladded service wall, recessed loading bays, upper glazing, framed stair core, roof plant, facility sign, and practicals; removable with arrivalReset=legacy.",
    };
    root.add(resetFrontage);

    const resetPanelMaterials = [
      new THREE.MeshStandardMaterial({ color: 0x485857, roughness: 0.82, metalness: 0.34 }),
      new THREE.MeshStandardMaterial({ color: 0x5d6a67, roughness: 0.86, metalness: 0.27 }),
      new THREE.MeshStandardMaterial({ color: 0x394849, roughness: 0.78, metalness: 0.42 }),
      new THREE.MeshStandardMaterial({ color: 0x6d7068, roughness: 0.9, metalness: 0.2 }),
    ];
    const resetBacking = new THREE.MeshStandardMaterial({ color: 0x253133, roughness: 0.92, metalness: 0.24 });
    const resetSteel = new THREE.MeshStandardMaterial({ color: 0x202d30, roughness: 0.68, metalness: 0.76 });
    const resetEdge = new THREE.MeshStandardMaterial({ color: 0x69716c, roughness: 0.82, metalness: 0.42 });
    const resetConcrete = new THREE.MeshStandardMaterial({ color: 0x77786f, roughness: 0.96, metalness: 0.08 });
    const resetGlass = new THREE.MeshPhysicalMaterial({ color: 0x1d3d42, roughness: 0.2, metalness: 0.12, clearcoat: 0.66, clearcoatRoughness: 0.16, transmission: 0.05, emissive: 0x0a2024, emissiveIntensity: 0.22 });
    const resetDarkGlass = new THREE.MeshPhysicalMaterial({ color: 0x10272b, roughness: 0.24, metalness: 0.2, clearcoat: 0.54, clearcoatRoughness: 0.2, emissive: 0x07171a, emissiveIntensity: 0.18 });
    const resetWarm = new THREE.MeshStandardMaterial({ color: 0xffc27a, roughness: 0.28, metalness: 0.08, emissive: 0x743314, emissiveIntensity: 1.0 });
    const resetSafety = new THREE.MeshStandardMaterial({ color: 0xb8784a, roughness: 0.74, metalness: 0.13, emissive: 0x230c06, emissiveIntensity: 0.08 });
    const addResetPart = (namePart: string, geometry: THREE.BufferGeometry, material: THREE.Material, position: [number, number, number], rotation: [number, number, number] = [0, 0, 0]) => {
      const part = new THREE.Mesh(geometry, material);
      part.name = namePart;
      part.position.set(...position);
      part.rotation.set(...rotation);
      part.castShadow = fullQualityPresentation;
      part.receiveShadow = true;
      part.userData.visualLayer = "street-canyon-facade-massing";
      resetFrontage.add(part);
      return part;
    };

    addResetPart("arrival_reset_frontage_deep_service_wall", new THREE.BoxGeometry(34, 15.2, 5.8), resetBacking, [0, 7.6, 0]);
    addResetPart("arrival_reset_frontage_concrete_plinth", new RoundedBoxGeometry(35.2, 0.74, 6.25, 5, 0.08), resetConcrete, [0, 0.37, 0.12]);
    addResetPart("arrival_reset_frontage_upper_parapet", new RoundedBoxGeometry(35.4, 0.62, 6.25, 5, 0.08), resetSteel, [0, 15.42, 0.05]);
    addResetPart("arrival_reset_frontage_lower_service_course", new THREE.BoxGeometry(34.1, 1.3, 6.08), resetConcrete, [0, 1.28, 0.12]);

    const panelXs = [-14.0, -10.0, -6.0, -2.0, 2.0, 6.0, 10.0, 14.0];
    for (const [index, panelX] of panelXs.entries()) {
      addResetPart(`arrival_reset_frontage_cladding_panel_${index}`, new RoundedBoxGeometry(3.72, 10.8, 0.16, 4, 0.04), resetPanelMaterials[index % resetPanelMaterials.length], [panelX, 8.0, 3.02]);
      addResetPart(`arrival_reset_frontage_cladding_panel_top_${index}`, new THREE.BoxGeometry(3.84, 0.12, 0.22), resetEdge, [panelX, 13.6, 3.16]);
      addResetPart(`arrival_reset_frontage_cladding_panel_bottom_${index}`, new THREE.BoxGeometry(3.84, 0.1, 0.2), resetSteel, [panelX, 2.48, 3.18]);
    }
    for (const x of [-16.05, -12.0, -8.0, -4.0, 0, 4.0, 8.0, 12.0, 16.05]) {
      addResetPart(`arrival_reset_frontage_vertical_i_pilaster_${x}`, new RoundedBoxGeometry(0.26, 14.0, 0.36, 4, 0.04), resetSteel, [x, 7.55, 3.34]);
    }
    for (const y of [4.8, 8.0, 11.35, 14.0]) addResetPart(`arrival_reset_frontage_horizontal_seam_${y}`, new THREE.BoxGeometry(33.2, 0.12, 0.2), resetEdge, [0, y, 3.22]);

    const bayXs = [-10.8, 0, 10.8];
    for (const [index, bayX] of bayXs.entries()) {
      const bayWidth = 8.45;
      addResetPart(`arrival_reset_frontage_recess_${index}`, new THREE.BoxGeometry(bayWidth, 4.65, 0.18), resetDarkGlass, [bayX, 3.0, 3.16]);
      addResetPart(`arrival_reset_frontage_bay_header_${index}`, new RoundedBoxGeometry(bayWidth + 0.42, 0.24, 0.32, 4, 0.04), resetSteel, [bayX, 5.5, 3.42]);
      addResetPart(`arrival_reset_frontage_bay_canopy_${index}`, new RoundedBoxGeometry(bayWidth + 0.72, 0.18, 1.58, 4, 0.04), resetEdge, [bayX, 5.72, 3.94], [-0.08, 0, 0]);
      addResetPart(`arrival_reset_frontage_bay_safety_band_${index}`, new THREE.BoxGeometry(bayWidth - 0.32, 0.18, 0.12), resetSafety, [bayX, 0.92, 3.52]);
      for (const side of [-1, 1]) {
        addResetPart(`arrival_reset_frontage_bay_jamb_${index}_${side < 0 ? "left" : "right"}`, new RoundedBoxGeometry(0.22, 4.95, 0.34, 4, 0.04), resetSteel, [bayX + side * (bayWidth / 2 + 0.16), 3.0, 3.38]);
        addResetPart(`arrival_reset_frontage_bay_drain_${index}_${side < 0 ? "left" : "right"}`, new THREE.BoxGeometry(0.12, 0.72, 0.16), resetSafety, [bayX + side * (bayWidth / 2 - 0.44), 1.08, 3.54]);
      }
      for (let slat = 0; slat < 10; slat += 1) addResetPart(`arrival_reset_frontage_bay_slatted_door_${index}_${slat}`, new THREE.BoxGeometry(bayWidth - 0.56, 0.08, 0.12), resetEdge, [bayX, 1.18 + slat * 0.41, 3.44], [0, 0, 0]);
      addResetPart(`arrival_reset_frontage_bay_work_light_${index}`, new RoundedBoxGeometry(0.82, 0.12, 0.2, 4, 0.03), resetWarm, [bayX, 5.12, 3.55]);
    }

    const resetCoreX = -14.0;
    addResetPart("arrival_reset_frontage_stair_core_back", new THREE.BoxGeometry(5.9, 13.6, 5.3), resetBacking, [resetCoreX, 7.0, 0.42]);
    addResetPart("arrival_reset_frontage_stair_core_front_glass", new THREE.BoxGeometry(5.36, 11.5, 0.1), resetGlass, [resetCoreX, 7.4, 3.38]);
    for (const x of [resetCoreX - 2.84, resetCoreX + 2.84]) addResetPart(`arrival_reset_frontage_stair_core_front_post_${x < resetCoreX ? "left" : "right"}`, new RoundedBoxGeometry(0.24, 13.2, 0.26, 4, 0.04), resetSteel, [x, 7.15, 3.54]);
    for (const y of [2.3, 5.45, 8.6, 11.75]) {
      addResetPart(`arrival_reset_frontage_stair_core_landing_${y}`, new THREE.BoxGeometry(6.2, 0.16, 2.6), resetEdge, [resetCoreX, y, 4.0]);
      addResetPart(`arrival_reset_frontage_stair_core_landing_rail_${y}`, new THREE.BoxGeometry(5.86, 0.12, 0.12), resetSafety, [resetCoreX, y + 0.76, 4.95]);
      addResetPart(`arrival_reset_frontage_stair_core_glazing_bar_${y}`, new THREE.BoxGeometry(5.12, 0.1, 0.12), resetSteel, [resetCoreX, y + 1.18, 3.62]);
    }
    for (const side of [-1, 1]) addResetPart(`arrival_reset_frontage_stair_core_side_mullion_${side < 0 ? "left" : "right"}`, new THREE.BoxGeometry(0.12, 12.3, 2.95), resetSteel, [resetCoreX + side * 2.62, 7.1, 1.9]);
    for (let step = 0; step < 7; step += 1) addResetPart(`arrival_reset_frontage_stair_core_step_${step}`, new THREE.BoxGeometry(1.35, 0.14, 0.74), resetEdge, [resetCoreX - 1.1 + step * 0.36, 0.46 + step * 0.28, 4.0], [0, 0, -0.08]);
    addResetPart("arrival_reset_frontage_stair_core_canopy", new RoundedBoxGeometry(6.45, 0.2, 3.0, 4, 0.05), resetSteel, [resetCoreX, 13.95, 3.85]);

    const resetSignCanvas = document.createElement("canvas");
    resetSignCanvas.width = 1024;
    resetSignCanvas.height = 128;
    const resetSignContext = resetSignCanvas.getContext("2d");
    if (resetSignContext) {
      resetSignContext.fillStyle = "#172326";
      resetSignContext.fillRect(0, 0, resetSignCanvas.width, resetSignCanvas.height);
      resetSignContext.fillStyle = "#b8774b";
      resetSignContext.fillRect(0, 0, 20, resetSignCanvas.height);
      resetSignContext.fillStyle = "#d8d0bd";
      resetSignContext.font = "700 48px Arial, sans-serif";
      resetSignContext.letterSpacing = "4px";
      resetSignContext.fillText("ARRIVAL / PROCESSING", 52, 82);
    }
    const resetSignTexture = new THREE.CanvasTexture(resetSignCanvas);
    resetSignTexture.colorSpace = THREE.SRGBColorSpace;
    resetSignTexture.anisotropy = 4;
    addResetPart("arrival_reset_frontage_facility_sign", new THREE.BoxGeometry(11.8, 1.0, 0.12), new THREE.MeshStandardMaterial({ map: resetSignTexture, roughness: 0.68, metalness: 0.26, emissive: 0x0c0806, emissiveIntensity: 0.18 }), [5.4, 14.1, 3.5]);
    addResetPart("arrival_reset_frontage_facility_sign_cap", new THREE.BoxGeometry(12.2, 0.12, 0.2), resetSafety, [5.4, 14.68, 3.58]);
    addResetPart("arrival_reset_frontage_roof_vent", new THREE.CylinderGeometry(0.42, 0.5, 2.2, 16), resetSteel, [10.5, 16.5, 0.2]);
    addResetPart("arrival_reset_frontage_roof_vent_cap", new THREE.CylinderGeometry(0.72, 0.72, 0.18, 16), resetEdge, [10.5, 17.62, 0.2]);
    for (const x of [-15.4, -5.1, 5.1, 15.4]) addResetPart(`arrival_reset_frontage_ground_bollard_${x}`, new RoundedBoxGeometry(0.32, 0.86, 0.32, 4, 0.05), resetSafety, [x, 0.43, 4.25]);
    for (const x of [-8.0, 4.0, 14.0]) {
      const bayPoint = new THREE.PointLight(0xffa467, 0.55, 8, 2);
      bayPoint.position.set(x, 4.9, 4.1);
      resetFrontage.add(bayPoint);
    }
    const corePoint = new THREE.PointLight(0xffa467, 0.58, 9, 2);
    corePoint.position.set(resetCoreX, 10.8, 4.1);
    resetFrontage.add(corePoint);

    const endWallGlass = new THREE.MeshPhysicalMaterial({ color: 0x19373c, roughness: 0.23, metalness: 0.16, clearcoat: 0.58, clearcoatRoughness: 0.18, transmission: 0.04, emissive: 0x0a1e21, emissiveIntensity: 0.2 });
    const endWallDark = new THREE.MeshStandardMaterial({ color: 0x182529, roughness: 0.9, metalness: 0.26 });
    addResetPart("arrival_reset_frontage_camera_end_wall", new THREE.BoxGeometry(0.16, 14.2, 5.45), resetPanelMaterials[2], [17.28, 7.5, 0]);
    addResetPart("arrival_reset_frontage_camera_end_lower_recess", new THREE.BoxGeometry(0.18, 4.75, 3.8), endWallDark, [17.38, 3.25, 0]);
    addResetPart("arrival_reset_frontage_camera_end_upper_glazing", new THREE.BoxGeometry(0.18, 2.26, 4.75), endWallGlass, [17.38, 11.18, 0]);
    for (const z of [-2.38, 0, 2.38]) addResetPart(`arrival_reset_frontage_camera_end_mullion_${z}`, new RoundedBoxGeometry(0.2, 2.7, 0.14, 4, 0.03), resetSteel, [17.5, 11.18, z]);
    for (const z of [-2.2, 2.2]) addResetPart(`arrival_reset_frontage_camera_end_pilaster_${z}`, new RoundedBoxGeometry(0.26, 13.8, 0.32, 4, 0.04), resetSteel, [17.48, 7.35, z]);
    addResetPart("arrival_reset_frontage_camera_end_door_header", new RoundedBoxGeometry(4.25, 0.22, 0.3, 4, 0.04), resetSteel, [17.5, 5.78, 0]);
    for (const z of [-2.08, 2.08]) addResetPart(`arrival_reset_frontage_camera_end_door_jamb_${z}`, new RoundedBoxGeometry(0.22, 4.9, 0.28, 4, 0.04), resetSteel, [17.5, 3.2, z]);
    addResetPart("arrival_reset_frontage_camera_end_safety_band", new THREE.BoxGeometry(0.2, 0.16, 4.3), resetSafety, [17.52, 0.96, 0]);
    addResetPart("arrival_reset_frontage_camera_end_drain", new THREE.BoxGeometry(0.22, 0.74, 0.12), resetEdge, [17.55, 1.05, -1.66]);
    addResetPart("arrival_reset_frontage_camera_end_downspout", new THREE.CylinderGeometry(0.12, 0.12, 11.8, 10), resetSteel, [17.54, 6.7, -2.52]);
    addResetPart("arrival_reset_frontage_camera_end_light", new RoundedBoxGeometry(0.82, 0.12, 0.18, 4, 0.03), resetWarm, [17.55, 5.38, -1.3]);
    for (let slat = 0; slat < 11; slat += 1) {
      addResetPart(`arrival_reset_frontage_camera_end_door_slat_${slat}`, new THREE.BoxGeometry(0.12, 0.08, 3.58), resetEdge, [17.6, 1.2 + slat * 0.39, 0]);
    }
    for (const z of [-1.34, 0, 1.34]) {
      addResetPart(`arrival_reset_frontage_camera_end_upper_window_${z}`, new THREE.BoxGeometry(0.12, 2.08, 0.82), endWallGlass, [17.6, 10.95, z]);
      addResetPart(`arrival_reset_frontage_camera_end_upper_window_frame_${z}`, new THREE.BoxGeometry(0.14, 2.26, 0.1), resetSteel, [17.68, 10.95, z]);
    }
    addResetPart("arrival_reset_frontage_camera_end_access_rail_left", new RoundedBoxGeometry(0.18, 6.3, 0.18, 4, 0.04), resetSteel, [17.62, 8.25, -1.64]);
    addResetPart("arrival_reset_frontage_camera_end_access_rail_right", new RoundedBoxGeometry(0.18, 6.3, 0.18, 4, 0.04), resetSteel, [17.62, 8.25, 1.64]);
    for (let rung = 0; rung < 7; rung += 1) addResetPart(`arrival_reset_frontage_camera_end_access_rung_${rung}`, new RoundedBoxGeometry(0.16, 0.16, 3.45, 4, 0.03), resetEdge, [17.66, 5.35 + rung * 0.92, 0]);
    if (urlParams.get("endLanding") === "on") {
      addResetPart("arrival_reset_frontage_camera_end_service_landing", new RoundedBoxGeometry(1.72, 0.2, 4.0, 5, 0.05), resetSteel, [18.15, 5.7, 0]);
      addResetPart("arrival_reset_frontage_camera_end_service_landing_fascia", new RoundedBoxGeometry(1.76, 0.35, 4.08, 5, 0.05), resetEdge, [18.18, 5.48, 0]);
      addResetPart("arrival_reset_frontage_camera_end_landing_rail_front", new RoundedBoxGeometry(0.12, 0.96, 3.7, 4, 0.03), resetSteel, [18.92, 6.23, 0]);
      addResetPart("arrival_reset_frontage_camera_end_landing_rail_left", new RoundedBoxGeometry(0.86, 0.96, 0.12, 4, 0.03), resetSteel, [18.48, 6.23, -1.92]);
      addResetPart("arrival_reset_frontage_camera_end_landing_rail_right", new RoundedBoxGeometry(0.86, 0.96, 0.12, 4, 0.03), resetSteel, [18.48, 6.23, 1.92]);
      for (const z of [-1.72, 1.72]) addResetPart(`arrival_reset_frontage_camera_end_landing_post_${z}`, new RoundedBoxGeometry(0.14, 1.24, 0.14, 4, 0.03), resetSteel, [18.88, 5.82, z]);
      for (let step = 0; step < 4; step += 1) addResetPart(`arrival_reset_frontage_camera_end_landing_step_${step}`, new RoundedBoxGeometry(1.05, 0.18, 3.0, 4, 0.04), resetEdge, [17.3 + step * 0.3, 0.75 + step * 0.62, 0]);
      for (const z of [-1.42, 1.42]) addResetPart(`arrival_reset_frontage_camera_end_landing_stair_rail_${z}`, new RoundedBoxGeometry(1.42, 0.12, 0.12, 4, 0.03), resetSteel, [17.76, 2.2, z], [0, 0, -0.42]);
    }

    const resetAnnex = new THREE.Group();
    resetAnnex.name = "density_arrival_right_setback_visual_reset_annex";
    resetAnnex.position.set(-342, 0, 192);
    resetAnnex.rotation.y = roadHeading + Math.PI;
    resetAnnex.userData.visualLayer = "street-canyon-facade-massing";
    resetAnnex.userData.presentationModule = "coherent right setback service annex visual reset";
    resetAnnex.userData.authoringRecord = {
      type: "detail",
      id: "density_arrival_right_setback_visual_reset_annex",
      displayName: "Arrival Right Setback Service Annex Visual Reset",
      role: "Presentation-only companion elevation for the camera-visible right setback shell. It completes the reset as a stepped working-facility composition without changing the existing building mass or gameplay/runtime truth.",
      runtimeNote: "Stepped service annex with continuous ribbon glazing, louver bays, roof parapet, connecting catwalk, and practicals; removable with arrivalReset=legacy.",
    };
    root.add(resetAnnex);
    const annexBacking = new THREE.MeshStandardMaterial({ color: 0x334345, roughness: 0.88, metalness: 0.3 });
    const annexPanel = new THREE.MeshStandardMaterial({ color: 0x596765, roughness: 0.84, metalness: 0.34 });
    const annexSteel = new THREE.MeshStandardMaterial({ color: 0x233033, roughness: 0.68, metalness: 0.76 });
    const annexEdge = new THREE.MeshStandardMaterial({ color: 0x74786f, roughness: 0.86, metalness: 0.34 });
    const annexGlass = new THREE.MeshPhysicalMaterial({ color: 0x1c3c40, roughness: 0.22, metalness: 0.14, clearcoat: 0.62, clearcoatRoughness: 0.18, transmission: 0.04, emissive: 0x0a2022, emissiveIntensity: 0.25 });
    const annexDark = new THREE.MeshStandardMaterial({ color: 0x182528, roughness: 0.93, metalness: 0.2 });
    const annexSafety = new THREE.MeshStandardMaterial({ color: 0xb77549, roughness: 0.74, metalness: 0.12, emissive: 0x210a05, emissiveIntensity: 0.08 });
    const annexWarm = new THREE.MeshStandardMaterial({ color: 0xffc37a, roughness: 0.28, metalness: 0.08, emissive: 0x743315, emissiveIntensity: 1.0 });
    const addAnnexPart = (namePart: string, geometry: THREE.BufferGeometry, material: THREE.Material, position: [number, number, number], rotation: [number, number, number] = [0, 0, 0]) => {
      const part = new THREE.Mesh(geometry, material);
      part.name = namePart;
      part.position.set(...position);
      part.rotation.set(...rotation);
      part.castShadow = fullQualityPresentation;
      part.receiveShadow = true;
      part.userData.visualLayer = "street-canyon-facade-massing";
      resetAnnex.add(part);
      return part;
    };
    addAnnexPart("arrival_reset_annex_deep_service_wall", new THREE.BoxGeometry(30, 18.0, 5.4), annexBacking, [0, 9.0, 0]);
    addAnnexPart("arrival_reset_annex_concrete_plinth", new RoundedBoxGeometry(31.2, 0.72, 5.86, 5, 0.08), annexEdge, [0, 0.36, 0.08]);
    addAnnexPart("arrival_reset_annex_upper_parapet", new RoundedBoxGeometry(30.8, 0.62, 5.86, 5, 0.08), annexSteel, [0, 18.28, 0.04]);
    addAnnexPart("arrival_reset_annex_lower_course", new THREE.BoxGeometry(29.4, 1.18, 5.7), annexPanel, [0, 1.2, 0.1]);
    for (const x of [-13.5, -9.0, -4.5, 0, 4.5, 9.0, 13.5]) {
      addAnnexPart(`arrival_reset_annex_vertical_pilaster_${x}`, new RoundedBoxGeometry(0.24, 16.8, 0.34, 4, 0.04), annexSteel, [x, 8.9, 2.84]);
    }
    for (const y of [5.0, 8.9, 12.8, 16.3]) addAnnexPart(`arrival_reset_annex_horizontal_seam_${y}`, new THREE.BoxGeometry(29.1, 0.12, 0.2), annexEdge, [0, y, 2.76]);
    addAnnexPart("arrival_reset_annex_ribbon_backing", new THREE.BoxGeometry(26.2, 3.0, 0.16), annexDark, [0, 13.35, 2.88]);
    for (let index = 0; index < 6; index += 1) {
      const x = -10.75 + index * 4.3;
      addAnnexPart(`arrival_reset_annex_ribbon_glazing_${index}`, new THREE.BoxGeometry(3.55, 2.35, 0.08), annexGlass, [x, 13.35, 3.02]);
      addAnnexPart(`arrival_reset_annex_ribbon_mullion_${index}`, new THREE.BoxGeometry(0.12, 2.64, 0.12), annexSteel, [x + 1.85, 13.35, 3.16]);
      addAnnexPart(`arrival_reset_annex_ribbon_sill_${index}`, new THREE.BoxGeometry(3.82, 0.12, 0.22), annexEdge, [x, 11.94, 3.18]);
    }
    const annexBayXs = [-9.3, 0, 9.3];
    for (const [index, bayX] of annexBayXs.entries()) {
      addAnnexPart(`arrival_reset_annex_louver_backing_${index}`, new THREE.BoxGeometry(7.1, 4.6, 0.16), annexDark, [bayX, 3.4, 2.9]);
      for (let louver = 0; louver < 7; louver += 1) addAnnexPart(`arrival_reset_annex_louver_${index}_${louver}`, new THREE.BoxGeometry(6.5, 0.12, 0.18), annexPanel, [bayX, 1.44 + louver * 0.58, 3.12]);
      addAnnexPart(`arrival_reset_annex_louver_header_${index}`, new RoundedBoxGeometry(7.5, 0.2, 0.3, 4, 0.04), annexSteel, [bayX, 5.84, 3.24]);
      addAnnexPart(`arrival_reset_annex_louver_canopy_${index}`, new RoundedBoxGeometry(7.7, 0.18, 1.35, 4, 0.04), annexEdge, [bayX, 6.02, 3.78], [-0.08, 0, 0]);
      addAnnexPart(`arrival_reset_annex_louver_safety_${index}`, new THREE.BoxGeometry(6.7, 0.16, 0.1), annexSafety, [bayX, 0.94, 3.28]);
      addAnnexPart(`arrival_reset_annex_louver_lamp_${index}`, new RoundedBoxGeometry(0.82, 0.12, 0.18, 4, 0.03), annexWarm, [bayX, 5.52, 3.38]);
    }
    addAnnexPart("arrival_reset_annex_connector_catwalk", new RoundedBoxGeometry(12.2, 0.18, 2.1, 4, 0.04), annexSteel, [-12.6, 8.4, 3.92]);
    addAnnexPart("arrival_reset_annex_connector_catwalk_rail", new THREE.BoxGeometry(11.8, 0.92, 0.12), annexSafety, [-12.6, 8.94, 4.62]);
    for (const x of [-14.8, -10.4]) addAnnexPart(`arrival_reset_annex_connector_catwalk_support_${x}`, new RoundedBoxGeometry(0.22, 8.5, 0.22, 4, 0.04), annexSteel, [x, 4.2, 4.0]);
    addAnnexPart("arrival_reset_annex_roof_service_duct", new THREE.CylinderGeometry(0.5, 0.56, 4.2, 14), annexSteel, [10.8, 20.3, 0.2]);
    addAnnexPart("arrival_reset_annex_roof_service_duct_cap", new THREE.CylinderGeometry(0.8, 0.8, 0.18, 14), annexEdge, [10.8, 22.42, 0.2]);
    const annexLight = new THREE.PointLight(0xffa467, 0.5, 9, 2);
    annexLight.position.set(0, 5.1, 4.3);
    resetAnnex.add(annexLight);
    addAnnexPart("arrival_reset_annex_camera_end_wall", new THREE.BoxGeometry(0.16, 17.1, 5.08), annexPanel, [15.18, 8.9, 0]);
    addAnnexPart("arrival_reset_annex_camera_end_lower_recess", new THREE.BoxGeometry(0.18, 5.0, 3.6), annexDark, [15.28, 3.45, 0]);
    addAnnexPart("arrival_reset_annex_camera_end_upper_glazing", new THREE.BoxGeometry(0.18, 2.4, 4.54), annexGlass, [15.28, 13.65, 0]);
    for (const z of [-2.28, 0, 2.28]) addAnnexPart(`arrival_reset_annex_camera_end_mullion_${z}`, new RoundedBoxGeometry(0.2, 2.82, 0.14, 4, 0.03), annexSteel, [15.4, 13.65, z]);
    for (const z of [-2.18, 2.18]) addAnnexPart(`arrival_reset_annex_camera_end_pilaster_${z}`, new RoundedBoxGeometry(0.26, 16.6, 0.32, 4, 0.04), annexSteel, [15.38, 8.7, z]);
    addAnnexPart("arrival_reset_annex_camera_end_door_header", new RoundedBoxGeometry(4.1, 0.22, 0.3, 4, 0.04), annexSteel, [15.4, 6.0, 0]);
    for (const z of [-2.0, 2.0]) addAnnexPart(`arrival_reset_annex_camera_end_door_jamb_${z}`, new RoundedBoxGeometry(0.22, 5.0, 0.28, 4, 0.04), annexSteel, [15.4, 3.45, z]);
    addAnnexPart("arrival_reset_annex_camera_end_safety_band", new THREE.BoxGeometry(0.2, 0.16, 4.15), annexSafety, [15.42, 0.96, 0]);
    addAnnexPart("arrival_reset_annex_camera_end_downspout", new THREE.CylinderGeometry(0.12, 0.12, 14.4, 10), annexSteel, [15.44, 8.0, -2.42]);
    addAnnexPart("arrival_reset_annex_camera_end_light", new RoundedBoxGeometry(0.82, 0.12, 0.18, 4, 0.03), annexWarm, [15.45, 5.55, -1.3]);

    if (urlParams.get("leftMidReset") === "on") {
      const legacyLeftSetback = root.getObjectByName("density_arrival_left_setback_frontage");
      if (legacyLeftSetback) legacyLeftSetback.visible = false;
      const leftMid = new THREE.Group();
      leftMid.name = "density_arrival_left_setback_visual_reset";
      leftMid.position.set(-382, 0, 194);
      leftMid.rotation.y = roadHeading;
      leftMid.userData.visualLayer = "street-canyon-facade-massing";
      leftMid.userData.presentationModule = "left setback service warehouse visual reset";
      leftMid.userData.authoringRecord = {
        type: "detail",
        id: "density_arrival_left_setback_visual_reset",
        displayName: "Arrival Left Setback Service Warehouse Visual Reset",
        role: "Presentation-only replacement elevation for the camera-visible left setback shell. It provides a midground working-facility layer while preserving the authored mass, route, and gameplay records.",
        runtimeNote: "Deep midground service warehouse with four loading bays, upper glazing, supported catwalk, roof plant, and practicals; removable with leftMidReset=off.",
      };
      root.add(leftMid);
      const leftMidBacking = new THREE.MeshStandardMaterial({ color: 0x364746, roughness: 0.84, metalness: 0.3 });
      const leftMidPanel = new THREE.MeshStandardMaterial({ color: 0x596864, roughness: 0.8, metalness: 0.34 });
      const leftMidSteel = new THREE.MeshStandardMaterial({ color: 0x1c292c, roughness: 0.66, metalness: 0.76 });
      const leftMidEdge = new THREE.MeshStandardMaterial({ color: 0x787a70, roughness: 0.88, metalness: 0.32 });
      const leftMidGlass = new THREE.MeshPhysicalMaterial({ color: 0x19383c, roughness: 0.2, metalness: 0.15, clearcoat: 0.66, clearcoatRoughness: 0.17, transmission: 0.04, emissive: 0x0a1e20, emissiveIntensity: 0.22 });
      const leftMidDark = new THREE.MeshStandardMaterial({ color: 0x172528, roughness: 0.93, metalness: 0.18 });
      const leftMidSafety = new THREE.MeshStandardMaterial({ color: 0xb87549, roughness: 0.74, metalness: 0.13, emissive: 0x220b05, emissiveIntensity: 0.08 });
      const leftMidWarm = new THREE.MeshStandardMaterial({ color: 0xffc27a, roughness: 0.28, metalness: 0.08, emissive: 0x743315, emissiveIntensity: 1.0 });
      const addLeftMidPart = (namePart: string, geometry: THREE.BufferGeometry, material: THREE.Material, position: [number, number, number], rotation: [number, number, number] = [0, 0, 0]) => {
        const part = new THREE.Mesh(geometry, material);
        part.name = namePart;
        part.position.set(...position);
        part.rotation.set(...rotation);
        part.castShadow = fullQualityPresentation;
        part.receiveShadow = true;
        part.userData.visualLayer = "street-canyon-facade-massing";
        leftMid.add(part);
        return part;
      };
      addLeftMidPart("arrival_reset_left_mid_service_wall", new THREE.BoxGeometry(26.4, 14.2, 5.6), leftMidBacking, [0, 7.1, 0]);
      addLeftMidPart("arrival_reset_left_mid_concrete_plinth", new RoundedBoxGeometry(27.2, 0.72, 6.0, 5, 0.08), leftMidEdge, [0, 0.36, 0.08]);
      addLeftMidPart("arrival_reset_left_mid_upper_parapet", new RoundedBoxGeometry(27.0, 0.58, 5.96, 5, 0.08), leftMidSteel, [0, 14.45, 0.02]);
      for (const x of [-12.1, -6.05, 0, 6.05, 12.1]) addLeftMidPart(`arrival_reset_left_mid_front_pilaster_${x}`, new RoundedBoxGeometry(0.22, 13.6, 0.32, 4, 0.04), leftMidSteel, [x, 7.1, 2.9]);
      for (const y of [1.8, 5.6, 9.0, 12.7]) addLeftMidPart(`arrival_reset_left_mid_front_seam_${y}`, new THREE.BoxGeometry(25.5, 0.11, 0.18), leftMidEdge, [0, y, 2.83]);
      for (const x of [-9.2, -3.05, 3.05, 9.2]) {
        addLeftMidPart(`arrival_reset_left_mid_upper_glazing_${x}`, new THREE.BoxGeometry(4.75, 2.2, 0.08), leftMidGlass, [x, 10.8, 2.9]);
        addLeftMidPart(`arrival_reset_left_mid_upper_sill_${x}`, new THREE.BoxGeometry(4.98, 0.12, 0.18), leftMidEdge, [x, 9.58, 3.05]);
        addLeftMidPart(`arrival_reset_left_mid_upper_header_${x}`, new THREE.BoxGeometry(4.98, 0.12, 0.18), leftMidSteel, [x, 12.0, 3.05]);
      }
      const leftMidBayXs = [-9.2, -3.05, 3.05, 9.2];
      for (const [index, x] of leftMidBayXs.entries()) {
        addLeftMidPart(`arrival_reset_left_mid_bay_backing_${index}`, new THREE.BoxGeometry(5.25, 5.0, 0.16), leftMidDark, [x, 3.22, 2.88]);
        for (let slat = 0; slat < 10; slat += 1) addLeftMidPart(`arrival_reset_left_mid_bay_slat_${index}_${slat}`, new THREE.BoxGeometry(4.85, 0.08, 0.12), leftMidEdge, [x, 1.06 + slat * 0.42, 3.08]);
        addLeftMidPart(`arrival_reset_left_mid_bay_header_${index}`, new RoundedBoxGeometry(5.5, 0.2, 0.32, 4, 0.04), leftMidSteel, [x, 5.85, 3.15]);
        addLeftMidPart(`arrival_reset_left_mid_bay_canopy_${index}`, new RoundedBoxGeometry(5.72, 0.18, 1.4, 4, 0.04), leftMidEdge, [x, 6.03, 3.72], [-0.08, 0, 0]);
        addLeftMidPart(`arrival_reset_left_mid_bay_light_${index}`, new RoundedBoxGeometry(0.78, 0.11, 0.18, 4, 0.03), leftMidWarm, [x, 5.54, 3.22]);
        for (const side of [-1, 1]) addLeftMidPart(`arrival_reset_left_mid_bay_jamb_${index}_${side}`, new RoundedBoxGeometry(0.2, 5.18, 0.3, 4, 0.04), leftMidSteel, [x + side * 2.7, 3.24, 3.15]);
      }
      addLeftMidPart("arrival_reset_left_mid_catwalk_deck", new RoundedBoxGeometry(18.8, 0.18, 1.7, 4, 0.04), leftMidSteel, [0, 7.7, 3.65]);
      addLeftMidPart("arrival_reset_left_mid_catwalk_rail", new THREE.BoxGeometry(18.2, 0.92, 0.12), leftMidSafety, [0, 8.22, 4.42]);
      for (const x of [-8.6, 8.6]) addLeftMidPart(`arrival_reset_left_mid_catwalk_support_${x}`, new RoundedBoxGeometry(0.22, 7.6, 0.22, 4, 0.04), leftMidSteel, [x, 3.85, 3.75]);
      addLeftMidPart("arrival_reset_left_mid_roof_hvac", new THREE.BoxGeometry(2.0, 1.2, 1.7), leftMidSteel, [-7.5, 15.1, -0.2]);
      addLeftMidPart("arrival_reset_left_mid_roof_hvac_cap", new RoundedBoxGeometry(2.22, 0.14, 1.94, 4, 0.03), leftMidEdge, [-7.5, 15.76, -0.2]);
      addLeftMidPart("arrival_reset_left_mid_roof_duct", new THREE.CylinderGeometry(0.42, 0.5, 2.4, 14), leftMidSteel, [7.2, 15.5, 0.1]);
      const leftMidLight = new THREE.PointLight(0xffa467, 0.52, 9, 2);
      leftMidLight.position.set(0, 5.25, 3.7);
      leftMid.add(leftMidLight);
    }

    const leftCorner = new THREE.Group();
    leftCorner.name = "density_arrival_left_corner_workshop_visual_reset";
    leftCorner.position.set(-391.5, 0, 205.5);
    leftCorner.rotation.y = roadHeading;
    leftCorner.userData.visualLayer = "street-canyon-facade-massing";
    leftCorner.userData.presentationModule = "left corner workshop visual reset";
    leftCorner.userData.authoringRecord = {
      type: "detail",
      id: "density_arrival_left_corner_workshop_visual_reset",
      displayName: "Arrival Left Corner Workshop Visual Reset",
      role: "Presentation-only three-dimensional corner workshop that establishes a close left street edge without replacing a gameplay mass or narrowing the authored route.",
      runtimeNote: "Setback workshop volume with three loading bays, upper glazing, side louvers, roof plant, practicals, and real depth; removable with arrivalReset=legacy.",
    };
    root.add(leftCorner);
    leftCorner.visible = urlParams.get("leftCorner") === "on";
    const leftCornerBacking = new THREE.MeshStandardMaterial({ color: 0x303f3e, roughness: 0.86, metalness: 0.3 });
    const leftCornerPanel = new THREE.MeshStandardMaterial({ color: 0x596663, roughness: 0.8, metalness: 0.34 });
    const leftCornerSteel = new THREE.MeshStandardMaterial({ color: 0x1d292c, roughness: 0.66, metalness: 0.76 });
    const leftCornerEdge = new THREE.MeshStandardMaterial({ color: 0x73776e, roughness: 0.86, metalness: 0.34 });
    const leftCornerGlass = new THREE.MeshPhysicalMaterial({ color: 0x18373b, roughness: 0.2, metalness: 0.15, clearcoat: 0.66, clearcoatRoughness: 0.17, transmission: 0.04, emissive: 0x0a1e20, emissiveIntensity: 0.22 });
    const leftCornerDark = new THREE.MeshStandardMaterial({ color: 0x172528, roughness: 0.93, metalness: 0.18 });
    const leftCornerSafety = new THREE.MeshStandardMaterial({ color: 0xb77449, roughness: 0.73, metalness: 0.13, emissive: 0x220b05, emissiveIntensity: 0.08 });
    const leftCornerWarm = new THREE.MeshStandardMaterial({ color: 0xffc27a, roughness: 0.28, metalness: 0.08, emissive: 0x743315, emissiveIntensity: 1.0 });
    const addLeftCornerPart = (namePart: string, geometry: THREE.BufferGeometry, material: THREE.Material, position: [number, number, number], rotation: [number, number, number] = [0, 0, 0]) => {
      const part = new THREE.Mesh(geometry, material);
      part.name = namePart;
      part.position.set(...position);
      part.rotation.set(...rotation);
      part.castShadow = fullQualityPresentation;
      part.receiveShadow = true;
      part.userData.visualLayer = "street-canyon-facade-massing";
      leftCorner.add(part);
      return part;
    };
    addLeftCornerPart("arrival_reset_left_corner_workshop_wall", new THREE.BoxGeometry(11.2, 8.8, 5.5), leftCornerBacking, [0, 4.4, 0]);
    addLeftCornerPart("arrival_reset_left_corner_workshop_plinth", new RoundedBoxGeometry(11.8, 0.72, 5.9, 5, 0.08), leftCornerEdge, [0, 0.36, 0.08]);
    addLeftCornerPart("arrival_reset_left_corner_workshop_parapet", new RoundedBoxGeometry(11.9, 0.56, 5.86, 5, 0.08), leftCornerSteel, [0, 9.05, 0.02]);
    for (const x of [-5.0, -2.5, 0, 2.5, 5.0]) addLeftCornerPart(`arrival_reset_left_corner_front_pilaster_${x}`, new RoundedBoxGeometry(0.2, 8.35, 0.3, 4, 0.04), leftCornerSteel, [x, 4.45, 2.82]);
    for (const y of [1.75, 4.55, 7.42]) addLeftCornerPart(`arrival_reset_left_corner_front_seam_${y}`, new THREE.BoxGeometry(10.6, 0.11, 0.18), leftCornerEdge, [0, y, 2.8]);
    const leftBayXs = [-3.7, 0, 3.7];
    for (const [index, x] of leftBayXs.entries()) {
      addLeftCornerPart(`arrival_reset_left_corner_bay_backing_${index}`, new THREE.BoxGeometry(3.08, 3.18, 0.16), leftCornerDark, [x, 2.55, 2.82]);
      for (let slat = 0; slat < 8; slat += 1) addLeftCornerPart(`arrival_reset_left_corner_bay_slat_${index}_${slat}`, new THREE.BoxGeometry(2.74, 0.08, 0.12), leftCornerEdge, [x, 1.2 + slat * 0.4, 3.0]);
      addLeftCornerPart(`arrival_reset_left_corner_bay_header_${index}`, new RoundedBoxGeometry(3.34, 0.2, 0.3, 4, 0.04), leftCornerSteel, [x, 4.22, 3.08]);
      addLeftCornerPart(`arrival_reset_left_corner_bay_canopy_${index}`, new RoundedBoxGeometry(3.52, 0.17, 1.2, 4, 0.04), leftCornerEdge, [x, 4.38, 3.55], [-0.08, 0, 0]);
      addLeftCornerPart(`arrival_reset_left_corner_bay_lamp_${index}`, new RoundedBoxGeometry(0.68, 0.11, 0.18, 4, 0.03), leftCornerWarm, [x, 4.0, 3.18]);
      for (const side of [-1, 1]) addLeftCornerPart(`arrival_reset_left_corner_bay_jamb_${index}_${side}`, new RoundedBoxGeometry(0.18, 3.38, 0.28, 4, 0.04), leftCornerSteel, [x + side * 1.61, 2.55, 3.08]);
    }
    for (const x of [-3.7, 0, 3.7]) {
      addLeftCornerPart(`arrival_reset_left_corner_upper_glazing_${x}`, new THREE.BoxGeometry(3.0, 1.85, 0.08), leftCornerGlass, [x, 6.7, 2.84]);
      addLeftCornerPart(`arrival_reset_left_corner_upper_glazing_sill_${x}`, new THREE.BoxGeometry(3.15, 0.12, 0.18), leftCornerEdge, [x, 5.7, 3.0]);
      addLeftCornerPart(`arrival_reset_left_corner_upper_glazing_header_${x}`, new THREE.BoxGeometry(3.15, 0.12, 0.18), leftCornerSteel, [x, 7.68, 3.0]);
    }
    addLeftCornerPart("arrival_reset_left_corner_service_sign", new RoundedBoxGeometry(6.8, 0.56, 0.12, 4, 0.025), leftCornerSafety, [0, 8.42, 2.93]);
    addLeftCornerPart("arrival_reset_left_corner_side_louver_backing", new THREE.BoxGeometry(0.16, 4.7, 3.9), leftCornerDark, [5.68, 4.5, 0]);
    for (let louver = 0; louver < 8; louver += 1) addLeftCornerPart(`arrival_reset_left_corner_side_louver_${louver}`, new THREE.BoxGeometry(0.18, 0.12, 3.55), leftCornerPanel, [5.82, 1.42 + louver * 0.48, 0]);
    addLeftCornerPart("arrival_reset_left_corner_roof_hvac", new THREE.BoxGeometry(1.55, 1.15, 1.55), leftCornerSteel, [-3.2, 9.78, -0.25]);
    addLeftCornerPart("arrival_reset_left_corner_roof_hvac_cap", new RoundedBoxGeometry(1.78, 0.14, 1.76, 4, 0.03), leftCornerEdge, [-3.2, 10.4, -0.25]);
    addLeftCornerPart("arrival_reset_left_corner_roof_duct", new THREE.CylinderGeometry(0.34, 0.4, 1.9, 14), leftCornerSteel, [2.7, 9.98, 0.2]);
    const leftCornerLight = new THREE.PointLight(0xffa467, 0.48, 8, 2);
    leftCornerLight.position.set(0, 4.1, 3.6);
    leftCorner.add(leftCornerLight);

    if (urlParams.get("leftReset") === "on") {
      const legacyCatwalk = root.getObjectByName("density_arrival_frontage_catwalk");
    if (legacyCatwalk) legacyCatwalk.visible = false;
    const legacyCurbRack = root.getObjectByName("density_arrival_curb_service_rack");
    if (legacyCurbRack) legacyCurbRack.visible = false;
    const leftReset = new THREE.Group();
    leftReset.name = "density_arrival_left_service_hall_visual_reset";
    leftReset.position.set(-381, 0, 211);
    leftReset.rotation.y = roadHeading - Math.PI / 2 - 0.18;
    leftReset.userData.visualLayer = "street-canyon-facade-massing";
    leftReset.userData.presentationModule = "coherent left service hall visual reset";
    leftReset.userData.authoringRecord = {
      type: "detail",
      id: "density_arrival_left_service_hall_visual_reset",
      displayName: "Arrival Left Service Hall Visual Reset",
      role: "Presentation-only replacement for the camera-visible left/midground service frontage. It removes the weak floating catwalk/rack clutter and supplies one legible working hall without changing the arrival road, masses, connectors, or gameplay truth.",
      runtimeNote: "Deep cladded service hall, recessed roller bays, upper ribbon glazing, supported canopy, dock lamps, and roof plant; removable with arrivalReset=legacy.",
    };
    root.add(leftReset);
    const leftHallBacking = new THREE.MeshStandardMaterial({ color: 0x354648, roughness: 0.9, metalness: 0.28 });
    const leftHallPanel = new THREE.MeshStandardMaterial({ color: 0x65736d, roughness: 0.84, metalness: 0.3 });
    const leftHallSteel = new THREE.MeshStandardMaterial({ color: 0x202d2f, roughness: 0.7, metalness: 0.74 });
    const leftHallEdge = new THREE.MeshStandardMaterial({ color: 0x777970, roughness: 0.9, metalness: 0.28 });
    const leftHallGlass = new THREE.MeshPhysicalMaterial({ color: 0x1b3a3d, roughness: 0.2, metalness: 0.12, clearcoat: 0.62, clearcoatRoughness: 0.18, transmission: 0.04, emissive: 0x0a1f21, emissiveIntensity: 0.22 });
    const leftHallDark = new THREE.MeshStandardMaterial({ color: 0x172528, roughness: 0.94, metalness: 0.18 });
    const leftHallSafety = new THREE.MeshStandardMaterial({ color: 0xb67448, roughness: 0.74, metalness: 0.12, emissive: 0x210a05, emissiveIntensity: 0.08 });
    const leftHallWarm = new THREE.MeshStandardMaterial({ color: 0xffc17a, roughness: 0.26, metalness: 0.08, emissive: 0x713115, emissiveIntensity: 1.0 });
    const addLeftHallPart = (namePart: string, geometry: THREE.BufferGeometry, material: THREE.Material, position: [number, number, number], rotation: [number, number, number] = [0, 0, 0]) => {
      const part = new THREE.Mesh(geometry, material);
      part.name = namePart;
      part.position.set(...position);
      part.rotation.set(...rotation);
      part.castShadow = fullQualityPresentation;
      part.receiveShadow = true;
      part.userData.visualLayer = "street-canyon-facade-massing";
      leftReset.add(part);
      return part;
    };
    addLeftHallPart("arrival_left_reset_hall_deep_body", new THREE.BoxGeometry(34, 10.8, 4.8), leftHallBacking, [0, 5.4, 0]);
    addLeftHallPart("arrival_left_reset_hall_plinth", new RoundedBoxGeometry(35.2, 0.72, 5.25, 5, 0.08), leftHallEdge, [0, 0.36, 0.08]);
    addLeftHallPart("arrival_left_reset_hall_upper_parapet", new RoundedBoxGeometry(35.3, 0.52, 5.22, 5, 0.08), leftHallSteel, [0, 11.05, 0.04]);
    addLeftHallPart("arrival_left_reset_hall_lower_course", new THREE.BoxGeometry(34.0, 1.12, 5.04), leftHallPanel, [0, 1.18, 0.1]);
    for (const x of [-16.0, -12.0, -8.0, -4.0, 0, 4.0, 8.0, 12.0, 16.0]) addLeftHallPart(`arrival_left_reset_hall_pilaster_${x}`, new RoundedBoxGeometry(0.24, 10.1, 0.34, 4, 0.04), leftHallSteel, [x, 5.65, 2.75]);
    for (const y of [4.75, 7.8, 10.1]) addLeftHallPart(`arrival_left_reset_hall_seam_${y}`, new THREE.BoxGeometry(33.1, 0.1, 0.2), leftHallEdge, [0, y, 2.65]);
    addLeftHallPart("arrival_left_reset_hall_ribbon_backing", new THREE.BoxGeometry(28.1, 2.35, 0.16), leftHallDark, [0, 8.42, 2.72]);
    for (let index = 0; index < 6; index += 1) {
      const x = -11.65 + index * 4.66;
      addLeftHallPart(`arrival_left_reset_hall_ribbon_glazing_${index}`, new THREE.BoxGeometry(3.86, 1.78, 0.08), leftHallGlass, [x, 8.42, 2.86]);
      addLeftHallPart(`arrival_left_reset_hall_ribbon_mullion_${index}`, new THREE.BoxGeometry(0.12, 2.04, 0.12), leftHallSteel, [x + 2.0, 8.42, 3.0]);
    }
    const leftBayXs = [-11.0, 0, 11.0];
    for (const [index, bayX] of leftBayXs.entries()) {
      const bayWidth = 8.1;
      addLeftHallPart(`arrival_left_reset_hall_bay_recess_${index}`, new THREE.BoxGeometry(bayWidth, 4.42, 0.18), leftHallDark, [bayX, 3.0, 2.72]);
      for (let slat = 0; slat < 9; slat += 1) addLeftHallPart(`arrival_left_reset_hall_bay_roller_slat_${index}_${slat}`, new THREE.BoxGeometry(bayWidth - 0.5, 0.08, 0.12), leftHallEdge, [bayX, 1.28 + slat * 0.43, 3.04]);
      addLeftHallPart(`arrival_left_reset_hall_bay_header_${index}`, new RoundedBoxGeometry(bayWidth + 0.42, 0.24, 0.32, 4, 0.04), leftHallSteel, [bayX, 5.45, 3.16]);
      addLeftHallPart(`arrival_left_reset_hall_bay_canopy_${index}`, new RoundedBoxGeometry(bayWidth + 0.72, 0.18, 1.42, 4, 0.04), leftHallEdge, [bayX, 5.7, 3.68], [-0.08, 0, 0]);
      addLeftHallPart(`arrival_left_reset_hall_bay_safety_${index}`, new THREE.BoxGeometry(bayWidth - 0.34, 0.16, 0.1), leftHallSafety, [bayX, 0.92, 3.2]);
      addLeftHallPart(`arrival_left_reset_hall_bay_lamp_${index}`, new RoundedBoxGeometry(0.84, 0.12, 0.18, 4, 0.03), leftHallWarm, [bayX, 5.12, 3.24]);
      for (const side of [-1, 1]) addLeftHallPart(`arrival_left_reset_hall_bay_jamb_${index}_${side < 0 ? "left" : "right"}`, new RoundedBoxGeometry(0.22, 4.76, 0.34, 4, 0.04), leftHallSteel, [bayX + side * (bayWidth / 2 + 0.16), 3.0, 3.08]);
    }
    addLeftHallPart("arrival_left_reset_hall_front_canopy", new RoundedBoxGeometry(34.2, 0.2, 2.25, 5, 0.05), leftHallSteel, [0, 6.2, 4.0], [-0.08, 0, 0]);
    for (const x of [-15.6, -7.8, 0, 7.8, 15.6]) {
      addLeftHallPart(`arrival_left_reset_hall_canopy_post_${x}`, new RoundedBoxGeometry(0.24, 6.1, 0.24, 4, 0.04), leftHallSteel, [x, 3.05, 4.65]);
      addLeftHallPart(`arrival_left_reset_hall_canopy_brace_${x}`, new RoundedBoxGeometry(0.16, 0.16, 2.1, 4, 0.03), leftHallSteel, [x, 5.52, 3.78], [-0.16, 0, 0]);
    }
    addLeftHallPart("arrival_left_reset_hall_service_sign", new RoundedBoxGeometry(9.8, 0.78, 0.12, 4, 0.03), leftHallSafety, [5.0, 10.46, 2.95]);
    addLeftHallPart("arrival_left_reset_hall_service_sign_inner", new RoundedBoxGeometry(9.15, 0.48, 0.04, 4, 0.02), leftHallDark, [5.0, 10.46, 3.03]);
    addLeftHallPart("arrival_left_reset_hall_roof_vent", new THREE.CylinderGeometry(0.42, 0.5, 2.1, 14), leftHallSteel, [11.0, 12.1, 0.1]);
    addLeftHallPart("arrival_left_reset_hall_roof_vent_cap", new THREE.CylinderGeometry(0.68, 0.68, 0.16, 14), leftHallEdge, [11.0, 13.18, 0.1]);
    const leftHallLight = new THREE.PointLight(0xffa467, 0.48, 9, 2);
      leftHallLight.position.set(0, 5.0, 4.4);
      leftReset.add(leftHallLight);
    }
  }

  // The far-end arrival sightline needs a substantial destination cue rather than
  // another wall strip. This open service-entry portico frames the road, keeps the
  // center lane visually and physically open, and remains presentation-only.
  if (urlParams.get("arrivalPortico") !== "off") {
    const portico = new THREE.Group();
    portico.name = "density_arrival_destination_service_portico";
    portico.position.set(-324, 0, 183);
    portico.rotation.y = -0.42;
    portico.userData.visualLayer = "street-canyon-facade-massing";
    portico.userData.presentationModule = "open arrival service-entry portico";
    portico.userData.authoringRecord = {
      type: "detail",
      id: "density_arrival_destination_service_portico",
      displayName: "Arrival Service-Entry Portico",
      role: "Presentation-only open destination frame at the far end of the arrival road; communicates a controlled industrial threshold without changing the connector, gate, or gameplay volumes.",
      runtimeNote: "Two steel portal piers, raised canopy, service kiosks, safety sign, practical lamps, and a small surveillance housing; removable with arrivalPortico=off.",
    };
    root.add(portico);
    const porticoSteel = new THREE.MeshStandardMaterial({ color: 0x263335, roughness: 0.7, metalness: 0.68 });
    const porticoEdge = new THREE.MeshStandardMaterial({ color: 0x4f5b57, roughness: 0.78, metalness: 0.52 });
    const porticoConcrete = new THREE.MeshStandardMaterial({ color: 0x77746b, roughness: 0.96, metalness: 0.06 });
    const porticoSafety = new THREE.MeshStandardMaterial({ color: 0xb36a40, roughness: 0.72, metalness: 0.12, emissive: 0x2a1007, emissiveIntensity: 0.08 });
    const porticoSign = new THREE.MeshStandardMaterial({ color: 0x35464a, roughness: 0.5, metalness: 0.3, emissive: 0x0e2225, emissiveIntensity: 0.2 });
    const porticoLamp = new THREE.MeshStandardMaterial({ color: 0xffc27b, roughness: 0.26, metalness: 0.08, emissive: 0x7a391b, emissiveIntensity: 1.25 });
    const addPorticoPart = (name: string, geometry: THREE.BufferGeometry, material: THREE.Material, position: [number, number, number], rotation: [number, number, number] = [0, 0, 0]) => {
      const part = new THREE.Mesh(geometry, material);
      part.name = name;
      part.position.set(...position);
      part.rotation.set(...rotation);
      part.castShadow = fullQualityPresentation;
      part.receiveShadow = true;
      part.userData.visualLayer = "street-canyon-facade-massing";
      portico.add(part);
      return part;
    };
    for (const side of [-1, 1]) {
      const x = side * 8.7;
      addPorticoPart(`arrival_portico_concrete_footing_${side < 0 ? "left" : "right"}`, new RoundedBoxGeometry(2.4, 0.34, 2.6, 4, 0.08), porticoConcrete, [x, 0.17, 0]);
      addPorticoPart(`arrival_portico_primary_pier_${side < 0 ? "left" : "right"}`, new RoundedBoxGeometry(0.82, 8.7, 0.9, 6, 0.08), porticoSteel, [x, 4.65, 0]);
      addPorticoPart(`arrival_portico_pier_cap_${side < 0 ? "left" : "right"}`, new RoundedBoxGeometry(1.16, 0.24, 1.22, 4, 0.05), porticoEdge, [x, 9.12, 0]);
      addPorticoPart(`arrival_portico_service_kiosk_${side < 0 ? "left" : "right"}`, new RoundedBoxGeometry(2.9, 2.55, 1.55, 6, 0.12), side < 0 ? porticoConcrete : porticoEdge, [x, 1.45, 0.18]);
      addPorticoPart(`arrival_portico_kiosk_glazing_${side < 0 ? "left" : "right"}`, new RoundedBoxGeometry(2.08, 0.68, 0.06, 5, 0.02), porticoSign, [x, 2.03, 0.98]);
      addPorticoPart(`arrival_portico_kiosk_safety_band_${side < 0 ? "left" : "right"}`, new RoundedBoxGeometry(2.46, 0.16, 0.08, 4, 0.02), porticoSafety, [x, 0.96, 0.98]);
      addPorticoPart(`arrival_portico_lamp_${side < 0 ? "left" : "right"}`, new RoundedBoxGeometry(0.54, 0.16, 0.18, 4, 0.03), porticoLamp, [x, 7.92, 0.54]);
      const lamp = new THREE.PointLight(0xffa467, 0.82, 10, 2);
      lamp.position.set(x, 7.7, 0.44);
      portico.add(lamp);
    }
    addPorticoPart("arrival_portico_top_girder", new RoundedBoxGeometry(18.8, 0.74, 1.0, 6, 0.08), porticoSteel, [0, 8.94, 0]);
    addPorticoPart("arrival_portico_top_girder_shadow_band", new THREE.BoxGeometry(18.2, 0.18, 1.16), porticoEdge, [0, 8.46, 0.08]);
    addPorticoPart("arrival_portico_canopy", new RoundedBoxGeometry(20.2, 0.22, 3.8, 6, 0.06), porticoEdge, [0, 10.05, 0.24]);
    addPorticoPart("arrival_portico_canopy_safety_front", new THREE.BoxGeometry(19.2, 0.16, 0.12), porticoSafety, [0, 9.88, 2.05]);
    addPorticoPart("arrival_portico_destination_sign_back", new RoundedBoxGeometry(10.8, 1.72, 0.14, 5, 0.04), porticoSign, [0, 7.75, 0.63]);
    for (const x of [-4.1, 0, 4.1]) addPorticoPart(`arrival_portico_destination_sign_marker_${x}`, new THREE.BoxGeometry(1.72, 0.18, 0.08), porticoSafety, [x, 7.75, 0.74]);
    addPorticoPart("arrival_portico_sign_upper_trim", new THREE.BoxGeometry(11.4, 0.1, 0.18), porticoEdge, [0, 8.68, 0.72]);
    addPorticoPart("arrival_portico_surveillance_bracket", new THREE.BoxGeometry(1.5, 0.12, 0.12), porticoSteel, [6.35, 7.34, 0.58], [0, 0, -0.08]);
    addPorticoPart("arrival_portico_surveillance_housing", new RoundedBoxGeometry(0.44, 0.32, 0.62, 5, 0.08), porticoSteel, [5.72, 7.52, 0.5], [0, -0.12, 0]);
    addPorticoPart("arrival_portico_surveillance_lens", new THREE.CylinderGeometry(0.11, 0.11, 0.08, 16), porticoLamp, [5.34, 7.52, 0.51], [0, Math.PI / 2, 0]);

  }

  if (urlParams.get("arrivalBridge") !== "base") {
    const serviceBridge = new THREE.Group();
    serviceBridge.name = "density_arrival_service_pipe_rack_bridge";
    serviceBridge.position.set(-365, 0, 195);
    serviceBridge.rotation.y = roadHeading + Math.PI / 2;
    serviceBridge.userData.visualLayer = "street-canyon-facade-massing";
    serviceBridge.userData.presentationModule = "elevated arrival service pipe rack";
    serviceBridge.userData.authoringRecord = {
      type: "detail",
      id: "density_arrival_service_pipe_rack_bridge",
      displayName: "Arrival Elevated Service Pipe Rack",
      role: "Presentation-only overhead utility bridge that reinforces the controlled industrial arrival corridor without occupying the drivable lane or changing connector topology.",
      runtimeNote: "Two supported steel uprights, raised maintenance catwalk, twin service pipes, warning sign, and restrained practical light; removable with arrivalBridge=base.",
    };
    root.add(serviceBridge);
    const bridgeSteel = new THREE.MeshStandardMaterial({ color: 0x293638, roughness: 0.74, metalness: 0.72 });
    const bridgeEdge = new THREE.MeshStandardMaterial({ color: 0x5b625d, roughness: 0.82, metalness: 0.42 });
    const bridgePipe = new THREE.MeshStandardMaterial({ color: 0x6c553f, roughness: 0.86, metalness: 0.34 });
    const bridgeSafety = new THREE.MeshStandardMaterial({ color: 0xb57448, roughness: 0.72, metalness: 0.16, emissive: 0x2a1007, emissiveIntensity: 0.08 });
    const bridgeLamp = new THREE.MeshStandardMaterial({ color: 0xffc47b, roughness: 0.26, metalness: 0.08, emissive: 0x7a391b, emissiveIntensity: 1.15 });
    const addBridgePart = (name: string, geometry: THREE.BufferGeometry, material: THREE.Material, position: [number, number, number], rotation: [number, number, number] = [0, 0, 0]) => {
      const part = new THREE.Mesh(geometry, material);
      part.name = name;
      part.position.set(...position);
      part.rotation.set(...rotation);
      part.castShadow = fullQualityPresentation;
      part.receiveShadow = true;
      part.userData.visualLayer = "street-canyon-facade-massing";
      serviceBridge.add(part);
      return part;
    };
    for (const x of [-8.4, 8.4]) {
      addBridgePart(`arrival_service_pipe_rack_upright_${x < 0 ? "left" : "right"}`, new RoundedBoxGeometry(0.48, 7.1, 0.58, 6, 0.08), bridgeSteel, [x, 3.55, 0]);
      addBridgePart(`arrival_service_pipe_rack_footing_${x < 0 ? "left" : "right"}`, new RoundedBoxGeometry(1.5, 0.28, 1.3, 5, 0.06), bridgeEdge, [x, 0.14, 0]);
      addBridgePart(`arrival_service_pipe_rack_upright_safety_${x < 0 ? "left" : "right"}`, new THREE.BoxGeometry(0.56, 0.14, 0.08), bridgeSafety, [x, 1.12, 0.34]);
    }
    addBridgePart("arrival_service_pipe_rack_header", new RoundedBoxGeometry(18.1, 0.42, 0.72, 6, 0.08), bridgeSteel, [0, 7.18, 0]);
    addBridgePart("arrival_service_pipe_rack_header_shadow_band", new THREE.BoxGeometry(17.6, 0.14, 0.82), bridgeEdge, [0, 6.77, 0.05]);
    addBridgePart("arrival_service_pipe_rack_catwalk", new THREE.BoxGeometry(14.8, 0.16, 1.28), bridgeEdge, [0, 6.15, 0.1]);
    addBridgePart("arrival_service_pipe_rack_catwalk_safety_front", new THREE.BoxGeometry(14.8, 0.12, 0.1), bridgeSafety, [0, 6.58, 0.72]);
    for (const x of [-6.8, -3.4, 0, 3.4, 6.8]) addBridgePart(`arrival_service_pipe_rack_catwalk_post_${x}`, new THREE.BoxGeometry(0.1, 0.56, 0.1), bridgeSteel, [x, 6.42, 0.58]);
    for (const [index, y] of [6.82, 7.42].entries()) {
      addBridgePart(`arrival_service_pipe_rack_pipe_${index}`, new THREE.CylinderGeometry(0.14 + index * 0.03, 0.14 + index * 0.03, 15.5, 10), bridgePipe, [0, y, 0.28], [0, 0, Math.PI / 2]);
      for (const x of [-5.8, 0, 5.8]) addBridgePart(`arrival_service_pipe_rack_pipe_support_${index}_${x}`, new THREE.BoxGeometry(0.12, 0.7, 0.12), bridgeSteel, [x, y - 0.36, 0.28]);
    }
    const bridgeSign = addBridgePart("arrival_service_pipe_rack_service_sign", new RoundedBoxGeometry(4.9, 0.78, 0.1, 5, 0.04), bridgeSteel, [0, 5.22, 0.64]);
    bridgeSign.userData.visualLayer = "street-canyon-signage";
    addBridgePart("arrival_service_pipe_rack_service_sign_band", new THREE.BoxGeometry(4.5, 0.1, 0.06), bridgeSafety, [0, 5.0, 0.7]);
    addBridgePart("arrival_service_pipe_rack_lamp", new RoundedBoxGeometry(0.7, 0.12, 0.18, 4, 0.03), bridgeLamp, [-3.8, 6.62, 0.7]);
    const bridgeLight = new THREE.PointLight(0xffa467, 0.62, 9, 2);
    bridgeLight.position.set(-3.8, 6.4, 0.52);
    serviceBridge.add(bridgeLight);
  }

  if (urlParams.get("arrivalStack") !== "base") {
    const processStackGroup = new THREE.Group();
    processStackGroup.name = "density_arrival_distant_process_stack_cluster";
    processStackGroup.userData.visualLayer = "street-canyon-facade-massing";
    processStackGroup.userData.presentationModule = "distant plant process stack cluster";
    processStackGroup.userData.authoringRecord = {
      type: "detail",
      id: "density_arrival_distant_process_stack_cluster",
      displayName: "Arrival Distant Process Stack Cluster",
      role: "Presentation-only distant process equipment that anchors the arrival sightline to a working industrial campus without becoming a building mass, objective, cover anchor, or route obstruction.",
      runtimeNote: "Two grounded steel/concrete exhaust stacks, access cage, maintenance platform, warning bands, and short service duct; removable with arrivalStack=base.",
    };
    root.add(processStackGroup);
    const stackConcrete = new THREE.MeshStandardMaterial({ color: 0x666d68, roughness: 0.92, metalness: 0.12 });
    const stackSteel = new THREE.MeshStandardMaterial({ color: 0x29383a, roughness: 0.78, metalness: 0.7 });
    const stackWeathered = new THREE.MeshStandardMaterial({ color: 0x4d5956, roughness: 0.86, metalness: 0.46 });
    const stackSafety = new THREE.MeshStandardMaterial({ color: 0xb77a4e, roughness: 0.74, metalness: 0.12, emissive: 0x210b06, emissiveIntensity: 0.08 });
    const stackLamp = new THREE.MeshStandardMaterial({ color: 0xffbf74, roughness: 0.28, metalness: 0.08, emissive: 0x743214, emissiveIntensity: 1.0 });
    const addStackPart = (namePart: string, geometry: THREE.BufferGeometry, material: THREE.Material, position: [number, number, number], rotation: [number, number, number] = [0, 0, 0]) => {
      const part = new THREE.Mesh(geometry, material);
      part.name = namePart;
      part.position.set(...position);
      part.rotation.set(...rotation);
      part.castShadow = fullQualityPresentation;
      part.receiveShadow = true;
      part.userData.visualLayer = "street-canyon-facade-massing";
      processStackGroup.add(part);
      return part;
    };
    const addStackBand = (namePart: string, radius: number, y: number, x: number, z: number) => addStackPart(namePart, new THREE.TorusGeometry(radius, 0.08, 8, 20), stackSafety, [x, y, z], [Math.PI / 2, 0, 0]);
    const primaryStack = { x: -318.0, z: 159.5 };
    const secondaryStack = { x: -305.0, z: 164.0 };
    for (const [index, stack] of [primaryStack, secondaryStack].entries()) {
      const height = index === 0 ? 20.5 : 15.4;
      const radius = index === 0 ? 2.15 : 1.42;
      addStackPart(`arrival_process_stack_${index}_plinth`, new RoundedBoxGeometry(radius * 2.25, 0.62, radius * 2.25, 5, 0.08), stackConcrete, [stack.x, 0.31, stack.z]);
      addStackPart(`arrival_process_stack_${index}_shaft`, new THREE.CylinderGeometry(radius, radius * 1.08, height, 18), index === 0 ? stackWeathered : stackSteel, [stack.x, height / 2 + 0.62, stack.z]);
      addStackPart(`arrival_process_stack_${index}_cap`, new THREE.CylinderGeometry(radius * 1.22, radius * 1.16, 0.36, 18), stackSteel, [stack.x, height + 0.82, stack.z]);
      addStackBand(`arrival_process_stack_${index}_warning_band_low`, radius * 1.02, 6.9, stack.x, stack.z);
      if (index === 0) addStackBand(`arrival_process_stack_${index}_warning_band_high`, radius * 1.02, 14.1, stack.x, stack.z);
    }
    for (const y of [4.2, 8.2, 12.2, 16.2]) {
      addStackPart(`arrival_process_stack_primary_cage_ring_${y}`, new THREE.TorusGeometry(2.46, 0.06, 8, 20), stackSteel, [primaryStack.x, y, primaryStack.z], [Math.PI / 2, 0, 0]);
    }
    for (const angle of [0, Math.PI / 2, Math.PI, Math.PI * 1.5]) {
      const x = primaryStack.x + Math.cos(angle) * 2.42;
      const z = primaryStack.z + Math.sin(angle) * 2.42;
      addStackPart(`arrival_process_stack_primary_cage_post_${angle}`, new THREE.BoxGeometry(0.08, 15.3, 0.08), stackSteel, [x, 9.15, z]);
    }
    addStackPart("arrival_process_stack_primary_platform", new THREE.BoxGeometry(5.5, 0.16, 5.5), stackSteel, [primaryStack.x, 12.4, primaryStack.z]);
    addStackPart("arrival_process_stack_primary_platform_rail", new THREE.TorusGeometry(2.55, 0.065, 8, 24), stackSteel, [primaryStack.x, 13.15, primaryStack.z], [Math.PI / 2, 0, 0]);
    addStackPart("arrival_process_stack_primary_ladder", new THREE.BoxGeometry(0.16, 14.2, 0.14), stackSteel, [primaryStack.x + 2.32, 9.0, primaryStack.z]);
    for (const y of [4.2, 6.0, 7.8, 9.6, 11.4, 13.2, 15.0]) addStackPart(`arrival_process_stack_primary_ladder_rung_${y}`, new THREE.BoxGeometry(1.1, 0.1, 0.12), stackSteel, [primaryStack.x + 2.32, y, primaryStack.z]);
    addStackPart("arrival_process_stack_service_duct", new THREE.CylinderGeometry(0.52, 0.52, 13.2, 12), stackWeathered, [-311.5, 8.1, 162.3], [0, 0, Math.PI / 2]);
    addStackPart("arrival_process_stack_service_duct_support", new THREE.BoxGeometry(0.16, 6.2, 0.16), stackSteel, [-311.5, 3.1, 162.3]);
    addStackPart("arrival_process_stack_service_lamp", new RoundedBoxGeometry(0.74, 0.14, 0.18, 4, 0.03), stackLamp, [-315.8, 12.9, 157.5]);
    const stackPoint = new THREE.PointLight(0xffa467, 0.42, 10, 2);
    stackPoint.position.set(-315.8, 12.55, 157.8);
    processStackGroup.add(stackPoint);
  }

  const facadeBreakerGroup = new THREE.Group();
  facadeBreakerGroup.name = "density_arrival_facade_silhouette_breakers";
  facadeBreakerGroup.userData.visualLayer = "street-canyon-density";
  densityObjects.push(facadeBreakerGroup);
  root.add(facadeBreakerGroup);
  const breakerSteelMaterial = new THREE.MeshStandardMaterial({ color: 0x263234, roughness: 0.78, metalness: 0.62 });
  const breakerRustMaterial = new THREE.MeshStandardMaterial({ color: 0x80513d, roughness: 0.88, metalness: 0.18 });
  const breakerConcreteMaterial = new THREE.MeshStandardMaterial({ color: 0x6c706b, roughness: 0.96, metalness: 0.04 });
  const addFacadeBreakers = (name: string, center: { x: number; z: number }, width: number, height: number, rotationY: number, frontSignColor: number) => {
    const facade = new THREE.Group();
    facade.name = name;
    facade.position.set(center.x, 0, center.z);
    facade.rotation.y = rotationY;
    facadeBreakerGroup.add(facade);
    if (name.includes("left_near")) {
      const breakerWallMaterial = new THREE.MeshStandardMaterial({ color: 0x4b514e, roughness: 0.88, metalness: 0.28 });
      const breakerWall = new THREE.Mesh(new THREE.BoxGeometry(width * 0.9, height * 0.82, 0.18), breakerWallMaterial);
      breakerWall.name = `${name}_solid_corrugated_wall`;
      breakerWall.position.set(0, height * 0.43, 0.48);
      breakerWall.receiveShadow = true;
      breakerWall.userData.visualLayer = "street-canyon-facade-massing";
      facade.add(breakerWall);
      const breakerRollupMaterial = new THREE.MeshStandardMaterial({ color: 0x202a2b, roughness: 0.74, metalness: 0.5, emissive: 0x080e0f, emissiveIntensity: 0.12 });
      const breakerRollup = new THREE.Mesh(new THREE.BoxGeometry(width * 0.42, height * 0.42, 0.08), breakerRollupMaterial);
      breakerRollup.name = `${name}_recessed_rollup_bay`;
      breakerRollup.position.set(width * 0.1, height * 0.28, 0.6);
      facade.add(breakerRollup);
      const breakerRollupHeader = new THREE.Mesh(new THREE.BoxGeometry(width * 0.46, 0.16, 0.18), breakerSteelMaterial);
      breakerRollupHeader.position.set(width * 0.1, height * 0.51, 0.66);
      facade.add(breakerRollupHeader);
      const breakerWallCap = new THREE.Mesh(new THREE.BoxGeometry(width * 0.96, 0.18, 0.66), breakerSteelMaterial);
      breakerWallCap.position.set(0, height * 0.86, 0.5);
      breakerWallCap.castShadow = fullQualityPresentation;
      facade.add(breakerWallCap);
      for (const x of [-width * 0.43, width * 0.43]) {
        const pilaster = new THREE.Mesh(new THREE.BoxGeometry(0.34, height * 0.76, 0.42), breakerSteelMaterial);
        pilaster.position.set(x, height * 0.42, 0.62);
        pilaster.castShadow = fullQualityPresentation;
        facade.add(pilaster);
        const basePlate = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.1, 0.72), breakerConcreteMaterial);
        basePlate.position.set(x, 0.08, 0.62);
        facade.add(basePlate);
      }
      const heavyHeader = new THREE.Mesh(new THREE.BoxGeometry(width * 0.9, 0.3, 0.5), breakerSteelMaterial);
      heavyHeader.position.set(0, height * 0.77, 0.66);
      heavyHeader.castShadow = fullQualityPresentation;
      facade.add(heavyHeader);
      for (const side of [-1, 1]) {
        const brace = new THREE.Mesh(new THREE.BoxGeometry(width * 0.46, 0.14, 0.14), breakerRustMaterial);
        brace.position.set(side * width * 0.19, height * 0.63, 0.8);
        brace.rotation.z = side * 0.18;
        facade.add(brace);
      }
    }
    const frontZ = 1.02;
    for (const x of [-width * 0.34, width * 0.08, width * 0.38]) {
      const downpipe = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, height * 0.84, 8), breakerSteelMaterial);
      downpipe.position.set(x, height * 0.43, frontZ);
      downpipe.castShadow = fullQualityPresentation;
      facade.add(downpipe);
      const outlet = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.12, 0.78), breakerSteelMaterial);
      outlet.position.set(x, 1.12, frontZ + 0.26);
      facade.add(outlet);
    }
    for (const x of [-width * 0.24, width * 0.24]) {
      const acUnit = new THREE.Mesh(new RoundedBoxGeometry(1.9, 1.1, 0.9, 2, 0.12), breakerConcreteMaterial);
      acUnit.position.set(x, Math.min(height - 1.4, 7.6), frontZ + 0.58);
      acUnit.castShadow = fullQualityPresentation;
      facade.add(acUnit);
      const acGrille = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.52, 0.06), breakerSteelMaterial);
      acGrille.position.set(x, acUnit.position.y, frontZ + 1.04);
      facade.add(acGrille);
    }
    for (const y of [4.65, 9.3]) {
      const canopy = new THREE.Mesh(new THREE.BoxGeometry(width * 0.3, 0.14, 1.3), breakerRustMaterial);
      canopy.position.set(width * 0.12, y, frontZ + 0.64);
      canopy.rotation.x = -0.1;
      canopy.castShadow = fullQualityPresentation;
      facade.add(canopy);
    }
    const sign = new THREE.Mesh(new THREE.BoxGeometry(0.14, 1.18, 2.8), new THREE.MeshStandardMaterial({ color: frontSignColor, roughness: 0.74, metalness: 0.2, emissive: 0x1b0e08, emissiveIntensity: 0.12 }));
    sign.position.set(-width * 0.08, 5.35, frontZ + 0.82);
    sign.rotation.y = Math.PI / 2;
    sign.castShadow = fullQualityPresentation;
    facade.add(sign);
    const signCap = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.12, 3.0), breakerSteelMaterial);
    signCap.position.set(sign.position.x, 5.98, sign.position.z);
    signCap.rotation.y = Math.PI / 2;
    facade.add(signCap);
  };
  addFacadeBreakers("density_arrival_left_near_breakers", { x: -398, z: 220 }, 16, 8, roadHeading, 0xa45e3d);
  addFacadeBreakers("density_arrival_right_breakers", { x: -354, z: 211 }, 32, 15, roadHeading + Math.PI, 0x6d7e78);
  addFacadeBreakers("density_arrival_right_setback_breakers", { x: -342, z: 192 }, 30, 19, roadHeading + Math.PI, 0x94654c);

  const midgroundClusterGroup = new THREE.Group();
  midgroundClusterGroup.name = "density_arrival_midground_service_clusters";
  midgroundClusterGroup.userData.visualLayer = "street-story-density";
  densityObjects.push(midgroundClusterGroup);
  root.add(midgroundClusterGroup);
  const clusterCrateMaterial = new THREE.MeshStandardMaterial({ color: 0x735843, roughness: 0.92, metalness: 0.04 });
  const clusterSteelMaterial = new THREE.MeshStandardMaterial({ color: 0x394648, roughness: 0.82, metalness: 0.48 });
  const clusterSafetyMaterial = new THREE.MeshStandardMaterial({ color: 0xb46b40, roughness: 0.78, metalness: 0.14 });
  const addServiceCluster = (name: string, position: { x: number; z: number }, rotationY: number, mirror = false) => {
    const cluster = new THREE.Group();
    cluster.name = name;
    cluster.position.set(position.x, 0, position.z);
    cluster.rotation.y = rotationY;
    midgroundClusterGroup.add(cluster);
    const pallet = new THREE.Mesh(new THREE.BoxGeometry(3.1, 0.18, 1.7), clusterCrateMaterial);
    pallet.position.y = 0.16;
    cluster.add(pallet);
    for (const [x, y, z, scale] of [[-0.9, 0.7, -0.35, 1], [0.18, 0.62, -0.28, 0.86], [0.84, 1.12, -0.22, 0.72]] as Array<[number, number, number, number]>) {
      const crate = new THREE.Mesh(new RoundedBoxGeometry(0.92 * scale, 0.72 * scale, 0.72 * scale, 2, 0.08), clusterCrateMaterial);
      crate.position.set(x, y, z);
      crate.castShadow = fullQualityPresentation;
      cluster.add(crate);
    }
    for (const x of [1.58, 2.04]) {
      const drum = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.92, 12), clusterSteelMaterial);
      drum.position.set(mirror ? -x : x, 0.58, 0.28);
      drum.castShadow = fullQualityPresentation;
      cluster.add(drum);
      const band = new THREE.Mesh(new THREE.CylinderGeometry(0.44, 0.44, 0.08, 12), clusterSafetyMaterial);
      band.position.set(drum.position.x, 0.73, drum.position.z);
      cluster.add(band);
    }
    const cone = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.72, 8), clusterSafetyMaterial);
    cone.position.set(mirror ? -1.35 : 1.32, 0.36, 1.06);
    cone.castShadow = fullQualityPresentation;
    cluster.add(cone);
    addArrivalContactShadow(cluster, `${name}_contact_shadow`, { x: 0, z: 0 }, 4.4, 2.6, 0, 0.3);
  };
  addServiceCluster("density_arrival_midground_cluster_left", { x: -340, z: 184 }, roadHeading + 0.22);
  addServiceCluster("density_arrival_midground_cluster_right", { x: -289, z: 185 }, roadHeading - 0.18, true);
  addServiceCluster("density_arrival_midground_cluster_approach", { x: -378, z: 209 }, roadHeading - 0.1);

  const streetLampGroup = new THREE.Group();
  streetLampGroup.name = "density_arrival_street_practical_lamps";
  streetLampGroup.userData.visualLayer = "street-canyon";
  densityObjects.push(streetLampGroup);
  root.add(streetLampGroup);
  const streetLampPoleMaterial = new THREE.MeshStandardMaterial({ color: 0x303b3d, roughness: 0.76, metalness: 0.64 });
  const streetLampFixtureMaterial = new THREE.MeshStandardMaterial({ color: 0xffb46d, roughness: 0.28, metalness: 0.12, emissive: 0x6f3215, emissiveIntensity: 1.7 });
  const streetLampPoolMaterial = new THREE.MeshStandardMaterial({ color: 0xffa267, roughness: 0.56, metalness: 0.02, emissive: 0x8a3d1e, emissiveIntensity: 0.58, transparent: true, opacity: 0.24, depthWrite: false, blending: THREE.AdditiveBlending });
  const addArrivalStreetLamp = (name: string, position: { x: number; z: number }, height: number, armLength: number) => {
    const lampGroup = new THREE.Group();
    lampGroup.name = name;
    lampGroup.position.set(position.x, 0, position.z);
    lampGroup.rotation.y = roadHeading;
    streetLampGroup.add(lampGroup);
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.16, height, 10), streetLampPoleMaterial);
    pole.position.y = height / 2;
    pole.castShadow = true;
    lampGroup.add(pole);
    const arm = new THREE.Mesh(new THREE.BoxGeometry(armLength, 0.12, 0.12), streetLampPoleMaterial);
    arm.position.set(armLength * 0.5, height - 0.18, 0);
    lampGroup.add(arm);
    const fixture = new THREE.Mesh(new THREE.BoxGeometry(0.74, 0.16, 0.38), streetLampFixtureMaterial);
    fixture.position.set(armLength, height - 0.28, 0);
    lampGroup.add(fixture);
    const glow = new THREE.PointLight(0xffa55f, 26, 42, 2);
    glow.position.set(armLength, height - 0.48, 0);
    lampGroup.add(glow);
    const groundSpot = new THREE.SpotLight(0xffa55f, 46, 38, Math.PI * 0.34, 0.68, 2);
    groundSpot.position.set(armLength, height - 0.48, 0);
    groundSpot.target.position.set(armLength * 0.55, 0.14, 0.62);
    groundSpot.castShadow = false;
    lampGroup.add(groundSpot.target);
    lampGroup.add(groundSpot);
    addPracticalGlowSprite(lampGroup, { x: armLength, y: height - 0.48, z: 0 }, 0xffa55f, 4.6, 0.3);
    const pool = new THREE.Mesh(new THREE.CircleGeometry(1, 32), streetLampPoolMaterial.clone());
    pool.scale.set(3.5, 1.42, 1);
    pool.rotation.x = -Math.PI / 2;
    pool.position.set(armLength * 0.55, 0.875, 0.62);
    pool.renderOrder = 5;
    pool.userData.visualCue = `${name}_ground_pool`;
    pool.userData.environmentMaterial = "presentation warm street-lamp pool on elevated arrival road";
    lampGroup.add(pool);
  };
  addArrivalStreetLamp("density_arrival_street_lamp_near", { x: -379, z: 205 }, 8.8, 2.8);
  addArrivalStreetLamp("density_arrival_street_lamp_mid", { x: -348, z: 190 }, 8.1, 2.4);
  const leftWalkGroup = new THREE.Group();
  leftWalkGroup.name = "density_arrival_left_sidewalk_edge";
  leftWalkGroup.position.set(-390, 0, 216);
  leftWalkGroup.rotation.y = roadHeading;
  leftWalkGroup.userData.visualLayer = "street-canyon";
  densityObjects.push(leftWalkGroup);
  root.add(leftWalkGroup);
  const walkConcreteMaterial = new THREE.MeshStandardMaterial({ color: 0x8b8179, roughness: 0.96, metalness: 0.03 });
  const walkEdgeMaterial = new THREE.MeshStandardMaterial({ color: 0x424b4b, roughness: 0.86, metalness: 0.34 });
  const walkSlab = new THREE.Mesh(new THREE.BoxGeometry(38, 0.16, 3.6), walkConcreteMaterial);
  walkSlab.position.set(0, 0.08, -1.4);
  walkSlab.receiveShadow = true;
  leftWalkGroup.add(walkSlab);
  const walkCurb = new THREE.Mesh(new THREE.BoxGeometry(38, 0.28, 0.32), walkEdgeMaterial);
  walkCurb.position.set(0, 0.2, 0.62);
  leftWalkGroup.add(walkCurb);
  const walkGutter = new THREE.Mesh(new THREE.BoxGeometry(38, 0.045, 0.42), new THREE.MeshStandardMaterial({ color: 0x2d3536, roughness: 0.98, metalness: 0.08 }));
  walkGutter.position.set(0, 0.355, 0.8);
  leftWalkGroup.add(walkGutter);
  for (const x of [-14.2, -4.7, 4.8, 14.3]) {
    const seam = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.025, 3.35), new THREE.MeshStandardMaterial({ color: 0x5f5d59, roughness: 0.98, metalness: 0.01, transparent: true, opacity: 0.55, depthWrite: false }));
    seam.position.set(x, 0.18, -1.4);
    leftWalkGroup.add(seam);
    const drain = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.04, 0.22), walkEdgeMaterial);
    drain.position.set(x, 0.39, 0.76);
    leftWalkGroup.add(drain);
  }
  const leftBollardMaterial = new THREE.MeshStandardMaterial({ color: 0x253032, roughness: 0.64, metalness: 0.62 });
  const leftSafetyMaterial = new THREE.MeshStandardMaterial({ color: 0xd39a5c, roughness: 0.64, metalness: 0.1 });
  for (const x of [-15, -5, 5, 15]) {
    const bollard = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.18, 1.05, 10), leftBollardMaterial);
    bollard.position.set(x, 0.72, 0.22);
    leftWalkGroup.add(bollard);
    const band = new THREE.Mesh(new THREE.CylinderGeometry(0.145, 0.145, 0.12, 10), leftSafetyMaterial);
    band.position.set(x, 0.9, 0.22);
    leftWalkGroup.add(band);
  }
  const wallFixture = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.18, 0.3), new THREE.MeshStandardMaterial({ color: 0xffb46f, roughness: 0.32, metalness: 0.08, emissive: 0x6f3214, emissiveIntensity: 0.75 }));
  wallFixture.position.set(-12, 5.4, -3.05);
  leftWalkGroup.add(wallFixture);
  const wallLight = new THREE.PointLight(0xff9b57, 16, 22, 2);
  wallLight.position.set(-12, 4.8, -2.55);
  leftWalkGroup.add(wallLight);

  const apronServiceGroup = new THREE.Group();
  apronServiceGroup.name = "density_arrival_right_apron_service_shed";
  apronServiceGroup.position.set(-335, 0, 230);
  apronServiceGroup.rotation.y = roadHeading + Math.PI;
  apronServiceGroup.userData.visualLayer = "street-canyon";
  densityObjects.push(apronServiceGroup);
  root.add(apronServiceGroup);
  const apronShellMaterial = new THREE.MeshStandardMaterial({ color: 0x6c716a, roughness: 0.9, metalness: 0.2 });
  const apronSteelMaterial = new THREE.MeshStandardMaterial({ color: 0x344144, roughness: 0.72, metalness: 0.62 });
  const apronDoorMaterial = new THREE.MeshStandardMaterial({ color: 0x263438, roughness: 0.5, metalness: 0.48, emissive: 0x061013, emissiveIntensity: 0.12 });
  const apronSafetyMaterial = new THREE.MeshStandardMaterial({ color: 0xc17b48, roughness: 0.74, metalness: 0.1 });
  const apronClerestoryMaterial = new THREE.MeshStandardMaterial({ color: 0x9aa7a5, roughness: 0.38, metalness: 0.34, emissive: 0x2c3e40, emissiveIntensity: 0.18 });
  const apronUpperBandMaterial = new THREE.MeshStandardMaterial({ color: 0x3e4543, roughness: 0.82, metalness: 0.42 });
  const apronOfficeGlassMaterial = new THREE.MeshStandardMaterial({ color: 0x6f8790, roughness: 0.22, metalness: 0.24, emissive: 0x172c31, emissiveIntensity: 0.34 });
  const apronOfficeWarmGlassMaterial = new THREE.MeshStandardMaterial({ color: 0xb08063, roughness: 0.3, metalness: 0.16, emissive: 0x5a2b1b, emissiveIntensity: 0.72 });
  const apronLampMaterial = new THREE.MeshStandardMaterial({ color: 0xffc080, roughness: 0.3, metalness: 0.08, emissive: 0x8a3d18, emissiveIntensity: 1.15 });
  const apronInteriorMaterial = new THREE.MeshStandardMaterial({ color: 0x7a503b, roughness: 0.72, metalness: 0.08, emissive: 0x5a2616, emissiveIntensity: 1.28 });
  const apronInteriorAltMaterial = new THREE.MeshStandardMaterial({ color: 0x8a6c4f, roughness: 0.74, metalness: 0.06, emissive: 0x62351c, emissiveIntensity: 1.05 });
  const apronConcreteMaterial = new THREE.MeshStandardMaterial({ color: 0x726d66, roughness: 0.98, metalness: 0.02 });
  const apronJointMaterial = new THREE.MeshStandardMaterial({ color: 0x273231, roughness: 0.98, metalness: 0.04 });
  const apronHardstand = new THREE.Mesh(new THREE.BoxGeometry(53.5, 0.1, 18.2), apronConcreteMaterial);
  apronHardstand.position.set(0, 0.05, 2.35);
  apronHardstand.receiveShadow = true;
  apronServiceGroup.add(apronHardstand);
  for (const x of [-22.1, -8.1, 5.9, 19.9]) {
    const joint = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.028, 17.3), apronJointMaterial);
    joint.position.set(x, 0.17, 2.35);
    apronServiceGroup.add(joint);
  }
  for (const z of [-5.7, 0.1, 5.9]) {
    const joint = new THREE.Mesh(new THREE.BoxGeometry(52.8, 0.028, 0.07), apronJointMaterial);
    joint.position.set(0, 0.17, z);
    apronServiceGroup.add(joint);
  }
  const apronDrain = new THREE.Mesh(new THREE.BoxGeometry(52.4, 0.06, 0.34), new THREE.MeshStandardMaterial({ color: 0x293333, roughness: 0.9, metalness: 0.48 }));
  apronDrain.position.set(0, 0.16, 9.35);
  apronServiceGroup.add(apronDrain);
  const apronWearMaterial = new THREE.MeshStandardMaterial({ color: 0x3b4140, roughness: 1, metalness: 0.02, transparent: true, opacity: 0.38, depthWrite: false });
  const apronTyreWearMaterial = new THREE.MeshStandardMaterial({ color: 0x2d3737, roughness: 1, metalness: 0.02, transparent: true, opacity: 0.34, depthWrite: false });
  const apronPatchMaterial = new THREE.MeshStandardMaterial({ color: 0x5a5b58, roughness: 1, metalness: 0.02 });
  for (const [x, z, sx, sz, rotation] of [[-17.0, -4.1, 5.6, 1.15, -0.04], [-4.2, 1.2, 4.8, 0.86, 0.06], [10.4, -3.2, 6.2, 1.0, -0.08]] as Array<[number, number, number, number, number]>) {
    const patch = new THREE.Mesh(new THREE.BoxGeometry(sx, 0.024, sz), apronPatchMaterial);
    patch.position.set(x, 0.16, z);
    patch.rotation.y = rotation;
    apronServiceGroup.add(patch);
  }
  const trenchMaterial = new THREE.MeshStandardMaterial({ color: 0x242e2f, roughness: 0.86, metalness: 0.62 });
  const trench = new THREE.Mesh(new THREE.BoxGeometry(8.4, 0.06, 0.72), trenchMaterial);
  trench.position.set(-3.6, 0.2, -5.0);
  apronServiceGroup.add(trench);
  const trenchBars = new THREE.InstancedMesh(new THREE.BoxGeometry(0.08, 0.08, 0.86), apronJointMaterial, 12);
  const trenchDummy = new THREE.Object3D();
  for (let index = 0; index < 12; index += 1) {
    trenchDummy.position.set(-7.1 + index * 0.64, 0.25, -5.0);
    trenchDummy.rotation.set(0, 0, 0);
    trenchDummy.updateMatrix();
    trenchBars.setMatrixAt(index, trenchDummy.matrix);
  }
  trenchBars.instanceMatrix.needsUpdate = true;
  apronServiceGroup.add(trenchBars);
  for (const x of [-18.5, -14.8, 1.8, 5.5]) {
    const tyreBand = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.022, 8.6), apronTyreWearMaterial);
    tyreBand.position.set(x, 0.18, -1.2);
    tyreBand.rotation.y = -0.04;
    apronServiceGroup.add(tyreBand);
  }
  const apronSafetyEdgeMaterial = new THREE.MeshStandardMaterial({ color: 0xb07b4c, roughness: 0.82, metalness: 0.12, transparent: true, opacity: 0.74 });
  const apronSafetyEdge = new THREE.Mesh(new THREE.BoxGeometry(46.5, 0.035, 0.18), apronSafetyEdgeMaterial);
  apronSafetyEdge.position.set(0, 0.18, -6.15);
  apronServiceGroup.add(apronSafetyEdge);
  for (const [x, z, sx, sz, rotation] of [[-12.5, -2.7, 5.6, 1.05, -0.12], [2.5, 3.1, 7.4, 1.2, 0.08], [17.2, -1.0, 4.6, 0.82, -0.2]] as Array<[number, number, number, number, number]>) {
    const wear = new THREE.Mesh(new THREE.CircleGeometry(1, 28), apronWearMaterial);
    wear.scale.set(sx, sz, 1);
    wear.rotation.x = -Math.PI / 2;
    wear.rotation.z = rotation;
    wear.position.set(x, 0.17, z);
    apronServiceGroup.add(wear);
  }
  const drumMaterial = new THREE.MeshStandardMaterial({ color: 0x68736f, roughness: 0.78, metalness: 0.5 });
  const drumBandMaterial = new THREE.MeshStandardMaterial({ color: 0xb8794d, roughness: 0.72, metalness: 0.16 });
  for (const [x, z, tint] of [[13.2, -2.9, 0x68736f], [16.0, -2.4, 0x736453]] as Array<[number, number, number]>) {
    const drumBody = new THREE.Mesh(new THREE.CylinderGeometry(1.0, 1.0, 1.15, 16), drumMaterial.clone());
    drumBody.name = `density_arrival_right_apron_drum_body_${x}`;
    (drumBody.material as THREE.MeshStandardMaterial).color.setHex(tint);
    drumBody.rotation.z = Math.PI / 2;
    drumBody.position.set(x, 1.05, z);
    drumBody.castShadow = true;
    apronServiceGroup.add(drumBody);
    const band = new THREE.Mesh(new THREE.CylinderGeometry(1.04, 1.04, 0.12, 16), drumBandMaterial);
    band.name = `density_arrival_right_apron_drum_band_${x}`;
    band.rotation.z = Math.PI / 2;
    band.position.set(x, 1.05, z - 0.34);
    apronServiceGroup.add(band);
  }
  addArrivalContactShadow(apronServiceGroup, "density_arrival_right_apron_drum_cluster_shadow_a", { x: 13.2, z: -2.9 }, 3.3, 2.4, 0, 0.34);
  addArrivalContactShadow(apronServiceGroup, "density_arrival_right_apron_drum_cluster_shadow_b", { x: 16.0, z: -2.4 }, 3.1, 2.2, 0, 0.3);
  const apronShed = new THREE.Mesh(new THREE.BoxGeometry(52, 8.4, 8.6), apronShellMaterial);
  apronShed.position.y = 4.2;
  apronShed.castShadow = true;
  apronShed.receiveShadow = true;
  apronShed.name = "density_arrival_right_apron_service_shed_shell";
  apronShed.userData.streetFacadeShell = true;
  apronShed.userData.streetFacadeDimensions = { x: 52, y: 8.4, z: 8.6 };
  apronServiceGroup.add(apronShed);
  const shedRibMaterial = new THREE.MeshStandardMaterial({ color: 0x314346, roughness: 0.78, metalness: 0.56 });
  for (let ribIndex = 0; ribIndex < 13; ribIndex += 1) {
    const rib = new THREE.Mesh(new THREE.BoxGeometry(0.14, 7.35, 0.18), shedRibMaterial);
    rib.position.set(-24.0 + ribIndex * 4.0, 4.08, 4.48);
    rib.castShadow = true;
    rib.userData.visualLayer = "street-canyon-facade-massing";
    apronServiceGroup.add(rib);
  }
  const shedLowerFascia = new THREE.Mesh(new THREE.BoxGeometry(49.5, 0.18, 0.24), apronSteelMaterial);
  shedLowerFascia.position.set(0, 0.98, 4.52);
  apronServiceGroup.add(shedLowerFascia);
  const upperBand = new THREE.Mesh(new THREE.BoxGeometry(50.8, 2.55, 0.2), apronUpperBandMaterial);
  upperBand.position.set(0, 6.65, 4.72);
  upperBand.castShadow = true;
  apronServiceGroup.add(upperBand);
  for (let index = 0; index < 6; index += 1) {
    const bayX = -20.8 + index * 8.3;
    const glass = new THREE.Mesh(new THREE.BoxGeometry(6.35, 1.34, 0.075), index === 1 || index === 4 ? apronOfficeWarmGlassMaterial : apronOfficeGlassMaterial);
    glass.position.set(bayX, 6.72, 4.87);
    glass.castShadow = false;
    apronServiceGroup.add(glass);
    const verticalLeft = new THREE.Mesh(new THREE.BoxGeometry(0.16, 1.58, 0.16), apronSteelMaterial);
    verticalLeft.position.set(bayX - 3.28, 6.72, 4.94);
    apronServiceGroup.add(verticalLeft);
    const verticalRight = verticalLeft.clone();
    verticalRight.position.x = bayX + 3.28;
    apronServiceGroup.add(verticalRight);
    const mullion = new THREE.Mesh(new THREE.BoxGeometry(0.13, 1.42, 0.14), apronSteelMaterial);
    mullion.position.set(bayX, 6.72, 4.95);
    apronServiceGroup.add(mullion);
    const sill = new THREE.Mesh(new THREE.BoxGeometry(6.68, 0.12, 0.2), apronSteelMaterial);
    sill.position.set(bayX, 5.87, 4.93);
    apronServiceGroup.add(sill);
    const lintel = sill.clone();
    lintel.position.y = 7.58;
    apronServiceGroup.add(lintel);
  }
  const upperBandBase = new THREE.Mesh(new THREE.BoxGeometry(50.8, 0.18, 0.34), apronSafetyMaterial);
  upperBandBase.position.set(0, 5.35, 4.78);
  apronServiceGroup.add(upperBandBase);
  const signCanvas = document.createElement("canvas");
  signCanvas.width = 1024;
  signCanvas.height = 128;
  const signContext = signCanvas.getContext("2d");
  if (signContext) {
    signContext.fillStyle = "#263033";
    signContext.fillRect(0, 0, signCanvas.width, signCanvas.height);
    signContext.fillStyle = "#a86d46";
    signContext.fillRect(0, 0, 20, signCanvas.height);
    signContext.fillStyle = "#d6c7a8";
    signContext.font = "700 52px Arial, sans-serif";
    signContext.fillText("NORTH YARD  /  ACCESS C-03", 48, 80);
  }
  const facilitySignTexture = new THREE.CanvasTexture(signCanvas);
  facilitySignTexture.colorSpace = THREE.SRGBColorSpace;
  const facilitySignMaterial = new THREE.MeshStandardMaterial({ map: facilitySignTexture, color: 0x9a8e79, roughness: 0.76, metalness: 0.18, emissive: 0x120d09, emissiveIntensity: 0.16 });
  const facilitySign = new THREE.Mesh(new THREE.BoxGeometry(13.8, 0.92, 0.12), facilitySignMaterial);
  facilitySign.name = "density_arrival_right_apron_facility_sign";
  facilitySign.position.set(-10.5, 8.0, 4.96);
  facilitySign.userData.visualLayer = "street-canyon-signage";
  apronServiceGroup.add(facilitySign);
  for (const y of [7.5, 8.5]) {
    const signRail = new THREE.Mesh(new THREE.BoxGeometry(14.1, 0.08, 0.16), apronSteelMaterial);
    signRail.position.set(-10.5, y, 5.02);
    apronServiceGroup.add(signRail);
  }
  for (const x of [-17.2, -3.8]) {
    const warningPlaque = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.72, 0.05), apronSafetyMaterial);
    warningPlaque.position.set(x, 5.78, 4.98);
    warningPlaque.userData.visualLayer = "street-canyon-signage";
    apronServiceGroup.add(warningPlaque);
  }
  const roofCoping = new THREE.Mesh(new THREE.BoxGeometry(52.6, 0.22, 0.52), apronSteelMaterial);
  roofCoping.position.set(0, 8.48, 4.56);
  roofCoping.castShadow = true;
  apronServiceGroup.add(roofCoping);
  const rooftopVentMaterial = new THREE.MeshStandardMaterial({ color: 0x4f5b59, roughness: 0.74, metalness: 0.58 });
  for (const x of [-16.5, 14.5]) {
    const vent = new THREE.Mesh(new THREE.BoxGeometry(1.55, 1.55, 1.35), rooftopVentMaterial);
    vent.position.set(x, 9.22, 4.02);
    vent.castShadow = true;
    apronServiceGroup.add(vent);
    const cap = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.14, 1.68), apronSteelMaterial);
    cap.position.set(x, 10.04, 4.02);
    apronServiceGroup.add(cap);
  }
  const bulkheadHousingMaterial = new THREE.MeshStandardMaterial({ color: 0x20292a, roughness: 0.72, metalness: 0.62 });
  const bulkheadLensMaterial = new THREE.MeshStandardMaterial({ color: 0xffb26f, roughness: 0.3, metalness: 0.08, emissive: 0x733216, emissiveIntensity: 1.35 });
  for (const x of [-17.5, 0, 17.5]) {
    const housing = new THREE.Mesh(new THREE.BoxGeometry(0.82, 0.48, 0.22), bulkheadHousingMaterial);
    housing.position.set(x, 3.84, 4.86);
    apronServiceGroup.add(housing);
    const lens = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.22, 0.06), bulkheadLensMaterial);
    lens.position.set(x, 3.84, 4.99);
    apronServiceGroup.add(lens);
    const point = new THREE.PointLight(0xffa768, 3.2, 7.5, 2);
    point.position.set(x, 3.55, 4.25);
    apronServiceGroup.add(point);
  }
  const apronPlinth = new THREE.Mesh(new THREE.BoxGeometry(50.5, 1.15, 0.26), concretePlinthMaterial);
  apronPlinth.position.set(0, 0.64, 4.48);
  apronServiceGroup.add(apronPlinth);
  const apronBaseBand = new THREE.Mesh(new THREE.BoxGeometry(50.5, 0.24, 0.3), apronSteelMaterial);
  apronBaseBand.position.set(0, 1.28, 4.58);
  apronServiceGroup.add(apronBaseBand);
  for (let index = 0; index < 6; index += 1) {
    const rib = new THREE.Mesh(new THREE.BoxGeometry(0.3, 8.0, 0.34), apronSteelMaterial);
    rib.position.set(-22 + index * 8.8, 4.05, 4.58);
    apronServiceGroup.add(rib);
  }
  for (let index = 0; index < 4; index += 1) {
    const bayX = -18.5 + index * 12.2;
    const door = new THREE.Mesh(new THREE.BoxGeometry(6.5, 4.6, 0.16), apronDoorMaterial);
    door.position.set(bayX, 2.75, 4.58);
    apronServiceGroup.add(door);
    const interior = new THREE.Mesh(new THREE.BoxGeometry(5.92, 3.86, 0.06), (index % 3 === 1 ? apronInteriorAltMaterial : apronInteriorMaterial).clone());
    interior.name = `density_arrival_right_apron_service_bay_interior_${index}`;
    interior.position.set(bayX, 2.72, 4.675);
    interior.castShadow = false;
    interior.userData.visualLayer = "street-canyon-facade-light";
    interior.userData.environmentMaterial = "presentation warm service-bay interior";
    apronServiceGroup.add(interior);
    const bayFrame = new THREE.Mesh(new THREE.BoxGeometry(6.72, 0.14, 0.24), apronSteelMaterial);
    bayFrame.position.set(bayX, 5.02, 4.76);
    apronServiceGroup.add(bayFrame);
    const bayFoot = new THREE.Mesh(new THREE.BoxGeometry(6.72, 0.18, 0.32), apronSteelMaterial);
    bayFoot.position.set(bayX, 0.54, 4.76);
    apronServiceGroup.add(bayFoot);
    const bayFixture = new THREE.Mesh(new THREE.BoxGeometry(1.08, 0.12, 0.18), apronLampMaterial);
    bayFixture.position.set(bayX, 5.35, 4.8);
    apronServiceGroup.add(bayFixture);
    const bayPoint = new THREE.PointLight(0xffad6b, 5.8, 10, 2);
    bayPoint.position.set(bayX, 4.7, 4.2);
    apronServiceGroup.add(bayPoint);
    const baySpot = new THREE.SpotLight(0xffa05a, 15, 20, 0.58, 0.62, 2);
    baySpot.position.set(bayX, 4.85, 5.05);
    baySpot.castShadow = fullQualityPresentation;
    baySpot.shadow.mapSize.set(512, 512);
    baySpot.shadow.bias = -0.0007;
    const bayTarget = new THREE.Object3D();
    bayTarget.position.set(bayX, 0.08, 8.1);
    apronServiceGroup.add(bayTarget);
    baySpot.target = bayTarget;
    apronServiceGroup.add(baySpot);
    const bayPool = new THREE.Mesh(new THREE.CircleGeometry(1, 24), new THREE.MeshBasicMaterial({ map: getArrivalHeadlightPoolTexture(), color: 0xffa05c, transparent: true, opacity: 0.24, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }));
    bayPool.name = `density_arrival_right_apron_service_bay_pool_${index}`;
    bayPool.rotation.x = -Math.PI / 2;
    bayPool.position.set(bayX, 0.22, 7.9);
    bayPool.scale.set(3.4, 1.1, 1);
    bayPool.renderOrder = 4;
    bayPool.userData.visualLayer = "street-canyon-facade-light";
    bayPool.userData.environmentMaterial = "presentation warm loading-bay light pool";
    apronServiceGroup.add(bayPool);
    const header = new THREE.Mesh(new THREE.BoxGeometry(6.9, 0.2, 0.24), apronSafetyMaterial);
    header.position.set(bayX, 5.12, 4.7);
    apronServiceGroup.add(header);
    for (let slat = 0; slat < 4; slat += 1) {
      const slatMesh = new THREE.Mesh(new THREE.BoxGeometry(6.58, 0.08, 0.22), apronSteelMaterial);
      slatMesh.position.set(bayX, 1.1 + slat * 1.0, 4.78);
      apronServiceGroup.add(slatMesh);
    }
  }
  const apronClerestory = new THREE.InstancedMesh(new THREE.BoxGeometry(5.7, 0.82, 0.1), apronClerestoryMaterial, 8);
  const apronDummy = new THREE.Object3D();
  for (let index = 0; index < 8; index += 1) {
    apronDummy.position.set(-21.4 + index * 6.15, 6.55, 4.68);
    apronDummy.rotation.set(0, 0, 0);
    apronDummy.updateMatrix();
    apronClerestory.setMatrixAt(index, apronDummy.matrix);
  }
  apronClerestory.instanceMatrix.needsUpdate = true;
  apronServiceGroup.add(apronClerestory);
  const serviceApronMaterial = new THREE.MeshStandardMaterial({ color: 0x30383a, roughness: 0.97, metalness: 0.04 });
  const serviceApron = new THREE.Mesh(new THREE.BoxGeometry(50.8, 0.08, 6.4), serviceApronMaterial);
  serviceApron.position.set(0, 0.045, 7.45);
  serviceApron.receiveShadow = true;
  serviceApron.userData.environmentMaterial = "ambientCG Road012A / 2K — presentation service apron fallback";
  apronServiceGroup.add(serviceApron);
  arrivalPresentationRoadSurfaces.push({ mesh: serviceApron, length: 50.8, width: 6.4 });
  const apronCurbMaterial = new THREE.MeshStandardMaterial({ color: 0x6d716d, roughness: 0.96, metalness: 0.04 });
  const apronCurb = new THREE.Mesh(new THREE.BoxGeometry(50.8, 0.24, 0.38), apronCurbMaterial);
  apronCurb.position.set(0, 0.16, 10.25);
  apronCurb.receiveShadow = true;
  apronServiceGroup.add(apronCurb);
  const apronDrainMaterial = new THREE.MeshStandardMaterial({ color: 0x202829, roughness: 0.72, metalness: 0.62 });
  for (const x of [-20, -10, 0, 10, 20]) {
    const drain = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.04, 0.18), apronDrainMaterial);
    drain.position.set(x, 0.3, 10.25);
    apronServiceGroup.add(drain);
  }
  const serviceApronJointMaterial = new THREE.MeshStandardMaterial({ color: 0x68716d, roughness: 0.98, metalness: 0.02, transparent: true, opacity: 0.5, depthWrite: false });
  for (const x of [-13, 0, 13]) {
    const joint = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.025, 6.0), serviceApronJointMaterial);
    joint.position.set(x, 0.1, 7.45);
    apronServiceGroup.add(joint);
  }
  const apronStainMaterial = new THREE.MeshStandardMaterial({ color: 0x1f2829, roughness: 1, metalness: 0.02, transparent: true, opacity: 0.36, depthWrite: false });
  const apronWetMaterial = new THREE.MeshStandardMaterial({ color: 0x354346, roughness: 0.28, metalness: 0.08, transparent: true, opacity: 0.3, depthWrite: false });
  for (const [x, z, scaleX, scaleZ] of [[-15, 8.35, 4.3, 1.1], [-2.5, 7.6, 3.8, 0.82], [13.8, 8.7, 4.7, 1.2]] as Array<[number, number, number, number]>) {
    const stain = new THREE.Mesh(new THREE.CircleGeometry(1, 28), apronStainMaterial);
    stain.scale.set(scaleX, scaleZ, 1);
    stain.rotation.x = -Math.PI / 2;
    stain.position.set(x, 0.108, z);
    apronServiceGroup.add(stain);
    const wetEdge = new THREE.Mesh(new THREE.CircleGeometry(1, 28), apronWetMaterial);
    wetEdge.scale.set(scaleX * 0.72, scaleZ * 0.58, 1);
    wetEdge.rotation.x = -Math.PI / 2;
    wetEdge.position.set(x + 0.25, 0.114, z - 0.08);
    apronServiceGroup.add(wetEdge);
  }
  const apronContainerMaterial = new THREE.MeshStandardMaterial({ color: 0x6f5446, roughness: 0.9, metalness: 0.34 });
  const apronContainerTrimMaterial = new THREE.MeshStandardMaterial({ color: 0x2f3939, roughness: 0.78, metalness: 0.56 });
  const apronContainerMarkingMaterial = new THREE.MeshStandardMaterial({ color: 0xb2774c, roughness: 0.82, metalness: 0.18 });
  const containerStencilCanvas = document.createElement("canvas");
  containerStencilCanvas.width = 320;
  containerStencilCanvas.height = 96;
  const containerStencilContext = containerStencilCanvas.getContext("2d");
  if (containerStencilContext) {
    containerStencilContext.clearRect(0, 0, 320, 96);
    containerStencilContext.fillStyle = "rgba(26, 32, 32, 0.72)";
    containerStencilContext.fillRect(8, 8, 304, 80);
    containerStencilContext.fillStyle = "#c5b79a";
    containerStencilContext.font = "700 38px Arial, sans-serif";
    containerStencilContext.fillText("YARD 03", 30, 58);
    containerStencilContext.fillStyle = "#a86c45";
    containerStencilContext.fillRect(224, 24, 58, 8);
    containerStencilContext.fillRect(224, 42, 42, 8);
  }
  const containerStencilTexture = new THREE.CanvasTexture(containerStencilCanvas);
  containerStencilTexture.colorSpace = THREE.SRGBColorSpace;
  const containerStencilMaterial = new THREE.MeshBasicMaterial({ map: containerStencilTexture, transparent: true, opacity: 0.76, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
  const serviceTrailer = new THREE.Group();
  serviceTrailer.name = "density_arrival_right_apron_service_trailer";
  serviceTrailer.position.set(-370, 0, 229);
  serviceTrailer.rotation.y = roadHeading + 0.08;
  root.add(serviceTrailer);
  const trailerBodyMaterial = new THREE.MeshPhysicalMaterial({ color: 0x65716d, roughness: 0.72, metalness: 0.3, clearcoat: 0.22, clearcoatRoughness: 0.22, reflectivity: 0.52 });
  const trailerTrimMaterial = new THREE.MeshStandardMaterial({ color: 0x263537, roughness: 0.72, metalness: 0.68 });
  const trailerDoorMaterial = new THREE.MeshStandardMaterial({ color: 0x344347, roughness: 0.6, metalness: 0.56 });
  const trailerSafetyMaterial = new THREE.MeshStandardMaterial({ color: 0xc17b48, roughness: 0.72, metalness: 0.12, emissive: 0x2d1208, emissiveIntensity: 0.2 });
  const trailerHardwareMaterial = new THREE.MeshStandardMaterial({ color: 0x1d292b, roughness: 0.68, metalness: 0.76 });
  const trailerTireMaterial = new THREE.MeshStandardMaterial({ color: 0x151c1d, roughness: 0.96, metalness: 0.04 });
  const trailerBody = new THREE.Mesh(new RoundedBoxGeometry(14.2, 3.7, 3.45, 3, 0.2), trailerBodyMaterial);
  trailerBody.position.y = 2.25;
  trailerBody.castShadow = true;
  trailerBody.receiveShadow = true;
  serviceTrailer.add(trailerBody);
  const trailerLowerRail = new THREE.Mesh(new THREE.BoxGeometry(14.55, 0.24, 3.64), trailerTrimMaterial);
  trailerLowerRail.position.y = 0.62;
  serviceTrailer.add(trailerLowerRail);
  const trailerRoofRail = new THREE.Mesh(new THREE.BoxGeometry(14.45, 0.18, 3.58), trailerTrimMaterial);
  trailerRoofRail.position.y = 4.15;
  serviceTrailer.add(trailerRoofRail);
  const trailerPanelMaterial = new THREE.MeshStandardMaterial({ color: 0x536b6e, roughness: 0.8, metalness: 0.34 });
  const trailerPanelInsetMaterial = new THREE.MeshStandardMaterial({ color: 0x27383b, roughness: 0.66, metalness: 0.5 });
  const trailerSideMarkMaterial = new THREE.MeshStandardMaterial({ color: 0xb77448, roughness: 0.72, metalness: 0.12, emissive: 0x2b1208, emissiveIntensity: 0.12 });
  for (const z of [-1.76, 1.76]) {
    const sidePanel = new THREE.Mesh(new THREE.BoxGeometry(13.48, 3.2, 0.055), trailerPanelMaterial);
    sidePanel.name = `density_arrival_service_trailer_side_panel_${z < 0 ? "near" : "far"}`;
    sidePanel.position.set(0, 2.28, z);
    sidePanel.castShadow = true;
    serviceTrailer.add(sidePanel);
    for (const x of [-6.1, -4.7, -3.3, -1.9, -0.5, 0.9, 2.3, 3.7, 5.1, 6.5]) {
      const rib = new THREE.Mesh(new THREE.BoxGeometry(0.1, 3.28, 0.14), trailerTrimMaterial);
      rib.position.set(x, 2.28, z + (z < 0 ? -0.035 : 0.035));
      serviceTrailer.add(rib);
    }
    const sideTopRail = new THREE.Mesh(new THREE.BoxGeometry(13.65, 0.12, 0.1), trailerTrimMaterial);
    sideTopRail.position.set(0, 3.9, z + (z < 0 ? -0.04 : 0.04));
    serviceTrailer.add(sideTopRail);
    const sideBottomRail = new THREE.Mesh(new THREE.BoxGeometry(13.65, 0.12, 0.1), trailerTrimMaterial);
    sideBottomRail.position.set(0, 0.72, z + (z < 0 ? -0.04 : 0.04));
    serviceTrailer.add(sideBottomRail);
    const accessDoor = new THREE.Mesh(new THREE.BoxGeometry(2.55, 2.15, 0.06), trailerPanelInsetMaterial);
    accessDoor.position.set(3.85, 2.2, z + (z < 0 ? -0.045 : 0.045));
    serviceTrailer.add(accessDoor);
    const accessDoorFrame = new THREE.Mesh(new THREE.BoxGeometry(2.72, 2.32, 0.08), trailerTrimMaterial);
    accessDoorFrame.position.set(3.85, 2.2, z + (z < 0 ? -0.05 : 0.05));
    accessDoorFrame.scale.set(1, 1, 0.9);
    serviceTrailer.add(accessDoorFrame);
    const accessHandle = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.34, 0.12), trailerSafetyMaterial);
    accessHandle.position.set(4.72, 2.18, z + (z < 0 ? -0.085 : 0.085));
    serviceTrailer.add(accessHandle);
    const sideMark = new THREE.Mesh(new THREE.BoxGeometry(1.72, 0.16, 0.07), trailerSideMarkMaterial);
    sideMark.position.set(-3.15, 1.08, z + (z < 0 ? -0.045 : 0.045));
    serviceTrailer.add(sideMark);
    for (const hingeY of [1.45, 2.2, 2.95]) {
      const hinge = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.22, 0.16), trailerHardwareMaterial);
      hinge.position.set(2.62, hingeY, z + (z < 0 ? -0.09 : 0.09));
      serviceTrailer.add(hinge);
    }
    const latchBar = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.46, 0.18), trailerHardwareMaterial);
    latchBar.position.set(4.86, 2.2, z + (z < 0 ? -0.1 : 0.1));
    serviceTrailer.add(latchBar);
    const warningStripe = new THREE.Mesh(new THREE.BoxGeometry(1.42, 0.09, 0.09), trailerSafetyMaterial);
    warningStripe.position.set(3.82, 0.98, z + (z < 0 ? -0.09 : 0.09));
    warningStripe.rotation.z = z < 0 ? -0.16 : 0.16;
    serviceTrailer.add(warningStripe);
  }
  const undercarriageRail = new THREE.Mesh(new THREE.BoxGeometry(10.8, 0.2, 0.26), trailerHardwareMaterial);
  undercarriageRail.position.set(0, 0.44, 0);
  undercarriageRail.castShadow = true;
  serviceTrailer.add(undercarriageRail);
  const trailerHatchRevealMaterial = new THREE.MeshStandardMaterial({ color: 0x182426, roughness: 0.82, metalness: 0.34 });
  const trailerHatchGlowMaterial = new THREE.MeshStandardMaterial({ color: 0xffb977, roughness: 0.36, metalness: 0.08, emissive: 0x8f3d1a, emissiveIntensity: 1.18 });
  const trailerHatchReveal = new THREE.Mesh(new THREE.BoxGeometry(2.58, 1.52, 0.12), trailerHatchRevealMaterial);
  trailerHatchReveal.position.set(-1.25, 2.25, 1.81);
  serviceTrailer.add(trailerHatchReveal);
  const trailerHatchGlow = new THREE.Mesh(new THREE.BoxGeometry(2.08, 1.06, 0.06), trailerHatchGlowMaterial);
  trailerHatchGlow.position.set(-1.25, 2.25, 1.9);
  serviceTrailer.add(trailerHatchGlow);
  for (const x of [-2.25, -0.25]) {
    const hatchJamb = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.3, 0.18), trailerHardwareMaterial);
    hatchJamb.position.set(x, 2.25, 1.96);
    serviceTrailer.add(hatchJamb);
  }
  const hatchHeader = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.12, 0.18), trailerHardwareMaterial);
  hatchHeader.position.set(-1.25, 2.9, 1.96);
  serviceTrailer.add(hatchHeader);
  const hatchLight = new THREE.PointLight(0xffa565, 3.8, 7.5, 2);
  hatchLight.position.set(-1.25, 2.45, 2.08);
  serviceTrailer.add(hatchLight);
  const trailerRearDoor = new THREE.Mesh(new THREE.BoxGeometry(0.16, 3.18, 2.86), trailerDoorMaterial);
  trailerRearDoor.position.set(-7.18, 2.25, 0);
  serviceTrailer.add(trailerRearDoor);
  for (const z of [-1.12, 0, 1.12]) {
    const rearDoorBar = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.12, 0.86), trailerSafetyMaterial);
    rearDoorBar.position.set(-7.3, 1.25 + (z + 1.12) * 0.5, z);
    rearDoorBar.rotation.x = Math.PI / 2;
    serviceTrailer.add(rearDoorBar);
  }
  for (const x of [-4.8, 4.8]) {
    for (const z of [-1.62, 1.62]) {
      const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.62, 0.3, 12), trailerTireMaterial);
      wheel.rotation.x = Math.PI / 2;
      wheel.position.set(x, 0.63, z);
      wheel.castShadow = true;
      serviceTrailer.add(wheel);
      const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.32, 10), trailerTrimMaterial);
      hub.rotation.x = Math.PI / 2;
      hub.position.set(x, 0.63, z + (z > 0 ? 0.02 : -0.02));
      serviceTrailer.add(hub);
    }
  }
  const trailerMarker = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.24, 0.08), trailerSafetyMaterial);
  trailerMarker.position.set(3.8, 2.25, 1.82);
  serviceTrailer.add(trailerMarker);
  addArrivalContactShadow(serviceTrailer, "density_arrival_right_apron_service_trailer_contact_shadow", { x: 0, z: 0 }, 13.8, 4.0, 0, 0.54);
  const palletMaterial = new THREE.MeshStandardMaterial({ color: 0x85664e, roughness: 0.92, metalness: 0.02 });
  const pallet = new THREE.Mesh(new THREE.BoxGeometry(3.1, 0.22, 1.85), palletMaterial);
  pallet.position.set(15.5, 0.2, -3.5);
  apronServiceGroup.add(pallet);
  for (let index = 0; index < 4; index += 1) {
    const load = new THREE.Mesh(new THREE.BoxGeometry(1.35, 0.82, 0.76), index % 2 === 0 ? apronContainerMarkingMaterial : trailerBodyMaterial);
    load.position.set(14.95 + (index % 2) * 1.15, 0.72 + Math.floor(index / 2) * 0.85, -3.5);
    load.castShadow = true;
    apronServiceGroup.add(load);
  }
  for (const [containerX, containerZ, containerY, tint] of [[17.5, 8.35, 1.3, 0x6f5446], [-16.5, 8.75, 1.3, 0x5a655c]] as Array<[number, number, number, number]>) {
    const containerMaterial = apronContainerMaterial.clone();
    containerMaterial.color.setHex(tint);
    const container = new THREE.Mesh(new THREE.BoxGeometry(7.2, 2.5, 2.42), containerMaterial);
    container.position.set(containerX, containerY, containerZ);
    container.castShadow = true;
    apronServiceGroup.add(container);
    for (const ribOffset of [-2.55, -1.7, -0.85, 0, 0.85, 1.7, 2.55]) {
      const rib = new THREE.Mesh(new THREE.BoxGeometry(0.1, 2.18, 0.12), apronContainerTrimMaterial);
      rib.position.set(containerX + ribOffset, containerY, containerZ + 1.25);
      apronServiceGroup.add(rib);
    }
    for (const side of [-1, 1]) {
      const corner = new THREE.Mesh(new THREE.BoxGeometry(0.16, 2.68, 0.16), apronContainerTrimMaterial);
      corner.position.set(containerX + side * 3.48, containerY, containerZ + 1.25);
      apronServiceGroup.add(corner);
    }
    const label = new THREE.Mesh(new THREE.BoxGeometry(1.52, 0.42, 0.035), apronContainerMarkingMaterial);
    label.position.set(containerX - 1.25, containerY + 0.18, containerZ + 1.27);
    apronServiceGroup.add(label);
    const stencil = new THREE.Mesh(new THREE.PlaneGeometry(1.52, 0.46), containerStencilMaterial);
    stencil.name = `density_arrival_container_stencil_${containerX}`;
    stencil.position.set(containerX - 1.25, containerY + 0.18, containerZ + 1.295);
    stencil.userData.visualLayer = "street-canyon-signage";
    apronServiceGroup.add(stencil);
  }
  const dockPoolMaterial = new THREE.MeshStandardMaterial({ color: 0xffb36e, roughness: 0.64, metalness: 0.02, emissive: 0x8f3c1a, emissiveIntensity: 0.48, transparent: true, opacity: 0.24, depthWrite: false, blending: THREE.AdditiveBlending });
  for (let index = 0; index < 4; index += 1) {
    const dockX = -18.5 + index * 12.2;
    const dockCanopy = new THREE.Mesh(new THREE.BoxGeometry(7.4, 0.16, 1.15), apronSteelMaterial);
    dockCanopy.position.set(dockX, 5.35, 5.12);
    dockCanopy.castShadow = true;
    apronServiceGroup.add(dockCanopy);
    const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.16, 0.22), apronLampMaterial);
    lamp.position.set(dockX, 5.18, 5.58);
    apronServiceGroup.add(lamp);
    const pool = new THREE.Mesh(new THREE.CircleGeometry(1, 24), dockPoolMaterial);
    pool.scale.set(2.9, 1.15, 1);
    pool.rotation.x = -Math.PI / 2;
    pool.position.set(dockX, 0.11, 7.05);
    apronServiceGroup.add(pool);
    const dockPointLight = new THREE.PointLight(0xffa15d, 15, 24, 2);
    dockPointLight.position.set(dockX, 4.65, 6.05);
    apronServiceGroup.add(dockPointLight);
  }
  const apronServicePipe = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 8.3, 8), apronSteelMaterial);
  apronServicePipe.position.set(22.6, 4.2, 4.88);
  apronServicePipe.castShadow = true;
  apronServiceGroup.add(apronServicePipe);
  const apronServiceElbow = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.16, 0.16), apronSteelMaterial);
  apronServiceElbow.position.set(22.0, 8.18, 4.88);
  apronServiceGroup.add(apronServiceElbow);
  const apronRoofline = new THREE.Mesh(new THREE.BoxGeometry(53.5, 0.42, 9.15), apronSteelMaterial);
  apronRoofline.position.y = 8.62;
  apronServiceGroup.add(apronRoofline);
  const apronOfficeShellMaterial = new THREE.MeshStandardMaterial({ color: 0x5f6561, roughness: 0.92, metalness: 0.12 });
  const apronOffice = new THREE.Mesh(new THREE.BoxGeometry(27, 8.4, 4.9), apronOfficeShellMaterial);
  apronOffice.position.set(-2.5, 12.55, -1.55);
  apronOffice.castShadow = true;
  apronOffice.receiveShadow = true;
  apronOffice.userData.streetFacadeShell = true;
  apronOffice.userData.streetFacadeDimensions = { x: 27, y: 8.4, z: 4.9 };
  apronServiceGroup.add(apronOffice);
  const officeWindowMaterial = new THREE.MeshStandardMaterial({ color: 0x7f9c9a, roughness: 0.34, metalness: 0.42, emissive: 0x203f40, emissiveIntensity: 0.42 });
  const officeOccupiedMaterial = new THREE.MeshStandardMaterial({ color: 0xb17b58, roughness: 0.4, metalness: 0.24, emissive: 0x4a2113, emissiveIntensity: 0.48 });
  const officeDarkMaterial = new THREE.MeshStandardMaterial({ color: 0x33494b, roughness: 0.48, metalness: 0.58, emissive: 0x0b1516, emissiveIntensity: 0.12 });
  const officeRevealMaterial = new THREE.MeshStandardMaterial({ color: 0x1d2b2e, roughness: 0.86, metalness: 0.28 });
  const officeFrameMaterial = new THREE.MeshStandardMaterial({ color: 0x273638, roughness: 0.76, metalness: 0.68 });
  for (let row = 0; row < 2; row += 1) {
    for (let column = 0; column < 5; column += 1) {
      const windowX = -12.0 + column * 4.75;
      const windowY = 11.55 + row * 2.55;
      const reveal = new THREE.Mesh(new THREE.BoxGeometry(4.16, 1.82, 0.14), officeRevealMaterial);
      reveal.position.set(windowX, windowY, 0.89);
      apronServiceGroup.add(reveal);
      const windowMaterial = row === 0 && column === 4 ? officeDarkMaterial : (row + column) % 4 === 1 ? officeOccupiedMaterial : officeWindowMaterial;
      const window = new THREE.Mesh(new THREE.BoxGeometry(3.8, 1.46, 0.12), windowMaterial);
      window.position.set(windowX, windowY, 0.98);
      apronServiceGroup.add(window);
      for (const xOffset of [-2.04, 2.04]) {
        const jamb = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.78, 0.16), officeFrameMaterial);
        jamb.position.set(windowX + xOffset, windowY, 1.08);
        apronServiceGroup.add(jamb);
      }
      for (const yOffset of [-0.86, 0.86]) {
        const transom = new THREE.Mesh(new THREE.BoxGeometry(4.14, 0.11, 0.16), officeFrameMaterial);
        transom.position.set(windowX, windowY + yOffset, 1.08);
        apronServiceGroup.add(transom);
      }
    }
  }
  const officeSill = new THREE.Mesh(new THREE.BoxGeometry(25.5, 0.18, 0.2), officeFrameMaterial);
  officeSill.position.set(-2.5, 10.65, 1.1);
  apronServiceGroup.add(officeSill);
  const officeRoofCap = new THREE.Mesh(new THREE.BoxGeometry(28.4, 0.35, 5.3), apronSteelMaterial);
  officeRoofCap.position.set(-2.5, 16.87, -1.55);
  apronServiceGroup.add(officeRoofCap);
  const officeTank = new THREE.Mesh(new THREE.CylinderGeometry(1.05, 1.05, 2.15, 10), apronSteelMaterial);
  officeTank.position.set(6.4, 18.1, -1.55);
  apronServiceGroup.add(officeTank);
  const officeTankCap = new THREE.Mesh(new THREE.CylinderGeometry(1.25, 1.25, 0.14, 10), apronSafetyMaterial);
  officeTankCap.position.set(6.4, 19.22, -1.55);
  apronServiceGroup.add(officeTankCap);
  for (const x of [-17, 0, 17]) {
    const vent = new THREE.Mesh(new THREE.BoxGeometry(1.8, 1.35, 1.8), apronSteelMaterial);
    vent.position.set(x, 9.42, 0.2);
    apronServiceGroup.add(vent);
    const cap = new THREE.Mesh(new THREE.BoxGeometry(2.15, 0.14, 2.15), apronSafetyMaterial);
    cap.position.set(x, 10.1, 0.2);
    apronServiceGroup.add(cap);
  }
  for (let index = 0; index < 3; index += 1) {
    const container = new THREE.Mesh(new THREE.BoxGeometry(6.8, 2.55, 2.45), index === 1 ? coolShellMaterial : apronShellMaterial);
    container.position.set(-16 + index * 8.3, 1.36, -5.4);
    container.castShadow = true;
    apronServiceGroup.add(container);
    const containerBand = new THREE.Mesh(new THREE.BoxGeometry(6.9, 0.12, 2.58), apronSafetyMaterial);
    containerBand.position.set(container.position.x, 1.9, -5.4);
    apronServiceGroup.add(containerBand);
  }
  const bayMarkMaterial = new THREE.MeshStandardMaterial({ color: 0xb28a58, roughness: 0.88, metalness: 0.06, transparent: true, opacity: 0.74, depthWrite: false });
  for (const x of [-19, -6.5, 6.5, 19]) {
    const bayMark = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.035, 5.0), bayMarkMaterial);
    bayMark.position.set(x, 0.12, 7.35);
    apronServiceGroup.add(bayMark);
  }
  const palletWoodMaterial = new THREE.MeshStandardMaterial({ color: 0x765c43, roughness: 0.92, metalness: 0.02 });
  const palletBandMaterial = new THREE.MeshStandardMaterial({ color: 0xb57a4d, roughness: 0.82, metalness: 0.08 });
  const palletStack = new THREE.Group();
  palletStack.name = "density_arrival_apron_pallet_stack";
  palletStack.position.set(-10.5, 0, 6.15);
  for (let level = 0; level < 2; level += 1) {
    const pallet = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.18, 1.65), palletWoodMaterial);
    pallet.position.set(0, 0.2 + level * 1.02, 0);
    palletStack.add(pallet);
    for (const x of [-0.9, 0, 0.9]) {
      const crate = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.66, 1.28), level === 1 ? palletBandMaterial : palletWoodMaterial);
      crate.position.set(x, 0.62 + level * 1.02, 0);
      palletStack.add(crate);
    }
  }
  apronServiceGroup.add(palletStack);
  const forkliftGroup = new THREE.Group();
  forkliftGroup.name = "density_arrival_apron_forklift";
  forkliftGroup.position.set(10.5, 0, 7.0);
  forkliftGroup.rotation.y = Math.PI;
  const forkliftBodyMaterial = new THREE.MeshStandardMaterial({ color: 0xc27b45, roughness: 0.76, metalness: 0.18 });
  const forkliftSteelMaterial = new THREE.MeshStandardMaterial({ color: 0x2e3a3c, roughness: 0.68, metalness: 0.58 });
  const forkliftTyreMaterial = new THREE.MeshStandardMaterial({ color: 0x15191a, roughness: 0.98, metalness: 0.01 });
  const forkliftBody = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.82, 1.38), forkliftBodyMaterial);
  forkliftBody.position.y = 0.82;
  forkliftBody.castShadow = true;
  forkliftGroup.add(forkliftBody);
  for (const x of [-0.76, 0.76]) {
    const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.26, 0.18, 10), forkliftTyreMaterial);
    wheel.rotation.x = Math.PI / 2;
    wheel.position.set(x, 0.36, -0.62);
    forkliftGroup.add(wheel);
  }
  const mast = new THREE.Mesh(new THREE.BoxGeometry(0.16, 3.5, 0.16), forkliftSteelMaterial);
  mast.position.set(1.02, 2.05, 0);
  forkliftGroup.add(mast);
  const overhead = new THREE.Mesh(new THREE.BoxGeometry(1.75, 0.14, 1.45), forkliftSteelMaterial);
  overhead.position.set(0.3, 2.92, 0);
  forkliftGroup.add(overhead);
  const forkRail = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.2, 1.6), forkliftSteelMaterial);
  forkRail.position.set(1.16, 1.0, 0);
  forkliftGroup.add(forkRail);
  for (const z of [-0.46, 0.46]) {
    const fork = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.08, 0.12), forkliftSteelMaterial);
    fork.position.set(1.82, 0.74, z);
    forkliftGroup.add(fork);
  }
  apronServiceGroup.add(forkliftGroup);

  const apronTruckGroup = new THREE.Group();
  apronTruckGroup.name = "density_arrival_right_apron_box_truck";
  // Presentation-only staging keeps the box truck embedded in the right service apron
  // without letting its pale cargo box become the arrival frame's foreground anchor.
  apronTruckGroup.position.set(0.8, 0, 8.5);
  apronTruckGroup.scale.setScalar(0.72);
  apronTruckGroup.rotation.y = roadHeading + Math.PI;
  const apronTruckBoxMaterial = new THREE.MeshStandardMaterial({ color: 0xaaa49a, roughness: 0.86, metalness: 0.2 });
  const apronTruckCabMaterial = new THREE.MeshStandardMaterial({ color: 0x3f5151, roughness: 0.78, metalness: 0.4 });
  const apronTruckGlassMaterial = new THREE.MeshStandardMaterial({ color: 0x23343a, roughness: 0.24, metalness: 0.52, emissive: 0x0b161a, emissiveIntensity: 0.14 });
  const apronTruckRubberMaterial = new THREE.MeshStandardMaterial({ color: 0x1c2425, roughness: 0.94, metalness: 0.03 });
  const apronTruckPalletMaterial = new THREE.MeshStandardMaterial({ color: 0x76523a, roughness: 0.92, metalness: 0.04 });
  const apronTruckCrateMaterial = new THREE.MeshStandardMaterial({ color: 0x66705d, roughness: 0.86, metalness: 0.18 });
  const truckBox = new THREE.Mesh(new THREE.BoxGeometry(5.9, 2.8, 2.65), apronTruckBoxMaterial);
  truckBox.position.set(-1.05, 2.05, 0);
  truckBox.castShadow = true;
  apronTruckGroup.add(truckBox);
  const truckBoxLowerBand = new THREE.Mesh(new THREE.BoxGeometry(6.05, 0.2, 2.74), apronContainerTrimMaterial);
  truckBoxLowerBand.position.set(-1.05, 0.7, 0);
  apronTruckGroup.add(truckBoxLowerBand);
  const truckCab = new THREE.Mesh(new THREE.BoxGeometry(2.05, 2.45, 2.72), apronTruckCabMaterial);
  truckCab.position.set(2.9, 1.82, 0);
  truckCab.castShadow = true;
  apronTruckGroup.add(truckCab);
  const truckWindshield = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.72, 2.18), apronTruckGlassMaterial);
  truckWindshield.position.set(3.94, 2.24, 0);
  apronTruckGroup.add(truckWindshield);
  for (const x of [-2.45, 2.55]) {
    for (const z of [-1.25, 1.25]) {
      const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.46, 0.46, 0.24, 14), apronTruckRubberMaterial);
      wheel.rotation.x = Math.PI / 2;
      wheel.position.set(x, 0.56, z);
      apronTruckGroup.add(wheel);
      const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.26, 12), apronContainerTrimMaterial);
      hub.rotation.x = Math.PI / 2;
      hub.position.set(x, 0.56, z);
      apronTruckGroup.add(hub);
    }
  }
  const truckSideStripe = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.22, 2.44), apronContainerMarkingMaterial);
  truckSideStripe.position.set(1.78, 1.58, 0);
  apronTruckGroup.add(truckSideStripe);
  const truckPanelMaterial = new THREE.MeshStandardMaterial({ color: 0x53676a, roughness: 0.82, metalness: 0.24 });
  const truckPanelTrimMaterial = new THREE.MeshStandardMaterial({ color: 0x273537, roughness: 0.72, metalness: 0.62 });
  const truckSafetyMaterial = new THREE.MeshStandardMaterial({ color: 0xc57945, roughness: 0.68, metalness: 0.16, emissive: 0x2d1308, emissiveIntensity: 0.16 });
  for (const z of [-1.36, 1.36]) {
    const sidePanel = new THREE.Mesh(new THREE.BoxGeometry(5.45, 2.1, 0.045), truckPanelMaterial);
    sidePanel.position.set(-1.05, 2.06, z);
    sidePanel.castShadow = true;
    apronTruckGroup.add(sidePanel);
    for (const x of [-3.38, -1.78, -0.18, 1.42]) {
      const rib = new THREE.Mesh(new THREE.BoxGeometry(0.055, 2.18, 0.07), truckPanelTrimMaterial);
      rib.position.set(x, 2.05, z + (z < 0 ? -0.028 : 0.028));
      apronTruckGroup.add(rib);
    }
    const lowerRail = new THREE.Mesh(new THREE.BoxGeometry(5.55, 0.1, 0.08), truckPanelTrimMaterial);
    lowerRail.position.set(-1.05, 0.92, z + (z < 0 ? -0.028 : 0.028));
    apronTruckGroup.add(lowerRail);
    const sideWindow = new THREE.Mesh(new THREE.BoxGeometry(1.18, 0.68, 0.055), apronTruckGlassMaterial);
    sideWindow.position.set(3.0, 2.28, z + (z < 0 ? -0.038 : 0.038));
    apronTruckGroup.add(sideWindow);
    const mirrorArm = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.06, 0.06), truckPanelTrimMaterial);
    mirrorArm.position.set(3.55, 2.05, z * 1.04);
    apronTruckGroup.add(mirrorArm);
    const mirror = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.34, 0.22), apronTruckGlassMaterial);
    mirror.position.set(3.78, 2.12, z * 1.06);
    apronTruckGroup.add(mirror);
  }
  const rearDoorFrame = new THREE.Mesh(new THREE.BoxGeometry(0.07, 2.55, 2.7), truckPanelTrimMaterial);
  rearDoorFrame.position.set(-4.04, 2.0, 0);
  apronTruckGroup.add(rearDoorFrame);
  const rearDoorSeam = new THREE.Mesh(new THREE.BoxGeometry(0.055, 2.42, 0.055), truckPanelTrimMaterial);
  rearDoorSeam.position.set(-4.085, 2.02, 0);
  apronTruckGroup.add(rearDoorSeam);
  for (const z of [-0.88, 0.88]) {
    const rearHinge = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.26, 0.18), truckPanelTrimMaterial);
    rearHinge.position.set(-4.12, 1.16, z);
    apronTruckGroup.add(rearHinge);
    const rearLamp = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.24, 0.36), truckSafetyMaterial);
    rearLamp.position.set(-4.13, 1.12, z);
    apronTruckGroup.add(rearLamp);
  }
  const truckLamp = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.24, 0.45), apronLampMaterial);
  truckLamp.position.set(3.94, 1.15, -0.88);
  apronTruckGroup.add(truckLamp);
  const truckFrontBumper = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.24, 2.84), truckPanelTrimMaterial);
  truckFrontBumper.position.set(4.0, 0.62, 0);
  apronTruckGroup.add(truckFrontBumper);
  const truckPallet = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.14, 1.1), apronTruckPalletMaterial);
  truckPallet.position.set(-5.05, 0.12, 1.72);
  apronTruckGroup.add(truckPallet);
  for (const y of [0.3, 0.84, 1.38]) {
    const palletLoad = new THREE.Mesh(new THREE.BoxGeometry(1.65, 0.42, 0.88), apronTruckCrateMaterial);
    palletLoad.position.set(-5.05, y, 1.72);
    palletLoad.castShadow = true;
    apronTruckGroup.add(palletLoad);
  }
    apronServiceGroup.add(apronTruckGroup);
  const foregroundServiceCage = new THREE.Group();
  foregroundServiceCage.name = "density_arrival_foreground_service_cage";
  foregroundServiceCage.position.set(-378, 0, 229);
  foregroundServiceCage.rotation.y = 0.56;
  foregroundServiceCage.scale.setScalar(1.14);
  foregroundServiceCage.userData.visualLayer = "street-canyon";
  densityObjects.push(foregroundServiceCage);
  scene.add(foregroundServiceCage);
  const cageSteelMaterial = new THREE.MeshStandardMaterial({ color: 0x303b3b, roughness: 0.78, metalness: 0.62 });
  const cageMeshMaterial = new THREE.MeshStandardMaterial({ color: 0x65716d, roughness: 0.86, metalness: 0.34, transparent: true, opacity: 0.52, depthWrite: false });
  const cageDrumMaterial = new THREE.MeshStandardMaterial({ color: 0x8b5f42, roughness: 0.82, metalness: 0.36 });
  const cageSafetyMaterial = new THREE.MeshStandardMaterial({ color: 0xc07a4b, roughness: 0.72, metalness: 0.12 });
  const cagePallet = new THREE.Mesh(new THREE.BoxGeometry(4.6, 0.22, 2.6), palletMaterial);
  cagePallet.position.y = 0.18;
  foregroundServiceCage.add(cagePallet);
  for (const x of [-2.15, 2.15]) {
    for (const z of [-1.15, 1.15]) {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.13, 3.5, 8), cageSteelMaterial);
      post.position.set(x, 1.9, z);
      post.castShadow = true;
      foregroundServiceCage.add(post);
    }
  }
  const cageTop = new THREE.Mesh(new THREE.BoxGeometry(4.6, 0.16, 2.6), cageSteelMaterial);
  cageTop.position.y = 3.68;
  foregroundServiceCage.add(cageTop);
  for (const z of [-1.18, 1.18]) {
    const cageRail = new THREE.Mesh(new THREE.BoxGeometry(4.4, 0.08, 0.08), cageSteelMaterial);
    cageRail.position.set(0, 2.35, z);
    foregroundServiceCage.add(cageRail);
    for (let index = 0; index < 10; index += 1) {
      const wire = new THREE.Mesh(new THREE.BoxGeometry(0.025, 2.8, 0.025), cageMeshMaterial);
      wire.position.set(-2.0 + index * 0.45, 1.95, z);
      foregroundServiceCage.add(wire);
    }
  }
  for (const x of [-1.25, 0, 1.25]) {
    const drum = new THREE.Mesh(new THREE.CylinderGeometry(0.46, 0.46, 1.3, 16), cageDrumMaterial);
    drum.name = `density_arrival_foreground_service_cage_drum_body_${x}`;
    drum.position.set(x, 0.95, 0);
    drum.castShadow = true;
    foregroundServiceCage.add(drum);
    const drumBand = new THREE.Mesh(new THREE.TorusGeometry(0.47, 0.045, 6, 16), cageSafetyMaterial);
    drumBand.name = `density_arrival_foreground_service_cage_drum_band_${x}`;
    drumBand.rotation.x = Math.PI / 2;
    drumBand.position.set(x, 1.02, 0);
    foregroundServiceCage.add(drumBand);
  }
  const cageLabel = new THREE.Mesh(new THREE.BoxGeometry(1.65, 0.4, 0.04), cageSafetyMaterial);
  cageLabel.position.set(-1.1, 2.85, 1.22);
  foregroundServiceCage.add(cageLabel);
  const foregroundApronClutter = new THREE.Group();
  foregroundApronClutter.name = "density_arrival_foreground_apron_clutter";
  foregroundApronClutter.position.set(-350, 0, 222);
  foregroundApronClutter.userData.visualLayer = "street-canyon-density";
  densityObjects.push(foregroundApronClutter);
  root.add(foregroundApronClutter);
  const apronClutterSteel = new THREE.MeshStandardMaterial({ color: 0x344245, roughness: 0.82, metalness: 0.5 });
  const apronClutterWood = new THREE.MeshStandardMaterial({ color: 0x765844, roughness: 0.94, metalness: 0.02 });
  const apronClutterSafety = new THREE.MeshStandardMaterial({ color: 0xb56b3e, roughness: 0.76, metalness: 0.18 });
  const clutterPallet = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.18, 1.55), apronClutterWood);
  clutterPallet.position.set(0, 0.16, 0);
  clutterPallet.castShadow = true;
  foregroundApronClutter.add(clutterPallet);
  for (const [x, y, z] of [[-0.72, 0.52, -0.22], [0.72, 0.52, -0.22], [-0.72, 0.98, -0.22], [0.72, 0.98, -0.22]] as Array<[number, number, number]>) {
    const crate = new THREE.Mesh(new THREE.BoxGeometry(1.18, 0.38, 1.05), apronClutterWood);
    crate.position.set(x, y, z);
    crate.castShadow = true;
    foregroundApronClutter.add(crate);
    const strap = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.045, 0.08), apronClutterSafety);
    strap.position.set(x, y, z + 0.54);
    foregroundApronClutter.add(strap);
  }
  const spool = new THREE.Mesh(new THREE.CylinderGeometry(0.95, 0.95, 1.15, 20), apronClutterWood);
  spool.rotation.z = Math.PI / 2;
  spool.position.set(2.65, 1.0, 0.18);
  spool.castShadow = true;
  foregroundApronClutter.add(spool);
  for (const side of [-1, 1]) {
    const spoolDisc = new THREE.Mesh(new THREE.CylinderGeometry(1.08, 1.08, 0.12, 20), apronClutterSafety);
    spoolDisc.rotation.z = Math.PI / 2;
    spoolDisc.position.set(2.65 + side * 0.62, 1.0, 0.18);
    foregroundApronClutter.add(spoolDisc);
  }
  for (const x of [-2.55, -1.38]) {
    const drum = new THREE.Mesh(new THREE.CylinderGeometry(0.48, 0.48, 1.42, 18), cageDrumMaterial);
    drum.position.set(x, 0.88, 0.92);
    drum.castShadow = true;
    foregroundApronClutter.add(drum);
    const band = new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.045, 6, 18), apronClutterSafety);
    band.rotation.x = Math.PI / 2;
    band.position.set(x, 0.92, 0.92);
    foregroundApronClutter.add(band);
  }
  addArrivalContactShadow(foregroundApronClutter, "foreground_apron_clutter_shadow", { x: 0, z: 0.08 }, 7.2, 3.5, 0, 0.5);
  const distantArrivalGroup = new THREE.Group();
  distantArrivalGroup.name = "density_arrival_layered_background_yard";
  distantArrivalGroup.userData.visualLayer = "street-canyon";
  densityObjects.push(distantArrivalGroup);
  root.add(distantArrivalGroup);
  const distantShellMaterial = new THREE.MeshStandardMaterial({ color: 0x596264, roughness: 0.92, metalness: 0.16 });
  const distantFacadeMaterial = new THREE.MeshStandardMaterial({ color: 0x6f6964, roughness: 0.88, metalness: 0.12 });
  const distantSteelMaterial = new THREE.MeshStandardMaterial({ color: 0x313c3e, roughness: 0.76, metalness: 0.54 });
  const distantGlassMaterial = new THREE.MeshStandardMaterial({ color: 0x526b6b, roughness: 0.32, metalness: 0.4, emissive: 0x5d3525, emissiveIntensity: 0.34 });
  const addDistantBlock = (name: string, position: { x: number; z: number }, size: { x: number; y: number; z: number }, rotationY: number, windowCount: number) => {
    const block = new THREE.Group();
    block.name = name;
    block.position.set(position.x, 0, position.z);
    block.rotation.y = rotationY;
    const shell = new THREE.Mesh(new THREE.BoxGeometry(size.x, size.y, size.z), distantShellMaterial);
    shell.position.y = size.y / 2;
    shell.castShadow = true;
    shell.receiveShadow = true;
    block.add(shell);
    const face = new THREE.Mesh(new THREE.BoxGeometry(size.x * 0.9, size.y * 0.72, 0.18), distantFacadeMaterial);
    face.position.set(0, size.y * 0.48, size.z / 2 + 0.08);
    block.add(face);
    for (let index = 0; index < windowCount; index += 1) {
      const window = new THREE.Mesh(new THREE.BoxGeometry(Math.max(1.8, size.x / Math.max(4, windowCount) * 0.58), 0.82, 0.08), distantGlassMaterial);
      window.position.set(-size.x * 0.36 + (index % Math.max(2, Math.ceil(windowCount / 2))) * size.x * 0.23, size.y * (index < Math.ceil(windowCount / 2) ? 0.58 : 0.77), size.z / 2 + 0.2);
      block.add(window);
    }
    const roofline = new THREE.Mesh(new THREE.BoxGeometry(size.x * 1.06, 0.34, size.z * 1.06), distantSteelMaterial);
    roofline.position.y = size.y + 0.18;
    block.add(roofline);
    for (const x of [-size.x * 0.26, size.x * 0.24]) {
      const roofVent = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.5, 1.2), distantSteelMaterial);
      roofVent.position.set(x, size.y + 0.95, 0);
      block.add(roofVent);
    }
    distantArrivalGroup.add(block);
  };
  addDistantBlock("density_arrival_background_left_warehouse", { x: -311, z: 157 }, { x: 34, y: 15, z: 9 }, -0.91, 8);
  addDistantBlock("density_arrival_background_right_office", { x: -266, z: 164 }, { x: 28, y: 13, z: 8 }, -1.08, 6);
  addDistantBlock("density_arrival_background_service_hall", { x: -229, z: 139 }, { x: 42, y: 18, z: 10 }, -1.08, 10);

  const overheadServiceGroup = new THREE.Group();
  overheadServiceGroup.name = "density_arrival_overhead_service_spans";
  overheadServiceGroup.userData.visualLayer = "street-canyon";
  densityObjects.push(overheadServiceGroup);
  scene.add(overheadServiceGroup);
  const overheadPipeMaterial = new THREE.MeshStandardMaterial({ color: 0x394646, roughness: 0.76, metalness: 0.62 });
  const addOverheadPipe = (start: { x: number; z: number }, end: { x: number; z: number }, y: number, radius: number) => {
    const dx = end.x - start.x;
    const dz = end.z - start.z;
    const length = Math.hypot(dx, dz);
    const pipe = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, length, 8), overheadPipeMaterial);
    pipe.position.set((start.x + end.x) / 2, y, (start.z + end.z) / 2);
    pipe.rotation.set(0, -Math.atan2(dz, dx), Math.PI / 2);
    pipe.castShadow = true;
    overheadServiceGroup.add(pipe);
  };
  addOverheadPipe({ x: -390, z: 204 }, { x: -350, z: 205 }, 10.8, 0.12);
  addOverheadPipe({ x: -384, z: 197 }, { x: -342, z: 198 }, 13.6, 0.09);
  for (const position of [{ x: -378, z: 204 }, { x: -360, z: 205 }]) {
    const hanger = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 1.3, 8), overheadPipeMaterial);
    hanger.position.set(position.x, 10.15, position.z);
    overheadServiceGroup.add(hanger);
  }
  const upperHanger = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 2.4, 8), overheadPipeMaterial);
  upperHanger.position.set(-363, 12.4, 198);
  upperHanger.castShadow = fullQualityPresentation;
  overheadServiceGroup.add(upperHanger);
  for (const [x, z, y] of [[-390, 204, 10.8], [-350, 205, 10.8], [-384, 197, 13.6], [-342, 198, 13.6]] as Array<[number, number, number]>) {
    const bracket = new THREE.Mesh(new THREE.BoxGeometry(0.64, 0.18, 0.18), overheadPipeMaterial);
    bracket.position.set(x, y, z);
    bracket.castShadow = fullQualityPresentation;
    overheadServiceGroup.add(bracket);
  }

  const farWarehouseGroup = new THREE.Group();
  farWarehouseGroup.name = "density_arrival_far_warehouse_stack";
  farWarehouseGroup.userData.visualLayer = "street-canyon";
  farWarehouseGroup.position.set(-260, 0, 150);
  farWarehouseGroup.rotation.y = roadHeading;
  densityObjects.push(farWarehouseGroup);
  scene.add(farWarehouseGroup);
  const farWarehouse = new THREE.Mesh(new THREE.BoxGeometry(46, 18, 8), coolShellMaterial);
  farWarehouse.position.y = 9;
  farWarehouse.castShadow = true;
  farWarehouse.receiveShadow = true;
  farWarehouseGroup.add(farWarehouse);
  const warehouseFrontMaterial = new THREE.MeshStandardMaterial({ color: 0x626661, roughness: 0.86, metalness: 0.18 });
  const warehouseBandMaterial = new THREE.MeshStandardMaterial({ color: 0x394344, roughness: 0.76, metalness: 0.5 });
  const warehouseFront = new THREE.Mesh(new THREE.BoxGeometry(41, 13.5, 0.22), warehouseFrontMaterial);
  warehouseFront.position.set(0, 7.6, 4.12);
  farWarehouseGroup.add(warehouseFront);
  for (const y of [2.2, 6.4, 10.6, 14.6]) {
    const band = new THREE.Mesh(new THREE.BoxGeometry(43, 0.16, 0.28), warehouseBandMaterial);
    band.position.set(0, y, 4.28);
    farWarehouseGroup.add(band);
  }
  for (let index = 0; index < 7; index += 1) {
    const rib = new THREE.Mesh(new THREE.BoxGeometry(0.22, 15.8, 0.26), warehouseBandMaterial);
    rib.position.set(-18 + index * 6, 8.2, 4.3);
    farWarehouseGroup.add(rib);
  }
  const warehouseWindows = new THREE.InstancedMesh(new THREE.BoxGeometry(3.9, 1.1, 0.08), warmWindowMaterial, 8);
  const warehouseDummy = new THREE.Object3D();
  for (let index = 0; index < 8; index += 1) {
    warehouseDummy.position.set(-17.5 + index * 5, 12.5, 4.46);
    warehouseDummy.rotation.set(0, 0, 0);
    warehouseDummy.updateMatrix();
    warehouseWindows.setMatrixAt(index, warehouseDummy.matrix);
  }
  warehouseWindows.instanceMatrix.needsUpdate = true;
  farWarehouseGroup.add(warehouseWindows);
  const warehouseRoofline = new THREE.Mesh(new THREE.BoxGeometry(48, 0.4, 8.6), warehouseBandMaterial);
  warehouseRoofline.position.y = 18.15;
  farWarehouseGroup.add(warehouseRoofline);
  for (const x of [-13, 0, 14]) {
    const roofVent = new THREE.Mesh(new THREE.BoxGeometry(1.6, 2.1, 1.6), parapetMaterial);
    roofVent.position.set(x, 19.25, 0.4);
    farWarehouseGroup.add(roofVent);
    const ventCap = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.14, 2.0), awningMaterial);
    ventCap.position.set(x, 20.32, 0.4);
    farWarehouseGroup.add(ventCap);
  }

  const boundaryMaterial = new THREE.MeshStandardMaterial({ color: 0x273234, roughness: 0.78, metalness: 0.56 });
  const boundaryGroup = new THREE.Group();
  boundaryGroup.name = "density_arrival_right_service_boundary";
  boundaryGroup.userData.visualLayer = "street-canyon";
  densityObjects.push(boundaryGroup);
  scene.add(boundaryGroup);
  const boundaryStart = { x: -374, z: 219 };
  const boundaryEnd = { x: -302, z: 180 };
  const boundaryDx = boundaryEnd.x - boundaryStart.x;
  const boundaryDz = boundaryEnd.z - boundaryStart.z;
  const boundaryLength = Math.hypot(boundaryDx, boundaryDz);
  const boundaryAngle = -Math.atan2(boundaryDz, boundaryDx);
  for (const t of [0, 0.2, 0.4, 0.6, 0.8, 1]) {
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.16, 2.8, 0.16), boundaryMaterial);
    post.position.set(boundaryStart.x + boundaryDx * t, 1.4, boundaryStart.z + boundaryDz * t);
    post.castShadow = true;
    boundaryGroup.add(post);
  }
  for (const y of [0.72, 2.65]) {
    const rail = new THREE.Mesh(new THREE.BoxGeometry(boundaryLength, 0.12, 0.12), boundaryMaterial);
    rail.rotation.y = boundaryAngle;
    rail.position.set((boundaryStart.x + boundaryEnd.x) / 2, y, (boundaryStart.z + boundaryEnd.z) / 2);
    boundaryGroup.add(rail);
  }
  const cabinetMaterial = new THREE.MeshStandardMaterial({ color: 0x465657, roughness: 0.72, metalness: 0.42 });
  const cabinetFaceMaterial = new THREE.MeshStandardMaterial({ color: 0x172528, roughness: 0.36, metalness: 0.5, emissive: 0x0a1719, emissiveIntensity: 0.24 });
  for (const [index, position] of [{ x: -366, z: 213 }, { x: -342, z: 200 }, { x: -318, z: 187 }].entries()) {
    const cabinet = new THREE.Mesh(new THREE.BoxGeometry(1.6, 2.1, 0.8), cabinetMaterial);
    cabinet.position.set(position.x, 1.05, position.z);
    cabinet.castShadow = true;
    boundaryGroup.add(cabinet);
    const face = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.42, 0.04), cabinetFaceMaterial);
    face.position.set(position.x, 1.38, position.z - 0.42);
    boundaryGroup.add(face);
    const warning = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.08, 0.06), awningMaterial);
    warning.position.set(position.x, 1.92, position.z - 0.43);
    boundaryGroup.add(warning);
    if (index === 1) {
      const conduit = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 1.2, 8), boundaryMaterial);
      conduit.position.set(position.x + 0.62, 2.65, position.z);
      boundaryGroup.add(conduit);
    }
  }

  const loadingGroup = new THREE.Group();
  loadingGroup.name = "density_arrival_loading_cluster";
  loadingGroup.userData.visualLayer = "street-canyon";
  densityObjects.push(loadingGroup);
  scene.add(loadingGroup);
  const palletWood = new THREE.MeshStandardMaterial({ color: 0x76523a, roughness: 0.92, metalness: 0.04 });
  const palletMetal = new THREE.MeshStandardMaterial({ color: 0x4d5a58, roughness: 0.78, metalness: 0.46 });
  const palletTyre = new THREE.MeshStandardMaterial({ color: 0x1d2426, roughness: 0.94, metalness: 0.04 });
  const crateMaterial = new THREE.MeshStandardMaterial({ color: 0x66705d, roughness: 0.86, metalness: 0.18 });
  for (let stack = 0; stack < 2; stack += 1) {
    const baseX = -389 + stack * 3.1;
    const baseZ = 207.6;
    for (let layer = 0; layer < 2; layer += 1) {
      const pallet = new THREE.Mesh(new THREE.BoxGeometry(2.35, 0.18, 1.45), palletWood);
      pallet.position.set(baseX, 0.12 + layer * 0.72, baseZ);
      pallet.castShadow = true;
      loadingGroup.add(pallet);
      for (const x of [-0.8, 0, 0.8]) {
        const slat = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.14, 1.5), palletWood);
        slat.position.set(baseX + x, 0.25 + layer * 0.72, baseZ);
        loadingGroup.add(slat);
      }
      const crate = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.54, 1.1), crateMaterial);
      crate.position.set(baseX, 0.54 + layer * 0.72, baseZ);
      crate.castShadow = true;
      loadingGroup.add(crate);
    }
  }
  const handTruck = new THREE.Group();
  handTruck.position.set(-382.5, 0, 208.5);
  handTruck.rotation.y = roadHeading;
  const handTruckFrame = new THREE.Mesh(new THREE.BoxGeometry(0.13, 1.65, 0.13), palletMetal);
  handTruckFrame.position.y = 0.9;
  handTruck.add(handTruckFrame);
  const handTruckHandle = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.12, 0.12), palletMetal);
  handTruckHandle.position.set(0, 1.7, 0);
  handTruck.add(handTruckHandle);
  const handTruckToe = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.1, 0.58), palletMetal);
  handTruckToe.position.set(0, 0.14, 0.22);
  handTruck.add(handTruckToe);
  for (const x of [-0.3, 0.3]) {
    const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.12, 8), palletTyre);
    wheel.rotation.x = Math.PI / 2;
    wheel.position.set(x, 0.18, -0.1);
    handTruck.add(wheel);
  }
  loadingGroup.add(handTruck);
  const cage = new THREE.Group();
  cage.position.set(-374.5, 0, 199.2);
  cage.rotation.y = roadHeading;
  for (const x of [-1.6, 1.6]) {
    for (const z of [-1.05, 1.05]) {
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.12, 2.25, 0.12), palletMetal);
      post.position.set(x, 1.18, z);
      cage.add(post);
    }
  }
  for (const y of [0.14, 2.22]) {
    const rail = new THREE.Mesh(new THREE.BoxGeometry(3.35, 0.12, 0.12), palletMetal);
    rail.position.y = y;
    cage.add(rail);
    const sideRail = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 2.2), palletMetal);
    sideRail.position.set(-1.6, y, 0);
    cage.add(sideRail);
    const otherSideRail = sideRail.clone();
    otherSideRail.position.x = 1.6;
    cage.add(otherSideRail);
  }
  const cageLoad = new THREE.Mesh(new THREE.BoxGeometry(2.65, 1.05, 1.65), crateMaterial);
  cageLoad.position.y = 0.7;
  cage.add(cageLoad);
  loadingGroup.add(cage);

  const checkpointMarkGroup = new THREE.Group();
  checkpointMarkGroup.name = "density_arrival_checkpoint_road_markings";
  checkpointMarkGroup.userData.visualLayer = "street-canyon";
  densityObjects.push(checkpointMarkGroup);
  scene.add(checkpointMarkGroup);
  const checkpointStripeMaterial = new THREE.MeshStandardMaterial({ color: 0xc18245, roughness: 0.74, metalness: 0.12, emissive: 0x2b1709, emissiveIntensity: 0.18 });
  const checkpointStopMaterial = new THREE.MeshStandardMaterial({ color: 0xd9d4bd, roughness: 0.92, metalness: 0.04 });
  for (const [index, x] of [-4.2, -1.4, 1.4, 4.2].entries()) {
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.035, 9.8), index % 2 === 0 ? checkpointStripeMaterial : checkpointStopMaterial);
    stripe.position.set(-292 + x, 0.07, 178);
    stripe.rotation.y = 0;
    checkpointMarkGroup.add(stripe);
  }
  const stopLine = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.04, 10.8), checkpointStopMaterial);
  stopLine.position.set(-286.2, 0.08, 178);
  checkpointMarkGroup.add(stopLine);

  const nearOfficeGroup = new THREE.Group();
  nearOfficeGroup.name = "density_arrival_near_service_office_frame";
  nearOfficeGroup.userData.visualLayer = "street-canyon";
  nearOfficeGroup.position.set(-396, 0, 212);
  nearOfficeGroup.rotation.y = roadHeading;
  densityObjects.push(nearOfficeGroup);
  scene.add(nearOfficeGroup);
  const nearOfficeShellMaterial = new THREE.MeshStandardMaterial({ color: 0x6d6961, roughness: 0.88, metalness: 0.12 });
  const nearOfficeTrimMaterial = new THREE.MeshStandardMaterial({ color: 0x30383a, roughness: 0.74, metalness: 0.62 });
  const nearOffice = new THREE.Mesh(new THREE.BoxGeometry(14.5, 16.2, 1.05), nearOfficeShellMaterial);
  nearOffice.position.y = 8.1;
  nearOffice.castShadow = true;
  nearOffice.receiveShadow = true;
  nearOfficeGroup.add(nearOffice);
  for (const facadeZ of [-0.58, 0.58]) {
    for (const y of [4.1, 8.2, 12.25]) {
      const band = new THREE.Mesh(new THREE.BoxGeometry(13.2, 0.16, 0.12), nearOfficeTrimMaterial);
      band.position.set(0, y, facadeZ);
      nearOfficeGroup.add(band);
      const windowRow = new THREE.InstancedMesh(new THREE.BoxGeometry(2.55, 1.35, 0.08), warmWindowMaterial, 4);
      const windowDummy = new THREE.Object3D();
      for (let index = 0; index < 4; index += 1) {
        windowDummy.position.set(-4.8 + index * 3.2, y + 1.25, facadeZ + (facadeZ > 0 ? 0.08 : -0.08));
        windowDummy.rotation.set(0, 0, 0);
        windowDummy.updateMatrix();
        windowRow.setMatrixAt(index, windowDummy.matrix);
      }
      windowRow.instanceMatrix.needsUpdate = true;
      nearOfficeGroup.add(windowRow);
    }
  }
  const officeRoof = new THREE.Mesh(new THREE.BoxGeometry(15.4, 0.42, 1.22), nearOfficeTrimMaterial);
  officeRoof.position.y = 16.45;
  nearOfficeGroup.add(officeRoof);
  for (const x of [-5.3, -1.8, 1.8, 5.3]) {
    const landing = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.12, 1.35), nearOfficeTrimMaterial);
    landing.position.set(x, 5.45, 0.92);
    nearOfficeGroup.add(landing);
    const rail = new THREE.Mesh(new THREE.BoxGeometry(2.55, 0.9, 0.1), nearOfficeTrimMaterial);
    rail.position.set(x, 5.9, 1.48);
    nearOfficeGroup.add(rail);
  }
  const officeStair = new THREE.Mesh(new THREE.BoxGeometry(0.88, 12.8, 0.16), nearOfficeTrimMaterial);
  officeStair.position.set(5.1, 8.1, 1.15);
  officeStair.rotation.z = -0.14;
  nearOfficeGroup.add(officeStair);
  const officePipe = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 15.5, 8), overheadPipeMaterial);
  officePipe.position.set(-6.2, 7.8, 1.2);
  nearOfficeGroup.add(officePipe);

  const shadowHeading = -0.74;
  addArrivalContactShadow(root, "arrival_shadow_maintenance_van", { x: -389.5, z: 220.5 }, 7.2, 3.5, shadowHeading, 0.56);
  addArrivalContactShadow(root, "arrival_shadow_mid_van", { x: -380, z: 201 }, 5.6, 2.8, shadowHeading, 0.42);
  addArrivalContactShadow(root, "arrival_shadow_parked_pickup", { x: -381.5, z: 213.5 }, 5.1, 2.7, shadowHeading, 0.4);
  addArrivalContactShadow(root, "arrival_shadow_apron_pickup", { x: -338, z: 220 }, 5.9, 3.0, shadowHeading + Math.PI, 0.42);
  addArrivalContactShadow(root, "arrival_shadow_lorry", { x: -349, z: 222 }, 8.0, 3.9, shadowHeading, 0.5);
  addArrivalContactShadow(root, "arrival_shadow_service_trailer", { x: -370, z: 229 }, 15.5, 4.8, shadowHeading + 0.08, 0.46);
  addArrivalContactShadow(root, "arrival_shadow_foreground_cage", { x: -378, z: 229 }, 6.8, 4.6, 0.56, 0.5);
  addArrivalServiceSliceRebuild(root);
}

function addArrivalServiceSliceRebuild(root: THREE.Group) {
  if (root.getObjectByName("arrival_service_slice_rebuild")) return;
  const roadHeading = 0.56;
  const rebuild = new THREE.Group();
  rebuild.name = "arrival_service_slice_rebuild";
  rebuild.visible = arrivalServiceSliceScope;
  rebuild.userData.visualLayer = "arrival-service-slice-rebuild";
  rebuild.userData.presentationModule = "plan-backed volumetric arrival and service slice";
  rebuild.userData.authoringRecord = {
    type: "detail",
    id: "arrival_service_slice_rebuild",
    displayName: "Arrival Service Slice Rebuild",
    role: "Scoped presentation rebuild for the insertion-to-service slice. It changes no zones, masses, connectors, volumes, navmesh inputs, or exported asset records.",
    runtimeNote: "Plan-backed first slice: volumetric halls, segmented roadway, supported service infrastructure, combat cover, and grounded surveillance.",
  };
  root.add(rebuild);

  const shell = new THREE.MeshStandardMaterial({ color: 0x4b5554, roughness: 0.9, metalness: 0.24 });
  const darkShell = new THREE.MeshStandardMaterial({ color: 0x273335, roughness: 0.82, metalness: 0.5 });
  const concrete = new THREE.MeshStandardMaterial({ color: 0x817a6d, roughness: 0.96, metalness: 0.04 });
  const edge = new THREE.MeshStandardMaterial({ color: 0x5f6966, roughness: 0.78, metalness: 0.52 });
  const safety = new THREE.MeshStandardMaterial({ color: 0xa76643, roughness: 0.78, metalness: 0.12 });
  const glass = new THREE.MeshPhysicalMaterial({ color: 0x234348, roughness: 0.24, metalness: 0.2, clearcoat: 0.6, clearcoatRoughness: 0.18, transmission: 0.03, emissive: 0x071719, emissiveIntensity: 0.16 });
  const warm = new THREE.MeshStandardMaterial({ color: 0xe7a764, roughness: 0.34, metalness: 0.08, emissive: 0x59240f, emissiveIntensity: 0.55 });
  const asphaltEdge = new THREE.MeshStandardMaterial({ color: 0x3a4140, roughness: 0.98, metalness: 0.02 });
  const marking = new THREE.MeshStandardMaterial({ color: 0xb78a5a, roughness: 0.88, metalness: 0.02 });

  const addBox = (parent: THREE.Object3D, name: string, size: [number, number, number], position: [number, number, number], material: THREE.Material, rotation: [number, number, number] = [0, 0, 0]) => {
    const mesh = new THREE.Mesh(new RoundedBoxGeometry(size[0], size[1], size[2], 4, Math.min(0.12, Math.min(size[0], size[1], size[2]) * 0.18)), material);
    mesh.name = name;
    mesh.position.set(...position);
    mesh.rotation.set(...rotation);
    mesh.castShadow = fullQualityPresentation;
    mesh.receiveShadow = true;
    mesh.userData.presentationModule = "arrival_service_slice_rebuild";
    parent.add(mesh);
    return mesh;
  };

  const addSegment = (parent: THREE.Object3D, name: string, a: { x: number; z: number }, b: { x: number; z: number }, width: number, height: number, material: THREE.Material, y = height / 2) => {
    const dx = b.x - a.x;
    const dz = b.z - a.z;
    const length = Math.hypot(dx, dz);
    const mesh = addBox(parent, name, [length, height, width], [(a.x + b.x) / 2, y, (a.z + b.z) / 2], material);
    mesh.rotation.y = Math.atan2(dz, dx);
    return mesh;
  };

  const addFacadeBay = (parent: THREE.Object3D, index: number, x: number, width: number, y = 3.1) => {
    addBox(parent, `arrival_slice_bay_${index}_recess`, [width, 4.8, 0.22], [x, y, 6.12], darkShell);
    addBox(parent, `arrival_slice_bay_${index}_header`, [width + 0.42, 0.22, 0.32], [x, 5.62, 6.48], edge);
    addBox(parent, `arrival_slice_bay_${index}_canopy`, [width + 0.74, 0.18, 1.55], [x, 5.82, 6.96], edge, [-0.08, 0, 0]);
    addBox(parent, `arrival_slice_bay_${index}_threshold`, [width - 0.3, 0.18, 0.56], [x, 0.48, 6.35], concrete);
    addBox(parent, `arrival_slice_bay_${index}_safety_band`, [width - 0.36, 0.14, 0.1], [x, 0.94, 6.54], safety);
    addBox(parent, `arrival_slice_bay_${index}_work_light`, [0.78, 0.13, 0.2], [x, 5.18, 6.62], warm);
    for (const side of [-1, 1]) addBox(parent, `arrival_slice_bay_${index}_jamb_${side < 0 ? "left" : "right"}`, [0.2, 5.05, 0.34], [x + side * (width / 2 + 0.16), 3.05, 6.38], edge);
  };

  const rightHall = new THREE.Group();
  rightHall.name = "arrival_slice_right_service_hall";
  rightHall.position.set(-354, 0, 211);
  rightHall.rotation.y = -1.22;
  rightHall.userData.authoringRecord = { type: "detail", id: "arrival_slice_right_service_hall", supportClass: "GROUND", depthMeters: 12, heightMeters: 14 };
  rebuild.add(rightHall);
  addBox(rightHall, "arrival_slice_right_hall_volume", [34, 13.2, 12], [0, 6.6, 0], shell);
  addBox(rightHall, "arrival_slice_right_hall_plinth", [35.2, 0.72, 12.45], [0, 0.36, 0.12], concrete);
  addBox(rightHall, "arrival_slice_right_hall_upper_parapet", [35.4, 0.66, 12.3], [0, 13.54, 0.02], darkShell);
  addBox(rightHall, "arrival_slice_right_hall_lower_course", [34.1, 1.25, 12.15], [0, 1.22, 0.08], edge);
  for (const x of [-12, 0, 12]) addFacadeBay(rightHall, x === -12 ? 0 : x === 0 ? 1 : 2, x, 8.2);
  for (const x of [-12, 0, 12]) {
    addBox(rightHall, `arrival_slice_right_upper_glazing_${x}`, [8.2, 2.18, 0.12], [x, 9.45, 6.1], glass);
    addBox(rightHall, `arrival_slice_right_upper_glazing_header_${x}`, [8.55, 0.13, 0.18], [x, 10.62, 6.3], edge);
    addBox(rightHall, `arrival_slice_right_upper_glazing_sill_${x}`, [8.55, 0.13, 0.18], [x, 8.27, 6.3], edge);
  }
  for (const x of [-16.2, -8.1, 0, 8.1, 16.2]) addBox(rightHall, `arrival_slice_right_front_pilaster_${x}`, [0.26, 12.5, 0.36], [x, 6.7, 6.34], darkShell);
  for (const x of [-12, 0, 12]) {
    addBox(rightHall, `arrival_slice_right_loading_bay_pad_${x}`, [7.5, 0.12, 2.4], [x, 0.08, 7.48], concrete);
    addBox(rightHall, `arrival_slice_right_loading_bay_safety_${x}`, [6.9, 0.1, 0.14], [x, 0.17, 8.62], safety);
    addBox(rightHall, `arrival_slice_right_loading_bay_light_${x}`, [0.72, 0.14, 0.22], [x, 4.92, 6.66], warm);
  }
  addBox(rightHall, "arrival_slice_right_facility_sign", [12.5, 0.8, 0.12], [5.6, 12.25, 6.38], safety);
  addBox(rightHall, "arrival_slice_right_roof_plant_base", [9.4, 0.24, 4.2], [9.2, 13.9, -1.7], edge);
  addBox(rightHall, "arrival_slice_right_roof_plant", [5.1, 1.28, 2.4], [9.2, 14.62, -1.7], darkShell);
  addBox(rightHall, "arrival_slice_right_roof_plant_cap", [5.4, 0.16, 2.7], [9.2, 15.32, -1.7], edge);

  const stairTower = new THREE.Group();
  stairTower.name = "arrival_slice_right_stair_tower";
  stairTower.position.set(-13.6, 0, 0.38);
  rightHall.add(stairTower);
  addBox(stairTower, "arrival_slice_stair_tower_back", [5.8, 12.3, 4.8], [0, 6.15, 0], darkShell);
  addBox(stairTower, "arrival_slice_stair_tower_glazing", [5.25, 10.5, 0.12], [0, 6.55, 2.46], glass);
  for (const y of [2.15, 5.15, 8.15, 11.15]) {
    addBox(stairTower, `arrival_slice_stair_landing_${y}`, [5.7, 0.16, 2.4], [0, y, 3.18], edge);
    addBox(stairTower, `arrival_slice_stair_landing_rail_${y}`, [5.45, 0.86, 0.12], [0, y + 0.48, 4.3], safety);
  }
  for (let step = 0; step < 7; step += 1) addBox(stairTower, `arrival_slice_stair_step_${step}`, [1.26, 0.14, 0.8], [-1.0 + step * 0.34, 0.48 + step * 0.28, 3.52], edge, [0, 0, -0.08]);

  const leftHall = new THREE.Group();
  leftHall.name = "arrival_slice_left_maintenance_hall";
  leftHall.position.set(-452, 0, 206);
  leftHall.rotation.y = -0.30;
  leftHall.userData.authoringRecord = { type: "detail", id: "arrival_slice_left_maintenance_hall", supportClass: "GROUND", depthMeters: 10, heightMeters: 9 };
  rebuild.add(leftHall);
  addBox(leftHall, "arrival_slice_left_hall_volume", [30, 8.8, 10], [0, 4.4, 0], new THREE.MeshStandardMaterial({ color: 0x625f58, roughness: 0.94, metalness: 0.12 }));
  addBox(leftHall, "arrival_slice_left_hall_plinth", [31.0, 0.68, 10.45], [0, 0.34, 0.08], concrete);
  addBox(leftHall, "arrival_slice_left_hall_roof", [31.4, 0.55, 10.35], [0, 9.08, 0], darkShell);
  for (const x of [-10.0, 0, 10.0]) {
    addBox(leftHall, `arrival_slice_left_rollup_${x}`, [6.8, 4.2, 0.18], [x, 2.95, 5.08], darkShell);
    addBox(leftHall, `arrival_slice_left_rollup_header_${x}`, [7.2, 0.2, 0.28], [x, 5.18, 5.28], edge);
    addBox(leftHall, `arrival_slice_left_rollup_canopy_${x}`, [7.7, 0.18, 1.3], [x, 5.38, 5.7], edge, [-0.08, 0, 0]);
    addBox(leftHall, `arrival_slice_left_rollup_light_${x}`, [0.76, 0.12, 0.18], [x, 4.86, 5.38], warm);
  }
  for (const x of [-11.2, -5.6, 0, 5.6, 11.2]) addBox(leftHall, `arrival_slice_left_front_pilaster_${x}`, [0.24, 8.2, 0.32], [x, 4.2, 5.3], darkShell);
  for (const x of [-7.8, 0, 7.8]) addBox(leftHall, `arrival_slice_left_upper_window_${x}`, [4.5, 1.55, 0.12], [x, 7.1, 5.1], glass);

  const serviceAnnex = new THREE.Group();
  serviceAnnex.name = "arrival_slice_service_annex";
  serviceAnnex.position.set(-410, 0, 205);
  serviceAnnex.rotation.y = -0.08;
  serviceAnnex.userData.authoringRecord = { type: "detail", id: "arrival_slice_service_annex", supportClass: "GROUND", anchor: "arrival_slice_service_yard", role: "volumetric gate-side service annex and route landmark" };
  rebuild.add(serviceAnnex);
  addBox(serviceAnnex, "arrival_slice_service_annex_volume", [9.5, 5.2, 5.8], [0, 2.6, 0], shell);
  addBox(serviceAnnex, "arrival_slice_service_annex_plinth", [10.1, 0.55, 6.15], [0, 0.28, 0.08], concrete);
  addBox(serviceAnnex, "arrival_slice_service_annex_roof", [10.3, 0.48, 6.25], [0, 5.44, 0], darkShell);
  addBox(serviceAnnex, "arrival_slice_service_annex_rollup", [5.4, 3.4, 0.18], [0, 2.38, 2.96], darkShell);
  addBox(serviceAnnex, "arrival_slice_service_annex_rollup_header", [5.8, 0.2, 0.28], [0, 4.2, 3.12], edge);
  addBox(serviceAnnex, "arrival_slice_service_annex_rollup_canopy", [6.15, 0.18, 0.9], [0, 4.4, 3.48], edge, [-0.08, 0, 0]);
  addBox(serviceAnnex, "arrival_slice_service_annex_safety_band", [5.1, 0.14, 0.12], [0, 1.5, 3.08], safety);
  addBox(serviceAnnex, "arrival_slice_service_annex_corner_return", [0.42, 4.6, 5.5], [4.55, 2.5, 0], darkShell);

  const gatehouse = new THREE.Group();
  gatehouse.name = "arrival_slice_entry_gatehouse";
  gatehouse.position.set(-405, 0, 236);
  gatehouse.rotation.y = roadHeading;
  gatehouse.userData.authoringRecord = { type: "detail", id: "arrival_slice_entry_gatehouse", supportClass: "GROUND", role: "closed perimeter entry cue and readable first drone deployment threshold", constructionRelation: "opens onto connector_arrival_road" };
  rebuild.add(gatehouse);
  addBox(gatehouse, "arrival_slice_gate_pillar_west", [1.25, 6.0, 1.25], [0, 3.0, -10.0], concrete);
  addBox(gatehouse, "arrival_slice_gate_pillar_east", [1.25, 6.0, 1.25], [0, 3.0, 10.0], concrete);
  addBox(gatehouse, "arrival_slice_gate_beam", [1.4, 0.6, 21.0], [0, 6.25, 0], darkShell);
  addBox(gatehouse, "arrival_slice_gate_beam_safety", [1.45, 0.16, 20.6], [0, 5.88, 0], safety);
  addBox(gatehouse, "arrival_slice_gate_booth", [4.4, 3.3, 3.2], [1.6, 1.65, -7.0], shell);
  addBox(gatehouse, "arrival_slice_gate_booth_glazing", [0.08, 1.35, 2.2], [-0.64, 2.2, -7.0], glass);
  addBox(gatehouse, "arrival_slice_gate_booth_canopy", [4.8, 0.18, 3.8], [1.6, 3.38, -7.0], edge);
  for (const z of [-11.8, -9.4, 9.4, 11.8]) {
    addBox(gatehouse, `arrival_slice_gate_marker_${z}`, [0.24, 1.2, 0.24], [0, 0.6, z], safety);
  }
  addSegment(gatehouse, "arrival_slice_gate_rail_west", { x: 0, z: -13.5 }, { x: 0, z: -24 }, 0.16, 1.25, edge, 0.72);
  addSegment(gatehouse, "arrival_slice_gate_rail_east", { x: 0, z: 13.5 }, { x: 0, z: 24 }, 0.16, 1.25, edge, 0.72);

  const road = new THREE.Group();
  road.name = "arrival_slice_road_treatment";
  road.userData.authoringRecord = { type: "detail", id: "arrival_slice_road_treatment", supportClass: "GROUND", role: "connector_arrival_road visual treatment" };
  rebuild.add(road);
  const roadGroundMaterial = new THREE.MeshStandardMaterial({ color: 0x2b3535, roughness: 0.96, metalness: 0.02 });
  const localGround = addBox(road, "arrival_slice_local_ground_pad", [154, 0.08, 116], [-389, 0.04, 235], roadGroundMaterial);
  localGround.userData.surfaceRole = "continuous local presentation ground for scoped arrival/service corridor";
  const roadPoints = [{ x: -462, z: 286 }, { x: -410, z: 238 }, { x: -388, z: 218 }, { x: -344, z: 178 }, { x: -300, z: 178 }];
  for (let index = 0; index < roadPoints.length - 1; index += 1) {
    const a = roadPoints[index];
    const b = roadPoints[index + 1];
    const dx = b.x - a.x;
    const dz = b.z - a.z;
    const length = Math.hypot(dx, dz);
    const nx = -dz / length;
    const nz = dx / length;
    addSegment(road, `arrival_slice_driving_surface_${index}`, a, b, 18, 0.08, asphaltEdge, 0.04);
    for (const side of [-1, 1]) {
      const offset = 7.25 * side;
      const sa = { x: a.x + nx * offset, z: a.z + nz * offset };
      const sb = { x: b.x + nx * offset, z: b.z + nz * offset };
      addSegment(road, `arrival_slice_sidewalk_${index}_${side < 0 ? "west" : "east"}`, sa, sb, 1.7, 0.16, concrete, 0.08);
      addSegment(road, `arrival_slice_curb_${index}_${side < 0 ? "west" : "east"}`, { x: sa.x - nx * 0.9, z: sa.z - nz * 0.9 }, { x: sb.x - nx * 0.9, z: sb.z - nz * 0.9 }, 0.34, 0.28, asphaltEdge, 0.14);
      addSegment(road, `arrival_slice_drain_${index}_${side < 0 ? "west" : "east"}`, { x: sa.x - nx * 1.28, z: sa.z - nz * 1.28 }, { x: sb.x - nx * 1.28, z: sb.z - nz * 1.28 }, 0.18, 0.08, darkShell, 0.04);
    }
    const steps = Math.max(2, Math.floor(length / 7));
    for (let step = 0; step < steps; step += 2) {
      const t0 = step / steps;
      const t1 = Math.min(1, (step + 0.9) / steps);
      addSegment(road, `arrival_slice_lane_mark_${index}_${step}`, { x: a.x + dx * t0, z: a.z + dz * t0 }, { x: a.x + dx * t1, z: a.z + dz * t1 }, 0.16, 0.035, marking, 0.018);
    }
  }

  const yard = new THREE.Group();
  yard.name = "arrival_slice_service_yard";
  yard.userData.authoringRecord = { type: "detail", id: "arrival_slice_service_yard", supportClass: "GROUND", role: "service staging and player-readable cover yard" };
  rebuild.add(yard);
  addBox(yard, "arrival_slice_yard_hardstand", [78, 0.10, 38], [-349, 0.05, 201], asphaltEdge);
  const serviceCabinet = new THREE.Group();
  serviceCabinet.name = "arrival_slice_service_cabinet";
  serviceCabinet.position.set(-388, 0, 199);
  serviceCabinet.rotation.y = -0.12;
  serviceCabinet.userData.authoringRecord = { type: "detail", id: "arrival_slice_service_cabinet", supportClass: "GROUND", anchor: "arrival_slice_service_yard", role: "functional service utility and orange safety waypoint" };
  yard.add(serviceCabinet);
  addBox(serviceCabinet, "arrival_slice_service_cabinet_base", [4.2, 0.16, 2.4], [0, 0.08, 0], concrete);
  addBox(serviceCabinet, "arrival_slice_service_cabinet_body", [3.6, 2.0, 1.6], [0, 1.12, 0], darkShell);
  addBox(serviceCabinet, "arrival_slice_service_cabinet_top", [3.8, 0.16, 1.8], [0, 2.2, 0], edge);
  addBox(serviceCabinet, "arrival_slice_service_cabinet_safety_band", [3.35, 0.14, 0.12], [0, 1.72, 0.84], safety);
  for (const x of [-1.0, 0, 1.0]) addBox(serviceCabinet, `arrival_slice_service_cabinet_vent_${x}`, [0.12, 0.56, 0.08], [x, 1.12, 0.83], edge);
  addBox(yard, "arrival_slice_yard_threshold_left", [5.8, 0.16, 1.1], [-369, 0.08, 208], concrete);
  addBox(yard, "arrival_slice_yard_threshold_mid", [5.8, 0.16, 1.1], [-357, 0.08, 197], concrete);
  addBox(yard, "arrival_slice_yard_threshold_right", [5.8, 0.16, 1.1], [-345, 0.08, 186], concrete);
  const coverClusters = [
    { x: -424, z: 236, yaw: 0.56, length: 6.4, depth: 2.35 },
    { x: -382, z: 188, yaw: -0.22, length: 5.8, depth: 2.2 },
    { x: -333, z: 190, yaw: 0.04, length: 6.1, depth: 2.45 },
  ];
  coverClusters.forEach((cover, index) => {
    const cluster = new THREE.Group();
    cluster.name = `arrival_slice_cover_cluster_${index}`;
    cluster.position.set(cover.x, 0, cover.z);
    cluster.rotation.y = cover.yaw;
    cluster.userData.visualLayer = "combat-cover-cluster";
    cluster.userData.authoringRecord = { type: "detail", id: `arrival_slice_cover_cluster_${index}`, supportClass: "GROUND", anchor: "arrival_slice_service_yard", role: "interleaved hard cover and route choice" };
    yard.add(cluster);
    addBox(cluster, `arrival_slice_cover_cluster_${index}_container`, [cover.length, 2.35, cover.depth], [0, 1.18, 0], shell);
    addBox(cluster, `arrival_slice_cover_cluster_${index}_base`, [cover.length + 0.22, 0.14, cover.depth + 0.18], [0, 0.07, 0], darkShell);
    addBox(cluster, `arrival_slice_cover_cluster_${index}_top_rail`, [cover.length + 0.18, 0.12, 0.12], [0, 2.28, cover.depth / 2 + 0.04], safety);
    for (const railX of [-cover.length * 0.38, 0, cover.length * 0.38]) {
      addBox(cluster, `arrival_slice_cover_cluster_${index}_rib_${railX}`, [0.12, 2.06, 0.12], [railX, 1.18, cover.depth / 2 + 0.06], edge);
    }
    addBox(cluster, `arrival_slice_cover_cluster_${index}_end_cap`, [0.14, 1.82, cover.depth - 0.2], [cover.length / 2 - 0.08, 1.16, 0], edge);
    addBox(cluster, `arrival_slice_cover_cluster_${index}_accent`, [cover.length * 0.72, 0.12, 0.12], [-cover.length * 0.08, 1.86, cover.depth / 2 + 0.08], safety);
  });

  const dronePerch = new THREE.Group();
  dronePerch.name = "arrival_slice_drone_perch";
  dronePerch.position.set(-371, 0, 224);
  dronePerch.rotation.y = roadHeading;
  dronePerch.userData.authoringRecord = { type: "detail", id: "arrival_slice_drone_perch", supportClass: "SUPPORTED", anchor: "arrival_slice_service_yard", role: "elevated drone sightline and counterplay perch" };
  rebuild.add(dronePerch);
  for (const x of [-1.35, 1.35]) {
    addBox(dronePerch, `arrival_slice_drone_perch_post_${x}`, [0.34, 5.3, 0.34], [x, 2.65, 0], darkShell);
    addBox(dronePerch, `arrival_slice_drone_perch_foot_${x}`, [0.86, 0.12, 0.86], [x, 0.06, 0], concrete);
  }
  addBox(dronePerch, "arrival_slice_drone_perch_platform", [3.3, 0.24, 2.4], [0, 5.3, 0], edge);
  addBox(dronePerch, "arrival_slice_drone_perch_safety_edge", [3.35, 0.16, 0.18], [0, 5.64, 1.65], safety);
  addBox(dronePerch, "arrival_slice_drone_perch_landing_marker", [0.18, 1.1, 0.18], [1.1, 6.12, 0], safety);
  addBox(dronePerch, "arrival_slice_drone_perch_access_ladder", [0.5, 4.1, 0.5], [-1.35, 2.35, 1.05], darkShell);

  const canopy = new THREE.Group();
  canopy.name = "arrival_slice_loading_canopy";
  canopy.position.set(-337, 0, 219);
  canopy.rotation.y = 0;
  canopy.userData.authoringRecord = { type: "detail", id: "arrival_slice_loading_canopy", supportClass: "SUPPORTED", anchor: "arrival_slice_right_service_hall", role: "loading-edge cover and service-lane route choice" };
  rebuild.add(canopy);
  addBox(canopy, "arrival_slice_loading_canopy_roof", [7.2, 0.28, 4.4], [0, 4.2, 0], edge);
  addBox(canopy, "arrival_slice_loading_canopy_safety_edge", [7.4, 0.16, 0.18], [0, 3.95, 2.1], safety);
  for (const x of [-3.0, 3.0]) {
    addBox(canopy, `arrival_slice_loading_canopy_post_${x}`, [0.34, 4.5, 0.34], [x, 1.95, 0], darkShell);
    addBox(canopy, `arrival_slice_loading_canopy_foot_${x}`, [0.9, 0.12, 0.9], [x, 0.06, 0], concrete);
  }
  addBox(canopy, "arrival_slice_loading_canopy_threshold", [5.8, 0.12, 0.9], [0, 0.06, 1.8], concrete);
  addBox(canopy, "arrival_slice_loading_canopy_worklight", [0.7, 0.14, 0.22], [0, 3.78, 0], warm);

  const rack = new THREE.Group();
  rack.name = "arrival_slice_supported_pipe_rack";
  rack.position.set(-374, 0, 225);
  rack.rotation.y = 0;
  rack.userData.authoringRecord = { type: "detail", id: "arrival_slice_supported_pipe_rack", supportClass: "ANCHORED", anchor: "arrival_slice_service_yard" };
  rebuild.add(rack);
  for (const x of [-3.0, 3.0]) {
    addBox(rack, `arrival_slice_pipe_rack_post_${x}`, [0.32, 5.2, 0.32], [x, 2.6, 0], darkShell);
    addBox(rack, `arrival_slice_pipe_rack_foot_${x}`, [0.9, 0.12, 0.9], [x, 0.06, 0], concrete);
  }
  addBox(rack, "arrival_slice_pipe_rack_header", [6.4, 0.22, 0.28], [0, 5.02, 0], edge);
  for (const z of [-1.25, 0, 1.25]) addBox(rack, `arrival_slice_pipe_rack_pipe_${z}`, [6.4, 0.22, 0.22], [0, 5.36, z], darkShell);

  const surveillance = new THREE.Group();
  surveillance.name = "arrival_slice_grounded_surveillance";
  surveillance.position.set(-379, 0, 181);
  surveillance.userData.authoringRecord = { type: "detail", id: "arrival_slice_grounded_surveillance", supportClass: "ANCHORED", anchor: "arrival_slice_service_yard", role: "destructible surveillance camera anchor" };
  rebuild.add(surveillance);
  addBox(surveillance, "arrival_slice_camera_foot", [1.1, 0.18, 1.1], [0, 0.09, 0], concrete);
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.18, 6.6, 12), darkShell);
  mast.name = "arrival_slice_camera_mast";
  mast.position.y = 3.48;
  mast.castShadow = fullQualityPresentation;
  mast.receiveShadow = true;
  surveillance.add(mast);
  addBox(surveillance, "arrival_slice_camera_head", [0.82, 0.42, 0.58], [0, 6.8, 0.18], darkShell, [0.08, 0.18, 0]);
  addBox(surveillance, "arrival_slice_camera_lens", [0.26, 0.22, 0.12], [0, 6.8, 0.5], warm, [0.08, 0.18, 0]);
  addBox(surveillance, "arrival_slice_camera_brace", [0.16, 1.2, 0.16], [0, 6.16, 0], edge, [0, 0, 0.08]);
}

function addEnvironmentDetail(record: (typeof environmentDetails)[number]) {
  const group = new THREE.Group();
  group.name = record.id;
  group.position.set(record.position.x, record.position.y, record.position.z);
  const authoringRecord = { type: "detail", ...record };
  group.userData.authoringRecord = authoringRecord;
  const detailMaterial = new THREE.MeshStandardMaterial({ color: record.color, roughness: 0.78, metalness: record.kind === "KILL_ZONE_WALL" || record.kind === "SECURITY_GATE" || record.kind === "LIGHT_POLE" || record.kind === "CAMERA_HOUSING" || record.kind === "PIPE_RACK" || record.kind === "COMBAT_COVER" ? 0.32 : 0.18 });
  const edgeMaterial = new THREE.LineBasicMaterial({ color: record.color, transparent: true, opacity: 0.88 });
  const addMesh = (mesh: THREE.Mesh) => {
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.userData.authoringRecord = authoringRecord;
    group.add(mesh);
    selectableObjects.push(mesh);
  };

  if (record.kind === "LIGHT_POLE") {
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.48, record.size.y, 8), detailMaterial);
    pole.position.y = record.size.y / 2;
    addMesh(pole);
    const arm = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.18, 0.18), detailMaterial);
    arm.position.set(1.35, record.size.y - 0.55, 0);
    addMesh(arm);
    const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.34, 0.42), new THREE.MeshStandardMaterial({ color: 0xffd28d, emissive: 0x6b3b18, emissiveIntensity: 0.7, roughness: 0.35, metalness: 0.1 }));
    lamp.position.set(2.85, record.size.y - 0.72, 0);
    addMesh(lamp);
  } else if (record.kind === "BOLLARD") {
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.72, 0.82, 0.2, 10), new THREE.MeshStandardMaterial({ color: 0x30383b, roughness: 0.9, metalness: 0.12 }));
    base.position.y = 0.1;
    addMesh(base);
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.42, record.size.y, 10), detailMaterial);
    post.position.y = record.size.y / 2 + 0.18;
    addMesh(post);
  } else if (record.kind === "TURRET_MOUNT") {
    const plinth = new THREE.Mesh(new THREE.CylinderGeometry(record.size.x * 0.56, record.size.x * 0.68, 0.65, 10), detailMaterial);
    plinth.position.y = 0.33;
    addMesh(plinth);
    const collar = new THREE.Mesh(new THREE.CylinderGeometry(record.size.x * 0.35, record.size.x * 0.42, 0.42, 10), new THREE.MeshStandardMaterial({ color: 0x292f31, roughness: 0.82, metalness: 0.42 }));
    collar.position.y = 0.86;
    addMesh(collar);
    const head = new THREE.Mesh(new THREE.SphereGeometry(record.size.x * 0.35, 12, 8), new THREE.MeshStandardMaterial({ color: record.color, roughness: 0.56, metalness: 0.34 }));
    head.position.y = 1.35;
    addMesh(head);
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.18, 2.1, 8), new THREE.MeshStandardMaterial({ color: 0x161b1c, roughness: 0.56, metalness: 0.62 }));
    barrel.rotation.z = Math.PI / 2;
    barrel.position.set(0.92, 1.42, 0);
    addMesh(barrel);
  } else if (record.kind === "UTILITY_CABINET") {
    const cabinet = new THREE.Mesh(new THREE.BoxGeometry(record.size.x, record.size.y, record.size.z), detailMaterial);
    cabinet.position.y = record.size.y / 2;
    addMesh(cabinet);
    const cap = new THREE.Mesh(new THREE.BoxGeometry(record.size.x + 0.18, 0.18, record.size.z + 0.18), new THREE.MeshStandardMaterial({ color: 0x30383b, roughness: 0.92, metalness: 0.2 }));
    cap.position.y = record.size.y + 0.09;
    addMesh(cap);
  } else if (record.kind === "CAMERA_HOUSING") {
    const support = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.14, 1.8, 8), detailMaterial);
    support.position.y = -0.9;
    addMesh(support);
    const housing = new THREE.Mesh(new THREE.BoxGeometry(record.size.x, record.size.y, record.size.z), detailMaterial);
    housing.position.y = record.size.y / 2;
    addMesh(housing);
    const lens = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.24, 0.38, 10), new THREE.MeshStandardMaterial({ color: 0x172329, roughness: 0.28, metalness: 0.58 }));
    lens.rotation.z = Math.PI / 2;
    lens.position.set(record.size.x * 0.62, record.size.y * 0.5, 0);
    addMesh(lens);
  } else if (record.kind === "SIGNAGE_FRAME") {
    const postGeometry = new THREE.BoxGeometry(0.28, record.size.y + 1.0, 0.28);
    for (const x of [-record.size.x * 0.42, record.size.x * 0.42]) {
      const post = new THREE.Mesh(postGeometry, detailMaterial);
      post.position.set(x, (record.size.y + 1.0) / 2, 0);
      addMesh(post);
    }
    const beam = new THREE.Mesh(new THREE.BoxGeometry(record.size.x, 0.34, 0.34), detailMaterial);
    beam.position.y = record.size.y + 0.82;
    addMesh(beam);
    const panel = new THREE.Mesh(new THREE.BoxGeometry(record.size.x * 0.82, record.size.y * 0.62, 0.12), new THREE.MeshStandardMaterial({ color: 0xa56a3a, emissive: 0x2b1709, emissiveIntensity: 0.22, roughness: 0.58, metalness: 0.12 }));
    panel.position.y = record.size.y * 0.55;
    addMesh(panel);
  } else if (record.kind === "DRAIN_CHANNEL") {
    const channel = new THREE.Mesh(new THREE.BoxGeometry(record.size.x, record.size.y, record.size.z), new THREE.MeshStandardMaterial({ color: 0x1d2426, roughness: 0.98, metalness: 0.02 }));
    channel.position.y = record.size.y / 2;
    addMesh(channel);
    const grate = new THREE.Mesh(new THREE.BoxGeometry(record.size.x * 0.9, 0.035, record.size.z * 0.62), new THREE.MeshStandardMaterial({ color: 0x566267, roughness: 0.78, metalness: 0.42 }));
    grate.position.y = record.size.y + 0.03;
    addMesh(grate);
  } else if (record.kind === "COMBAT_COVER") {
    const addCoverMesh = (mesh: THREE.Mesh, surface: "body" | "steel" | "warning") => {
      mesh.userData.coverSurface = surface;
      addMesh(mesh);
    };
    const width = record.size.x;
    const height = record.size.y;
    const depth = record.size.z;
    const isCrateStack = record.id === "detail_courtyard_cover_crates";

    if (isCrateStack) {
      const crateWidth = Math.min(3.3, width * 0.38);
      const crateDepth = Math.min(2.45, depth * 0.34);
      const crateHeight = Math.min(1.42, height * 0.44);
      const positions = [
        { x: -width * 0.25, z: -depth * 0.18, y: crateHeight / 2 },
        { x: width * 0.25, z: depth * 0.12, y: crateHeight / 2 },
        { x: -width * 0.08, z: depth * 0.18, y: crateHeight + crateHeight / 2 },
        { x: width * 0.33, z: -depth * 0.2, y: crateHeight + crateHeight / 2 },
      ];
      for (const position of positions) {
        const crate = new THREE.Mesh(new THREE.BoxGeometry(crateWidth, crateHeight, crateDepth), detailMaterial);
        crate.position.set(position.x, position.y, position.z);
        addCoverMesh(crate, "body");
        const lid = new THREE.Mesh(new THREE.BoxGeometry(crateWidth * 0.9, 0.12, crateDepth * 0.9), new THREE.MeshStandardMaterial({ color: 0x68736f, roughness: 0.72, metalness: 0.42 }));
        lid.position.set(position.x, position.y + crateHeight / 2 + 0.07, position.z);
        addCoverMesh(lid, "steel");
        for (const x of [-crateWidth * 0.37, crateWidth * 0.37]) {
          const guard = new THREE.Mesh(new THREE.BoxGeometry(0.1, crateHeight * 0.86, 0.1), new THREE.MeshStandardMaterial({ color: 0x4d5856, roughness: 0.68, metalness: 0.54 }));
          guard.position.set(position.x + x, position.y, position.z + crateDepth * 0.44);
          addCoverMesh(guard, "steel");
        }
      }
    } else {
      const lower = new THREE.Mesh(new THREE.BoxGeometry(width, height * 0.64, depth * 0.84), detailMaterial);
      lower.position.y = height * 0.32;
      addCoverMesh(lower, "body");
      const shoulder = new THREE.Mesh(new THREE.BoxGeometry(width * 0.9, height * 0.34, depth * 0.68), detailMaterial);
      shoulder.position.y = height * 0.8;
      addCoverMesh(shoulder, "body");
      const cap = new THREE.Mesh(new THREE.BoxGeometry(width * 0.94, 0.16, depth + 0.16), new THREE.MeshStandardMaterial({ color: 0x68736f, roughness: 0.72, metalness: 0.42 }));
      cap.position.y = height + 0.08;
      addCoverMesh(cap, "steel");
      for (const x of [-width * 0.36, width * 0.36]) {
        const liftingLoop = new THREE.Mesh(new THREE.TorusGeometry(Math.min(0.32, depth * 0.12), 0.06, 8, 12), new THREE.MeshStandardMaterial({ color: 0x4c5755, roughness: 0.68, metalness: 0.58 }));
        liftingLoop.rotation.x = Math.PI / 2;
        liftingLoop.position.set(x, height + 0.22, 0);
        addCoverMesh(liftingLoop, "steel");
        const marker = new THREE.Mesh(new THREE.BoxGeometry(0.32, Math.min(0.5, height * 0.28), depth + 0.2), new THREE.MeshStandardMaterial({ color: 0xb6773f, roughness: 0.66, metalness: 0.12 }));
        marker.position.set(x, height * 0.5, 0);
        addCoverMesh(marker, "warning");
      }
      if (record.id === "detail_tunnel_cover_barricade") {
        for (const y of [height * 0.44, height * 0.74]) {
          const rail = new THREE.Mesh(new THREE.BoxGeometry(width * 0.74, 0.16, depth + 0.24), new THREE.MeshStandardMaterial({ color: 0x566260, roughness: 0.68, metalness: 0.52 }));
          rail.position.y = y;
          addCoverMesh(rail, "steel");
        }
      }
      if (record.id === "detail_warehouse_cover_island") {
        addPressureYardCoverRhythm({ record, add: addCoverMesh });
      }
    }
  } else if (record.kind === "PIPE_RACK") {
    const uprightGeometry = new THREE.BoxGeometry(0.38, record.size.y, 0.38);
    for (const x of [-record.size.x * 0.42, record.size.x * 0.42]) {
      const upright = new THREE.Mesh(uprightGeometry, detailMaterial);
      upright.position.set(x, record.size.y / 2, 0);
      addMesh(upright);
    }
    const top = new THREE.Mesh(new THREE.BoxGeometry(record.size.x, 0.32, 0.4), detailMaterial);
    top.position.y = record.size.y - 0.18;
    addMesh(top);
    for (const y of [1.45, 2.35, 3.25]) {
      const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, record.size.x * 0.84, 10), new THREE.MeshStandardMaterial({ color: 0x89918a, roughness: 0.64, metalness: 0.54 }));
      pipe.rotation.z = Math.PI / 2;
      pipe.position.y = y;
      addMesh(pipe);
    }
  } else {
    const body = new THREE.Mesh(new THREE.BoxGeometry(record.size.x, record.size.y, record.size.z), detailMaterial);
    body.position.y = record.size.y / 2;
    addMesh(body);
    const edge = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(record.size.x, record.size.y, record.size.z)), edgeMaterial);
    edge.position.y = record.size.y / 2;
    edge.userData.authoringRecord = authoringRecord;
    group.add(edge);
    selectableObjects.push(edge);
    if (record.kind === "SECURITY_GATE") {
      const postGeometry = new THREE.BoxGeometry(0.8, record.size.y + 2, 0.8);
      for (const x of [-record.size.x * 0.42, record.size.x * 0.42]) {
        const post = new THREE.Mesh(postGeometry, detailMaterial);
        post.position.set(x, (record.size.y + 2) / 2, 0);
        addMesh(post);
      }
      const warning = new THREE.Mesh(new THREE.BoxGeometry(record.size.x * 0.76, 0.35, 0.36), new THREE.MeshStandardMaterial({ color: 0xd18b4e, roughness: 0.6, metalness: 0.12 }));
      warning.position.y = record.size.y + 1.5;
      addMesh(warning);
    }
  }

  detailObjects.push(group);
  objectById.set(record.id, group);
  scene.add(group);
}

function addPressurePlantSliceMesh(
  root: THREE.Group,
  record: PressurePlantSliceDetail,
  mesh: THREE.Mesh,
  role: string,
  hostSocket = record.hostSocket,
) {
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.userData.pressurePlantSlice = true;
  mesh.userData.pressurePlantDetailId = record.id;
  mesh.userData.authoringRecord = { type: "pressure-plant-detail", ...record, role, hostSocket };
  mesh.userData.supportClass = record.supportClass;
  mesh.userData.owner = record.hostId;
  mesh.userData.nonDisplaceable = record.tags.includes("NON_DISPLACEABLE");
  root.add(mesh);
  pressurePlantSliceObjects.push(mesh);
  selectableObjects.push(mesh);
}

const pressurePlantMaterialCache = new Map<string, THREE.MeshStandardMaterial>();

function pressureSliceMaterial(record: PressurePlantSliceDetail, colorOverride?: number, roughnessOverride?: number, metalnessOverride?: number) {
  const familyDefaults: Record<PressurePlantSliceDetail["materialFamily"], { roughness: number; metalness: number }> = {
    ASPHALT: { roughness: 0.94, metalness: 0.02 },
    CONCRETE: { roughness: 0.9, metalness: 0.04 },
    GALVANIZED_STEEL: { roughness: 0.58, metalness: 0.72 },
    PAINTED_STEEL: { roughness: 0.66, metalness: 0.46 },
    SOIL_ROCK: { roughness: 0.98, metalness: 0.01 },
    VEGETATION: { roughness: 0.92, metalness: 0.0 },
  };
  const defaults = familyDefaults[record.materialFamily];
  const color = colorOverride ?? record.color;
  const roughness = roughnessOverride ?? defaults.roughness;
  const metalness = metalnessOverride ?? defaults.metalness;
  const key = `${record.id}|${record.materialFamily}|${color}|${roughness}|${metalness}`;
  const cached = pressurePlantMaterialCache.get(key);
  if (cached) return cached;
  const material = new THREE.MeshStandardMaterial({ color, roughness, metalness });
  material.userData.pressurePlantMaterialFamily = record.materialFamily;
  pressurePlantMaterialCache.set(key, material);
  return material;
}

function addPressurePlantSliceGroundGrammar(root: THREE.Group) {
  const addSegmentedSlab = (record: PressurePlantSliceDetail, seamColor: number, columns: number, rows: number) => {
    const group = new THREE.Group();
    group.name = record.id;
    group.position.set(record.position.x, record.position.y, record.position.z);
    group.rotation.y = record.rotationY;
    group.userData.pressurePlantSlice = true;
    group.userData.authoringRecord = { type: "pressure-plant-detail", ...record };
    const tileGap = record.materialFamily === "ASPHALT" ? 0.22 : 0.16;
    const tileWidth = (record.size.x - tileGap * (columns - 1)) / columns;
    const tileDepth = (record.size.z - tileGap * (rows - 1)) / rows;
    const tileMaterial = pressureSliceMaterial(record);
    const servicePadMaterial = record.id === "slice_plant_apron_slab" ? pressureSliceMaterial(record, 0x3b4744, 0.94, 0.08) : tileMaterial;
    const mark = (mesh: THREE.Mesh, role: string) => {
      mesh.castShadow = false;
      mesh.receiveShadow = true;
      mesh.userData.pressurePlantSlice = true;
      mesh.userData.pressurePlantDetailId = record.id;
      mesh.userData.authoringRecord = { type: "pressure-plant-detail", ...record, role };
      group.add(mesh);
    };
    // Canonical connectors are authored in world space at x/z footprints
    // stair: [150,158]×[45,59] and ramp: [171,189]×[29,47].
    // Convert them to this apron group's local datum (216,65) so the raised
    // slab cannot bury the physical stair or ramp.
    const slabCutouts = record.id === "slice_plant_apron_slab"
      ? [
          { minX: -66.5, maxX: -57.5, minZ: -20.5, maxZ: -5.5 },
          { minX: -45.5, maxX: -26.5, minZ: -36.5, maxZ: -17.5 },
        ]
      : [];
    for (let column = 0; column < columns; column += 1) {
      for (let row = 0; row < rows; row += 1) {
        const tileMinX = -record.size.x / 2 + column * (tileWidth + tileGap);
        const tileMaxX = tileMinX + tileWidth;
        const tileMinZ = -record.size.z / 2 + row * (tileDepth + tileGap);
        const tileMaxZ = tileMinZ + tileDepth;
        const makeTile = (minX: number, maxX: number, minZ: number, maxZ: number, role: string, material = tileMaterial) => {
          const subWidth = maxX - minX;
          const subDepth = maxZ - minZ;
          if (subWidth < 0.3 || subDepth < 0.3) return;
          const tile = new THREE.Mesh(new RoundedBoxGeometry(subWidth, record.size.y, subDepth, 3, record.materialFamily === "ASPHALT" ? 0.08 : 0.12), material);
          tile.position.set((minX + maxX) / 2, record.size.y / 2, (minZ + maxZ) / 2);
          mark(tile, role);
        };
        const servicePad = record.id === "slice_plant_apron_slab" && row === rows - 1;
        const tileRole = servicePad ? `apron_service_bay_pad_${column + 1}` : `${record.materialFamily.toLowerCase()}_construction_tile_${column + 1}_${row + 1}`;
        const tileMaterialForCell = servicePad ? servicePadMaterial : tileMaterial;
        const activeCutouts = slabCutouts.filter((cutout) => cutout.maxX > tileMinX && cutout.minX < tileMaxX && cutout.maxZ > tileMinZ && cutout.minZ < tileMaxZ);
        if (activeCutouts.length === 0) {
          makeTile(tileMinX, tileMaxX, tileMinZ, tileMaxZ, tileRole, tileMaterialForCell);
        } else {
          const xCuts = [tileMinX, tileMaxX, ...activeCutouts.flatMap((cutout) => [Math.max(tileMinX, cutout.minX), Math.min(tileMaxX, cutout.maxX)])].sort((a, b) => a - b);
          const zCuts = [tileMinZ, tileMaxZ, ...activeCutouts.flatMap((cutout) => [Math.max(tileMinZ, cutout.minZ), Math.min(tileMaxZ, cutout.maxZ)])].sort((a, b) => a - b);
          let pieceIndex = 0;
          for (let xIndex = 0; xIndex < xCuts.length - 1; xIndex += 1) {
            for (let zIndex = 0; zIndex < zCuts.length - 1; zIndex += 1) {
              const pieceMinX = xCuts[xIndex];
              const pieceMaxX = xCuts[xIndex + 1];
              const pieceMinZ = zCuts[zIndex];
              const pieceMaxZ = zCuts[zIndex + 1];
              const centerX = (pieceMinX + pieceMaxX) / 2;
              const centerZ = (pieceMinZ + pieceMaxZ) / 2;
              const insideCutout = activeCutouts.some((cutout) => centerX > cutout.minX && centerX < cutout.maxX && centerZ > cutout.minZ && centerZ < cutout.maxZ);
              if (insideCutout) continue;
              makeTile(pieceMinX, pieceMaxX, pieceMinZ, pieceMaxZ, `${tileRole}_cutout_return_${pieceIndex + 1}`, tileMaterialForCell);
              pieceIndex += 1;
            }
          }
        }
      }
    }
    if (record.materialFamily === "ASPHALT") {
      addPressureYardGroundFinish({ group, record, pressureMaterial: pressureSliceMaterial });
      const wetPatchMaterial = new THREE.MeshStandardMaterial({ color: 0x1b292b, roughness: 0.22, metalness: 0.34, transparent: true, opacity: 0.68 });
      const patchSpecs = [
        { x: -42, z: -30, width: 15, depth: 2.8 },
        { x: -8, z: 12, width: 9, depth: 2.2 },
        { x: 24, z: -22, width: 18, depth: 3.1 },
        { x: 58, z: 28, width: 12, depth: 2.4 },
      ];
      patchSpecs.forEach((spec, index) => {
        const shape = new THREE.Shape();
        const halfWidth = spec.width / 2;
        const halfDepth = spec.depth / 2;
        shape.moveTo(-halfWidth, -halfDepth * 0.35);
        shape.lineTo(-halfWidth * 0.42, -halfDepth);
        shape.lineTo(halfWidth * 0.5, -halfDepth * 0.84);
        shape.lineTo(halfWidth, -halfDepth * 0.12);
        shape.lineTo(halfWidth * 0.68, halfDepth * 0.74);
        shape.lineTo(-halfWidth * 0.2, halfDepth);
        shape.lineTo(-halfWidth, halfDepth * 0.38);
        shape.closePath();
        const patch = new THREE.Mesh(new THREE.ShapeGeometry(shape), wetPatchMaterial);
        patch.rotation.x = -Math.PI / 2;
        patch.position.set(spec.x, record.size.y + 0.028, spec.z);
        mark(patch, `asphalt_wet_patch_${index + 1}`);
      });
    }
    if (slabCutouts.length > 0) {
      const voidEdgeMaterial = new THREE.MeshStandardMaterial({ color: 0x59635f, roughness: 0.82, metalness: 0.16 });
      const edgeSpecs = slabCutouts.flatMap((cutout, cutoutIndex) => [
        [cutout.minX, (cutout.minZ + cutout.maxZ) / 2, 0.16, cutout.maxZ - cutout.minZ, cutoutIndex],
        [cutout.maxX, (cutout.minZ + cutout.maxZ) / 2, 0.16, cutout.maxZ - cutout.minZ, cutoutIndex],
        [(cutout.minX + cutout.maxX) / 2, cutout.minZ, cutout.maxX - cutout.minX, 0.16, cutoutIndex],
        [(cutout.minX + cutout.maxX) / 2, cutout.maxZ, cutout.maxX - cutout.minX, 0.16, cutoutIndex],
      ] as const);
      edgeSpecs.forEach(([x, z, sx, sz, cutoutIndex], index) => {
        const edge = new THREE.Mesh(new RoundedBoxGeometry(sx, 0.12, sz, 3, 0.03), voidEdgeMaterial);
        edge.position.set(x, record.size.y + 0.06, z);
        mark(edge, `concrete_apron_connector_cutout_${cutoutIndex + 1}_edge_${index + 1}`);
      });
    }
    if (record.id === "slice_plant_apron_slab") {
      const edgeX = -record.size.x / 2 + 10.0;
      const apronWalk = new THREE.Mesh(new RoundedBoxGeometry(7.2, 0.22, 94.0, 6, 0.08), new THREE.MeshStandardMaterial({ color: 0x92938a, roughness: 0.88, metalness: 0.035 }));
      apronWalk.position.set(edgeX, record.size.y + 0.13, -2.0);
      mark(apronWalk, "apron_reference_west_service_sidewalk",);
      apronWalk.userData.authoringRecord = { type: "pressure-plant-detail", ...record, role: "apron_reference_west_service_sidewalk", materialFamily: "CONCRETE" };
      const apronCurb = new THREE.Mesh(new RoundedBoxGeometry(0.62, 0.42, 94.0, 5, 0.08), pressureSliceMaterial(record, 0xa6a59b, 0.82, 0.04));
      apronCurb.position.set(edgeX + 4.0, record.size.y + 0.22, -2.0);
      mark(apronCurb, "apron_reference_west_service_sidewalk_curb");
      apronCurb.userData.authoringRecord = { type: "pressure-plant-detail", ...record, role: "apron_reference_west_service_sidewalk_curb", materialFamily: "CONCRETE" };
      const greasyBed = new THREE.Mesh(new RoundedBoxGeometry(2.8, 0.12, 88.0, 5, 0.08), pressureSliceMaterial(record, 0x665545, 0.98, 0.01));
      greasyBed.position.set(edgeX - 4.0, record.size.y + 0.07, -2.0);
      mark(greasyBed, "apron_reference_west_compacted_greasy_dirt_bed");
      greasyBed.userData.authoringRecord = { type: "pressure-plant-detail", ...record, role: "apron_reference_west_compacted_greasy_dirt_bed", materialFamily: "SOIL_ROCK" };
      greasyBed.userData.materialFamily = "SOIL_ROCK";

      // Lower-grade right return: the existing apron stays the owner, while
      // this short two-segment sidewalk/curb/drain transition lands at the
      // projected service-court edge (world 108,70 -> 124,80 -> 140,90).
      const returnConcrete = new THREE.MeshStandardMaterial({ color: 0x8a8d85, roughness: 0.9, metalness: 0.035 });
      const returnCurbMaterial = new THREE.MeshStandardMaterial({ color: 0x6f756f, roughness: 0.86, metalness: 0.08 });
      const returnDrainMaterial = new THREE.MeshStandardMaterial({ color: 0x222b2b, roughness: 0.94, metalness: 0.34 });
      const returnSegments = [
        { start: [108, 70] as const, end: [124, 80] as const, suffix: "west" },
        { start: [124, 80] as const, end: [140, 90] as const, suffix: "east" },
      ];
      returnSegments.forEach(({ start, end, suffix }) => {
        const dx = end[0] - start[0];
        const dz = end[1] - start[1];
        const length = Math.hypot(dx, dz);
        const rotationY = Math.atan2(dx, dz);
        const centerX = (start[0] + end[0]) / 2 - record.position.x;
        const centerZ = (start[1] + end[1]) / 2 - record.position.z;
        const sidewalk = new THREE.Mesh(new RoundedBoxGeometry(4.6, 0.20, length, 5, 0.06), returnConcrete);
        sidewalk.position.set(centerX, 0.10 - record.position.y, centerZ);
        sidewalk.rotation.y = rotationY;
        mark(sidewalk, `apron_integrated_right_return_${suffix}_sidewalk`);
        sidewalk.userData.authoringRecord = { type: "pressure-plant-detail", ...record, role: `apron_integrated_right_return_${suffix}_sidewalk`, materialFamily: "CONCRETE" };
        const curb = new THREE.Mesh(new RoundedBoxGeometry(0.62, 0.42, length + 0.18, 5, 0.07), returnCurbMaterial);
        curb.position.set(centerX + Math.cos(rotationY) * 2.38, 0.21 - record.position.y, centerZ - Math.sin(rotationY) * 2.38);
        curb.rotation.y = rotationY;
        mark(curb, `apron_integrated_right_return_${suffix}_curb`);
        const drain = new THREE.Mesh(new RoundedBoxGeometry(0.18, 0.07, length - 0.18, 3, 0.025), returnDrainMaterial);
        drain.position.set(centerX + Math.cos(rotationY) * 1.95, 0.34 - record.position.y, centerZ - Math.sin(rotationY) * 1.95);
        drain.rotation.y = rotationY;
        mark(drain, `apron_integrated_right_return_${suffix}_slot_drain`);
      });
    }
    const jointMaterial = new THREE.MeshStandardMaterial({ color: seamColor, roughness: 0.96, metalness: 0.02 });
    for (let column = 1; column < columns; column += 1) {
      const joint = new THREE.Mesh(new THREE.BoxGeometry(tileGap * 0.34, 0.035, record.size.z - 0.08), jointMaterial);
      joint.position.set(-record.size.x / 2 + column * tileWidth + (column - 0.5) * tileGap, record.size.y + 0.02, 0);
      mark(joint, "construction_expansion_joint_longitudinal");
    }
    for (let row = 1; row < rows; row += 1) {
      const joint = new THREE.Mesh(new THREE.BoxGeometry(record.size.x - 0.08, 0.035, tileGap * 0.34), jointMaterial);
      joint.position.set(0, record.size.y + 0.021, -record.size.z / 2 + row * tileDepth + (row - 0.5) * tileGap);
      mark(joint, "construction_expansion_joint_transverse");
    }
    root.add(group);
    pressurePlantSliceObjects.push(group);
    objectById.set(record.id, group);
  };

  const asphalt = pressurePlantSliceDetails.find((record) => record.id === "slice_pressure_asphalt_lane");
  const apron = pressurePlantSliceDetails.find((record) => record.id === "slice_plant_apron_slab");
  if (asphalt) addSegmentedSlab(asphalt, 0x1f2929, 4, 4);
  if (apron) addSegmentedSlab(apron, 0x4d514d, 3, 2);

  const curb = pressurePlantSliceDetails.find((record) => record.id === "slice_pressure_curb_west_return");
  if (curb) {
    const group = new THREE.Group();
    group.name = curb.id;
    group.position.set(curb.position.x, curb.position.y, curb.position.z);
    group.rotation.y = curb.rotationY;
    group.userData.pressurePlantSlice = true;
    group.userData.authoringRecord = { type: "pressure-plant-detail", ...curb };
    const curbMaterial = pressureSliceMaterial(curb, 0xa4a59d, 0.84, 0.06);
    const curbHeight = Math.max(curb.size.y, 0.34);
    const main = new THREE.Mesh(new RoundedBoxGeometry(curb.size.x, curbHeight, curb.size.z + 0.04, 4, 0.07), curbMaterial);
    main.position.y = curbHeight / 2;
    main.castShadow = true;
    main.receiveShadow = true;
    main.userData.pressurePlantSlice = true;
    main.userData.pressurePlantDetailId = curb.id;
    main.userData.authoringRecord = { type: "pressure-plant-detail", ...curb, role: "profiled_raised_curb" };
    group.add(main);
    const capMaterial = new THREE.MeshStandardMaterial({ color: 0xc4c0ae, roughness: 0.72, metalness: 0.08 });
    const cap = new THREE.Mesh(new RoundedBoxGeometry(curb.size.x - 0.18, 0.055, curb.size.z + 0.08, 4, 0.025), capMaterial);
    cap.position.set(0, curbHeight + 0.025, 0);
    cap.userData.pressurePlantSlice = true;
    cap.userData.pressurePlantDetailId = curb.id;
    cap.userData.authoringRecord = { type: "pressure-plant-detail", ...curb, role: "curb_light_coping" };
    group.add(cap);
    const shoulderMaterial = new THREE.MeshStandardMaterial({ color: 0xa9a79b, roughness: 0.84, metalness: 0.04 });
    const shoulder = new THREE.Mesh(new RoundedBoxGeometry(curb.size.x - 0.7, 0.16, 18.0, 4, 0.06), shoulderMaterial);
    shoulder.position.set(0, 0.08, curb.size.z / 2 + 9.0);
    shoulder.castShadow = true;
    shoulder.receiveShadow = true;
    shoulder.userData.pressurePlantSlice = true;
    shoulder.userData.pressurePlantDetailId = curb.id;
    shoulder.userData.authoringRecord = { type: "pressure-plant-detail", ...curb, role: "camera_facing_service_shoulder" };
    group.add(shoulder);
    const shoulderEdge = new THREE.Mesh(new RoundedBoxGeometry(curb.size.x - 0.76, 0.045, 0.14, 3, 0.025), capMaterial);
    shoulderEdge.position.set(0, 0.185, curb.size.z / 2 + 18.12);
    shoulderEdge.userData.pressurePlantSlice = true;
    shoulderEdge.userData.pressurePlantDetailId = curb.id;
    shoulderEdge.userData.authoringRecord = { type: "pressure-plant-detail", ...curb, role: "service_shoulder_edge_band" };
    group.add(shoulderEdge);
    const shoulderJointMaterial = new THREE.MeshStandardMaterial({ color: 0x666c66, roughness: 0.96, metalness: 0.02 });
    for (let index = 1; index < 6; index += 1) {
      const joint = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.032, 17.0), shoulderJointMaterial);
      joint.position.set(-curb.size.x / 2 + index * curb.size.x / 6, 0.17, curb.size.z / 2 + 9.0);
      joint.userData.pressurePlantSlice = true;
      joint.userData.pressurePlantDetailId = curb.id;
      joint.userData.authoringRecord = { type: "pressure-plant-detail", ...curb, role: "service_shoulder_expansion_joint" };
      group.add(joint);
    }
    const gutterMaterial = new THREE.MeshStandardMaterial({ color: 0x283234, roughness: 0.92, metalness: 0.18 });
    const gutter = new THREE.Mesh(new RoundedBoxGeometry(curb.size.x - 0.24, 0.065, 0.24, 3, 0.025), gutterMaterial);
    gutter.position.set(0, 0.055, curb.size.z / 2 + 0.16);
    gutter.userData.pressurePlantSlice = true;
    gutter.userData.pressurePlantDetailId = curb.id;
    gutter.userData.authoringRecord = { type: "pressure-plant-detail", ...curb, role: "asphalt_side_drainage_gutter" };
    group.add(gutter);
    const slotMaterial = new THREE.MeshStandardMaterial({ color: 0x9aa099, roughness: 0.68, metalness: 0.66 });
    for (let index = 0; index < 10; index += 1) {
      const slot = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.022, 0.18), slotMaterial);
      slot.position.set(-curb.size.x / 2 + 4.6 + index * 8.1, 0.091, curb.size.z / 2 + 0.16);
      slot.userData.pressurePlantSlice = true;
      slot.userData.pressurePlantDetailId = curb.id;
      slot.userData.authoringRecord = { type: "pressure-plant-detail", ...curb, role: "curb_gutter_grate_slot" };
      group.add(slot);
    }
    const returnGeometry = new RoundedBoxGeometry(0.42, curbHeight, 14, 4, 0.07);
    for (const localX of [-curb.size.x / 2, curb.size.x / 2]) {
      const returned = new THREE.Mesh(returnGeometry, curbMaterial);
      returned.position.set(localX, curbHeight / 2, localX < 0 ? 6.7 : -6.7);
      returned.castShadow = true;
      returned.receiveShadow = true;
      returned.userData.pressurePlantSlice = true;
      returned.userData.pressurePlantDetailId = curb.id;
      returned.userData.authoringRecord = { type: "pressure-plant-detail", ...curb, role: "curb_return" };
      group.add(returned);
    }
    root.add(group);
    pressurePlantSliceObjects.push(group);
    objectById.set(curb.id, group);
  }

  const sidewalk = pressurePlantSliceDetails.find((record) => record.id === "slice_plant_sidewalk_threshold");
  if (sidewalk) {
    const group = new THREE.Group();
    group.name = sidewalk.id;
    group.position.set(sidewalk.position.x, sidewalk.position.y, sidewalk.position.z);
    group.rotation.y = sidewalk.rotationY;
    group.userData.pressurePlantSlice = true;
    group.userData.authoringRecord = { type: "pressure-plant-detail", ...sidewalk };
    const walk = new THREE.Mesh(new RoundedBoxGeometry(sidewalk.size.x, sidewalk.size.y, sidewalk.size.z, 4, 0.06), pressureSliceMaterial(sidewalk));
    walk.position.y = sidewalk.size.y / 2;
    walk.castShadow = true;
    walk.receiveShadow = true;
    walk.userData.pressurePlantSlice = true;
    walk.userData.pressurePlantDetailId = sidewalk.id;
    walk.userData.authoringRecord = { type: "pressure-plant-detail", ...sidewalk, role: "segmented_pedestrian_strip" };
    group.add(walk);
    for (let index = 1; index < 6; index += 1) {
      const joint = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.03, sidewalk.size.z * 0.9), new THREE.MeshStandardMaterial({ color: 0x565c58, roughness: 0.95 }));
      joint.position.set(-sidewalk.size.x / 2 + index * sidewalk.size.x / 6, sidewalk.size.y + 0.025, 0);
      joint.userData.pressurePlantSlice = true;
      joint.userData.pressurePlantDetailId = sidewalk.id;
      joint.userData.authoringRecord = { type: "pressure-plant-detail", ...sidewalk, role: "sidewalk_expansion_joint" };
      group.add(joint);
    }
    root.add(group);
    pressurePlantSliceObjects.push(group);
    objectById.set(sidewalk.id, group);
  }

  const drain = pressurePlantSliceDetails.find((record) => record.id === "slice_pressure_drain_edge");
  if (drain) {
    const group = new THREE.Group();
    group.name = drain.id;
    const drainVisualOffset = { x: -11, y: 0, z: 8 };
    group.position.set(drain.position.x + drainVisualOffset.x, drain.position.y + drainVisualOffset.y, drain.position.z + drainVisualOffset.z);
    group.rotation.y = drain.rotationY;
    group.userData.pressurePlantSlice = true;
    group.userData.hostRelativeVisualOffset = drainVisualOffset;
    group.userData.authoringRecord = { type: "pressure-plant-detail", ...drain, visualHostOffset: drainVisualOffset };
    const channel = new THREE.Mesh(new RoundedBoxGeometry(drain.size.x, drain.size.y, drain.size.z, 3, 0.04), pressureSliceMaterial(drain, 0x243033, 0.96, 0.48));
    channel.position.y = drain.size.y / 2;
    channel.userData.pressurePlantSlice = true;
    channel.userData.pressurePlantDetailId = drain.id;
    channel.userData.authoringRecord = { type: "pressure-plant-detail", ...drain, role: "drain_channel_profile" };
    group.add(channel);
    const grateMaterial = pressureSliceMaterial(drain, 0x8b948f, 0.72, 0.62);
    for (let index = 0; index < 12; index += 1) {
      const bar = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.05, drain.size.z * 0.76), grateMaterial);
      bar.position.set(-drain.size.x / 2 + 2 + index * 3.8, drain.size.y + 0.04, 0);
      bar.userData.pressurePlantSlice = true;
      bar.userData.pressurePlantDetailId = drain.id;
      bar.userData.authoringRecord = { type: "pressure-plant-detail", ...drain, role: "drain_grate_bar" };
      group.add(bar);
    }
    root.add(group);
    pressurePlantSliceObjects.push(group);
    objectById.set(drain.id, group);
  }
}

function makePressurePlantRampGeometry(width: number, height: number, depth: number) {
  const w = width / 2;
  const d = depth / 2;
  const positions = new Float32Array([
    -w, 0, d, w, 0, d, -w, 0, -d, w, 0, -d,
    -w, height, -d, w, height, -d,
  ]);
  const indices = [
    4, 1, 5, 4, 0, 1,
    0, 4, 2,
    1, 3, 5,
    2, 5, 3, 2, 4, 5,
    0, 2, 3, 0, 3, 1,
  ];
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

function addPressurePlantGradeInterfaces(root: THREE.Group) {
  const ramp = pressurePlantSliceDetails.find((record) => record.id === "slice_threshold_ramp_interface");
  if (ramp) {
    const group = new THREE.Group();
    group.name = ramp.id;
    group.position.set(ramp.position.x, ramp.position.y, ramp.position.z);
    group.rotation.y = ramp.rotationY;
    group.userData.pressurePlantSlice = true;
    group.userData.authoringRecord = { type: "pressure-plant-detail", ...ramp };
    const rampMesh = new THREE.Mesh(makePressurePlantRampGeometry(ramp.size.x, ramp.size.y, ramp.size.z), pressureSliceMaterial(ramp));
    addPressurePlantSliceMesh(root, ramp, rampMesh, "supported_service_ramp");
    group.add(rampMesh);
    const edgeMaterial = new THREE.MeshStandardMaterial({ color: 0x9ca59d, roughness: 0.72, metalness: 0.22 });
    const edgeAngle = Math.atan2(ramp.size.y, ramp.size.z);
    for (const sideX of [-ramp.size.x / 2 + 0.18, ramp.size.x / 2 - 0.18]) {
      const side = new THREE.Mesh(new RoundedBoxGeometry(0.42, 0.34, ramp.size.z + 0.2, 3, 0.05), edgeMaterial);
      side.position.set(sideX, ramp.size.y / 2 + 0.24, 0);
      side.rotation.x = edgeAngle;
      side.userData.pressurePlantSlice = true;
      side.userData.pressurePlantDetailId = ramp.id;
      side.userData.authoringRecord = { type: "pressure-plant-detail", ...ramp, role: "ramp_sloped_edge_marker" };
      group.add(side);
    }
    const lowLanding = new THREE.Mesh(new RoundedBoxGeometry(ramp.size.x + 0.6, 0.18, 1.4, 4, 0.04), edgeMaterial);
    lowLanding.position.set(0, 0.09, ramp.size.z / 2 + 0.5);
    lowLanding.userData.pressurePlantSlice = true;
    lowLanding.userData.pressurePlantDetailId = ramp.id;
    lowLanding.userData.authoringRecord = { type: "pressure-plant-detail", ...ramp, role: "ramp_low_landing" };
    group.add(lowLanding);
    const highLanding = new THREE.Mesh(new RoundedBoxGeometry(ramp.size.x + 0.6, 0.18, 1.4, 4, 0.04), edgeMaterial);
    highLanding.position.set(0, ramp.size.y + 0.09, -ramp.size.z / 2 - 0.5);
    highLanding.userData.pressurePlantSlice = true;
    highLanding.userData.pressurePlantDetailId = ramp.id;
    highLanding.userData.authoringRecord = { type: "pressure-plant-detail", ...ramp, role: "ramp_high_landing_to_apron" };
    group.add(highLanding);
    const jointMaterial = new THREE.MeshStandardMaterial({ color: 0x535a56, roughness: 0.94, metalness: 0.02 });
    const rampSlopeAngle = Math.atan2(ramp.size.y, ramp.size.z);
    for (let index = 1; index < 6; index += 1) {
      const localZ = -ramp.size.z / 2 + index * ramp.size.z / 6;
      const localY = ramp.size.y / 2 - (ramp.size.y / ramp.size.z) * localZ;
      const joint = new THREE.Mesh(new RoundedBoxGeometry(ramp.size.x - 1.0, 0.055, 0.18, 3, 0.025), jointMaterial);
      joint.position.set(0, localY + 0.035, localZ);
      joint.rotation.x = rampSlopeAngle;
      joint.userData.pressurePlantSlice = true;
      joint.userData.pressurePlantDetailId = ramp.id;
      joint.userData.authoringRecord = { type: "pressure-plant-detail", ...ramp, role: `ramp_expansion_joint_${index}` };
      group.add(joint);
    }
    const runoffMaterial = new THREE.MeshStandardMaterial({ color: 0x293436, roughness: 0.94, metalness: 0.2 });
    const runoffChannel = new THREE.Mesh(new RoundedBoxGeometry(ramp.size.x - 1.2, 0.07, 0.36, 3, 0.025), runoffMaterial);
    runoffChannel.position.set(0, 0.13, ramp.size.z / 2 + 0.02);
    runoffChannel.userData.pressurePlantSlice = true;
    runoffChannel.userData.pressurePlantDetailId = ramp.id;
    runoffChannel.userData.authoringRecord = { type: "pressure-plant-detail", ...ramp, role: "ramp_low_end_runoff_channel" };
    group.add(runoffChannel);
    const apronCoping = new THREE.Mesh(new RoundedBoxGeometry(ramp.size.x - 1.0, 0.11, 0.32, 3, 0.025), edgeMaterial);
    apronCoping.position.set(0, ramp.size.y + 0.23, -ramp.size.z / 2 + 0.04);
    apronCoping.userData.pressurePlantSlice = true;
    apronCoping.userData.pressurePlantDetailId = ramp.id;
    apronCoping.userData.authoringRecord = { type: "pressure-plant-detail", ...ramp, role: "ramp_apron_coping" };
    group.add(apronCoping);
    root.add(group);
    pressurePlantSliceObjects.push(group);
    objectById.set(ramp.id, group);
  }

  const stairs = pressurePlantSliceDetails.find((record) => record.id === "slice_plant_stair_interface");
  if (stairs) {
    const group = new THREE.Group();
    group.name = stairs.id;
    group.position.set(stairs.position.x, stairs.position.y, stairs.position.z);
    group.rotation.y = stairs.rotationY;
    group.userData.pressurePlantSlice = true;
    group.userData.authoringRecord = { type: "pressure-plant-detail", ...stairs };
    const treadMaterial = pressureSliceMaterial(stairs, 0x596963, 0.94, 0.04);
    const riserMaterial = pressureSliceMaterial(stairs, 0x36433f, 0.97, 0.02);
    const stepCount = 30;
    const riserHeight = stairs.size.y / stepCount;
    const treadDepth = stairs.size.z / stepCount;
    for (let index = 0; index < stepCount; index += 1) {
      const topY = riserHeight * (index + 1);
      const tread = new THREE.Mesh(new RoundedBoxGeometry(stairs.size.x, riserHeight, treadDepth + 0.02, 3, 0.025), treadMaterial);
      tread.position.set(0, topY - riserHeight / 2, -stairs.size.z / 2 + treadDepth * (index + 0.5));
      tread.userData.pressurePlantSlice = true;
      tread.userData.pressurePlantDetailId = stairs.id;
      tread.userData.authoringRecord = { type: "pressure-plant-detail", ...stairs, role: `stair_tread_surface_${index + 1}` };
      tread.castShadow = false;
      tread.receiveShadow = true;
      group.add(tread);
      const riser = new THREE.Mesh(new THREE.BoxGeometry(stairs.size.x, riserHeight, 0.10), riserMaterial);
      riser.position.set(0, topY - riserHeight / 2, -stairs.size.z / 2 + treadDepth * (index + 1) - 0.05);
      riser.userData.pressurePlantSlice = true;
      riser.userData.pressurePlantDetailId = stairs.id;
      riser.userData.authoringRecord = { type: "pressure-plant-detail", ...stairs, role: `stair_riser_face_${index + 1}` };
      riser.castShadow = false;
      riser.receiveShadow = true;
      group.add(riser);
    }
    const stringerMaterial = new THREE.MeshStandardMaterial({ color: 0x303f40, roughness: 0.84, metalness: 0.4 });
    stringerMaterial.userData.pressurePlantMaterialFamily = "PAINTED_STEEL";
    const nosingMaterial = pressureSliceMaterial(stairs, 0x58645f, 0.9, 0.08);
    for (let index = 0; index < stepCount; index += 1) {
      if (index % 5 !== 4 && index !== stepCount - 1) continue;
      const nosing = new THREE.Mesh(new RoundedBoxGeometry(stairs.size.x + 0.10, 0.07, 0.10, 3, 0.025), nosingMaterial);
      nosing.position.set(0, riserHeight * (index + 1) + 0.035, -stairs.size.z / 2 + treadDepth * (index + 1) - 0.05);
      nosing.userData.pressurePlantSlice = true;
      nosing.userData.pressurePlantDetailId = stairs.id;
      nosing.userData.authoringRecord = { type: "pressure-plant-detail", ...stairs, role: `stair_nosing_${index + 1}` };
      group.add(nosing);
    }
    const stairSlopeAngle = Math.atan2(stairs.size.y, stairs.size.z);
    const stairSurfaceY = (localZ: number) => stairs.size.y * (localZ + stairs.size.z / 2) / stairs.size.z;
    for (const sideX of [-stairs.size.x / 2 - 0.16, stairs.size.x / 2 + 0.16]) {
      const stringer = new THREE.Mesh(new RoundedBoxGeometry(0.38, 0.32, stairs.size.z + 0.3, 4, 0.06), stringerMaterial);
      stringer.position.set(sideX, stairs.size.y / 2, 0);
      stringer.rotation.x = -stairSlopeAngle;
      stringer.userData.pressurePlantSlice = true;
      stringer.userData.pressurePlantDetailId = stairs.id;
      stringer.userData.authoringRecord = { type: "pressure-plant-detail", ...stairs, role: "stair_sloped_stringer", materialFamily: "PAINTED_STEEL" };
      stringer.castShadow = true;
      stringer.receiveShadow = true;
      group.add(stringer);
      const railMaterial = pressureSliceMaterial(stairs, 0x2b3a3c, 0.7, 0.68);
      const railPostGeometry = new THREE.CylinderGeometry(0.045, 0.06, 1.2, 10);
      for (const postIndex of [0, 10, 20, 29]) {
        const localZ = -stairs.size.z / 2 + (postIndex + 0.5) * treadDepth;
        const railPost = new THREE.Mesh(railPostGeometry, railMaterial);
        railPost.position.set(sideX, stairSurfaceY(localZ) + 0.6, localZ);
        railPost.userData.pressurePlantSlice = true;
        railPost.userData.pressurePlantDetailId = stairs.id;
        railPost.userData.authoringRecord = { type: "pressure-plant-detail", ...stairs, role: "stair_handrail_post" };
        group.add(railPost);
      }
      const railZ = [-stairs.size.z / 2 + 0.35, -stairs.size.z * 0.18, stairs.size.z * 0.18, stairs.size.z / 2 - 0.35];
      const rail = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(railZ.map((localZ) => new THREE.Vector3(sideX, stairSurfaceY(localZ) + 1.2, localZ))), 16, 0.075, 8, false), railMaterial);
      rail.userData.pressurePlantSlice = true;
      rail.userData.pressurePlantDetailId = stairs.id;
      rail.userData.authoringRecord = { type: "pressure-plant-detail", ...stairs, role: "stair_handrail" };
      group.add(rail);
    }
    const landing = new THREE.Mesh(new RoundedBoxGeometry(stairs.size.x + 0.8, 0.18, 4.0, 4, 0.05), treadMaterial);
    landing.position.set(0, stairs.size.y - 0.09, stairs.size.z / 2 + 0.55);
    landing.userData.pressurePlantSlice = true;
    landing.userData.pressurePlantDetailId = stairs.id;
    landing.userData.authoringRecord = { type: "pressure-plant-detail", ...stairs, role: "stair_top_landing_to_sidewalk" };
    landing.castShadow = true;
    landing.receiveShadow = true;
    group.add(landing);
    root.add(group);
    pressurePlantSliceObjects.push(group);
    objectById.set(stairs.id, group);
  }
}

function addPressurePlantLight(root: THREE.Group, record: PressurePlantSliceDetail) {
  const group = new THREE.Group();
  group.name = record.id;
  const visualPosition = record.id === "slice_pressure_light_pole"
    ? { x: 103.0, y: record.position.y, z: 70.0 }
    : record.position;
  group.position.set(visualPosition.x, visualPosition.y, visualPosition.z);
  group.rotation.y = record.rotationY;
  group.userData.pressurePlantSlice = true;
  group.userData.authoringRecord = {
    type: "pressure-plant-detail",
    ...record,
    visualHostOffset: {
      x: visualPosition.x - record.position.x,
      y: visualPosition.y - record.position.y,
      z: visualPosition.z - record.position.z,
    },
  };
  const base = new THREE.Mesh(new RoundedBoxGeometry(1.5, 0.18, 1.5, 3, 0.08), pressureSliceMaterial(record, 0x303938, 0.76, 0.6));
  base.position.y = 0.09;
  addPressurePlantSliceMesh(root, record, base, "light_baseplate");
  group.add(base);
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.38, record.size.y - 0.6, 16), pressureSliceMaterial(record, 0x53605d, 0.72, 0.46));
  shaft.position.y = record.size.y / 2;
  addPressurePlantSliceMesh(root, record, shaft, "light_pole");
  group.add(shaft);
  for (const side of [-1, 1]) {
    const gusset = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.95, 0.38), pressureSliceMaterial(record, 0x343f3f, 0.68, 0.58));
    gusset.position.set(side * 0.42, 0.56, 0);
    gusset.rotation.z = side * 0.44;
    addPressurePlantSliceMesh(root, record, gusset, "light_base_gusset");
    group.add(gusset);
  }
  for (const [x, z] of [[-0.48, -0.48], [0.48, -0.48], [-0.48, 0.48], [0.48, 0.48]] as const) {
    const bolt = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.035, 10), pressureSliceMaterial(record, 0xa5aaa1, 0.68, 0.7));
    bolt.position.set(x, 0.2, z);
    addPressurePlantSliceMesh(root, record, bolt, "light_base_bolt");
    group.add(bolt);
  }
  const arm = new THREE.Mesh(new RoundedBoxGeometry(3.4, 0.2, 0.24, 4, 0.06), pressureSliceMaterial(record, 0x3b4746, 0.62, 0.58));
  arm.position.set(1.42, record.size.y - 0.72, 0);
  addPressurePlantSliceMesh(root, record, arm, "light_arm");
  group.add(arm);
  const lampHousing = new THREE.Mesh(new RoundedBoxGeometry(1.05, 0.42, 0.62, 4, 0.09), pressureSliceMaterial(record, 0x384645, 0.62, 0.58));
  lampHousing.position.set(2.9, record.size.y - 0.82, 0);
  addPressurePlantSliceMesh(root, record, lampHousing, "luminaire_housing");
  group.add(lampHousing);
  const lamp = new THREE.Mesh(new RoundedBoxGeometry(0.7, 0.08, 0.4, 3, 0.03), new THREE.MeshStandardMaterial({ color: 0xffd9a3, emissive: 0x7a5a28, emissiveIntensity: 0.7, roughness: 0.3, metalness: 0.05 }));
  lamp.position.set(2.9, record.size.y - 1.06, 0);
  lamp.userData.pressurePlantSlice = true;
  lamp.userData.pressurePlantDetailId = record.id;
  lamp.userData.authoringRecord = { type: "pressure-plant-detail", ...record, role: "shielded_luminaire_emitter" };
  group.add(lamp);
  const lampGuard = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.72, 12, 1, true), pressureSliceMaterial(record, 0x242f2f, 0.6, 0.64));
  lampGuard.rotation.z = Math.PI / 2;
  lampGuard.position.set(3.2, record.size.y - 0.84, 0);
  lampGuard.userData.pressurePlantSlice = true;
  lampGuard.userData.pressurePlantDetailId = record.id;
  lampGuard.userData.authoringRecord = { type: "pressure-plant-detail", ...record, role: "luminaire_guard" };
  group.add(lampGuard);
  root.add(group);
  pressurePlantSliceObjects.push(group);
  objectById.set(record.id, group);
}

function addPressurePlantSurveillanceCue(root: THREE.Group, record: PressurePlantSliceDetail) {
  const group = new THREE.Group();
  group.name = record.id;
  group.position.set(record.position.x, record.position.y, record.position.z);
  group.rotation.y = record.rotationY;
  group.userData.pressurePlantSlice = true;
  group.userData.authoringRecord = { type: "pressure-plant-detail", ...record, linkedCameraSectorId: "image_camera_threshold", runtimeCameraSectorHost: "volume_security_camera_sector", destructible: true };
  const steel = pressureSliceMaterial(record, 0x4c5e5f, 0.54, 0.62);
  const bracket = new THREE.Mesh(new RoundedBoxGeometry(0.18, 2.0, 0.18, 3, 0.04), steel);
  bracket.position.set(0, -0.8, 0);
  addPressurePlantSliceMesh(root, record, bracket, "camera_mount_bracket", "plant_main_apron_camera_bracket");
  group.add(bracket);
  const housing = new THREE.Mesh(new RoundedBoxGeometry(record.size.x, record.size.y, record.size.z, 3, 0.12), steel);
  housing.position.y = 0.25;
  addPressurePlantSliceMesh(root, record, housing, "camera_housing", "plant_main_apron_camera_bracket");
  group.add(housing);
  const lens = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.27, 0.42, 14), new THREE.MeshStandardMaterial({ color: 0x16282b, roughness: 0.24, metalness: 0.72 }));
  lens.rotation.z = Math.PI / 2;
  lens.position.set(0.78, 0.25, 0);
  lens.userData.pressurePlantSlice = true;
  lens.userData.pressurePlantDetailId = record.id;
  lens.userData.authoringRecord = { type: "pressure-plant-detail", ...record, role: "camera_lens", linkedCameraSectorId: "volume_security_camera_sector" };
  group.add(lens);
  const cable = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([new THREE.Vector3(-0.2, -0.75, 0), new THREE.Vector3(-0.8, -1.45, 0), new THREE.Vector3(-1.4, -2.2, 0)]), 10, 0.035, 6, false), pressureSliceMaterial(record, 0x202b2c, 0.86, 0.46));
  cable.userData.pressurePlantSlice = true;
  cable.userData.pressurePlantDetailId = record.id;
  cable.userData.authoringRecord = { type: "pressure-plant-detail", ...record, role: "camera_service_cable", endpoint: "plant_main_service_cable_drop" };
  group.add(cable);
  root.add(group);
  pressurePlantSliceObjects.push(group);
  selectableObjects.push(group);
  objectById.set(record.id, group);
}

function addPressurePlantElectricalPole(root: THREE.Group, record: PressurePlantSliceDetail) {
  const group = new THREE.Group();
  group.name = record.id;
  group.position.set(record.position.x, record.position.y, record.position.z);
  group.rotation.y = record.rotationY;
  group.userData.pressurePlantSlice = true;
  group.userData.authoringRecord = { type: "pressure-plant-detail", ...record, endpoints: ["plant_pole_crossarm", "plant_tower_service_termination"] };
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.19, 0.28, record.size.y, 10), pressureSliceMaterial(record));
  pole.position.y = record.size.y / 2;
  addPressurePlantSliceMesh(root, record, pole, "electrical_pole");
  group.add(pole);
  const crossarm = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.18, 0.18), pressureSliceMaterial(record, 0x4a5350, 0.64, 0.56));
  crossarm.position.y = record.size.y - 0.8;
  addPressurePlantSliceMesh(root, record, crossarm, "electrical_crossarm");
  group.add(crossarm);
  const insulatorMaterial = pressureSliceMaterial(record, 0x87918a, 0.48, 0.22);
  for (const localX of [-1.2, 0, 1.2]) {
    const insulator = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.14, 0.38, 8), insulatorMaterial);
    insulator.position.set(localX, record.size.y - 0.58, 0);
    insulator.userData.pressurePlantSlice = true;
    insulator.userData.pressurePlantDetailId = record.id;
    insulator.userData.authoringRecord = { type: "pressure-plant-detail", ...record, role: "insulator" };
    group.add(insulator);
  }
  const cablePoints = [
    new THREE.Vector3(-1.2, record.size.y - 0.38, 0),
    new THREE.Vector3(15, record.size.y - 0.9, 0.8),
    new THREE.Vector3(31, record.size.y - 1.8, 0.2),
    new THREE.Vector3(42, record.size.y - 2.2, -2.4),
  ];
  const cable = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(cablePoints), 18, 0.045, 6, false), pressureSliceMaterial(record, 0x1d2829, 0.84, 0.5));
  cable.userData.pressurePlantSlice = true;
  cable.userData.pressurePlantDetailId = record.id;
  cable.userData.authoringRecord = { type: "pressure-plant-detail", ...record, role: "cable_span", endpoints: ["plant_pole_crossarm", "plant_tower_service_termination"], clearances: { player: 2.2, uav: 4.0 } };
  group.add(cable);
  root.add(group);
  pressurePlantSliceObjects.push(group);
  objectById.set(record.id, group);
}

// Projection-checked visible service-band anchor: record datum (150,-20)
// becomes world (149,80), with the rack spanning the shell’s west loading edge.
const pressurePlantPipeRackVisualOffsetX = -1;
const pressurePlantPipeRackVisualOffsetZ = 100;

function addPressurePlantPipeRack(root: THREE.Group, record: PressurePlantSliceDetail) {
  const group = new THREE.Group();
  group.name = record.id;
  group.position.set(record.position.x + pressurePlantPipeRackVisualOffsetX, record.position.y, record.position.z + pressurePlantPipeRackVisualOffsetZ);
  group.rotation.y = record.rotationY;
  group.userData.pressurePlantSlice = true;
  group.userData.hostRelativeVisualOffset = { x: pressurePlantPipeRackVisualOffsetX, y: 0, z: pressurePlantPipeRackVisualOffsetZ };
  group.userData.authoringRecord = { type: "pressure-plant-detail", ...record, sockets: ["rack_baseplate_a", "rack_baseplate_b", "rack_header_termination_left", "rack_header_termination_right"], visualHostOffset: { x: pressurePlantPipeRackVisualOffsetX, y: 0, z: pressurePlantPipeRackVisualOffsetZ } };
  const steel = pressureSliceMaterial(record);
  const darkSteel = pressureSliceMaterial(record, 0x374241, 0.7, 0.7);
  const width = record.size.x;
  const height = record.size.y;
  const depth = record.size.z;
  for (const localX of [-width * 0.42, width * 0.42]) {
    for (const localZ of [-depth * 0.3, depth * 0.3]) {
      const plate = new THREE.Mesh(new RoundedBoxGeometry(1.2, 0.12, 0.9, 3, 0.08), darkSteel);
      plate.position.set(localX, 0.06, localZ);
      plate.userData.pressurePlantSlice = true;
      plate.userData.pressurePlantDetailId = record.id;
      plate.userData.authoringRecord = { type: "pressure-plant-detail", ...record, role: "rack_baseplate", socket: `rack_baseplate_${localX}_${localZ}` };
      group.add(plate);
      for (const boltX of [-0.36, 0.36]) {
        const bolt = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.025, 8), darkSteel);
        bolt.position.set(localX + boltX, 0.14, localZ);
        bolt.userData.pressurePlantSlice = true;
        bolt.userData.pressurePlantDetailId = record.id;
        bolt.userData.authoringRecord = { type: "pressure-plant-detail", ...record, role: "rack_baseplate_bolt" };
        group.add(bolt);
      }
    }
    const upright = new THREE.Mesh(new THREE.BoxGeometry(0.38, height, 0.38), steel);
    upright.position.set(localX, height / 2, 0);
    upright.userData.pressurePlantSlice = true;
    upright.userData.pressurePlantDetailId = record.id;
    upright.userData.authoringRecord = { type: "pressure-plant-detail", ...record, role: "rack_upright" };
    group.add(upright);
  }
  const standoffMaterial = pressureSliceMaterial(record, 0x56615f, 0.64, 0.58);
  for (const localX of [-width * 0.42, width * 0.42]) {
    for (const localY of [1.7, 5.35]) {
      const standoff = new THREE.Mesh(new RoundedBoxGeometry(0.3, 0.3, depth + 2.2, 3, 0.04), standoffMaterial);
      standoff.position.set(localX, localY, -(depth / 2 + 1.1));
      standoff.userData.pressurePlantSlice = true;
      standoff.userData.pressurePlantDetailId = record.id;
      standoff.userData.authoringRecord = { type: "pressure-plant-detail", ...record, role: "rack_shell_service_standoff", socket: `rack_shell_standoff_${localX}_${localY}` };
      group.add(standoff);
    }
  }
  const pipeHeights = [2.1, 4.45, 6.75];
  pipeHeights.forEach((pipeHeight, index) => {
    const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.34 - index * 0.045, 0.34 - index * 0.045, width * 0.92, 16), steel);
    pipe.rotation.z = Math.PI / 2;
    pipe.position.y = pipeHeight;
    pipe.userData.pressurePlantSlice = true;
    pipe.userData.pressurePlantDetailId = record.id;
    pipe.userData.authoringRecord = { type: "pressure-plant-detail", ...record, role: `process_pipe_${index + 1}`, endpoints: [`rack_header_left_${index + 1}`, `rack_header_right_${index + 1}`] };
    group.add(pipe);
    for (const localX of [-width * 0.3, width * 0.05, width * 0.35]) {
      const collar = new THREE.Mesh(new THREE.TorusGeometry(0.39 - index * 0.045, 0.055, 8, 16), darkSteel);
      collar.rotation.y = Math.PI / 2;
      collar.position.set(localX, pipeHeight, 0);
      collar.userData.pressurePlantSlice = true;
      collar.userData.pressurePlantDetailId = record.id;
      collar.userData.authoringRecord = { type: "pressure-plant-detail", ...record, role: `pipe_collar_${index + 1}` };
      group.add(collar);
    }
  });
  const elbow = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 2.8, 14), steel);
  elbow.position.set(width * 0.43, 5.5, 0);
  elbow.rotation.z = Math.PI / 2;
  elbow.userData.pressurePlantSlice = true;
  elbow.userData.pressurePlantDetailId = record.id;
  elbow.userData.authoringRecord = { type: "pressure-plant-detail", ...record, role: "pipe_elbow_and_termination", termination: "facade_penetration" };
  group.add(elbow);
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.14, 16), darkSteel);
  cap.rotation.z = Math.PI / 2;
  cap.position.set(width * 0.47, 5.5, 0);
  cap.userData.pressurePlantSlice = true;
  cap.userData.pressurePlantDetailId = record.id;
  cap.userData.authoringRecord = { type: "pressure-plant-detail", ...record, role: "pipe_termination_cap" };
  group.add(cap);
  group.traverse((object) => { if (object instanceof THREE.Mesh) { object.castShadow = true; object.receiveShadow = true; } });
  root.add(group);
  pressurePlantSliceObjects.push(group);
  selectableObjects.push(group);
  objectById.set(record.id, group);
}

function addPressurePlantLowServiceShed(root: THREE.Group, record: PressurePlantSliceDetail) {
  const group = new THREE.Group();
  group.name = record.id;
  const lowShedVisualOffsetX = -28;
  const lowShedVisualOffsetZ = 0;
  group.position.set(record.position.x + lowShedVisualOffsetX, record.position.y, record.position.z + lowShedVisualOffsetZ);
  group.rotation.y = record.rotationY;
  group.userData.pressurePlantSlice = true;
  group.userData.hostRelativeVisualOffset = { x: lowShedVisualOffsetX, y: 0, z: lowShedVisualOffsetZ };
  group.userData.authoringRecord = { type: "pressure-plant-detail", ...record, closure: ["front", "side", "rear", "roof", "ground"], visualHostOffset: { x: lowShedVisualOffsetX, y: 0, z: lowShedVisualOffsetZ } };
  const wall = pressureSliceMaterial(record, 0x4e5c5b, 0.86, 0.26);
  const trim = pressureSliceMaterial(record, 0x9a9684, 0.72, 0.34);
  const roofMat = pressureSliceMaterial(record, 0x293a3b, 0.68, 0.54);
  const windowMat = new THREE.MeshStandardMaterial({ color: 0x526764, roughness: 0.48, metalness: 0.42 });
  const sideBayConcrete = pressureSliceMaterial(record, 0x85847a, 0.92, 0.06);
  const sideBaySteel = pressureSliceMaterial(record, 0x334342, 0.6, 0.68);
  const sideBayWarning = pressureSliceMaterial(record, 0x95613d, 0.78, 0.2);
  const sideBayLight = new THREE.MeshStandardMaterial({ color: 0xffc17c, emissive: 0x6d3819, emissiveIntensity: 0.88, roughness: 0.3, metalness: 0.06 });
  const width = record.size.x;
  const height = record.size.y;
  const depth = record.size.z;
  const add = (mesh: THREE.Mesh, role: string, materialFamily = record.materialFamily) => {
    mesh.userData.pressurePlantSlice = true;
    mesh.userData.pressurePlantDetailId = record.id;
    mesh.userData.authoringRecord = { type: "pressure-plant-detail", ...record, materialFamily, role };
    mesh.castShadow = !/panel_vertical_seam|door_rib|loading_frame|loading_canopy|service_louver|louver_slat|downpipe|tank_band|tank_service_pipe_support|tank_access_step/i.test(role);
    mesh.receiveShadow = true;
    group.add(mesh);
  };
  const frontZ = -depth / 2 + 0.22;
  const backZ = depth / 2 - 0.18;
  const leftX = -width / 2 + 0.2;
  const rightX = width / 2 - 0.2;
  const sideBayCenters = [-11.0, 0.0, 11.0];
  const sideBaySpan = 8.1;
  const base = new THREE.Mesh(new RoundedBoxGeometry(width + 1.4, 0.36, depth + 1.2, 5, 0.1), trim);
  base.position.y = 0.18;
  add(base, "low_shed_ground_closure", "CONCRETE");
  for (const [x, z, sx, sy, sz, role] of [
    [0, frontZ, width, height, 0.38, "low_shed_front_closure"],
    [0, backZ, width, height, 0.34, "low_shed_rear_closure"],
    [rightX, 0, 0.38, height, depth, "low_shed_right_closure"],
  ] as const) {
    const panel = new THREE.Mesh(new RoundedBoxGeometry(sx, sy, sz, 5, 0.12), wall);
    panel.position.set(x, height / 2, z);
    add(panel, role);
  }
  // The west elevation is the active service face. Leave actual wall gaps for
  // the three doors, while retaining full-height closure returns between them.
  let westClosureCursor = -depth / 2;
  sideBayCenters.forEach((bayCenter, index) => {
    const segmentEnd = bayCenter - sideBaySpan / 2;
    const segmentDepth = segmentEnd - westClosureCursor;
    if (segmentDepth > 0.4) {
      const segment = new THREE.Mesh(new RoundedBoxGeometry(0.38, height, segmentDepth, 5, 0.12), wall);
      segment.position.set(leftX, height / 2, (westClosureCursor + segmentEnd) / 2);
      add(segment, `low_shed_left_closure_segment_${index + 1}`);
    }
    westClosureCursor = bayCenter + sideBaySpan / 2;
  });
  const westFinalDepth = depth / 2 - westClosureCursor;
  if (westFinalDepth > 0.4) {
    const segment = new THREE.Mesh(new RoundedBoxGeometry(0.38, height, westFinalDepth, 5, 0.12), wall);
    segment.position.set(leftX, height / 2, (westClosureCursor + depth / 2) / 2);
    add(segment, "low_shed_left_closure_segment_final");
  }
  for (let bay = 1; bay < 5; bay += 1) {
    const seam = new THREE.Mesh(new THREE.BoxGeometry(0.1, height - 0.7, 0.08), trim);
    seam.position.set(-width / 2 + bay * width / 5, height / 2, frontZ - 0.28);
    add(seam, "low_shed_panel_vertical_seam", "GALVANIZED_STEEL");
  }
  const roof = new THREE.Mesh(new RoundedBoxGeometry(width + 2.4, 0.52, depth + 2.0, 5, 0.14), roofMat);
  roof.position.y = height + 0.26;
  add(roof, "low_shed_roof_closure", "GALVANIZED_STEEL");
  const tankBodyMaterial = pressureSliceMaterial(record, 0x66716d, 0.74, 0.5);
  const tankTrimMaterial = pressureSliceMaterial(record, 0x384644, 0.62, 0.64);
  const tankX = -24.0;
  const tankZ = depth / 2 - 6.0;
  const processTank = new THREE.Mesh(new THREE.CylinderGeometry(3.0, 3.2, 8.8, 24, 2), tankBodyMaterial);
  processTank.position.set(tankX, 4.4, tankZ);
  add(processTank, "low_shed_process_tank_body", "PAINTED_STEEL");
  const tankBase = new THREE.Mesh(new RoundedBoxGeometry(7.2, 0.32, 7.2, 6, 0.1), tankTrimMaterial);
  tankBase.position.set(tankX, 0.16, tankZ);
  add(tankBase, "low_shed_process_tank_base", "CONCRETE");
  for (const ringY of [1.2, 4.4, 7.6]) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(3.1, 0.09, 8, 24), tankTrimMaterial);
    ring.rotation.x = Math.PI / 2;
    ring.position.set(tankX, ringY, tankZ);
    add(ring, "low_shed_process_tank_band", "GALVANIZED_STEEL");
  }
  const tankTop = new THREE.Mesh(new THREE.CylinderGeometry(2.72, 2.72, 0.22, 24), tankTrimMaterial);
  tankTop.position.set(tankX, 8.92, tankZ);
  add(tankTop, "low_shed_process_tank_top", "GALVANIZED_STEEL");
  const tankVent = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.36, 1.15, 16), tankTrimMaterial);
  tankVent.position.set(tankX + 0.82, 9.58, tankZ - 0.25);
  add(tankVent, "low_shed_process_tank_vent", "GALVANIZED_STEEL");
  const tankServicePipe = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 23.5, 16), tankTrimMaterial);
  tankServicePipe.rotation.z = Math.PI / 2;
  tankServicePipe.position.set(tankX / 2, 7.35, tankZ);
  add(tankServicePipe, "low_shed_process_tank_service_pipe", "GALVANIZED_STEEL");
  for (const supportX of [tankX + 6.2, tankX + 16.5]) {
    const tankPipeSupport = new THREE.Mesh(new RoundedBoxGeometry(0.24, 7.1, 0.24, 3, 0.04), tankTrimMaterial);
    tankPipeSupport.position.set(supportX, 3.55, tankZ);
    add(tankPipeSupport, "low_shed_process_tank_service_pipe_support", "GALVANIZED_STEEL");
  }
  const tankAccess = new THREE.Mesh(new THREE.BoxGeometry(0.18, 7.5, 0.18), tankTrimMaterial);
  tankAccess.position.set(tankX - 2.72, 4.1, tankZ + 0.15);
  add(tankAccess, "low_shed_process_tank_access_rail", "GALVANIZED_STEEL");
  for (const railY of [1.2, 3.5, 5.8, 8.1]) {
    const accessRail = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.14, 1.0), tankTrimMaterial);
    accessRail.position.set(tankX - 2.66, railY, tankZ - 0.4);
    add(accessRail, "low_shed_process_tank_access_step", "GALVANIZED_STEEL");
  }
  for (const x of [-width * 0.3, width * 0.3]) {
    const doorWidth = width * 0.27;
    const door = new THREE.Mesh(new RoundedBoxGeometry(doorWidth, 4.35, 0.16, 4, 0.045), windowMat);
    door.position.set(x, 2.42, frontZ - 0.45);
    add(door, "low_shed_loading_door", "PAINTED_STEEL");
    for (let rib = 0; rib < 5; rib += 1) {
      const doorRib = new THREE.Mesh(new THREE.BoxGeometry(doorWidth - 0.22, 0.08, 0.16), trim);
      doorRib.position.set(x, 0.62 + rib * 0.82, frontZ - 0.56);
      add(doorRib, "low_shed_loading_door_rib", "GALVANIZED_STEEL");
    }
    const doorFrame = new THREE.Mesh(new RoundedBoxGeometry(doorWidth + 0.42, 4.75, 0.38, 4, 0.07), trim);
    doorFrame.position.set(x, 2.55, frontZ - 0.25);
    add(doorFrame, "low_shed_loading_frame", "CONCRETE");
    const canopy = new THREE.Mesh(new RoundedBoxGeometry(doorWidth + 1.4, 0.18, 1.6, 3, 0.05), roofMat);
    canopy.position.set(x, 4.9, frontZ - 1.0);
    add(canopy, "low_shed_loading_canopy", "GALVANIZED_STEEL");
  }
  const rearDoorWidth = width * 0.27;
  const rearServiceDoorZ = backZ + 0.45;
  for (const x of [-width * 0.3, width * 0.3]) {
    const rearDoor = new THREE.Mesh(new RoundedBoxGeometry(rearDoorWidth, 4.35, 0.16, 4, 0.045), windowMat);
    rearDoor.position.set(x, 2.42, rearServiceDoorZ);
    add(rearDoor, "low_shed_rear_loading_door", "PAINTED_STEEL");
    for (let rib = 0; rib < 5; rib += 1) {
      const rearRib = new THREE.Mesh(new THREE.BoxGeometry(rearDoorWidth - 0.22, 0.08, 0.16), trim);
      rearRib.position.set(x, 0.62 + rib * 0.82, rearServiceDoorZ + 0.1);
      add(rearRib, "low_shed_rear_loading_door_rib", "GALVANIZED_STEEL");
    }
    const rearFrame = new THREE.Mesh(new RoundedBoxGeometry(rearDoorWidth + 0.42, 4.75, 0.38, 4, 0.07), trim);
    rearFrame.position.set(x, 2.55, backZ + 0.25);
    add(rearFrame, "low_shed_rear_loading_frame", "CONCRETE");
    const rearCanopy = new THREE.Mesh(new RoundedBoxGeometry(rearDoorWidth + 1.4, 0.18, 1.6, 3, 0.05), roofMat);
    rearCanopy.position.set(x, 4.9, backZ + 1.0);
    add(rearCanopy, "low_shed_rear_loading_canopy", "GALVANIZED_STEEL");
  }
  // The locked player camera sees this shed primarily from the west. Give that
  // exposed side a real service bay so the working edge reads as architecture,
  // not a blank primitive wall; this remains presentation-only and preserves the
  // existing low-shed semantic footprint and route ownership.
  // The camera resolves the west elevation more reliably than the rear face.
  // Replace the former single broad panel with one coherent three-bay service
  // sequence, still fully inside the existing closed shed volume.
  const sideBayWallFaceX = leftX - 0.20;
  const sideBayRecessX = leftX + 0.04;
  const sideBayDoorX = leftX + 0.16;
  const sideBayCanopyX = leftX - 2.25;
  const westBayDoorMaterial = new THREE.MeshStandardMaterial({ color: 0x172323, roughness: 0.9, metalness: 0.18 });
  const sideBayDoorHeight = 4.85;
  const sideBayDoorBottom = 0.62;
  const sideBayDoorCenterY = sideBayDoorBottom + sideBayDoorHeight / 2;
  const sideBayLanding = new THREE.Mesh(new RoundedBoxGeometry(4.65, 0.26, 34.6, 5, 0.06), sideBayConcrete);
  sideBayLanding.position.set(leftX - 2.05, 0.16, 0);
  add(sideBayLanding, "low_shed_camera_west_service_bay_shared_grounded_landing", "CONCRETE");
  const sideBayLandingEdge = new THREE.Mesh(new RoundedBoxGeometry(0.18, 0.22, 34.0, 4, 0.04), trim);
  sideBayLandingEdge.position.set(leftX - 4.42, 0.35, 0);
  add(sideBayLandingEdge, "low_shed_camera_west_service_bay_shared_landing_front_edge", "CONCRETE");
  for (const [bayIndex, sideBayZ] of sideBayCenters.entries()) {
    const sideBayReveal = new THREE.Mesh(new RoundedBoxGeometry(0.34, sideBayDoorHeight + 0.62, sideBaySpan + 0.86, 4, 0.07), sideBaySteel);
    sideBayReveal.position.set(sideBayRecessX, sideBayDoorCenterY, sideBayZ);
    add(sideBayReveal, `low_shed_camera_west_service_bay_${bayIndex + 1}_recessed_reveal`, "GALVANIZED_STEEL");
    const sideBayDoor = new THREE.Mesh(new RoundedBoxGeometry(0.13, sideBayDoorHeight, sideBaySpan - 0.72, 4, 0.035), westBayDoorMaterial);
    sideBayDoor.position.set(sideBayDoorX, sideBayDoorCenterY, sideBayZ);
    add(sideBayDoor, `low_shed_camera_west_service_bay_${bayIndex + 1}_recessed_rolling_door`, "PAINTED_STEEL");
    for (let rib = 0; rib < 6; rib += 1) {
      const ribMesh = new THREE.Mesh(new RoundedBoxGeometry(0.15, 0.075, sideBaySpan - 1.1, 3, 0.018), trim);
      ribMesh.position.set(sideBayDoorX - 0.1, 1.0 + rib * 0.72, sideBayZ);
      add(ribMesh, `low_shed_camera_west_service_bay_${bayIndex + 1}_rolling_rib_${rib + 1}`, "GALVANIZED_STEEL");
    }
    for (const side of [-1, 1]) {
      const sideBayJamb = new THREE.Mesh(new RoundedBoxGeometry(0.42, sideBayDoorHeight + 0.72, 0.4, 4, 0.06), trim);
      sideBayJamb.position.set(sideBayWallFaceX - 0.1, sideBayDoorCenterY, sideBayZ + side * (sideBaySpan / 2 + 0.12));
      add(sideBayJamb, `low_shed_camera_west_service_bay_${bayIndex + 1}_jamb_${side < 0 ? "left" : "right"}`, "CONCRETE");
    }
    const sideBaySill = new THREE.Mesh(new RoundedBoxGeometry(0.32, 0.16, sideBaySpan - 0.5, 4, 0.04), trim);
    sideBaySill.position.set(sideBayWallFaceX - 0.12, 0.52, sideBayZ);
    add(sideBaySill, `low_shed_camera_west_service_bay_${bayIndex + 1}_grounded_threshold_sill`, "CONCRETE");
    const sideBayLamp = new THREE.Mesh(new RoundedBoxGeometry(0.26, 0.58, 0.86, 3, 0.05), sideBayLight);
    sideBayLamp.position.set(sideBayWallFaceX - 0.78, 5.2, sideBayZ - sideBaySpan / 2 + 1.0);
    add(sideBayLamp, `low_shed_camera_west_service_bay_${bayIndex + 1}_practical_light`, "PAINTED_STEEL");
  }
  const sideBayCanopy = new THREE.Mesh(new RoundedBoxGeometry(4.85, 0.32, 35.5, 5, 0.07), sideBaySteel);
  sideBayCanopy.position.set(sideBayCanopyX, 5.95, 0);
  sideBayCanopy.rotation.x = -0.035;
  add(sideBayCanopy, "low_shed_camera_west_service_bay_shared_weather_canopy", "GALVANIZED_STEEL");
  const sideBayCanopyHeader = new THREE.Mesh(new RoundedBoxGeometry(0.28, 0.28, 35.0, 4, 0.05), trim);
  sideBayCanopyHeader.position.set(sideBayWallFaceX - 0.52, 5.58, 0);
  add(sideBayCanopyHeader, "low_shed_camera_west_service_bay_shared_canopy_wall_header", "GALVANIZED_STEEL");
  for (const sideBayZ of [-16.2, -5.4, 5.4, 16.2]) {
    const sideBayPost = new THREE.Mesh(new RoundedBoxGeometry(0.28, 5.35, 0.28, 4, 0.05), sideBaySteel);
    sideBayPost.position.set(sideBayCanopyX - 2.05, 3.05, sideBayZ);
    add(sideBayPost, "low_shed_camera_west_service_bay_shared_canopy_grounded_post", "GALVANIZED_STEEL");
    const sideBayFoot = new THREE.Mesh(new RoundedBoxGeometry(0.72, 0.12, 0.72, 4, 0.04), sideBayConcrete);
    sideBayFoot.position.set(sideBayCanopyX - 2.05, 0.06, sideBayZ);
    add(sideBayFoot, "low_shed_camera_west_service_bay_shared_canopy_post_foot", "CONCRETE");
  }
  for (const sideBayZ of [-16.4, -5.45, 5.45, 16.4]) {
    const sideBayBollard = new THREE.Mesh(new RoundedBoxGeometry(0.34, 1.12, 0.34, 4, 0.05), sideBayWarning);
    sideBayBollard.position.set(leftX - 3.42, 0.56, sideBayZ);
    add(sideBayBollard, "low_shed_camera_west_service_bay_loading_landing_safety_bollard", "PAINTED_STEEL");
    const sideBayBollardCap = new THREE.Mesh(new RoundedBoxGeometry(0.4, 0.08, 0.4, 3, 0.02), trim);
    sideBayBollardCap.position.set(leftX - 3.42, 1.16, sideBayZ);
    add(sideBayBollardCap, "low_shed_camera_west_service_bay_loading_landing_bollard_cap", "GALVANIZED_STEEL");
  }
  for (const sideBayZ of [-16.8, -5.6, 5.6, 16.8]) {
    const sideBayDownpipe = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.14, 5.55, 12), sideBaySteel);
    sideBayDownpipe.position.set(sideBayWallFaceX - 0.44, 2.8, sideBayZ);
    add(sideBayDownpipe, "low_shed_camera_west_service_bay_frontage_downpipe", "GALVANIZED_STEEL");
    const sideBayDownpipeFoot = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.38, 12), sideBaySteel);
    sideBayDownpipeFoot.position.set(sideBayWallFaceX - 0.44, 0.24, sideBayZ);
    add(sideBayDownpipeFoot, "low_shed_camera_west_service_bay_frontage_downpipe_foot", "GALVANIZED_STEEL");
  }
  const sideBayEndHandrail = new THREE.Mesh(new RoundedBoxGeometry(0.14, 0.14, 5.3, 3, 0.025), sideBaySteel);
  sideBayEndHandrail.position.set(leftX - 3.25, 1.22, 21.5);
  add(sideBayEndHandrail, "low_shed_camera_west_service_bay_shared_landing_end_handrail", "GALVANIZED_STEEL");
  for (const sideBayZ of [19.2, 23.8]) {
    const sideBayHandrailPost = new THREE.Mesh(new RoundedBoxGeometry(0.14, 0.92, 0.14, 3, 0.025), sideBaySteel);
    sideBayHandrailPost.position.set(leftX - 3.25, 0.72, sideBayZ);
    add(sideBayHandrailPost, "low_shed_camera_west_service_bay_shared_landing_end_handrail_post", "GALVANIZED_STEEL");
  }

  // A bounded utility cell occupies the projected empty left edge. Its tank,
  // base, service panel, and guarded pipe explain the shed’s process function
  // without becoming cover or changing the frozen gameplay layout.
  const utilityTankX = -40.0;
  const utilityTankZ = 6.0;
  const utilityTankMaterial = pressureSliceMaterial(record, 0x68706b, 0.72, 0.42);
  const utilityBase = new THREE.Mesh(new RoundedBoxGeometry(5.2, 0.28, 5.2, 5, 0.08), sideBayConcrete);
  utilityBase.position.set(utilityTankX, 0.14, utilityTankZ);
  add(utilityBase, "low_shed_camera_left_edge_utility_tank_grounded_base", "CONCRETE");
  const utilityTank = new THREE.Mesh(new THREE.CylinderGeometry(2.15, 2.3, 5.6, 24, 2), utilityTankMaterial);
  utilityTank.position.set(utilityTankX, 3.08, utilityTankZ);
  add(utilityTank, "low_shed_camera_left_edge_utility_tank_body", "PAINTED_STEEL");
  for (const bandY of [1.35, 3.05, 4.75]) {
    const band = new THREE.Mesh(new THREE.TorusGeometry(2.18, 0.08, 8, 24), sideBaySteel);
    band.rotation.x = Math.PI / 2;
    band.position.set(utilityTankX, bandY, utilityTankZ);
    add(band, "low_shed_camera_left_edge_utility_tank_band", "GALVANIZED_STEEL");
  }
  const utilityCap = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.72, 0.18, 24), sideBaySteel);
  utilityCap.position.set(utilityTankX, 5.94, utilityTankZ);
  add(utilityCap, "low_shed_camera_left_edge_utility_tank_cap", "GALVANIZED_STEEL");
  const utilityVent = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.3, 0.95, 16), sideBaySteel);
  utilityVent.position.set(utilityTankX + 0.62, 6.5, utilityTankZ - 0.2);
  add(utilityVent, "low_shed_camera_left_edge_utility_tank_vent", "GALVANIZED_STEEL");
  const utilityPanel = new THREE.Mesh(new RoundedBoxGeometry(0.24, 1.65, 1.45, 4, 0.05), sideBaySteel);
  utilityPanel.position.set(utilityTankX + 2.12, 2.35, utilityTankZ);
  add(utilityPanel, "low_shed_camera_left_edge_utility_service_panel", "PAINTED_STEEL");
  const utilityPipe = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 5.2, 16), sideBaySteel);
  utilityPipe.position.set(utilityTankX + 2.7, 2.6, utilityTankZ + 1.0);
  add(utilityPipe, "low_shed_camera_left_edge_utility_guarded_pipe", "GALVANIZED_STEEL");
  const utilityPipeFoot = new THREE.Mesh(new RoundedBoxGeometry(0.62, 0.18, 0.62, 4, 0.04), sideBayConcrete);
  utilityPipeFoot.position.set(utilityTankX + 2.7, 0.09, utilityTankZ + 1.0);
  add(utilityPipeFoot, "low_shed_camera_left_edge_utility_pipe_foot", "CONCRETE");
  const utilityWarning = new THREE.Mesh(new RoundedBoxGeometry(0.1, 0.42, 0.7, 3, 0.03), sideBayWarning);
  utilityWarning.position.set(utilityTankX + 2.25, 2.35, utilityTankZ - 0.76);
  add(utilityWarning, "low_shed_camera_left_edge_utility_warning_tab", "PAINTED_STEEL");
  const utilityTransferPipe = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 13.2, 16), sideBaySteel);
  utilityTransferPipe.rotation.z = Math.PI / 2;
  utilityTransferPipe.position.set(utilityTankX + 8.6, 6.25, utilityTankZ);
  add(utilityTransferPipe, "low_shed_camera_left_edge_utility_transfer_pipe", "GALVANIZED_STEEL");
  for (const supportX of [utilityTankX + 4.4, utilityTankX + 10.6]) {
    const pipeSupport = new THREE.Mesh(new RoundedBoxGeometry(0.22, 5.6, 0.22, 3, 0.04), sideBaySteel);
    pipeSupport.position.set(supportX, 2.8, utilityTankZ);
    add(pipeSupport, "low_shed_camera_left_edge_utility_transfer_pipe_support", "GALVANIZED_STEEL");
    const supportFoot = new THREE.Mesh(new RoundedBoxGeometry(0.72, 0.14, 0.72, 4, 0.04), sideBayConcrete);
    supportFoot.position.set(supportX, 0.07, utilityTankZ);
    add(supportFoot, "low_shed_camera_left_edge_utility_transfer_pipe_support_foot", "CONCRETE");
  }
  for (const collarX of [utilityTankX + 3.2, utilityTankX + 6.4, utilityTankX + 9.6]) {
    const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.12, 16), sideBaySteel);
    collar.rotation.z = Math.PI / 2;
    collar.position.set(collarX, 6.25, utilityTankZ);
    add(collar, "low_shed_camera_left_edge_utility_transfer_pipe_collar", "GALVANIZED_STEEL");
  }

  const clerestory = new THREE.Mesh(new RoundedBoxGeometry(width - 3.0, 1.15, 0.14, 3, 0.04), windowMat);
  clerestory.position.set(0, 5.55, frontZ - 0.45);
  add(clerestory, "low_shed_clerestory", "PAINTED_STEEL");
  for (const x of [-width * 0.38, width * 0.38]) {
    const post = new THREE.Mesh(new RoundedBoxGeometry(0.3, height - 0.6, 0.3, 3, 0.05), roofMat);
    post.position.set(x, height * 0.5, frontZ - 0.58);
    add(post, "low_shed_front_post", "GALVANIZED_STEEL");
  }
  const vent = new THREE.Mesh(new THREE.CylinderGeometry(0.52, 0.7, 1.8, 16), roofMat);
  vent.position.set(width * 0.25, height + 1.02, 0);
  add(vent, "low_shed_roof_vent", "GALVANIZED_STEEL");
  for (const x of [-width * 0.25, width * 0.25]) {
    const louverFrame = new THREE.Mesh(new RoundedBoxGeometry(3.4, 1.5, 0.14, 3, 0.04), trim);
    louverFrame.position.set(x, 3.5, leftX < 0 ? frontZ - 0.46 : backZ + 0.46);
    add(louverFrame, "low_shed_service_louver", "GALVANIZED_STEEL");
    for (let slat = 0; slat < 4; slat += 1) {
      const louver = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.08, 0.18), roofMat);
      louver.position.set(x, 3.1 + slat * 0.28, louverFrame.position.z - 0.12);
      add(louver, "low_shed_service_louver_slat", "GALVANIZED_STEEL");
    }
  }
  const downpipe = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.12, height + 0.8, 10), roofMat);
  downpipe.position.set(rightX - 0.18, (height + 0.8) / 2, frontZ - 0.44);
  add(downpipe, "low_shed_downpipe", "GALVANIZED_STEEL");
  const gantrySteel = pressureSliceMaterial(record, 0x374645, 0.58, 0.68);
  const gantryZ = backZ + 2.1;
  for (const localX of [-7.0, 7.0]) {
    const gantryPost = new THREE.Mesh(new RoundedBoxGeometry(0.3, 6.4, 0.3, 4, 0.06), gantrySteel);
    gantryPost.position.set(localX, 3.2, gantryZ);
    add(gantryPost, "low_shed_service_gantry_post", "GALVANIZED_STEEL");
    const foot = new THREE.Mesh(new RoundedBoxGeometry(0.72, 0.16, 0.72, 4, 0.04), trim);
    foot.position.set(localX, 0.08, gantryZ);
    add(foot, "low_shed_service_gantry_foot", "CONCRETE");
  }
  const gantryHeader = new THREE.Mesh(new RoundedBoxGeometry(14.4, 0.34, 0.34, 4, 0.06), gantrySteel);
  gantryHeader.position.set(0, 6.1, gantryZ);
  add(gantryHeader, "low_shed_service_gantry_header", "GALVANIZED_STEEL");
  for (const pipeY of [1.65, 3.15, 4.65]) {
    const gantryPipe = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 13.2, 14), gantrySteel);
    gantryPipe.rotation.z = Math.PI / 2;
    gantryPipe.position.set(0, pipeY, gantryZ + 0.22);
    add(gantryPipe, "low_shed_service_gantry_pipe", "GALVANIZED_STEEL");
    for (const localX of [-5.2, 0, 5.2]) {
      const hanger = new THREE.Mesh(new RoundedBoxGeometry(0.16, 0.55, 0.16, 3, 0.03), gantrySteel);
      hanger.position.set(localX, pipeY + 0.32, gantryZ + 0.22);
      add(hanger, "low_shed_service_gantry_hanger", "GALVANIZED_STEEL");
    }
  }
  const gantryLamp = new THREE.Mesh(new RoundedBoxGeometry(0.65, 0.2, 0.32, 3, 0.05), new THREE.MeshStandardMaterial({ color: 0xffd59b, emissive: 0x75441f, emissiveIntensity: 0.6, roughness: 0.34, metalness: 0.08 }));
  gantryLamp.position.set(0, 6.45, gantryZ + 0.28);
  add(gantryLamp, "low_shed_service_gantry_light", "PAINTED_STEEL");

  addLowShedCameraFacingForecourt({ record, width, backZ, roofMaterial: roofMat, pressureMaterial: pressureSliceMaterial, add });
  root.add(group);
  pressurePlantSliceObjects.push(group);
  selectableObjects.push(group);
  objectById.set(record.id, group);
}

function addPressurePlantVolumetricShell(root: THREE.Group, record: PressurePlantSliceDetail) {
  const group = new THREE.Group();
  group.name = record.id;
  group.position.set(record.position.x, record.position.y, record.position.z);
  group.rotation.y = record.rotationY;
  group.userData.pressurePlantSlice = true;
  group.userData.authoringRecord = { type: "pressure-plant-detail", ...record, closure: ["front", "side", "rear", "roof", "ground"] };
  const shellMaterial = pressureSliceMaterial(record, 0x566663, 0.82, 0.3);
  const steelMaterial = pressureSliceMaterial(record, 0x3e4d4d, 0.64, 0.58);
  const trimMaterial = pressureSliceMaterial(record, 0x8c8a7c, 0.78, 0.28);
  const glazingMaterial = new THREE.MeshStandardMaterial({ color: 0x23383b, roughness: 0.28, metalness: 0.58 });
  const loadingDoorMaterial = new THREE.MeshStandardMaterial({ color: 0x66756f, roughness: 0.68, metalness: 0.42 });
  const loadingDoorTrimMaterial = pressureSliceMaterial(record, 0x364542, 0.72, 0.5);
  const serviceLightMaterial = new THREE.MeshStandardMaterial({ color: 0xffd6a0, emissive: 0x78451f, emissiveIntensity: 0.72, roughness: 0.34, metalness: 0.08 });
  const safetyBollardMaterial = pressureSliceMaterial(record, 0x817053, 0.72, 0.3);
  const width = record.size.x;
  const height = record.size.y;
  const depth = record.size.z;
  const add = (mesh: THREE.Mesh, role: string, materialFamily = record.materialFamily) => {
    mesh.userData.pressurePlantSlice = true;
    mesh.userData.pressurePlantDetailId = record.id;
    mesh.userData.authoringRecord = { type: "pressure-plant-detail", ...record, materialFamily, role };
    mesh.castShadow = !/glazing|loading_door_rib|loading_bollard|loading_service_light|west_side_sill/i.test(role);
    mesh.receiveShadow = true;
    group.add(mesh);
  };
  const frontZ = -depth / 2 + 0.24;
  const rearZ = depth / 2 - 0.18;
  const leftX = -width / 2 + 0.22;
  const rightX = width / 2 - 0.22;
  const loadingDoorCenters = [-30, 4, 38];
  const loadingOpeningWidth = 17.8;
  let closureCursor = -width / 2;
  loadingDoorCenters.forEach((doorX, index) => {
    const segmentWidth = doorX - loadingOpeningWidth / 2 - closureCursor;
    if (segmentWidth > 0.4) {
      const segment = new THREE.Mesh(new RoundedBoxGeometry(segmentWidth, height, 0.42, 4, 0.12), shellMaterial);
      segment.position.set(closureCursor + segmentWidth / 2, height / 2, frontZ);
      add(segment, `plant_shell_front_closure_segment_${index + 1}`);
    }
    closureCursor = doorX + loadingOpeningWidth / 2;
  });
  const finalClosureWidth = width / 2 - closureCursor;
  if (finalClosureWidth > 0.4) {
    const segment = new THREE.Mesh(new RoundedBoxGeometry(finalClosureWidth, height, 0.42, 4, 0.12), shellMaterial);
    segment.position.set(closureCursor + finalClosureWidth / 2, height / 2, frontZ);
    add(segment, "plant_shell_front_closure_segment_final");
  }
  const upperClosureHeight = height - 11.2;
  const upperClosure = new THREE.Mesh(new RoundedBoxGeometry(width, upperClosureHeight, 0.42, 4, 0.12), shellMaterial);
  upperClosure.position.set(0, 11.2 + upperClosureHeight / 2, frontZ);
  add(upperClosure, "plant_shell_front_upper_closure");
  const rearBacking = new THREE.Mesh(new RoundedBoxGeometry(width, height, 0.36, 4, 0.1), shellMaterial);
  rearBacking.position.set(0, height / 2, rearZ);
  add(rearBacking, "plant_shell_rear_closure");
  // The west side is the camera-facing service elevation. Preserve the closed
  // shell volume with full-height returns, but leave actual wall openings for
  // the existing three side-bay owners so their frames and doors are recessed.
  const westBayOpenings = [
    { center: -18, span: 12.2 },
    { center: 0, span: 17.2 },
    { center: 18, span: 12.2 },
  ];
  let westClosureCursor = -depth / 2;
  westBayOpenings.forEach(({ center, span }, index) => {
    const segmentEnd = center - span / 2;
    const segmentDepth = segmentEnd - westClosureCursor;
    if (segmentDepth > 0.4) {
      const segment = new THREE.Mesh(new RoundedBoxGeometry(0.42, height, segmentDepth, 4, 0.12), shellMaterial);
      segment.position.set(leftX, height / 2, (westClosureCursor + segmentEnd) / 2);
      add(segment, `plant_shell_west_closure_segment_${index + 1}`);
    }
    westClosureCursor = center + span / 2;
  });
  const westFinalDepth = depth / 2 - westClosureCursor;
  if (westFinalDepth > 0.4) {
    const segment = new THREE.Mesh(new RoundedBoxGeometry(0.42, height, westFinalDepth, 4, 0.12), shellMaterial);
    segment.position.set(leftX, height / 2, (westClosureCursor + depth / 2) / 2);
    add(segment, "plant_shell_west_closure_segment_final");
  }
  const rightSide = new THREE.Mesh(new RoundedBoxGeometry(0.42, height, depth, 4, 0.12), shellMaterial);
  rightSide.position.set(rightX, height / 2, 0);
  add(rightSide, "plant_shell_right_closure");
  const plinthWidth = width + 1.8;
  const plinthDepth = depth + 1.6;
  const plinthMinX = -plinthWidth / 2;
  const plinthMaxX = plinthWidth / 2;
  const plinthMinZ = -plinthDepth / 2;
  const plinthMaxZ = plinthDepth / 2;
  const rampVoidMinX = -58.8;
  const rampVoidMaxX = -13.2;
  const rampVoidMinZ = -39.5;
  const rampVoidMaxZ = -14.0;
  const addGroundPlinth = (plinthPartWidth: number, plinthPartDepth: number, localX: number, localZ: number, role: string) => {
    const plinthPart = new THREE.Mesh(new RoundedBoxGeometry(plinthPartWidth, 0.48, plinthPartDepth, 4, 0.12), trimMaterial);
    plinthPart.position.set(localX, 0.24, localZ);
    add(plinthPart, role, "CONCRETE");
  };
  addGroundPlinth(rampVoidMinX - plinthMinX, plinthDepth, (plinthMinX + rampVoidMinX) / 2, 0, "plant_shell_ground_closure_left");
  addGroundPlinth(plinthMaxX - rampVoidMaxX, plinthDepth, (rampVoidMaxX + plinthMaxX) / 2, 0, "plant_shell_ground_closure_right");
  addGroundPlinth(rampVoidMaxX - rampVoidMinX, rampVoidMinZ - plinthMinZ, (rampVoidMinX + rampVoidMaxX) / 2, (plinthMinZ + rampVoidMinZ) / 2, "plant_shell_ground_closure_front");
  addGroundPlinth(rampVoidMaxX - rampVoidMinX, plinthMaxZ - rampVoidMaxZ, (rampVoidMinX + rampVoidMaxX) / 2, (rampVoidMaxZ + plinthMaxZ) / 2, "plant_shell_ground_closure_rear");
  const roof = new THREE.Mesh(new RoundedBoxGeometry(width + 2.0, 0.62, depth + 1.8, 4, 0.14), steelMaterial);
  roof.position.y = height + 0.3;
  add(roof, "plant_shell_roof_closure", "GALVANIZED_STEEL");
  const roofParapet = new THREE.Mesh(new RoundedBoxGeometry(width - 2.0, 1.15, depth - 2.0, 4, 0.12), steelMaterial);
  roofParapet.position.y = height + 0.95;
  add(roofParapet, "plant_shell_roof_parapet", "GALVANIZED_STEEL");

  const bayCount = 6;
  const bayWidth = (width - 12) / bayCount;
  for (let bay = 0; bay < bayCount; bay += 1) {
    const x = -width / 2 + 6 + bayWidth * (bay + 0.5);
    const pilaster = new THREE.Mesh(new RoundedBoxGeometry(0.72, height - 1.2, 0.9, 4, 0.12), steelMaterial);
    pilaster.position.set(x, (height - 1.2) / 2 + 0.6, frontZ - 0.34);
    add(pilaster, `plant_shell_front_pilaster_${bay + 1}`, "GALVANIZED_STEEL");
    for (const rowY of [7.2, 14.8, 22.0]) {
      const windowWidth = Math.min(9.2, bayWidth - 5.0);
      const windowHeight = rowY > 18 ? 2.2 : 2.0;
      const recess = new THREE.Mesh(new RoundedBoxGeometry(windowWidth + 0.9, windowHeight + 0.92, 0.28, 3, 0.05), steelMaterial);
      recess.position.set(x, rowY, frontZ - 0.38);
      add(recess, `plant_shell_glazing_recess_${bay + 1}_${rowY}`, "GALVANIZED_STEEL");
      const window = new THREE.Mesh(new RoundedBoxGeometry(windowWidth, windowHeight, 0.14, 3, 0.035), glazingMaterial);
      window.position.set(x, rowY, frontZ - 0.58);
      add(window, `plant_shell_glazing_bay_${bay + 1}_${rowY}`, "PAINTED_STEEL");
      const frameTop = new THREE.Mesh(new THREE.BoxGeometry(windowWidth + 0.5, 0.14, 0.3), trimMaterial);
      frameTop.position.set(x, rowY + 0.98, frontZ - 0.7);
      add(frameTop, `plant_shell_glazing_frame_top_${bay + 1}_${rowY}`, "GALVANIZED_STEEL");
      const frameBottom = frameTop.clone();
      frameBottom.position.y = rowY - 0.98;
      add(frameBottom, `plant_shell_glazing_frame_bottom_${bay + 1}_${rowY}`, "GALVANIZED_STEEL");
      for (const frameX of [x - windowWidth / 2 - 0.18, x + windowWidth / 2 + 0.18, x]) {
        const mullion = new THREE.Mesh(new THREE.BoxGeometry(0.14, 2.08, 0.3), trimMaterial);
        mullion.position.set(frameX, rowY, frontZ - 0.7);
        add(mullion, `plant_shell_glazing_mullion_${bay + 1}_${rowY}_${frameX}`, "GALVANIZED_STEEL");
      }
    }
  }
  for (const doorX of [-30, 4, 38]) {
    const doorFrameLeft = new THREE.Mesh(new RoundedBoxGeometry(0.62, 10.8, 0.62, 4, 0.1), trimMaterial);
    doorFrameLeft.position.set(doorX - 7.95, 5.55, frontZ - 0.14);
    add(doorFrameLeft, `plant_shell_loading_door_frame_left_${doorX}`, "PAINTED_STEEL");
    const doorFrameRight = doorFrameLeft.clone();
    doorFrameRight.position.x = doorX + 7.95;
    add(doorFrameRight, `plant_shell_loading_door_frame_right_${doorX}`, "PAINTED_STEEL");
    const doorFrameHeader = new THREE.Mesh(new RoundedBoxGeometry(16.5, 0.62, 0.62, 4, 0.1), trimMaterial);
    doorFrameHeader.position.set(doorX, 10.65, frontZ - 0.14);
    add(doorFrameHeader, `plant_shell_loading_door_frame_header_${doorX}`, "PAINTED_STEEL");
    const door = new THREE.Mesh(new RoundedBoxGeometry(14.6, 9.4, 0.16, 4, 0.035), loadingDoorMaterial);
    door.position.set(doorX, 5.5, frontZ + 0.12);
    add(door, `plant_shell_loading_door_${doorX}`, "PAINTED_STEEL");
    for (let rib = 0; rib < 7; rib += 1) {
      const doorRib = new THREE.Mesh(new THREE.BoxGeometry(14.0, 0.09, 0.16), loadingDoorTrimMaterial);
      doorRib.position.set(doorX, 1.55 + rib * 1.24, frontZ + 0.02);
      add(doorRib, `plant_shell_loading_door_rib_${doorX}_${rib + 1}`, "GALVANIZED_STEEL");
    }
    const doorThreshold = new THREE.Mesh(new RoundedBoxGeometry(15.0, 0.16, 1.05, 4, 0.04), trimMaterial);
    doorThreshold.position.set(doorX, 0.08, frontZ - 0.48);
    add(doorThreshold, `plant_shell_loading_door_threshold_${doorX}`, "CONCRETE");
    const lintel = new THREE.Mesh(new RoundedBoxGeometry(17.8, 0.46, 0.8, 3, 0.08), trimMaterial);
    lintel.position.set(doorX, 11.15, frontZ - 0.2);
    add(lintel, `plant_shell_loading_lintel_${doorX}`, "CONCRETE");
    const serviceLight = new THREE.Mesh(new RoundedBoxGeometry(1.45, 0.22, 0.18, 3, 0.04), serviceLightMaterial);
    serviceLight.position.set(doorX, 10.82, frontZ - 0.5);
    add(serviceLight, `plant_shell_loading_service_light_${doorX}`, "PAINTED_STEEL");
    for (const bollardX of [doorX - 8.7, doorX + 8.7]) {
      const bollard = new THREE.Mesh(new RoundedBoxGeometry(0.28, 1.2, 0.28, 4, 0.06), safetyBollardMaterial);
      bollard.position.set(bollardX, 0.6, frontZ - 0.9);
      add(bollard, `plant_shell_loading_bollard_${doorX}_${bollardX}`, "PAINTED_STEEL");
      const bollardCap = new THREE.Mesh(new RoundedBoxGeometry(0.34, 0.08, 0.34, 3, 0.02), trimMaterial);
      bollardCap.position.set(bollardX, 1.24, frontZ - 0.9);
      add(bollardCap, `plant_shell_loading_bollard_cap_${doorX}_${bollardX}`, "GALVANIZED_STEEL");
    }
  }
  const canopy = new THREE.Mesh(new RoundedBoxGeometry(21, 0.38, 3.2, 3, 0.08), steelMaterial);
  canopy.position.set(-30, 11.75, frontZ - 1.95);
  add(canopy, "plant_shell_service_canopy_roof", "GALVANIZED_STEEL");
  for (const x of [-39.5, -20.5]) {
    const canopyPost = new THREE.Mesh(new RoundedBoxGeometry(0.32, 6.4, 0.32, 3, 0.05), steelMaterial);
    canopyPost.position.set(x, 8.5, frontZ - 2.4);
    add(canopyPost, "plant_shell_service_canopy_post", "GALVANIZED_STEEL");
  }
  for (const x of [-width * 0.31, width * 0.31]) {
    const sideBrace = new THREE.Mesh(new THREE.BoxGeometry(0.24, height * 0.72, 0.34), steelMaterial);
    sideBrace.position.set(x, height * 0.48, frontZ - 0.58);
    sideBrace.rotation.z = x < 0 ? -0.07 : 0.07;
    add(sideBrace, "plant_shell_front_diagonal_brace", "GALVANIZED_STEEL");
  }
  const sideFrameMaterial = pressureSliceMaterial(record, 0x405052, 0.62, 0.58);
  const sidePanelMaterial = pressureSliceMaterial(record, 0x4b5b5b, 0.84, 0.24);
  const sideWindowMaterial = new THREE.MeshStandardMaterial({ color: 0x182a2d, roughness: 0.3, metalness: 0.62 });
  for (let bay = 0; bay < 5; bay += 1) {
    const localZ = -depth / 2 + 16 + bay * 30;
    const pier = new THREE.Mesh(new RoundedBoxGeometry(0.78, height - 1.0, 0.96, 4, 0.10), sideFrameMaterial);
    pier.position.set(leftX - 0.34, (height - 1.0) / 2 + 0.5, localZ);
    add(pier, `plant_shell_west_side_pier_${bay + 1}`, "GALVANIZED_STEEL");
    for (const rowY of [5.2, 12.8, 20.4]) {
      const window = new THREE.Mesh(new RoundedBoxGeometry(0.08, 2.7, 12, 3, 0.05), sideWindowMaterial);
      window.position.set(leftX - 0.68, rowY, localZ + (bay % 2 === 0 ? -2.0 : 2.0));
      add(window, `plant_shell_west_side_glazing_${bay + 1}_${rowY}`, "PAINTED_STEEL");
      const sill = new THREE.Mesh(new RoundedBoxGeometry(0.42, 0.16, 12.8, 3, 0.03), trimMaterial);
      sill.position.set(leftX - 0.56, rowY - 1.58, localZ);
      add(sill, `plant_shell_west_side_sill_${bay + 1}_${rowY}`, "CONCRETE");
    }
  }
  for (const railY of [3.8, 10.6, 17.4, 24.2]) {
    const rail = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.18, depth - 2.0), sideFrameMaterial);
    rail.position.set(leftX - 0.38, railY, 0);
    add(rail, `plant_shell_west_side_rail_${railY}`, "GALVANIZED_STEEL");
  }
  const sideDoorFrame = new THREE.Mesh(new RoundedBoxGeometry(0.42, 10.5, 17.0, 3, 0.08), sideFrameMaterial);
  sideDoorFrame.position.set(leftX - 0.48, 5.5, 43);
  add(sideDoorFrame, "plant_shell_west_side_loading_frame", "PAINTED_STEEL");
  const sideDoor = new THREE.Mesh(new RoundedBoxGeometry(0.08, 9.1, 14.4, 3, 0.04), sideWindowMaterial);
  sideDoor.position.set(leftX - 0.72, 5.45, 43);
  add(sideDoor, "plant_shell_west_side_loading_door", "PAINTED_STEEL");
  const sideServiceDoor = new THREE.Mesh(new RoundedBoxGeometry(0.18, 8.8, 12.6, 4, 0.08), loadingDoorMaterial);
  sideServiceDoor.position.set(leftX - 0.88, 4.7, 43);
  add(sideServiceDoor, "plant_shell_west_side_service_door", "PAINTED_STEEL");
  const sideServiceFrame = new THREE.Mesh(new RoundedBoxGeometry(0.32, 0.5, 14.2, 4, 0.08), trimMaterial);
  sideServiceFrame.position.set(leftX - 0.96, 9.35, 43);
  add(sideServiceFrame, "plant_shell_west_side_service_door_header", "GALVANIZED_STEEL");
  for (const localZ of [38.1, 43, 47.9]) {
    const sideDoorRib = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.12, 11.8), loadingDoorTrimMaterial);
    sideDoorRib.position.set(leftX - 1.0, localZ === 43 ? 4.7 : 4.7 + (localZ < 43 ? 1.65 : -1.65), 43);
    sideDoorRib.rotation.y = Math.PI / 2;
    add(sideDoorRib, "plant_shell_west_side_service_door_rib", "GALVANIZED_STEEL");
  }
  const sideServiceCanopy = new THREE.Mesh(new RoundedBoxGeometry(3.6, 0.38, 17.2, 4, 0.08), steelMaterial);
  sideServiceCanopy.position.set(leftX - 2.25, 10.05, 43);
  add(sideServiceCanopy, "plant_shell_west_side_service_canopy_roof", "GALVANIZED_STEEL");
  for (const localZ of [35.4, 50.6]) {
    const sideCanopyPost = new THREE.Mesh(new RoundedBoxGeometry(0.3, 9.0, 0.3, 4, 0.06), steelMaterial);
    sideCanopyPost.position.set(leftX - 3.55, 4.5, localZ);
    add(sideCanopyPost, "plant_shell_west_side_service_canopy_post", "GALVANIZED_STEEL");
  }
  const sideServiceLamp = new THREE.Mesh(new RoundedBoxGeometry(0.24, 0.62, 0.9, 3, 0.06), serviceLightMaterial);
  sideServiceLamp.position.set(leftX - 1.1, 9.2, 43);
  add(sideServiceLamp, "plant_shell_west_side_service_light", "PAINTED_STEEL");
  for (const localZ of [35.4, 50.6]) {
    const sideBollard = new THREE.Mesh(new RoundedBoxGeometry(0.36, 1.2, 0.36, 4, 0.06), safetyBollardMaterial);
    sideBollard.position.set(leftX - 3.0, 0.6, localZ);
    add(sideBollard, "plant_shell_west_side_service_bollard", "PAINTED_STEEL");
  }
  const sideServiceControl = new THREE.Mesh(new RoundedBoxGeometry(0.22, 2.1, 1.8, 4, 0.06), loadingDoorTrimMaterial);
  sideServiceControl.position.set(leftX - 1.1, 1.2, 29.5);
  add(sideServiceControl, "plant_shell_west_side_service_control_box", "PAINTED_STEEL");

  addPlantWestServiceFrontage({ record, leftX, steelMaterial, trimMaterial, loadingDoorMaterial, safetyBollardMaterial, pressureMaterial: pressureSliceMaterial, add });

  const cameraServiceBayZ = 0.0;
  const cameraServiceBayFrame = new THREE.Mesh(new RoundedBoxGeometry(0.52, 10.8, 16.6, 4, 0.1), sideFrameMaterial);
  cameraServiceBayFrame.position.set(leftX - 0.5, 5.55, cameraServiceBayZ);
  add(cameraServiceBayFrame, "plant_shell_camera_visible_service_bay_frame", "PAINTED_STEEL");
  const cameraServiceBayDoor = new THREE.Mesh(new RoundedBoxGeometry(0.2, 9.35, 14.5, 4, 0.05), loadingDoorMaterial);
  cameraServiceBayDoor.position.set(leftX - 0.78, 5.45, cameraServiceBayZ);
  add(cameraServiceBayDoor, "plant_shell_camera_visible_service_bay_dark_rolling_door", "PAINTED_STEEL");
  for (let rib = 0; rib < 7; rib += 1) {
    const cameraServiceBayRib = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.1, 13.9), loadingDoorTrimMaterial);
    cameraServiceBayRib.position.set(leftX - 0.92, 1.4 + rib * 1.25, cameraServiceBayZ);
    cameraServiceBayRib.rotation.y = Math.PI / 2;
    add(cameraServiceBayRib, "plant_shell_camera_visible_service_bay_door_rib", "GALVANIZED_STEEL");
  }
  const cameraServiceBayHeader = new THREE.Mesh(new RoundedBoxGeometry(0.34, 0.52, 15.0, 4, 0.08), trimMaterial);
  cameraServiceBayHeader.position.set(leftX - 1.0, 10.05, cameraServiceBayZ);
  add(cameraServiceBayHeader, "plant_shell_camera_visible_service_bay_header", "GALVANIZED_STEEL");
  const cameraServiceBayCanopy = new THREE.Mesh(new RoundedBoxGeometry(3.9, 0.42, 18.2, 4, 0.08), steelMaterial);
  cameraServiceBayCanopy.position.set(leftX - 2.35, 10.55, cameraServiceBayZ);
  add(cameraServiceBayCanopy, "plant_shell_camera_visible_service_bay_canopy", "GALVANIZED_STEEL");
  for (const bayZ of [cameraServiceBayZ - 8.0, cameraServiceBayZ + 8.0]) {
    const cameraServiceBayPost = new THREE.Mesh(new RoundedBoxGeometry(0.32, 9.2, 0.32, 4, 0.06), steelMaterial);
    cameraServiceBayPost.position.set(leftX - 3.62, 4.6, bayZ);
    add(cameraServiceBayPost, "plant_shell_camera_visible_service_bay_canopy_post", "GALVANIZED_STEEL");
    const cameraServiceBayBollard = new THREE.Mesh(new RoundedBoxGeometry(0.38, 1.24, 0.38, 4, 0.06), safetyBollardMaterial);
    cameraServiceBayBollard.position.set(leftX - 3.08, 0.62, bayZ);
    add(cameraServiceBayBollard, "plant_shell_camera_visible_service_bay_bollard", "PAINTED_STEEL");
  }
  const cameraServiceBayLight = new THREE.Mesh(new RoundedBoxGeometry(0.26, 0.66, 0.92, 3, 0.06), serviceLightMaterial);
  cameraServiceBayLight.position.set(leftX - 1.12, 9.28, cameraServiceBayZ);
  add(cameraServiceBayLight, "plant_shell_camera_visible_service_bay_wall_pack", "PAINTED_STEEL");
  const cameraServiceBayPoint = new THREE.PointLight(0xffa467, 8.5, 18, 2);
  cameraServiceBayPoint.position.set(leftX - 1.8, 6.6, cameraServiceBayZ + 1.4);
  cameraServiceBayPoint.userData.visualCue = "plant_shell_camera_visible_service_bay_warm_light";
  group.add(cameraServiceBayPoint);
  const cameraServiceBayPool = new THREE.Mesh(new THREE.CircleGeometry(3.1, 32), new THREE.MeshBasicMaterial({ color: 0xff9a58, transparent: true, opacity: 0.12, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
  cameraServiceBayPool.rotation.x = -Math.PI / 2;
  cameraServiceBayPool.position.set(leftX - 1.8, 0.215, cameraServiceBayZ + 1.4);
  cameraServiceBayPool.userData.pressurePlantSlice = true;
  cameraServiceBayPool.userData.pressurePlantDetailId = record.id;
  cameraServiceBayPool.userData.authoringRecord = { type: "pressure-plant-detail", ...record, role: "camera_service_bay_warm_ground_pool" };
  group.add(cameraServiceBayPool);

  const addCameraSideLoadingBay = (localZ: number, suffix: string) => {
    const baySpan = 11.4;
    const bayFrame = new THREE.Mesh(new RoundedBoxGeometry(0.5, 10.5, baySpan, 4, 0.08), sideFrameMaterial);
    bayFrame.position.set(leftX - 0.5, 5.35, localZ);
    add(bayFrame, `plant_shell_camera_side_bay_${suffix}_frame`, "PAINTED_STEEL");
    const bayDoor = new THREE.Mesh(new RoundedBoxGeometry(0.18, 8.95, baySpan - 1.8, 4, 0.04), loadingDoorMaterial);
    bayDoor.position.set(leftX - 0.78, 5.05, localZ);
    add(bayDoor, `plant_shell_camera_side_bay_${suffix}_dark_door`, "PAINTED_STEEL");
    const bayHeader = new THREE.Mesh(new RoundedBoxGeometry(0.34, 0.54, baySpan - 1.0, 4, 0.06), trimMaterial);
    bayHeader.position.set(leftX - 1.0, 10.15, localZ);
    add(bayHeader, `plant_shell_camera_side_bay_${suffix}_header`, "GALVANIZED_STEEL");
    for (let rib = 0; rib < 6; rib += 1) {
      const bayRib = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.1, baySpan - 2.0), loadingDoorTrimMaterial);
      bayRib.position.set(leftX - 0.92, 1.45 + rib * 1.42, localZ);
      add(bayRib, `plant_shell_camera_side_bay_${suffix}_door_rib_${rib + 1}`, "GALVANIZED_STEEL");
    }
    const bayCanopy = new THREE.Mesh(new RoundedBoxGeometry(3.7, 0.38, baySpan + 0.8, 4, 0.08), steelMaterial);
    bayCanopy.position.set(leftX - 2.22, 10.55, localZ);
    add(bayCanopy, `plant_shell_camera_side_bay_${suffix}_canopy`, "GALVANIZED_STEEL");
    for (const zOffset of [-(baySpan / 2 - 0.45), baySpan / 2 - 0.45]) {
      const post = new THREE.Mesh(new RoundedBoxGeometry(0.3, 9.2, 0.3, 4, 0.06), steelMaterial);
      post.position.set(leftX - 3.45, 4.6, localZ + zOffset);
      add(post, `plant_shell_camera_side_bay_${suffix}_canopy_post`, "GALVANIZED_STEEL");
      const bumper = new THREE.Mesh(new RoundedBoxGeometry(0.34, 1.34, 0.42, 4, 0.06), safetyBollardMaterial);
      bumper.position.set(leftX - 1.05, 0.68, localZ + zOffset);
      add(bumper, `plant_shell_camera_side_bay_${suffix}_dock_bumper`, "PAINTED_STEEL");
    }
    const baySill = new THREE.Mesh(new RoundedBoxGeometry(0.42, 0.18, baySpan - 1.2, 4, 0.04), trimMaterial);
    baySill.position.set(leftX - 1.0, 0.18, localZ);
    add(baySill, `plant_shell_camera_side_bay_${suffix}_floor_sill`, "CONCRETE");
    const bayLamp = new THREE.Mesh(new RoundedBoxGeometry(0.25, 0.64, 0.9, 3, 0.05), serviceLightMaterial);
    bayLamp.position.set(leftX - 1.12, 9.3, localZ);
    add(bayLamp, `plant_shell_camera_side_bay_${suffix}_wall_pack`, "PAINTED_STEEL");
    const bayPoint = new THREE.PointLight(0xffa467, 3.4, 12, 2);
    bayPoint.position.set(leftX - 1.8, 6.2, localZ + 1.2);
    bayPoint.userData.visualCue = `plant_shell_camera_side_bay_${suffix}_warm_light`;
    group.add(bayPoint);
  };
  addCameraSideLoadingBay(-18, "west");
  addCameraSideLoadingBay(18, "east");

  const sideBayApronMaterial = pressureSliceMaterial(record, 0x8a8c84, 0.9, 0.08);
  const sideBayApron = new THREE.Mesh(new RoundedBoxGeometry(4.6, 0.22, 72, 4, 0.06), sideBayApronMaterial);
  sideBayApron.position.set(leftX - 2.4, 0.11, 0);
  add(sideBayApron, "plant_shell_camera_side_bay_continuous_loading_apron", "CONCRETE");
  const sideBayApronJointMaterial = new THREE.MeshStandardMaterial({ color: 0x555c58, roughness: 0.94, metalness: 0.02 });
  for (const jointZ of [-24, 0, 24]) {
    const joint = new THREE.Mesh(new THREE.BoxGeometry(4.0, 0.035, 0.12), sideBayApronJointMaterial);
    joint.position.set(leftX - 2.4, 0.235, jointZ);
    add(joint, "plant_shell_camera_side_bay_loading_apron_joint", "CONCRETE");
  }
  const sideBaySlotDrain = new THREE.Mesh(new RoundedBoxGeometry(0.16, 0.07, 68, 3, 0.03), new THREE.MeshStandardMaterial({ color: 0x252f30, roughness: 0.9, metalness: 0.46 }));
  sideBaySlotDrain.position.set(leftX - 4.45, 0.23, 0);
  add(sideBaySlotDrain, "plant_shell_camera_side_bay_loading_apron_slot_drain", "CONCRETE");
  for (const downpipeZ of [-30, 30]) {
    const downpipe = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.14, 13.8, 12), steelMaterial);
    downpipe.position.set(leftX - 0.34, 6.9, downpipeZ);
    add(downpipe, "plant_shell_camera_side_bay_wall_downpipe", "GALVANIZED_STEEL");
    for (const clampY of [2.6, 7.2, 11.8]) {
      const clamp = new THREE.Mesh(new RoundedBoxGeometry(0.24, 0.16, 0.46, 3, 0.03), trimMaterial);
      clamp.position.set(leftX - 0.5, clampY, downpipeZ);
      add(clamp, "plant_shell_camera_side_bay_downpipe_clamp", "GALVANIZED_STEEL");
    }
  }

  // Replace the earlier repeated west-side bay dressings with one coherent,
  // grounded frontage owned by this shell. All legacy details remain in the
  // authoring tree for traceability but are suppressed before the new frontage.
  const legacyWestRole = /^(plant_shell_west_side_|plant_shell_camera_visible_service_bay_|plant_shell_camera_side_bay_|plant_west_hero_|plant_west_service_|plant_west_camera_)/i;
  group.traverse((object) => {
    const role = (object.userData.authoringRecord as { role?: string } | undefined)?.role ?? "";
    if (legacyWestRole.test(role)) {
      object.visible = false;
      object.userData.presentationSuppressed = true;
    }
  });
  const referenceBayDoor = new THREE.MeshStandardMaterial({ color: 0x4f625d, roughness: 0.62, metalness: 0.34 });
  const referenceBayInterior = new THREE.MeshStandardMaterial({ color: 0x111b1c, roughness: 0.9, metalness: 0.08 });
  const referenceBayServiceLight = new THREE.MeshStandardMaterial({ color: 0x9b7a4d, emissive: 0x9b7a4d, emissiveIntensity: 1.4, roughness: 0.48, metalness: 0.08 });
  const referenceBayWidth = 13.4;
  // Projection-checked against pressure_midroute_player: world z 59/75/91
  // lands at screen x 568/663/776, keeping all three bays in the readable band.
  const referenceBayCenters = [-6, 10, 26];
  for (const [bayIndex, bayZ] of referenceBayCenters.entries()) {
    const platform = new THREE.Mesh(new RoundedBoxGeometry(3.9, 0.22, referenceBayWidth + 1.0, 5, 0.08), trimMaterial);
    platform.position.set(leftX - 2.0, 0.11, bayZ);
    add(platform, `reference_west_dock_${bayIndex + 1}_grounded_platform`, "CONCRETE");
    const interior = new THREE.Mesh(new RoundedBoxGeometry(0.22, 8.6, referenceBayWidth - 1.0, 4, 0.03), referenceBayInterior);
    interior.position.set(leftX + 0.34, 5.05, bayZ);
    add(interior, `reference_west_dock_${bayIndex + 1}_recessed_interior`, "PAINTED_STEEL");
    const frame = new THREE.Mesh(new RoundedBoxGeometry(0.54, 9.9, referenceBayWidth + 0.65, 4, 0.09), trimMaterial);
    frame.position.set(leftX - 0.35, 5.35, bayZ);
    add(frame, `reference_west_dock_${bayIndex + 1}_deep_frame`, "GALVANIZED_STEEL");
    const door = new THREE.Mesh(new RoundedBoxGeometry(0.16, 8.65, referenceBayWidth - 1.35, 4, 0.035), referenceBayDoor);
    door.position.set(leftX + 0.08, 5.0, bayZ);
    add(door, `reference_west_dock_${bayIndex + 1}_rolling_door`, "PAINTED_STEEL");
    const serviceLight = new THREE.Mesh(new RoundedBoxGeometry(0.12, 0.16, referenceBayWidth - 1.8, 4, 0.025), referenceBayServiceLight);
    serviceLight.position.set(leftX - 0.08, 8.72, bayZ);
    add(serviceLight, `reference_west_dock_${bayIndex + 1}_recessed_service_light`, "PAINTED_STEEL");
    for (let rib = 0; rib < 7; rib += 1) {
      const ribMesh = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.08, referenceBayWidth - 1.55), loadingDoorTrimMaterial);
      ribMesh.position.set(leftX - 0.04, 1.35 + rib * 1.24, bayZ);
      add(ribMesh, `reference_west_dock_${bayIndex + 1}_rolling_door_rib_${rib + 1}`, "GALVANIZED_STEEL");
    }
    const canopy = new THREE.Mesh(new RoundedBoxGeometry(3.7, 0.36, referenceBayWidth + 1.2, 4, 0.08), steelMaterial);
    canopy.position.set(leftX - 2.05, 10.65, bayZ);
    add(canopy, `reference_west_dock_${bayIndex + 1}_loading_canopy`, "GALVANIZED_STEEL");
    for (const zOffset of [-(referenceBayWidth / 2 + 0.2), referenceBayWidth / 2 + 0.2]) {
      const post = new THREE.Mesh(new RoundedBoxGeometry(0.32, 9.2, 0.32, 4, 0.06), steelMaterial);
      post.position.set(leftX - 3.45, 4.6, bayZ + zOffset);
      add(post, `reference_west_dock_${bayIndex + 1}_canopy_post`, "GALVANIZED_STEEL");
      const bollard = new THREE.Mesh(new RoundedBoxGeometry(0.38, 1.2, 0.38, 4, 0.06), safetyBollardMaterial);
      bollard.position.set(leftX - 3.0, 0.6, bayZ + zOffset);
      add(bollard, `reference_west_dock_${bayIndex + 1}_safety_bollard`, "PAINTED_STEEL");
    }
    const lamp = new THREE.Mesh(new RoundedBoxGeometry(0.26, 0.64, 0.92, 3, 0.06), serviceLightMaterial);
    lamp.position.set(leftX - 1.15, 9.25, bayZ);
    add(lamp, `reference_west_dock_${bayIndex + 1}_service_light`, "PAINTED_STEEL");
  }
  const referencePersonnelDoor = new THREE.Mesh(new RoundedBoxGeometry(0.22, 2.6, 2.0, 4, 0.06), referenceBayDoor);
  referencePersonnelDoor.position.set(leftX - 0.7, 1.45, 28.0);
  add(referencePersonnelDoor, "reference_west_personnel_service_door", "PAINTED_STEEL");
  const referencePersonnelFrame = new THREE.Mesh(new RoundedBoxGeometry(0.44, 2.96, 2.34, 4, 0.08), trimMaterial);
  referencePersonnelFrame.position.set(leftX - 0.38, 1.58, 28.0);
  add(referencePersonnelFrame, "reference_west_personnel_service_door_frame", "GALVANIZED_STEEL");
  const referenceDownpipe = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.14, height + 0.8, 12), steelMaterial);
  referenceDownpipe.position.set(leftX - 0.42, (height + 0.8) / 2, 30.8);
  add(referenceDownpipe, "reference_west_facade_downpipe", "GALVANIZED_STEEL");

  // Projection-checked west-shell clerestory ribbon: the first two openings
  // land at screen x 632/800 above the loading-bay sequence; the third is
  // intentionally outside the fixed frame rather than forcing a facade crop.
  const westClerestoryGlass = new THREE.MeshStandardMaterial({ color: 0x162b2d, roughness: 0.28, metalness: 0.62 });
  for (const [windowIndex, windowZ] of [5, 29].entries()) {
    const surround = new THREE.Mesh(new RoundedBoxGeometry(0.36, 2.72, 9.6, 4, 0.08), trimMaterial);
    surround.position.set(leftX - 0.34, 16.5, windowZ);
    add(surround, `reference_west_clerestory_${windowIndex + 1}_frame`, "GALVANIZED_STEEL");
    const glazing = new THREE.Mesh(new RoundedBoxGeometry(0.12, 1.92, 8.5, 4, 0.035), westClerestoryGlass);
    glazing.position.set(leftX - 0.56, 16.5, windowZ);
    add(glazing, `reference_west_clerestory_${windowIndex + 1}_glazing`, "PAINTED_STEEL");
    for (const zOffset of [-2.55, 0, 2.55]) {
      const mullion = new THREE.Mesh(new RoundedBoxGeometry(0.18, 2.12, 0.16, 3, 0.03), trimMaterial);
      mullion.position.set(leftX - 0.68, 16.5, windowZ + zOffset);
      add(mullion, `reference_west_clerestory_${windowIndex + 1}_mullion`, "GALVANIZED_STEEL");
    }
  }

  // A supported west-wall process gallery breaks the long panel field and
  // gives the exposed loading elevation a readable industrial service system.
  // Its endpoints were projection-checked to remain inside the locked frame.
  const galleryPipeMaterial = pressureSliceMaterial(record, 0x5f6d68, 0.58, 0.72);
  const galleryDarkMaterial = pressureSliceMaterial(record, 0x293a38, 0.82, 0.48);
  const galleryX = leftX - 2.82;
  const galleryZStart = -14.0;
  const galleryZEnd = 28.0;
  const galleryZCenter = (galleryZStart + galleryZEnd) / 2;
  const gallerySpan = galleryZEnd - galleryZStart;
  for (const [index, pipeY] of [12.5, 14.35, 16.2].entries()) {
    const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.2 - index * 0.035, 0.2 - index * 0.035, gallerySpan, 20, 2), galleryPipeMaterial);
    pipe.rotation.x = Math.PI / 2;
    pipe.position.set(galleryX, pipeY, galleryZCenter);
    add(pipe, `plant_shell_west_process_gallery_pipe_${index + 1}`, "GALVANIZED_STEEL");
    for (const localZ of [galleryZStart + 10.0, galleryZCenter, galleryZEnd - 10.0]) {
      const saddle = new THREE.Mesh(new RoundedBoxGeometry(0.9, 0.18, 0.74, 4, 0.04), galleryDarkMaterial);
      saddle.position.set(galleryX + 0.26, pipeY - 0.28, localZ);
      add(saddle, `plant_shell_west_process_gallery_pipe_${index + 1}_saddle`, "PAINTED_STEEL");
      const collar = new THREE.Mesh(new THREE.TorusGeometry((0.2 - index * 0.035) * 1.45, 0.055, 8, 20), trimMaterial);
      collar.rotation.x = Math.PI / 2;
      collar.position.set(galleryX, pipeY, localZ);
      add(collar, `plant_shell_west_process_gallery_pipe_${index + 1}_collar`, "GALVANIZED_STEEL");
    }
  }
  for (const localZ of [galleryZStart, galleryZEnd]) {
    const support = new THREE.Mesh(new RoundedBoxGeometry(0.3, 12.45, 0.3, 4, 0.05), galleryPipeMaterial);
    support.position.set(galleryX + 0.22, 6.385, localZ);
    add(support, "plant_shell_west_process_gallery_grounded_support", "GALVANIZED_STEEL");
    const base = new THREE.Mesh(new RoundedBoxGeometry(0.92, 0.16, 0.92, 4, 0.04), trimMaterial);
    base.position.set(galleryX + 0.22, 0.08, localZ);
    add(base, "plant_shell_west_process_gallery_support_base", "CONCRETE");
  }
  const riser = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.19, 6.8, 18, 2), galleryPipeMaterial);
  riser.position.set(galleryX, 9.45, galleryZStart);
  add(riser, "plant_shell_west_process_gallery_end_riser", "GALVANIZED_STEEL");
  const riserValve = new THREE.Mesh(new THREE.TorusGeometry(0.34, 0.08, 8, 20), trimMaterial);
  riserValve.rotation.x = Math.PI / 2;
  riserValve.position.set(galleryX, 10.2, galleryZStart);
  add(riserValve, "plant_shell_west_process_gallery_end_valve", "GALVANIZED_STEEL");
  const wallTermination = new THREE.Mesh(new RoundedBoxGeometry(0.42, 1.65, 1.15, 4, 0.04), galleryDarkMaterial);
  wallTermination.position.set(leftX - 0.42, 14.35, galleryZCenter);
  add(wallTermination, "plant_shell_west_process_gallery_wall_termination", "PAINTED_STEEL");

  const monitorBase = new THREE.Mesh(new RoundedBoxGeometry(18, 2.2, 12, 3, 0.14), trimMaterial);
  monitorBase.position.set(20, height + 1.9, -12);
  add(monitorBase, "plant_shell_roof_service_monitor", "CONCRETE");
  const monitorCap = new THREE.Mesh(new RoundedBoxGeometry(21, 0.34, 14, 3, 0.08), steelMaterial);
  monitorCap.position.set(20, height + 3.15, -12);
  add(monitorCap, "plant_shell_roof_service_monitor_cap", "GALVANIZED_STEEL");
  group.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    const role = (object.userData.authoringRecord as { role?: string } | undefined)?.role ?? "";
    object.castShadow = !/glazing|loading_door_rib|loading_bollard|loading_service_light|west_side_sill/i.test(role);
    object.receiveShadow = true;
  });
  root.add(group);
  pressurePlantSliceObjects.push(group);
  selectableObjects.push(group);
  objectById.set(record.id, group);
}

function addPressurePlantFacadeAssembly(root: THREE.Group, record: PressurePlantSliceDetail) {
  const group = new THREE.Group();
  group.name = record.id;
  group.position.set(record.position.x, record.position.y, record.position.z);
  group.rotation.y = record.rotationY;
  group.userData.pressurePlantSlice = true;
  group.userData.authoringRecord = { type: "pressure-plant-detail", ...record, role: "hybrid_facade_closure", closure: ["front", "side", "rear", "roof", "ground"] };
  const frame = pressureSliceMaterial(record, 0x66716e, 0.62, 0.58);
  const panel = pressureSliceMaterial(record, 0x858880, 0.82, 0.24);
  const glass = new THREE.MeshStandardMaterial({ color: 0x283b3d, roughness: 0.3, metalness: 0.46 });
  const width = record.size.x;
  const height = record.size.y;
  const depth = record.size.z;
  const front = new THREE.Mesh(new RoundedBoxGeometry(width, height, 0.34, 3, 0.08), panel);
  front.position.set(0, height / 2, depth / 2 - 0.16);
  addPressurePlantSliceMesh(root, record, front, "facade_front_closure");
  group.add(front);
  const rear = new THREE.Mesh(new RoundedBoxGeometry(width, height, 0.28, 3, 0.06), panel);
  rear.position.set(0, height / 2, -depth / 2 + 0.14);
  rear.userData.pressurePlantSlice = true;
  rear.userData.pressurePlantDetailId = record.id;
  rear.userData.authoringRecord = { type: "pressure-plant-detail", ...record, role: "facade_rear_closure" };
  group.add(rear);
  for (const localX of [-width / 2 + 0.18, width / 2 - 0.18]) {
    const side = new THREE.Mesh(new RoundedBoxGeometry(0.34, height, depth, 3, 0.08), panel);
    side.position.set(localX, height / 2, 0);
    side.userData.pressurePlantSlice = true;
    side.userData.pressurePlantDetailId = record.id;
    side.userData.authoringRecord = { type: "pressure-plant-detail", ...record, role: "facade_side_return" };
    group.add(side);
  }
  const roof = new THREE.Mesh(new RoundedBoxGeometry(width + 0.8, 0.42, depth + 0.8, 3, 0.08), frame);
  roof.position.y = height / 2 + 0.2;
  roof.userData.pressurePlantSlice = true;
  roof.userData.pressurePlantDetailId = record.id;
  roof.userData.authoringRecord = { type: "pressure-plant-detail", ...record, role: "facade_roof_closure" };
  group.add(roof);
  const ground = new THREE.Mesh(new RoundedBoxGeometry(width + 0.5, 0.16, depth + 0.02, 3, 0.05), pressureSliceMaterial(record, 0x454b48, 0.92, 0.08));
  ground.position.set(0, 0.08, -0.16);
  ground.userData.pressurePlantSlice = true;
  ground.userData.pressurePlantDetailId = record.id;
  ground.userData.authoringRecord = { type: "pressure-plant-detail", ...record, role: "facade_ground_closure" };
  group.add(ground);
  for (let index = 0; index < 6; index += 1) {
    const bayX = -width / 2 + 2.5 + index * (width - 5) / 5;
    const upright = new THREE.Mesh(new THREE.BoxGeometry(0.28, height - 0.8, 0.36), frame);
    upright.position.set(bayX, height / 2, depth / 2 + 0.08);
    upright.userData.pressurePlantSlice = true;
    upright.userData.pressurePlantDetailId = record.id;
    upright.userData.authoringRecord = { type: "pressure-plant-detail", ...record, role: `facade_vertical_bay_${index + 1}` };
    group.add(upright);
    const window = new THREE.Mesh(new RoundedBoxGeometry(3.0, 2.8, 0.06, 3, 0.04), glass);
    window.position.set(bayX + (index % 2 === 0 ? 0.8 : -0.8), Math.min(height - 3, 5.3 + (index % 2) * 4.2), depth / 2 + 0.27);
    window.userData.pressurePlantSlice = true;
    window.userData.pressurePlantDetailId = record.id;
    window.userData.authoringRecord = { type: "pressure-plant-detail", ...record, role: `facade_glazed_bay_${index + 1}` };
    group.add(window);
  }
  for (const barY of [3.5, 7.4, 11.3]) {
    const bar = new THREE.Mesh(new THREE.BoxGeometry(width - 0.8, 0.18, 0.28), frame);
    bar.position.set(0, barY, depth / 2 + 0.08);
    bar.userData.pressurePlantSlice = true;
    bar.userData.pressurePlantDetailId = record.id;
    bar.userData.authoringRecord = { type: "pressure-plant-detail", ...record, role: `facade_horizontal_rail_${barY}` };
    group.add(bar);
  }
  group.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    const role = (object.userData.authoringRecord as { role?: string } | undefined)?.role ?? "";
    object.castShadow = !/facade_glazed_bay|facade_vertical_bay|facade_horizontal_rail/i.test(role);
    object.receiveShadow = true;
  });
  root.add(group);
  pressurePlantSliceObjects.push(group);
  selectableObjects.push(group);
  objectById.set(record.id, group);
}

function addPressurePlantRockAndGrass(root: THREE.Group) {
  const rockRecord = pressurePlantSliceDetails.find((record) => record.id === "slice_plant_rock_cut");
  if (rockRecord) {
    const group = new THREE.Group();
    group.name = rockRecord.id;
    group.position.set(rockRecord.position.x, rockRecord.position.y, rockRecord.position.z);
    group.rotation.y = rockRecord.rotationY;
    group.userData.pressurePlantSlice = true;
    group.userData.authoringRecord = { type: "pressure-plant-detail", ...rockRecord };
    const soil = new THREE.Mesh(new RoundedBoxGeometry(rockRecord.size.x, 0.8, rockRecord.size.z, 4, 0.2), pressureSliceMaterial(rockRecord, 0x55483c, 0.99, 0.01));
    soil.position.y = 0.4;
    addPressurePlantSliceMesh(root, rockRecord, soil, "soil_wedge");
    group.add(soil);
    const rockMaterial = pressureSliceMaterial(rockRecord, 0x70685a, 0.98, 0.0);
    const rockSpecs = [
      { x: -8, y: 1.1, z: -1.8, sx: 3.8, sy: 2.2, sz: 2.6 },
      { x: 0.5, y: 1.4, z: 2.0, sx: 4.4, sy: 2.8, sz: 3.0 },
      { x: 8.2, y: 0.85, z: -2.8, sx: 2.8, sy: 1.7, sz: 2.2 },
    ];
    rockSpecs.forEach((spec, index) => {
      const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(1.0, 1), rockMaterial);
      rock.position.set(spec.x, spec.y, spec.z);
      rock.scale.set(spec.sx, spec.sy, spec.sz);
      rock.rotation.set(0.1 * index, 0.3 * index, 0.12 * index);
      rock.userData.pressurePlantSlice = true;
      rock.userData.pressurePlantDetailId = rockRecord.id;
      rock.userData.authoringRecord = { type: "pressure-plant-detail", ...rockRecord, role: `rock_form_${index + 1}` };
      group.add(rock);
    });
    group.traverse((object) => { if (object instanceof THREE.Mesh) { object.castShadow = true; object.receiveShadow = true; } });
    root.add(group);
    pressurePlantSliceObjects.push(group);
    selectableObjects.push(group);
    objectById.set(rockRecord.id, group);
  }
  const grassRecord = pressurePlantSliceDetails.find((record) => record.id === "slice_plant_grass_verge");
  if (grassRecord) {
    const group = new THREE.Group();
    group.name = grassRecord.id;
    group.position.set(grassRecord.position.x, grassRecord.position.y, grassRecord.position.z);
    group.rotation.y = grassRecord.rotationY;
    group.userData.pressurePlantSlice = true;
    group.userData.authoringRecord = { type: "pressure-plant-detail", ...grassRecord };
    const soil = new THREE.Mesh(new RoundedBoxGeometry(grassRecord.size.x, 0.34, grassRecord.size.z, 3, 0.08), pressureSliceMaterial(grassRecord, 0x4e493a, 0.99, 0.01));
    soil.position.y = 0.17;
    addPressurePlantSliceMesh(root, grassRecord, soil, "grass_soil_bed");
    group.add(soil);
    // Vegetation is sourced-only. This owner keeps the soil bed, while sourced
    // vegetation assets are loaded separately and receive explicit contact solves.
    root.add(group);
    pressurePlantSliceObjects.push(group);
    selectableObjects.push(group);
    objectById.set(grassRecord.id, group);
  }
}

function addPressurePlantWeldingCartFallback(root: THREE.Group, record: PressurePlantSliceDetail) {
  const group = new THREE.Group();
  group.name = record.id;
  group.position.set(record.position.x, record.position.y, record.position.z);
  group.rotation.y = record.rotationY;
  group.userData.pressurePlantSlice = true;
  group.userData.authoringRecord = { type: "pressure-plant-detail", ...record, role: "prepared_glb_fallback" };
  const frame = pressureSliceMaterial(record, 0x6b3f2e, 0.68, 0.54);
  const tray = new THREE.Mesh(new RoundedBoxGeometry(1.3, 0.16, 0.82, 3, 0.08), frame);
  tray.position.y = 0.82;
  addPressurePlantSliceMesh(root, record, tray, "welding_cart_fallback_body");
  group.add(tray);
  for (const wheelX of [-0.45, 0.45]) {
    const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.08, 12), pressureSliceMaterial(record, 0x242827, 0.9, 0.2));
    wheel.rotation.z = Math.PI / 2;
    wheel.position.set(wheelX, 0.2, 0);
    wheel.userData.pressurePlantSlice = true;
    wheel.userData.pressurePlantDetailId = record.id;
    wheel.userData.authoringRecord = { type: "pressure-plant-detail", ...record, role: "welding_cart_fallback_wheel" };
    group.add(wheel);
  }
  const bottle = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.2, 0.62, 12), pressureSliceMaterial(record, 0x7a8a88, 0.62, 0.48));
  bottle.position.set(0.18, 0.48, 0);
  bottle.userData.pressurePlantSlice = true;
  bottle.userData.pressurePlantDetailId = record.id;
  bottle.userData.authoringRecord = { type: "pressure-plant-detail", ...record, role: "welding_cart_fallback_bottle" };
  group.add(bottle);
  root.add(group);
  pressurePlantSliceObjects.push(group);
  selectableObjects.push(group);
  objectById.set(record.id, group);
}


function addPressurePlantUtilityCabinet(root: THREE.Group, record: PressurePlantSliceDetail) {
  const group = new THREE.Group();
  group.name = record.id;
  group.position.set(record.position.x - 5.0, record.position.y, record.position.z - 8.0);
  group.rotation.y = record.rotationY;
  group.userData.pressurePlantSlice = true;
  group.userData.hostRelativeVisualOffset = { x: -5.0, y: 0, z: -8.0 };
  group.userData.authoringRecord = { type: "pressure-plant-detail", ...record, role: "service_control_cabinet", visualOffset: { x: -5.0, y: 0, z: -8.0 } };
  const bodyMaterial = pressureSliceMaterial(record, 0x5b665f, 0.82, 0.42);
  const trimMaterial = pressureSliceMaterial(record, 0x394542, 0.68, 0.62);
  const warningMaterial = new THREE.MeshStandardMaterial({ color: 0xb68f49, roughness: 0.62, metalness: 0.2 });
  const add = (mesh: THREE.Mesh, role: string, materialFamily = record.materialFamily) => {
    mesh.userData.pressurePlantSlice = true;
    mesh.userData.pressurePlantDetailId = record.id;
    mesh.userData.authoringRecord = { type: "pressure-plant-detail", ...record, materialFamily, role };
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);
  };
  const base = new THREE.Mesh(new RoundedBoxGeometry(record.size.x + 0.34, 0.18, record.size.z + 0.26, 4, 0.05), trimMaterial);
  base.position.y = 0.09;
  add(base, "service_control_cabinet_base_plinth", "CONCRETE");
  const body = new THREE.Mesh(new RoundedBoxGeometry(record.size.x, record.size.y - 0.22, record.size.z, 5, 0.08), bodyMaterial);
  body.position.y = 0.22 + (record.size.y - 0.22) / 2;
  add(body, "service_control_cabinet_body");
  const door = new THREE.Mesh(new RoundedBoxGeometry(1.92, 1.38, 0.045, 4, 0.018), bodyMaterial);
  door.position.set(0, 1.0, -record.size.z / 2 - 0.028);
  add(door, "service_control_cabinet_front_door");
  const doorFrame = new THREE.Mesh(new RoundedBoxGeometry(2.08, 1.52, 0.055, 4, 0.02), trimMaterial);
  doorFrame.position.set(0, 1.0, -record.size.z / 2 - 0.055);
  add(doorFrame, "service_control_cabinet_door_frame", "GALVANIZED_STEEL");
  const lock = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.06, 10), trimMaterial);
  lock.rotation.x = Math.PI / 2;
  lock.position.set(0.58, 0.98, -record.size.z / 2 - 0.1);
  add(lock, "service_control_cabinet_lock", "GALVANIZED_STEEL");
  for (const hingeY of [0.58, 1.42]) {
    const hinge = new THREE.Mesh(new RoundedBoxGeometry(0.12, 0.24, 0.08, 3, 0.02), trimMaterial);
    hinge.position.set(-0.93, hingeY, -record.size.z / 2 - 0.09);
    add(hinge, "service_control_cabinet_hinge", "GALVANIZED_STEEL");
  }
  const warningPlate = new THREE.Mesh(new RoundedBoxGeometry(0.34, 0.34, 0.035, 3, 0.01), warningMaterial);
  warningPlate.position.set(-0.52, 1.0, -record.size.z / 2 - 0.09);
  add(warningPlate, "service_control_cabinet_warning_plate", "PAINTED_STEEL");
  const conduit = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.07, 1.25, 10), trimMaterial);
  conduit.position.set(record.size.x * 0.34, record.size.y + 0.52, 0.12);
  add(conduit, "service_control_cabinet_conduit_drop", "GALVANIZED_STEEL");
  const conduitCap = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.1, 10), trimMaterial);
  conduitCap.position.set(record.size.x * 0.34, record.size.y + 1.15, 0.12);
  add(conduitCap, "service_control_cabinet_conduit_cap", "GALVANIZED_STEEL");
  const bankMaterial = pressureSliceMaterial(record, 0x46544f, 0.78, 0.46);
  const bankTrimMaterial = pressureSliceMaterial(record, 0x303d3a, 0.64, 0.62);
  const bankX = record.size.x / 2 + 1.05;
  const bank = new THREE.Mesh(new RoundedBoxGeometry(1.8, 2.15, 0.94, 4, 0.08), bankMaterial);
  bank.position.set(bankX, 1.08, 0);
  add(bank, "service_control_cabinet_secondary_bank", "PAINTED_STEEL");
  const bankBase = new THREE.Mesh(new RoundedBoxGeometry(2.05, 0.16, 1.14, 4, 0.04), bankTrimMaterial);
  bankBase.position.set(bankX, 0.08, 0);
  add(bankBase, "service_control_cabinet_secondary_base", "CONCRETE");
  const bankTop = new THREE.Mesh(new RoundedBoxGeometry(2.02, 0.14, 1.1, 4, 0.03), bankTrimMaterial);
  bankTop.position.set(bankX, 2.22, 0);
  add(bankTop, "service_control_cabinet_secondary_cap", "GALVANIZED_STEEL");
  const bankFront = new THREE.Mesh(new RoundedBoxGeometry(1.34, 1.46, 0.05, 3, 0.018), bankTrimMaterial);
  bankFront.position.set(bankX, 1.13, -0.5);
  add(bankFront, "service_control_cabinet_secondary_door_frame", "GALVANIZED_STEEL");
  const bankWarning = new THREE.Mesh(new RoundedBoxGeometry(0.28, 0.28, 0.04, 3, 0.01), warningMaterial);
  bankWarning.position.set(bankX - 0.42, 1.12, -0.55);
  add(bankWarning, "service_control_cabinet_secondary_warning_plate", "PAINTED_STEEL");
  for (const localX of [bankX - 0.55, bankX + 0.55]) {
    const bankConduit = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.06, 1.25, 10), trimMaterial);
    bankConduit.position.set(localX, 2.8, 0.12);
    add(bankConduit, "service_control_cabinet_secondary_conduit", "GALVANIZED_STEEL");
  }
  root.add(group);
  pressurePlantSliceObjects.push(group);
  selectableObjects.push(group);
  objectById.set(record.id, group);
}

function addPressurePlantCoverBarrier(root: THREE.Group, record: PressurePlantSliceDetail) {
  const group = new THREE.Group();
  group.name = record.id;
  const coverVisualOffsetX = -16;
  const coverVisualOffsetZ = 2;
  group.position.set(record.position.x + coverVisualOffsetX, record.position.y, record.position.z + coverVisualOffsetZ);
  group.rotation.y = record.rotationY;
  group.userData.pressurePlantSlice = true;
  group.userData.hostRelativeVisualOffset = { x: coverVisualOffsetX, y: 0, z: coverVisualOffsetZ };
  group.userData.presentationOnly = true;
  group.userData.authoringRecord = { type: "pressure-plant-detail", ...record, role: "directional_hard_cover_barrier", gameplayBinding: "blockout_cover_pressure_island_a", visualHostOffset: { x: coverVisualOffsetX, y: 0, z: coverVisualOffsetZ } };
  const concrete = pressureSliceMaterial(record, 0x7d8781, 0.96, 0.03);
  const steel = pressureSliceMaterial(record, 0x73817b, 0.82, 0.5);
  const joint = pressureSliceMaterial(record, 0x394744, 0.88, 0.18);
  const base = new THREE.Mesh(new RoundedBoxGeometry(record.size.x - 0.6, 0.14, record.size.z + 0.24, 5, 0.06), joint);
  base.position.y = 0.07;
  base.userData.pressurePlantSlice = true;
  base.userData.pressurePlantDetailId = record.id;
  base.userData.authoringRecord = { type: "pressure-plant-detail", ...record, role: "cover_grounded_plinth" };
  group.add(base);
  const body = new THREE.Mesh(new RoundedBoxGeometry(record.size.x - 3.0, record.size.y - 0.28, record.size.z, 5, 0.18), concrete);
  body.position.y = (record.size.y - 0.28) / 2;
  body.userData.pressurePlantSlice = true;
  body.userData.pressurePlantDetailId = record.id;
  body.userData.authoringRecord = { type: "pressure-plant-detail", ...record, role: "cover_concrete_body" };
  group.add(body);
  for (const localX of [-5.0, 0, 5.0]) {
    const seam = new THREE.Mesh(new RoundedBoxGeometry(0.16, record.size.y - 0.68, 0.06, 3, 0.02), joint);
    seam.position.set(localX, 1.02, -record.size.z / 2 - 0.04);
    seam.userData.pressurePlantSlice = true;
    seam.userData.pressurePlantDetailId = record.id;
    seam.userData.authoringRecord = { type: "pressure-plant-detail", ...record, role: "cover_front_construction_joint" };
    group.add(seam);
  }
  for (const localX of [-record.size.x / 2 + 1.5, record.size.x / 2 - 1.5]) {
    const shoulder = new THREE.Mesh(new THREE.Mesh(new RoundedBoxGeometry(3.0, record.size.y * 0.78, record.size.z + 0.18, 5, 0.18), concrete).geometry, concrete);
    shoulder.position.set(localX, record.size.y * 0.39 + 0.24, 0);
    shoulder.rotation.z = localX < 0 ? -0.16 : 0.16;
    shoulder.userData.pressurePlantSlice = true;
    shoulder.userData.pressurePlantDetailId = record.id;
    shoulder.userData.authoringRecord = { type: "pressure-plant-detail", ...record, role: "cover_angled_end_shoulder" };
    group.add(shoulder);
  }
  const cap = new THREE.Mesh(new RoundedBoxGeometry(record.size.x - 1.0, 0.2, record.size.z + 0.12, 4, 0.06), steel);
  cap.position.y = record.size.y - 0.08;
  cap.userData.pressurePlantSlice = true;
  cap.userData.pressurePlantDetailId = record.id;
  cap.userData.authoringRecord = { type: "pressure-plant-detail", ...record, role: "cover_steel_cap" };
  group.add(cap);
  for (const localX of [-record.size.x / 2 + 2.0, record.size.x / 2 - 2.0]) {
    const guard = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, record.size.z * 0.78, 10), steel);
    guard.rotation.x = Math.PI / 2;
    guard.position.set(localX, record.size.y * 0.82, 0);
    guard.userData.pressurePlantSlice = true;
    guard.userData.pressurePlantDetailId = record.id;
    guard.userData.authoringRecord = { type: "pressure-plant-detail", ...record, role: "cover_edge_protection" };
    group.add(guard);
  }
  const serviceFrameMaterial = pressureSliceMaterial(record, 0x43514f, 0.62, 0.64);
  const serviceFrameZ = record.size.z / 2 + 0.72;
  const addServiceFramePart = (mesh: THREE.Mesh, role: string) => {
    mesh.userData.pressurePlantSlice = true;
    mesh.userData.pressurePlantDetailId = record.id;
    mesh.userData.authoringRecord = { type: "pressure-plant-detail", ...record, materialFamily: "GALVANIZED_STEEL", role };
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);
  };
  for (const localX of [-6.8, 6.8]) {
    const post = new THREE.Mesh(new RoundedBoxGeometry(0.3, 3.8, 0.3, 4, 0.06), serviceFrameMaterial);
    post.position.set(localX, 1.9, serviceFrameZ);
    addServiceFramePart(post, "cover_service_frame_post");
    const brace = new THREE.Mesh(new RoundedBoxGeometry(0.22, 2.2, 0.22, 4, 0.04), serviceFrameMaterial);
    brace.position.set(localX * 0.82, 1.95, serviceFrameZ - 0.22);
    brace.rotation.z = localX < 0 ? -0.18 : 0.18;
    addServiceFramePart(brace, "cover_service_frame_brace");
  }
  const frameHeader = new THREE.Mesh(new RoundedBoxGeometry(14.1, 0.3, 0.3, 4, 0.05), serviceFrameMaterial);
  frameHeader.position.set(0, 3.72, serviceFrameZ);
  addServiceFramePart(frameHeader, "cover_service_frame_header");
  for (const pipeY of [2.05, 2.82]) {
    const servicePipe = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 13.2, 14), serviceFrameMaterial);
    servicePipe.rotation.z = Math.PI / 2;
    servicePipe.position.set(0, pipeY, serviceFrameZ + 0.22);
    addServiceFramePart(servicePipe, "cover_service_frame_pipe_run");
  }
  const addPressureCoverRhythmMesh = (mesh: THREE.Mesh, role: string, surface: "body" | "steel" | "warning") => {
    mesh.userData.pressurePlantSlice = true;
    mesh.userData.pressurePlantDetailId = record.id;
    mesh.userData.presentationOnly = true;
    mesh.userData.authoringRecord = {
      type: "pressure-plant-detail",
      ...record,
      role: `presentation_cover_rhythm_${surface}_${role}`,
      materialFamily: surface === "body" ? "CONCRETE" : "GALVANIZED_STEEL",
    };
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);
  };
  addPressureYardCoverRhythm({ record, add: addPressureCoverRhythmMesh });
  group.traverse((object) => { if (object instanceof THREE.Mesh) { object.castShadow = true; object.receiveShadow = true; } });
  root.add(group);
  pressurePlantSliceObjects.push(group);
  selectableObjects.push(group);
  objectById.set(record.id, group);
}

function addPressurePlantFenceBoundary(root: THREE.Group, record: PressurePlantSliceDetail) {
  const group = new THREE.Group();
  group.name = record.id;
  group.position.set(record.position.x, record.position.y, record.position.z);
  group.rotation.y = record.rotationY;
  group.userData.pressurePlantSlice = true;
  group.userData.authoringRecord = { type: "pressure-plant-detail", ...record, representation: "prepared_chainlink_with_procedural_fallback" };
  const steel = pressureSliceMaterial(record, 0x657570, 0.72, 0.68);
  const postGeometry = new THREE.CylinderGeometry(0.11, 0.16, record.size.y, 12);
  for (const x of [-record.size.x / 2, -record.size.x / 6, record.size.x / 6, record.size.x / 2]) {
    const post = new THREE.Mesh(postGeometry, steel);
    post.position.set(x, record.size.y / 2, 0);
    post.userData.pressurePlantSlice = true;
    post.userData.pressurePlantDetailId = record.id;
    post.userData.authoringRecord = { type: "pressure-plant-detail", ...record, role: "chainlink_post" };
    group.add(post);
    const shoe = new THREE.Mesh(new RoundedBoxGeometry(0.46, 0.1, 0.36, 3, 0.04), steel);
    shoe.position.set(x, 0.05, 0);
    shoe.userData.pressurePlantSlice = true;
    shoe.userData.pressurePlantDetailId = record.id;
    shoe.userData.authoringRecord = { type: "pressure-plant-detail", ...record, role: "chainlink_ground_shoe" };
    group.add(shoe);
  }
  for (const y of [1.05, record.size.y - 0.18]) {
    const rail = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, record.size.x, 10), steel);
    rail.rotation.z = Math.PI / 2;
    rail.position.y = y;
    rail.userData.pressurePlantSlice = true;
    rail.userData.pressurePlantDetailId = record.id;
    rail.userData.authoringRecord = { type: "pressure-plant-detail", ...record, role: "chainlink_tension_rail" };
    group.add(rail);
  }
  const meshMaterial = new THREE.MeshStandardMaterial({ color: 0x465650, roughness: 0.86, metalness: 0.54, transparent: true, opacity: 0.72, side: THREE.DoubleSide, depthWrite: false });
  const panelWidth = record.size.x - 0.62;
  const panelHeight = record.size.y - 0.34;
  const columns = 26;
  const rows = 6;
  const wirePositions: number[] = [];
  const wireIndices: number[] = [];
  const addWireSegment = (a: THREE.Vector2, b: THREE.Vector2) => {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const length = Math.max(0.001, Math.hypot(dx, dy));
    const nx = (-dy / length) * 0.027;
    const ny = (dx / length) * 0.027;
    const base = wirePositions.length / 3;
    wirePositions.push(a.x - nx, a.y - ny, -0.018, a.x + nx, a.y + ny, -0.018, b.x + nx, b.y + ny, -0.018, b.x - nx, b.y - ny, -0.018);
    wireIndices.push(base, base + 1, base + 2, base, base + 2, base + 3);
  };
  const cellWidth = panelWidth / columns;
  const cellHeight = panelHeight / rows;
  for (let column = 0; column < columns; column += 1) {
    for (let row = 0; row < rows; row += 1) {
      const centerX = -panelWidth / 2 + cellWidth * (column + 0.5);
      const centerY = 0.17 + cellHeight * (row + 0.5);
      const halfWidth = cellWidth * 0.42;
      const halfHeight = cellHeight * 0.42;
      const points = [
        new THREE.Vector2(centerX, centerY + halfHeight),
        new THREE.Vector2(centerX + halfWidth, centerY),
        new THREE.Vector2(centerX, centerY - halfHeight),
        new THREE.Vector2(centerX - halfWidth, centerY),
      ];
      for (let edge = 0; edge < 4; edge += 1) addWireSegment(points[edge], points[(edge + 1) % 4]);
    }
  }
  const chainlinkGeometry = new THREE.BufferGeometry();
  chainlinkGeometry.setAttribute("position", new THREE.Float32BufferAttribute(wirePositions, 3));
  chainlinkGeometry.setIndex(wireIndices);
  chainlinkGeometry.computeVertexNormals();
  const mesh = new THREE.Mesh(chainlinkGeometry, meshMaterial);
  mesh.position.y = 0;
  mesh.userData.pressurePlantSlice = true;
  mesh.userData.pressurePlantDetailId = record.id;
  mesh.userData.authoringRecord = { type: "pressure-plant-detail", ...record, role: "chainlink_diamond_wire_panel" };
  group.add(mesh);
  const gateSteel = pressureSliceMaterial(record, 0x3b4948, 0.62, 0.68);
  const gateWarning = new THREE.MeshStandardMaterial({ color: 0xa97945, roughness: 0.62, metalness: 0.18 });
  const gateX = 7.2;
  const addGatePart = (gatePart: THREE.Mesh, role: string, materialFamily = "GALVANIZED_STEEL") => {
    gatePart.userData.pressurePlantSlice = true;
    gatePart.userData.pressurePlantDetailId = record.id;
    gatePart.userData.authoringRecord = { type: "pressure-plant-detail", ...record, materialFamily, role };
    gatePart.castShadow = true;
    gatePart.receiveShadow = true;
    group.add(gatePart);
  };
  for (const localX of [gateX - 2.2, gateX + 2.2]) {
    const gatePost = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.2, record.size.y + 0.42, 12), gateSteel);
    gatePost.position.set(localX, (record.size.y + 0.42) / 2, 0.08);
    addGatePart(gatePost, "chainlink_service_gate_post");
    const gateFoot = new THREE.Mesh(new RoundedBoxGeometry(0.58, 0.12, 0.48, 3, 0.03), gateSteel);
    gateFoot.position.set(localX, 0.06, 0.08);
    addGatePart(gateFoot, "chainlink_service_gate_foot", "CONCRETE");
  }
  const gateHeader = new THREE.Mesh(new RoundedBoxGeometry(4.7, 0.22, 0.22, 4, 0.04), gateSteel);
  gateHeader.position.set(gateX, record.size.y + 0.28, 0.08);
  addGatePart(gateHeader, "chainlink_service_gate_header");
  for (const localY of [0.92, 2.72]) {
    const gateRail = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 4.1, 10), gateSteel);
    gateRail.rotation.z = Math.PI / 2;
    gateRail.position.set(gateX, localY, 0.1);
    addGatePart(gateRail, "chainlink_service_gate_rail");
  }
  const warningPanel = new THREE.Mesh(new RoundedBoxGeometry(0.68, 0.46, 0.06, 3, 0.02), gateWarning);
  warningPanel.position.set(gateX, 2.05, -0.12);
  addGatePart(warningPanel, "chainlink_service_gate_warning_panel", "PAINTED_STEEL");
  const latch = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.22, 10), gateSteel);
  latch.rotation.x = Math.PI / 2;
  latch.position.set(gateX + 1.72, 1.75, -0.15);
  addGatePart(latch, "chainlink_service_gate_latch");
  const junctionBox = new THREE.Mesh(new RoundedBoxGeometry(0.72, 1.1, 0.24, 4, 0.04), pressureSliceMaterial(record, 0x4b5b58, 0.76, 0.44));
  junctionBox.position.set(-record.size.x * 0.31, 1.24, -0.12);
  addGatePart(junctionBox, "chainlink_service_court_junction_box", "PAINTED_STEEL");
  const junctionLid = new THREE.Mesh(new RoundedBoxGeometry(0.46, 0.06, 0.03, 3, 0.01), pressureSliceMaterial(record, 0x9ba39a, 0.6, 0.7));
  junctionLid.position.set(-record.size.x * 0.31, 1.24, -0.26);
  addGatePart(junctionLid, "chainlink_service_court_junction_box_lid", "GALVANIZED_STEEL");
  root.add(group);
  pressurePlantSliceObjects.push(group);
  selectableObjects.push(group);
  objectById.set(record.id, group);
}

function addPressurePlantTreeCluster(root: THREE.Group, record: PressurePlantSliceDetail) {
  const group = new THREE.Group();
  group.name = record.id;
  group.position.set(record.position.x, record.position.y, record.position.z);
  group.rotation.y = record.rotationY;
  group.userData.pressurePlantSlice = true;
  group.userData.authoringRecord = { type: "pressure-plant-detail", ...record, role: "single_windbreak_tree" };
  // Vegetation is sourced exclusively by the Poly Haven close/far LOD loader below.
  // This semantic owner emits only grounded soil geometry; no procedural plant fallback is permitted.
  const soil = new THREE.Mesh(new THREE.CylinderGeometry(3.0, 3.4, 0.18, 24), pressureSliceMaterial(record, 0x665846, 0.98, 0.01));
  soil.position.y = 0.225;
  soil.userData.pressurePlantSlice = true;
  soil.userData.pressurePlantDetailId = record.id;
  soil.userData.authoringRecord = { type: "pressure-plant-detail", ...record, role: "tree_soil_ring" };
  group.add(soil);
  const landscapeSoilMaterial = pressureSliceMaterial(record, 0x514a3a, 0.99, 0.01);
  const landscapeShape = new THREE.Shape();
  landscapeShape.moveTo(-7.2, -1.65);
  landscapeShape.lineTo(-3.5, -2.3);
  landscapeShape.lineTo(2.8, -2.0);
  landscapeShape.lineTo(7.0, -0.9);
  landscapeShape.lineTo(6.1, 1.6);
  landscapeShape.lineTo(1.2, 2.3);
  landscapeShape.lineTo(-4.4, 1.95);
  landscapeShape.closePath();
  const landscapeBed = new THREE.Mesh(new THREE.ShapeGeometry(landscapeShape), landscapeSoilMaterial);
  landscapeBed.rotation.x = -Math.PI / 2;
  landscapeBed.position.set(0, 0.205, 0.15);
  landscapeBed.userData.pressurePlantSlice = true;
  landscapeBed.userData.pressurePlantDetailId = record.id;
  landscapeBed.userData.authoringRecord = { type: "pressure-plant-detail", ...record, role: "tree_landscape_soil_bed" };
  landscapeBed.receiveShadow = true;
  group.add(landscapeBed);
  group.traverse((object) => { if (object instanceof THREE.Mesh) { object.castShadow = true; object.receiveShadow = true; } });
  root.add(group);
  pressurePlantSliceObjects.push(group);
  selectableObjects.push(group);
  objectById.set(record.id, group);
}

function addPressurePlantOpenCvContext() {
  const root = new THREE.Group();
  root.name = "pressure_plant_opencv_context";
  root.userData.pressurePlantSlice = true;
  root.userData.blockoutReference = pressurePlantSliceScope && orthographicBlockoutMode;
  root.userData.source = "accepted OpenCV-derived image-first catalog";
  root.userData.bounds = { minX: -72, maxX: 359, minZ: -147, maxZ: 197 };
  root.visible = pressurePlantSliceScope && orthographicBlockoutMode;
  const allowedIds = new Set([
    "image_building_020_cleanBuilding",
    "image_building_022_cleanBuilding",
    "image_building_023_cleanBuilding",
    "image_building_024_cleanBuilding",
    "image_building_025_cleanBuilding",
    "image_building_026_cleanBuilding",
    "image_building_027_cleanBuilding",
    "image_building_028_cleanBuilding",
    "image_building_029_cleanBuilding",
    "image_surface_pressure_yard",
    "image_surface_plant_apron",
  ]);
  const localElements = activeBlockoutElements.filter((element) => {
    if (!element.tags.includes("IMAGE_DERIVED") || !allowedIds.has(element.id)) return false;
    return element.x + element.sizeX / 2 >= -72 && element.x - element.sizeX / 2 <= 359 && element.z + element.sizeZ / 2 >= -147 && element.z - element.sizeZ / 2 <= 197;
  });
  localElements.forEach((element) => addBlockoutElement(root, element));
  root.traverse((object) => { if (object.userData.blockoutTag) object.visible = false; });
  scene.add(root);
}

function addPressurePlantRearIndustrialDepth(root: THREE.Group) {
  const record = pressurePlantSliceDetails.find((candidate) => candidate.id === "slice_pressure_low_service_shed");
  if (!record) return;
  const group = new THREE.Group();
  group.name = "pressure_plant_rear_industrial_depth";
  group.userData.pressurePlantSlice = true;
  group.userData.presentationOnly = true;
  group.userData.authoringRecord = { type: "pressure-plant-detail", ...record, role: "rear_industrial_depth_modules", materialFamily: "PAINTED_STEEL" };
  const panelMaterial = pressureSliceMaterial(record, 0x69736f, 0.88, 0.24);
  const trimMaterial = pressureSliceMaterial(record, 0x364542, 0.66, 0.58);
  const concreteMaterial = pressureSliceMaterial(record, 0x858980, 0.95, 0.03);
  const glassMaterial = new THREE.MeshStandardMaterial({ color: 0x243638, roughness: 0.34, metalness: 0.52 });
  const ventMaterial = pressureSliceMaterial(record, 0x4b5855, 0.72, 0.56);
  const windowBandMaterial = new THREE.MeshStandardMaterial({ color: 0x17292b, roughness: 0.28, metalness: 0.64 });
  const add = (mesh: THREE.Mesh, role: string, materialFamily = "PAINTED_STEEL") => {
    mesh.userData.pressurePlantSlice = true;
    mesh.userData.pressurePlantDetailId = record.id;
    mesh.userData.presentationOnly = true;
    mesh.userData.authoringRecord = { type: "pressure-plant-detail", ...record, role, materialFamily };
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);
  };
  const modules = [
    { x: 68.0, z: 44.0, width: 22.0, height: 10.8, depth: 17.0, windows: 2 },
    { x: 93.0, z: 42.0, width: 20.0, height: 14.2, depth: 15.0, windows: 2 },
  ];
  for (const [moduleIndex, module] of modules.entries()) {
    const base = new THREE.Mesh(new RoundedBoxGeometry(module.width + 1.4, 0.42, module.depth + 1.2, 5, 0.1), concreteMaterial);
    base.position.set(module.x, 0.21, module.z);
    add(base, `rear_depth_module_${moduleIndex + 1}_grounded_plinth`, "CONCRETE");
    const body = new THREE.Mesh(new RoundedBoxGeometry(module.width, module.height, module.depth, 5, 0.12), panelMaterial);
    body.position.set(module.x, module.height / 2 + 0.42, module.z);
    add(body, `rear_depth_module_${moduleIndex + 1}_full_volume_body`);
    const roof = new THREE.Mesh(new RoundedBoxGeometry(module.width + 1.2, 0.46, module.depth + 1.0, 5, 0.11), trimMaterial);
    roof.position.set(module.x, module.height + 0.68, module.z);
    add(roof, `rear_depth_module_${moduleIndex + 1}_roof_termination`, "GALVANIZED_STEEL");
    const nearFaceZ = module.z + module.depth / 2 + 0.08;
    for (let bay = 0; bay < module.windows; bay += 1) {
      const windowX = module.x - module.width * 0.26 + bay * module.width * 0.52;
      const recess = new THREE.Mesh(new RoundedBoxGeometry(module.width * 0.34, 2.15, 0.18, 3, 0.04), trimMaterial);
      recess.position.set(windowX, module.height * 0.66, nearFaceZ);
      add(recess, `rear_depth_module_${moduleIndex + 1}_window_recess_${bay + 1}`, "GALVANIZED_STEEL");
      const window = new THREE.Mesh(new RoundedBoxGeometry(module.width * 0.30, 1.64, 0.08, 3, 0.02), glassMaterial);
      window.position.set(windowX, module.height * 0.66, nearFaceZ + 0.11);
      add(window, `rear_depth_module_${moduleIndex + 1}_window_glazing_${bay + 1}`, "PAINTED_STEEL");
    }
    for (const stripY of [2.0, 4.8, 7.6, 10.4]) {
      if (stripY > module.height - 0.4) continue;
      const strip = new THREE.Mesh(new RoundedBoxGeometry(0.12, 0.08, module.depth - 1.2, 3, 0.02), trimMaterial);
      strip.position.set(module.x - module.width / 2 + 0.18, stripY + 0.42, module.z);
      add(strip, `rear_depth_module_${moduleIndex + 1}_side_panel_seam`, "GALVANIZED_STEEL");
    }
    const stackX = module.x + module.width * 0.25;
    const stack = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.44, 3.6, 16), ventMaterial);
    stack.position.set(stackX, module.height + 2.4, module.z - module.depth * 0.18);
    add(stack, `rear_depth_module_${moduleIndex + 1}_roof_vent_stack`, "GALVANIZED_STEEL");
    const stackCollar = new THREE.Mesh(new THREE.TorusGeometry(0.43, 0.06, 8, 16), trimMaterial);
    stackCollar.position.set(stackX, module.height + 1.02, module.z - module.depth * 0.18);
    add(stackCollar, `rear_depth_module_${moduleIndex + 1}_roof_vent_collar`, "GALVANIZED_STEEL");
    const stackCap = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.12, 16), trimMaterial);
    stackCap.position.set(stackX, module.height + 4.22, module.z - module.depth * 0.18);
    add(stackCap, `rear_depth_module_${moduleIndex + 1}_roof_vent_cap`, "GALVANIZED_STEEL");
  }
  const interconnect = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([
    new THREE.Vector3(79.5, 7.4, 48.7),
    new THREE.Vector3(80.8, 7.4, 48.7),
    new THREE.Vector3(81.8, 7.9, 47.0),
    new THREE.Vector3(82.8, 7.9, 47.0),
  ]), 12, 0.14, 10, false), ventMaterial);
  add(interconnect, "rear_depth_modules_low_transfer_pipe", "GALVANIZED_STEEL");
  const serviceDoor = new THREE.Mesh(new RoundedBoxGeometry(3.2, 4.6, 0.18, 4, 0.04), windowBandMaterial);
  serviceDoor.position.set(88.2, 2.72, 49.64);
  add(serviceDoor, "rear_depth_module_service_door", "PAINTED_STEEL");
  const serviceDoorHeader = new THREE.Mesh(new RoundedBoxGeometry(3.7, 0.24, 0.34, 3, 0.04), trimMaterial);
  serviceDoorHeader.position.set(88.2, 5.1, 49.52);
  add(serviceDoorHeader, "rear_depth_module_service_door_header", "GALVANIZED_STEEL");
  root.add(group);
  pressurePlantSliceObjects.push(group);
}

function addPressurePlantHardstandOccupancy(root: THREE.Group) {
  const record = pressurePlantSliceDetails.find((candidate) => candidate.id === "slice_plant_welding_cart_datum");
  if (!record) return;
  const group = new THREE.Group();
  group.name = "pressure_plant_hardstand_occupancy";
  group.userData.pressurePlantSlice = true;
  group.userData.presentationOnly = true;
  group.userData.authoringRecord = { type: "pressure-plant-detail", ...record, role: "camera_visible_hardstand_pallet_and_drum_occupancy", materialFamily: "PAINTED_STEEL" };
  const wood = new THREE.MeshStandardMaterial({ color: 0x6d5a40, roughness: 0.94, metalness: 0.02 });
  const woodDark = new THREE.MeshStandardMaterial({ color: 0x3f3d34, roughness: 0.96, metalness: 0.02 });
  const steel = pressureSliceMaterial(record, 0x475654, 0.62, 0.62);
  const drumBody = new THREE.MeshStandardMaterial({ color: 0x6e746b, roughness: 0.72, metalness: 0.45 });
  const warning = new THREE.MeshStandardMaterial({ color: 0xb8793d, roughness: 0.7, metalness: 0.16 });
  const add = (mesh: THREE.Mesh, role: string, materialFamily = "PAINTED_STEEL") => {
    mesh.userData.pressurePlantSlice = true;
    mesh.userData.pressurePlantDetailId = record.id;
    mesh.userData.presentationOnly = true;
    mesh.userData.authoringRecord = { type: "pressure-plant-detail", ...record, role, materialFamily };
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);
  };
  const palletX = 147.0;
  const palletZ = 66.0;
  const palletBase = new THREE.Mesh(new RoundedBoxGeometry(2.5, 0.12, 1.62, 4, 0.04), woodDark);
  palletBase.position.set(palletX, 0.08, palletZ);
  add(palletBase, "camera_visible_hardstand_pallet_grounded_base", "WOOD");
  for (const xOffset of [-0.9, 0, 0.9]) {
    const skid = new THREE.Mesh(new RoundedBoxGeometry(0.2, 0.22, 1.48, 3, 0.035), wood);
    skid.position.set(palletX + xOffset, 0.22, palletZ);
    add(skid, "camera_visible_hardstand_pallet_longitudinal_skid", "WOOD");
  }
  for (const zOffset of [-0.58, -0.19, 0.19, 0.58]) {
    const slat = new THREE.Mesh(new RoundedBoxGeometry(2.36, 0.13, 0.16, 3, 0.028), wood);
    slat.position.set(palletX, 0.39, palletZ + zOffset);
    add(slat, "camera_visible_hardstand_pallet_top_slat", "WOOD");
  }
  const crateA = new THREE.Mesh(new RoundedBoxGeometry(0.8, 0.64, 0.7, 4, 0.05), wood);
  crateA.position.set(palletX - 0.56, 0.78, palletZ - 0.16);
  add(crateA, "camera_visible_hardstand_pallet_crate_a", "WOOD");
  const crateB = new THREE.Mesh(new RoundedBoxGeometry(0.68, 0.52, 0.72, 4, 0.05), wood);
  crateB.position.set(palletX + 0.48, 0.72, palletZ + 0.18);
  add(crateB, "camera_visible_hardstand_pallet_crate_b", "WOOD");
  for (const [index, [drumX, drumZ]] of ([[151.0, 64.0], [154.0, 64.5]] as Array<[number, number]>).entries()) {
    const drumFoot = new THREE.Mesh(new RoundedBoxGeometry(1.18, 0.12, 1.18, 4, 0.06), steel);
    drumFoot.position.set(drumX, 0.06, drumZ);
    add(drumFoot, `camera_visible_hardstand_drum_${index + 1}_grounded_foot`, "GALVANIZED_STEEL");
    const drum = new THREE.Mesh(new THREE.CylinderGeometry(0.54, 0.58, 1.18, 24, 2), drumBody);
    drum.position.set(drumX, 0.7, drumZ);
    add(drum, `camera_visible_hardstand_drum_${index + 1}_body`, "PAINTED_STEEL");
    for (const bandY of [0.32, 1.08]) {
      const band = new THREE.Mesh(new THREE.TorusGeometry(0.56, 0.055, 8, 24), steel);
      band.rotation.x = Math.PI / 2;
      band.position.set(drumX, bandY, drumZ);
      add(band, `camera_visible_hardstand_drum_${index + 1}_steel_band`, "GALVANIZED_STEEL");
    }
    const lid = new THREE.Mesh(new THREE.CylinderGeometry(0.49, 0.49, 0.08, 24), steel);
    lid.position.set(drumX, 1.32, drumZ);
    add(lid, `camera_visible_hardstand_drum_${index + 1}_lid`, "GALVANIZED_STEEL");
    const warningBand = new THREE.Mesh(new THREE.TorusGeometry(0.565, 0.08, 8, 24), warning);
    warningBand.rotation.x = Math.PI / 2;
    warningBand.position.set(drumX, 0.71, drumZ);
    add(warningBand, `camera_visible_hardstand_drum_${index + 1}_warning_band`, "PAINTED_STEEL");
  }
  const safetyMark = new THREE.Mesh(new RoundedBoxGeometry(4.4, 0.025, 0.12, 3, 0.02), warning);
  safetyMark.position.set(150.0, 0.025, 62.8);
  safetyMark.rotation.y = -0.03;
  add(safetyMark, "camera_visible_hardstand_safety_marking", "PAINTED_STEEL");
  root.add(group);
  pressurePlantSliceObjects.push(group);
}

function addPressurePlantForkliftServiceBay(root: THREE.Group) {
  const record = pressurePlantSliceDetails.find((candidate) => candidate.id === "slice_plant_facade_module_datum");
  if (!record) return;
  const group = new THREE.Group();
  group.name = "pressure_plant_canonical_forklift_service_bay";
  group.userData.pressurePlantSlice = true;
  group.userData.presentationOnly = true;
  group.userData.authoringRecord = { type: "pressure-plant-detail", ...record, role: "canonical_forklift_service_bay_presentation_owner", materialFamily: "GALVANIZED_STEEL" };
  const steel = pressureSliceMaterial(record, 0x354543, 0.62, 0.68);
  const darkSteel = pressureSliceMaterial(record, 0x182729, 0.9, 0.28);
  const trim = pressureSliceMaterial(record, 0x68736e, 0.7, 0.58);
  const concrete = pressureSliceMaterial(record, 0x767a72, 0.94, 0.04);
  const warm = new THREE.MeshStandardMaterial({ color: 0xffb86f, emissive: 0x7b3617, emissiveIntensity: 1.05, roughness: 0.32, metalness: 0.08 });
  const add = (mesh: THREE.Mesh, role: string, materialFamily = "GALVANIZED_STEEL") => {
    mesh.userData.pressurePlantSlice = true;
    mesh.userData.pressurePlantDetailId = record.id;
    mesh.userData.presentationOnly = true;
    mesh.userData.authoringRecord = { type: "pressure-plant-detail", ...record, role, materialFamily };
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);
  };
  const bayX = 145.5;
  const bayZ = 68.0;
  const pad = new THREE.Mesh(new RoundedBoxGeometry(10.4, 0.16, 6.0, 5, 0.06), concrete);
  pad.position.set(bayX, 0.08, bayZ);
  add(pad, "canonical_forklift_service_bay_grounded_pad", "CONCRETE");
  const backDoor = new THREE.Mesh(new RoundedBoxGeometry(0.18, 4.9, 7.4, 4, 0.05), darkSteel);
  backDoor.position.set(149.12, 2.55, bayZ);
  add(backDoor, "canonical_forklift_service_bay_recessed_dock_door", "PAINTED_STEEL");
  const doorHeader = new THREE.Mesh(new RoundedBoxGeometry(0.34, 0.32, 8.2, 4, 0.05), trim);
  doorHeader.position.set(149.3, 5.24, bayZ);
  add(doorHeader, "canonical_forklift_service_bay_dock_header", "GALVANIZED_STEEL");
  for (const zOffset of [-3.8, 3.8]) {
    const jamb = new THREE.Mesh(new RoundedBoxGeometry(0.32, 5.25, 0.32, 4, 0.04), steel);
    jamb.position.set(149.3, 2.62, bayZ + zOffset);
    add(jamb, "canonical_forklift_service_bay_dock_jamb", "GALVANIZED_STEEL");
  }
  const canopy = new THREE.Mesh(new RoundedBoxGeometry(10.6, 0.28, 5.2, 5, 0.08), steel);
  canopy.position.set(bayX, 5.68, bayZ);
  canopy.rotation.x = -0.035;
  add(canopy, "canonical_forklift_service_bay_loading_canopy", "GALVANIZED_STEEL");
  for (const zOffset of [-2.1, 2.1]) {
    const post = new THREE.Mesh(new RoundedBoxGeometry(0.28, 5.5, 0.28, 4, 0.04), steel);
    post.position.set(140.2, 2.75, bayZ + zOffset);
    add(post, "canonical_forklift_service_bay_canopy_post", "GALVANIZED_STEEL");
    const foot = new THREE.Mesh(new RoundedBoxGeometry(0.72, 0.12, 0.72, 4, 0.04), concrete);
    foot.position.set(140.2, 0.06, bayZ + zOffset);
    add(foot, "canonical_forklift_service_bay_canopy_post_foot", "CONCRETE");
  }
  const bumper = new THREE.Mesh(new RoundedBoxGeometry(8.1, 0.36, 0.32, 4, 0.05), warm);
  bumper.position.set(145.5, 0.52, 65.24);
  add(bumper, "canonical_forklift_service_bay_loading_edge_bumper", "RUBBER");
  const edgeLight = new THREE.Mesh(new RoundedBoxGeometry(1.25, 0.16, 0.32, 3, 0.04), warm);
  edgeLight.position.set(145.5, 5.28, 65.32);
  add(edgeLight, "canonical_forklift_service_bay_practical_light", "PAINTED_STEEL");
  const bayPoint = new THREE.PointLight(0xffa465, 10.0, 18.0, 2.0);
  bayPoint.position.set(145.5, 4.8, 65.4);
  bayPoint.userData.pressurePlantSlice = true;
  bayPoint.userData.pressurePlantDetailId = record.id;
  bayPoint.userData.presentationOnly = true;
  bayPoint.userData.authoringRecord = { type: "pressure-plant-detail", ...record, role: "canonical_forklift_service_bay_warm_practical" };
  group.add(bayPoint);
  root.add(group);
  pressurePlantSliceObjects.push(group);
}

function addPressurePlantRoadSurfaceBreak(root: THREE.Group) {
  const record = pressurePlantSliceDetails.find((candidate) => candidate.id === "slice_pressure_asphalt_lane");
  if (!record) return;
  const group = new THREE.Group();
  group.name = "pressure_plant_visible_road_surface_break";
  group.userData.pressurePlantSlice = true;
  group.userData.presentationOnly = true;
  group.userData.authoringRecord = { type: "pressure-plant-detail", ...record, role: "camera_visible_transverse_concrete_repair_seam", materialFamily: "CONCRETE" };
  const concrete = pressureSliceMaterial(record, 0x737a73, 0.96, 0.04);
  const joint = pressureSliceMaterial(record, 0x2e3838, 0.98, 0.02);
  const marking = new THREE.MeshStandardMaterial({ color: 0x9d7948, roughness: 0.86, metalness: 0.08 });
  const add = (mesh: THREE.Mesh, role: string, materialFamily = "CONCRETE") => {
    mesh.userData.pressurePlantSlice = true;
    mesh.userData.pressurePlantDetailId = record.id;
    mesh.userData.presentationOnly = true;
    mesh.userData.authoringRecord = { type: "pressure-plant-detail", ...record, role, materialFamily };
    mesh.receiveShadow = true;
    mesh.castShadow = false;
    group.add(mesh);
  };
  const patches = [
    { x: 88, z: 76.0, length: 24.0, width: 0.54 },
    { x: 119, z: 75.9, length: 26.0, width: 0.54 },
  ];
  for (const [index, patch] of patches.entries()) {
    const slab = new THREE.Mesh(new RoundedBoxGeometry(patch.length, 0.065, patch.width, 3, 0.018), concrete);
    slab.position.set(patch.x, 0.038, patch.z);
    slab.rotation.y = -0.07;
    add(slab, `camera_visible_road_concrete_repair_seam_${index + 1}`);
    const jointStart = new THREE.Mesh(new RoundedBoxGeometry(0.08, 0.022, patch.width * 1.16, 3, 0.012), joint);
    jointStart.position.set(patch.x - patch.length / 2 + 0.22, 0.078, patch.z);
    jointStart.rotation.y = -0.07;
    add(jointStart, `camera_visible_road_concrete_repair_seam_${index + 1}_joint_start`, "ASPHALT");
    const jointEnd = new THREE.Mesh(new RoundedBoxGeometry(0.08, 0.022, patch.width * 1.16, 3, 0.012), joint);
    jointEnd.position.set(patch.x + patch.length / 2 - 0.22, 0.078, patch.z);
    jointEnd.rotation.y = -0.07;
    add(jointEnd, `camera_visible_road_concrete_repair_seam_${index + 1}_joint_end`, "ASPHALT");
  }
  const laneMark = new THREE.Mesh(new RoundedBoxGeometry(4.6, 0.025, 0.12, 3, 0.014), marking);
  laneMark.position.set(132, 0.092, 75.6);
  laneMark.rotation.y = -0.07;
  add(laneMark, "camera_visible_road_service_lane_marking", "PAINTED_STEEL");
  root.add(group);
  pressurePlantSliceObjects.push(group);
}

function addPressurePlantOperationalFenceEdge(root: THREE.Group) {
  const record = pressurePlantSliceDetails.find((candidate) => candidate.id === "slice_pressure_low_service_shed");
  if (!record) return;
  const group = new THREE.Group();
  group.name = "pressure_plant_operational_loading_fence_edge";
  group.userData.pressurePlantSlice = true;
  group.userData.presentationOnly = true;
  group.userData.hostId = record.id;
  group.userData.hostSocket = "low_shed_loading_yard_boundary";
  group.userData.supportClass = "GROUNDED";
  group.userData.authoringRecord = { type: "pressure-plant-detail", ...record, role: "camera_visible_operational_loading_fence_and_gate", materialFamily: "GALVANIZED_STEEL", visualHostOffset: { x: -12, y: 0, z: 25 } };
  const steel = pressureSliceMaterial(record, 0x40504c, 0.62, 0.68);
  const darkSteel = pressureSliceMaterial(record, 0x263633, 0.8, 0.52);
  const concrete = pressureSliceMaterial(record, 0x777c75, 0.94, 0.04);
  const safety = new THREE.MeshStandardMaterial({ color: 0xb67b3e, roughness: 0.78, metalness: 0.12 });
  const wire = new THREE.LineBasicMaterial({ color: 0x53615b, transparent: true, opacity: 0.82 });
  const addObject = (object: THREE.Object3D, role: string, materialFamily = "GALVANIZED_STEEL") => {
    object.userData.pressurePlantSlice = true;
    object.userData.pressurePlantDetailId = record.id;
    object.userData.presentationOnly = true;
    object.userData.hostId = record.id;
    object.userData.hostSocket = "low_shed_loading_yard_boundary";
    object.userData.supportClass = "GROUNDED";
    object.userData.authoringRecord = { type: "pressure-plant-detail", ...record, role, materialFamily, visualHostOffset: { x: -12, y: 0, z: 25 } };
    object.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });
    group.add(object);
  };
  const panelX = 130.0;
  const panelStartZ = 62.0;
  const panelEndZ = 76.0;
  const postZs = [panelStartZ, 69.0, panelEndZ];
  for (const [index, z] of postZs.entries()) {
    const foot = new THREE.Mesh(new RoundedBoxGeometry(0.72, 0.12, 0.72, 4, 0.04), concrete);
    foot.position.set(panelX, 0.06, z);
    addObject(foot, `camera_visible_loading_fence_post_${index + 1}_foot`, "CONCRETE");
    const post = new THREE.Mesh(new RoundedBoxGeometry(0.18, 3.45, 0.18, 4, 0.03), steel);
    post.position.set(panelX, 1.78, z);
    addObject(post, `camera_visible_loading_fence_post_${index + 1}`);
    const cap = new THREE.Mesh(new RoundedBoxGeometry(0.3, 0.08, 0.3, 3, 0.02), darkSteel);
    cap.position.set(panelX, 3.54, z);
    addObject(cap, `camera_visible_loading_fence_post_${index + 1}_cap`, "PAINTED_STEEL");
  }
  const panelLength = panelEndZ - panelStartZ;
  for (const [index, z] of [69.0].entries()) {
    const topRail = new THREE.Mesh(new RoundedBoxGeometry(0.13, 0.13, panelLength, 4, 0.03), steel);
    topRail.position.set(panelX, 3.3, z);
    addObject(topRail, `camera_visible_loading_fence_panel_${index + 1}_top_rail`);
    const bottomRail = new THREE.Mesh(new RoundedBoxGeometry(0.1, 0.1, panelLength, 4, 0.025), darkSteel);
    bottomRail.position.set(panelX, 0.28, z);
    addObject(bottomRail, `camera_visible_loading_fence_panel_${index + 1}_bottom_rail`, "PAINTED_STEEL");
  }
  const meshPositions: number[] = [];
  const meshBottom = -panelLength / 2 + 0.12;
  const meshTop = panelLength / 2 - 0.12;
  const meshHeight = 2.86;
  const step = 0.82;
  for (let z = meshBottom; z < meshTop; z += step) {
    meshPositions.push(0, 0.4, z, 0, Math.min(meshHeight, 0.4 + step), Math.min(z + step, meshTop));
    meshPositions.push(0, Math.min(meshHeight, 0.4 + step), z, 0, 0.4, Math.min(z + step, meshTop));
  }
  const meshGeometry = new THREE.BufferGeometry();
  meshGeometry.setAttribute("position", new THREE.Float32BufferAttribute(meshPositions, 3));
  const meshLines = new THREE.LineSegments(meshGeometry, wire);
  meshLines.position.set(panelX, 0, (panelStartZ + panelEndZ) / 2);
  addObject(meshLines, "camera_visible_loading_fence_diamond_mesh", "CHAINLINK");
  const gateX = 145.0;
  const gateZ = 71.0;
  for (const [index, x] of [141.0, 149.0].entries()) {
    const gateFoot = new THREE.Mesh(new RoundedBoxGeometry(0.76, 0.12, 0.76, 4, 0.04), concrete);
    gateFoot.position.set(x, 0.06, gateZ);
    addObject(gateFoot, `camera_visible_loading_gate_post_${index + 1}_foot`, "CONCRETE");
    const gatePost = new THREE.Mesh(new RoundedBoxGeometry(0.2, 3.48, 0.2, 4, 0.035), steel);
    gatePost.position.set(x, 1.79, gateZ);
    addObject(gatePost, `camera_visible_loading_gate_post_${index + 1}`);
  }
  const gateLeaf = new THREE.Group();
  gateLeaf.position.set(gateX, 0.32, gateZ);
  gateLeaf.rotation.y = -0.34;
  const gateFrame = new THREE.Mesh(new RoundedBoxGeometry(7.2, 0.12, 0.12, 4, 0.03), steel);
  gateFrame.position.set(0, 2.98, 0);
  addObject(gateFrame, "camera_visible_loading_gate_open_leaf_top_rail");
  const gateBottom = new THREE.Mesh(new RoundedBoxGeometry(7.2, 0.1, 0.1, 4, 0.025), darkSteel);
  gateBottom.position.set(0, 0, 0);
  addObject(gateBottom, "camera_visible_loading_gate_open_leaf_bottom_rail", "PAINTED_STEEL");
  const gateMeshPositions: number[] = [];
  for (let x = -3.4; x < 3.4; x += 0.9) {
    gateMeshPositions.push(x, 0.12, 0, Math.min(x + 0.9, 3.4), Math.min(2.86, 0.12 + 0.9), 0);
    gateMeshPositions.push(x, Math.min(2.86, 0.12 + 0.9), 0, Math.min(x + 0.9, 3.4), 0.12, 0);
  }
  const gateGeometry = new THREE.BufferGeometry();
  gateGeometry.setAttribute("position", new THREE.Float32BufferAttribute(gateMeshPositions, 3));
  addObject(new THREE.LineSegments(gateGeometry, wire), "camera_visible_loading_gate_open_leaf_diamond_mesh", "CHAINLINK");
  group.add(gateLeaf);
  const signBoard = new THREE.Mesh(new RoundedBoxGeometry(1.7, 1.0, 0.08, 4, 0.035), darkSteel);
  signBoard.position.set(140.0, 2.15, 68.64);
  addObject(signBoard, "camera_visible_loading_fence_access_sign_board", "PAINTED_STEEL");
  const signStripe = new THREE.Mesh(new RoundedBoxGeometry(1.36, 0.12, 0.1, 3, 0.02), safety);
  signStripe.position.set(140.0, 2.3, 68.58);
  addObject(signStripe, "camera_visible_loading_fence_access_sign_warning_stripe", "PAINTED_STEEL");
  const lamp = new THREE.Mesh(new RoundedBoxGeometry(0.6, 0.12, 0.18, 3, 0.025), safety);
  lamp.position.set(139.0, 3.7, 68.84);
  addObject(lamp, "camera_visible_loading_fence_access_light", "PAINTED_STEEL");
  const point = new THREE.PointLight(0xffa466, 4.4, 10.0, 2.0);
  point.position.set(139.0, 3.6, 68.8);
  point.userData.pressurePlantSlice = true;
  point.userData.pressurePlantDetailId = record.id;
  point.userData.presentationOnly = true;
  point.userData.authoringRecord = { type: "pressure-plant-detail", ...record, role: "camera_visible_loading_fence_access_practical" };
  group.add(point);
  root.add(group);
  pressurePlantSliceObjects.push(group);
}

function addPressurePlantVisibleProcessPipeRack(root: THREE.Group) {
  const record = pressurePlantSliceDetails.find((candidate) => candidate.id === "slice_pressure_low_service_shed");
  if (!record) return;
  const group = new THREE.Group();
  group.name = "pressure_plant_visible_process_pipe_rack";
  group.userData.pressurePlantSlice = true;
  group.userData.presentationOnly = true;
  group.userData.hostId = record.id;
  group.userData.hostSocket = "low_shed_west_service_wall_pipe_endpoint";
  group.userData.supportClass = "SUPPORTED";
  group.userData.authoringRecord = { type: "pressure-plant-detail", ...record, role: "camera_visible_supported_process_pipe_rack_presentation", materialFamily: "PAINTED_STEEL", visualHostOffset: { x: -24, y: 0, z: 14 } };
  const steel = pressureSliceMaterial(record, 0x354543, 0.62, 0.68);
  const darkSteel = pressureSliceMaterial(record, 0x182729, 0.84, 0.42);
  const pipeMetal = pressureSliceMaterial(record, 0x5c6963, 0.56, 0.76);
  const warning = new THREE.MeshStandardMaterial({ color: 0xb8783e, roughness: 0.74, metalness: 0.16 });
  const add = (mesh: THREE.Mesh, role: string, materialFamily = "PAINTED_STEEL") => {
    mesh.userData.pressurePlantSlice = true;
    mesh.userData.pressurePlantDetailId = record.id;
    mesh.userData.presentationOnly = true;
    mesh.userData.hostId = record.id;
    mesh.userData.hostSocket = "low_shed_west_service_wall_pipe_endpoint";
    mesh.userData.supportClass = "SUPPORTED";
    mesh.userData.authoringRecord = { type: "pressure-plant-detail", ...record, role, materialFamily, visualHostOffset: { x: -24, y: 0, z: 14 } };
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);
  };
  const rackX = 112;
  const rackZ = 58;
  for (const xOffset of [-6.2, 0, 6.2]) {
    const base = new THREE.Mesh(new RoundedBoxGeometry(0.92, 0.12, 0.8, 4, 0.05), darkSteel);
    base.position.set(rackX + xOffset, 0.06, rackZ);
    add(base, "camera_visible_pipe_rack_grounded_baseplate");
    const upright = new THREE.Mesh(new RoundedBoxGeometry(0.24, 5.0, 0.24, 4, 0.035), steel);
    upright.position.set(rackX + xOffset, 2.56, rackZ);
    add(upright, "camera_visible_pipe_rack_supported_upright");
  }
  for (const [index, [height, zOffset, radius]] of ([[1.56, -0.84, 0.2], [3.08, 0, 0.16], [4.54, 0.84, 0.13]] as Array<[number, number, number]>).entries()) {
    const pipe = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius * 1.05, 12.6, 20, 2), pipeMetal);
    pipe.rotation.z = Math.PI / 2;
    pipe.position.set(rackX, height, rackZ + zOffset);
    add(pipe, `camera_visible_pipe_rack_process_pipe_${index + 1}`);
    for (const xOffset of [-5.48, 5.48]) {
      const flange = new THREE.Mesh(new THREE.TorusGeometry(radius * 1.42, 0.055, 8, 20), steel);
      flange.rotation.y = Math.PI / 2;
      flange.position.set(rackX + xOffset, height, rackZ + zOffset);
      add(flange, `camera_visible_pipe_rack_process_pipe_${index + 1}_flange`);
    }
    const saddle = new THREE.Mesh(new RoundedBoxGeometry(0.88, 0.18, 0.72, 4, 0.04), darkSteel);
    saddle.position.set(rackX, height - radius - 0.12, rackZ + zOffset);
    add(saddle, `camera_visible_pipe_rack_process_pipe_${index + 1}_saddle`);
  }
  const riser = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 1.28, 20, 2), pipeMetal);
  riser.position.set(rackX + 5.72, 3.72, rackZ + 0.84);
  add(riser, "camera_visible_pipe_rack_valve_vertical_riser");
  const valve = new THREE.Mesh(new THREE.TorusGeometry(0.34, 0.08, 8, 20), steel);
  valve.rotation.x = Math.PI / 2;
  valve.position.set(rackX + 5.72, 3.64, rackZ + 0.84);
  add(valve, "camera_visible_pipe_rack_valve_wheel");
  const handle = new THREE.Mesh(new RoundedBoxGeometry(0.86, 0.08, 0.08, 3, 0.025), warning);
  handle.position.set(rackX + 5.72, 3.64, rackZ + 0.84);
  handle.rotation.y = Math.PI / 4;
  add(handle, "camera_visible_pipe_rack_valve_warning_handle");
  const endpoint = new THREE.Mesh(new RoundedBoxGeometry(0.18, 1.8, 2.2, 4, 0.04), darkSteel);
  endpoint.position.set(rackX - 6.68, 2.0, rackZ);
  add(endpoint, "camera_visible_pipe_rack_wall_endpoint_panel");
  const endpointLamp = new THREE.Mesh(new RoundedBoxGeometry(0.1, 0.18, 0.42, 3, 0.025), warning);
  endpointLamp.position.set(rackX - 6.84, 3.0, rackZ);
  add(endpointLamp, "camera_visible_pipe_rack_endpoint_status_lamp");
  root.add(group);
  pressurePlantSliceObjects.push(group);
}

function addPressurePlantForegroundGroundHierarchy(root: THREE.Group) {
  const record = pressurePlantSliceDetails.find((candidate) => candidate.id === "slice_plant_sidewalk_threshold");
  if (!record) return;
  const group = new THREE.Group();
  group.name = "pressure_plant_foreground_ground_hierarchy";
  group.userData.pressurePlantSlice = true;
  group.userData.presentationOnly = true;
  group.userData.authoringRecord = { type: "pressure-plant-detail", ...record, role: "camera_visible_foreground_sidewalk_curb_gutter_family", materialFamily: "CONCRETE" };
  const concrete = pressureSliceMaterial(record, 0x858b83, 0.94, 0.04);
  const curb = pressureSliceMaterial(record, 0x9b9d92, 0.86, 0.06);
  const gutter = pressureSliceMaterial(record, 0x283436, 0.97, 0.24);
  const drain = pressureSliceMaterial(record, 0x67716d, 0.74, 0.62);
  const marking = new THREE.MeshStandardMaterial({ color: 0xb27b3b, roughness: 0.78, metalness: 0.12 });
  const add = (mesh: THREE.Mesh, role: string, materialFamily = "CONCRETE") => {
    mesh.userData.pressurePlantSlice = true;
    mesh.userData.pressurePlantDetailId = record.id;
    mesh.userData.presentationOnly = true;
    mesh.userData.authoringRecord = { type: "pressure-plant-detail", ...record, role, materialFamily };
    mesh.receiveShadow = true;
    mesh.castShadow = true;
    group.add(mesh);
  };
  const segmentCenters = [78, 98, 118, 138];
  for (const [index, x] of segmentCenters.entries()) {
    const slab = new THREE.Mesh(new RoundedBoxGeometry(18.8, 0.14, 4.1, 4, 0.045), concrete);
    slab.position.set(x, 0.13, 82.0);
    add(slab, `camera_visible_foreground_sidewalk_segment_${index + 1}`);
    const slabJoint = new THREE.Mesh(new RoundedBoxGeometry(0.08, 0.025, 3.72, 3, 0.018), gutter);
    slabJoint.position.set(x + 9.46, 0.215, 82.0);
    add(slabJoint, `camera_visible_foreground_sidewalk_segment_${index + 1}_joint`, "PAINTED_STEEL");
  }
  const curbSegments = [78, 98, 118, 138];
  for (const [index, x] of curbSegments.entries()) {
    const curbMesh = new THREE.Mesh(new RoundedBoxGeometry(18.8, 0.34, 0.42, 4, 0.065), curb);
    curbMesh.position.set(x, 0.28, 79.68);
    add(curbMesh, `camera_visible_foreground_raised_curb_segment_${index + 1}`);
    const gutterMesh = new THREE.Mesh(new RoundedBoxGeometry(18.35, 0.045, 0.82, 3, 0.025), gutter);
    gutterMesh.position.set(x, 0.055, 78.98);
    add(gutterMesh, `camera_visible_foreground_dark_gutter_segment_${index + 1}`, "ASPHALT");
  }
  for (const [index, x] of [88, 108, 128, 148].entries()) {
    const grate = new THREE.Mesh(new RoundedBoxGeometry(1.1, 0.055, 0.66, 3, 0.025), drain);
    grate.position.set(x, 0.11, 78.95);
    add(grate, `camera_visible_foreground_drain_grate_${index + 1}`, "GALVANIZED_STEEL");
    for (const offset of [-0.28, 0, 0.28]) {
      const bar = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.025, 0.52), drain);
      bar.position.set(x + offset, 0.155, 78.95);
      add(bar, `camera_visible_foreground_drain_grate_${index + 1}_bar`, "GALVANIZED_STEEL");
    }
  }
  for (const [index, x] of [86, 112, 136].entries()) {
    const dash = new THREE.Mesh(new RoundedBoxGeometry(3.2, 0.026, 0.12, 3, 0.02), marking);
    dash.position.set(x, 0.215, 83.24);
    dash.rotation.y = -0.025;
    add(dash, `camera_visible_foreground_sidewalk_utility_marking_${index + 1}`, "PAINTED_STEEL");
  }
  root.add(group);
  pressurePlantSliceObjects.push(group);
}

function applyPressurePlantSliceAsphaltPbr(colorMap: THREE.Texture, normalMap: THREE.Texture, roughnessMap: THREE.Texture) {
  if (!pressurePlantSliceRoot) return;
  const materials = new Map<string, THREE.MeshStandardMaterial>();
  pressurePlantSliceRoot.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    const record = object.userData.authoringRecord as { materialFamily?: string; id?: string; role?: string } | undefined;
    if (record?.materialFamily !== "ASPHALT") return;
    const role = record.role ?? "";
    const isCameraCourt = /camera_projected_right_service_court/i.test(role);
    const isPrimaryPressureLane = record.id === "slice_pressure_asphalt_lane";
    const isWetTreatment = /wet_asphalt|asphalt_wet_patch|wet_patch|wet_sheen|asphalt_repair/i.test(role);
    if (/concrete_service_apron|service_court|gutter|expansion_joint|drain|storm_drain/i.test(role) && !isCameraCourt) return;
    const key = isWetTreatment ? `pressure_wet_road012a_${role}` : isCameraCourt ? "pressure_camera_court_road012a" : isPrimaryPressureLane ? "pressure_primary_lane_road012a" : record.id ?? "pressure_asphalt";
    let material = materials.get(key);
    if (!material) {
      const tileRepeat: [number, number] = isWetTreatment ? [4.8, 3.6] : isCameraCourt ? [5.5, 3.2] : [9, 10];
      material = isWetTreatment
        ? new THREE.MeshPhysicalMaterial({
            map: cloneTiledTexture(colorMap, tileRepeat[0], tileRepeat[1], THREE.SRGBColorSpace),
            normalMap: cloneTiledTexture(normalMap, tileRepeat[0], tileRepeat[1]),
            roughnessMap: cloneTiledTexture(roughnessMap, tileRepeat[0], tileRepeat[1]),
            color: /wet_sheen/i.test(role) ? 0x596862 : /asphalt_repair/i.test(role) ? 0x4f5a55 : 0x384844,
            roughness: /wet_sheen/i.test(role) ? 0.42 : /asphalt_repair/i.test(role) ? 0.78 : 0.58,
            metalness: 0.035,
            clearcoat: /wet_sheen/i.test(role) ? 0.46 : 0.22,
            clearcoatRoughness: 0.2,
            reflectivity: 0.62,
            envMapIntensity: 0.78,
          })
        : new THREE.MeshStandardMaterial({
            map: cloneTiledTexture(colorMap, tileRepeat[0], tileRepeat[1], THREE.SRGBColorSpace),
            normalMap: cloneTiledTexture(normalMap, tileRepeat[0], tileRepeat[1]),
            roughnessMap: cloneTiledTexture(roughnessMap, tileRepeat[0], tileRepeat[1]),
            color: isCameraCourt ? 0x5f6b65 : 0x64706a,
            roughness: isCameraCourt ? 0.91 : 0.94,
            metalness: 0.018,
          });
      material.normalScale.set(isWetTreatment ? 0.34 : isCameraCourt ? 0.52 : 0.42, isWetTreatment ? 0.34 : isCameraCourt ? 0.52 : 0.42);
      material.userData = { sourceAsset: "asset_ambientcg_road012a_2k", semanticSurface: key, textureScaleMeters: isWetTreatment ? 6.2 : 5.2 };
      materials.set(key, material);
    }
    object.material = material;
    object.userData.environmentMaterial = "ambientCG Road012A / 2K — world-scaled segmented pressure asphalt";
  });
}

function applyPressurePlantSliceFacadePbr(colorMap: THREE.Texture, normalMap: THREE.Texture, roughnessMap: THREE.Texture) {
  if (!pressurePlantSliceRoot) return;
  const sharedPanelMaterial = new THREE.MeshPhysicalMaterial({
    map: cloneTiledTexture(colorMap, 12, 10, THREE.SRGBColorSpace),
    normalMap: cloneTiledTexture(normalMap, 12, 10),
    roughnessMap: cloneTiledTexture(roughnessMap, 12, 10),
    color: 0x858477,
    roughness: 0.74,
    metalness: 0.2,
    clearcoat: 0.18,
    clearcoatRoughness: 0.3,
    reflectivity: 0.64,
  });
  sharedPanelMaterial.normalScale.set(0.74, 0.74);
  sharedPanelMaterial.userData = { sourceAsset: "asset_polyhaven_factory_wall_2k", semanticSurface: "pressure_plant_slice", facadeTreatment: "PRESSURE_PLANT_FACTORY_WALL" };
  const sharedTrimMaterial = new THREE.MeshPhysicalMaterial({
    map: cloneTiledTexture(colorMap, 18, 14, THREE.SRGBColorSpace),
    normalMap: cloneTiledTexture(normalMap, 18, 14),
    roughnessMap: cloneTiledTexture(roughnessMap, 18, 14),
    color: 0x303c3a,
    roughness: 0.58,
    metalness: 0.58,
    clearcoat: 0.26,
    clearcoatRoughness: 0.22,
    reflectivity: 0.72,
  });
  sharedTrimMaterial.normalScale.set(0.42, 0.42);
  sharedTrimMaterial.userData = { sourceAsset: "asset_polyhaven_factory_wall_2k", semanticSurface: "pressure_plant_slice", facadeTreatment: "PRESSURE_PLANT_STEEL_TRIM" };
  pressurePlantSliceRoot.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    const record = object.userData.authoringRecord as { kind?: string; role?: string; id?: string } | undefined;
    if (!record || !["PLANT_SHELL", "LOW_SERVICE_SHED", "FACADE_MODULE_DATUM"].includes(record.kind ?? "")) return;
    const role = record.role ?? "";
    if (/glazing|plant_shell_loading_door_-?\d+$|service_dock|hero_camera_bay|personnel_door|camera_lens|service_cable|welding_cart|reference_west_dock_.*(rolling_door|recessed_interior)|camera_dock_bay_.*(rolling_door|interior_shadow|recessed_opening)|reference_west_personnel_service_door/i.test(role)) return;
    const trim = /pilaster|rail|brace|frame|roof|parapet|monitor|sill|post|clerestory|vent|ground_closure|edge|loading_canopy|rolling_door_rib|downpipe/i.test(role);
    object.material = trim ? sharedTrimMaterial : sharedPanelMaterial;
    object.userData.environmentMaterial = `Poly Haven Factory Wall / 2K — pressure plant ${trim ? "steel trim" : "panel"}`;
  });
}

function applyPressurePlantSliceConcretePbr() {
  if (!pressurePlantSliceRoot) return;
  const baseTexture = getPressureConcreteTexture();
  const variants = [
    { color: 0x737b76, roughness: 0.95, normal: 0.42 },
    { color: 0x8a938c, roughness: 0.97, normal: 0.5 },
    { color: 0x747b76, roughness: 0.94, normal: 0.42 },
  ].map((variant, index) => {
    const texture = baseTexture.clone();
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(index === 0 ? 4.6 : index === 1 ? 3.8 : 5.2, index === 0 ? 3.4 : index === 1 ? 2.8 : 3.8);
    texture.needsUpdate = true;
    const material = new THREE.MeshStandardMaterial({ map: texture, color: variant.color, roughness: variant.roughness, metalness: 0.025 });
    material.normalScale.set(variant.normal, variant.normal);
    material.userData = { sourceAsset: "procedural_pressure_plant_concrete_v2", materialFamily: "CONCRETE", semanticSurface: "pressure_plant_slice_concrete", variant: index };
    return material;
  });
  pressurePlantSliceRoot.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    const record = object.userData.authoringRecord as { materialFamily?: string; id?: string; role?: string } | undefined;
    if (record?.materialFamily !== "CONCRETE") return;
    if (/glazing|loading_door|camera_lens|service_cable|stair_sloped_stringer/i.test(record.role ?? "")) return;
    if (/stair_|gutter|drain_|apron_service_bay_pad/i.test(record.role ?? "")) return;
    const role = record.role ?? "";
    const variantIndex = /transverse|stair|ramp|curb|drain/i.test(role) ? 1 : /sidewalk|apron/i.test(record.id ?? "") ? 2 : 0;
    object.material = variants[variantIndex];
    object.userData.environmentMaterial = `Procedural weathered concrete v2 / ${variantIndex === 0 ? "hardstand" : variantIndex === 1 ? "edge-and-grade" : "pedestrian-apron"}`;
  });
}

function applyPressurePlantSliceSoilPbr(
  dirtFloorColor: THREE.Texture,
  dirtFloorNormal: THREE.Texture,
  dirtFloorRoughness: THREE.Texture,
  parkDirtColor: THREE.Texture,
  parkDirtNormal: THREE.Texture,
  parkDirtRoughness: THREE.Texture,
) {
  if (!pressurePlantSliceRoot) return;
  const materials = new Map<string, THREE.MeshStandardMaterial>();
  const makeMaterial = (family: "GREASY_DIRT" | "PLANTED_SOIL") => {
    const source = family === "GREASY_DIRT"
      ? { color: dirtFloorColor, normal: dirtFloorNormal, roughness: dirtFloorRoughness, repeat: [2.2, 1.4] as const, tint: 0x6a5945, roughnessValue: 0.94, normalScale: 0.58 }
      : { color: parkDirtColor, normal: parkDirtNormal, roughness: parkDirtRoughness, repeat: [1.8, 1.1] as const, tint: 0x514a38, roughnessValue: 0.98, normalScale: 0.72 };
    const material = new THREE.MeshStandardMaterial({
      map: cloneTiledTexture(source.color, source.repeat[0], source.repeat[1], THREE.SRGBColorSpace),
      normalMap: cloneTiledTexture(source.normal, source.repeat[0], source.repeat[1]),
      roughnessMap: cloneTiledTexture(source.roughness, source.repeat[0], source.repeat[1]),
      color: source.tint,
      roughness: source.roughnessValue,
      metalness: 0.0,
    });
    material.normalScale.set(source.normalScale, source.normalScale);
    material.userData = {
      sourceAsset: family === "GREASY_DIRT" ? "asset_polyhaven_dirt_floor_2k" : "asset_polyhaven_park_dirt_2k",
      semanticSurface: family === "GREASY_DIRT" ? "compacted_greasy_service_soil" : "planted_damp_soil",
      textureScaleMeters: family === "GREASY_DIRT" ? 3.8 : 4.6,
    };
    return material;
  };
  materials.set("GREASY_DIRT", makeMaterial("GREASY_DIRT"));
  materials.set("PLANTED_SOIL", makeMaterial("PLANTED_SOIL"));
  pressurePlantSliceRoot.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    const record = object.userData.authoringRecord as { materialFamily?: string; role?: string; kind?: string } | undefined;
    const role = record?.role ?? "";
    const isGreasyDirt = record?.materialFamily === "SOIL_ROCK" || /soil_wedge|service_soil|greasy|compacted/i.test(role);
    const isPlantedSoil = /tree_soil|tree_landscape_soil|grass_soil|planting_bed/i.test(role) || record?.kind === "GRASS_VERGE";
    if (!isGreasyDirt && !isPlantedSoil) return;
    const family = isGreasyDirt && !isPlantedSoil ? "GREASY_DIRT" : "PLANTED_SOIL";
    object.material = materials.get(family)!;
    object.userData.materialFamily = "SOIL_ROCK";
    object.userData.environmentMaterial = family === "GREASY_DIRT"
      ? "Poly Haven Dirt Floor / 2K — compacted greasy service soil"
      : "Poly Haven Park Dirt / 2K — damp planted soil bed";
  });
}

function addPressurePlantSliceEnvironment() {
  const root = new THREE.Group();
  root.name = "pressure_plant_slice_v1";
  root.userData.pressurePlantSlice = true;
  root.userData.blockoutReference = pressurePlantSliceScope && orthographicBlockoutMode;
  root.userData.sliceScope = "pressure_plant";
  root.userData.contractPath = "/map-authoring-output/pressure-plant-slice-contract.json";
  root.userData.treatmentPath = "/map-authoring-output/pressure-plant-slice-treatment.md";
  root.userData.bounds = { minX: -72, maxX: 359, minZ: -147, maxZ: 197 };
  root.visible = pressurePlantSliceScope;
  pressurePlantSliceRoot = root;
  scene.add(root);

  addPressurePlantSliceGroundGrammar(root);
  const cameraGroundRecord = pressurePlantSliceDetails.find((record) => record.id === "slice_pressure_asphalt_lane");
  if (cameraGroundRecord) {
    const pressureSurfaceTexture = getPressureConcreteTexture();
    addPressurePlantCameraGroundHierarchy({ root, record: cameraGroundRecord, pressureMaterial: pressureSliceMaterial, surfaceTexture: pressureSurfaceTexture });
    addPressurePlantForegroundGroundHierarchy(root);
    const cameraLightRecord = pressurePlantSliceDetails.find((record) => record.id === "slice_pressure_light_pole");
    if (cameraLightRecord) addPressurePlantCameraLightTower({ root, record: cameraLightRecord, pressureMaterial: pressureSliceMaterial });
    const processCatwalkRecord = pressurePlantSliceDetails.find((record) => record.id === "slice_plant_facade_module_datum");
    if (processCatwalkRecord) addPressurePlantCameraProcessCatwalk({ root, record: processCatwalkRecord, pressureMaterial: pressureSliceMaterial });
  }
  addPressurePlantRearIndustrialDepth(root);
  addPressurePlantForkliftServiceBay(root);
  addPressurePlantOperationalFenceEdge(root);
  const cabinet = pressurePlantSliceDetails.find((record) => record.kind === "UTILITY_CABINET");
  if (cabinet) addPressurePlantUtilityCabinet(root, cabinet);
  const cover = pressurePlantSliceDetails.find((record) => record.kind === "PRESSURE_COVER");
  if (cover) addPressurePlantCoverBarrier(root, cover);
  const fence = pressurePlantSliceDetails.find((record) => record.kind === "FENCE_BOUNDARY");
  if (fence) addPressurePlantFenceBoundary(root, fence);
  const tree = pressurePlantSliceDetails.find((record) => record.kind === "TREE_CLUSTER");
  if (tree) addPressurePlantTreeCluster(root, tree);
  addPressurePlantGradeInterfaces(root);
  pressurePlantSliceDetails.filter((record) => record.kind === "STREET_LIGHT").forEach((record) => addPressurePlantLight(root, record));
  const surveillance = pressurePlantSliceDetails.find((record) => record.kind === "SURVEILLANCE_CUE");
  if (surveillance) addPressurePlantSurveillanceCue(root, surveillance);
  const pole = pressurePlantSliceDetails.find((record) => record.kind === "ELECTRICAL_POLE");
  if (pole) addPressurePlantElectricalPole(root, pole);
  const rack = pressurePlantSliceDetails.find((record) => record.kind === "PIPE_RACK");
  if (rack) addPressurePlantPipeRack(root, rack);
  const shed = pressurePlantSliceDetails.find((record) => record.kind === "LOW_SERVICE_SHED");
  if (shed) addPressurePlantLowServiceShed(root, shed);
  const shell = pressurePlantSliceDetails.find((record) => record.kind === "PLANT_SHELL");
  if (shell) addPressurePlantVolumetricShell(root, shell);
  const facade = pressurePlantSliceDetails.find((record) => record.kind === "FACADE_MODULE_DATUM");
  if (facade) addPressurePlantFacadeAssembly(root, facade);
  addPressurePlantRockAndGrass(root);
  // The pressure plant uses the sourced Poly Haven welding cart loader only.
  // Do not instantiate the rejected procedural vehicle fallback.
  objectById.set(root.name, root);
}

function addRoute(route: RouteRecord) {
  const points = route.points.map((p) => new THREE.Vector3(p.x, p.y, p.z));
  const line = new THREE.Line(
    new THREE.BufferGeometry().setFromPoints(points),
    new THREE.LineBasicMaterial({ color: route.kind === "PRIMARY" ? 0xff7b32 : route.kind === "FLANK" ? 0x62d5c8 : 0xe4c06e, transparent: true, opacity: 0.95 }),
  );
  line.name = route.id;
  line.userData.authoringRecord = { type: "route", ...route };
  pathObjects.push(line);
  selectableObjects.push(line);
  objectById.set(route.id, line);
  scene.add(line);

  for (const point of points) {
    const node = new THREE.Mesh(new THREE.SphereGeometry(route.kind === "PRIMARY" ? 2.1 : 1.5, 10, 6), new THREE.MeshBasicMaterial({ color: route.kind === "PRIMARY" ? 0xff7b32 : route.kind === "FLANK" ? 0x62d5c8 : 0xe4c06e }));
    node.position.copy(point);
    node.userData.authoringRecord = { type: "route", ...route };
    pathObjects.push(node);
    scene.add(node);
  }
}

function addVolume(volume: VolumeRecord) {
  const group = new THREE.Group();
  group.name = volume.id;
  group.userData.authoringRecord = { type: "volume", ...volume };
  const geometry = new THREE.BoxGeometry(volume.size.x, volume.size.y, volume.size.z);
  const material = new THREE.MeshBasicMaterial({ color: volume.color, transparent: true, opacity: 0.09, depthWrite: false });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.userData.authoringRecord = { type: "volume", ...volume };
  group.add(mesh);
  const edge = new THREE.LineSegments(new THREE.EdgesGeometry(geometry), new THREE.LineBasicMaterial({ color: volume.color, transparent: true, opacity: 0.75 }));
  edge.userData.authoringRecord = { type: "volume", ...volume };
  group.add(edge);
  group.position.set(volume.center.x, volume.center.y, volume.center.z);
  volumeObjects.push(group);
  selectableObjects.push(mesh, edge);
  objectById.set(volume.id, mesh);
  scene.add(group);
}

function addObjective() {
  const objective = new THREE.Group();
  objective.name = "objective_llm_core";
  objective.userData.authoringRecord = { type: "objective", ...topology.objective };
  objective.position.set(topology.objective.position.x, topology.objective.position.y, topology.objective.position.z);

  const plinth = new THREE.Mesh(new THREE.CylinderGeometry(22, 25, 4, 8), new THREE.MeshStandardMaterial({ color: 0x23282a, roughness: 0.8, metalness: 0.2 }));
  plinth.position.y = -topology.objective.position.y + 2;
  objective.add(plinth);
  const tower = new THREE.Mesh(new THREE.BoxGeometry(16, 34, 16), makeObjectiveMaterial());
  tower.position.y = 17 - topology.objective.position.y;
  tower.userData.authoringRecord = { type: "objective", ...topology.objective };
  objective.add(tower);
  const ring = new THREE.Mesh(new THREE.RingGeometry(20, 23, 48), new THREE.MeshBasicMaterial({ color: 0xff7b32, transparent: true, opacity: 0.62, side: THREE.DoubleSide }));
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.8 - topology.objective.position.y;
  objective.add(ring);

  selectableObjects.push(tower, ring);
  objectById.set(topology.objective.id, tower);
  scene.add(objective);
}

function addHumanReference() {
  const group = new THREE.Group();
  group.name = "human_reference";
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.25, 1.3, 5, 10), new THREE.MeshStandardMaterial({ color: 0xe8ecee, roughness: 0.64, metalness: 0.12 }));
  body.position.y = 0.65;
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.18, 12, 8), new THREE.MeshStandardMaterial({ color: 0xff7b32, roughness: 0.6 }));
  head.position.y = 1.56;
  group.add(body, head);
  group.position.set(-292, 0, 178);
  group.userData.authoringRecord = { type: "human", ...topology.humanReference };
  group.userData.blockoutReference = true;
  humanObjects.push(group);
  scene.add(group);
}

function addCalibrationFixture() {
  const fixture = new THREE.Group();
  fixture.name = "calibration_fixture";
  fixture.visible = urlParams.get("sliceCalibration") === "1";
  fixture.userData.calibrationFixture = true;
  fixture.userData.blockoutReference = true;
  fixture.userData.contract = { playerHeightMeters: topology.humanReference.bodyHeight, eyeHeightMeters: topology.humanReference.eyeHeight, shoulderWidthMeters: topology.humanReference.shoulderWidth, crouchHeightMeters: topology.humanReference.crouchHeight, playerRadiusMeters: 0.4 };
  fixture.position.set(-306, 0, 167);

  const bodyMaterial = new THREE.MeshStandardMaterial({ color: 0xe8ecee, roughness: 0.64, metalness: 0.12, transparent: true, opacity: 0.84 });
  const datumMaterial = new THREE.MeshBasicMaterial({ color: 0xffa15e, transparent: true, opacity: 0.9 });
  const gaugeMaterial = new THREE.MeshBasicMaterial({ color: 0x83c6c9, transparent: true, opacity: 0.82, wireframe: true });
  const gridMaterial = new THREE.LineBasicMaterial({ color: 0x9aa7a5, transparent: true, opacity: 0.42 });
  const boardMaterial = new THREE.MeshStandardMaterial({ color: 0x4a5554, roughness: 0.92, metalness: 0.12, transparent: true, opacity: 0.86 });

  const human = new THREE.Group();
  human.name = "calibration_player_1_8m";
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.25, 1.3, 6, 12), bodyMaterial);
  body.position.y = 0.65;
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.18, 16, 10), bodyMaterial);
  head.position.y = 1.56;
  human.add(body, head);
  fixture.add(human);

  const eyeDatum = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.025, 0.025), datumMaterial);
  eyeDatum.name = "calibration_eye_height_1_62m";
  eyeDatum.position.set(0, topology.humanReference.eyeHeight, 0);
  fixture.add(eyeDatum);
  const cameraMarker = new THREE.Mesh(new THREE.SphereGeometry(0.09, 12, 8), datumMaterial);
  cameraMarker.name = "calibration_camera_height_marker";
  cameraMarker.position.set(1.2, topology.humanReference.eyeHeight, 0);
  fixture.add(cameraMarker);

  const gridPoints: number[] = [];
  for (let coordinate = -5; coordinate <= 5; coordinate += 1) {
    gridPoints.push(-5, 0.015, coordinate, 5, 0.015, coordinate, coordinate, 0.015, -5, coordinate, 0.015, 5);
  }
  const gridGeometry = new THREE.BufferGeometry();
  gridGeometry.setAttribute("position", new THREE.Float32BufferAttribute(gridPoints, 3));
  const grid = new THREE.LineSegments(gridGeometry, gridMaterial);
  grid.name = "calibration_metric_grid_1m";
  fixture.add(grid);

  const door = new THREE.Group();
  door.name = "calibration_door_gauge";
  door.position.set(4.2, 0, 0);
  const doorPostLeft = new THREE.Mesh(new THREE.BoxGeometry(0.08, 2.25, 0.08), datumMaterial);
  doorPostLeft.position.set(-0.55, 1.125, 0);
  const doorPostRight = doorPostLeft.clone();
  doorPostRight.position.x = 0.55;
  const doorHeader = new THREE.Mesh(new THREE.BoxGeometry(1.18, 0.08, 0.08), datumMaterial);
  doorHeader.position.y = 2.25;
  door.add(doorPostLeft, doorPostRight, doorHeader);
  fixture.add(door);

  const stair = new THREE.Group();
  stair.name = "calibration_stair_gauge";
  stair.position.set(0, 0, 4.0);
  for (let step = 0; step < 6; step += 1) {
    const tread = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.18, 0.32), gaugeMaterial);
    tread.position.set(0, 0.09 + step * 0.18, step * 0.32);
    stair.add(tread);
  }
  fixture.add(stair);

  const coverBands = new THREE.Group();
  coverBands.name = "calibration_cover_height_bands";
  coverBands.position.set(-4.0, 0, 0);
  for (const [index, height] of [0.6, 1.0, 1.35, 1.8].entries()) {
    const band = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.025, 0.05), datumMaterial);
    band.name = `calibration_cover_band_${index}_${height}m`;
    band.position.set(0, height, 0);
    coverBands.add(band);
  }
  fixture.add(coverBands);

  const vehicleBoard = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.08, 1.8), boardMaterial);
  vehicleBoard.name = "calibration_vehicle_scale_board_4_2m";
  vehicleBoard.position.set(-4.0, 0.04, 4.0);
  fixture.add(vehicleBoard);
  const vehicleOutline = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(4.2, 1.8, 1.8)), datumMaterial);
  vehicleOutline.name = "calibration_vehicle_outline";
  vehicleOutline.position.set(-4.0, 0.9, 4.0);
  fixture.add(vehicleOutline);

  scene.add(fixture);
}

function updateToggleButtons() {
  document.querySelectorAll<HTMLButtonElement>("[data-toggle]").forEach((button) => {
    const toggle = button.dataset.toggle;
    const active = (toggle === "zones" && showZones) || (toggle === "masses" && showMasses) || (toggle === "connectors" && showConnectors) || (toggle === "fabric" && showFabric) || (toggle === "paths" && showPaths) || (toggle === "volumes" && showVolumes) || (toggle === "human" && showHuman) || (toggle === "grid" && showGrid) || (toggle === "assets" && showAssets) || (toggle === "details" && showDetails) || (toggle === "blockout" && showBlockout) || (toggle === "blockout-tags" && showBlockoutTags) || (toggle === "xray" && showXray);
    button.classList.toggle("active", Boolean(active));
  });
}

function updatePresetButtons() {
  document.querySelectorAll<HTMLButtonElement>("[data-preset]").forEach((button) => button.classList.toggle("active", button.dataset.preset === reviewMode));
  reviewLabel.textContent = reviewMode === "site" ? "SITE PLAN" : reviewMode === "gameplay" ? "GAMEPLAY" : reviewMode === "systems" ? "SYSTEMS AUDIT" : reviewMode === "slice" ? "VERTICAL SLICE" : reviewMode === "core_approach" ? "CORE APPROACH" : reviewMode === "blockout" ? "FULL BLOCKOUT" : "CUSTOM";
}

function setReviewMode(mode: Exclude<ReviewMode, "custom">) {
  reviewMode = mode;
  showBlockout = false;
  showBlockoutTags = false;
  showXray = false;
  if (mode === "site") {
    showZones = false;
    showMasses = !approvedDenseVisualMode;
    showConnectors = !approvedDenseVisualMode;
    showFabric = !approvedDenseVisualMode;
    showPaths = false;
    showVolumes = false;
    showHuman = true;
    showGrid = false;
    showAssets = true;
    showDetails = !approvedDenseVisualMode;
    showBlockout = approvedDenseVisualMode;
    showBlockoutTags = false;
    showXray = false;
    setView(approvedDenseVisualMode && urlParams.get("view") === "perspective" ? "perspective" : "top");
    statusMessage.textContent = "SITE PLAN / campus fabric, roads, masses, sourced facade, service details, and human scale.";
  } else if (mode === "gameplay") {
    showZones = true;
    showMasses = false;
    showConnectors = true;
    showFabric = true;
    showPaths = true;
    showVolumes = false;
    showHuman = true;
    showGrid = false;
    showAssets = true;
    showDetails = true;
    setView("top");
    statusMessage.textContent = "GAMEPLAY DIAGRAM / zones, transitions, routes, objective approaches, and perimeter cues.";
  } else if (mode === "slice") {
    showZones = false;
    showMasses = true;
    showConnectors = pressurePlantSliceScope;
    showFabric = pressurePlantSliceScope;
    showPaths = false;
    showVolumes = false;
    showHuman = true;
    showGrid = false;
    showAssets = true;
    showDetails = true;
    setView("perspective");
    statusMessage.textContent = pressurePlantSliceScope
      ? "PRESSURE + PLANT SLICE / fixed local cameras, raised apron, service lane, supported utilities, facade closure, and human scale."
      : "VERTICAL SLICE / presentation road, service edge, closed kill-zone architecture, sourced fence, and human scale.";
  } else if (mode === "core_approach") {
    showZones = false;
    showMasses = true;
    showConnectors = true;
    showFabric = true;
    showPaths = false;
    showVolumes = false;
    showHuman = true;
    showGrid = false;
    showAssets = true;
    showDetails = true;
    showBlockout = false;
    showBlockoutTags = false;
    showXray = false;
    setView("perspective");
    statusMessage.textContent = "CORE APPROACH / plant-side threshold, security hall, remote terminal, service density, and human scale.";
  } else if (mode === "blockout") {
    showZones = false;
    showMasses = pressurePlantSliceScope;
    showConnectors = pressurePlantSliceScope;
    showFabric = pressurePlantSliceScope;
    showPaths = false;
    showVolumes = false;
    showHuman = true;
    showGrid = false;
    showAssets = pressurePlantSliceScope;
    showDetails = pressurePlantSliceScope;
    showBlockout = !pressurePlantSliceScope;
    showBlockoutTags = !pressurePlantSliceScope && urlParams.get("tags") === "1";
    showXray = urlParams.get("xray") === "1";
    setView(urlParams.get("view") === "axon" ? "axon" : "top");
    statusMessage.textContent = pressurePlantSliceScope
      ? `PRESSURE + PLANT ORTHOGRAPHIC / ${pressurePlantSliceDetails.length} local authored records / selected OpenCV hosts retained / full-map blockout hidden for local review.`
      : `FULL BLOCKOUT / ${activeBlockoutElements.length} named elements / tags available by toggle / orthographic review.`;
  } else {
    showZones = false;
    showMasses = false;
    showConnectors = false;
    showFabric = false;
    showPaths = true;
    showVolumes = true;
    showHuman = false;
    showGrid = true;
    showAssets = false;
    showDetails = false;
    showBlockout = false;
    showBlockoutTags = false;
    showXray = false;
    setView("top");
    statusMessage.textContent = "SYSTEMS AUDIT / routes, deployment envelopes, air access, and surveillance.";
  }
  updateVisibility();
  updateBlockoutHud();
  updateToggleButtons();
  updatePresetButtons();
}

const arrivalServiceBuildingSpaces = new Set(["space_insertion_edge", "space_service_district"]);
const arrivalServiceFabricIds = new Set(["fabric_campus_surface", "fabric_arrival_road", "fabric_loading_apron", "fabric_west_perimeter_wall"]);
const arrivalServiceDetailIds = new Set([
  "arrival_slice_entry_gatehouse",
  "arrival_slice_loading_canopy",
  "arrival_slice_service_yard",
  "arrival_slice_supported_pipe_rack",
  "arrival_slice_grounded_surveillance",
  "arrival_slice_drone_perch",
  "arrival_slice_cover_cluster_0",
  "arrival_slice_cover_cluster_1",
  "arrival_slice_cover_cluster_2",
]);
const arrivalServiceCompositionIds = new Set([
  "arrival_service_slice_rebuild",
]);
const arrivalServiceAssetNameFragments = [
  "asset_sketchfab_gmc_arrival_environment_vehicle",
  "asset_sketchfab_fiat_arrival_secondary_environment_vehicle",
  "asset_polyhaven_security_camera",
  "asset_polyhaven_portable_generator",
  "asset_polyhaven_pipe_rack",
  "asset_polyhaven_factory_threshold_subset",
];

function isArrivalServiceBuilding(object: THREE.Object3D) {
  const record = object.userData.authoringRecord as { zone?: string } | undefined;
  return Boolean(record?.zone && arrivalServiceBuildingSpaces.has(record.zone));
}

function isArrivalServiceDetail(object: THREE.Object3D) {
  const record = object.userData.authoringRecord as { type?: string; id?: string } | undefined;
  if (arrivalServiceAssetNameFragments.some((fragment) => object.name.includes(fragment))) return true;
  return Boolean(record?.type === "detail" && record.id && arrivalServiceDetailIds.has(record.id));
}

function applyArrivalServiceCompositionScope() {
  if (!arrivalServiceSliceScope) return;
  const canyonRoot = scene.getObjectByName("density_arrival_canyon_composition");
  if (!canyonRoot) return;
  canyonRoot.children.forEach((child) => {
    child.visible = arrivalServiceCompositionIds.has(child.name);
  });
}

function updateVisibility() {
  zoneObjects.forEach((object) => { object.visible = showZones; });
  buildingObjects.forEach((object) => { object.visible = showMasses && !arrivalServiceSliceScope && !pressurePlantSliceScope; });
  connectorObjects.forEach((object) => { object.visible = showConnectors && (!arrivalServiceSliceScope || object.name === "connector_arrival_road") && !pressurePlantSliceScope; });
  fabricObjects.forEach((object) => { object.visible = showFabric && !arrivalServiceSliceScope && !pressurePlantSliceScope; });
  pathObjects.forEach((object) => { object.visible = showPaths && !arrivalServiceSliceScope; });
  volumeObjects.forEach((object) => { object.visible = showVolumes && !arrivalServiceSliceScope; });
  humanObjects.forEach((object) => { object.visible = showHuman; });
  gridObjects.forEach((object) => { object.visible = showGrid; });
  assetObjects.forEach((object) => { object.visible = showAssets && !object.userData.forceHidden && !object.userData.presentationSuppressed && (!arrivalServiceSliceScope || isArrivalServiceDetail(object)) && (!pressurePlantSliceScope || pressurePlantSliceAssets.includes(object)); });
  detailObjects.forEach((object) => { object.visible = showDetails && !object.userData.forceHidden && (!arrivalServiceSliceScope || isArrivalServiceDetail(object)) && !pressurePlantSliceScope; });
  pressurePlantSliceRoot?.traverse((object) => {
    if (object === pressurePlantSliceRoot) return;
    let suppressed = false;
    let parent: THREE.Object3D | null = object;
    while (parent && parent !== pressurePlantSliceRoot) {
      if (parent.userData.presentationSuppressed === true) { suppressed = true; break; }
      parent = parent.parent;
    }
    object.visible = pressurePlantSliceScope && (showDetails || orthographicBlockoutMode) && !suppressed;
  });
  if (pressurePlantSliceRoot) pressurePlantSliceRoot.visible = pressurePlantSliceScope && (showDetails || orthographicBlockoutMode);
  densityObjects.forEach((object) => { object.visible = !orthographicBlockoutMode && showDetails && !object.userData.forceHidden && (!arrivalServiceSliceScope && !pressurePlantSliceScope ? true : arrivalServiceSliceScope ? object.name === "density_arrival_canyon_composition" : false); });
  blockoutObjects.forEach((object) => { object.visible = showBlockout && (!pressurePlantSliceScope || orthographicBlockoutMode); });
  if (approvedDenseVisualMode && viewMode === "perspective") {
    blockoutObjects.forEach((root) => root.children.forEach((child) => {
      const record = child.userData.authoringRecord as { type?: string; kind?: string } | undefined;
      if (record?.type === "blockout" && (record.kind === "BUILDING_MASS" || record.kind === "TERRAIN_SEGMENT" || ["AIR_ACCESS", "GROUND_DEPLOYMENT", "KILL_ZONE", "CAMERA_SECTOR", "PLAYER_SPAWN", "UAV_OPENING"].includes(record.kind ?? ""))) child.visible = false;
    }));
  }
  scene.traverse((object) => {
    if (object.userData.legacyFlatGround === true || object.name === "procedural_authoring_sky") object.visible = !orthographicBlockoutMode && !approvedDenseVisualMode && !pressurePlantSliceScope && (object.name !== "procedural_authoring_sky" || urlParams.get("mapOverview") !== "1");
    if (orthographicBlockoutMode) {
      let retainedBlockoutReference = false;
      let parent: THREE.Object3D | null = object;
      while (parent) {
        if (parent.userData.blockout || parent.userData.imageUnderlay || parent.userData.blockoutReference || parent.userData.pressurePlantSliceHost) { retainedBlockoutReference = true; break; }
        parent = parent.parent;
      }
      const drawable = object.type === "Mesh" || object.type === "Line" || object.type === "LineSegments" || object.type === "Sprite";
      if (drawable && !retainedBlockoutReference) object.visible = false;
      if (object.userData.authoringRecord && !object.userData.blockout && !object.userData.imageUnderlay && !retainedBlockoutReference) object.visible = false;
    }
  });
  updateBlockoutAppearance();
  const legacyCameraExtension = scene.getObjectByName("density_arrival_site_fabric_road_camera_extension");
  if (legacyCameraExtension) legacyCameraExtension.visible = !arrivalServiceSliceScope && !pressurePlantSliceScope && showDetails;
  const legacyCloudBands = scene.getObjectByName("presentation_dusk_cloud_bands");
  if (legacyCloudBands) legacyCloudBands.visible = !arrivalServiceSliceScope && !pressurePlantSliceScope;
  applyArrivalServiceCompositionScope();
  if (pressurePlantSliceScope) {
    scene.traverse((object) => {
      if (object === pressurePlantSliceRoot) return;
      const arrivalName = object.name.startsWith("arrival_") || object.name.startsWith("density_arrival") || object.name.startsWith("presentation_arrival");
      const arrivalLayer = typeof object.userData.visualLayer === "string" && object.userData.visualLayer.includes("arrival");
      if ((arrivalName || arrivalLayer) && !object.userData.pressurePlantSlice) object.visible = false;
    });
  }
  requestRender();
}

function distance(a: { x: number; z: number }, b: { x: number; z: number }) {
  return Math.hypot(a.x - b.x, a.z - b.z);
}

function buildValidation() {
  const insertion = spaces.find((space) => space.role === "INSERTION")!;
  const core = spaces.find((space) => space.role === "CORE")!;
  const hasElevation = routes.some((route) => Math.max(...route.points.map((point) => point.y)) - Math.min(...route.points.map((point) => point.y)) > 12);
  const coreDistance = distance(insertion.center, core.center);
  const approachCount = topology.objective.approachRoutes.length;
  const hasAir = volumes.some((volume) => volume.kind === "AIR_ACCESS");
  const hasKillZones = volumes.filter((volume) => volume.kind === "CONCEALED_KILL_ZONE").length >= 2;
  const hasPlayerSpawnVolume = volumes.some((volume) => volume.kind === "PLAYER_SPAWN" && volume.linkedZone === "zone_spawn");
  const deploymentVolumes = volumes.filter((volume) => volume.kind === "GROUND_DEPLOYMENT" || volume.kind === "CONCEALED_KILL_ZONE");
  const hasClassSpecificDeployment = deploymentVolumes.length >= 4 && deploymentVolumes.every((volume) => Boolean(volume.linkedZone && volume.droneClasses?.length));
  const hasClosedDeploymentArchitecture = deploymentVolumes.filter((volume) => volume.closedArchitectureRequired).length >= 3;
  const hasCombatSpaceSemantics = combatSpaces.length === runtimeZones.length && runtimeZones.every((zone) => combatSpaces.some((space) => space.zone === zone.id && space.playerCounterplay.length >= 2 && space.commanderPressure.length >= 2));
  const hasStaticTurretGlbs = assetObjects.filter((object) => object.name.startsWith("asset_static_turret_")).length >= 2 && environmentDiagnostics.includes("TURRET:OK");
  const combatCoverRecords = environmentKit.proceduralDetails.filter((detail) => detail.kind === "COMBAT_COVER");
  const hasPbrCombatCover = combatCoverRecords.length >= 6 && combatCoverRecords.every((detail) => detail.treatment === "PROCEDURAL_PBR_AUTHORED" && detail.status === "PBR TREATMENT PASS") && environmentKit.coverTreatment?.strategy === "PROCEDURAL_PBR_AUTHORED";
  const checks = [
    { ok: coreDistance > 300, text: `Core is destination-scale distance from insertion (${Math.round(coreDistance)} m)` },
    { ok: approachCount >= 2, text: `${approachCount} contestable objective approaches authored` },
    { ok: hasElevation, text: "Vertical relationship exists between primary spaces" },
    { ok: hasAir, text: "Open air pressure volume exists for aerial units" },
    { ok: hasKillZones, text: "Concealed deployment logic has spatial envelopes" },
    { ok: hasPlayerSpawnVolume, text: "Human-contractor insertion has an explicit player spawn volume" },
    { ok: hasClassSpecificDeployment, text: `${deploymentVolumes.length} deployment envelopes name their linked zone and drone classes` },
    { ok: hasClosedDeploymentArchitecture, text: `${deploymentVolumes.filter((volume) => volume.closedArchitectureRequired).length} ground/kill volumes require closed architecture before runtime extraction` },
    { ok: spaces.length >= 7, text: `${spaces.length} authored spaces include a distinct maintenance bridge node` },
    { ok: runtimeZones.length === 7 && runtimeZones.some((zone) => zone.id === "zone_bridge"), text: `${runtimeZones.length} runtime zones mapped, including zone_bridge` },
    { ok: hasCombatSpaceSemantics, text: `${combatSpaces.length} zones have explicit player counterplay and commander-pressure semantics` },
    { ok: topology.runtimeContract.mode.playerCount.min === 5 && topology.runtimeContract.mode.playerCount.max === 10 && topology.runtimeContract.mode.matchDurationSeconds === 480, text: "STANDARD mode matches the 5–10 player / 480-second contract" },
    { ok: topology.runtimeContract.playerObjective.holdTimeSeconds === 8 && topology.runtimeContract.playerObjective.proximityRadius === 3 && topology.runtimeContract.playerObjective.resetOnDamage && topology.runtimeContract.playerObjective.resetOnExit, text: "Core hold contract is 8 seconds within 3 m with damage/exit reset" },
    { ok: topology.runtimeContract.commander.decisionIntervalSeconds === 8 && topology.runtimeContract.combat.playerControlsDrones === false, text: "Commander cadence and human-contractor combat role are explicit" },
    { ok: buildingMasses.length >= 10, text: `${buildingMasses.length} architectural masses are separate from zones` },
    { ok: connectors.length >= 4, text: `${connectors.length} designed site connectors explain the transitions` },
    { ok: siteFabric.length >= 5, text: `${siteFabric.length} site-fabric surfaces establish campus scale and boundaries` },
    { ok: environmentKit.assets.filter((asset) => asset.license === "CC0").length >= 6, text: `${environmentKit.assets.filter((asset) => asset.license === "CC0").length} verified CC0 asset records are in the environment kit` },
    { ok: environmentKit.materialBindings.length >= 2, text: "Facade and road PBR bindings are separated from gameplay truth" },
    { ok: environmentKit.proceduralDetails.filter((detail) => detail.kind === "KILL_ZONE_WALL" || detail.kind === "SECURITY_GATE").length >= 4, text: "Perimeter kill zone has authored closure architecture, not only a volume" },
    { ok: environmentKit.proceduralDetails.filter((detail) => detail.kind === "TURRET_MOUNT").length >= 2, text: "Two turret-mount data records anchor the concealed deployment warning" },
    { ok: hasStaticTurretGlbs, text: "Two static turret GLBs replace the kill-zone mount placeholders" },
    { ok: environmentKit.proceduralDetails.some((detail) => detail.kind === "CAMERA_HOUSING") && environmentKit.proceduralDetails.some((detail) => detail.kind === "PIPE_RACK"), text: "Service grammar includes a surveillance anchor and repeatable utility silhouette" },
    { ok: combatCoverRecords.length >= 6 && combatSpaces.filter((space) => (space.coverDetailIds?.length ?? 0) > 0).length >= 5 && combatSpaces.filter((space) => (space.coverDetailIds ?? []).every((id) => environmentKit.proceduralDetails.some((detail) => detail.id === id && detail.kind === "COMBAT_COVER"))).length >= 5, text: "Six physical combat-cover anchors are bound across five route zones" },
    { ok: hasPbrCombatCover, text: "Six combat-cover anchors use authored industrial geometry with verified local PBR material bindings" },
  ];
  validationList.innerHTML = checks.map((check) => `<div class="validation-item ${check.ok ? "ok" : "warn"}"><span class="validation-icon">${check.ok ? "✓" : "!"}</span><span>${check.text}</span></div>`).join("");
}

function recordForObject(object: THREE.Object3D) {
  let current: THREE.Object3D | null = object;
  while (current) {
    if (current.userData?.authoringRecord) return current.userData.authoringRecord;
    current = current.parent;
  }
  return null;
}

function renderInspector(record: any) {
  const type = record.type === "space" ? `${record.role} ZONE` : record.type === "building" ? `${record.kind} BUILDING MASS` : record.type === "connector" ? `${record.kind} CONNECTOR` : record.type === "fabric" ? `${record.kind} SITE FABRIC` : record.type === "route" ? `${record.kind} ROUTE` : record.type === "volume" ? record.kind.replaceAll("_", " ") : record.type === "asset" ? `${record.kind} SOURCED ASSET` : record.type === "detail" ? `${record.kind} PROCEDURAL DETAIL` : record.type === "blockout" ? `${record.kind} BLOCKOUT` : "OBJECTIVE";
  const tags = record.tags ?? [];
  const sourceDetails = record.type === "asset" ? `<div class="inspector-grid"><div class="metric"><div class="metric-label">Stable ID</div><div class="metric-value">${record.id}</div></div><div class="metric"><div class="metric-label">License</div><div class="metric-value">${record.license}</div></div><div class="metric"><div class="metric-label">Source</div><div class="metric-value"><a href="${record.source}" target="_blank" rel="noreferrer">OPEN SOURCE</a></div></div></div><p class="inspector-copy">${record.role ?? "Sourced environment asset."}</p><p class="inspector-copy dim-copy">${record.runtimeNote ?? "Runtime note pending."}</p>` : record.type === "detail" ? `<div class="inspector-grid"><div class="metric"><div class="metric-label">Stable ID</div><div class="metric-value">${record.id}</div></div><div class="metric"><div class="metric-label">Treatment</div><div class="metric-value">${record.treatment}</div></div><div class="metric"><div class="metric-label">State</div><div class="metric-value">${record.status}</div></div></div><p class="inspector-copy dim-copy">Procedural detail remains removable from gameplay truth. ${record.kind === "TURRET_MOUNT" ? "Replace this placeholder with a static turret GLB before runtime extraction." : "Use this record to preserve placement, scale, and route-story intent during the next dressing pass."}</p>` : record.type === "blockout" ? `<div class="inspector-grid"><div class="metric"><div class="metric-label">Stable ID</div><div class="metric-value">${record.id}</div></div><div class="metric"><div class="metric-label">Surface</div><div class="metric-value">${record.surface}</div></div><div class="metric"><div class="metric-label">Floors / rise</div><div class="metric-value">${record.floors > 0 ? `${record.floors} / ${record.floorHeight} m` : `${record.slopeDelta ?? 0} m`}</div></div><div class="metric"><div class="metric-label">Replace with</div><div class="metric-value">${record.replaceWith}</div></div></div><p class="inspector-copy dim-copy">BLOCKOUT ONLY. This named element is deliberate map composition and must be replaced later without losing its location, scale, route, or gameplay intent.</p>` : `<div class="inspector-grid"><div class="metric"><div class="metric-label">Stable ID</div><div class="metric-value">${record.id}</div></div><div class="metric"><div class="metric-label">Authoring state</div><div class="metric-value">GRAYBOX</div></div></div>`;
  inspector.innerHTML = `<div class="inspector-kicker">${type}</div><div class="inspector-title">${record.displayName ?? record.name ?? record.id}</div><p class="inspector-copy">${record.description ?? "A linked gameplay-authoring record."}</p>${sourceDetails}<div class="tag-row">${tags.map((tag: string) => `<span class="tag">${tag}</span>`).join("")}</div>`;
}

function selectAssetRecord(asset: AuthoringAssetRecord) {
  selectedObject = null;
  selectedId = asset.id;
  selectionCount.textContent = "1 selected";
  document.querySelectorAll(".record-item").forEach((item) => item.classList.toggle("active", (item as HTMLElement).dataset.id === selectedId));
  renderInspector({ type: "asset", ...asset });
}

function selectObject(object: THREE.Object3D | null) {
  selectedObject = object;
  const record = object ? recordForObject(object) : null;
  selectedId = record?.id ?? null;
  selectionCount.textContent = selectedId ? "1 selected" : "0 selected";
  document.querySelectorAll(".record-item").forEach((item) => item.classList.toggle("active", (item as HTMLElement).dataset.id === selectedId));
  if (!record) {
    inspector.innerHTML = `<div class="empty-inspector"><div class="empty-icon">＋</div><div class="empty-title">SELECT A SPACE</div><div class="empty-copy">Click a mass, route, deployment volume, or sourced asset record to inspect its authoring data.</div></div>`;
    return;
  }
  renderInspector(record);
}

function makeSpaceList() {
  const zoneItems = spaces.map((space) => `<button class="record-item zone-record" data-id="${space.id}"><i class="record-swatch zone-swatch" style="color:#${space.color.toString(16).padStart(6, "0")}"></i><span><span class="record-name">${space.displayName}</span><span class="record-sub">ZONE / ${space.role}</span></span></button>`).join("");
  const massItems = buildingMasses.map((mass) => `<button class="record-item mass-record" data-id="${mass.id}"><i class="record-swatch mass-swatch"></i><span><span class="record-name">${mass.displayName}</span><span class="record-sub">BUILDING / ${mass.kind}</span></span></button>`).join("");
  const connectorItems = connectors.map((connector) => `<button class="record-item connector-record" data-id="${connector.id}"><i class="record-swatch connector-swatch"></i><span><span class="record-name">${connector.displayName}</span><span class="record-sub">CONNECTOR / ${connector.kind}</span></span></button>`).join("");
  const fabricItems = siteFabric.map((record) => `<button class="record-item fabric-record" data-id="${record.id}"><i class="record-swatch fabric-swatch"></i><span><span class="record-name">${record.displayName}</span><span class="record-sub">SITE FABRIC / ${record.kind}</span></span></button>`).join("");
  const assetItems = environmentKit.assets.map((asset) => `<button class="record-item asset-record" data-id="${asset.id}"><i class="record-swatch asset-swatch"></i><span><span class="record-name">${asset.displayName}</span><span class="record-sub">CC0 / ${asset.kind}</span></span></button>`).join("");
  const detailItems = environmentDetails.map((record) => `<button class="record-item detail-record" data-id="${record.id}"><i class="record-swatch detail-swatch"></i><span><span class="record-name">${record.displayName}</span><span class="record-sub">PROCEDURAL / ${record.kind}</span></span></button>`).join("");
  const blockoutItems = activeBlockoutElements.map((record) => `<button class="record-item blockout-record" data-id="${record.id}"><i class="record-swatch blockout-swatch"></i><span><span class="record-name">${record.name}</span><span class="record-sub">BLOCKOUT / ${record.kind} / REPLACE</span></span></button>`).join("");
  spaceList.innerHTML = `<div class="record-group-label">ZONES · ${spaces.length}</div>${zoneItems}<div class="record-group-label mass-group-label">BUILDING MASSES · ${buildingMasses.length}</div>${massItems}<div class="record-group-label connector-group-label">SITE CONNECTORS · ${connectors.length}</div>${connectorItems}<div class="record-group-label fabric-group-label">SITE FABRIC · ${siteFabric.length}</div>${fabricItems}<div class="record-group-label asset-group-label">SOURCED ASSETS · ${environmentKit.assets.length}</div>${assetItems}<div class="record-group-label detail-group-label">PROCEDURAL DETAILS · ${environmentDetails.length}</div>${detailItems}<div class="record-group-label blockout-group-label">FULL BLOCKOUT · ${activeBlockoutElements.length} TAGGED</div>${blockoutItems}`;
  spaceList.querySelectorAll<HTMLButtonElement>(".record-item").forEach((button) => {
    button.addEventListener("click", () => {
      const id = button.dataset.id ?? "";
      const asset = environmentKit.assets.find((candidate) => candidate.id === id);
      const detail = environmentDetails.find((candidate) => candidate.id === id);
      const blockout = blockoutElements.find((candidate) => candidate.id === id);
      if (asset) {
        selectAssetRecord(asset);
      } else if (detail) {
        selectObject(objectById.get(id) ?? null);
      } else if (blockout) {
        selectObject(objectById.get(id) ?? null);
      } else {
        const object = objectById.get(id) ?? null;
        selectObject(object);
        if (object) controls.target.copy(object.getWorldPosition(new THREE.Vector3()));
      }
      statusMessage.textContent = `Inspecting ${button.textContent?.trim() ?? "record"}.`;
    });
  });
}

function exportBlockoutManifest() {
  const manifest = {
    ...blockoutContract,
    generatedAt: new Date().toISOString(),
    elementCount: activeBlockoutElements.length,
    elements: activeBlockoutElements,
    preservation: "Presentation assets and authoritative runtime topology remain untouched; this is a separate BLOCKOUT_ONLY composition layer.",
  };
  const blob = new Blob([JSON.stringify(manifest, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "vexea-full-map-blockout-manifest.json";
  anchor.click();
  URL.revokeObjectURL(url);
  statusMessage.textContent = `Full blockout manifest exported / ${activeBlockoutElements.length} tagged elements.`;
}

function updateBlockoutHud() {
  if (!orthographicBlockoutMode) {
    viewportHudTitle.textContent = "THE FAR-END CORE";
    viewportHudCopy.textContent = "Review presets separate the map into site plan, gameplay diagram, full tagged blockout, and systems audit. Use the layer toggles when Manus needs a custom diagnostic combination.";
    return;
  }
  if (pressurePlantSliceScope) {
    viewportHudTitle.textContent = "PRESSURE + PLANT / LOCAL SLICE";
    viewportHudCopy.textContent = `${pressurePlantSliceDetails.length} authored local records; selected OpenCV hosts retained for spatial reference; full-map blockout hidden. Solid and X-ray views inspect the raised apron, route grade, shell closure, and supported utilities.`;
    return;
  }
  viewportHudTitle.textContent = "FULL MAP / BLOCKOUT LOCK";
  const compositionLabel = imageSeedOverlay
    ? "dense fabric plus contour image-seed review overlay"
    : blockoutMacroOverlay
      ? "macro scaffold plus dense fabric"
      : "dense streets, courts, footprints, and boundaries";
  const overlayNote = imageSeedOverlay ? ` ${imageContourSeedStats.selectedCandidates} contour candidates are review-only and are not in the export manifest.` : "";
  viewportHudCopy.textContent = `${activeBlockoutElements.length} named replacement targets; showing ${compositionLabel}.${overlayNote} Solid view shows circulation and mass hierarchy; X-ray reveals tunnels, air access, deployment, kill zones, and camera sectors. Select any tag or record to inspect its dimensions, floor count, surface, and replacement target.`;
}

function exportSpec() {
  const blob = new Blob([JSON.stringify(topology, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${topology.id}.spec.json`;
  anchor.click();
  URL.revokeObjectURL(url);
  statusMessage.textContent = "Broad-shape authoring spec exported.";
}

async function copyAuthoringBrief() {
  const brief = [
    `VEXEA MAP AUTHORING BRIEF / ${topology.id}`,
    `Intent: ${topology.displayName}`,
    `Footprint: ${topology.worldSize.x} x ${topology.worldSize.z} m`,
    `Reference human: ${topology.humanReference.bodyHeight} m`,
    `Authored spaces: ${spaces.length} (${spaces.map((space) => `${space.displayName} / ${space.role}`).join(", ")})`,
    `Runtime zones: ${runtimeZones.length} (${runtimeZones.map((zone) => `${zone.id} -> ${zone.authoringSpace}`).join(", ")})`,
    `Mode: ${topology.runtimeContract.mode.id}; players ${topology.runtimeContract.mode.playerCount.min}-${topology.runtimeContract.mode.playerCount.max}; duration ${topology.runtimeContract.mode.matchDurationSeconds}s; respawn ${topology.runtimeContract.mode.respawn.enabled ? "enabled" : "disabled"}`,
    `Human objective: ${topology.runtimeContract.playerObjective.zone}; hold ${topology.runtimeContract.playerObjective.holdTimeSeconds}s within ${topology.runtimeContract.playerObjective.proximityRadius}m; reset on damage/exit`,
    `Commander: ${topology.runtimeContract.commander.decisionIntervalSeconds}s cadence; intel ${topology.runtimeContract.commander.intel}; players control drones: ${topology.runtimeContract.combat.playerControlsDrones}`,
    `Building masses: ${buildingMasses.length} (${buildingMasses.map((mass) => `${mass.displayName} / ${mass.kind}`).join(", ")})`,
    `Site connectors: ${connectors.length} (${connectors.map((connector) => `${connector.displayName} / ${connector.kind}`).join(", ")})`,
    `Site fabric: ${siteFabric.length} (${siteFabric.map((record) => `${record.displayName} / ${record.kind}`).join(", ")})`,
    `Review preset: ${reviewMode}`,
    `Routes: ${routes.length}; volumes: ${volumes.length}; player spawn ${volumes.filter((volume) => volume.kind === "PLAYER_SPAWN").map((volume) => volume.id).join(", ")}; deployment classes authored: ${volumes.filter((volume) => volume.kind === "GROUND_DEPLOYMENT" || volume.kind === "CONCEALED_KILL_ZONE").map((volume) => `${volume.id}=${volume.droneClasses?.join("/") ?? "none"}`).join(", ")}`,
    `Objective: ${topology.objective.id}; hold ${topology.objective.holdTimeSeconds} sec; approaches ${topology.objective.approachRoutes.join(", ")}`,
    `Environment kit: ${environmentKit.assets.length} CC0 records; ${environmentKit.materialBindings.length} material bindings; HDRI ${environmentKit.lighting.hdri}`,
    `Authoring rule: zones are gameplay envelopes, building masses are architectural explanations, routes are control guides, volumes are drone/surveillance logic, and sourced assets are swappable evidence layers. Do not collapse these layers.`,
    `Next pass: replace turret mounts with static turret GLBs, validate the seven-zone extraction against MapLoader, and convert combat-cover blockouts into sourced or PBR-authored final treatments without changing gameplay truth.`
  ].join("\n");
  try {
    await navigator.clipboard.writeText(brief);
    statusMessage.textContent = "Authoring brief copied to clipboard.";
  } catch {
    const helper = document.createElement("textarea");
    helper.value = brief;
    helper.style.position = "fixed";
    helper.style.opacity = "0";
    document.body.appendChild(helper);
    helper.select();
    document.execCommand("copy");
    helper.remove();
    statusMessage.textContent = "Authoring brief copied to clipboard.";
  }
}

function updateOrthographicFrustum() {
  if (!orthographicBlockoutMode) return;
  const aspect = canvasWrap.clientWidth / Math.max(1, canvasWrap.clientHeight);
  const halfHeight = pressurePlantSliceScope ? Math.max(300, 420 / Math.max(0.55, aspect)) : Math.max(340, 470 / Math.max(0.55, aspect));
  orthographicCamera.left = -halfHeight * aspect;
  orthographicCamera.right = halfHeight * aspect;
  orthographicCamera.top = halfHeight;
  orthographicCamera.bottom = -halfHeight;
  orthographicCamera.updateProjectionMatrix();
}

function setAxonometricView() {
  if (!orthographicBlockoutMode) { setPerspectiveView(); return; }
  updateOrthographicFrustum();
  if (pressurePlantSliceScope) {
    const cameraPreset = urlParams.get("camera");
    if (cameraPreset === "plant_section_orthographic") {
      orthographicCamera.position.set(540, 150, -28);
      orthographicCamera.zoom = 2.2;
      controls.target.set(214, 8, -28);
    } else {
      orthographicCamera.position.set(545, 430, 520);
      orthographicCamera.zoom = 1.65;
      controls.target.set(158, 8, 24);
    }
    controls.minDistance = 40;
    controls.maxDistance = 900;
    controls.enableDamping = false;
    controls.update();
  } else {
    orthographicCamera.position.set(620, 610, 620);
    orthographicCamera.zoom = 0.94;
    controls.target.set(0, 0, -6);
    controls.minDistance = 120;
    controls.maxDistance = 1800;
  }
  orthographicCamera.updateProjectionMatrix();
  controls.maxPolarAngle = Math.PI * 0.49;
}

function setTopView() {
  if (orthographicBlockoutMode) {
    updateOrthographicFrustum();
    if (pressurePlantSliceScope) {
      orthographicCamera.position.set(158, 820, 24);
      orthographicCamera.zoom = 2.15;
      controls.target.set(158, 8, 24);
      controls.minDistance = 40;
      controls.maxDistance = 900;
      controls.enableDamping = false;
      controls.update();
    } else {
      orthographicCamera.position.set(0, 900, 0.01);
      orthographicCamera.zoom = 1;
      controls.target.set(0, 0, -30);
      controls.minDistance = 120;
      controls.maxDistance = 1800;
    }
    orthographicCamera.updateProjectionMatrix();
  } else {
    const mapOverview = urlParams.get("mapOverview") === "1";
    camera.position.set(0, mapOverview ? 800 : 900, 0.01);
    camera.fov = mapOverview ? 50 : 42;
    controls.target.set(0, mapOverview ? -18 : -30, 0);
    controls.minDistance = mapOverview ? 260 : 180;
    controls.maxDistance = mapOverview ? 1800 : 1250;
  }
  controls.maxPolarAngle = Math.PI / 2;
}

function setPerspectiveView() {
  if (orthographicBlockoutMode) {
    setTopView();
    return;
  }
  if (reviewMode === "slice") {
    if (pressurePlantSliceScope) {
      const cameraPreset = urlParams.get("camera") ?? "pressure_player";
      const presets: Record<string, { position: [number, number, number]; target: [number, number, number]; fov: number }> = {
        pressure_overview: { position: [410, 188, 338], target: [218, 6, -18], fov: 48 },
        pressure_midroute_player: { position: [48, 1.8, 86], target: [100, 2.6, 55], fov: 58 },
        pressure_player: { position: [48, 1.8, 86], target: [100, 2.6, 55], fov: 58 },
        plant_threshold: { position: [157, 7.0, -28], target: [198, 6.5, -10], fov: 50 },
        plant_threshold_player: { position: [157, 7.0, -28], target: [198, 6.5, -10], fov: 50 },
        plant_threshold_insertion_player: { position: [145, 6.6, -29], target: [177, 3.2, -12], fov: 56 },
        plant_threshold_grade_approach_player: { position: [150, 1.8, 68], target: [180, 3.2, 38], fov: 58 },
        plant_section: { position: [219, 10.4, 15], target: [258, 13.2, -26], fov: 54 },
        plant_section_orthographic: { position: [219, 10.4, 15], target: [258, 13.2, -26], fov: 54 },
      };
      const preset = presets[cameraPreset] ?? presets.pressure_player;
      camera.fov = preset.fov;
      camera.position.set(...preset.position);
      controls.target.set(...preset.target);
      controls.minDistance = 4;
      controls.maxDistance = 420;
      controls.maxPolarAngle = Math.PI / 2;
      controls.enableDamping = false;
      camera.updateProjectionMatrix();
      controls.update();
      return;
    }
    const yardFraming = urlParams.get("framing") === "yard";
    const combatFraming = urlParams.get("framing") === "combat";
    const gateApproachFraming = urlParams.get("framing") === "gate";
    const playerRouteFraming = urlParams.get("framing") === "player";
    const routeArrivalFraming = urlParams.get("framing") === "route";
    const tightArrivalFraming = urlParams.get("framing") !== "wide" && !routeArrivalFraming && !playerRouteFraming && !gateApproachFraming && !yardFraming && !combatFraming;
    camera.fov = combatFraming ? 62 : yardFraming ? 48 : gateApproachFraming ? 48 : playerRouteFraming ? 50 : routeArrivalFraming ? 44 : tightArrivalFraming ? 33.5 : 37.5;
    camera.position.set(combatFraming ? -399 : yardFraming ? -379 : gateApproachFraming ? -436 : playerRouteFraming ? -401 : routeArrivalFraming ? -417 : -399, combatFraming ? topology.humanReference.eyeHeight : yardFraming ? topology.humanReference.eyeHeight : gateApproachFraming ? topology.humanReference.eyeHeight : playerRouteFraming ? topology.humanReference.eyeHeight : routeArrivalFraming ? 2.2 : tightArrivalFraming ? 2.05 : 1.78, combatFraming ? 214 : yardFraming ? 232 : gateApproachFraming ? 250 : playerRouteFraming ? 232 : routeArrivalFraming ? 243 : 227.5);
    controls.target.set(combatFraming ? -332 : yardFraming ? -349 : gateApproachFraming ? -405 : playerRouteFraming ? -356 : routeArrivalFraming ? -349 : tightArrivalFraming ? -278 : -286, combatFraming ? 2.1 : yardFraming ? 2.1 : gateApproachFraming ? 2.1 : playerRouteFraming ? topology.humanReference.eyeHeight : routeArrivalFraming ? 1.4 : tightArrivalFraming ? 0.9 : 0.2, combatFraming ? 198 : yardFraming ? 205 : gateApproachFraming ? 236 : playerRouteFraming ? 190 : routeArrivalFraming ? 190 : tightArrivalFraming ? 177.5 : 177);
    controls.minDistance = 8;
    controls.maxDistance = 760;
    controls.maxPolarAngle = Math.PI * 0.49;
  } else if (reviewMode === "core_approach") {
    camera.fov = 47;
    camera.position.set(430, 25, 118);
    controls.target.set(86, 12, -218);
    controls.minDistance = 8;
    controls.maxDistance = 760;
    controls.maxPolarAngle = Math.PI * 0.49;
  } else {
    const denseFocusFraming = approvedDenseVisualMode && urlParams.get("framing") === "dense_focus";
    camera.fov = denseFocusFraming ? 50 : 42;
    camera.position.set(denseFocusFraming ? 78 : 610, denseFocusFraming ? 2.1 : 510, denseFocusFraming ? 180 : 700);
    controls.target.set(denseFocusFraming ? 108 : -20, denseFocusFraming ? 1.1 : 3, denseFocusFraming ? 124 : -35);
    controls.minDistance = denseFocusFraming ? 8 : 180;
    controls.maxDistance = denseFocusFraming ? 420 : 1250;
    controls.maxPolarAngle = Math.PI * 0.49;
  }
  camera.updateProjectionMatrix();
}

function resetView() {
  if (viewMode === "top") setTopView(); else if (viewMode === "axon") setAxonometricView(); else setPerspectiveView();
  controls.update();
  requestRender();
  statusMessage.textContent = "View reset to the current authoring mode.";
}

function setView(mode: ViewMode) {
  viewMode = orthographicBlockoutMode ? (mode === "axon" ? "axon" : "top") : mode;
  viewLabel.textContent = viewMode === "top" ? "PLAN VIEW" : viewMode === "axon" ? "ORTHO AXON" : "PERSPECTIVE";
  document.querySelectorAll<HTMLButtonElement>("[data-view]").forEach((button) => button.classList.toggle("active", button.dataset.view === viewMode));
  resetView();
}

function bindUI() {
  visualPassButton.addEventListener("click", () => { void startVisualEnhancementPass(); });
  document.querySelectorAll<HTMLButtonElement>("[data-view]").forEach((button) => button.addEventListener("click", () => setView(button.dataset.view as ViewMode)));
  document.querySelectorAll<HTMLButtonElement>("[data-preset]").forEach((button) => button.addEventListener("click", () => setReviewMode(button.dataset.preset as Exclude<ReviewMode, "custom">)));
  document.querySelectorAll<HTMLButtonElement>("[data-toggle]").forEach((button) => button.addEventListener("click", () => {
    const toggle = button.dataset.toggle;
    if (toggle === "zones") showZones = !showZones;
    if (toggle === "masses") showMasses = !showMasses;
    if (toggle === "connectors") showConnectors = !showConnectors;
    if (toggle === "fabric") showFabric = !showFabric;
    if (toggle === "paths") showPaths = !showPaths;
    if (toggle === "volumes") showVolumes = !showVolumes;
    if (toggle === "human") showHuman = !showHuman;
    if (toggle === "grid") showGrid = !showGrid;
    if (toggle === "assets") showAssets = !showAssets;
    if (toggle === "details") showDetails = !showDetails;
    if (toggle === "blockout") showBlockout = !showBlockout;
    if (toggle === "blockout-tags") showBlockoutTags = !showBlockoutTags;
    if (toggle === "xray") showXray = !showXray;
    reviewMode = "custom";
    statusMessage.textContent = "CUSTOM REVIEW / layer visibility changed for inspection.";
    updateToggleButtons();
    updatePresetButtons();
    updateBlockoutHud();
    updateVisibility();
  }));
  document.getElementById("reset-view")?.addEventListener("click", resetView);
  exportBlockoutButton?.addEventListener("click", exportBlockoutManifest);
  inspectModeButton.addEventListener("click", () => {
    const nextParams = new URLSearchParams(window.location.search);
    nextParams.delete("presentation");
    nextParams.delete("full");
    nextParams.delete("headless");
    nextParams.set("inspect", "1");
    window.location.assign(`${window.location.pathname}?${nextParams.toString()}`);
  });
  inspectModeButton.textContent = inspectMode ? "INSPECTING MAP" : "INSPECT MAP";
  document.getElementById("copy-brief")?.addEventListener("click", copyAuthoringBrief);
  document.getElementById("export-spec")?.addEventListener("click", exportSpec);
  canvas.addEventListener("pointerdown", onPointerDown);
}

const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
function onPointerDown(event: PointerEvent) {
  const rect = canvas.getBoundingClientRect();
  pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  raycaster.setFromCamera(pointer, camera);
  const hit = raycaster.intersectObjects(selectableObjects, true)[0];
  if (hit) {
    selectObject(hit.object);
    selectionReticle.classList.remove("hidden");
    selectionReticle.style.left = `${event.clientX - rect.left}px`;
    selectionReticle.style.top = `${event.clientY - rect.top}px`;
    statusMessage.textContent = `Selected ${recordForObject(hit.object)?.displayName ?? "record"}.`;
  } else {
    selectObject(null);
    selectionReticle.classList.add("hidden");
  }
}

function resize() {
  const width = canvasWrap.clientWidth;
  const height = canvasWrap.clientHeight;
  if (orthographicBlockoutMode) {
    updateOrthographicFrustum();
  } else {
    camera.aspect = width / Math.max(1, height);
    camera.updateProjectionMatrix();
  }
  renderer.setSize(width, height, false);
  requestRender();
}

function render() {
  const now = performance.now();
  const settling = now < renderSettleUntil;
  if (settling) controls.update();
  if (!renderDirty && !settling && !isInteracting) {
    stopRenderLoop();
    return;
  }
  if (isInteracting && now - lastRenderAt < interactiveRenderIntervalMs) return;
  const renderStart = performance.now();
  renderer.render(scene, camera);
  const renderDuration = performance.now() - renderStart;
  frameTimeTotal += renderDuration;
  frameTimeSamples += 1;
  averageFrameTimeMs = frameTimeTotal / frameTimeSamples;
  lastRenderAt = now;
  renderDirty = false;
  frames += 1;
  if (now - lastFpsTime > 1000) {
    measuredFps = frames;
    fpsReadout.textContent = `${measuredFps} FPS`;
    frames = 0;
    lastFpsTime = now;
    updateReadinessPanel();
  }
}

function startVisualEnhancementPass() {
  if (visualPassPromise) return visualPassPromise;
  visualPassStartedAt = performance.now();
  updateReadinessPanel();
  visualPassButton.disabled = true;
  visualPassButton.textContent = "LOADING VISUAL PASS";
  statusMessage.textContent = "Adding street-story detail, then loading PBR, HDRI, and sourced reference assets...";
  // Register the promise before yielding so callers can observe the pass immediately.
  visualPassPromise = (async () => {
    // Yield one frame before the heavy procedural detail layer. This keeps the locked
    // presentation interactive first, while still letting the full authored scene
    // arrive without duplicating the canyon/density groups already built at init.
    await new Promise<void>((resolve) => window.requestAnimationFrame(() => resolve()));
    if (detailObjects.length === 0) {
      environmentDetails.forEach(addEnvironmentDetail);
      if (litePreview && !presentationMode && !headlessMode) {
        addGroundDensity();
        addStreetStoryDensity();
        addArrivalCanyonComposition();
      }
      updateVisibility();
      makeSpaceList();
    }
    await loadEnvironmentKit();
    updateVisibility();
    buildValidation();
    visualPassReadyAt = performance.now();
    void measureSteadyStatePerformance();
    updateReadinessPanel();
    visualPassButton.textContent = "VISUAL PASS LOADED";
    statusMessage.textContent = `Authoring pass ready: ${spaces.length} zones / ${buildingMasses.length} masses / ${environmentKit.assets.filter((asset) => asset.license === "CC0").length} CC0 records + ${environmentKit.assets.filter((asset) => asset.license === "ORIGINAL").length} original asset / ${environmentKit.proceduralDetails.length} procedural details / ${environmentDiagnostics.join(" / ")}.`;
    requestRender();
  })().catch((error) => {
    console.error("[MapAuthoring] Visual enhancement pass failed:", error);
    visualPassButton.disabled = false;
    visualPassButton.textContent = "RETRY VISUAL PASS";
    statusMessage.textContent = "Interactive blockout ready; visual enhancement pass partially failed.";
    requestRender();
  });
  return visualPassPromise;
}

async function init() {
  renderer = new THREE.WebGPURenderer({ canvas, antialias: !litePreview, powerPreference: "high-performance", forceWebGL: true, alpha: false });
  await renderer.init();
  rendererReadyAt = performance.now();
  updateReadinessPanel();
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.25));
    renderer.setClearColor(0x654b4b, 1);
  const presentationShadowsEnabled = !litePreview || fullQualityPresentation;
  renderer.shadowMap.enabled = presentationShadowsEnabled;
  if (fullQualityPresentation) {
    addPracticalGlowSprite(scene, { x: -334, y: 34, z: 145 }, 0xffa068, 58, 0.2);
  }
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  const ambient = new THREE.HemisphereLight(0xb7beb9, 0x2a2d2a, 0.24);
  scene.add(ambient);
  const key = new THREE.DirectionalLight(0xffc8a0, 4.4);
  key.position.set(-470, 75, 315);
  key.castShadow = presentationShadowsEnabled;
  key.shadow.mapSize.set(2048, 2048);
  key.shadow.camera.left = -150;
  key.shadow.camera.right = 150;
  key.shadow.camera.top = 150;
  key.shadow.camera.bottom = -150;
  key.shadow.camera.near = 12;
  key.shadow.camera.far = 920;
  key.shadow.bias = -0.0005;
  key.shadow.normalBias = 0.025;
  key.target.position.set(-286, 0, 177);
  scene.add(key.target);
  scene.add(key);
  const rim = new THREE.DirectionalLight(0x8ea2aa, 0.86);
  rim.position.set(420, 240, -380);
  scene.add(rim);
  const gatehouseWarm = new THREE.PointLight(0xffa05b, 42, 90, 2);
  gatehouseWarm.position.set(-397, 6.5, 174);
  scene.add(gatehouseWarm);
  const gatehouseCool = new THREE.PointLight(0x7ca7ff, 8, 108, 2);
  gatehouseCool.position.set(-404, 8, 158);
  scene.add(gatehouseCool);
  const serviceCool = new THREE.PointLight(0x78a9b8, 12, 130, 2);
  serviceCool.position.set(-232, 7, 94);
  scene.add(serviceCool);
  addPracticalLight("arrival_floodlight", { x: -312, y: 12.2, z: 126 }, 0xffaa62, 34, 92);
  addPracticalLight("arrival_gate_practical", { x: -262, y: 7.4, z: 149 }, 0x7fb4c4, 12, 78);
  addPracticalLight("loading_court_practical", { x: -216, y: 8.4, z: 126 }, 0xff8e4e, 28, 105);
  addPracticalLight("service_district_practical", { x: -158, y: 7.2, z: 66 }, 0xffa05b, 25, 118);
  addPracticalLight("warehouse_yard_practical", { x: 78, y: 9.4, z: 102 }, 0x7ca7ff, 16, 132);
  addPracticalLight("plant_bay_practical", { x: 226, y: 10.4, z: -34 }, 0xff9c58, 32, 150);
  addPracticalLight("pressure_shell_service_bay_practical", { x: 142, y: 9.6, z: 45 }, 0xffae6b, 22, 74);
  addPracticalLight("pressure_shell_west_wallpack_a", { x: 143.0, y: 5.6, z: 17.0 }, 0xffb06b, 9, 24);
  addPracticalLight("pressure_shell_west_wallpack_b", { x: 143.0, y: 5.6, z: 43.0 }, 0xffb06b, 9, 24);
  addPracticalLight("tunnel_threshold_practical", { x: 52, y: 9.2, z: -145 }, 0x71bec9, 18, 126);

  addGround();
  addGrid();
  addBlockoutLayer();
  if ((orthographicBlockoutMode || approvedDenseVisualMode) && urlParams.get("denseDetail") === "1") addApprovedDenseFacadeDetailLayer();
  spaces.forEach(addSpace);
  buildingMasses.forEach(addBuildingMass);
  connectors.forEach(addConnector);
  siteFabric.forEach(addSiteFabric);
  addPressurePlantOpenCvContext();
  addPressurePlantSliceEnvironment();
  routes.forEach(addRoute);
  volumes.forEach(addVolume);
  if (!litePreview || fullQualityPresentation) environmentDetails.forEach(addEnvironmentDetail);
  if (!litePreview || presentationMode) {
    addGroundDensity();
    addStreetStoryDensity();
    addArrivalCanyonComposition();
  }
  addObjective();
  addHumanReference();
  addCalibrationFixture();
  if (presentationMode) {
    document.body.classList.add("presentation-mode");
    if (orthographicBlockoutMode) {
      controls.enabled = true;
      setReviewMode("blockout");
    } else {
      controls.enabled = false;
      setReviewMode("slice");
    }
  } else {
    setReviewMode(orthographicBlockoutMode ? "blockout" : pressurePlantSliceScope ? "slice" : "site");
  }
  updateVisibility();
  makeSpaceList();
  blockoutReadyAt = performance.now();
  updateReadinessPanel();
  buildValidation();
  bindUI();
  resize();
  window.addEventListener("resize", resize);
  if (typeof ResizeObserver !== "undefined") {
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(canvasWrap);
  }
  rendererDot.classList.add("ready");
  rendererStatus.textContent = presentationMode ? "WEBGL2 / TSL READY / PRESENTATION ARRIVAL" : inspectMode ? "WEBGL2 / TSL READY / INTERACTIVE INSPECT" : "WEBGL2 / TSL READY";
  bootProgress.textContent = "INTERACTIVE BLOCKOUT READY / VISUAL PASS CONTINUES IN BACKGROUND";
  bootVeil.classList.add("complete");
  window.setTimeout(() => bootVeil.remove(), 260);
  statusMessage.textContent = litePreview
    ? presentationMode
      ? "Arrival presentation ready: PBR, HDRI, and sourced assets continue loading in background."
      : "Lightweight interaction preview ready: use LOAD VISUAL PASS only when you want the full PBR and sourced-asset review."
    : `Interactive blockout ready: ${spaces.length} zones / ${buildingMasses.length} masses / visual enhancements loading in background.`;
  visualPassButton.hidden = !litePreview;
  (window as unknown as { vexeaMapAuthoring?: unknown }).vexeaMapAuthoring = { topology, exportSpec, scene, camera, renderer, environmentDiagnostics, environmentDetails, blockoutElements: activeBlockoutElements, blockoutContract, imageContourSeedElements, imageContourSeedStats, imageSeedOverlay, orthographicBlockoutMode, litePreview, fullQualityPresentation, inspectMode, sliceScope, controls, controlsEnabled: controls.enabled, startVisualEnhancementPass, readinessSnapshot };
  requestRender();
  if ((orthographicBlockoutMode || approvedDenseVisualMode) && urlParams.get("denseSky") === "1") void loadApprovedDenseSkyOnly();
  if (approvedDenseVisualMode && urlParams.get("denseTrees") === "1") void loadApprovedDenseSourcedTreesLite();
  if (approvedDenseVisualMode && urlParams.get("denseOccupancy") === "1") void loadApprovedDenseSourcedOccupancyLite();
  if (approvedDenseVisualMode && urlParams.get("densePiping") === "1") void loadApprovedDenseSourcedPipeSystemLite();
  if (approvedDenseVisualMode && urlParams.get("denseFences") === "1") void loadApprovedDenseFencesLite();
  if (approvedDenseVisualMode && urlParams.get("denseTerrain") === "1") addApprovedDenseTerrainRidges();
  if (approvedDenseVisualMode && urlParams.get("denseLights") === "1") addApprovedDenseServiceLighting();
  if (approvedDenseVisualMode && urlParams.get("denseForecourt") === "1") void loadApprovedDenseServiceForecourt();
  if (approvedDenseVisualMode && urlParams.get("denseEdge") === "1") addApprovedDenseServiceEdgeHierarchy();
  if (approvedDenseVisualMode && urlParams.get("denseMaterials") === "1") void loadApprovedDenseGroundMaterialsLite();
  if ((orthographicBlockoutMode || approvedDenseVisualMode) && urlParams.get("densePbr") === "1") void loadApprovedDenseFacadePbrLite();
  if (headlessMode || !litePreview || presentationMode) void startVisualEnhancementPass();
}

init().catch((error) => {
  console.error("[MapAuthoring] Failed to initialize:", error);
  rendererStatus.textContent = "RENDERER INITIALIZATION FAILED";
  rendererDot.classList.remove("ready");
  statusMessage.textContent = "Renderer initialization failed; inspect the browser console.";
});
