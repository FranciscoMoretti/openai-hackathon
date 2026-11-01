import { RealtimeGuide, type GuideStatus } from './guide-client';
import type { TourGuide } from './guide-contract';
import { checkpointIds, tourStops } from './tour-content';
import './guide.css';
import { mountVoiceOrb } from './voice-orb';

const svg=(paths:string)=>`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths}</svg>`;
const mic=svg('<rect x="9" y="3" width="6" height="12" rx="3"/><path d="M5 10v2a7 7 0 0 0 14 0v-2M12 19v3m-4 0h8"/>');
const mutedMic=svg('<path d="m3 3 18 18M9 9v3a3 3 0 0 0 5 2M9 5a3 3 0 0 1 6 0v6M5 10v2a7 7 0 0 0 12 5M19 10v2M12 19v3m-4 0h8"/>');
const voice=svg('<path d="M4 10v4M8 6v12M12 3v18M16 7v10M20 10v4" stroke-width="2.7"/>');
const pause=svg('<path d="M8 5v14M16 5v14" stroke-width="2.7"/>');
const play=svg('<path d="m9 5 10 7-10 7z" fill="currentColor" stroke="none"/>');
const close=svg('<path d="m6 6 12 12M6 18 18 6"/>');
const captions=svg('<rect x="2" y="5" width="20" height="14" rx="4"/><path d="M10 9H7v6h3M17 9h-3v6h3"/>');

export function mountGuide(tour:TourGuide){
 const slot=document.querySelector<HTMLElement>('#voice-guide-slot')!;
 slot.classList.add('voice-mode-slot');
 slot.innerHTML=`<section class="voice-guide voice-mode" aria-label="Voice tour" data-status="idle">
   <div class="voice-caption" id="voice-caption" hidden><p id="voice-caption-text">Your guide’s words will appear here.</p></div>
   <button id="voice-primary" class="voice-toggle" aria-label="Start voice tour" title="Start voice tour">
     <span class="voice-launch" aria-hidden="true">${voice}</span>
   </button>
   <div class="voice-orb" data-orb-state="idle" aria-hidden="true"></div>
   <span id="voice-status" class="voice-state-label" role="status" aria-live="polite" hidden>Ready</span>
   <div class="voice-mode-controls" hidden>
     <button id="voice-pause" aria-label="Pause voice tour" title="Pause voice tour">${pause}</button>
     <button id="voice-mic" aria-label="Mute microphone" title="Mute microphone" aria-pressed="false">${mic}</button>
     <button id="voice-captions" aria-label="Show captions" title="Show captions" aria-pressed="false">${captions}</button>
     <button id="voice-end" aria-label="End voice tour" title="End voice tour">${close}</button>
   </div>
   <p id="voice-notice" class="voice-notice" role="alert" hidden></p>
   <button id="voice-enable-sound" hidden>Enable guide audio</button>
 </section>`;
 const get=<E extends HTMLElement=HTMLElement>(selector:string)=>slot.querySelector<E>(selector)!;
 const orb=mountVoiceOrb(get('.voice-orb'));
 let status:GuideStatus='idle',guiding=false,caption='',captionsOn=false;
 const names:Record<GuideStatus,string>={idle:'Ready',connecting:'Connecting…',thinking:'Thinking',transitioning:'Next stop…',speaking:'Talking',listening:'Listening',paused:'Paused',error:'Disconnected'};
 function render(){
  const running=client.isActive,paused=status==='paused';
  get('.voice-mode').dataset.status=status;
  orb.update(status,client.microphoneOn);
  get('#voice-status').textContent=status==='listening'&&!client.microphoneOn?'Microphone muted':names[status];
  get('#voice-status').hidden=status==='idle';
  const canContinue=running&&!guiding&&status==='listening'&&!client.tourComplete;
  const label=running&&!canContinue?(status==='connecting'?'Cancel connection':'Pause voice tour'):canContinue?'Continue tour':paused?'Resume voice tour':status==='error'?'Retry voice tour':'Start voice tour';
  const button=get<HTMLButtonElement>('#voice-primary');
  button.setAttribute('aria-label',label);button.title=label;
  get('#voice-pause').innerHTML=status==='connecting'?close:paused||canContinue?play:pause;
  get('#voice-pause').setAttribute('aria-label',label);get('#voice-pause').title=label;
  get('.voice-mode-controls').hidden=!running&&!client.connected;
  get<HTMLButtonElement>('#voice-mic').disabled=!client.connected||!running;
  const micLabel=client.microphoneOn?'Mute microphone':'Unmute microphone';
  get('#voice-mic').setAttribute('aria-pressed',String(!client.microphoneOn));
  get('#voice-mic').setAttribute('aria-label',micLabel);get('#voice-mic').title=micLabel;
  get('#voice-mic').innerHTML=client.microphoneOn?mic:mutedMic;
  // Keep the single state label; only actionable failures need an explanation.
  if(status==='idle'){
   captionsOn=false;get('#voice-caption').hidden=true;
   get('#voice-captions').setAttribute('aria-pressed','false');
   get('#voice-captions').setAttribute('aria-label','Show captions');get('#voice-captions').title='Show captions';
   get('#voice-enable-sound').hidden=true;
  }
 }
 const client=new RealtimeGuide(tour,{
  status(value,detail){
   status=value;const notice=get('#voice-notice');
   notice.hidden=!detail||!['error','listening'].includes(value);notice.textContent=detail??'';
   // Conversational prompts and completion are conveyed by voice, not a second card.
   if(value==='listening'&&detail&&!/couldn’t|missed|try again/i.test(detail))notice.hidden=true;
   render();
  },
  caption(text){caption=text;get('#voice-caption-text').textContent=caption||'Your guide’s words will appear here.';const box=get('#voice-caption');box.scrollTop=box.scrollHeight;},
  mic(){render();},
  audioBlocked(){get('#voice-enable-sound').hidden=false;},
  progress(completed,isGuiding){guiding=isGuiding;document.querySelectorAll<HTMLElement>('[data-checkpoint]').forEach(el=>{const id=checkpointIds[Number(el.dataset.checkpoint)];el.classList.toggle('visited',completed.has(id));});render();},
 });
 const toggleGuide=()=>{
  if(client.isActive){if(!client.isGuiding&&status==='listening'&&!client.tourComplete)client.continueTour();else client.pause();}
  else void client.start();
 };
 get('#voice-primary').onclick=toggleGuide;get('#voice-pause').onclick=toggleGuide;
 get('#voice-mic').onclick=()=>client.toggleMic();get('#voice-end').onclick=()=>client.stop();
 get('#voice-enable-sound').onclick=()=>{get('#voice-enable-sound').hidden=true;void client.enableSound();};
 get('#voice-captions').onclick=()=>{
  captionsOn=!captionsOn;get('#voice-caption').hidden=!captionsOn;
  const label=captionsOn?'Hide captions':'Show captions';
  get('#voice-captions').setAttribute('aria-pressed',String(captionsOn));
  get('#voice-captions').setAttribute('aria-label',label);get('#voice-captions').title=label;
 };
 tour.onCheckpointRequest(id=>{client.goToCheckpoint(id);render();});
 window.addEventListener('pagehide',()=>{client.stop();orb.dispose();});
 document.addEventListener('visibilitychange',()=>{if(document.hidden&&(client.isActive||client.connected))client.stop();});
 Object.assign(window,{__voiceGuide:()=>({status,guiding,microphoneOn:client.microphoneOn,connected:client.connected,checkpoint:tour.context().checkpoint,caption})});
 document.querySelector('aside')?.insertAdjacentHTML('afterbegin','<p class="checkpoint-eyebrow">YOUR TOUR <span>4 STOPS</span></p>');
 document.querySelectorAll<HTMLElement>('.chapter').forEach((button,i)=>button.setAttribute('title',`Visit ${tourStops[i].title}`));
 render();
}
