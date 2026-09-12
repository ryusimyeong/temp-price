import { PrismaLibSql } from "@prisma/adapter-libsql";
import { PrismaClient } from "../generated/prisma/client";

const globalDb = globalThis as unknown as { usedPriceDb?: PrismaClient };
export class StorageError extends Error {
  constructor(public code: "DATABASE_NOT_CONFIGURED" | "DATABASE_UNAVAILABLE") { super(code); }
}
export function db() {
  if (!process.env.DATABASE_URL) throw new StorageError("DATABASE_NOT_CONFIGURED");
  return globalDb.usedPriceDb ??= new PrismaClient({
    adapter: new PrismaLibSql({ url: process.env.DATABASE_URL, authToken: process.env.DATABASE_AUTH_TOKEN }),
  });
}
