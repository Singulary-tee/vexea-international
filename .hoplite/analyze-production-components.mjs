import {NodeIO} from '@gltf-transform/core';
import {KHRDracoMeshCompression,EXTTextureWebP} from '@gltf-transform/extensions';
import draco3d from 'draco3dgltf';
const io=new NodeIO().registerExtensions([KHRDracoMeshCompression,EXTTextureWebP]).registerDependencies({'draco3d.decoder':await draco3d.createDecoderModule()});
const doc=await io.read('/tmp/Player_one-optimized.glb');
const root=doc.getRoot(), skin=root.listSkins()[0], bones=skin.listJoints();
const norm=s=>s.toLowerCase().replace(/[^a-z0-9]/g,'');
const sets={left:new Set(),right:new Set(),leftShoulder:new Set(),rightShoulder:new Set()};
bones.forEach((b,i)=>{const n=norm(b.getName());for(const side of ['left','right']){if(new RegExp(`${side}(arm|forearm|hand|wrist|thumb|index|middle|ring|pinky)`).test(n))sets[side].add(i);if(n.includes(`${side}shoulder`))sets[`${side}Shoulder`].add(i)}});
const weight=(j,w,v,set)=>{let x=0;for(let k=0;k<4;k++)if(set.has(j[v*4+k]))x+=w[v*4+k];return x};
const classifyBoundary=(ld,rd,l,r,other)=>{if(Math.max(...other)>.65)return null;const la=Math.max(...ld)>=.2,ra=Math.max(...rd)>=.2;if(la===ra)return null;const distal=la?ld:rd;if(distal.filter(v=>v>=.2).length<2)return null;const side=la?l:r,opp=la?r:l;if(Math.min(...side)<.2||!side.every((v,i)=>v>=opp[i]))return null;return la?'left':'right'};
const classify=(ld,rd,l,r,other)=>{if(Math.max(...other)>.35)return null;const L=Math.min(...l)>=.5&&l.every((v,i)=>v>=r[i]);const R=Math.min(...r)>=.5&&r.every((v,i)=>v>l[i]);return L?'left':R?'right':null};
for(const [pi,p] of root.listMeshes()[0].listPrimitives().entries()){
 const pos=p.getAttribute('POSITION').getArray(),j=p.getAttribute('JOINTS_0').getArray(),w=p.getAttribute('WEIGHTS_0').getArray(),ind=p.getIndices().getArray();
 const tris=[], byV=Array.from({length:pos.length/3},()=>[]);
 for(let o=0;o<ind.length;o+=3){const vs=[ind[o],ind[o+1],ind[o+2]];const ld=vs.map(v=>weight(j,w,v,sets.left)),rd=vs.map(v=>weight(j,w,v,sets.right));const l=vs.map((v,i)=>ld[i]+weight(j,w,v,sets.leftShoulder)),r=vs.map((v,i)=>rd[i]+weight(j,w,v,sets.rightShoulder));const other=vs.map((_,i)=>Math.max(0,1-l[i]-r[i]));const complete=classify(ld,rd,l,r,other);const side=complete&&(complete==='left'?ld:rd).filter(v=>v>=.5).length>=2?complete:null;const boundary=classifyBoundary(ld,rd,l,r,other);const selected=side||boundary;const t={vs,side:selected,kind:side?'complete':boundary?'boundary':null,ld,rd,l,r,other};tris.push(t);for(const v of vs)byV[v].push(tris.length-1)}
 const parent=tris.map((_,i)=>i),find=i=>parent[i]===i?i:(parent[i]=find(parent[i])),merge=(a,b)=>{a=find(a);b=find(b);if(a!==b)parent[b]=a};
 tris.forEach((t,i)=>t.vs.forEach(v=>byV[v].forEach(n=>merge(i,n))));
 const comps=new Map(); tris.forEach((t,i)=>{const r=find(i);if(!comps.has(r))comps.set(r,{triangles:0,vertices:new Set(),sel:0,left:0,right:0,complete:0,boundary:0,distal:0,non:0,min:[Infinity,Infinity,Infinity],max:[-Infinity,-Infinity,-Infinity]});const c=comps.get(r);c.triangles++;t.vs.forEach(v=>{c.vertices.add(v);for(let a=0;a<3;a++){c.min[a]=Math.min(c.min[a],pos[v*3+a]);c.max[a]=Math.max(c.max[a],pos[v*3+a])}});if(t.side){c.sel++;c[t.side]++;c[t.kind]++;const d=t.side==='left'?t.ld:t.rd;c.distal+=d.reduce((a,b)=>a+b,0)/3;c.non+=t.other.reduce((a,b)=>a+b,0)/3}});
 const out=[...comps.values()].map((c,i)=>({i,triangles:c.triangles,vertices:c.vertices.size,selected:c.sel,ratio:c.sel/c.triangles,left:c.left,right:c.right,complete:c.complete,boundary:c.boundary,avgDistal:c.sel?c.distal/c.sel:0,avgNon:c.sel?c.non/c.sel:0,min:c.min,max:c.max})).sort((a,b)=>b.selected-a.selected);
 console.log(JSON.stringify({primitive:pi,triangleCount:tris.length,components:out.filter(c=>c.selected>0).slice(0,80)},null,2));
}
