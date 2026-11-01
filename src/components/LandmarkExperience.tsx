import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowUpRight, BookOpen, Check, Headphones, LoaderCircle, Pause, Play, RotateCcw, Rotate3D } from 'lucide-react';
import type { Narration } from '../hooks/useNarration';
import type { Landmark } from '../data/landmarks';
import { copy } from '../lib/copy';
import { sceneForSentence, storyScenes } from '../lib/story-scenes';
import { BigBenCanvas } from './landmark-scene/BigBenCanvas';
import './landmark-scene/experience.css';

type Props = { landmark: Landmark; narration: Narration; onClose: () => void; onNext: () => void };

export function LandmarkExperience({ landmark, narration, onClose, onNext }: Props) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [transcript, setTranscript] = useState(false);
  const [reset, setReset] = useState(0);
  const focus = sceneForSentence(narration.sentenceIndex);
  const chapter = storyScenes.find(item => item.id === focus)!;
  const playing = narration.status === 'playing' || narration.status === 'starting';
  const complete = narration.status === 'complete';
  const error = narration.error ?? (!narration.supported ? 'noSpeech' : null);
  const label = narration.status === 'starting' ? 'Starting…' : playing ? 'Pause story' : narration.status === 'paused' ? 'Continue story' : complete ? 'Listen again' : 'Listen to the story';
  useEffect(() => {
    const original = document.activeElement;
    dialog.current?.showModal();
    return () => { dialog.current?.close(); if (original instanceof HTMLElement && original.isConnected) original.focus(); };
  }, []);
  function close() { if (playing) narration.pause(); onClose(); }
  function restart() { narration.restart(); setReset(value => value + 1); }
  return <dialog className="landmark-experience" ref={dialog} aria-labelledby="experience-title" onCancel={event => { event.preventDefault(); if (transcript) setTranscript(false); else close(); }}>
    <header className="experience-header">
      <button className="back-to-map" onClick={close}><ArrowLeft size={18} /><span>Back to map</span></button>
      <span className="experience-brand"><img src="/compass.svg" alt="" />wander</span>
      <span className="experience-place">WESTMINSTER · 01</span>
    </header>
    <div className="experience-body">
      <aside className="experience-intro">
        <span className="experience-eyebrow">A LITTLE CLOSER</span>
        <h1 id="experience-title">The bell <br />behind the name.</h1>
        <p>A familiar silhouette.<br />A different way to see it.</p>
        <span className="experience-duration"><Headphones size={15} /> A one-minute story</span>
        <div className="experience-chapters" role="group" aria-label="Explore tower details">
          {storyScenes.map((scene, index) => <button key={scene.id} aria-pressed={focus === scene.id} onClick={() => { narration.cue(scene.sentence); setReset(value => value + 1); }}>
            <span className="chapter-number">0{index + 1}</span><span>{scene.label}</span><span className="chapter-active" />
          </button>)}
        </div>
        <a className="experience-source" href={landmark.source.url} target="_blank" rel="noreferrer">Story sourced from UK Parliament<ArrowUpRight size={14} /></a>
      </aside>
      <div className="experience-stage">
        <BigBenCanvas focus={focus} playing={playing} paused={narration.status === 'paused'} reset={reset} />
        <div className="experience-model-note"><span>ELIZABETH TOWER</span><span>Illustrative 3D model</span></div>
        <button className="experience-reframe" onClick={() => setReset(value => value + 1)} aria-label="Reset 3D view" title="Reset 3D view"><Rotate3D size={19} /></button>
        <span className="experience-drag">{playing ? 'The view follows the story' : narration.status === 'paused' ? 'Paused · drag to look around' : 'Drag to look around'}</span>
      </div>
    </div>
    <footer className="experience-player">
      <div className="experience-caption" aria-live="polite"><span className="experience-eyebrow">{complete ? 'A LITTLE MORE DISCOVERED' : chapter.label.toUpperCase()}</span><h2>{chapter.title}</h2><p>{chapter.description}</p></div>
      <div className="experience-playback">
        <div className="experience-transport">
          <button className="experience-play" onClick={playing ? narration.pause : narration.play} disabled={narration.status === 'starting' || !narration.supported} aria-label={label}>
            {narration.status === 'starting' ? <LoaderCircle className="spin" size={20} /> : playing ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" />}
          </button>
          <div className="experience-track"><div><span>{label === 'Pause story' ? 'Listening to the story' : label}</span><span>{complete ? <Check size={14} /> : `${Math.round(narration.progress * 100)}%`}</span></div><progress max={1} value={narration.progress} aria-label="Story progress" /><span className="experience-voice">Device voice · English</span></div>
          <button className="experience-restart" onClick={restart} aria-label="Restart story" title="Restart story"><RotateCcw size={19} /></button>
        </div>
        {error && <p className="experience-error" role="alert">{copy[error]}</p>}
        <div className="experience-player-links"><button onClick={() => setTranscript(value => !value)} aria-expanded={transcript}><BookOpen size={15} />{transcript ? 'Close transcript' : 'Read the story'}</button>{complete && <button onClick={() => { close(); onNext(); }}>Next landmark<ArrowUpRight size={15} /></button>}</div>
      </div>
    </footer>
    {transcript && <section className="experience-transcript" aria-label="Story transcript"><div><h2>The story</h2><button onClick={() => setTranscript(false)}>Close transcript</button></div>{landmark.story.paragraphs.map(paragraph => <p key={paragraph}>{paragraph}</p>)}<a href={landmark.source.url} target="_blank" rel="noreferrer">Source: {landmark.source.name}</a></section>}
  </dialog>;
}
