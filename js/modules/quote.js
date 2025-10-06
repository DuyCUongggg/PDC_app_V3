// ===== QUOTE MODULE =====

let selectedQuoteProduct = null;
let selectedQuoteProducts = []; // Array để lưu nhiều sản phẩm

// Update quote tab state based on available products
function updateQuoteTab() {
    
    const emptyState = document.getElementById('quoteEmptyState');
    const quoteForm = document.querySelector('.quote-form');
    
    if (!emptyState || !quoteForm) {
        // Handle error silently
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
    
    // Reset form state
    resetQuoteForm();
}

// Reset quote form
function resetQuoteForm() {
    selectedQuoteProduct = null;
    selectedQuoteProducts = [];
    
    // Clear search input
    const searchInput = document.getElementById('quoteProductSearch');
    if (searchInput) searchInput.value = '';
    
    // Clear search results
    const searchResults = document.getElementById('quoteSearchResults');
    if (searchResults) {
        searchResults.classList.remove('show');
        searchResults.innerHTML = '';
        searchResults.style.display = 'none';
    }
    
    // Hide product list
    const productList = document.getElementById('quoteProductList');
    if (productList) productList.style.display = 'none';
    
    // Reset quantity
    const quantityInput = document.getElementById('quoteQuantity');
    if (quantityInput) quantityInput.value = '1';
    
    // Disable buttons
    const quoteBtn = document.getElementById('quoteBtn');
    const addBtn = document.getElementById('addProductBtn');
    if (quoteBtn) quoteBtn.disabled = true;
    if (addBtn) addBtn.disabled = true;
    
    // Hide results
    const quoteResult = document.getElementById('quoteResult');
    if (quoteResult) quoteResult.style.display = 'none';
    
    // Clear product list display
    updateSelectedProductsList();
}

// Search products for quote
function searchQuoteProducts() {
    const searchInput = document.getElementById('quoteProductSearch');
    const query = searchInput ? searchInput.value.trim() : '';
    
    // If query is empty, hide results
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
    
    // Update selected product display
    const productName = document.getElementById('quoteProductName');
    const productPrice = document.getElementById('quoteProductPrice');
    const productDuration = document.getElementById('quoteProductDuration');
    const selectedProduct = document.getElementById('quoteSelectedProduct');
    
    if (productName) productName.textContent = product.name;
    if (productPrice) productPrice.textContent = formatPrice(product.price) + 'đ';
    if (productDuration) productDuration.textContent = `${product.duration} ${product.durationUnit}`;
    if (selectedProduct) selectedProduct.style.display = 'block';
    
    // Update search input
    const searchInput = document.getElementById('quoteProductSearch');
    if (searchInput) searchInput.value = product.name;
    
    // Hide search results
    const searchResults = document.getElementById('quoteSearchResults');
    if (searchResults) {
        searchResults.classList.remove('show');
        searchResults.innerHTML = '';
        searchResults.style.display = 'none';
    }
    
    // Reset global search state
    if (typeof globalSearchSelectedIndex !== 'undefined') {
        globalSearchSelectedIndex = -1;
    }
    if (typeof currentSearchContext !== 'undefined') {
        currentSearchContext = null;
    }
    
    // Enable add product button
    const addBtn = document.getElementById('addProductBtn');
    if (addBtn) addBtn.disabled = false;
    
    showNotification('Đã chọn sản phẩm: ' + product.name);
}


// Calculate quote
function calculateQuote() {
    if (!selectedQuoteProducts || selectedQuoteProducts.length === 0) {
        showNotification('Vui lòng thêm sản phẩm vào danh sách!', 'error');
        return;
    }
    
    // Tính toán tổng cho tất cả sản phẩm
    let totalOriginalPrice = 0;
    selectedQuoteProducts.forEach(item => {
        totalOriginalPrice += item.product.price * item.quantity;
    });
    
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
            
            // Animate in
            setTimeout(() => {
                toast.style.transform = 'translateX(0)';
            }, 10);
            
            // Auto remove sau 5 giây với animation
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
    
    // Cộng 10% dịch vụ bảo hành vào đơn giá (tính ở tổng)
    const warrantyFee = totalOriginalPrice * 0.10;
    const warrantyPrice = totalOriginalPrice + warrantyFee;
    
    // Tính VAT (8%)
    const shouldApplyVAT = true;
    
    // Tính VAT (8%) nếu đủ điều kiện
    const vatAmount = shouldApplyVAT ? warrantyPrice * 0.08 : 0;
    const finalPrice = warrantyPrice + vatAmount;
    
    // Display breakdown
    const breakdown = document.getElementById('quoteBreakdown');
    if (breakdown) {
        const productListHtml = selectedQuoteProducts.map(item => `
            <div class="breakdown-item">
                <span class="breakdown-label">${item.product.name} (${item.quantity} × ${formatPrice(item.product.price)}đ):</span>
                <span class="breakdown-value">${formatPrice(item.product.price * item.quantity)}đ</span>
            </div>
        `).join('');
        
        breakdown.innerHTML = `
            ${productListHtml}
            <div class=\"breakdown-item\">
                <span class=\"breakdown-label\">Tổng giá gốc:</span>
                <span class=\"breakdown-value\">${formatPrice(totalOriginalPrice)}đ</span>
            </div>
            <div class=\"breakdown-item\"> 
                <span class=\"breakdown-label\">Phí bảo hành (10%):</span>
                <span class=\"breakdown-value\">+${formatPrice(warrantyFee)}đ</span>
            </div>
            <div class=\"breakdown-item total-before-vat\">
                <span class=\"breakdown-label\">Thành tiền trước thuế:</span>
                <span class=\"breakdown-value\">${formatPrice(warrantyPrice)}đ</span>
            </div>
            <div class=\"breakdown-item\">
                <span class=\"breakdown-label\">Thuế VAT (8%):</span>
                <span class=\"breakdown-value\">+${formatPrice(vatAmount)}đ</span>
            </div>
            <div class=\"breakdown-item total\">
                <span class=\"breakdown-label\">TỔNG CỘNG:</span>
                <span class=\"breakdown-value\">${formatPrice(finalPrice)}đ</span>
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
    
    // Generate customer content
    const productListText = selectedQuoteProducts.map(item => 
        `• ${item.product.name}: ${item.quantity} × ${formatPrice(item.product.price)}đ = ${formatPrice(item.product.price * item.quantity)}đ`
    ).join('\n');
    
    const customerContent = `BÁO GIÁ SẢN PHẨM

${productListText}

CHI TIẾT GIÁ:
• Tổng giá gốc: ${formatPrice(totalOriginalPrice)}đ
• Phí bảo hành (10%): ${formatPrice(warrantyFee)}đ
• Thành tiền trước thuế: ${formatPrice(warrantyPrice)}đ
• Thuế VAT (8%): ${formatPrice(vatAmount)}đ

TỔNG THANH TOÁN: ${formatPrice(finalPrice)}đ

Bao gồm:
- Bảo hành kỹ thuật 24/7
- Hỗ trợ setup và cài đặt
- Hướng dẫn sử dụng chi tiết

Liên hệ ngay để được tư vấn thêm!`;
    
    // Display customer content
    const customerContentEl = document.getElementById('quoteCustomerContent');
    if (customerContentEl) {
        customerContentEl.textContent = customerContent;
    }
    
    // Generate invoice table
    generateInvoiceTable({
        products: selectedQuoteProducts,
        totalOriginalPrice: totalOriginalPrice,
        warrantyFee: warrantyFee,
        warrantyPrice: warrantyPrice,
        vatAmount: vatAmount,
        finalPrice: finalPrice,
        shouldApplyVAT: shouldApplyVAT
    });
    
    // Show results (default to breakdown view)
    const quoteResult = document.getElementById('quoteResult');
    if (quoteResult) {
        quoteResult.style.display = 'block';
        quoteResult.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
    
    // Both views now show simultaneously
    
    showNotification(`Đã tính báo giá: ${formatPrice(finalPrice)}đ`);
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

// Event bindings
document.addEventListener('DOMContentLoaded', () => {
    // Quote product search
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
    
    // Quantity input - removed since we're not using updateQuoteQuantityDisplay anymore
    
    // Click outside to close search results
    document.addEventListener('click', (e) => {
        const searchContainer = document.querySelector('#quote .search-container');
        const searchResults = document.getElementById('quoteSearchResults');
        
        if (searchContainer && searchResults && !searchContainer.contains(e.target)) {
            searchResults.classList.remove('show');
            searchResults.innerHTML = '';
            searchResults.style.display = 'none';
        }
    });
});

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

// Generate invoice table (similar to the image)
function generateInvoiceTable(data) {
    const { products, totalOriginalPrice, warrantyFee, warrantyPrice, vatAmount, finalPrice, shouldApplyVAT } = data;

    const tableHTML = `
        <table>
            <thead>
                <tr>
                    <th style="width: 50px;">TT</th>
                    <th>Sản phẩm</th>
                    <th style="width: 160px;">Đơn giá (VNĐ)<br/>(Đã bao gồm 10% dịch vụ bảo hành)</th>
                    <th style="width: 80px;">Số lượng</th>
                    <th style="width: 120px;">Thời hạn (tháng)</th>
                    <th style="width: 140px;">Thành tiền (VNĐ)</th>
                </tr>
            </thead>
            <tbody>
                ${products.map((item, index) => {
                    const unitWithWarranty = Math.round(item.product.price * 1.1);
                    const lineTotal = unitWithWarranty * item.quantity;
                    return `
                <tr>
                    <td class="text-center">${index + 1}</td>
                    <td>Dịch vụ cho thuê tài khoản ${item.product.name}</td>
                    <td class="text-right">${formatPrice(unitWithWarranty)}</td>
                    <td class="text-center">${item.quantity}</td>
                    <td class="text-center">${item.product.duration < 1 ? '01' : String(item.product.duration).padStart(2, '0')}</td>
                    <td class="text-right">${formatPrice(lineTotal)}</td>
                </tr>
                `;
                }).join('')}
            </tbody>
        </table>

        <div style="margin-top:12px; font-family: 'Times New Roman', serif; font-size: 12pt;">
            <ul style="margin: 8px 0 0 18px; padding: 0;">
                <li><strong>Thành tiền trước thuế:</strong> ${formatPrice(warrantyPrice)} VNĐ</li>
                <li><strong>Thuế VAT (8%):</strong> ${formatPrice(vatAmount)} VNĐ</li>
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
    
    // Get table data and create clean HTML for Word
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
        const isSubtotal = row.classList.contains('subtotal-row');
        const isVat = row.classList.contains('vat-row');
        const isTotal = row.classList.contains('total-row');
        const isNote = row.classList.contains('note-row');
        
        let rowStyle = '';
        if (isHeader) {
            rowStyle = 'background-color: #f0f0f0; font-weight: bold; text-align: center; height: 30px;';
        } else if (isSubtotal || isVat) {
            rowStyle = 'font-weight: bold; height: 25px;';
        } else if (isTotal) {
            rowStyle = 'font-weight: bold; height: 25px;';
        } else if (isNote) {
            rowStyle = 'font-style: italic; font-size: 10pt; height: auto;';
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
            } else if (isNote) {
                cellStyle += ' text-align: left; padding: 6px;';
            } else {
                cellStyle += ' text-align: center;';
            }
            
            const cellContent = cell.textContent.trim();
            cleanHTML += `<${tagName} style="${cellStyle}"${colspanAttr}>${cellContent}</${tagName}>`;
        });
        
        cleanHTML += '</tr>';
    });
    
    cleanHTML += '</table>';
    
    // Copy to clipboard
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
                // Handle colspan cells
                const text = cell.textContent.trim();
                const colspan = cell.getAttribute('colspan');
                if (colspan && parseInt(colspan) > 1) {
                    // Add extra tabs for colspan
                    return text + '\t'.repeat(parseInt(colspan) - 1);
                }
                return text;
            }).join('\t');
            textContent += rowText + '\n';
        });
    }
    
    // Copy to clipboard
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
                    .subtotal-row, .vat-row { background-color: #f9f9f9; font-weight: 500; }
                    .total-row { background-color: #e3f2fd; font-weight: bold; }
                    .note-row { background-color: #ffffff; }
                    .note-text { font-style: italic; font-size: 12px; padding: 10px; text-align: left; }
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

// Add product to quote list
function addProductToQuote() {
    if (!selectedQuoteProduct) return;
    
    const quantityInput = document.getElementById('quoteQuantity');
    const quantity = Math.max(1, parseInt(quantityInput ? quantityInput.value : 1) || 1);
    
    // Check if product already exists in list
    const existingIndex = selectedQuoteProducts.findIndex(item => item.product.id === selectedQuoteProduct.id);
    
    if (existingIndex >= 0) {
        // Update quantity if product exists
        selectedQuoteProducts[existingIndex].quantity += quantity;
    } else {
        // Add new product
        selectedQuoteProducts.push({
            product: selectedQuoteProduct,
            quantity: quantity
        });
    }
    
    // Reset form
    selectedQuoteProduct = null;
    const searchInput = document.getElementById('quoteProductSearch');
    if (searchInput) searchInput.value = '';
    if (quantityInput) quantityInput.value = '1';
    
    // Hide search results
    const searchResults = document.getElementById('quoteSearchResults');
    if (searchResults) {
        searchResults.classList.remove('show');
        searchResults.innerHTML = '';
        searchResults.style.display = 'none';
    }
    
    // Disable add button
    const addBtn = document.getElementById('addProductBtn');
    if (addBtn) addBtn.disabled = true;
    
    // Update display
    updateSelectedProductsList();
    
    showNotification(`Đã thêm sản phẩm vào danh sách!`);
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
    
    productListContainer.innerHTML = selectedQuoteProducts.map((item, index) => `
        <div class="selected-product-item">
            <div class="selected-product-info">
                <div class="selected-product-name">${item.product.name}</div>
                <div class="selected-product-details">
                    <span>Giá: ${formatPrice(item.product.price)}đ</span>
                    <span>Số lượng: ${item.quantity}</span>
                    <span>Thời hạn: ${item.product.duration} ${item.product.durationUnit}</span>
                    <span>Tổng: ${formatPrice(item.product.price * item.quantity)}đ</span>
                </div>
            </div>
            <div class="selected-product-actions">
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
    `).join('');
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
function editQuoteProduct(index) {
    if (index >= 0 && index < selectedQuoteProducts.length) {
        const item = selectedQuoteProducts[index];
        const newQuantity = prompt('Nhập số lượng mới:', item.quantity);
        
        if (newQuantity && !isNaN(newQuantity) && parseInt(newQuantity) > 0) {
            selectedQuoteProducts[index].quantity = parseInt(newQuantity);
            updateSelectedProductsList();
            showNotification('Đã cập nhật số lượng!');
        }
    }
}

// Clear all quote products
function clearQuoteProducts() {
    if (selectedQuoteProducts.length > 0 && confirm('Bạn có chắc muốn xóa tất cả sản phẩm?')) {
        selectedQuoteProducts = [];
        updateSelectedProductsList();
        showNotification('Đã xóa tất cả sản phẩm!');
    }
}

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
            ta.value = val; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta);
            showNotification(`Đã copy ${label ? label + ': ' : ''}${val}`);
        });
    } catch (e) {
        // Handle error silently
        showNotification('Không copy được!', 'error');
    }
}
window.copyQuoteNumber = copyQuoteNumber;
