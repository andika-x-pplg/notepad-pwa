/**
 * FolderModal.js
 * Modals and Views for:
 * 1. Halaman Pilihan Folder (Gambar 2: Semua, Baru Dihapus, Catatan, Kustom Folders, Terkunci, Tombol Folder Baru)
 * 2. Modal Buat Folder Baru (Warna, Gradasi, Sampul Template, Nama)
 * 3. Modal Password/Kunci Folder Terkunci (Buat PIN Baru, Masukkan Ulang, atau Buka Kunci)
 */

export function renderFolderView(folderStats = {}, customFolders = []) {
  const {
    allCount = 0,
    trashCount = 0,
    notesCount = 0,
    lockedCount = 0
  } = folderStats;

  const customFoldersHtml = customFolders.map((f) => {
    const count = folderStats[`folder_${f.id}`] || 0;
    const coverStyle = getCoverStyle(f.coverType, f.coverValue);
    return `
      <div class="folder-item custom-folder-item" data-folder-id="folder_${f.id}">
        <div class="folder-item-cover" style="${coverStyle}">
          <span class="cover-label">${escapeHtml(f.name.slice(0, 8))}</span>
        </div>
        <div class="folder-item-info">
          <span class="folder-item-name">${escapeHtml(f.name)}</span>
          <span class="folder-item-count">${count}</span>
        </div>
        <button class="btn-delete-folder" data-folder-id="${f.id}" title="Hapus Folder" aria-label="Hapus Folder">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="3 6 5 6 21 6"/>
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
          </svg>
        </button>
      </div>
    `;
  }).join('');

  return `
    <div id="folderPageOverlay" class="folder-page-overlay" aria-hidden="true">
      <div class="folder-page-sheet">
        <div class="folder-page-header">
          <div class="folder-header-title-btn" id="closeFolderPageHeaderBtn">
            <h2>Folder</h2>
            <svg class="folder-arrow-up" width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M7 14l5-5 5 5z"/>
            </svg>
          </div>
          <button id="closeFolderPageBtn" class="btn-icon" aria-label="Tutup Halaman Folder">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        <div class="folder-page-body">
          <!-- Grup 1: Semua & Baru Dihapus -->
          <div class="folder-card-group">
            <div class="folder-nav-row" data-folder-id="all">
              <div class="folder-nav-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                  <rect x="3" y="3" width="18" height="18" rx="3"/>
                  <line x1="7" y1="8" x2="17" y2="8"/>
                  <line x1="7" y1="12" x2="12" y2="12"/>
                </svg>
              </div>
              <div class="folder-nav-text">
                <span class="folder-nav-title">Semua</span>
              </div>
              <span class="folder-nav-count">${allCount}</span>
            </div>

            <div class="folder-nav-divider"></div>

            <div class="folder-nav-row" data-folder-id="trash">
              <div class="folder-nav-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="3 6 5 6 21 6"/>
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                </svg>
              </div>
              <div class="folder-nav-text">
                <span class="folder-nav-title">Baru Dihapus</span>
              </div>
              <span class="folder-nav-count">${trashCount}</span>
            </div>
          </div>

          <!-- Grup 2: Folder Catatan Default & Kustom -->
          <div class="folder-card-group">
            <!-- Catatan Default -->
            <div class="folder-item" data-folder-id="notes">
              <div class="folder-item-cover cover-blue-notebook">
                <span class="cover-label">NOTES</span>
                <div class="cover-lines"></div>
              </div>
              <div class="folder-item-info">
                <span class="folder-item-name">Catatan</span>
                <span class="folder-item-count">${notesCount}</span>
              </div>
            </div>

            ${customFoldersHtml}
          </div>

          <!-- Grup 3: Folder Terkunci -->
          <div class="folder-card-group">
            <div class="folder-item" data-folder-id="locked">
              <div class="folder-item-cover cover-locked-gradient">
                <span class="cover-label">Locked</span>
                <svg class="cover-lock-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                  <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                </svg>
              </div>
              <div class="folder-item-info">
                <span class="folder-item-name">Terkunci</span>
                <span class="folder-item-count">${lockedCount}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Tombol Bawah: Folder Baru (Sesuai Gambar 2) -->
        <div class="folder-page-footer">
          <button id="openCreateFolderBtn" class="btn-create-folder-pill">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="12" y1="5" x2="12" y2="19"/>
              <line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            <span>Folder Baru</span>
          </button>
        </div>
      </div>
    </div>
  `;
}

export function renderCreateFolderModal() {
  return `
    <div id="createFolderOverlay" class="dialog-overlay" aria-hidden="true">
      <div class="dialog-box folder-form-modal" role="dialog" aria-modal="true">
        <h3 class="dialog-title">Buat Folder Baru</h3>
        <p class="dialog-message">Atur nama dan desain sampul folder Anda.</p>

        <div class="folder-form-body">
          <label class="form-label" for="newFolderNameInput">Nama Folder</label>
          <input 
            type="text" 
            id="newFolderNameInput" 
            class="form-input" 
            placeholder="Contoh: Kuliah, Finansial, Hobi..." 
            maxlength="30"
            autocomplete="off"
          />

          <!-- Preview Sampul -->
          <div class="folder-preview-section">
            <span class="form-label">Pratinjau Sampul</span>
            <div class="folder-preview-box-wrapper">
              <div id="folderPreviewCover" class="folder-item-cover cover-blue-notebook preview-size">
                <span id="folderPreviewLabel" class="cover-label">FOLDER</span>
              </div>
            </div>
          </div>

          <!-- Pilihan Tipe Sampul: Warna, Gradasi, Sampul Buku -->
          <div class="cover-options-section">
            <span class="form-label">Pilih Warna / Desain Sampul</span>
            
            <div class="cover-swatches-grid" id="coverSwatches">
              <!-- Warna Solid -->
              <button type="button" class="cover-swatch active" data-type="color" data-value="#3b82f6" style="background-color: #3b82f6;" title="Biru"></button>
              <button type="button" class="cover-swatch" data-type="color" data-value="#10b981" style="background-color: #10b981;" title="Hijau"></button>
              <button type="button" class="cover-swatch" data-type="color" data-value="#f59e0b" style="background-color: #f59e0b;" title="Amber"></button>
              <button type="button" class="cover-swatch" data-type="color" data-value="#ec4899" style="background-color: #ec4899;" title="Pink"></button>
              <button type="button" class="cover-swatch" data-type="color" data-value="#8b5cf6" style="background-color: #8b5cf6;" title="Ungu"></button>
              <button type="button" class="cover-swatch" data-type="color" data-value="#06b6d4" style="background-color: #06b6d4;" title="Cyan"></button>

              <!-- Gradasi Grafis -->
              <button type="button" class="cover-swatch" data-type="gradient" data-value="linear-gradient(135deg, #f43f5e, #fb923c)" style="background: linear-gradient(135deg, #f43f5e, #fb923c);" title="Sunset"></button>
              <button type="button" class="cover-swatch" data-type="gradient" data-value="linear-gradient(135deg, #6366f1, #a855f7)" style="background: linear-gradient(135deg, #6366f1, #a855f7);" title="Aurora"></button>
              <button type="button" class="cover-swatch" data-type="gradient" data-value="linear-gradient(135deg, #0ea5e9, #10b981)" style="background: linear-gradient(135deg, #0ea5e9, #10b981);" title="Ocean"></button>
              <button type="button" class="cover-swatch" data-type="gradient" data-value="linear-gradient(135deg, #475569, #1e293b)" style="background: linear-gradient(135deg, #475569, #1e293b);" title="Midnight"></button>
            </div>
          </div>
        </div>

        <div class="dialog-actions">
          <button id="cancelCreateFolderBtn" class="btn-secondary">Batal</button>
          <button id="saveCreateFolderBtn" class="btn-primary">Simpan Folder</button>
        </div>
      </div>
    </div>
  `;
}

export function renderPasscodeModal() {
  return `
    <div id="passcodeOverlay" class="dialog-overlay passcode-overlay" aria-hidden="true">
      <div class="dialog-box passcode-modal-box" role="dialog" aria-modal="true">
        <div class="passcode-header">
          <div class="passcode-lock-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
            </svg>
          </div>
          <h3 class="dialog-title" id="passcodeTitle">Buka Folder Terkunci</h3>
          <p class="dialog-message" id="passcodeSubtext">Masukkan kata sandi 4 angka untuk membuka catatan pribadi Anda.</p>
        </div>

        <!-- PIN Dots Indicator -->
        <div class="pin-dots-wrapper" id="pinDotsWrapper">
          <span class="pin-dot"></span>
          <span class="pin-dot"></span>
          <span class="pin-dot"></span>
          <span class="pin-dot"></span>
        </div>

        <!-- Numeric Keypad -->
        <div class="keypad-grid" id="numericKeypad">
          <button type="button" class="keypad-btn" data-val="1">1</button>
          <button type="button" class="keypad-btn" data-val="2">2</button>
          <button type="button" class="keypad-btn" data-val="3">3</button>
          <button type="button" class="keypad-btn" data-val="4">4</button>
          <button type="button" class="keypad-btn" data-val="5">5</button>
          <button type="button" class="keypad-btn" data-val="6">6</button>
          <button type="button" class="keypad-btn" data-val="7">7</button>
          <button type="button" class="keypad-btn" data-val="8">8</button>
          <button type="button" class="keypad-btn" data-val="9">9</button>
          <button type="button" class="keypad-btn keypad-clear-btn" id="cancelPasscodeBtn" aria-label="Batal">Batal</button>
          <button type="button" class="keypad-btn" data-val="0">0</button>
          <button type="button" class="keypad-btn keypad-backspace-btn" id="backspacePinBtn" aria-label="Hapus">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 4H8l-7 8 7 8h13a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2z"/>
              <line x1="18" y1="9" x2="12" y2="15"/>
              <line x1="12" y1="9" x2="18" y2="15"/>
            </svg>
          </button>
        </div>
      </div>
    </div>
  `;
}

export function renderTrashHeaderSubtext() {
  return `
    <div class="trash-notice-banner" id="trashNoticeBanner">
      <p>Catatan akan dihapus secara permanen setelah 30 hari.</p>
      <button id="emptyTrashBtn" class="btn-empty-trash" title="Kosongkan Sampah">Kosongkan Sampah</button>
    </div>
  `;
}

function getCoverStyle(type, value) {
  if (type === 'gradient') {
    return `background: ${value};`;
  }
  return `background-color: ${value || '#3b82f6'};`;
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
