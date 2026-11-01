import { executeGuideTool, type TourGuide } from './guide-contract';

export type GuideStatus = 'idle' | 'connecting' | 'listening' | 'thinking' | 'speaking' | 'paused' | 'error';
export type GuideMessage = { id: string; role: 'user' | 'assistant' | 'action'; text: string };
type Events = { status: (status: GuideStatus, detail?: string) => void; message: (message: GuideMessage) => void; mic: (enabled: boolean) => void; audioBlocked: () => void; snapshot: () => void };

/** One conversation owns one peer, one audio output and at most one microphone stream. */
export class RealtimeGuide {
  private pc?: RTCPeerConnection;
  private channel?: RTCDataChannel;
  private stream?: MediaStream;
  private sender?: RTCRtpSender;
  private output?: HTMLAudioElement;
  private abort?: AbortController;
  private generation = 0;
  private turn = 0;
  private active = false;
  private responding = false;
  private outputPlaying = false;
  private queuedAnswer = false;
  private currentResponse?: string;
  private snapshotId?: string;
  private transcript = new Map<string, string>();
  private timeout?: ReturnType<typeof setTimeout>;
  private idleTimeout?: ReturnType<typeof setTimeout>;
  private status: GuideStatus = 'idle';
  constructor(private tour: TourGuide, private events: Events) {}

  get connected() { return this.channel?.readyState === 'open'; }
  get microphoneOn() { return !!this.stream?.getAudioTracks().some(t => t.enabled && t.readyState === 'live'); }
  get isActive() { return this.active; }
  private state(value: GuideStatus, detail?: string) { this.status = value; this.events.status(value, detail); }
  private send(event: object) {
    if (!this.connected) return;
    this.channel!.send(JSON.stringify(event));
  }
  private keepAlive() {
    clearTimeout(this.idleTimeout);
    this.idleTimeout = setTimeout(() => { this.stop(); this.state('idle', 'Session ended after two quiet minutes. Your tour position is saved.'); }, 120_000);
  }
  private async microphone(generation: number) {
    if (this.stream?.getAudioTracks().some(t => t.readyState === 'live')) return;
    if (!navigator.mediaDevices?.getUserMedia) throw new Error('Microphone access needs localhost or HTTPS. You can still type a question.');
    const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } });
    if (generation !== this.generation) { stream.getTracks().forEach(t => t.stop()); return; }
    this.stream = stream;
    await this.sender?.replaceTrack(stream.getAudioTracks()[0]);
    this.events.mic(true);
  }
  async start(withMicrophone: boolean) {
    this.tour.pause();
    if (this.connected) {
      this.active = true;
      try { if (withMicrophone) await this.microphone(this.generation); }
      catch { this.state('listening', 'Microphone unavailable. You can type your questions below.'); return; }
      this.stream?.getAudioTracks().forEach(t => t.enabled = withMicrophone);
      this.events.mic(this.microphoneOn); this.state('listening'); this.keepAlive(); return;
    }
    if (this.status === 'connecting') return;
    this.stop();
    const generation = this.generation;
    this.active = true; this.state('connecting'); this.abort = new AbortController();
    try {
      if (typeof RTCPeerConnection === 'undefined') throw new Error('This browser does not support live audio. The recorded tour remains available.');
      const pc = this.pc = new RTCPeerConnection();
      this.sender = pc.addTransceiver('audio', { direction: 'sendrecv' }).sender;
      this.output = document.createElement('audio'); this.output.autoplay = true;
      pc.ontrack = event => {
        if (!this.output || generation !== this.generation) return;
        this.output.srcObject = event.streams[0] ?? new MediaStream([event.track]);
        void this.output.play().catch(() => this.events.audioBlocked());
      };
      pc.onconnectionstatechange = () => {
        if (generation !== this.generation) return;
        if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') this.fail('The voice connection was lost. Your tour is saved; reconnect to keep chatting.');
      };
      const channel = this.channel = pc.createDataChannel('oai-events');
      channel.onmessage = event => {
        if (generation !== this.generation) return;
        try { void this.handle(JSON.parse(event.data)).catch(() => this.fail('The guide could not finish that action. Please reconnect.')); }
        catch { /* Ignore non-JSON transport messages. */ }
      };
      channel.onclose = () => { if (generation === this.generation) this.fail('The guide session ended. You can reconnect or continue the tour.'); };
      channel.onopen = () => {
        if (generation !== this.generation) return;
        clearTimeout(this.timeout); this.state('listening'); this.keepAlive(); this.sendView(false);
      };
      this.timeout = setTimeout(() => { if (generation === this.generation) this.fail('Connecting took too long. Check your network and try again.'); }, 35_000);
      if (withMicrophone) await this.microphone(generation);
      if (generation !== this.generation) return;
      const offer = await pc.createOffer(); await pc.setLocalDescription(offer);
      const response = await fetch('/api/realtime/session', { method: 'POST', headers: { 'Content-Type': 'application/sdp' }, body: offer.sdp, signal: this.abort.signal });
      if (generation !== this.generation) return;
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || 'Could not start the guide. Check the server and retry.');
      }
      await pc.setRemoteDescription({ type: 'answer', sdp: await response.text() });
      if (!this.connected) await new Promise<void>((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error('The audio connection did not open. Please retry.')), 10_000);
        channel.addEventListener('open', () => { clearTimeout(timer); resolve(); }, { once: true });
        channel.addEventListener('close', () => { clearTimeout(timer); reject(new Error('The audio connection closed.')); }, { once: true });
      });
    } catch (error) {
      if (generation !== this.generation) return;
      const detail = error instanceof DOMException && ['NotAllowedError', 'NotFoundError', 'NotReadableError'].includes(error.name)
        ? 'Microphone unavailable. Allow it in your browser, or use a typed question.'
        : error instanceof Error ? error.message : 'Could not connect to the guide.';
      this.fail(detail);
    }
  }
  async ask(text: string) {
    const question = text.trim().slice(0, 2000); if (!question) return false;
    await this.start(false);
    if (!this.connected || !this.active) return false;
    this.turn++; this.keepAlive();
    this.events.message({ id: crypto.randomUUID(), role: 'user', text: question });
    this.interrupt(); this.sendView(true);
    this.send({ type: 'conversation.item.create', item: { type: 'message', role: 'user', content: [{ type: 'input_text', text: question }] } });
    this.answer(); return true;
  }
  private sendView(image: boolean) {
    if (!this.connected) return;
    if (this.snapshotId) this.send({ type: 'conversation.item.delete', item_id: this.snapshotId });
    const content: object[] = [{ type: 'input_text', text: `Current app scene (context, not a new question): ${JSON.stringify(this.tour.context())}` }];
    const snapshot = image ? this.tour.capture() : null;
    if (snapshot) { content.push({ type: 'input_image', image_url: snapshot }); this.events.snapshot(); }
    this.snapshotId = `view_${crypto.randomUUID().replaceAll('-', '').slice(0, 24)}`;
    this.send({ type: 'conversation.item.create', item: { id: this.snapshotId, type: 'message', role: 'user', content } });
  }
  private interrupt() {
    if (this.responding) this.send({ type: 'response.cancel' });
    if (this.outputPlaying) this.send({ type: 'output_audio_buffer.clear' });
    this.outputPlaying = false;
  }
  private answer() {
    if (!this.active) return;
    if (this.responding) { this.queuedAnswer = true; return; }
    this.responding = true; this.queuedAnswer = false;
    this.send({ type: 'response.create' }); this.state('thinking');
  }
  // API events are untrusted data; arguments go through the fixed tool allowlist.
  private async handle(event: any) {
    switch (event.type) {
      case 'input_audio_buffer.speech_started':
        if (!this.active || !this.microphoneOn) return;
        this.turn++; this.interrupt(); this.keepAlive(); this.state('listening', 'Listening to your question…'); break;
      case 'input_audio_buffer.committed':
        if (!this.active || !this.microphoneOn) return;
        this.events.message({ id: event.item_id, role: 'user', text: 'Voice question' });
        this.sendView(true); this.answer(); break;
      case 'conversation.item.input_audio_transcription.completed':
        this.events.message({ id: event.item_id, role: 'user', text: event.transcript }); break;
      case 'response.created': this.currentResponse = event.response.id; this.responding = true; break;
      case 'output_audio_buffer.started': this.outputPlaying = true; if (this.active) this.state('speaking'); break;
      case 'output_audio_buffer.stopped':
      case 'output_audio_buffer.cleared':
        this.outputPlaying = false; if (this.active && !this.responding) this.state('listening'); break;
      case 'response.output_audio_transcript.delta':
      case 'response.output_text.delta': {
        if (!this.active || (this.currentResponse && event.response_id !== this.currentResponse)) return;
        const text = (this.transcript.get(event.item_id) ?? '') + event.delta;
        this.transcript.set(event.item_id, text);
        this.events.message({ id: event.item_id, role: 'assistant', text }); break;
      }
      case 'response.done': {
        if (this.currentResponse && event.response.id !== this.currentResponse) return;
        this.responding = false; this.currentResponse = undefined;
        if (!this.active) return;
        if (this.queuedAnswer) { this.answer(); return; }
        if (event.response.status === 'failed') { this.state('listening', 'The guide could not answer that question. Try again.'); return; }
        if (event.response.status === 'cancelled') return;
        const calls = (event.response.output ?? []).filter((item: any) => item.type === 'function_call');
        const turn = this.turn;
        for (const call of calls) {
          if (!this.active || turn !== this.turn) break;
          const result = await executeGuideTool(this.tour, call.name, call.arguments);
          if (!this.connected) return;
          this.send({ type: 'conversation.item.create', item: { type: 'function_call_output', call_id: call.call_id, output: JSON.stringify(result) } });
          if (!this.active || turn !== this.turn) return;
          if (result.ok && 'resume' in result) { await this.resumeTour(); return; }
          if (result.ok) {
            const labels: Record<string, string> = { focus_feature: 'Camera moved to the feature', highlight_feature: 'Feature highlighted', play_animation: 'Demonstration started', get_current_view: 'Looked at your current view' };
            this.events.message({ id: call.call_id, role: 'action', text: labels[call.name] ?? 'View updated' });
            this.sendView(true);
          }
        }
        if (calls.length && turn === this.turn && this.active) this.answer();
        else if (!this.outputPlaying) this.state('listening');
        this.keepAlive(); break;
      }
      case 'error':
        if (['response_cancel_not_active', 'input_audio_buffer_commit_empty'].includes(event.error?.code)) return;
        this.responding = false; this.queuedAnswer = false;
        this.state('listening', 'The guide could not process that turn. Please try again.'); break;
    }
  }
  async toggleMic() {
    if (!this.connected || !this.active) { await this.start(true); return; }
    if (this.microphoneOn) { this.stream?.getAudioTracks().forEach(t => t.enabled = false); this.send({ type: 'input_audio_buffer.clear' }); this.events.mic(false); }
    else { try { await this.microphone(this.generation); this.stream?.getAudioTracks().forEach(t => t.enabled = true); this.events.mic(true); this.state('listening'); } catch { this.state('listening', 'Microphone unavailable. You can still type.'); } }
  }
  async enableSound() { await this.output?.play().catch(() => this.events.audioBlocked()); }
  async resumeTour() {
    this.active = false; this.turn++; this.queuedAnswer = false; this.interrupt();
    this.stream?.getAudioTracks().forEach(t => t.enabled = false); this.events.mic(false);
    this.send({ type: 'input_audio_buffer.clear' }); this.state(this.connected ? 'paused' : 'idle');
    await this.tour.resume();
  }
  stop() {
    this.generation++; this.turn++; this.active = false; this.responding = false; this.queuedAnswer = false; this.outputPlaying = false;
    clearTimeout(this.timeout); clearTimeout(this.idleTimeout); this.abort?.abort();
    this.stream?.getTracks().forEach(t => t.stop()); this.stream = undefined;
    this.channel?.close(); this.pc?.close(); this.channel = undefined; this.pc = undefined; this.sender = undefined;
    if (this.output) { this.output.pause(); this.output.srcObject = null; } this.output = undefined;
    this.snapshotId = undefined; this.currentResponse = undefined; this.transcript.clear();
    this.events.mic(false); this.state('idle');
  }
  private fail(detail: string) { this.stop(); this.state('error', detail); }
}
