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
    
    // Date inputs - Updated to use correct IDs
    const purchaseStartDate = document.getElementById('purchaseStartDate');
    const purchaseEndDate = document.getElementById('purchaseEndDate');
    const refundStartDate = document.getElementById('refundStartDate');
    const refundEndDate = document.getElementById('refundEndDate');
    
    if (purchaseStartDate) purchaseStartDate.addEventListener('change', updateRefundState);
    if (purchaseEndDate) purchaseEndDate.addEventListener('change', updateRefundState);
    if (refundStartDate) refundStartDate.addEventListener('change', updateRefundState);
    if (refundEndDate) refundEndDate.addEventListener('change', updateRefundState);
    
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
    
    const searchInput = document.getElementById('refundProductSearchStep1');
    const results = document.getElementById('refundSearchResultsStep1');
    const selectedProductDiv = document.getElementById('refundSelectedProductStep1');
    const selectedProductsCard = document.getElementById('refundSelectedProductsCard');
    
    if (searchInput) searchInput.value = product.name || '';   // ✅ fix chính
    if (results) {
        results.style.display = 'none';
        results.classList.remove('show');
    }
    
    if (selectedProductDiv) {
  const planText = (product.duration && product.durationUnit)
    ? `${product.duration} ${product.durationUnit}`
    : ''; // fallback an toàn

  selectedProductDiv.innerHTML = `
    <div class="refund-selected-item">
      <div class="refund-selected-item-name">${product.name}</div>
      <div class="refund-selected-item-details">
        ${formatPrice(product.price)}đ${planText ? ` - ${planText}` : ''}
      </div>
    </div>
  `;
  selectedProductDiv.style.display = 'block';
}
    
    if (selectedProductsCard) {
        selectedProductsCard.style.display = 'block';
    }
    
    refundSearchSelectedIndex = -1;
    
    if (product.category === 'Combo' && product.comboProducts) {
        showComboRefundSection(product);
    } else {
        hideComboRefundSection();
    }
    
    updateRefundState();
    updateRefundDisplay();
    window.selectedRefundProduct = selectedRefundProduct; // ✅ giữ tham chiếu toàn cục
    
    // Auto-fill start date with today when product is selected
    autoFillRefundStartDate();

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
        // Try to get from global variables first
        if (window.__extractedOrderId) {
            extractedOrderId = window.__extractedOrderId;
        }
        if (window.__extractedPurchaseDate) {
            extractedIsoDate = window.__extractedPurchaseDate;
        }
        
        // Fallback to old method
        if (!extractedOrderId || !extractedIsoDate) {
            const extractedBox = document.getElementById('refundOrderExtractResult');
            if (extractedBox && extractedBox.dataset) {
                extractedOrderId = extractedBox.dataset.orderId || '';
                extractedIsoDate = extractedBox.dataset.isoDate || '';
            }
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
                    // Use global variables for extracted order info
                    const orderId = window.__extractedOrderId || '';
                    const isoDate = window.__extractedPurchaseDate || '';
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
            updateRefundState(); // ✅ Gọi lại để kiểm tra khi card đã hiển thị đủ thông tin

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

    const card = document.getElementById('refundSelectedProductsCard');
    if (!card) {
        calculateBtn.disabled = true;
        return;
    }

    // Kiểm tra xem card đã hiển thị đủ thông tin chưa
    const cardText = card.innerText || '';

    // Dò 4 yếu tố bắt buộc: Giá, Thời hạn, Mã đơn, Ngày mua
    const hasPrice = /Giá\s*:\s*\d/.test(cardText);
    const hasDuration = /Thời hạn\s*:\s*\d/.test(cardText);
    const hasOrder = /Mã\s*đơn\s*:\s*[A-Za-z0-9]/.test(cardText);
    const hasPurchaseDate = /Ngày\s*mua\s*:\s*\d{2}\/\d{2}\/\d{4}/.test(cardText);

    const isFullInfo = hasPrice && hasDuration && hasOrder && hasPurchaseDate;

   if (isFullInfo && selectedRefundProduct && selectedRefundProduct.id) {
    calculateBtn.disabled = false;
    
    // Trigger real-time calculation if available
    if (typeof calculateRefundRealTime === 'function') {
        calculateRefundRealTime();
    }
} else {
    calculateBtn.disabled = true;
}
}




function calculateRefundManual() {
    if (!selectedRefundProduct) {
        showNotification('Vui lòng chọn sản phẩm!', 'error');
        return;
    }
    
    // Check for valid date range in either card
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
    else {
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
    const unit = product.durationUnit === 'tháng' ? 'tháng' : (product.durationUnit === 'năm' ? 'năm' : 'ngày');
    if (totalDays <= 0) totalDays = 1;

    if (unit === 'tháng') {
    // Cố định mỗi tháng = 30 ngày
    totalDays = totalDays * 30;
} else if (unit === 'năm') {
    // Cố định mỗi năm = 365 ngày
    totalDays = totalDays * 365;
}
    const daysUsed = Math.max(0, Math.floor((e - s) / (1000 * 3600 * 24)));
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
    if (!resultElement) {
        showNotification('Không tìm thấy phần hiển thị kết quả!', 'error');
        return;
    }
    
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
    if (container) {
        container.classList.add('refund-grid-equal');
    }
}, 100);

    
    // ✅ Lưu kết quả hoàn tiền toàn cục để template realtime hoạt động
    window.lastRefundResult = result;
    
    // ✅ Hiển thị lại phần kết quả sau khi đã render xong
    resultElement.style.display = 'block';
    
    // Scroll to result
    setTimeout(() => {
        resultElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);


}

function createExpiredBreakdownHTML(result) {
    // Get dates from the current form inputs
    const purchaseStartDate = document.getElementById('purchaseStartDate')?.value;
    const purchaseEndDate = document.getElementById('purchaseEndDate')?.value;
    const refundStartDate = document.getElementById('refundStartDate')?.value;
    const refundEndDate = document.getElementById('refundEndDate')?.value;
    
    let startDate;
    
    if (purchaseStartDate && purchaseEndDate) {
        startDate = formatDMY(new Date(purchaseStartDate));
    } else if (refundStartDate && refundEndDate) {
        startDate = formatDMY(new Date(refundStartDate));
    } else {
        startDate = formatDMY(new Date());
    }
    
    let endDate;
    
    if (purchaseStartDate && purchaseEndDate) {
        endDate = formatDMY(new Date(purchaseEndDate));
    } else if (refundStartDate && refundEndDate) {
        endDate = formatDMY(new Date(refundEndDate));
    } else {
        endDate = formatDMY(new Date());
    }
    
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
    // Get dates from the current form inputs
    const purchaseStartDate = document.getElementById('purchaseStartDate')?.value;
    const purchaseEndDate = document.getElementById('purchaseEndDate')?.value;
    const refundStartDate = document.getElementById('refundStartDate')?.value;
    const refundEndDate = document.getElementById('refundEndDate')?.value;
    
    let startDate, endDate;
    
    // Use the dates that were actually used for calculation
    if (purchaseStartDate && purchaseEndDate) {
        startDate = formatDMY(new Date(purchaseStartDate));
        endDate = formatDMY(new Date(purchaseEndDate));
    } else if (refundStartDate && refundEndDate) {
        startDate = formatDMY(new Date(refundStartDate));
        endDate = formatDMY(new Date(refundEndDate));
    } else {
        // Fallback to current date if no dates found
        startDate = formatDMY(new Date());
        endDate = formatDMY(new Date());
    }
    
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
    // Get dates from the current form inputs
    const purchaseStartDate = document.getElementById('purchaseStartDate')?.value;
    const purchaseEndDate = document.getElementById('purchaseEndDate')?.value;
    const refundStartDate = document.getElementById('refundStartDate')?.value;
    const refundEndDate = document.getElementById('refundEndDate')?.value;
    
    let startDate;
    
    if (purchaseStartDate && purchaseEndDate) {
        startDate = formatDMY(new Date(purchaseStartDate));
    } else if (refundStartDate && refundEndDate) {
        startDate = formatDMY(new Date(refundStartDate));
    } else {
        startDate = formatDMY(new Date());
    }
    
    let endDate;
    
    if (purchaseStartDate && purchaseEndDate) {
        endDate = formatDMY(new Date(purchaseEndDate));
    } else if (refundStartDate && refundEndDate) {
        endDate = formatDMY(new Date(refundEndDate));
    } else {
        endDate = formatDMY(new Date());
    }

    let orderId = '';
    try {
        // Ưu tiên lấy từ biến toàn cục
        orderId = window.__extractedOrderId || '';

        // Nếu vẫn trống, fallback về DOM dataset (giữ tương thích)
        if (!orderId) {
            const extractedBox = document.getElementById('refundOrderExtractResult');
            if (extractedBox && extractedBox.dataset) {
                orderId = extractedBox.dataset.orderId || '';
            }
        }
    } catch { }



    const template = getSavedTemplate();

    return template
        .replace(/\{\{orderId\}\}/g, orderId || '-')
        .replace(/\{\{productName\}\}/g, result.product.name)
        .replace(/\{\{productDuration\}\}/g, result.product.duration)
        .replace(/\{\{productUnit\}\}/g, result.product.durationUnit)
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
    const purchaseStartDate = document.getElementById('purchaseStartDate');
    if (purchaseStartDate) {
        purchaseStartDate.value = iso;
        purchaseStartDate.dispatchEvent(new Event('change'));
    }
}

// Helper: set Step 3 end date (expiry date)
function setRefundEndDate(iso) {
    const refundEndDate = document.getElementById('refundEndDate');
    if (refundEndDate) {
        refundEndDate.value = iso;
        refundEndDate.dispatchEvent(new Event('change'));
    }
}

// Calculate expiry date from purchase date (+30 days)
function calculateExpiryDateFromPurchase(purchaseDateISO) {
    const purchaseDate = new Date(purchaseDateISO);
    const expiryDate = new Date(purchaseDate);
    expiryDate.setDate(expiryDate.getDate() + 30);
    return expiryDate.toISOString().split('T')[0];
}

// Clear all refund date inputs
function clearAllRefundDates() {
    const dateInputs = ['purchaseStartDate', 'purchaseEndDate', 'refundStartDate', 'refundEndDate'];
    dateInputs.forEach(id => {
        const input = document.getElementById(id);
        if (input) {
            input.value = '';
            input.dispatchEvent(new Event('change'));
        }
    });
    showNotification('Đã xóa tất cả ngày', 'info');
}


// Get currently selected refund product
function getSelectedRefundProduct() {
    return selectedRefundProduct || null;
}

// Calculate product expiry date based on duration (nhất quán với logic 30 ngày/tháng)
function calculateProductExpiryDate(product, startDate) {
    if (!product || !product.duration || !product.durationUnit) return null;
    
    const duration = parseInt(product.duration) || 0;
    const unit = product.durationUnit;
    
    if (duration <= 0) return null;
    
    const expiryDate = new Date(startDate);
    
    switch (unit) {
        case 'ngày':
            expiryDate.setDate(expiryDate.getDate() + duration);
            break;
        case 'tháng':
            // Cố định mỗi tháng = 30 ngày (nhất quán với logic tính toán)
            expiryDate.setDate(expiryDate.getDate() + (duration * 30));
            break;
        case 'năm':
            // Cố định mỗi năm = 365 ngày
            expiryDate.setDate(expiryDate.getDate() + (duration * 365));
            break;
        default:
            return null;
    }
    
    return expiryDate;
}

// Auto-fill start date with today when product is selected (legacy function)
function autoFillRefundStartDate() {
    // Only auto-fill if no time range mode is selected
    const btnRefundToExpiry = document.getElementById('btnRefundToExpiry');
    if (btnRefundToExpiry && btnRefundToExpiry.classList.contains('active')) {
        return; // Don't auto-fill if in "refund-to-expiry" mode
    }
    
    const startDate = document.getElementById('startDate');
    if (!startDate) return;
    
    // Only auto-fill if start date is empty
    if (!startDate.value) {
        const today = new Date();
        const todayISO = today.toISOString().split('T')[0];
        startDate.value = todayISO;
        startDate.dispatchEvent(new Event('change'));
    }
}

// Sync refund dates between cards
function syncRefundDates() {
    const purchaseEndDate = document.getElementById('purchaseEndDate');
    const refundStartDate = document.getElementById('refundStartDate');
    
    if (!purchaseEndDate || !refundStartDate) return;
    
    // Remove existing listeners to prevent duplicates
    purchaseEndDate.removeEventListener('change', syncPurchaseToRefund);
    refundStartDate.removeEventListener('change', syncRefundToPurchase);
    
    // Sync purchaseEndDate to refundStartDate
    purchaseEndDate.addEventListener('change', syncPurchaseToRefund);
    
    // Sync refundStartDate to purchaseEndDate
    refundStartDate.addEventListener('change', syncRefundToPurchase);
}

function syncPurchaseToRefund() {
    const purchaseEndDate = document.getElementById('purchaseEndDate');
    const refundStartDate = document.getElementById('refundStartDate');
    
    if (purchaseEndDate && refundStartDate && purchaseEndDate.value) {
        refundStartDate.value = purchaseEndDate.value;
        // Don't trigger change event to prevent infinite loop
    }
}

function syncRefundToPurchase() {
    const purchaseEndDate = document.getElementById('purchaseEndDate');
    const refundStartDate = document.getElementById('refundStartDate');
    
    if (purchaseEndDate && refundStartDate && refundStartDate.value) {
        purchaseEndDate.value = refundStartDate.value;
        // Don't trigger change event to prevent infinite loop
    }
}

// Initialize refund date sync when page loads
document.addEventListener('DOMContentLoaded', function() {
    syncRefundDates();
});

// Export functions to global scope
window.clearAllRefundDates = clearAllRefundDates;

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
        if (selectedRefundProduct && selectedRefundProduct.id) {
    updateRefundDisplay(); // ✅ tái render lại card và giữ sản phẩm
}

    }
}

// Initialize combo refund system
function initComboRefundSystem() {
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



// Force equal columns on page load
document.addEventListener('DOMContentLoaded', function() {
    document.addEventListener('DOMContentLoaded', function() {
    setTimeout(() => {
        const container = document.querySelector('.refund-results-container');
        if (container) {
            container.classList.add('refund-grid-equal');
        }
    }, 500);
});

});

// --- Minimal order extractor (order id + purchase date) ---
function extractRefundOrderInfo() {
    try {
        const input = document.getElementById('refundOrderInput');
        if (!input) {
            return;
        }

        const text = (input.value || '').trim();
        if (!text) {
            showNotification('Vui lòng dán nội dung đơn hàng!', 'error');
            return;
        }

        // Try pattern A: [Đơn hàng #71946] (28/09/2025)
        const a = parseRefundPatternA(text);
        if (a) {
            // Calculate expiry date (+30 days from purchase date)
            const calculatedExpiryDate = calculateExpiryDateFromPurchase(a.purchaseDate);
            updateOrderExtractUI(a.orderId, a.purchaseDate, calculatedExpiryDate);
            // Auto-apply purchase date to Step 3
            setRefundStartDate(a.purchaseDate);
            // Auto-apply calculated expiry date
            setRefundEndDate(calculatedExpiryDate);
            showNotification(`Đã trích xuất theo Mẫu 1. Ngày mua: ${formatDMY(new Date(a.purchaseDate))}, Ngày hết gói: ${formatDMY(new Date(calculatedExpiryDate))}`, 'success');
            // Reflect immediately in package info card
            updateRefundDisplay();
            return;
        }

        // Try pattern B: email, price, ORDERID RESELLER, statuses, date time
        const b = parseRefundPatternB(text);
        if (b) {
            // Calculate expiry date (+30 days from purchase date)
            const calculatedExpiryDate = calculateExpiryDateFromPurchase(b.purchaseDate);
            updateOrderExtractUI(b.orderId, b.purchaseDate, calculatedExpiryDate);
            // Auto-apply purchase date to Step 3
            setRefundStartDate(b.purchaseDate);
            // Auto-apply calculated expiry date
            setRefundEndDate(calculatedExpiryDate);
            showNotification(`Đã trích xuất theo Mẫu 2. Ngày mua: ${formatDMY(new Date(b.purchaseDate))}, Ngày hết gói: ${formatDMY(new Date(calculatedExpiryDate))}`, 'success');
            // Reflect immediately in package info card
            updateRefundDisplay();
            return;
        }

        showNotification('Không nhận diện được mẫu dữ liệu!', 'error');
        resultBox.style.display = 'none';
    } catch (e) {
        // Handle error silently
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
    const lines = text.split('\n').map(s => s.trim()).filter(Boolean);

    if (lines.length < 4) return null;

    // PRIORITY 1: Find line containing RESELLER
    let orderLine = lines.find(l => /RESELLER/i.test(l));

    // PRIORITY 2: If no RESELLER, find alphanumeric code BUT exclude email
    if (!orderLine) {
        orderLine = lines.find(l => {
            // Exclude lines with @ (email)
            if (l.includes('@')) return false;
            // Exclude lines with ₫ (price)
            if (l.includes('₫')) return false;
            // Exclude status words
            if (/^(PAID|SUCCESS|PENDING|FAILED)$/i.test(l)) return false;
            // Must contain alphanumeric code
            return /[A-Z0-9]{6,}/i.test(l);
        });
    }

    // Find date with dd/mm/yyyy
    const dateLine = lines.find(l => /\d{2}\/\d{2}\/\d{4}/.test(l));

    if (!orderLine || !dateLine) {
        return null;
    }

    const orderId = orderLine.trim();
    const dateMatch = dateLine.match(/(\d{2}\/\d{2}\/\d{4})/);
    if (!dateMatch) return null;

    const [dd, mm, yyyy] = dateMatch[1].split('/');
    const iso = `${yyyy}-${mm}-${dd}`;

    return { orderId, purchaseDate: iso };
}

function updateOrderExtractUI(orderId, isoDate, expiryDate = null) {
    // Store extracted data for later use
    window.__extractedOrderId = orderId;
    window.__extractedPurchaseDate = isoDate;
    window.__extractedExpiryDate = expiryDate;
    
    // Show the main products card (Bước 4) to display order info
    const selectedProductsCard = document.getElementById('refundSelectedProductsCard');
    if (selectedProductsCard) {
        selectedProductsCard.style.display = 'block';
        selectedProductsCard.style.visibility = 'visible';
        selectedProductsCard.style.opacity = '1';
    }
    
    // Force scroll to the selected products card after a short delay
    setTimeout(() => {
        if (selectedProductsCard) {
            selectedProductsCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }, 100);
}

// Removed applyExtractedOrderInfo - now auto-applied in extractRefundOrderInfo

function clearRefundOrderInfo() {
    const input = document.getElementById('refundOrderInput');
    if (input) input.value = '';
    
    // Clear order information card
    const orderIdField = document.getElementById('refundOrderId');
    const purchaseDateField = document.getElementById('refundPurchaseDate');
    const orderInfoSection = document.getElementById('refundOrderInfo');
    
    if (orderIdField) orderIdField.value = '';
    if (purchaseDateField) purchaseDateField.value = '';
    
    // Hide order information section
    if (orderInfoSection) {
        orderInfoSection.style.display = 'none';
    }
    
    // Clear stored data
    window.__extractedOrderId = null;
    window.__extractedPurchaseDate = null;
    window.__extractedExpiryDate = null;
    
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
    }
    
    updateRefundState();
}

window.clearRefundProduct = clearRefundProduct;
window.clearRefundProductSelection = clearRefundProductSelection;
window.clearRefundDates = clearRefundDates;


function getDefaultTemplate() {
    return `Kính gửi Quý khách,

Centrix xin thông tin kết quả hoàn tiền cho đơn {{productName}} {{productDuration}} {{productUnit}} như sau:
- Mã đơn hàng: {{orderId}}
- Khoảng thời gian dùng: {{startDate}} → {{endDate}}
- Số ngày còn lại: {{daysRemaining}} ngày
- Số tiền hoàn dự kiến: {{refund}}

Centrix sẽ tiến hành xử lý và chuyển hoàn trong vòng 1–2 ngày làm việc.
Trân trọng.`;
}


function getSavedTemplate() {
    // Always use default template from code, no localStorage
    return getDefaultTemplate();
}

// Export functions for use in other modules
window.calculateRefund = calculateRefund;
window.displayRefundResult = displayRefundResult;