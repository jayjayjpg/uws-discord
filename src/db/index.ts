import fs from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { env } from "../env.js";
import { logger } from "../logger.js";

// Uses Node's built-in `node:sqlite` (requires Node 22.5+) instead of a
// native addon like better-sqlite3 — no compiler toolchain needed to install.
const dbPath = path.resolve(process.cwd(), env.DATABASE_PATH);
fs.mkdirSync(path.dirname(dbPath), { recursive: true });

export const db = new DatabaseSync(dbPath);
db.exec("PRAGMA journal_mode = WAL;");

db.exec(`
  CREATE TABLE IF NOT EXISTS warnings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    guild_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    moderator_id TEXT NOT NULL,
    reason TEXT NOT NULL,
    created_at TEXT NOT NULL
  );
`);
db.exec(`CREATE INDEX IF NOT EXISTS idx_warnings_user ON warnings (guild_id, user_id);`);

db.exec(`
  CREATE TABLE IF NOT EXISTS tickets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    guild_id TEXT NOT NULL,
    channel_id TEXT NOT NULL UNIQUE,
    opener_id TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'open',
    created_at TEXT NOT NULL,
    closed_at TEXT,
    closed_by TEXT
  );
`);
db.exec(`CREATE INDEX IF NOT EXISTS idx_tickets_opener ON tickets (guild_id, opener_id, status);`);

db.exec(`
  CREATE TABLE IF NOT EXISTS message_stats (
    guild_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    message_count INTEGER NOT NULL DEFAULT 0,
    last_message_at TEXT,
    PRIMARY KEY (guild_id, user_id)
  );
`);

logger.info({ path: dbPath }, "SQLite database ready");

// ---------------------------------------------------------------------------
// Warnings
// ---------------------------------------------------------------------------
export interface WarningRow {
  id: number;
  guild_id: string;
  user_id: string;
  moderator_id: string;
  reason: string;
  created_at: string;
}

const insertWarningStmt = db.prepare(
  `INSERT INTO warnings (guild_id, user_id, moderator_id, reason, created_at) VALUES (@guildId, @userId, @moderatorId, @reason, @createdAt)`
);
const getWarningsStmt = db.prepare(`SELECT * FROM warnings WHERE guild_id = @guildId AND user_id = @userId ORDER BY created_at DESC`);

export function addWarning(guildId: string, userId: string, moderatorId: string, reason: string): void {
  insertWarningStmt.run({ guildId, userId, moderatorId, reason, createdAt: new Date().toISOString() });
}

export function getWarnings(guildId: string, userId: string): WarningRow[] {
  return getWarningsStmt.all({ guildId, userId }) as unknown as WarningRow[];
}

// ---------------------------------------------------------------------------
// Tickets
// ---------------------------------------------------------------------------
export interface TicketRow {
  id: number;
  guild_id: string;
  channel_id: string;
  opener_id: string;
  status: "open" | "closed";
  created_at: string;
  closed_at: string | null;
  closed_by: string | null;
}

const createTicketStmt = db.prepare(
  `INSERT INTO tickets (guild_id, channel_id, opener_id, status, created_at) VALUES (@guildId, @channelId, @openerId, 'open', @createdAt)`
);
const getOpenTicketByUserStmt = db.prepare(`SELECT * FROM tickets WHERE guild_id = @guildId AND opener_id = @openerId AND status = 'open'`);
const getTicketByChannelStmt = db.prepare(`SELECT * FROM tickets WHERE channel_id = @channelId`);
const closeTicketStmt = db.prepare(`UPDATE tickets SET status = 'closed', closed_at = @closedAt, closed_by = @closedBy WHERE channel_id = @channelId`);

export function createTicket(guildId: string, channelId: string, openerId: string): void {
  createTicketStmt.run({ guildId, channelId, openerId, createdAt: new Date().toISOString() });
}

export function getOpenTicketByUser(guildId: string, openerId: string): TicketRow | undefined {
  return getOpenTicketByUserStmt.get({ guildId, openerId }) as unknown as TicketRow | undefined;
}

export function getTicketByChannel(channelId: string): TicketRow | undefined {
  return getTicketByChannelStmt.get({ channelId }) as unknown as TicketRow | undefined;
}

export function closeTicket(channelId: string, closedBy: string): void {
  closeTicketStmt.run({ channelId, closedAt: new Date().toISOString(), closedBy });
}

// ---------------------------------------------------------------------------
// Engagement (minimal message-count stats)
// ---------------------------------------------------------------------------
const bumpMessageCountStmt = db.prepare(`
  INSERT INTO message_stats (guild_id, user_id, message_count, last_message_at)
  VALUES (@guildId, @userId, 1, @now)
  ON CONFLICT(guild_id, user_id) DO UPDATE SET message_count = message_count + 1, last_message_at = @now
`);
const getMessageCountStmt = db.prepare(`SELECT message_count FROM message_stats WHERE guild_id = @guildId AND user_id = @userId`);
const getTotalTrackedMessagesStmt = db.prepare(`SELECT COALESCE(SUM(message_count), 0) as total FROM message_stats WHERE guild_id = @guildId`);

export function bumpMessageCount(guildId: string, userId: string): void {
  bumpMessageCountStmt.run({ guildId, userId, now: new Date().toISOString() });
}

export function getMessageCount(guildId: string, userId: string): number {
  const row = getMessageCountStmt.get({ guildId, userId }) as unknown as { message_count: number } | undefined;
  return row?.message_count ?? 0;
}

export function getTotalTrackedMessages(guildId: string): number {
  const row = getTotalTrackedMessagesStmt.get({ guildId }) as unknown as { total: number } | undefined;
  return row?.total ?? 0;
}
