// ===== ENHANCED UPGRADE MODULE - FINAL VERSION =====

class UpgradeManager {
    constructor() {
        this.selectedCurrentProduct = null;
        this.selectedNewProduct = null;
        this.isCalculating = false;
        this.currentCustomerMessages = null;
        this.currentSearchSelectedIndex = -1;
        this.newSearchSelectedIndex = -1;
        this.init();
    }

    init() {
        this.bindEvents();
        this.setDefaultDates();
        this.updateEmptyState();
    }

    bindEvents() {
        // Product search inputs
        const currentSearch = document.getElementById('currentProductSearch');
        const newSearch = document.getElementById('newProductSearch');

        if (currentSearch) {
            currentSearch.setAttribute('autocomplete', 'off');
            currentSearch.addEventListener('input', (e) => this.handleCurrentProductSearch(e.target.value));
            currentSearch.addEventListener('focus', () => this.highlightSearchField('current'));
            currentSearch.addEventListener('blur', () => this.unhighlightSearchField('current'));
            currentSearch.addEventListener('keydown', (e) => this.handleSearchKeydown(e, 'current'));
        }

        if (newSearch) {
            newSearch.setAttribute('autocomplete', 'off');
            newSearch.addEventListener('input', (e) => this.handleNewProductSearch(e.target.value));
            newSearch.addEventListener('focus', () => this.highlightSearchField('new'));
            newSearch.addEventListener('blur', () => this.unhighlightSearchField('new'));
            newSearch.addEventListener('keydown', (e) => this.handleSearchKeydown(e, 'new'));
        }

        // Date inputs with validation
        ['upgradeStartDate', 'upgradeEndDate'].forEach(id => {
            const input = document.getElementById(id);
            if (input) {
                input.addEventListener('change', () => this.handleDateChange());
                input.addEventListener('blur', () => this.validateDate(id));
            }
        });

        // Refresh button
        const refreshBtn = document.getElementById('upgradeRefreshBtn');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => this.refreshData());
        }

        // Upgrade button
        const upgradeBtn = document.getElementById('upgradeBtn');
        if (upgradeBtn) {
            upgradeBtn.addEventListener('click', () => this.calculateUpgrade());
        }
    }

    setDefaultDates() {
        const today = new Date();
        const startDate = new Date();
        startDate.setDate(today.getDate() - 7);

        const startInput = document.getElementById('upgradeStartDate');
        const endInput = document.getElementById('upgradeEndDate');

        if (startInput) startInput.value = startDate.toISOString().slice(0, 10);
        if (endInput) endInput.value = today.toISOString().slice(0, 10);
    }

    highlightSearchField(type) {
        const field = document.getElementById(`${type}ProductSearch`);
        if (field) {
            field.parentElement.classList.add('search-focused');
        }
    }

    unhighlightSearchField(type) {
        setTimeout(() => {
            const field = document.getElementById(`${type}ProductSearch`);
            if (field) {
                field.parentElement.classList.remove('search-focused');
            }
        }, 200);
    }

    handleCurrentProductSearch(value) {
        if (!value.trim()) {
            this.selectedCurrentProduct = null;
            this.currentSearchSelectedIndex = -1;
            this.updateState();
            this.updateDisplay();
            this.hideSearchResults('currentProductSearchResults');
            return;
        }

        this.currentSearchSelectedIndex = -1;
        this.searchProducts(value, 'currentProductSearchResults', 'current');
    }

    handleNewProductSearch(value) {
        if (!value.trim()) {
            this.selectedNewProduct = null;
            this.newSearchSelectedIndex = -1;
            this.updateState();
            this.updateDisplay();
            this.hideSearchResults('newProductSearchResults');
            return;
        }

        this.newSearchSelectedIndex = -1;
        this.searchProducts(value, 'newProductSearchResults', 'new');
    }

    searchProducts(query, resultsId, type) {
        const results = document.getElementById(resultsId);
        if (!results) return;

        const products = (appData.products || []).filter(product => 
            product.name.toLowerCase().includes(query.toLowerCase())
        );

        if (products.length === 0) {
            results.innerHTML = '<div class="no-results">Không tìm thấy sản phẩm</div>';
            results.style.display = 'block';
            return;
        }

        const selectedIndex = type === 'current' ? this.currentSearchSelectedIndex : this.newSearchSelectedIndex;
        const html = products.map((product, index) => `
            <div class="search-result-item ${index === selectedIndex ? 'selected' : ''}" 
                 onclick="upgradeManager.selectProduct('${product.id}', '${type}')" 
                 data-index="${index}">
                <div class="result-info">
                    <div class="result-name">${product.name}</div>
                    <div class="result-details">
                        <span class="result-price">${formatPrice(product.price)}đ</span>
                        <span class="result-duration">${product.duration} ${product.durationUnit}</span>
                        <span class="result-category">${product.category}</span>
                    </div>
                </div>
            </div>
        `).join('');

        results.innerHTML = html;
        results.style.display = 'block';
        results.classList.add('show');
    }

    selectProduct(id, type) {
        const product = (appData.products || []).find(p => p.id === id);
        if (!product) return;

        if (type === 'current') {
            this.selectedCurrentProduct = product;
            document.getElementById('currentProductSearch').value = product.name;
            this.hideSearchResults('currentProductSearchResults');
            this.currentSearchSelectedIndex = -1;
        } else {
            this.selectedNewProduct = product;
            document.getElementById('newProductSearch').value = product.name;
            this.hideSearchResults('newProductSearchResults');
            this.newSearchSelectedIndex = -1;
        }

        this.updateDisplay();
        this.updateState();
    }

    hideSearchResults(resultsId) {
        const results = document.getElementById(resultsId);
        if (results) {
            results.classList.remove('show');
            setTimeout(() => {
                results.style.display = 'none';
                results.innerHTML = '';
            }, 200);
        }
    }

    handleSearchKeydown(e, type) {
        const resultsId = type === 'current' ? 'currentProductSearchResults' : 'newProductSearchResults';
        const results = document.getElementById(resultsId);
        if (!results || results.style.display === 'none') return;
        
        const items = results.querySelectorAll('.search-result-item');
        if (items.length === 0) return;
        
        const selectedIndex = type === 'current' ? this.currentSearchSelectedIndex : this.newSearchSelectedIndex;
        
        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                if (type === 'current') {
                    this.currentSearchSelectedIndex = Math.min(this.currentSearchSelectedIndex + 1, items.length - 1);
                } else {
                    this.newSearchSelectedIndex = Math.min(this.newSearchSelectedIndex + 1, items.length - 1);
                }
                this.updateSearchSelection(type);
                break;
            case 'ArrowUp':
                e.preventDefault();
                if (type === 'current') {
                    this.currentSearchSelectedIndex = Math.max(this.currentSearchSelectedIndex - 1, -1);
                } else {
                    this.newSearchSelectedIndex = Math.max(this.newSearchSelectedIndex - 1, -1);
                }
                this.updateSearchSelection(type);
                break;
            case 'Enter':
                e.preventDefault();
                const currentSelectedIndex = type === 'current' ? this.currentSearchSelectedIndex : this.newSearchSelectedIndex;
                if (currentSelectedIndex >= 0 && currentSelectedIndex < items.length) {
                    const selectedItem = items[currentSelectedIndex];
                    const productId = selectedItem.getAttribute('onclick').match(/'([^']+)'/)[1];
                    this.selectProduct(productId, type);
                }
                break;
            case 'Escape':
                e.preventDefault();
                this.hideSearchResults(resultsId);
                if (type === 'current') {
                    this.currentSearchSelectedIndex = -1;
                } else {
                    this.newSearchSelectedIndex = -1;
                }
                break;
        }
    }

    updateSearchSelection(type) {
        const resultsId = type === 'current' ? 'currentProductSearchResults' : 'newProductSearchResults';
        const results = document.getElementById(resultsId);
        if (!results) return;
        
        const items = results.querySelectorAll('.search-result-item');
        const selectedIndex = type === 'current' ? this.currentSearchSelectedIndex : this.newSearchSelectedIndex;
        
        items.forEach((item, index) => {
            if (index === selectedIndex) {
                item.classList.add('selected');
                item.scrollIntoView({ block: 'nearest' });
            } else {
                item.classList.remove('selected');
            }
        });
    }

    showSuccessFeedback(type) {
        // No visual success highlight needed
        return;
    }

    handleDateChange() {
        this.validateDateRange();
        this.updateState();
        // Preview removed per user request
    }

    validateDate(inputId) {
        const input = document.getElementById(inputId);
        if (!input || !input.value) return;

        const date = new Date(input.value);
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Validate date is not in future
        if (date > today) {
            this.showDateError(inputId, 'Ngày không thể trong tương lai');
            return false;
        }

        this.clearDateError(inputId);
        return true;
    }

    validateDateRange() {
        const startInput = document.getElementById('upgradeStartDate');
        const endInput = document.getElementById('upgradeEndDate');

        if (!startInput?.value || !endInput?.value) return;

        const startDate = new Date(startInput.value);
        const endDate = new Date(endInput.value);

        if (endDate < startDate) {
            this.showDateError('upgradeEndDate', 'Ngày đổi không thể trước ngày mua');
            return false;
        }

        const daysDiff = Math.ceil((endDate - startDate) / (1000 * 3600 * 24));
        if (daysDiff > 365) {
            this.showDateError('upgradeEndDate', 'Khoảng thời gian quá dài (tối đa 365 ngày)');
            return false;
        }

        this.clearDateError('upgradeStartDate');
        this.clearDateError('upgradeEndDate');
        return true;
    }

    showDateError(inputId, message) {
        const input = document.getElementById(inputId);
        if (!input) return;

        const container = input.parentElement;
        const existingError = container.querySelector('.date-error');
        
        if (existingError) {
            existingError.textContent = message;
        } else {
            const errorEl = document.createElement('div');
            errorEl.className = 'date-error';
            errorEl.textContent = message;
            container.appendChild(errorEl);
        }

        container.classList.add('has-error');
    }

    clearDateError(inputId) {
        const input = document.getElementById(inputId);
        if (!input) return;

        const container = input.parentElement;
        const error = container.querySelector('.date-error');
        if (error) error.remove();
        container.classList.remove('has-error');
    }

    updateState() {
        const startDate = document.getElementById('upgradeStartDate')?.value;
        const endDate = document.getElementById('upgradeEndDate')?.value;
        const datesValid = this.validateDateRange();
        
        const canCalculate = !!(
            this.selectedCurrentProduct && 
            this.selectedNewProduct && 
            startDate && 
            endDate && 
            datesValid &&
            !this.isCalculating
        );

        const btn = document.getElementById('upgradeBtn');
        if (btn) {
            btn.disabled = !canCalculate;
            
            // Update button text based on state
            if (this.isCalculating) {
                btn.innerHTML = '<span class="btn-icon">⏳</span> Đang tính...';
            } else if (!canCalculate) {
                btn.innerHTML = '<span class="btn-icon">🧮</span> Tính đổi gói';
            } else {
                btn.innerHTML = '<span class="btn-icon">🧮</span> Tính đổi gói';
            }
        }
    }

    updateDisplay() {
        const container = document.getElementById('upgradeSelectedProducts');
        
        if (!this.selectedCurrentProduct || !this.selectedNewProduct) {
            if (container) container.style.display = 'none';
            return;
        }

        if (container) container.style.display = 'block';

        // Update product comparison display
        this.updateProductComparison();
        
        // Show calculation preview if dates are selected
        // Preview feature removed
    }

    updateProductComparison() {
        // Current product details
        const currentElements = {
            name: document.getElementById('currentProductName'),
            price: document.getElementById('currentProductPrice'),
            duration: document.getElementById('currentProductDuration')
        };

        // New product details
        const newElements = {
            name: document.getElementById('newProductName'),
            price: document.getElementById('newProductPrice'),
            duration: document.getElementById('newProductDuration')
        };

        if (currentElements.name) currentElements.name.textContent = this.selectedCurrentProduct.name;
        if (currentElements.price) currentElements.price.textContent = formatPrice(this.selectedCurrentProduct.price) + 'đ';
        if (currentElements.duration) currentElements.duration.textContent = `${this.selectedCurrentProduct.duration} ${this.selectedCurrentProduct.durationUnit}`;

        if (newElements.name) newElements.name.textContent = this.selectedNewProduct.name;
        if (newElements.price) newElements.price.textContent = formatPrice(this.selectedNewProduct.price) + 'đ';
        if (newElements.duration) newElements.duration.textContent = `${this.selectedNewProduct.duration} ${this.selectedNewProduct.durationUnit}`;

        // Add price comparison indicator
        this.showPriceComparison();
    }

    // Preview feature removed

    showPriceComparison() {
        const currentCard = document.querySelector('.current-product');
        const newCard = document.querySelector('.new-product');
        
        if (!currentCard || !newCard || !this.selectedCurrentProduct || !this.selectedNewProduct) return;

        // Remove existing indicators
        currentCard.classList.remove('cheaper', 'more-expensive', 'same-price');
        newCard.classList.remove('cheaper', 'more-expensive', 'same-price');

        const currentPrice = this.selectedCurrentProduct.price;
        const newPrice = this.selectedNewProduct.price;

        if (newPrice > currentPrice) {
            newCard.classList.add('more-expensive');
            currentCard.classList.add('cheaper');
        } else if (newPrice < currentPrice) {
            newCard.classList.add('cheaper');
            currentCard.classList.add('more-expensive');
        } else {
            newCard.classList.add('same-price');
            currentCard.classList.add('same-price');
        }
    }

    async calculateUpgrade() {
        if (!this.selectedCurrentProduct || !this.selectedNewProduct) {
            showNotification('Vui lòng chọn cả gói hiện tại và gói mới!', 'error');
            return;
        }

        this.isCalculating = true;
        this.updateState();

        try {
            // Get dates
            const startDate = new Date(document.getElementById('upgradeStartDate').value || '');
            const endDate = new Date(document.getElementById('upgradeEndDate').value || '');

            if (isNaN(startDate) || isNaN(endDate)) {
                throw new Error('Chọn đủ ngày!');
            }

            if (endDate < startDate) {
                throw new Error('Ngày đổi không thể trước ngày mua!');
            }

            // Calculate upgrade details
            const details = this.performCalculation(startDate, endDate);

            // Display results
            this.displayResults(details);
            
            showNotification('Đã tính đổi gói thành công!', 'success');

        } catch (error) {
            showNotification(error.message, 'error');
            this.hideCalculationResult();
        } finally {
            this.isCalculating = false;
            this.updateState();
        }
    }

    performCalculation(startDate, endDate) {
        const daysUsed = Math.ceil((endDate - startDate) / (1000 * 3600 * 24));

        // Convert duration to days by calendar
        const currentTotalDays = this.getDaysFromDuration(
            this.selectedCurrentProduct.duration,
            this.selectedCurrentProduct.durationUnit,
            startDate
        );

        const newTotalDays = this.getDaysFromDuration(
            this.selectedNewProduct.duration,
            this.selectedNewProduct.durationUnit,
            endDate // upgrade starts at endDate
        );

        const remainingDays = currentTotalDays - daysUsed;
        
        if (remainingDays <= 0) {
            throw new Error('Gói hiện tại đã hết hạn!');
        }

        // Calculate refund amount (proportional, rounded to nearest)
        const isSameDay = daysUsed === 0;
        const refundAmount = Math.round
            ? Math.round((remainingDays / currentTotalDays) * this.selectedCurrentProduct.price)
            : Math.round((remainingDays / currentTotalDays) * this.selectedCurrentProduct.price);

        // Price per day for new package
        const pricePerDayNew = this.getPerDay(this.selectedNewProduct.price, newTotalDays);

        return {
            startDate,
            endDate,
            daysUsed,
            remainingDays,
            currentTotalDays,
            newTotalDays,
            isSameDay,
            refundAmount,
            pricePerDayNew,
            scenarios: this.calculateUpgradeScenarios(refundAmount, pricePerDayNew, newTotalDays, endDate)
        };
    }

    calculateUpgradeScenarios(refundAmount, pricePerDayNew, newTotalDays, upgradeDate) {
        const newPackagePrice = this.selectedNewProduct.price;
        const scenarios = [];

        // Guard invalid per-day
        const safePerDay = Math.max(0, Number(pricePerDayNew) || 0);
        const safeRefund = Math.max(0, Number(refundAmount) || 0);

        // OPTION 1: Đổi theo tỷ lệ (không bù thêm tiền)
        const proportionalDays = safePerDay > 0 ? Math.floor(safeRefund / safePerDay) : 0;
        if (proportionalDays > 0) {
            const proportionalEndDate = new Date(upgradeDate);
            proportionalEndDate.setDate(proportionalEndDate.getDate() + proportionalDays);
            scenarios.push({
                type: 'proportional',
                topupAmount: 0,
                totalDays: proportionalDays,
                moneyRefunded: 0,
                startDate: new Date(upgradeDate),
                endDate: proportionalEndDate,
                description: `Không bù thêm - ${proportionalDays} ngày`
            });
        }

        // OPTION 2: Bù đủ full package (chỉ khi cần bù > 0)
        const topupAmount = Math.max(0, (Number(newPackagePrice) || 0) - safeRefund);
        if (topupAmount > 0) {
            const fullEndDate = new Date(upgradeDate);
            fullEndDate.setDate(fullEndDate.getDate() + newTotalDays);
            scenarios.push({
                type: 'full_topup',
                topupAmount: topupAmount,
                totalDays: newTotalDays,
                moneyRefunded: 0,
                startDate: new Date(upgradeDate),
                endDate: fullEndDate,
                description: `Bù thêm ${formatPrice(topupAmount)}đ - ${newTotalDays} ngày (${this.selectedNewProduct.duration} ${this.selectedNewProduct.durationUnit})`
            });
        }

        return {
            availableScenarios: scenarios.map(s => s.type),
            scenarios
        };
    }

    showCalculationLoading() {
        // Animation removed per user preference
        const resultContainer = document.getElementById('upgradeResult');
        if (resultContainer) {
            resultContainer.style.display = 'block';
            resultContainer.innerHTML = '';
        }
    }

    animateLoadingSteps() {
        const steps = document.querySelectorAll('.loading-step');
        steps.forEach((step, index) => {
            setTimeout(() => {
                step.classList.add('active');
            }, index * 300);
        });
    }

    displayResults(details) {
        const resultEl = document.getElementById('upgradeResult');
        if (resultEl) {
            resultEl.style.display = 'block';
        }
        const breakdown = this.generateBreakdownHTML(details);
        const customerMessages = this.generateCustomerMessages(details);

        let customerContent = '';
        if (details.scenarios.availableScenarios.length === 1) {
            customerContent = `
                <div class="single-option-content">
                    <h6>Nội dung gửi khách</h6>
                    <pre class="upgrade-code">${customerMessages[0].content}</pre>
                    <button class="btn btn-primary" onclick="upgradeManager.copyResult(0)">
                        <span class="btn-icon">📋</span>
                        Copy nội dung gửi khách
                    </button>
                </div>
            `;
        } else {
            customerContent = `
                <div class="multiple-options-content">
                    <h6>Nội dung gửi khách - 2 lựa chọn</h6>
                    <div class="options-tabs">
                        <button class="option-tab active" onclick="upgradeManager.switchOption(0)">
                            ${customerMessages[0].title}
                        </button>
                        <button class="option-tab" onclick="upgradeManager.switchOption(1)">
                            ${customerMessages[1].title}
                        </button>
                    </div>
                    <div class="option-content active" id="option-0">
                        <pre class="upgrade-code">${customerMessages[0].content}</pre>
                        <button class="btn btn-primary" onclick="upgradeManager.copyResult(0, event)">
                            <span class="btn-icon">📋</span>
                            Copy - ${customerMessages[0].title}
                        </button>
                    </div>
                    <div class="option-content" id="option-1">
                        <pre class="upgrade-code">${customerMessages[1].content}</pre>
                        <button class="btn btn-primary" onclick="upgradeManager.copyResult(1, event)">
                            <span class="btn-icon">📋</span>
                            Copy - ${customerMessages[1].title}
                        </button>
                    </div>
                </div>
            `;
        }

        document.getElementById('upgradeResult').innerHTML = `
            <div class="result-header">
                <h4>Kết quả đổi gói</h4>
                <div class="result-actions">
                    <button class="btn btn-outline btn-sm" onclick="upgradeManager.refreshData()">
                        <span class="btn-icon">🔄</span>
                        Làm mới
                    </button>
                </div>
            </div>
            
            <div class="result-sections">
                <div class="result-section">
                    <h5>Chi tiết tính toán</h5>
                    <div id="upgradeBreakdown" class="breakdown enhanced-breakdown">
                        ${breakdown}
                    </div>
                </div>
                
                <div class="result-section">
                    ${customerContent}
                </div>
            </div>
        `;

        // Store customer messages for later use
        this.currentCustomerMessages = customerMessages;
    }

    generateBreakdownHTML(details) {
        const scenarios = details.scenarios.scenarios;
        const availableScenarios = details.scenarios.availableScenarios;
        const currentProduct = this.selectedCurrentProduct;
        const newProduct = this.selectedNewProduct;
        
        // Tính toán chính xác
        const currentPricePerDay = this.getPerDay(currentProduct.price, details.currentTotalDays);
        
        // Tính giá/ngày cho gói mới theo số ngày lịch chính xác
        const newPricePerDay = this.getPerDay(newProduct.price, details.newTotalDays);
        
        const priceDifference = newPricePerDay - currentPricePerDay;
        const savingsPercentage = Math.round((details.refundAmount / currentProduct.price) * 100);
        
        // Gói mới tính theo NGÀY CÒN LẠI của gói hiện tại
        const newPackageDays = details.remainingDays;
        
        const newPackageValue = Math.round(newPricePerDay * newPackageDays);
        const topupRequired = newPackageValue - details.refundAmount;

        // Scenarios (mirror customer-facing content)
        const proportionalDays = Math.floor(details.refundAmount / newPricePerDay);
        const topupFull = Math.max(0, newProduct.price - details.refundAmount);
        const showFullTopup = topupFull > 0;

        // Calculate resulting end dates from upgrade start
        const upgradeStartForCalc = new Date(details.endDate);
        const proportionalEndDate = (() => {
            const d = new Date(upgradeStartForCalc);
            d.setDate(d.getDate() + (proportionalDays > 0 ? proportionalDays : 0));
            return d;
        })();
        const fullEndDate = (() => {
            const d = new Date(upgradeStartForCalc);
            d.setDate(d.getDate() + details.newTotalDays);
            return d;
        })();
        
        return `
            <div class="breakdown-grid">
                <!-- Thông tin gói hiện tại -->
                <div class="breakdown-section current-package">
                    <h6>📦 Gói hiện tại</h6>
                    <div class="compact-info-grid">
                        <div class="info-card">
                            <div class="info-card-header">${currentProduct.name}</div>
                            <div class="info-card-value">${formatPrice(currentProduct.price)}đ / ${currentProduct.duration} ${currentProduct.durationUnit}</div>
                        </div>
                        <div class="info-card">
                            <div class="info-card-header">Giá/ngày</div>
                            <div class="info-card-value">${formatPrice(currentPricePerDay)}đ/ngày</div>
                        </div>
                        <div class="info-card progress-card">
                            <div class="info-card-header">Tiến độ sử dụng</div>
                            <div class="info-card-value">
                                <div class="progress-info">
                                    <span class="used">${details.daysUsed} ngày</span>
                                    <span class="separator">/</span>
                                    <span class="remaining">${details.remainingDays} ngày</span>
                                </div>
                                <div class="progress-bar-mini">
                                    <div class="progress-used" style="width: ${Math.round(details.daysUsed / details.currentTotalDays * 100)}%"></div>
                                    <div class="progress-remaining" style="width: ${Math.round(details.remainingDays / details.currentTotalDays * 100)}%"></div>
                                </div>
                            </div>
                        </div>
                        <div class="info-card calculation-card">
                            <div class="info-card-value">
                                <div class="calc-formula">${formatPrice(currentPricePerDay)}đ × ${details.remainingDays} ngày</div>
                                <div class="calc-result">= ${formatPrice(details.refundAmount)}đ</div>
                            </div>
                        </div>
                        <div class="info-card highlight">
                            <div class="info-card-header">Phần tiền dư</div>
                            <div class="info-card-value">${formatPrice(details.refundAmount)}đ</div>
                        </div>
                    </div>
                </div>

                <!-- Thông tin gói mới -->
                <div class="breakdown-section new-package">
                    <h6>🆕 Gói mới</h6>
                    <div class="compact-info-grid">
                        <div class="info-card">
                            <div class="info-card-header">${newProduct.name}</div>
                            <div class="info-card-value">${formatPrice(newProduct.price)}đ / ${newProduct.duration} ${newProduct.durationUnit}</div>
                        </div>
                        <div class="info-card">
                            <div class="info-card-header">Giá/ngày</div>
                            <div class="info-card-value">${formatPrice(newPricePerDay)}đ/ngày</div>
                        </div>
                        <div class="info-card calculation-card">
                            <div class="info-card-value">
                                <div class="calc-formula">${formatPrice(details.refundAmount)}đ ÷ ${formatPrice(newPricePerDay)}đ/ngày</div>
                                <div class="calc-result">= ${proportionalDays} ngày (không bù)</div>
                            </div>
                        </div>
                        <div class="info-card highlight">
                            <div class="info-card-header">Nhận được (không bù)</div>
                            <div class="info-card-value">${proportionalDays} ngày — đến ${formatDMY(proportionalEndDate)}</div>
                        </div>
                        ${showFullTopup ? `
                        <div class="info-card calculation-card">
                            <div class="info-card-value">
                                <div class="calc-formula">${formatPrice(newProduct.price)}đ - ${formatPrice(details.refundAmount)}đ</div>
                                <div class="calc-result">= ${formatPrice(topupFull)}đ</div>
                            </div>
                        </div>
                        <div class="info-card highlight">
                            <div class="info-card-header">Cần bù (full gói)</div>
                            <div class="info-card-value">${formatPrice(topupFull)}đ — đến ${formatDMY(fullEndDate)}</div>
                        </div>
                        ` : ''}
                    </div>
                </div>

                <!-- Phép tính quan trọng -->
                <div class="breakdown-section calculation-formula">
                    <h6>🧮 Phép tính</h6>
                    <div class="calc-row">
                        <span class="calc-label">Số ngày (không bù):</span>
                        <span class="calc-value">${formatPrice(details.refundAmount)}đ ÷ ${formatPrice(newPricePerDay)}đ/ngày = ${proportionalDays} ngày → đến: ${formatDMY(proportionalEndDate)}</span>
                    </div>
                    ${showFullTopup ? `
                    <div class="calc-row">
                        <span class="calc-label">Số ngày (full gói):</span>
                        <span class="calc-value">${newProduct.duration} ${newProduct.durationUnit} = ${details.newTotalDays} ngày → đến: ${formatDMY(fullEndDate)}</span>
                    </div>
                    ` : ''}
                    <div class="calc-row calc-total">
                        <span class="calc-label">Kết quả:</span>
                        <span class="calc-value">${showFullTopup ? 'Cần bù thêm ' + formatPrice(topupFull) + 'đ (full gói)' : 'Không cần bù; nhận ' + proportionalDays + ' ngày (đổi theo tỷ lệ)'}</span>
                    </div>
                </div>
            </div>
        `;
    }

    generateCustomerMessages(details) {
        const scenarios = details.scenarios.scenarios;
        const messages = [];

        scenarios.forEach((scenario, index) => {
            const isNoTopup = scenario.type === 'proportional';
            const title = isNoTopup ? 'Không bù thêm tiền' : 'Bù thêm tiền';
            
            let content = `Kính gửi Quý khách,\n\nCentrix xin thông tin về việc đổi gói dịch vụ như sau:\n\n📦 GÓI HIỆN TẠI:\n• Tên gói: ${this.selectedCurrentProduct.name} (${this.selectedCurrentProduct.duration} ${this.selectedCurrentProduct.durationUnit})\n• Đã dùng: ${formatDMY(details.startDate)} → ${formatDMY(details.endDate)} (${details.daysUsed} ngày)\n• Còn lại: ${details.remainingDays} ngày (≈ ${formatPrice(details.refundAmount)}đ)\n\n🆕 GÓI MỚI:\n• Tên gói: ${this.selectedNewProduct.name} (${this.selectedNewProduct.duration} ${this.selectedNewProduct.durationUnit})\n• Giá gói: ${formatPrice(this.selectedNewProduct.price)}đ`;

            if (isNoTopup) {
                content += `\n\n• Không cần thanh toán thêm\n• Thời gian sử dụng gói mới: ${formatDMY(scenario.startDate)} → ${formatDMY(scenario.endDate)} (${scenario.totalDays} ngày)`;
                
                // Nếu có tiền thừa
                if (scenario.moneyRefunded > 0) {
                    content += `\n• Tiền thừa hoàn lại: ${formatPrice(scenario.moneyRefunded)}đ`;
                }
            } else {
                content += `\n\n• Số tiền cần thanh toán thêm: ${formatPrice(scenario.topupAmount)}đ\n• Thời gian sử dụng gói mới: ${formatDMY(scenario.startDate)} → ${formatDMY(scenario.endDate)} (${scenario.totalDays} ngày)`;
            }
            
            content += `\n\nCentrix sẵn sàng hỗ trợ nếu Quý khách cần thêm thông tin.\nTrân trọng.`;

            messages.push({ title, content, type: scenario.type });
        });

        return messages;
    }

    switchOption(optionIndex) {
        document.querySelectorAll('.option-content').forEach(content => content.classList.remove('active'));
        document.querySelectorAll('.option-tab').forEach(tab => tab.classList.remove('active'));

        const selectedContent = document.getElementById(`option-${optionIndex}`);
        const selectedTab = document.querySelectorAll('.option-tab')[optionIndex];
        if (selectedContent) selectedContent.classList.add('active');
        if (selectedTab) selectedTab.classList.add('active');
    }

    async copyResult(optionIndex = 0, e) {
        let content;
        if (this.currentCustomerMessages && this.currentCustomerMessages.length > 1) {
            content = this.currentCustomerMessages[optionIndex]?.content;
        } else if (this.currentCustomerMessages && this.currentCustomerMessages.length === 1) {
            content = this.currentCustomerMessages[0].content;
        } else {
            content = document.querySelector('.upgrade-code')?.textContent;
        }

        if (!content) {
            showNotification('Chưa có kết quả để copy!', 'error');
            return;
        }

        try {
            await navigator.clipboard.writeText(content);
            const optionName = this.currentCustomerMessages?.[optionIndex]?.title || '';
            showNotification(`Đã copy nội dung ${optionName}!`, 'success');
            const btn = (e && e.currentTarget) ? e.currentTarget : (typeof event !== 'undefined' && event?.target ? event.target.closest('.btn') : null);
            if (btn) {
                const originalText = btn.innerHTML;
                btn.innerHTML = '<span class="btn-icon">✅</span> Đã copy!';
                btn.classList.add('btn-success');
                setTimeout(() => { btn.innerHTML = originalText; btn.classList.remove('btn-success'); }, 2000);
            }
        } catch (error) {
            showNotification('Lỗi copy: ' + error.message, 'error');
        }
    }

    shareResult() {
        const content = this.currentCustomerMessages?.[0]?.content;
        if (!content) return;
        if (navigator.share) {
            navigator.share({ title: 'Kết quả đổi gói sản phẩm', text: content });
        } else {
            this.copyResult();
        }
    }

    // printResults removed per request

    refreshData() {
        try {
            showNotification('Đang làm mới dữ liệu đổi gói...', 'info');
            this.selectedCurrentProduct = null;
            this.selectedNewProduct = null;
            ['currentProductSearch','newProductSearch'].forEach(id => { const i = document.getElementById(id); if (i) i.value = ''; });
            ['currentProductSearchResults','newProductSearchResults'].forEach(id => this.hideSearchResults(id));
            document.getElementById('upgradeSelectedProducts')?.setAttribute('style','display:none');
            document.getElementById('upgradeResult')?.setAttribute('style','display:none');
            this.clearAllErrors();
            this.setDefaultDates();
            this.updateState();
            showNotification('Đã làm mới thành công!', 'success');
        } catch (error) {
            showNotification('Lỗi làm mới: ' + error.message, 'error');
        }
    }

    clearAllErrors() {
        ['upgradeStartDate','upgradeEndDate'].forEach(id => this.clearDateError(id));
    }

    hideCalculationResult() {
        const result = document.getElementById('upgradeResult');
        if (result) result.style.display = 'none';
    }

    updateEmptyState() {
        const hasProducts = (appData.products || []).length > 0;
        const emptyState = document.getElementById('upgradeEmptyState');
        const form = document.querySelector('.upgrade-form');
        if (emptyState) emptyState.style.display = hasProducts ? 'none' : 'block';
        if (form) form.style.display = hasProducts ? 'block' : 'none';
    }

    // --- Helpers: days and per-day ---
    getDaysFromDuration(duration, unit, baseDate) {
        const dur = Number(duration) || 0;
        const normalized = (unit || '').toLowerCase();
        if (normalized === 'ngày') return dur;
        if (normalized === 'tháng') {
            // Cố định mỗi tháng = 30 ngày (nhất quán với refund module)
            return Math.max(1, dur * 30);
        }
        if (normalized === 'năm') return Math.max(1, dur * 365);
        return Math.max(0, dur);
    }

    getPerDay(price, totalDays) {
        const p = Number(price) || 0;
        const d = Math.max(1, Number(totalDays) || 0);
        return Math.round(p / d);
    }
}

// Initialize upgrade manager
let upgradeManager;
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => { upgradeManager = new UpgradeManager(); });
} else {
    upgradeManager = new UpgradeManager();
}

// Backward compatibility
window.selectCurrentProduct = (id) => upgradeManager?.selectProduct(id, 'current');
window.selectNewProduct = (id) => upgradeManager?.selectProduct(id, 'new');
window.calculateUpgrade = () => upgradeManager?.calculateUpgrade();
window.copyUpgradeResult = () => upgradeManager?.copyResult();
window.refreshUpgradeData = () => upgradeManager?.refreshData();
window.updateUpgradeTab = () => upgradeManager?.updateEmptyState();


