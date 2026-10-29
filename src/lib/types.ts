export type MoodType = 'happy' | 'calm' | 'reflective' | 'tired' | 'sad';

export interface MoodMeta {
	emoji: string;
	score: number;
	label: string;
	color: string;
}

export const MOODS: Record<MoodType, MoodMeta> = {
	happy: { emoji: '😊', score: 5, label: 'Happy', color: '#e8b84b' },
	calm: { emoji: '😌', score: 4, label: 'Calm', color: '#7eb38c' },
	reflective: { emoji: '🤔', score: 3, label: 'Reflective', color: '#9d8ac7' },
	tired: { emoji: '😴', score: 2, label: 'Tired', color: '#8898a8' },
	sad: { emoji: '😔', score: 1, label: 'Down', color: '#cf7d72' }
};

export type UserRole = 'admin' | 'user';

export interface User {
	id: string;
	username: string;
	displayName: string;
	role: UserRole;
	created: number;
	updated: number;
}

export interface UserWithStats extends User {
	entryCount: number;
	wordCount: number;
	lastActive: number | null;
}

export interface JournalEntry {
	id: string;
	userId: string;
	title: string;
	content: string;
	mood: MoodType;
	tags: string[];
	created: number;
	updated: number;
	deleted: number | null;
}

export interface JournalStats {
	totalEntries: number;
	totalWords: number;
	activeDays: number;
	mostFrequentMood: string | null;
	last7Days: Array<{
		dateKey: string;
		dayLabel: string;
		fullDate: string;
		score: number;
		entryCount: number;
		primaryEmoji: string | null;
	}>;
}

export interface EntryFilter {
	view: 'home' | 'feed' | 'cal' | 'trash' | 'admin';
	q: string;
	tag: string;
	mood: MoodType | '';
	day: string;
}
