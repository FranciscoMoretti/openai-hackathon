import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { realtimeHandler } from './server/realtime';

export default defineConfig(({mode}) => {
 const env=loadEnv(mode,process.cwd(),'OPENAI_');
 const handler=realtimeHandler({apiKey:process.env.OPENAI_API_KEY||env.OPENAI_API_KEY,model:process.env.OPENAI_REALTIME_MODEL||env.OPENAI_REALTIME_MODEL});
 return {
  plugins: [react(),{name:'wander-local-realtime',configureServer(server){server.middlewares.use(handler);},configurePreviewServer(server){server.middlewares.use(handler);}}],
  worker: { format: 'es' },
  build: { rollupOptions: { input: { app: 'index.html', tour: 'src/tour/index.html' } } },
 };});
