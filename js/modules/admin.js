// ===== ADMIN MODULE =====

// New Admin UI Functions
function toggleSelectAll() {
    const selectAllCheckbox = document.getElementById('selectAll');
    const productCheckboxes = document.querySelectorAll('#productList input[type="checkbox"]');
    
    productCheckboxes.forEach(checkbox => {
        checkbox.checked = selectAllCheckbox.checked;
    });
}

function deleteSelectedProducts() {
    const selectedCheckboxes = document.querySelectorAll('#productList input[type="checkbox"]:checked');
    
    if (selectedCheckboxes.length === 0) {
        if (typeof showToast === 'function') {
            showToast('Vui lòng chọn sản phẩm để xóa', 'warning');
        }
        return;
    }
    
    if (confirm(`Bạn có chắc chắn muốn xóa ${selectedCheckboxes.length} sản phẩm đã chọn?`)) {
        // Call existing delete function for each selected product
        selectedCheckboxes.forEach(checkbox => {
            const row = checkbox.closest('tr');
            const productId = row.getAttribute('data-product-id');
            // Find and delete the product
            if (typeof deleteProduct === 'function') {
                deleteProduct(productId);
            }
        });
        
        if (typeof showToast === 'function') {
            showToast(`Đã xóa ${selectedCheckboxes.length} sản phẩm`, 'success');
        }
    }
}

function changePage(pageNumber) {
    // Implement pagination logic here
}

// Populate AI selection from existing AI products
function populateAISelection(searchQuery = '') {
    const aiSelectionGrid = document.getElementById('aiSelectionGrid');
    if (!aiSelectionGrid) return;
    
    // Clear existing checkboxes - đảm bảo clear hoàn toàn
    while (aiSelectionGrid.firstChild) {
        aiSelectionGrid.removeChild(aiSelectionGrid.firstChild);
    }
    aiSelectionGrid.innerHTML = '';
    
    // Get products from window.products or appData.products
    const products = window.products || window.appData?.products || [];
    
    if (products && products.length > 0) {
        // Filter only AI products
        const aiProducts = products.filter(product => 
            product.category === 'AI' && product.name && product.name.trim()
        );
        
        if (aiProducts.length > 0) {
            // Loại bỏ các tên trùng lặp - chuẩn hóa tên kỹ hơn
            const uniqueProducts = [];
            const seenNames = new Set();
            
            // Sắp xếp theo tên để đảm bảo thứ tự nhất quán
            const sortedProducts = [...aiProducts].sort((a, b) => {
                const nameA = (a.name || '').trim().toLowerCase();
                const nameB = (b.name || '').trim().toLowerCase();
                return nameA.localeCompare(nameB);
            });
            
            sortedProducts.forEach(product => {
                // Chuẩn hóa tên: trim, lowercase, và loại bỏ khoảng trắng thừa
                const normalizedName = (product.name || '')
                    .trim()
                    .toLowerCase()
                    .replace(/\s+/g, ' ') // Thay thế nhiều khoảng trắng thành 1 khoảng
                    .trim();
                
                if (normalizedName && !seenNames.has(normalizedName)) {
                    seenNames.add(normalizedName);
                    uniqueProducts.push(product);
                }
            });
            
            // Lọc theo search query nếu có
            let filteredProducts = uniqueProducts;
            if (searchQuery && searchQuery.trim()) {
                const query = searchQuery.trim().toLowerCase().replace(/\s+/g, ' ');
                filteredProducts = uniqueProducts.filter(product => {
                    const productName = (product.name || '').trim().toLowerCase().replace(/\s+/g, ' ');
                    return productName.includes(query);
                });
            }
            
            if (filteredProducts.length > 0) {
                // Tạo một Set để đảm bảo không có checkbox trùng lặp khi render
                const renderedNames = new Set();
                
                filteredProducts.forEach(product => {
                    const productName = (product.name || '').trim();
                    const normalizedName = productName.toLowerCase().replace(/\s+/g, ' ').trim();
                    
                    // Kiểm tra lại một lần nữa trước khi render
                    if (!renderedNames.has(normalizedName)) {
                        renderedNames.add(normalizedName);
                        
                        const checkbox = document.createElement('label');
                        checkbox.className = 'ai-checkbox';
                        checkbox.innerHTML = `
                            <input type="checkbox" value="${productName.replace(/"/g, '&quot;')}"> ${productName}
                        `;
                        aiSelectionGrid.appendChild(checkbox);
                    }
                });
            } else {
                aiSelectionGrid.innerHTML = '<p style="color: #666; font-style: italic;">Không tìm thấy sản phẩm AI nào phù hợp.</p>';
            }
        } else {
            aiSelectionGrid.innerHTML = '<p style="color: #666; font-style: italic;">Chưa có sản phẩm AI nào. Hãy thêm sản phẩm AI trước.</p>';
        }
    } else {
        aiSelectionGrid.innerHTML = '<p style="color: #666; font-style: italic;">Chưa có sản phẩm nào. Hãy thêm sản phẩm trước.</p>';
    }
}

// Show/hide combo AI selection based on category
document.addEventListener('DOMContentLoaded', function() {
    const categorySelect = document.getElementById('productCategory');
    const comboAISection = document.getElementById('comboAISection');
    const aiSearchInput = document.getElementById('aiSearchInput');
    
    // Debounce variable for search
    let searchTimeout;
    
    if (categorySelect && comboAISection) {
        categorySelect.addEventListener('change', function() {
            if (this.value === 'Combo') {
                comboAISection.style.display = 'block';
                // Clear search input when showing combo section
                if (aiSearchInput) {
                    aiSearchInput.value = '';
                }
                // Populate sau khi clear input - dùng setTimeout nhỏ để đảm bảo DOM đã cập nhật
                setTimeout(() => {
                    populateAISelection('');
                }, 50);
            } else {
                comboAISection.style.display = 'none';
                // Clear search input when hiding combo section
                if (aiSearchInput) {
                    aiSearchInput.value = '';
                }
            }
        });
    }
    
    // Add search functionality
    if (aiSearchInput) {
        // Debounce search để tránh quá nhiều lần gọi
        aiSearchInput.addEventListener('input', function() {
            clearTimeout(searchTimeout);
            const query = this.value.trim();
            searchTimeout = setTimeout(() => {
                populateAISelection(query);
            }, 300); // Đợi 300ms sau khi người dùng ngừng gõ
        });
        
        // Cũng trigger khi người dùng nhấn Enter
        aiSearchInput.addEventListener('keydown', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                clearTimeout(searchTimeout);
                populateAISelection(this.value.trim());
            }
        });
    }
});

// Export functions to global scope
window.toggleSelectAll = toggleSelectAll;
window.deleteSelectedProducts = deleteSelectedProducts;
window.changePage = changePage;
window.populateAISelection = populateAISelection;