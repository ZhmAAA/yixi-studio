import { Pool } from "pg";
import {
  PODCAST_SCHEMA_STATEMENTS,
  draftToParams,
  rowToDraft,
  type PodcastDraftRow,
  type PodcastDraftStore
} from "@/server/repositories/podcast-store";

const INSERT = `INSERT INTO podcast_drafts (
  id, title, form, status, package_json, script_json, audio_plan_json, srt, created_at, updated_at
) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`;

export async function openPostgresPodcastStore(connectionString: string): Promise<PodcastDraftStore> {
  const pool = new Pool({ connectionString, max: 5 });
  for (const statement of PODCAST_SCHEMA_STATEMENTS) {
    await pool.query(statement);
  }
  console.info("[podcast] using postgres");

  return {
    async get(id) {
      const result = await pool.query<PodcastDraftRow>("SELECT * FROM podcast_drafts WHERE id = $1", [id]);
      const row = result.rows[0];
      return row ? rowToDraft(row) : undefined;
    },
    async list() {
      const result = await pool.query<PodcastDraftRow>("SELECT * FROM podcast_drafts ORDER BY updated_at DESC");
      return result.rows.map(rowToDraft);
    },
    async insert(draft) {
      await pool.query(INSERT, draftToParams(draft));
    }
  };
}
