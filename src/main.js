import './styles/app.css';
import { renderHeader, getViewModeIcon } from './components/Header.js';
import { renderSearchBar } from './components/SearchBar.js';
import { renderNotesList } from './components/NoteList.js';
import {
  renderEditorModal,
  renderFabAddButton,
  renderDrawingModal,
  renderMoveNoteModal,
  renderImageLightboxModal
} from './components/Editor.js';
import {
  renderFolderView,
  renderCreateFolderModal,
  renderPasscodeModal,
  renderTrashHeaderSubtext
} from './components/FolderModal.js';
import {
  getAllNotes,
  getTrashNotes,
  getNoteById,
  createNote,
  updateNote,
  softDeleteNote,
  restoreNote,
  deleteNote,
  emptyTrash,
  togglePinNote,
  exportNotesBackup,
  importNotesBackup,
  getAllCustomFolders,
  createCustomFolder,
  deleteCustomFolder,
  getSetting,
  setSetting
} from './js/db.js';

// Application State
let currentEditingId = null;
let lastSavedTitle = '';
let lastSavedContent = '';
let lastSavedCategory = 'Pribadi';
let lastSavedPinned = false;
let lastSavedFolderId = 'notes';
let lastSavedIsLocked = false;
let lastSavedTheme = 'default';
let lastSavedMedia = [];
let lastSavedIsChecklist = false;

let currentEditingCategory = 'Pribadi';
let currentEditingPinned = false;
let currentEditingFolderId = 'notes';
let currentEditingIsLocked = false;
let currentEditingTheme = 'default';
let currentEditingMedia = [];
let currentEditingIsChecklist = false;

let pendingPasscodeAction = null;
let currentLightboxScale = 1;
const SCENIC_THEMES = ['scenic_mountains', 'scenic_city', 'scenic_nature'];
let scenicIndex = 0;

let debounceTimer = null;
let isSaving = false;
let saveQueued = false;
let currentSavePromise = null;
let saveRevision = 0;

// Filter & Search & View Mode State
let currentSearchQuery = '';
let currentCategoryFilter = 'all'; // 'all' or category name
let currentViewMode = localStorage.getItem('notepad_view_mode') || 'card'; // 'list' | 'card' | 'grid'
let currentFolder = 'notes'; // 'notes' | 'all' | 'trash' | 'locked' | 'folder_<id>'
let cachedAllNotes = [];
let cachedCustomFolders = [];
let isPasscodeUnlocked = false; // session unlock for 'locked' folder
let passcodeSetupStep = null; // 'create' | 'confirm' | 'unlock'
let tempPasscode = '';
let enteredPin = '';

const DEBOUNCE_DELAY_MS = 500;
const CATEGORIES = ['Pribadi', 'Pekerjaan', 'Belajar', 'Ide'];

function renderOfflineBanner() {
  return `
    <div id="offlineBanner" class="offline-banner" style="display: none;" role="status">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <line x1="1" y1="1" x2="23" y2="23"/>
        <path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55"/>
        <path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39"/>
        <path d="M10.71 5.05A16 16 0 0 1 22.58 9"/>
        <path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88"/>
        <path d="M8.53 16.11a6 6 0 0 1 6.95 0"/>
        <line x1="12" y1="20" x2="12.01" y2="20"/>
      </svg>
      <span>Mode Offline Aktif — Semua catatan tetap tersimpan aman di perangkat Anda.</span>
    </div>
  `;
}

function renderBackupDialog() {
  return `
    <div id="backupDialogOverlay" class="dialog-overlay" aria-hidden="true">
      <div class="dialog-box backup-modal-box" role="dialog" aria-modal="true">
        <h3 class="dialog-title">Perlindungan & Cadangan Data</h3>
        <p class="dialog-message">Semua catatan tersimpan secara lokal di browser/perangkat Anda. Anda dapat mengekspor atau memulihkan data cadangan kapan saja.</p>
        
        <div class="security-badge">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
          </svg>
          Penyimpanan Lokal Privat (Offline-First)
        </div>

        <div class="backup-option-card" id="exportBackupCard">
          <div class="backup-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="7 10 12 15 17 10"/>
              <line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
          </div>
          <div class="backup-info">
            <h4>Ekspor Cadangan (Download JSON)</h4>
            <p>Unduh seluruh catatan ke file JSON sebagai salinan aman.</p>
          </div>
        </div>

        <div class="backup-option-card" id="importBackupCard">
          <div class="backup-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="17 8 12 3 7 8"/>
              <line x1="12" y1="3" x2="12" y2="15"/>
            </svg>
          </div>
          <div class="backup-info">
            <h4>Pulihkan Cadangan (Impor JSON)</h4>
            <p>Pilih file cadangan JSON untuk mengembalikan catatan Anda.</p>
          </div>
        </div>

        <input type="file" id="backupFileInput" accept=".json" style="display: none;" />

        <div class="dialog-actions">
          <button id="closeBackupBtn" class="btn-secondary">Tutup</button>
        </div>
      </div>
    </div>
  `;
}

function renderConfirmDialog() {
  return `
    <div id="confirmDialogOverlay" class="dialog-overlay" aria-hidden="true">
      <div class="dialog-box" role="dialog" aria-modal="true">
        <h3 class="dialog-title">Hapus Catatan?</h3>
        <p class="dialog-message">Apakah Anda yakin ingin menghapus catatan ini? Tindakan ini tidak dapat dibatalkan.</p>
        <div class="dialog-actions">
          <button id="cancelDeleteBtn" class="btn-secondary">Batal</button>
          <button id="confirmDeleteBtn" class="btn-danger">Hapus</button>
        </div>
      </div>
    </div>
  `;
}

function renderCategoryFilters(notes = []) {
  const counts = {
    all: notes.length,
    Pribadi: 0,
    Pekerjaan: 0,
    Belajar: 0,
    Ide: 0
  };

  notes.forEach((n) => {
    const cat = n.category || 'Pribadi';
    if (counts[cat] !== undefined) {
      counts[cat]++;
    } else {
      counts['Pribadi']++;
    }
  });

  return `
    <nav class="category-filter-bar" aria-label="Filter Kategori">
      <button class="category-filter-chip ${currentCategoryFilter === 'all' ? 'active' : ''}" data-category="all">
        Semua
        <span class="chip-badge">${counts.all}</span>
      </button>
      <button class="category-filter-chip ${currentCategoryFilter === 'Pribadi' ? 'active' : ''}" data-category="Pribadi">
        <span class="category-dot cat-pribadi"></span>
        Pribadi
        <span class="chip-badge">${counts.Pribadi}</span>
      </button>
      <button class="category-filter-chip ${currentCategoryFilter === 'Pekerjaan' ? 'active' : ''}" data-category="Pekerjaan">
        <span class="category-dot cat-pekerjaan"></span>
        Pekerjaan
        <span class="chip-badge">${counts.Pekerjaan}</span>
      </button>
      <button class="category-filter-chip ${currentCategoryFilter === 'Belajar' ? 'active' : ''}" data-category="Belajar">
        <span class="category-dot cat-belajar"></span>
        Belajar
        <span class="chip-badge">${counts.Belajar}</span>
      </button>
      <button class="category-filter-chip ${currentCategoryFilter === 'Ide' ? 'active' : ''}" data-category="Ide">
        <span class="category-dot cat-ide"></span>
        Ide
        <span class="chip-badge">${counts.Ide}</span>
      </button>
    </nav>
  `;
}

function showToast(message, isError = false) {
  let toastContainer = document.getElementById('toastContainer');
  if (!toastContainer) {
    toastContainer = document.createElement('div');
    toastContainer.id = 'toastContainer';
    toastContainer.className = 'toast-container';
    document.body.appendChild(toastContainer);
  }

  const toast = document.createElement('div');
  toast.className = `toast ${isError ? 'error' : ''}`;
  toast.textContent = message;
  toastContainer.appendChild(toast);

  requestAnimationFrame(() => {
    toast.classList.add('show');
  });

  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => {
      toast.remove();
    }, 250);
  }, 2400);
}

/**
 * Set the autosave status label and visual indicator
 * @param {'idle'|'editing'|'saving'|'saved'|'error'} state
 * @param {string} [customMessage]
 */
function setSavingStatus(state, customMessage) {
  const badge = document.getElementById('editorStatusBadge');
  const textEl = document.getElementById('editorStatusText');
  const retryBtn = document.getElementById('retrySaveBtn');
  const deleteBtn = document.getElementById('deleteNoteBtn');

  if (!badge || !textEl) return;

  badge.className = `status-badge status-${state}`;

  if (retryBtn) {
    retryBtn.style.display = state === 'error' ? 'inline-flex' : 'none';
  }

  // Guard destructive button while active save is in-flight
  if (deleteBtn && currentEditingId) {
    deleteBtn.disabled = state === 'saving';
    deleteBtn.style.opacity = state === 'saving' ? '0.5' : '1';
    deleteBtn.style.pointerEvents = state === 'saving' ? 'none' : 'auto';
  }

  switch (state) {
    case 'editing':
      textEl.textContent = customMessage || 'Mengedit…';
      break;
    case 'saving':
      textEl.textContent = customMessage || 'Menyimpan…';
      break;
    case 'saved':
      textEl.textContent = customMessage || 'Tersimpan';
      break;
    case 'error':
      textEl.textContent = customMessage || 'Gagal menyimpan';
      break;
    case 'idle':
    default:
      textEl.textContent = customMessage || (currentEditingId ? 'Tersimpan' : 'Siap');
      break;
  }
}

/**
 * Helper to get user-friendly title for the active folder
 */
function getActiveFolderTitle() {
  if (currentFolder === 'all') return 'Semua';
  if (currentFolder === 'trash') return 'Baru Dihapus';
  if (currentFolder === 'locked') return 'Terkunci';
  if (currentFolder === 'notes') return 'Catatan';
  if (currentFolder.startsWith('folder_')) {
    const id = Number(currentFolder.replace('folder_', ''));
    const f = cachedCustomFolders.find((item) => item.id === id);
    if (f) return f.name;
  }
  return 'Catatan';
}

function getFolderMap() {
  const map = {
    notes: 'Catatan',
    locked: 'Terkunci'
  };
  cachedCustomFolders.forEach((f) => {
    map[`folder_${f.id}`] = f.name;
  });
  return map;
}

/**
 * Filter notes based on active folder, search query, and category
 */
function getFilteredNotes() {
  let result = [...cachedAllNotes];

  // 1. Filter by Folder
  if (currentFolder === 'trash') {
    result = result.filter((n) => Boolean(n.deletedAt));
  } else {
    // Non-trash: notes that are not deleted
    result = result.filter((n) => !n.deletedAt);

    if (currentFolder === 'notes') {
      // Hanya catatan biasa (folderId === 'notes' dan bukan locked)
      result = result.filter((n) => (!n.folderId || n.folderId === 'notes') && !n.isLocked);
    } else if (currentFolder === 'locked') {
      // Folder rahasia terkunci
      result = result.filter((n) => Boolean(n.isLocked) || n.folderId === 'locked');
    } else if (currentFolder === 'all') {
      // Semua catatan (kecuali yang terkunci untuk privasi, kecuali jika sedang terbuka)
      result = result.filter((n) => !n.isLocked);
    } else if (currentFolder.startsWith('folder_')) {
      // Custom folder
      result = result.filter((n) => n.folderId === currentFolder && !n.isLocked);
    }
  }

  // 2. Filter by category
  if (currentCategoryFilter !== 'all') {
    result = result.filter((note) => {
      const noteCat = note.category || 'Pribadi';
      return noteCat.toLowerCase() === currentCategoryFilter.toLowerCase();
    });
  }

  // 3. Filter by search query (contains substring anywhere in title or content, case-insensitive)
  if (currentSearchQuery.trim() !== '') {
    const q = currentSearchQuery.trim().toLowerCase();
    result = result.filter((note) => {
      const title = (note.title || '').toLowerCase();
      const content = (note.content || '').toLowerCase();
      return title.includes(q) || content.includes(q);
    });
  }

  // Sort notes: pinned notes first (if not in trash), then newest updated first
  result.sort((a, b) => {
    if (currentFolder !== 'trash') {
      const pinA = Boolean(a.isPinned);
      const pinB = Boolean(b.isPinned);
      if (pinA !== pinB) {
        return pinA ? -1 : 1;
      }
    }
    return (b.updatedAt || 0) - (a.updatedAt || 0);
  });

  return result;
}

async function loadAndRenderNotes() {
  const container = document.getElementById('notesContainer');
  const categoryBarContainer = document.getElementById('categoryBarContainer');
  const headerTitleText = document.getElementById('headerTitleText');
  const openEditorBtn = document.getElementById('openEditorBtn');
  const trashNoticeContainer = document.getElementById('trashNoticeContainer');
  if (!container) return;

  try {
    // Load notes (include deleted notes to calculate counts correctly)
    cachedAllNotes = await getAllNotes(true);
    cachedCustomFolders = await getAllCustomFolders();

    // Update Header Title
    const activeTitle = getActiveFolderTitle();
    if (headerTitleText) {
      headerTitleText.textContent = activeTitle;
    }

    // Toggle FAB Add Note (hide in trash view)
    if (openEditorBtn) {
      openEditorBtn.style.display = currentFolder === 'trash' ? 'none' : 'flex';
    }

    // Toggle Trash Notice Banner
    if (trashNoticeContainer) {
      if (currentFolder === 'trash') {
        trashNoticeContainer.innerHTML = renderTrashHeaderSubtext();
        trashNoticeContainer.style.display = 'block';
        bindTrashHeaderEvents();
      } else {
        trashNoticeContainer.innerHTML = '';
        trashNoticeContainer.style.display = 'none';
      }
    }

    // Render / update category filter chips with live counts
    // (Hide category bar in trash view for cleanliness)
    if (categoryBarContainer) {
      if (currentFolder === 'trash') {
        categoryBarContainer.style.display = 'none';
      } else {
        categoryBarContainer.style.display = 'block';
        const activeNotesOnly = cachedAllNotes.filter((n) => !n.deletedAt && !n.isLocked);
        categoryBarContainer.innerHTML = renderCategoryFilters(activeNotesOnly);
        bindCategoryFilterEvents();
      }
    }

    const filtered = getFilteredNotes();
    const folderMap = getFolderMap();

    container.innerHTML = renderNotesList(filtered, {
      searchQuery: currentSearchQuery,
      selectedCategory: currentCategoryFilter,
      totalRawNotes: cachedAllNotes.length,
      viewMode: currentViewMode,
      folderMap,
      currentFolder
    });

    bindNoteCardEvents();
    updateFolderPageUI();
  } catch (error) {
    console.error('Error saat merender daftar catatan:', error);
    showToast(error.message || 'Gagal memuat catatan dari database lokal', true);
  }
}

function bindCategoryFilterEvents() {
  const chips = document.querySelectorAll('.category-filter-chip');
  chips.forEach((chip) => {
    chip.addEventListener('click', () => {
      const cat = chip.getAttribute('data-category');
      if (currentCategoryFilter === cat) return;
      currentCategoryFilter = cat;
      loadAndRenderNotes();
    });
  });
}

function bindNoteCardEvents() {
  // Click on card/item to open editor (supporting .note-card, .note-list-item, .note-grid-card)
  const noteItems = document.querySelectorAll('.note-card, .note-list-item, .note-grid-card');
  noteItems.forEach((card) => {
    card.addEventListener('click', async (e) => {
      // Don't open editor if pin, restore, or delete button was clicked
      if (e.target.closest('.btn-pin-card, .btn-restore-note, .btn-permanent-delete-card')) return;

      const id = card.getAttribute('data-note-id');
      if (!id) return;

      // In trash view, clicking a card offers options to restore
      if (currentFolder === 'trash') {
        const note = await getNoteById(id);
        if (note) {
          const willRestore = confirm(`Catatan "${note.title || 'Tanpa Judul'}" ada di Baru Dihapus. Pulihkan catatan ini?`);
          if (willRestore) {
            await restoreNote(id);
            showToast('Catatan dipulihkan ke folder asalnya');
            await loadAndRenderNotes();
          }
        }
        return;
      }

      if (overlayIsOpen()) {
        await flushPendingSave();
      }

      try {
        const note = await getNoteById(id);
        if (note) {
          openEditor(note);
        } else {
          showToast('Catatan tidak ditemukan', true);
          await loadAndRenderNotes();
        }
      } catch (error) {
        showToast('Gagal memuat detail catatan', true);
      }
    });
  });

  // Pin button directly on cards
  const pinBtns = document.querySelectorAll('.btn-pin-card');
  pinBtns.forEach((btn) => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const id = btn.getAttribute('data-note-id');
      if (!id) return;

      try {
        const isPinned = await togglePinNote(id);
        showToast(isPinned ? 'Catatan disematkan ke atas' : 'Sematan catatan dilepas');
        await loadAndRenderNotes();
      } catch (err) {
        showToast('Gagal mengubah status pin', true);
      }
    });
  });

  // Restore button directly on trash cards
  const restoreBtns = document.querySelectorAll('.btn-restore-note');
  restoreBtns.forEach((btn) => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const id = btn.getAttribute('data-note-id');
      if (!id) return;

      try {
        await restoreNote(id);
        showToast('Catatan berhasil dipulihkan');
        await loadAndRenderNotes();
      } catch (err) {
        showToast('Gagal memulihkan catatan', true);
      }
    });
  });

  // Permanent Delete button directly on trash cards
  const permDeleteBtns = document.querySelectorAll('.btn-permanent-delete-card');
  permDeleteBtns.forEach((btn) => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const id = btn.getAttribute('data-note-id');
      if (!id) return;

      const confirmed = confirm('Hapus permanen catatan ini? Tindakan tidak dapat dibatalkan.');
      if (confirmed) {
        try {
          await deleteNote(id);
          showToast('Catatan dihapus permanen');
          await loadAndRenderNotes();
        } catch (err) {
          showToast('Gagal menghapus permanen', true);
        }
      }
    });
  });

  // Reset search button inside empty-search state
  const resetSearchBtn = document.getElementById('resetSearchBtn');
  resetSearchBtn?.addEventListener('click', () => {
    const searchInput = document.getElementById('searchInput');
    const clearBtn = document.getElementById('clearSearchBtn');
    if (searchInput) searchInput.value = '';
    if (clearBtn) clearBtn.style.display = 'none';
    currentSearchQuery = '';
    loadAndRenderNotes();
  });

  // Reset category button inside empty category state
  const resetCategoryBtn = document.getElementById('resetCategoryBtn');
  resetCategoryBtn?.addEventListener('click', () => {
    currentCategoryFilter = 'all';
    loadAndRenderNotes();
  });
}

function overlayIsOpen() {
  const overlay = document.getElementById('editorOverlay');
  return overlay?.classList.contains('active');
}

function updateEditorCategoryUI(selectedCategory) {
  currentEditingCategory = selectedCategory || 'Pribadi';
  const buttons = document.querySelectorAll('#editorCategoryPills .category-pill-btn');
  buttons.forEach((btn) => {
    const cat = btn.getAttribute('data-category');
    if (cat.toLowerCase() === currentEditingCategory.toLowerCase()) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });
}

function updateEditorPinUI(isPinned) {
  currentEditingPinned = Boolean(isPinned);
  const pinBtn = document.getElementById('editorPinBtn');
  if (pinBtn) {
    if (currentEditingPinned) {
      pinBtn.classList.add('active');
      pinBtn.title = 'Lepas sematan (Pinned)';
    } else {
      pinBtn.classList.remove('active');
      pinBtn.title = 'Sematkan catatan (Pin)';
    }
  }
}

function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function hexToRgba(hex, alpha = 1) {
  if (!hex || hex[0] !== '#') return hex;
  const c = hex.slice(1);
  const r = parseInt(c.slice(0, 2), 16);
  const g = parseInt(c.slice(2, 4), 16);
  const b = parseInt(c.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function closeEditorPopups() {
  document.getElementById('editorMoreDropdown')?.classList.remove('active');
  document.getElementById('editorCameraMenu')?.classList.remove('active');
  document.getElementById('editorThemeSheet')?.classList.remove('active');
  document.getElementById('editorMoreBtn')?.setAttribute('aria-expanded', 'false');
}

function updateMoreMenuLabels() {
  const pinText = document.getElementById('moreMenuPinText');
  const lockText = document.getElementById('moreMenuLockText');
  if (pinText) {
    pinText.textContent = currentEditingPinned ? 'Lepas Sematan' : 'Sematkan';
  }
  if (lockText) {
    lockText.textContent = currentEditingIsLocked ? 'Buka Kunci' : 'Kunci';
  }
}

function applyEditorTheme(themeId) {
  currentEditingTheme = themeId || 'default';
  const panel = document.getElementById('editorPanel');
  if (panel) {
    panel.setAttribute('data-note-theme', currentEditingTheme);
  }

  // Highlight active theme swatch
  const swatches = document.querySelectorAll('.theme-swatch-item');
  swatches.forEach((sw) => {
    const swId = sw.getAttribute('data-theme-id');
    if (swId === 'scenic_random') {
      sw.classList.toggle('active', SCENIC_THEMES.includes(currentEditingTheme));
    } else {
      sw.classList.toggle('active', swId === currentEditingTheme);
    }
  });
}

function serializeChecklistItems() {
  const container = document.getElementById('editorChecklistContainer');
  if (!container) return '';
  const rows = container.querySelectorAll('.checklist-row');
  const lines = [];
  rows.forEach((row) => {
    const isTextOnly = row.classList.contains('is-text-only');
    const text = row.querySelector('.checklist-text-input')?.value || '';
    if (isTextOnly) {
      lines.push(text);
    } else {
      const isChecked = row.querySelector('.checklist-checkbox')?.classList.contains('checked');
      lines.push(isChecked ? `- [x] ${text}` : `- [ ] ${text}`);
    }
  });
  return lines.join('\n');
}

function renderChecklistFromText(text = '') {
  const container = document.getElementById('editorChecklistContainer');
  if (!container) return;
  container.innerHTML = '';

  const rawLines = text ? text.split('\n') : [''];
  const lines = rawLines.length > 0 ? rawLines : [''];

  lines.forEach((line) => {
    const match = line.match(/^(?:[-*+]\s+)?\[([ xX])\]\s*(.*)$/);
    if (match) {
      const isChecked = match[1].toLowerCase() === 'x';
      const textVal = match[2];
      createChecklistRow(container, textVal, isChecked, null, false);
    } else {
      // Baris teks biasa yang digabung di dalam catatan checklist
      createChecklistRow(container, line, false, null, true);
    }
  });
}

function createChecklistRow(container, text = '', isChecked = false, insertAfterElement = null, isTextOnly = false) {
  const row = document.createElement('div');
  row.className = `checklist-row ${isChecked ? 'is-completed' : ''} ${isTextOnly ? 'is-text-only' : ''}`;
  row.innerHTML = `
    <button type="button" class="checklist-checkbox ${isChecked ? 'checked' : ''}" aria-label="Centang Catatan" style="${isTextOnly ? 'display: none;' : ''}">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="20 6 9 17 4 12"/>
      </svg>
    </button>
    <input type="text" class="checklist-text-input" value="${escapeHtml(text)}" placeholder="${isTextOnly ? 'Ketik catatan...' : 'Ketik butir catatan...'}" />
    <button type="button" class="checklist-delete-btn" title="Hapus Butir">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <line x1="18" y1="6" x2="6" y2="18"/>
        <line x1="6" y1="6" x2="18" y2="18"/>
      </svg>
    </button>
  `;

  const cb = row.querySelector('.checklist-checkbox');
  const input = row.querySelector('.checklist-text-input');
  const delBtn = row.querySelector('.checklist-delete-btn');

  cb.addEventListener('click', () => {
    cb.classList.toggle('checked');
    row.classList.toggle('is-completed', cb.classList.contains('checked'));
    handleEditorInput();
  });

  input.addEventListener('input', () => {
    handleEditorInput();
  });

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      // Jika baris saat ini adalah text-only, baris baru juga text-only
      // Jika checklist, baris baru adalah checklist item
      const currentIsTextOnly = row.classList.contains('is-text-only');
      const newRow = createChecklistRow(container, '', false, row, currentIsTextOnly);
      newRow.querySelector('.checklist-text-input')?.focus();
      handleEditorInput();
    } else if (e.key === 'Backspace' && input.selectionStart === 0 && input.selectionEnd === 0) {
      // JIKA MASIH BERUPA CHECKLIST:
      // Tekan Backspace 1 kali di posisi awal:
      // Jangan langsung hapus ke baris atas! Ubah baris ini menjadi teks biasa (hilangkan kolom checklist/checkboxnya saja)
      // Kursor tetap diam di tempat sehingga pengguna bisa lanjut mengetik teks biasa (gabung checklist dan bukan checklist).
      if (!row.classList.contains('is-text-only')) {
        e.preventDefault();
        row.classList.add('is-text-only');
        cb.style.display = 'none';
        cb.classList.remove('checked');
        row.classList.remove('is-completed');
        input.placeholder = 'Ketik catatan...';
        handleEditorInput();
        return;
      }

      // JIKA SUDAH BERUPA TEKS BIASA (ATAU CHECKBOX SUDAH HILANG):
      // Tekan Backspace di posisi awal teks -> gabung ke baris sebelumnya
      const prevRow = row.previousElementSibling;
      const allRows = container.querySelectorAll('.checklist-row');
      if (allRows.length > 1) {
        e.preventDefault();
        const prevInput = prevRow?.querySelector('.checklist-text-input');
        if (prevInput) {
          const prevLen = prevInput.value.length;
          if (input.value) {
            prevInput.value += input.value;
          }
          prevInput.focus();
          prevInput.setSelectionRange(prevLen, prevLen);
        }
        row.remove();
        handleEditorInput();
      }
    }
  });

  delBtn.addEventListener('click', () => {
    const prevRow = row.previousElementSibling;
    const nextRow = row.nextElementSibling;
    const allRows = container.querySelectorAll('.checklist-row');
    if (allRows.length > 1) {
      row.remove();
      const targetInput = (prevRow || nextRow)?.querySelector('.checklist-text-input');
      targetInput?.focus();
    } else {
      input.value = '';
      cb.classList.remove('checked');
      row.classList.remove('is-completed');
      input.focus();
    }
    handleEditorInput();
  });

  if (insertAfterElement && insertAfterElement.nextSibling) {
    container.insertBefore(row, insertAfterElement.nextSibling);
  } else if (insertAfterElement) {
    container.appendChild(row);
  } else {
    container.appendChild(row);
  }

  return row;
}

function updateChecklistModeUI() {
  const bodyInput = document.getElementById('noteBodyInput');
  const checklistContainer = document.getElementById('editorChecklistContainer');
  const checklistBtn = document.getElementById('editorChecklistBtn');

  if (currentEditingIsChecklist) {
    if (bodyInput) bodyInput.style.display = 'none';
    if (checklistContainer) {
      checklistContainer.style.display = 'flex';
      renderChecklistFromText(bodyInput?.value || '');
    }
    checklistBtn?.classList.add('active');
  } else {
    if (bodyInput) bodyInput.style.display = 'block';
    if (checklistContainer) checklistContainer.style.display = 'none';
    checklistBtn?.classList.remove('active');
  }
}

function renderEditorMediaGallery() {
  const gallery = document.getElementById('editorMediaGallery');
  if (!gallery) return;

  if (currentEditingMedia.length === 0) {
    gallery.style.display = 'none';
    gallery.innerHTML = '';
    return;
  }

  gallery.style.display = 'flex';
  gallery.innerHTML = currentEditingMedia.map((item, idx) => {
    if (item.type === 'video') {
      return `
        <div class="editor-media-item" data-media-id="${item.id}">
          <button type="button" class="btn-remove-media" data-index="${idx}" title="Hapus Video">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
          <video class="editor-media-video" controls preload="metadata" playsinline>
            <source src="${item.url}">
            Browser Anda tidak mendukung pemutar video.
          </video>
        </div>
      `;
    }

    return `
      <div class="editor-media-item" data-media-id="${item.id}">
        <button type="button" class="btn-remove-media" data-index="${idx}" title="Hapus Foto">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
        <img src="${item.url}" alt="${escapeHtml(item.name || 'Foto')}" class="editor-media-img" data-index="${idx}" />
        <span class="media-pinch-hint">Ketuk untuk memperbesar / cubit</span>
      </div>
    `;
  }).join('');

  gallery.querySelectorAll('.btn-remove-media').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const idx = Number(btn.getAttribute('data-index'));
      currentEditingMedia.splice(idx, 1);
      renderEditorMediaGallery();
      handleEditorInput();
    });
  });

  gallery.querySelectorAll('.editor-media-img').forEach((img) => {
    img.addEventListener('click', () => {
      openImageLightbox(img.src, img.alt);
    });
  });
}

function openImageLightbox(src, title = 'Foto') {
  const overlay = document.getElementById('imageLightboxOverlay');
  const img = document.getElementById('lightboxImage');
  const titleEl = document.getElementById('lightboxTitle');
  const zoomText = document.getElementById('lightboxZoomLevel');

  if (!overlay || !img) return;

  currentLightboxScale = 1;
  img.src = src;
  img.style.transform = 'scale(1)';
  if (titleEl) titleEl.textContent = title;
  if (zoomText) zoomText.textContent = '100%';

  overlay.classList.add('active');
  overlay.setAttribute('aria-hidden', 'false');
}

function closeImageLightbox() {
  const overlay = document.getElementById('imageLightboxOverlay');
  if (overlay) {
    overlay.classList.remove('active');
    overlay.setAttribute('aria-hidden', 'true');
  }
}

function openMoveNoteModal() {
  const overlay = document.getElementById('moveNoteOverlay');
  const listContainer = document.getElementById('moveFolderListContainer');
  if (!overlay || !listContainer) return;

  const fMap = getFolderMap();
  let html = `
    <button type="button" class="move-folder-item ${currentEditingFolderId === 'notes' ? 'current-folder' : ''}" data-target-folder="notes">
      <div class="move-folder-icon">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
      </div>
      <span class="move-folder-name">Catatan</span>
      ${currentEditingFolderId === 'notes' ? '<span class="move-folder-count">Saat Ini</span>' : ''}
    </button>
  `;

  cachedCustomFolders.forEach((f) => {
    const fId = `folder_${f.id}`;
    html += `
      <button type="button" class="move-folder-item ${currentEditingFolderId === fId ? 'current-folder' : ''}" data-target-folder="${fId}">
        <div class="move-folder-icon">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
        </div>
        <span class="move-folder-name">${escapeHtml(f.name)}</span>
        ${currentEditingFolderId === fId ? '<span class="move-folder-count">Saat Ini</span>' : ''}
      </button>
    `;
  });

  listContainer.innerHTML = html;

  listContainer.querySelectorAll('.move-folder-item').forEach((item) => {
    item.addEventListener('click', async () => {
      const targetFolder = item.getAttribute('data-target-folder');
      if (!targetFolder || targetFolder === currentEditingFolderId) {
        overlay.classList.remove('active');
        return;
      }

      currentEditingFolderId = targetFolder;
      currentEditingIsLocked = false;
      const targetName = fMap[targetFolder] || 'Catatan';
      const folderTitleEl = document.getElementById('editorFolderTitle');
      if (folderTitleEl) folderTitleEl.textContent = targetName;

      await performSave();
      overlay.classList.remove('active');
      showToast(`Catatan dipindahkan ke folder "${targetName}"`);
    });
  });

  overlay.classList.add('active');
  overlay.setAttribute('aria-hidden', 'false');
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
}

function readAndCompressImage(file) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const maxDim = 1600;
        let { width, height } = img;
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.85));
      };
      img.onerror = () => resolve(e.target.result);
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}

function openEditor(note = null) {
  if (debounceTimer) {
    clearTimeout(debounceTimer);
    debounceTimer = null;
  }

  const overlay = document.getElementById('editorOverlay');
  const titleInput = document.getElementById('noteTitleInput');
  const bodyInput = document.getElementById('noteBodyInput');
  const deleteBtn = document.getElementById('deleteNoteBtn');
  const charCounter = document.getElementById('editorWordCount');
  const folderTitleEl = document.getElementById('editorFolderTitle');

  if (!overlay || !titleInput || !bodyInput) return;

  if (note) {
    currentEditingId = note.id;
    lastSavedTitle = note.title || '';
    lastSavedContent = note.content || '';
    currentEditingCategory = note.category || 'Pribadi';
    currentEditingPinned = Boolean(note.isPinned);
    currentEditingFolderId = note.folderId || 'notes';
    currentEditingIsLocked = Boolean(note.isLocked);
    currentEditingTheme = note.themeBackground || 'default';
    currentEditingMedia = Array.isArray(note.media) ? [...note.media] : [];
    currentEditingIsChecklist = Boolean(note.isChecklist);

    lastSavedCategory = currentEditingCategory;
    lastSavedPinned = currentEditingPinned;
    lastSavedFolderId = currentEditingFolderId;
    lastSavedIsLocked = currentEditingIsLocked;
    lastSavedTheme = currentEditingTheme;
    lastSavedMedia = [...currentEditingMedia];
    lastSavedIsChecklist = currentEditingIsChecklist;

    titleInput.value = lastSavedTitle;
    bodyInput.value = lastSavedContent;
    if (deleteBtn) deleteBtn.style.display = 'flex';
    setSavingStatus('idle', 'Tersimpan');
  } else {
    currentEditingId = null;
    lastSavedTitle = '';
    lastSavedContent = '';
    lastSavedCategory = currentCategoryFilter !== 'all' ? currentCategoryFilter : 'Pribadi';
    lastSavedPinned = false;
    currentEditingCategory = lastSavedCategory;
    currentEditingPinned = false;
    currentEditingTheme = 'default';
    currentEditingMedia = [];
    currentEditingIsChecklist = false;

    // Assign new note to current folder
    if (currentFolder === 'locked') {
      currentEditingFolderId = 'locked';
      currentEditingIsLocked = true;
    } else if (currentFolder === 'all' || currentFolder === 'trash') {
      currentEditingFolderId = 'notes';
      currentEditingIsLocked = false;
    } else {
      currentEditingFolderId = currentFolder;
      currentEditingIsLocked = false;
    }
    lastSavedFolderId = currentEditingFolderId;
    lastSavedIsLocked = currentEditingIsLocked;
    lastSavedTheme = currentEditingTheme;
    lastSavedMedia = [];
    lastSavedIsChecklist = false;

    titleInput.value = '';
    bodyInput.value = '';
    if (deleteBtn) deleteBtn.style.display = 'none';
    setSavingStatus('idle', 'Siap');
  }

  // Set Folder title tag in header
  if (folderTitleEl) {
    const fMap = getFolderMap();
    folderTitleEl.textContent = fMap[currentEditingFolderId] || 'Catatan';
  }

  // Apply theme background
  applyEditorTheme(currentEditingTheme);

  // Render media gallery
  renderEditorMediaGallery();

  // Render checklist or textarea
  updateChecklistModeUI();

  // Update More Menu labels
  updateMoreMenuLabels();

  updateEditorCategoryUI(currentEditingCategory);
  updateEditorPinUI(currentEditingPinned);

  if (charCounter) {
    charCounter.textContent = `${bodyInput.value.length} karakter`;
  }

  closeEditorPopups();

  overlay.classList.add('active');
  overlay.setAttribute('aria-hidden', 'false');
  titleInput.focus();
}

async function closeEditor() {
  await flushPendingSave();

  const overlay = document.getElementById('editorOverlay');
  const titleInput = document.getElementById('noteTitleInput');
  const bodyInput = document.getElementById('noteBodyInput');
  const deleteBtn = document.getElementById('deleteNoteBtn');

  closeEditorPopups();

  if (!overlay) return;
  overlay.classList.remove('active');
  overlay.setAttribute('aria-hidden', 'true');
  currentEditingId = null;
  lastSavedTitle = '';
  lastSavedContent = '';
  lastSavedCategory = 'Pribadi';
  lastSavedPinned = false;
  currentEditingCategory = 'Pribadi';
  currentEditingPinned = false;
  currentEditingFolderId = 'notes';
  currentEditingIsLocked = false;
  currentEditingTheme = 'default';
  currentEditingMedia = [];
  currentEditingIsChecklist = false;

  if (titleInput) titleInput.value = '';
  if (bodyInput) bodyInput.value = '';
  if (deleteBtn) deleteBtn.style.display = 'none';
  setSavingStatus('idle', 'Siap');
}

/**
 * Trigger debounced autosave upon title or body input
 */
function handleEditorInput() {
  const titleInput = document.getElementById('noteTitleInput');
  const bodyInput = document.getElementById('noteBodyInput');
  const charCounter = document.getElementById('editorWordCount');

  if (!titleInput || !bodyInput) return;

  const currentTitle = titleInput.value;
  let currentContent = '';
  if (currentEditingIsChecklist) {
    currentContent = serializeChecklistItems();
  } else {
    currentContent = bodyInput.value;
  }

  if (charCounter) {
    charCounter.textContent = `${currentContent.length} karakter`;
  }

  setSavingStatus('editing', 'Mengedit…');

  if (debounceTimer) {
    clearTimeout(debounceTimer);
  }

  debounceTimer = setTimeout(() => {
    debounceTimer = null;
    performSave();
  }, DEBOUNCE_DELAY_MS);
}

/**
 * Execute save operation safely against IndexedDB
 */
async function performSave() {
  const titleInput = document.getElementById('noteTitleInput');
  const bodyInput = document.getElementById('noteBodyInput');
  if (!titleInput || !bodyInput) return;

  const currentTitle = titleInput.value.trim();
  let currentContent = '';
  if (currentEditingIsChecklist) {
    currentContent = serializeChecklistItems();
  } else {
    currentContent = bodyInput.value;
  }

  // Do not create blank notes if title, content, and media are all empty
  if (!currentTitle && !currentContent.trim() && currentEditingMedia.length === 0) {
    if (!currentEditingId) {
      setSavingStatus('idle', 'Siap');
      return;
    }
  }

  if (isSaving) {
    saveQueued = true;
    return;
  }

  isSaving = true;
  saveQueued = false;
  const thisRevision = ++saveRevision;
  setSavingStatus('saving', 'Menyimpan…');

  try {
    currentSavePromise = (async () => {
      const payload = {
        title: currentTitle || 'Tanpa Judul',
        content: currentContent,
        category: currentEditingCategory || 'Pribadi',
        isPinned: Boolean(currentEditingPinned),
        folderId: currentEditingFolderId || 'notes',
        isLocked: Boolean(currentEditingIsLocked),
        themeBackground: currentEditingTheme || 'default',
        media: currentEditingMedia,
        isChecklist: Boolean(currentEditingIsChecklist)
      };

      if (currentEditingId) {
        await updateNote(currentEditingId, payload);
      } else {
        const newId = await createNote(payload);
        currentEditingId = newId;

        const deleteBtn = document.getElementById('deleteNoteBtn');
        if (deleteBtn) deleteBtn.style.display = 'flex';
      }
    })();

    await currentSavePromise;

    if (thisRevision === saveRevision) {
      lastSavedTitle = currentTitle;
      lastSavedContent = currentContent;
      lastSavedCategory = currentEditingCategory;
      lastSavedPinned = currentEditingPinned;
      lastSavedFolderId = currentEditingFolderId;
      lastSavedIsLocked = currentEditingIsLocked;
      lastSavedTheme = currentEditingTheme;
      lastSavedMedia = [...currentEditingMedia];
      lastSavedIsChecklist = currentEditingIsChecklist;
      setSavingStatus('saved', 'Tersimpan');
      await loadAndRenderNotes();
    }
  } catch (error) {
    console.error('Autosave error:', error);
    setSavingStatus('error', 'Gagal menyimpan');
    showToast('Gagal menyimpan otomatis. Ketuk "Coba lagi" untuk mencoba ulang.', true);
  } finally {
    isSaving = false;
    currentSavePromise = null;

    if (saveQueued) {
      saveQueued = false;
      performSave();
    }
  }
}

/**
 * Flush any pending debounce or queued save immediately
 */
async function flushPendingSave() {
  if (debounceTimer) {
    clearTimeout(debounceTimer);
    debounceTimer = null;
  }

  const titleInput = document.getElementById('noteTitleInput');
  const bodyInput = document.getElementById('noteBodyInput');
  if (titleInput && bodyInput) {
    const curTitle = titleInput.value.trim();
    let curContent = '';
    if (currentEditingIsChecklist) {
      curContent = serializeChecklistItems();
    } else {
      curContent = bodyInput.value;
    }

    if (
      curTitle !== lastSavedTitle ||
      curContent !== lastSavedContent ||
      currentEditingCategory !== lastSavedCategory ||
      currentEditingPinned !== lastSavedPinned ||
      currentEditingFolderId !== lastSavedFolderId ||
      currentEditingIsLocked !== lastSavedIsLocked ||
      currentEditingTheme !== lastSavedTheme ||
      currentEditingIsChecklist !== lastSavedIsChecklist
    ) {
      await performSave();
    }
  }

  if (currentSavePromise) {
    try {
      await currentSavePromise;
    } catch (_) {
      // Handled in performSave
    }
  }
}

function setupInteractions() {
  const overlay = document.getElementById('editorOverlay');
  const openBtn = document.getElementById('openEditorBtn');
  const closeBtn = document.getElementById('closeEditorBtn');
  const saveBtn = document.getElementById('saveNoteBtn');
  const deleteBtn = document.getElementById('deleteNoteBtn');
  const retryBtn = document.getElementById('retrySaveBtn');
  const editorPinBtn = document.getElementById('editorPinBtn');
  const titleInput = document.getElementById('noteTitleInput');
  const bodyInput = document.getElementById('noteBodyInput');
  const searchInput = document.getElementById('searchInput');
  const clearSearchBtn = document.getElementById('clearSearchBtn');
  const themeToggleBtn = document.getElementById('themeToggleBtn');
  const iconSun = document.getElementById('themeIconSun');
  const iconMoon = document.getElementById('themeIconMoon');

  // Confirmation dialog elements
  const confirmOverlay = document.getElementById('confirmDialogOverlay');
  const cancelDeleteBtn = document.getElementById('cancelDeleteBtn');
  const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');

  // Search Input Interaction
  searchInput?.addEventListener('input', (e) => {
    currentSearchQuery = e.target.value;
    if (clearSearchBtn) {
      clearSearchBtn.style.display = currentSearchQuery.length > 0 ? 'flex' : 'none';
    }
    loadAndRenderNotes();
  });

  clearSearchBtn?.addEventListener('click', () => {
    if (searchInput) {
      searchInput.value = '';
      searchInput.focus();
    }
    clearSearchBtn.style.display = 'none';
    currentSearchQuery = '';
    loadAndRenderNotes();
  });

  // Editor Category Selector Pills interaction
  const editorPills = document.querySelectorAll('#editorCategoryPills .category-pill-btn');
  editorPills.forEach((pill) => {
    pill.addEventListener('click', async () => {
      const selectedCat = pill.getAttribute('data-category');
      updateEditorCategoryUI(selectedCat);
      const curTitle = titleInput?.value.trim() || '';
      const curContent = bodyInput?.value.trim() || '';
      if (currentEditingId || curTitle || curContent) {
        await performSave();
      }
    });
  });

  // Editor Pin Button toggle
  editorPinBtn?.addEventListener('click', async () => {
    updateEditorPinUI(!currentEditingPinned);
    showToast(currentEditingPinned ? 'Catatan disematkan' : 'Sematan dilepas');
    const curTitle = titleInput?.value.trim() || '';
    const curContent = bodyInput?.value.trim() || '';
    if (currentEditingId || curTitle || curContent) {
      await performSave();
    }
  });

  // Open FAB
  openBtn?.addEventListener('click', () => openEditor());

  // Close Editor Button
  closeBtn?.addEventListener('click', closeEditor);

  // Close overlay on backdrop click
  overlay?.addEventListener('click', (e) => {
    if (e.target === overlay) {
      closeEditor();
    }
  });

  // Escape key to close modal or confirm dialog
  window.addEventListener('keydown', async (e) => {
    if (e.key === 'Escape') {
      if (confirmOverlay?.classList.contains('active')) {
        confirmOverlay.classList.remove('active');
        return;
      }
      if (overlay?.classList.contains('active')) {
        await closeEditor();
      }
    }
  });

  // Debounced input listeners
  titleInput?.addEventListener('input', handleEditorInput);
  bodyInput?.addEventListener('input', handleEditorInput);

  // Explicit Save button triggers immediate flush & save
  saveBtn?.addEventListener('click', async () => {
    await flushPendingSave();
    const badge = document.getElementById('editorStatusBadge');
    if (!badge?.classList.contains('status-error')) {
      showToast('Catatan tersimpan');
    }
  });

  // Retry save button when save failed
  retryBtn?.addEventListener('click', () => {
    performSave();
  });

  // Open delete confirmation modal (guarded if currently saving)
  deleteBtn?.addEventListener('click', () => {
    if (!currentEditingId || isSaving) return;
    confirmOverlay?.classList.add('active');
  });

  // Cancel deletion
  cancelDeleteBtn?.addEventListener('click', () => {
    confirmOverlay?.classList.remove('active');
  });

  confirmOverlay?.addEventListener('click', (e) => {
    if (e.target === confirmOverlay) {
      confirmOverlay.classList.remove('active');
    }
  });

  // Confirm delete note action (soft-delete to "Baru Dihapus")
  confirmDeleteBtn?.addEventListener('click', async () => {
    if (!currentEditingId) return;

    if (debounceTimer) {
      clearTimeout(debounceTimer);
      debounceTimer = null;
    }

    try {
      await softDeleteNote(currentEditingId);
      confirmOverlay?.classList.remove('active');
      showToast('Catatan dipindahkan ke Baru Dihapus');

      const overlayEl = document.getElementById('editorOverlay');
      if (overlayEl) {
        overlayEl.classList.remove('active');
        overlayEl.setAttribute('aria-hidden', 'true');
      }
      currentEditingId = null;
      lastSavedTitle = '';
      lastSavedContent = '';
      if (titleInput) titleInput.value = '';
      if (bodyInput) bodyInput.value = '';
      if (deleteBtn) deleteBtn.style.display = 'none';

      await loadAndRenderNotes();
    } catch (error) {
      console.error('Error saat menghapus catatan:', error);
      showToast(error.message || 'Gagal memindahkan ke Baru Dihapus', true);
    }
  });

  // ==========================================
  // FITUR BARU EDITOR: TEMA, TITIK TIGA, KAMERA, CORETAN, CHECKLIST
  // ==========================================
  function setupEditorNewFeatures() {
    // 1. Tema Background (Gambar 1 & 2)
    const themeBtn = document.getElementById('editorThemeBtn');
    const themeSheet = document.getElementById('editorThemeSheet');
    const closeThemeSheetBtn = document.getElementById('closeThemeSheetBtn');
    const themeSwatches = document.querySelectorAll('.theme-swatch-item');

    themeBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      closeEditorPopups();
      themeSheet?.classList.toggle('active');
    });

    closeThemeSheetBtn?.addEventListener('click', () => {
      themeSheet?.classList.remove('active');
    });

    themeSwatches.forEach((sw) => {
      sw.addEventListener('click', () => {
        const themeId = sw.getAttribute('data-theme-id');
        if (themeId === 'scenic_random') {
          scenicIndex = (scenicIndex + 1) % SCENIC_THEMES.length;
          currentEditingTheme = SCENIC_THEMES[scenicIndex];
        } else {
          currentEditingTheme = themeId || 'default';
        }
        applyEditorTheme(currentEditingTheme);
        handleEditorInput();
      });
    });

    // 2. Titik Tiga / More Menu (Gambar 1 & 3: Sematkan, Kunci, Pindahkan Catatan)
    const moreBtn = document.getElementById('editorMoreBtn');
    const moreDropdown = document.getElementById('editorMoreDropdown');
    const pinOptionBtn = document.getElementById('moreMenuPinBtn');
    const lockOptionBtn = document.getElementById('moreMenuLockBtn');
    const moveOptionBtn = document.getElementById('moreMenuMoveBtn');

    moreBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      const isNowActive = moreDropdown?.classList.toggle('active');
      moreDropdown?.setAttribute('aria-hidden', String(!isNowActive));
      moreBtn?.setAttribute('aria-expanded', String(isNowActive));
    });

    pinOptionBtn?.addEventListener('click', async (e) => {
      e.stopPropagation();
      closeEditorPopups();
      currentEditingPinned = !currentEditingPinned;
      updateEditorPinUI(currentEditingPinned);
      updateMoreMenuLabels();
      showToast(currentEditingPinned ? 'Catatan disematkan' : 'Sematan dilepas');
      await handleEditorInput();
    });

    lockOptionBtn?.addEventListener('click', async (e) => {
      e.stopPropagation();
      closeEditorPopups();
      if (currentEditingIsLocked) {
        currentEditingIsLocked = false;
        currentEditingFolderId = 'notes';
        updateMoreMenuLabels();
        showToast('Kunci catatan dibuka, dipindahkan ke Catatan');
        await handleEditorInput();
      } else {
        await promptPasscodeForNoteLock();
      }
    });

    moveOptionBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      closeEditorPopups();
      openMoveNoteModal();
    });

    // 3. Ambil Gambar / Pilih Gambar (Gambar 1 & 4: Ambil Foto, Pilih Foto/Video)
    const cameraBtn = document.getElementById('editorCameraBtn');
    const cameraMenu = document.getElementById('editorCameraMenu');
    const takePhotoBtn = document.getElementById('cameraTakePhotoBtn');
    const pickPhotoBtn = document.getElementById('cameraPickPhotoBtn');
    const captureInput = document.getElementById('cameraCaptureInput');
    const fileInput = document.getElementById('cameraFileInput');

    cameraBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      const isActive = cameraMenu?.classList.toggle('active');
      cameraMenu?.setAttribute('aria-hidden', String(!isActive));
    });

    takePhotoBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      cameraMenu?.classList.remove('active');
      captureInput?.click();
    });

    pickPhotoBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      cameraMenu?.classList.remove('active');
      fileInput?.click();
    });

    async function handleMediaUpload(files) {
      if (!files || files.length === 0) return;
      for (const file of Array.from(files)) {
        try {
          if (file.type.startsWith('video/')) {
            const dataUrl = await readFileAsDataUrl(file);
            currentEditingMedia.push({
              id: Date.now() + Math.random(),
              type: 'video',
              url: dataUrl,
              name: file.name
            });
          } else {
            const dataUrl = await readAndCompressImage(file);
            currentEditingMedia.push({
              id: Date.now() + Math.random(),
              type: 'image',
              url: dataUrl,
              name: file.name
            });
          }
        } catch (err) {
          console.error('Gagal membaca media:', err);
          showToast('Gagal memuat berkas media', true);
        }
      }
      renderEditorMediaGallery();
      handleEditorInput();
      showToast('Media berhasil ditambahkan');
    }

    captureInput?.addEventListener('change', async (e) => {
      await handleMediaUpload(e.target.files);
      captureInput.value = '';
    });

    fileInput?.addEventListener('change', async (e) => {
      await handleMediaUpload(e.target.files);
      fileInput.value = '';
    });

    // 4. Fitur Checklist (Gambar 1)
    const checklistToggleBtn = document.getElementById('editorChecklistBtn');
    checklistToggleBtn?.addEventListener('click', () => {
      const bodyInput = document.getElementById('noteBodyInput');
      const checklistContainer = document.getElementById('editorChecklistContainer');

      if (!currentEditingIsChecklist) {
        currentEditingIsChecklist = true;
        renderChecklistFromText(bodyInput?.value || '');
        updateChecklistModeUI();
        handleEditorInput();
      } else {
        // Jika sudah di dalam mode checklist, periksa apakah ada row yang sedang difokuskan
        const activeInput = document.activeElement;
        const activeRow = activeInput?.closest?.('.checklist-row');
        if (activeRow) {
          // Toggle row yang aktif antara checklist dan teks biasa
          const cb = activeRow.querySelector('.checklist-checkbox');
          if (activeRow.classList.contains('is-text-only')) {
            activeRow.classList.remove('is-text-only');
            if (cb) cb.style.display = 'flex';
            if (activeInput) activeInput.placeholder = 'Ketik butir catatan...';
          } else {
            activeRow.classList.add('is-text-only');
            if (cb) {
              cb.style.display = 'none';
              cb.classList.remove('checked');
            }
            activeRow.classList.remove('is-completed');
            if (activeInput) activeInput.placeholder = 'Ketik catatan...';
          }
          handleEditorInput();
        } else {
          // Tambahkan row checklist baru di akhir
          const newRow = createChecklistRow(checklistContainer, '', false, null, false);
          newRow.querySelector('.checklist-text-input')?.focus();
          handleEditorInput();
        }
      }
    });

    // 5. Pindahkan Catatan Modal
    const moveOverlay = document.getElementById('moveNoteOverlay');
    const closeMoveBtn = document.getElementById('closeMoveNoteBtn');
    closeMoveBtn?.addEventListener('click', () => {
      moveOverlay?.classList.remove('active');
    });
    moveOverlay?.addEventListener('click', (e) => {
      if (e.target === moveOverlay) {
        moveOverlay.classList.remove('active');
      }
    });

    // 6. Lightbox Zoom / Pinch (Pinch-to-zoom di HP + Tombol Zoom)
    const lightboxOverlay = document.getElementById('imageLightboxOverlay');
    const closeLightboxBtn = document.getElementById('closeLightboxBtn');
    const zoomInBtn = document.getElementById('lightboxZoomInBtn');
    const zoomOutBtn = document.getElementById('lightboxZoomOutBtn');
    const resetZoomBtn = document.getElementById('lightboxResetBtn');
    const lightboxViewport = document.getElementById('lightboxViewport');

    function applyLightboxZoom() {
      const img = document.getElementById('lightboxImage');
      const text = document.getElementById('lightboxZoomLevel');
      if (img) img.style.transform = `scale(${currentLightboxScale})`;
      if (text) text.textContent = `${Math.round(currentLightboxScale * 100)}%`;
    }

    zoomInBtn?.addEventListener('click', () => {
      currentLightboxScale = Math.min(5, currentLightboxScale + 0.25);
      applyLightboxZoom();
    });

    zoomOutBtn?.addEventListener('click', () => {
      currentLightboxScale = Math.max(0.5, currentLightboxScale - 0.25);
      applyLightboxZoom();
    });

    resetZoomBtn?.addEventListener('click', () => {
      currentLightboxScale = 1;
      applyLightboxZoom();
    });

    closeLightboxBtn?.addEventListener('click', closeImageLightbox);

    lightboxOverlay?.addEventListener('click', (e) => {
      if (e.target === lightboxOverlay || e.target === lightboxViewport) {
        closeImageLightbox();
      }
    });

    // Touch pinch gesture handler
    let touchDistStart = 0;
    let initialTouchScale = 1;
    lightboxViewport?.addEventListener('touchstart', (e) => {
      if (e.touches.length === 2) {
        touchDistStart = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY
        );
        initialTouchScale = currentLightboxScale;
      }
    }, { passive: true });

    lightboxViewport?.addEventListener('touchmove', (e) => {
      if (e.touches.length === 2 && touchDistStart > 0) {
        const curDist = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY
        );
        const scaleRatio = curDist / touchDistStart;
        currentLightboxScale = Math.min(5, Math.max(0.5, initialTouchScale * scaleRatio));
        applyLightboxZoom();
      }
    }, { passive: true });

    // 7. Alat Coret / Canvas Drawing (Gambar 1 & 5)
    setupDrawingModalEvents();

    // Close open popups when clicking outside
    document.addEventListener('click', (e) => {
      if (!e.target.closest('#editorMoreContainer')) {
        document.getElementById('editorMoreDropdown')?.classList.remove('active');
        document.getElementById('editorMoreBtn')?.setAttribute('aria-expanded', 'false');
      }
      if (!e.target.closest('#cameraMenuContainer')) {
        document.getElementById('editorCameraMenu')?.classList.remove('active');
      }
      if (!e.target.closest('#editorThemeSheet') && !e.target.closest('#editorThemeBtn')) {
        document.getElementById('editorThemeSheet')?.classList.remove('active');
      }
    });
  }

  function setupDrawingModalEvents() {
    const drawingOverlay = document.getElementById('drawingModalOverlay');
    const drawingOpenBtn = document.getElementById('editorDrawingBtn');
    const backBtn = document.getElementById('drawingBackBtn');
    const undoBtn = document.getElementById('drawingUndoBtn');
    const redoBtn = document.getElementById('drawingRedoBtn');
    const clearBtn = document.getElementById('drawingClearBtn');
    const saveBtn = document.getElementById('drawingSaveBtn');
    const colorPickerBtn = document.getElementById('drawingColorPickerBtn');
    const colorPalette = document.getElementById('drawingColorPalette');
    const activeColorCircle = document.getElementById('drawingActiveColorCircle');
    const canvas = document.getElementById('drawingCanvas');
    const wrapper = document.getElementById('drawingCanvasWrapper');

    if (!canvas || !wrapper) return;

    const ctx = canvas.getContext('2d');
    let isDrawing = false;
    let currentTool = 'pencil';
    let currentColor = '#000000';
    let undoStack = [];
    let redoStack = [];
    let lastX = 0;
    let lastY = 0;

    function resizeCanvas() {
      const rect = wrapper.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      const w = Math.max(300, rect.width || window.innerWidth);
      const h = Math.max(300, rect.height || (window.innerHeight - 130));

      let prevData = null;
      if (canvas.width > 0 && canvas.height > 0) {
        try {
          prevData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        } catch (_) {}
      }

      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);

      ctx.scale(dpr, dpr);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      if (prevData) {
        try {
          ctx.putImageData(prevData, 0, 0);
        } catch (_) {}
      } else {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, w, h);
      }
    }

    function pushUndo() {
      try {
        undoStack.push(ctx.getImageData(0, 0, canvas.width, canvas.height));
        if (undoStack.length > 25) undoStack.shift();
        redoStack = [];
      } catch (_) {}
    }

    drawingOpenBtn?.addEventListener('click', () => {
      drawingOverlay?.classList.add('active');
      setTimeout(() => {
        resizeCanvas();
        undoStack = [];
        redoStack = [];
      }, 50);
    });

    backBtn?.addEventListener('click', () => {
      drawingOverlay?.classList.remove('active');
    });

    undoBtn?.addEventListener('click', () => {
      if (undoStack.length > 0) {
        try {
          redoStack.push(ctx.getImageData(0, 0, canvas.width, canvas.height));
          const prev = undoStack.pop();
          ctx.save();
          ctx.setTransform(1, 0, 0, 1, 0, 0);
          ctx.putImageData(prev, 0, 0);
          ctx.restore();
        } catch (_) {}
      }
    });

    redoBtn?.addEventListener('click', () => {
      if (redoStack.length > 0) {
        try {
          undoStack.push(ctx.getImageData(0, 0, canvas.width, canvas.height));
          const next = redoStack.pop();
          ctx.save();
          ctx.setTransform(1, 0, 0, 1, 0, 0);
          ctx.putImageData(next, 0, 0);
          ctx.restore();
        } catch (_) {}
      }
    });

    clearBtn?.addEventListener('click', () => {
      pushUndo();
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.restore();
    });

    saveBtn?.addEventListener('click', () => {
      const dataUrl = canvas.toDataURL('image/png');
      currentEditingMedia.push({
        id: Date.now() + Math.random(),
        type: 'image',
        url: dataUrl,
        name: `Coretan_${new Date().toLocaleTimeString('id-ID').replace(/:/g, '-')}`
      });
      renderEditorMediaGallery();
      handleEditorInput();
      drawingOverlay?.classList.remove('active');
      showToast('Coretan berhasil ditambahkan ke catatan');
    });

    colorPickerBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      if (colorPalette) {
        colorPalette.style.display = colorPalette.style.display === 'none' ? 'flex' : 'none';
      }
    });

    document.querySelectorAll('.drawing-palette-color').forEach((sw) => {
      sw.addEventListener('click', (e) => {
        e.stopPropagation();
        document.querySelectorAll('.drawing-palette-color').forEach((s) => s.classList.remove('active'));
        sw.classList.add('active');
        currentColor = sw.getAttribute('data-color') || '#000000';
        if (activeColorCircle) {
          activeColorCircle.style.background = currentColor;
        }
        if (colorPalette) colorPalette.style.display = 'none';
        if (currentTool === 'eraser') {
          setTool('pencil');
        }
      });
    });

    const toolBtns = [
      { el: document.getElementById('toolPencil'), name: 'pencil' },
      { el: document.getElementById('toolPen'), name: 'pen' },
      { el: document.getElementById('toolHighlighter'), name: 'highlighter' },
      { el: document.getElementById('toolEraser'), name: 'eraser' }
    ];

    function setTool(name) {
      currentTool = name;
      toolBtns.forEach(({ el, name: tName }) => {
        el?.classList.toggle('active', tName === name);
      });
    }

    toolBtns.forEach(({ el, name }) => {
      el?.addEventListener('click', () => setTool(name));
    });

    function getCanvasPos(e) {
      const rect = canvas.getBoundingClientRect();
      return {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      };
    }

    function applyToolStyle() {
      if (currentTool === 'eraser') {
        ctx.globalCompositeOperation = 'source-over';
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 26;
        ctx.globalAlpha = 1.0;
      } else if (currentTool === 'highlighter') {
        ctx.globalCompositeOperation = 'source-over';
        ctx.strokeStyle = currentColor;
        ctx.lineWidth = 20;
        ctx.globalAlpha = 0.35;
      } else if (currentTool === 'pen') {
        ctx.globalCompositeOperation = 'source-over';
        ctx.strokeStyle = currentColor;
        ctx.lineWidth = 5.5;
        ctx.globalAlpha = 1.0;
      } else {
        // pencil
        ctx.globalCompositeOperation = 'source-over';
        ctx.strokeStyle = currentColor;
        ctx.lineWidth = 2.5;
        ctx.globalAlpha = 1.0;
      }
    }

    canvas.addEventListener('pointerdown', (e) => {
      canvas.setPointerCapture(e.pointerId);
      isDrawing = true;
      pushUndo();
      const pos = getCanvasPos(e);
      lastX = pos.x;
      lastY = pos.y;
      applyToolStyle();
      ctx.beginPath();
      ctx.moveTo(lastX, lastY);
      ctx.lineTo(lastX + 0.1, lastY + 0.1);
      ctx.stroke();
    });

    canvas.addEventListener('pointermove', (e) => {
      if (!isDrawing) return;
      const pos = getCanvasPos(e);
      ctx.beginPath();
      ctx.moveTo(lastX, lastY);
      ctx.lineTo(pos.x, pos.y);
      ctx.stroke();
      lastX = pos.x;
      lastY = pos.y;
    });

    const stopDrawing = (e) => {
      if (!isDrawing) return;
      isDrawing = false;
      try {
        canvas.releasePointerCapture(e.pointerId);
      } catch (_) {}
    };

    canvas.addEventListener('pointerup', stopDrawing);
    canvas.addEventListener('pointercancel', stopDrawing);
  }

  setupEditorNewFeatures();

  // View Mode Switcher (Tampilan Daftar, Tampilan Kartu, Tampilan Kisi)
  const viewModeBtn = document.getElementById('viewModeBtn');
  const viewModeDropdown = document.getElementById('viewModeDropdown');
  const viewModeOptions = document.querySelectorAll('.view-mode-option');
  const viewModeBtnIcon = document.getElementById('viewModeBtnIcon');

  function closeViewModeDropdown() {
    if (viewModeDropdown && viewModeDropdown.classList.contains('active')) {
      viewModeDropdown.classList.remove('active');
      viewModeDropdown.setAttribute('aria-hidden', 'true');
      viewModeBtn?.setAttribute('aria-expanded', 'false');
    }
  }

  viewModeBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    const isNowActive = viewModeDropdown?.classList.toggle('active');
    viewModeDropdown?.setAttribute('aria-hidden', String(!isNowActive));
    viewModeBtn?.setAttribute('aria-expanded', String(isNowActive));
  });

  viewModeOptions.forEach((option) => {
    option.addEventListener('click', (e) => {
      e.stopPropagation();
      const selectedMode = option.getAttribute('data-view');
      if (!selectedMode || selectedMode === currentViewMode) {
        closeViewModeDropdown();
        return;
      }

      currentViewMode = selectedMode;
      localStorage.setItem('notepad_view_mode', currentViewMode);

      // Update button icon & options active state
      if (viewModeBtnIcon) {
        viewModeBtnIcon.innerHTML = getViewModeIcon(currentViewMode);
      }
      viewModeOptions.forEach((opt) => {
        opt.classList.toggle('active', opt.getAttribute('data-view') === currentViewMode);
      });

      closeViewModeDropdown();

      // Re-render notes with selected layout
      const container = document.getElementById('notesContainer');
      if (container) {
        const filtered = getFilteredNotes();
        const folderMap = getFolderMap();
        container.innerHTML = renderNotesList(filtered, {
          searchQuery: currentSearchQuery,
          selectedCategory: currentCategoryFilter,
          totalRawNotes: cachedAllNotes.length,
          viewMode: currentViewMode,
          folderMap,
          currentFolder
        });
        bindNoteCardEvents();
      }

      const modeNames = {
        list: 'Tampilan Daftar',
        card: 'Tampilan Kartu',
        grid: 'Tampilan Kisi'
      };
      showToast(`Mengalihkan ke ${modeNames[currentViewMode] || currentViewMode}`);
    });
  });

  // Close dropdown on clicking outside
  document.addEventListener('click', (e) => {
    if (!e.target.closest('#viewModeMenuContainer')) {
      closeViewModeDropdown();
    }
  });

  // Use delegated event listener on document so clicking anywhere on the button,
  // text, or arrow always triggers open/close regardless of re-render
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('#folderTitleDropdownBtn');
    if (!btn) return;
    e.stopPropagation();
    const overlay = document.getElementById('folderPageOverlay');
    if (overlay?.classList.contains('active')) {
      closeFolderPage();
    } else {
      openFolderPage();
    }
  });

  // Create Folder Modal interactions
  const createFolderOverlay = document.getElementById('createFolderOverlay');
  const cancelCreateFolderBtn = document.getElementById('cancelCreateFolderBtn');
  const saveCreateFolderBtn = document.getElementById('saveCreateFolderBtn');
  const newFolderNameInput = document.getElementById('newFolderNameInput');
  const folderPreviewCover = document.getElementById('folderPreviewCover');
  const folderPreviewLabel = document.getElementById('folderPreviewLabel');
  const coverSwatches = document.querySelectorAll('#coverSwatches .cover-swatch');

  let selectedCoverType = 'color';
  let selectedCoverValue = '#3b82f6';

  openCreateFolderBtn?.addEventListener('click', () => {
    if (newFolderNameInput) newFolderNameInput.value = '';
    if (folderPreviewLabel) folderPreviewLabel.textContent = 'FOLDER';
    selectedCoverType = 'color';
    selectedCoverValue = '#3b82f6';
    if (folderPreviewCover) {
      folderPreviewCover.style.background = '#3b82f6';
    }
    coverSwatches.forEach((sw) => {
      sw.classList.toggle('active', sw.getAttribute('data-value') === '#3b82f6');
    });
    createFolderOverlay?.classList.add('active');
    newFolderNameInput?.focus();
  });

  cancelCreateFolderBtn?.addEventListener('click', () => {
    createFolderOverlay?.classList.remove('active');
  });

  createFolderOverlay?.addEventListener('click', (e) => {
    if (e.target === createFolderOverlay) {
      createFolderOverlay.classList.remove('active');
    }
  });

  newFolderNameInput?.addEventListener('input', (e) => {
    const val = (e.target.value || '').trim().slice(0, 8);
    if (folderPreviewLabel) {
      folderPreviewLabel.textContent = val || 'FOLDER';
    }
  });

  coverSwatches.forEach((sw) => {
    sw.addEventListener('click', () => {
      coverSwatches.forEach((s) => s.classList.remove('active'));
      sw.classList.add('active');
      selectedCoverType = sw.getAttribute('data-type');
      selectedCoverValue = sw.getAttribute('data-value');
      if (folderPreviewCover) {
        if (selectedCoverType === 'gradient') {
          folderPreviewCover.style.background = selectedCoverValue;
        } else {
          folderPreviewCover.style.background = selectedCoverValue;
        }
      }
    });
  });

  saveCreateFolderBtn?.addEventListener('click', async () => {
    const name = newFolderNameInput?.value.trim();
    if (!name) {
      showToast('Masukkan nama folder', true);
      newFolderNameInput?.focus();
      return;
    }

    try {
      const newFolderId = await createCustomFolder({
        name,
        coverType: selectedCoverType,
        coverValue: selectedCoverValue
      });
      createFolderOverlay?.classList.remove('active');
      showToast(`Folder "${name}" berhasil dibuat`);

      // Switch to this new folder
      currentFolder = `folder_${newFolderId}`;
      closeFolderPage();
      await loadAndRenderNotes();
    } catch (err) {
      showToast(err.message || 'Gagal membuat folder', true);
    }
  });

  // Passcode Modal interactions
  setupPasscodeModalEvents();

  // Theme switcher
  let isDark = false;
  themeToggleBtn?.addEventListener('click', () => {
    isDark = !isDark;
    if (isDark) {
      document.documentElement.setAttribute('data-theme', 'dark');
      if (iconSun && iconMoon) {
        iconSun.style.display = 'block';
        iconMoon.style.display = 'none';
      }
    } else {
      document.documentElement.removeAttribute('data-theme');
      if (iconSun && iconMoon) {
        iconSun.style.display = 'none';
        iconMoon.style.display = 'block';
      }
    }
  });

  // Backup & Data Protection Dialog Elements
  const backupBtn = document.getElementById('backupDataBtn');
  const backupOverlay = document.getElementById('backupDialogOverlay');
  const closeBackupBtn = document.getElementById('closeBackupBtn');
  const exportCard = document.getElementById('exportBackupCard');
  const importCard = document.getElementById('importBackupCard');
  const backupFileInput = document.getElementById('backupFileInput');

  backupBtn?.addEventListener('click', () => {
    backupOverlay?.classList.add('active');
  });

  closeBackupBtn?.addEventListener('click', () => {
    backupOverlay?.classList.remove('active');
  });

  backupOverlay?.addEventListener('click', (e) => {
    if (e.target === backupOverlay) {
      backupOverlay.classList.remove('active');
    }
  });

  // Export Notes to JSON download
  exportCard?.addEventListener('click', async () => {
    try {
      const jsonContent = await exportNotesBackup();
      const blob = new Blob([jsonContent], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      const dateStr = new Date().toISOString().slice(0, 10);
      link.href = url;
      link.download = `catatan-saya-cadangan-${dateStr}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      showToast('Cadangan catatan berhasil diunduh');
    } catch (err) {
      showToast('Gagal mengekspor data cadangan', true);
    }
  });

  // Import Notes from JSON file
  importCard?.addEventListener('click', () => {
    backupFileInput?.click();
  });

  backupFileInput?.addEventListener('change', async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const text = event.target?.result;
        const result = await importNotesBackup(text);
        showToast(`Berhasil memulihkan ${result.imported} catatan!`);
        backupOverlay?.classList.remove('active');
        await loadAndRenderNotes();
      } catch (err) {
        showToast(err.message || 'Gagal memproses file cadangan', true);
      } finally {
        backupFileInput.value = '';
      }
    };
    reader.readAsText(file);
  });

  // Offline / Online Network Detection
  const offlineBanner = document.getElementById('offlineBanner');
  function updateNetworkStatus() {
    if (!offlineBanner) return;
    if (navigator.onLine) {
      if (offlineBanner.style.display !== 'none') {
        offlineBanner.className = 'offline-banner online';
        offlineBanner.innerHTML = `
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M5 12.55a11 11 0 0 1 14.08 0"/>
            <path d="M1.42 9a16 16 0 0 1 21.16 0"/>
            <path d="M8.53 16.11a6 6 0 0 1 6.95 0"/>
            <line x1="12" y1="20" x2="12.01" y2="20"/>
          </svg>
          <span>Koneksi Kembali Online!</span>
        `;
        setTimeout(() => {
          offlineBanner.style.display = 'none';
          offlineBanner.className = 'offline-banner';
        }, 3000);
      }
    } else {
      offlineBanner.style.display = 'flex';
      offlineBanner.className = 'offline-banner';
      offlineBanner.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <line x1="1" y1="1" x2="23" y2="23"/>
          <path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55"/>
          <path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39"/>
          <path d="M10.71 5.05A16 16 0 0 1 22.58 9"/>
          <path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88"/>
          <path d="M8.53 16.11a6 6 0 0 1 6.95 0"/>
          <line x1="12" y1="20" x2="12.01" y2="20"/>
        </svg>
        <span>Mode Offline Aktif — Semua catatan tetap tersimpan aman di perangkat Anda.</span>
      `;
    }
  }

  window.addEventListener('online', updateNetworkStatus);
  window.addEventListener('offline', updateNetworkStatus);
  if (!navigator.onLine) {
    updateNetworkStatus();
  }

  // PWA Install Prompt handling
  let deferredPrompt = null;
  const installAppBtn = document.getElementById('installAppBtn');

  window.addEventListener('beforeinstallprompt', (e) => {
    // Prevent mini-infobar or default browser prompt
    e.preventDefault();
    deferredPrompt = e;
    if (installAppBtn) {
      installAppBtn.style.display = 'inline-flex';
    }
  });

  installAppBtn?.addEventListener('click', async () => {
    if (!deferredPrompt) {
      showToast('Aplikasi sudah terpasang atau browser belum siap');
      return;
    }
    // Show the install prompt
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      showToast('Terima kasih telah memasang Catatan Saya!');
    }
    deferredPrompt = null;
    if (installAppBtn) {
      installAppBtn.style.display = 'none';
    }
  });

  window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
    if (installAppBtn) {
      installAppBtn.style.display = 'none';
    }
    showToast('Catatan Saya berhasil dipasang!');
  });
}

/**
 * Register Service Worker for PWA
 */
function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register('/sw.js')
        .then((reg) => {
          console.log('[PWA] Service Worker registered with scope:', reg.scope);
        })
        .catch((err) => {
          console.warn('[PWA] Service Worker registration failed:', err);
        });
    });
  }
}

/**
 * Check URL params for PWA shortcuts (e.g. ?action=new)
 */
function handlePwaShortcuts() {
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('action') === 'new') {
    // Clean up URL parameter cleanly
    window.history.replaceState({}, document.title, window.location.pathname);
    setTimeout(() => {
      openEditor();
    }, 200);
  }
}

function openFolderPage() {
  updateFolderPageUI();
  const overlay = document.getElementById('folderPageOverlay');
  overlay?.classList.add('active');
  overlay?.setAttribute('aria-hidden', 'false');
  const arrow = document.querySelector('.folder-arrow-icon');
  if (arrow) arrow.classList.add('open');
}

function closeFolderPage() {
  const overlay = document.getElementById('folderPageOverlay');
  overlay?.classList.remove('active');
  overlay?.setAttribute('aria-hidden', 'true');
  const arrow = document.querySelector('.folder-arrow-icon');
  if (arrow) arrow.classList.remove('open');
}

/**
 * Calculate counts and update the Folder Page Sheet DOM
 */
function updateFolderPageUI() {
  const root = document.getElementById('folderPageRoot');
  if (!root) return;

  const stats = {
    allCount: cachedAllNotes.filter((n) => !n.deletedAt && !n.isLocked).length,
    trashCount: cachedAllNotes.filter((n) => Boolean(n.deletedAt)).length,
    notesCount: cachedAllNotes.filter((n) => (!n.folderId || n.folderId === 'notes') && !n.deletedAt && !n.isLocked).length,
    lockedCount: cachedAllNotes.filter((n) => Boolean(n.isLocked) && !n.deletedAt).length
  };

  cachedCustomFolders.forEach((f) => {
    const fKey = `folder_${f.id}`;
    stats[fKey] = cachedAllNotes.filter((n) => n.folderId === fKey && !n.deletedAt && !n.isLocked).length;
  });

  // Preserve open status if it was active
  const isCurrentlyOpen = document.getElementById('folderPageOverlay')?.classList.contains('active');

  root.innerHTML = renderFolderView(stats, cachedCustomFolders);

  if (isCurrentlyOpen) {
    document.getElementById('folderPageOverlay')?.classList.add('active');
    document.querySelector('.folder-arrow-icon')?.classList.add('open');
  }

  bindFolderPageEvents();
}

/**
 * Bind click events inside Folder Page Sheet
 */
function bindFolderPageEvents() {
  const overlay = document.getElementById('folderPageOverlay');
  const closeBtn = document.getElementById('closeFolderPageBtn');
  const closeHeaderBtn = document.getElementById('closeFolderPageHeaderBtn');
  const openCreateBtn = document.getElementById('openCreateFolderBtn');

  closeBtn?.addEventListener('click', closeFolderPage);
  closeHeaderBtn?.addEventListener('click', closeFolderPage);
  overlay?.addEventListener('click', (e) => {
    if (e.target === overlay) closeFolderPage();
  });

  openCreateBtn?.addEventListener('click', () => {
    const createOverlay = document.getElementById('createFolderOverlay');
    const input = document.getElementById('newFolderNameInput');
    const previewLabel = document.getElementById('folderPreviewLabel');
    if (input) input.value = '';
    if (previewLabel) previewLabel.textContent = 'FOLDER';
    createOverlay?.classList.add('active');
    input?.focus();
  });

  // Folder Nav Rows (Semua, Baru Dihapus)
  const navRows = document.querySelectorAll('.folder-nav-row');
  navRows.forEach((row) => {
    row.addEventListener('click', async () => {
      const fId = row.getAttribute('data-folder-id');
      if (!fId) return;
      currentFolder = fId;
      closeFolderPage();
      await loadAndRenderNotes();
    });
  });

  // Folder Items (Catatan, Terkunci, Kustom Folders)
  const folderItems = document.querySelectorAll('.folder-item');
  folderItems.forEach((item) => {
    item.addEventListener('click', async (e) => {
      // Don't navigate if delete folder button was clicked
      if (e.target.closest('.btn-delete-folder')) return;

      const fId = item.getAttribute('data-folder-id');
      if (!fId) return;

      if (fId === 'locked') {
        // Open passcode modal to unlock or setup
        closeFolderPage();
        promptLockedFolderAccess();
        return;
      }

      currentFolder = fId;
      closeFolderPage();
      await loadAndRenderNotes();
    });
  });

  // Delete custom folder buttons
  const deleteFolderBtns = document.querySelectorAll('.btn-delete-folder');
  deleteFolderBtns.forEach((btn) => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const id = btn.getAttribute('data-folder-id');
      if (!id) return;

      const confirmed = confirm('Hapus folder ini? Catatan di dalamnya akan dipindahkan ke folder Catatan.');
      if (confirmed) {
        try {
          await deleteCustomFolder(id);
          showToast('Folder berhasil dihapus');
          if (currentFolder === `folder_${id}`) {
            currentFolder = 'notes';
          }
          await loadAndRenderNotes();
        } catch (err) {
          showToast('Gagal menghapus folder', true);
        }
      }
    });
  });
}

/**
 * Handle Locked Folder authentication or initial passcode setup
 */
async function promptLockedFolderAccess() {
  const savedPin = await getSetting('locked_folder_pin');
  const passcodeOverlay = document.getElementById('passcodeOverlay');
  const titleEl = document.getElementById('passcodeTitle');
  const subtextEl = document.getElementById('passcodeSubtext');

  enteredPin = '';
  pendingPasscodeAction = null;
  updatePinDotsUI();

  if (!savedPin) {
    // First time: prompt to create a new passcode
    passcodeSetupStep = 'create';
    tempPasscode = '';
    if (titleEl) titleEl.textContent = 'Buat Kata Sandi Baru';
    if (subtextEl) subtextEl.textContent = 'Tentukan 4 angka PIN untuk mengamankan folder Terkunci.';
  } else {
    // Already set: prompt to unlock
    passcodeSetupStep = 'unlock';
    if (titleEl) titleEl.textContent = 'Buka Folder Terkunci';
    if (subtextEl) subtextEl.textContent = 'Masukkan 4 angka PIN Anda untuk membuka folder.';
  }

  passcodeOverlay?.classList.add('active');
}

/**
 * Prompt passcode specifically before locking a note into the locked folder
 */
async function promptPasscodeForNoteLock() {
  const savedPin = await getSetting('locked_folder_pin');
  const passcodeOverlay = document.getElementById('passcodeOverlay');
  const titleEl = document.getElementById('passcodeTitle');
  const subtextEl = document.getElementById('passcodeSubtext');

  enteredPin = '';
  updatePinDotsUI();

  pendingPasscodeAction = async () => {
    currentEditingIsLocked = true;
    currentEditingFolderId = 'locked';
    updateMoreMenuLabels();
    await performSave();
    showToast('Catatan berhasil dikunci ke folder Terkunci');
  };

  if (!savedPin) {
    passcodeSetupStep = 'create';
    tempPasscode = '';
    if (titleEl) titleEl.textContent = 'Buat Kata Sandi Baru';
    if (subtextEl) subtextEl.textContent = 'Tentukan 4 angka PIN untuk mengunci catatan ke folder Terkunci.';
  } else {
    passcodeSetupStep = 'unlock';
    if (titleEl) titleEl.textContent = 'Kunci Catatan';
    if (subtextEl) subtextEl.textContent = 'Masukkan 4 angka PIN Anda untuk memasukkan catatan ke folder Terkunci.';
  }

  passcodeOverlay?.classList.add('active');
}

function updatePinDotsUI(isError = false) {
  const dots = document.querySelectorAll('#pinDotsWrapper .pin-dot');
  dots.forEach((dot, idx) => {
    dot.className = 'pin-dot';
    if (isError) {
      dot.classList.add('error');
    } else if (idx < enteredPin.length) {
      dot.classList.add('filled');
    }
  });
}

function setupPasscodeModalEvents() {
  const keypad = document.getElementById('numericKeypad');
  const cancelBtn = document.getElementById('cancelPasscodeBtn');
  const backspaceBtn = document.getElementById('backspacePinBtn');
  const passcodeOverlay = document.getElementById('passcodeOverlay');
  const titleEl = document.getElementById('passcodeTitle');
  const subtextEl = document.getElementById('passcodeSubtext');

  function closePasscodeModal() {
    passcodeOverlay?.classList.remove('active');
    enteredPin = '';
    tempPasscode = '';
    passcodeSetupStep = null;
    pendingPasscodeAction = null;
    updatePinDotsUI();
  }

  cancelBtn?.addEventListener('click', closePasscodeModal);

  backspaceBtn?.addEventListener('click', () => {
    if (enteredPin.length > 0) {
      enteredPin = enteredPin.slice(0, -1);
      updatePinDotsUI();
    }
  });

  const numBtns = keypad?.querySelectorAll('.keypad-btn[data-val]');
  numBtns?.forEach((btn) => {
    btn.addEventListener('click', async () => {
      const val = btn.getAttribute('data-val');
      if (enteredPin.length >= 4) return;
      enteredPin += val;
      updatePinDotsUI();

      if (enteredPin.length === 4) {
        // Complete 4-digit input, evaluate step
        setTimeout(async () => {
          await handlePasscodeSubmission(closePasscodeModal, titleEl, subtextEl);
        }, 150);
      }
    });
  });
}

async function handlePasscodeSubmission(closeModal, titleEl, subtextEl) {
  const savedPin = await getSetting('locked_folder_pin');

  if (passcodeSetupStep === 'create') {
    // Step 1: Save temp and ask to confirm
    tempPasscode = enteredPin;
    enteredPin = '';
    passcodeSetupStep = 'confirm';
    if (titleEl) titleEl.textContent = 'Konfirmasi Kata Sandi';
    if (subtextEl) subtextEl.textContent = 'Masukkan kembali kata sandi 4 angka yang baru dibuat.';
    updatePinDotsUI();
  } else if (passcodeSetupStep === 'confirm') {
    // Step 2: Check matching
    if (enteredPin === tempPasscode) {
      await setSetting('locked_folder_pin', enteredPin);
      showToast('Kata sandi folder berhasil dibuat!');
      isPasscodeUnlocked = true;
      closeModal();
      if (pendingPasscodeAction) {
        const action = pendingPasscodeAction;
        pendingPasscodeAction = null;
        await action();
      } else {
        currentFolder = 'locked';
        await loadAndRenderNotes();
      }
    } else {
      updatePinDotsUI(true);
      showToast('Kata sandi tidak cocok. Silakan coba lagi.', true);
      setTimeout(() => {
        enteredPin = '';
        passcodeSetupStep = 'create';
        tempPasscode = '';
        if (titleEl) titleEl.textContent = 'Buat Kata Sandi Baru';
        if (subtextEl) subtextEl.textContent = 'Tentukan 4 angka PIN untuk mengamankan folder Terkunci.';
        updatePinDotsUI();
      }, 600);
    }
  } else if (passcodeSetupStep === 'unlock') {
    // Step 3: Unlocking folder
    if (enteredPin === savedPin) {
      isPasscodeUnlocked = true;
      closeModal();
      if (pendingPasscodeAction) {
        const action = pendingPasscodeAction;
        pendingPasscodeAction = null;
        await action();
      } else {
        currentFolder = 'locked';
        showToast('Folder Terkunci dibuka');
        await loadAndRenderNotes();
      }
    } else {
      updatePinDotsUI(true);
      showToast('Kata sandi salah!', true);
      setTimeout(() => {
        enteredPin = '';
        updatePinDotsUI();
      }, 600);
    }
  }
}

/**
 * Bind Empty Trash action button
 */
function bindTrashHeaderEvents() {
  const emptyBtn = document.getElementById('emptyTrashBtn');
  emptyBtn?.addEventListener('click', async () => {
    const confirmed = confirm('Kosongkan semua catatan di Baru Dihapus? Semua catatan di sampah akan dihapus secara permanen.');
    if (confirmed) {
      try {
        const deletedCount = await emptyTrash();
        showToast(`Berhasil mengosongkan ${deletedCount} catatan dari sampah`);
        await loadAndRenderNotes();
      } catch (err) {
        showToast('Gagal mengosongkan sampah', true);
      }
    }
  });
}

async function initApp() {
  const app = document.getElementById('app');
  if (!app) return;

  app.innerHTML = `
    ${renderOfflineBanner()}
    ${renderHeader(currentViewMode, getActiveFolderTitle(), false)}
    <main class="app-content">
      <div id="trashNoticeContainer" style="display: none;"></div>
      ${renderSearchBar()}
      <div id="categoryBarContainer">
        <!-- Rendered dynamically with note counts -->
      </div>
      <div id="notesContainer">
        <!-- Loaded asynchronously from IndexedDB -->
      </div>
    </main>
    ${renderFabAddButton()}
    ${renderEditorModal()}
    ${renderDrawingModal()}
    ${renderMoveNoteModal()}
    ${renderImageLightboxModal()}
    ${renderConfirmDialog()}
    ${renderBackupDialog()}
    <div id="folderPageRoot">
      ${renderFolderView({}, [])}
    </div>
    ${renderCreateFolderModal()}
    ${renderPasscodeModal()}
  `;

  setupInteractions();
  await loadAndRenderNotes();
  registerServiceWorker();
  handlePwaShortcuts();
}

document.addEventListener('DOMContentLoaded', initApp);


