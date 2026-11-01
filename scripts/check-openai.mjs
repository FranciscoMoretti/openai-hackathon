import { loadEnvFile } from 'node:process';

try {
  loadEnvFile(new URL('../.env.local', import.meta.url));
} catch (error) {
  if (error.code !== 'ENOENT') {
    console.error('Could not read .env.local. Check its permissions and format.');
    process.exit(1);
  }
}

const key = process.env.OPENAI_API_KEY?.trim();
if (!key || !/^sk-[A-Za-z0-9_-]+$/.test(key)) {
  console.error('Missing or malformed OPENAI_API_KEY. Run npm run openai:setup in your terminal.');
  process.exit(1);
}

try {
  const response = await fetch('https://api.openai.com/v1/models', {
    headers: { Authorization: `Bearer ${key}` },
    signal: AbortSignal.timeout(15_000),
    redirect: 'error',
  });
  if (!response.ok) {
    // Do not print API error bodies: authentication errors can echo key fragments.
    const hints = {
      401: 'The key was rejected. Create a new key for the intended project.',
      403: 'Check project access and the key permission to read models.',
      429: 'The API is rate-limiting this request. Check project limits and retry later.',
    };
    console.error(`OpenAI check failed (HTTP ${response.status}). ${hints[response.status] ?? 'Retry later or check OpenAI service status.'}`);
    process.exitCode = 1;
  } else {
    console.log('OpenAI authentication succeeded. No generation request was made.');
    console.log('This checks access to the models endpoint, not billing or permission to generate audio.');
  }
} catch {
  console.error('Could not reach OpenAI within 15 seconds. Check your connection and retry.');
  process.exitCode = 1;
}
