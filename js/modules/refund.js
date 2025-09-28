// ===== REFUND MODULE =====
// Clean version without debug logs

// Utility functions
function formatDMY(d) {
    return d.toLocaleDateString('vi-VN');
}


// Global variables
let selectedRefundProduct = null;
let selectedComboProductsForRefund = [];
let selectedComboRefundProduct = null;

// Initialize refund module
document.addEventListener('DOMContentLoaded', function() {
    if (window.__PDC_DEBUG__ && console.log.__original) console.log.__original('Refund module initialized');
    
    // Initialize combo refund system
    if (typeof initComboRefundSystem === 'function') {
        initComboRefundSystem();
    }
    
    // Set up event listeners
    setupRefundEventListeners();
    
    // Initial state update
    updateRefundTab();
});

// Short category label for compact UI
function getRefundCategoryShortLabel(category) {
    const c = String(category || '').trim();
    if (c === 'AI' || c === 'AI Services') return 'AI';
    if (c === 'Công cụ') return 'CC';
    if (c === 'Combo') return 'CB';
    return c || '';
}

function setupRefundEventListeners() {
    // Product search
    const searchInput = document.getElementById('refundProductSearch');
    if (searchInput) {
        searchInput.setAttribute('autocomplete', 'off');
        searchInput.addEventListener('input', handleProductSearch);
    }
    
    // Date inputs
    const startDate = document.getElementById('startDate');
    const endDate = document.getElementById('endDate');
    if (startDate) startDate.addEventListener('change', updateRefundState);
    if (endDate) endDate.addEventListener('change', updateRefundState);
    
    // Calculate button
    const calculateBtn = document.getElementById('refundBtn');
    if (calculateBtn) {
        calculateBtn.addEventListener('click', calculateRefundManual);
    }
}

function handleProductSearch(e) {
    const query = e.target.value.trim();
    const results = document.getElementById('refundSearchResults');
    
    if (!results) return;
    
    if (query.length === 0) {
        results.style.display = 'none';
        return;
    }
    
    const products = window.products || window.appData?.products || [];
    const filtered = products.filter(p => 
        p.name.toLowerCase().includes(query.toLowerCase())
    );
    
    if (filtered.length === 0) {
        results.style.display = 'none';
        return;
    }
    
    results.classList.add('search-results');
    results.innerHTML = filtered.map(p => `
        <div class="search-result-item" onclick="selectRefundProduct('${p.name}')">
            <div class="result-info">
                <div class="result-name">${p.name}</div>
                <div class="result-details">
                    <span class="result-price">${formatPrice(p.price)}đ</span>
                    <span class="result-duration">${p.duration} ${p.durationUnit}</span>
                    <span class="result-category">${getRefundCategoryShortLabel(p.category)}</span>
                </div>
            </div>
        </div>
    `).join('');
    
    results.style.display = 'block';
    results.classList.add('show');
}

function selectRefundProduct(productName) {
    const products = window.products || window.appData?.products || [];
    const product = products.find(p => p.name === productName);
    
    if (!product) return;
    
    selectedRefundProduct = product;
    
    // Update UI
    const searchInput = document.getElementById('refundProductSearch');
    const results = document.getElementById('refundSearchResults');
    
    if (searchInput) searchInput.value = productName;
    if (results) results.style.display = 'none';
    
    // Handle combo products
    if (product.category === 'Combo' && product.comboProducts) {
        showComboRefundSection(product);
    } else {
        hideComboRefundSection();
    }
    
    updateRefundState();
    updateRefundDisplay();
}

function showComboRefundSection(comboProduct) {
    const comboSection = document.getElementById('comboRefundSection');
    if (!comboSection) return;
    
    comboSection.style.display = 'block';
    selectedComboRefundProduct = comboProduct;
    
    // Create list of combo products
    const comboItems = comboProduct.comboProducts.map(productId => {
        const product = (window.products || window.appData?.products || []).find(p => p.id === productId);
        if (!product) return null;
        
        return `
            <div class="combo-refund-item">
                <label class="combo-refund-checkbox">
                    <input type="checkbox" value="${product.id}" onchange="toggleComboRefundProduct('${product.id}')">
                    <span class="combo-refund-name">${product.name}</span>
                    <span class="combo-refund-price">${formatPrice(product.price)}đ</span>
                </label>
            </div>
        `;
    }).filter(Boolean).join('');
    
    const comboList = document.getElementById('comboProductsList');
    if (comboList) {
        comboList.innerHTML = comboItems;
    }
}

function hideComboRefundSection() {
    const comboSection = document.getElementById('comboRefundSection');
    if (comboSection) {
        comboSection.style.display = 'none';
    }
    selectedComboProductsForRefund = [];
    selectedComboRefundProduct = null;
}

function toggleComboRefundProduct(productId) {
    const checkbox = document.querySelector(`input[value='${productId}']`);
    if (!checkbox) return;
    
    if (checkbox.checked) {
        if (!selectedComboProductsForRefund.includes(productId)) {
            selectedComboProductsForRefund.push(productId);
        }
    } else {
        const index = selectedComboProductsForRefund.indexOf(productId);
        if (index > -1) {
            selectedComboProductsForRefund.splice(index, 1);
        }
    }
    
    updateRefundDisplay();
}

function updateRefundDisplay() {
    const selectedProductsCard = document.getElementById('refundSelectedProductsCard');
    if (!selectedProductsCard) return;
    
    // Update card title and style based on product type
    const cardTitle = selectedProductsCard.querySelector('h2');
    const cardIcon = selectedProductsCard.querySelector('.refund-icon');
    
    if (selectedRefundProduct) {
        selectedProductsCard.style.display = 'block';
        
        // Expand to 3 columns when product is selected
        const mainContent = document.querySelector('.refund-main-content');
        if (mainContent) {
            mainContent.style.gridTemplateColumns = '1fr 1fr 1fr';
            mainContent.style.gap = '20px';
        }
        
        if (selectedRefundProduct.category === 'Combo') {
            // Combo product - show "Sản phẩm chọn trong combo"
            if (cardTitle) cardTitle.textContent = 'Sản phẩm chọn trong combo:';
            if (cardIcon) cardIcon.textContent = '📦';
            selectedProductsCard.className = 'refund-card refund-selected-products';
            
            // Show combo selection section
            const comboSection = document.getElementById('comboRefundSection');
            if (comboSection) comboSection.style.display = 'block';
            
            // Hide result sections, only show checkboxes
            const productDiv = document.getElementById('refundSelectedProduct');
            const emptyDiv = document.getElementById('refundEmptySelected');
            if (productDiv) productDiv.style.display = 'none';
            if (emptyDiv) emptyDiv.style.display = 'none';
        } else {
            // Regular product - show "Thông tin gói"
            if (cardTitle) cardTitle.textContent = 'Thông tin gói';
            if (cardIcon) cardIcon.textContent = '📋';
            selectedProductsCard.className = 'refund-card refund-package-info';
            
            // Hide combo selection section
            const comboSection = document.getElementById('comboRefundSection');
            if (comboSection) comboSection.style.display = 'none';
            
            const productDiv = document.getElementById('refundSelectedProduct');
            const emptyDiv = document.getElementById('refundEmptySelected');
            const productNameEl = document.getElementById('refundProductName');
            const productPriceEl = document.getElementById('refundProductPrice');
            const productDurationEl = document.getElementById('refundProductDuration');
            
            if (productDiv) productDiv.style.display = 'block';
            if (emptyDiv) emptyDiv.style.display = 'none';
            
            if (productNameEl) {
                productNameEl.innerHTML = `
                    <div class="refund-info-title">${selectedRefundProduct.name}</div>
                    <div class="refund-info-lines">
                        <div class="refund-info-line">
                            <span class="refund-info-emoji">💰</span>
                            <span>Giá: <strong class="refund-info-strong">${formatPrice(selectedRefundProduct.price)}đ</strong></span>
                        </div>
                        <div class="refund-info-line">
                            <span class="refund-info-emoji">⏰</span>
                            <span>Thời hạn: <strong class="refund-info-strong">${selectedRefundProduct.duration} ${selectedRefundProduct.durationUnit}</strong></span>
                        </div>
                    </div>
                `;
            }
        }
    } else {
        selectedProductsCard.style.display = 'none';
        
        // Keep 2 columns when no product is selected
        const mainContent = document.querySelector('.refund-main-content');
        if (mainContent) {
            mainContent.style.gridTemplateColumns = '1fr 1fr';
            mainContent.style.gap = '30px';
        }
    }
}

function updateRefundState() {
    const calculateBtn = document.getElementById('refundBtn');
    if (!calculateBtn) return;
    
    const startDate = document.getElementById('startDate')?.value;
    const endDate = document.getElementById('endDate')?.value;
    const hasProductsAvailable = window.products && window.products.length > 0;
    
    const isEnabled = selectedRefundProduct && 
                     selectedRefundProduct.name && 
                     startDate && 
                     endDate && 
                     hasProductsAvailable;
    
    calculateBtn.disabled = !isEnabled;
}

function calculateRefundManual() {
    if (!selectedRefundProduct) {
        showNotification('Vui lòng chọn sản phẩm!', 'error');
        return;
    }
    
    const startDate = document.getElementById('startDate')?.value;
    const endDate = document.getElementById('endDate')?.value;
    
    if (!startDate || !endDate) {
        showNotification('Vui lòng chọn khoảng thời gian!', 'error');
        return;
    }
    
    const result = calculateRefund(selectedRefundProduct, startDate, endDate);
    displayRefundResult(result);
}

function calculateRefund(product, startDate, endDate) {
    const s = new Date(startDate);
    const e = new Date(endDate);
    
    if (e < s) {
        return { error: 'Ngày kết thúc phải sau ngày bắt đầu!' };
    }
    
    let totalDays = Number(product.duration) || 0;
    const unit = product.durationUnit === 'tháng' ? 'tháng' : 'ngày';
    if (totalDays <= 0) totalDays = 1;
    if (unit === 'tháng') totalDays *= 30;
    
    const daysUsed = Math.ceil((e - s) / (1000 * 3600 * 24));
    const daysRemaining = Math.max(0, totalDays - daysUsed);
    
    if (daysUsed > totalDays) {
        return { error: 'Thời gian sử dụng vượt quá thời hạn gói. Không thể hoàn.' };
    }
    
    if (daysRemaining <= 0) {
        const perDay = Math.round(product.price / totalDays);
        const usedPercentage = Math.round((daysUsed / totalDays) * 100);
        const planText = `${product.duration} ${product.durationUnit}`;
        
        return {
            product,
            totalDays,
            daysUsed,
            daysRemaining,
            perDay,
            usedPercentage,
            planText,
            refund: 0,
            refundPercentage: 0,
            isExpired: true
        };
    }
    
    const perDay = Math.round(product.price / totalDays);
    // Compute refund proportionally and round once at the end to avoid double rounding drift
    const refund = Math.round((product.price * daysRemaining) / totalDays);
    const refundPercentage = Math.round((daysRemaining / totalDays) * 100);
    const usedPercentage = Math.round((daysUsed / totalDays) * 100);
    const planText = `${product.duration} ${product.durationUnit}`;
    
    return {
        product,
        totalDays,
        daysUsed,
        daysRemaining,
        perDay,
        refund,
        refundPercentage,
        usedPercentage,
        planText,
        isExpired: false
    };
}

function displayRefundResult(result) {
    const resultElement = document.getElementById('refundResult');
    if (!resultElement) return;
    
    // Hide result initially
    resultElement.style.display = 'none';
    
    if (result.error) {
        showNotification(result.error, 'error');
        return;
    }
    
    const breakdown = document.getElementById('refundBreakdown');
    const customerContent = document.getElementById('refundCustomerContent');
    
    if (breakdown) {
        if (result.isExpired) {
            breakdown.innerHTML = createExpiredBreakdownHTML(result);
        } else {
            breakdown.innerHTML = createRefundBreakdownHTML(result);
        }
    }
    
    if (customerContent) {
        customerContent.textContent = createCustomerMessage(result);
    }
    
    resultElement.style.display = 'block';
    resultElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function createExpiredBreakdownHTML(result) {
    return `
        <div class="calc-section">
            <h6 class="calc-section-title">📊 Thông tin gói sản phẩm</h6>
            <div class="calc-row"><span class="calc-label">💰 Tên gói:</span><span class="calc-value">${result.product.name}</span></div>
            <div class="calc-row"><span class="calc-label">💵 Giá gói:</span><span class="calc-value">${formatPrice(result.product.price)}đ</span></div>
            <div class="calc-row"><span class="calc-label">⏰ Thời hạn:</span><span class="calc-value">${result.totalDays} ngày (${result.planText})</span></div>
            <div class="calc-row"><span class="calc-label">📅 Khoảng tính:</span><span class="calc-value">${formatDMY(new Date(document.getElementById('startDate').value))} → ${formatDMY(new Date(document.getElementById('endDate').value))}</span></div>
        </div>
        
        <div class="calc-section">
            <h6 class="calc-section-title">📊 Phân tích sử dụng</h6>
            <div class="calc-row"><span class="calc-label">📈 Đơn giá/ngày:</span><span class="calc-value">${formatPrice(result.perDay)}đ/ngày</span></div>
            <div class="calc-row"><span class="calc-label">📅 Đã sử dụng:</span><span class="calc-value text-warning">${result.daysUsed} ngày (${result.usedPercentage}%)</span></div>
            <div class="calc-row"><span class="calc-label">⏰ Còn lại:</span><span class="calc-value text-danger">${result.daysRemaining} ngày (đã hết hạn)</span></div>
        </div>
        
        <div class="calc-section">
            <h6 class="calc-section-title">🧮 Công thức tính toán</h6>
            <div class="calc-row"><span class="calc-label">📊 Công thức:</span><span class="calc-value text-danger">${formatPrice(result.perDay)}đ × ${result.daysRemaining} ngày = 0đ</span></div>
            <div class="calc-row"><span class="calc-label">🎯 Chính sách:</span><span class="calc-value text-danger">Không hoàn tiền - Gói đã hết hạn</span></div>
        </div>
        
        <div class="calc-section calc-total-section">
            <h6 class="calc-section-title">💸 Kết quả hoàn tiền</h6>
            <div class="calc-row calc-total"><span class="calc-label">🎯 SỐ TIỀN HOÀN:</span><span class="calc-value text-danger">0đ</span></div>
            <div class="calc-row"><span class="calc-label">📊 Tỷ lệ hoàn:</span><span class="calc-value text-danger">0%</span></div>
        </div>
    `;
}

function createRefundBreakdownHTML(result) {
    return `
        <div class="calc-section">
            <h6 class="calc-section-title">📊 Thông tin gói sản phẩm</h6>
            <div class="calc-row"><span class="calc-label">💰 Tên gói:</span><span class="calc-value">${result.product.name}</span></div>
            <div class="calc-row"><span class="calc-label">💵 Giá gói:</span><span class="calc-value">${formatPrice(result.product.price)}đ</span></div>
            <div class="calc-row"><span class="calc-label">⏰ Thời hạn:</span><span class="calc-value">${result.totalDays} ngày (${result.planText})</span></div>
            <div class="calc-row"><span class="calc-label">📅 Khoảng tính:</span><span class="calc-value">${formatDMY(new Date(document.getElementById('startDate').value))} → ${formatDMY(new Date(document.getElementById('endDate').value))}</span></div>
        </div>
        
        <div class="calc-section">
            <h6 class="calc-section-title">📊 Phân tích sử dụng</h6>
            <div class="calc-row"><span class="calc-label">📈 Đơn giá/ngày:</span><span class="calc-value">${formatPrice(result.perDay)}đ/ngày</span></div>
            <div class="calc-row"><span class="calc-label">📅 Đã sử dụng:</span><span class="calc-value text-warning">${result.daysUsed} ngày (${result.usedPercentage}%)</span></div>
            <div class="calc-row"><span class="calc-label">✅ Còn lại:</span><span class="calc-value text-success">${result.daysRemaining} ngày (${result.refundPercentage}%)</span></div>
        </div>
        
        <div class="calc-section">
            <h6 class="calc-section-title">🧮 Công thức tính toán</h6>
            <div class="calc-row"><span class="calc-label">📊 Công thức:</span><span class="calc-value">${formatPrice(result.perDay)}đ × ${result.daysRemaining} ngày = ${formatPrice(result.refund)}đ</span></div>
        </div>
        
        <div class="calc-section calc-total-section">
            <h6 class="calc-section-title">💸 Kết quả hoàn tiền</h6>
            <div class="calc-row calc-total"><span class="calc-label">🎯 SỐ TIỀN HOÀN:</span><span class="calc-value text-success">${formatPrice(result.refund)}đ</span></div>
            <div class="calc-row"><span class="calc-label">📊 Tỷ lệ hoàn:</span><span class="calc-value text-success">${result.refundPercentage}%</span></div>
        </div>
    `;
}

function createCustomerMessage(result) {
    const startDate = formatDMY(new Date(document.getElementById('startDate').value));
    const endDate = formatDMY(new Date(document.getElementById('endDate').value));
    
    if (result.isExpired) {
        return `Kính gửi Quý khách,\n\nGói ${result.product.name} đã hết hạn. Thời gian sử dụng từ ${startDate} đến ${endDate}.\nTheo chính sách hoàn tiền theo ngày còn lại, số tiền hoàn là 0đ.\n\nTrân trọng.`;
    } else {
        return `Kính gửi Quý khách,\n\nCentrix xin thông tin kết quả hoàn tiền cho gói ${result.product.name} ${result.product.duration} ${result.product.durationUnit} như sau:\n- Khoảng thời gian tính: ${startDate} → ${endDate}\n- Số ngày còn lại: ${result.daysRemaining} ngày\n- Số tiền hoàn dự kiến: ${formatPrice(result.refund)}đ\n\nCentrix sẽ tiến hành xử lý và chuyển hoàn trong vòng 1–2 ngày làm việc. Nếu cần hỗ trợ thêm, Quý khách vui lòng phản hồi để Centrix phục vụ tốt hơn.\nTrân trọng.`;
    }
}

function restartRefundForm() {
    selectedRefundProduct = null;
    selectedComboProductsForRefund = [];
    selectedComboRefundProduct = null;
    
    // Clear form
    const searchInput = document.getElementById('refundProductSearch');
    const startDate = document.getElementById('startDate');
    const endDate = document.getElementById('endDate');
    
    if (searchInput) searchInput.value = '';
    if (startDate) startDate.value = '';
    if (endDate) endDate.value = '';
    
    // Hide sections
    const resultElement = document.getElementById('refundResult');
    const selectedProductsCard = document.getElementById('refundSelectedProductsCard');
    const calculateSection = document.getElementById('refundCalculateSection');
    
    if (resultElement) resultElement.style.display = 'none';
    if (selectedProductsCard) selectedProductsCard.style.display = 'none';
    if (calculateSection) calculateSection.style.display = 'none';
    
    hideComboRefundSection();
    updateRefundState();
}

function refreshRefundData() {
    updateRefundTab();
    updateRefundState();
}

function refreshRefundState() {
    updateRefundState();
}

function copyRefundResult() {
    const content = document.getElementById('refundCustomerContent');
    if (!content) return;
    
    navigator.clipboard.writeText(content.textContent).then(() => {
        showNotification('Đã copy nội dung gửi khách!', 'success');
    }).catch(() => {
        showNotification('Không thể copy!', 'error');
    });
}

function toggleRefundTheme() {
    document.body.classList.toggle('dark');
    localStorage.setItem('theme', document.body.classList.contains('dark') ? 'dark' : 'light');
}

function setToday(inputId) {
    const today = new Date();
    const todayString = today.toISOString().split('T')[0];
    
    const input = document.getElementById(inputId);
    if (input) {
        input.value = todayString;
        input.dispatchEvent(new Event('change'));
    }
}

// Main function to update refund tab visibility
function updateRefundTab() {
    let hasProducts = false;
    let productCount = 0;
    
    // Check window.products (main source)
    if (window.products && Array.isArray(window.products)) {
        productCount = window.products.length;
        hasProducts = productCount > 0;
    }
    
    // Check appData as backup
    if (!hasProducts && window.appData && window.appData.products && Array.isArray(window.appData.products)) {
        productCount = window.appData.products.length;
        hasProducts = productCount > 0;
    }
    
    // Check localStorage as fallback
    if (!hasProducts) {
        try {
            const saved = localStorage.getItem('pdc_app_data');
            if (saved) {
                const parsed = JSON.parse(saved);
                if (parsed.products && Array.isArray(parsed.products)) {
                    productCount = parsed.products.length;
                    hasProducts = productCount > 0;
                    if (hasProducts && window.appData) {
                        window.appData.products = parsed.products;
                    }
                }
            }
        } catch (e) {
            // localStorage not available
        }
    }
    
    // Get DOM elements
    const emptyState = document.getElementById('refundEmptyState');
    const mainContent = document.querySelector('.refund-main-content');
    const calculateSection = document.getElementById('refundCalculateSection');
    
    // Update UI based on product availability
    if (!hasProducts) {
        // Show empty state, hide ALL form elements
        if (emptyState) emptyState.style.display = 'block';
        if (mainContent) mainContent.style.display = 'none';
        if (calculateSection) calculateSection.style.display = 'none';
        
        // Also hide any result sections
        const resultElement = document.getElementById('refundResult');
        if (resultElement) resultElement.style.display = 'none';
        
        // Clear any selected products
        selectedRefundProduct = null;
        selectedComboProductsForRefund = [];
        selectedComboRefundProduct = null;
        
    } else {
        // Hide empty state, show form
        if (emptyState) emptyState.style.display = 'none';
        if (mainContent) mainContent.style.display = 'grid';
        if (calculateSection) calculateSection.style.display = 'block';
    }
}

// Initialize combo refund system
function initComboRefundSystem() {
    if (window.__PDC_DEBUG__ && console.log.__original) console.log.__original('Combo refund system initialized');
    // This function is called from app.js
}

// Export functions to global scope
window.updateRefundTab = updateRefundTab;
window.refreshRefundData = refreshRefundData;
window.refreshRefundState = refreshRefundState;
window.restartRefundForm = restartRefundForm;
window.copyRefundResult = copyRefundResult;
window.toggleRefundTheme = toggleRefundTheme;
window.setToday = setToday;
window.initComboRefundSystem = initComboRefundSystem;
