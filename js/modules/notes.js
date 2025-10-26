// ===== NOTES MODULE =====

// Initialize notes data structure
if (!window.appData) window.appData = {};
if (!window.appData.notes) window.appData.notes = [];

// Enhanced backup and stability mechanisms
const BACKUP_KEY = 'pdc_notes_backup';
const BACKUP_RETENTION_DAYS = 7;
const MAX_BACKUP_COUNT = 5;

// Auto-save debounce helper (EXACTLY like products)
let _notesAutoSaveTimer = null;

// Backup variables
let _lastBackupTime = 0;
let _dataIntegrityCheck = false;

// Pagination variables
let _notesCurrentPage = 1;
let _notesPerPage = 10;
let _notesTotalPages = 1;


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
    
    // Auto load from Google Sheets on startup (EXACTLY like products)
    
    // Render ngay với dữ liệu local để tránh flicker
    renderNotesList();
    renderNotesCategories();
    
    // Sau đó tải từ database trong background
    loadNotesFromGoogleSheets().then(() => {
    }).catch((error) => {
    });
    // Initialize note form
    initNoteForm();
    
    // No complex sync - just like products
    
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

// Create new note with enhanced stability
function createNote() {
    // Auto-backup before creating new note
    autoBackup();
    
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

    // Create note object with enhanced validation
    const note = {
        id: generateNoteId(),
        chatLink: chatLink,
        orderCode: orderCode,
        title: title,
        content: noteContent,
        status: 'active',
        tags,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        // Add integrity markers
        _localVersion: 1,
        _lastModified: Date.now()
    };
    
    try {
        // Add to notes array
        window.appData.notes.unshift(note); // Add to beginning
        
        // Clear form
        clearNoteForm();
        
        // Re-render list
        renderNotesList();
        renderNotesCategories();
        
        // Save to localStorage with backup
        saveNotesToStorage();
        
        // Auto-sync to Google Sheets (like products)
        queueNotesAutoSave();
        
        // Chỉ hiển thị thông báo ngắn gọn
        showNotification('Đã tạo ghi chú!', 'success', 2000);
    } catch (error) {
        // Restore from backup if creation failed (skip confirmation)
        if (restoreFromBackup(0, true)) {
            showNotification('Đã khôi phục dữ liệu sau lỗi!', 'warning');
        } else {
            showNotification('Lỗi khi tạo ghi chú!', 'error');
        }
    }
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
    // Không cần thông báo thêm nếu copy thành công im lặng cũng được
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
    
    // Thông báo thành công ngay lập tức (cục bộ)
    try {
        const label = note.orderCode || note.title || 'Ghi chú';
        // Một thông báo gọn
        showNotification(`Đã hoàn thành: ${label}`, 'success');
    } catch {}

    // Đồng bộ nền lên Google Sheets (im lặng nếu lỗi)
    try {
        const url = (window.GAS_URL || '') + '?token=' + encodeURIComponent(window.GAS_TOKEN || '');
        const payload = { action: 'notesUpsert', notes: [note] };
        const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(payload) });
        // Im lặng nếu thất bại; sẽ được đồng bộ lại qua cơ chế auto-sync sau
        await res.json().catch(() => ({}));
    } catch (e) {
        // Không spam cảnh báo; để auto-sync xử lý
    }
    
    // Trigger immediate real-time sync
    setTimeout(() => {
        try { refreshNotesFromSheets(true); } catch (e) { /* Handle error silently */ }
    }, 1000);
}
window.completeNote = completeNote;

// Deprecate note (không dùng nữa) - chỉ cho note thông tin
function deprecateNote(noteId) {
    
    const note = window.appData.notes.find(n => n.id === noteId);
    if (!note) {
        showNotification('Không tìm thấy ghi chú!', 'error');
        return;
    }
    
    
    // Chỉ cho phép với note thông tin
    const isInfoNote = (note.tags || '').includes('note-thong-tin');
    if (!isInfoNote) {
        showNotification('Chỉ có thể đánh dấu "không dùng nữa" cho note thông tin!', 'error');
        return;
    }
    
    // Đánh dấu như hoàn thành (giống nút hoàn thành)
    note.status = 'đã hoàn thành';
    note.completedAt = new Date().toISOString();
    
    
    // Update UI
    renderNotesList();
    renderNotesCategories();
    saveNotesToStorage();
    
    // Thông báo thành công
    showNotification('Đã đánh dấu "không dùng nữa"!', 'success');
    
    // Auto-sync to Google Sheets (like products)
    queueNotesAutoSave();
}
window.deprecateNote = deprecateNote;


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
    showNotification('Đã xóa ghi chú!', 'success');
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

// Render notes list
function renderNotesList() {
    const container = document.getElementById('notesList');
    const countElement = document.getElementById('notesCount');
    const activeCategory = window.__notesActiveCategory || 'all';
    const masonry = document.querySelector('.notes-masonry');
    
    if (!container) return;
    
    // Add filtering class to prevent animations and flicker
    if (masonry) {
        masonry.classList.add('filtering');
        // Thêm opacity để tránh flicker
        masonry.style.opacity = '0.7';
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
    
    let allNotes = window.appData.notes || [];
    
    
    
    // Filter by active category if not 'all'
    if (activeCategory && activeCategory !== 'all') {
        if (activeCategory === 'hoàn thành' || activeCategory === 'completed') {
            // Show completed notes
            allNotes = allNotes.filter(n => n.status === 'completed' || n.status === 'đã hoàn thành');
        } else if (activeCategory === 'thông tin' || activeCategory === 'info') {
            // Show only info notes that are NOT completed (giống bên "Chưa xử lý")
            allNotes = allNotes.filter(n => {
                const tags = String(n.tags || '').toLowerCase();
                const isInfoNote = tags.includes('note-thong-tin');
                const isNotCompleted = n.status !== 'completed' && n.status !== 'đã hoàn thành';
                const result = isInfoNote && isNotCompleted;
                
                
                return result;
            });
        } else if (activeCategory === 'chưa xử lý' || activeCategory === 'pending') {
            // Show only pending notes that are NOT completed
            allNotes = allNotes.filter(n => {
                const tags = String(n.tags || '').toLowerCase();
                const isPendingNote = tags === 'chua-xu-ly';
                return isPendingNote && n.status !== 'completed' && n.status !== 'đã hoàn thành';
            });
        } else {
            // Show only active notes (not completed) for other categories
            allNotes = allNotes.filter(n => {
            const tags = String(n.tags || '').toLowerCase();
                return tags === activeCategory && n.status !== 'completed' && n.status !== 'đã hoàn thành';
            });
        }
        
    } else {
        // For 'all' category, show ALL notes (including completed)
        // Don't filter anything - show all notes
    }
    
    // Filter by search term
    const searchTerm = window.__notesSearchTerm || '';
    if (searchTerm) {
        allNotes = allNotes.filter(note => {
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
    
    // Calculate pagination
    const totalNotes = allNotes.length;
    _notesTotalPages = Math.ceil(totalNotes / _notesPerPage);
    
    // Ensure current page is valid
    if (_notesCurrentPage > _notesTotalPages) {
        _notesCurrentPage = Math.max(1, _notesTotalPages);
    }
    
    // Get notes for current page
    const startIndex = (_notesCurrentPage - 1) * _notesPerPage;
    const endIndex = startIndex + _notesPerPage;
    const notes = allNotes.slice(startIndex, endIndex);
    
    // Filter by time range
    const timeFilter = window.__notesTimeFilter || 'all';
    if (timeFilter !== 'all') {
        notes = notes.filter(note => isNoteInTimeRange(note, timeFilter));
    }
    
    // Update count with pagination info
    if (countElement) {
        const startItem = (_notesCurrentPage - 1) * _notesPerPage + 1;
        const endItem = Math.min(_notesCurrentPage * _notesPerPage, totalNotes);
        countElement.textContent = `${startItem}-${endItem} / ${totalNotes} ghi chú`;
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
        } else if (note.status === 'deprecated') {
            typeLabel = 'Không dùng nữa';
            typeClass = 'note-deprecated';
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
        if (isInfoNote) {
            // For "Note thông tin" - show title (fallback to orderCode or first content line)
            const rawTitle = String(note.title || note.orderCode || '').trim();
            const fallback = String(note.content || '').split('\n')[0] || '';
            const titleToShow = (rawTitle || fallback || '');
            headerContent = `<div class="v3-title">${titleToShow.replace(/\n/g,'<br>')}</div>`;
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
        
        // Determine card type for border color - only for info and completed
        let cardType = '';
        if (note.status === 'completed' || note.status === 'đã hoàn thành') {
            cardType = 'completed';
        } else if (isInfoNote) {
            cardType = 'note-thong-tin';
        }
        // For pending cards, cardType remains empty string - no special styling
        
        return `
        <div class="note-cardv3 ${typeClass}" id="note-${note.id}" data-note-id="${note.id}" data-type="${cardType}">
            ${checkboxHtml}
            <div class="v3-head">
                ${headerContent}
                <span class="v3-status ${typeClass}">${typeLabel}</span>
            </div>
            <div class="v3-body">${String(note.content || '').replace(/\n/g,'<br>')}</div>
            <div class="v3-foot">
                <span class="v3-time">${formatNoteDateDetailed(note.createdAt)}</span>
            </div>
            <div class="v3-actions">
                <button class="icon-btn" title="Chỉnh sửa" onclick="editNote('${note.id}')">✏️</button>
                ${(note.status === 'completed' || note.status === 'đã hoàn thành') ? '' : (isInfoNote ? '' : `<button class="icon-btn" title="Copy" onclick="copyNoteChatLink('${note.id}')">📋</button>`)}
                ${(note.status === 'completed' || note.status === 'đã hoàn thành') ? '' : `<button class="icon-btn ${isInfoNote ? 'deprecated' : 'ok'}" title="${isInfoNote ? 'Không dùng nữa' : 'Hoàn thành'}" onclick="${isInfoNote ? 'deprecateNote' : 'completeNote'}('${note.id}')">${isInfoNote ? '🚫' : '✅'}</button>`}
            </div>
        </div>`;
    }).join('');
    
    // Create pagination HTML
    const paginationHtml = _notesTotalPages > 1 ? createPaginationHtml(_notesCurrentPage, _notesTotalPages, 'notes') : '';
    
    // Masonry layout for notes with pagination
    container.innerHTML = `
        <div class="notes-masonry">${cards}</div>
        ${paginationHtml}
    `;
    
    // Hoàn thành render - loại bỏ filtering class và opacity
    requestAnimationFrame(() => {
        const masonry = document.querySelector('.notes-masonry');
        if (masonry) {
            masonry.classList.remove('filtering');
            masonry.style.opacity = '1';
        }
    });
}

// Render categories into sidebar with counts
function renderNotesCategories() {
    // This function is now handled by the new filter system
    // Keeping empty to avoid breaking existing calls
}
window.renderNotesCategories = renderNotesCategories;

//

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

// Enhanced backup system
function createBackup() {
    try {
        const backup = {
            timestamp: Date.now(),
            notes: JSON.parse(JSON.stringify(window.appData.notes || [])),
            version: '1.0'
        };
        
        // Get existing backups
        const existingBackups = JSON.parse(localStorage.getItem(BACKUP_KEY) || '[]');
        
        // Add new backup
        existingBackups.unshift(backup);
        
        // Keep only recent backups
        const cutoffTime = Date.now() - (BACKUP_RETENTION_DAYS * 24 * 60 * 60 * 1000);
        const filteredBackups = existingBackups
            .filter(b => b.timestamp > cutoffTime)
            .slice(0, MAX_BACKUP_COUNT);
        
        localStorage.setItem(BACKUP_KEY, JSON.stringify(filteredBackups));
        _lastBackupTime = Date.now();
        
    } catch (error) {
    }
}

// Restore from backup
function restoreFromBackup(backupIndex = 0, skipConfirm = false) {
    try {
        const backups = JSON.parse(localStorage.getItem(BACKUP_KEY) || '[]');
        if (backups.length === 0) {
            showNotification('Không có bản sao lưu nào!', 'error');
            return false;
        }
        
        const backup = backups[backupIndex];
        if (!backup || !backup.notes) {
            showNotification('Bản sao lưu không hợp lệ!', 'error');
            return false;
        }
        
        // Skip confirmation for automatic restore
        if (!skipConfirm) {
        if (!confirm(`Khôi phục từ bản sao lưu ngày ${new Date(backup.timestamp).toLocaleString()}?\n\nSẽ ghi đè dữ liệu hiện tại!`)) {
            return false;
            }
        }
        
        window.appData.notes = backup.notes;
        renderNotesList();
        renderNotesCategories();
        saveNotesToStorage();
        
        showNotification(`Đã khôi phục ${backup.notes.length} ghi chú!`, 'success');
        return true;
    } catch (error) {
        console.error('Restore failed:', error);
        showNotification('Khôi phục thất bại!', 'error');
        return false;
    }
}

// Auto-backup before risky operations
function autoBackup() {
    const now = Date.now();
    if (now - _lastBackupTime > 300000) { // 5 minutes
        createBackup();
        _lastBackupTime = now;
    }
}

// Load notes from localStorage with backup support
function loadNotesFromStorage() {
    try {
        const saved = localStorage.getItem('pdc_app_data');
        if (saved) {
            const parsed = JSON.parse(saved);
            if (parsed.notes && Array.isArray(parsed.notes)) {
                window.appData.notes = parsed.notes;
                _dataIntegrityCheck = true;
            }
        }
        
        // Create initial backup if none exists
        if (window.appData.notes.length > 0) {
            autoBackup();
        }
    } catch (error) {
        console.error('Load notes failed:', error);
        // ⚠️ DISABLED: Do NOT clear notes on load error
        // Keep existing notes safe and try to restore from backup (skip confirmation)
        if (restoreFromBackup(0, true)) {
            showNotification('Đã khôi phục từ bản sao lưu!', 'success');
        } else {
            // Only clear if no backup available and no existing notes
            if (!window.appData.notes || window.appData.notes.length === 0) {
                window.appData.notes = [];
            }
        }
    }
}

// Update notes tab (called from main app)
function updateNotesTab() {
    renderNotesList();
    renderNotesCategories();
    // Pull latest when user switches to Notes tab with real-time sync
    try { 
        refreshNotesFromSheets(true); // Force refresh for real-time experience
    } catch {}
}
window.updateNotesTab = updateNotesTab;

// REMOVED: Complex periodic sync - using simple approach like products

// REMOVED: Complex sync functions - using simple approach like products

// REMOVED: Complex fetch functions - using simple approach like products

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




// Utilities to control from UI/Console if needed (EXACTLY like products)
window.loadNotesFromGoogleSheets = loadNotesFromGoogleSheets;
window.saveNotesToGoogleSheets = saveNotesToGoogleSheets;


window.createBackup = createBackup;
window.restoreFromBackup = restoreFromBackup;

// Auto-save debounce helper (EXACTLY like products)
function queueNotesAutoSave() {
    if (_notesAutoSaveTimer) {
        console.log('⏰ [NOTES AUTO-SAVE] Clear timer cũ...');
        clearTimeout(_notesAutoSaveTimer);
    }
    console.log('⏰ [NOTES AUTO-SAVE] Đã lên lịch tự động lưu sau 3 giây...');
    _notesAutoSaveTimer = setTimeout(() => {
        console.log('🚀 [NOTES AUTO-SAVE] Thực hiện tự động lưu vào database...');
        saveNotesToGoogleSheets().then(() => {
            console.log('✅ [NOTES AUTO-SAVE] Hoàn thành lưu vào database');
        }).catch((error) => {
            console.error('❌ [NOTES AUTO-SAVE] Lỗi khi lưu:', error);
        });
        _notesAutoSaveTimer = null;
    }, 3000); // 3 seconds delay - faster than products for better UX
}

// Save notes to Google Sheets (EXACTLY like products)
async function saveNotesToGoogleSheets() {
    try {
        console.log('🔄 [NOTES SYNC] Bắt đầu lưu ghi chú vào database...');
        console.log('📊 [NOTES SYNC] Số lượng notes:', (window.appData.notes || []).length);
        console.log('📊 [NOTES SYNC] Notes data:', window.appData.notes);
        showNotification('Đang lưu ghi chú vào Google Sheets...', 'info');
        
        // Convert notes data to Google Sheets format
        const notes = (window.appData.notes || []).map(note => ({
            id: note.id,
            orderCode: note.orderCode || '',
            chatLink: note.chatLink || '',
            content: note.content || '',
            status: note.status || 'active',
            createdAt: note.createdAt || new Date().toISOString(),
            updatedAt: note.updatedAt || new Date().toISOString(),
            tags: note.tags || ''
        }));
        
        console.log('📤 [NOTES SYNC] Dữ liệu gửi lên server:', {
            count: notes.length,
            notes: notes.map(n => ({ id: n.id, content: n.content.substring(0, 50) + '...', status: n.status }))
        });
        
        const payload = {
            action: 'notesUpsert',
            notes: notes
        };
        
        console.log('🌐 [NOTES SYNC] Gửi request đến:', window.GAS_URL);
        
        const response = await fetch(`${window.GAS_URL}`, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify(payload)
        });
        
        console.log('📡 [NOTES SYNC] Response status:', response.status);
        
        const result = await response.json();
        console.log('📥 [NOTES SYNC] Server response:', result);
        
        if (result.success) {
            console.log('✅ [NOTES SYNC] THÀNH CÔNG! Đã lưu vào database:', {
                rowsAffected: result.rowsAffected,
                message: result.message,
                timestamp: new Date().toLocaleString()
            });
            // Chỉ hiển thị thông báo khi save thủ công, không hiển thị khi auto-save
            if (!_notesAutoSaveTimer) {
                showNotification(`Đã lưu ${notes.length} ghi chú`, 'success', 2000);
            }
        } else {
            throw new Error(result.message || 'Lỗi lưu dữ liệu');
        }
        
    } catch (error) {
        console.error('❌ [NOTES SYNC] LỖI khi lưu vào database:', error);
        showNotification('Lỗi: ' + error.message, 'error');
    }
}

// Load notes from Google Sheets (EXACTLY like products)
async function loadNotesFromGoogleSheets() {
    try {
        
        // Hiển thị loading indicator nhẹ nhàng
        const container = document.getElementById('notesList');
        if (container && !container.querySelector('.loading-indicator')) {
            const loadingEl = document.createElement('div');
            loadingEl.className = 'loading-indicator';
            loadingEl.innerHTML = '<div class="loading-spinner"></div>';
            loadingEl.style.cssText = 'position: absolute; top: 20px; right: 20px; z-index: 1000;';
            container.appendChild(loadingEl);
        }
        
        
        const response = await fetch(`${window.GAS_URL}?action=notesList`);
        
        const result = await response.json();
        
        if (result.success && Array.isArray(result.data)) {
            // Convert Google Sheets data to app format
            const notes = result.data.map(item => ({
                id: item.id || generateUUID(),
                orderCode: item.orderCode || '',
                chatLink: item.chatLink || '',
                content: item.content || '',
                status: item.status || 'active',
                createdAt: item.createdAt || new Date().toISOString(),
                updatedAt: item.updatedAt || new Date().toISOString(),
                tags: item.tags || ''
            }));
            
            
            // Cập nhật dữ liệu mà không re-render ngay
            window.appData.notes = notes;
            appData.metadata.lastUpdated = new Date().toISOString();
            
            // Loại bỏ loading indicator
            const loadingEl = document.querySelector('.loading-indicator');
            if (loadingEl) loadingEl.remove();
            
            // Chỉ render một lần cuối cùng
            renderNotesList();
            renderNotesCategories();
            
            // Chỉ hiển thị notification nếu có dữ liệu mới và khác với local
            const localCount = (window.appData.notes || []).length;
            if (notes.length > 0 && notes.length !== localCount) {
                showNotification(`Đã đồng bộ ${notes.length} ghi chú`, 'success', 2000);
            }
        } else {
            throw new Error(result.message || result.error || 'Không thể tải dữ liệu');
        }
        
    } catch (error) {
        console.error('❌ [NOTES LOAD] LỖI khi tải từ database:', error);
        
        // Loại bỏ loading indicator
        const loadingEl = document.querySelector('.loading-indicator');
        if (loadingEl) loadingEl.remove();
        
        // Không hiển thị error notification để tránh flicker
        console.log('⚠️ [NOTES LOAD] Sử dụng dữ liệu local thay vì database');
    }
}

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
// REMOVED: Complex sync controls - using simple approach like products

// Search notes functionality
function searchNotes() {
    const searchInput = document.getElementById('notesSearchInput');
    if (!searchInput) return;
    
    const searchTerm = searchInput.value.trim().toLowerCase();
    window.__notesSearchTerm = searchTerm;
    
    // Reset to first page when searching
    _notesCurrentPage = 1;
    
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

//

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
        
        // Auto-sync to Google Sheets (like products)
        console.log('🗑️ [NOTES DELETE] Đã xóa ghi chú, sẽ tự động cập nhật database...');
        queueNotesAutoSave();
        
        // Thông báo ngắn gọn
        showNotification('Đã xóa!', 'success', 1500);
        
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

// Notes notifications delegate to the global toast system (refund-style)
function showNotification(message, type = 'info', title = '') {
    try {
        // Direct mapping to createToast with proper type handling
        if (typeof window.createToast === 'function') {
            window.createToast(message, type, 3000);
            return;
        }
        if (typeof window.showNotification === 'function' && window.showNotification !== showNotification) {
            window.showNotification(message, type);
            return;
        }
    } catch (error) {
        // Silent fallback
    }
}


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

// REMOVED: Complex refresh scheduling - using simple approach like products

// Pagination functions
function createPaginationHtml(currentPage, totalPages, type) {
    if (totalPages <= 1) {
        return '';
    }
    
    let paginationHtml = '<div class="pagination">';
    
    // Previous button
    if (currentPage > 1) {
        paginationHtml += `<button class="pagination-btn" onclick="goToPage(${currentPage - 1}, '${type}')">‹</button>`;
    } else {
        paginationHtml += '<button class="pagination-btn disabled">‹</button>';
    }
    
    // Page numbers
    const startPage = Math.max(1, currentPage - 2);
    const endPage = Math.min(totalPages, currentPage + 2);
    
    if (startPage > 1) {
        paginationHtml += `<button class="pagination-btn" onclick="goToPage(1, '${type}')">1</button>`;
        if (startPage > 2) {
            paginationHtml += '<span class="pagination-ellipsis">...</span>';
        }
    }
    
    for (let i = startPage; i <= endPage; i++) {
        if (i === currentPage) {
            paginationHtml += `<button class="pagination-btn active">${i}</button>`;
        } else {
            paginationHtml += `<button class="pagination-btn" onclick="goToPage(${i}, '${type}')">${i}</button>`;
        }
    }
    
    if (endPage < totalPages) {
        if (endPage < totalPages - 1) {
            paginationHtml += '<span class="pagination-ellipsis">...</span>';
        }
        paginationHtml += `<button class="pagination-btn" onclick="goToPage(${totalPages}, '${type}')">${totalPages}</button>`;
    }
    
    // Next button
    if (currentPage < totalPages) {
        paginationHtml += `<button class="pagination-btn" onclick="goToPage(${currentPage + 1}, '${type}')">›</button>`;
    } else {
        paginationHtml += '<button class="pagination-btn disabled">›</button>';
    }
    
    paginationHtml += '</div>';
    return paginationHtml;
}

function goToPage(page, type) {
    if (type === 'notes') {
        _notesCurrentPage = page;
        renderNotesList();
    } else if (type === 'products') {
        // Call the products goToPage function
        if (typeof window.goToProductsPage === 'function') {
            window.goToProductsPage(page, type);
        }
    }
}

// Expose pagination functions
window.goToPage = goToPage;



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

//

// Edit note function
function editNote(noteId) {
    const note = window.appData.notes.find(n => n.id === noteId);
    if (!note) {
        showNotification('Không tìm thấy ghi chú!', 'error');
        return;
    }
    
    // Create edit modal
    showEditNoteModal(note);
}
window.editNote = editNote;

// Show edit note modal
function showEditNoteModal(note) {
    // Remove existing modal if any
    const existingModal = document.querySelector('.edit-note-modal');
    if (existingModal) {
        existingModal.remove();
    }
    
    const modal = document.createElement('div');
    modal.className = 'edit-note-modal';
    modal.innerHTML = `
        <div class="modal-overlay" onclick="closeEditNoteModal()"></div>
        <div class="modal-content">
            <div class="modal-header">
                <h3>Chỉnh sửa ghi chú</h3>
                <button class="modal-close" onclick="closeEditNoteModal()">×</button>
            </div>
            <div class="modal-body">
                <div class="form-group">
                    <label class="form-label">Mã đơn hàng</label>
                    <input type="text" id="editOrderCode" class="form-input" value="${note.orderCode || ''}" placeholder="Nhập mã đơn hàng...">
                </div>
                <div class="form-group">
                    <label class="form-label">Link chat</label>
                    <input type="text" id="editChatLink" class="form-input" value="${note.chatLink || ''}" placeholder="Nhập link chat...">
                </div>
                <div class="form-group">
                    <label class="form-label">Tiêu đề</label>
                    <input type="text" id="editNoteTitle" class="form-input" value="${note.title || ''}" placeholder="Nhập tiêu đề...">
                </div>
                <div class="form-group">
                    <label class="form-label">Nội dung</label>
                    <textarea id="editNoteContent" class="form-textarea" rows="4" placeholder="Nhập nội dung ghi chú...">${note.content || ''}</textarea>
                </div>
                <div class="form-group">
                    <label class="form-label">Loại ghi chú</label>
                    <div class="note-type-options">
                        <label class="radio-option">
                            <input type="radio" name="noteType" value="chua-xu-ly" ${(note.tags || '').includes('chua-xu-ly') ? 'checked' : ''}>
                            <span class="radio-label">Chưa xử lý</span>
                        </label>
                        <label class="radio-option">
                            <input type="radio" name="noteType" value="note-thong-tin" ${(note.tags || '').includes('note-thong-tin') ? 'checked' : ''}>
                            <span class="radio-label">Note thông tin</span>
                        </label>
                    </div>
                </div>
            </div>
            <div class="modal-footer">
                <button class="btn btn-outline" onclick="closeEditNoteModal()">Hủy</button>
                <button class="btn btn-primary" onclick="saveEditNote('${note.id}')">Lưu</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    
    // Focus on first input
    setTimeout(() => {
        document.getElementById('editOrderCode').focus();
    }, 100);
}
window.showEditNoteModal = showEditNoteModal;

// Close edit note modal
function closeEditNoteModal() {
    const modal = document.querySelector('.edit-note-modal');
    if (modal) {
        modal.remove();
    }
}
window.closeEditNoteModal = closeEditNoteModal;

// Save edited note
function saveEditNote(noteId) {
    const note = window.appData.notes.find(n => n.id === noteId);
    if (!note) {
        showNotification('Không tìm thấy ghi chú!', 'error');
        return;
    }
    
    const orderCode = document.getElementById('editOrderCode').value.trim();
    const chatLink = document.getElementById('editChatLink').value.trim();
    const title = document.getElementById('editNoteTitle').value.trim();
    const content = document.getElementById('editNoteContent').value.trim();
    const noteType = document.querySelector('input[name="noteType"]:checked');
    const tags = noteType ? noteType.value : '';
    
    if (!content) {
        showNotification('Nhập nội dung ghi chú!', 'error');
        return;
    }
    
    // Update note
    note.orderCode = orderCode;
    note.chatLink = chatLink;
    note.title = title;
    note.content = content;
    note.tags = tags;
    note.updatedAt = new Date().toISOString();
    
    // Close modal
    closeEditNoteModal();
    
    // Re-render list
    renderNotesList();
    renderNotesCategories();
    
    // Save to localStorage
    saveNotesToStorage();
    
    // Auto-sync to Google Sheets (like products)
    console.log('✏️ [NOTES UPDATE] Đã cập nhật ghi chú, sẽ tự động lưu vào database...');
    queueNotesAutoSave();
    
    // Thông báo ngắn gọn
    showNotification('Đã cập nhật!', 'success', 1500);
}
window.saveEditNote = saveEditNote;

// Format note date with detailed time for old notes
function formatNoteDateDetailed(dateString) {
    if (!dateString) return '';
    
    const date = new Date(dateString);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const noteDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    
    // If it's today, show time only
    if (noteDate.getTime() === today.getTime()) {
        return date.toLocaleTimeString('vi-VN', { 
            hour: '2-digit', 
            minute: '2-digit' 
        });
    }
    
    // If it's not today, show full date and time
    return date.toLocaleString('vi-VN', {
        day: '2-digit',
        month: '2-digit', 
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// Scientific Filter System
let currentStatusFilter = 'pending';
let currentTimeFilter = 'all';
let currentSortOrder = 'newest';

// Apply scientific filter
function applyScientificFilter() {
    const notes = window.appData.notes || [];
    let filteredNotes = [...notes];
    
    // Apply status filter
    filteredNotes = filteredNotes.filter(note => {
        const isInfoNote = (note.tags || '').includes('note-thong-tin');
        const isCompleted = note.status === 'completed' || note.status === 'đã hoàn thành';
        
        switch (currentStatusFilter) {
            case 'pending':
                return !isCompleted && !isInfoNote;
            case 'info':
                return isInfoNote && !isCompleted;  // ✅ SỬA: Loại bỏ notes đã hoàn thành
            case 'completed':
                return isCompleted;
            default:
                return true;
        }
    });
    
    // Apply time filter
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    filteredNotes = filteredNotes.filter(note => {
        const noteDate = new Date(note.createdAt);
        const noteDay = new Date(noteDate.getFullYear(), noteDate.getMonth(), noteDate.getDate());
        
        switch (currentTimeFilter) {
            case 'today':
                return noteDay.getTime() === today.getTime();
            case 'yesterday':
                return noteDay.getTime() === yesterday.getTime();
            default:
                return true;
        }
    });
    
    // Apply sorting
    switch (currentSortOrder) {
        case 'newest':
            filteredNotes.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
            break;
        case 'oldest':
            filteredNotes.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
            break;
        case 'alphabetical':
            filteredNotes.sort((a, b) => {
                const aTitle = (a.title || a.chatLink || '').toLowerCase();
                const bTitle = (b.title || b.chatLink || '').toLowerCase();
                return aTitle.localeCompare(bTitle);
            });
            break;
    }
    
    return filteredNotes;
}

// Render filtered notes with scientific approach
function renderScientificFilteredNotes() {
    const filteredNotes = applyScientificFilter();
    const container = document.getElementById('notesList');
    if (!container) return;
    
    // Show/hide bulk actions based on current status filter (completed)
    try {
        const bulkActionsContainer = document.getElementById('bulkActionsContainer');
        if (bulkActionsContainer) {
            bulkActionsContainer.style.display = (currentStatusFilter === 'completed') ? 'block' : 'none';
        }
    } catch {}
    
    if (filteredNotes.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">🔍</div>
                <h4>Không tìm thấy ghi chú</h4>
                <p>Thử thay đổi bộ lọc để xem thêm ghi chú</p>
            </div>
        `;
        return;
    }
    
    const cards = filteredNotes.map((note, index) => {
        const isInfoNote = (note.tags || '').includes('note-thong-tin');
        let typeLabel, typeClass;
        
        if (note.status === 'completed' || note.status === 'đã hoàn thành') {
            typeLabel = 'Hoàn thành';
            typeClass = 'note-completed';
        } else if (isInfoNote) {
            typeLabel = 'Thông tin';
            typeClass = 'note-info';
        } else {
            typeLabel = 'Chưa xử lý';
            typeClass = 'note-pending';
        }
        
        let headerContent = '';
        if (isInfoNote) {
            const rawTitle = String(note.title || note.orderCode || '').trim();
            const fallback = String(note.content || '').split('\n')[0] || '';
            const titleToShow = (rawTitle || fallback || '');
            headerContent = `<div class="v3-title">${titleToShow.replace(/\n/g,'<br>')}</div>`;
        } else {
            const link = String(note.chatLink || '');
            const linkShort = link.length > 40 ? link.substring(0,40) + '…' : link;
            const linkTitle = linkShort || '—';
            headerContent = `<a class="v3-link" href="${link}" target="_blank" title="Mở link chat">${linkTitle}</a>`;
        }
        
        const checkboxHtml = (note.status === 'completed' || note.status === 'đã hoàn thành') ? 
            `<input type="checkbox" class="note-checkbox" data-note-id="${note.id}" onchange="updateBulkActions()">` : '';
        
        let cardType = '';
        if (note.status === 'completed' || note.status === 'đã hoàn thành') {
            cardType = 'completed';
        } else if (isInfoNote) {
            cardType = 'note-thong-tin';
        }
        // For pending cards, cardType remains empty string - no special styling
        
        return `
        <div class="note-cardv3 ${typeClass}" id="note-${note.id}" data-note-id="${note.id}" data-type="${cardType}">
            ${checkboxHtml}
            <div class="note-number">${index + 1}</div>
            <div class="v3-head">
                ${headerContent}
                <span class="v3-status ${typeClass}">${typeLabel}</span>
            </div>
            <div class="v3-body">${String(note.content || '').replace(/\n/g,'<br>')}</div>
            <div class="v3-foot">
                <span class="v3-time">${formatNoteDateDetailed(note.createdAt)}</span>
            </div>
            <div class="v3-actions">
                <button class="icon-btn" title="Chỉnh sửa" onclick="editNote('${note.id}')">✏️</button>
                ${(note.status === 'completed' || note.status === 'đã hoàn thành') ? '' : (isInfoNote ? '' : `<button class="icon-btn" title="Copy" onclick="copyNoteChatLink('${note.id}')">📋</button>`)}
                ${(note.status === 'completed' || note.status === 'đã hoàn thành') ? '' : `<button class="icon-btn ${isInfoNote ? 'deprecated' : 'ok'}" title="${isInfoNote ? 'Không dùng nữa' : 'Hoàn thành'}" onclick="${isInfoNote ? 'deprecateNote' : 'completeNote'}('${note.id}')">${isInfoNote ? '🚫' : '✅'}</button>`}
            </div>
        </div>`;
    }).join('');
    
    container.innerHTML = `<div class="notes-masonry">${cards}</div>`;
    
    // Update select-all and delete button state after render
    try { updateBulkActions(); } catch {}
}

// Initialize scientific filter system
function initScientificFilter() {
    // Status filter buttons
    document.querySelectorAll('.filter-option[data-filter]').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.filter-option[data-filter]').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentStatusFilter = btn.dataset.filter;
            renderScientificFilteredNotes();
        });
    });
    
    // Time filter buttons
    document.querySelectorAll('.filter-option[data-time]').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.filter-option[data-time]').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentTimeFilter = btn.dataset.time;
            renderScientificFilteredNotes();
        });
    });
    
    // Sort select
    const sortSelect = document.getElementById('sortSelect');
    if (sortSelect) {
        sortSelect.addEventListener('change', (e) => {
            currentSortOrder = e.target.value;
            renderScientificFilteredNotes();
        });
    }
}

// Override renderNotesList to use scientific filter
const originalRenderNotesList = window.renderNotesList;
window.renderNotesList = function() {
    if (document.querySelector('.scientific-filter')) {
        renderScientificFilteredNotes();
    } else {
        originalRenderNotesList();
    }
};

// Initialize scientific filter when module loads
setTimeout(() => {
    initScientificFilter();
}, 100);

// Masonry-like spanning for CSS Grid (LTR) so varying heights don't affect others
function relayoutNotesGrid() {
    const grid = document.querySelector('.notes-grid');
    if (!grid) return;
    // revert to default grid rows
    grid.querySelectorAll('.note-cardv3').forEach(card => {
        card.style.gridRowEnd = 'auto';
    });
}

// Recompute after renders and on resize
window.addEventListener('resize', () => requestAnimationFrame(relayoutNotesGrid));