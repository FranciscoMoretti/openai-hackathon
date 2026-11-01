import { afterEach, describe, expect, it, vi } from 'vitest';
import { createServer, type Server } from 'node:http';
import { realtimeHandler } from './realtime';

const servers:Server[]=[];
afterEach(async()=>{await Promise.all(servers.splice(0).map(server=>new Promise<void>(resolve=>{server.closeAllConnections();server.close(()=>resolve());})));});
async function setup(apiKey?:string,fetcher=vi.fn(async()=>new Response('v=0\r\nanswer'))){
  const handler=realtimeHandler({apiKey,fetcher});const server=createServer((req,res)=>void handler(req,res,()=>{res.statusCode=404;res.end();}));servers.push(server);
  await new Promise<void>(resolve=>server.listen(0,'127.0.0.1',resolve));const address=server.address();if(!address||typeof address==='string')throw new Error('No test port');
  const url=`http://127.0.0.1:${address.port}/api/realtime/session`;
  return {url,fetcher,post:(body='v=0\r\nm=audio 9 UDP/TLS/RTP/SAVPF 111',extra:Record<string,string>={})=>fetch(url,{method:'POST',headers:{'Content-Type':'application/sdp',...extra},body})};
}
describe('local Realtime session endpoint',()=>{
  it('keeps credentials server-side and fixes model/tool configuration',async()=>{
    const {post,fetcher}=await setup('private-test-key');const response=await post();expect(response.status).toBe(200);expect(response.headers.get('cache-control')).toBe('no-store');expect(await response.text()).toBe('v=0\r\nanswer');
    const call=fetcher.mock.calls[0] as unknown as [string,RequestInit];expect(call[0]).toBe('https://api.openai.com/v1/realtime/calls');
    const config=JSON.parse((call[1].body as FormData).get('session') as string);expect(config.model).toBe('gpt-realtime-2.1');expect(config.reasoning).toEqual({effort:'minimal'});expect(config.tools.map((x:{name:string})=>x.name)).toContain('continue_tour');expect(config.audio.input.turn_detection.create_response).toBe(false);
  });
  it('rejects cross-origin requests before contacting OpenAI',async()=>{
    const {post,fetcher}=await setup('test');expect((await post(undefined,{Origin:'https://other.example'})).status).toBe(403);expect(fetcher).not.toHaveBeenCalled();
  });
  it('rejects missing credentials and malformed or excessive input',async()=>{
    expect((await (await setup()).post()).status).toBe(503);
    const {post,fetcher}=await setup('test');expect((await post('bad')).status).toBe(400);expect((await post('x'.repeat(65537))).status).toBe(413);expect(fetcher).not.toHaveBeenCalled();
  });
  it('never leaks upstream error details',async()=>{
    const {post}=await setup('private-test-key',vi.fn(async()=>new Response('private-test-key sensitive diagnostic',{status:401})));
    const response=await post();expect(response.status).toBe(401);expect(await response.text()).not.toContain('private-test-key');
  });
  it('limits repeated connection attempts',async()=>{
    const {post,fetcher}=await setup('test');for(let i=0;i<10;i++)expect((await post()).status).toBe(200);expect((await post()).status).toBe(429);expect(fetcher).toHaveBeenCalledTimes(10);
  });
});
