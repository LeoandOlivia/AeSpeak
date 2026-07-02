export const EDGE_TRUSTED_TOKEN = '6A5AA1D4EAFF4E9FB37E23D68491D6F4';
export const EDGE_WSS_URL =
  'wss://speech.platform.bing.com/consumer/speech/synthesize/readaloud/edge/v1';
export const EDGE_SEC_MS_GEC_VERSION = '1-143.0.3650.75';
export const EDGE_CHROMIUM_MAJOR = '143';
export const EDGE_USER_AGENT = `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${EDGE_CHROMIUM_MAJOR}.0.0.0 Safari/537.36 Edg/${EDGE_CHROMIUM_MAJOR}.0.0.0`;
export const EDGE_ORIGIN = 'chrome-extension://jdiccldimpdaibmpdkjnbmckianbfold';
export const WIN_EPOCH_OFFSET = 11644473600;

export async function generateSecMsGec(): Promise<string> {
  let ticks = Math.floor(Date.now() / 1000) + WIN_EPOCH_OFFSET;
  ticks -= ticks % 300;
  ticks *= 1e7;
  const data = new TextEncoder().encode(`${ticks.toFixed(0)}${EDGE_TRUSTED_TOKEN}`);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
    .toUpperCase();
}

export function buildEdgeConfigMessage(): string {
  return (
    `X-Timestamp:${new Date().toISOString()}Z\r\nContent-Type:application/json; charset=utf-8\r\nPath:speech.config\r\n\r\n` +
    JSON.stringify({
      context: {
        synthesis: {
          audio: {
            metadataoptions: {
              sentenceBoundaryEnabled: false,
              wordBoundaryEnabled: false,
            },
            outputFormat: 'audio-24khz-48kbitrate-mono-mp3',
          },
        },
      },
    })
  );
}

export function buildEdgeSsmlMessage(requestId: string, ssml: string): string {
  return `X-RequestId:${requestId}\r\nContent-Type:application/ssml+xml\r\nX-Timestamp:${new Date().toISOString()}Z\r\nPath:ssml\r\n\r\n${ssml}`;
}

export function buildEdgeWssUrl(requestId: string, secMsGec: string): string {
  const params = new URLSearchParams({
    TrustedClientToken: EDGE_TRUSTED_TOKEN,
    'Sec-MS-GEC': secMsGec,
    'Sec-MS-GEC-Version': EDGE_SEC_MS_GEC_VERSION,
    ConnectionId: requestId,
  });
  return `${EDGE_WSS_URL}?${params.toString()}`;
}
