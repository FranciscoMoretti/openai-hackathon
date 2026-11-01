export type Coordinates = { latitude: number; longitude: number };
export type Landmark = {
  id: string; number: number; name: string; coordinates: Coordinates;
};

// One finished attraction is the hackathon product. Expand this catalog after the tour is proven.
export const landmarks: Landmark[] = [{
  id: 'tower-bridge', number: 1, name: 'Tower Bridge',
  coordinates: { latitude: 51.5055, longitude: -0.0754 },
}];
export const PREVIEW_LOCATION: Coordinates = { latitude: 51.5049, longitude: -0.0763 };
