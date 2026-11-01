import { Check, ChevronRight, Headphones, LocateFixed } from 'lucide-react';
import { landmarks } from '../data/landmarks';
import { copy } from '../lib/copy';

type Props = { selected: string; heard: string[]; onSelect: (id: string) => void; onLocate: () => void; locating: boolean; onCredits: () => void };

export function LandmarkList({ selected, heard, onSelect, onLocate, locating, onCredits }: Props) {
  const c = copy;
  return <aside className="sidebar">
    <div className="sidebar-intro"><h1>{c.heading}</h1><p>{c.subtitle}</p></div>
    <div className="location-section"><h2>{c.explore}</h2><button className="primary location-button" disabled={locating} onClick={onLocate}><LocateFixed size={18} />{locating ? c.locating : c.location}</button><p>{c.locationPrivate}</p></div>
    <nav className="landmark-list" aria-label={c.choose}>
      {landmarks.map(landmark => <button key={landmark.id} className={`landmark-row ${selected === landmark.id ? 'selected' : ''}`} aria-current={selected === landmark.id ? 'true' : undefined} onClick={() => onSelect(landmark.id)}>
        <img src={`/images/${landmark.id}.jpg`} alt="" />
        <span className="landmark-number">{landmark.number}</span>
        <span className="landmark-info"><span className="landmark-name">{landmark.name}</span><span className="landmark-meta">{heard.includes(landmark.id) ? <><Check size={14} />{c.heard}</> : <><Headphones size={14} />{c.story}</>}</span></span>
        <ChevronRight className="row-chevron" size={18} />
      </button>)}
    </nav>
    <footer className="sidebar-footer"><img src="/compass.svg" alt="" /><p>{c.footer}</p><button onClick={onCredits}>{c.credits}</button></footer>
  </aside>;
}
