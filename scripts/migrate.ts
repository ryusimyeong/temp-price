import "dotenv/config";
import { createClient } from "@libsql/client";
import { readFile } from "node:fs/promises";

async function main() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL을 설정해 주세요.");
  const client = createClient({ url: process.env.DATABASE_URL, authToken: process.env.DATABASE_AUTH_TOKEN });
  try {
    await client.execute('CREATE TABLE IF NOT EXISTS "_UsedPriceMigration" ("version" INTEGER PRIMARY KEY, "appliedAt" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)');
    const current = Number((await client.execute('SELECT COALESCE(MAX("version"), 0) AS version FROM "_UsedPriceMigration"')).rows[0].version);
    if (current === 1) { console.log("DB 스키마가 최신입니다 (v1)."); return; }
    if (current !== 0) throw new Error("지원하지 않는 DB 스키마 버전입니다.");
    const sql = await readFile(new URL("../prisma/migrations/0001_init/migration.sql", import.meta.url), "utf8");
    await client.batch([...sql.split(";").map(s => s.trim()).filter(Boolean), 'INSERT INTO "_UsedPriceMigration" ("version") VALUES (1)'], "write");
    console.log("단일 SQLite DB에 스키마 v1 적용 완료.");
  } finally { client.close(); }
}
main().catch(error => { console.error(error instanceof Error ? error.name : "MigrationError"); process.exitCode = 1; });
