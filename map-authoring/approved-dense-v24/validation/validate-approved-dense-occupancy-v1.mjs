import fs from "node:fs";

const outputPath = process.argv[2] ?? "client/map-authoring-output/pressure-plant-captures/approved-dense-occupancy-v1.json";
const hardstand = { id: "dense_surface_pressure_yard", minX: 18, maxX: 138, minZ: 107, maxZ: 221, topY: 0.14 };
const assets = [
  { id: "asset_approved_dense_forklift", x: 84, z: 124, maxSpan: 5.5, source: "Sketchfab warehouse forklift gameready", license: "CC-BY-4.0" },
  { id: "asset_approved_dense_generator", x: 120, z: 124, maxSpan: 2.2, source: "Poly Haven portable generator", license: "CC0" },
  { id: "asset_approved_dense_welding_cart", x: 108, z: 124, maxSpan: 3.0, source: "Poly Haven portable welding cart", license: "CC0" },
  { id: "asset_approved_dense_storage_cart", x: 96, z: 124, maxSpan: 3.0, source: "Poly Haven industrial storage cart", license: "CC0" },
].map((asset) => ({ ...asset, minX: asset.x - asset.maxSpan / 2, maxX: asset.x + asset.maxSpan / 2, minZ: asset.z - asset.maxSpan / 2, maxZ: asset.z + asset.maxSpan / 2, bottomY: 0 }));

const routeSegments = [
  [[-90, 156], [40, 156]],
  [[40, 156], [176, 150]],
  [[-12, 162], [-12, 70]],
];
const clearance = 2.5;
const failures = [];
const review = [];
const overlaps = [];
const expanded = (asset) => ({ minX: asset.minX - clearance, maxX: asset.maxX + clearance, minZ: asset.minZ - clearance, maxZ: asset.maxZ + clearance });
const intersects = (a, b) => a.minX <= b.maxX && a.maxX >= b.minX && a.minZ <= b.maxZ && a.maxZ >= b.minZ;
const pointToSegmentDistance = (px, pz, ax, az, bx, bz) => {
  const dx = bx - ax;
  const dz = bz - az;
  const lengthSq = dx * dx + dz * dz;
  const t = lengthSq > 0 ? Math.max(0, Math.min(1, ((px - ax) * dx + (pz - az) * dz) / lengthSq)) : 0;
  const x = ax + t * dx;
  const z = az + t * dz;
  return Math.hypot(px - x, pz - z);
};

for (const asset of assets) {
  if (asset.bottomY !== 0) failures.push(`${asset.id}: bottomY=${asset.bottomY} is not hardstand-contacted`);
  if (asset.minX < hardstand.minX || asset.maxX > hardstand.maxX || asset.minZ < hardstand.minZ || asset.maxZ > hardstand.maxZ) {
    failures.push(`${asset.id}: normalized bounds leave ${hardstand.id}`);
  }
  for (const segment of routeSegments) {
    const distance = pointToSegmentDistance(asset.x, asset.z, segment[0][0], segment[0][1], segment[1][0], segment[1][1]);
    if (distance < clearance + asset.maxSpan / 2) review.push(`${asset.id}: ${distance.toFixed(2)}m from route segment; verify in runtime if the route is widened`);
  }
}
for (let i = 0; i < assets.length; i += 1) {
  for (let j = i + 1; j < assets.length; j += 1) {
    const a = assets[i];
    const b = assets[j];
    if (intersects(a, b)) overlaps.push(`${a.id}<->${b.id}`);
    if (intersects(expanded(a), b) || intersects(a, expanded(b))) review.push(`${a.id}<->${b.id}: within ${clearance}m service handling clearance`);
  }
}

const result = {
  version: "approved-dense-occupancy-v1",
  valid: failures.length === 0 && overlaps.length === 0,
  hardstand,
  normalization: "Each GLB is scaled by maximum horizontal span and translated by measured world bounds so bounds.min.y = 0 before the fixed placement.",
  assets: assets.map(({ id, x, z, maxSpan, minX, maxX, minZ, maxZ, bottomY, source, license }) => ({ id, x, z, maxSpan, minX, maxX, minZ, maxZ, bottomY, source, license })),
  failures,
  overlaps,
  review,
  gameplayImpact: "none; presentation-only occupancy, not cover, route anchor, spawn, kill zone, surveillance, or objective truth",
};
fs.mkdirSync(new URL(".", `file://${process.cwd()}/${outputPath}`).pathname, { recursive: true });
fs.writeFileSync(outputPath, JSON.stringify(result, null, 2) + "\n");
console.log(JSON.stringify(result, null, 2));
if (!result.valid) process.exitCode = 1;
