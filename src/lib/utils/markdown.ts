/**
 * Lightweight, safe Markdown-to-HTML parser for journal entries.
 * Escapes raw HTML to prevent XSS while formatting basic markdown.
 */
export function escapeHtml(str: string): string {
	return String(str).replace(/[&<>"']/g, (c) => {
		switch (c) {
			case '&':
				return '&amp;';
			case '<':
				return '&lt;';
			case '>':
				return '&gt;';
			case '"':
				return '&quot;';
			case "'":
				return '&#39;';
			default:
				return c;
		}
	});
}

export function renderMarkdown(content: string): string {
	if (!content) return '';

	// Escape HTML tags first
	const safe = escapeHtml(content);

	// Split into lines for block processing
	const lines = safe.split('\n');
	const output: string[] = [];
	let inList = false;
	let inBlockquote = false;

	for (let i = 0; i < lines.length; i++) {
		const line = lines[i];

		// Check for blockquote
		if (line.startsWith('&gt; ')) {
			if (!inBlockquote) {
				inBlockquote = true;
				output.push('<blockquote>');
			}
			output.push(`<p>${formatInline(line.slice(5))}</p>`);
			continue;
		} else if (inBlockquote) {
			inBlockquote = false;
			output.push('</blockquote>');
		}

		// Check for unordered list
		if (/^[-*]\s+/.test(line)) {
			if (!inList) {
				inList = true;
				output.push('<ul>');
			}
			const itemText = line.replace(/^[-*]\s+/, '');
			output.push(`<li>${formatInline(itemText)}</li>`);
			continue;
		} else if (inList) {
			inList = false;
			output.push('</ul>');
		}

		// Check for headings
		if (line.startsWith('### ')) {
			output.push(`<h4>${formatInline(line.slice(4))}</h4>`);
			continue;
		}
		if (line.startsWith('## ')) {
			output.push(`<h3>${formatInline(line.slice(3))}</h3>`);
			continue;
		}
		if (line.startsWith('# ')) {
			output.push(`<h2>${formatInline(line.slice(2))}</h2>`);
			continue;
		}

		// Empty line
		if (line.trim() === '') {
			output.push('<br />');
			continue;
		}

		// Regular paragraph
		output.push(`<p>${formatInline(line)}</p>`);
	}

	if (inList) output.push('</ul>');
	if (inBlockquote) output.push('</blockquote>');

	return output.join('\n');
}

function formatInline(text: string): string {
	return text
		.replace(/`([^`]+)`/g, '<code>$1</code>')
		.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
		.replace(/\*(.+?)\*/g, '<em>$1</em>')
		.replace(/_(.+?)_/g, '<em>$1</em>');
}

export function stripMarkdown(content: string): string {
	return content
		.replace(/#+\s+/g, '')
		.replace(/\*\*(.*?)\*\*/g, '$1')
		.replace(/\*(.*?)\*/g, '$1')
		.replace(/`([^`]+)`/g, '$1')
		.replace(/^[-*]\s+/gm, '')
		.replace(/^&gt;\s+/gm, '')
		.replace(/\n+/g, ' ')
		.trim();
}

export function formatDate(timestamp: number): string {
	return new Date(timestamp).toLocaleDateString(undefined, {
		weekday: 'short',
		month: 'short',
		day: 'numeric',
		year: 'numeric'
	});
}

export function formatTime(timestamp: number): string {
	return new Date(timestamp).toLocaleTimeString(undefined, {
		hour: '2-digit',
		minute: '2-digit'
	});
}

export function getDateKey(timestamp: number): string {
	const d = new Date(timestamp);
	return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}
