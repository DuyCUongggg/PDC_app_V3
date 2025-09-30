// ===== NOTES MODULE =====
let appNotes = [];

// Initialize notes data structure
if (!window.appData) window.appData = {};
if (!window.appData.notes) window.appData.notes = [];

// Debounce/guard for fetch so toast không bị spam
let _notesSyncInFlight = false;
let _lastNotesFetchAt = 0;
const NOTES_FETCH_MIN_INTERVAL_MS = 15000; // 15s

(function initNotes() {
    // Load notes from localStorage on init
    loadNotesFromStorage();
    normalizeNotes();
    renderNotesList();
    renderNotesCategories();
    loadSavedTags();
    loadSavedTagColors();
    renderSavedTagsUI();
    populateTagSelect();
    renderMiniSidebarCategories();
    // Try to pull latest from Google Sheets (Sheet2) và tránh gọi lặp
    try { scheduleRefreshNotes(0); } catch (e) { console.warn('notes pull failed', e); }
})();

// Switch between list and add views
window.switchNotesView = function(view) {
    try {
        const listView = document.getElementById('notesListView');
        const addView = document.getElementById('notesAddView');
        const listBtn = document.getElementById('notesListBtn');
        const addBtn = document.getElementById('notesAddBtn');
        if (!listView || !addView || !listBtn || !addBtn) return;
        const showList = view !== 'add';
        listView.style.display = showList ? 'block' : 'none';
        addView.style.display = showList ? 'none' : 'block';
        listBtn.classList.toggle('active', showList);
        addBtn.classList.toggle('active', !showList);
        // sync new inline/dock switches
        try {
            const miniListBtn = document.getElementById('miniNotesListBtn');
            const miniAddBtn = document.getElementById('miniNotesAddBtn');
            if (miniListBtn && miniAddBtn) {
                miniListBtn.classList.toggle('active', showList);
                miniAddBtn.classList.toggle('active', !showList);
            }
            const dockList = document.getElementById('dockNotesList');
            const dockAdd = document.getElementById('dockNotesAdd');
            if (dockList && dockAdd) {
                dockList.classList.toggle('active', showList);
                dockAdd.classList.toggle('active', !showList);
            }
        } catch {}
        if (showList) {
            renderNotesList();
        }
        // update inline toolbar
        try { renderInlineNotesControls(); } catch {}
    } catch {}
}

// Generate unique ID for notes
function generateNoteId() {
    return 'note_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

// Create new note
function createNote() {
    const chatLink = document.getElementById('chatLink')?.value.trim();
    const orderCode = document.getElementById('orderCode')?.value.trim();
    const noteContent = document.getElementById('noteContent')?.value.trim();
    const tagSelect = document.getElementById('noteTagSelect');
    const selectedTag = (tagSelect?.value || '').trim();
    
    // Validation
    if (!chatLink) {
        showNotification('Vui lòng nhập link chat!', 'error');
        return;
    }
    if (!orderCode) {
        showNotification('Vui lòng nhập mã đơn hàng!', 'error');
        return;
    }
    if (!noteContent) {
        showNotification('Vui lòng nhập nội dung ghi chú!', 'error');
        return;
    }
    
    // Validate URL format
    try {
        new URL(chatLink);
    } catch (e) {
        showNotification('Link chat không hợp lệ! Vui lòng nhập URL đúng định dạng.', 'error');
        return;
    }
    
    // Build tags string (comma-separated, lowercased, trimmed)
    let tags = [selectedTag]
        .filter(Boolean)
        .join(',')
        .split(',')
        .map(s => s.trim().toLowerCase())
        .filter(Boolean)
        .join(',');
    if (!tags) tags = '';

    // Create note object
    const note = {
        id: generateNoteId(),
        chatLink: chatLink,
        orderCode: orderCode,
        content: noteContent,
        status: 'active',
        tags,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };
    
    // Add to notes array
    window.appData.notes.unshift(note); // Add to beginning
    
    // Clear form
    clearNoteForm();
    
    // Re-render list
    renderNotesList();
    renderNotesCategories();
    
    // Save to localStorage
    saveNotesToStorage();
    // Fire-and-forget sync to Google Sheets for real-time-ish persistence
    try { syncNotesToGoogleSheets(); } catch (e) { console.error('notes sync error', e); }
    
    showNotification('Đã tạo ghi chú! Đang đồng bộ...', 'info');
}
window.createNote = createNote;

// Clear note form
function clearNoteForm() {
    const fields = ['chatLink', 'orderCode', 'noteContent'];
    fields.forEach(id => {
        const element = document.getElementById(id);
        if (element) element.value = '';
    });
    const tagSelect = document.getElementById('noteTagSelect');
    if (tagSelect) tagSelect.value = '';
}
window.clearNoteForm = clearNoteForm;

// Copy current chat link
function copyCurrentChatLink() {
    const chatLink = document.getElementById('chatLink')?.value.trim();
    if (!chatLink) {
        showNotification('Chưa có link để copy!', 'error');
        return;
    }
    
    navigator.clipboard.writeText(chatLink).then(() => {
        showNotification('Đã copy link chat!', 'success');
    }).catch(() => {
        showNotification('Không thể copy link!', 'error');
    });
}
window.copyCurrentChatLink = copyCurrentChatLink;

// Copy note chat link
function copyNoteChatLink(noteId) {
    const note = window.appData.notes.find(n => n.id === noteId);
    if (!note) {
        showNotification('Không tìm thấy ghi chú!', 'error');
        return;
    }
    
    navigator.clipboard.writeText(note.chatLink).then(() => {
        showNotification('Đã copy link chat!', 'success');
    }).catch(() => {
        showNotification('Không thể copy link!', 'error');
    });
}
window.copyNoteChatLink = copyNoteChatLink;

// Complete note (delete with success message)
function completeNote(noteId) {
    const note = window.appData.notes.find(n => n.id === noteId);
    if (!note) {
        showNotification('Không tìm thấy ghi chú!', 'error');
        return;
    }
    note.status = 'done';
    note.updatedAt = new Date().toISOString();
    renderNotesList();
    renderNotesCategories();
    saveNotesToStorage();
    try { syncNotesToGoogleSheets(); } catch {}
    showNotification(`✅ Đã đánh dấu hoàn thành: ${note.orderCode} (đang đồng bộ)`, 'info');
}
window.completeNote = completeNote;

// Delete note
async function deleteNote(noteId) {
    if (!confirm('Bạn có chắc chắn muốn xóa ghi chú này?')) return;
    const deletedId = noteId;
    window.appData.notes = window.appData.notes.filter(n => n.id !== deletedId);
    renderNotesList();
    renderNotesCategories();
    saveNotesToStorage();
    try {
        const url = (window.GAS_URL || '') + '?token=' + encodeURIComponent(window.GAS_TOKEN || '');
        const payload = { action: 'notesDelete', ids: [deletedId] };
        const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(payload) });
        const json = await res.json().catch(() => ({}));
        if (!res.ok || !json.success) console.warn('notesDelete response', res.status, json);
    } catch (e) { console.warn('notesDelete failed', e); }
    showNotification('Đã xóa ghi chú! (đang đồng bộ)', 'info');
}
window.deleteNote = deleteNote;

// Get status icon based on order code
function getStatusIcon(orderCode) {
    const code = String(orderCode || '').toLowerCase();
    if (code.includes('dh') || code.includes('order')) return '🛍️';
    if (code.includes('sp') || code.includes('product')) return '📦';
    if (code.includes('kh') || code.includes('customer')) return '👤';
    if (code.includes('hd') || code.includes('invoice')) return '🧾';
    return '📋';
}

// Get platform icon from chat link
function getPlatformIcon(chatLink) {
    const link = String(chatLink || '').toLowerCase();
    if (link.includes('facebook') || link.includes('m.me')) return '💙';
    if (link.includes('zalo')) return '🔵';
    if (link.includes('telegram')) return '✈️';
    if (link.includes('whatsapp')) return '💚';
    if (link.includes('instagram')) return '📸';
    return '💬';
}

// Format date for display
function formatNoteDate(dateString) {
    if (!dateString) return '-';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '-';
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 1) return 'Vừa xong';
    if (diffMins < 60) return `${diffMins} phút trước`;
    if (diffHours < 24) return `${diffHours} giờ trước`;
    if (diffDays < 7) return `${diffDays} ngày trước`;
    
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    const hour = date.getHours().toString().padStart(2, '0');
    const minute = date.getMinutes().toString().padStart(2, '0');
    return `${day}/${month}/${year} ${hour}:${minute}`;
}

// Render notes list
function renderNotesList() {
    const container = document.getElementById('notesList');
    const countElement = document.getElementById('notesCount');
    const activeCategory = window.__notesActiveCategory || 'all';
    
    if (!container) return;
    
    let notes = window.appData.notes || [];
    // Filter by active category if not 'all'
    if (activeCategory && activeCategory !== 'all') {
        notes = notes.filter(n => {
            const tags = String(n.tags || '').toLowerCase();
            return tags === activeCategory;
        });
    }
    
    // Update count
    if (countElement) {
        countElement.textContent = `${notes.length} ghi chú`;
    }
    
    if (notes.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">📋</div>
                <h4>Chưa có ghi chú</h4>
                <p>Tạo ghi chú đầu tiên cho khách hàng</p>
            </div>
        `;
        return;
    }
    
    const cards = notes.map(note => {
        const statusText = (note.status || 'active') === 'done' ? 'Done' : 'Active';
        const link = String(note.chatLink || '');
        const linkShort = link.length > 40 ? link.substring(0,40) + '…' : link;
        const linkTitle = linkShort || '—';
        return `
        <div class="note-cardv3" id="note-${note.id}" data-note-id="${note.id}">
            <div class="v3-head">
                <a class="v3-link" href="${link}" target="_blank" title="Mở link chat">${linkTitle}</a>
                <span class="v3-status ${statusText === 'Done' ? 'done' : 'active'}">${statusText}</span>
            </div>
            <div class="v3-body">${String(note.content || '').replace(/\n/g,'<br>')}</div>
            <div class="v3-foot">
                <span class="v3-time">${formatNoteDate(note.createdAt)}</span>
            </div>
            <div class="v3-actions">
                <button class="icon-btn" title="Copy" onclick="copyNoteChatLink('${note.id}')">📋</button>
                <button class="icon-btn ok" title="Hoàn thành" onclick="completeNote('${note.id}')">✅</button>
            </div>
        </div>`;
    }).join('');
    container.innerHTML = `<div class="notes-masonry">${cards}</div>`;
    
    // Add stagger animation to new notes
    setTimeout(() => {
        document.querySelectorAll('.note-item').forEach(item => {
            item.classList.add('animate-loaded');
        });
    }, 100);
}

// Render categories into sidebar with counts
function renderNotesCategories() {
    const el = document.getElementById('notesCategoryList');
    if (!el) return;
    const notes = Array.isArray(window.appData.notes) ? window.appData.notes : [];
    const base = {
        all: notes.length,
        'chua-xu-ly': 0,
        'note-thong-tin': 0
    };
    notes.forEach(n => {
        const tags = String(n.tags || '').toLowerCase().trim();
        if (tags === 'chua-xu-ly') base['chua-xu-ly']++;
        else if (tags === 'note-thong-tin') base['note-thong-tin']++;
    });
    const active = window.__notesActiveCategory || 'all';
    const item = (key, label, count) => `
        <div class="notes-category-item tag-${key} ${active===key?'active':''}" onclick="filterNotesByCategory('${key}')">
            <span>${label}</span>
            <span class="count">${count}</span>
        </div>`;
    const html = [
        item('all','Tất cả', base.all),
        item('chua-xu-ly','Chưa xử lý', base['chua-xu-ly']),
        item('note-thong-tin','Note thông tin', base['note-thong-tin'])
    ].join('');
    el.innerHTML = html;
    renderMiniSidebarCategories();
}
window.renderNotesCategories = renderNotesCategories;

// Category filter handler
window.filterNotesByCategory = function(category) {
    window.__notesActiveCategory = category || 'all';
    renderNotesCategories();
    renderNotesList();
    // Ensure mini tabs reflect active state instantly
    try { updateMiniTabsActive(); } catch {}
}

// Render into mini sidebar
function renderMiniSidebarCategories() {
    renderFixedNoteTabs();
    renderMiniNotesActions();
    ensureNotesModeSwitch();
    try {
        const app = document.querySelector('.app-container');
        if (app) app.classList.add('with-notes-dock');
    } catch {}
}
window.renderMiniSidebarCategories = renderMiniSidebarCategories;

function renderFixedNoteTabs() {
    const container = document.getElementById('notesMiniTabs');
    if (!container) return;
    const notes = getFilteredNotes();
    const listItems = notes.map(n => {
        const text = String(n.content || '').split('\n')[0].slice(0, 34);
        const badge = (n.status||'active') === 'done' ? '✅' : '🕘';
        return `<button class="mini-note-item" onclick="focusNote('${n.id}')">${badge} ${text || 'Ghi chú'}</button>`;
    }).join('');
    container.innerHTML = `
        <div class="mini-notes-list">${listItems || '<div class=\"mini-empty\">Chưa có ghi chú</div>'}</div>
    `;
}

// Render compact actions (Danh sách / Thêm) into mini dock
function renderMiniNotesActions() {
    // legacy no-op
}

// Integrated mode switch inside mini dock (replaces floating toggle)
function ensureNotesModeSwitch() {
    try {
        const dock = document.getElementById('notesMiniSideDock');
        if (!dock) return;
        let holder = document.getElementById('notesModeSwitch');
        if (!holder) {
            holder = document.createElement('div');
            holder.id = 'notesModeSwitch';
            holder.className = 'notes-mode-switch';
            const inner = dock.querySelector('.mini-dock-inner');
            if (inner) inner.insertBefore(holder, inner.firstChild);
        }
        const listView = document.getElementById('notesListView');
        const isList = !!(listView && listView.style.display !== 'none');
        holder.innerHTML = `
            <button id="dockNotesList" class="seg ${isList?'active':''}" onclick="switchNotesView('list')">Danh sách</button>
            <button id="dockNotesAdd" class="seg ${!isList?'active':''}" onclick="switchNotesView('add')">Thêm note</button>
        `;
    } catch {}
}

// New inline controls rendering inside the Notes card header area
function renderInlineNotesControls() {
    try {
        const container = document.getElementById('notes');
        if (!container) return;
        let toolbar = document.getElementById('notesInlineToolbar');
        if (!toolbar) {
            toolbar = document.createElement('div');
            toolbar.id = 'notesInlineToolbar';
            toolbar.className = 'notes-inline-toolbar';
            // Insert at top of notes card content
            const card = container.querySelector('.card .card-content');
            const first = card ? card.firstElementChild : null;
            if (card) card.insertBefore(toolbar, first);
        }
        const isList = (document.getElementById('notesListView')?.style.display || 'block') !== 'none';
        const active = window.__notesActiveCategory || 'all';
        toolbar.innerHTML = `
            <div class="inline-left">
                <div class="seg-group">
                    <button class="seg ${isList?'active':''}" onclick="switchNotesView('list')">Danh sách</button>
                    <button class="seg ${!isList?'active':''}" onclick="switchNotesView('add')">Thêm note</button>
                </div>
            </div>
            <div class="inline-right ${isList?'':'hidden'}">
                <div class="chips">
                    <button class="chip ${active==='all'?'active':''}" onclick="filterNotesByCategory('all')">Tất cả</button>
                    <button class="chip ${active==='note-thong-tin'?'active':''}" onclick="filterNotesByCategory('note-thong-tin')">Note thông tin</button>
                    <button class="chip ${active==='chua-xu-ly'?'active':''}" onclick="filterNotesByCategory('chua-xu-ly')">Chưa xử lý</button>
                </div>
            </div>
        `;
    } catch {}
}

// Update active class on mini tabs without re-rendering DOM
function updateMiniTabsActive() {
    // Re-render mini notes list whenever category changes
    renderFixedNoteTabs();
}

function getFilteredNotes() {
    const activeCategory = window.__notesActiveCategory || 'all';
    let notes = window.appData?.notes || [];
    if (activeCategory && activeCategory !== 'all') {
        notes = notes.filter(n => String(n.tags||'').toLowerCase() === activeCategory);
    }
    return notes;
}

window.focusNote = function(noteId) {
    try {
        const el = document.getElementById(`note-${noteId}`);
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } catch {}
}

// Settings modal handlers
window.openTagsSettings = function() {
    try {
        const m = document.getElementById('tagsSettingsModal');
        if (!m) return; m.classList.add('show');
        renderTagsManageList();
    } catch {}
}
window.closeTagsSettings = function() {
    const m = document.getElementById('tagsSettingsModal');
    if (m) m.classList.remove('show');
}
function renderTagsManageList() {
    const el = document.getElementById('tagsManageList');
    if (!el) return;
    const tags = window.__savedTags || [];
    el.innerHTML = tags.map(t => {
        const hex = (window.__savedTagColors||{})[t] || '#3182ce';
        return `
        <div class="notes-category-item" style="display:flex; align-items:center; justify-content:space-between;">
            <div style="display:flex; align-items:center; gap:8px;">
                <input type="color" value="${hex}" onchange="updateSavedTagColor('${t}', this.value)" title="Màu của tag" style="width:28px; height:28px; border:none; background:transparent; padding:0;" />
                <span>${t}</span>
            </div>
            <div style="display:flex; gap:6px;">
                <button class="btn btn-outline btn-sm" onclick="renameSavedTagPrompt('${t}')">Sửa</button>
                <button class="btn btn-danger btn-sm" onclick="removeSavedTag('${t}'); renderTagsManageList();">Xóa</button>
            </div>
        </div>`;
    }).join('');
}
window.addNewTagFromModal = function() {
    const input = document.getElementById('newTagInput');
    if (!input) return;
    const val = (input.value || '').trim().toLowerCase();
    if (!val) return;
    window.__savedTags = Array.from(new Set([...(window.__savedTags||[]), val]));
    saveSavedTags(); populateTagSelect(); renderSavedTagsUI(); renderNotesCategories(); renderTagsManageList();
    input.value = '';
}
window.renameSavedTagPrompt = function(oldTag) {
    const nv = prompt('Đổi tên tag', oldTag);
    if (!nv) return;
    const newTag = nv.trim().toLowerCase();
    if (!newTag) return;
    window.__savedTags = (window.__savedTags||[]).map(t => t === oldTag ? newTag : t);
    if (window.__savedTagColors && window.__savedTagColors[oldTag]) {
        window.__savedTagColors[newTag] = window.__savedTagColors[oldTag];
        delete window.__savedTagColors[oldTag];
        saveSavedTagColors();
    }
    saveSavedTags(); populateTagSelect(); renderSavedTagsUI(); renderNotesCategories(); renderTagsManageList();
}

window.updateSavedTagColor = function(tag, hex) {
    try {
        if (!window.__savedTagColors) window.__savedTagColors = {};
        window.__savedTagColors[tag] = hex;
        saveSavedTagColors();
        renderNotesCategories();
        renderMiniSidebarCategories();
    } catch {}
}

function hexToRgba(hex, alpha) {
    try {
        const h = hex.replace('#','');
        const expanded = h.length===3 ? h.split('').map(c=>c+c).join('') : h;
        const bigint = parseInt(expanded, 16);
        const r = (bigint >> 16) & 255;
        const g = (bigint >> 8) & 255;
        const b = bigint & 255;
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    } catch { return 'rgba(49,130,206,0.12)'; }
}

// Save notes to localStorage
function saveNotesToStorage() {
    try {
        const dataToSave = {
            ...window.appData,
            notes: window.appData.notes,
            metadata: {
                ...window.appData.metadata,
                lastUpdated: new Date().toISOString()
            }
        };
        localStorage.setItem('pdc_app_data', JSON.stringify(dataToSave));
    } catch (error) {
        console.error('Error saving notes to localStorage:', error);
        showNotification('Lỗi lưu ghi chú!', 'error');
    }
}

// Load notes from localStorage
function loadNotesFromStorage() {
    try {
        const saved = localStorage.getItem('pdc_app_data');
        if (saved) {
            const parsed = JSON.parse(saved);
            if (parsed.notes && Array.isArray(parsed.notes)) {
                window.appData.notes = parsed.notes;
            }
        }
    } catch (error) {
        console.error('Error loading notes from localStorage:', error);
        window.appData.notes = [];
    }
}

// Update notes tab (called from main app)
function updateNotesTab() {
    renderNotesList();
    renderNotesCategories();
    // Pull latest when user switches to Notes tab
    try { refreshNotesFromSheets(); } catch {}
}
window.updateNotesTab = updateNotesTab;

// === Sync notes to Google Sheets using existing Apps Script endpoint ===
async function syncNotesToGoogleSheets() {
    try {
        const url = (window.GAS_URL || '') + '?token=' + encodeURIComponent(window.GAS_TOKEN || '');
        const payload = { action: 'notesUpsert', notes: (window.appData.notes || []).map(n => ({
            id: n.id,
            orderCode: n.orderCode || '',
            chatLink: n.chatLink || '',
            content: n.content || '',
            status: n.status || 'active',
            createdAt: n.createdAt || new Date().toISOString(),
            updatedAt: n.updatedAt || new Date().toISOString(),
            tags: n.tags || ''
        })) };
        // Use text/plain to avoid CORS preflight like products
        const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(payload) });
        const json = await res.json().catch(() => ({}));
        if (!res.ok || !json.success) {
            console.warn('notesUpsert failed', res.status, json);
            showNotification('Lưu ghi chú lên Sheet2 thất bại!', 'error');
        } else {
            showNotification(`Đã đồng bộ ${payload.notes.length} ghi chú lên Sheet2`, 'success');
        }
    } catch (e) {
        console.error('syncNotesToGoogleSheets failed', e);
        showNotification('Lỗi mạng khi đồng bộ ghi chú!', 'error');
    }
}

// === Fetch notes from Google Sheets (Sheet2) and merge by updatedAt ===
async function refreshNotesFromSheets(force = false) {
    try {
        if (_notesSyncInFlight) return; // đang chạy
        const now = Date.now();
        if (!force && now - _lastNotesFetchAt < NOTES_FETCH_MIN_INTERVAL_MS) return; // quá gần
        _notesSyncInFlight = true; _lastNotesFetchAt = now;
        const base = (window.GAS_URL || '');
        if (!base) return;
        const url = base + '?action=notesList&token=' + encodeURIComponent(window.GAS_TOKEN || '');
        const res = await fetch(url, { cache: 'no-store' });
        if (!res.ok) return;
        const data = await res.json();
        if (!data || !data.success || !Array.isArray(data.data)) return;
        // Validate that payload is truly notes (not products)
        const incoming = (data.data || []).filter(n => {
            // must have id and at least one of orderCode/content/chatLink/status
            if (!n || !n.id) return false;
            const hasNoteFields = ('orderCode' in n) || ('content' in n) || ('chatLink' in n) || ('status' in n);
            // guard against products payload (name/price without note fields)
            const looksLikeProduct = ('name' in n) && ('price' in n) && !hasNoteFields;
            return hasNoteFields && !looksLikeProduct;
        });
        if (incoming.length === 0) {
            // Endpoint returned empty notes. If local notes look invalid (no orderCode & no content), clear them.
            const current = Array.isArray(window.appData.notes) ? window.appData.notes : [];
            const allInvalid = current.length > 0 && current.every(n => !n || (!n.orderCode && !n.content));
            if (allInvalid) {
                window.appData.notes = [];
                renderNotesList();
                saveNotesToStorage();
                showNotification('Đã tải Sheet2: 0 ghi chú (đã dọn rác local)', 'info');
            }
            return;
        }
        const current = Array.isArray(window.appData.notes) ? window.appData.notes : [];
        const idToNote = new Map(current.map(n => [n.id, n]));
        incoming.forEach(n => {
            const existing = idToNote.get(n.id);
            if (!existing) {
                idToNote.set(n.id, n);
            } else {
                const a = new Date(existing.updatedAt || existing.createdAt || 0).getTime();
                const b = new Date(n.updatedAt || n.createdAt || 0).getTime();
                if (b > a) idToNote.set(n.id, n);
            }
        });
        window.appData.notes = Array.from(idToNote.values()).sort((x,y) => new Date(y.createdAt||0)-new Date(x.createdAt||0));
        renderNotesList();
        saveNotesToStorage();
        showNotification(`Đã tải từ Sheet2: ${incoming.length} ghi chú`, 'success');
    } catch (e) {
        console.warn('refreshNotesFromSheets error', e);
        showNotification('Không tải được ghi chú từ Sheet2', 'error');
    } finally {
        _notesSyncInFlight = false;
    }
}

// Ensure each note has required fields to avoid undefined errors
function normalizeNotes() {
    try {
        if (!Array.isArray(window.appData.notes)) { window.appData.notes = []; return; }
        window.appData.notes = window.appData.notes.map(n => ({
            id: n.id || generateNoteId(),
            orderCode: n.orderCode || '',
            chatLink: n.chatLink || '',
            content: n.content || '',
            status: n.status || 'active',
            tags: n.tags || '',
            createdAt: n.createdAt || new Date().toISOString(),
            updatedAt: n.updatedAt || n.createdAt || new Date().toISOString()
        }));
    } catch {}
}

// Utilities to control from UI/Console if needed
window.syncNotesNow = async function() { await refreshNotesFromSheets(); await syncNotesToGoogleSheets(); };
window.clearNotesCache = function() { try { localStorage.removeItem('pdc_app_data'); showNotification('Đã xóa cache local, reload...', 'info'); setTimeout(() => location.reload(), 300); } catch {} };

function scheduleRefreshNotes(delayMs) {
    setTimeout(() => { refreshNotesFromSheets(true); }, Math.max(0, delayMs || 0));
}

// ===== Lightweight local tag management (no DB) =====
const SAVED_TAGS_KEY = 'pdc_saved_tags_v1';
const SAVED_TAG_COLORS_KEY = 'pdc_saved_tag_colors_v1';
function loadSavedTags() {
    try {
        const raw = localStorage.getItem(SAVED_TAGS_KEY);
        const arr = raw ? JSON.parse(raw) : ['khachhang','noibo','gap','khac'];
        window.__savedTags = Array.isArray(arr) ? arr.filter(Boolean) : [];
    } catch { window.__savedTags = ['khachhang','noibo','gap','khac']; }
}
function loadSavedTagColors() {
    try {
        const raw = localStorage.getItem(SAVED_TAG_COLORS_KEY);
        const obj = raw ? JSON.parse(raw) : { khachhang:'#0b74c4', noibo:'#3b5bdb', gap:'#d9480f', khac:'#495057', all:'#3182ce' };
        window.__savedTagColors = obj || {};
    } catch { window.__savedTagColors = { khachhang:'#0b74c4', noibo:'#3b5bdb', gap:'#d9480f', khac:'#495057', all:'#3182ce' }; }
}
function saveSavedTagColors() {
    try { localStorage.setItem(SAVED_TAG_COLORS_KEY, JSON.stringify(window.__savedTagColors || {})); } catch {}
}
function saveSavedTags() {
    try { localStorage.setItem(SAVED_TAGS_KEY, JSON.stringify(window.__savedTags || [])); } catch {}
}
function renderSavedTagsUI() {
    const wrap = document.getElementById('savedTagsChips');
    if (!wrap) return;
    const tags = (window.__savedTags || []).slice(0, 50);
    wrap.innerHTML = tags.map(t => `<span class="chip" style="padding:4px 8px; border:1px solid var(--border-primary); border-radius:999px; cursor:pointer;">${t} <button type="button" style="margin-left:6px; border:none; background:transparent; cursor:pointer;" onclick="removeSavedTag('${t}')">×</button></span>`).join('');
}
function populateTagSelect() {
    const updateOne = (sel) => {
        if (!sel) return;
        const hasEmpty = sel.querySelector('option[value=""]');
        sel.innerHTML = '';
        if (hasEmpty) sel.appendChild(hasEmpty);
        const fixedTags = ['chua-xu-ly', 'note-thong-tin'];
        fixedTags.forEach(t => {
            const opt = document.createElement('option');
            opt.value = t;
            opt.textContent = (t === 'chua-xu-ly') ? 'Chưa xử lý' : 'Note thông tin';
            sel.appendChild(opt);
        });
    };
    updateOne(document.getElementById('noteTagSelect'));
    updateOne(document.getElementById('modalTagSelect'));
}
window.addTagToSavedList = function() {
    try {
        const sel = document.getElementById('noteTagSelect');
        const custom = document.getElementById('noteTagsCustom');
        const fromSel = (sel?.value || '').trim().toLowerCase();
        const fromCustom = (custom?.value || '').trim().toLowerCase();
        const parts = [fromSel, fromCustom].filter(Boolean).join(',').split(',').map(s=>s.trim()).filter(Boolean);
        if (parts.length === 0) { showNotification('Nhập hoặc chọn tag để lưu', 'error'); return; }
        window.__savedTags = Array.from(new Set([...(window.__savedTags||[]), ...parts]));
        saveSavedTags(); populateTagSelect(); renderSavedTagsUI();
        showNotification('Đã lưu tag vào máy bạn', 'success');
    } catch {}
}
window.removeSavedTag = function(tag) {
    try {
        window.__savedTags = (window.__savedTags || []).filter(t => t !== tag);
        saveSavedTags(); populateTagSelect(); renderSavedTagsUI(); renderTagsManageList();
    } catch {}
}

// removed bulk add from modal (simplified UI)
