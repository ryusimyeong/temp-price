export class CollectorError extends Error {
  constructor(public code: string) { super(code); }
}
export function assertAccess(status: number, text = "") {
  if (status === 403 || status === 429) throw new CollectorError(`HTTP_${status}`);
  if (/(<title[^>]*>[^<]*(captcha|access denied|just a moment)|보안 확인을 완료|자동입력 방지문자를 입력)/i.test(text)) throw new CollectorError("CAPTCHA");
}
export async function fetchPublic(url: string, signal: AbortSignal): Promise<string> {
  for (let attempt = 0; attempt < 2; attempt++) {
    signal.throwIfAborted();
    try {
      const response = await fetch(url, {
        headers: { "User-Agent": "UsedPrice/0.1 (personal price statistics)", Accept: "application/json,text/html" },
        signal: AbortSignal.any([signal, AbortSignal.timeout(8000)]), cache: "no-store",
      });
      assertAccess(response.status);
      if (response.status === 404) throw new CollectorError("NOT_FOUND");
      if (!response.ok) {
        if (response.status >= 500 && attempt === 0) continue;
        throw new CollectorError(`HTTP_${response.status}`);
      }
      const text = await response.text();
      assertAccess(response.status, text);
      return text;
    } catch (error) {
      if (error instanceof CollectorError || signal.aborted || attempt === 1) throw error;
    }
  }
  throw new CollectorError("FETCH_FAILED");
}
export async function pause(signal: AbortSignal) {
  signal.throwIfAborted();
  await new Promise<void>((resolve, reject) => {
    const onAbort = () => { clearTimeout(timer); reject(signal.reason); };
    const timer = setTimeout(() => { signal.removeEventListener("abort", onAbort); resolve(); }, 350);
    signal.addEventListener("abort", onAbort, { once: true });
  });
}
