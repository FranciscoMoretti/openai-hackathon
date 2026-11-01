import './style.css';
import * as T from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { buildLandmark, buildSetting } from './model.js';

// Isolated option B. Question: can exterior camera framing carry the story?
const chapters=await fetch('/audio/chapters.json').then(r=>r.json());
const poses=[{p:[91,65,122],t:[-8,42,0],f:38},{p:[20,56,31],t:[0,52,0],f:38},{p:[23,76,35],t:[0,71,0],f:38},{p:[104,85,133],t:[-17,28,0],f:42}];
const anchors=[[5.7,25,5.7],[0,52.1,5.8],[0,64,5.8],[-25,12,5.8]].map(p=>new T.Vector3(...p));
const descriptions=['A landmark you know. A story you might not.','Notice the face, the hands, the stone around them.','Follow the silhouette up. There is more to the name.','One familiar tower. Part of a much bigger story.'];
const $=s=>document.querySelector(s);
const icons={play:'<path d="m9 5 11 7-11 7z"/>',pause:'<path d="M8 5v14M16 5v14"/>',reset:'<path d="M3 10a9 9 0 1 1 2 8M3 4v6h6"/>',sound:'<path d="m11 5-6 4H2v6h3l6 4zM15 8a6 6 0 0 1 0 8M18 5a10 10 0 0 1 0 14"/>',mute:'<path d="m11 5-6 4H2v6h3l6 4zM16 9l6 6m0-6-6 6"/>',arrow:'<path d="M19 12H5m6-6-6 6 6 6"/>',expand:'<path d="M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5"/>'};
const svg=(name)=>`<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[name]}</svg>`;
$('#app').innerHTML=`<header><a class="brand" href="/" aria-label="Wander home"><span class="compass">✦</span> wander</a><span class="tagline">London, at your pace.</span><span class="prototype">EXTERIOR STUDY <span> / 02</span></span></header>
<main><aside><div class="eyebrow">WESTMINSTER, LONDON</div><h1>Look a little<br><em>closer.</em></h1><p class="intro">Let the story show you<br>where to look.</p><div class="place"><span class="place-dot"></span> Big Ben <span>51.5007° N</span></div>
<nav aria-label="Story chapters">${chapters.map((c,i)=>`<button class="chapter ${i===0?'active':''}" data-chapter="${i}" aria-current="${i===0?'step':'false'}"><span class="chapter-number">0${i+1}</span><span><strong>${c.title}</strong><small>${c.detail}</small></span><span class="chapter-mark">↗</span></button>`).join('')}</nav>
<div class="aside-footer"><span class="fine-label">A SMALL CHANGE OF PERSPECTIVE</span><p>The building stays still.<br>The story takes you closer.</p><button id="transcript-open">Read the story <span>↗</span></button></div></aside>
<section class="experience" aria-label="Interactive exterior model of Elizabeth Tower"><div id="canvas"></div><div id="hotspots" aria-label="Landmark checkpoints">${chapters.map((c,i)=>`<button class="hotspot" data-checkpoint="${i}" aria-label="3D checkpoint ${i+1}: ${c.detail}" title="${c.detail} · ${format(c.start)}"><span>${i+1}</span><span class="hotspot-label">${c.detail}</span></button>`).join('')}</div>
<div class="scene-top"><div><span class="eyebrow">A STORY IN FOUR VIEWS</span><p id="view-name">Elizabeth Tower</p></div><button class="round" id="overview" aria-label="Show whole landmark" title="Show whole landmark">${svg('expand')}</button></div>
<div class="scene-badge"><span></span><span id="camera-status">Following the story</span></div>
<div class="caption"><span id="chapter-count">01 — 04</span><h2 id="chapter-title">A familiar silhouette</h2><p id="chapter-description">${descriptions[0]}</p></div>
<div class="player"><div class="player-main"><button id="play" class="play" aria-label="Play story">${svg('play')}</button><div class="track"><div class="track-heading"><strong id="play-state">Start the story</strong><span id="time">0:00 / 1:07</span></div><div class="track-foot"><span>English · local demo voice</span><span>Exterior only</span></div></div><button class="icon" id="restart" aria-label="Restart story">${svg('reset')}</button><button class="icon" id="mute" aria-label="Mute narration" aria-pressed="false">${svg('sound')}</button></div>
<div class="audio-timeline" aria-label="Audio checkpoints"><input id="seek" aria-label="Story position" type="range" min="0" max="67.4" step="0.01" value="0"><div class="timeline-checkpoints">${chapters.map((c,i)=>`<button class="timeline-checkpoint" data-checkpoint="${i}" style="left:${c.start/chapters.reduce((a,c)=>a+c.duration,0)*100}%" aria-label="Audio checkpoint ${i+1}: ${c.detail}" title="${c.title}"><span>${i+1}</span><small>${format(c.start)}</small></button>`).join('')}</div></div><div class="player-bottom"><label><input type="checkbox" id="follow" checked><span class="switch"></span>Follow the story</label><span class="drag-hint">Drag the model to explore</span><button id="transcript-mobile">Transcript ↗</button></div><p id="error" role="alert" hidden></p></div>
<div class="model-note">Illustrative exterior model · No live location</div></section></main>
<dialog id="transcript"><div class="dialog-heading"><span class="eyebrow">THE STORY</span><button id="close" class="round" aria-label="Close transcript">×</button></div><h2>The bell behind<br>the name.</h2>${chapters.map(c=>`<h3>${c.title}</h3><p>${c.text}</p>`).join('')}<a href="https://www.parliament.uk/about/living-heritage/building/palace/big-ben/building-clock-tower/key-dates-/" target="_blank" rel="noreferrer">Source: UK Parliament ↗</a><small>Prototype narration generated with the local macOS Daniel voice. Not an OpenAI voice recording.</small></dialog>`;
const audio=new Audio('/audio/story.mp3');audio.preload='auto';
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
let follow=!reduced.matches, active=0, total=chapters.reduce((a,c)=>a+c.duration,0), renderer, controls, camera, scene;
$('#follow').checked=follow;
const surface=$('#canvas');
try{
 renderer=new T.WebGLRenderer({antialias:true,alpha:true});renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.25;surface.append(renderer.domElement);
 scene=new T.Scene();scene.fog=new T.Fog(0xf0f2e9,210,390);
 camera=new T.PerspectiveCamera(38,1,.1,700);camera.position.fromArray(poses[0].p);
 scene.add(new T.HemisphereLight(0xfaffff,0xbcb299,2.5));
 const sun=new T.DirectionalLight(0xfff1d8,3.3);sun.position.set(50,110,70);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-100,right:100,top:110,bottom:-70,near:1,far:270});sun.shadow.normalBias=.15;scene.add(sun);
 const landmarkModel=buildLandmark();scene.add(landmarkModel);buildSetting(scene);
 controls=new OrbitControls(camera,renderer.domElement);controls.target.fromArray(poses[0].t);controls.enableDamping=false;controls.enablePan=false;controls.minDistance=14;controls.maxDistance=230;controls.maxPolarAngle=Math.PI*.49;controls.update();
 controls.addEventListener('start',()=>setFollow(false));
 new ResizeObserver(()=>{const {width,height}=surface.getBoundingClientRect();renderer.setSize(width,height);camera.aspect=width/height;applyPose(audio.currentTime,true);}).observe(surface);
 const pos=new T.Vector3(),target=new T.Vector3();
 const hotspotButtons=[...document.querySelectorAll('.hotspot')];
 const raycaster=new T.Raycaster(),projected=new T.Vector3(),direction=new T.Vector3();
 let lastHotspotUpdate=0;
 function positionHotspots(now){
   if(now-lastHotspotUpdate<50)return;lastHotspotUpdate=now;
   const width=surface.clientWidth,height=surface.clientHeight;
   anchors.forEach((anchor,i)=>{
     projected.copy(anchor).project(camera);
     const x=(projected.x*.5+.5)*width,y=(-projected.y*.5+.5)*height;
     const inFrame=projected.z>-1&&projected.z<1&&x>24&&x<width-24&&y>100&&y<height-85;
     let visible=inFrame;
     if(inFrame){
       raycaster.set(camera.position,direction.copy(anchor).sub(camera.position).normalize());
       const hit=raycaster.intersectObject(landmarkModel,true)[0];
       visible=!hit||hit.distance>=camera.position.distanceTo(anchor)-1;
     }
     const button=hotspotButtons[i];button.hidden=!visible;
     if(visible){button.style.left=`${x}px`;button.style.top=`${y}px`;}
   });
 }
 function applyPose(time,force=false){
   if(!follow&&!force)return;
   const index=chapterAt(time),from=poses[index],to=poses[Math.min(3,index+1)];
   const next=chapters[index+1];let t=next?Math.min(1,Math.max(0,(time-(next.start-2.7))/2.7)):0;t=t*t*(3-2*t);
   pos.fromArray(from.p).lerp(new T.Vector3(...to.p),t);target.fromArray(from.t).lerp(new T.Vector3(...to.t),t);
   // Widen the field of view in portrait so the tower stays fully visible.
   camera.fov=from.f+(to.f-from.f)*t+(camera.aspect<.8?12:0);camera.position.copy(pos);controls.target.copy(target);camera.updateProjectionMatrix();controls.update();
 }
 window.__view=()=>({chapter:active,follow,time:audio.currentTime,paused:audio.paused,camera:camera.position.toArray(),target:controls.target.toArray(),meshes:renderer.info.render.calls});
 window.__setView=applyPose;
 renderer.setAnimationLoop(now=>{if(follow)applyPose(audio.currentTime);renderer.render(scene,camera);positionHotspots(now);});
}catch(e){surface.innerHTML='<p class="webgl-error">The 3D view is unavailable in this browser. You can still listen to the story and read the transcript.</p>';$('#follow').disabled=true;$('#hotspots').hidden=true;follow=false;console.warn('3D unavailable:',e.message);}
function chapterAt(time){let i=0;chapters.forEach((c,n)=>{if(time>=c.start)i=n;});return i;}
function format(seconds){const s=Math.floor(seconds||0);return `${Math.floor(s/60)}:${String(s%60).padStart(2,'0')}`;}
function setFollow(value){follow=value;$('#follow').checked=value;$('#camera-status').textContent=value?'Following the story':'Explore at your pace';if(controls)controls.enabled=!value;if(value)window.__setView?.(audio.currentTime,true);}
// OrbitControls stays enabled while following so dragging can hand over to exploration.
function sync(){
 const time=audio.currentTime,index=chapterAt(time);active=index;
 $('#seek').value=String(time);$('#seek').style.setProperty('--progress',`${time/total*100}%`);$('#time').textContent=`${format(time)} / ${format(total)}`;
 $('#chapter-count').textContent=`0${index+1} — 04`;$('#chapter-title').textContent=chapters[index].title;$('#chapter-description').textContent=descriptions[index];$('#view-name').textContent=chapters[index].detail;
 document.querySelectorAll('.chapter').forEach((b,i)=>{b.classList.toggle('active',i===index);b.setAttribute('aria-current',i===index?'step':'false');});
 document.querySelectorAll('[data-checkpoint]').forEach(b=>{const selected=Number(b.dataset.checkpoint)===index;b.classList.toggle('active',selected);b.setAttribute('aria-current',selected?'step':'false');});
 if(controls)controls.enabled=true;
}
function updatePlay(){const playing=!audio.paused;$('#play').innerHTML=svg(playing?'pause':'play');$('#play').setAttribute('aria-label',playing?'Pause story':'Play story');$('#play-state').textContent=audio.ended?'Listen again':playing?'Listening':audio.currentTime>0?'Continue the story':'Start the story';}
async function play(){try{if(audio.ended)audio.currentTime=0;await audio.play();$('#error').hidden=true;}catch{$('#error').textContent='Audio could not start. Press Play to try again, or read the transcript.';$('#error').hidden=false;}}
$('#play').onclick=()=>audio.paused?play():audio.pause();
$('#restart').onclick=()=>{audio.currentTime=0;setFollow(!reduced.matches);sync();updatePlay();};
$('#mute').onclick=()=>{audio.muted=!audio.muted;$('#mute').innerHTML=svg(audio.muted?'mute':'sound');$('#mute').setAttribute('aria-label',audio.muted?'Unmute narration':'Mute narration');$('#mute').setAttribute('aria-pressed',String(audio.muted));};
$('#seek').oninput=e=>{audio.currentTime=Number(e.target.value);if(follow)window.__setView?.(audio.currentTime,true);sync();updatePlay();};
$('#follow').onchange=e=>setFollow(e.target.checked);
$('#overview').onclick=()=>{setFollow(false);camera?.position.fromArray(poses[0].p);controls?.target.fromArray(poses[0].t);if(camera){camera.fov=38+(camera.aspect<.8?12:0);camera.updateProjectionMatrix();}controls?.update();};
function selectCheckpoint(index){
 audio.currentTime=chapters[index].start;
 if(!reduced.matches)setFollow(true);
 // Explicit checkpoint selection may reposition once; reduced motion never follows automatically.
 window.__setView?.(audio.currentTime,true);
 sync();updatePlay();
}
document.querySelectorAll('.chapter').forEach((b,i)=>b.onclick=()=>selectCheckpoint(i));
document.querySelectorAll('[data-checkpoint]').forEach(b=>b.onclick=()=>selectCheckpoint(Number(b.dataset.checkpoint)));
for(const id of ['transcript-open','transcript-mobile'])$('#'+id).onclick=()=>$('#transcript').showModal();$('#close').onclick=()=>$('#transcript').close();
audio.addEventListener('loadedmetadata',()=>{total=audio.duration;$('#seek').max=String(total);sync();});for(const event of ['play','pause','ended'])audio.addEventListener(event,updatePlay);audio.addEventListener('timeupdate',sync);audio.addEventListener('error',()=>{$('#error').hidden=false;$('#error').textContent='The narration file could not load. The transcript and 3D views are still available.';});
reduced.addEventListener('change',()=>{if(reduced.matches)setFollow(false);});
setFollow(follow);sync();
