// ===== NOTES MODULE =====

// Initialize notes data structure
if (!window.appData) window.appData = {};
if (!window.appData.notes) window.appData.notes = [];

// Debounce/guard for fetch to prevent spam
let _notesSyncInFlight = false;
let _lastNotesFetchAt = 0;
const NOTES_FETCH_MIN_INTERVAL_MS = 5000; // 5s - reduced for better real-time sync
let _notesSyncInterval = null;
let _notesRetryCount = 0;
const MAX_RETRY_COUNT = 3;

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
    // Initialize note form
    initNoteForm();
    // Try to pull latest from Google Sheets (Sheet2)
    try { scheduleRefreshNotes(0); } catch (e) { /* Handle error silently */ }
    
    // Start automatic periodic sync
    startPeriodicSync();
    
    // Clean up deleted notes on startup
    try { cleanupDeletedNotes(); } catch (e) { /* Handle error silently */ }
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
        if (showList) {
            renderNotesList();
        }
    } catch {}
}

// Generate unique ID for notes
function generateNoteId() {
    return 'note_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

// Create new note
function createNote() {
    const noteContent = document.getElementById('noteContent')?.value.trim();
    const tagSelect = document.getElementById('noteTagSelect');
    const selectedTag = (tagSelect?.value || '').trim();
    
    // Basic validation
    if (!noteContent) {
        showNotification('Vui lòng nhập nội dung ghi chú!', 'error');
        return;
    }
    if (!selectedTag) {
        showNotification('Vui lòng chọn phân loại!', 'error');
        return;
    }
    
    let chatLink = '';
    let orderCode = '';
    let title = '';
    
    // Different validation based on tag type
    if (selectedTag === 'chua-xu-ly') {
        // For "Chưa xử lý" - require chat link and order code
        chatLink = document.getElementById('noteChatLink')?.value.trim();
        orderCode = document.getElementById('noteOrderId')?.value.trim();
        
    if (!chatLink) {
        showNotification('Vui lòng nhập link chat!', 'error');
        return;
    }
    if (!orderCode) {
        showNotification('Vui lòng nhập mã đơn hàng!', 'error');
        return;
    }
    
    // Validate URL format
    try {
        new URL(chatLink);
    } catch (e) {
        showNotification('Link chat không hợp lệ! Vui lòng nhập URL đúng định dạng.', 'error');
        return;
        }
    } else if (selectedTag === 'note-thong-tin') {
        // For "Note thông tin" - require title
        title = document.getElementById('noteTitle')?.value.trim();
        
        if (!title) {
            showNotification('Vui lòng nhập tiêu đề!', 'error');
            return;
        }
        
        chatLink = '';
        orderCode = '';
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
        title: title,
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
    try { syncNotesToGoogleSheets(); } catch (e) { /* Handle error silently */ }
    
    showNotification('Đã tạo ghi chú! Đang đồng bộ...', 'info');
}
window.createNote = createNote;

// Clear note form
function clearNoteForm() {
    const fields = ['noteContent', 'noteChatLink', 'noteOrderId', 'noteTitle'];
    fields.forEach(id => {
        const element = document.getElementById(id);
        if (element) element.value = '';
    });
    const tagSelect = document.getElementById('noteTagSelect');
    if (tagSelect) {
        tagSelect.value = 'chua-xu-ly'; // Reset to default
        // Show default fields
        toggleNoteFields();
    }
}
window.clearNoteForm = clearNoteForm;

// Copy current chat link
function copyCurrentChatLink() {
    const chatLink = document.getElementById('noteChatLink')?.value.trim();
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
async function completeNote(noteId) {
    const note = window.appData.notes.find(n => n.id === noteId);
    if (!note) {
        showNotification('Không tìm thấy ghi chú!', 'error');
        return;
    }
    
    // Mark as completed instead of deleting
        note.status = 'đã hoàn thành';
    note.completedAt = new Date().toISOString();
    
    // Update UI
    renderNotesList();
    renderNotesCategories();
    saveNotesToStorage();
    
    // Sync to Google Sheets
    try {
        const url = (window.GAS_URL || '') + '?token=' + encodeURIComponent(window.GAS_TOKEN || '');
        const payload = { action: 'notesUpdate', notes: [note] };
        const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(payload) });
        const json = await res.json().catch(() => ({}));
        if (!res.ok || !json.success) {
            showNotification(`✅ Đã hoàn thành: ${note.orderCode} (lỗi đồng bộ với Sheets)`, 'warning');
        } else {
            showNotification(`✅ Đã hoàn thành: ${note.orderCode}`, 'success');
        }
    } catch (e) {
        showNotification(`✅ Đã hoàn thành: ${note.orderCode} (lỗi đồng bộ với Sheets)`, 'warning');
    }
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
        if (!res.ok || !json.success) { /* Handle error silently */ }
    } catch (e) { /* Handle error silently */ }
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
    const masonry = document.querySelector('.notes-masonry');
    
    if (!container) return;
    
    // Add filtering class to prevent animations
    if (masonry) {
        masonry.classList.add('filtering');
    }
    
    // Show/hide bulk actions based on category
    const bulkActionsContainer = document.getElementById('bulkActionsContainer');
    if (bulkActionsContainer) {
        if (activeCategory === 'completed') {
            bulkActionsContainer.style.display = 'block';
        } else {
            bulkActionsContainer.style.display = 'none';
        }
    }
    
    let notes = window.appData.notes || [];
    
    // Filter by active category if not 'all'
    if (activeCategory && activeCategory !== 'all') {
        if (activeCategory === 'completed') {
            // Show only completed notes
            notes = notes.filter(n => n.status === 'completed' || n.status === 'đã hoàn thành');
        } else {
            // Show only active notes (not completed) for other categories
        notes = notes.filter(n => {
            const tags = String(n.tags || '').toLowerCase();
                return tags === activeCategory && n.status !== 'completed' && n.status !== 'đã hoàn thành';
            });
        }
    } else {
        // For 'all' category, show only active notes (not completed)
        notes = notes.filter(n => n.status !== 'completed' && n.status !== 'đã hoàn thành');
    }
    
    // Filter by search term
    const searchTerm = window.__notesSearchTerm || '';
    if (searchTerm) {
        notes = notes.filter(note => {
            const orderCode = String(note.orderCode || '').toLowerCase();
            const chatLink = String(note.chatLink || '').toLowerCase();
            const content = String(note.content || '').toLowerCase();
            const title = String(note.title || '').toLowerCase();
            
            return orderCode.includes(searchTerm) || 
                   chatLink.includes(searchTerm) || 
                   content.includes(searchTerm) ||
                   title.includes(searchTerm);
        });
    }
    
    // Filter by time range
    const timeFilter = window.__notesTimeFilter || 'all';
    if (timeFilter !== 'all') {
        notes = notes.filter(note => isNoteInTimeRange(note, timeFilter));
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
        const tags = String(note.tags || '').toLowerCase().trim();
        const isInfoNote = tags === 'note-thong-tin';
        const isPendingNote = tags === 'chua-xu-ly';
        
        // Determine note type label and class
        let typeLabel = '';
        let typeClass = '';
        if (note.status === 'completed' || note.status === 'đã hoàn thành') {
            typeLabel = 'Đã hoàn thành';
            typeClass = 'note-completed';
        } else if (isInfoNote) {
            typeLabel = 'Note thông tin';
            typeClass = 'note-info';
        } else if (isPendingNote) {
            typeLabel = 'Chưa xử lý';
            typeClass = 'note-pending';
        } else {
            typeLabel = 'Active';
            typeClass = 'active';
        }
        
        let headerContent = '';
        if (isInfoNote && note.title) {
            // For "Note thông tin" - show title
            headerContent = `<div class="v3-title">${String(note.title || '').replace(/\n/g,'<br>')}</div>`;
        } else {
            // For "Chưa xử lý" - show chat link
        const link = String(note.chatLink || '');
        const linkShort = link.length > 40 ? link.substring(0,40) + '…' : link;
        const linkTitle = linkShort || '—';
            headerContent = `<a class="v3-link" href="${link}" target="_blank" title="Mở link chat">${linkTitle}</a>`;
        }
        
        // Add checkbox for completed notes
        const checkboxHtml = (note.status === 'completed' || note.status === 'đã hoàn thành') ? 
            `<input type="checkbox" class="note-checkbox" data-note-id="${note.id}" onchange="updateBulkActions()">` : '';
        
        return `
        <div class="note-cardv3 ${typeClass}" id="note-${note.id}" data-note-id="${note.id}">
            ${checkboxHtml}
            <div class="v3-head">
                ${headerContent}
                <span class="v3-status ${typeClass}">${typeLabel}</span>
            </div>
            <div class="v3-body">${String(note.content || '').replace(/\n/g,'<br>')}</div>
            <div class="v3-foot">
                <span class="v3-time">${formatNoteDate(note.createdAt)}</span>
            </div>
            <div class="v3-actions">
                ${(note.status === 'completed' || note.status === 'đã hoàn thành') ? '' : (isInfoNote ? '' : `<button class="icon-btn" title="Copy" onclick="copyNoteChatLink('${note.id}')">📋</button>`)}
                ${(note.status === 'completed' || note.status === 'đã hoàn thành') ? '' : `<button class="icon-btn ${isInfoNote ? 'delete' : 'ok'}" title="${isInfoNote ? 'Xóa note' : 'Hoàn thành'}" onclick="${isInfoNote ? 'deleteNote' : 'completeNote'}('${note.id}')">${isInfoNote ? '🗑️' : '✅'}</button>`}
            </div>
        </div>`;
    }).join('');
    
    // Ensure we always have 2 columns by adding empty placeholder if needed
    let masonryContent = cards;
    if (cards.length % 2 === 1) {
        masonryContent = cards + '<div class="note-placeholder"></div>';
    }
    
    // Force re-render to ensure proper layout
    container.innerHTML = '';
    setTimeout(() => {
        container.innerHTML = `<div class="notes-masonry">${masonryContent}</div>`;
        setTimeout(() => {
            applyMasonryLayout();
            
            // Remove filtering class after layout is applied
            if (masonry) {
                setTimeout(() => {
                    masonry.classList.remove('filtering');
                }, 50);
            }
        }, 100);
    }, 10);
    
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
}
window.renderNotesCategories = renderNotesCategories;

// Category filter handler
window.filterNotesByCategory = function(category) {
    window.__notesActiveCategory = category || 'all';
    renderNotesCategories();
    renderNotesList();
    
    // Update filter button states
    const filterButtons = document.querySelectorAll('.notes-filters .chip');
    filterButtons.forEach(btn => {
        btn.classList.remove('active');
        if (btn.textContent.trim() === 'Tất cả' && category === 'all') {
            btn.classList.add('active');
        } else if (btn.textContent.trim() === 'Note thông tin' && category === 'note-thong-tin') {
            btn.classList.add('active');
        } else if (btn.textContent.trim() === 'Chưa xử lý' && category === 'chua-xu-ly') {
            btn.classList.add('active');
        } else if (btn.textContent.trim() === 'Hoàn thành' && category === 'completed') {
            btn.classList.add('active');
        }
    });
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
        // Handle error silently
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
        // Handle error silently
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

// Start automatic periodic sync
function startPeriodicSync() {
    if (_notesSyncInterval) {
        clearInterval(_notesSyncInterval);
    }
    
    // Sync every 30 seconds
    _notesSyncInterval = setInterval(async () => {
        try {
            await refreshNotesFromSheets(true);
        } catch (e) {
            // Handle error silently
        }
    }, 30000);
}

// Stop periodic sync
function stopPeriodicSync() {
    if (_notesSyncInterval) {
        clearInterval(_notesSyncInterval);
        _notesSyncInterval = null;
    }
}

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
        
        // Show sync indicator
        showSyncIndicator('Syncing...');
        
        // Use text/plain to avoid CORS preflight like products
        const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(payload) });
        const json = await res.json().catch(() => ({}));
        
        if (!res.ok || !json.success) {
            // Handle error silently
            _notesRetryCount++;
            if (_notesRetryCount < MAX_RETRY_COUNT) {
                showNotification(`Lưu ghi chú thất bại, thử lại lần ${_notesRetryCount}...`, 'warning');
                setTimeout(() => syncNotesToGoogleSheets(), 2000 * _notesRetryCount);
            } else {
            showNotification('Lưu ghi chú lên Sheet2 thất bại!', 'error');
                _notesRetryCount = 0;
            }
        } else {
            showNotification(`Đã đồng bộ ${payload.notes.length} ghi chú lên Sheet2`, 'success');
            _notesRetryCount = 0;
        }
    } catch (e) {
        // Handle error silently
        _notesRetryCount++;
        if (_notesRetryCount < MAX_RETRY_COUNT) {
            showNotification(`Lỗi mạng, thử lại lần ${_notesRetryCount}...`, 'warning');
            setTimeout(() => syncNotesToGoogleSheets(), 2000 * _notesRetryCount);
        } else {
        showNotification('Lỗi mạng khi đồng bộ ghi chú!', 'error');
            _notesRetryCount = 0;
        }
    } finally {
        hideSyncIndicator();
    }
}

// === Fetch notes from Google Sheets (Sheet2) and merge by updatedAt ===
async function refreshNotesFromSheets(force = false) {
    try {
        if (_notesSyncInFlight) return; // already running
        const now = Date.now();
        if (!force && now - _lastNotesFetchAt < NOTES_FETCH_MIN_INTERVAL_MS) return; // too recent
        _notesSyncInFlight = true; _lastNotesFetchAt = now;
        
        const base = (window.GAS_URL || '');
        if (!base) return;
        
        // Show sync indicator for manual refreshes
        if (force) {
            showSyncIndicator('Loading from Sheet2...');
        }
        
        const url = base + '?action=notesList&token=' + encodeURIComponent(window.GAS_TOKEN || '');
        const res = await fetch(url, { cache: 'no-store' });
        if (!res.ok) {
            if (force) {
                showNotification('Không thể kết nối đến Sheet2', 'error');
            }
            return;
        }
        
        const data = await res.json();
        if (!data || !data.success || !Array.isArray(data.data)) {
            if (force) {
                showNotification('Dữ liệu từ Sheet2 không hợp lệ', 'error');
            }
            return;
        }
        
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
                if (force) {
                showNotification('Đã tải Sheet2: 0 ghi chú (đã dọn rác local)', 'info');
                }
            }
            return;
        }
        
        const current = Array.isArray(window.appData.notes) ? window.appData.notes : [];
        const idToNote = new Map(current.map(n => [n.id, n]));
        let hasChanges = false;
        
        incoming.forEach(n => {
            const existing = idToNote.get(n.id);
            if (!existing) {
                idToNote.set(n.id, n);
                hasChanges = true;
            } else {
                const a = new Date(existing.updatedAt || existing.createdAt || 0).getTime();
                const b = new Date(n.updatedAt || n.createdAt || 0).getTime();
                if (b > a) {
                    idToNote.set(n.id, n);
                    hasChanges = true;
                }
            }
        });
        
        if (hasChanges) {
        window.appData.notes = Array.from(idToNote.values()).sort((x,y) => new Date(y.createdAt||0)-new Date(x.createdAt||0));
        renderNotesList();
        saveNotesToStorage();
            if (force) {
        showNotification(`Đã tải từ Sheet2: ${incoming.length} ghi chú`, 'success');
            }
        }
    } catch (e) {
        // Handle error silently
        if (force) {
        showNotification('Không tải được ghi chú từ Sheet2', 'error');
        }
    } finally {
        _notesSyncInFlight = false;
        if (force) {
            hideSyncIndicator();
        }
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

// Sync indicator functions
function showSyncIndicator(message) {
    try {
        let indicator = document.getElementById('notesSyncIndicator');
        if (!indicator) {
            indicator = document.createElement('div');
            indicator.id = 'notesSyncIndicator';
            indicator.className = 'sync-indicator';
            indicator.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                background: #3182ce;
                color: white;
                padding: 8px 16px;
                border-radius: 20px;
                font-size: 14px;
                font-weight: 600;
                z-index: 10000;
                box-shadow: 0 4px 12px rgba(49, 130, 206, 0.3);
                display: flex;
                align-items: center;
                gap: 8px;
            `;
            document.body.appendChild(indicator);
        }
        indicator.innerHTML = `<span>🔄</span><span>${message}</span>`;
        indicator.style.display = 'flex';
    } catch (e) {
        // Handle error silently
    }
}

function hideSyncIndicator() {
    try {
        const indicator = document.getElementById('notesSyncIndicator');
        if (indicator) {
            indicator.style.display = 'none';
        }
    } catch (e) {
        // Handle error silently
    }
}

// Clean up notes that no longer exist in Google Sheets
async function cleanupDeletedNotes() {
    try {
        const base = (window.GAS_URL || '');
        if (!base) return;
        
        const url = base + '?action=notesList&token=' + encodeURIComponent(window.GAS_TOKEN || '');
        const res = await fetch(url, { cache: 'no-store' });
        if (!res.ok) return;
        
        const data = await res.json();
        if (!data || !data.success || !Array.isArray(data.data)) return;
        
        const sheetNoteIds = new Set(data.data.map(n => n.id));
        const localNotes = window.appData.notes || [];
        const notesToKeep = localNotes.filter(note => sheetNoteIds.has(note.id));
        
        if (notesToKeep.length !== localNotes.length) {
            window.appData.notes = notesToKeep;
            renderNotesList();
            renderNotesCategories();
            saveNotesToStorage();
            showNotification(`Đã dọn dẹp ${localNotes.length - notesToKeep.length} ghi chú đã bị xóa`, 'info');
        }
    } catch (e) {
        // Handle error silently
    }
}

// Utilities to control from UI/Console if needed
window.syncNotesNow = async function() { 
    await refreshNotesFromSheets(true); 
    await syncNotesToGoogleSheets(); 
};
window.clearNotesCache = function() { 
    try { 
        localStorage.removeItem('pdc_app_data'); 
        showNotification('Đã xóa cache local, reload...', 'info'); 
        setTimeout(() => location.reload(), 300); 
    } catch {} 
};
window.cleanupNotes = cleanupDeletedNotes;

// Toggle additional fields based on note tag selection
function toggleNoteFields() {
    const tagSelect = document.getElementById('noteTagSelect');
    const additionalFields = document.getElementById('noteAdditionalFields');
    const infoFields = document.getElementById('noteInfoFields');
    
    if (!tagSelect || !additionalFields || !infoFields) return;
    
    if (tagSelect.value === 'chua-xu-ly') {
        additionalFields.style.display = 'block';
        infoFields.style.display = 'none';
        // Clear info fields when hiding
        const title = document.getElementById('noteTitle');
        if (title) title.value = '';
    } else if (tagSelect.value === 'note-thong-tin') {
        additionalFields.style.display = 'none';
        infoFields.style.display = 'block';
        // Clear additional fields when hiding
        const chatLink = document.getElementById('noteChatLink');
        const orderId = document.getElementById('noteOrderId');
        if (chatLink) chatLink.value = '';
        if (orderId) orderId.value = '';
    } else {
        additionalFields.style.display = 'none';
        infoFields.style.display = 'none';
        // Clear all fields when no selection
        const chatLink = document.getElementById('noteChatLink');
        const orderId = document.getElementById('noteOrderId');
        const title = document.getElementById('noteTitle');
        if (chatLink) chatLink.value = '';
        if (orderId) orderId.value = '';
        if (title) title.value = '';
    }
}

// Initialize form on page load
function initNoteForm() {
    // Set default to "Chưa xử lý" and show fields
    const tagSelect = document.getElementById('noteTagSelect');
    if (tagSelect) {
        tagSelect.value = 'chua-xu-ly';
        toggleNoteFields();
    }
}

window.toggleNoteFields = toggleNoteFields;
window.initNoteForm = initNoteForm;
window.startNotesSync = startPeriodicSync;
window.stopNotesSync = stopPeriodicSync;

// Search notes functionality
function searchNotes() {
    const searchInput = document.getElementById('notesSearchInput');
    if (!searchInput) return;
    
    const searchTerm = searchInput.value.trim().toLowerCase();
    window.__notesSearchTerm = searchTerm;
    
    // Re-render notes list with search filter
    renderNotesList();
}

function clearNotesSearch() {
    const searchInput = document.getElementById('notesSearchInput');
    if (searchInput) {
        searchInput.value = '';
        window.__notesSearchTerm = '';
        renderNotesList();
    }
}

window.searchNotes = searchNotes;
window.clearNotesSearch = clearNotesSearch;

// Time filtering functions
function filterNotesByTime(timeFilter) {
    // Update active state
    document.querySelectorAll('.notes-time-filters .chip').forEach(chip => {
        chip.classList.remove('active');
    });
    event.target.classList.add('active');
    
    // Store time filter
    window.__notesTimeFilter = timeFilter;
    
    // Re-render notes list
    renderNotesList();
}

function isNoteInTimeRange(note, timeFilter) {
    if (timeFilter === 'all') return true;
    
    const noteDate = new Date(note.createdAt);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);
    const monthAgo = new Date(today);
    monthAgo.setDate(monthAgo.getDate() - 30);
    
    switch (timeFilter) {
        case 'today':
            return noteDate >= today;
        case 'yesterday':
            return noteDate >= yesterday && noteDate < today;
        case 'week':
            return noteDate >= weekAgo;
        case 'month':
            return noteDate >= monthAgo;
        default:
            return true;
    }
}

window.filterNotesByTime = filterNotesByTime;

// Delete note function
function deleteNote(noteId) {
    // Store note ID for confirmation
    window.__deleteNoteId = noteId;
    
    // Show modal
    const modal = document.getElementById('deleteNoteModal');
    if (modal) {
        modal.style.display = 'flex';
    }
}

// Confirm delete note
function confirmDeleteNote() {
    const noteId = window.__deleteNoteId;
    if (!noteId) return;
    
    try {
        // Remove from local data
        window.appData.notes = window.appData.notes.filter(note => note.id !== noteId);
        
        // Update UI
        renderNotesList();
        renderNotesCategories();
        saveNotesToStorage();
        
        // Sync to Google Sheets
        try {
            syncNotesToGoogleSheets();
        } catch (e) {
            // Handle error silently
        }
        
        showNotification('Đã xóa note!', 'success');
        
        // Close modal
        closeDeleteModal();
    } catch (error) {
        // Handle error silently
        showNotification('Lỗi khi xóa note!', 'error');
    }
}

// Close delete modal
function closeDeleteModal() {
    const modal = document.getElementById('deleteNoteModal');
    if (modal) {
        modal.style.display = 'none';
    }
    window.__deleteNoteId = null;
}

window.deleteNote = deleteNote;
window.closeDeleteModal = closeDeleteModal;
window.confirmDeleteNote = confirmDeleteNote;

// Bulk actions for completed notes
function toggleSelectAllCompleted() {
    const selectAllCheckbox = document.getElementById('selectAllCompleted');
    const noteCheckboxes = document.querySelectorAll('.note-checkbox');
    
    noteCheckboxes.forEach(checkbox => {
        checkbox.checked = selectAllCheckbox.checked;
    });
    
    updateBulkActions();
}

function updateBulkActions() {
    const noteCheckboxes = document.querySelectorAll('.note-checkbox');
    const checkedBoxes = document.querySelectorAll('.note-checkbox:checked');
    const deleteBtn = document.getElementById('deleteSelectedBtn');
    const selectAllCheckbox = document.getElementById('selectAllCompleted');
    
    if (deleteBtn) {
        deleteBtn.disabled = checkedBoxes.length === 0;
    }
    
    if (selectAllCheckbox) {
        selectAllCheckbox.checked = noteCheckboxes.length > 0 && checkedBoxes.length === noteCheckboxes.length;
        selectAllCheckbox.indeterminate = checkedBoxes.length > 0 && checkedBoxes.length < noteCheckboxes.length;
    }
}

async function deleteSelectedCompleted() {
    const checkedBoxes = document.querySelectorAll('.note-checkbox:checked');
    if (checkedBoxes.length === 0) return;
    
    if (!confirm(`Bạn có chắc muốn xóa ${checkedBoxes.length} ghi chú đã chọn?`)) return;
    
    try {
        const noteIds = Array.from(checkedBoxes).map(checkbox => checkbox.dataset.noteId);
        
        // Remove from local data
        window.appData.notes = window.appData.notes.filter(note => !noteIds.includes(note.id));
        
        // Update UI
        renderNotesList();
        renderNotesCategories();
        saveNotesToStorage();
        
        // Sync to Google Sheets
        try {
            const url = (window.GAS_URL || '') + '?token=' + encodeURIComponent(window.GAS_TOKEN || '');
            const payload = { action: 'notesDelete', ids: noteIds };
            const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(payload) });
            const json = await res.json().catch(() => ({}));
            if (!res.ok || !json.success) {
                // Handle error silently
            }
        } catch (e) {
            // Handle error silently
        }
        
        showNotification(`Đã xóa ${noteIds.length} ghi chú!`, 'success');
    } catch (error) {
        // Handle error silently
        showNotification('Lỗi khi xóa ghi chú!', 'error');
    }
}

window.toggleSelectAllCompleted = toggleSelectAllCompleted;
window.updateBulkActions = updateBulkActions;
window.deleteSelectedCompleted = deleteSelectedCompleted;

// Modern Notification System
function showNotification(message, type = 'info', title = '') {
    const container = document.getElementById('notificationContainer');
    if (!container) return;
    
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    
    const icons = {
        success: '✅',
        error: '❌',
        warning: '⚠️',
        info: 'ℹ️'
    };
    
    const titles = {
        success: 'Thành công',
        error: 'Lỗi',
        warning: 'Cảnh báo',
        info: 'Thông báo'
    };
    
    notification.innerHTML = `
        <div class="notification-content">
            <div class="notification-icon">${icons[type] || icons.info}</div>
            <div class="notification-body">
                <div class="notification-title">${title || titles[type] || titles.info}</div>
                <div class="notification-message">${message}</div>
            </div>
        </div>
        <button class="notification-close" onclick="removeNotification(this)">×</button>
    `;
    
    container.appendChild(notification);
    
    // Trigger animation
    setTimeout(() => {
        notification.classList.add('show');
    }, 10);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        removeNotification(notification.querySelector('.notification-close'));
    }, 5000);
}

function removeNotification(closeBtn) {
    const notification = closeBtn.closest('.notification');
    if (!notification) return;
    
    notification.classList.add('removing');
    setTimeout(() => {
        if (notification.parentNode) {
            notification.parentNode.removeChild(notification);
        }
    }, 300);
}

window.showNotification = showNotification;
window.removeNotification = removeNotification;

// Functions are already exported above, removing duplicate exports

// Add event listener for modal overlay click
document.addEventListener('DOMContentLoaded', function() {
    const modal = document.getElementById('deleteNoteModal');
    if (modal) {
        modal.addEventListener('click', function(e) {
            if (e.target === modal) {
                closeDeleteModal();
            }
        });
    }
});

// Apply smart masonry layout
function applyMasonryLayout() {
    const masonry = document.querySelector('.notes-masonry');
    if (!masonry) return;
    
    // CSS columns will handle the layout automatically
    // No need to rearrange cards
}

window.applyMasonryLayout = applyMasonryLayout;

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
