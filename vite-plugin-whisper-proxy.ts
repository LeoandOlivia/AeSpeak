import type { Plugin } from 'vite';

interface WhisperProxyPayload {
  baseUrl?: string;
  apiKey?: string;
  payload?: Record<string, unknown>;
}

async function readBody(req: import('http').IncomingMessage): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(Buffer.from(chunk));
  return Buffer.concat(chunks).toString('utf8');
}

function normalizeBaseUrl(custom: string | undefined): string {
  const trimmed = (custom ?? '').trim().replace(/\/+$/, '');
  if (!trimmed) return 'https://api.openai.com/v1';
  if (trimmed.endsWith('/v1')) return trimmed;
  return `${trimmed}/v1`;
}

/** dev 浏览器绕过 CORS，转发 JSON Whisper 请求（OpenRouter 等） */
export function whisperDevProxyPlugin(): Plugin {
  return {
    name: 'whisper-dev-proxy',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (req.url !== '/api/whisper-proxy' || req.method !== 'POST') {
          next();
          return;
        }

        try {
          const raw = await readBody(req);
          const body = JSON.parse(raw) as WhisperProxyPayload;
          const baseUrl = normalizeBaseUrl(body.baseUrl);
          const apiKey = body.apiKey?.trim();
          const payload = body.payload;

          if (!apiKey || !payload) {
            res.statusCode = 400;
            res.end(JSON.stringify({ error: { message: '缺少 Key 或 payload' } }));
            return;
          }

          const upstream = await fetch(`${baseUrl}/audio/transcriptions`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${apiKey}`,
            },
            body: JSON.stringify(payload),
          });

          const text = await upstream.text();
          res.statusCode = upstream.status;
          res.setHeader('Content-Type', upstream.headers.get('content-type') ?? 'application/json');
          res.end(text);
        } catch (e) {
          res.statusCode = 500;
          res.end(
            JSON.stringify({
              error: { message: e instanceof Error ? e.message : 'Whisper 代理失败' },
            }),
          );
        }
      });
    },
  };
}
