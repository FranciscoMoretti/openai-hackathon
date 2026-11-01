import { Component, Suspense, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import { Orb, type AgentState } from './components/elevenlabs-orb';
import type { GuideStatus } from './guide-client';

const palettes: Record<string, [string, string]> = {
  listening: ['#B8B8B8', '#E4E4E4'],
  talking: ['#858585', '#D6D6D6'],
  thinking: ['#A0A0A0', '#DCDCDC'],
  idle: ['#B8B8B8', '#D2D2D2'],
};
class OrbBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() { return this.state.failed ? null : this.props.children; }
}

export function mountOrbView(container: HTMLElement) {
  const root = createRoot(container);
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const motion = document.querySelector<HTMLInputElement>('#motion');
  let status: GuideStatus = 'idle', mic = false;
  function render() {
    const agentState: AgentState = status === 'speaking' ? 'talking'
      : status === 'listening' && mic ? 'listening'
      : ['thinking', 'connecting', 'transitioning'].includes(status) ? 'thinking' : null;
    const animated = !reduced.matches && motion?.checked !== false && !document.hidden && status !== 'paused';
    root.render(
      <OrbBoundary>
        <Suspense fallback={null}>
          <Orb className="elevenlabs-orb" seed={1000} agentState={agentState}
            colors={palettes[agentState ?? 'idle']} animated={animated} />
        </Suspense>
      </OrbBoundary>,
    );
  }
  reduced.addEventListener('change', render);
  motion?.addEventListener('change', render);
  document.addEventListener('visibilitychange', render);
  return {
    update(next: GuideStatus, microphoneOn: boolean) { status = next; mic = microphoneOn; render(); },
    dispose() {
      reduced.removeEventListener('change', render);
      motion?.removeEventListener('change', render);
      document.removeEventListener('visibilitychange', render);
      root.unmount();
    },
  };
}
