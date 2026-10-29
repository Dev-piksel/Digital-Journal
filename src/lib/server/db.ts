import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import type { JournalEntry, JournalStats, MoodType, User, UserRole, UserWithStats } from '../types.js';
import { MOODS } from '../types.js';
import { hashPassword, generateSessionToken } from './auth.js';

const DB_DIR = path.resolve(process.cwd(), 'data');
if (!fs.existsSync(DB_DIR)) {
	fs.mkdirSync(DB_DIR, { recursive: true });
}

const DB_PATH = path.join(DB_DIR, 'journal.db');
export const db = new DatabaseSync(DB_PATH);

// Setup schema
db.exec(`
	CREATE TABLE IF NOT EXISTS users (
		id TEXT PRIMARY KEY,
		username TEXT UNIQUE NOT NULL,
		passwordHash TEXT NOT NULL,
		displayName TEXT NOT NULL,
		role TEXT NOT NULL DEFAULT 'user',
		created INTEGER NOT NULL,
		updated INTEGER NOT NULL
	);
	CREATE INDEX IF NOT EXISTS idx_users_username ON users (username);

	CREATE TABLE IF NOT EXISTS sessions (
		id TEXT PRIMARY KEY,
		userId TEXT NOT NULL,
		expiresAt INTEGER NOT NULL
	);
	CREATE INDEX IF NOT EXISTS idx_sessions_userId ON sessions (userId);

	CREATE TABLE IF NOT EXISTS entries (
		id TEXT PRIMARY KEY,
		userId TEXT NOT NULL DEFAULT 'admin',
		title TEXT NOT NULL DEFAULT '',
		content TEXT NOT NULL DEFAULT '',
		mood TEXT NOT NULL DEFAULT 'calm',
		tags TEXT NOT NULL DEFAULT '[]',
		created INTEGER NOT NULL,
		updated INTEGER NOT NULL,
		deleted INTEGER DEFAULT NULL
	);
	CREATE INDEX IF NOT EXISTS idx_entries_created ON entries (created);
	CREATE INDEX IF NOT EXISTS idx_entries_deleted ON entries (deleted);
`);

// Migration: Ensure userId column exists in entries table
try {
	db.exec("ALTER TABLE entries ADD COLUMN userId TEXT NOT NULL DEFAULT 'admin';");
} catch {
	// Column already exists
}

try {
	db.exec('CREATE INDEX IF NOT EXISTS idx_entries_userId ON entries (userId);');
} catch {
	// Index already exists
}

// 30 days in milliseconds
const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

// Auto purge items deleted > 30 days ago
export function autoPurgeExpiredTrash(): number {
	const cutoff = Date.now() - THIRTY_DAYS_MS;
	const stmt = db.prepare('DELETE FROM entries WHERE deleted IS NOT NULL AND deleted < ?');
	const result = stmt.run(cutoff);
	return Number(result.changes);
}

// Map raw database row to JournalEntry
interface RawEntryRow {
	id: string;
	userId: string;
	title: string;
	content: string;
	mood: string;
	tags: string;
	created: number;
	updated: number;
	deleted: number | null;
}

function mapRow(row: RawEntryRow): JournalEntry {
	let parsedTags: string[] = [];
	try {
		parsedTags = JSON.parse(row.tags || '[]');
	} catch {
		parsedTags = [];
	}

	return {
		id: row.id,
		userId: row.userId || 'admin',
		title: row.title,
		content: row.content,
		mood: (row.mood as MoodType) || 'calm',
		tags: parsedTags,
		created: Number(row.created),
		updated: Number(row.updated),
		deleted: row.deleted !== null ? Number(row.deleted) : null
	};
}

// Generate unique ID
export function generateUid(): string {
	return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

// --- USER & AUTHENTICATION MANAGEMENT ---

interface RawUserRow {
	id: string;
	username: string;
	passwordHash: string;
	displayName: string;
	role: string;
	created: number;
	updated: number;
}

function mapUser(row: RawUserRow): User {
	return {
		id: row.id,
		username: row.username,
		displayName: row.displayName,
		role: (row.role as UserRole) || 'user',
		created: Number(row.created),
		updated: Number(row.updated)
	};
}

export function seedUsersAndInitialData(): void {
	const userCountRow = db.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number };

	let adminId = 'admin-user-01';
	let demoId = 'demo-user-01';

	if (userCountRow.count === 0) {
		const now = Date.now();
		const adminHash = hashPassword('admin123');
		const demoHash = hashPassword('user123');

		const insertUser = db.prepare(`
			INSERT INTO users (id, username, passwordHash, displayName, role, created, updated)
			VALUES (?, ?, ?, ?, ?, ?, ?)
		`);

		insertUser.run(adminId, 'admin', adminHash, 'Administrator', 'admin', now, now);
		insertUser.run(demoId, 'demo', demoHash, 'Demo Writer', 'user', now, now);
	} else {
		const adminRow = db.prepare("SELECT id FROM users WHERE username = 'admin'").get() as { id: string } | undefined;
		if (adminRow) adminId = adminRow.id;
		const demoRow = db.prepare("SELECT id FROM users WHERE username = 'demo'").get() as { id: string } | undefined;
		if (demoRow) demoId = demoRow.id;
	}

	// Update any unassigned entries to the adminId
	db.prepare("UPDATE entries SET userId = ? WHERE userId IS NULL OR userId = 'admin' OR userId = ''").run(adminId);

	// Seed sample entries if entries table is empty
	const countRow = db.prepare('SELECT COUNT(*) as count FROM entries').get() as { count: number };
	if (countRow.count === 0) {
		const now = Date.now();
		const DAY = 864e5;
		const ago = (d: number) => now - d * DAY;
		const oneYearAgo = new Date();
		oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

		const initialEntries: Array<{
			title: string;
			content: string;
			mood: MoodType;
			tags: string[];
			created: number;
		}> = [
			{
				title: 'A slow, good morning',
				content:
					'Coffee on the balcony and **no phone** until nine. Felt like the first real breath in weeks.\n- Read twenty pages\n- Walked to the market',
				mood: 'calm',
				tags: ['Wellness'],
				created: ago(0)
			},
			{
				title: 'Deadline week',
				content:
					'Long day. Shipped the draft but my head is *foggy*. Early night tomorrow.',
				mood: 'tired',
				tags: ['Work'],
				created: ago(1)
			},
			{
				title: 'Trail run',
				content:
					'Ran the ridge loop in 48 minutes, a personal best. Legs are jelly but I am thrilled.',
				mood: 'happy',
				tags: ['Fitness'],
				created: ago(2)
			},
			{
				title: 'What I want this year',
				content:
					'Thinking about what really matters: time outdoors, finishing the side project, calling family more.',
				mood: 'reflective',
				tags: ['Goals'],
				created: ago(4)
			},
			{
				title: 'Rainy day',
				content:
					'Missed the bus, got soaked, but a stranger shared an umbrella. Small kindnesses.',
				mood: 'sad',
				tags: ['Travel'],
				created: ago(5)
			},
			{
				title: 'One year ago today',
				content:
					'Packed for the weekend trip. Nervous but excited about the new chapter.',
				mood: 'happy',
				tags: ['Travel'],
				created: oneYearAgo.getTime()
			}
		];

		const insertStmt = db.prepare(`
			INSERT INTO entries (id, userId, title, content, mood, tags, created, updated, deleted)
			VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL)
		`);

		for (const e of initialEntries) {
			insertStmt.run(
				generateUid(),
				adminId,
				e.title,
				e.content,
				e.mood,
				JSON.stringify(e.tags),
				e.created,
				e.created
			);
		}
	}
}

// Initialise DB & Seed
autoPurgeExpiredTrash();
seedUsersAndInitialData();

export function getUserByUsername(username: string): (User & { passwordHash: string }) | null {
	const stmt = db.prepare('SELECT * FROM users WHERE LOWER(username) = LOWER(?)');
	const row = stmt.get(username) as unknown as RawUserRow | undefined;
	if (!row) return null;
	return {
		...mapUser(row),
		passwordHash: row.passwordHash
	};
}

export function getUserById(id: string): User | null {
	const stmt = db.prepare('SELECT * FROM users WHERE id = ?');
	const row = stmt.get(id) as unknown as RawUserRow | undefined;
	if (!row) return null;
	return mapUser(row);
}

export function createUser(data: {
	username: string;
	password: string;
	displayName: string;
	role?: UserRole;
}): User {
	const id = generateUid();
	const now = Date.now();
	const cleanUsername = data.username.trim().toLowerCase();
	const passwordHash = hashPassword(data.password);
	const displayName = data.displayName.trim() || data.username.trim();
	const role = data.role || 'user';

	const stmt = db.prepare(`
		INSERT INTO users (id, username, passwordHash, displayName, role, created, updated)
		VALUES (?, ?, ?, ?, ?, ?, ?)
	`);

	stmt.run(id, cleanUsername, passwordHash, displayName, role, now, now);

	return {
		id,
		username: cleanUsername,
		displayName,
		role,
		created: now,
		updated: now
	};
}

export function adminResetUserPassword(userId: string, newPassword: string): boolean {
	const passwordHash = hashPassword(newPassword);
	const updated = Date.now();

	const stmt = db.prepare('UPDATE users SET passwordHash = ?, updated = ? WHERE id = ?');
	const result = stmt.run(passwordHash, updated, userId);

	// Also clear active sessions so user must log in with new password
	deleteUserSessions(userId);

	return Number(result.changes) > 0;
}

export function getAllUsersWithStats(): UserWithStats[] {
	const usersStmt = db.prepare('SELECT * FROM users ORDER BY created ASC');
	const userRows = usersStmt.all() as unknown as RawUserRow[];

	const entriesStmt = db.prepare(`
		SELECT userId, content, created FROM entries WHERE deleted IS NULL
	`);
	const entriesRows = entriesStmt.all() as unknown as Array<{ userId: string; content: string; created: number }>;

	const statsByUser = new Map<string, { entryCount: number; wordCount: number; lastActive: number | null }>();

	for (const e of entriesRows) {
		const stats = statsByUser.get(e.userId) || { entryCount: 0, wordCount: 0, lastActive: null };
		stats.entryCount += 1;
		stats.wordCount += e.content.split(/\s+/).filter(Boolean).length;
		if (!stats.lastActive || e.created > stats.lastActive) {
			stats.lastActive = e.created;
		}
		statsByUser.set(e.userId, stats);
	}

	return userRows.map((row) => {
		const user = mapUser(row);
		const userStats = statsByUser.get(user.id) || { entryCount: 0, wordCount: 0, lastActive: null };
		return {
			...user,
			...userStats
		};
	});
}

// --- SESSION MANAGEMENT ---

export function createSession(userId: string): { token: string; expiresAt: number } {
	const token = generateSessionToken();
	const expiresAt = Date.now() + 30 * 24 * 60 * 60 * 1000; // 30 days

	const stmt = db.prepare('INSERT INTO sessions (id, userId, expiresAt) VALUES (?, ?, ?)');
	stmt.run(token, userId, expiresAt);

	return { token, expiresAt };
}

export function validateSession(token: string): User | null {
	const stmt = db.prepare(`
		SELECT s.expiresAt, u.*
		FROM sessions s
		JOIN users u ON s.userId = u.id
		WHERE s.id = ?
	`);

	const row = stmt.get(token) as unknown as (RawUserRow & { expiresAt: number }) | undefined;
	if (!row) return null;

	if (Date.now() > Number(row.expiresAt)) {
		deleteSession(token);
		return null;
	}

	return mapUser(row);
}

export function deleteSession(token: string): void {
	db.prepare('DELETE FROM sessions WHERE id = ?').run(token);
}

export function deleteUserSessions(userId: string): void {
	db.prepare('DELETE FROM sessions WHERE userId = ?').run(userId);
}

// --- JOURNAL ENTRIES APIS (SCOPED TO USER) ---

export function getAllEntries(
	userId: string,
	filters?: {
		view?: 'active' | 'trash' | 'all';
		q?: string;
		tag?: string;
		mood?: string;
		day?: string;
	}
): JournalEntry[] {
	autoPurgeExpiredTrash();

	let sql = 'SELECT * FROM entries WHERE userId = ?';
	const params: (string | number)[] = [userId];

	const view = filters?.view || 'active';
	if (view === 'active') {
		sql += ' AND deleted IS NULL';
	} else if (view === 'trash') {
		sql += ' AND deleted IS NOT NULL';
	}

	if (filters?.mood) {
		sql += ' AND mood = ?';
		params.push(filters.mood);
	}

	if (filters?.tag) {
		sql += ' AND tags LIKE ?';
		params.push(`%"${filters.tag}"%`);
	}

	if (filters?.q) {
		const query = `%${filters.q.toLowerCase()}%`;
		sql += ' AND (LOWER(title) LIKE ? OR LOWER(content) LIKE ? OR LOWER(tags) LIKE ?)';
		params.push(query, query, query);
	}

	if (view === 'trash') {
		sql += ' ORDER BY deleted DESC';
	} else {
		sql += ' ORDER BY created DESC';
	}

	const stmt = db.prepare(sql);
	const rows = stmt.all(...params) as unknown as RawEntryRow[];
	let entries = rows.map(mapRow);

	if (filters?.day) {
		const targetDayKey = filters.day;
		entries = entries.filter((e) => {
			const d = new Date(e.created);
			const dayKey = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
			return dayKey === targetDayKey;
		});
	}

	return entries;
}

export function getEntryById(id: string, userId?: string): JournalEntry | null {
	let sql = 'SELECT * FROM entries WHERE id = ?';
	const params = [id];

	if (userId) {
		sql += ' AND userId = ?';
		params.push(userId);
	}

	const stmt = db.prepare(sql);
	const row = stmt.get(...params) as unknown as RawEntryRow | undefined;
	if (!row) return null;
	return mapRow(row);
}

export function createEntry(
	userId: string,
	data: {
		title: string;
		content: string;
		mood: MoodType;
		tags: string[];
		created?: number;
	}
): JournalEntry {
	const id = generateUid();
	const now = data.created || Date.now();
	const tagsJson = JSON.stringify(data.tags || []);

	const stmt = db.prepare(`
		INSERT INTO entries (id, userId, title, content, mood, tags, created, updated, deleted)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL)
	`);

	stmt.run(id, userId, data.title.trim(), data.content, data.mood || 'calm', tagsJson, now, now);

	return {
		id,
		userId,
		title: data.title.trim(),
		content: data.content,
		mood: data.mood || 'calm',
		tags: data.tags || [],
		created: now,
		updated: now,
		deleted: null
	};
}

export function updateEntry(
	id: string,
	userId: string,
	data: {
		title?: string;
		content?: string;
		mood?: MoodType;
		tags?: string[];
	}
): JournalEntry | null {
	const existing = getEntryById(id, userId);
	if (!existing) return null;

	const title = data.title !== undefined ? data.title.trim() : existing.title;
	const content = data.content !== undefined ? data.content : existing.content;
	const mood = data.mood !== undefined ? data.mood : existing.mood;
	const tags = data.tags !== undefined ? data.tags : existing.tags;
	const updated = Date.now();

	const stmt = db.prepare(`
		UPDATE entries
		SET title = ?, content = ?, mood = ?, tags = ?, updated = ?
		WHERE id = ? AND userId = ?
	`);

	stmt.run(title, content, mood, JSON.stringify(tags), updated, id, userId);

	return {
		...existing,
		title,
		content,
		mood,
		tags,
		updated
	};
}

export function softDeleteEntry(id: string, userId: string): boolean {
	const stmt = db.prepare('UPDATE entries SET deleted = ? WHERE id = ? AND userId = ?');
	const result = stmt.run(Date.now(), id, userId);
	return Number(result.changes) > 0;
}

export function restoreEntry(id: string, userId: string): boolean {
	const stmt = db.prepare('UPDATE entries SET deleted = NULL WHERE id = ? AND userId = ?');
	const result = stmt.run(id, userId);
	return Number(result.changes) > 0;
}

export function deletePermanently(id: string, userId: string): boolean {
	const stmt = db.prepare('DELETE FROM entries WHERE id = ? AND userId = ?');
	const result = stmt.run(id, userId);
	return Number(result.changes) > 0;
}

export function purgeAllTrash(userId: string): number {
	const stmt = db.prepare('DELETE FROM entries WHERE deleted IS NOT NULL AND userId = ?');
	const result = stmt.run(userId);
	return Number(result.changes);
}

export function getTagsSummary(userId: string): Array<{ tag: string; count: number }> {
	const entries = getAllEntries(userId, { view: 'active' });
	const countMap: Record<string, number> = {};

	for (const e of entries) {
		for (const t of e.tags) {
			countMap[t] = (countMap[t] || 0) + 1;
		}
	}

	return Object.entries(countMap)
		.map(([tag, count]) => ({ tag, count }))
		.sort((a, b) => b.count - a.count);
}

export function getOnThisDayMemory(userId: string): JournalEntry | null {
	const entries = getAllEntries(userId, { view: 'active' });
	const now = new Date();
	const todayMonth = now.getMonth();
	const todayDate = now.getDate();
	const currentYear = now.getFullYear();

	const match = entries.find((e) => {
		const d = new Date(e.created);
		return (
			d.getDate() === todayDate &&
			d.getMonth() === todayMonth &&
			d.getFullYear() < currentYear
		);
	});

	return match || null;
}

export function getJournalStats(userId: string): JournalStats {
	const activeEntries = getAllEntries(userId, { view: 'active' });
	const now = Date.now();
	const DAY = 864e5;

	let totalWords = 0;
	const activeDaysSet = new Set<string>();
	const moodScores: Record<string, number> = {};

	for (const e of activeEntries) {
		const words = e.content.split(/\s+/).filter(Boolean).length;
		totalWords += words;
		const d = new Date(e.created);
		activeDaysSet.add(`${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`);
		moodScores[e.mood] = (moodScores[e.mood] || 0) + 1;
	}

	let mostFrequentMood: string | null = null;
	let maxCount = 0;
	for (const [m, count] of Object.entries(moodScores)) {
		if (count > maxCount) {
			maxCount = count;
			mostFrequentMood = m;
		}
	}

	const last7Days = [...Array(7)].map((_, i) => {
		const dayDate = new Date(now - (6 - i) * DAY);
		const dayKey = `${dayDate.getFullYear()}-${dayDate.getMonth()}-${dayDate.getDate()}`;
		const matching = activeEntries.filter((e) => {
			const d = new Date(e.created);
			return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}` === dayKey;
		});

		const scoreSum = matching.reduce((sum, e) => sum + (MOODS[e.mood]?.score || 3), 0);
		const avgScore = matching.length > 0 ? Number((scoreSum / matching.length).toFixed(1)) : 0;
		const primaryEmoji = matching[0] ? MOODS[matching[0].mood]?.emoji || null : null;

		return {
			dateKey: dayKey,
			dayLabel: dayDate.toLocaleDateString(undefined, { weekday: 'short' }).slice(0, 2),
			fullDate: dayDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
			score: avgScore,
			entryCount: matching.length,
			primaryEmoji
		};
	});

	return {
		totalEntries: activeEntries.length,
		totalWords,
		activeDays: activeDaysSet.size,
		mostFrequentMood,
		last7Days
	};
}
