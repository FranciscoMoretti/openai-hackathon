import { lazy, Suspense, useEffect, useState } from 'react';
import { ArrowRight, Check, Info, LocateFixed, MapPin } from 'lucide-react';
import { landmarks } from './data/landmarks';
import { copy } from './lib/copy';
import { canSuggestNearby, distanceMetres, formatDistance, nearestLandmark } from './lib/geo';
import { useLocation } from './hooks/useLocation';
import { LandmarkList } from './components/LandmarkList';
import { StoryCard } from './components/StoryCard';
import { Dialog } from './components/Dialog';
import credits from '../public/image-credits.json';

const Map = lazy(() => import('./components/Map').then(module => ({ default: module.Map })));

function readHeard(): string[] {
  try {
    const value: unknown = JSON.parse(localStorage.getItem('wander:heard:v1') ?? '[]');
    if (!Array.isArray(value)) return [];
    // Preserve previously completed English stories from the bilingual prototype.
    return landmarks.filter(place => value.includes(place.id) || value.includes(`${place.id}:en`)).map(place => place.id);
  }
  catch { return []; }
}

export default function App() {
  const [selected, setSelected] = useState('big-ben');
  const [heard, setHeard] = useState<string[]>(readHeard);
  const [showCredits, setShowCredits] = useState(false);
  const [now, setNow] = useState(Date.now);
  const location = useLocation();
  const c = copy;
  const landmark = landmarks.find(item => item.id === selected)!;
  const nearest = nearestLandmark(location.position, landmarks);
  const isLive = location.mode === 'live';
  const nearby = isLive && canSuggestNearby(nearest.distance, location.accuracy, location.timestamp, now);
  const stale = isLive && now - location.timestamp > 60_000;
  const inaccurate = isLive && location.accuracy > 100;
  const selectedDistance = formatDistance(distanceMetres(location.position, landmark.coordinates));

  useEffect(() => { const timer = setInterval(() => setNow(Date.now()), 5000); return () => clearInterval(timer); }, []);
  function complete() {
    setHeard(previous => {
      const updated = [...new Set([...previous, selected])];
      try { localStorage.setItem('wander:heard:v1', JSON.stringify(updated)); } catch { /* Listening still works without storage. */ }
      return updated;
    });
  }
  const statusMessage = location.error ? c[location.error] : stale ? c.stale : inaccurate ? c.inaccurate : isLive && nearest.distance > 3000 ? c.outside : null;

  return <div className="app-shell">
    <header className="app-header">
      <a className="brand" href="/" aria-label="Wander home"><img src="/compass.svg" alt="" /><span>wander</span></a>
      <p>{c.tagline}</p>
      <button className="mobile-credits icon-button" aria-label={c.credits} onClick={() => setShowCredits(true)}><Info size={18} /></button>
    </header>
    <div className="workspace">
      <LandmarkList selected={selected} heard={heard} onSelect={setSelected} onLocate={location.request} locating={location.mode === 'locating'} onCredits={() => setShowCredits(true)} />
      <main className="map-region">
        <Suspense fallback={<div className="map-message" role="status">{c.mapLoading}</div>}><Map selected={selected} position={location.position} live={isLive} onSelect={setSelected} /></Suspense>
        <div className="map-top">
          <div className="location-status" title={isLive ? `${c.accuracy}: ±${Math.round(location.accuracy)} m` : c.previewNote}><MapPin size={15} /><span>{isLive ? c.live : c.preview}</span>{isLive && <span className="live-dot" />}</div>
          <button className="mobile-locate icon-button" aria-label={c.location} disabled={location.mode === 'locating'} onClick={location.request}><LocateFixed size={19} /></button>
          {isLive && <button className="preview-link" onClick={location.preview}>{c.backPreview}</button>}
        </div>
        {statusMessage && <div className="location-notice" role="status">{statusMessage}</div>}
        <div className="story-dock">
          {nearby && nearest.landmark.id !== selected && <button className="nearby-suggestion" onClick={() => setSelected(nearest.landmark.id)}><MapPin size={17} /><span>{c.near}: <strong>{nearest.landmark.name}</strong></span><ArrowRight size={18} /></button>}
          <div className="story-context"><span>{isLive ? <>{nearby && nearest.landmark.id === selected ? <><Check size={13} />{c.near}</> : <><MapPin size={13} />{c.explore}</>}</> : <><MapPin size={13} />{c.sample}</>}</span><span>{selectedDistance} {c.straight}</span></div>
          <StoryCard key={landmark.id} landmark={landmark} onComplete={complete} onNext={() => setSelected(landmarks[(landmarks.findIndex(item => item.id === selected) + 1) % landmarks.length].id)} />
        </div>
      </main>
    </div>
    {showCredits && <Dialog title={c.credits} closeLabel={c.close} onClose={() => setShowCredits(false)}>
      <div className="credits-content"><p>Built with Codex for the DevDay Exchange Community Hackathon, London, 1 November 2026.</p><p>Map: <a href="https://openfreemap.org/" target="_blank" rel="noreferrer">OpenFreeMap</a>, <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap contributors</a>, MapLibre GL JS. Architectural illustrations generated with OpenAI Image Gen; illustrative, not exact architectural models. Narration uses your device’s speech synthesis.</p>
        <h3>Photography</h3>{credits.map(item => <p key={item.path}><a href={item.source} target="_blank" rel="noreferrer">{item.landmark}</a> — {item.author}, <a href={item.licenseUrl} target="_blank" rel="noreferrer">{item.license}</a>. {item.changes}</p>)}
        <h3>Privacy</h3><p>Location is requested only when you tap the location button and stays in memory on this device. Only your listened-story list is saved locally. Map requests go to OpenFreeMap and reveal the map area being viewed; we run no analytics.</p>
      </div>
    </Dialog>}
  </div>;
}
