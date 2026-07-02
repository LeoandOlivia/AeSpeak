import type { Connect } from 'vite';
import type { Plugin } from 'vite';
import { randomUUID } from 'node:crypto';
import WebSocket from 'ws';
import { buildEdgeSsml } from './src/lib/providers/tts/edge-ssml';
import {
  buildEdgeConfigMessage,
  buildEdgeSsmlMessage,
  buildEdgeWssUrl,
  EDGE_ORIGIN,
  EDGE_USER_AGENT,
  generateSecMsGec,
} from './src/lib/providers/tts/edge-constants';

async function synthesizeOnServer(text: string, voice: string): Promise<Buffer> {
  const reqId = randomUUID();
  const gec = await generateSecMsGec();
  const url = buildEdgeWssUrl(reqId, gec);
  const ssml = buildEdgeSsml(text, voice);

  return new Promise((resolve, reject) => {
    const audio: Buffer[] = [];
    const ws = new WebSocket(url, {
      headers: {
        'User-Agent': EDGE_USER_AGENT,
        Origin: EDGE_ORIGIN,
      },
    });

    const timer = setTimeout(() => {
      ws.close();
      reject(new Error('Edge TTS 代理超时'));
    }, 25_000);

    ws.on('open', () => {
      ws.send(buildEdgeConfigMessage());
      ws.send(buildEdgeSsmlMessage(reqId, ssml));
    });

    ws.on('message', (data) => {
      if (!Buffer.isBuffer(data)) return;
      const marker = Buffer.from('Path:audio\r\n');
      const idx = data.indexOf(marker);
      if (idx >= 0) audio.push(data.subarray(idx + marker.length));
      if (data.toString('utf8').includes('Path:turn.end')) ws.close();
    });

    ws.on('close', () => {
      clearTimeout(timer);
      if (!audio.length) {
        reject(new Error('Edge TTS 代理未返回音频（微软拒绝连接，请检查网络）'));
        return;
      }
      resolve(Buffer.concat(audio));
    });

    ws.on('error', (err) => {
      clearTimeout(timer);
      reject(err);
    });
  });
}

export function edgeTtsDevPlugin(): Plugin {
  return {
    name: 'edge-tts-dev-proxy',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (req.url !== '/api/edge-tts' || req.method !== 'POST') {
          next();
          return;
        }

        try {
          const body = await readBody(req);
          const { text, voice } = JSON.parse(body) as { text?: string; voice?: string };
          if (!text?.trim()) {
            res.statusCode = 400;
            res.end('text required');
            return;
          }
          const audio = await synthesizeOnServer(text, voice ?? 'en-US-JennyNeural');
          res.statusCode = 200;
          res.setHeader('Content-Type', 'audio/mpeg');
          res.end(audio);
        } catch (e) {
          res.statusCode = 502;
          res.end(e instanceof Error ? e.message : 'Edge TTS proxy error');
        }
      });
    },
  };
}

function readBody(req: Connect.IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (chunk) => {
      data += chunk;
    });
    req.on('end', () => resolve(data));
    req.on('error', reject);
  });
}
