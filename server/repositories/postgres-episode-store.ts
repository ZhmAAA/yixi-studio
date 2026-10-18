import { Pool } from "pg";
import { EPISODE_SCHEMA_STATEMENTS, recordToParams, rowToRecord, type EpisodeStore } from "@/server/repositories/episode-store";
import type { EpisodeRecord, EpisodeRow } from "@/server/repositories/episode-types";

const INSERT = `INSERT INTO episodes (
  id, title, question, topic_id, person_ids, format, duration, combination_type,
  disclosure, turns, status, error, created_at, updated_at
) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`;

const INSERT_IF_ABSENT = `${INSERT} ON CONFLICT (id) DO NOTHING`;

const UPDATE = `UPDATE episodes SET
  title = $1, question = $2, topic_id = $3, person_ids = $4, format = $5, duration = $6,
  combination_type = $7, disclosure = $8, turns = $9, status = $10, error = $11, created_at = $12, updated_at = $13
  WHERE id = $14`;

function updateParams(record: EpisodeRecord) {
  const [id, ...rest] = recordToParams(record);
  return [...rest, id];
}

export async function openPostgresEpisodeStore(connectionString: string): Promise<EpisodeStore> {
  const pool = new Pool({ connectionString, max: 5 });
  for (const statement of EPISODE_SCHEMA_STATEMENTS) {
    await pool.query(statement);
  }
  console.info("[episodes] using postgres");

  return {
    async get(id) {
      const result = await pool.query<EpisodeRow>("SELECT * FROM episodes WHERE id = $1", [id]);
      const row = result.rows[0];
      return row ? rowToRecord(row) : undefined;
    },
    async list() {
      const result = await pool.query<EpisodeRow>("SELECT * FROM episodes ORDER BY updated_at DESC");
      return result.rows.map(rowToRecord);
    },
    async insert(record) {
      await pool.query(INSERT, recordToParams(record));
    },
    async insertIfAbsent(record) {
      await pool.query(INSERT_IF_ABSENT, recordToParams(record));
    },
    async save(record) {
      await pool.query(UPDATE, updateParams(record));
    }
  };
}
