import { NodeIO } from '@gltf-transform/core';
import { KHRDracoMeshCompression, EXTTextureWebP } from '@gltf-transform/extensions';
import draco3d from 'draco3dgltf';
const io = new NodeIO()
  .registerExtensions([KHRDracoMeshCompression, EXTTextureWebP])
  .registerDependencies({'draco3d.decoder': await draco3d.createDecoderModule()});
const doc = await io.read('/tmp/Player_one-optimized.glb');
const root = doc.getRoot();
const skin = root.listSkins()[0];
const bones = skin.listJoints();
const normalize = (s) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
const names = bones.map((b) => normalize(b.getName()));
const sets = { left: new Set(), right: new Set(), leftShoulder: new Set(), rightShoulder: new Set() };
names.forEach((name, i) => {
  if (/left(arm|forearm|hand|wrist|thumb|index|middle|ring|pinky)/.test(name)) sets.left.add(i);
  if (/right(arm|forearm|hand|wrist|thumb|index|middle|ring|pinky)/.test(name)) sets.right.add(i);
  if (name.includes('leftshoulder')) sets.leftShoulder.add(i);
  if (name.includes('rightshoulder')) sets.rightShoulder.add(i);
});
const weight = (joints, weights, vertex, set) => {
  let total = 0;
  for (let k = 0; k < 4; k++) if (set.has(joints[vertex * 4 + k])) total += weights[vertex * 4 + k];
  return total;
};
const classify = (l, r, other) => {
  if (Math.max(...other) > .35) return null;
  if (Math.min(...l) >= .5 && l.every((v, i) => v >= r[i])) return 'left';
  if (Math.min(...r) >= .5 && r.every((v, i) => v > l[i])) return 'right';
  return null;
};
const boundaryClassify = (ld, rd, l, r, other) => {
  if (Math.max(...other) > .65) return null;
  const la = Math.max(...ld) >= .2;
  const ra = Math.max(...rd) >= .2;
  if (la === ra) return null;
  const distal = la ? ld : rd;
  if (distal.filter((v) => v >= .2).length < 2) return null;
  const side = la ? l : r;
  const opposite = la ? r : l;
  if (Math.min(...side) < .2 || !side.every((v, i) => v >= opposite[i])) return null;
  return la ? 'left' : 'right';
};
const components = (triangles) => {
  const parents = triangles.map((_, i) => i); const byVertex = new Map();
  const find = (i) => parents[i] === i ? i : (parents[i] = find(parents[i]));
  const merge = (a, b) => { a = find(a); b = find(b); if (a !== b) parents[b] = a; };
  triangles.forEach((triangle, i) => triangle.indices.forEach((v) => {
    const neighbors = byVertex.get(v) || [];
    neighbors.forEach((j) => merge(i, j));
    neighbors.push(i); byVertex.set(v, neighbors);
  }));
  const result = new Map();
  triangles.forEach((triangle, i) => {
    const root = find(i);
    if (!result.has(root)) result.set(root, { triangles: [], vertices: new Set(), left: 0, right: 0 });
    const component = result.get(root);
    component.triangles.push(i);
    triangle.indices.forEach((v) => component.vertices.add(v));
    component[triangle.side]++;
  });
  return [...result.values()].sort((a, b) => b.triangles.length - a.triangles.length);
};
const output = { bones: bones.map((bone, i) => ({i, name: bone.getName(), parent: bone.getParentNode()?.getName() || null})), primitives: [] };
for (const [primitiveIndex, primitive] of root.listMeshes()[0].listPrimitives().entries()) {
  const position = primitive.getAttribute('POSITION').getArray();
  const joints = primitive.getAttribute('JOINTS_0').getArray();
  const weights = primitive.getAttribute('WEIGHTS_0').getArray();
  const indices = primitive.getIndices().getArray();
  const triangles = [];
  const all = {left: 0, right: 0, boundary: 0, selected: 0};
  for (let offset = 0; offset + 2 < indices.length; offset += 3) {
    const vs = [indices[offset], indices[offset + 1], indices[offset + 2]];
    const ld = vs.map((v) => weight(joints, weights, v, sets.left));
    const rd = vs.map((v) => weight(joints, weights, v, sets.right));
    const l = vs.map((v, i) => ld[i] + weight(joints, weights, v, sets.leftShoulder));
    const r = vs.map((v, i) => rd[i] + weight(joints, weights, v, sets.rightShoulder));
    const other = vs.map((_, i) => Math.max(0, 1 - l[i] - r[i]));
    const complete = classify(l, r, other);
    const side = complete && (complete === 'left' ? ld : rd).filter((v) => v >= .5).length >= 2 ? complete : null;
    const boundary = boundaryClassify(ld, rd, l, r, other);
    if (complete) all[complete]++;
    if (boundary) all.boundary++;
    const selected = side || boundary;
    if (selected) { all.selected++; triangles.push({indices: vs, side: selected, ld, rd, l, r, other}); }
  }
  const comps = components(triangles).map((component, index) => {
    const min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity], avg = [0, 0, 0];
    let distalAverage = 0; let nonArmAverage = 0;
    for (const vertex of component.vertices) {
      for (let axis = 0; axis < 3; axis++) { const value = position[vertex * 3 + axis]; min[axis] = Math.min(min[axis], value); max[axis] = Math.max(max[axis], value); avg[axis] += value; }
    }
    for (let axis = 0; axis < 3; axis++) avg[axis] /= component.vertices.size;
    for (const triangleIndex of component.triangles) {
      const triangle = triangles[triangleIndex];
      distalAverage += triangle[triangle.side === 'left' ? 'ld' : 'rd'].reduce((a, b) => a + b, 0) / 3;
      nonArmAverage += triangle.other.reduce((a, b) => a + b, 0) / 3;
    }
    return { index, triangles: component.triangles.length, vertices: component.vertices.size, left: component.left, right: component.right, bbox: {min, max}, avg, meanDistalWeight: distalAverage / component.triangles.length, meanNonArmWeight: nonArmAverage / component.triangles.length };
  });
  output.primitives.push({primitiveIndex, vertices: position.length / 3, triangles: indices.length / 3, all, components: comps.slice(0, 30)});
}
console.log(JSON.stringify(output, null, 2));
