import * as THREE from 'three';
import {
  ARCHIPELAGO_SITES,
  fbm2D,
  getWorldHeight,
  sampleWorldTerrain,
  type IslandSite,
} from './terrainMath';

const WORLD_WIDTH = 124;
const WORLD_DEPTH = 92;

export function createStoneBumpTexture(): THREE.CanvasTexture {
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const img = ctx.createImageData(size, size);
  for (let i = 0; i < img.data.length; i += 4) {
    const v = 115 + ((Math.sin(i * 0.17) * 43758.5453) % 1) * 85;
    const clamped = Math.max(0, Math.min(255, Math.abs(v)));
    img.data[i] = clamped;
    img.data[i + 1] = clamped;
    img.data[i + 2] = clamped;
    img.data[i + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

function lerpRgb(
  a: [number, number, number],
  b: [number, number, number],
  t: number
): [number, number, number] {
  const k = Math.max(0, Math.min(1, t));
  return [
    a[0] + (b[0] - a[0]) * k,
    a[1] + (b[1] - a[1]) * k,
    a[2] + (b[2] - a[2]) * k,
  ];
}

export function createArchipelagoTerrainMesh(
  bumpTex: THREE.CanvasTexture,
  maxAnisotropy: number
): { mesh: THREE.Mesh; terrainTex: THREE.CanvasTexture } {
  const segX = 148;
  const segZ = 110;

  const geo = new THREE.PlaneGeometry(WORLD_WIDTH, WORLD_DEPTH, segX, segZ);
  geo.rotateX(-Math.PI / 2);

  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    pos.setY(i, getWorldHeight(x, z));
  }
  geo.computeVertexNormals();

  // High-res procedural terrain texture (512x384 -> smooth organic coastlines, zero triangle stair-steps!)
  const tw = 512;
  const th = 384;
  const canvas = document.createElement('canvas');
  canvas.width = tw;
  canvas.height = th;
  const ctx = canvas.getContext('2d')!;
  const img = ctx.createImageData(tw, th);
  const data = img.data;

  const cDeep: [number, number, number] = [6, 37, 58];
  const cReef: [number, number, number] = [20, 92, 108];
  const cShoal: [number, number, number] = [166, 224, 200];
  const cBeach: [number, number, number] = [238, 214, 162];
  const cLushLow: [number, number, number] = [74, 154, 66];
  const cLushMid: [number, number, number] = [44, 104, 50];
  const cRockWarm: [number, number, number] = [126, 98, 76];
  const cRockRed: [number, number, number] = [152, 66, 48];
  const cRockDark: [number, number, number] = [80, 66, 58];
  const cSnow: [number, number, number] = [244, 248, 252];

  for (let py = 0; py < th; py++) {
    const vz = py / (th - 1);
    const z = (vz - 0.5) * WORLD_DEPTH;
    for (let px = 0; px < tw; px++) {
      const ux = px / (tw - 1);
      const x = (ux - 0.5) * WORLD_WIDTH;

      const sample = sampleWorldTerrain(x, z);
      const h = sample.height;
      const micro = fbm2D(x * 1.3, z * 1.3, 2) * 0.5 + 0.5;

      let rgb: [number, number, number];
      if (h < -1.35) {
        rgb = lerpRgb(cDeep, cReef, Math.max(0, (h + 2.6) / 1.25) * 0.45);
      } else if (h < -0.35) {
        rgb = lerpRgb(cReef, cShoal, (h + 1.35) / 1.0);
      } else if (h < 0.04) {
        rgb = lerpRgb(cShoal, cBeach, (h + 0.35) / 0.39);
      } else if (h < 0.42) {
        rgb = lerpRgb(cBeach, cLushLow, Math.pow((h - 0.04) / 0.38, 1.35) * 0.6);
      } else if (h < 1.85) {
        const t = (h - 0.42) / 1.43;
        rgb = lerpRgb(cLushLow, cLushMid, 0.22 + micro * 0.65);
        if (t > 0.72) {
          const rBase =
            sample.biome === 'volcanic' || sample.biome === 'citadel'
              ? cRockRed
              : cRockWarm;
          rgb = lerpRgb(rgb, rBase, (t - 0.72) / 0.28);
        }
      } else if (h < 3.65) {
        const t = (h - 1.85) / 1.8;
        const rBase =
          sample.biome === 'volcanic' || sample.biome === 'citadel'
            ? cRockRed
            : cRockWarm;
        rgb = lerpRgb(rBase, cRockDark, micro * 0.55 + t * 0.25);
      } else {
        const t = Math.min(1, (h - 3.65) / 1.1);
        if (sample.biome === 'alpine' || sample.biome === 'volcanic') {
          rgb = lerpRgb(cRockWarm, cSnow, t);
        } else {
          rgb = lerpRgb(cRockWarm, cRockDark, 0.3 + t * 0.4);
        }
      }

      const idx = (py * tw + px) * 4;
      data[idx] = Math.round(rgb[0]);
      data[idx + 1] = Math.round(rgb[1]);
      data[idx + 2] = Math.round(rgb[2]);
      data[idx + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);

  const terrainTex = new THREE.CanvasTexture(canvas);
  terrainTex.colorSpace = THREE.SRGBColorSpace;
  terrainTex.anisotropy = maxAnisotropy;

  const mat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: terrainTex,
    roughness: 0.88,
    metalness: 0.03,
    bumpMap: bumpTex,
    bumpScale: 0.11,
  });

  const mesh = new THREE.Mesh(geo, mat);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return { mesh, terrainTex };
}

export function createDepthOceanMesh(maxAnisotropy: number): {
  mesh: THREE.Mesh;
  oceanTex: THREE.CanvasTexture;
  waveUniforms: { uTime: { value: number } };
} {
  const geo = new THREE.PlaneGeometry(WORLD_WIDTH, WORLD_DEPTH, 96, 72);
  geo.rotateX(-Math.PI / 2);

  // High-res bathymetry + white shoreline foam texture (512x384 -> crystal-smooth turquoise coves!)
  const ow = 512;
  const oh = 384;
  const canvas = document.createElement('canvas');
  canvas.width = ow;
  canvas.height = oh;
  const ctx = canvas.getContext('2d')!;
  const img = ctx.createImageData(ow, oh);
  const data = img.data;

  const cFoam: [number, number, number] = [238, 252, 255];
  const cTurq: [number, number, number] = [44, 222, 212];
  const cLagoon: [number, number, number] = [18, 152, 172];
  const cMidSea: [number, number, number] = [10, 88, 126];
  const cAbyss: [number, number, number] = [5, 40, 68];

  for (let py = 0; py < oh; py++) {
    const vz = py / (oh - 1);
    const z = (vz - 0.5) * WORLD_DEPTH;
    for (let px = 0; px < ow; px++) {
      const ux = px / (ow - 1);
      const x = (ux - 0.5) * WORLD_WIDTH;

      const seabedH = getWorldHeight(x, z);
      const waterDepth = -seabedH;

      let rgb: [number, number, number];
      let alpha = 225;

      if (waterDepth <= 0.12) {
        const t = Math.max(0, waterDepth / 0.12);
        rgb = lerpRgb(cFoam, cTurq, t * 0.4);
        alpha = waterDepth < -0.05 ? 0 : Math.round(235 - t * 45);
      } else if (waterDepth <= 0.72) {
        const t = (waterDepth - 0.12) / 0.6;
        rgb = lerpRgb(cTurq, cLagoon, t);
        alpha = Math.round(165 + t * 35);
      } else if (waterDepth <= 1.55) {
        const t = (waterDepth - 0.72) / 0.83;
        rgb = lerpRgb(cLagoon, cMidSea, t);
        alpha = Math.round(200 + t * 30);
      } else {
        const t = Math.min(1, (waterDepth - 1.55) / 1.1);
        rgb = lerpRgb(cMidSea, cAbyss, t);
        alpha = Math.round(230 + t * 20);
      }

      const idx = (py * ow + px) * 4;
      data[idx] = Math.round(rgb[0]);
      data[idx + 1] = Math.round(rgb[1]);
      data[idx + 2] = Math.round(rgb[2]);
      data[idx + 3] = alpha;
    }
  }
  ctx.putImageData(img, 0, 0);

  const oceanTex = new THREE.CanvasTexture(canvas);
  oceanTex.colorSpace = THREE.SRGBColorSpace;
  oceanTex.anisotropy = maxAnisotropy;

  const waveUniforms = { uTime: { value: 0 } };
  const mat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: oceanTex,
    roughness: 0.16,
    metalness: 0.25,
    transparent: true,
    depthWrite: false,
  });

  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = waveUniforms.uTime;
    shader.vertexShader =
      `uniform float uTime;\n` +
      shader.vertexShader.replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
         float swell = sin(position.x * 0.45 + uTime * 1.6) * 0.055
                     + cos(position.z * 0.52 + uTime * 1.25) * 0.045;
         transformed.y += swell;`
      );
  };

  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.y = 0.02;
  mesh.receiveShadow = true;
  return { mesh, oceanTex, waveUniforms };
}

function createPalmStarCrownGeometry(): THREE.BufferGeometry {
  // Build a multi-blade 5-frond tropical palm rosette in a single BufferGeometry
  const positions: number[] = [];
  const normals: number[] = [];

  const frondCount = 6;
  for (let f = 0; f < frondCount; f++) {
    const ang = (f / frondCount) * Math.PI * 2;
    const cosA = Math.cos(ang);
    const sinA = Math.sin(ang);
    const px = -sinA;
    const pz = cosA;

    const tipX = cosA * 0.62;
    const tipZ = sinA * 0.62;
    const midX = cosA * 0.3;
    const midZ = sinA * 0.3;

    const baseY = 0.88;
    const midY = 1.02;
    const tipY = 0.74;
    const halfW = 0.14;

    // Two triangles forming a graceful drooping leaf frond
    const v0 = [0, baseY, 0];
    const vL = [midX + px * halfW, midY, midZ + pz * halfW];
    const vR = [midX - px * halfW, midY, midZ - pz * halfW];
    const vT = [tipX, tipY, tipZ];

    [
      v0, vL, vT,
      v0, vT, vR,
    ].forEach((v) => {
      positions.push(v[0], v[1], v[2]);
      normals.push(0, 1, 0);
    });
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  geo.computeVertexNormals();
  return geo;
}

export function createArchipelagoFoliageAndRocks(
  bumpTex: THREE.CanvasTexture
): THREE.Group {
  const group = new THREE.Group();

  const palmSpots: Array<{
    x: number;
    y: number;
    z: number;
    scale: number;
    rotY: number;
    lean: number;
    tint: number;
  }> = [];
  const pineSpots: Array<{
    x: number;
    y: number;
    z: number;
    scale: number;
    rotY: number;
    tint: number;
  }> = [];
  const rockSpots: Array<{
    x: number;
    y: number;
    z: number;
    sx: number;
    sy: number;
    sz: number;
    rotY: number;
    tint: number;
  }> = [];

  ARCHIPELAGO_SITES.forEach((site, sIdx) => {
    const treeCount = site.biome === 'islet' ? 6 : site.biome === 'citadel' ? 8 : 22;
    for (let i = 0; i < treeCount * 2; i++) {
      const seed = Math.abs(Math.sin((i + 1) * 19.3 + sIdx * 47.1));
      const ang = (i / (treeCount * 2)) * Math.PI * 2 + seed * 0.6;
      const minR = site.chapterId ? 2.15 : 0.7;
      const dist = minR + seed * (site.radius * 0.68 - minR);
      const x = site.x + Math.cos(ang) * dist;
      const z = site.z + Math.sin(ang) * dist;
      const sample = sampleWorldTerrain(x, z);
      if (sample.height > 0.45 && sample.height < 2.25) {
        if (site.biome === 'alpine') {
          pineSpots.push({
            x,
            y: sample.height - 0.05,
            z,
            scale: 0.78 + seed * 0.45,
            rotY: seed * Math.PI * 2,
            tint: seed > 0.5 ? 0x265c3b : 0x1e4d32,
          });
        } else {
          palmSpots.push({
            x,
            y: sample.height - 0.05,
            z,
            scale: 0.8 + seed * 0.5,
            rotY: seed * Math.PI * 2,
            lean: (seed - 0.5) * 0.3,
            tint: seed > 0.5 ? 0x3e9644 : 0x56ab48,
          });
        }
      }
    }

    const rockCount = site.biome === 'islet' ? 8 : 14;
    for (let i = 0; i < rockCount * 2 && rockSpots.length < 160; i++) {
      const seed = Math.abs(Math.cos((i + 3) * 31.7 + sIdx * 13.9));
      const ang = (i / (rockCount * 2)) * Math.PI * 2 + seed * 0.9;
      const dist = site.radius * (0.72 + seed * 0.55);
      const x = site.x + Math.cos(ang) * dist;
      const z = site.z + Math.sin(ang) * dist;
      const h = getWorldHeight(x, z);
      if (h > -0.65 && h < 0.55) {
        rockSpots.push({
          x,
          y: h - 0.08,
          z,
          sx: 0.28 + seed * 0.42,
          sy: 0.25 + seed * 0.48,
          sz: 0.28 + ((seed * 1.7) % 1) * 0.35,
          rotY: seed * Math.PI * 2,
          tint: seed > 0.5 ? 0x76604e : 0x5d524a,
        });
      }
    }
  });

  const dummy = new THREE.Object3D();
  const color = new THREE.Color();

  // Instanced Tropical Palms (trunk + 6-frond rosette)
  if (palmSpots.length > 0) {
    const trunkGeo = new THREE.CylinderGeometry(0.05, 0.09, 0.88, 5);
    trunkGeo.translate(0, 0.44, 0);
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x7a4e2f, roughness: 0.88 });
    const trunkInst = new THREE.InstancedMesh(trunkGeo, trunkMat, palmSpots.length);
    trunkInst.castShadow = true;

    const frondGeo = createPalmStarCrownGeometry();
    const frondMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.72,
      side: THREE.DoubleSide,
    });
    const frondInst = new THREE.InstancedMesh(frondGeo, frondMat, palmSpots.length);
    frondInst.castShadow = true;

    palmSpots.forEach((p, idx) => {
      dummy.position.set(p.x, p.y, p.z);
      dummy.rotation.set(p.lean * 0.4, p.rotY, p.lean);
      dummy.scale.setScalar(p.scale);
      dummy.updateMatrix();
      trunkInst.setMatrixAt(idx, dummy.matrix);
      frondInst.setMatrixAt(idx, dummy.matrix);
      frondInst.setColorAt(idx, color.setHex(p.tint));
    });
    trunkInst.instanceMatrix.needsUpdate = true;
    frondInst.instanceMatrix.needsUpdate = true;
    if (frondInst.instanceColor) frondInst.instanceColor.needsUpdate = true;
    trunkInst.computeBoundingSphere();
    frondInst.computeBoundingSphere();
    group.add(trunkInst);
    group.add(frondInst);
  }

  // Instanced Alpine Pines
  if (pineSpots.length > 0) {
    const pTrunkGeo = new THREE.CylinderGeometry(0.05, 0.08, 0.5, 5);
    pTrunkGeo.translate(0, 0.25, 0);
    const pTrunkInst = new THREE.InstancedMesh(
      pTrunkGeo,
      new THREE.MeshStandardMaterial({ color: 0x5c3a21, roughness: 0.88 }),
      pineSpots.length
    );

    const pConeGeo = new THREE.ConeGeometry(0.36, 1.05, 6);
    pConeGeo.translate(0, 0.85, 0);
    const pConeInst = new THREE.InstancedMesh(
      pConeGeo,
      new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.8 }),
      pineSpots.length
    );
    pConeInst.castShadow = true;

    pineSpots.forEach((p, idx) => {
      dummy.position.set(p.x, p.y, p.z);
      dummy.rotation.set(0, p.rotY, 0);
      dummy.scale.setScalar(p.scale);
      dummy.updateMatrix();
      pTrunkInst.setMatrixAt(idx, dummy.matrix);
      pConeInst.setMatrixAt(idx, dummy.matrix);
      pConeInst.setColorAt(idx, color.setHex(p.tint));
    });
    pTrunkInst.instanceMatrix.needsUpdate = true;
    pConeInst.instanceMatrix.needsUpdate = true;
    if (pConeInst.instanceColor) pConeInst.instanceColor.needsUpdate = true;
    pTrunkInst.computeBoundingSphere();
    pConeInst.computeBoundingSphere();
    group.add(pTrunkInst);
    group.add(pConeInst);
  }

  // Instanced Coastal Rocks
  const rockGeo = new THREE.DodecahedronGeometry(0.65, 0);
  const rockMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.9,
    bumpMap: bumpTex,
    bumpScale: 0.1,
  });
  const rockInst = new THREE.InstancedMesh(rockGeo, rockMat, rockSpots.length);
  rockInst.castShadow = true;
  rockInst.receiveShadow = true;
  rockSpots.forEach((r, idx) => {
    dummy.position.set(r.x, r.y + r.sy * 0.35, r.z);
    dummy.rotation.set(r.rotY * 0.2, r.rotY, r.rotY * 0.15);
    dummy.scale.set(r.sx, r.sy, r.sz);
    dummy.updateMatrix();
    rockInst.setMatrixAt(idx, dummy.matrix);
    rockInst.setColorAt(idx, color.setHex(r.tint));
  });
  rockInst.instanceMatrix.needsUpdate = true;
  if (rockInst.instanceColor) rockInst.instanceColor.needsUpdate = true;
  rockInst.computeBoundingSphere();
  group.add(rockInst);

  return group;
}

export interface AnimatedEnvRefs {
  lighthouseBeam?: THREE.Object3D;
  craneArm?: THREE.Object3D;
  floatingSky?: THREE.Object3D;
  treasureCrystal?: THREE.Object3D;
  ambientBoats: Array<{ mesh: THREE.Group; cx: number; cz: number; r: number; speed: number; phase: number }>;
  birdsInst: THREE.InstancedMesh;
  birdSeeds: Array<{ cx: number; cz: number; r: number; y: number; speed: number; phase: number }>;
}

function createTinySloop(sailColor: number): THREE.Group {
  const sloop = new THREE.Group();
  const hull = new THREE.Mesh(
    new THREE.BoxGeometry(0.32, 0.18, 0.72),
    new THREE.MeshStandardMaterial({ color: 0x6b3e22, roughness: 0.8 })
  );
  hull.position.y = 0.08;
  sloop.add(hull);
  const mast = new THREE.Mesh(
    new THREE.CylinderGeometry(0.02, 0.03, 0.68, 5),
    new THREE.MeshStandardMaterial({ color: 0x3b2214, roughness: 0.8 })
  );
  mast.position.y = 0.42;
  sloop.add(mast);
  const sail = new THREE.Mesh(
    new THREE.ConeGeometry(0.24, 0.55, 3),
    new THREE.MeshStandardMaterial({ color: sailColor, roughness: 0.85 })
  );
  sail.position.set(0, 0.45, 0.04);
  sloop.add(sail);
  return sloop;
}

export function createAllIslandStructures(): {
  group: THREE.Group;
  envRefs: AnimatedEnvRefs;
} {
  const group = new THREE.Group();
  const envRefs: AnimatedEnvRefs = {
    ambientBoats: [],
    birdsInst: null as unknown as THREE.InstancedMesh,
    birdSeeds: [],
  };

  const creamMat = new THREE.MeshStandardMaterial({ color: 0xf4ebd9, roughness: 0.7 });
  const woodMat = new THREE.MeshStandardMaterial({ color: 0x6f472b, roughness: 0.82 });
  const roofRedMat = new THREE.MeshStandardMaterial({ color: 0xb03028, roughness: 0.72 });
  const roofSlateMat = new THREE.MeshStandardMaterial({ color: 0x243447, roughness: 0.65 });
  const goldMat = new THREE.MeshStandardMaterial({
    color: 0xe2ab36,
    roughness: 0.24,
    metalness: 0.88,
  });
  const warmWindowMat = new THREE.MeshStandardMaterial({
    color: 0xffe49e,
    emissive: 0xffae34,
    emissiveIntensity: 1.2,
    roughness: 0.3,
  });

  ARCHIPELAGO_SITES.forEach((site) => {
    if (site.biome === 'volcanic') {
      const cascadeMat = new THREE.MeshStandardMaterial({
        color: 0x8be9ff,
        emissive: 0x2899c4,
        emissiveIntensity: 0.6,
        roughness: 0.16,
      });
      const rSite = new THREE.Group();
      [
        new THREE.CatmullRomCurve3([
          new THREE.Vector3(site.x - 1.1, 5.2, site.z - 0.8),
          new THREE.Vector3(site.x + 1.0, 2.5, site.z - 0.3),
          new THREE.Vector3(site.x + 3.8, 0.1, site.z + 0.1),
        ]),
        new THREE.CatmullRomCurve3([
          new THREE.Vector3(site.x - 1.3, 4.4, site.z + 0.9),
          new THREE.Vector3(site.x + 0.8, 2.1, site.z + 1.4),
          new THREE.Vector3(site.x + 3.4, 0.1, site.z + 1.8),
        ]),
      ].forEach((curve) => {
        const chute = new THREE.Mesh(
          new THREE.TubeGeometry(curve, 14, 0.28, 8, false),
          cascadeMat
        );
        rSite.add(chute);
      });
      group.add(rSite);
    } else if (site.chapterId === 1) {
      const lhX = site.x - 1.3;
      const lhZ = site.z - 0.6;
      const lhY = getWorldHeight(lhX, lhZ);

      const tower = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.45, 2.1, 10), creamMat);
      tower.position.set(lhX, lhY + 1.0, lhZ);
      tower.castShadow = true;
      group.add(tower);

      const cap = new THREE.Mesh(new THREE.ConeGeometry(0.46, 0.62, 10), roofRedMat);
      cap.position.set(lhX, lhY + 2.35, lhZ);
      group.add(cap);

      const lanternPivot = new THREE.Group();
      lanternPivot.position.set(lhX, lhY + 2.02, lhZ);
      const beam = new THREE.Mesh(
        new THREE.ConeGeometry(0.65, 3.6, 12, 1, true),
        new THREE.MeshBasicMaterial({
          color: 0xffe694,
          transparent: true,
          opacity: 0.24,
          side: THREE.DoubleSide,
          depthWrite: false,
        })
      );
      beam.rotation.z = Math.PI / 2;
      beam.position.x = 1.85;
      lanternPivot.add(beam);
      group.add(lanternPivot);
      envRefs.lighthouseBeam = lanternPivot;

      [
        [0.4, 0.3, 0.2],
        [-0.3, 1.15, -0.4],
        [1.1, -0.45, 0.6],
      ].forEach(([dx, dz, rot]) => {
        const bx = site.x + dx;
        const bz = site.z + dz;
        const by = getWorldHeight(bx, bz);
        const house = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.52, 0.62), creamMat);
        house.position.set(bx, by + 0.24, bz);
        house.rotation.y = rot;
        house.castShadow = true;
        group.add(house);

        const roof = new THREE.Mesh(new THREE.ConeGeometry(0.6, 0.42, 4), roofRedMat);
        roof.position.set(bx, by + 0.7, bz);
        roof.rotation.y = rot + Math.PI / 4;
        group.add(roof);

        const win = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.16, 0.65), warmWindowMat);
        win.position.set(bx, by + 0.25, bz);
        win.rotation.y = rot;
        group.add(win);
      });

      const pier = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.14, 0.56), woodMat);
      pier.position.set(site.x + 2.8, 0.24, site.z + 2.1);
      pier.rotation.y = -site.coveAngle;
      pier.castShadow = true;
      group.add(pier);

      const boat1 = createTinySloop(0xfef3c7);
      group.add(boat1);
      envRefs.ambientBoats.push({
        mesh: boat1,
        cx: site.x + 4.4,
        cz: site.z + 3.4,
        r: 1.4,
        speed: 0.42,
        phase: 0.4,
      });
    } else if (site.chapterId === 2) {
      const crX = site.x + 1.1;
      const crZ = site.z + 0.8;
      const crY = getWorldHeight(crX, crZ);

      const post = new THREE.Mesh(new THREE.BoxGeometry(0.22, 2.2, 0.22), woodMat);
      post.position.set(crX, crY + 1.05, crZ);
      post.castShadow = true;
      group.add(post);

      const armGroup = new THREE.Group();
      armGroup.position.set(crX, crY + 2.05, crZ);
      const boom = new THREE.Mesh(new THREE.BoxGeometry(1.75, 0.15, 0.16), goldMat);
      boom.position.set(0.65, 0.1, 0);
      boom.rotation.z = 0.15;
      armGroup.add(boom);
      group.add(armGroup);
      envRefs.craneArm = armGroup;

      const dryHull = new THREE.Mesh(new THREE.BoxGeometry(1.25, 0.48, 0.72), woodMat);
      const dhX = site.x + 1.7;
      const dhZ = site.z - 0.35;
      dryHull.position.set(dhX, getWorldHeight(dhX, dhZ) + 0.22, dhZ);
      dryHull.castShadow = true;
      group.add(dryHull);

      const pier = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.14, 0.55), woodMat);
      pier.position.set(site.x + 2.6, 0.24, site.z + 2.4);
      pier.rotation.y = -site.coveAngle;
      group.add(pier);
    } else if (site.chapterId === 3) {
      const skyGroup = new THREE.Group();
      skyGroup.position.set(site.x + 0.2, 3.85, site.z + 0.2);

      const cloudMat = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        roughness: 0.92,
        emissive: 0xcbe7ff,
        emissiveIntensity: 0.2,
      });
      [
        [0, 0, 0, 1.25],
        [-1.0, -0.1, 0.4, 0.85],
        [1.0, -0.08, -0.35, 0.9],
        [0.35, -0.12, 0.88, 0.8],
        [-0.45, -0.12, -0.82, 0.82],
      ].forEach(([cx, cy, cz, cr]) => {
        const puff = new THREE.Mesh(new THREE.SphereGeometry(cr, 12, 10), cloudMat);
        puff.scale.set(1.25, 0.55, 1.15);
        puff.position.set(cx, cy, cz);
        puff.castShadow = true;
        skyGroup.add(puff);
      });

      const turf = new THREE.Mesh(
        new THREE.CylinderGeometry(1.35, 1.05, 0.35, 12),
        new THREE.MeshStandardMaterial({ color: 0x4b9b43, roughness: 0.84 })
      );
      turf.position.y = 0.38;
      skyGroup.add(turf);

      const obs = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.72, 0.75, 12), creamMat);
      obs.position.y = 0.88;
      skyGroup.add(obs);

      const dome = new THREE.Mesh(
        new THREE.SphereGeometry(0.6, 14, 10, 0, Math.PI * 2, 0, Math.PI / 2),
        goldMat
      );
      dome.position.y = 1.24;
      skyGroup.add(dome);

      group.add(skyGroup);
      envRefs.floatingSky = skyGroup;

      const boat2 = createTinySloop(0xe0f2fe);
      group.add(boat2);
      envRefs.ambientBoats.push({
        mesh: boat2,
        cx: site.x + 0.5,
        cz: site.z + 4.3,
        r: 1.35,
        speed: -0.36,
        phase: 1.7,
      });
    } else if (site.chapterId === 4) {
      const tY = getWorldHeight(site.x, site.z);
      const t1 = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.55, 1.9), goldMat);
      t1.position.set(site.x, tY + 0.22, site.z);
      t1.castShadow = true;
      group.add(t1);

      const t2 = new THREE.Mesh(
        new THREE.BoxGeometry(1.2, 0.5, 1.2),
        new THREE.MeshStandardMaterial({ color: 0xf7cf66, roughness: 0.2, metalness: 0.9 })
      );
      t2.position.set(site.x, tY + 0.72, site.z);
      group.add(t2);

      const jewel = new THREE.Mesh(
        new THREE.OctahedronGeometry(0.42, 0),
        new THREE.MeshStandardMaterial({
          color: 0x2dd4bf,
          emissive: 0x0f766e,
          emissiveIntensity: 0.95,
          roughness: 0.12,
        })
      );
      jewel.position.set(site.x, tY + 1.5, site.z);
      group.add(jewel);
      envRefs.treasureCrystal = jewel;

      const bubbleMat = new THREE.MeshStandardMaterial({
        color: 0xa5f3fc,
        emissive: 0x22d3ee,
        emissiveIntensity: 0.22,
        roughness: 0.1,
        metalness: 0.15,
        transparent: true,
        opacity: 0.42,
        depthWrite: false,
      });
      [
        [1.55, 0.9, 0.58],
        [-1.45, 0.85, 0.46],
        [1.3, -1.15, 0.44],
      ].forEach(([dx, dz, br]) => {
        const bx = site.x + dx;
        const bz = site.z + dz;
        const bubble = new THREE.Mesh(new THREE.SphereGeometry(br, 14, 12), bubbleMat);
        bubble.position.set(bx, getWorldHeight(bx, bz) + br * 0.7, bz);
        group.add(bubble);
      });
    } else if (site.chapterId === 5) {
      const cY = getWorldHeight(site.x, site.z);
      const keep = new THREE.Mesh(new THREE.BoxGeometry(2.3, 1.45, 2.0), creamMat);
      keep.position.set(site.x, cY + 0.65, site.z);
      keep.castShadow = true;
      group.add(keep);

      const r1 = new THREE.Mesh(new THREE.ConeGeometry(1.85, 0.82, 4), roofSlateMat);
      r1.rotation.y = Math.PI / 4;
      r1.position.set(site.x, cY + 1.75, site.z);
      group.add(r1);

      const upper = new THREE.Mesh(new THREE.BoxGeometry(1.4, 1.05, 1.25), creamMat);
      upper.position.set(site.x, cY + 2.15, site.z);
      upper.castShadow = true;
      group.add(upper);

      const r2 = new THREE.Mesh(new THREE.ConeGeometry(1.22, 0.9, 4), roofRedMat);
      r2.rotation.y = Math.PI / 4;
      r2.position.set(site.x, cY + 3.05, site.z);
      group.add(r2);

      const spire = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.13, 1.0, 6), goldMat);
      spire.position.set(site.x, cY + 3.8, site.z);
      group.add(spire);

      [-1.4, 1.4].forEach((dx) => {
        const tx = site.x + dx;
        const tz = site.z + 0.55;
        const tY = getWorldHeight(tx, tz);
        const tower = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.45, 1.65, 8), creamMat);
        tower.position.set(tx, tY + 0.78, tz);
        tower.castShadow = true;
        group.add(tower);
        const tr = new THREE.Mesh(new THREE.ConeGeometry(0.5, 0.55, 8), roofRedMat);
        tr.position.set(tx, tY + 1.82, tz);
        group.add(tr);
      });

      const warShip = createTinySloop(0x334155);
      group.add(warShip);
      envRefs.ambientBoats.push({
        mesh: warShip,
        cx: site.x - 4.4,
        cz: site.z + 3.2,
        r: 1.5,
        speed: 0.34,
        phase: 2.5,
      });
    }
  });

  const birdShape = new THREE.Shape();
  birdShape.moveTo(0, 0.14);
  birdShape.lineTo(0.28, -0.08);
  birdShape.lineTo(0.12, -0.02);
  birdShape.lineTo(0, 0.04);
  birdShape.lineTo(-0.12, -0.02);
  birdShape.lineTo(-0.28, -0.08);
  birdShape.closePath();
  const birdGeo = new THREE.ShapeGeometry(birdShape);
  birdGeo.rotateX(-Math.PI / 2);
  const birdMat = new THREE.MeshBasicMaterial({
    color: 0xf8fafc,
    side: THREE.DoubleSide,
  });
  const birdCount = 14;
  const birdsInst = new THREE.InstancedMesh(birdGeo, birdMat, birdCount);
  birdsInst.frustumCulled = false;

  ARCHIPELAGO_SITES.slice(1, 6).forEach((site, sIdx) => {
    for (let b = 0; b < 3 && envRefs.birdSeeds.length < birdCount; b++) {
      envRefs.birdSeeds.push({
        cx: site.x,
        cz: site.z,
        r: 2.6 + b * 1.1,
        y: 5.2 + sIdx * 0.25 + b * 0.45,
        speed: 0.42 + b * 0.12,
        phase: b * 2.1 + sIdx * 1.3,
      });
    }
  });
  group.add(birdsInst);
  envRefs.birdsInst = birdsInst;

  return { group, envRefs };
}

export function createLockedIslandOverlay(
  site: IslandSite,
  labelY: number
): THREE.Group {
  const lockGroup = new THREE.Group();
  lockGroup.position.set(site.x, 0, site.z);

  // Subtle low storm mist ring below sky-island height so it never clips Ch.3 clouds
  const stormMat = new THREE.MeshStandardMaterial({
    color: 0x334155,
    emissive: 0x0f172a,
    emissiveIntensity: 0.45,
    roughness: 0.95,
    transparent: true,
    opacity: 0.72,
  });

  const ringPuffs = 8;
  for (let i = 0; i < ringPuffs; i++) {
    const ang = (i / ringPuffs) * Math.PI * 2;
    const r = 3.2;
    const puff = new THREE.Mesh(new THREE.SphereGeometry(0.85, 10, 8), stormMat);
    puff.scale.set(1.25, 0.48, 1.1);
    puff.position.set(Math.cos(ang) * r, 2.25 + (i % 2) * 0.2, Math.sin(ang) * r);
    lockGroup.add(puff);
  }

  // Floating 3D Padlock Emblem positioned cleanly ABOVE the parchment banner
  const padlock = new THREE.Group();
  padlock.position.set(0, labelY + 1.35, 0);

  const lockBody = new THREE.Mesh(
    new THREE.BoxGeometry(0.9, 0.8, 0.4),
    new THREE.MeshStandardMaterial({
      color: 0x991b1b,
      emissive: 0x450a0a,
      emissiveIntensity: 0.65,
      roughness: 0.35,
      metalness: 0.65,
    })
  );
  padlock.add(lockBody);

  const shackle = new THREE.Mesh(
    new THREE.TorusGeometry(0.28, 0.085, 8, 18, Math.PI),
    new THREE.MeshStandardMaterial({
      color: 0xf4c456,
      roughness: 0.25,
      metalness: 0.88,
    })
  );
  shackle.position.y = 0.39;
  padlock.add(shackle);

  lockGroup.add(padlock);
  return lockGroup;
}

export function createPirateGalleon(): THREE.Group {
  const ship = new THREE.Group();

  const hullMat = new THREE.MeshStandardMaterial({
    color: 0x5c361e,
    roughness: 0.78,
    metalness: 0.08,
  });
  const trimMat = new THREE.MeshStandardMaterial({
    color: 0xd49a2a,
    roughness: 0.25,
    metalness: 0.85,
  });
  const sailMat = new THREE.MeshStandardMaterial({
    color: 0xf6eedf,
    roughness: 0.85,
    metalness: 0.02,
    side: THREE.DoubleSide,
  });
  const mastMat = new THREE.MeshStandardMaterial({
    color: 0x3f2414,
    roughness: 0.8,
    metalness: 0.05,
  });
  const lanternMat = new THREE.MeshStandardMaterial({
    color: 0xffd166,
    emissive: 0xffaa22,
    emissiveIntensity: 1.6,
    roughness: 0.2,
  });

  const hullShape = new THREE.Shape();
  hullShape.moveTo(0, -1.55);
  hullShape.quadraticCurveTo(0.74, -0.7, 0.68, 0.82);
  hullShape.lineTo(0.48, 1.5);
  hullShape.lineTo(-0.48, 1.5);
  hullShape.lineTo(-0.68, 0.82);
  hullShape.quadraticCurveTo(-0.74, -0.7, 0, -1.55);

  const hullGeo = new THREE.ExtrudeGeometry(hullShape, {
    depth: 0.6,
    bevelEnabled: true,
    bevelThickness: 0.12,
    bevelSize: 0.1,
    bevelSegments: 2,
  });
  hullGeo.rotateX(Math.PI / 2);
  hullGeo.translate(0, 0.48, 0);
  const hull = new THREE.Mesh(hullGeo, hullMat);
  hull.castShadow = true;
  ship.add(hull);

  const rail = new THREE.Mesh(new THREE.BoxGeometry(1.18, 0.12, 2.3), trimMat);
  rail.position.set(0, 0.55, 0.1);
  ship.add(rail);

  const cabin = new THREE.Mesh(new THREE.BoxGeometry(0.98, 0.6, 0.88), hullMat);
  cabin.position.set(0, 0.78, 0.98);
  cabin.castShadow = true;
  ship.add(cabin);

  const bowsprit = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.07, 1.35, 8), mastMat);
  bowsprit.rotation.x = Math.PI / 2.5;
  bowsprit.position.set(0, 0.7, -1.8);
  ship.add(bowsprit);

  [
    { z: -0.1, h: 2.5, sailW: 1.55, sailH: 1.12, sailY: 1.65 },
    { z: -0.95, h: 1.85, sailW: 1.12, sailH: 0.85, sailY: 1.38 },
  ].forEach((cfg) => {
    const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.08, cfg.h, 8), mastMat);
    mast.position.set(0, 0.48 + cfg.h / 2, cfg.z);
    mast.castShadow = true;
    ship.add(mast);

    const yard = new THREE.Mesh(
      new THREE.CylinderGeometry(0.03, 0.03, cfg.sailW + 0.16, 6),
      mastMat
    );
    yard.rotation.z = Math.PI / 2;
    yard.position.set(0, cfg.sailY + cfg.sailH * 0.48, cfg.z);
    ship.add(yard);

    const sailGeo = new THREE.PlaneGeometry(cfg.sailW, cfg.sailH, 6, 4);
    const pos = sailGeo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      const bulge =
        Math.cos((x / cfg.sailW) * Math.PI) *
        Math.cos((y / cfg.sailH) * Math.PI) *
        0.26;
      pos.setZ(i, -bulge);
    }
    sailGeo.computeVertexNormals();
    const sail = new THREE.Mesh(sailGeo, sailMat);
    sail.position.set(0, cfg.sailY, cfg.z - 0.06);
    sail.castShadow = true;
    ship.add(sail);
  });

  const flag = new THREE.Mesh(
    new THREE.BoxGeometry(0.04, 0.34, 0.65),
    new THREE.MeshStandardMaterial({ color: 0x162231, roughness: 0.6 })
  );
  flag.position.set(0, 2.9, 0.22);
  ship.add(flag);

  const lantern = new THREE.Mesh(new THREE.OctahedronGeometry(0.15, 0), lanternMat);
  lantern.position.set(0, 1.15, 1.48);
  ship.add(lantern);

  const wakeMat = new THREE.MeshBasicMaterial({
    color: 0xe6fbff,
    transparent: true,
    opacity: 0.55,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const wakeGeo = new THREE.PlaneGeometry(1.9, 3.6, 4, 4);
  wakeGeo.rotateX(-Math.PI / 2);
  const wake = new THREE.Mesh(wakeGeo, wakeMat);
  wake.position.set(0, 0.06, 3.1);
  ship.add(wake);

  return ship;
}

export function createMissionBeacon(
  status: 'completed' | 'active' | 'unlocked' | 'locked'
): THREE.Group {
  const group = new THREE.Group();
  const colorMap = {
    completed: 0x2a9d8f,
    active: 0xf4c456,
    unlocked: 0x67b7dc,
    locked: 0x4b5c6e,
  };
  const emissiveMap = {
    completed: 0x155d54,
    active: 0xd48806,
    unlocked: 0x1d4e6b,
    locked: 0x000000,
  };

  const base = new THREE.Mesh(
    new THREE.CylinderGeometry(0.3, 0.4, 0.2, 8),
    new THREE.MeshStandardMaterial({ color: 0x1b2f47, roughness: 0.5, metalness: 0.5 })
  );
  base.position.y = 0.1;
  group.add(base);

  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(0.34, 0.045, 8, 20),
    new THREE.MeshStandardMaterial({ color: 0xd49a2a, roughness: 0.28, metalness: 0.85 })
  );
  ring.rotation.x = Math.PI / 2;
  ring.position.y = 0.22;
  group.add(ring);

  const crystal = new THREE.Mesh(
    new THREE.OctahedronGeometry(0.26, 0),
    new THREE.MeshStandardMaterial({
      color: colorMap[status],
      emissive: emissiveMap[status],
      emissiveIntensity: status === 'active' ? 1.4 : status === 'locked' ? 0 : 0.7,
      roughness: 0.2,
      metalness: 0.35,
    })
  );
  crystal.position.y = 0.68;
  group.add(crystal);

  return group;
}

export function createParchmentLabelSprite(
  title: string,
  subtitle?: string
): THREE.Sprite {
  const w = 512;
  const h = 148;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;

  const padX = 28;
  const padY = 16;
  const rw = w - padX * 2;
  const rh = h - padY * 2;

  ctx.fillStyle = 'rgba(8, 16, 26, 0.45)';
  ctx.beginPath();
  ctx.roundRect(padX + 4, padY + 6, rw, rh, 14);
  ctx.fill();

  const pGrad = ctx.createLinearGradient(0, padY, 0, padY + rh);
  pGrad.addColorStop(0, '#f4e3bd');
  pGrad.addColorStop(0.5, '#e6cb94');
  pGrad.addColorStop(1, '#cfa968');
  ctx.fillStyle = pGrad;
  ctx.beginPath();
  ctx.roundRect(padX, padY, rw, rh, 14);
  ctx.fill();

  ctx.fillStyle = '#b98b4a';
  ctx.beginPath();
  ctx.roundRect(padX - 10, padY + 8, 18, rh - 16, 8);
  ctx.roundRect(padX + rw - 8, padY + 8, 18, rh - 16, 8);
  ctx.fill();

  ctx.strokeStyle = '#6e451e';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.roundRect(padX + 8, padY + 8, rw - 16, rh - 16, 9);
  ctx.stroke();

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  if (subtitle) {
    ctx.font = 'bold 23px Georgia, serif';
    ctx.fillStyle = '#7c2d12';
    ctx.fillText(subtitle, w / 2, padY + 35);
    ctx.font = 'bold 30px Georgia, serif';
    ctx.fillStyle = '#241206';
    ctx.fillText(title, w / 2, padY + 78);
  } else {
    ctx.font = 'bold 33px Georgia, serif';
    ctx.fillStyle = '#241206';
    ctx.fillText(title, w / 2, h / 2 + 2);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.minFilter = THREE.LinearFilter;
  const mat = new THREE.SpriteMaterial({
    map: tex,
    transparent: true,
    depthWrite: false,
  });
  const sprite = new THREE.Sprite(mat);
  sprite.scale.set(4.5, 1.32, 1);
  sprite.renderOrder = 10;
  return sprite;
}
