const ssml = `<speak version='1.0' xml:lang='en-US'><voice name='en-US-JennyNeural'>Hello</voice></speak>`;
const url =
  'https://speech.platform.bing.com/consumer/speech/synthesize/readaloud/edge/v1?TrustedClientToken=6A5AA1D4EAFF4E9FB37E23D68491D6F4';

const res = await fetch(url, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/ssml+xml',
    'X-Microsoft-OutputFormat': 'audio-24khz-48kbitrate-mono-mp3',
    'User-Agent':
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36 Edg/131.0.0.0',
  },
  body: ssml,
});
console.log('status', res.status);
const buf = await res.arrayBuffer();
console.log('bytes', buf.byteLength);
