
(function() {
    'use strict';
    // ===== DEBUG CONTROL =====
    const __PDC_DEBUG__ = false;
    
    // Global variables
    let selectedComboProducts = [];
    let selectedComboRefundProduct = null;
    let globalSearchSelectedIndex = -1;
    let currentSearchContext = null;

    // ===== DROPDOWN MENU HANDLING =====
    function initDropdowns() {
        const fileMenuBtn = document.getElementById('fileMenuBtn');
        const fileMenu = document.getElementById('fileMenu');
        
        if (fileMenuBtn && fileMenu) {
            fileMenuBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                const isOpen = fileMenu.classList.contains('show');
                
                document.querySelectorAll('.dropdown-menu.show').forEach(menu => {
                    menu.classList.remove('show');
                });
                
                if (!isOpen) {
                    fileMenu.classList.add('show');
                    fileMenuBtn.setAttribute('aria-expanded', 'true');
                } else {
                    fileMenu.classList.remove('show');
                    fileMenuBtn.setAttribute('aria-expanded', 'false');
                }
            });
            
            document.addEventListener('click', (e) => {
                if (!fileMenuBtn.contains(e.target) && !fileMenu.contains(e.target)) {
                    fileMenu.classList.remove('show');
                    fileMenuBtn.setAttribute('aria-expanded', 'false');
                }
            });
        }
    }

    // ===== CORE =====
    window.appData = { metadata: { lastUpdated: new Date().toISOString() }, products: [], categories: ["AI", "Công cụ"] };

    function formatPrice(n) { return new Intl.NumberFormat('en-US').format(Number(n) || 0); }
    function parsePrice(v) {
        if (typeof v === 'number') {
            return Number.isFinite(v) && v >= 0 ? Math.floor(v) : 0;
        }
        const cleaned = String(v || '').replace(/[^\d]/g, '');
        const num = cleaned ? Number(cleaned) : 0;
        return Number.isFinite(num) && num >= 0 ? num : 0;
    }
    function formatDMY(d) {
        const day = d.getDate().toString().padStart(2, '0');
        const month = (d.getMonth() + 1).toString().padStart(2, '0');
        const year = d.getFullYear();
        return `${day}/${month}/${year}`;
    }
    
    window.formatPrice = formatPrice;
    window.parsePrice = parsePrice;
    window.formatDMY = formatDMY;
    
    function bindPriceInput(el) { 
        if (!el) return; 
        el.addEventListener('input', e => {
            e.target.value = e.target.value.replace(/[^\d]/g, '');
        });
        el.addEventListener('blur', e => {
            const r = parsePrice(e.target.value);
            const isNumberType = (e.target.getAttribute('type') || '').toLowerCase() === 'number';
            e.target.value = r ? (isNumberType ? String(r) : formatPrice(r)) : "";
        });
    }
    function normalizeText(s) {
        return (s || '').toString().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    }
    function getCategoryShortLabel(category) {
        const c = String(category || '').trim();
        if (c === 'AI') return 'AI';
        if (c === 'Công cụ') return 'CC';
        if (c === 'Combo') return 'CB';
        if (c === 'AI Services') return 'AI';
        return c || '';
    }

    function sanitizeProducts() {
        if (!Array.isArray(appData.products)) return;
        appData.products = appData.products.map(p => {
            let duration = Number(p?.duration);
            if (!Number.isFinite(duration) || duration <= 0) duration = 1;
            let unit = p?.durationUnit === 'ngày' || p?.durationUnit === 'tháng' || p?.durationUnit === 'năm' ? p.durationUnit : 'tháng';
            // Normalize legacy categories
            let category = p?.category === 'AI Services' ? 'AI' : (p?.category || '');
            return { ...p, duration, durationUnit: unit, category };
        });
    }

    function parseDurationFromText(text) {
        const m = String(text || '').match(/(\d{1,3})\s*(ngay|ngày|thang|tháng|nam|năm)/i);
        if (m) {
            const duration = parseInt(m[1]) || 1;
            const unitText = m[2].toLowerCase();
            let unit = 'tháng';
            if (/ngay|ngày/i.test(unitText)) unit = 'ngày';
            else if (/nam|năm/i.test(unitText)) unit = 'năm';
            return { duration, unit };
        }
        const n = parseInt(String(text || '').replace(/[^\d]/g, ''));
        return { duration: Number.isFinite(n) && n > 0 ? n : 0, unit: 'tháng' };
    }
    function showNotification(msg, type = 'success', t = 3000) { 
        // Always show for success/error; keep old heuristic for legacy callers
        const shouldShowToast = (
            type === 'success' ||
            type === 'error' ||
            msg.includes('Đã copy') || msg.includes('Copy') || msg.includes('đã copy')
        );

        if (shouldShowToast) {
            createToast(msg, type, t);
        }
    }
    // Export notification function
    window.showNotification = showNotification;

    function createToast(message, type = 'success', duration = 3000) {
        // Ensure a single top-right container for stacking (prevent duplicates)
        let container = document.getElementById('toastContainer');
        if (!container) {
            container = document.createElement('div');
            container.id = 'toastContainer';
            document.body.appendChild(container);
        }

        // Style container for vertical stacking (push down older toasts)
        Object.assign(container.style, {
            position: 'fixed',
            top: '20px',
            right: '20px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-end',
            gap: '10px',
            zIndex: '10000',
            pointerEvents: 'none'
        });

        // Create toast element
        const toast = document.createElement('div');
        toast.className = `toast-notification toast-${type}`;
        toast.textContent = message;

        // Add styles
        Object.assign(toast.style, {
            padding: '12px 20px',
            borderRadius: '8px',
            color: 'white',
            fontWeight: '500',
            fontSize: '14px',
            maxWidth: '320px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
            transform: 'translateX(100%)',
            transition: 'transform 0.3s ease, opacity 0.3s ease',
            opacity: '0',
            pointerEvents: 'auto'
        });

        // Set background color based on type
        if (type === 'success') {
            toast.style.background = 'linear-gradient(135deg, #10b981, #059669)';
        } else if (type === 'error') {
            toast.style.background = 'linear-gradient(135deg, #ef4444, #dc2626)';
        } else {
            toast.style.background = 'linear-gradient(135deg, #3b82f6, #2563eb)';
        }

        // Add to container (prepend so new appears on top, pushing old down)
        container.prepend(toast);

        // Cap number of concurrent toasts
        const MAX_TOASTS = 4;
        while (container.children.length > MAX_TOASTS) {
            container.lastElementChild && container.lastElementChild.remove();
        }

        // Animate in
        requestAnimationFrame(() => {
            toast.style.transform = 'translateX(0)';
            toast.style.opacity = '1';
        });

        // Auto remove
        setTimeout(() => {
            toast.style.transform = 'translateX(100%)';
            toast.style.opacity = '0';
            setTimeout(() => toast.remove(), 300);
        }, Math.max(1500, duration || 0));
    }
    function generateUUID() {
        try {
            if (window.crypto && typeof window.crypto.randomUUID === 'function') {
                return window.crypto.randomUUID();
            }
        } catch {}
        // Fallback with timestamp prefix for better uniqueness
        return 'xxxx-xxxx-xxxx-xxxx'.replace(/[x]/g, () =>
            (Date.now() + Math.random() * 16 | 0).toString(16)
        );
    }

    // header/tabs/menu
    function updateHeaderStats() { 
        const n = (appData.products || []).length; 
        const pc1 = document.getElementById('productCountBadge');
        if (pc1) pc1.textContent = n;
        const pc2 = document.getElementById('productCountHeader');
        if (pc2) pc2.textContent = n;
        const listCount = document.getElementById('productsCount');
        if (listCount) listCount.textContent = `${n} sản phẩm`;
        const lu = document.getElementById('lastUpdated'); 
        if (lu) lu.textContent = new Date(appData.metadata.lastUpdated).toLocaleTimeString('vi-VN', {hour: '2-digit', minute: '2-digit'}); 
    }

    function switchTab(id) { 
        // Update tab content
        document.querySelectorAll('.tab-content').forEach(e => e.classList.remove('active')); 
        document.getElementById(id)?.classList.add('active'); 
        
        // Update sidebar navigation
        document.querySelectorAll('.nav-item').forEach(btn => btn.classList.remove('active'));
        document.querySelector(`[data-tab="${id}"]`)?.classList.add('active');
        
        // removed secondary sidebar toggle
        // Toggle notes mini dock next to main sidebar
        try {
            const dock = document.getElementById('notesMiniSideDock');
            const app = document.querySelector('.app-container');
            if (dock && app) {
                const show = id === 'notes';
                dock.style.display = show ? 'block' : 'none';
                app.classList.toggle('with-notes-dock', show);
                if (show && window.renderMiniSidebarCategories) {
                    const src = document.getElementById('notesCategoryList');
                    const dst = document.getElementById('notesMiniCategoryListDock');
                    if (src && dst) dst.innerHTML = src.innerHTML;
                }
            }
        } catch {}

        // Update page title and subtitle
        const titles = {
            'admin': { title: 'Quản lý sản phẩm', subtitle: 'Thêm, chỉnh sửa và quản lý các gói sản phẩm' },
            'refund': { title: 'Tính hoàn tiền', subtitle: 'Tính toán số tiền hoàn lại cho khách hàng' },
            'upgrade': { title: 'Đổi gói sản phẩm', subtitle: 'Tính toán số tiền bù khi khách hàng đổi sang gói khác' },
            'schedule': { title: 'Lịch làm việc', subtitle: 'Quản lý lịch làm việc của team 4 người' },
            'notes': { title: 'Ghi chú khách hàng', subtitle: 'Tạo và quản lý ghi chú cho từng khách hàng' },
            'quote': { title: 'Tính báo giá', subtitle: 'Tính báo giá với phí bảo hành 10% và VAT 8%' },
            'family-check': { title: 'Check User Family MS', subtitle: 'So sánh danh sách email từ Microsoft Family với thông tin lưu trữ' }
        };
        
        const pageTitle = document.getElementById('pageTitle');
        const pageSubtitle = document.getElementById('pageSubtitle');
        if (pageTitle && pageSubtitle && titles[id]) {
            pageTitle.textContent = titles[id].title;
            pageSubtitle.textContent = titles[id].subtitle;
        }
    }
    // Export immediately to prevent undefined errors
    window.switchTab = switchTab;


    // ===== GOOGLE SHEETS INTEGRATION =====
    // 🆕 URL APPS SCRIPT MỚI CỦA BẠN
    // 🔄 THAY BẰNG URL MỚI SAU KHI DEPLOY (nếu có)
    const GOOGLE_APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyZ0Ag2Bqm4iPMWDsnUZbGthWhVh9K-PaXdGis0U6cz2lfI1bx2brOmTrabXxmJ5rawuA/exec';
    const GOOGLE_SHEET_TOKEN = 'PDC123456';
    // Expose for other modules (notes)
    try { window.GAS_URL = GOOGLE_APPS_SCRIPT_URL; window.GAS_TOKEN = GOOGLE_SHEET_TOKEN; } catch {}

    // Load data from Google Sheets via Apps Script API
    async function loadFromGoogleSheets() {
        try {
            showNotification('Đang tải dữ liệu từ Google Sheets...', 'info');
            
            // Apps Script V2 uses GET without parameters for loading
            const response = await fetch(`${GOOGLE_APPS_SCRIPT_URL}`);
            const result = await response.json();
            
            
            if (result.success && Array.isArray(result.data)) {
                // Convert Google Sheets data to app format
                const products = result.data.map(item => {
                    // duration fallbacks: duration | qty | quantity | months | note | name | unit like "3 tháng"
                    let duration = parseInt(item.duration);
                    let unit = item.unit || 'tháng';
                    if (!Number.isFinite(duration) || duration <= 0) duration = parseInt(item.qty);
                    if (!Number.isFinite(duration) || duration <= 0) duration = parseInt(item.quantity);
                    if (!Number.isFinite(duration) || duration <= 0) duration = parseInt(item.months);
                    if (!Number.isFinite(duration) || duration <= 0) {
                        const fromUnit = parseDurationFromText(item.unit);
                        if (fromUnit.duration > 0) { duration = fromUnit.duration; unit = fromUnit.unit; }
                    }
                    if (!Number.isFinite(duration) || duration <= 0) {
                        const fromNote = parseDurationFromText(item.note);
                        if (fromNote.duration > 0) { duration = fromNote.duration; unit = fromNote.unit; }
                    }
                    if (!Number.isFinite(duration) || duration <= 0) {
                        const fromName = parseDurationFromText(item.name);
                        if (fromName.duration > 0) { duration = fromName.duration; unit = fromName.unit; }
                    }
                    if (!Number.isFinite(duration) || duration <= 0) duration = 1;

                    // 🆕 NEW SHEET V2 - Direct mapping from H & I columns
                    const category = (item.category || item.H || 'AI') === 'AI Services' ? 'AI' : (item.category || item.H || 'AI');
                    const actualNote = item.note || '';
                    
                    const product = {
                        id: item.id || generateUUID(),
                        name: item.name || '',
                        duration,
                        durationUnit: unit === 'ngày' || unit === 'tháng' || unit === 'năm' ? unit : 'tháng',
                        price: parseInt(item.price) || 0,
                        category: category,
                        note: actualNote
                    };
                    
                    // 🆕 NEW SHEET V2 - Parse combo products from column I
                    const comboData = item.comboProducts || item.I || '';
                    if (category === 'Combo' && comboData) {
                        try {
                            if (typeof comboData === 'string' && comboData.trim()) {
                                // Split by comma and clean up IDs
                                product.comboProducts = comboData.split(',').map(id => id.trim()).filter(id => id);
                            } else if (Array.isArray(comboData)) {
                                product.comboProducts = comboData;
                            }
                        } catch (e) {
                            // Handle error silently
                        }
                    }
                    
                    return product;
                });
                
                appData.products = products;
                window.products = products; // Set window.products for refund module
                sanitizeProducts();
                appData.metadata.lastUpdated = new Date().toISOString();
                
                const combos = products.filter(p => p.category === 'Combo');
                
                renderProductList();
                updateHeaderStats();
                updateTabs();
                if (typeof refreshRefundState === 'function') refreshRefundState();
                showNotification(`Đã tải ${products.length} sản phẩm từ Google Sheets!`);
            } else {
                throw new Error(result.message || result.error || 'Không thể tải dữ liệu');
            }
            
        } catch (error) {
            showNotification('Lỗi: ' + error.message, 'error');
        }
    }

    // Save data to Google Sheets via Apps Script API
    async function saveToGoogleSheets() {
        try {
            showNotification('Đang lưu dữ liệu vào Google Sheets...', 'info');
            
            // Convert app data to Google Sheets format
            const products = appData.products.map(product => {
                const sheetProduct = {
                    id: product.id,           // Column A
                    name: product.name,       // Column B  
                    price: product.price,     // Column C
                    duration: product.duration, // Column D
                    unit: product.durationUnit, // Column E
                    note: product.note || '', // Column F
                    updateAT: new Date().toISOString(), // Column G
                    // 🆕 NEW SHEET V2 - Direct mapping to H & I columns
                    H: (product.category === 'AI Services' ? 'AI' : (product.category || 'AI')),      // Column H = category
                    I: product.category === 'Combo' && product.comboProducts ? 
                       product.comboProducts.join(',') : ''    // Column I = comboProducts
                };
                
                
                return sheetProduct;
            });
            
            // Also save combo data to local JSON as backup
            saveComboDataToLocal();
            
            
            // POST with text/plain to avoid preflight; token in query
            const url = `${GOOGLE_APPS_SCRIPT_URL}?token=${encodeURIComponent(GOOGLE_SHEET_TOKEN)}`;
            const payload = { action: 'upsert', products };
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                body: JSON.stringify(payload)
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const result = await response.json();
            
            if (result.success) {
                appData.metadata.lastUpdated = new Date().toISOString();
                updateHeaderStats();
                showNotification(`Đã lưu ${products.length} sản phẩm vào Google Sheets!`);
            } else {
                throw new Error(result.message || result.error || 'Không thể lưu dữ liệu');
            }
            
        } catch (error) {
            showNotification('Lỗi: ' + error.message, 'error');
        }
    }

    // Delete products on Google Sheets via Apps Script API
    async function deleteFromGoogleSheets(ids) {
        if (!Array.isArray(ids) || ids.length === 0) return;
        try {
            // ✅ ENABLED: Apps Script V2 confirmed working!
            // return;
            
            const url = `${GOOGLE_APPS_SCRIPT_URL}?token=${encodeURIComponent(GOOGLE_SHEET_TOKEN)}`;
            const payload = { action: 'delete', ids };
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                body: JSON.stringify(payload)
            });
            if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            const result = await response.json();
            if (!result.success) throw new Error(result.message || result.error || 'Không thể xóa trên Google Sheets');
            showNotification('Đã xóa trên Google Sheets!');
        } catch (err) {
            showNotification('Lỗi xóa trên Google Sheets: ' + err.message, 'error');
        }
    }

    // export/import
    function exportData() { const blob = new Blob([JSON.stringify(appData, null, 2)], { type: 'application/json' }); const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'products.json'; a.click(); showNotification('Đã export!'); }
    function importData() { document.getElementById('importFile').click(); }
    function handleImport() { const f = this.files?.[0]; if (!f) return; const r = new FileReader(); r.onload = () => { try { const d = JSON.parse(r.result); appData.products = Array.isArray(d.products) ? d.products : []; appData.categories = d.categories || appData.categories; appData.metadata.lastUpdated = new Date().toISOString(); renderProductList(); updateHeaderStats(); updateTabs(); showNotification('Đã import!'); } catch { showNotification('File JSON không hợp lệ', 'error'); } }; r.readAsText(f); }
    async function loadProductsFromJSON() { try { const res = await fetch('/data/products.json', { cache: 'no-store' }); const d = await res.json(); appData.products = d.products || []; appData.categories = d.categories || appData.categories; appData.metadata.lastUpdated = new Date().toISOString(); renderProductList(); updateHeaderStats(); updateTabs(); showNotification('Đã tải data!'); } catch { showNotification('Không đọc được /data/products.json', 'error'); } }
    function saveToLocalStorage() { 
        try { 
            appData.metadata.lastUpdated = new Date().toISOString();
            localStorage.setItem('pdc_app_data', JSON.stringify(appData)); 
            updateHeaderStats();
            showNotification('Đã lưu vào Local Storage!'); 
        } catch { 
            showNotification('Lỗi lưu Local Storage!', 'error'); 
        } 
    }
    window.exportData = exportData; window.importData = importData; window.handleImport = handleImport; window.loadProductsFromJSON = loadProductsFromJSON; window.saveToLocalStorage = saveToLocalStorage;
    window.loadFromGoogleSheets = loadFromGoogleSheets; 
    window.saveToGoogleSheets = saveToGoogleSheets;


    // admin list
    function getFilters() { return { q: (document.getElementById('adminSearch')?.value || '').toLowerCase(), cat: (document.getElementById('categoryFilter')?.value || '') }; }
    function filterProducts() { renderProductList(); } window.filterProducts = filterProducts;
    function renderProductList() {
        const root = document.getElementById('productList'); 
        if (!root) return;
        
        const { q, cat } = getFilters();
        const items = (appData.products || []).filter(p => {
            const nameN = normalizeText(p.name);
            const catN = normalizeText(p.category);
            const qN = normalizeText(q);
            const okQ = !qN || nameN.includes(qN) || catN.includes(qN) || nameN.startsWith(qN);
            const okC = !cat || p.category === cat; 
            return okQ && okC;
        });
        
        // Update products count
        const productsCount = document.getElementById('productsCount');
        if (productsCount) productsCount.textContent = `${items.length} sản phẩm`;
        
        if (items.length === 0) { 
            root.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">📦</div>
                    <h4>Chưa có sản phẩm</h4>
                    <p>Hãy thêm sản phẩm đầu tiên của bạn</p>
                </div>
            `; 
            updateTabs(); 
            return; 
        }
        
        const group = {}; 
        items.forEach(p => { (group[p.category] ||= []).push(p); });
        
        // Render as table rows
        root.innerHTML = items.map(p => `
            <tr data-product-id="${p.id || p.name}">
                <td><input type="checkbox" class="checkbox" data-product-id="${p.id || p.name}"></td>
                <td class="product-name" data-product-name="${p.name}">
                    <div class="product-name-with-logo">
                        <div class="product-logo-cell"></div>
                        <div class="product-name-text">
                            ${p.name}
                            ${p.category === 'Combo' && p.comboProducts ? `<div class="combo-ais">${p.comboProducts.map(cp => cp.name).join(', ')}</div>` : ''}
                        </div>
                    </div>
                </td>
                <td><span class="product-category ${p.category === 'AI' ? 'category-ai' : p.category === 'Combo' ? 'category-combo' : p.category === 'Công cụ' ? 'category-tool' : ''}">${p.category}</span></td>
                <td class="product-duration">${Math.max(1, p.duration)} ${p.durationUnit}</td>
                <td class="product-price">${formatPrice(p.price)}đ</td>
                <td>
                    <div class="action-buttons">
                        <button class="action-btn edit-btn" data-action="edit" data-product-id="${p.id}">Sửa</button>
                        <button class="action-btn delete-btn" data-action="delete" data-product-id="${p.id}">Xóa</button>
                    </div>
                </td>
            </tr>
        `).join('');
        
        updateTabs();
        
        // Setup event delegation for action buttons
        setupActionButtonEvents();
        
        // Preload logos for better performance (run asynchronously)
        if (typeof preloadLogos === 'function' && items.length > 0) {
            setTimeout(() => {
                const productNames = items.map(p => p.name);
                preloadLogos(productNames);
            }, 100);
        }
    }
    function addProduct() {
        const name = document.getElementById('productName').value.trim();
        let duration = Number(document.getElementById('productDuration').value);
        const durationUnit = document.getElementById('durationUnit').value;
        // Robust parse to avoid locale/format edge cases
        const priceInputEl = document.getElementById('productPrice');
        const priceRaw = priceInputEl ? priceInputEl.value : '';
        let price = 0;
        try {
            price = parsePrice(priceRaw);
        } catch (_) {
            price = Number(String(priceRaw).replace(/[^\d]/g, '')) || 0;
        }
        const categorySelect = document.getElementById('productCategory');
        const category = categorySelect ? categorySelect.value : '';
        
        // Validation & sane defaults
        if (!name) { showNotification('Nhập tên sản phẩm!', 'error'); return; }
        if (!Number.isFinite(duration) || duration <= 0) duration = 1;
        if (!Number.isFinite(price) || price <= 0) {
            showNotification('Nhập giá hợp lệ!', 'error');
            return;
        }
        if (!category) {
            showNotification('Vui lòng chọn danh mục!', 'error');
            if (categorySelect) categorySelect.focus();
            return;
        }
        const unit = (durationUnit === 'ngày' || durationUnit === 'tháng' || durationUnit === 'năm') ? durationUnit : 'tháng';
        
        // Check for duplicate product (same name + duration + unit)
        const existingProduct = appData.products.find(p => 
            p.name.toLowerCase() === name.toLowerCase() && 
            p.duration === duration && 
            p.durationUnit === unit
        );
        
        if (existingProduct) {
            showNotification(`Sản phẩm "${name} ${duration} ${unit}" đã tồn tại!`, 'error');
            return;
        }
        
        const product = { id: generateUUID(), name, duration, durationUnit: unit, price, category };
        
        // Add combo products if category is Combo
        if (category === 'Combo') {
            // Get selected AI products from checkboxes
            const selectedAICheckboxes = document.querySelectorAll('#aiSelectionGrid input[type="checkbox"]:checked');
            if (selectedAICheckboxes.length === 0) {
                showNotification('Vui lòng chọn ít nhất 1 AI cho combo!', 'error');
                return;
            }
            
            // Get product IDs from selected AI names
            const selectedAINames = Array.from(selectedAICheckboxes).map(cb => cb.value);
            const selectedAIProducts = appData.products.filter(p => 
                (p.category === 'AI') && 
                selectedAINames.includes(p.name)
            );
            
            if (selectedAIProducts.length === 0) {
                showNotification('Không tìm thấy sản phẩm AI đã chọn!', 'error');
                return;
            }
            
            product.comboProducts = selectedAIProducts.map(p => p.id);
        }
        
        appData.products.push(product);
        appData.metadata.lastUpdated = new Date().toISOString();
        // Immediate sync for other tabs (refund/upgrade)
        try { window.products = appData.products.slice(); } catch {}
        ['productName', 'productDuration', 'productPrice'].forEach(id => document.getElementById(id).value = '');
        
        // Clear combo selection
        if (category === 'Combo') {
            // Clear AI checkboxes
            const aiCheckboxes = document.querySelectorAll('#aiSelectionGrid input[type="checkbox"]');
            aiCheckboxes.forEach(cb => cb.checked = false);
            document.getElementById('productCategory').value = 'AI';
        }
        
        // Refresh all dependent UIs immediately
        renderProductList(); updateHeaderStats(); if (typeof updateTabs === 'function') updateTabs(); if (typeof refreshRefundState === 'function') refreshRefundState(); showNotification('Đã thêm!');
        
        // Force load logo for the new product
        setTimeout(() => {
            if (typeof forceLoadLogo === 'function') {
                forceLoadLogo(product.name, product.id);
            }
        }, 100);
        
        // Debounced remote save (does not block UI)
        queueAutoSave();
    }
    
    function deleteProduct(productId) {
        // Show custom confirmation popup instead of browser confirm
        showDeleteConfirmation(productId);
    }
    
    function showDeleteConfirmation(productId) {
        const product = appData.products.find(p => p.id === productId);
        if (!product) {
            showNotification('Không tìm thấy sản phẩm!', 'error');
            return;
        }
        
        // Exact React design - NO overlay
        const popup = document.createElement('div');
        popup.className = 'popup-card';
        popup.innerHTML = `
            <!-- Header -->
            <div class="popup-header">
                <div class="warning-icon">
                    <svg class="warning-svg" fill="currentColor" viewBox="0 0 20 20">
                        <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
                    </svg>
                </div>
                <h3 class="popup-title">Xác nhận xóa sản phẩm</h3>
            </div>

            <!-- Content -->
            <div class="popup-content">
                <p class="popup-text">
                    Bạn có chắc chắn muốn xóa sản phẩm <strong>"${product.name} ${product.duration} ${product.durationUnit}"</strong>? 
                    Hành động này không thể hoàn tác.
                </p>
            </div>

            <!-- Buttons -->
            <div class="popup-buttons">
                <button class="btn-cancel" onclick="closeDeleteConfirmation()">Hủy</button>
                <button class="btn-confirm" onclick="confirmDeleteProduct('${productId}')">Xác nhận</button>
            </div>
        `;
        
        document.body.appendChild(popup);
        
        // Exact React CSS - NO overlay
        const style = document.createElement('style');
        style.textContent = `
            .popup-card {
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                z-index: 10000;
                background: white;
                border-radius: 8px;
                box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
                max-width: 448px;
                width: 100%;
                padding: 24px;
            }
            .popup-header {
                display: flex;
                align-items: center;
                margin-bottom: 16px;
            }
            .warning-icon {
                width: 32px;
                height: 32px;
                background: #fef3c7;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                margin-right: 12px;
            }
            .warning-svg {
                width: 20px;
                height: 20px;
                color: #d97706;
            }
            .popup-title {
                font-size: 18px;
                font-weight: 600;
                color: #111827;
                margin: 0;
            }
            .popup-content {
                margin-bottom: 24px;
            }
            .popup-text {
                color: #6b7280;
                margin: 0;
                line-height: 1.5;
            }
            .popup-buttons {
                display: flex;
                gap: 12px;
                justify-content: flex-end;
            }
            .popup-buttons button {
                padding: 8px 16px;
                border-radius: 8px;
                border: none;
                cursor: pointer;
                font-weight: 500;
                transition: all 0.2s;
            }
            .btn-cancel {
                background: #e5e7eb;
                color: #374151;
            }
            .btn-cancel:hover {
                background: #d1d5db;
            }
            .btn-confirm {
                background: #ef4444;
                color: white;
            }
            .btn-confirm:hover {
                background: #dc2626;
            }
        `;
        document.head.appendChild(style);
    }
    
    function closeDeleteConfirmation() {
        const popup = document.querySelector('.popup-card');
        if (popup) {
            popup.remove();
        }
    }
    
    function confirmDeleteProduct(productId) {
        const productIndex = appData.products.findIndex(p => p.id === productId);
        if (productIndex === -1) {
            showNotification('Không tìm thấy sản phẩm!', 'error');
            return;
        }
        
        appData.products.splice(productIndex, 1);
        appData.metadata.lastUpdated = new Date().toISOString();
        
        closeDeleteConfirmation();
        renderProductList();
        updateHeaderStats();
        updateTabs();
        if (typeof refreshRefundState === 'function') refreshRefundState();
        showNotification('Đã xóa sản phẩm!', 'success');
        queueAutoSave();
    }
    
    function editProduct(productId) {
        const product = appData.products.find(p => p.id === productId);
        if (!product) {
            showNotification('Không tìm thấy sản phẩm!', 'error');
            return;
        }
        
        // Open edit modal
        openEditModal(product.id);
    }
    
    // Setup event delegation for action buttons
    function setupActionButtonEvents() {
        const productList = document.getElementById('productList');
        if (!productList) return;

        // Remove existing listeners
        productList.removeEventListener('click', handleActionButtonClick);
        
        // Add new listener
        productList.addEventListener('click', handleActionButtonClick);
    }

    function handleActionButtonClick(event) {
        const button = event.target.closest('.action-btn');
        if (!button) return;

        const action = button.getAttribute('data-action');
        const productId = button.getAttribute('data-product-id');
        const buttonText = button.textContent.trim();


        if (action === 'edit') {
            editProduct(productId);
        } else if (action === 'delete') {
            deleteProduct(productId);
        }
    }

    window.addProduct = addProduct;
    window.deleteProduct = deleteProduct;
    window.editProduct = editProduct;
    window.closeDeleteConfirmation = closeDeleteConfirmation;
    window.confirmDeleteProduct = confirmDeleteProduct;


    // edit & confirm
    let _edit = null, _del = null;
    function openEditModal(id) {
        const p = appData.products.find(x => x.id === id); 
        if (!p) {
            return;
        }
        _edit = id;
        document.getElementById('editProductName').value = p.name;
        document.getElementById('editProductDuration').value = p.duration;
        document.getElementById('editDurationUnit').value = p.durationUnit;
        document.getElementById('editProductPrice').value = formatPrice(p.price);
        document.getElementById('editProductCategory').value = p.category;
        
        // Handle combo products for edit
        if (p.category === 'Combo') {
            showEditComboSection(p);
        } else {
            hideEditComboSection();
        }
        
        document.getElementById('editModal').classList.add('show');
    }
    function closeEditModal() { 
        document.getElementById('editModal').classList.remove('show'); 
    }
    function saveEditProduct() {
        const p = appData.products.find(x => x.id === _edit); if (!p) return;
        const newName = document.getElementById('editProductName').value.trim();
        let newDuration = Number(document.getElementById('editProductDuration').value);
        const newUnit = document.getElementById('editDurationUnit').value;
        const newPrice = parsePrice(document.getElementById('editProductPrice').value);
        const newCategory = document.getElementById('editProductCategory').value;
        
        if (!newName) { showNotification('Nhập tên sản phẩm!', 'error'); return; }
        if (!Number.isFinite(newDuration) || newDuration <= 0) newDuration = 1;
        if (!newPrice || newPrice <= 0) { showNotification('Nhập giá hợp lệ!', 'error'); return; }
        const unit = (newUnit === 'ngày' || newUnit === 'tháng' || newUnit === 'năm') ? newUnit : 'tháng';
        
        // Check for duplicate product (same name + duration + unit) excluding current product
        const existingProduct = appData.products.find(existingP => 
            existingP.id !== p.id && 
            existingP.name.toLowerCase() === newName.toLowerCase() && 
            existingP.duration === newDuration && 
            existingP.durationUnit === unit
        );
        
        if (existingProduct) {
            showNotification(`Sản phẩm "${newName} ${newDuration} ${unit}" đã tồn tại!`, 'error');
            return;
        }
        
        p.name = newName;
        p.duration = newDuration;
        p.durationUnit = unit;
        p.price = newPrice;
        p.category = newCategory;
        
        // Handle combo products
        if (newCategory === 'Combo') {
            const selectedAICheckboxes = document.querySelectorAll('#editAiSelectionGrid input[type="checkbox"]:checked');
            if (selectedAICheckboxes.length === 0) {
                showNotification('Vui lòng chọn ít nhất 1 AI cho combo!', 'error');
                return;
            }

            const selectedAIIds = Array.from(selectedAICheckboxes).map(cb => cb.value);
            const selectedAIProducts = appData.products.filter(p =>
                (p.category === 'AI') &&
                selectedAIIds.includes(p.id)
            );

            if (selectedAIProducts.length === 0) {
                showNotification('Không tìm thấy sản phẩm AI đã chọn!', 'error');
                return;
            }

            p.comboProducts = selectedAIProducts.map(p => p.id);
        } else {
            // Remove combo products if category changed
            delete p.comboProducts;
        }
        
        appData.metadata.lastUpdated = new Date().toISOString();
        // Immediate sync for cross-tab searches
        try { window.products = appData.products.slice(); } catch {}
        closeEditModal(); renderProductList(); updateHeaderStats(); if (typeof refreshRefundState === 'function') refreshRefundState(); if (typeof updateTabs === 'function') updateTabs(); showNotification('Đã lưu!');
        queueAutoSave();
    }
    function askDeleteProduct(id) { _del = id; document.getElementById('confirmDialog').classList.add('show'); }
    function confirmAction() {
        if (_del) {
            const idToDelete = _del;
            appData.products = appData.products.filter(p => p.id !== idToDelete);
            _del = null;
            try { window.products = appData.products.slice(); } catch {}
            renderProductList();
            updateHeaderStats();
            if (typeof refreshRefundState === 'function') refreshRefundState();
            showNotification('Đã xóa!');
            // Sync deletion to Google Sheets
            deleteFromGoogleSheets([idToDelete]);
        }
        closeConfirm();
    }
    function closeConfirm() { 
        document.getElementById('confirmDialog').classList.remove('show'); 
    }
    window.openEditModal = openEditModal; window.closeEditModal = closeEditModal; window.saveEditProduct = saveEditProduct;
    window.askDeleteProduct = askDeleteProduct; window.confirmAction = confirmAction; window.closeConfirm = closeConfirm;

    // common search used by modules
    function searchProducts(q, boxId, handler) {
        const box = document.getElementById(boxId); 
        if (!box) return;
        const qN = normalizeText((q || '').trim()); 
        if (!qN) { 
            box.classList.remove('show'); 
            return; 
        }
        const hits = (appData.products || []).filter(p => {
            const nameN = normalizeText(p.name);
            const catN = normalizeText(p.category);
            return nameN.startsWith(qN) || nameN.includes(qN) || catN.includes(qN);
        }).slice(0, 20);
        
        box.classList.add('search-results');
        box.innerHTML = hits.length ? 
            hits.map(p => `
                <div class="search-result-item" onclick="${handler}('${p.id}')">
                    <div class="result-info">
                        <div class="result-name">${p.name}</div>
                        <div class="result-details">
                            <span class="result-price">${formatPrice(p.price)}đ</span>
                            <span class="result-duration">${Math.max(1, p.duration)} ${p.durationUnit}</span>
                            <span class="result-category">${getCategoryShortLabel(p.category)}</span>
                        </div>
                    </div>
                </div>
            `).join('') : 
            '<div class="search-result-item">Không tìm thấy sản phẩm</div>'; 
        box.classList.add('show');
    }
    window.searchProducts = searchProducts;

    // Strict name-only search (used by refund)
    function searchProductsByName(q, boxId, handler, context = null) {
        const box = document.getElementById(boxId); 
        if (!box) return;
        const qN = normalizeText((q || '').trim());
        if (!qN) { 
            box.classList.remove('show');
            box.innerHTML = '';
            box.style.display = 'none';
            globalSearchSelectedIndex = -1;
            currentSearchContext = null;
            return; 
        }
        
        // Set search context
        currentSearchContext = context;
        globalSearchSelectedIndex = -1;
        
        const hits = (appData.products || []).filter(p => {
            const nameN = normalizeText(p.name);
            // Match from word boundary or anywhere, but NAME only
            return nameN.startsWith(qN) || nameN.includes(qN);
        }).slice(0, 20);
        box.classList.add('search-results');
        box.innerHTML = hits.length ? 
            (`<div class="search-hint">Nhấn vào gói để chọn</div>` +
            hits.map((p, index) => `
                <div class="search-result-item ${index === globalSearchSelectedIndex ? 'selected' : ''}" 
                     onclick="${handler}('${p.id}')" 
                     data-index="${index}">
                    <div class="result-info">
                        <div class="result-name">${p.name}</div>
                        <div class="result-details">
                            <span class="result-price">${formatPrice(p.price)}đ</span>
                            <span class="result-duration">${Math.max(1, p.duration)} ${p.durationUnit}</span>
                            <span class="result-category">${getCategoryShortLabel(p.category)}</span>
                        </div>
                    </div>
                </div>
            `).join('')) : '<div class="search-result-item">Không tìm thấy sản phẩm</div>';
        box.classList.add('show');
        box.style.display = 'block';
    }
    window.searchProductsByName = searchProductsByName;

    // Global keyboard navigation for search
    function handleGlobalSearchKeydown(e) {
        // Only handle if we have an active search context
        if (!currentSearchContext) return;
        
        const searchInput = e.target;
        const resultsId = getResultsIdFromContext(currentSearchContext);
        const results = document.getElementById(resultsId);
        
        if (!results || results.style.display === 'none') return;
        
        const items = results.querySelectorAll('.search-result-item');
        if (items.length === 0) return;
        
        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                globalSearchSelectedIndex = Math.min(globalSearchSelectedIndex + 1, items.length - 1);
                updateGlobalSearchSelection(resultsId);
                break;
            case 'ArrowUp':
                e.preventDefault();
                globalSearchSelectedIndex = Math.max(globalSearchSelectedIndex - 1, -1);
                updateGlobalSearchSelection(resultsId);
                break;
            case 'Enter':
                e.preventDefault();
                if (globalSearchSelectedIndex >= 0 && globalSearchSelectedIndex < items.length) {
                    const selectedItem = items[globalSearchSelectedIndex];
                    const productId = selectedItem.getAttribute('onclick').match(/'([^']+)'/)[1];
                    handleGlobalSearchSelection(productId, currentSearchContext);
                }
                break;
            case 'Escape':
                e.preventDefault();
                if (results) {
                    results.style.display = 'none';
                    results.classList.remove('show');
                }
                globalSearchSelectedIndex = -1;
                currentSearchContext = null;
                break;
        }
    }

    function getResultsIdFromContext(context) {
        switch (context) {
            case 'quote': return 'quoteSearchResults';
            case 'admin': return 'adminSearchResults';
            default: return null;
        }
    }

    function updateGlobalSearchSelection(resultsId) {
        const results = document.getElementById(resultsId);
        if (!results) return;
        
        const items = results.querySelectorAll('.search-result-item');
        items.forEach((item, index) => {
            if (index === globalSearchSelectedIndex) {
                item.classList.add('selected');
                item.scrollIntoView({ block: 'nearest' });
            } else {
                item.classList.remove('selected');
            }
        });
    }

    function handleGlobalSearchSelection(productId, context) {
        switch (context) {
            case 'quote':
                if (typeof selectQuoteProduct === 'function') {
                    selectQuoteProduct(productId);
                }
                break;
            case 'admin':
                // Handle admin selection if needed
                break;
        }
    }

    // boot
    document.addEventListener('DOMContentLoaded', () => {
        // Remove any theme toggle elements
        const themeElements = document.querySelectorAll('[class*="theme"], .theme-toggle, .theme-btn, .theme-icon, .theme-switcher, .theme-selector, .theme-control, .theme-button, .theme-toggle-btn, .theme-mode, .theme-switch, .theme-changer, .theme-controls, .theme-options, .theme-menu, .theme-dropdown, .theme-picker, .theme-selector, .theme-toggler, .theme-switcher-btn, .theme-mode-btn, .theme-control-btn');
        themeElements.forEach(el => {
            if (el && el.parentNode) {
                el.parentNode.removeChild(el);
            }
        });
        
        // Initialize dropdowns
        initDropdowns();

        // Apply saved theme
        try {
            const savedTheme = localStorage.getItem('pdc_theme') || 'light';
            if (savedTheme === 'dark') document.documentElement.classList.add('dark');
        } catch {}

        // Theme toggle
        const themeToggleBtn = document.getElementById('themeToggleBtn');
        if (themeToggleBtn) {
            themeToggleBtn.addEventListener('click', () => {
                const root = document.documentElement;
                const isDark = root.classList.toggle('dark');
                localStorage.setItem('pdc_theme', isDark ? 'dark' : 'light');
                showToast(isDark ? 'Đã bật Dark mode' : 'Đã bật Light mode', 'info');
            });
        }

        // Mobile sidebar bindings
        const mobileMenuBtn = document.getElementById('mobileMenuBtn');
        if (mobileMenuBtn) mobileMenuBtn.addEventListener('click', toggleSidebar);
        const mobileOverlay = document.getElementById('mobileOverlay');
        if (mobileOverlay) mobileOverlay.addEventListener('click', closeSidebar);
        
        // Load data from localStorage
        try {
            const saved = localStorage.getItem('pdc_app_data');
            if (saved) {
                const parsed = JSON.parse(saved);
                if (parsed.products) { appData.products = parsed.products; sanitizeProducts(); }
                if (parsed.categories) appData.categories = parsed.categories;
                if (parsed.metadata) appData.metadata = parsed.metadata;
            }
        } catch (e) {
            // Handle error silently
        }
        
        bindPriceInput(document.getElementById('productPrice'));
        bindPriceInput(document.getElementById('editProductPrice'));
        updateHeaderStats(); renderProductList();
        if (typeof updateTabs === 'function') updateTabs();
        // Auto load from Google Sheets on startup
        loadFromGoogleSheets().then(() => {
            // Force update tabs after loading
            setTimeout(() => {
                if (typeof updateTabs === 'function') updateTabs();
            }, 100);
        }).catch(() => {
            // Still update tabs even if loading fails
            setTimeout(() => {
                if (typeof updateTabs === 'function') updateTabs();
            }, 100);
        });
        
        // Show current version  
        showCurrentVersion();
        
        // Version is now managed by version.js
        
        // Bind refresh button (safety)
        const refreshBtn = document.getElementById('refundRefreshBtn');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => {
                if (typeof refreshRefundData === 'function') {
                    refreshRefundData();
                } else if (typeof updateRefundTab === 'function') {
                    updateRefundTab();
                }
            });
        }
        
        // Let refund module handle its own display logic
        // Removed force show logic to respect empty state when no products

        // Add fade-in animation to main content
        const mainContent = document.querySelector('.main-content');
        if (mainContent) {
            mainContent.classList.add('fade-in');
        }
        
        // Initialize real-time refund calculation listeners
        initRefundRealTimeListeners();
    });
    function updateTabs() { 
        if (typeof updateTemplateTab === 'function') updateTemplateTab(); 
        
        if (typeof updateRefundTab === 'function') {
            try {
                updateRefundTab();
            } catch (e) {
                // Handle error silently
            }
        } else {
            // Try again after a short delay
            setTimeout(() => {
                if (typeof updateRefundTab === 'function') {
                    try {
                        updateRefundTab();
                    } catch (e) {
                        // Handle error silently
                    }
                }
            }, 100);
        }
        if (typeof updateUpgradeTab === 'function') updateUpgradeTab(); 
        if (typeof updateScheduleTab === 'function') updateScheduleTab();
        if (typeof updateNotesTab === 'function') updateNotesTab(); 
        if (typeof updateQuoteTab === 'function') updateQuoteTab(); 
    }

    // setToday is defined in refund.js

    // Auto-save debounce helper
    let _autoSaveTimer = null;
    function queueAutoSave() {
        if (_autoSaveTimer) clearTimeout(_autoSaveTimer);
        _autoSaveTimer = setTimeout(() => {
            saveToGoogleSheets();
            _autoSaveTimer = null;
        }, 5000);
    }

    // Version management - Only bump when I fix code
    function showCurrentVersion() {
        try {
            const key = 'pdc_app_version';
            let versionStr = localStorage.getItem(key) || '0.0.0.1';
            const el = document.getElementById('versionBadge');
            if (el) el.textContent = `v${versionStr}`;
        } catch {}
    }
    
    function bumpVersion() {
        try {
            const key = 'pdc_app_version';
            let versionStr = localStorage.getItem(key) || '0.0.0.1';
            let parts = versionStr.split('.').map(n => parseInt(n) || 0);
            
            // Ensure we have 4 parts
            while (parts.length < 4) parts.push(0);
            
            // Increment patch version (last number)
            parts[3] = (parts[3] || 0) + 1;
            
            const newVersion = parts.join('.');
            localStorage.setItem(key, newVersion);
            const el = document.getElementById('versionBadge');
            if (el) el.textContent = `v${newVersion}`;
        } catch {}
    }

    // Unified toast API used across modules (maps to createToast)
    function showToast(message, type = 'success', duration = 3000) {
        const normalized = (type === 'warning') ? 'error' : (type || 'success');
        createToast(message, normalized, duration);
    }
    window.showToast = showToast;

    // Global notification alias for consistency
    try {
        window.showNotification = function(message, type = 'success', duration = 3000) {
            const normalized = (type === 'warning' || type === 'info') ? 'success' : (type || 'success');
            createToast(message, normalized, duration);
        };
    } catch {}

    function openSidebar() {
        const sb = document.getElementById('sidebar');
        const ov = document.getElementById('mobileOverlay');
        if (sb) sb.classList.add('open');
        if (ov) ov.classList.add('show');
    }
    function closeSidebar() {
        const sb = document.getElementById('sidebar');
        const ov = document.getElementById('mobileOverlay');
        if (sb) sb.classList.remove('open');
        if (ov) ov.classList.remove('show');
    }
    function toggleSidebar() {
        const sb = document.getElementById('sidebar');
        const ov = document.getElementById('mobileOverlay');
        const open = sb && sb.classList.toggle('open');
        if (ov) ov.classList.toggle('show', !!open);
    }
    function handleNavClick() { closeSidebar(); }
    window.toggleSidebar = toggleSidebar; window.closeSidebar = closeSidebar; window.handleNavClick = handleNavClick;

    // ===== COMBO PRODUCT FUNCTIONS =====
    function initComboSection() {
        const categorySelect = document.getElementById('productCategory');
        
        if (categorySelect) {
            categorySelect.addEventListener('change', (e) => {
                if (e.target.value === 'Combo') {
                    // Combo section is now handled by admin.js
                    // Just clear selectedComboProducts
                    selectedComboProducts = [];
                } else {
                    selectedComboProducts = [];
                }
            });
        }
    }
    
    function searchProductsForCombo(query) {
        const results = document.getElementById('comboProductSearchResults');
        if (!results || !appData.products) return;
        
        // Filter products (exclude combos and already selected)
        const filtered = appData.products.filter(p => 
            p.category !== 'Combo' && 
            p.name.toLowerCase().includes(query.toLowerCase()) &&
            !selectedComboProducts.find(selected => selected.id === p.id)
        );
        
        if (filtered.length === 0) {
            results.style.display = 'none';
            return;
        }
        
        results.classList.add('search-results');
        results.innerHTML = filtered.map(p => 
            `<div class="search-result-item" onclick="addToCombo('${p.id}')">
                <div class="result-info">
                    <div class="result-name">${p.name}</div>
                    <div class="result-details">
                        <span class="result-price">${formatPrice(p.price)}đ</span>
                        <span class="result-duration">${p.duration} ${p.durationUnit}</span>
                        <span class="result-category">${p.category}</span>
                    </div>
                </div>
            </div>`
        ).join('');
        results.style.display = 'block';
        results.classList.add('show');
    }
    
    function addToCombo(productId) {
        const product = appData.products.find(p => p.id === productId);
        if (product && !selectedComboProducts.find(p => p.id === productId)) {
            selectedComboProducts.push(product);
            updateSelectedComboProducts();
            document.getElementById('comboProductSearch').value = '';
            document.getElementById('comboProductSearchResults').style.display = 'none';
        }
    }
    
    function removeFromCombo(productId) {
        selectedComboProducts = selectedComboProducts.filter(p => p.id !== productId);
        updateSelectedComboProducts();
    }
    
    function updateSelectedComboProducts() {
        const container = document.getElementById('selectedComboProducts');
        if (!container) return;
        
        if (selectedComboProducts.length === 0) {
            container.innerHTML = '<div style="color: #64748b; font-style: italic;">Chưa chọn sản phẩm nào</div>';
            return;
        }
        
        container.innerHTML = selectedComboProducts.map(p => 
            `<div class="combo-product-tag">
                <span>${p.name}</span>
                <span class="combo-product-remove" onclick="removeFromCombo('${p.id}')">×</span>
            </div>`
        ).join('');
    }
    
    // ===== COMBO REFUND FUNCTIONS =====
    function initComboRefund() {
        // Will be initialized when a combo product is selected
    }
    
    function showComboRefundOptions(comboProduct) {
        selectedComboRefundProduct = comboProduct;
        const comboSection = document.getElementById('comboRefundSection');
        const comboList = document.getElementById('comboProductsList');
        
        
        if (!comboSection || !comboList || !comboProduct.comboProducts) {
            return;
        }
        
        // Show combo section
        comboSection.style.display = 'block';
        
        // Create list of combo products
        const comboItems = comboProduct.comboProducts.map(productId => {
            const product = appData.products.find(p => p.id === productId);
            if (!product) return null;
            
            const splitPrice = Math.round(comboProduct.price / comboProduct.comboProducts.length);
            
            return `
                <div class="combo-product-item" data-product-id="${product.id}" onclick="toggleComboProductRefund('${product.id}')">
                    <input type="checkbox" class="combo-product-checkbox" 
                           value="${product.id}" onchange="toggleComboProductRefund('${product.id}')" onclick="event.stopPropagation()">
                    <div class="combo-product-info">
                        <div class="combo-product-name">${product.name}</div>
                        <div class="combo-product-price">${formatPrice(splitPrice)}đ</div>
                    </div>
                </div>
            `;
        }).filter(item => item).join('');
        
        comboList.innerHTML = comboItems;
        
        // Clear any previous selection
        window.selectedComboProductsForRefund = [];
        updateRefundCalculation();
    }
    
    function toggleComboProductRefund(productId) {
        if (!window.selectedComboProductsForRefund) {
            window.selectedComboProductsForRefund = [];
        }
        
        const index = window.selectedComboProductsForRefund.findIndex(p => p.id === productId);
        const checkbox = document.querySelector(`input[value="${productId}"]`);
        const item = document.querySelector(`[data-product-id="${productId}"]`);
        
        if (index >= 0) {
            // Remove from selection
            window.selectedComboProductsForRefund.splice(index, 1);
            if (checkbox) checkbox.checked = false;
            if (item) item.classList.remove('selected');
        } else {
            // Add to selection
            const originalProduct = appData.products.find(p => p.id === productId);
            if (originalProduct && selectedComboRefundProduct) {
                const splitPrice = Math.round(selectedComboRefundProduct.price / selectedComboRefundProduct.comboProducts.length);
                const comboProductForRefund = {
                    ...originalProduct,
                    price: splitPrice,
                    isComboItem: true,
                    parentCombo: selectedComboRefundProduct
                };
                window.selectedComboProductsForRefund.push(comboProductForRefund);
                if (checkbox) checkbox.checked = true;
                if (item) item.classList.add('selected');
            }
        }
        
        updateRefundCalculation();
    }
    
    function hideComboRefundSection() {
        const comboSection = document.getElementById('comboRefundSection');
        if (comboSection) {
            comboSection.style.display = 'none';
        }
        window.selectedComboProductsForRefund = [];
        selectedComboRefundProduct = null;
    }

    function clearComboRefundSelection() {
        try {
            const comboList = document.getElementById('comboProductsList');
            if (comboList) {
                comboList.querySelectorAll('.combo-product-item').forEach(el => el.classList.remove('selected'));
                comboList.querySelectorAll('.combo-product-checkbox').forEach(cb => cb.checked = false);
            }
            window.selectedComboProductsForRefund = [];
            updateRefundCalculation();
            showNotification('Đã bỏ chọn tất cả sản phẩm trong combo', 'success');
        } catch (e) {
            // Handle error silently
        }
    }

    // restartRefundForm is defined in refund.js
    
    // ===== EDIT COMBO FUNCTIONS =====
    let editSelectedComboProducts = [];
    
    function showEditComboSection(product) {
        const editComboSection = document.getElementById('editComboSection');
        
        if (editComboSection) {
            editComboSection.style.display = 'block';
        }
        
        // Populate AI selection checkboxes
        populateEditAISelection();
        
        // Check AI products that are in this combo
        if (product.comboProducts && product.comboProducts.length > 0) {
            setTimeout(() => {
                const aiCheckboxes = document.querySelectorAll('#editAiSelectionGrid input[type="checkbox"]');
                aiCheckboxes.forEach(cb => {
                    const productInCombo = appData.products.find(p => p.id === cb.value);
                    if (productInCombo && product.comboProducts.includes(productInCombo.id)) {
                        cb.checked = true;
                    }
                });
            }, 100);
        }
        
        // Setup category change listener
        const editCategorySelect = document.getElementById('editProductCategory');
        if (editCategorySelect) {
            editCategorySelect.addEventListener('change', (e) => {
                if (e.target.value === 'Combo') {
                    editComboSection.style.display = 'block';
                    populateEditAISelection();
                } else {
                    hideEditComboSection();
                }
            });
        }
    }
    
    function hideEditComboSection() {
        const editComboSection = document.getElementById('editComboSection');
        if (editComboSection) {
            editComboSection.style.display = 'none';
        }
        editSelectedComboProducts = [];
    }
    
    function populateEditAISelection() {
        const editAiSelectionGrid = document.getElementById('editAiSelectionGrid');
        if (!editAiSelectionGrid) return;

        editAiSelectionGrid.innerHTML = ''; // Clear existing checkboxes

        const products = window.products || window.appData?.products || [];

        if (products && products.length > 0) {
            const aiProducts = products.filter(product =>
                product.category === 'AI'
            );

            if (aiProducts.length > 0) {
                aiProducts.forEach(product => {
                    const checkbox = document.createElement('label');
                    checkbox.className = 'ai-checkbox';
                    checkbox.innerHTML = `
                        <input type="checkbox" value="${product.id}"> ${product.name}
                    `;
                    editAiSelectionGrid.appendChild(checkbox);
                });
            } else {
                editAiSelectionGrid.innerHTML = '<p style="color: #666; font-style: italic;">Chưa có sản phẩm AI nào. Hãy thêm sản phẩm AI trước.</p>';
            }
        } else {
            editAiSelectionGrid.innerHTML = '<p style="color: #666; font-style: italic;">Chưa có sản phẩm nào. Hãy thêm sản phẩm trước.</p>';
        }
    }
    
    // Old search function removed - now using AI selection checkboxes
    
    // Old addToEditCombo function removed - now using AI selection checkboxes
    
    // Old combo management functions removed - now using AI selection checkboxes
    
    function updateRefundCalculation() {
        // Auto-calculate refunds when dates or products change
        // Check for valid date range in either card
        const purchaseStartDate = document.getElementById('purchaseStartDate')?.value;
        const purchaseEndDate = document.getElementById('purchaseEndDate')?.value;
        const refundStartDate = document.getElementById('refundStartDate')?.value;
        const refundEndDate = document.getElementById('refundEndDate')?.value;
        
        // Check if we have dates in either card
        const hasCard1Dates = purchaseStartDate && purchaseEndDate;
        const hasCard2Dates = refundStartDate && refundEndDate;
        
        if (hasCard1Dates || hasCard2Dates) {
            // Add real-time calculation logic here
            calculateRefundRealTime();
        }
    }
    
    // Real-time refund calculation function
    function calculateRefundRealTime() {
        // Check if we're in refund tab and have selected product
        if (typeof selectedRefundProduct !== 'undefined' && selectedRefundProduct) {
            // Get current date values from the form
            const purchaseStartDate = document.getElementById('purchaseStartDate')?.value;
            const purchaseEndDate = document.getElementById('purchaseEndDate')?.value;
            const refundStartDate = document.getElementById('refundStartDate')?.value;
            const refundEndDate = document.getElementById('refundEndDate')?.value;
            
            let startDate, endDate;
            
            // Check Card 1: Từ ngày mua → Đến ngày hoàn
            if (purchaseStartDate && purchaseEndDate) {
                startDate = purchaseStartDate;
                endDate = purchaseEndDate;
            }
            // Check Card 2: Từ ngày hoàn → Đến ngày hết gói
            else if (refundStartDate && refundEndDate) {
                startDate = refundStartDate;
                endDate = refundEndDate;
            }
            
            if (startDate && endDate) {
                // Use the existing calculateRefund function from refund.js
                if (typeof calculateRefund === 'function') {
                    const result = calculateRefund(selectedRefundProduct, startDate, endDate);
                    if (result && !result.error) {
                        // Update the display in real-time
                        if (typeof displayRefundResult === 'function') {
                            displayRefundResult(result);
                        }
                    }
                }
            }
        }
    }
    
    // Add event listeners for real-time calculation
    function initRefundRealTimeListeners() {
        // Add listeners to date inputs for real-time calculation
        const dateInputs = [
            'purchaseStartDate', 'purchaseEndDate', 
            'refundStartDate', 'refundEndDate'
        ];
        
        dateInputs.forEach(inputId => {
            const input = document.getElementById(inputId);
            if (input) {
                input.addEventListener('change', () => {
                    // Debounce the calculation to avoid too many calls
                    clearTimeout(window._refundRealTimeTimeout);
                    window._refundRealTimeTimeout = setTimeout(() => {
                        calculateRefundRealTime();
                    }, 500);
                });
            }
        });
    }
    
    
    // Make functions global
    window.addToCombo = addToCombo;
    window.removeFromCombo = removeFromCombo;
    window.toggleComboProductRefund = toggleComboProductRefund;
    window.showComboRefundOptions = showComboRefundOptions;
    window.hideComboRefundSection = hideComboRefundSection;
    window.clearComboRefundSelection = clearComboRefundSelection;
    window.calculateRefundRealTime = calculateRefundRealTime;
    window.initRefundRealTimeListeners = initRefundRealTimeListeners;
    // restartRefundForm is defined in refund.js
    
    // Edit combo functions
    window.populateEditAISelection = populateEditAISelection;
    
    // ===== COMBO DATA BACKUP FUNCTIONS =====
    function saveComboDataToLocal() {
        try {
            const comboData = {
                combos: appData.products.filter(p => p.category === 'Combo').map(p => ({
                    id: p.id,
                    name: p.name,
                    category: p.category,
                    comboProducts: p.comboProducts || []
                })),
                lastUpdated: new Date().toISOString()
            };
            localStorage.setItem('pdc_combo_data', JSON.stringify(comboData));
        } catch (e) {
            // Handle error silently
        }
    }
    
    function loadComboDataFromLocal() {
        try {
            const saved = localStorage.getItem('pdc_combo_data');
            if (saved) {
                const comboData = JSON.parse(saved);
                return comboData.combos || [];
            }
        } catch (e) {
            // Handle error silently
        }
        return [];
    }
    
    // Initialize combo and refund when DOM loads
    document.addEventListener('DOMContentLoaded', () => {
        initComboSection();
        initComboRefund();
        initRefundForm();
        if (typeof initRefundTemplateUI === 'function') {
            try { initRefundTemplateUI(); } catch {}
        }
    });
    
    // Initialize refund form with default values
    function initRefundForm() {
        try {
            // Set end date to today
            const endDate = document.getElementById('endDate');
            if (endDate) {
                const today = new Date().toISOString().slice(0, 10);
                endDate.value = today;
            }
            
            // Pre-fill start date with current year, leave day/month empty
            const startDate = document.getElementById('startDate');
            if (startDate) {
                const currentYear = new Date().getFullYear();
                startDate.value = `${currentYear}-01-01`; // Pre-fill with Jan 1st of current year
                startDate.placeholder = 'dd/mm/yyyy';
            }
        } catch (e) {
            // Handle error silently
        }
    }
    
})(); // End IIFE wrapper