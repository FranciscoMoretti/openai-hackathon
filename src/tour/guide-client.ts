import { executeGuideTool, type TourGuide } from './guide-contract';
import { checkpointIds, tourStops, type CheckpointId } from './tour-content';

export type GuideStatus = 'idle' | 'connecting' | 'listening' | 'thinking' | 'transitioning' | 'speaking' | 'paused' | 'error';
type Events = {
  status(status:GuideStatus,detail?:string):void;
  caption(text:string):void;
  mic(enabled:boolean):void;
  audioBlocked():void;
  progress(completed:ReadonlySet<CheckpointId>,guiding:boolean):void;
};
type Request = { kind:'tour'|'question'; checkpoint:number; epoch:number };

/** One Realtime conversation owns all narration, questions and scene tools. */
export class RealtimeGuide {
  private pc?:RTCPeerConnection;
  private channel?:RTCDataChannel;
  private stream?:MediaStream;
  private output?:HTMLAudioElement;
  private abort?:AbortController;
  private generation=0;
  private epoch=0;
  private running=false;
  private connecting=false;
  private responding=false;
  private toolsBusy=false;
  private outputPlaying=false;
  private userSpeaking=false;
  private soundBlocked=false;
  private responseId?:string;
  private responseEpoch=0;
  private request?:Request;
  private pending?:Request;
  private completedResponse?:{id:string;request:Request;hasAudio:boolean};
  private playbackEnded=new Set<string>();
  private snapshotId?:string;
  private captions=new Map<string,string>();
  private advanceTimer?:ReturnType<typeof setTimeout>;
  private idleTimer?:ReturnType<typeof setTimeout>;
  private connectTimer?:ReturnType<typeof setTimeout>;
  private nextCheckpoint=0;
  private completed=new Set<CheckpointId>();
  private introduced=false;
  private guiding=false;
  constructor(private tour:TourGuide,private events:Events){}
  get connected(){return this.channel?.readyState==='open';}
  get isActive(){return this.running||this.connecting;}
  get isGuiding(){return this.guiding;}
  get tourComplete(){return this.nextCheckpoint>=tourStops.length;}
  get microphoneOn(){return !!this.stream?.getAudioTracks().some(t=>t.enabled&&t.readyState==='live');}
  private state(status:GuideStatus,detail?:string){this.events.status(status,detail);}
  private send(event:object){if(this.connected)this.channel!.send(JSON.stringify(event));}
  private progress(guiding:boolean){this.guiding=guiding;this.events.progress(this.completed,guiding);}
  private keepAlive(){clearTimeout(this.idleTimer);this.idleTimer=setTimeout(()=>{this.stop();this.state('idle','The guide rested after two quiet minutes. Your checkpoint is saved.');},120_000);}

  async start(){
    if(this.connecting)return;
    if(this.connected){this.running=true;this.stream?.getAudioTracks().forEach(t=>t.enabled=true);this.events.mic(this.microphoneOn);this.keepAlive();if(this.tourComplete){this.progress(false);this.state('listening','We can keep talking. Ask anything you’re curious about.');}else this.narrate(this.nextCheckpoint);return;}
    if(this.tourComplete){this.nextCheckpoint=0;this.completed.clear();this.introduced=false;}
    this.stop();const generation=this.generation;this.running=true;this.connecting=true;this.state('connecting');
    this.abort=new AbortController();
    this.connectTimer=setTimeout(()=>{if(generation===this.generation)this.fail('Connecting took too long. Please try again.');},35_000);
    try {
      if(!navigator.mediaDevices?.getUserMedia||typeof RTCPeerConnection==='undefined')throw new Error('Live voice needs a browser with microphone support on localhost or HTTPS.');
      const stream=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true,autoGainControl:true}});
      if(generation!==this.generation){stream.getTracks().forEach(t=>t.stop());return;}
      this.stream=stream;this.events.mic(true);
      const pc=this.pc=new RTCPeerConnection();pc.addTrack(stream.getAudioTracks()[0],stream);
      this.output=document.createElement('audio');this.output.autoplay=true;
      pc.ontrack=event=>{if(generation!==this.generation||!this.output)return;this.output.srcObject=event.streams[0]??new MediaStream([event.track]);void this.enableSound();};
      pc.onconnectionstatechange=()=>{if(generation===this.generation&&['failed','disconnected'].includes(pc.connectionState))this.fail('The voice connection was lost. Reconnect to pick up at this checkpoint.');};
      const channel=this.channel=pc.createDataChannel('oai-events');
      channel.onmessage=event=>{if(generation!==this.generation)return;try{void this.handle(JSON.parse(event.data)).catch(()=>{if(generation===this.generation)this.fail('The guide lost its place. Reconnect to continue.');});}catch{/* Ignore non-JSON messages. */}};
      channel.onclose=()=>{if(generation===this.generation)this.fail('The connection ended. Your checkpoint is saved.');};
      const offer=await pc.createOffer();await pc.setLocalDescription(offer);
      const response=await fetch('/api/realtime/session',{method:'POST',headers:{'Content-Type':'application/sdp'},body:offer.sdp,signal:this.abort.signal});
      if(generation!==this.generation)return;
      if(!response.ok){const data=await response.json().catch(()=>({}));throw new Error(data.error||'Could not connect to your guide.');}
      await pc.setRemoteDescription({type:'answer',sdp:await response.text()});
      if(!this.connected)await new Promise<void>((resolve,reject)=>{
        const timer=setTimeout(()=>reject(new Error('The voice connection did not open. Please retry.')),12_000);
        channel.addEventListener('open',()=>{clearTimeout(timer);resolve();},{once:true});
        channel.addEventListener('close',()=>{clearTimeout(timer);reject(new Error('Connection closed.'));},{once:true});
      });
      if(generation!==this.generation)return;
      clearTimeout(this.connectTimer);this.connecting=false;this.keepAlive();this.narrate(this.nextCheckpoint);
    } catch(error){
      if(generation!==this.generation)return;
      this.fail(error instanceof DOMException&&['NotAllowedError','NotFoundError','NotReadableError'].includes(error.name)
        ?'Allow microphone access to start your voice tour. You can still explore every checkpoint and read the story.'
        :error instanceof Error?error.message:'Could not connect to your guide.');
    }
  }
  goToCheckpoint(id:CheckpointId){
    const index=checkpointIds.indexOf(id);this.nextCheckpoint=index;this.tour.selectCheckpoint(id);
    if(this.running&&this.connected)this.narrate(index);else if(!this.connecting){this.cancelTurn();this.state(this.connected?'paused':'idle');}
  }
  continueTour(){if(!this.connected||!this.running){void this.start();return;}this.narrate(this.nextCheckpoint);}
  private narrate(index:number){
    if(index>=tourStops.length){this.progress(false);this.state('listening','The tour is complete. Stay curious — ask me anything.');return;}
    this.cancelTurn();this.progress(true);this.nextCheckpoint=index;this.tour.selectCheckpoint(checkpointIds[index]);
    this.pending={kind:'tour',checkpoint:index,epoch:this.epoch};this.flush();
  }
  private narrationBrief(index:number){
    const stop=tourStops[index];
    const welcome=this.introduced?'You have already met this visitor. Do not repeat a welcome or the reminder that they can interrupt. If this stop was interrupted, use at most one sentence of recap, then finish its idea in fresh words.':'This is your first passage with this visitor. Welcome them briefly and mention once that they can interrupt.';
    this.introduced=true;
    return `Guide direction (not visitor speech): Narrate only stop ${index+1}/4: ${stop.title}. ${stop.direction} ${welcome} ${this.completed.has(stop.id)?'The visitor is revisiting this topic.':''} Use the conversation to avoid repeating what the visitor already heard, especially after an interruption. Speak about 55–80 words, then finish this passage. The app handles the transition after playback; do not call continue_tour yourself during this passage. Facts: ${stop.notes}`;
  }
  private sendView(){
    if(this.snapshotId)this.send({type:'conversation.item.delete',item_id:this.snapshotId});
    const context={...this.tour.context(),completedCheckpoints:[...this.completed],nextCheckpoint:checkpointIds[this.nextCheckpoint]??null,guidedNarration:this.guiding};
    const content:object[]=[{type:'input_text',text:`Private guide context, not visitor speech: ${JSON.stringify(context)}`}];
    const snapshot=this.tour.capture();if(snapshot)content.push({type:'input_image',image_url:snapshot});
    this.snapshotId=`view_${crypto.randomUUID().replaceAll('-','').slice(0,24)}`;
    this.send({type:'conversation.item.create',item:{id:this.snapshotId,type:'message',role:'user',content}});
  }
  private flush(){
    if(!this.pending||this.responding||this.toolsBusy||!this.running||!this.connected||this.userSpeaking)return;
    this.request=this.pending;this.pending=undefined;this.sendView();
    if(this.request.kind==='tour')this.send({type:'conversation.item.create',item:{type:'message',role:'system',content:[{type:'input_text',text:this.narrationBrief(this.request.checkpoint)}]}});
    else this.send({type:'conversation.item.create',item:{type:'message',role:'system',content:[{type:'input_text',text:'The visitor has spoken. Answer their latest spoken turn, not the previous narration brief. Follow their curiosity. Use continue_tour only when returning to the guided story is appropriate.'}]}});
    this.respond();
  }
  private respond(){
    if(!this.running||!this.connected||!this.request||this.request.epoch!==this.epoch||this.userSpeaking)return;
    this.responding=true;this.responseEpoch=this.epoch;this.completedResponse=undefined;
    this.send({type:'response.create'});this.state('thinking');this.keepAlive();
  }
  private cancelTurn(serverInterrupted=false){
    this.epoch++;clearTimeout(this.advanceTimer);this.pending=undefined;this.completedResponse=undefined;
    if(this.output)this.output.muted=true;
    if(this.responding&&!serverInterrupted)this.send({type:'response.cancel'});
    if(this.outputPlaying&&!serverInterrupted)this.send({type:'output_audio_buffer.clear'});
    this.outputPlaying=false;this.events.caption('');
  }
  private finishPlayback(){
    const done=this.completedResponse;
    if(!done||done.request.epoch!==this.epoch||!this.running||this.userSpeaking||this.soundBlocked)return;
    if(done.hasAudio&&!this.playbackEnded.has(done.id))return;
    this.completedResponse=undefined;this.keepAlive();
    if(done.request.kind==='tour'){
      this.completed.add(checkpointIds[done.request.checkpoint]);this.nextCheckpoint=done.request.checkpoint+1;
      this.progress(this.nextCheckpoint<tourStops.length);
      if(this.guiding){this.state('transitioning');const epoch=this.epoch;this.advanceTimer=setTimeout(()=>{if(this.running&&epoch===this.epoch&&!this.userSpeaking)this.narrate(this.nextCheckpoint);},2200);}
      else this.state('listening','The story is yours now. Ask anything you’re curious about.');
    } else this.state('listening');
  }
  private async handle(event:any){
    switch(event.type){
      case 'input_audio_buffer.speech_started':
        if(!this.running||!this.microphoneOn)return;
        this.userSpeaking=true;this.cancelTurn(true);this.progress(false);this.tour.pauseScene();this.keepAlive();this.state('listening','I’m listening…');break;
      case 'input_audio_buffer.committed':
        if(!this.running||!this.microphoneOn)return;
        this.userSpeaking=false;this.pending={kind:'question',checkpoint:this.nextCheckpoint,epoch:this.epoch};this.flush();break;
      case 'input_audio_buffer.speech_stopped':this.userSpeaking=false;break;
      case 'response.created':
        this.responseId=event.response.id;
        if(this.responseEpoch!==this.epoch||!this.running)this.send({type:'response.cancel'});
        break;
      case 'output_audio_buffer.started':
        if(!this.running||this.responseEpoch!==this.epoch)return;
        this.outputPlaying=true;if(this.output)this.output.muted=false;this.state('speaking');break;
      case 'output_audio_buffer.stopped':
        this.outputPlaying=false;if(event.response_id)this.playbackEnded.add(event.response_id);
        if(this.playbackEnded.size>50)this.playbackEnded.delete(this.playbackEnded.values().next().value!);
        this.finishPlayback();break;
      case 'output_audio_buffer.cleared':this.outputPlaying=false;break;
      case 'response.output_audio_transcript.delta':
        if(!this.running||this.responseEpoch!==this.epoch||event.response_id!==this.responseId)return;
        const text=(this.captions.get(event.item_id)??'')+event.delta;this.captions.set(event.item_id,text);this.events.caption(text);break;
      case 'response.done':{
        if(this.responseId&&event.response.id!==this.responseId)return;
        this.responding=false;this.responseId=undefined;
        if(!this.running||this.responseEpoch!==this.epoch){this.flush();return;}
        if(event.response.status!=='completed'){this.progress(false);this.state('listening',event.response.status==='failed'?'I couldn’t finish that thought. Say “carry on” to try again.':undefined);this.flush();return;}
        const request=this.request;if(!request)return;
        const calls=(event.response.output??[]).filter((item:any)=>item.type==='function_call');
        if(calls.length){
          this.toolsBusy=true;const generation=this.generation;
          try {
            let control:'continue'|'pause'|undefined;let checkpoint:CheckpointId|undefined;
            for(const call of calls){
              const current=this.running&&request.epoch===this.epoch;
              const result=current?await executeGuideTool(this.tour,call.name,call.arguments):{ok:false,error:'Visitor interrupted this action.'};
              if(generation!==this.generation)return;
              this.send({type:'conversation.item.create',item:{type:'function_call_output',call_id:call.call_id,output:JSON.stringify(result)}});
              if(result.ok&&'control' in result)control=result.control;
              if(result.ok&&'checkpoint' in result)checkpoint=result.checkpoint;
            }
            if(!this.running||request.epoch!==this.epoch)return;
            if(control==='pause'){this.pause();return;}
            if(checkpoint||control==='continue'){
              // A guide may continue after a question, but cannot recursively advance its own narration.
              if(request.kind==='question'||checkpoint){const index=checkpoint?checkpointIds.indexOf(checkpoint):this.nextCheckpoint;
                if(index<tourStops.length){this.nextCheckpoint=index;this.tour.selectCheckpoint(checkpointIds[index]);this.progress(true);this.request={kind:'tour',checkpoint:index,epoch:this.epoch};this.send({type:'conversation.item.create',item:{type:'message',role:'system',content:[{type:'input_text',text:this.narrationBrief(index)}]}});}
              }
            }
            this.sendView();this.respond();
          } finally {if(generation===this.generation){this.toolsBusy=false;this.flush();}}
        } else {
          const hasAudio=(event.response.output??[]).some((item:any)=>item.content?.some((c:any)=>c.type==='audio'||c.type==='output_audio'));
          this.completedResponse={id:event.response.id,request,hasAudio};this.finishPlayback();
        }
        break;
      }
      case 'error':
        if(['response_cancel_not_active','input_audio_buffer_commit_empty'].includes(event.error?.code))return;
        this.cancelTurn();this.responding=false;this.progress(false);this.state('listening','The guide missed that turn. Say “carry on” or try again.');break;
    }
  }
  toggleMic(){
    if(!this.running||!this.connected)return;
    const enabled=!this.microphoneOn;this.stream?.getAudioTracks().forEach(t=>t.enabled=enabled);
    if(!enabled){this.userSpeaking=false;this.send({type:'input_audio_buffer.clear'});}this.events.mic(enabled);
  }
  pause(){
    if(this.connecting){this.stop();this.state('paused');return;}
    this.running=false;this.cancelTurn();this.progress(false);this.userSpeaking=false;
    this.stream?.getAudioTracks().forEach(t=>t.enabled=false);this.events.mic(false);this.send({type:'input_audio_buffer.clear'});this.tour.pauseScene();this.state('paused');this.keepAlive();
  }
  async enableSound(){
    try{
      const wasBlocked=this.soundBlocked;await this.output?.play();this.soundBlocked=false;
      // The server may have drained audio the browser never played. Repeat that turn.
      if(wasBlocked&&this.running&&this.request){const request=this.request;this.cancelTurn();this.pending={...request,epoch:this.epoch};this.flush();}
      else this.finishPlayback();
    }
    catch{this.soundBlocked=true;this.events.audioBlocked();}
  }
  stop(){
    this.generation++;this.running=false;this.connecting=false;this.cancelTurn();this.progress(false);
    clearTimeout(this.connectTimer);clearTimeout(this.idleTimer);this.abort?.abort();
    this.stream?.getTracks().forEach(t=>t.stop());this.stream=undefined;
    this.channel?.close();this.pc?.close();this.channel=undefined;this.pc=undefined;
    if(this.output){this.output.pause();this.output.srcObject=null;}this.output=undefined;
    this.responding=false;this.toolsBusy=false;this.userSpeaking=false;this.soundBlocked=false;this.responseId=undefined;this.snapshotId=undefined;this.request=undefined;
    this.playbackEnded.clear();this.captions.clear();this.tour.pauseScene();this.events.mic(false);this.state('idle');
  }
  private fail(detail:string){this.stop();this.state('error',detail);}
}
