import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { liveHandler } from './server/live';

export default defineConfig(({mode}) => {
 const env=loadEnv(mode,process.cwd(),'OPENAI_');
 const handler=liveHandler({apiKey:process.env.OPENAI_API_KEY||env.OPENAI_API_KEY,model:process.env.OPENAI_LIVE_MODEL||env.OPENAI_LIVE_MODEL,backendModel:process.env.OPENAI_LIVE_BACKEND_MODEL||env.OPENAI_LIVE_BACKEND_MODEL});
 return {
  plugins: [react(),{name:'wander-local-live',configureServer(server){server.middlewares.use(handler);},configurePreviewServer(server){server.middlewares.use(handler);}}],
  worker: { format: 'es' },
  build: { rollupOptions: { input: { app: 'index.html', tour: 'src/tour/index.html' } } },
 };});
