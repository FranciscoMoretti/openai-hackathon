import type { IncomingMessage, ServerResponse } from 'node:http';
import { voiceInstructions, backendInstructions, narrationBrief, guideTools } from '../src/tour/guide-contract';

import { checkpointIds, type CheckpointId } from '../src/tour/tour-content';

/** Local-only demo endpoint. The long-lived API key never enters a client bundle. */
export function liveHandler(options: { apiKey?: string; model?: string; backendModel?: string; fetcher?: typeof fetch }) {
  let attempts: number[] = [];
  const sessions = new Map<string, number>();
  const closeSession = async (id: string) => {
    const response = await (options.fetcher ?? fetch)(`https://api.openai.com/v1/live/sessions/${encodeURIComponent(id)}/hangup`, {
      method: 'POST', headers: { Authorization: `Bearer ${options.apiKey}` },
      signal: AbortSignal.timeout(10_000), redirect: 'error',
    });
    if (!response.ok && response.status !== 404) throw new Error('Session close failed');
    sessions.delete(id);
  };
  return async (req: IncomingMessage, res: ServerResponse, next: () => void) => {
    const path = req.url?.split('?')[0];
    if (path !== '/api/live/session' && path !== '/api/live/session/close') return next();
    res.setHeader('Cache-Control', 'no-store');
    const fail = (status: number, error: string) => { res.statusCode = status; res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify({ error })); };
    const host = req.headers.host ?? '';
    if (!/^(localhost|127\.0\.0\.1|\[::1\])(?::\d+)?$/.test(host)) return fail(403, 'This demo accepts local connections only.');
    if (req.headers.origin && req.headers.origin !== `http://${host}` && req.headers.origin !== `https://${host}`) return fail(403, 'Cross-origin session requests are not allowed.');
    if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return fail(405, 'Use POST to start a guide session.'); }
    if (path !== '/api/live/session/close' && req.headers['content-type']?.split(';')[0] !== 'application/sdp') return fail(415, 'Expected a WebRTC session offer.');
    if (!options.apiKey) return fail(503, 'OpenAI is not configured. Add OPENAI_API_KEY to the repository .env.local and restart the server.');
    for (const [id, created] of sessions) if (Date.now() - created > 3_600_000) sessions.delete(id);
    if (path === '/api/live/session/close') {
      try {
        let body = '';
        for await (const chunk of req) { body += chunk.toString(); if (body.length > 1024) return fail(413, 'Invalid session close request.'); }
        const { sessionId } = JSON.parse(body);
        if (typeof sessionId !== 'string' || !sessions.has(sessionId)) return fail(404, 'Session is not owned by this server.');
        await closeSession(sessionId); res.statusCode = 204; res.end();
      } catch { fail(502, 'Could not confirm that the live session ended.'); }
      return;
    }
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
      const query = new URL(req.url!, `http://${host}`).searchParams;
      const requested = query.get('checkpoint') as CheckpointId;
      const checkpoint = checkpointIds.includes(requested) ? requested : checkpointIds[0];
      const greeting = query.get('complete') === '1'
        ? 'The tour has finished. Welcome the visitor back briefly without restarting the tour, then listen for their questions.'
        : narrationBrief(checkpoint, query.get('resume') === '1');
      const body = JSON.stringify({
        session: {
          model: options.model || 'gpt-live-1', store: false,
          instructions: voiceInstructions,
          audio: { output: { voice: 'marin' } },
          input: [{ type: 'message', role: 'developer', content: [{ type: 'input_text', text: greeting }] }],
          delegation: { type: 'responses', responses: {
            model: options.backendModel || 'gpt-5.6-terra',
            instructions: backendInstructions, tools: guideTools,
            tool_choice: 'auto', parallel_tool_calls: false,
          } },
        },
        transport: { type: 'webrtc', sdp },
      });
      const upstream = await (options.fetcher ?? fetch)('https://api.openai.com/v1/live/sessions', {
        method: 'POST', headers: { Authorization: `Bearer ${options.apiKey}`, 'Content-Type': 'application/json' }, body,
        signal: AbortSignal.timeout(25_000), redirect: 'error',
      });
      if (!upstream.ok) {
        // Never forward upstream error bodies or credentials to the browser/logs.
        const hints: Record<number, string> = {
          400: 'OpenAI could not start this voice session. Check the configured GPT-Live model and session settings.',
          401: 'The OpenAI key was rejected. Check the local configuration.',
          403: 'This key or project cannot access GPT-Live. Check its Live and Responses permissions and model access.',
          404: 'The configured GPT-Live model is unavailable to this project.',
          429: 'OpenAI usage or rate limits were reached. Check project credits and limits, then retry.',
        };
        return fail(upstream.status < 500 ? upstream.status : 502, hints[upstream.status] ?? 'OpenAI is temporarily unavailable. Try again shortly.');
      }
      const result = await upstream.json();
      if (typeof result.session?.id !== 'string' || typeof result.transport?.sdp !== 'string') return fail(502, 'OpenAI returned an invalid live session.');
      sessions.set(result.session.id, Date.now());
      if (res.destroyed) { await closeSession(result.session.id); return; }
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ session: { id: result.session.id }, transport: { sdp: result.transport.sdp } }));
    } catch { fail(502, 'Could not connect to OpenAI. Check your connection and try again.'); }
  };
}
