import { MARKETS, type MarketResult, type RawListing } from "../types";
import { collectDaangn } from "./daangn";
import { collectBunjang } from "./bunjang";
import { browserSession } from "./browser";
import { CollectorError } from "./fetch";

export async function collectAll(query: string, region: string, signal: AbortSignal): Promise<MarketResult[]> {
  const session = browserSession();
  try {
    const settled = await Promise.allSettled(MARKETS.map(async marketplace => {
      const start = Date.now();
      const listings: RawListing[] = [];
      const ids = new Set<string>();
      const disabled = (process.env.DISABLED_MARKETS ?? "").split(",").includes(marketplace);
      if (disabled) return { marketplace, listings, status: "failed" as const, code: "DISABLED", durationMs: 0 };
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(new CollectorError("TIMEOUT")), 15000);
      const combined = AbortSignal.any([signal, controller.signal]);
      let completed = false;
      let onAbort: () => void = () => {};
      try {
        combined.throwIfAborted();
        const task = (marketplace === "daangn" ? collectDaangn : collectBunjang)({
          query, region, signal: combined, browser: session.get,
          emit: items => {
            if (completed || combined.aborted) return;
            for (const item of items) if (listings.length < 100 && !ids.has(item.externalId)) { listings.push(item); ids.add(item.externalId); }
          },
        });
        await Promise.race([task, new Promise<never>((_, reject) => {
          onAbort = () => reject(new CollectorError("TIMEOUT"));
          combined.addEventListener("abort", onAbort, { once: true });
          if (combined.aborted) onAbort();
        })]);
        return { marketplace, listings, status: "success" as const, durationMs: Date.now() - start };
      } catch (error) {
        const code = combined.aborted || (error instanceof Error && error.name === "TimeoutError") ? "TIMEOUT" : error instanceof CollectorError ? error.code : "FETCH_FAILED";
        console.warn("[collector]", JSON.stringify({ marketplace, code, count: listings.length, durationMs: Date.now() - start,
          detail: error instanceof Error ? error.message.slice(0, 500) : "unknown",
        }));
        return { marketplace, listings, status: listings.length ? "partial" as const : "failed" as const, code, durationMs: Date.now() - start };
      } finally {
        completed = true; clearTimeout(timer); combined.removeEventListener("abort", onAbort); controller.abort();
      }
    }));
    return settled.map((result, index) => result.status === "fulfilled" ? result.value : { marketplace: MARKETS[index], status: "failed", code: "FETCH_FAILED", listings: [], durationMs: 0 });
  } finally { await session.close(); }
}
