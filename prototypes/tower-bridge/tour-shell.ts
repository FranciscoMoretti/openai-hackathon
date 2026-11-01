/** Presentation only. The tour owns all audio, checkpoint and scene behavior in main.ts. */
import './main';
import './tour-shell.css';

const get = <E extends HTMLElement = HTMLElement>(selector: string) => document.querySelector<E>(selector)!;
const icon = (paths: string) => `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths}</svg>`;
const closeIcon = icon('<path d="m6 6 12 12M6 18 18 6"/>');
document.body.classList.add('tour-shell');

// Keep the existing controls (and their listeners), rather than copying tour state.
const header = get('header');
get('.tagline').remove();
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
const soundRow = document.createElement('div'); soundRow.className = 'shell-setting-row';
soundRow.innerHTML = '<span>Narration sound</span>'; soundRow.append(get('#mute')); settingsContent.append(soundRow);
const restart = document.createElement('button'); restart.className='shell-restart';
restart.innerHTML = `${icon('<path d="M3 10a9 9 0 1 1 2 8M3 4v6h6"/>')}Restart story`;
restart.onclick = () => {get('#restart').click(); settings.close();}; settingsContent.append(restart);
const disclosure = document.createElement('p'); disclosure.className='shell-disclosure';
disclosure.textContent='English narration · local demo voice'; settingsContent.append(disclosure);
more.onclick = () => settings.showModal();
settings.querySelector<HTMLButtonElement>('.shell-icon')!.onclick = () => settings.close();
get('#read-top').addEventListener('click', () => settings.close());

const chapterSheet = document.createElement('dialog');
chapterSheet.id = 'tour-chapters'; chapterSheet.setAttribute('aria-labelledby','tour-chapters-title');
chapterSheet.innerHTML = `<div class="shell-sheet-heading"><h2 id="tour-chapters-title">The story</h2><button class="shell-icon" aria-label="Close chapters">${closeIcon}</button></div><p class="shell-sheet-intro">Listen straight through, or revisit any moment.</p><div class="shell-chapter-content"></div>`;
document.body.append(chapterSheet);
chapterSheet.querySelector<HTMLButtonElement>('.shell-icon')!.onclick=()=>chapterSheet.close();
const chapterNav=get('aside nav'), desktopAside=get('aside');
const chapterButton=document.createElement('button'); chapterButton.id='tour-chapters-open';
chapterButton.setAttribute('aria-haspopup','dialog');
chapterButton.innerHTML=`${icon('<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>')}<span>Chapters</span>`;
get('.player-options').prepend(chapterButton);
chapterButton.onclick=()=>chapterSheet.showModal();
chapterNav.addEventListener('click',e=>{if((e.target as Element).closest('[data-checkpoint]')&&chapterSheet.open)chapterSheet.close();});
const compact=matchMedia('(max-width: 760px)');
function placeChapters(){
  if(compact.matches)chapterSheet.querySelector('.shell-chapter-content')!.append(chapterNav);
  else {if(chapterSheet.open)chapterSheet.close();desktopAside.append(chapterNav);}
}
compact.addEventListener('change',placeChapters);placeChapters();
for(const dialog of [settings,chapterSheet])dialog.addEventListener('click',e=>{
  if(e.target!==dialog)return;
  const r=dialog.getBoundingClientRect();
  if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close();
});
