import { createClient } from "./client.js";

function toIsoString(value) {
  if (!value) {
    return value;
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  return value;
}

function mapMonitoredUrl(row) {
  if (!row) {
    return null;
  }

  let keywords = row.keywords;
  if (typeof keywords === "string") {
    try {
      keywords = JSON.parse(keywords);
    } catch {
      keywords = [];
    }
  }

  return {
    id: row.id,
    url: row.url,
    name: row.name,
    priority: row.priority,
    keywords,
    active: row.active,
    createdAt: toIsoString(row.created_at),
    updatedAt: toIsoString(row.updated_at)
  };
}

function mapSnapshot(row) {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    monitoredUrlId: row.monitored_url_id,
    rawContent: row.raw_content,
    normalizedContent: row.normalized_content,
    contentHash: row.content_hash,
    scrapedAt: toIsoString(row.scraped_at),
    createdAt: toIsoString(row.created_at)
  };
}

function mapChangeEvent(row) {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    monitoredUrlId: row.monitored_url_id,
    previousSnapshotId: row.previous_snapshot_id,
    currentSnapshotId: row.current_snapshot_id,
    riskLevel: row.risk_level,
    relevanceScore: row.relevance_score,
    summary: row.summary,
    businessImpact: row.business_impact,
    recommendation: row.recommendation,
    notifiedAt: toIsoString(row.notified_at),
    createdAt: toIsoString(row.created_at)
  };
}

async function withClient(config, fn) {
  const client = createClient(config);

  try {
    await client.connect();
    return await fn(client);
  } finally {
    await client.end();
  }
}

function createMonitoredUrlRepository(config) {
  return {
    async create({ url, name, priority = "medium", keywords = [], active = true }) {
      return withClient(config, async (client) => {
        const result = await client.query(
          `INSERT INTO monitored_url (url, name, priority, keywords, active)
           VALUES ($1, $2, $3, $4::jsonb, $5)
           RETURNING *`,
          [url, name, priority, JSON.stringify(keywords), active]
        );

        return mapMonitoredUrl(result.rows[0]);
      });
    },

    async getById(id) {
      return withClient(config, async (client) => {
        const result = await client.query("SELECT * FROM monitored_url WHERE id = $1", [id]);
        return mapMonitoredUrl(result.rows[0]);
      });
    },

    async getByUrl(url) {
      return withClient(config, async (client) => {
        const result = await client.query("SELECT * FROM monitored_url WHERE url = $1", [url]);
        return mapMonitoredUrl(result.rows[0]);
      });
    },

    async listActive() {
      return withClient(config, async (client) => {
        const result = await client.query(
          "SELECT * FROM monitored_url WHERE active = TRUE ORDER BY id ASC"
        );
        return result.rows.map(mapMonitoredUrl);
      });
    },

    async update(id, patch) {
      const fields = [];
      const params = [];

      if (patch.url !== undefined) {
        fields.push(`url = $${params.length + 1}`);
        params.push(patch.url);
      }

      if (patch.name !== undefined) {
        fields.push(`name = $${params.length + 1}`);
        params.push(patch.name);
      }

      if (patch.priority !== undefined) {
        fields.push(`priority = $${params.length + 1}`);
        params.push(patch.priority);
      }

      if (patch.keywords !== undefined) {
        fields.push(`keywords = $${params.length + 1}::jsonb`);
        params.push(JSON.stringify(patch.keywords));
      }

      if (patch.active !== undefined) {
        fields.push(`active = $${params.length + 1}`);
        params.push(patch.active);
      }

      fields.push(`updated_at = NOW()`);
      params.push(id);

      return withClient(config, async (client) => {
        const result = await client.query(
          `UPDATE monitored_url
           SET ${fields.join(", ")}
           WHERE id = $${params.length}
           RETURNING *`,
          params
        );

        return mapMonitoredUrl(result.rows[0]);
      });
    },

    async delete(id) {
      await withClient(config, (client) =>
        client.query("DELETE FROM monitored_url WHERE id = $1", [id])
      );
    }
  };
}

function createSnapshotRepository(config) {
  return {
    async insert({ monitoredUrlId, rawContent, normalizedContent, contentHash, scrapedAt }) {
      return withClient(config, async (client) => {
        const result = await client.query(
          `INSERT INTO snapshot (
            monitored_url_id,
            raw_content,
            normalized_content,
            content_hash,
            scraped_at
          ) VALUES ($1, $2, $3, $4, $5)
          RETURNING *`,
          [monitoredUrlId, rawContent, normalizedContent, contentHash, scrapedAt]
        );

        return mapSnapshot(result.rows[0]);
      });
    },

    async getLatestByMonitoredUrlId(monitoredUrlId) {
      return withClient(config, async (client) => {
        const result = await client.query(
          `SELECT * FROM snapshot
           WHERE monitored_url_id = $1
           ORDER BY scraped_at DESC, id DESC
           LIMIT 1`,
          [monitoredUrlId]
        );

        return mapSnapshot(result.rows[0]);
      });
    }
  };
}

function createChangeEventRepository(config) {
  return {
    async insert({
      monitoredUrlId,
      previousSnapshotId,
      currentSnapshotId,
      riskLevel,
      relevanceScore,
      summary,
      businessImpact,
      recommendation
    }) {
      return withClient(config, async (client) => {
        const result = await client.query(
          `INSERT INTO change_event (
            monitored_url_id,
            previous_snapshot_id,
            current_snapshot_id,
            risk_level,
            relevance_score,
            summary,
            business_impact,
            recommendation
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
          RETURNING *`,
          [
            monitoredUrlId,
            previousSnapshotId ?? null,
            currentSnapshotId,
            riskLevel,
            relevanceScore,
            summary,
            businessImpact,
            recommendation
          ]
        );

        return mapChangeEvent(result.rows[0]);
      });
    },

    async markNotified(id, notifiedAt = new Date().toISOString()) {
      return withClient(config, async (client) => {
        const result = await client.query(
          `UPDATE change_event
           SET notified_at = $1
           WHERE id = $2
           RETURNING *`,
          [notifiedAt, id]
        );

        return mapChangeEvent(result.rows[0]);
      });
    }
  };
}

export function createRepositories(config) {
  return {
    monitoredUrls: createMonitoredUrlRepository(config),
    snapshots: createSnapshotRepository(config),
    changeEvents: createChangeEventRepository(config)
  };
}
