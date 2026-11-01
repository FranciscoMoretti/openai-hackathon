import { lazy, Suspense, useEffect, useState } from 'react';
import { ArrowLeft, ArrowRight, Box, Headphones, Info, LocateFixed, MapPin } from 'lucide-react';
import { landmarks } from './data/landmarks';
import { canSuggestNearby, distanceMetres, formatDistance } from './lib/geo';
import { useLocation } from './hooks/useLocation';
import { Dialog } from './components/Dialog';
import './app-navigation.css';

const Map = lazy(() => import('./components/Map').then(module => ({ default: module.Map })));
const attraction = landmarks[0];
const isMapRoute = () => window.location.hash === '#map';

export default function App() {
  const [showMap, setShowMap] = useState(isMapRoute);
  useEffect(() => {
    const navigate = () => setShowMap(isMapRoute());
    window.addEventListener('hashchange', navigate);
    return () => window.removeEventListener('hashchange', navigate);
  }, []);
  // A separate document isolates the tour's rendering styles, within the same app/build/origin.
  // Unmounting the frame stops narration and releases its WebGL context when returning to the map.
  return showMap ? <AttractionMap /> : <main className="tour-route">
    <iframe src="/src/tour/index.html" title="Tower Bridge interactive audio tour" allow="autoplay; fullscreen; microphone" />
  </main>;
}

function AttractionMap() {
  const location = useLocation();
  const [showInfo, setShowInfo] = useState(false);
  const [now, setNow] = useState(Date.now);
  useEffect(() => { const timer = setInterval(() => setNow(Date.now()), 5000); return () => clearInterval(timer); }, []);
  const live = location.mode === 'live';
  const distance = distanceMetres(location.position, attraction.coordinates);
  const nearby = live && canSuggestNearby(distance, location.accuracy, location.timestamp, now);
  const stale = live && now - location.timestamp > 60_000;
  const notice = location.error === 'denied' ? 'Location wasn’t shared. You can still open the tour.'
    : location.error ? 'We couldn’t find your location. Explore the map or open the tour.'
    : stale ? 'Your location hasn’t updated recently. Tap location to try again.'
    : live && location.accuracy > 100 ? 'Location is approximate. The tour is available while GPS settles.' : null;
  return <div className="app-shell discovery-shell">
    <header className="app-header">
      <a className="brand" href="#tour" aria-label="Wander tour"><img src="/compass.svg" alt="" /><span>wander</span></a>
      <span className="discovery-title">Explore nearby</span>
      <a className="back-to-tour" href="#tour"><ArrowLeft size={16} /><span>Back to tour</span></a>
    </header>
    <main className="discovery-map">
      <Suspense fallback={<div className="map-message" role="status">Loading the London map…</div>}>
        <Map selected={attraction.id} position={location.position} live={live} onSelect={() => { window.location.hash = '#tour'; }} />
      </Suspense>
      <div className="discovery-toolbar">
        <div className="location-status"><MapPin size={15} /><span>{live ? 'Your location' : 'Tower Bridge preview'}</span>{live && <span className="live-dot" />}</div>
        <button className="locate-button" onClick={location.request} disabled={location.mode === 'locating'}><LocateFixed size={17} /><span>{location.mode === 'locating' ? 'Finding you…' : 'Use my location'}</span></button>
        {live && <button className="discovery-preview" onClick={location.preview}>Preview instead</button>}
      </div>
      {notice && <p className="location-notice" role="status">{notice}</p>}
      <section className="attraction-preview" aria-labelledby="attraction-title">
        <img className="attraction-image" src="/images/tower-bridge-preview.png" alt="3D model of Tower Bridge" />
        <div className="attraction-summary">
          <p className="attraction-location"><MapPin size={13}/>{nearby ? 'You’re near Tower Bridge' : live ? `${formatDistance(distance)} away · straight-line distance` : 'Explore the demo location'}</p>
          <h1 id="attraction-title">Tower Bridge</h1>
          <p className="attraction-description">See the bridge take shape, lift for a passing ship, and change through time.</p>
          <div className="attraction-meta"><span><Headphones size={14}/>About 2 minutes</span><span><Box size={14}/>Interactive 3D tour</span></div>
          <a className="primary open-tour" href="#tour">Open the tour<ArrowRight size={17}/></a>
        </div>
      </section>
      <button className="discovery-info" aria-label="About this demo and privacy" onClick={() => setShowInfo(true)}><Info size={18}/></button>
    </main>
    {showInfo && <Dialog title="About this demo" closeLabel="Close" onClose={() => setShowInfo(false)}><div className="credits-content">
      <p>One attraction, one guided story. Tower Bridge is the hackathon demo; the map helps you find it, and the tour brings its history into view.</p>
      <p>The preview point is near Tower Bridge. It is not your live location. Location is requested only when you choose “Use my location” and stays in memory on this device.</p>
      <p>The 3D scene is illustrative. Historical sources and narration details are available inside the tour’s options.</p>
      <p>Map: <a href="https://openfreemap.org/" target="_blank" rel="noreferrer">OpenFreeMap</a>, <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap contributors</a>, and MapLibre. Map requests reveal the viewed area to the tile provider. No analytics are used.</p>
    </div></Dialog>}
  </div>;
}
