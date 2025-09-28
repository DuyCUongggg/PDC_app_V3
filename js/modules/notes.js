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
    const chatLink = document.getElementById('chatLink')?.value.trim();
    const orderCode = document.getElementById('orderCode')?.value.trim();
    const noteContent = document.getElementById('noteContent')?.value.trim();
    
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
    
    // Create note object
    const note = {
        id: generateNoteId(),
        chatLink: chatLink,
        orderCode: orderCode,
        content: noteContent,
        status: 'active',
        tags: '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };
    
    // Add to notes array
    window.appData.notes.unshift(note); // Add to beginning
    
    // Clear form
    clearNoteForm();
    
    // Re-render list
    renderNotesList();
    
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
    
    return date.toLocaleDateString('vi-VN', {
        day: '2-digit',
        month: '2-digit', 
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// Render notes list
function renderNotesList() {
    const container = document.getElementById('notesList');
    const countElement = document.getElementById('notesCount');
    
    if (!container) return;
    
    const notes = window.appData.notes || [];
    
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
        return `
        <div class="note-cardv3" data-note-id="${note.id}">
            <div class="v3-head">
                <span class="v3-code">${note.orderCode || '—'}</span>
                <span class="v3-status ${statusText === 'Done' ? 'done' : 'active'}">${statusText}</span>
            </div>
            <div class="v3-body">${String(note.content || '').replace(/\n/g,'<br>')}</div>
            <div class="v3-foot">
                <span class="v3-time">${formatNoteDate(note.createdAt)}</span>
                ${link ? `<a class="v3-link" href="${link}" target="_blank">${linkShort}</a>` : ''}
            </div>
            <div class="v3-actions">
                <button class="icon-btn" title="Copy" onclick="copyNoteChatLink('${note.id}')">📋</button>
                <button class="icon-btn ok" title="Done" onclick="completeNote('${note.id}')">✅</button>
                <button class="icon-btn danger" title="Xóa" onclick="deleteNote('${note.id}')">🗑️</button>
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
