export function renderSearchBar() {
  return `
    <div class="search-container">
      <span class="search-icon">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="11" cy="11" r="8"/>
          <line x1="21" y1="21" x2="16.65" y2="16.65"/>
        </svg>
      </span>
      <input 
        id="searchInput" 
        type="text" 
        class="search-input" 
        placeholder="Cari catatan (huruf depan, tengah, belakang)..." 
        autocomplete="off"
        aria-label="Cari catatan"
      />
      <button id="clearSearchBtn" class="clear-search-btn" title="Hapus pencarian" aria-label="Hapus pencarian" style="display: none;">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <line x1="18" y1="6" x2="6" y2="18"/>
          <line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </button>
    </div>
  `;
}
