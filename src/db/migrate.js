import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { pathToFileURL } from "node:url";

import { loadConfig } from "../config/env.js";
import { createClient } from "./client.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const migrationFile = path.join(__dirname, "migrations", "001_mvp_schema.sql");
const memoryMigrationFile = path.join(__dirname, "migrations", "001_mvp_schema.pgmem.sql");

export async function runMigrations(config) {
  const selectedFile =
    config.db.driver === "pg-mem" ? memoryMigrationFile : migrationFile;
  const sql = await readFile(selectedFile, "utf8");
  const client = createClient(config);

  try {
    await client.connect();
    await client.query("BEGIN");
    await client.query(sql);
    await client.query("COMMIT");
  } catch (error) {
    try {
      await client.query("ROLLBACK");
    } catch {
      // No-op: rollback can fail when connection never opened.
    }

    throw error;
  } finally {
    await client.end();
  }
}

async function runMigrationScript() {
  const config = loadConfig();
  await runMigrations(config);
  console.log("SG-010 migration applied successfully.");
}

const isDirectExecution =
  process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isDirectExecution) {
  runMigrationScript();
}
