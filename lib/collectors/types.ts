import type { Browser } from "playwright-core";
import type { RawListing } from "../types";
export interface CollectorContext {
  query: string;
  region: string;
  signal: AbortSignal;
  emit: (listings: RawListing[]) => void;
  browser: () => Promise<Browser>;
}
