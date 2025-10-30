// ===== QUOTE MODULE =====

let selectedQuoteProduct = null;
let selectedQuoteProducts = []; // Array để lưu nhiều sản phẩm

// Update quote tab state based on available products
function updateQuoteTab() {
    const emptyState = document.getElementById('quoteEmptyState');
    const quoteForm = document.querySelector('.quote-form');
    
    if (!emptyState || !quoteForm) {
        return;
    }
    
    const hasProducts = appData.products && appData.products.length > 0;
    
    if (hasProducts) {
        emptyState.style.display = 'none';
        quoteForm.style.display = 'block';
    } else {
        emptyState.style.display = 'block';
        quoteForm.style.display = 'none';
    }
    
    // Load settings when tab is shown
    loadQuoteSettings();
    
    resetQuoteForm();
}

// Reset quote form
function resetQuoteForm() {
    selectedQuoteProduct = null;
    selectedQuoteProducts = [];
    
    const searchInput = document.getElementById('quoteProductSearch');
    if (searchInput) searchInput.value = '';
    
    const searchResults = document.getElementById('quoteSearchResults');
    if (searchResults) {
        searchResults.classList.remove('show');
        searchResults.innerHTML = '';
        searchResults.style.display = 'none';
    }
    
    const productList = document.getElementById('quoteProductList');
    if (productList) productList.style.display = 'none';
    
    const quantityInput = document.getElementById('quoteQuantity');
    if (quantityInput) quantityInput.value = '1';
    
    const durationInput = document.getElementById('quoteDuration');
    const durationUnitSelect = document.getElementById('quoteDurationUnit');
    if (durationInput) durationInput.value = '';
    if (durationUnitSelect) durationUnitSelect.value = 'tháng';
    
    const quoteBtn = document.getElementById('quoteBtn');
    const addBtn = document.getElementById('addProductBtn');
    if (quoteBtn) quoteBtn.disabled = true;
    if (addBtn) addBtn.disabled = true;
    
    const quoteResult = document.getElementById('quoteResult');
    if (quoteResult) quoteResult.style.display = 'none';
    
    updateSelectedProductsList();
}

// Search products for quote
function searchQuoteProducts() {
    const searchInput = document.getElementById('quoteProductSearch');
    const query = searchInput ? searchInput.value.trim() : '';
    
    if (!query) {
        const searchResults = document.getElementById('quoteSearchResults');
        if (searchResults) {
            searchResults.classList.remove('show');
            searchResults.innerHTML = '';
            searchResults.style.display = 'none';
        }
        return;
    }
    
    if (typeof searchProductsByName === 'function') {
        searchProductsByName(query, 'quoteSearchResults', 'selectQuoteProduct', 'quote');
    }
}

// Select product for quote
function selectQuoteProduct(productId) {
    const product = appData.products.find(p => p.id === productId);
    if (!product) return;
    
    selectedQuoteProduct = product;
    
    const productName = document.getElementById('quoteProductName');
    const productPrice = document.getElementById('quoteProductPrice');
    const productDuration = document.getElementById('quoteProductDuration');
    const selectedProduct = document.getElementById('quoteSelectedProduct');
    
    if (productName) productName.textContent = product.name;
    if (productPrice) productPrice.textContent = formatPrice(product.price) + 'đ';
    if (productDuration) productDuration.textContent = `${product.duration} ${product.durationUnit}`;
    if (selectedProduct) selectedProduct.style.display = 'block';
    
    const searchInput = document.getElementById('quoteProductSearch');
    if (searchInput) searchInput.value = product.name;
    
    const searchResults = document.getElementById('quoteSearchResults');
    if (searchResults) {
        searchResults.classList.remove('show');
        searchResults.innerHTML = '';
        searchResults.style.display = 'none';
    }
    
    if (typeof globalSearchSelectedIndex !== 'undefined') {
        globalSearchSelectedIndex = -1;
    }
    if (typeof currentSearchContext !== 'undefined') {
        currentSearchContext = null;
    }
    
    const addBtn = document.getElementById('addProductBtn');
    if (addBtn) addBtn.disabled = false;
    
    // Set min value cho thời hạn tùy chọn = thời hạn mặc định
    const durationInput = document.getElementById('quoteDuration');
    if (durationInput && product.duration) {
        durationInput.min = product.duration;
        durationInput.placeholder = `Tối thiểu ${product.duration} ${product.durationUnit}`;
    }
}

// Add product to quote list
function addProductToQuote() {
    if (!selectedQuoteProduct) return;
    
    const quantityInput = document.getElementById('quoteQuantity');
    const quantity = Math.max(1, parseInt(quantityInput ? quantityInput.value : 1) || 1);
    
    const durationInput = document.getElementById('quoteDuration');
    const durationUnitSelect = document.getElementById('quoteDurationUnit');
    const customDuration = durationInput ? parseInt(durationInput.value) : null;
    const customDurationUnit = durationUnitSelect ? durationUnitSelect.value : 'tháng';
    
    // Validate: không cho phép nhập thời hạn tùy chọn < thời hạn mặc định
    const defaultDuration = selectedQuoteProduct.duration;
    if (customDuration && customDuration > 0 && customDuration < defaultDuration) {
        showNotification(`Thời hạn tùy chọn phải lớn hơn hoặc bằng thời hạn mặc định (${defaultDuration} ${selectedQuoteProduct.durationUnit})!`, 'error');
        if (durationInput) durationInput.focus();
        return;
    }
    
    const productToAdd = { ...selectedQuoteProduct };
    let appliedDuration = defaultDuration;
    let customCycle = 1;
    let customDurationUsed = null;
    let isCycle = false;
    let isProportional = false; // Flag để biết có tính theo tỷ lệ không
    
    if (customDuration && customDuration > 0) {
        customDurationUsed = customDuration;
        if (customDuration > defaultDuration) {
            // Tính theo tỷ lệ thời hạn thực tế
            isProportional = true;
            isCycle = false;
            appliedDuration = customDuration;
        } else {
            // Nhỏ hơn hoặc bằng mặc định: chỉ lấy giá gốc
            appliedDuration = defaultDuration;
            customCycle = 1;
        }
    }
    
    productToAdd.customDuration = customDurationUsed;
    productToAdd.appliedDuration = appliedDuration;
    productToAdd.customCycle = customCycle;
    productToAdd.isCycle = isCycle;
    productToAdd.isProportional = isProportional;
    productToAdd.unit = customDurationUnit;
    
    const existingIndex = selectedQuoteProducts.findIndex(item => 
        item.product.id === selectedQuoteProduct.id && 
        item.product.duration === productToAdd.duration && 
        item.product.unit === productToAdd.unit
    );
    
    if (existingIndex >= 0) {
        selectedQuoteProducts[existingIndex].quantity += quantity;
    } else {
        selectedQuoteProducts.push({
            product: productToAdd,
            quantity: quantity
        });
    }
    
    selectedQuoteProduct = null;
    const searchInput = document.getElementById('quoteProductSearch');
    if (searchInput) searchInput.value = '';
    if (quantityInput) quantityInput.value = '1';
    if (durationInput) durationInput.value = '';
    if (durationUnitSelect) durationUnitSelect.value = 'tháng';
    
    const searchResults = document.getElementById('quoteSearchResults');
    if (searchResults) {
        searchResults.classList.remove('show');
        searchResults.innerHTML = '';
        searchResults.style.display = 'none';
    }
    
    const addBtn = document.getElementById('addProductBtn');
    if (addBtn) addBtn.disabled = true;
    
    updateSelectedProductsList();
}

// Update selected products list display
function updateSelectedProductsList() {
    const productList = document.getElementById('quoteProductList');
    const productListContainer = document.getElementById('selectedProductsList');
    const quoteBtn = document.getElementById('quoteBtn');
    
    if (selectedQuoteProducts.length === 0) {
        if (productList) productList.style.display = 'none';
        if (quoteBtn) quoteBtn.disabled = true;
        return;
    }
    
    if (productList) productList.style.display = 'block';
    if (quoteBtn) quoteBtn.disabled = false;
    
    if (!productListContainer) return;
    
    productListContainer.innerHTML = selectedQuoteProducts.map((item, index) => {
        const prod = item.product;
        let thanhTien = prod.price * item.quantity;
        if (prod.isProportional && prod.customDuration) {
            // Tính theo tỷ lệ: giá/tháng × số tháng nhập
            const pricePerMonth = prod.price / prod.duration;
            thanhTien = Math.round(pricePerMonth * prod.customDuration) * item.quantity;
        } else if (prod.isCycle && prod.customDuration) {
            thanhTien = prod.price * item.quantity * prod.customCycle;
        }
        
        // Hiển thị giá có custom price không
        let priceDisplay = `${formatPrice(prod.price)}đ`;
        if (prod.hasCustomPrice && prod.customPrice) {
            const { warrantyFee: warrantyPercent } = getQuoteFees();
            let finalPrice = prod.customPrice;
            if (!prod.customPriceIncludesFee) {
                // Nếu giá chưa gồm phí → cộng thêm phí
                finalPrice = Math.round(prod.customPrice * (1 + warrantyPercent / 100));
            }
            priceDisplay = `${formatPrice(finalPrice)}đ <span style="color: #3182ce; font-size: 11px;">(tùy chỉnh)</span>`;
            thanhTien = finalPrice * item.quantity;
        }
        
        return `
            <div class="selected-product-item">
                <div class="selected-product-info">
                    <div class="selected-product-name">${prod.name}</div>
                    <div class="selected-product-details">
                        <span>Giá: ${priceDisplay}</span>
                        <span>Số lượng: ${item.quantity}</span>
                        <span>Thời hạn mặc định: ${prod.duration} ${prod.unit || 'tháng'}</span>
                        <span>Thời hạn tùy chọn: ${prod.customDuration ? prod.customDuration + ' tháng' : '- (không nhập)'}</span>
                        ${prod.isProportional ? `<span>Thời hạn tính báo giá: ${prod.customDuration} (tính theo tỷ lệ)</span>` : ''}
                        ${prod.isCycle ? `<span>Thời hạn tính báo giá: ${prod.customDuration} (báo giá chu kỳ x${prod.customCycle})</span>` : ''}
                        <span>Thành tiền: ${formatPrice(thanhTien)}đ</span>
                    </div>
                </div>
                <div class="selected-product-actions">
                    <button class="btn btn-outline btn-sm" onclick="window.editQuoteProductPrice && window.editQuoteProductPrice(${index})" title="Sửa giá sản phẩm">
                        <span class="btn-icon">💰</span>
                        Sửa giá
                    </button>
                    <button class="btn btn-outline btn-sm" onclick="editQuoteProduct(${index})">
                        <span class="btn-icon">✏️</span>
                        Sửa
                    </button>
                    <button class="btn btn-danger btn-sm" onclick="removeQuoteProduct(${index})">
                        <span class="btn-icon">🗑️</span>
                        Xóa
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

// Load quote settings from localStorage
function loadQuoteSettings() {
    // Xóa giá trị cũ trong localStorage nếu có
    localStorage.removeItem('quoteWarrantyFee');
    localStorage.removeItem('quoteVATFee');
    
    // Luôn reset về mặc định khi reload
    const warrantyInput = document.getElementById('quoteWarrantyFee');
    const vatInput = document.getElementById('quoteVATFee');
    
    if (warrantyInput) {
        warrantyInput.value = '10';
    }
    if (vatInput) {
        vatInput.value = '8';
    }
}

// Save quote settings to localStorage - không dùng nữa (luôn reset về mặc định khi reload)
function saveQuoteSettings() {
    // Empty function - không lưu vào localStorage
}

// Get current quote fees
function getQuoteFees() {
    const warrantyInput = document.getElementById('quoteWarrantyFee');
    const vatInput = document.getElementById('quoteVATFee');
    
    const warrantyFee = parseFloat(warrantyInput ? warrantyInput.value : 10) || 10;
    const vatFee = parseFloat(vatInput ? vatInput.value : 8) || 8;
    
    return { warrantyFee, vatFee };
}

// Calculate quote
function calculateQuote() {
    if (!selectedQuoteProducts || selectedQuoteProducts.length === 0) {
        showNotification('Vui lòng thêm sản phẩm vào danh sách!', 'error');
        return;
    }
    
    // Get fees from input fields
    const { warrantyFee: warrantyPercent, vatFee: vatPercent } = getQuoteFees();
    
    let totalOriginalPriceWithoutFee = 0; // Giá chưa có phí dịch vụ (để tính phí dịch vụ)
    let totalOriginalPriceWithFee = 0; // Giá đã có phí dịch vụ (từ custom price)
    
    selectedQuoteProducts.forEach(item => {
        const prod = item.product;
        let lineTotal = prod.price * item.quantity;
        
        // Kiểm tra custom price
        if (prod.hasCustomPrice && prod.customPrice) {
            if (prod.customPriceIncludesFee) {
                // Giá đã gồm phí dịch vụ → KHÔNG cộng thêm phí nữa
                lineTotal = prod.customPrice * item.quantity;
                totalOriginalPriceWithFee += lineTotal;
            } else {
                // Giá chưa gồm phí dịch vụ → tính phí dịch vụ như bình thường
                lineTotal = prod.customPrice * item.quantity;
                totalOriginalPriceWithoutFee += lineTotal;
            }
        } else {
            // Tính như cũ nếu không có custom price
            if (prod.isProportional && prod.customDuration) {
                // Tính theo tỷ lệ: giá/tháng × số tháng nhập
                const pricePerMonth = prod.price / prod.duration;
                lineTotal = Math.round(pricePerMonth * prod.customDuration) * item.quantity;
            } else if (prod.isCycle && prod.customDuration) {
                lineTotal = prod.price * item.quantity * prod.customCycle;
            }
            totalOriginalPriceWithoutFee += lineTotal;
        }
    });
    
    // Tổng giá trước thuế = giá chưa có phí + phí dịch vụ + giá đã có phí
    const warrantyFee = totalOriginalPriceWithoutFee * (warrantyPercent / 100);
    const totalOriginalPrice = totalOriginalPriceWithoutFee + warrantyFee + totalOriginalPriceWithFee;
    
    if (totalOriginalPrice < 200000) {
        const existingToasts = document.querySelectorAll('.toast-notification');
        existingToasts.forEach(toast => toast.remove());
        
        if (typeof createToast === 'function') {
            createToast(`Tổng giá trị đơn hàng phải từ 200k trở lên! Hiện tại: ${formatPrice(totalOriginalPrice)}đ`, 'error', 5000);
        } else {
            const toast = document.createElement('div');
            toast.className = 'toast-notification toast-error';
            toast.textContent = `Tổng giá trị đơn hàng phải từ 200k trở lên! Hiện tại: ${formatPrice(totalOriginalPrice)}đ`;
            toast.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                background: linear-gradient(135deg, #ef4444, #dc2626);
                color: white;
                padding: 12px 20px;
                border-radius: 8px;
                font-weight: 500;
                font-size: 14px;
                z-index: 10001;
                max-width: 350px;
                box-shadow: 0 4px 12px rgba(0,0,0,0.2);
                transform: translateX(100%);
                transition: transform 0.3s ease;
            `;
            document.body.appendChild(toast);
            
            setTimeout(() => {
                toast.style.transform = 'translateX(0)';
            }, 10);
            
            setTimeout(() => {
                toast.style.transform = 'translateX(100%)';
                setTimeout(() => {
                    if (toast.parentNode) {
                        toast.parentNode.removeChild(toast);
                    }
                }, 300);
            }, 5000);
        }
        
        return;
    }
    
    // Tính toán với giá trị từ input
    // warrantyFee đã được tính ở trên
    const warrantyPrice = totalOriginalPrice; // Đã bao gồm phí dịch vụ rồi
    const shouldApplyVAT = true;
    const vatAmount = shouldApplyVAT ? warrantyPrice * (vatPercent / 100) : 0;
    const finalPrice = warrantyPrice + vatAmount;
    
    const breakdown = document.getElementById('quoteBreakdown');
    if (breakdown) {
        const productListHtml = selectedQuoteProducts.map(item => {
            const prod = item.product;
            let detailLabel = `${prod.name} (${item.quantity} × `;
            let thanhTien = prod.price * item.quantity;
            
            // Kiểm tra custom price
            if (prod.hasCustomPrice && prod.customPrice) {
                const { warrantyFee: warrantyPercent } = getQuoteFees();
                let displayPrice = prod.customPrice;
                if (!prod.customPriceIncludesFee) {
                    displayPrice = Math.round(prod.customPrice * (1 + warrantyPercent / 100));
                }
                detailLabel += `${formatPrice(displayPrice)}đ (tùy chỉnh)`;
                thanhTien = displayPrice * item.quantity;
            } else {
                detailLabel += `${formatPrice(prod.price)}đ`;
                if (prod.isProportional) {
                    detailLabel += ` × ${prod.customDuration}/${prod.duration} tháng (tính theo tỷ lệ)`;
                } else if (prod.isCycle) {
                    detailLabel += ` × ${prod.customCycle} chu kỳ (${prod.customDuration} tháng)`;
                }
                
                if (prod.isProportional && prod.customDuration) {
                    const pricePerMonth = prod.price / prod.duration;
                    thanhTien = Math.round(pricePerMonth * prod.customDuration) * item.quantity;
                } else if (prod.isCycle && prod.customDuration) {
                    thanhTien = prod.price * item.quantity * prod.customCycle;
                }
            }
            detailLabel += ")";
            return `<div class="breakdown-item"><span class="breakdown-label">${detailLabel}:</span><span class="breakdown-value">${formatPrice(thanhTien)}đ</span></div>`;
        }).join('');
        
        breakdown.innerHTML = `
            ${productListHtml}
            <div class="breakdown-item">
                <span class="breakdown-label">Tổng giá gốc:</span>
                <span class="breakdown-value">${formatPrice(totalOriginalPriceWithoutFee)}đ${totalOriginalPriceWithFee > 0 ? ` + ${formatPrice(totalOriginalPriceWithFee)}đ (giá tùy chỉnh đã gồm phí)` : ''}</span>
            </div>
            ${totalOriginalPriceWithoutFee > 0 ? `<div class="breakdown-item"> 
                <span class="breakdown-label">Phí bảo hành (${warrantyPercent}%):</span>
                <span class="breakdown-value">+${formatPrice(warrantyFee)}đ</span>
            </div>` : ''}
            <div class="breakdown-item total-before-vat">
                <span class="breakdown-label">Thành tiền trước thuế:</span>
                <span class="breakdown-value">${formatPrice(warrantyPrice)}đ</span>
            </div>
            <div class="breakdown-item">
                <span class="breakdown-label">Thuế VAT (${vatPercent}%):</span>
                <span class="breakdown-value">+${formatPrice(vatAmount)}đ</span>
            </div>
            <div class="breakdown-item total">
                <span class="breakdown-label">TỔNG CỘNG:</span>
                <span class="breakdown-value">${formatPrice(finalPrice)}đ</span>
            </div>
            <div class="breakdown-item" style="grid-column:1 / -1; display:flex; align-items:center; gap:6px; padding-top:6px;">
                <span class="calc-label" style="min-width:160px;">Copy nhanh số tiền:</span>
                <div class="copy-actions" style="display:flex; gap:6px; flex-wrap:wrap;">
                    <button class="btn btn-outline btn-sm" onclick="copyQuoteNumber(this)" data-label="Trước thuế" data-value="${formatPrice(warrantyPrice)}">Trước thuế: ${formatPrice(warrantyPrice)}</button>
                    <button class="btn btn-outline btn-sm" onclick="copyQuoteNumber(this)" data-label="VAT 8%" data-value="${formatPrice(vatAmount)}">VAT 8%: ${formatPrice(vatAmount)}</button>
                    <button class="btn btn-outline btn-sm" onclick="copyQuoteNumber(this)" data-label="Tổng cộng" data-value="${formatPrice(finalPrice)}">Tổng cộng: ${formatPrice(finalPrice)}</button>
                </div>
            </div>
        `;
    }
    
    const productListText = selectedQuoteProducts.map(item => {
        const prod = item.product;
        let thanhTien = prod.price * item.quantity;
        let detailText = `• ${prod.name}: ${item.quantity} × `;
        
        // Kiểm tra custom price
        if (prod.hasCustomPrice && prod.customPrice) {
            const { warrantyFee: warrantyPercent } = getQuoteFees();
            let displayPrice = prod.customPrice;
            if (!prod.customPriceIncludesFee) {
                displayPrice = Math.round(prod.customPrice * (1 + warrantyPercent / 100));
            }
            detailText += `${formatPrice(displayPrice)}đ (tùy chỉnh)`;
            thanhTien = displayPrice * item.quantity;
        } else {
            detailText += `${formatPrice(prod.price)}đ`;
            if (prod.isProportional && prod.customDuration) {
                const pricePerMonth = prod.price / prod.duration;
                thanhTien = Math.round(pricePerMonth * prod.customDuration) * item.quantity;
                detailText += ` × ${prod.customDuration}/${prod.duration} tháng (tính theo tỷ lệ)`;
            } else if (prod.isCycle && prod.customDuration) {
                thanhTien = prod.price * item.quantity * prod.customCycle;
                detailText += ` × ${prod.customCycle} chu kỳ`;
            }
        }
        return detailText + ` = ${formatPrice(thanhTien)}đ`;
    }).join('\n');
    
    const customerContent = `BÁO GIÁ SẢN PHẨM

${productListText}

CHI TIẾT GIÁ:
• Tổng giá gốc: ${formatPrice(totalOriginalPriceWithoutFee)}đ${totalOriginalPriceWithFee > 0 ? ` + ${formatPrice(totalOriginalPriceWithFee)}đ (giá tùy chỉnh)` : ''}
${totalOriginalPriceWithoutFee > 0 ? `• Phí bảo hành (${warrantyPercent}%): ${formatPrice(warrantyFee)}đ` : ''}
• Thành tiền trước thuế: ${formatPrice(warrantyPrice)}đ
• Thuế VAT (${vatPercent}%): ${formatPrice(vatAmount)}đ

TỔNG THANH TOÁN: ${formatPrice(finalPrice)}đ

Bao gồm:
- Bảo hành kỹ thuật 24/7
- Hỗ trợ setup và cài đặt
- Hướng dẫn sử dụng chi tiết

Liên hệ ngay để được tư vấn thêm!`;
    
    const customerContentEl = document.getElementById('quoteCustomerContent');
    if (customerContentEl) {
        customerContentEl.textContent = customerContent;
    }
    
    generateInvoiceTable({
        products: selectedQuoteProducts,
        totalOriginalPrice: totalOriginalPrice,
        warrantyFee: warrantyFee,
        warrantyPrice: warrantyPrice,
        vatAmount: vatAmount,
        finalPrice: finalPrice,
        shouldApplyVAT: shouldApplyVAT
    });
    
    const quoteResult = document.getElementById('quoteResult');
    if (quoteResult) {
        quoteResult.style.display = 'block';
        quoteResult.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
    
    showNotification(`Đã tính báo giá: ${formatPrice(finalPrice)}đ`);
}

// Generate invoice table
function generateInvoiceTable(data) {
    const { products, totalOriginalPrice, warrantyFee, warrantyPrice, vatAmount, finalPrice, shouldApplyVAT } = data;
    
    // Get current fees for display
    const { warrantyFee: warrantyPercent, vatFee: vatPercent } = getQuoteFees();

    const tableHTML = `
        <table>
            <thead>
                <tr>
                    <th style="width: 50px;">TT</th>
                    <th>Sản phẩm</th>
                    <th style="width: 160px;">Đơn giá (VNĐ)<br/>(Đã bao gồm ${warrantyPercent}% dịch vụ bảo hành)</th>
                    <th style="width: 80px;">Số lượng</th>
                    <th style="width: 120px;">Thời hạn (tháng)</th>
                    <th style="width: 140px;">Thành tiền (VNĐ)</th>
                </tr>
            </thead>
            <tbody>
                ${products.map((item, index) => {
                    const prod = item.product;
                    let unitWithWarranty;
                    let lineTotal;
                    
                    // Kiểm tra custom price
                    if (prod.hasCustomPrice && prod.customPrice) {
                        if (prod.customPriceIncludesFee) {
                            // Giá đã gồm phí dịch vụ
                            unitWithWarranty = prod.customPrice;
                            lineTotal = prod.customPrice * item.quantity;
                        } else {
                            // Giá chưa gồm phí → cộng thêm phí
                            unitWithWarranty = Math.round(prod.customPrice * (1 + warrantyPercent / 100));
                            lineTotal = unitWithWarranty * item.quantity;
                        }
                    } else {
                        // Tính như cũ
                        unitWithWarranty = Math.round(prod.price * (1 + warrantyPercent / 100));
                        lineTotal = prod.price * item.quantity;
                        if (prod.isProportional && prod.customDuration) {
                            const pricePerMonth = prod.price / prod.duration;
                            lineTotal = Math.round(pricePerMonth * prod.customDuration) * item.quantity;
                        } else if (prod.isCycle && prod.customDuration) {
                            lineTotal = prod.price * item.quantity * prod.customCycle;
                        }
                        lineTotal = Math.round(lineTotal * (1 + warrantyPercent / 100));
                    }
                    
                    // Hiển thị số tháng đơn giản
                    let displayDuration = prod.duration;
                    if (prod.customDuration && prod.customDuration > 0) {
                        displayDuration = prod.customDuration;
                    }
                    return `
                <tr>
                    <td class="text-center">${index + 1}</td>
                    <td>Dịch vụ cho thuê tài khoản ${prod.name}</td>
                    <td class="text-right">${formatPrice(unitWithWarranty)}</td>
                    <td class="text-center">${item.quantity}</td>
                    <td class="text-center">${displayDuration}</td>
                    <td class="text-right">${formatPrice(lineTotal)}</td>
                </tr>
                `;
                }).join('')}
            </tbody>
        </table>

        <div style="margin-top:12px; font-family: 'Times New Roman', serif; font-size: 12pt;">
            <ul style="margin: 8px 0 0 18px; padding: 0;">
                <li><strong>Thành tiền trước thuế:</strong> ${formatPrice(warrantyPrice)} VNĐ</li>
                <li><strong>Thuế VAT (${vatPercent}%):</strong> ${formatPrice(vatAmount)} VNĐ</li>
                <li><strong>Tổng cộng:</strong> ${formatPrice(finalPrice)} VNĐ</li>
            </ul>
            <p style="margin-top:10px;"><strong>Viết bằng chữ:</strong> ${convertNumberToWords(finalPrice)} đồng${shouldApplyVAT ? ' (Đã bao gồm VAT)' : ''}.</p>
        </div>
    `;

    const invoiceTable = document.getElementById('invoiceTable');
    if (invoiceTable) {
        invoiceTable.innerHTML = tableHTML;
    }
}

// Convert number to Vietnamese words
function convertNumberToWords(number) {
    const ones = ['', 'một', 'hai', 'ba', 'bốn', 'năm', 'sáu', 'bảy', 'tám', 'chín'];
    const tens = ['', '', 'hai mười', 'ba mười', 'bốn mười', 'năm mười', 'sáu mười', 'bảy mười', 'tám mười', 'chín mười'];
    const scales = ['', 'nghìn', 'triệu', 'tỷ'];
    
    if (number === 0) return 'không';
    
    function convertGroup(num) {
        let result = '';
        const hundreds = Math.floor(num / 100);
        const remainder = num % 100;
        const tensDigit = Math.floor(remainder / 10);
        const onesDigit = remainder % 10;
        
        if (hundreds > 0) {
            result += ones[hundreds] + ' trăm';
            if (remainder > 0) result += ' ';
        }
        
        if (tensDigit > 1) {
            result += ones[tensDigit] + ' mười';
            if (onesDigit > 0) {
                result += ' ' + ones[onesDigit];
            }
        } else if (tensDigit === 1) {
            result += 'mười';
            if (onesDigit > 0) {
                result += ' ' + ones[onesDigit];
            }
        } else if (onesDigit > 0) {
            result += ones[onesDigit];
        }
        
        return result.trim();
    }
    
    const groups = [];
    let tempNumber = Math.floor(number);
    
    while (tempNumber > 0) {
        groups.push(tempNumber % 1000);
        tempNumber = Math.floor(tempNumber / 1000);
    }
    
    let result = '';
    for (let i = groups.length - 1; i >= 0; i--) {
        if (groups[i] > 0) {
            const groupText = convertGroup(groups[i]);
            if (groupText) {
                if (result) result += ' ';
                result += groupText;
                if (i > 0) result += ' ' + scales[i];
            }
        }
    }
    
    return result.charAt(0).toUpperCase() + result.slice(1);
}

// Copy quote result
function copyQuoteResult() {
    const content = document.getElementById('quoteCustomerContent');
    if (!content) return;
    
    const textArea = document.createElement('textarea');
    textArea.value = content.textContent;
    document.body.appendChild(textArea);
    textArea.select();
    document.execCommand('copy');
    document.body.removeChild(textArea);
    
    showNotification('Đã copy báo giá!');
}

// Refresh quote data
function refreshQuoteData() {
    updateQuoteTab();
    showNotification('Đã làm mới dữ liệu báo giá!');
}

// Toggle between quote views
function toggleQuoteView(viewType) {
    const breakdownView = document.getElementById('quoteBreakdownView');
    const tableView = document.getElementById('quoteTableView');
    
    if (viewType === 'breakdown') {
        if (breakdownView) breakdownView.classList.add('active');
        if (tableView) tableView.classList.remove('active');
    } else if (viewType === 'table') {
        if (breakdownView) breakdownView.classList.remove('active');
        if (tableView) tableView.classList.add('active');
    }
}

// Copy invoice table
function copyInvoiceTable() {
    const table = document.getElementById('invoiceTable');
    if (!table) return;
    
    const originalTable = table.querySelector('table');
    const rows = originalTable.querySelectorAll('tr');
    
    let cleanHTML = `
<table border="1" cellpadding="4" cellspacing="0" style="
    border-collapse: collapse; 
    width: 100%; 
    font-family: 'Times New Roman', serif; 
    font-size: 11pt;
    margin: 0;
    border: 1px solid black;
">`;
    
    rows.forEach(row => {
        const isHeader = row.querySelector('th');
        let rowStyle = '';
        if (isHeader) {
            rowStyle = 'background-color: #f0f0f0; font-weight: bold; text-align: center; height: 30px;';
        } else {
            rowStyle = 'height: 25px;';
        }
        
        cleanHTML += `<tr style="${rowStyle}">`;
        
        const cells = row.querySelectorAll('th, td');
        cells.forEach(cell => {
            const tagName = cell.tagName.toLowerCase();
            const colspan = cell.getAttribute('colspan') || '';
            const colspanAttr = colspan ? ` colspan="${colspan}"` : '';
            
            let cellStyle = 'padding: 4px 6px; border: 1px solid black; vertical-align: middle;';
            
            if (cell.classList.contains('text-center')) {
                cellStyle += ' text-align: center;';
            } else if (cell.classList.contains('text-right')) {
                cellStyle += ' text-align: right; font-weight: normal;';
            } else if (isHeader) {
                cellStyle += ' text-align: center; font-weight: bold;';
            } else {
                cellStyle += ' text-align: center;';
            }
            
            const cellContent = cell.textContent.trim();
            cleanHTML += `<${tagName} style="${cellStyle}"${colspanAttr}>${cellContent}</${tagName}>`;
        });
        
        cleanHTML += '</tr>';
    });
    
    cleanHTML += '</table>';
    
    if (navigator.clipboard && window.ClipboardItem) {
        const blob = new Blob([cleanHTML], { type: 'text/html' });
        const clipboardItem = new ClipboardItem({ 'text/html': blob });
        navigator.clipboard.write([clipboardItem]).then(() => {
            showNotification('Đã copy bảng báo giá! Paste vào Word sẽ có format đẹp.');
        }).catch(() => {
            copyAsText(table);
        });
    } else {
        copyAsText(table);
    }
}

// Fallback function to copy as text
function copyAsText(table) {
    let textContent = '';
    
    const tableElement = table.querySelector('table');
    if (tableElement) {
        const rows = tableElement.querySelectorAll('tr');
        rows.forEach(row => {
            const cells = row.querySelectorAll('th, td');
            const rowText = Array.from(cells).map(cell => {
                const text = cell.textContent.trim();
                const colspan = cell.getAttribute('colspan');
                if (colspan && parseInt(colspan) > 1) {
                    return text + '\t'.repeat(parseInt(colspan) - 1);
                }
                return text;
            }).join('\t');
            textContent += rowText + '\n';
        });
    }
    
    const textArea = document.createElement('textarea');
    textArea.value = textContent;
    document.body.appendChild(textArea);
    textArea.select();
    document.execCommand('copy');
    document.body.removeChild(textArea);
    
    showNotification('Đã copy bảng báo giá dạng text!');
}

// Print invoice table
function printInvoiceTable() {
    const table = document.getElementById('invoiceTable');
    if (!table) return;
    
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
        <html>
            <head>
                <title>Bảng báo giá</title>
                <style>
                    body { font-family: Arial, sans-serif; margin: 20px; }
                    table { width: 100%; border-collapse: collapse; }
                    th, td { border: 1px solid #333; padding: 8px; text-align: left; }
                    th { background-color: #f5f5f5; text-align: center; font-weight: bold; }
                    .text-center { text-align: center; }
                    .text-right { text-align: right; }
                </style>
            </head>
            <body>
                <h2>BẢNG BÁO GIÁ</h2>
                ${table.innerHTML}
            </body>
        </html>
    `);
    printWindow.document.close();
    printWindow.print();
    
    showNotification('Đã mở cửa sổ in!');
}

// Remove product from quote list
function removeQuoteProduct(index) {
    if (index >= 0 && index < selectedQuoteProducts.length) {
        selectedQuoteProducts.splice(index, 1);
        updateSelectedProductsList();
        showNotification('Đã xóa sản phẩm khỏi danh sách!');
    }
}

// Edit product in quote list
let editingQuoteIndex = -1;
let editingTempProduct = null;

function editQuoteProduct(index) {
    if (index < 0 || index >= selectedQuoteProducts.length) return;
    
    editingQuoteIndex = index;
    const item = selectedQuoteProducts[index];
    const prod = item.product;
    
    // Pre-fill product info
    editingTempProduct = appData.products.find(p => p.id === prod.id);
    if (editingTempProduct) {
        document.getElementById('editQuoteProductName').textContent = editingTempProduct.name;
        document.getElementById('editQuoteProductPrice').textContent = formatPrice(editingTempProduct.price) + 'đ';
        document.getElementById('editQuoteProductDuration').textContent = `${editingTempProduct.duration} ${editingTempProduct.durationUnit}`;
        
        const selectedDisplay = document.getElementById('editQuoteSelectedProduct');
        const noProductDisplay = document.getElementById('editQuoteNoProductSelected');
        if (selectedDisplay) selectedDisplay.style.display = 'block';
        if (noProductDisplay) noProductDisplay.style.display = 'none';
    }
    
    // Pre-fill form
    document.getElementById('editQuoteProductSearch').value = prod.name;
    document.getElementById('editQuoteQuantity').value = item.quantity;
    document.getElementById('editQuoteDuration').value = prod.customDuration || '';
    
    // Set min value cho thời hạn tùy chọn = thời hạn mặc định
    const editDurationInput = document.getElementById('editQuoteDuration');
    if (editDurationInput && editingTempProduct.duration) {
        editDurationInput.min = editingTempProduct.duration;
        editDurationInput.placeholder = `Tối thiểu ${editingTempProduct.duration} ${editingTempProduct.durationUnit}`;
    }
    
    // Show modal
    const modal = document.getElementById('editQuoteProductModal');
    if (modal) modal.classList.add('show');
}

function closeEditQuoteProductModal() {
    const modal = document.getElementById('editQuoteProductModal');
    if (modal) modal.classList.remove('show');
    
    editingQuoteIndex = -1;
    editingTempProduct = null;
    
    document.getElementById('editQuoteProductSearch').value = '';
    document.getElementById('editQuoteQuantity').value = '1';
    document.getElementById('editQuoteDuration').value = '';
    
    const selectedDisplay = document.getElementById('editQuoteSelectedProduct');
    const noProductDisplay = document.getElementById('editQuoteNoProductSelected');
    if (selectedDisplay) selectedDisplay.style.display = 'none';
    if (noProductDisplay) noProductDisplay.style.display = 'block';
    
    const searchResults = document.getElementById('editQuoteSearchResults');
    if (searchResults) {
        searchResults.innerHTML = '';
        searchResults.style.display = 'none';
        searchResults.classList.remove('show');
    }
}

function selectEditQuoteProduct(productId) {
    const product = appData.products.find(p => p.id === productId);
    if (!product) return;
    
    editingTempProduct = product;
    
    document.getElementById('editQuoteProductName').textContent = product.name;
    document.getElementById('editQuoteProductPrice').textContent = formatPrice(product.price) + 'đ';
    document.getElementById('editQuoteProductDuration').textContent = `${product.duration} ${product.durationUnit}`;
    document.getElementById('editQuoteProductSearch').value = product.name;
    
    // Set min value cho thời hạn tùy chọn = thời hạn mặc định
    const editDurationInput = document.getElementById('editQuoteDuration');
    if (editDurationInput && product.duration) {
        editDurationInput.min = product.duration;
        editDurationInput.placeholder = `Tối thiểu ${product.duration} ${product.durationUnit}`;
    }
    
    const selectedDisplay = document.getElementById('editQuoteSelectedProduct');
    const noProductDisplay = document.getElementById('editQuoteNoProductSelected');
    if (selectedDisplay) selectedDisplay.style.display = 'block';
    if (noProductDisplay) noProductDisplay.style.display = 'none';
    
    const searchResults = document.getElementById('editQuoteSearchResults');
    if (searchResults) {
        searchResults.innerHTML = '';
        searchResults.style.display = 'none';
        searchResults.classList.remove('show');
    }
}

function saveEditQuoteProduct() {
    if (editingQuoteIndex < 0 || !editingTempProduct) {
        showNotification('Vui lòng chọn sản phẩm!', 'error');
        return;
    }
    
    const quantity = Math.max(1, parseInt(document.getElementById('editQuoteQuantity').value) || 1);
    const customDuration = parseInt(document.getElementById('editQuoteDuration').value) || null;
    
    // Validate: không cho phép nhập thời hạn tùy chọn < thời hạn mặc định
    const defaultDuration = editingTempProduct.duration;
    if (customDuration && customDuration > 0 && customDuration < defaultDuration) {
        showNotification(`Thời hạn tùy chọn phải lớn hơn hoặc bằng thời hạn mặc định (${defaultDuration} ${editingTempProduct.durationUnit})!`, 'error');
        document.getElementById('editQuoteDuration').focus();
        return;
    }
    
    const productToUpdate = { ...editingTempProduct };
    let appliedDuration = defaultDuration;
    let customCycle = 1;
    let customDurationUsed = null;
    let isCycle = false;
    let isProportional = false;
    
    if (customDuration && customDuration > 0) {
        customDurationUsed = customDuration;
        if (customDuration > defaultDuration) {
            // Tính theo tỷ lệ thời hạn thực tế
            isProportional = true;
            isCycle = false;
            appliedDuration = customDuration;
        } else {
            appliedDuration = defaultDuration;
            customCycle = 1;
        }
    }
    
    productToUpdate.customDuration = customDurationUsed;
    productToUpdate.appliedDuration = appliedDuration;
    productToUpdate.customCycle = customCycle;
    productToUpdate.isCycle = isCycle;
    productToUpdate.isProportional = isProportional;
    productToUpdate.unit = editingTempProduct.durationUnit;
    
    // Giữ lại custom price nếu có
    const oldProduct = selectedQuoteProducts[editingQuoteIndex].product;
    if (oldProduct.hasCustomPrice && oldProduct.customPrice) {
        productToUpdate.hasCustomPrice = oldProduct.hasCustomPrice;
        productToUpdate.customPrice = oldProduct.customPrice;
        productToUpdate.customPriceIncludesFee = oldProduct.customPriceIncludesFee;
    }
    
    selectedQuoteProducts[editingQuoteIndex] = {
        product: productToUpdate,
        quantity: quantity
    };
    
            updateSelectedProductsList();
    closeEditQuoteProductModal();
    showNotification('Đã cập nhật sản phẩm!');
}

// Search for edit modal
function searchEditQuoteProducts() {
    const searchInput = document.getElementById('editQuoteProductSearch');
    const query = searchInput ? searchInput.value.trim() : '';
    const searchResults = document.getElementById('editQuoteSearchResults');
    
    if (!query || !searchResults) {
        if (searchResults) {
            searchResults.innerHTML = '';
            searchResults.style.display = 'none';
            searchResults.classList.remove('show');
        }
        return;
    }
    
    const qN = query.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const hits = (appData.products || []).filter(p => {
        const nameN = (p.name || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        return nameN.includes(qN);
    }).slice(0, 20);
    
    if (hits.length === 0) {
        searchResults.innerHTML = '<div class="search-result-item">Không tìm thấy sản phẩm</div>';
        searchResults.style.display = 'block';
        searchResults.classList.add('show');
        return;
    }
    
    searchResults.innerHTML = hits.map(p => `
        <div class="search-result-item" onclick="selectEditQuoteProduct('${p.id}')">
            <div class="result-info">
                <div class="result-name">${p.name}</div>
                <div class="result-details">
                    <span class="result-price">${formatPrice(p.price)}đ</span>
                    <span class="result-duration">${p.duration} ${p.durationUnit}</span>
                </div>
            </div>
        </div>
    `).join('');
    searchResults.style.display = 'block';
    searchResults.classList.add('show');
}

// Clear all quote products
function clearQuoteProducts() {
    if (selectedQuoteProducts.length > 0 && confirm('Bạn có chắc muốn xóa tất cả sản phẩm?')) {
        selectedQuoteProducts = [];
        updateSelectedProductsList();
        showNotification('Đã xóa tất cả sản phẩm!');
    }
}

// Edit quote product price
let editingPriceIndex = -1;

function editQuoteProductPrice(index) {
    if (index < 0 || index >= selectedQuoteProducts.length) {
        showNotification('Không tìm thấy sản phẩm!', 'error');
        return;
    }
    
    editingPriceIndex = index;
        const item = selectedQuoteProducts[index];
    const prod = item.product;
    
    const modal = document.getElementById('editQuoteProductPriceModal');
    if (!modal) {
        showNotification('Không tìm thấy modal sửa giá!', 'error');
        return;
    }
    
    // Lấy phí dịch vụ hiện tại
    const { warrantyFee: warrantyPercent } = getQuoteFees();
    
    // Tính giá tự động với phí dịch vụ
    let basePrice = prod.price;
    if (prod.isProportional && prod.customDuration) {
        const pricePerMonth = prod.price / prod.duration;
        basePrice = Math.round(pricePerMonth * prod.customDuration);
    } else if (prod.isCycle && prod.customCycle) {
        basePrice = prod.price * prod.customCycle;
    }
    const autoPriceWithFee = Math.round(basePrice * (1 + warrantyPercent / 100));
    
    // Điền thông tin vào modal
    const productNameEl = document.getElementById('editPriceProductName');
    const originalPriceEl = document.getElementById('editPriceOriginalPrice');
    const autoPriceEl = document.getElementById('editPriceAutoPrice');
    const customPriceInput = document.getElementById('editPriceCustomPrice');
    
    if (!productNameEl || !originalPriceEl || !autoPriceEl || !customPriceInput) {
        showNotification('Lỗi: Không tìm thấy các trường trong modal!', 'error');
        return;
    }
    
    productNameEl.textContent = prod.name;
    originalPriceEl.textContent = formatPrice(basePrice) + 'đ';
    autoPriceEl.textContent = formatPrice(autoPriceWithFee) + 'đ';
    
    // Điền giá custom nếu có
    if (prod.hasCustomPrice && prod.customPrice) {
        customPriceInput.value = prod.customPrice;
        if (prod.customPriceIncludesFee) {
            document.getElementById('customPriceType1').checked = true;
        } else {
            document.getElementById('customPriceType2').checked = true;
        }
    } else {
        customPriceInput.value = '';
        document.getElementById('customPriceType1').checked = false;
        document.getElementById('customPriceType2').checked = false;
    }
    
    // Hiển thị modal
    modal.style.display = 'flex';
    modal.style.visibility = 'visible';
    modal.style.opacity = '1';
    
    // Đảm bảo modal được hiển thị và focus vào input
    setTimeout(() => {
        if (modal.style.display !== 'flex') {
            modal.style.display = 'flex';
        }
        if (customPriceInput) {
            customPriceInput.focus();
        }
    }, 100);
}

function closeEditQuoteProductPriceModal() {
    const modal = document.getElementById('editQuoteProductPriceModal');
    if (modal) {
        modal.style.display = 'none';
        modal.style.visibility = 'hidden';
        modal.style.opacity = '0';
    }
    editingPriceIndex = -1;
    
    // Reset form
    const customPriceInput = document.getElementById('editPriceCustomPrice');
    if (customPriceInput) customPriceInput.value = '';
    const type1 = document.getElementById('customPriceType1');
    const type2 = document.getElementById('customPriceType2');
    if (type1) type1.checked = false;
    if (type2) type2.checked = false;
}

function saveQuoteProductPrice() {
    if (editingPriceIndex < 0 || editingPriceIndex >= selectedQuoteProducts.length) {
        showNotification('Không tìm thấy sản phẩm!', 'error');
        return;
    }
    
    const customPriceInput = document.getElementById('editPriceCustomPrice');
    const customPriceType1 = document.getElementById('customPriceType1');
    const customPriceType2 = document.getElementById('customPriceType2');
    
    if (!customPriceInput) return;
    
    const customPrice = parseInt(customPriceInput.value) || null;
    
    // Kiểm tra xem có chọn loại giá không
    if (!customPriceType1.checked && !customPriceType2.checked) {
        showNotification('Vui lòng chọn loại giá tùy chỉnh!', 'error');
        return;
    }
    
    if (!customPrice || customPrice <= 0) {
        showNotification('Vui lòng nhập giá hợp lệ!', 'error');
        customPriceInput.focus();
        return;
    }
    
    // Lưu vào product
    const item = selectedQuoteProducts[editingPriceIndex];
    const prod = item.product;
    
    // Clone product để không ảnh hưởng đến data gốc
    const updatedProduct = { ...prod };
    updatedProduct.hasCustomPrice = true;
    updatedProduct.customPrice = customPrice;
    updatedProduct.customPriceIncludesFee = customPriceType1.checked; // true = đã gồm phí, false = chưa gồm phí
    
    selectedQuoteProducts[editingPriceIndex] = {
        product: updatedProduct,
        quantity: item.quantity
    };
    
    updateSelectedProductsList();
    
    // Đóng modal trước khi hiển thị notification
    closeEditQuoteProductPriceModal();
    
    // Hiển thị notification sau khi đóng modal
    setTimeout(() => {
        showNotification('Đã lưu giá tùy chỉnh!');
    }, 100);
}

// Copy helper for breakdown amounts
function copyQuoteNumber(btn) {
    try {
        const val = btn?.getAttribute('data-value') || '';
        const label = btn?.getAttribute('data-label') || '';
        if (!val) return;
        navigator.clipboard.writeText(val).then(() => {
            showNotification(`Đã copy ${label ? label + ': ' : ''}${val}`);
        }).catch(() => {
            const ta = document.createElement('textarea');
            ta.value = val; 
            document.body.appendChild(ta); 
            ta.select(); 
            document.execCommand('copy'); 
            document.body.removeChild(ta);
            showNotification(`Đã copy ${label ? label + ': ' : ''}${val}`);
        });
    } catch (e) {
        showNotification('Không copy được!', 'error');
    }
}

// Event bindings
document.addEventListener('DOMContentLoaded', () => {
    // Load quote settings from localStorage
    loadQuoteSettings();
    
    // Note: saveQuoteSettings không làm gì vì không lưu vào localStorage
    // Giữ event listeners để tương lai có thể thêm lại tính năng lưu nếu cần
    
    const quoteSearch = document.getElementById('quoteProductSearch');
    if (quoteSearch) {
        quoteSearch.addEventListener('input', searchQuoteProducts);
        quoteSearch.addEventListener('focus', searchQuoteProducts);
        quoteSearch.addEventListener('keydown', function(e) {
            if (typeof handleGlobalSearchKeydown === 'function') {
                handleGlobalSearchKeydown(e);
            }
        });
    }
    
    const editQuoteSearch = document.getElementById('editQuoteProductSearch');
    if (editQuoteSearch) {
        editQuoteSearch.addEventListener('input', searchEditQuoteProducts);
        editQuoteSearch.addEventListener('focus', searchEditQuoteProducts);
    }
    
    document.addEventListener('click', (e) => {
        const searchContainer = document.querySelector('#quote .search-container');
        const searchResults = document.getElementById('quoteSearchResults');
        
        if (searchContainer && searchResults && !searchContainer.contains(e.target)) {
            searchResults.classList.remove('show');
            searchResults.innerHTML = '';
            searchResults.style.display = 'none';
        }
        
        const editModal = document.getElementById('editQuoteProductModal');
        const editSearchContainer = editModal ? editModal.querySelector('.search-container') : null;
        const editSearchResults = document.getElementById('editQuoteSearchResults');
        if (editModal && editSearchContainer && editSearchResults && !editSearchContainer.contains(e.target)) {
            editSearchResults.innerHTML = '';
            editSearchResults.style.display = 'none';
            editSearchResults.classList.remove('show');
        }
        
        // Close price modal when clicking outside
        const priceModal = document.getElementById('editQuoteProductPriceModal');
        if (priceModal && e.target === priceModal) {
            closeEditQuoteProductPriceModal();
        }
    });
    
    // Close modals on ESC key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            const priceModal = document.getElementById('editQuoteProductPriceModal');
            if (priceModal && priceModal.style.display === 'flex') {
                closeEditQuoteProductPriceModal();
            }
        }
    });
});

// Export functions to global scope
window.updateQuoteTab = updateQuoteTab;
window.selectQuoteProduct = selectQuoteProduct;
window.calculateQuote = calculateQuote;
window.copyQuoteResult = copyQuoteResult;
window.refreshQuoteData = refreshQuoteData;
window.generateInvoiceTable = generateInvoiceTable;
window.toggleQuoteView = toggleQuoteView;
window.copyInvoiceTable = copyInvoiceTable;
window.printInvoiceTable = printInvoiceTable;
window.addProductToQuote = addProductToQuote;
window.removeQuoteProduct = removeQuoteProduct;
window.editQuoteProduct = editQuoteProduct;
window.clearQuoteProducts = clearQuoteProducts;
window.copyQuoteNumber = copyQuoteNumber;
window.updateSelectedProductsList = updateSelectedProductsList;
window.closeEditQuoteProductModal = closeEditQuoteProductModal;
window.saveEditQuoteProduct = saveEditQuoteProduct;
window.selectEditQuoteProduct = selectEditQuoteProduct;
window.loadQuoteSettings = loadQuoteSettings;
window.saveQuoteSettings = saveQuoteSettings;
window.getQuoteFees = getQuoteFees;
window.editQuoteProductPrice = editQuoteProductPrice;
window.closeEditQuoteProductPriceModal = closeEditQuoteProductPriceModal;
window.saveQuoteProductPrice = saveQuoteProductPrice;
