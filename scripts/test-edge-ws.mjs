import { randomUUID } from 'node:crypto';
import WebSocket from 'ws';

const TRUSTED = '6A5AA1D4EAFF4E9FB37E23D68491D6F4';
const GEC_VERSION = '1-131.0.2903.112';

async function generateSecMsGec() {
  const ticks = Math.floor(Date.now() / 1000) + 11644473600;
  const rounded = ticks - (ticks % 300);
  const windowsTicks = rounded * 10000000;
  const data = new TextEncoder().encode(`${windowsTicks}${TRUSTED}`);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return [...new Uint8Array(hash)].map((b) => b.toString(16).padStart(2, '0')).join('').toUpperCase();
}

const reqId = randomUUID();
const gec = await generateSecMsGec();
const url = `wss://speech.platform.bing.com/consumer/speech/synthesize/readaloud/edge/v1?TrustedClientToken=${TRUSTED}&Sec-MS-GEC=${gec}&Sec-MS-GEC-Version=${GEC_VERSION}&ConnectionId=${reqId}`;

const audio = [];
const ws = new WebSocket(url, {
  headers: {
    'User-Agent':
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36 Edg/131.0.0.0',
    Origin: 'chrome-extension://jdiccldimpdaibmpdkjnbmkloccoofph',
  },
});

ws.on('open', () => {
  ws.send(
    `X-Timestamp:${new Date().toISOString()}Z\r\nContent-Type:application/json; charset=utf-8\r\nPath:speech.config\r\n\r\n` +
      JSON.stringify({
        context: {
          synthesis: {
            audio: {
              metadataoptions: { sentenceBoundaryEnabled: false, wordBoundaryEnabled: false },
              outputFormat: 'audio-24khz-48kbitrate-mono-mp3',
            },
          },
        },
      }),
  );
  const ssml = `<speak version='1.0' xml:lang='en-US'><voice name='en-US-JennyNeural'>Hello</voice></speak>`;
  ws.send(
    `X-RequestId:${reqId}\r\nContent-Type:application/ssml+xml\r\nX-Timestamp:${new Date().toISOString()}Z\r\nPath:ssml\r\n\r\n${ssml}`,
  );
});

ws.on('message', (data) => {
  if (!Buffer.isBuffer(data)) return;
  const marker = Buffer.from('Path:audio\r\n');
  const idx = data.indexOf(marker);
  if (idx >= 0) audio.push(data.subarray(idx + marker.length));
  if (data.toString('utf8').includes('Path:turn.end')) ws.close();
});

ws.on('close', () => {
  console.log('audio bytes', audio.reduce((n, b) => n + b.length, 0));
});

ws.on('error', (e) => console.error('ws error', e.message));
