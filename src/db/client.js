import pg from "pg";
import { newDb } from "pg-mem";

const { Client } = pg;

let memoryDb;

function getMemoryDb() {
  if (!memoryDb) {
    memoryDb = newDb({ noAstCoverageCheck: true });
  }

  return memoryDb;
}

export function createClient(config) {
  if (config.db.driver === "pg-mem") {
    const InMemoryClient = getMemoryDb().adapters.createPg().Client;
    return new InMemoryClient();
  }

  return new Client({ connectionString: config.db.url });
}
