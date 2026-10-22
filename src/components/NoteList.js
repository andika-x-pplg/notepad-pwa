/**
 * Format timestamp into Indonesian human-readable date/time
 * @param {number} timestamp
 * @returns {string}
 */
export function formatNoteDate(timestamp) {
  if (!timestamp) return 'Baru saja';
  const date = new Date(timestamp);
  const now = new Date();
  
  const isToday =
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear();

  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');

  if (isToday) {
    return `Hari ini, ${hours}:${minutes}`;
  }

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const isYesterday =
    date.getDate() === yesterday.getDate() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getFullYear() === yesterday.getFullYear();

  if (isYesterday) {
    return `Kemarin, ${hours}:${minutes}`;
  }

  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
}

function highlightMatch(text, query) {
  if (!text) return '';
  if (!query || !query.trim()) return escapeHtml(text);
  
  const safeText = String(text);
  const trimmed = query.trim();
  // Escape regex special chars
  const escapedQuery = trimmed.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`(${escapedQuery})`, 'gi');
  
  // Split and escape while wrapping matches with <mark>
  const parts = safeText.split(regex);
  return parts
    .map((part) => {
      if (part.toLowerCase() === trimmed.toLowerCase()) {
        return `<mark class="search-highlight">${escapeHtml(part)}</mark>`;
      }
      return escapeHtml(part);
    })
    .join('');
}

function getCategoryColorClass(cat) {
  const c = (cat || '').toLowerCase();
  if (c.includes('pekerjaan') || c.includes('kerja')) return 'cat-pekerjaan';
  if (c.includes('belajar') || c.includes('kuliah') || c.includes('sekolah')) return 'cat-belajar';
  if (c.includes('ide') || c.includes('rencana')) return 'cat-ide';
  return 'cat-pribadi';
}

function renderNoteCard(note, searchQuery = '') {
  const category = note.category || 'Pribadi';
  const isPinned = Boolean(note.isPinned);
  const catClass = getCategoryColorClass(category);

  return `
    <article class="note-card ${isPinned ? 'is-pinned' : ''}" data-note-id="${note.id}">
      <div class="note-card-top">
        <span class="note-category-tag ${catClass}">
          <span class="category-dot"></span>
          ${escapeHtml(category)}
        </span>
        <button 
          class="btn-pin-card ${isPinned ? 'active' : ''}" 
          data-note-id="${note.id}" 
          title="${isPinned ? 'Lepas sematan' : 'Sematkan ke atas'}"
          aria-label="${isPinned ? 'Lepas sematan' : 'Sematkan ke atas'}"
        >
          <svg class="pin-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="12" y1="17" x2="12" y2="22"/>
            <path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a1 1 0 0 0 0-2H8a1 1 0 0 0 0 2h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24Z"/>
          </svg>
        </button>
      </div>

      <h2 class="note-card-title">${highlightMatch(note.title || 'Tanpa Judul', searchQuery)}</h2>
      <p class="note-card-snippet">${highlightMatch(note.content || 'Tidak ada teks tambahan...', searchQuery)}</p>
      
      <div class="note-card-meta">
        <span class="note-date">${formatNoteDate(note.updatedAt)}</span>
        ${isPinned ? '<span class="pinned-indicator"><svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M16 12V4h1V2H7v2h1v8l-2 2v2h5v6l1 1 1-1v-6h5v-2l-2-2z"/></svg> Disematkan</span>' : ''}
      </div>
    </article>
  `;
}

export function renderNotesList(notes = [], options = {}) {
  const { searchQuery = '', selectedCategory = 'all', totalRawNotes = 0 } = options;

  // Case 1: Search query yielded no results
  if (notes.length === 0 && searchQuery.trim() !== '') {
    return `
      <div class="empty-state empty-search-state">
        <div class="empty-state-icon search-not-found-icon">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="11" cy="11" r="8"/>
            <line x1="21" y1="21" x2="16.65" y2="16.65"/>
            <line x1="8" y1="11" x2="14" y2="11"/>
          </svg>
        </div>
        <h3 class="empty-state-title">Pencarian Tidak Ditemukan</h3>
        <p class="empty-state-desc">Tidak ada catatan dengan kata kunci "<strong>${escapeHtml(searchQuery)}</strong>". Coba kata kunci lain atau periksa ejaan.</p>
        <button id="resetSearchBtn" class="btn-secondary mt-3">Reset Pencarian</button>
      </div>
    `;
  }

  // Case 2: Category filter has 0 notes
  if (notes.length === 0 && selectedCategory !== 'all') {
    return `
      <div class="empty-state">
        <div class="empty-state-icon">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
          </svg>
        </div>
        <h3 class="empty-state-title">Kategori Kosong</h3>
        <p class="empty-state-desc">Belum ada catatan di kategori <strong>${escapeHtml(selectedCategory)}</strong>.</p>
        <button id="resetCategoryBtn" class="btn-secondary mt-3">Tampilkan Semua Catatan</button>
      </div>
    `;
  }

  // Case 3: Totally empty database
  if (notes.length === 0) {
    return `
      <div class="empty-state">
        <div class="empty-state-icon">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
            <polyline points="14 2 14 8 20 8"/>
            <line x1="16" y1="13" x2="8" y2="13"/>
            <line x1="16" y1="17" x2="8" y2="17"/>
            <polyline points="10 9 9 9 8 9"/>
          </svg>
        </div>
        <h3 class="empty-state-title">Belum ada catatan</h3>
        <p class="empty-state-desc">Ketuk tombol tambah di bawah untuk mulai menulis catatan pertama Anda.</p>
      </div>
    `;
  }

  const pinnedNotes = notes.filter((n) => Boolean(n.isPinned));
  const otherNotes = notes.filter((n) => !n.isPinned);

  // If there are pinned notes and we're not actively searching or filtering, group them elegantly
  // When searching, still show pinned on top but keep a clear indication
  return `
    <div class="notes-section-header">
      <span class="section-title">
        ${searchQuery ? `Hasil Pencarian (${notes.length})` : selectedCategory !== 'all' ? `Kategori: ${escapeHtml(selectedCategory)}` : 'Semua Catatan'}
      </span>
      <span class="notes-count" id="notesCountBadge">${notes.length} catatan</span>
    </div>

    ${
      pinnedNotes.length > 0
        ? `
      <div class="notes-group pinned-group">
        <div class="group-header">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="12" y1="17" x2="12" y2="22"/>
            <path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a1 1 0 0 0 0-2H8a1 1 0 0 0 0 2h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24Z"/>
          </svg>
          <span>DISEMATKAN (${pinnedNotes.length})</span>
        </div>
        <div class="notes-list">
          ${pinnedNotes.map((note) => renderNoteCard(note, searchQuery)).join('')}
        </div>
      </div>
      `
        : ''
    }

    ${
      otherNotes.length > 0
        ? `
      <div class="notes-group other-group">
        ${
          pinnedNotes.length > 0
            ? `
          <div class="group-header">
            <span>LAINNYA (${otherNotes.length})</span>
          </div>
        `
            : ''
        }
        <div class="notes-list">
          ${otherNotes.map((note) => renderNoteCard(note, searchQuery)).join('')}
        </div>
      </div>
      `
        : ''
    }
  `;
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

