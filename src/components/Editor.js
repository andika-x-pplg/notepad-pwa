export function renderEditorModal() {
  return `
    <div id="editorOverlay" class="editor-overlay" aria-hidden="true">
      <section class="editor-panel" id="editorPanel" role="dialog" aria-modal="true" aria-labelledby="noteTitleInput">
        <header class="editor-header">
          <div class="editor-header-left">
            <button id="closeEditorBtn" class="btn-icon editor-back-btn" aria-label="Tutup dan Kembali">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                <line x1="19" y1="12" x2="5" y2="12"/>
                <polyline points="12 19 5 12 12 5"/>
              </svg>
              <span id="editorFolderTitle" class="editor-folder-title-tag">Catatan</span>
            </button>
          </div>

          <div class="editor-actions">
            <!-- Theme Background Button (Gambar 1 & 2) -->
            <button id="editorThemeBtn" class="btn-icon" aria-label="Tema Background" title="Tema Background">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M20.38 3.46 16 2a4 4 0 0 1-8 0L3.62 3.46a2 2 0 0 0-1.34 2.23l.58 3.47a1 1 0 0 0 .99.84H6v10a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V10h2.15a1 1 0 0 0 .99-.84l.58-3.47a2 2 0 0 0-1.34-2.23z"/>
              </svg>
            </button>

            <!-- Three Dots Menu Button (Gambar 1 & 3) -->
            <div class="editor-more-container" id="editorMoreContainer">
              <button id="editorMoreBtn" class="btn-icon" aria-label="Pilihan Lainnya" title="Pilihan Lainnya" aria-haspopup="true" aria-expanded="false">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                  <circle cx="12" cy="12" r="1.5"/>
                  <circle cx="12" cy="5" r="1.5"/>
                  <circle cx="12" cy="19" r="1.5"/>
                </svg>
              </button>

              <!-- Three Dots Dropdown Menu (Gambar 3: Sematkan, Kunci, Pindahkan Catatan) -->
              <div id="editorMoreDropdown" class="editor-more-dropdown" role="menu" aria-hidden="true">
                <button type="button" class="editor-more-item" id="moreMenuPinBtn" role="menuitem">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <line x1="12" y1="17" x2="12" y2="22"/>
                    <path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a1 1 0 0 0 0-2H8a1 1 0 0 0 0 2h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24Z"/>
                  </svg>
                  <span id="moreMenuPinText">Sematkan</span>
                </button>
                <button type="button" class="editor-more-item" id="moreMenuLockBtn" role="menuitem">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                    <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                  </svg>
                  <span id="moreMenuLockText">Kunci</span>
                </button>
                <button type="button" class="editor-more-item" id="moreMenuMoveBtn" role="menuitem">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z"/>
                    <polyline points="11 10 14 13 11 16"/>
                  </svg>
                  <span>Pindahkan Catatan</span>
                </button>
              </div>
            </div>

            <!-- Existing Delete Button (Keep accessible as requested) -->
            <button id="deleteNoteBtn" class="btn-icon btn-danger-icon" aria-label="Hapus Catatan" title="Hapus Catatan" style="display: none;">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="3 6 5 6 21 6"/>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                <line x1="10" y1="11" x2="10" y2="17"/>
                <line x1="14" y1="11" x2="14" y2="17"/>
              </svg>
            </button>

            <!-- Save Note Button -->
            <button id="saveNoteBtn" class="btn-primary" title="Simpan Catatan">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
                <polyline points="17 21 17 13 7 13 7 21"/>
                <polyline points="7 3 7 8 15 8"/>
              </svg>
              <span>Simpan</span>
            </button>
          </div>
        </header>

        <div class="editor-content" id="editorContentScrollArea">
          <!-- Kategori Selector Pills -->
          <div class="editor-category-bar">
            <span class="editor-category-label">Kategori:</span>
            <div class="category-pills-select" id="editorCategoryPills">
              <button type="button" class="category-pill-btn active" data-category="Pribadi">
                <span class="category-dot cat-pribadi"></span> Pribadi
              </button>
              <button type="button" class="category-pill-btn" data-category="Pekerjaan">
                <span class="category-dot cat-pekerjaan"></span> Pekerjaan
              </button>
              <button type="button" class="category-pill-btn" data-category="Belajar">
                <span class="category-dot cat-belajar"></span> Belajar
              </button>
              <button type="button" class="category-pill-btn" data-category="Ide">
                <span class="category-dot cat-ide"></span> Ide
              </button>
            </div>
          </div>

          <!-- Note Title -->
          <input 
            type="text" 
            id="noteTitleInput" 
            class="editor-title-input" 
            placeholder="Judul catatan..." 
            autocomplete="off"
          />

          <!-- Media Gallery (Images, Videos, Drawings) -->
          <div id="editorMediaGallery" class="editor-media-gallery" style="display: none;">
            <!-- Rendered dynamically -->
          </div>

          <!-- Note Body Text Area (When checklist is inactive) -->
          <textarea 
            id="noteBodyInput" 
            class="editor-body-textarea" 
            placeholder="Mulai menulis catatan Anda di sini..."
          ></textarea>

          <!-- Interactive Checklist Editor (When checklist is active) -->
          <div id="editorChecklistContainer" class="editor-checklist-container" style="display: none;">
            <!-- Checklist items rendered dynamically -->
          </div>

          <!-- Note Stats / Footer inside scroll area -->
          <footer class="editor-footer">
            <span id="editorWordCount">0 karakter</span>
            <div class="editor-status-wrapper">
              <span id="editorStatusBadge" class="status-badge status-idle">
                <span class="status-dot"></span>
                <span id="editorStatusText">Siap</span>
              </span>
              <button id="retrySaveBtn" class="btn-retry" type="button" aria-label="Coba Simpan Lagi">Coba lagi</button>
            </div>
          </footer>
        </div>

        <!-- Theme Selection Bottom Sheet (Gambar 2) -->
        <div id="editorThemeSheet" class="editor-theme-sheet" aria-hidden="true">
          <div class="theme-sheet-header">
            <span class="theme-sheet-title">Pilih Tema Background</span>
            <button type="button" id="closeThemeSheetBtn" class="theme-sheet-close" aria-label="Tutup Tema">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"/>
                <line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>
          <div class="theme-swatches-scroll">
            <!-- 1. Default (No theme) -->
            <button type="button" class="theme-swatch-item active" data-theme-id="default" title="Tanpa Background">
              <div class="theme-swatch-circle swatch-default">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="12" cy="12" r="9"/>
                  <line x1="5.5" y1="5.5" x2="18.5" y2="18.5"/>
                </svg>
              </div>
              <span class="theme-swatch-label">Bawaan</span>
            </button>

            <!-- 2. Acak / Pemandangan (Kota, Pegunungan, Sunset Alam) -->
            <button type="button" class="theme-swatch-item" data-theme-id="scenic_random" title="Acak / Pemandangan (Kota, Pegunungan, Alam)">
              <div class="theme-swatch-circle swatch-scenic">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2">
                  <path d="m8 3 4 8 5-5 5 15H2L8 3z"/>
                </svg>
              </div>
              <span class="theme-swatch-label">Acak 🎲</span>
            </button>

            <!-- 3. Warm Sunset Gradient (Gambar 2) -->
            <button type="button" class="theme-swatch-item" data-theme-id="warm_gradient" title="Gradasi Hangat">
              <div class="theme-swatch-circle swatch-warm-gradient"></div>
              <span class="theme-swatch-label">Hangat</span>
            </button>

            <!-- 4. Kertas Krem / Parchment (Gambar 2) -->
            <button type="button" class="theme-swatch-item" data-theme-id="paper_cream" title="Kertas Krem">
              <div class="theme-swatch-circle swatch-paper-cream"></div>
              <span class="theme-swatch-label">Krem</span>
            </button>

            <!-- 5. Kertas Kotak-kotak / Grid (Gambar 2) -->
            <button type="button" class="theme-swatch-item" data-theme-id="paper_grid" title="Kertas Kotak-Kotak (Grid)">
              <div class="theme-swatch-circle swatch-paper-grid"></div>
              <span class="theme-swatch-label">Grid</span>
            </button>

            <!-- 6. Kertas Dot Matrix (Gambar 2) -->
            <button type="button" class="theme-swatch-item" data-theme-id="paper_dots" title="Kertas Titik-titik (Dots)">
              <div class="theme-swatch-circle swatch-paper-dots"></div>
              <span class="theme-swatch-label">Dots</span>
            </button>

            <!-- 7. Kertas Bergaris (Lined) -->
            <button type="button" class="theme-swatch-item" data-theme-id="paper_lined" title="Kertas Bergaris">
              <div class="theme-swatch-circle swatch-paper-lined"></div>
              <span class="theme-swatch-label">Garis</span>
            </button>

            <!-- 8. Pastel Sage -->
            <button type="button" class="theme-swatch-item" data-theme-id="color_sage" title="Pastel Sage">
              <div class="theme-swatch-circle swatch-color-sage"></div>
              <span class="theme-swatch-label">Sage</span>
            </button>

            <!-- 9. Pastel Sky Blue -->
            <button type="button" class="theme-swatch-item" data-theme-id="color_sky" title="Pastel Sky">
              <div class="theme-swatch-circle swatch-color-sky"></div>
              <span class="theme-swatch-label">Langit</span>
            </button>

            <!-- 10. Pastel Lavender -->
            <button type="button" class="theme-swatch-item" data-theme-id="color_lavender" title="Pastel Lavender">
              <div class="theme-swatch-circle swatch-color-lavender"></div>
              <span class="theme-swatch-label">Lavender</span>
            </button>

            <!-- 11. Pastel Peach -->
            <button type="button" class="theme-swatch-item" data-theme-id="color_peach" title="Pastel Peach">
              <div class="theme-swatch-circle swatch-color-peach"></div>
              <span class="theme-swatch-label">Peach</span>
            </button>

            <!-- 12. Dark Slate -->
            <button type="button" class="theme-swatch-item" data-theme-id="color_dark" title="Dark Slate">
              <div class="theme-swatch-circle swatch-color-dark"></div>
              <span class="theme-swatch-label">Gelap</span>
            </button>
          </div>
        </div>

        <!-- Bottom Toolbar (Gambar 1: Kamera, Coretan, Checklist) - Mentok paling bawah -->
        <div class="editor-bottom-toolbar">
          <!-- Camera button with popup (Gambar 1 & 4) -->
          <div class="camera-menu-container" id="cameraMenuContainer">
            <button type="button" id="editorCameraBtn" class="editor-tool-btn" title="Ambil atau Pilih Foto/Video" aria-label="Ambil atau Pilih Foto/Video">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                <circle cx="12" cy="13" r="4"/>
              </svg>
            </button>

            <!-- Popup Menu: Ambil Foto / Pilih Foto (Gambar 4) -->
            <div id="editorCameraMenu" class="editor-camera-popup" role="menu" aria-hidden="true">
              <button type="button" class="camera-popup-item" id="cameraTakePhotoBtn" role="menuitem">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                  <circle cx="12" cy="13" r="4"/>
                </svg>
                <span>Ambil Foto</span>
              </button>
              <button type="button" class="camera-popup-item" id="cameraPickPhotoBtn" role="menuitem">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                  <circle cx="8.5" cy="8.5" r="1.5"/>
                  <polyline points="21 15 16 10 5 21"/>
                </svg>
                <span>Pilih Foto / Video</span>
              </button>
            </div>
            <!-- Hidden inputs for file selection & camera capture -->
            <input type="file" id="cameraCaptureInput" accept="image/*,video/*" capture="environment" style="display: none;" />
            <input type="file" id="cameraFileInput" accept="image/*,video/*" multiple style="display: none;" />
          </div>

          <!-- Drawing / Coret-coret button (Gambar 1 & 5) -->
          <button type="button" id="editorDrawingBtn" class="editor-tool-btn" title="Alat Coret (Gambar)" aria-label="Alat Coret">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="m18 2 4 4-12 12H6v-4L18 2z"/>
              <path d="m14 6 4 4"/>
            </svg>
          </button>

          <!-- Checklist toggle button (Gambar 1) -->
          <button type="button" id="editorChecklistBtn" class="editor-tool-btn" title="Daftar Centang (Checklist)" aria-label="Daftar Centang">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="m9 11 3 3L22 4"/>
              <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
            </svg>
          </button>
        </div>
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

/**
 * Drawing Modal / Scribble Canvas (Gambar 5)
 */
export function renderDrawingModal() {
  return `
    <div id="drawingModalOverlay" class="drawing-modal-overlay" aria-hidden="true">
      <div class="drawing-modal-container">
        <!-- Top Drawing Header (Gambar 5) -->
        <header class="drawing-header">
          <button type="button" id="drawingBackBtn" class="btn-icon" aria-label="Batal dan Kembali">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="19" y1="12" x2="5" y2="12"/>
              <polyline points="12 19 5 12 12 5"/>
            </svg>
          </button>
          <span class="drawing-header-title">Coretan</span>
          <div class="drawing-header-actions">
            <button type="button" id="drawingUndoBtn" class="btn-icon" title="Urungkan (Undo)" aria-label="Urungkan">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M3 7v6h6"/>
                <path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13"/>
              </svg>
            </button>
            <button type="button" id="drawingRedoBtn" class="btn-icon" title="Ulangi (Redo)" aria-label="Ulangi">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M21 7v6h-6"/>
                <path d="M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6 2.3L21 13"/>
              </svg>
            </button>
            <button type="button" id="drawingClearBtn" class="btn-icon" title="Hapus Semua Coretan" aria-label="Hapus Semua">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="3 6 5 6 21 6"/>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
              </svg>
            </button>
            <button type="button" id="drawingSaveBtn" class="btn-icon btn-save-drawing" title="Selesai dan Simpan Coretan" aria-label="Selesai">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
            </button>
          </div>
        </header>

        <!-- Canvas Area -->
        <div class="drawing-canvas-wrapper" id="drawingCanvasWrapper">
          <canvas id="drawingCanvas"></canvas>
        </div>

        <!-- Color Palette Drawer (when color button clicked) -->
        <div id="drawingColorPalette" class="drawing-color-palette" style="display: none;">
          <button type="button" class="drawing-palette-color active" data-color="#000000" style="background:#000000;"></button>
          <button type="button" class="drawing-palette-color" data-color="#475569" style="background:#475569;"></button>
          <button type="button" class="drawing-palette-color" data-color="#ef4444" style="background:#ef4444;"></button>
          <button type="button" class="drawing-palette-color" data-color="#f59e0b" style="background:#f59e0b;"></button>
          <button type="button" class="drawing-palette-color" data-color="#10b981" style="background:#10b981;"></button>
          <button type="button" class="drawing-palette-color" data-color="#06b6d4" style="background:#06b6d4;"></button>
          <button type="button" class="drawing-palette-color" data-color="#3b82f6" style="background:#3b82f6;"></button>
          <button type="button" class="drawing-palette-color" data-color="#8b5cf6" style="background:#8b5cf6;"></button>
          <button type="button" class="drawing-palette-color" data-color="#ec4899" style="background:#ec4899;"></button>
          <button type="button" class="drawing-palette-color" data-color="#ffffff" style="background:#ffffff; border:1px solid #ccc;"></button>
        </div>

        <!-- Bottom Drawing Tools Bar (Gambar 5: Warna, Pensil, Pulpen, Stabilo, Penghapus) -->
        <footer class="drawing-bottom-bar">
          <button type="button" class="drawing-tool-btn" id="drawingColorPickerBtn" title="Pilih Warna">
            <span class="drawing-color-circle" id="drawingActiveColorCircle" style="background: #000000;"></span>
          </button>
          <button type="button" class="drawing-tool-btn active" data-tool="pencil" id="toolPencil" title="Pensil (Garis Halus)">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/>
            </svg>
            <span class="tool-label">Pensil</span>
          </button>
          <button type="button" class="drawing-tool-btn" data-tool="pen" id="toolPen" title="Pulpen (Garis Pekat)">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M12 19l7-7 3 3-7 7-3-3z"/>
              <path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"/>
              <path d="M2 2l7.586 7.586"/>
              <circle cx="11" cy="11" r="2"/>
            </svg>
            <span class="tool-label">Pulpen</span>
          </button>
          <button type="button" class="drawing-tool-btn" data-tool="highlighter" id="toolHighlighter" title="Stabilo / Marker">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="m9 11-6 6v3h3l6-6"/>
              <path d="m22 12-4.6 4.6a2 2 0 0 1-2.8 0l-5.2-5.2a2 2 0 0 1 0-2.8L14 4"/>
            </svg>
            <span class="tool-label">Stabilo</span>
          </button>
          <button type="button" class="drawing-tool-btn" data-tool="eraser" id="toolEraser" title="Penghapus">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="m7 21-4.3-4.3c-1-1-1-2.5 0-3.4l9.6-9.6c1-1 2.5-1 3.4 0l5.6 5.6c1 1 1 2.5 0 3.4L13 21"/>
              <path d="M22 21H7"/>
              <path d="m5 11 9 9"/>
            </svg>
            <span class="tool-label">Penghapus</span>
          </button>
        </footer>
      </div>
    </div>
  `;
}

/**
 * Move Note to Folder Modal
 */
export function renderMoveNoteModal() {
  return `
    <div id="moveNoteOverlay" class="dialog-overlay" aria-hidden="true">
      <div class="dialog-box move-folder-modal-box">
        <div class="dialog-header">
          <h3>Pindahkan Catatan ke Folder</h3>
          <button type="button" id="closeMoveNoteBtn" class="btn-icon" aria-label="Tutup">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
        <p class="dialog-message">Pilih folder tujuan untuk catatan ini:</p>
        <div class="move-folder-list" id="moveFolderListContainer">
          <!-- Rendered dynamically -->
        </div>
      </div>
    </div>
  `;
}

/**
 * Image Lightbox / Pinch-to-zoom Viewer
 */
export function renderImageLightboxModal() {
  return `
    <div id="imageLightboxOverlay" class="image-lightbox-overlay" aria-hidden="true">
      <div class="lightbox-header">
        <span class="lightbox-title" id="lightboxTitle">Foto</span>
        <div class="lightbox-controls">
          <button type="button" id="lightboxZoomOutBtn" class="lightbox-btn" title="Kecilkan (-)">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="11" cy="11" r="8"/>
              <line x1="21" y1="21" x2="16.65" y2="16.65"/>
              <line x1="8" y1="11" x2="14" y2="11"/>
            </svg>
          </button>
          <span id="lightboxZoomLevel" class="lightbox-zoom-text">100%</span>
          <button type="button" id="lightboxZoomInBtn" class="lightbox-btn" title="Besarkan (+)">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="11" cy="11" r="8"/>
              <line x1="21" y1="21" x2="16.65" y2="16.65"/>
              <line x1="11" y1="8" x2="11" y2="14"/>
              <line x1="8" y1="11" x2="14" y2="11"/>
            </svg>
          </button>
          <button type="button" id="lightboxResetBtn" class="lightbox-btn" title="Reset Ukuran">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
              <path d="M3 3v5h5"/>
            </svg>
          </button>
          <button type="button" id="closeLightboxBtn" class="lightbox-btn" title="Tutup">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
      </div>
      <div class="lightbox-viewport" id="lightboxViewport">
        <img id="lightboxImage" src="" alt="Pratinjau Gambar" draggable="false" />
      </div>
      <div class="lightbox-hint">Gunakan cubit dua jari (pinch) di HP atau tombol +/- untuk memperbesar/memperkecil</div>
    </div>
  `;
}

