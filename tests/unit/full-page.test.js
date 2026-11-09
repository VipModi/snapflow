import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateScrollPositions,
  calculateCanvasDimensions,
  MAX_CANVAS_HEIGHT
} from '../../src/capture/full-page.js';

describe('Full-Page Scroll & Dimension Calculations', () => {
  it('returns single position [0] when page fits entirely in viewport', () => {
    assert.deepEqual(calculateScrollPositions(600, 800), [0]);
    assert.deepEqual(calculateScrollPositions(800, 800), [0]);
  });

  it('calculates scroll positions for exact multiple page height', () => {
    const positions = calculateScrollPositions(1600, 800);
    assert.deepEqual(positions, [0, 800]);
  });

  it('calculates scroll positions with final overlap alignment for non-exact height', () => {
    // 2000 total height with 800 viewport:
    // Slice 0: 0..800
    // Slice 1: 800..1600
    // Slice 2 (bottom aligned): 1200..2000
    const positions = calculateScrollPositions(2000, 800);
    assert.deepEqual(positions, [0, 800, 1200]);
  });

  it('calculates scroll positions for very long pages', () => {
    const positions = calculateScrollPositions(4500, 1000);
    assert.deepEqual(positions, [0, 1000, 2000, 3000, 3500]);
  });

  it('calculates canvas dimensions scaled by devicePixelRatio', () => {
    const dim1 = calculateCanvasDimensions(1200, 3000, 1);
    assert.equal(dim1.width, 1200);
    assert.equal(dim1.height, 3000);
    assert.equal(dim1.scaleFactor, 1);

    const dim2 = calculateCanvasDimensions(1200, 3000, 2);
    assert.equal(dim2.width, 2400);
    assert.equal(dim2.height, 6000);
    assert.equal(dim2.scaleFactor, 1);
  });

  it('caps canvas height to MAX_CANVAS_HEIGHT if page exceeds browser safety limits', () => {
    const dim = calculateCanvasDimensions(1000, 40000, 1);
    assert.equal(dim.height, MAX_CANVAS_HEIGHT);
    assert.ok(dim.scaleFactor < 1, 'Scale factor must scale down to fit max canvas');
  });
});
