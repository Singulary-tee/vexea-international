import type { BlockoutElement } from "./blockout-data";

const contour = (value: Omit<BlockoutElement, "floors" | "floorHeight">): BlockoutElement => ({ floors: value.height > 0 ? Math.max(1, Math.round(value.height / 4)) : 0, floorHeight: 4, ...value });

export const imageContourSeedElements: BlockoutElement[] = [
  contour({ id: "image_seed_pressure_yard_service_mass", name: "Image seed / pressure-yard service mass", kind: "BUILDING_MASS", category: "IMAGE_CONTOUR_SEED", replaceWith: "volumetric industrial service building", x: 112, y: 0, z: 36, sizeX: 52, height: 7.5, sizeZ: 34, color: 0x56645e, surface: "MIXED", tags: ["IMAGE_SEED", "REVIEW_ONLY", "DENSE_FABRIC"] }),
  contour({ id: "image_seed_plant_main_mass", name: "Image seed / plant main mass", kind: "BUILDING_MASS", category: "IMAGE_CONTOUR_SEED", replaceWith: "closed plant shell", x: 216, y: 6, z: 65, sizeX: 134, height: 28, sizeZ: 150, color: 0x697573, surface: "CONCRETE", tags: ["IMAGE_SEED", "REVIEW_ONLY", "DENSE_FABRIC"] }),
  contour({ id: "image_seed_pressure_route", name: "Image seed / exposed pressure route", kind: "ROUTE_SEGMENT", category: "IMAGE_CONTOUR_SEED", replaceWith: "segmented asphalt route", x: 125, y: 0, z: 0, sizeX: 180, height: 0.2, sizeZ: 190, color: 0x354348, surface: "ASPHALT", tags: ["IMAGE_SEED", "REVIEW_ONLY", "DENSE_FABRIC"] }),
  contour({ id: "image_seed_threshold_ramp", name: "Image seed / threshold ramp", kind: "ROUTE_SEGMENT", category: "IMAGE_CONTOUR_SEED", replaceWith: "supported vehicle ramp", x: 180, y: 0, z: 38, sizeX: 18, height: 6, sizeZ: 18, color: 0x777a72, surface: "CONCRETE", tags: ["IMAGE_SEED", "REVIEW_ONLY", "DENSE_FABRIC"] }),
  contour({ id: "image_seed_pressure_cover", name: "Image seed / pressure cover island", kind: "COVER", category: "IMAGE_CONTOUR_SEED", replaceWith: "profiled deliberate hard cover", x: 91, y: 0, z: 80, sizeX: 10, height: 1.5, sizeZ: 2.2, color: 0xb1afa2, surface: "CONCRETE", tags: ["IMAGE_SEED", "REVIEW_ONLY", "DENSE_FABRIC"] }),
  contour({ id: "image_seed_plant_high_anchor", name: "Image seed / plant high anchor", kind: "BUILDING_MASS", category: "IMAGE_CONTOUR_SEED", replaceWith: "tower or stacked process landmark", x: 252, y: 6, z: -42, sizeX: 32, height: 24, sizeZ: 28, color: 0x5f6864, surface: "MIXED", tags: ["IMAGE_SEED", "REVIEW_ONLY", "DENSE_FABRIC"] }),
];

export const imageContourSeedStats = {
  source: "accepted OpenCV-derived image-first spatial catalog",
  selectedCandidates: imageContourSeedElements.length,
  threshold: 0.46,
  contourCount: imageContourSeedElements.length,
  reviewOnly: true,
  runtimeImported: false,
};
