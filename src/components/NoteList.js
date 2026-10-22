export function renderNotesList(notes = []) {
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

  return `
    <div class="notes-section-header">
      <span class="section-title">Semua Catatan</span>
      <span class="notes-count">${notes.length} catatan</span>
    </div>
    <div class="notes-list">
      ${notes
        .map(
          (note) => `
        <article class="note-card" data-note-id="${note.id}">
          <h2 class="note-card-title">${note.title || 'Tanpa Judul'}</h2>
          <p class="note-card-snippet">${note.content || 'Tidak ada teks tambahan...'}</p>
          <div class="note-card-meta">
            <span>${note.updatedAt || 'Baru saja'}</span>
          </div>
        </article>
      `
        )
        .join('')}
    </div>
  `;
}
