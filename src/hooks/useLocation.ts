import { useEffect, useRef, useState } from 'react';
import { PREVIEW_LOCATION, type Coordinates } from '../data/landmarks';

type LocationState = {
  mode: 'preview' | 'locating' | 'live'; position: Coordinates;
  accuracy: number; timestamp: number; error: 'denied' | 'failed' | 'unsupported' | null;
};
const initial: LocationState = { mode: 'preview', position: PREVIEW_LOCATION, accuracy: 0, timestamp: 0, error: null };

export function useLocation() {
  const [location, setLocation] = useState<LocationState>(initial);
  const watch = useRef<number | null>(null);
  const generation = useRef(0);
  function stopWatch() {
    generation.current++;
    if (watch.current !== null) navigator.geolocation?.clearWatch(watch.current);
    watch.current = null;
  }
  function request() {
    stopWatch();
    if (!navigator.geolocation || !window.isSecureContext) {
      setLocation({ ...initial, error: 'unsupported' });
      return;
    }
    const active = generation.current;
    setLocation({ ...initial, mode: 'locating' });
    watch.current = navigator.geolocation.watchPosition(position => {
      if (generation.current !== active) return;
      setLocation({ mode: 'live', position: { latitude: position.coords.latitude, longitude: position.coords.longitude },
        accuracy: position.coords.accuracy, timestamp: position.timestamp, error: null });
    }, error => {
      if (generation.current !== active) return;
      stopWatch();
      setLocation({ ...initial, error: error.code === 1 ? 'denied' : 'failed' });
    }, { enableHighAccuracy: true, timeout: 15_000, maximumAge: 10_000 });
  }
  function preview() { stopWatch(); setLocation(initial); }
  useEffect(() => () => stopWatch(), []);
  return { ...location, request, preview };
}
