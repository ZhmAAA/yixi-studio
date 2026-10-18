import fs from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import {
  PODCAST_SCHEMA_STATEMENTS,
  draftToParams,
  rowToDraft,
  type PodcastDraftRow,
  type PodcastDraftStore
} from "@/server/repositories/podcast-store";

const INSERT = `INSERT INTO podcast_drafts (
  id, title, form, status, package_json, script_json, audio_plan_json, srt, created_at, updated_at
) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

export function openSqlitePodcastStore(filePath?: string): PodcastDraftStore {
  const resolved = filePath?.trim() || path.join(process.cwd(), "data", "episodes.sqlite");
  fs.mkdirSync(path.dirname(resolved), { recursive: true });
  const database = new DatabaseSync(resolved);
  database.exec("PRAGMA journal_mode = WAL");
  for (const statement of PODCAST_SCHEMA_STATEMENTS) database.exec(statement);
  console.info(`[podcast] using sqlite ${resolved}`);

  const getStatement = database.prepare("SELECT * FROM podcast_drafts WHERE id = ?");
  const listStatement = database.prepare("SELECT * FROM podcast_drafts ORDER BY updated_at DESC");
  const insertStatement = database.prepare(INSERT);

  const store: PodcastDraftStore & { database: DatabaseSync } = {
    database,
    async get(id) {
      const row = getStatement.get(id) as PodcastDraftRow | undefined;
      return row ? rowToDraft(row) : undefined;
    },
    async list() {
      return (listStatement.all() as PodcastDraftRow[]).map(rowToDraft);
    },
    async insert(draft) {
      insertStatement.run(...draftToParams(draft));
    }
  };
  return store;
}
