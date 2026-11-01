import type { IncomingMessage, ServerResponse } from 'node:http';
import { guideInstructions, guideTools } from '../src/tour/guide-contract';

/** Local-only demo endpoint. The long-lived API key never enters a client bundle. */
export function realtimeHandler(options: { apiKey?: string; model?: string; fetcher?: typeof fetch }) {
  let attempts: number[] = [];
  return async (req: IncomingMessage, res: ServerResponse, next: () => void) => {
    if (req.url?.split('?')[0] !== '/api/realtime/session') return next();
    res.setHeader('Cache-Control', 'no-store');
    const fail = (status: number, error: string) => { res.statusCode = status; res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify({ error })); };
    const host = req.headers.host ?? '';
    if (!/^(localhost|127\.0\.0\.1|\[::1\])(?::\d+)?$/.test(host)) return fail(403, 'This demo accepts local connections only.');
    if (req.headers.origin && req.headers.origin !== `http://${host}` && req.headers.origin !== `https://${host}`) return fail(403, 'Cross-origin session requests are not allowed.');
    if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return fail(405, 'Use POST to start a guide session.'); }
    if (req.headers['content-type']?.split(';')[0] !== 'application/sdp') return fail(415, 'Expected a WebRTC session offer.');
    if (!options.apiKey) return fail(503, 'OpenAI is not configured. Add OPENAI_API_KEY to the repository .env.local and restart the server.');
    attempts = attempts.filter(t => Date.now() - t < 60_000);
    if (attempts.length >= 10) return fail(429, 'Too many connection attempts. Wait a minute and try again.');
    attempts.push(Date.now());
    try {
      const chunks: Buffer[] = []; let size = 0;
      for await (const chunk of req) {
        size += chunk.length;
        if (size > 64 * 1024) return fail(413, 'The session offer is too large.');
        chunks.push(Buffer.from(chunk));
      }
      const sdp = Buffer.concat(chunks).toString('utf8');
      if (!sdp.startsWith('v=0') || !sdp.includes('m=audio')) return fail(400, 'Invalid WebRTC session offer.');
      const body = new FormData();
      const model = options.model || 'gpt-realtime-2.1';
      body.set('sdp', sdp);
      body.set('session', JSON.stringify({
        type: 'realtime', model,
        // These short, grounded guide turns do not need extended reasoning.
        ...(/^gpt-realtime-2(?:[.-]|$)/.test(model) ? { reasoning: { effort: 'minimal' } } : {}),
        instructions: guideInstructions, tools: guideTools, tool_choice: 'auto',
        output_modalities: ['audio'], max_output_tokens: 800,
        audio: { input: { noise_reduction: { type: 'near_field' }, turn_detection: { type: 'server_vad', threshold: 0.5, prefix_padding_ms: 300, silence_duration_ms: 600, create_response: false, interrupt_response: true } }, output: { voice: 'marin' } },
      }));
      const upstream = await (options.fetcher ?? fetch)('https://api.openai.com/v1/realtime/calls', {
        method: 'POST', headers: { Authorization: `Bearer ${options.apiKey}` }, body,
        signal: AbortSignal.timeout(25_000), redirect: 'error',
      });
      if (!upstream.ok) {
        // Never forward upstream error bodies or credentials to the browser/logs.
        const hints: Record<number, string> = {
          400: 'OpenAI could not start this voice session. Check the configured Realtime model and session settings.',
          401: 'The OpenAI key was rejected. Check the local configuration.',
          403: 'This key or project cannot access Realtime. Check its Realtime permission and model access.',
          404: 'The configured Realtime model is unavailable to this project.',
          429: 'OpenAI usage or rate limits were reached. Check project credits and limits, then retry.',
        };
        return fail(upstream.status < 500 ? upstream.status : 502, hints[upstream.status] ?? 'OpenAI is temporarily unavailable. Try again shortly.');
      }
      res.setHeader('Content-Type', 'application/sdp'); res.end(await upstream.text());
    } catch { fail(502, 'Could not connect to OpenAI. Check your connection and try again.'); }
  };
}
