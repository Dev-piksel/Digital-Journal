# Personal Journal App

A full-stack Personal Journal application built with **Svelte 5**, **SvelteKit**, and **SQLite** for zero-latency, local-first database storage.

---

## 🌟 Key Features

1. **Dashboard (Bento Grid)**:
   - **Quick Composer**: Title, markdown formatting tools (Bold, Italic, Bullet list, Blockquote, Inline code), auto-updating word counter, mood selector, tag inputs, and <kbd>Ctrl</kbd> + <kbd>Enter</kbd> keyboard shortcut.
   - **Mood Trend Chart**: Interactive 7-day SVG chart displaying sentiment scores, dominant mood, daily entry count, and floating mood emojis.
   - **On This Day (Anniversary Flashback)**: Nostalgia card that detects entries written on today's date in previous years (with "1 year ago today" badge and revisit preview).
   - **Tags & Topic Cloud**: Interactive tag pills with entry counts, clickable to filter feed.
   - **Journal Statistics**: Total entries, word count, active writing days, and average words per entry.
   - **Recent Entries**: Fast preview of latest journal entries.

2. **Entries Feed**:
   - Real-time search by title, content, or tags.
   - Filter chips for all moods (Happy 😊, Calm 😌, Reflective 🤔, Tired 😴, Down 😔) and tags.
   - Date-specific filter when selecting days from the calendar.
   - Sorting options (Newest first, Oldest first).

3. **Interactive Calendar**:
   - Full monthly grid with previous/next month navigation and "Today" button.
   - Indicators highlighting days with journal entries and their mood emojis.
   - Selected-day inspector drawer showing entries written on that day.

4. **Trash Bin with 30-Day Auto-Purge**:
   - Soft-delete retention system keeping deleted entries for 30 days.
   - Visual countdown timer showing remaining days before permanent deletion.
   - One-click restore or permanent delete / empty trash.

5. **Detail & Edit Modal**:
   - Clean, distraction-free reading experience with safe Markdown rendering (headings, lists, quotes, inline code, bold, italics).
   - In-place editing mode without losing context.

6. **Theming**:
   - Warm, luxurious dark mode (obsidian/espresso with amber/gold accents).
   - Crisp linen/cream light mode.
   - Persistent theme toggle.

---

## 🏗️ Architecture & Backend

- **Database**: SQLite stored at `./data/journal.db` (native `node:sqlite` in Node.js 24).
- **Backend Endpoints**:
  - `GET /api/entries`: List active or trashed entries with query filters (`q`, `mood`, `tag`, `day`) + stats.
  - `POST /api/entries`: Create a new entry.
  - `GET /api/entries/:id`: Fetch single entry.
  - `PUT /api/entries/:id`: Update entry content, mood, title, and tags.
  - `PATCH /api/entries/:id`: Soft delete (`action: "trash"`) or restore (`action: "restore"`).
  - `DELETE /api/entries/:id`: Permanently purge entry.
  - `POST /api/entries/purge-trash`: Empty all trash.

---

## 🚀 Running the App

```bash
# Start development server
npm run dev

# Or specify a port
npm run dev -- --port 5174

# Type-check
npm run check

# Build for production
npm run build
```