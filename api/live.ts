import type { IncomingMessage, ServerResponse } from 'node:http';
import { liveHandler } from '../server/live.js';

const handler=liveHandler({
  apiKey:process.env.OPENAI_API_KEY,
  model:process.env.OPENAI_LIVE_MODEL,
  backendModel:process.env.OPENAI_LIVE_BACKEND_MODEL,
  sessionSecret:process.env.OPENAI_SESSION_SECRET,
  allowedHosts:[process.env.VERCEL_URL,process.env.VERCEL_BRANCH_URL,process.env.VERCEL_PROJECT_PRODUCTION_URL,...(process.env.APP_ALLOWED_HOSTS??'').split(',')].filter((host):host is string=>!!host),
});
export default async function live(req:IncomingMessage,res:ServerResponse){
  if(!process.env.OPENAI_SESSION_SECRET){res.statusCode=503;res.end('Voice session signing is not configured.');return;}
  await handler(req,res,()=>{res.statusCode=404;res.end();});
}
