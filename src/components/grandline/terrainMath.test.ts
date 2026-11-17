import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ARCHIPELAGO_SITES,
  evaluateClosedCatmullRom2D,
  getWorldHeight,
  PIRATE_SAILING_WAYPOINTS,
} from './terrainMath';

test('all 5 chapter islands rise well above sea level with clear topography', () => {
  const chapterSites = ARCHIPELAGO_SITES.filter((s) => s.chapterId !== undefined);
  assert.equal(chapterSites.length, 5);
  for (const site of chapterSites) {
    const centerH = getWorldHeight(site.x, site.z);
    assert.ok(
      centerH > 0.65,
      `Expected ${site.id} center height > 0.65, got ${centerH}`
    );
  }
});

test('entire interpolated pirate ship sailing loop stays in ocean channels', () => {
  const samples = 96;
  for (let i = 0; i < samples; i++) {
    const t = i / samples;
    const [sx, sz] = evaluateClosedCatmullRom2D(PIRATE_SAILING_WAYPOINTS, t);
    const h = getWorldHeight(sx, sz);
    assert.ok(
      h < -0.2,
      `Expected curve t=${t.toFixed(2)} (${sx.toFixed(1)}, ${sz.toFixed(1)}) in ocean (< -0.2), got ${h.toFixed(2)}`
    );
  }
});
