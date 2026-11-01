import { useEffect, useRef, type ReactNode } from 'react';
import { X } from 'lucide-react';

export function Dialog({ title, closeLabel, onClose, children }: { title: string; closeLabel: string; onClose: () => void; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => { ref.current?.showModal(); }, []);
  return <dialog ref={ref} onClose={onClose} aria-label={title} className="dialog" onClick={event => { if (event.target === ref.current) ref.current?.close(); }}>
    <div className="dialog-header"><h2>{title}</h2><button className="icon-button" aria-label={closeLabel} onClick={() => ref.current?.close()}><X /></button></div>
    {children}
  </dialog>;
}
