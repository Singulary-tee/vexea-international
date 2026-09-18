import {NodeIO} from '@gltf-transform/core';
import {KHRDracoMeshCompression, EXTTextureWebP} from '@gltf-transform/extensions';
import draco3d from 'draco3dgltf';
const io = new NodeIO().registerExtensions([KHRDracoMeshCompression, EXTTextureWebP]).registerDependencies({'draco3d.decoder': await draco3d.createDecoderModule()});
const doc = await io.read('/tmp/Player_one-optimized.glb');
const root = doc.getRoot(); const skin = root.listSkins()[0]; const bones = skin.listJoints();
const norm = (s) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
const names = bones.map((b) => norm(b.getName()));
const sets = {left: new Set(), right: new Set(), leftShoulder: new Set(), rightShoulder: new Set(), spine: new Set()};
names.forEach((n, i) => {
  for (const side of ['left', 'right']) {
    if (new RegExp(`${side}(arm|forearm|hand|wrist|thumb|index|middle|ring|pinky)`).test(n)) sets[side].add(i);
    if (n.includes(`${side}shoulder`)) sets[`${side}Shoulder`].add(i);
  }
  if (/spine|neck|head|hips/.test(n)) sets.spine.add(i);
});
const weight = (joints, weights, vertex, set) => { let total = 0; for (let k = 0; k < 4; k++) if (set.has(joints[vertex * 4 + k])) total += weights[vertex * 4 + k]; return total; };
const classify = (ld, rd, l, r, other) => {
  if (Math.max(...other) > .65) return null;
  const la = Math.max(...ld) >= .2; const ra = Math.max(...rd) >= .2;
  if (la === ra) return null;
  const distal = la ? ld : rd; if (distal.filter((v) => v >= .2).length < 2) return null;
  const side = la ? l : r; const opposite = la ? r : l;
  if (Math.min(...side) < .2 || !side.every((v, i) => v >= opposite[i])) return null;
  return la ? 'left' : 'right';
};
const out = [];
for (const [primitiveIndex, primitive] of root.listMeshes()[0].listPrimitives().entries()) {
  const position = primitive.getAttribute('POSITION').getArray(); const joints = primitive.getAttribute('JOINTS_0').getArray(); const weights = primitive.getAttribute('WEIGHTS_0').getArray(); const indices = primitive.getIndices().getArray();
  const triangles = []; const vertexToTriangles = Array.from({length: position.length / 3}, () => []);
  for (let offset = 0; offset < indices.length; offset += 3) {
    const vs = [indices[offset], indices[offset + 1], indices[offset + 2]]; const bySide = {};
    for (const side of ['left', 'right']) {
      const distal = vs.map((v) => weight(joints, weights, v, sets[side]));
      const shoulder = vs.map((v) => weight(joints, weights, v, sets[`${side}Shoulder`]));
      const oppositeSide = side === 'left' ? 'right' : 'left';
      const oppositeShoulder = vs.map((v) => weight(joints, weights, v, sets[`${oppositeSide}Shoulder`]));
      const opposite = vs.map((v) => weight(joints, weights, v, sets[oppositeSide]));
      const sideWeight = vs.map((_, i) => distal[i] + shoulder[i]);
      const other = vs.map((_, i) => Math.max(0, 1 - sideWeight[i] - opposite[i] - oppositeShoulder[i]));
      const complete = Math.min(...sideWeight) >= .5 && sideWeight.every((v, i) => v >= opposite[i] + oppositeShoulder[i]) && Math.max(...other) <= .35 && distal.filter((v) => v >= .5).length >= 2;
      const boundary = classify(distal, vs.map((v) => weight(joints, weights, v, sets.right)), sideWeight, vs.map((v, i) => opposite[i] + oppositeShoulder[i]), other);
      bySide[side] = {distal, shoulder, opposite, oppositeShoulder, sideWeight, other, selected: complete || boundary === side, kind: complete ? 'complete' : boundary === side ? 'boundary' : null};
    }
    const selectedSide = bySide.left.selected ? 'left' : bySide.right.selected ? 'right' : null;
    const triangle = {vs, bySide, selectedSide}; triangles.push(triangle); for (const v of vs) vertexToTriangles[v].push(triangles.length - 1);
  }
  for (const side of ['left', 'right']) {
    const selected = new Set(triangles.map((t, i) => t.selectedSide === side ? i : -1).filter((i) => i >= 0)); const neighbors = new Set();
    for (const ti of selected) for (const v of triangles[ti].vs) for (const neighbor of vertexToTriangles[v]) if (!selected.has(neighbor)) neighbors.add(neighbor);
    const detail = [...neighbors].map((ti) => { const t = triangles[ti], d = t.bySide[side], center = t.vs.reduce((a, v) => a.map((x, i) => x + position[v * 3 + i] / 3), [0, 0, 0]); return {ti, center, minY: Math.min(...t.vs.map((v) => position[v * 3 + 1])), maxY: Math.max(...t.vs.map((v) => position[v * 3 + 1])), avgDistal:d.distal.reduce((a,b)=>a+b,0)/3, avgShoulder:d.shoulder.reduce((a,b)=>a+b,0)/3, avgSpine:t.vs.reduce((a,v)=>a+weight(joints,weights,v,sets.spine)/3,0), maxSpine:Math.max(...t.vs.map(v=>weight(joints,weights,v,sets.spine))), maxNonArm:Math.max(...d.other), selectedSide:t.selectedSide, kind:d.kind}; }).sort((a,b)=>a.center[0]-b.center[0]);
    out.push({primitive: primitiveIndex, side, selected: selected.size, neighborCount: neighbors.size, detail});
  }
}
console.log(JSON.stringify(out, null, 2));
