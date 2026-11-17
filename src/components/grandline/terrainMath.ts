export interface IslandSite {
  id: string;
  chapterId?: number;
  x: number;
  z: number;
  radius: number;
  peakHeight: number;
  coveAngle: number;
  biome: 'volcanic' | 'tropical' | 'alpine' | 'lagoon' | 'golden' | 'citadel' | 'islet';
}

export const ARCHIPELAGO_SITES: IslandSite[] = [
  // Western Entrance — Reverse Mountain
  {
    id: 'reverse_mountain',
    x: -29.0,
    z: 3.5,
    radius: 6.4,
    peakHeight: 6.8,
    coveAngle: -0.25,
    biome: 'volcanic',
  },
  // Chapter 1 — Pulau Aturan (Lighthouse Cove & Village)
  {
    id: 'chapter_1',
    chapterId: 1,
    x: -18.5,
    z: 5.5,
    radius: 6.2,
    peakHeight: 4.2,
    coveAngle: 0.75,
    biome: 'tropical',
  },
  // Chapter 2 — Galangan Beku (Snow Peak & Shipyard)
  {
    id: 'chapter_2',
    chapterId: 2,
    x: -7.5,
    z: -6.5,
    radius: 6.5,
    peakHeight: 5.6,
    coveAngle: 1.1,
    biome: 'alpine',
  },
  // Chapter 3 — Pulau Langit (Lagoon Atoll & Floating Sky Island)
  {
    id: 'chapter_3',
    chapterId: 3,
    x: 2.0,
    z: 3.0,
    radius: 6.3,
    peakHeight: 3.9,
    coveAngle: 1.5,
    biome: 'lagoon',
  },
  // Chapter 4 — Kepulauan Harta (Golden Ziggurat & Bubble Reefs)
  {
    id: 'chapter_4',
    chapterId: 4,
    x: 13.0,
    z: -5.5,
    radius: 6.4,
    peakHeight: 4.4,
    coveAngle: 1.25,
    biome: 'golden',
  },
  // Chapter 5 — Benteng Raja Aurelius (Imperial Sea Citadel)
  {
    id: 'chapter_5',
    chapterId: 5,
    x: 24.5,
    z: 2.5,
    radius: 7.0,
    peakHeight: 5.1,
    coveAngle: 2.6,
    biome: 'citadel',
  },
  // Scenic Surrounding Islets & Sea Stacks (for true miniature world density)
  { id: 'islet_nw', x: -24.5, z: -10.5, radius: 4.1, peakHeight: 3.4, coveAngle: 0.5, biome: 'islet' },
  { id: 'islet_sw', x: -13.0, z: 14.2, radius: 3.6, peakHeight: 2.9, coveAngle: -0.9, biome: 'islet' },
  { id: 'islet_n', x: 1.5, z: -22.0, radius: 3.5, peakHeight: 3.3, coveAngle: 1.6, biome: 'islet' },
  { id: 'islet_s', x: 8.5, z: 16.5, radius: 3.7, peakHeight: 2.8, coveAngle: -1.4, biome: 'islet' },
  { id: 'islet_ne', x: 28.5, z: -15.8, radius: 4.0, peakHeight: 3.6, coveAngle: 2.0, biome: 'islet' },
  { id: 'islet_se', x: 34.5, z: 15.0, radius: 3.5, peakHeight: 3.1, coveAngle: -2.2, biome: 'islet' },
];

function hash2D(ix: number, iz: number): number {
  const n = Math.sin(ix * 127.1 + iz * 311.7) * 43758.5453123;
  return n - Math.floor(n);
}

export function smoothNoise2D(x: number, z: number): number {
  const ix = Math.floor(x);
  const iz = Math.floor(z);
  const fx = x - ix;
  const fz = z - iz;
  const ux = fx * fx * (3 - 2 * fx);
  const uz = fz * fz * (3 - 2 * fz);

  const a = hash2D(ix, iz);
  const b = hash2D(ix + 1, iz);
  const c = hash2D(ix, iz + 1);
  const d = hash2D(ix + 1, iz + 1);

  return a + (b - a) * ux + (c - a) * uz + (a - b - c + d) * ux * uz;
}

export function fbm2D(x: number, z: number, octaves = 4): number {
  let value = 0;
  let amp = 0.5;
  let freq = 1.0;
  for (let i = 0; i < octaves; i++) {
    value += amp * (smoothNoise2D(x * freq, z * freq) * 2 - 1);
    freq *= 2.04;
    amp *= 0.48;
  }
  return value;
}

export interface HeightSample {
  height: number;
  biome: IslandSite['biome'] | 'ocean';
  nearestChapterId: number | null;
}

export function sampleWorldTerrain(x: number, z: number): HeightSample {
  // Deep ocean floor baseline with gentle submarine dunes
  let maxLandHeight = -2.45 + fbm2D(x * 0.08, z * 0.08, 2) * 0.45;
  let dominantBiome: HeightSample['biome'] = 'ocean';
  let nearestChapterId: number | null = null;

  for (let i = 0; i < ARCHIPELAGO_SITES.length; i++) {
    const site = ARCHIPELAGO_SITES[i];
    const dx = x - site.x;
    const dz = z - site.z;
    const dist = Math.sqrt(dx * dx + dz * dz);
    const maxInfluence = site.radius * 1.95;
    if (dist > maxInfluence) continue;

    const angle = Math.atan2(dz, dx);
    // Organic coastline lobes
    const coastWarp =
      1 +
      0.16 * Math.sin(angle * 3 + i * 1.7) +
      0.11 * Math.cos(angle * 5 - i * 0.9) +
      0.18 * fbm2D(x * 0.28, z * 0.28, 3);

    const effRadius = site.radius * coastWarp;
    const norm = dist / effRadius;

    // Smooth island profile rising from underwater shoal (-2.3) -> sandy beach -> lush plateau -> rocky peak
    let h = -2.4;
    if (norm < 1.75) {
      const shelf = Math.max(0, 1 - norm / 1.75);
      h = -2.35 + Math.pow(shelf, 1.45) * 2.55;
    }

    if (norm < 1.05) {
      const landT = Math.max(0, 1 - norm / 1.05);
      // Flat plateau / terrace around middle + steeper craggy peak offset away from cove
      const hillNoise = fbm2D(x * 0.45 + i * 11.3, z * 0.45 - i * 7.1, 4);
      const peakOffsetX = -Math.cos(site.coveAngle) * site.radius * 0.28;
      const peakOffsetZ = -Math.sin(site.coveAngle) * site.radius * 0.28;
      const peakDist = Math.hypot(dx - peakOffsetX, dz - peakOffsetZ);
      const peakFactor = Math.max(0, 1 - peakDist / (site.radius * 0.65));

      const ridge = Math.pow(peakFactor, 1.65) * site.peakHeight * (0.78 + 0.35 * Math.abs(hillNoise));
      const plateau = Math.pow(landT, 0.72) * 1.15 + hillNoise * 0.28 * landT;

      // Carve sheltered crescent bay/lagoon on the coveAngle side
      let angleDiff = Math.abs(angle - site.coveAngle);
      if (angleDiff > Math.PI) angleDiff = Math.PI * 2 - angleDiff;
      const coveMask = Math.max(0, 1 - angleDiff / 0.85) * Math.max(0, 1 - Math.abs(norm - 0.68) / 0.45);
      const coveCarve = coveMask * 1.35;

      h = Math.max(h, plateau + ridge - coveCarve);
    }

    // Chapter 5 Citadel has a slightly flatter rocky bastion summit for the fortress
    if (site.biome === 'citadel' && dist < 3.1) {
      h = Math.max(h, 2.05 + fbm2D(x * 0.5, z * 0.5, 2) * 0.12);
    }
    // Chapter 1 & 4 have flat village/temple build pads near their cove center
    if ((site.biome === 'tropical' || site.biome === 'golden') && dist < 2.2) {
      h = Math.max(0.72, Math.min(h, 1.35));
    }

    if (h > maxLandHeight) {
      maxLandHeight = h;
      dominantBiome = site.biome;
      nearestChapterId = site.chapterId ?? null;
    }
  }

  return {
    height: maxLandHeight,
    biome: dominantBiome,
    nearestChapterId,
  };
}

export function getWorldHeight(x: number, z: number): number {
  return sampleWorldTerrain(x, z).height;
}

export const PIRATE_SAILING_WAYPOINTS: Array<[number, number]> = [
  [-22.5, -2.0],
  [-12.0, 0.8],
  [-8.8, 7.5],
  [-2.5, 10.5],
  [4.5, 11.2],
  [10.5, 8.2],
  [13.5, 4.8],
  [16.2, 6.2],
  [19.5, 12.5],
  [24.5, 11.2],
  [35.5, 5.5],
  [33.5, -5.0],
  [20.0, -16.2],
  [8.5, -16.2],
  [-1.0, -16.0],
  [-8.5, -16.2],
  [-16.5, -12.5],
  [-21.5, -5.5],
];

export function evaluateClosedCatmullRom2D(
  pts: Array<[number, number]>,
  t: number
): [number, number] {
  const n = pts.length;
  const scaled = (((t % 1) + 1) % 1) * n;
  const i1 = Math.floor(scaled) % n;
  const u = scaled - Math.floor(scaled);
  const i0 = (i1 - 1 + n) % n;
  const i2 = (i1 + 1) % n;
  const i3 = (i1 + 2) % n;

  const p0 = pts[i0];
  const p1 = pts[i1];
  const p2 = pts[i2];
  const p3 = pts[i3];

  const u2 = u * u;
  const u3 = u2 * u;

  const interp = (a: number, b: number, c: number, d: number) =>
    0.5 *
    (2 * b +
      (-a + c) * u +
      (2 * a - 5 * b + 4 * c - d) * u2 +
      (-a + 3 * b - 3 * c + d) * u3);

  return [interp(p0[0], p1[0], p2[0], p3[0]), interp(p0[1], p1[1], p2[1], p3[1])];
}
