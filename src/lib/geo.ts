import type { Coordinates, Landmark } from '../data/landmarks';

export function distanceMetres(a: Coordinates, b: Coordinates): number {
  const rad = (x: number) => x * Math.PI / 180;
  const dLat = rad(b.latitude - a.latitude);
  const dLon = rad(b.longitude - a.longitude);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.latitude)) * Math.cos(rad(b.latitude)) * Math.sin(dLon / 2) ** 2;
  return 6_371_000 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(Math.max(0, 1 - h)));
}

export function nearestLandmark(position: Coordinates, places: Landmark[]) {
  return places.map(landmark => ({ landmark, distance: distanceMetres(position, landmark.coordinates) }))
    .sort((a, b) => a.distance - b.distance)[0];
}

export function canSuggestNearby(distance: number, accuracy: number, timestamp: number, now = Date.now()) {
  return distance <= 150 && accuracy <= 100 && now - timestamp <= 60_000 && now >= timestamp;
}

export function formatDistance(metres: number) {
  return metres < 1000 ? `${Math.max(10, Math.round(metres / 10) * 10)} m` : `${(metres / 1000).toFixed(1)} km`;
}
