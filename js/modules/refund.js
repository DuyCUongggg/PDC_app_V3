// ===== REFUND MODULE =====
// Clean version without debug logs

// Utility functions


// Global variables
let selectedRefundProduct = null;
let selectedComboProductsForRefund = [];
let selectedComboRefundProduct = null;
let refundSearchSelectedIndex = -1;

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
    // Product search - Step 1
    const searchInput = document.getElementById('refundProductSearchStep1');
    if (searchInput) {
        searchInput.setAttribute('autocomplete', 'off');
        searchInput.addEventListener('input', handleProductSearch);
        searchInput.addEventListener('keydown', handleRefundSearchKeydown);
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
    const results = document.getElementById('refundSearchResultsStep1');

    if (!results) return;

    // Reset selected index khi tìm kiếm
    refundSearchSelectedIndex = -1;

    if (query.length === 0) {
        results.style.display = 'none';
        results.innerHTML = '';
        results.classList.remove('show');
        return;
    }

    const products = window.products || window.appData?.products || [];
    const filtered = products.filter(p =>
        (p.name || '').toLowerCase().includes(query.toLowerCase())
    );

    if (filtered.length === 0) {
        results.style.display = 'none';
        results.innerHTML = '';
        results.classList.remove('show');
        return;
    }

    // Clear danh sách cũ
    results.innerHTML = '';
    results.classList.add('search-results');

    // Render từng item bằng DOM API (không dùng innerHTML, không onclick inline)
    filtered.forEach((p, index) => {
        const item = document.createElement('div');
        item.className = 'search-result-item';
        if (index === refundSearchSelectedIndex) item.classList.add('selected');
        item.dataset.id = p.id;
        item.dataset.index = index;

        const infoDiv = document.createElement('div');
        infoDiv.className = 'result-info';

        const nameDiv = document.createElement('div');
        nameDiv.className = 'result-name';
        nameDiv.textContent = p.name;

        const detailsDiv = document.createElement('div');
        detailsDiv.className = 'result-details';

        const priceSpan = document.createElement('span');
        priceSpan.className = 'result-price';
        priceSpan.textContent = formatPrice(p.price) + 'đ';

        const durationSpan = document.createElement('span');
        durationSpan.className = 'result-duration';
        durationSpan.textContent = p.duration + ' ' + p.durationUnit;

        const categorySpan = document.createElement('span');
        categorySpan.className = 'result-category';
        categorySpan.textContent = getRefundCategoryShortLabel(p.category);

        detailsDiv.appendChild(priceSpan);
        detailsDiv.appendChild(durationSpan);
        detailsDiv.appendChild(categorySpan);

        infoDiv.appendChild(nameDiv);
        infoDiv.appendChild(detailsDiv);
        item.appendChild(infoDiv);

        // Gắn sự kiện click ngay khi tạo
        item.addEventListener('click', () => {
            selectRefundProduct(p.id);
        });

        results.appendChild(item);
    });

    results.style.display = 'block';
    results.classList.add('show');
}



function handleRefundSearchKeydown(e) {
    const results = document.getElementById('refundSearchResultsStep1');
    if (!results || results.style.display === 'none') return;
    
    const items = results.querySelectorAll('.search-result-item');
    if (items.length === 0) return;
    
    switch (e.key) {
        case 'ArrowDown':
            e.preventDefault();
            refundSearchSelectedIndex = Math.min(refundSearchSelectedIndex + 1, items.length - 1);
            updateRefundSearchSelection();
            break;
        case 'ArrowUp':
            e.preventDefault();
            refundSearchSelectedIndex = Math.max(refundSearchSelectedIndex - 1, -1);
            updateRefundSearchSelection();
            break;
        case 'Enter':
            e.preventDefault();
            if (refundSearchSelectedIndex >= 0 && refundSearchSelectedIndex < items.length) {
                const selectedItem = items[refundSearchSelectedIndex];
                const productId = selectedItem.dataset.id;  // <-- lấy id từ data-id
                if (productId) {
                    selectRefundProduct(productId);        // <-- gọi theo id (đã chốt)
                }
            }
            break;
        case 'Escape':
            e.preventDefault();
            results.style.display = 'none';
            refundSearchSelectedIndex = -1;
            break;
    }
}
function isElementInViewport(el, container) {
    const elRect = el.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();
    return (
        elRect.top >= containerRect.top &&
        elRect.bottom <= containerRect.bottom
    );
}
function updateRefundSearchSelection() {
    const results = document.getElementById('refundSearchResultsStep1');
    if (!results) return;

    const items = results.querySelectorAll('.search-result-item');
    items.forEach((item, index) => {
        if (index === refundSearchSelectedIndex) {
            item.classList.add('selected');
            // Chỉ scroll khi item chưa nằm trọn trong khung
            if (!isElementInViewport(item, results)) {
                item.scrollIntoView({ block: 'nearest' });
            }
        } else {
            item.classList.remove('selected');
        }
    });
}

function selectRefundProduct(productId) {
    const products = window.products || window.appData?.products || [];
    const product = products.find(p => p.id === productId);
    
    if (!product) return;
    
    selectedRefundProduct = product;
    
    // Update UI
    const searchInput = document.getElementById('refundProductSearchStep1');
    const results = document.getElementById('refundSearchResultsStep1');
    const selectedProductDiv = document.getElementById('refundSelectedProductStep1');
    const selectedProductsCard = document.getElementById('refundSelectedProductsCard');
    
    if (searchInput) searchInput.value = productName;
    if (results) {
        results.style.display = 'none';
        results.classList.remove('show');
    }
    
    // Show selected product info
    if (selectedProductDiv) {
        selectedProductDiv.innerHTML = `
            <div class="refund-selected-item">
                <div class="refund-selected-item-name">${productName}</div>
                <div class="refund-selected-item-details">${product.price}đ - ${product.planText}</div>
            </div>
        `;
        selectedProductDiv.style.display = 'block';
    }
    
    // Show package info card
    if (selectedProductsCard) {
        selectedProductsCard.style.display = 'block';
    }
    
    // Reset selected index
    refundSearchSelectedIndex = -1;
    
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
    // Read extracted order info (if any)
    let extractedOrderId = '';
    let extractedIsoDate = '';
    try {
        const extractedBox = document.getElementById('refundOrderExtractResult');
        if (extractedBox && extractedBox.dataset) {
            extractedOrderId = extractedBox.dataset.orderId || '';
            extractedIsoDate = extractedBox.dataset.isoDate || '';
        }
    } catch {}
    
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
                // Also show extracted order info (if any) applied in Step 1
                let orderInfoHTML = '';
                try {
                    const extractedBox = document.getElementById('refundOrderExtractResult');
                    const orderId = extractedBox && extractedBox.dataset ? extractedBox.dataset.orderId : '';
                    const isoDate = extractedBox && extractedBox.dataset ? extractedBox.dataset.isoDate : '';
                    const dmy = isoDate ? formatDMY(new Date(isoDate)) : '';
                    if (orderId || dmy) {
                        orderInfoHTML = `
                            <div class="refund-info-line">
                                <span class="refund-info-emoji">🧾</span>
                                <span>Mã đơn: <strong class="refund-info-strong">${orderId || '-'}</strong></span>
                            </div>
                            <div class="refund-info-line">
                                <span class="refund-info-emoji">🛒</span>
                                <span>Ngày mua: <strong class="refund-info-strong">${dmy || '-'}</strong></span>
                            </div>`;
                    }
                } catch {}

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
                        ${orderInfoHTML}
                    </div>
                `;
            }
        }
    } else {
        // When no product selected, still show order info if it exists
        const hasOrderInfo = Boolean(extractedOrderId || extractedIsoDate);
        if (!hasOrderInfo) {
            selectedProductsCard.style.display = 'none';
        } else {
            selectedProductsCard.style.display = 'block';
            const cardTitle = selectedProductsCard.querySelector('h2');
            const cardIcon = selectedProductsCard.querySelector('.refund-icon');
            if (cardTitle) cardTitle.textContent = 'Thông tin đơn hàng';
            if (cardIcon) cardIcon.textContent = '🧾';
            selectedProductsCard.className = 'refund-card refund-package-info';

            const comboSection = document.getElementById('comboRefundSection');
            if (comboSection) comboSection.style.display = 'none';

            const productDiv = document.getElementById('refundSelectedProduct');
            const emptyDiv = document.getElementById('refundEmptySelected');
            const productNameEl = document.getElementById('refundProductName');
            if (productDiv) productDiv.style.display = 'block';
            if (emptyDiv) emptyDiv.style.display = 'none';

            const dmy = extractedIsoDate ? formatDMY(new Date(extractedIsoDate)) : '-';
            if (productNameEl) {
                productNameEl.innerHTML = `
                    <div class="refund-info-title">Thông tin đơn hàng</div>
                    <div class="refund-info-lines">
                        <div class="refund-info-line">
                            <span class="refund-info-emoji">🧾</span>
                            <span>Mã đơn: <strong class="refund-info-strong">${extractedOrderId || '-'}</strong></span>
                        </div>
                        <div class="refund-info-line">
                            <span class="refund-info-emoji">🛒</span>
                            <span>Ngày mua: <strong class="refund-info-strong">${dmy}</strong></span>
                        </div>
                    </div>
                `;
            }
        }
    }
}

function updateRefundState() {
    const calculateBtn = document.getElementById('refundBtn');
    if (!calculateBtn) return;

    const startDate = document.getElementById('startDate')?.value;
    const endDate = document.getElementById('endDate')?.value;
    const hasProductsAvailable = window.products && window.products.length > 0;

    let isEnabled = false;

    if (selectedRefundProduct && selectedRefundProduct.id && startDate && endDate && hasProductsAvailable) {
        if (selectedRefundProduct.category === 'Combo') {
            // Combo: phải tick ít nhất 1 sản phẩm con mới cho tính
            isEnabled = selectedComboProductsForRefund.length > 0;
        } else {
            // Sản phẩm thường
            isEnabled = true;
        }
    }

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

    if (unit === 'tháng') {
        // Tính chính xác số ngày thực tế trong từng tháng kể từ startDate
        let days = 0;
        let year = s.getFullYear();
        let month = s.getMonth();
        for (let i = 0; i < totalDays; i++) {
            const daysInThisMonth = new Date(year, month + 1, 0).getDate();
            days += daysInThisMonth;
            month++;
            if (month > 11) {
                month = 0;
                year++;
            }
        }
        totalDays = days;
    }

    const daysUsed = Math.max(0, Math.ceil((e - s) / (1000 * 3600 * 24)));
    const daysRemaining = Math.max(0, totalDays - daysUsed);

    if (totalDays <= 0) {
        return { error: 'Thời hạn gói không hợp lệ!' };
    }

    if (daysUsed < 0 || daysRemaining < 0) {
        return { error: 'Tính toán ngày không hợp lệ!' };
    }

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
    const refund = Math.round((product.price * daysRemaining) / totalDays);
    const refundPercentage = Math.min(100, Math.max(0, Math.round((daysRemaining / totalDays) * 100)));
    const usedPercentage = Math.min(100, Math.max(0, Math.round((daysUsed / totalDays) * 100)));
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
        const message = createCustomerMessage(result);
        customerContent.textContent = message;

        // Cập nhật luôn textarea tại đây, không cần lặp lại phía dưới
        const messageEditor = document.getElementById('refundCustomerMessageEditor');
        if (messageEditor) {
            messageEditor.value = message;
        }
    }
    
    // Also update the editable textarea directly
    const messageEditor = document.getElementById('refundCustomerMessageEditor');
    if (messageEditor) {
        const message = createCustomerMessage(result);
        messageEditor.value = message;
    }
    
    // FORCE EQUAL COLUMNS WITH JAVASCRIPT
    setTimeout(() => {
        const container = document.querySelector('.refund-results-container');
        const leftCol = document.querySelector('.refund-left-column');
        const rightCol = document.querySelector('.refund-right-column');
        
        if (container && leftCol && rightCol) {
            // Force grid layout
            container.style.cssText = 'display: grid !important; grid-template-columns: 1fr 1fr !important; gap: 30px !important; width: 100% !important; max-width: 100% !important;';
            
            // Force grid columns
            leftCol.style.cssText = 'display: flex !important; flex-direction: column !important; width: 100% !important; min-width: 0 !important; max-width: 100% !important; grid-column: 1 !important;';
            rightCol.style.cssText = 'display: flex !important; flex-direction: column !important; width: 100% !important; min-width: 0 !important; max-width: 100% !important; grid-column: 2 !important; overflow: hidden !important;';
        }
    }, 100);
    
    resultElement.style.display = 'block';
    resultElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function createExpiredBreakdownHTML(result) {
    const startDate = formatDMY(new Date(document.getElementById('startDate').value));
    const endDate = formatDMY(new Date(document.getElementById('endDate').value));
    
    return `
                    
                    <div class="section-group">
                        <div class="section-header">
                            Thông tin gói sản phẩm
                        </div>
                        <div class="info-line">
                            <span class="info-label">Tên gói:</span>
                            <span class="info-value">${result.product.name}</span>
                        </div>
                        <div class="info-line">
                            <span class="info-label">Giá gói:</span>
                            <span class="info-value">${formatPrice(result.product.price)}đ</span>
                        </div>
                        <div class="info-line">
                            <span class="info-label">Thời hạn:</span>
                            <span class="info-value">${result.totalDays} ngày (${result.planText})</span>
                        </div>
                        <div class="info-line">
                            <span class="info-label">Số ngày sử dụng:</span>
                            <span class="info-value">${result.daysUsed} ngày (${startDate} – ${endDate})</span>
                        </div>
                    </div>
                    
                    <div class="section-group">
                        <div class="section-header">
                            Phân tích sử dụng
                        </div>
                        <div class="info-line">
                            <span class="info-label">Đơn giá/ngày:</span>
                            <span class="info-value">${formatPrice(result.perDay)}đ/ngày</span>
                        </div>
                        <div class="info-line">
                            <span class="info-label">Đã sử dụng:</span>
                            <span class="info-value negative">${result.daysUsed} ngày (${result.usedPercentage}%)</span>
                        </div>
                        <div class="info-line">
                            <span class="info-label">Trạng thái:</span>
                            <span class="info-value negative">Đã hết hạn</span>
                        </div>
                    </div>
                    
                        <div class="section-group">
                            <div class="section-header">
                                Công thức tính toán
                            </div>
                            <div class="info-line">
                                <span class="info-label">Bước 1:</span>
                                <span class="info-value formula">Chọn sản phẩm: ${result.product.name}</span>
                            </div>
                            <div class="info-line">
                                <span class="info-label">Bước 2:</span>
                                <span class="info-value formula">${formatPrice(result.product.price)}đ ÷ ${result.totalDays} = ${formatPrice(result.perDay)}đ/ngày</span>
                            </div>
                            <div class="info-line">
                                <span class="info-label">Bước 3:</span>
                                <span class="info-value formula">${result.totalDays} - ${result.daysUsed} = ${result.daysRemaining} ngày</span>
                            </div>
                            <div class="info-line">
                                <span class="info-label">Bước 4:</span>
                                <span class="info-value formula">${formatPrice(result.perDay)}đ × 0 = 0đ (Hết hạn)</span>
                            </div>
                        </div>
                    
                    <div class="section-group final-result warning">
                        <div class="info-line highlight">
                            <span class="info-label">SỐ TIỀN HOÀN:</span>
                            <span class="info-value result-amount negative">0đ</span>
                        </div>
                    </div>
    `;
}

function createRefundBreakdownHTML(result) {
    const startDate = formatDMY(new Date(document.getElementById('startDate').value));
    const endDate = formatDMY(new Date(document.getElementById('endDate').value));
    
    return `
                    
                    <div class="section-group">
                        <div class="section-header">
                            Thông tin gói sản phẩm
                        </div>
                        <div class="info-line">
                            <span class="info-label">Tên gói:</span>
                            <span class="info-value">${result.product.name}</span>
                        </div>
                        <div class="info-line">
                            <span class="info-label">Giá gói:</span>
                            <span class="info-value">${formatPrice(result.product.price)}đ</span>
                        </div>
                        <div class="info-line">
                            <span class="info-label">Thời hạn:</span>
                            <span class="info-value">${result.totalDays} ngày (${result.planText})</span>
                        </div>
                        <div class="info-line">
                            <span class="info-label">Số ngày sử dụng:</span>
                            <span class="info-value">${result.daysUsed} ngày (${startDate} – ${endDate})</span>
                        </div>
                    </div>
                    
                    <div class="section-group">
                        <div class="section-header">
                            Phân tích sử dụng
                        </div>
                        <div class="info-line">
                            <span class="info-label">Đơn giá/ngày:</span>
                            <span class="info-value">${formatPrice(result.perDay)}đ/ngày</span>
                        </div>
                        <div class="info-line">
                            <span class="info-label">Đã sử dụng:</span>
                            <span class="info-value negative">${result.daysUsed} ngày (${result.usedPercentage}%)</span>
                        </div>
                        <div class="info-line">
                            <span class="info-label">Còn lại:</span>
                            <span class="info-value positive">${result.daysRemaining} ngày</span>
                        </div>
                    </div>
                    
                        <div class="section-group">
                            <div class="section-header">
                                Công thức tính toán
                            </div>
                            <div class="info-line">
                                <span class="info-label">Bước 1:</span>
                                <span class="info-value formula">Chọn sản phẩm: ${result.product.name}</span>
                            </div>
                            <div class="info-line">
                                <span class="info-label">Bước 2:</span>
                                <span class="info-value formula">${formatPrice(result.product.price)}đ ÷ ${result.totalDays} = ${formatPrice(result.perDay)}đ/ngày</span>
                            </div>
                            <div class="info-line">
                                <span class="info-label">Bước 3:</span>
                                <span class="info-value formula">${result.totalDays} - ${result.daysUsed} = ${result.daysRemaining} ngày</span>
                            </div>
                            <div class="info-line">
                                <span class="info-label">Bước 4:</span>
                                <span class="info-value formula">${formatPrice(result.perDay)}đ × ${result.daysRemaining} = ${formatPrice(result.refund)}đ</span>
                            </div>
                        </div>
                    
                    <div class="section-group final-result">
                        <div class="info-line highlight">
                            <span class="info-label">SỐ TIỀN HOÀN:</span>
                            <span class="info-value result-amount">${formatPrice(result.refund)}đ</span>
                        </div>
                    </div>
    `;
}

function createCustomerMessage(result) {
    const startDate = formatDMY(new Date(document.getElementById('startDate').value));
    const endDate = formatDMY(new Date(document.getElementById('endDate').value));

    // Lấy orderId đã extract (nếu có)
    let orderId = '';
    try {
        const extractedBox = document.getElementById('refundOrderExtractResult');
        if (extractedBox && extractedBox.dataset) {
            orderId = extractedBox.dataset.orderId || '';
        }
    } catch { }

    const template = getSavedTemplate();

    return template
        .replace(/\{\{orderId\}\}/g, orderId || '-')
        .replace(/\{\{productName\}\}/g, result.product.name)
        .replace(/\{\{startDate\}\}/g, startDate)
        .replace(/\{\{endDate\}\}/g, endDate)
        .replace(/\{\{daysRemaining\}\}/g, result.daysRemaining)
        .replace(/\{\{refund\}\}/g, formatPrice(result.refund) + 'đ');
}


function restartRefundForm() {
    selectedRefundProduct = null;
    selectedComboProductsForRefund = [];
    selectedComboRefundProduct = null;
    
    // Clear form
    const searchInput = document.getElementById('refundProductSearchStep1');
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
    const messageEditor = document.getElementById('refundCustomerMessageEditor');
    if (!messageEditor) return;
    
    navigator.clipboard.writeText(messageEditor.value).then(() => {
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

// Helper: set Step 3 start date and update state
function setRefundStartDate(iso) {
    const startDate = document.getElementById('startDate');
    if (startDate) {
        startDate.value = iso;
        startDate.dispatchEvent(new Event('change'));
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
        } catch (e) {s
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

// ========== Template settings (simple) ==========
const TEMPLATE_KEY = 'refund_template';

function getDefaultTemplate() {
    /*
      Các biến sẽ được thay thế tự động:
      - {{orderId}}      : Mã đơn hàng
      - {{productName}}  : Tên gói sản phẩm
      - {{startDate}}    : Ngày bắt đầu (dd/mm/yyyy)
      - {{endDate}}      : Ngày kết thúc (dd/mm/yyyy)
      - {{daysRemaining}}: Số ngày còn lại
      - {{refund}}       : Số tiền hoàn dự kiến (kèm đơn vị đ)
    */
    return `
Kính gửi Quý khách,

Centrix xin thông tin kết quả hoàn tiền cho đơn  {{orderId}} – gói {{productName}} như sau:
- Khoảng thời gian tính: {{startDate}} → {{endDate}}
- Số ngày còn lại: {{daysRemaining}} ngày
- Số tiền hoàn dự kiến: {{refund}}

Centrix sẽ tiến hành xử lý và chuyển hoàn trong vòng 1–2 ngày làm việc.
Trân trọng.
`.trim();
}


function getSavedTemplate() {
    return localStorage.getItem(TEMPLATE_KEY) || getDefaultTemplate();
}

function saveTemplate() {
    const editor = document.getElementById('templateEditor');
    if (editor) {
        localStorage.setItem(TEMPLATE_KEY, editor.value);
        alert('Đã lưu mẫu!');
    }
}

function resetTemplate() {
    const editor = document.getElementById('templateEditor');
    if (editor) {
        editor.value = getDefaultTemplate();
        alert('Đã khôi phục mẫu mặc định!');
    }
}

function openTemplateSettings() {
    const modal = document.getElementById('templateModal');
    const editor = document.getElementById('templateEditor');
    if (modal && editor) {
        editor.value = getSavedTemplate();
        modal.style.display = 'flex';
        setTimeout(() => editor.focus(), 100);

        // Gắn realtime preview
        editor.addEventListener('input', () => {
            const resultElement = document.getElementById('refundResult');
            if (resultElement && resultElement.style.display !== 'none') {
                // Nếu đang có kết quả refund
                const message = createCustomerMessage(window.lastRefundResult || {});
                const customerContent = document.getElementById('refundCustomerContent');
                const messageEditor = document.getElementById('refundCustomerMessageEditor');
                if (customerContent) customerContent.textContent = message;
                if (messageEditor) messageEditor.value = message;
            }
        });
    }
}


function closeTemplateModal() {
    const modal = document.getElementById('templateModal');
    if (modal) {
        modal.style.display = 'none';
    }
}

// Export functions
window.openTemplateSettings = openTemplateSettings;
window.closeTemplateModal = closeTemplateModal;
window.saveTemplate = saveTemplate;
window.resetTemplate = resetTemplate;

// Force equal columns on page load
document.addEventListener('DOMContentLoaded', function() {
    setTimeout(() => {
        const container = document.querySelector('.refund-results-container');
        const leftCol = document.querySelector('.refund-left-column');
        const rightCol = document.querySelector('.refund-right-column');
        
        if (container && leftCol && rightCol) {
            // Force grid layout
            container.style.cssText = 'display: grid !important; grid-template-columns: 1fr 1fr !important; gap: 30px !important; width: 100% !important; max-width: 100% !important;';
            
            // Force grid columns
            leftCol.style.cssText = 'display: flex !important; flex-direction: column !important; width: 100% !important; min-width: 0 !important; max-width: 100% !important; grid-column: 1 !important;';
            rightCol.style.cssText = 'display: flex !important; flex-direction: column !important; width: 100% !important; min-width: 0 !important; max-width: 100% !important; grid-column: 2 !important; overflow: hidden !important;';
        }
    }, 500);
});

// --- Minimal order extractor (order id + purchase date) ---
function extractRefundOrderInfo() {
    try {
        const input = document.getElementById('refundOrderInput');
        const resultBox = document.getElementById('refundOrderExtractResult');
        if (!input || !resultBox) return;

        const text = (input.value || '').trim();
        if (!text) {
            showNotification('Vui lòng dán nội dung đơn hàng!', 'error');
            return;
        }

        // Try pattern A: [Đơn hàng #71946] (28/09/2025)
        const a = parseRefundPatternA(text);
        if (a) {
            updateOrderExtractUI(a.orderId, a.purchaseDate);
            // Auto-apply purchase date to Step 3
            setRefundStartDate(a.purchaseDate);
            showNotification('Đã trích xuất theo Mẫu 1 và áp dụng ngày mua', 'success');
            // Reflect immediately in package info card
            updateRefundDisplay();
            return;
        }

        // Try pattern B: email, price, ORDERID RESELLER, statuses, date time
        const b = parseRefundPatternB(text);
        if (b) {
            updateOrderExtractUI(b.orderId, b.purchaseDate);
            // Auto-apply purchase date to Step 3
            setRefundStartDate(b.purchaseDate);
            showNotification('Đã trích xuất theo Mẫu 2 và áp dụng ngày mua', 'success');
            // Reflect immediately in package info card
            updateRefundDisplay();
            return;
        }

        showNotification('Không nhận diện được mẫu dữ liệu!', 'error');
        resultBox.style.display = 'none';
    } catch (e) {
        console.error('extractRefundOrderInfo error:', e);
    }
}

function parseRefundPatternA(text) {
    // Format: [Đơn hàng #71946] (28/09/2025)
    const headerMatch = text.match(/\[\s*Đơn hàng\s*#(\d+)\s*\]\s*\((\d{2}\/\d{2}\/\d{4})\)/i);
    if (!headerMatch) return null;
    const rawId = headerMatch[1];
    const date = headerMatch[2]; // dd/mm/yyyy
    const orderId = rawId.startsWith('DH') ? rawId : `DH${rawId}`;
    // Normalize to ISO yyyy-mm-dd for inputs
    const [dd, mm, yyyy] = date.split('/');
    const iso = `${yyyy}-${mm}-${dd}`;
    return { orderId, purchaseDate: iso };
}

function parseRefundPatternB(text) {
    // Expected lines include: email, price, ORDER RESELLER, PAID, SUCCESS, dd/mm/yyyy hh:mm
    const lines = text.split('\n').map(s => s.trim()).filter(Boolean);
    if (lines.length < 4) return null;

    // Find line containing RESELLER or long order code
    const orderLine = lines.find(l => /RESELLER/i.test(l) || /[A-Z0-9]{6,}/.test(l));
    // Find date with dd/mm/yyyy optionally with time
    const dateLine = lines.find(l => /(\d{2}\/\d{2}\/\d{4})/.test(l));
    if (!orderLine || !dateLine) return null;

    const orderId = orderLine.trim();
    const dateMatch = dateLine.match(/(\d{2}\/\d{2}\/\d{4})/);
    if (!dateMatch) return null;
    const [dd, mm, yyyy] = dateMatch[1].split('/');
    const iso = `${yyyy}-${mm}-${dd}`;
    return { orderId, purchaseDate: iso };
}

function updateOrderExtractUI(orderId, isoDate) {
    const resultBox = document.getElementById('refundOrderExtractResult');
    const idEl = document.getElementById('extractedOrderIdMini');
    const dateEl = document.getElementById('extractedPurchaseDateMini');
    if (!resultBox || !idEl || !dateEl) return;
    idEl.textContent = orderId;
    dateEl.textContent = formatDMY(new Date(isoDate));
    resultBox.style.display = 'block';
    // Store on element dataset for apply step
    resultBox.dataset.orderId = orderId;
    resultBox.dataset.isoDate = isoDate;
}

// Removed applyExtractedOrderInfo - now auto-applied in extractRefundOrderInfo

function clearRefundOrderInfo() {
    const input = document.getElementById('refundOrderInput');
    const resultBox = document.getElementById('refundOrderExtractResult');
    if (input) input.value = '';
    if (resultBox) { 
        resultBox.style.display = 'none'; 
        resultBox.dataset.orderId = ''; 
        resultBox.dataset.isoDate = ''; 
    }
    updateRefundState();
}

// expose minimal api
window.extractRefundOrderInfo = extractRefundOrderInfo;
window.clearRefundOrderInfo = clearRefundOrderInfo;

// Clear helpers for Step 2 and Step 3
function clearRefundProductSelection() {
    clearRefundProduct();
}

function clearRefundProduct() {
    selectedRefundProduct = null;
    const searchInput = document.getElementById('refundProductSearchStep1');
    const results = document.getElementById('refundSearchResultsStep1');
    const selectedProductDiv = document.getElementById('refundSelectedProductStep1');
    const selectedProductsCard = document.getElementById('refundSelectedProductsCard');
    
    if (searchInput) searchInput.value = '';
    if (results) { 
        results.style.display = 'none'; 
        results.innerHTML = ''; 
        results.classList.remove('show');
    }
    if (selectedProductDiv) {
        selectedProductDiv.style.display = 'none';
        selectedProductDiv.innerHTML = '';
    }
    if (selectedProductsCard) selectedProductsCard.style.display = 'none';
    
    // Clear combo section
    const comboSection = document.getElementById('comboRefundSection');
    if (comboSection) comboSection.style.display = 'none';
    
    // Clear selected combo products
    selectedComboProductsForRefund = [];
    selectedComboRefundProduct = null;
    
    hideComboRefundSection();
    updateRefundState();
}

function clearRefundDates() {
    const startDate = document.getElementById('startDate');
    const endDate = document.getElementById('endDate');
    if (startDate) startDate.value = '';
    if (endDate) endDate.value = '';
    
    // Clear any extracted dates that might have been applied
    const resultBox = document.getElementById('refundOrderExtractResult');
    if (resultBox && resultBox.dataset.isoDate) {
        // Don't clear the order info, just the applied dates
        console.log('Clearing applied dates');
    }
    
    updateRefundState();
}

window.clearRefundProduct = clearRefundProduct;
window.clearRefundProductSelection = clearRefundProductSelection;
window.clearRefundDates = clearRefundDates;

