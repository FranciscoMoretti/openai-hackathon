import { useEffect, useRef, useState } from 'react';

type Status = 'idle' | 'starting' | 'playing' | 'paused' | 'complete';
type AudioError = 'noSpeech' | 'noVoice' | 'speechFailed' | null;

export function useNarration(storyKey: string, paragraphs: string[], onComplete: () => void) {
  const [status, setStatus] = useState<Status>('idle');
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<AudioError>(null);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const run = useRef(0);
  const current = useRef<SpeechSynthesisUtterance | null>(null);
  const startTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const completed = useRef(onComplete);
  completed.current = onComplete;
  const supported = typeof window !== 'undefined' && 'speechSynthesis' in window;

  function stop() {
    run.current++;
    if (startTimeout.current) clearTimeout(startTimeout.current);
    if (supported) window.speechSynthesis.cancel();
    current.current = null;
  }

  useEffect(() => {
    if (!supported) return;
    const update = () => setVoices(window.speechSynthesis.getVoices());
    update();
    window.speechSynthesis.addEventListener('voiceschanged', update);
    return () => window.speechSynthesis.removeEventListener('voiceschanged', update);
  }, [supported]);

  useEffect(() => {
    stop(); setStatus('idle'); setProgress(0); setError(null);
    return stop;
  }, [storyKey]);

  function play() {
    if (!supported) { setError('noSpeech'); return; }
    if (status === 'paused') { window.speechSynthesis.resume(); setStatus('playing'); return; }
    stop();
    const available = window.speechSynthesis.getVoices();
    const preferred = 'en-GB';
    const matching = available.filter(voice => voice.lang.toLowerCase().startsWith('en'));
    const voice = matching.find(voice => voice.lang === preferred) ?? matching.find(voice => voice.localService) ?? matching[0];
    if (available.length && !voice) { setError('noVoice'); setStatus('idle'); return; }
    const sentences = paragraphs.flatMap(paragraph => paragraph.match(/[^.!?]+[.!?]+(?:\s|$)|[^.!?]+$/g) ?? [paragraph]).map(x => x.trim());
    const total = sentences.reduce((sum, sentence) => sum + sentence.length, 0);
    const token = run.current;
    setError(null); setProgress(0); setStatus('starting');
    let offset = 0;

    function speak(index: number) {
      if (token !== run.current) return;
      if (index === sentences.length) {
        setStatus('complete'); setProgress(1); current.current = null; completed.current(); return;
      }
      const utterance = new SpeechSynthesisUtterance(sentences[index]);
      current.current = utterance;
      utterance.lang = voice?.lang ?? preferred;
      if (voice) utterance.voice = voice;
      utterance.rate = 0.92;
      startTimeout.current = setTimeout(() => {
        if (token === run.current) { stop(); setStatus('idle'); setError('speechFailed'); }
      }, 10_000);
      utterance.onstart = () => {
        if (token !== run.current) return;
        if (startTimeout.current) clearTimeout(startTimeout.current);
        setStatus('playing');
      };
      utterance.onboundary = event => {
        if (token === run.current) setProgress(Math.min(1, (offset + event.charIndex) / total));
      };
      utterance.onend = () => {
        if (token !== run.current) return;
        if (startTimeout.current) clearTimeout(startTimeout.current);
        offset += sentences[index].length;
        setProgress(offset / total);
        speak(index + 1);
      };
      utterance.onerror = event => {
        if (token !== run.current || event.error === 'canceled' || event.error === 'interrupted') return;
        if (startTimeout.current) clearTimeout(startTimeout.current);
        setStatus('idle'); setError(event.error === 'language-unavailable' || event.error === 'voice-unavailable' ? 'noVoice' : 'speechFailed');
      };
      window.speechSynthesis.speak(utterance);
    }
    speak(0);
  }
  function pause() { if (supported) window.speechSynthesis.pause(); setStatus('paused'); }
  function restart() { stop(); setStatus('idle'); setProgress(0); setError(null); }
  return { status, progress, error, play, pause, restart, supported, voiceAvailable: voices.some(voice => voice.lang.startsWith('en')) };
}
