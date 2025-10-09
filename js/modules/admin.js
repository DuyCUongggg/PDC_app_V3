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
function populateAISelection() {
    const aiSelectionGrid = document.getElementById('aiSelectionGrid');
    if (!aiSelectionGrid) return;
    
    // Clear existing checkboxes
    aiSelectionGrid.innerHTML = '';
    
    // Get products from window.products or appData.products
    const products = window.products || window.appData?.products || [];
    
    if (products && products.length > 0) {
        // Filter only AI products
        const aiProducts = products.filter(product => 
            product.category === 'AI'
        );
        
        if (aiProducts.length > 0) {
            aiProducts.forEach(product => {
                const checkbox = document.createElement('label');
                checkbox.className = 'ai-checkbox';
                checkbox.innerHTML = `
                    <input type="checkbox" value="${product.name}"> ${product.name}
                `;
                aiSelectionGrid.appendChild(checkbox);
            });
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
    
    if (categorySelect && comboAISection) {
        categorySelect.addEventListener('change', function() {
            if (this.value === 'Combo') {
                comboAISection.style.display = 'block';
                populateAISelection();
            } else {
                comboAISection.style.display = 'none';
            }
        });
    }
});

// Export functions to global scope
window.toggleSelectAll = toggleSelectAll;
window.deleteSelectedProducts = deleteSelectedProducts;
window.changePage = changePage;
window.populateAISelection = populateAISelection;