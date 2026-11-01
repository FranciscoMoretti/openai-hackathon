import type { GuideStatus } from './guide-client';
import type { mountOrbView } from './voice-orb-view';
import './voice-orb.css';

/** Load the ElevenLabs UI renderer only when the visitor opens voice mode. */
export function mountVoiceOrb(container: HTMLElement) {
  let status: GuideStatus = 'idle', microphoneOn = false;
  let view: ReturnType<typeof mountOrbView> | undefined;
  let loading = false, disposed = false;
  function refresh() {
    if (disposed) return;
    container.dataset.orbState = status === 'listening' && !microphoneOn ? 'muted' : status;
    if (status === 'idle' || status === 'error') { view?.dispose(); view = undefined; return; }
    if (view) { view.update(status, microphoneOn); return; }
    if (loading) return;
    loading = true;
    void import('./voice-orb-view').then(({ mountOrbView }) => {
      if (disposed || status === 'idle' || status === 'error') return;
      view = mountOrbView(container);
      view.update(status, microphoneOn);
    }).catch(() => {
      // Keep the CSS fallback and the readable state if WebGL cannot load.
    }).finally(() => { loading = false; });
  }
  return {
    update(next: GuideStatus, mic: boolean) {
      status = next; microphoneOn = mic; refresh();
    },
    dispose() { disposed = true; view?.dispose(); view = undefined; },
  };
}
