import { randomUUID } from 'node:crypto';
import WebSocket from 'ws';

const TRUSTED = '6A5AA1D4EAFF4E9FB37E23D68491D6F4';

async function generateSecMsGec() {
  let ticks = Math.floor(Date.now() / 1000) + 11644473600;
  ticks -= ticks % 300;
  ticks *= 1e7;
  const data = new TextEncoder().encode(`${ticks.toFixed(0)}${TRUSTED}`);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return [...new Uint8Array(hash)].map((b) => b.toString(16).padStart(2, '0')).join('').toUpperCase();
}

async function test(ua, label) {
  const id = randomUUID();
  const gec = await generateSecMsGec();
  const url = `${'wss://speech.platform.bing.com/consumer/speech/synthesize/readaloud/edge/v1'}?TrustedClientToken=${TRUSTED}&Sec-MS-GEC=${gec}&Sec-MS-GEC-Version=1-143.0.3650.75&ConnectionId=${id}`;

  return new Promise((resolve) => {
    const audio = [];
    const ws = new WebSocket(url, {
      headers: { 'User-Agent': ua, Origin: 'chrome-extension://jdiccldimpdaibmpdkjnbmckianbfold' },
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
      ws.send(
        `X-RequestId:${id}\r\nContent-Type:application/ssml+xml\r\nX-Timestamp:${new Date().toISOString()}Z\r\nPath:ssml\r\n\r\n` +
          `<speak version='1.0' xml:lang='en-US'><voice name='en-US-JennyNeural'>Hi</voice></speak>`,
      );
    });
    ws.on('message', (data) => {
      if (!Buffer.isBuffer(data)) return;
      const m = Buffer.from('Path:audio\r\n');
      const i = data.indexOf(m);
      if (i >= 0) audio.push(data.subarray(i + m.length));
      if (data.toString('utf8').includes('Path:turn.end')) ws.close();
    });
    ws.on('close', () => resolve(`${label}: ${audio.reduce((n, b) => n + b.length, 0)} bytes`));
    ws.on('error', (e) => resolve(`${label}: ERR ${e.message}`));
  });
}

console.log(
  await test(
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36 Edg/131.0.0.0',
    'UA-131',
  ),
);
console.log(
  await test(
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0',
    'UA-143',
  ),
);
