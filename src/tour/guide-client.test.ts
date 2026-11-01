import { afterEach, describe, expect, it, vi } from 'vitest';
import { RealtimeGuide } from './guide-client';
import type { TourGuide } from './guide-contract';
import type { CheckpointId } from './tour-content';
class Channel extends EventTarget {
 readyState='connecting';sent:any[]=[];onmessage?:(event:{data:string})=>void;onclose?:()=>void;
 send(raw:string){this.sent.push(JSON.parse(raw));}
 close(){this.readyState='closed';this.onclose?.();this.dispatchEvent(new Event('close'));}
 receive(event:object){this.onmessage?.({data:JSON.stringify(event)});}
}
const peers:Peer[]=[];
class Peer {
 channel=new Channel();connectionState='new';onconnectionstatechange?:()=>void;
 constructor(){peers.push(this);}addTrack(){}createDataChannel(){return this.channel;}
 async createOffer(){return {type:'offer',sdp:'v=0\r\nm=audio'};}async setLocalDescription(){}
 async setRemoteDescription(){this.channel.readyState='open';this.channel.dispatchEvent(new Event('open'));}close(){}
}
const clients:RealtimeGuide[]=[];
afterEach(()=>{clients.forEach(c=>c.stop());clients.length=0;peers.length=0;vi.unstubAllGlobals();vi.useRealTimers();});
function setup(media?:()=>Promise<unknown>){
 const track={enabled:true,readyState:'live',stop:vi.fn()};const stream={getTracks:()=>[track],getAudioTracks:()=>[track]};
 vi.stubGlobal('RTCPeerConnection',Peer);vi.stubGlobal('navigator',{mediaDevices:{getUserMedia:vi.fn(media??(async()=>stream))}});
 const output={autoplay:false,muted:false,srcObject:null,play:vi.fn(async()=>{}),pause:vi.fn()};vi.stubGlobal('document',{createElement:()=>output});
 const fetcher=vi.fn(async()=>new Response('v=0\r\nanswer'));vi.stubGlobal('fetch',fetcher);
 let checkpoint:CheckpointId='river';
 const tour:TourGuide={selectCheckpoint:vi.fn((id:CheckpointId)=>{checkpoint=id;}),onCheckpointRequest:vi.fn(),pauseScene:vi.fn(),focus:vi.fn(),highlight:vi.fn(),demonstrate:vi.fn(),capture:()=>null,context:()=>({landmark:'Tower Bridge',checkpoint,chapter:checkpoint,viewedPeriod:'Today',viewedDetail:'The bridge',selectedFeature:null,camera:null,target:null,exploring:false,demonstration:null,graphicsAvailable:true})};
 const events={status:vi.fn(),caption:vi.fn(),mic:vi.fn(),audioBlocked:vi.fn(),progress:vi.fn()};
 const client=new RealtimeGuide(tour,events);clients.push(client);return {client,tour,events,track,stream,fetcher,output};
}
function created(channel:Channel,id='one'){channel.receive({type:'response.created',response:{id}});}
function done(channel:Channel,id='one',output:any[]=[{type:'message',content:[{type:'audio'}]}],status='completed'){channel.receive({type:'response.done',response:{id,status,output}});}
const count=(channel:Channel)=>channel.sent.filter(x=>x.type==='response.create').length;
describe('one live voice tour',()=>{
 it('starts narrating the selected stop with a microphone, without a typed prompt',async()=>{
  const {client,tour}=setup();client.goToCheckpoint('opening');await client.start();expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalledOnce();expect(tour.context().checkpoint).toBe('opening');expect(count(peers[0].channel)).toBe(1);expect(peers[0].channel.sent.some(x=>x.item?.content?.some((c:any)=>c.text?.includes('Narrate only stop 3/4')))).toBe(true);
 });
 it('advances only after spoken audio finishes, not when generation finishes',async()=>{
  vi.useFakeTimers();const {client,tour}=setup();await client.start();const channel=peers[0].channel;created(channel);done(channel);await vi.advanceTimersByTimeAsync(5000);expect(count(channel)).toBe(1);
  channel.receive({type:'output_audio_buffer.stopped',response_id:'one'});await vi.advanceTimersByTimeAsync(2201);expect(count(channel)).toBe(2);expect(tour.context().checkpoint).toBe('construction');
 });
 it('reports a transition instead of listening between automatic checkpoints',async()=>{
  vi.useFakeTimers();const {client,events}=setup();await client.start();const c=peers[0].channel;
  created(c);c.receive({type:'output_audio_buffer.started',response_id:'one'});done(c);
  events.status.mockClear();c.receive({type:'output_audio_buffer.stopped',response_id:'one'});
  expect(events.status).toHaveBeenLastCalledWith('transitioning',undefined);
  expect(events.status.mock.calls.some(([status])=>status==='listening')).toBe(false);
  await vi.advanceTimersByTimeAsync(2199);expect(count(c)).toBe(1);
  expect(events.status).toHaveBeenLastCalledWith('transitioning',undefined);
  await vi.advanceTimersByTimeAsync(1);expect(count(c)).toBe(2);
  expect(events.status).toHaveBeenLastCalledWith('thinking',undefined);
 });
 it('keeps an interrupted stop unfinished and answers before moving on',async()=>{
  vi.useFakeTimers();const {client,tour,output}=setup();await client.start();const c=peers[0].channel;created(c);c.receive({type:'output_audio_buffer.started',response_id:'one'});
  c.receive({type:'input_audio_buffer.speech_started'});expect(output.muted).toBe(true);c.receive({type:'input_audio_buffer.committed'});expect(count(c)).toBe(1);
  done(c,'one',[],'cancelled');expect(count(c)).toBe(2);created(c,'two');done(c,'two');c.receive({type:'output_audio_buffer.stopped',response_id:'two'});await vi.advanceTimersByTimeAsync(5000);
  expect(count(c)).toBe(2);expect(tour.context().checkpoint).toBe('river');expect(client.isGuiding).toBe(false);
 });
 it('cancels a between-stop transition when the visitor speaks',async()=>{
  vi.useFakeTimers();const {client,tour,events}=setup();await client.start();const c=peers[0].channel;created(c);done(c);c.receive({type:'output_audio_buffer.stopped',response_id:'one'});c.receive({type:'input_audio_buffer.speech_started'});expect(events.status).toHaveBeenLastCalledWith('listening','I’m listening…');await vi.advanceTimersByTimeAsync(3000);expect(count(c)).toBe(1);expect(tour.context().checkpoint).toBe('river');
 });
 it('releases a late microphone grant after cancelling connection',async()=>{
  let resolve!:(s:unknown)=>void;const pending=new Promise(r=>resolve=r);const {client,stream,track,fetcher}=setup(()=>pending);const start=client.start();client.pause();resolve(stream);await start;expect(track.stop).toHaveBeenCalledOnce();expect(fetcher).not.toHaveBeenCalled();expect(client.isActive).toBe(false);
 });
 it('pauses speech and microphone, ignores late tools, and resumes the same stop',async()=>{
  const {client,tour,track}=setup();await client.start();const c=peers[0].channel;created(c);c.receive({type:'output_audio_buffer.started',response_id:'one'});client.pause();expect(track.enabled).toBe(false);expect(c.sent.some(x=>x.type==='output_audio_buffer.clear')).toBe(true);
  done(c,'one',[{type:'function_call',name:'play_animation',arguments:'{"animation":"construction"}',call_id:'late'}]);expect(tour.demonstrate).not.toHaveBeenCalled();await client.start();expect(track.enabled).toBe(true);expect(tour.context().checkpoint).toBe('river');expect(count(c)).toBe(2);
 });
 it('a checkpoint tap interrupts the current voice and selects a new topic',async()=>{
  const {client,tour}=setup();await client.start();const c=peers[0].channel;created(c);client.goToCheckpoint('legacy');expect(tour.context().checkpoint).toBe('legacy');expect(count(c)).toBe(1);done(c,'one',[],'cancelled');expect(count(c)).toBe(2);
 });
 it('voice navigation continues the same conversation and leaves the microphone enabled',async()=>{
  const {client,tour,track}=setup();await client.start();const c=peers[0].channel;created(c);c.receive({type:'input_audio_buffer.speech_started'});c.receive({type:'input_audio_buffer.committed'});done(c,'one',[],'cancelled');created(c,'two');done(c,'two',[{type:'function_call',name:'visit_checkpoint',arguments:'{"checkpoint":"opening"}',call_id:'jump'}]);
  await vi.waitFor(()=>expect(tour.context().checkpoint).toBe('opening'));expect(track.enabled).toBe(true);expect(count(c)).toBe(3);expect(peers).toHaveLength(1);
 });
 it('does not restart after the last stop and releases tracks on end',async()=>{
  vi.useFakeTimers();const {client,track,events}=setup();client.goToCheckpoint('legacy');await client.start();const c=peers[0].channel;created(c);done(c);c.receive({type:'output_audio_buffer.stopped',response_id:'one'});await vi.advanceTimersByTimeAsync(4000);expect(count(c)).toBe(1);expect(client.isGuiding).toBe(false);expect(events.status).toHaveBeenLastCalledWith('listening',expect.any(String));client.stop();expect(track.stop).toHaveBeenCalledOnce();
 });
 it('reports denied microphone access without creating a session',async()=>{
  const {client,fetcher,events}=setup(async()=>{throw new DOMException('Denied','NotAllowedError');});await client.start();expect(fetcher).not.toHaveBeenCalled();expect(events.status).toHaveBeenLastCalledWith('error',expect.stringContaining('Allow microphone'));
 });
 it('keeps a completed tour conversational, and starts fresh only after ending it',async()=>{
  const {client,tour}=setup();client.goToCheckpoint('legacy');await client.start();const c=peers[0].channel;created(c);done(c);c.receive({type:'output_audio_buffer.stopped',response_id:'one'});
  expect(client.tourComplete).toBe(true);client.pause();await client.start();expect(count(c)).toBe(1);expect(client.microphoneOn).toBe(true);
  client.stop();await client.start();expect(client.tourComplete).toBe(false);expect(tour.context().checkpoint).toBe('river');
 });
 it('repeats missed audio after the visitor enables blocked sound',async()=>{
  vi.useFakeTimers();const {client,output,tour}=setup();await client.start();const c=peers[0].channel;created(c);output.play.mockRejectedValueOnce(new Error('Autoplay blocked'));await client.enableSound();done(c);c.receive({type:'output_audio_buffer.stopped',response_id:'one'});await vi.advanceTimersByTimeAsync(3000);expect(count(c)).toBe(1);
  await client.enableSound();expect(count(c)).toBe(2);expect(tour.context().checkpoint).toBe('river');
 });
});
