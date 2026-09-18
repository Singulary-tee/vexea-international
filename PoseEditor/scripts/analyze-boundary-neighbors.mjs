import { NodeIO } from '@gltf-transform/core';
import { KHRDracoMeshCompression, EXTTextureWebP } from '@gltf-transform/extensions';
import draco3d from 'draco3dgltf';
const io = new NodeIO().registerExtensions([KHRDracoMeshCompression, EXTTextureWebP]).registerDependencies({'draco3d.decoder': await draco3d.createDecoderModule()});
const doc = await io.read('/tmp/Player_one-optimized.glb'); const root = doc.getRoot(); const skin = root.listSkins()[0]; const bones = skin.listJoints();
const norm = (s) => s.toLowerCase().replace(/[^a-z0-9]/g, ''); const names = bones.map((b) => norm(b.getName()));
const sets = {left: new Set(), right: new Set(), leftShoulder: new Set(), rightShoulder: new Set(), spine: new Set()};
names.forEach((n,i)=>{if(/left(arm|forearm|hand|wrist|thumb|index|middle|ring|pinky)/.test(n))sets.left.add(i);if(/right(arm|forearm|hand|wrist|thumb|index|middle|ring|pinky)/.test(n))sets.right.add(i);if(n.includes('leftshoulder'))sets.leftShoulder.add(i);if(n.includes('rightshoulder'))sets.rightShoulder.add(i);if(/spine|neck|head|hips/.test(n))sets.spine.add(i)});
const vw=(ji,wa,v,set)=>{let n=0;for(let k=0;k<4;k++)if(set.has(ji[v*4+k]))n+=wa[v*4+k];return n};
for(const [pi,p] of root.listMeshes()[0].listPrimitives().entries()){
 const pos=p.getAttribute('POSITION').getArray(),ji=p.getAttribute('JOINTS_0').getArray(),wa=p.getAttribute('WEIGHTS_0').getArray(),idx=p.getIndices().getArray();
 const vertexData=Array.from({length:pos.length/3},(_,v)=>({left:vw(ji,wa,v,sets.left),right:vw(ji,wa,v,sets.right),leftShoulder:vw(ji,wa,v,sets.leftShoulder),rightShoulder:vw(ji,wa,v,sets.rightShoulder),spine:vw(ji,wa,v,sets.spine),influences:Array.from({length:4},(_,k)=>({name:names[ji[v*4+k]],weight:wa[v*4+k]})).filter(x=>x.weight>.01)}));
 const triangles=[]; const selectedBySide={left:new Set(),right:new Set()}; const vertexToTris=Array.from({length:vertexData.length},()=>[]);
 for(let t=0;t<idx.length;t+=3){const vs=[idx[t],idx[t+1],idx[t+2]]; const d={left:vs.map(v=>vertexData[v].left),right:vs.map(v=>vertexData[v].right),leftShoulder:vs.map(v=>vertexData[v].leftShoulder),rightShoulder:vs.map(v=>vertexData[v].rightShoulder),spine:vs.map(v=>vertexData[v].spine)}; const side=[];
  for(const s of ['left','right']){const other=vs.map((v,i)=>Math.max(0,1-d[s][i]-d[`${s}Shoulder`][i]-d[s==='left'?'right':'left'][i]-d[s==='left'?'rightShoulder':'leftShoulder'][i])); const sideWeight=d[s].map((v,i)=>v+d[`${s}Shoulder`][i]); const opposite=d[s==='left'?'right':'left'].map((v,i)=>v+d[s==='left'?'rightShoulder':'leftShoulder'][i]); const complete=Math.min(...sideWeight)>=.5&&sideWeight.every((v,i)=>v>=opposite[i])&&Math.max(...other)<=.35; const distal=sideWeight===d[s] ? d[s] : d[s]; const boundary=Math.max(...d[s])>=.2&&d[s].filter(v=>v>=.2).length>=2&&Math.min(...sideWeight)>=.2&&sideWeight.every((v,i)=>v>=opposite[i])&&Math.max(...other)<=.65; if((complete&&distal.filter(v=>v>=.5).length>=2)||boundary)side.push(s); }
  const triIndex = triangles.length; const entry={t,vs,side:side[0]||null,data:d}; triangles.push(entry); vs.forEach(v=>vertexToTris[v].push(triIndex)); if(side[0])selectedBySide[side[0]].add(triIndex);
 }
 const out={primitive:pi,triangles:triangles.length}; for(const side of ['left','right']){
  const selected=selectedBySide[side]; const neighborSet=new Set(); for(const t of selected)for(const v of triangles[t].vs)for(const n of vertexToTris[v])if(!selected.has(n))neighborSet.add(n);
  const summarize=(set)=>{const bins={};for(const t of set){const e=triangles[t],vs=e.vs; const s=side==='left'?'left':'right',os=side==='left'?'right':'left'; const values={distal:e.data[s],shoulder:e.data[`${s}Shoulder`],opposite:e.data[os],oppositeShoulder:e.data[`${os}Shoulder`],spine:e.data.spine}; const key=Object.fromEntries(Object.entries(values).map(([k,a])=>[k,Number((a.reduce((x,y)=>x+y,0)/3).toFixed(3))])); key.maxSpine=Number(Math.max(...values.spine).toFixed(3)); key.maxNonArm=Number(Math.max(...vs.map((v,i)=>Math.max(0,1-(values.distal[i]+values.shoulder[i]+values.opposite[i]+values.oppositeShoulder[i]))).map(x=>x)).toFixed(3)); key.min=vs.reduce((a,v)=>Math.min(a,pos[v*3+1]),Infinity); key.max=vs.reduce((a,v)=>Math.max(a,pos[v*3+1]),-Infinity); const infl=vs.flatMap(v=>vertexData[v].influences).sort((a,b)=>b.weight-a.weight).slice(0,2).map(x=>`${x.name}:${x.weight.toFixed(2)}`).join(','); const label=`dist=${key.distal} sh=${key.shoulder} opp=${key.opposite} spine=${key.spine} maxN=${key.maxNonArm} y=${key.min.toFixed(1)}..${key.max.toFixed(1)} ${infl}`; bins[label]=(bins[label]||0)+1;} return {count:set.size,top:Object.entries(bins).sort((a,b)=>b[1]-a[1]).slice(0,30)};};
  out[side]={selected:selected.size,neighbors:summarize(neighborSet)};
 }
 console.log(JSON.stringify(out,null,2));
}
