import { useState } from 'react';
import { ArrowRight, BookOpen, Check, ExternalLink, Headphones, LoaderCircle, Pause, Play, RotateCcw } from 'lucide-react';
import type { Landmark } from '../data/landmarks';
import { copy } from '../lib/copy';
import { useNarration } from '../hooks/useNarration';
import { Dialog } from './Dialog';

type Props = { landmark: Landmark; onComplete: () => void; onNext: () => void };

export function StoryCard({ landmark, onComplete, onNext }: Props) {
  const c = copy;
  const story = landmark.story;
  const narration = useNarration(landmark.id, story.paragraphs, onComplete);
  const [showTranscript, setShowTranscript] = useState(false);
  const active = narration.status === 'playing';
  const complete = narration.status === 'complete';
  const label = active ? c.pause : narration.status === 'paused' ? c.resume : complete ? c.replay : c.listen;
  const error = narration.error ?? (!narration.supported ? 'noSpeech' : null);

  return <>
    <section className="story-card" aria-label={landmark.name}>
      <img className="story-photo" src={`/images/${landmark.id}.jpg`} alt={landmark.name} />
      <div className="story-content">
        <div className="story-eyebrow"><span>{landmark.name}</span><span className="story-time"><Headphones size={13} />~1 min</span></div>
        <h2>{story.title}</h2>
        <p className="story-intro">{story.intro}</p>
        <div className="story-actions">
          <button className="primary listen-button" disabled={narration.status === 'starting' || !narration.supported} onClick={active ? narration.pause : narration.play}>
            <span className="play-icon">{narration.status === 'starting' ? <LoaderCircle className="spin" size={16} /> : active ? <Pause size={15} fill="currentColor" /> : <Play size={15} fill="currentColor" />}</span>{label}
          </button>
          <button className="text-button" onClick={() => setShowTranscript(true)}><BookOpen size={17} />{c.read}</button>
        </div>
        {(narration.status !== 'idle' || error) && <div className="audio-state">
          {error ? <p role="alert" className="audio-error">{c[error]}</p> : <>
            <div className="audio-progress"><progress max={1} value={narration.progress} aria-label="Story progress" /><button className="icon-button" aria-label={c.restart} onClick={narration.restart}><RotateCcw size={15} /></button></div>
            <div className="audio-caption" aria-live="polite">{complete ? <><Check size={14} />{c.complete}</> : c.narration}</div>
          </>}
        </div>}
        {complete && <button className="next-story" onClick={onNext}>{c.next}<ArrowRight size={17} /></button>}
      </div>
    </section>
    {showTranscript && <Dialog title={c.transcript} closeLabel={c.close} onClose={() => setShowTranscript(false)}>
      <div className="transcript"><span className="story-eyebrow">{landmark.name}</span><h3>{story.title}</h3>{story.paragraphs.map(paragraph => <p key={paragraph}>{paragraph}</p>)}
        <a className="source-link" href={landmark.source.url} target="_blank" rel="noreferrer">{c.source}: {landmark.source.name}<ExternalLink size={15} /></a>
        <p className="source-note">Original script based on this source. Narrated with your device’s voice.</p>
      </div>
    </Dialog>}
  </>;
}
