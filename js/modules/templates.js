// ===== TEMPLATES =====
let selectedTemplateProduct = null;

(function initTpl() {
    const i = document.getElementById('templateProductSearch');
    i?.addEventListener('input', function () {
        searchProducts(this.value, 'templateSearchResults', 'selectTemplateProduct');
        selectedTemplateProduct = null;
        document.getElementById('generateBtn').disabled = true;
    });
})();
function selectTemplateProduct(id) {
    const p = (appData.products || []).find(x => x.id === id); if (!p) return;
    selectedTemplateProduct = p;
    document.getElementById('templateProductSearch').value = p.name;
    document.getElementById('templateSearchResults').classList.remove('show');
    document.getElementById('generateBtn').disabled = false;
}
window.selectTemplateProduct = selectTemplateProduct;

function generateTemplate() {
    if (!selectedTemplateProduct) return showNotification('Vui lòng chọn sản phẩm!', 'error');
    const name = (document.getElementById('customerName')?.value || '').trim();
    const p = selectedTemplateProduct, dur = p.durationUnit === 'tháng' ? `${p.duration} tháng` : (p.durationUnit === 'năm' ? `${p.duration} năm` : `${p.duration} ngày`);
    const msg = `${name ? `Chào ${name}!` : 'Chào bạn!'}\n\nGói: ${p.name}\nGiá: ${formatPrice(p.price)}đ\nThời hạn: ${dur}\n\n✨ TÍNH NĂNG:\n• Dễ dùng • Nhanh • Bảo mật\n\nNếu cần mình kích hoạt ngay trong ngày.`;
    document.getElementById('templateContent').textContent = msg;
    document.getElementById('templateResult').style.display = 'block';
    showNotification('Đã tạo template!');
}
window.generateTemplate = generateTemplate;

function copyTemplate() {
    const txt = document.getElementById('templateContent').textContent || '';
    if (!txt) return showNotification('Chưa có nội dung!', 'error');
    navigator.clipboard.writeText(txt).then(() => showNotification('Đã copy!'));
}
window.copyTemplate = copyTemplate;

function updateTemplateTab() {
    const has = (appData.products || []).length > 0;
    const emptyState = document.getElementById('templateEmptyState');
    const templateForm = document.querySelector('.template-form');
    
    if (emptyState) emptyState.style.display = has ? 'none' : 'block';
    if (templateForm) templateForm.style.display = has ? 'block' : 'none';
}
window.updateTemplateTab = updateTemplateTab;