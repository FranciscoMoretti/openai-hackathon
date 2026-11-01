import { DemonstrationPlayback } from './demonstration-playback';
import './style.css';
import * as T from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { createBridgeWorld } from './model';
import { createMachinery } from './machinery';
import { chapters, duration, chapterAt, sceneAt, stillAt, cameraAt, poses } from './timeline';
import type { TourGuide, Feature, Demonstration } from './guide-contract';
import { tourStops, checkpointIds, type CheckpointId } from './tour-content';

const $ = <E extends HTMLElement = HTMLElement>(selector: string) => document.querySelector<E>(selector)!;
const iconPaths: Record<string,string> = {play:'<path d="m9 5 11 7-11 7z" fill="currentColor" stroke="none"/>',pause:'<path d="M8 5v14M16 5v14" stroke-width="3"/>',restart:'<path d="M3 10a9 9 0 1 1 2 8M3 4v6h6"/>',sound:'<path d="m11 5-6 4H2v6h3l6 4zM15 8a6 6 0 0 1 0 8M18 5a10 10 0 0 1 0 14"/>',mute:'<path d="m11 5-6 4H2v6h3l6 4zM16 9l6 6m0-6-6 6"/>',explore:'<circle cx="12" cy="12" r="9"/><path d="m16 8-2 6-6 2 2-6z"/>',book:'<path d="M12 5v16M12 5C8 2 4 3 2 4v15c3-1 6-1 10 2 4-3 7-3 10-2V4c-3-1-6-2-10 1z"/>',close:'<path d="m6 6 12 12M6 18 18 6"/>',arrow:'<path d="m9 5 7 7-7 7"/>'};
const svg=(name:string)=>`<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${iconPaths[name]}</svg>`;

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
<nav aria-label="Story checkpoints">${tourStops.map((c,i)=>`<button class="chapter" data-checkpoint="${i}" aria-label="Chapter ${i+1}: ${c.title}"><span class="number">0${i+1}</span><span><strong>${c.title}</strong><small>${c.era}</small></span>${svg('arrow')}</button>`).join('')}</nav>
<div class="aside-footer"><p>Your own guide.<br>Follow your curiosity.</p><button id="read" class="text-button">${svg('book')}Read the story</button></div></aside>
<section class="experience" aria-label="Tower Bridge interactive audio guide"><div id="canvas"></div><div id="hotspots" aria-label="3D checkpoints">${tourStops.map((c,i)=>`<button class="hotspot" data-checkpoint="${i}" aria-label="3D checkpoint ${i+1}: ${c.title}"><span>${i+1}</span><small>${c.detail}</small></button>`).join('')}</div>
<div class="era-overlay" aria-label="Historical period"><span class="era-label">PERIOD</span><strong id="era">Today</strong><span id="era-detail">The bridge you see now</span></div>
<div class="scene-heading"><div><h2 id="scene-title">${tourStops[0].title}</h2><p id="scene-cue">${tourStops[0].detail}</p></div></div>
<div id="machinery-panel" class="machinery-panel" hidden><div class="machinery-heading"><span>POWER SYSTEM · SCHEMATIC</span><strong id="power-label">Steam-powered hydraulics</strong></div><div id="machinery-canvas"></div><div class="machine-parts" aria-label="Machinery components"><span id="machine-part-1">Boiler</span><span id="machine-part-2">Steam engine</span><span id="machine-part-3">Water pump</span></div><small id="machine-explanation">Steam drives a pump that pressurises water.</small></div>
<div id="voice-guide-slot"></div><div id="scene-options" hidden><label><input type="checkbox" id="motion" checked> Animate scene</label></div></section></main>
<dialog id="transcript"><div class="dialog-head"><span>STORY & SOURCES</span><button id="close" class="icon-button" aria-label="Close transcript">${svg('close')}</button></div><h2>A bridge built<br>to move.</h2>${tourStops.map((c,i)=>`<section><button class="transcript-chapter" data-checkpoint="${i}">${String(i+1).padStart(2,'0')} · ${c.title}</button><p>${c.notes}</p></section>`).join('')}<h3>From Tower Bridge’s own history</h3><ul>${sources.map(([label,url])=>`<li><a href="${url}" target="_blank" rel="noreferrer">${label}</a></li>`).join('')}</ul><p class="disclosure">The construction sequence, surrounding buildings, ship and timing are illustrative, not a survey or a recreation of a particular voyage. Colours are approximate. The opening is accelerated to fit the story. Your guide’s voice and words are AI generated. Microphone audio and the current scene are shared with OpenAI only during your live session. No webcam or location is shared.</p></dialog>`;

const reduced = matchMedia('(prefers-reduced-motion: reduce)');
let animate=!reduced.matches, follow=true, active=0, ready=false, destroyed=false;
let renderer:T.WebGLRenderer|undefined, camera:T.PerspectiveCamera|undefined, controls:OrbitControls|undefined, world:ReturnType<typeof createBridgeWorld>|undefined;
let worldScene:T.Scene|undefined, outline:T.Box3Helper|undefined;
let selectedFeature:Feature|null=null, visualTime=duration-.2;
let demo:DemonstrationPlayback|null=null;
let cameraMove:{from:T.Vector3;to:T.Vector3;fromTarget:T.Vector3;target:T.Vector3;began:number}|null=null;
let checkpointRequest:((id:CheckpointId)=>void)|undefined;
function viewedTime(now=performance.now()) {
 if(demo){visualTime=demo.time(now);if(visualTime>=demo.end)demo=null;}
 return visualTime;
}
$('#motion').toggleAttribute('checked',animate); $<HTMLInputElement>('#motion').checked=animate;
let machinery:ReturnType<typeof createMachinery>|undefined;
const surface=$('#canvas');
const hotspotButtons=[...document.querySelectorAll<HTMLButtonElement>('.hotspot')];
let resizeObserver:ResizeObserver|undefined;
function show3DError(message:string){$('#hotspots').hidden=true;$('#motion').setAttribute('disabled','');surface.innerHTML=`<div class="webgl-error"><h2>The story is still here.</h2><p>${message} You can listen to all three chapters or read the story notes.</p></div>`;}
function applyCamera(time:number, explicit=false){
 if(!camera||!controls||(!follow&&!explicit))return;
 const pose=animate?cameraAt(time):poses[chapterAt(time)];
 const position=new T.Vector3(...pose.position),target=new T.Vector3(...pose.target);
 // Keep both towers and the suspension spans in frame at narrower widths.
 position.sub(target).multiplyScalar(Math.max(1,1.45/camera.aspect)).add(target);
 camera.position.copy(position);controls.target.copy(target);camera.fov=pose.fov+(camera.aspect<1?12:0);camera.updateProjectionMatrix();controls.update();
}
// Dragging keeps the visitor’s view; the next checkpoint or scene tool reframes it.
function setFollow(value:boolean){follow=value;if(value)applyCamera(viewedTime(),true);}
try {
 renderer=new T.WebGLRenderer({antialias:true,alpha:false,powerPreference:'high-performance'});renderer.setPixelRatio(Math.min(devicePixelRatio,1.75));renderer.setClearColor(0xe8e8de);renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.1;renderer.localClippingEnabled=true;renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFShadowMap;surface.append(renderer.domElement);
 const scene=new T.Scene();worldScene=scene;scene.fog=new T.Fog(0xe8e8de,320,850);
 camera=new T.PerspectiveCamera(40,1,.5,1000);
 scene.add(new T.HemisphereLight(0xe4eff1,0x7d7864,1.5));
 const sun=new T.DirectionalLight(0xffe4bb,2.8);sun.position.set(-100,135,65);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-180,right:180,top:140,bottom:-140,near:10,far:450});sun.shadow.normalBias=.25;sun.shadow.bias=-.0001;scene.add(sun);
 world=createBridgeWorld(scene);
 outline=new T.Box3Helper(new T.Box3(),0xb27c20);outline.visible=false;(outline.material as T.LineBasicMaterial).depthTest=false;outline.renderOrder=10;scene.add(outline);
 try{machinery=createMachinery($('#machinery-canvas'));}catch{ $('#machinery-canvas').innerHTML='<p>Steam pumps → Electric pumps</p>'; }
 controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=false;controls.enablePan=false;controls.minDistance=40;controls.maxDistance=420;controls.maxPolarAngle=Math.PI*.47;controls.minPolarAngle=.15;
 controls.addEventListener('start',()=>{cameraMove=null;setFollow(false);});
 resizeObserver=new ResizeObserver(()=>{if(!renderer||!camera)return;const {width,height}=surface.getBoundingClientRect();renderer.setSize(width,height);camera.aspect=width/height;camera.updateProjectionMatrix();if(follow)applyCamera(viewedTime(),true);});resizeObserver.observe(surface);
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
     world.anchors.slice(1).forEach((anchor,i)=>{vector.copy(anchor).project(camera!);const x=(vector.x*.5+.5)*w,y=(-vector.y*.5+.5)*h;
       const button=hotspotButtons[i];button.hidden=vector.z< -1||vector.z>1||x<24||x>w-24||y<110||y>h-24;
       button.style.left=`${x}px`;button.style.top=`${y}px`;
     });
   }
 });
 renderer.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();renderer?.setAnimationLoop(null);ready=false;show3DError('The 3D view lost its graphics connection. Reload to restore it.');});
 applyCamera(duration-.2,true);ready=true;
}catch(error){renderer?.dispose();renderer=undefined;show3DError('3D is unavailable in this browser.');console.warn('Tower Bridge 3D unavailable',error);}
function sync(){
 const state=sceneAt(viewedTime());$('#era').textContent=state.era;$('#era-detail').textContent=state.period;
 $('#scene-title').textContent=tourStops[active].title;$('#scene-cue').textContent=tourStops[active].detail;
 document.querySelectorAll<HTMLElement>('[data-checkpoint]').forEach(button=>{const selected=Number(button.dataset.checkpoint)===active;button.classList.toggle('active',selected);button.setAttribute('aria-current',selected?'step':'false');});
 document.dispatchEvent(new Event('tour:checkpoint'));
}
function selectCheckpoint(id:CheckpointId){
 active=checkpointIds.indexOf(id);demo=null;cameraMove=null;selectedFeature=null;if(outline)outline.visible=false;$('#machinery-panel').classList.remove('guide-highlight');
 // Construction waits at its opening frame until the guide starts the demonstration.
 // Showing its completed preset here would flash the towers before they are built.
 visualTime=[chapters[1].start,chapters[2].cues[5].start,duration-.2][active];
 setFollow(true);sync();
}
$<HTMLInputElement>('#motion').onchange=e=>{animate=(e.target as HTMLInputElement).checked;if(!animate)demo=null;setFollow(follow);};
document.querySelectorAll<HTMLElement>('[data-checkpoint]').forEach(button=>button.onclick=()=>{
 const id=checkpointIds[Number(button.dataset.checkpoint)];if(checkpointRequest)checkpointRequest(id);else selectCheckpoint(id);
 if($<HTMLDialogElement>('#transcript').open)$<HTMLDialogElement>('#transcript').close();
});
for(const id of ['read','read-top'])$('#'+id).onclick=()=>$<HTMLDialogElement>('#transcript').showModal();$('#close').onclick=()=>$<HTMLDialogElement>('#transcript').close();
reduced.addEventListener('change',()=>{animate=!reduced.matches;if(!animate)demo=null;$<HTMLInputElement>('#motion').checked=animate;setFollow(follow);});
setFollow(true);sync();
const featureViews:Record<Feature,{position:number[];target:number[];size:number[]}>= {
 bridge:{position:[162,102,220],target:[0,27,0],size:[250,75,40]},
 towers:{position:[32,65,105],target:[-39,39,0],size:[23,75,30]},
 walkways:{position:[40,65,98],target:[0,46,0],size:[64,8,20]},
 bascules:{position:[68,54,115],target:[0,17,0],size:[65,10,18]},
 machinery:{position:[108,65,160],target:[0,23,0],size:[1,1,1]},
};
function prepareFeatureView(feature:Feature){
 if(feature==='machinery'){demo=null;visualTime=chapters[3].cues[2].start;return;}
 // Preserve a running demonstration; restore missing geometry after an interrupted build.
 const state=sceneAt(viewedTime());
 if((!demo||demo.paused)&&state.chapter<2&&['bridge','walkways','bascules'].includes(feature)){
   demo=null;visualTime=chapters[2].start;
 }
}
export const tour:TourGuide={
 selectCheckpoint,
 onCheckpointRequest(callback){checkpointRequest=callback;},
 pauseScene(){viewedTime();demo?.pause(performance.now());cameraMove=null;},
 resumeScene(){demo?.resume(performance.now());},
 context(){const state=sceneAt(viewedTime());return {landmark:'Tower Bridge',checkpoint:checkpointIds[active],chapter:tourStops[active].title,viewedPeriod:state.era,viewedDetail:state.period,selectedFeature,camera:camera?.position.toArray()??null,target:controls?.target.toArray()??null,exploring:!follow,demonstration:demo?.name??null,graphicsAvailable:ready};},
 capture(){
   if(!renderer||!camera||!worldScene||!ready)return null;
   const currentTime=viewedTime();world?.update(animate?sceneAt(currentTime):stillAt(currentTime),!animate);
   renderer.render(worldScene,camera);
   const image=document.createElement('canvas'),source=renderer.domElement;
   const scale=Math.min(1,640/source.width);image.width=Math.round(source.width*scale);image.height=Math.round(source.height*scale);
   const ctx=image.getContext('2d');if(!ctx)return null;ctx.drawImage(source,0,0,image.width,image.height);
   const state=sceneAt(viewedTime());
   if(state.machinery){machinery?.update(viewedTime(),state.electric===1,!animate);const machine=$('#machinery-canvas').querySelector('canvas');if(machine){const w=image.width*.4,h=w*machine.height/machine.width;ctx.drawImage(machine,image.width-w,image.height-h,w,h);}}
   return image.toDataURL('image/jpeg',.45);
 },
 async focus(feature){
   if(!camera||!controls)return;
   setFollow(false);selectedFeature=feature;
   prepareFeatureView(feature);
   const view=featureViews[feature],target=new T.Vector3(...view.target),to=new T.Vector3(...view.position);
   if(camera.aspect<1)to.sub(target).multiplyScalar(1.35).add(target);
   camera.fov=42;camera.updateProjectionMatrix();
   cameraMove={from:camera.position.clone(),to,fromTarget:controls.target.clone(),target,began:performance.now()};
   if(!animate){camera.position.copy(to);controls.target.copy(target);controls.update();cameraMove=null;}
   tour.highlight(feature);$('#scene-cue').textContent=`Exploring ${feature}`;
   if(animate)await new Promise(resolve=>setTimeout(resolve,850));
 },
 highlight(feature){
   prepareFeatureView(feature);selectedFeature=feature;if(!outline)return;const view=featureViews[feature];
   outline.box.setFromCenterAndSize(new T.Vector3(...view.target),new T.Vector3(...view.size));outline.visible=feature!=='machinery';
   $('#machinery-panel').classList.toggle('guide-highlight',feature==='machinery');
 },
 demonstrate(name){
   setFollow(false);cameraMove=null;selectedFeature=null;if(outline)outline.visible=false;
   const index=name==='construction'?1:name==='bridge_opening'?2:3,c=chapters[index];
   const end=name==='power_change'?c.cues[3].start-.1:c.start+c.duration-.05;
   const start=name==='construction'?c.cues[1].start:c.start;
   demo=new DemonstrationPlayback(name,start,end,performance.now());visualTime=animate?start:(name==='bridge_opening'?c.cues[5].start:end);if(!animate)demo=null;
   applyCamera(c.start+4,true);$('#scene-cue').textContent=animate?'A closer look':'Still demonstration · reduced motion';
 },
};
// Read-only diagnostics for the demo's browser checks.
Object.assign(window,{__tower:()=>({ready,checkpoint:checkpointIds[active],follow,animate,scene:sceneAt(viewedTime()),selectedFeature,demonstration:demo?.name??null,camera:camera?.position.toArray(),lift:world?.leaves.map(x=>x.rotation.z),ship:world?.ship.position.toArray(),drawCalls:renderer?.info.render.calls})});
window.addEventListener('pagehide',()=>{destroyed=true;resizeObserver?.disconnect();controls?.dispose();world?.dispose();machinery?.dispose();renderer?.setAnimationLoop(null);renderer?.dispose();});
