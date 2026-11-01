/** Shared navigation and settings around the live voice tour. */
import './main';
import './tour-shell.css';
import { tour } from './main';
import { mountGuide } from './guide-ui';
import './visuals.css';
import { mountVisualLayout } from './visual-layout';

const get = <E extends HTMLElement = HTMLElement>(selector: string) => document.querySelector<E>(selector)!;
const icon = (paths: string) => `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths}</svg>`;
const closeIcon = icon('<path d="m6 6 12 12M6 18 18 6"/>');
document.body.classList.add('tour-shell');

// Keep the existing controls (and their listeners), rather than copying tour state.
const header = get('header');
get('.tagline').remove();
const mapLink = get<HTMLAnchorElement>('.brand');
mapLink.href = '/#map'; mapLink.target = '_top'; mapLink.setAttribute('aria-label', 'Back to map');
mapLink.innerHTML = `${icon('<path d="M19 12H5m6-6-6 6 6 6"/>')}<span>Map</span>`;
const title = document.createElement('h1');
title.className = 'tour-title';
title.textContent = 'Tower Bridge';
header.append(title);
const more = document.createElement('button');
more.id = 'tour-settings-open'; more.className = 'shell-icon';
more.setAttribute('aria-label', 'Tour options'); more.setAttribute('aria-haspopup', 'dialog');
more.innerHTML = icon('<circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/>');
header.append(more);

const settings = document.createElement('dialog');
settings.id = 'tour-settings'; settings.setAttribute('aria-labelledby', 'tour-settings-title');
settings.innerHTML = `<div class="shell-sheet-heading"><h2 id="tour-settings-title">Tour options</h2><button class="shell-icon" aria-label="Close tour options">${closeIcon}</button></div><div class="shell-settings-content"></div>`;
document.body.append(settings);
const settingsContent = settings.querySelector<HTMLElement>('.shell-settings-content')!;
settingsContent.append(get('#read-top'));
const motionLabel = get('#motion').closest('label')!;
settingsContent.append(motionLabel);
const disclosure = document.createElement('p'); disclosure.className='shell-disclosure';
disclosure.textContent='Your guide uses an AI voice. Microphone audio and this scene are shared with OpenAI during the tour. No webcam or location is shared.'; settingsContent.append(disclosure);
more.onclick = () => settings.showModal();
settings.querySelector<HTMLButtonElement>('.shell-icon')!.onclick = () => settings.close();
get('#read-top').addEventListener('click', () => settings.close());

const chapterSheet = document.createElement('dialog');
chapterSheet.id = 'tour-chapters'; chapterSheet.setAttribute('aria-labelledby','tour-chapters-title');
chapterSheet.innerHTML = `<div class="shell-sheet-heading"><h2 id="tour-chapters-title">The story</h2><button class="shell-icon" aria-label="Close chapters">${closeIcon}</button></div><p class="shell-sheet-intro">Four places in the story. Follow your guide, or choose where to go next.</p><div class="shell-chapter-content"></div>`;
document.body.append(chapterSheet);
chapterSheet.querySelector<HTMLButtonElement>('.shell-icon')!.onclick=()=>chapterSheet.close();
const chapterNav=get('aside nav'), desktopAside=get('aside');
const chapterButton=document.createElement('button'); chapterButton.id='tour-chapters-open';
chapterButton.setAttribute('aria-haspopup','dialog');
chapterButton.innerHTML=`${icon('<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>')}<span>Stops</span>`;
header.insertBefore(chapterButton,more);
chapterButton.onclick=()=>chapterSheet.showModal();
chapterNav.addEventListener('click',e=>{if((e.target as Element).closest('[data-checkpoint]')&&chapterSheet.open)chapterSheet.close();});
const compact=matchMedia('(max-width: 760px)');
function placeChapters(){
  if(compact.matches)chapterSheet.querySelector('.shell-chapter-content')!.append(chapterNav);
  else {if(chapterSheet.open)chapterSheet.close();desktopAside.append(chapterNav);}
}
compact.addEventListener('change',placeChapters);placeChapters();
window.addEventListener('resize',placeChapters);

for(const dialog of [settings,chapterSheet])dialog.addEventListener('click',e=>{
  if(e.target!==dialog)return;
  const r=dialog.getBoundingClientRect();
  if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close();
});
mountGuide(tour);
mountVisualLayout();
