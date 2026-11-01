import { describe, expect, it } from 'vitest';
import { canSuggestNearby, distanceMetres, nearestLandmark } from './geo';
import { landmarks, PREVIEW_LOCATION } from '../data/landmarks';

describe('location-based suggestions', () => {
  it('identifies Tower Bridge from the demo preview', () => {
    const nearest = nearestLandmark(PREVIEW_LOCATION, landmarks);
    expect(nearest.landmark.id).toBe('tower-bridge');
    expect(nearest.distance).toBeGreaterThan(50);
    expect(nearest.distance).toBeLessThan(100);
  });
  it('does not suggest an arrival with stale, inaccurate, distant or future-dated positions', () => {
    expect(canSuggestNearby(80, 15, 100_000, 100_001)).toBe(true);
    expect(canSuggestNearby(80, 101, 100_000, 100_001)).toBe(false);
    expect(canSuggestNearby(151, 15, 100_000, 100_001)).toBe(false);
    expect(canSuggestNearby(80, 15, 100_000, 160_001)).toBe(false);
    expect(canSuggestNearby(80, 15, 100_002, 100_001)).toBe(false);
  });
  it('handles the same point and a visitor outside London', () => {
    expect(distanceMetres(PREVIEW_LOCATION, PREVIEW_LOCATION)).toBe(0);
    const rome = nearestLandmark({ latitude: 41.9, longitude: 12.5 }, landmarks);
    expect(rome.distance).toBeGreaterThan(1_000_000);
    expect(canSuggestNearby(rome.distance, 10, Date.now())).toBe(false);
  });
});
