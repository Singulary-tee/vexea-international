const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

const R2_BASE = "https://vexea-r2-asset-guard.alte.workers.dev/Models/Entities";

const filesToTest = [
  { name: "Player_one-optimized.glb", label: "Player character model" },
  { name: "humanoid-optimized.glb", label: "Humanoid Drone" },
  { name: "quadcopter_bmb-optimized.glb", label: "Bomber Drone" },
  { name: "quadcopter_cam-optimized.glb", label: "Recon Drone" },
  { name: "quadcopter_rifle-optimized.glb", label: "Rotary Shooter" },
  { name: "uav-optimized.glb", label: "Fixed Wing" },
  { name: "ugv-optimized.glb", label: "Wheeled Drone" }
];

const tmpDir = path.join(__dirname, 'tmp_glbs');
if (!fs.existsSync(tmpDir)) {
  fs.mkdirSync(tmpDir, { recursive: true });
}

function downloadFile(url, dest, isRedirect = false) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    const parsedUrl = new URL(url);
    const client = parsedUrl.protocol === 'https:' ? https : http;
    const options = isRedirect ? {} : {
      headers: {
        'User-Agent': 'Vexea-Game-Server/1.0',
        'Referer': 'https://ais-dev-4ctghghdaic4x4jnrsic25-527059476149.europe-west2.run.app/'
      }
    };
    client.get(url, options, (response) => {
      if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
        file.close();
        fs.unlink(dest, () => {});
        return downloadFile(response.headers.location, dest, true).then(resolve).catch(reject);
      }
      if (response.statusCode !== 200) {
        file.close();
        fs.unlink(dest, () => {});
        reject(new Error(`Failed to download ${url}: status code ${response.statusCode}`));
        return;
      }
      response.pipe(file);
      file.on('finish', () => {
        file.close(() => resolve());
      });
    }).on('error', (err) => {
      file.close();
      fs.unlink(dest, () => reject(err));
    });
  });
}

function parseGLB(filePath) {
  const buf = fs.readFileSync(filePath);
  const magic = buf.readUInt32LE(0);
  if (magic !== 0x46546c67 && magic !== 0x46544C67) {
    throw new Error(`Invalid GLB magic: 0x${magic.toString(16)}`);
  }
  const chunkLength = buf.readUInt32LE(12);
  const jsonStr = buf.toString('utf8', 20, 20 + chunkLength);
  return JSON.parse(jsonStr);
}

async function main() {
  for (const item of filesToTest) {
    const filePath = path.join(tmpDir, item.name);
    if (!fs.existsSync(filePath)) {
      console.log(`Downloading ${item.name}...`);
      try {
        await downloadFile(`${R2_BASE}/${item.name}`, filePath);
      } catch (err) {
        console.warn(`R2 download failed for ${item.name}: ${err.message}, trying GitHub fallback...`);
        const ghUrl = `https://github.com/Singulary-tee/vexea/releases/download/Asset/${item.name}`;
        await downloadFile(ghUrl, filePath);
      }
    }
  }

  const results = {};

  for (const item of filesToTest) {
    const filePath = path.join(tmpDir, item.name);
    const json = parseGLB(filePath);
    
    const nodes = json.nodes || [];
    const meshes = json.meshes || [];
    const accessors = json.accessors || [];
    const parentMap = new Map();

    nodes.forEach((node, idx) => {
      if (node.children) {
        node.children.forEach(childIdx => {
          parentMap.set(childIdx, idx);
        });
      }
    });

    function getDepth(idx) {
      let depth = 0;
      let curr = idx;
      while (parentMap.has(curr)) {
        depth++;
        curr = parentMap.get(curr);
      }
      return depth;
    }

    const animList = [];
    if (json.animations && json.animations.length > 0) {
      json.animations.forEach((anim, idx) => {
        let minTime = Infinity;
        let maxTime = -Infinity;
        if (anim.samplers) {
          anim.samplers.forEach(sampler => {
            const inputAccessor = json.accessors[sampler.input];
            if (inputAccessor && inputAccessor.min && inputAccessor.max) {
              minTime = Math.min(minTime, inputAccessor.min[0]);
              maxTime = Math.max(maxTime, inputAccessor.max[0]);
            }
          });
        }
        animList.push({
          index: idx,
          name: anim.name || 'unnamed',
          minTime: minTime === Infinity ? 0 : minTime,
          maxTime: maxTime === -Infinity ? 0 : maxTime
        });
      });
    }

    const nodeList = nodes.map((node, idx) => {
      const parentIdx = parentMap.get(idx);
      const parentName = parentIdx !== undefined ? (nodes[parentIdx].name || `Node_${parentIdx}`) : "ROOT";
      const depth = getDepth(idx);
      const hasMesh = node.mesh !== undefined;
      let meshName = null;
      let bbox = null;

      if (hasMesh) {
        const mesh = meshes[node.mesh];
        meshName = mesh.name || 'unnamed';
        if (mesh.primitives) {
          let overallMin = [Infinity, Infinity, Infinity];
          let overallMax = [-Infinity, -Infinity, -Infinity];

          mesh.primitives.forEach(prim => {
            if (prim.attributes && prim.attributes.POSITION !== undefined) {
              const posAcc = accessors[prim.attributes.POSITION];
              if (posAcc && posAcc.min && posAcc.max) {
                for (let i = 0; i < 3; i++) {
                  overallMin[i] = Math.min(overallMin[i], posAcc.min[i]);
                  overallMax[i] = Math.max(overallMax[i], posAcc.max[i]);
                }
              }
            }
          });

          if (overallMin[0] !== Infinity) {
            bbox = {
              min: overallMin.map(n => Number(n.toFixed(4))),
              max: overallMax.map(n => Number(n.toFixed(4))),
              size: [
                Number((overallMax[0] - overallMin[0]).toFixed(4)),
                Number((overallMax[1] - overallMin[1]).toFixed(4)),
                Number((overallMax[2] - overallMin[2]).toFixed(4))
              ]
            };
          }
        }
      }

      return {
        index: idx,
        name: node.name || 'unnamed',
        depth,
        parentIndex: parentIdx !== undefined ? parentIdx : null,
        parentName,
        hasMesh,
        meshIndex: node.mesh !== undefined ? node.mesh : -1,
        meshName,
        bbox,
        skinIndex: node.skin !== undefined ? node.skin : undefined
      };
    });

    results[item.name] = {
      label: item.label,
      materialsCount: json.materials ? json.materials.length : 0,
      texturesCount: json.textures ? json.textures.length : 0,
      imagesCount: json.images ? json.images.length : 0,
      animations: animList,
      nodes: nodeList,
      skins: json.skins || []
    };
  }

  fs.writeFileSync(path.join(__dirname, 'parsed_assets_summary.json'), JSON.stringify(results, null, 2));
  console.log("Wrote parsed_assets_summary.json successfully!");
}

main().catch(err => {
  console.error("Error in parse_glbs:", err);
  process.exit(1);
});

