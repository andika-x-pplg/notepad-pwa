export function renderEditorModal() {
  return `
    <div id="editorOverlay" class="editor-overlay" aria-hidden="true">
      <section class="editor-panel" role="dialog" aria-modal="true" aria-labelledby="editorModalTitle">
        <header class="editor-header">
          <button id="closeEditorBtn" class="btn-icon" aria-label="Tutup Editor">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
          <div class="editor-actions">
            <button id="saveNoteBtn" class="btn-primary">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
                <polyline points="17 21 17 13 7 13 7 21"/>
                <polyline points="7 3 7 8 15 8"/>
              </svg>
              <span>Simpan</span>
            </button>
          </div>
        </header>

        <div class="editor-content">
          <input 
            type="text" 
            id="noteTitleInput" 
            class="editor-title-input" 
            placeholder="Judul catatan..." 
            autocomplete="off"
          />
          <textarea 
            id="noteBodyInput" 
            class="editor-body-textarea" 
            placeholder="Mulai menulis catatan Anda di sini..."
          ></textarea>
        </div>

        <footer class="editor-footer">
          <span id="editorWordCount">0 karakter</span>
          <span>Tahap 1 • UI Interaktif</span>
        </footer>
      </section>
    </div>
  `;
}

export function renderFabAddButton() {
  return `
    <button id="openEditorBtn" class="fab-add" title="Buat Catatan Baru" aria-label="Buat Catatan Baru">
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">
        <line x1="12" y1="5" x2="12" y2="19"/>
        <line x1="5" y1="12" x2="19" y2="12"/>
      </svg>
    </button>
  `;
}
