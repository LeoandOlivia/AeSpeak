/** Extract BCP-47 locale from Edge voice id, e.g. en-US-JennyNeural → en-US */
export function voiceLocale(voice: string): string {
  const match = voice.match(/^([a-z]{2}-[A-Z]{2})/i);
  return match?.[1] ?? 'en-US';
}

export function escapeSsmlText(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export function buildEdgeSsml(text: string, voice: string): string {
  const locale = voiceLocale(voice);
  const escaped = escapeSsmlText(text);
  return `<speak version='1.0' xml:lang='${locale}'><voice name='${voice}'><prosody rate='0%'>${escaped}</prosody></voice></speak>`;
}

/** Persona name from Edge voice id, e.g. en-US-GuyNeural → Guy */
export function voicePersona(voice: string): string {
  const tail = voice.split('-').slice(2).join('-');
  return tail.replace(/Neural$/i, '');
}

const MALE_PERSONAS = new Set([
  'Guy',
  'Ryan',
  'William',
  'Brian',
  'Thomas',
  'Christopher',
  'Eric',
  'Andrew',
  'Roger',
  'Liam',
  'James',
  'Jason',
  'Tony',
]);

export function isMaleEdgeVoice(voice: string): boolean {
  return MALE_PERSONAS.has(voicePersona(voice));
}

/** Preload voices (Chrome loads them asynchronously). */
export function loadSpeechVoices(timeoutMs = 1200): Promise<SpeechSynthesisVoice[]> {
  return new Promise((resolve) => {
    if (!('speechSynthesis' in window)) {
      resolve([]);
      return;
    }
    const synth = window.speechSynthesis;
    const read = () => synth.getVoices();

    const existing = read();
    if (existing.length > 0) {
      resolve(existing);
      return;
    }

    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      synth.removeEventListener('voiceschanged', onChange);
      resolve(read());
    };

    const onChange = () => finish();
    synth.addEventListener('voiceschanged', onChange);
    // Chrome requires getVoices() call to trigger loading
    read();
    window.setTimeout(finish, timeoutMs);
  });
}

function pickBrowserVoice(
  all: SpeechSynthesisVoice[],
  edgeVoice: string,
): SpeechSynthesisVoice | undefined {
  const locale = voiceLocale(edgeVoice);
  const persona = voicePersona(edgeVoice);
  const male = isMaleEdgeVoice(edgeVoice);

  const sameLocale = all.filter(
    (v) => v.lang === locale || v.lang.startsWith(`${locale}-`) || v.lang.startsWith(locale),
  );
  const pool = sameLocale.length > 0 ? sameLocale : all.filter((v) => v.lang.startsWith('en'));
  if (pool.length === 0) return all[0];

  const byPersona = pool.find((v) => v.name.toLowerCase().includes(persona.toLowerCase()));
  if (byPersona) return byPersona;

  if (male) {
    return (
      pool.find((v) =>
        /guy|david|mark|james|daniel|ryan|thomas|william|brian|eric|andrew|liam|george|male/i.test(
          v.name,
        ),
      ) ?? pool[0]
    );
  }

  return (
    pool.find((v) =>
      /jenny|zira|samantha|victoria|sonia|natasha|aria|susan|karen|hazel|female|xiaoxiao|tingting/i.test(
        v.name,
      ),
    ) ?? pool[0]
  );
}

function speakOneUtterance(
  text: string,
  edgeVoice: string,
  voices: SpeechSynthesisVoice[],
  bindVoice = true,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const synth = window.speechSynthesis;
    const utter = new SpeechSynthesisUtterance(text);
    const locale = voiceLocale(edgeVoice);
    utter.lang = locale;

    if (bindVoice && voices.length > 0) {
      const selected = pickBrowserVoice(voices, edgeVoice);
      if (selected) utter.voice = selected;
    }

    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      resolve();
    };
    const fail = (reason: string) => {
      if (done) return;
      done = true;
      reject(new Error(reason));
    };

    utter.onend = finish;
    utter.onerror = (event) => {
      const code = event.error ?? 'unknown';
      // cancel() on a previous utterance triggers these — not a real failure
      if (code === 'canceled' || code === 'interrupted') return;
      fail(`System speech failed (${code})`);
    };

    const start = () => {
      synth.speak(utter);
      // Chrome bug: utterances sometimes never start without resume()
      window.setTimeout(() => {
        if (!done && synth.paused) synth.resume();
      }, 100);
    };

    if (synth.speaking || synth.pending) {
      synth.cancel();
      window.setTimeout(start, 80);
    } else {
      start();
    }

    // Safety: resolve if synth finished but onend missed (mobile WebView)
    const maxMs = Math.min(Math.max(text.length * 120, 4000), 30000);
    window.setTimeout(() => {
      if (!done && !synth.speaking && !synth.pending) finish();
    }, maxMs);
  });
}

export async function speakWithBrowserVoice(text: string, edgeVoice: string): Promise<void> {
  if (!('speechSynthesis' in window)) {
    throw new Error('System speech is not supported in this environment');
  }

  const trimmed = text.trim();
  if (!trimmed) return;

  const voices = await loadSpeechVoices();

  // Split into sentences — speak sequentially (speechSynthesis queue is unreliable)
  const parts = trimmed.match(/[^.!?]+[.!?]+|[^.!?]+/g) ?? [trimmed];

  for (const part of parts) {
    const segment = part.trim();
    if (!segment) continue;
    try {
      await speakOneUtterance(segment, edgeVoice, voices, true);
    } catch (firstError) {
      try {
        await speakOneUtterance(segment, edgeVoice, voices, false);
      } catch {
        throw firstError;
      }
    }
  }
}

/** Call on app start to warm up voice list (optional). */
export function warmUpSpeechVoices(): void {
  void loadSpeechVoices();
}
