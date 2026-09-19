export type PressurePlantMaterialFamily = string;

export type PressurePlantSliceDetail = {
  id: string;
  displayName: string;
  kind: string;
  zone: string;
  hostId: string;
  hostSocket: string;
  position: { x: number; y: number; z: number };
  size: { x: number; y: number; z: number };
  rotationY: number;
  color: number;
  materialFamily: PressurePlantMaterialFamily;
  supportClass: "GROUNDED" | "SUPPORTED" | "MOUNTED";
  description: string;
  gameplayRole: string;
  tags: string[];
  treatment: string;
  status: "IMPLEMENTED" | "REVIEW" | "REVISE";
  source?: string;
  localPath: string;
  lodPath?: string;
};

const detail = (
  value: Omit<PressurePlantSliceDetail, "rotationY" | "status" | "localPath"> & Partial<Pick<PressurePlantSliceDetail, "rotationY" | "status" | "localPath">>,
): PressurePlantSliceDetail => ({ rotationY: 0, status: "IMPLEMENTED", localPath: "/assets/authoring/pressure-plant-local", ...value });

export const pressurePlantSliceDetails: PressurePlantSliceDetail[] = [
  detail({
    id: "slice_pressure_asphalt_lane", displayName: "Pressure Yard / segmented asphalt lane", kind: "ASPHALT_LANE", zone: "zone_warehouse",
    hostId: "fabric_pressure_yard_surface", hostSocket: "pressure_yard_vehicle_lane_center", position: { x: 125, y: 0.03, z: 0 }, size: { x: 180, y: 0.18, z: 190 }, color: 0x354348, materialFamily: "ASPHALT", supportClass: "GROUNDED",
    description: "Continuous pressure-yard vehicle lane with world-scaled road response and deliberate construction breaks.", gameplayRole: "Preserves the exposed aerial-risk lane and retreat option for the warehouse pressure space.", tags: ["PRESSURE_PLANT_SLICE", "ROAD", "ROUTE", "GROUND_CONTACT"], treatment: "SEGMENTED_ROAD012A_PBR", status: "REVIEW",
  }),
  detail({
    id: "slice_plant_apron_slab", displayName: "Plant / raised service apron", kind: "APRON_SLAB", zone: "zone_plant",
    hostId: "image_surface_plant_apron", hostSocket: "image_plant_apron_south_edge", position: { x: 216, y: 6.04, z: 65 }, size: { x: 134, y: 0.24, z: 150 }, color: 0x777a72, materialFamily: "CONCRETE", supportClass: "GROUNDED",
    description: "Raised industrial apron with segmented concrete surfaces and supported access interfaces.", gameplayRole: "High plant datum for ground-unit pressure, stairs, ramp, and service-bay routes.", tags: ["PRESSURE_PLANT_SLICE", "RAISED_APRON", "NON_DISPLACEABLE", "GROUND_CONTACT"], treatment: "SEGMENTED_WEATHERED_CONCRETE", status: "REVIEW",
  }),
  detail({
    id: "slice_pressure_curb_west_return", displayName: "Pressure yard / profiled west curb return", kind: "CURB_RETURN", zone: "zone_warehouse",
    hostId: "fabric_pressure_yard_surface", hostSocket: "pressure_yard_west_route_edge", position: { x: 78, y: 0.03, z: 72 }, size: { x: 96, y: 0.32, z: 0.72 }, color: 0xa4a59d, materialFamily: "CONCRETE", supportClass: "GROUNDED",
    description: "Profiled concrete vehicle/pedestrian separation with short returned ends and drainage shoulder.", gameplayRole: "Defines the route edge and gives the mid-route player frame a readable crossing boundary.", tags: ["PRESSURE_PLANT_SLICE", "CURB", "ROUTE_EDGE", "GROUND_CONTACT"], treatment: "PROFILED_CURB_WITH_RETURNS",
  }),
  detail({
    id: "slice_plant_sidewalk_threshold", displayName: "Plant threshold / pedestrian sidewalk", kind: "SIDEWALK", zone: "zone_plant",
    hostId: "fabric_plant_apron", hostSocket: "plant_threshold_pedestrian_edge", position: { x: 166, y: 6.08, z: 42 }, size: { x: 72, y: 0.24, z: 4.8 }, color: 0x989991, materialFamily: "CONCRETE", supportClass: "GROUNDED",
    description: "Segmented pedestrian edge parallel to the raised apron, with expansion joints and a clean grade relationship.", gameplayRole: "Player pedestrian alternative to the vehicle-grade threshold ramp.", tags: ["PRESSURE_PLANT_SLICE", "SIDEWALK", "PEDESTRIAN_EDGE", "GROUND_CONTACT"], treatment: "SEGMENTED_PEDESTRIAN_CONCRETE",
  }),
  detail({
    id: "slice_pressure_drain_edge", displayName: "Pressure yard / storm drain edge", kind: "DRAINAGE", zone: "zone_warehouse",
    hostId: "fabric_pressure_yard_surface", hostSocket: "pressure_yard_plant_route_gutter", position: { x: 105, y: 0.03, z: 95 }, size: { x: 42, y: 0.24, z: 2.2 }, color: 0x243033, materialFamily: "CONCRETE", supportClass: "GROUNDED",
    description: "Grounded catch-drain channel and grate sequence at the service-court transition.", gameplayRole: "Explains runoff and reinforces the road-to-court boundary without becoming cover.", tags: ["PRESSURE_PLANT_SLICE", "DRAIN", "GUTTER", "GROUND_CONTACT"], treatment: "SUPPORTED_GRATE_CHANNEL",
  }),
  detail({
    id: "slice_threshold_ramp_interface", displayName: "Plant threshold / vehicle ramp", kind: "RAMP", zone: "zone_bridge",
    hostId: "connector_plant_threshold", hostSocket: "threshold_low_to_high_grade", position: { x: 180, y: 0.08, z: 38 }, size: { x: 18, y: 6, z: 18 }, color: 0x747973, materialFamily: "CONCRETE", supportClass: "GROUNDED",
    description: "Supported low-to-high grade transition with an 18 m vehicle-grade width and 6 m rise.", gameplayRole: "Ground-unit connector from the warehouse pressure yard to the raised plant apron.", tags: ["PRESSURE_PLANT_SLICE", "RAMP", "GROUND_UNIT_ROUTE", "NON_DISPLACEABLE"], treatment: "SUPPORTED_GRADE_WEDGE",
  }),
  detail({
    id: "slice_plant_stair_interface", displayName: "Plant / player stair interface", kind: "STAIRS", zone: "zone_plant",
    hostId: "mass_plant_main", hostSocket: "plant_main_pedestrian_stair_socket", position: { x: 154, y: 0.08, z: 52 }, size: { x: 8, y: 6, z: 14 }, color: 0x85847a, materialFamily: "CONCRETE", supportClass: "GROUNDED",
    description: "Canonical player stair: 30 rises at 0.20 m, 6 m total rise, 8 m width, 14 m run.", gameplayRole: "Player-only pedestrian access to the raised plant datum; preserved physical contract.", tags: ["PRESSURE_PLANT_SLICE", "STAIRS", "PLAYER_ROUTE", "NON_DISPLACEABLE"], treatment: "PLAYER_SCALE_30_RISE_FLIGHT",
  }),
  detail({
    id: "slice_pressure_light_pole", displayName: "Pressure yard / service light", kind: "STREET_LIGHT", zone: "zone_warehouse",
    hostId: "fabric_pressure_yard_surface", hostSocket: "pressure_yard_light_base_01", position: { x: 125, y: 0.03, z: 57 }, size: { x: 1.2, y: 8.5, z: 1.2 }, color: 0x64716e, materialFamily: "PAINTED_STEEL", supportClass: "GROUNDED",
    description: "Player-scale industrial mast and luminaire establishing the pressure-yard route landmark.", gameplayRole: "Low/mid route lighting and orientation cue; presentation only.", tags: ["PRESSURE_PLANT_SLICE", "LIGHT", "LANDMARK", "GROUND_CONTACT"], treatment: "INDUSTRIAL_MAST_WITH_LUMINAIRE",
  }),
  detail({
    id: "slice_plant_light_pole", displayName: "Plant apron / service light", kind: "STREET_LIGHT", zone: "zone_plant",
    hostId: "fabric_plant_apron", hostSocket: "plant_apron_light_base_01", position: { x: 198, y: 6.04, z: 42 }, size: { x: 1.2, y: 9.5, z: 1.2 }, color: 0x64716e, materialFamily: "PAINTED_STEEL", supportClass: "GROUNDED",
    description: "Higher service-yard mast on the plant apron, kept distinct from the pressure-yard light.", gameplayRole: "Raised threshold landmark and service-court illumination cue.", tags: ["PRESSURE_PLANT_SLICE", "LIGHT", "RAISED_APRON", "GROUND_CONTACT"], treatment: "INDUSTRIAL_MAST_WITH_LUMINAIRE",
  }),
  detail({
    id: "slice_plant_surveillance_cue", displayName: "Plant threshold / surveillance camera", kind: "SURVEILLANCE_CUE", zone: "zone_plant",
    hostId: "image_camera_threshold", hostSocket: "image_plant_building_south_camera_bracket", position: { x: 230, y: 20, z: -13 }, size: { x: 0.8, y: 0.8, z: 0.8 }, color: 0x2c393a, materialFamily: "PAINTED_STEEL", supportClass: "MOUNTED",
    description: "Ordinary industrial security camera on a bracket, bound to the existing commander surveillance sector.", gameplayRole: "Destructible surveillance cue; semantic source remains image_camera_threshold.", tags: ["PRESSURE_PLANT_SLICE", "SURVEILLANCE", "DESTRUCTIBLE", "MOUNTED"], treatment: "BRACKETED_SECURITY_CAMERA",
  }),
  detail({
    id: "slice_plant_electrical_pole", displayName: "Plant tower / electrical service pole", kind: "ELECTRICAL_POLE", zone: "zone_plant",
    hostId: "mass_plant_tower", hostSocket: "plant_tower_service_yard_pole_base", position: { x: 252, y: 6.04, z: -42 }, size: { x: 1.2, y: 15, z: 1.2 }, color: 0x586663, materialFamily: "PAINTED_STEEL", supportClass: "GROUNDED",
    description: "Supported service pole with crossarm and termination toward the plant tower.", gameplayRole: "Industrial vertical landmark and readable utility endpoint.", tags: ["PRESSURE_PLANT_SLICE", "ELECTRICAL", "VERTICAL_ANCHOR", "GROUND_CONTACT"], treatment: "SUPPORTED_POLE_CROSSARM",
  }),
  detail({
    id: "slice_plant_pipe_rack", displayName: "Plant threshold / process pipe rack", kind: "PIPE_RACK", zone: "zone_plant",
    hostId: "image_building_028_cleanBuilding", hostSocket: "image_plant_building_south_service_frame", position: { x: 150, y: 6, z: -20 }, size: { x: 28, y: 12, z: 3.4 }, color: 0x4c5c5a, materialFamily: "PAINTED_STEEL", supportClass: "SUPPORTED",
    description: "Supported service rack with clean baseplates, module endpoints, valves, collars, and terminations.", gameplayRole: "Industrial route-side cover/depth cue for the plant threshold, not a gameplay semantic replacement.", tags: ["PRESSURE_PLANT_SLICE", "PIPE_RACK", "SUPPORTED", "ENDPOINTS"], treatment: "SELECTIVE_PREPARED_PIPE_KIT_WITH_HOST_FRAME",
  }),
  detail({
    id: "slice_pressure_low_service_shed", displayName: "Pressure yard / low service shed", kind: "LOW_SERVICE_SHED", zone: "zone_warehouse",
    hostId: "image_surface_pressure_yard", hostSocket: "pressure_yard_south_service_shed_pad", position: { x: 136, y: 0, z: 44 }, size: { x: 52, y: 7.5, z: 34 }, color: 0x4e5c5b, materialFamily: "PAINTED_STEEL", supportClass: "GROUNDED",
    description: "Closed compact service building with differentiated loading bays, vents, seams, roof drainage, and a low cover edge.", gameplayRole: "Service landmark and bounded low/mid depth layer beside the pressure route.", tags: ["PRESSURE_PLANT_SLICE", "LOW_SERVICE", "CLOSED_VOLUME", "GROUND_CONTACT"], treatment: "CLOSED_VOLUMETRIC_SERVICE_SHED",
  }),
  detail({
    id: "slice_plant_volumetric_shell", displayName: "Plant Main / volumetric hybrid shell", kind: "PLANT_SHELL", zone: "zone_plant",
    hostId: "image_building_028_cleanBuilding", hostSocket: "image_building_028_volume_owner", position: { x: 216, y: 6.04, z: 65 }, size: { x: 134, y: 28, z: 150 }, color: 0x697573, materialFamily: "PAINTED_STEEL", supportClass: "GROUNDED",
    description: "Closed real-depth industrial plant volume with plinth, panel field, clerestory rhythm, openings, roof, parapet, and ground closure.", gameplayRole: "Dense plant combat boundary for wheeled, robot-dog, and humanoid pursuit.", tags: ["PRESSURE_PLANT_SLICE", "PLANT_SHELL", "VOLUMETRIC", "NON_DISPLACEABLE", "GROUND_CONTACT"], treatment: "CLOSED_HYBRID_INDUSTRIAL_SHELL",
  }),
  detail({
    id: "slice_plant_facade_module_datum", displayName: "Plant / selective facade module datum", kind: "FACADE_MODULE_DATUM", zone: "zone_plant",
    hostId: "image_building_028_cleanBuilding", hostSocket: "image_plant_building_south_facade_frame", position: { x: 216, y: 6.04, z: 65 }, size: { x: 18, y: 10, z: 3 }, color: 0x6d756f, materialFamily: "PAINTED_STEEL", supportClass: "SUPPORTED", localPath: "/assets/models/polyhaven/modular_factory_facade/modular_factory_facade_1k.gltf",
    description: "Selective prepared loading-bay datum only; never a shell-wide facade and suppressed when it fails the locked camera.", gameplayRole: "Presentation-only service frontage detail with no semantic displacement.", tags: ["PRESSURE_PLANT_SLICE", "FACADE", "SELECTIVE_ASSET", "SUPPORTED"], treatment: "PREPARED_GLB_PLUS_LOCAL_CONTEXT",
  }),
  detail({
    id: "slice_plant_rock_cut", displayName: "Plant apron / runoff rock cut", kind: "ROCK_CUT", zone: "zone_plant",
    hostId: "fabric_plant_apron", hostSocket: "plant_apron_runoff_edge", position: { x: 182, y: 6.04, z: 82 }, size: { x: 22, y: 2.6, z: 7 }, color: 0x665846, materialFamily: "SOIL_ROCK", supportClass: "GROUNDED", localPath: "",
    description: "Bounded layered soil and rock runoff edge on the plant apron.", gameplayRole: "Site-edge break and restrained natural contrast; never field-wide clutter.", tags: ["PRESSURE_PLANT_SLICE", "ROCK", "RUNOFF_EDGE", "GROUND_CONTACT"], treatment: "BOUNDED_SOIL_AND_SOURCED_ROCK",
  }),
  detail({
    id: "slice_plant_grass_verge", displayName: "Plant apron / sparse grass verge", kind: "GRASS", zone: "zone_plant",
    hostId: "slice_plant_rock_cut", hostSocket: "rock_cut_upper_soil_lip", position: { x: 182, y: 6.04, z: 82 }, size: { x: 20, y: 0.6, z: 4 }, color: 0x566546, materialFamily: "VEGETATION", supportClass: "GROUNDED",
    description: "Sparse desaturated grass tufts constrained to the rock-cut soil lip.", gameplayRole: "Restrained site-edge dressing with no cover or route ownership.", tags: ["PRESSURE_PLANT_SLICE", "GRASS", "SPARSE", "GROUND_CONTACT"], treatment: "SPARSE_BOUNDED_TUFTS",
  }),
  detail({
    id: "slice_plant_welding_cart_datum", displayName: "Plant / welding cart datum", kind: "WELDING_CART_DATUM", zone: "zone_plant",
    hostId: "image_building_028_cleanBuilding", hostSocket: "image_plant_building_south_service_bay_floor", position: { x: 184, y: 6, z: -14 }, size: { x: 1.25, y: 1.4, z: 1.25 }, color: 0x8b6543, materialFamily: "PAINTED_STEEL", supportClass: "GROUNDED",
    description: "Player-scale sourced welding-cart datum for a service-bay occupancy cue.", gameplayRole: "Presentation-only maintenance occupancy, not cover and not a route anchor.", tags: ["PRESSURE_PLANT_SLICE", "WELDING_CART", "SOURCED_ASSET", "GROUND_CONTACT"], treatment: "PREPARED_GL B_WITH_BOUNDS_CONTACT".replace("GL B", "GLB"),
  }),
  detail({
    id: "slice_pressure_fence_boundary", displayName: "Pressure yard / chainlink service boundary", kind: "FENCE_BOUNDARY", zone: "zone_warehouse",
    hostId: "fabric_pressure_yard_surface", hostSocket: "pressure_yard_plant_boundary", position: { x: 82, y: 0, z: 68 }, size: { x: 32, y: 2.4, z: 0.3 }, color: 0x657570, materialFamily: "PAINTED_STEEL", supportClass: "GROUNDED",
    description: "Short supported chainlink boundary with posts, rails, shoes, gate logic, and a visible termination.", gameplayRole: "Route edge and service-yard separation; presentation-only.", tags: ["PRESSURE_PLANT_SLICE", "FENCE", "CHAINLINK", "GROUND_CONTACT"], treatment: "PREPARED_CHAINLINK_WITH_FALLBACK",
  }),
  detail({
    id: "slice_pressure_windbreak_tree", displayName: "Pressure yard / sourced windbreak tree", kind: "TREE_CLUSTER", zone: "zone_warehouse",
    hostId: "fabric_pressure_yard_surface", hostSocket: "pressure_yard_west_planting_edge", position: { x: 60, y: 0, z: 74 }, size: { x: 8.5, y: 5.8, z: 8.5 }, color: 0x708160, materialFamily: "VEGETATION", supportClass: "GROUNDED", localPath: "/assets/models/polyhaven/tree_small_02_2k/tree_small_02_2k.gltf", lodPath: "/assets/models/polyhaven/tree_small_02/tree_small_02_1k.gltf", source: "https://polyhaven.com/a/tree_small_02",
    description: "Single sourced Poly Haven tree/vegetation landmark at the bounded route edge.", gameplayRole: "Restrained natural landmark and route-edge depth break; not cover.", tags: ["PRESSURE_PLANT_SLICE", "TREE", "SOURCED_ASSET", "GROUND_CONTACT"], treatment: "SOURCED_CC0_TREE_CLUSTER",
  }),
  detail({
    id: "slice_pressure_yard_cover_barrier", displayName: "Pressure yard / deliberate hard cover", kind: "PRESSURE_COVER", zone: "zone_warehouse",
    hostId: "cleanup_pressure_yard_directional_cover", hostSocket: "pressure_yard_open_lane_cover_anchor", position: { x: 91, y: 0, z: 80 }, size: { x: 10, y: 1.5, z: 2.2 }, color: 0xb1afa2, materialFamily: "CONCRETE", supportClass: "GROUNDED",
    description: "Single deliberate profiled jersey-barrier cadence attached to the existing semantic cover owner.", gameplayRole: "Creates a crossing, retreat, and open-right-flank choice in the pressure lane.", tags: ["PRESSURE_PLANT_SLICE", "COVER", "TACTICAL", "NON_DISPLACEABLE"], treatment: "PROFILED_JERSEY_CADENCE",
  }),
];
