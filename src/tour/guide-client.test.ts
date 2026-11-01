import { afterEach, describe, expect, it, vi } from 'vitest';
import { LiveGuide } from './guide-client';
import { closingLines, type TourGuide } from './guide-contract';
import { checkpointIds, type CheckpointId } from './tour-content';
class Channel extends EventTarget {
 readyState='connecting';sent:any[]=[];onmessage?:(event:{data:string})=>void;onclose?:()=>void;
 send(raw:string){this.sent.push(JSON.parse(raw));}
 close(){this.readyState='closed';this.onclose?.();this.dispatchEvent(new Event('close'));}
 receive(event:object){const data=JSON.stringify(event);this.onmessage?.({data});this.dispatchEvent(new MessageEvent('message',{data}));}
}
const peers:Peer[]=[];
let autoStart=true;
let audioEnergy=0;
class Peer extends EventTarget {
 channel=new Channel();connectionState='new';iceGatheringState='complete';sctp={maxMessageSize:65536};localDescription?:{sdp:string};onconnectionstatechange?:()=>void;
 constructor(){super();peers.push(this);}addTrack(){}createDataChannel(){return this.channel;}
 async getStats(){return new Map([['audio',{type:'inbound-rtp',kind:'audio',totalAudioEnergy:audioEnergy}]]);}
 async createOffer(){return {type:'offer',sdp:'v=0\r\nm=audio'};}async setLocalDescription(offer:{sdp:string}){this.localDescription=offer;}
 async setRemoteDescription(){this.channel.readyState='open';this.channel.dispatchEvent(new Event('open'));if(autoStart)this.channel.receive({type:'session.started'});}close(){}
}
const clients:LiveGuide[]=[];
afterEach(()=>{clients.forEach(c=>c.stop());peers.forEach(p=>p.channel.receive({type:'session.closed'}));clients.length=0;peers.length=0;autoStart=true;audioEnergy=0;vi.unstubAllGlobals();vi.useRealTimers();});
function setup(media?:()=>Promise<unknown>){
 const track={enabled:true,readyState:'live',stop:vi.fn()};const stream={getTracks:()=>[track],getAudioTracks:()=>[track]};
 vi.stubGlobal('RTCPeerConnection',Peer);vi.stubGlobal('navigator',{mediaDevices:{getUserMedia:vi.fn(media??(async()=>stream))}});
 const output={autoplay:false,muted:false,srcObject:null,play:vi.fn(async()=>{}),pause:vi.fn()};vi.stubGlobal('document',{createElement:()=>output});
 const fetcher=vi.fn(async(_url:string,_init?:RequestInit)=>Response.json({session:{id:'live_test'},transport:{sdp:'v=0\r\nanswer'}}));vi.stubGlobal('fetch',fetcher);
 let checkpoint:CheckpointId='construction';
 const tour:TourGuide={selectCheckpoint:vi.fn((id:CheckpointId)=>{checkpoint=id;}),onCheckpointRequest:vi.fn(),pauseScene:vi.fn(),resumeScene:vi.fn(),focus:vi.fn(),highlight:vi.fn(),demonstrate:vi.fn(),capture:vi.fn(()=>null),context:()=>({landmark:'Tower Bridge',checkpoint,chapter:checkpoint,viewedPeriod:'Today',viewedDetail:'The bridge',selectedFeature:null,camera:null,target:null,exploring:false,demonstration:null,graphicsAvailable:true})};
 const events={status:vi.fn(),caption:vi.fn(),mic:vi.fn(),audioBlocked:vi.fn(),progress:vi.fn()};
 const client=new LiveGuide(tour,events);clients.push(client);return {client,tour,events,track,stream,fetcher,output};
}
function backend(c:Channel,event:object,id='delegation_one'){c.receive({type:'response.event',delegation_id:id,event});}
function created(c:Channel,id='delegation_one'){backend(c,{type:'response.created',response:{id:'response_'+id}},id);}
function tool(c:Channel,name:string,args:object={},id='delegation_one',callId='call_one'){backend(c,{type:'response.output_item.done',item:{type:'function_call',call_id:callId,name,arguments:JSON.stringify(args)}},id);}
const tick=async()=>{await new Promise(r=>setTimeout(r,0));};
const spoken=(c:Channel)=>c.receive({type:'session.output_transcript.delta',delta:'Tower Bridge connects the banks of the Thames. Before it was built, tall ships needed access to the busy docks, while road traffic needed a way across.',start_ms:0,end_ms:5000});
describe('GPT-Live private guide',()=>{
 it('waits for session.started, then speaks first at the selected checkpoint',async()=>{
  autoStart=false;const {client,fetcher}=setup();client.goToCheckpoint('opening');const pending=client.start();
  await vi.waitFor(()=>expect(peers[0].channel.readyState).toBe('open'));
  expect(peers[0].channel.sent).toEqual([]);expect(client.connected).toBe(false);
  peers[0].channel.receive({type:'session.started'});await pending;
  expect(fetcher.mock.calls[0][0]).toContain('checkpoint=opening');
  expect(peers[0].channel.sent.some(x=>x.type==='session.commentary.append'&&x.content.includes('Make way for the river'))).toBe(true);
  expect(peers[0].channel.sent.some(x=>x.type==='session.start'||x.type==='response.create')).toBe(false);
 });
 it('does not infer checkpoint completion from transcript gaps or backend completion',async()=>{
  vi.useFakeTimers();const {client,tour}=setup();await client.start();const c=peers[0].channel;spoken(c);created(c);backend(c,{type:'response.completed',response:{output:[]}});await vi.advanceTimersByTimeAsync(10000);
  expect(tour.context().checkpoint).toBe('construction');expect(client.tourComplete).toBe(false);
 });
 it('repairs missing closing wording directly, and cancels recovery when the visitor interrupts',async()=>{
  vi.useFakeTimers();const {client,tour}=setup();await client.start();const c=peers[0].channel;spoken(c);
  await vi.advanceTimersByTimeAsync(8501);
  const prompts=()=>c.sent.filter(x=>x.type==='session.instructions.append');
  expect(prompts().at(-1).content).toContain('final sentence');
  expect(c.sent.filter(x=>x.type==='response.create')).toHaveLength(0);
  expect(tour.context().checkpoint).toBe('construction');
  c.receive({type:'session.input_transcript.delta',delta:'Wait',start_ms:6000,end_ms:6400});
  const before=prompts().length;await vi.advanceTimersByTimeAsync(10000);expect(prompts()).toHaveLength(before);
 });
 it('advances a completed muted passage promptly after audio drains, without a backend round trip',async()=>{
  vi.useFakeTimers();const {client,tour}=setup();await client.start();client.toggleMic();const c=peers[0].channel;
  spoken(c);c.receive({type:'session.output_transcript.delta',delta:' Victorian steel, dressed in stone.',start_ms:5000,end_ms:7000});
  audioEnergy=0.2;await vi.advanceTimersByTimeAsync(2000);
  expect(tour.context().checkpoint).toBe('opening');
  expect(c.sent.filter(x=>x.type==='response.create')).toHaveLength(0);
  expect(client.microphoneOn).toBe(false);
 });
 it('keeps an uninterrupted muted tour moving after more than two backend reviews',async()=>{
  vi.useFakeTimers();const {client}=setup();await client.start();client.toggleMic();const c=peers[0].channel;spoken(c);
  for(let i=0;i<3;i++){
   await vi.advanceTimersByTimeAsync(6501);created(c,`review_${i}`);
   backend(c,{type:'response.completed',response:{id:`response_review_${i}`,output:[]}},`review_${i}`);
  }
  expect(client.microphoneOn).toBe(false);
  expect(client.isGuiding).toBe(true);
 });
 it('runs exactly three stops, including a short intro, and remains conversational after the final stop',async()=>{
  vi.useFakeTimers();const {client,tour}=setup();await client.start();client.toggleMic();const c=peers[0].channel;
  expect(checkpointIds).toEqual(['construction','opening','legacy']);
  for(const checkpoint of checkpointIds){
   expect(tour.context().checkpoint).toBe(checkpoint);
   c.receive({type:'session.output_transcript.delta',delta:closingLines[checkpoint],start_ms:0,end_ms:3000});
   audioEnergy+=.2;await vi.advanceTimersByTimeAsync(1600);
  }
  expect(client.tourComplete).toBe(true);expect(client.isGuiding).toBe(false);
  expect(tour.selectCheckpoint).toHaveBeenCalledTimes(3);
  expect(tour.demonstrate).toHaveBeenNthCalledWith(1,'construction');
  expect(tour.demonstrate).toHaveBeenNthCalledWith(2,'bridge_opening');
  expect(tour.demonstrate).toHaveBeenNthCalledWith(3,'power_change');
  expect(c.sent.filter(x=>x.type==='response.create')).toHaveLength(0);
 });
 it('resumes the paused scene when the guide answers an interruption',async()=>{
  const {client,tour}=setup();await client.start();const c=peers[0].channel;spoken(c);
  c.receive({type:'session.input_transcript.delta',delta:'What are the towers made of?',start_ms:6000,end_ms:7000});
  expect(tour.pauseScene).toHaveBeenCalled();vi.mocked(tour.resumeScene).mockClear();
  spoken(c);expect(tour.resumeScene).toHaveBeenCalledOnce();expect(client.isGuiding).toBe(false);
 });
 it('closes the transport after the grace period if finalization never arrives',async()=>{
  vi.useFakeTimers();const {client,track}=setup();await client.start();const c=peers[0].channel;client.stop();expect(track.stop).toHaveBeenCalledOnce();expect(c.readyState).toBe('open');await vi.advanceTimersByTimeAsync(8000);expect(c.readyState).toBe('closed');
 });
 it('executes completed tool items even when the backend completion output is empty',async()=>{
  const {client,tour}=setup();await client.start();const c=peers[0].channel;created(c);tool(c,'focus_feature',{feature:'walkways'});backend(c,{type:'response.completed',response:{output:[]}});await tick();
  expect(tour.focus).toHaveBeenCalledWith('walkways');expect(c.sent.filter(x=>x.type==='response.item.create').some(x=>x.item.output?.includes('narrationBrief'))).toBe(false);expect(c.sent.some(x=>x.type==='response.item.create'&&x.item.call_id==='call_one')).toBe(true);expect(c.sent.at(-1).type).toBe('response.create');
  tool(c,'focus_feature',{feature:'walkways'});await tick();expect(tour.focus).toHaveBeenCalledOnce();
 });
 it('waits for audio to drain even after captions contain the closing sentence',async()=>{
  vi.useFakeTimers();const {client,tour}=setup();await client.start();const c=peers[0].channel;spoken(c);
  c.receive({type:'session.output_transcript.delta',delta:' Victorian steel, dressed in stone.',start_ms:5000,end_ms:7000});
  for(let i=0;i<5;i++){audioEnergy+=0.1;await vi.advanceTimersByTimeAsync(500);}
  expect(tour.context().checkpoint).toBe('construction');await vi.advanceTimersByTimeAsync(1200);expect(tour.context().checkpoint).toBe('opening');
 });
 it('invalidates backend actions when the visitor interrupts and keeps the stop unfinished',async()=>{
  const {client,tour}=setup();await client.start();const c=peers[0].channel;created(c);spoken(c);
  c.receive({type:'session.input_transcript.delta',delta:'Wait',start_ms:3000,end_ms:3400});tool(c,'play_animation',{animation:'construction'});await tick();
  expect(tour.demonstrate).toHaveBeenCalledTimes(1);expect(client.isGuiding).toBe(false);expect(tour.context().checkpoint).toBe('construction');expect(c.sent.some(x=>x.type==='session.instructions.append'&&x.content.includes('closing sentence'))).toBe(true);
 });
 it('sends images only to the Responses backend and respects the data channel limit',async()=>{
  const {client,tour}=setup();vi.mocked(tour.capture).mockReturnValue('data:image/jpeg;base64,abc');await client.start();const c=peers[0].channel;created(c);tool(c,'get_current_view');await tick();
  expect(c.sent.some(x=>x.type==='response.item.create'&&x.item.content?.some((p:any)=>p.type==='input_image'))).toBe(true);
  vi.mocked(tour.capture).mockReturnValue('data:image/jpeg;base64,'+'a'.repeat(70000));created(c,'large');tool(c,'get_current_view',{},'large','large');await tick();
  expect(c.sent.every(x=>new TextEncoder().encode(JSON.stringify(x)).length<=65536)).toBe(true);
  expect(c.sent.some(x=>x.item?.content?.some((p:any)=>p.text?.includes('exceeded the transport limit')))).toBe(true);
 });
 it('releases a late microphone grant after cancellation without starting a session',async()=>{
  let resolve!:(s:unknown)=>void;const pending=new Promise(r=>resolve=r);const {client,stream,track,fetcher}=setup(()=>pending);const start=client.start();client.pause();resolve(stream);await start;expect(track.stop).toHaveBeenCalledOnce();expect(fetcher).not.toHaveBeenCalled();
 });
 it('pause releases local audio immediately and requests graceful close; resume keeps the checkpoint',async()=>{
  const {client,track,output,tour}=setup();client.goToCheckpoint('opening');await client.start();const c=peers[0].channel;client.pause();
  expect(track.stop).toHaveBeenCalledOnce();expect(output.pause).toHaveBeenCalled();expect(c.sent.at(-1).type).toBe('session.close');expect(c.readyState).toBe('open');
  c.receive({type:'session.closed'});expect(c.readyState).toBe('closed');await client.start();expect(tour.context().checkpoint).toBe('opening');expect(peers).toHaveLength(2);
 });
 it('a checkpoint tap supersedes pending actions in the same continuous session',async()=>{
  const {client,tour}=setup();await client.start();const c=peers[0].channel;created(c);client.goToCheckpoint('legacy');tool(c,'visit_checkpoint',{checkpoint:'construction'});await tick();
  expect(tour.context().checkpoint).toBe('legacy');expect(peers).toHaveLength(1);expect(c.sent.some(x=>x.type==='session.instructions.append'&&x.content.includes('legacy'))).toBe(true);
 });
 it('final completion stays conversational and does not restart when resumed from pause',async()=>{
  vi.useFakeTimers();const {client}=setup();client.goToCheckpoint('legacy');await client.start();const c=peers[0].channel;spoken(c);
  c.receive({type:'session.output_transcript.delta',delta:' The river still has the right of way.',start_ms:5000,end_ms:7000});
  audioEnergy=0.2;await vi.advanceTimersByTimeAsync(1600);expect(client.tourComplete).toBe(true);expect(client.isGuiding).toBe(false);
  client.pause();await client.start();expect(client.tourComplete).toBe(true);client.stop();await client.start();expect(client.tourComplete).toBe(false);
 });
 it('closes on backend validation failure without exposing upstream messages',async()=>{
  const {client,events,track}=setup();await client.start();peers[0].channel.receive({type:'error',error:{code:'responses_validation_failed',message:'sensitive'}});
  expect(track.stop).toHaveBeenCalledOnce();expect(events.status).toHaveBeenLastCalledWith('error',expect.stringContaining('backend is unavailable'));expect(events.status.mock.calls.flat().join(' ')).not.toContain('sensitive');
 });
 it('reports microphone denial before creating a paid session',async()=>{
  const {client,fetcher,events}=setup(async()=>{throw new DOMException('Denied','NotAllowedError');});await client.start();expect(fetcher).not.toHaveBeenCalled();expect(events.status).toHaveBeenLastCalledWith('error',expect.stringContaining('Allow microphone'));
 });
});
