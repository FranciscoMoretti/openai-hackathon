import { useEffect, useRef, useState } from 'react';
import * as maplibregl from 'maplibre-gl';
import type { Map as MapInstance } from 'maplibre-gl';
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url';
import { LocateFixed, Minus, Plus, Maximize, MapPinned } from 'lucide-react';
import { landmarks, type Coordinates } from '../data/landmarks';
import { copy } from '../lib/copy';
import 'maplibre-gl/dist/maplibre-gl.css';

maplibregl.setWorkerUrl(workerUrl);

type Props = { selected: string; position: Coordinates; live: boolean; onSelect: (id: string) => void };

export function Map({ selected, position, live, onSelect }: Props) {
  const container = useRef<HTMLDivElement>(null);
  const map = useRef<MapInstance | null>(null);
  const locationMarker = useRef<maplibregl.Marker | null>(null);
  const markers = useRef(new globalThis.Map<string, HTMLButtonElement>());
  const callback = useRef(onSelect);
  const selectedRef = useRef(selected);
  selectedRef.current = selected;
  callback.current = onSelect;
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [attempt, setAttempt] = useState(0);
  const [perspective, setPerspective] = useState(false);
  const c = copy;
  const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  useEffect(() => {
    if (!container.current) return;
    let instance: MapInstance;
    let disposed = false;
    setState('loading');
    setPerspective(false);
    try {
      instance = new maplibregl.Map({
        container: container.current, style: '/map-style.json',
        center: [-0.1260, 51.5029], zoom: window.innerWidth < 700 ? 14.7 : 15.45,
        pitch: 0, bearing: 0, attributionControl: false, maxPitch: 50,
        dragRotate: false, touchPitch: false,
      });
    } catch { setState('error'); return; }
    map.current = instance;
    instance.addControl(new maplibregl.AttributionControl({ compact: true }), 'bottom-left');
    const timeout = setTimeout(() => { if (!disposed && !instance.isStyleLoaded()) setState('error'); }, 15_000);
    instance.on('load', () => {
      if (disposed) return;
      setState('ready'); clearTimeout(timeout);
      if (window.innerWidth < 700) {
        const place = landmarks.find(item => item.id === selectedRef.current)!;
        instance.jumpTo({ center: [place.coordinates.longitude, place.coordinates.latitude], zoom: 15.1 });
        instance.easeTo({ offset: [0, -70], duration: 0 });
      } else overview();
    });
    instance.on('error', () => { if (!disposed && !instance.isStyleLoaded()) setState('error'); });
    instance.touchZoomRotate.disableRotation();
    const updateSize = () => container.current?.style.setProperty('--landmark-size', `${Math.min(142, Math.max(window.innerWidth < 700 ? 62 : 105, 110 * 2 ** (instance.getZoom() - 15.3)))}px`);
    instance.on('zoom', updateSize);
    updateSize();

    for (const landmark of landmarks) {
      const button = document.createElement('button');
      button.className = 'landmark-pin'; button.type = 'button';
      button.setAttribute('aria-label', landmark.name);
      const picture = document.createElement('span'); picture.className = `landmark-art art-${landmark.id}`; picture.setAttribute('aria-hidden', 'true');
      const number = document.createElement('span'); number.className = 'pin-number'; number.textContent = String(landmark.number);
      const label = document.createElement('span'); label.className = 'pin-label'; label.textContent = landmark.name;
      button.append(picture, number, label);
      button.onclick = () => callback.current(landmark.id);
      new maplibregl.Marker({ element: button, anchor: 'bottom' })
        .setLngLat([landmark.coordinates.longitude, landmark.coordinates.latitude]).addTo(instance);
      markers.current.set(landmark.id, button);
    }
    const dot = document.createElement('div'); dot.className = 'location-dot';
    locationMarker.current = new maplibregl.Marker({ element: dot }).setLngLat([position.longitude, position.latitude]).addTo(instance);
    const resize = new ResizeObserver(() => {
      instance.resize();
      updateSize();
      if (instance.loaded()) {
        const place = landmarks.find(item => item.id === selectedRef.current)!;
        instance.easeTo({ center: [place.coordinates.longitude, place.coordinates.latitude], offset: [0, -70], duration: 0 });
      }
    });
    resize.observe(container.current);
    return () => { disposed = true; clearTimeout(timeout); resize.disconnect(); instance.remove(); map.current = null; markers.current.clear(); };
  }, [attempt]);

  useEffect(() => {
    for (const [id, element] of markers.current) {
      element.classList.toggle('is-selected', id === selected);
      element.setAttribute('aria-pressed', String(id === selected));
    }
  }, [selected, attempt, state]);

  useEffect(() => {
    const landmark = landmarks.find(item => item.id === selected)!;
    map.current?.easeTo({ center: [landmark.coordinates.longitude, landmark.coordinates.latitude],
      offset: [0, window.innerWidth < 700 ? -55 : -40], duration: reducedMotion() ? 0 : 700 });
  }, [selected]);

  useEffect(() => {
    locationMarker.current?.setLngLat([position.longitude, position.latitude]);
    const dot = locationMarker.current?.getElement();
    if (dot) { dot.classList.toggle('is-preview', !live); dot.setAttribute('aria-label', live ? c.live : c.preview); dot.title = live ? c.live : c.preview; }
  }, [position, live, c.live, c.preview, attempt, state]);

  function recenter() {
    map.current?.easeTo({ center: [position.longitude, position.latitude], zoom: 16, offset: [0, -70], duration: reducedMotion() ? 0 : 700 });
  }
  useEffect(() => { if (live) recenter(); }, [live]);
  function overview() {
    const bounds = new maplibregl.LngLatBounds();
    landmarks.forEach(landmark => bounds.extend([landmark.coordinates.longitude, landmark.coordinates.latitude]));
    const height = container.current?.clientHeight ?? 600;
    const mobile = window.innerWidth < 700;
    map.current?.fitBounds(bounds, { padding: { top: mobile ? 95 : 130, right: mobile ? 90 : 100, bottom: Math.min(height * 0.5, mobile ? 310 : 360), left: mobile ? 60 : 100 }, maxZoom: 15.5, duration: reducedMotion() ? 0 : 700 });
  }
  return <>
    <div className="map-canvas" ref={container} aria-label="Westminster map" />
    {state !== 'ready' && <div className={`map-message ${state}`} role="status">
      <MapPinned size={24} /><span>{state === 'loading' ? c.mapLoading : c.mapError}</span>
      {state === 'error' && <button onClick={() => setAttempt(value => value + 1)}>{c.retry}</button>}
    </div>}
    <div className="map-controls">
      <button title={c.overview} aria-label={c.overview} onClick={overview}><Maximize size={19} /></button>
      <button title={live ? c.live : c.preview} aria-label={live ? c.live : c.preview} onClick={recenter}><LocateFixed size={21} /></button>
      <div className="zoom-controls">
        <button aria-label="Zoom in" onClick={() => map.current?.zoomIn()}><Plus size={21} /></button>
        <button aria-label="Zoom out" onClick={() => map.current?.zoomOut()}><Minus size={21} /></button>
      </div>
      <button className={perspective ? 'active' : ''} aria-pressed={perspective} aria-label={perspective ? 'Return to top-down map' : 'Optional perspective view'} onClick={() => { map.current?.easeTo({ pitch: perspective ? 0 : 45, duration: reducedMotion() ? 0 : 500 }); setPerspective(value => !value); }}>{perspective ? '3D' : '2D'}</button>
    </div>
  </>;
}
