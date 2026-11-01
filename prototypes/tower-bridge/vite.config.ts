import { defineConfig, loadEnv } from 'vite';
import { fileURLToPath } from 'node:url';
import { realtimeHandler } from './server/realtime';

export default defineConfig(({ mode }) => {
  const root = fileURLToPath(new URL('../../', import.meta.url));
  const env = loadEnv(mode, root, 'OPENAI_');
  const middleware = realtimeHandler({ apiKey: process.env.OPENAI_API_KEY || env.OPENAI_API_KEY, model: process.env.OPENAI_REALTIME_MODEL || env.OPENAI_REALTIME_MODEL });
  return {
    plugins: [{ name: 'wander-local-realtime', configureServer(server) { server.middlewares.use(middleware); }, configurePreviewServer(server) { server.middlewares.use(middleware); } }],
    server: { host: '127.0.0.1', port: 5190, strictPort: true },
    preview: { host: '127.0.0.1', port: 5190, strictPort: true },
  };
});
