export function renderHeader(currentViewMode = 'card', activeTitle = 'Catatan', isFolderView = false) {
  const isTrashView = activeTitle === 'Baru Dihapus';

  return `
    <header class="app-header">
      <div class="brand-wrapper">
        <button id="folderTitleDropdownBtn" class="folder-title-btn" aria-label="Buka Menu Folder">
          <span class="folder-title-text" id="headerTitleText">${escapeHeaderHtml(activeTitle)}</span>
          <svg class="folder-arrow-icon ${isFolderView ? 'open' : ''}" width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M7 10l5 5 5-5z"/>
          </svg>
        </button>
      </div>
      <div class="header-actions">
        <!-- View Mode Switcher Menu -->
        <div class="view-mode-menu-container" id="viewModeMenuContainer">
          <button id="viewModeBtn" class="theme-toggle-btn" title="Pilih Tampilan" aria-label="Pilih Tampilan" aria-haspopup="true" aria-expanded="false">
            <span id="viewModeBtnIcon">
              ${getViewModeIcon(currentViewMode)}
            </span>
          </button>
          <div id="viewModeDropdown" class="view-mode-dropdown" role="menu" aria-hidden="true">
            <button class="view-mode-option ${currentViewMode === 'list' ? 'active' : ''}" data-view="list" role="menuitem">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <line x1="8" y1="6" x2="21" y2="6"/>
                <line x1="8" y1="12" x2="21" y2="12"/>
                <line x1="8" y1="18" x2="21" y2="18"/>
                <line x1="3" y1="6" x2="3.01" y2="6"/>
                <line x1="3" y1="12" x2="3.01" y2="12"/>
                <line x1="3" y1="18" x2="3.01" y2="18"/>
              </svg>
              <span>Tampilan Daftar</span>
            </button>
            <button class="view-mode-option ${currentViewMode === 'card' ? 'active' : ''}" data-view="card" role="menuitem">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <rect x="3" y="4" width="18" height="6" rx="2"/>
                <rect x="3" y="14" width="18" height="6" rx="2"/>
              </svg>
              <span>Tampilan Kartu</span>
            </button>
            <button class="view-mode-option ${currentViewMode === 'grid' ? 'active' : ''}" data-view="grid" role="menuitem">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <rect x="3" y="3" width="7" height="7" rx="1.5"/>
                <rect x="14" y="3" width="7" height="7" rx="1.5"/>
                <rect x="14" y="14" width="7" height="7" rx="1.5"/>
                <rect x="3" y="14" width="7" height="7" rx="1.5"/>
              </svg>
              <span>Tampilan Kisi</span>
            </button>
          </div>
        </div>

        <button id="backupDataBtn" class="theme-toggle-btn" title="Perlindungan & Cadangan Data" aria-label="Cadangkan Data">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
          </svg>
        </button>
        <button id="installAppBtn" class="btn-install-pwa" title="Pasang Aplikasi (PWA)" aria-label="Pasang Aplikasi" style="display: none;">
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="7 10 12 15 17 10"/>
            <line x1="12" y1="15" x2="12" y2="3"/>
          </svg>
          <span class="btn-install-text">Pasang</span>
        </button>
        <button id="themeToggleBtn" class="theme-toggle-btn" title="Ganti Tema" aria-label="Ganti Tema">
          <svg id="themeIconSun" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display: none;">
            <circle cx="12" cy="12" r="5"/>
            <line x1="12" y1="1" x2="12" y2="3"/>
            <line x1="12" y1="21" x2="12" y2="23"/>
            <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
            <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
            <line x1="1" y1="12" x2="3" y2="12"/>
            <line x1="21" y1="12" x2="23" y2="12"/>
            <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
            <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
          </svg>
          <svg id="themeIconMoon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
          </svg>
        </button>
      </div>
    </header>
  `;
}

export function getViewModeIcon(mode) {
  if (mode === 'list') {
    return `
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <line x1="8" y1="6" x2="21" y2="6"/>
        <line x1="8" y1="12" x2="21" y2="12"/>
        <line x1="8" y1="18" x2="21" y2="18"/>
        <line x1="3" y1="6" x2="3.01" y2="6"/>
        <line x1="3" y1="12" x2="3.01" y2="12"/>
        <line x1="3" y1="18" x2="3.01" y2="18"/>
      </svg>
    `;
  }
  if (mode === 'grid') {
    return `
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <rect x="3" y="3" width="7" height="7" rx="1.5"/>
        <rect x="14" y="3" width="7" height="7" rx="1.5"/>
        <rect x="14" y="14" width="7" height="7" rx="1.5"/>
        <rect x="3" y="14" width="7" height="7" rx="1.5"/>
      </svg>
    `;
  }
  // Default 'card' icon
  return `
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <rect x="3" y="4" width="18" height="6" rx="2"/>
      <rect x="3" y="14" width="18" height="6" rx="2"/>
    </svg>
  `;
}

function escapeHeaderHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

