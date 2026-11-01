import { afterEach, describe, expect, it, vi } from 'vitest';
import { createServer, request, type Server } from 'node:http';
import { liveHandler } from './live';

const servers:Server[]=[];
afterEach(async()=>{await Promise.all(servers.splice(0).map(server=>new Promise<void>(resolve=>{server.closeAllConnections();server.close(()=>resolve());})));});
async function setup(apiKey?:string,fetcher=vi.fn(async(_url:string)=>Response.json({session:{id:'live_test'},transport:{sdp:'v=0\r\nanswer'}})), options:Partial<Parameters<typeof liveHandler>[0]>={}){
  const handler=liveHandler({...options,apiKey,fetcher});const server=createServer((req,res)=>void handler(req,res,()=>{res.statusCode=404;res.end();}));servers.push(server);
  await new Promise<void>(resolve=>server.listen(0,'127.0.0.1',resolve));const address=server.address();if(!address||typeof address==='string')throw new Error('No test port');
  const url=`http://127.0.0.1:${address.port}/api/live/session`;
  return {url,fetcher,post:(body='v=0\r\nm=audio 9 UDP/TLS/RTP/SAVPF 111',extra:Record<string,string>={})=>new Promise<Response>((resolve,reject)=>{const req=request(url,{method:'POST',headers:{'Content-Type':'application/sdp',...extra}},res=>{const chunks:Buffer[]=[];res.on('data',chunk=>chunks.push(chunk));res.on('end',()=>resolve(new Response(Buffer.concat(chunks),{status:res.statusCode,headers:res.headers as Record<string,string>})));});req.on('error',reject);req.end(body);})};
}
describe('local GPT-Live session endpoint',()=>{
  it('keeps credentials server-side and fixes model/tool configuration',async()=>{
    const {post,fetcher}=await setup('private-test-key');const response=await post();expect(response.status).toBe(200);expect(response.headers.get('cache-control')).toBe('no-store');expect(await response.json()).toEqual({session:{id:'live_test'},transport:{sdp:'v=0\r\nanswer'}});
    const call=fetcher.mock.calls[0] as unknown as [string,RequestInit];expect(call[0]).toBe('https://api.openai.com/v1/live/sessions');
    const body=JSON.parse(call[1].body as string),config=body.session;
    expect(config.model).toBe('gpt-live-1');expect(config.store).toBe(false);
    expect(config.delegation.responses.model).toBe('gpt-5.6-terra');
    expect(config.delegation.responses.parallel_tool_calls).toBe(false);
    expect(config.delegation.responses.tools.map((x:{name:string})=>x.name)).toContain('continue_tour');
    expect(config.input[0].content[0].text).toContain('Speak now about A bridge takes shape');
    expect(config.input[0].content[0].text).toContain('25–35');
    expect(body.transport.type).toBe('webrtc');
    expect(config).not.toHaveProperty('turn_detection');
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
  it('only hangs up sessions created by this server, preserving opaque IDs',async()=>{
    const fetcher=vi.fn(async(url:string)=>url.endsWith('/hangup')?new Response(null,{status:204}):Response.json({session:{id:'live:opaque/session'},transport:{sdp:'v=0\r\nanswer'}}));
    const {post,url}=await setup('test',fetcher);await post();
    const close=(sessionId:string)=>fetch(url+'/close',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId})});
    expect((await close('another-session')).status).toBe(404);expect(fetcher).toHaveBeenCalledTimes(1);
    expect((await close('live:opaque/session')).status).toBe(204);
    expect(fetcher.mock.calls[1][0]).toBe('https://api.openai.com/v1/live/sessions/live%3Aopaque%2Fsession/hangup');
    expect((await close('live:opaque/session')).status).toBe(404);
  });
  it('allows only configured production hosts with matching HTTPS origins',async()=>{
    const {post,fetcher}=await setup('test',undefined,{allowedHosts:['wander.example']});
    expect((await post(undefined,{Host:'wander.example',Origin:'https://wander.example'})).status).toBe(200);
    expect((await post(undefined,{Host:'wander.example'})).status).toBe(403);
    expect((await post(undefined,{Host:'wander.example',Origin:'https://attacker.example'})).status).toBe(403);
    expect((await post(undefined,{Host:'other.example',Origin:'https://other.example'})).status).toBe(403);
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
  it('closes an owned session on a fresh server instance using its signed token',async()=>{
    const options={sessionSecret:'test-signing-secret'};
    const first=await setup('test',undefined,options);const {session}=await (await first.post()).json();
    const fetcher=vi.fn(async()=>new Response(null,{status:204}));
    const cold=await setup('test',fetcher,options);
    const close=(body:object)=>fetch(cold.url+'/close',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
    expect((await close({sessionId:session.id})).status).toBe(404);
    expect((await close({sessionId:'unrelated',closeToken:session.closeToken})).status).toBe(404);
    expect((await close({sessionId:session.id,closeToken:session.closeToken+'x'})).status).toBe(404);
    expect(fetcher).not.toHaveBeenCalled();
    expect((await close({sessionId:session.id,closeToken:session.closeToken})).status).toBe(204);
    expect(fetcher).toHaveBeenCalledOnce();
  });
  it('limits repeated connection attempts',async()=>{
    const {post,fetcher}=await setup('test');for(let i=0;i<10;i++)expect((await post()).status).toBe(200);expect((await post()).status).toBe(429);expect(fetcher).toHaveBeenCalledTimes(10);
  });
});
