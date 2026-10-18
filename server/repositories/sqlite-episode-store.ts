import fs from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { EPISODE_SCHEMA_STATEMENTS, recordToParams, rowToRecord, type EpisodeStore } from "@/server/repositories/episode-store";
import type { EpisodeRecord, EpisodeRow } from "@/server/repositories/episode-types";

const INSERT = `INSERT INTO episodes (
  id, title, question, topic_id, person_ids, format, duration, combination_type,
  disclosure, turns, status, error, created_at, updated_at
) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

const INSERT_IF_ABSENT = INSERT.replace("INSERT INTO", "INSERT OR IGNORE INTO");

const UPDATE = `UPDATE episodes SET
  title = ?, question = ?, topic_id = ?, person_ids = ?, format = ?, duration = ?,
  combination_type = ?, disclosure = ?, turns = ?, status = ?, error = ?, created_at = ?, updated_at = ?
  WHERE id = ?`;

function updateParams(record: EpisodeRecord) {
  const [id, ...rest] = recordToParams(record);
  return [...rest, id];
}

export function openSqliteEpisodeStore(filePath?: string): EpisodeStore {
  const resolved = filePath?.trim() || path.join(process.cwd(), "data", "episodes.sqlite");
  fs.mkdirSync(path.dirname(resolved), { recursive: true });
  const database = new DatabaseSync(resolved);
  database.exec("PRAGMA journal_mode = WAL");
  for (const statement of EPISODE_SCHEMA_STATEMENTS) database.exec(statement);
  console.info(`[episodes] using sqlite ${resolved}`);

  const getStatement = database.prepare("SELECT * FROM episodes WHERE id = ?");
  const listStatement = database.prepare("SELECT * FROM episodes ORDER BY updated_at DESC");
  const insertStatement = database.prepare(INSERT);
  const insertIfAbsentStatement = database.prepare(INSERT_IF_ABSENT);
  const updateStatement = database.prepare(UPDATE);

  return {
    async get(id) {
      const row = getStatement.get(id) as EpisodeRow | undefined;
      return row ? rowToRecord(row) : undefined;
    },
    async list() {
      return (listStatement.all() as EpisodeRow[]).map(rowToRecord);
    },
    async insert(record) {
      insertStatement.run(...recordToParams(record));
    },
    async insertIfAbsent(record) {
      insertIfAbsentStatement.run(...recordToParams(record));
    },
    async save(record) {
      updateStatement.run(...updateParams(record));
    }
  };
}
