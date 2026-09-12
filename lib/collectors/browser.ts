import { chromium, type Browser, type BrowserContext, type Page } from "playwright-core";
import { assertAccess, CollectorError } from "./fetch";
import type { CollectorContext } from "./types";

export function browserSession() {
  let pending: Promise<Browser> | undefined;
  let closed = false;
  return {
    get: () => pending ??= (async () => {
      if (closed) throw new CollectorError("TIMEOUT");
      let browser: Browser;
      if (process.env.VERCEL) {
        const { default: serverChromium } = await import("@sparticuz/chromium");
        const executablePath = await serverChromium.executablePath();
        if (closed) throw new CollectorError("TIMEOUT");
        browser = await chromium.launch({ executablePath, args: serverChromium.args, headless: true, timeout: 8000 });
      } else {
        browser = await chromium.launch({
          executablePath: process.env.CHROMIUM_EXECUTABLE_PATH || undefined,
          channel: process.env.CHROMIUM_EXECUTABLE_PATH ? undefined : "chrome",
          headless: true, timeout: 8000,
        });
      }
      if (closed) { await browser.close(); throw new CollectorError("TIMEOUT"); }
      return browser;
    })(),
    close: async () => {
      closed = true;
      if (pending) {
        let timer: ReturnType<typeof setTimeout> | undefined;
        try {
          await Promise.race([pending.then(browser => browser.close()).catch(() => {}), new Promise<void>(resolve => { timer = setTimeout(resolve, 2000); })]);
        } finally { if (timer) clearTimeout(timer); }
      }
    },
  };
}

export async function withPage<T>(ctx: CollectorContext, run: (page: Page) => Promise<T>) {
  ctx.signal.throwIfAborted();
  const browser = await ctx.browser();
  ctx.signal.throwIfAborted();
  const context: BrowserContext = await browser.newContext({ locale: "ko-KR", viewport: { width: 1280, height: 900 } });
  let page: Page | undefined;
  // 서버리스 Chromium의 single-process 모드에서는 context 종료가 다른 마켓의 탭도 닫을 수 있습니다.
  // 탭을 먼저 닫고, context는 검색 종료 시 browser.close()로 함께 정리합니다.
  const closePage = async () => { if (page) await page.close().catch(() => {}); };
  const onAbort = () => { void closePage(); };
  ctx.signal.addEventListener("abort", onAbort, { once: true });
  try {
    ctx.signal.throwIfAborted();
    // 목록의 텍스트와 이미지 URL만 필요합니다. 이미지 다운로드와 분석 트래픽은 보내지 않습니다.
    await context.route("**/*", route => {
      const request = route.request();
      if (["image", "media", "font"].includes(request.resourceType()) || /google-analytics|analytics\.google|posthog|clarity\.ms|doubleclick|\/measurement\//.test(request.url())) return route.abort();
      return route.continue();
    });
    page = await context.newPage();
    ctx.signal.throwIfAborted();
    page.setDefaultTimeout(8000);
    let blocked: CollectorError | undefined;
    page.on("response", response => {
      const url = new URL(response.url());
      const relevant = ["www.daangn.com", "api.bunjang.co.kr", "m.bunjang.co.kr"].includes(url.hostname)
        && ["document", "fetch", "xhr"].includes(response.request().resourceType());
      if (relevant && [403,429].includes(response.status())) {
        blocked = new CollectorError(`HTTP_${response.status()}`);
        void closePage();
      }
    });
    try {
      const result = await run(page);
      if (blocked) throw blocked;
      return result;
    } catch (error) { throw blocked ?? error; }
  } finally {
    ctx.signal.removeEventListener("abort", onAbort);
    await closePage();
    if (!process.env.VERCEL) await context.close().catch(() => {});
  }
}

export async function navigate(page: Page, url: string, signal: AbortSignal) {
  for (let attempt = 0; attempt < 2; attempt++) {
    signal.throwIfAborted();
    try {
      const response = await page.goto(url, { waitUntil: "domcontentloaded", timeout: 8000 });
      if (!response) throw new CollectorError("FETCH_FAILED");
      assertAccess(response.status(), await page.content());
      if (response.status() >= 500 && attempt === 0) continue;
      if (!response.ok()) throw new CollectorError(`HTTP_${response.status()}`);
      return;
    } catch (error) {
      if (error instanceof CollectorError || signal.aborted || attempt === 1) throw error;
    }
  }
}
