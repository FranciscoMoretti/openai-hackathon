import './style.css';
import * as T from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { createBridgeWorld } from './model';
import { createMachinery } from './machinery';
import { chapters, duration, chapterAt, sceneAt, stillAt, cameraAt, poses } from './timeline';
import type { TourGuide, Feature, Demonstration } from './guide-contract';

const $ = <E extends HTMLElement = HTMLElement>(selector: string) => document.querySelector<E>(selector)!;
const iconPaths: Record<string,string> = {play:'<path d="m9 5 11 7-11 7z" fill="currentColor" stroke="none"/>',pause:'<path d="M8 5v14M16 5v14" stroke-width="3"/>',restart:'<path d="M3 10a9 9 0 1 1 2 8M3 4v6h6"/>',sound:'<path d="m11 5-6 4H2v6h3l6 4zM15 8a6 6 0 0 1 0 8M18 5a10 10 0 0 1 0 14"/>',mute:'<path d="m11 5-6 4H2v6h3l6 4zM16 9l6 6m0-6-6 6"/>',explore:'<circle cx="12" cy="12" r="9"/><path d="m16 8-2 6-6 2 2-6z"/>',book:'<path d="M12 5v16M12 5C8 2 4 3 2 4v15c3-1 6-1 10 2 4-3 7-3 10-2V4c-3-1-6-2-10 1z"/>',close:'<path d="m6 6 12 12M6 18 18 6"/>',arrow:'<path d="m9 5 7 7-7 7"/>'};
const svg=(name:string)=>`<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${iconPaths[name]}</svg>`;
const format=(t:number)=>`${Math.floor(t/60)}:${String(Math.floor(t%60)).padStart(2,'0')}`;
const sources=[
 ['Why the bridge opens','https://www.towerbridge.org.uk/stories/why-does-tower-bridge-open'],
 ['Construction, 1886–1894','https://www.towerbridge.org.uk/stories/how-was-tower-bridge-built'],
 ['Opening and construction dates','https://www.towerbridge.org.uk/stories/timeline-the-construction-of-tower-bridge'],
 ['How the bascules work','https://www.towerbridge.org.uk/stories/how-does-tower-bridge-work'],
 ['The changing colours','https://www.towerbridge.org.uk/stories/royal-connections-to-tower-bridge'],
];
$('#app').innerHTML=`
<header><a class="brand" href="/" aria-label="Wander home">${svg('explore')}<span>Wander</span></a><span class="tagline">London, at your pace.</span><button id="read-top" class="text-button">${svg('book')}<span>Story & sources</span></button></header>
<main><aside><div class="place-heading"><p class="location">ON THE THAMES, LONDON</p><h1>Tower<br>Bridge<span>.</span></h1><p class="intro">A river. A crossing.<br>A moving masterpiece.</p></div>
<nav aria-label="Story checkpoints">${chapters.map((c,i)=>`<button class="chapter" data-checkpoint="${i}" aria-label="Chapter ${i+1}: ${c.title}"><span class="number">0${i+1}</span><span><strong>${c.title}</strong><small>${c.era}</small></span>${svg('arrow')}</button>`).join('')}</nav>
<div class="aside-footer"><p>Press play. Let the story<br>show you where to look.</p><button id="read" class="text-button">${svg('book')}Read the story</button></div></aside>
<section class="experience" aria-label="Tower Bridge interactive audio guide"><div id="canvas"></div><div id="hotspots" aria-label="3D checkpoints">${chapters.map((c,i)=>`<button class="hotspot" data-checkpoint="${i}" aria-label="3D checkpoint ${i+1}: ${c.title}"><span>${i+1}</span><small>${c.detail}</small></button>`).join('')}</div>
<div class="era-overlay" aria-label="Historical period"><span class="era-label">PERIOD</span><strong id="era">Today</strong><span id="era-detail">The bridge you see now</span></div>
<div class="scene-heading"><div><h2 id="scene-title">A river without a crossing</h2><p id="scene-cue">Imagine the river before the bridge.</p></div><button id="explore" class="outline">${svg('explore')}<span>Explore</span></button></div>
<div id="machinery-panel" class="machinery-panel" hidden><div class="machinery-heading"><span>POWER SYSTEM · SCHEMATIC</span><strong id="power-label">Steam-powered hydraulics</strong></div><div id="machinery-canvas"></div><div class="machine-parts" aria-label="Machinery components"><span id="machine-part-1">Boiler</span><span id="machine-part-2">Steam engine</span><span id="machine-part-3">Water pump</span></div><small id="machine-explanation">Steam drives a pump that pressurises water.</small></div>
<div class="scene-footer"><span id="camera-state">Camera follows the story</span><span>Illustrative reconstruction</span></div>
<div class="player"><div class="player-row"><button id="play" class="play" aria-label="Play story">${svg('play')}</button><div class="track-info"><strong id="play-label">Start the story</strong><span>English · local demo voice</span></div><span id="time">0:00 / ${format(duration)}</span><button id="restart" class="icon-button" aria-label="Restart story">${svg('restart')}</button><button id="mute" class="icon-button" aria-label="Mute narration" aria-pressed="false">${svg('sound')}</button></div>
<div class="timeline"><label class="sr-only" for="seek">Story position</label><input id="seek" type="range" min="0" max="${duration}" step=".01" value="0"><div class="checkpoints">${chapters.map((c,i)=>`<button data-checkpoint="${i}" class="timeline-point" style="left:${c.start/duration*100}%" aria-label="Audio checkpoint ${i+1}: ${c.title}"><span>${i+1}</span><small>${format(c.start)}</small></button>`).join('')}</div></div>
<div class="player-options"><label><input type="checkbox" id="motion" checked> Animate scene</label><span>Every checkpoint plays automatically</span><button id="read-mobile">Transcript</button></div><p id="audio-error" role="alert" hidden></p></div></section></main>
<dialog id="transcript"><div class="dialog-head"><span>STORY & SOURCES</span><button id="close" class="icon-button" aria-label="Close transcript">${svg('close')}</button></div><h2>A bridge built<br>to move.</h2>${chapters.map((c,i)=>`<section><button class="transcript-chapter" data-checkpoint="${i}">${String(i+1).padStart(2,'0')} · ${c.title}<span>${format(c.start)}</span></button><p>${c.text}</p></section>`).join('')}<h3>From Tower Bridge’s own history</h3><ul>${sources.map(([label,url])=>`<li><a href="${url}" target="_blank" rel="noreferrer">${label}</a></li>`).join('')}</ul><p class="disclosure">The construction sequence, surrounding buildings, ship and timing are illustrative, not a survey or a recreation of a particular voyage. Colours are approximate. The opening is accelerated to fit the story. This demo uses a local macOS Daniel voice, not an OpenAI recording. No live location or camera alignment is used.</p></dialog>`;

const audio = new Audio('/audio/story.mp3'); audio.preload='auto';
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
let animate=!reduced.matches, follow=true, active=-1, ready=false, actualDuration=duration, destroyed=false;
let renderer:T.WebGLRenderer|undefined, camera:T.PerspectiveCamera|undefined, controls:OrbitControls|undefined, world:ReturnType<typeof createBridgeWorld>|undefined;
let worldScene:T.Scene|undefined, outline:T.Box3Helper|undefined;
let selectedFeature:Feature|null=null, visualTime:number|null=null;
let demo:{name:Demonstration;start:number;end:number;began:number}|null=null;
let cameraMove:{from:T.Vector3;to:T.Vector3;fromTarget:T.Vector3;target:T.Vector3;began:number}|null=null;
let resumeRequest:(()=>void)|undefined;
function viewedTime(now=performance.now()) {
 if(demo){visualTime=Math.min(demo.end,demo.start+(now-demo.began)/1000);if(visualTime>=demo.end)demo=null;}
 return visualTime??audio.currentTime;
}
$('#motion').toggleAttribute('checked',animate); $<HTMLInputElement>('#motion').checked=animate;
let machinery:ReturnType<typeof createMachinery>|undefined;
const surface=$('#canvas');
const hotspotButtons=[...document.querySelectorAll<HTMLButtonElement>('.hotspot')];
let resizeObserver:ResizeObserver|undefined;
function show3DError(message:string){$('#hotspots').hidden=true;$('#explore').setAttribute('disabled','');$('#motion').setAttribute('disabled','');surface.innerHTML=`<div class="webgl-error"><h2>The story is still here.</h2><p>${message} You can listen to all four chapters or read the transcript.</p></div>`;}
function applyCamera(time:number, explicit=false){
 if(!camera||!controls||(!follow&&!explicit))return;
 const pose=animate?cameraAt(time):poses[chapterAt(time)];
 const position=new T.Vector3(...pose.position),target=new T.Vector3(...pose.target);
 // Portrait view fits the wide bridge rather than cropping its towers.
 if(camera.aspect<1)position.sub(target).multiplyScalar(1.05).add(target);
 camera.position.copy(position);controls.target.copy(target);camera.fov=pose.fov+(camera.aspect<1?12:0);camera.updateProjectionMatrix();controls.update();
}
function setFollow(value:boolean){follow=value;$('#explore span').textContent=value?'Explore':'Follow story';$('#explore').setAttribute('aria-pressed',String(!value));$('#camera-state').textContent=value?(animate?'Camera follows the story':'Still views · audio continues'):'Drag to orbit · scroll to zoom';if(value)applyCamera(audio.currentTime,true);}
try {
 renderer=new T.WebGLRenderer({antialias:true,alpha:false,powerPreference:'high-performance'});renderer.setPixelRatio(Math.min(devicePixelRatio,1.75));renderer.setClearColor(0xe5ebe2);renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.2;renderer.localClippingEnabled=true;renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFShadowMap;surface.append(renderer.domElement);
 const scene=new T.Scene();worldScene=scene;scene.fog=new T.Fog(0xe5ebe2,290,620);
 camera=new T.PerspectiveCamera(40,1,.5,1000);
 scene.add(new T.HemisphereLight(0xf3f8f6,0xb8aa8a,2.4));
 const sun=new T.DirectionalLight(0xffeed5,3.5);sun.position.set(-80,150,90);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-180,right:180,top:140,bottom:-140,near:10,far:450});sun.shadow.normalBias=.25;sun.shadow.bias=-.0001;scene.add(sun);
 world=createBridgeWorld(scene);
 outline=new T.Box3Helper(new T.Box3(),0xb27c20);outline.visible=false;outline.material.depthTest=false;outline.renderOrder=10;scene.add(outline);
 try{machinery=createMachinery($('#machinery-canvas'));}catch{ $('#machinery-canvas').innerHTML='<p>Steam pumps → Electric pumps</p>'; }
 controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=false;controls.enablePan=false;controls.minDistance=40;controls.maxDistance=420;controls.maxPolarAngle=Math.PI*.47;controls.minPolarAngle=.15;
 controls.addEventListener('start',()=>{cameraMove=null;setFollow(false);});
 resizeObserver=new ResizeObserver(()=>{if(!renderer||!camera)return;const {width,height}=surface.getBoundingClientRect();renderer.setSize(width,height);camera.aspect=width/height;camera.updateProjectionMatrix();if(follow)applyCamera(audio.currentTime,true);});resizeObserver.observe(surface);
 const vector=new T.Vector3();let lastVisualTime=-1,lastMotion=animate,lastMarker=0;
 renderer.setAnimationLoop((now)=>{
   if(destroyed||!renderer||!camera||!world)return;
   const time=viewedTime(now),state=sceneAt(time);
   if(time!==lastVisualTime||animate!==lastMotion){
     const visual=animate?state:stillAt(time);
     world.update(visual,!animate);
     const machineryPanel=$('#machinery-panel');machineryPanel.hidden=!state.machinery;
     if(state.machinery){
       const isElectric=state.electric===1;
       machinery?.update(animate?time:0,isElectric,!animate);
       $('#power-label').textContent=isElectric?'Electric machinery':'Steam machinery';
       const parts=isElectric?['Electric motor','Oil pump','Oil reservoir']:['Boiler','Steam engine','Water pump'];
       parts.forEach((part,i)=>$('#machine-part-'+(i+1)).textContent=part);
       $('#machine-explanation').textContent=isElectric?'An electric motor drives the oil pump.':'Steam drives a pump that pressurises water.';
     }
     if(follow)applyCamera(time);lastVisualTime=time;lastMotion=animate;
     if(visualTime!==null){$('#era').textContent=state.era;$('#era-detail').textContent=state.period;}
   }
   if(cameraMove&&controls){const p=Math.min(1,(now-cameraMove.began)/800),e=p*p*(3-2*p);camera.position.lerpVectors(cameraMove.from,cameraMove.to,e);controls.target.lerpVectors(cameraMove.fromTarget,cameraMove.target,e);controls.update();if(p===1)cameraMove=null;}
   if(outline?.visible&&selectedFeature==='bascules'){outline.box.makeEmpty();world.leaves.forEach(leaf=>outline!.box.expandByObject(leaf));}
   renderer.render(scene,camera);
   if(now-lastMarker>70){lastMarker=now;const w=surface.clientWidth,h=surface.clientHeight;
     world.anchors.forEach((anchor,i)=>{vector.copy(anchor).project(camera!);const x=(vector.x*.5+.5)*w,y=(-vector.y*.5+.5)*h;
       const button=hotspotButtons[i];button.hidden=vector.z< -1||vector.z>1||x<24||x>w-24||y<110||y>h-24;
       button.style.left=`${x}px`;button.style.top=`${y}px`;
     });
   }
 });
 renderer.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();renderer?.setAnimationLoop(null);show3DError('The 3D view lost its graphics connection. Reload to restore it.');});
 applyCamera(0,true);ready=true;
}catch(error){renderer?.dispose();renderer=undefined;show3DError('3D is unavailable in this browser.');console.warn('Tower Bridge 3D unavailable',error);}
function cue(time:number){const s=sceneAt(time);if(s.chapter===0)return s.time<3?'Look at the two towers. Then travel back.':'Before the bridge, the river had to stay open.';if(s.chapter===1)return s.period+'.';if(s.chapter===2)return s.progress<.3?'Watch the roadway rise.':s.progress<.85?'A crossing for London. A passage for the river.':'The ship passes. The roadway returns.';return s.machinery?'A new source of power. The same hydraulic principle.':s.era==='1977'?'From chocolate brown to red, white and blue.':'Look back at the real bridge. It was built to move.';}
function sync(){const t=audio.currentTime,index=chapterAt(t),s=sceneAt(viewedTime());$<HTMLInputElement>('#seek').value=String(t);$('#seek').style.setProperty('--progress',`${t/actualDuration*100}%`);$('#time').textContent=`${format(t)} / ${format(actualDuration)}`;$('#era').textContent=s.era;$('#era-detail').textContent=s.period;$('#scene-cue').textContent=cue(t);
 if(index!==active){active=index;$('#scene-title').textContent=chapters[index].title;document.querySelectorAll<HTMLElement>('[data-checkpoint]').forEach(b=>{const selected=Number(b.dataset.checkpoint)===index;b.classList.toggle('active',selected);b.setAttribute('aria-current',selected?'step':'false');});}
}
function updatePlay(){const playing=!audio.paused;$('#play').innerHTML=svg(playing?'pause':'play');$('#play').setAttribute('aria-label',playing?'Pause story':'Play story');$('#play-label').textContent=audio.ended?'Listen again':playing?'Listening':audio.currentTime>0?'Continue the story':'Start the story';}
function restoreTourView(){visualTime=null;demo=null;cameraMove=null;selectedFeature=null;if(outline)outline.visible=false;setFollow(true);sync();}
async function play(){restoreTourView();try{if(audio.ended){audio.currentTime=0;setFollow(true);}await audio.play();$('#audio-error').hidden=true;}catch{$('#audio-error').textContent='The recording could not start. Try Play again, or open the transcript.';$('#audio-error').hidden=false;}}
function seek(time:number){restoreTourView();audio.currentTime=Math.min(time,actualDuration);if(follow)applyCamera(audio.currentTime,true);sync();updatePlay();}
$('#play').onclick=()=>audio.paused?(resumeRequest?resumeRequest():void play()):audio.pause();
$('#restart').onclick=()=>{seek(0);setFollow(true);};
$('#mute').onclick=()=>{audio.muted=!audio.muted;$('#mute').innerHTML=svg(audio.muted?'mute':'sound');$('#mute').setAttribute('aria-label',audio.muted?'Unmute narration':'Mute narration');$('#mute').setAttribute('aria-pressed',String(audio.muted));};
$<HTMLInputElement>('#seek').oninput=e=>seek(Number((e.target as HTMLInputElement).value));
$('#explore').onclick=()=>{if(!follow)restoreTourView();else setFollow(false);};
$<HTMLInputElement>('#motion').onchange=e=>{animate=(e.target as HTMLInputElement).checked;setFollow(follow);};
document.querySelectorAll<HTMLElement>('[data-checkpoint]').forEach(button=>button.onclick=()=>{seek(chapters[Number(button.dataset.checkpoint)].start);setFollow(true);if($<HTMLDialogElement>('#transcript').open)$<HTMLDialogElement>('#transcript').close();});
for(const id of ['read','read-top','read-mobile'])$('#'+id).onclick=()=>$<HTMLDialogElement>('#transcript').showModal();$('#close').onclick=()=>$<HTMLDialogElement>('#transcript').close();
audio.addEventListener('timeupdate',sync);for(const event of ['play','pause','ended'])audio.addEventListener(event,updatePlay);
audio.addEventListener('loadedmetadata',()=>{if(Number.isFinite(audio.duration)){actualDuration=audio.duration;$<HTMLInputElement>('#seek').max=String(actualDuration);}sync();});
audio.addEventListener('error',()=>{$('#audio-error').hidden=false;$('#audio-error').textContent='The narration could not load. You can still explore the checkpoints and read the story.';});
reduced.addEventListener('change',()=>{animate=!reduced.matches;$<HTMLInputElement>('#motion').checked=animate;setFollow(follow);});
setFollow(true);sync();
const featureViews:Record<Feature,{position:number[];target:number[];size:number[]}>= {
 bridge:{position:[162,102,220],target:[0,27,0],size:[250,75,40]},
 towers:{position:[32,65,105],target:[-39,39,0],size:[23,75,30]},
 walkways:{position:[40,65,98],target:[0,46,0],size:[64,8,20]},
 bascules:{position:[68,54,115],target:[0,17,0],size:[65,10,18]},
 machinery:{position:[108,65,160],target:[0,23,0],size:[1,1,1]},
};
export const tour:TourGuide={
 pause(){audio.pause();setFollow(false);},
 resume:play,
 onResumeRequest(callback){resumeRequest=callback;},
 context(){const state=sceneAt(viewedTime());return {landmark:'Tower Bridge',chapter:chapters[chapterAt(audio.currentTime)].title,tourTime:Number(audio.currentTime.toFixed(2)),tourPaused:audio.paused,viewedPeriod:state.era,viewedDetail:state.period,selectedFeature,camera:camera?.position.toArray()??null,target:controls?.target.toArray()??null,exploring:!follow,demonstration:demo?.name??null,graphicsAvailable:ready};},
 capture(){
   if(!renderer||!camera||!worldScene||!ready)return null;
   renderer.render(worldScene,camera);
   const image=document.createElement('canvas'),source=renderer.domElement;
   const scale=Math.min(1,960/source.width);image.width=Math.round(source.width*scale);image.height=Math.round(source.height*scale);
   const ctx=image.getContext('2d');if(!ctx)return null;ctx.drawImage(source,0,0,image.width,image.height);
   const state=sceneAt(viewedTime());
   if(state.machinery){machinery?.update(viewedTime(),state.electric===1,!animate);const machine=$('#machinery-canvas').querySelector('canvas');if(machine){const w=image.width*.4,h=w*machine.height/machine.width;ctx.drawImage(machine,image.width-w,image.height-h,w,h);}}
   return image.toDataURL('image/jpeg',.72);
 },
 async focus(feature){
   if(!camera||!controls)return;
   audio.pause();setFollow(false);selectedFeature=feature;demo=null;
   // Named exterior views use complete present-day geometry; machinery uses its dated schematic.
   visualTime=feature==='machinery'?chapters[3].cues[2].start:duration-.2;
   const view=featureViews[feature],target=new T.Vector3(...view.target),to=new T.Vector3(...view.position);
   if(camera.aspect<1)to.sub(target).multiplyScalar(1.35).add(target);
   camera.fov=42;camera.updateProjectionMatrix();
   cameraMove={from:camera.position.clone(),to,fromTarget:controls.target.clone(),target,began:performance.now()};
   if(!animate){camera.position.copy(to);controls.target.copy(target);controls.update();cameraMove=null;}
   tour.highlight(feature);$('#scene-cue').textContent=`Exploring ${feature} · your tour position is saved`;
   if(animate)await new Promise(resolve=>setTimeout(resolve,850));
 },
 highlight(feature){
   selectedFeature=feature;if(!outline)return;const view=featureViews[feature];
   outline.box.setFromCenterAndSize(new T.Vector3(...view.target),new T.Vector3(...view.size));outline.visible=feature!=='machinery';
   $('#machinery-panel').classList.toggle('guide-highlight',feature==='machinery');
 },
 demonstrate(name){
   audio.pause();setFollow(false);cameraMove=null;selectedFeature=null;if(outline)outline.visible=false;
   const index=name==='construction'?1:name==='bridge_opening'?2:3,c=chapters[index];
   const end=name==='power_change'?c.cues[3].start-.1:c.start+c.duration-.05;
   demo={name,start:c.start,end,began:performance.now()};visualTime=animate?c.start:(name==='bridge_opening'?c.cues[5].start:end);if(!animate)demo=null;
   applyCamera(c.start+4,true);$('#scene-cue').textContent=animate?'A closer look · your tour position is saved':'Still demonstration · reduced motion';
 },
};
// Read-only diagnostics for the demo's browser checks.
Object.assign(window,{__tower:()=>({ready,time:audio.currentTime,paused:audio.paused,ended:audio.ended,follow,animate,duration:actualDuration,scene:sceneAt(viewedTime()),selectedFeature,demonstration:demo?.name??null,camera:camera?.position.toArray(),lift:world?.leaves.map(x=>x.rotation.z),ship:world?.ship.position.toArray(),drawCalls:renderer?.info.render.calls})});
window.addEventListener('pagehide',()=>{destroyed=true;audio.pause();resizeObserver?.disconnect();controls?.dispose();world?.dispose();machinery?.dispose();renderer?.setAnimationLoop(null);renderer?.dispose();});
