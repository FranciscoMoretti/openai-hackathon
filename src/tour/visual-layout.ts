/** Keep scene annotations above the guide as captions, notices and text resize it. */
export function mountVisualLayout() {
  const experience = document.querySelector<HTMLElement>('.experience');
  const slot = document.querySelector<HTMLElement>('#voice-guide-slot');
  if (!experience || !slot) return;
  const observer = new ResizeObserver(([entry]) => {
    experience.style.setProperty('--guide-height', `${entry.contentRect.height}px`);
  });
  observer.observe(slot);
  window.addEventListener('pagehide', () => observer.disconnect(), { once: true });
}
