// Family Check Module
// Chức năng kiểm tra và so sánh email từ Microsoft Family với thông tin lưu trữ

// Initialize family check module

class FamilyEmailChecker {
    constructor() {
        this.similarityThreshold = 0.6; // 60% tương tự để chấp nhận - phù hợp cho email không hoàn chỉnh
        this.currentPair = 1;
        this.totalPairs = 1;
    }

    // Xử lý danh sách email từ Microsoft Family - QUY TẮC MỚI
    parseFamilyEmails(text) {
        if (!text || !text.trim()) {
            return [];
        }

        const lines = text.split('\n').map(line => line.trim()).filter(line => line);
        
        // Validation: Dòng cuối cùng phải là email hoàn chỉnh
        const lastLine = lines[lines.length - 1];
        if (lastLine && !this.isEmail(lastLine)) {
            throw new Error('Dòng cuối cùng ở cột Family không phải email');
        }

        // Phát hiện có chủ family hay không
        const hasOrganizer = this.detectFamilyOrganizer(lines);
        
        if (hasOrganizer) {
            return this.parseFamilyWithOrganizer(lines);
        } else {
            return this.parseFamilyWithoutOrganizer(lines);
        }
    }

    // Phát hiện có chủ family hay không
    detectFamilyOrganizer(lines) {
        return lines.some(line => 
            line.includes('Family organizer') || 
            line.includes('家庭组织者') ||
            line.includes('(you)') ||
            line.includes('(你)')
        );
    }

    // Parse family có chủ (bỏ email đầu tiên)
    parseFamilyWithOrganizer(lines) {
        const emails = [];
        let skipFirstEmail = true;
        let currentName = null;
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            
            // Bỏ qua các dòng đặc biệt
            if (line.includes('Family group') || 
                line.includes('Family organizer') || 
                line.includes('(you)') ||
                line.includes('家庭组') ||
                line.includes('家庭组织者') ||
                line.includes('(你)') ||
                line.includes('Member') ||
                line.includes('成员')) {
                continue;
            }
            
            if (this.isEmail(line)) {
                // Bỏ qua email đầu tiên (của chủ family)
                if (skipFirstEmail) {
                    skipFirstEmail = false;
                    continue;
                }
                
                emails.push({
                    email: line.toLowerCase(),
                    name: currentName || 'Member',
                    source: 'family'
                });
                currentName = null;
            } else {
                // Đây là tên
                currentName = line;
            }
        }
        
        return emails;
    }

    // Parse family không có chủ
    parseFamilyWithoutOrganizer(lines) {
        const emails = [];
        let currentName = null;
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            
            if (this.isEmail(line)) {
                emails.push({
                    email: line.toLowerCase(),
                    name: currentName || 'Member',
                    source: 'family'
                });
                currentName = null;
            } else {
                // Đây là tên
                currentName = line;
            }
        }
        
        return emails;
    }

    // Xử lý danh sách email từ thông tin lưu trữ - QUY TẮC MỚI: 100% là email
    parseStoredEmails(text) {
        if (!text || !text.trim()) {
            return [];
        }

        const lines = text.split('\n').map(line => line.trim()).filter(line => line);
        const emails = [];
        
        // QUY TẮC: Cột "Thông tin lưu trữ" 100% là email, không bỏ qua dòng nào
        lines.forEach((line, index) => {
            if (line) {
                // Coi tất cả dòng là email, kể cả không hoàn chỉnh
                emails.push({ 
                    name: `Email ${index + 1}`, // Tên đơn giản 
                    email: line.toLowerCase(), // Luôn coi là email
                    source: 'stored'
                });
            }
        });
        
        return emails;
    }

    // Kiểm tra xem chuỗi có phải là email không
    isEmail(str) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(str);
    }

    // Tính độ tương tự giữa 2 email - cải thiện cho email không hoàn chỉnh
    calculateSimilarity(email1, email2) {
        // Chuẩn hóa email để so sánh
        const cleanEmail1 = email1.toLowerCase().trim();
        const cleanEmail2 = email2.toLowerCase().trim();
        
        // Trường hợp đặc biệt: một email hoàn chỉnh, một không hoàn chỉnh
        const isCompleteEmail1 = this.isEmail(cleanEmail1);
        const isCompleteEmail2 = this.isEmail(cleanEmail2);
        
        if (isCompleteEmail1 && !isCompleteEmail2) {
            // Email1 hoàn chỉnh, Email2 không hoàn chỉnh
            return this.calculatePartialEmailSimilarity(cleanEmail1, cleanEmail2);
        }
        
        if (!isCompleteEmail1 && isCompleteEmail2) {
            // Email2 hoàn chỉnh, Email1 không hoàn chỉnh
            return this.calculatePartialEmailSimilarity(cleanEmail2, cleanEmail1);
        }
        
        // Cả hai cùng hoàn chỉnh hoặc cùng không hoàn chỉnh - dùng logic cũ
        const longer = cleanEmail1.length > cleanEmail2.length ? cleanEmail1 : cleanEmail2;
        const shorter = cleanEmail1.length > cleanEmail2.length ? cleanEmail2 : cleanEmail1;
        
        if (longer.length === 0) return 1.0;
        
        const distance = this.levenshteinDistance(longer, shorter);
        return (longer.length - distance) / longer.length;
    }

    // Tính độ tương tự cho trường hợp email một hoàn chỉnh, một không hoàn chỉnh
    calculatePartialEmailSimilarity(completeEmail, partialEmail) {
        const usernameMatch = completeEmail.split('@')[0];
        
        
        // Trường hợp 1: partialEmail chỉ là username (vd: thanhthao.041093)
        if (partialEmail === usernameMatch) {
            return 0.85; // Tương tự cao - CÓ THỂ ĐÚNG
        }
        
        // Trường hợp 2: partialEmail thiếu domain (vd: thanhthao.041093@outl)
        if (completeEmail.startsWith(partialEmail)) {
            const similarity = partialEmail.length / completeEmail.length;
            const result = Math.max(0.75, similarity);
            return result; // Ít nhất 75% - CÓ THỂ ĐÚNG
        }
        
        // Trường hợp 3: partialEmail có chứa username hoặc ngược lại
        if (usernameMatch.includes(partialEmail) || partialEmail.includes(usernameMatch)) {
            const distance = this.levenshteinDistance(usernameMatch, partialEmail);
            const maxLength = Math.max(usernameMatch.length, partialEmail.length);
            const similarity = maxLength === 0 ? 1 : 1 - (distance / maxLength);
            const result = Math.max(0.6, similarity);
            return result; // Ít nhất 60% - CÓ THỂ ĐÚNG
        }
        
        // Trường hợp 4: So sánh thông thường
        const distance = this.levenshteinDistance(completeEmail, partialEmail);
        const maxLength = Math.max(completeEmail.length, partialEmail.length);
        const result = maxLength === 0 ? 1 : 1 - (distance / maxLength);
        return result;
    }

    // Thuật toán Levenshtein Distance
    levenshteinDistance(str1, str2) {
        const matrix = [];
        
        for (let i = 0; i <= str2.length; i++) {
            matrix[i] = [i];
        }
        
        for (let j = 0; j <= str1.length; j++) {
            matrix[0][j] = j;
        }
        
        for (let i = 1; i <= str2.length; i++) {
            for (let j = 1; j <= str1.length; j++) {
                if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
                    matrix[i][j] = matrix[i - 1][j - 1];
                } else {
                    matrix[i][j] = Math.min(
                        matrix[i - 1][j - 1] + 1,
                        matrix[i][j - 1] + 1,
                        matrix[i - 1][j] + 1
                    );
                }
            }
        }
        
        return matrix[str2.length][str1.length];
    }

    // Tìm các email tương tự
    findSimilarEmails(familyEmails, storedEmails) {
        const similarPairs = [];
        const usedFamily = new Set();
        const usedStored = new Set();
        
        for (let i = 0; i < familyEmails.length; i++) {
            for (let j = 0; j < storedEmails.length; j++) {
                if (usedFamily.has(i) || usedStored.has(j)) continue;
                
                const similarity = this.calculateSimilarity(
                    familyEmails[i].email, 
                    storedEmails[j].email
                );
                
                
                if (similarity >= this.similarityThreshold) {
                    similarPairs.push({
                        familyEmail: familyEmails[i],
                        storedEmail: storedEmails[j],
                        similarity: similarity,
                        differences: this.findDifferences(familyEmails[i].email, storedEmails[j].email)
                    });
                    usedFamily.add(i);
                    usedStored.add(j);
                }
            }
        }
        
        return similarPairs;
    }

    // Tìm các ký tự khác nhau giữa 2 email
    findDifferences(email1, email2) {
        const differences = [];
        const maxLength = Math.max(email1.length, email2.length);
        
        for (let i = 0; i < maxLength; i++) {
            const char1 = email1[i] || '';
            const char2 = email2[i] || '';
            
            if (char1 !== char2) {
                differences.push({
                    position: i,
                    char1: char1,
                    char2: char2
                });
            }
        }
        
        return differences;
    }

    // So sánh 2 danh sách email
    compareEmailLists(familyText, storedText) {
        let familyEmails, storedEmails;
        
        try {
            familyEmails = this.parseFamilyEmails(familyText);
        } catch (error) {
            throw new Error(`Lỗi Family: ${error.message}`);
        }
        
        try {
            storedEmails = this.parseStoredEmails(storedText);
        } catch (error) {
            throw new Error(`Lỗi Stored: ${error.message}`);
        }
        
        // Tìm các email khớp hoàn toàn
        const exactMatches = [];
        const familyOnly = [];
        const storedOnly = [];
        
        // Tạo bản sao để tránh thay đổi mảng gốc
        const remainingFamily = [...familyEmails];
        const remainingStored = [...storedEmails];
        
        // Tìm khớp hoàn toàn
        for (let i = remainingFamily.length - 1; i >= 0; i--) {
            const familyEmail = remainingFamily[i];
            const storedIndex = remainingStored.findIndex(
                stored => stored.email === familyEmail.email
            );
            
            if (storedIndex !== -1) {
                exactMatches.push({
                    familyEmail: familyEmail,
                    storedEmail: remainingStored[storedIndex]
                });
                remainingFamily.splice(i, 1);
                remainingStored.splice(storedIndex, 1);
            }
        }
        
        // Tìm các email tương tự
        const similarPairs = this.findSimilarEmails(remainingFamily, remainingStored);
        
        // Cập nhật danh sách còn lại sau khi loại bỏ các cặp tương tự
        const finalFamily = remainingFamily.filter((_, index) => 
            !similarPairs.some(pair => pair.familyEmail === remainingFamily[index])
        );
        const finalStored = remainingStored.filter((_, index) => 
            !similarPairs.some(pair => pair.storedEmail === remainingStored[index])
        );
        
        familyOnly.push(...finalFamily);
        storedOnly.push(...finalStored);
        
        return {
            exactMatches,
            similarPairs,
            familyOnly,
            storedOnly,
            totalFamily: familyEmails.length,
            totalStored: storedEmails.length
        };
    }

    // Xác định trạng thái kết quả - Hàm "gay go" để phân loại chính xác
    determineResultStatus(result) {
        return this.classifyEmailComparisonCase(result);
    }

    // Hàm riêng để phân loại trường hợp - logic phức tạp và quan trọng
    classifyEmailComparisonCase(result) {
        // Kiểm tra tính hợp lệ của dữ liệu đầu vào
        if (!result || typeof result !== 'object') {
            // Handle error silently
            return 'unknown';
        }

        // Khởi tạo các metrics để phân tích
        const metrics = this.calculateComparisonMetrics(result);
        
        // Trường hợp đặc biệt: Vừa có differences VÀ similar pairs
        const hasDifferences = metrics.familyOnlyCount > 0 || metrics.storedOnlyCount > 0;
        const hasSimilarPairs = metrics.similarPairCount > 0;
        
        if (hasDifferences && hasSimilarPairs) {
            return 'mixed'; // KHÔNG ĐẠT CÓ THỂ ĐẠT
        }
        
        // Case 1: KHÔNG ĐẠT - Chỉ có sự khác biệt
        if (this.isDifferentCase(metrics, result)) {
            return 'different';
        }
        
        // Case 2: CÓ THỂ ĐẠT - Chỉ có email nghi ngờ tương tự
        if (this.isPossibleCase(metrics, result)) {
            return 'possible';
        }
        
        // Case 3: ĐẠT - Hoàn toàn khớp
        if (this.isPerfectCase(metrics, result)) {
            return 'perfect';
        }
        
        // Fallback - trường hợp không xác định được
        // Handle error silently
        return 'unknown';
    }

    // Tính toán các metrics để hỗ trợ phân loại
    calculateComparisonMetrics(result) {
        const totalFamilyEmails = (result.exactMatches?.length || 0) + 
                                 (result.similarPairs?.length || 0) + 
                                 (result.familyOnly?.length || 0);
        
        const totalStoredEmails = (result.exactMatches?.length || 0) + 
                                 (result.similarPairs?.length || 0) + 
                                 (result.storedOnly?.length || 0);
        
        const exactMatchCount = result.exactMatches?.length || 0;
        const similarPairCount = result.similarPairs?.length || 0;
        const familyOnlyCount = result.familyOnly?.length || 0;
        const storedOnlyCount = result.storedOnly?.length || 0;
        
        const totalEmails = Math.max(totalFamilyEmails, totalStoredEmails);
        const matchedEmails = exactMatchCount + similarPairCount;
        const unmatchedEmails = familyOnlyCount + storedOnlyCount;
        
        // Tính tỷ lệ khớp chính xác
        const exactMatchRatio = totalEmails > 0 ? exactMatchCount / totalEmails : 0;
        
        // Tính tỷ lệ email nghi ngờ
        const similarRatio = totalEmails > 0 ? similarPairCount / totalEmails : 0;
        
        // Tính tỷ lệ email khác biệt
        const differenceRatio = totalEmails > 0 ? unmatchedEmails / totalEmails : 0;
        
        return {
            totalFamilyEmails,
            totalStoredEmails,
            totalEmails,
            exactMatchCount,
            similarPairCount,
            familyOnlyCount,
            storedOnlyCount,
            matchedEmails,
            unmatchedEmails,
            exactMatchRatio,
            similarRatio,
            differenceRatio,
            hasAnyMatches: exactMatchCount > 0,
            hasOnlySimilar: exactMatchCount === 0 && similarPairCount > 0,
            hasOnlyDifferences: exactMatchCount === 0 && similarPairCount === 0,
            isEmpty: totalEmails === 0
        };
    }

    // Kiểm tra trường hợp KHÔNG ĐẠT
    isDifferentCase(metrics, result) {
        // Có email chỉ tồn tại ở một bên -> chắc chắn KHÔNG ĐẠT
        if (metrics.familyOnlyCount > 0 || metrics.storedOnlyCount > 0) {
            return true;
        }
        
        // Không có email nào khớp chính xác và chỉ có email tương tự thôi
        // Nhưng nếu độ tương tự quá thấp thì cũng coi là KHÔNG ĐẠT
        if (metrics.hasOnlySimilar && result.similarPairs) {
            const avgSimilarity = result.similarPairs.reduce((sum, pair) => 
                sum + (pair.similarity || 0), 0) / result.similarPairs.length;
            
            
            // Giảm threshold để ưu tiên "CÓ THỂ ĐẠT" cho email không hoàn chỉnh
            // Chỉ coi là KHÔNG ĐẠT nếu độ tương tự < 30%
            if (avgSimilarity < 0.3) {
                return true;
            }
        }
        
        return false;
    }

    // Kiểm tra trường hợp CÓ THỂ ĐẠT
    isPossibleCase(metrics, result) {
        // Có email tương tự và không có email khác biệt hoàn toàn
        if (metrics.similarPairCount > 0 && metrics.familyOnlyCount === 0 && metrics.storedOnlyCount === 0) {
            // Kiểm tra độ tương tự có đủ cao không
            if (result.similarPairs) {
                const avgSimilarity = result.similarPairs.reduce((sum, pair) => 
                    sum + (pair.similarity || 0), 0) / result.similarPairs.length;
                
                
                // Điều chỉnh threshold cho trường hợp email không hoàn chỉnh
                // Độ tương tự >= 60% -> CÓ THỂ ĐẠT (bao gồm cả gần 100%)
                return avgSimilarity >= 0.6;
            }
        }
        
        return false;
    }

    // Kiểm tra trường hợp ĐẠT
    isPerfectCase(metrics, result) {
        // Phải có ít nhất 1 email
        if (metrics.isEmpty) {
            return false;
        }
        
        // Tất cả email đều khớp chính xác 100%
        if (metrics.exactMatchCount > 0 && 
            metrics.similarPairCount === 0 && 
            metrics.familyOnlyCount === 0 && 
            metrics.storedOnlyCount === 0) {
            
            // Đảm bảo số lượng email ở 2 bên bằng nhau
            return metrics.totalFamilyEmails === metrics.totalStoredEmails;
        }
        
        return false;
    }
}

// Khởi tạo instance
const familyChecker = new FamilyEmailChecker();

// Hiển thị toast validation error màu đỏ, tự ẩn sau 4-5s
function showValidationToast(message) {
    // Tạo toast element
    const toast = document.createElement('div');
    toast.className = 'validation-toast';
    toast.innerHTML = `
        <div class="toast-icon">❌</div>
        <div class="toast-message">${message}</div>
    `;
    
    // Thêm vào body
    document.body.appendChild(toast);
    
    // Animation hiện lên
    setTimeout(() => {
        toast.classList.add('show');
    }, 100);
    
    // Tự ẩn sau 4.5 giây
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 300);
    }, 4500);
}

// Khởi tạo ban đầu khi trang load
document.addEventListener('DOMContentLoaded', function() {
    // Đảm bảo có ít nhất 1 cặp được tạo
    if (document.getElementById('emailContainers')) {
        updatePairTabs();
        
        // Đặt nút "1 cặp" là active mặc định
        const firstBtn = document.getElementById('btn1');
        if (firstBtn) {
            firstBtn.classList.add('active');
        }
    }
});

// Cập nhật số cặp list mail
function updatePairTabs() {
    const numberOfPairsInput = document.getElementById('numberOfPairs');
    const numberOfPairs = parseInt(numberOfPairsInput?.value) || 1;
    familyChecker.totalPairs = numberOfPairs;
    
    // Đồng bộ nút khi người dùng nhập số
    syncButtonsWithInput(numberOfPairs);
    
    const emailContainers = document.getElementById('emailContainers');
    
    if (!emailContainers) {
        // Handle error silently
        return;
    }
    
    // Clear existing containers
    emailContainers.innerHTML = '';
    
    
    // Create new containers
    for (let i = 1; i <= numberOfPairs; i++) {
        // Create email container
        const container = document.createElement('div');
        container.className = `email-pair ${i === 1 ? 'active' : ''}`;
        container.setAttribute('data-pair', i);
        container.innerHTML = `
            <div class="pair-header">
                <h4 class="pair-title">Cặp ${i}</h4>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label class="form-label">User trong family</label>
                    <textarea class="form-textarea family-emails" rows="8" placeholder="Dán danh sách email từ Microsoft Family vào đây...&#10;&#10;Ví dụ:&#10;legal chady (you)&#10;Family organizer&#10;legalchadyhr@outlook.com&#10;&#10;Joseph Nguyen&#10;Member&#10;nghnguyen96@gmail.com"></textarea>
                </div>
                
                <div class="form-group">
                    <label class="form-label">Thông tin note</label>
                    <textarea class="form-textarea stored-emails" rows="8" placeholder="Dán danh sách email từ thông tin lưu trữ vào đây...&#10;&#10;Ví dụ:&#10;Bruce Do&#10;trungdn1908@gmail.com&#10;&#10;Isolated Magician&#10;kirito7129@gmail.com"></textarea>
                </div>
            </div>
        `;
        emailContainers.appendChild(container);
    }
    
    familyChecker.currentPair = 1;
    showToast(`Đã tạo ${numberOfPairs} cặp list mail`, 'success');
}


// Hàm chính để kiểm tra tất cả email
function checkAllFamilyEmails() {
    const results = [];
    let hasError = false;
    
    for (let i = 1; i <= familyChecker.totalPairs; i++) {
        const pairContainer = document.querySelector(`.email-pair[data-pair="${i}"]`);
        const familyText = pairContainer.querySelector('.family-emails').value.trim();
        const storedText = pairContainer.querySelector('.stored-emails').value.trim();
        
        if (!familyText || !storedText) {
            showToast(`Cặp ${i}: Vui lòng nhập đầy đủ cả 2 danh sách email`, 'error');
            hasError = true;
            continue;
        }
        
        try {
            const result = familyChecker.compareEmailLists(familyText, storedText);
            const status = familyChecker.determineResultStatus(result);
            results.push({
                pairNumber: i,
                result: result,
                status: status,
                familyText: familyText,
                storedText: storedText
            });
        } catch (error) {
            // Handle error silently
            // Hiển thị toast đỏ cho validation error
            if (error.message.includes('Dòng cuối cùng')) {
                showValidationToast(error.message);
            } else {
                showToast(`Cặp ${i}: ${error.message}`, 'error');
            }
            hasError = true;
        }
    }
    
    if (results.length > 0) {
        displayAllResults(results);
        if (!hasError) {
            showToast(`Kiểm tra hoàn tất ${results.length} cặp!`, 'success');
        }
    }
}

// Hàm cũ để tương thích (kiểm tra cặp hiện tại)
function checkFamilyEmails() {
    const currentContainer = document.querySelector('.email-pair.active');
    const familyText = currentContainer.querySelector('.family-emails').value.trim();
    const storedText = currentContainer.querySelector('.stored-emails').value.trim();
    
    if (!familyText || !storedText) {
        showToast('Vui lòng nhập đầy đủ cả 2 danh sách email', 'error');
        return;
    }
    
    try {
        const result = familyChecker.compareEmailLists(familyText, storedText);
        const status = familyChecker.determineResultStatus(result);
        
        displayResults(result, status);
        showToast('Kiểm tra hoàn tất!', 'success');
    } catch (error) {
        // Handle error silently
        showToast('Có lỗi xảy ra khi kiểm tra email', 'error');
    }
}

// Hiển thị kết quả
function displayResults(result, status) {
    const displayResultDiv = document.getElementById('familyCheckResult');
    const statusDiv = document.getElementById('resultStatus');
    
    // Hiển thị khu vực kết quả và toggle switch
    document.getElementById('viewToggleContainer').style.display = 'block';
    displayResultDiv.style.display = 'block';
    
    // Cập nhật trạng thái
    statusDiv.innerHTML = getStatusHTML(status, result);
    
    // Hiển thị các section tương ứng
    showResultSections(status, result);
    
    // Cập nhật bảng so sánh
    updateComparisonTable(result);
}

// Lấy HTML cho trạng thái với badge style
function getStatusHTML(status, result) {
    switch (status) {
        case 'perfect':
            return '<span class="status-badge success">ĐẠT</span>';
        case 'possible':
            return '<span class="status-badge warning">CÓ THỂ ĐẠT</span>';
        case 'different':
            return '<span class="status-badge error">KHÔNG ĐẠT</span>';
        case 'mixed':
            return '<span class="status-badge error">KHÔNG ĐẠT</span> <span class="status-badge warning">CÓ THỂ ĐẠT</span>';
        default:
            return '<span class="status-badge">ĐANG KIỂM TRA</span>';
    }
}

// Hiển thị các section kết quả
function showResultSections(status, result) {
    // Ẩn tất cả sections
    document.getElementById('perfectMatchSection').style.display = 'none';
    document.getElementById('differencesSection').style.display = 'none';
    document.getElementById('possibleMatchesSection').style.display = 'none';
    
    switch (status) {
        case 'perfect':
            document.getElementById('perfectMatchSection').style.display = 'block';
            break;
        case 'possible':
            document.getElementById('possibleMatchesSection').style.display = 'block';
            displayPossibleMatches(result.similarPairs);
            break;
        case 'different':
            document.getElementById('differencesSection').style.display = 'block';
            displayDifferences(result.familyOnly, result.storedOnly);
            if (result.similarPairs.length > 0) {
                document.getElementById('possibleMatchesSection').style.display = 'block';
                displayPossibleMatches(result.similarPairs);
            }
            break;
    }
}

// Hiển thị các email khác biệt (sửa để hiển thị cả Family và Stored)
function displayDifferences(familyOnly, storedOnly) {
    const familyDiv = document.getElementById('familyOnlyEmails');
    const storedDiv = document.getElementById('storedOnlyEmails');
    
    familyDiv.innerHTML = '';
    storedDiv.innerHTML = '';
    
    // Hiển thị email chỉ có trong Family (đỏ)
    if (familyOnly.length === 0) {
        familyDiv.innerHTML = '<p class="no-differences">Không có email nào</p>';
    } else {
        familyOnly.forEach(item => {
            const div = document.createElement('div');
            div.className = 'email-item';
            div.innerHTML = `
                <span class="email-address email-different">${item.email}</span>
            `;
            familyDiv.appendChild(div);
        });
    }
    
    // Hiển thị email chỉ có trong Stored (đỏ)
    if (storedOnly.length === 0) {
        storedDiv.innerHTML = '<p class="no-differences">Không có email nào</p>';
    } else {
        storedOnly.forEach(item => {
            const div = document.createElement('div');
            div.className = 'email-item';
            div.innerHTML = `
                <span class="email-address email-different">${item.email}</span>
            `;
            storedDiv.appendChild(div);
        });
    }
}

// Hiển thị các email tương tự
function displayPossibleMatches(similarPairs) {
    const container = document.getElementById('possibleMatches');
    container.innerHTML = '';
    
    similarPairs.forEach(pair => {
        const div = document.createElement('div');
        div.className = 'possible-match-item';
        
        const similarityPercent = Math.round(pair.similarity * 100);
        
        const highlightedFamily = buildHighlightedEmail(pair.familyEmail.email, pair.storedEmail.email, 'family');
        const highlightedStored = buildHighlightedEmail(pair.familyEmail.email, pair.storedEmail.email, 'stored');
        
        div.innerHTML = `
            <div class="match-pair">
                <div class="email-item">
                    <span class="email-address email-similar">${highlightedFamily}</span>
                </div>
                <div class="email-item">
                    <span class="email-address email-similar">${highlightedStored}</span>
                </div>
            </div>
        `;
        
        container.appendChild(div);
    });
}

// Highlight các ký tự khác nhau
function highlightDifferences(email1, email2, differences) {
    const familyElement = document.getElementById(`family-${email1}`);
    const storedElement = document.getElementById(`stored-${email2}`);
    
    if (familyElement && storedElement) {
        let familyHTML = '';
        let storedHTML = '';
        
        const maxLength = Math.max(email1.length, email2.length);
        
        for (let i = 0; i < maxLength; i++) {
            const char1 = email1[i] || '';
            const char2 = email2[i] || '';
            
            if (char1 !== char2) {
                familyHTML += `<span class="char-different">${char1}</span>`;
                storedHTML += `<span class="char-different">${char2}</span>`;
            } else {
                familyHTML += char1;
                storedHTML += char2;
            }
        }
        
        familyElement.innerHTML = familyHTML;
        storedElement.innerHTML = storedHTML;
    }
}

// Xây HTML email với phần khác biệt bôi đỏ, nền theo trạng thái (vàng cho nghi ngờ)
function buildHighlightedEmail(emailFamily, emailStored, side) {
    const a = side === 'family' ? emailFamily : emailStored;
    const b = side === 'family' ? emailStored : emailFamily;
    let html = '';
    const maxLength = Math.max(a.length, b.length);
    for (let i = 0; i < maxLength; i++) {
        const ca = a[i] || '';
        const cb = b[i] || '';
        if (ca !== cb) {
            html += `<span class="char-different">${ca || ''}</span>`;
        } else {
            html += ca;
        }
    }
    return html;
}

// Cập nhật bảng so sánh theo đúng spec: 2 cột gần nhau, 3 trường hợp màu
function updateComparisonTable(result) {
    const tbody = document.getElementById('comparisonTableBody');
    tbody.innerHTML = '';
    
    // Trường hợp 1: Email khớp hoàn toàn (xanh lá, chung hàng)
    result.exactMatches.forEach(match => {
        const row = document.createElement('tr');
        row.className = 'match-row exact-match';
        row.innerHTML = `
            <td class="email-cell">
                <span class="email-address email-perfect">${match.familyEmail.email}</span>
            </td>
            <td class="email-cell">
                <span class="email-address email-perfect">${match.storedEmail.email}</span>
            </td>
        `;
        tbody.appendChild(row);
    });
    
    // Trường hợp 3: Email nghi ngờ giống (vàng, chung hàng, highlight đỏ phần khác)
    result.similarPairs.forEach(pair => {
        const row = document.createElement('tr');
        row.className = 'match-row similar-match';
        const highlightedFamily = buildHighlightedEmail(pair.familyEmail.email, pair.storedEmail.email, 'family');
        const highlightedStored = buildHighlightedEmail(pair.familyEmail.email, pair.storedEmail.email, 'stored');
        row.innerHTML = `
            <td class="email-cell">
                <span class="email-address email-similar">${highlightedFamily}</span>
            </td>
            <td class="email-cell">
                <span class="email-address email-similar">${highlightedStored}</span>
            </td>
        `;
        tbody.appendChild(row);
    });
    
    // Trường hợp 2a: Chỉ có trong Family (đỏ, một mình một hàng)
    result.familyOnly.forEach(item => {
        const row = document.createElement('tr');
        row.className = 'match-row family-only';
        row.innerHTML = `
            <td class="email-cell">
                <span class="email-address email-different">${item.email}</span>
            </td>
            <td class="email-cell">
                <span class="email-empty">-</span>
            </td>
        `;
        tbody.appendChild(row);
    });
    
    // Trường hợp 2b: Chỉ có trong Stored (đỏ, một mình một hàng)
    result.storedOnly.forEach(item => {
        const row = document.createElement('tr');
        row.className = 'match-row stored-only';
        row.innerHTML = `
            <td class="email-cell">
                <span class="email-empty">-</span>
            </td>
            <td class="email-cell">
                <span class="email-address email-different">${item.email}</span>
            </td>
        `;
        tbody.appendChild(row);
    });
}

// Xóa tất cả form
function clearAllFamilyForms() {
    document.querySelectorAll('.family-emails, .stored-emails').forEach(textarea => {
        textarea.value = '';
    });
    document.getElementById('familyCheckResult').style.display = 'none';
    document.getElementById('viewToggleContainer').style.display = 'none';
    showToast('Đã xóa tất cả form', 'info');
}

// Legacy function for compatibility
function clearFamilyForm() {
    clearAllFamilyForms();
}

// View mode state
let currentViewMode = 'detailed';

// Toggle view functions
function switchToDetailedView() {
    currentViewMode = 'detailed';
    updateToggleButtons();
    refreshCurrentResults();
}

function switchToOverviewView() {
    currentViewMode = 'overview';
    updateToggleButtons();
    refreshCurrentResults();
}


function updateToggleButtons() {
    const detailedBtn = document.getElementById('detailedBtn');
    const overviewBtn = document.getElementById('overviewBtn');
    
    if (currentViewMode === 'detailed') {
        detailedBtn.classList.add('active');
        overviewBtn.classList.remove('active');
    } else {
        detailedBtn.classList.remove('active');
        overviewBtn.classList.add('active');
    }
}

// Store current results for toggle functionality
let currentResults = [];

function refreshCurrentResults() {
    if (currentResults.length === 0) return;
    
    displayAllResults(currentResults);
    
    // Apply CSS class for overview mode
    const overviewDiv = document.getElementById('familyCheckResult');
    if (currentViewMode === 'overview') {
        overviewDiv.classList.add('overview-mode');
    } else {
        overviewDiv.classList.remove('overview-mode');
    }
}

// Functions will be exported at the end of file

// Hiển thị kết quả đơn giản (2 cột, đúng spec)
function displaySimpleResult(result, status) {
    const simpleResultDiv = document.getElementById('familyCheckResult');
    const simpleContainerDiv = document.getElementById('resultsContainer');
    
    // Hiển thị khu vực kết quả và toggle switch
    document.getElementById('viewToggleContainer').style.display = 'block';
    simpleResultDiv.style.display = 'block';
    
    // Clear container và tạo bảng 2 cột đơn giản
    simpleContainerDiv.innerHTML = `
        <div class="simple-result-table">
            <div class="table-header">
                <div class="col-header">Family hiện tại</div>
                <div class="col-header">Thông tin lưu trữ</div>
            </div>
            <div class="table-body" id="simpleTableBody"></div>
        </div>
    `;
    
    // Fill table body theo đúng 3 trường hợp
    fillSimpleTable(result);
}

// Fill bảng theo đúng 3 trường hợp màu sắc
function fillSimpleTable(result) {
    const tbody = document.getElementById('simpleTableBody');
    if (!tbody) return;
    
    // Trường hợp 1: Khớp hoàn toàn (xanh lá, chung hàng)
    result.exactMatches.forEach(match => {
        const row = document.createElement('div');
        row.className = 'table-row match-perfect';
        row.innerHTML = `
            <div class="table-cell email-perfect">${match.familyEmail.email}</div>
            <div class="table-cell email-perfect">${match.storedEmail.email}</div>
        `;
        tbody.appendChild(row);
    });
    
    // Trường hợp 3: Nghi ngờ (vàng, chung hàng, bôi đỏ phần khác)
    result.similarPairs.forEach(pair => {
        const leftHighlighted = buildHighlightedEmail(pair.familyEmail.email, pair.storedEmail.email, 'family');
        const rightHighlighted = buildHighlightedEmail(pair.familyEmail.email, pair.storedEmail.email, 'stored');
        const row = document.createElement('div');
        row.className = 'table-row match-similar';
        row.innerHTML = `
            <div class="table-cell email-similar">${leftHighlighted}</div>
            <div class="table-cell email-similar">${rightHighlighted}</div>
        `;
        tbody.appendChild(row);
    });
    
    // Trường hợp 2a: Chỉ có trong Family (đỏ, một mình một hàng)
    result.familyOnly.forEach(item => {
        const row = document.createElement('div');
        row.className = 'table-row match-different';
        row.innerHTML = `
            <div class="table-cell email-different">${item.email}</div>
            <div class="table-cell email-empty">-</div>
        `;
        tbody.appendChild(row);
    });
    
    // Trường hợp 2b: Chỉ có trong Stored (đỏ, một mình một hàng)
    result.storedOnly.forEach(item => {
        const row = document.createElement('div');
        row.className = 'table-row match-different';
        row.innerHTML = `
            <div class="table-cell email-empty">-</div>
            <div class="table-cell email-different">${item.email}</div>
        `;
        tbody.appendChild(row);
    });
}

// Hiển thị kết quả cho tất cả cặp (giữ lại để tương thích)
function displayAllResults(results) {
    const allResultDiv = document.getElementById('familyCheckResult');
    const summaryDiv = document.getElementById('resultSummary');
    const containerDiv = document.getElementById('resultsContainer');
    
    // Lưu results để toggle
    currentResults = results;
    
    // Hiển thị khu vực kết quả và toggle switch
    document.getElementById('viewToggleContainer').style.display = 'block';
    allResultDiv.style.display = 'block';
    
    // Tạo summary
    const perfectCount = results.filter(r => r.status === 'perfect').length;
    const possibleCount = results.filter(r => r.status === 'possible').length;
    const differentCount = results.filter(r => r.status === 'different').length;
    
    summaryDiv.innerHTML = `
        <div class="summary-stats">
            <span class="summary-item success">✅ ${perfectCount} cặp đạt</span>
            <span class="summary-item warning">⚠️ ${possibleCount} cặp có thể đạt</span>
            <span class="summary-item error">❌ ${differentCount} cặp không đạt</span>
        </div>
    `;
    
    // Clear container
    containerDiv.innerHTML = '';
    
    // Tạo kết quả cho từng cặp
    results.forEach((item, index) => {
        const pairResultDiv = document.createElement('div');
        pairResultDiv.className = 'pair-result';
        pairResultDiv.innerHTML = `
            <div class="pair-result-header">
                <h5>Cặp ${item.pairNumber}</h5>
                <div class="pair-status">${getStatusHTML(item.status, item.result)}</div>
            </div>
            <div class="pair-result-content" id="pairResult${item.pairNumber}">
                <!-- Content will be filled by displayResults -->
            </div>
        `;
        containerDiv.appendChild(pairResultDiv);
        
        // Fill content for this pair
        displayResultsForPair(item.result, item.status, `pairResult${item.pairNumber}`);
    });
    
    // Apply CSS class for overview mode
    const overviewDiv = document.getElementById('familyCheckResult');
    if (currentViewMode === 'overview') {
        overviewDiv.classList.add('overview-mode');
    } else {
        overviewDiv.classList.remove('overview-mode');
    }
}

// Hiển thị kết quả cho một cặp cụ thể
function displayResultsForPair(result, status, containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    container.innerHTML = '';
    
    // Chỉ hiển thị ghi chú trong chế độ "chi tiết"
    const showNotes = currentViewMode === 'detailed';
    
    // Ghi chú cho trường hợp "CÓ THỂ ĐẠT"
    if (showNotes && result.similarPairs.length > 0) {
        const section = document.createElement('div');
        section.className = 'result-section';
        section.innerHTML = `
            <div class="single-note-container warning">
                <div class="note-badge warning">⚠️ Có thể đạt - Email tương tự</div>
                <div class="note-details">
                    <div class="similarity-info">Tương tự ${Math.round(result.similarPairs[0]?.similarity * 100) || 93}%</div>
                    <div class="email-comparison-inline">
                        ${result.similarPairs.map(pair => {
                            const highlightedFamily = buildHighlightedEmail(pair.familyEmail.email, pair.storedEmail.email, 'family');
                            const highlightedStored = buildHighlightedEmail(pair.familyEmail.email, pair.storedEmail.email, 'stored');
                            return `<span class="email-similar">${highlightedFamily}</span> ↔ <span class="email-similar">${highlightedStored}</span>`;
                        }).join('<br>')}
                    </div>
                    <div class="note-action">→ Cần kiểm tra và xác nhận thủ công</div>
                </div>
            </div>
        `;
        container.appendChild(section);
    }
    
    // Ghi chú cho trường hợp "KHÔNG ĐẠT" hoặc "MIXED"
    if (showNotes && (result.familyOnly.length > 0 || result.storedOnly.length > 0)) {
        const section = document.createElement('div');
        section.className = 'result-section';
        
        let emailDifferences = [];
        if (result.familyOnly.length > 0) {
            emailDifferences.push(...result.familyOnly.map(item => `Chỉ có trong Family: ${item.email}`));
        }
        if (result.storedOnly.length > 0) {
            emailDifferences.push(...result.storedOnly.map(item => `Chỉ có trong Stored: ${item.email}`));
        }
        
        section.innerHTML = `
            <div class="single-note-container error">
                <div class="note-badge error">❌ Không đạt - Có sự khác biệt</div>
                <div class="note-details">
                    <div class="difference-count">${emailDifferences.length} email khác biệt</div>
                    <div class="email-differences-inline">
                        ${emailDifferences.map(diff => `<span class="email-different">${diff}</span>`).join('<br>')}
                    </div>
                    <div class="note-action">→ Cần cập nhật đồng bộ dữ liệu</div>
                </div>
            </div>
        `;
        container.appendChild(section);
    }
    
    // Luôn chỉ hiển thị bảng email (ghi chú đã ở trên)
    const tableWrapper = document.createElement('div');
    tableWrapper.className = 'comparison-table-container';
    tableWrapper.innerHTML = `
        <table class="comparison-table">
            <thead>
                <tr>
                    <th>Family hiện tại</th>
                    <th>Thông tin lưu trữ</th>
                </tr>
            </thead>
            <tbody id="comparisonTableBody${containerId}"></tbody>
        </table>
    `;
    container.appendChild(tableWrapper);

    updateComparisonTableForPair(result, `comparisonTableBody${containerId}`);
}

// Tạo ghi chú chi tiết chỉ cho trường hợp 2 và 3
function generateNotesForPair(result, status, notesId) {
    const notesContainer = document.getElementById(notesId);
    if (!notesContainer) return;
    
    let notesHTML = '';
    
    // Ghi chú cho trường hợp 2: Có sự khác biệt
    if (result.familyOnly.length > 0) {
        notesHTML += `
            <div class="note-item error">
                <span class="note-icon">❌</span>
                <div class="note-text">
                    <strong>Email chỉ có trong Family:</strong><br>
                    ${result.familyOnly.map(item => `• ${item.email}`).join('<br>')}
                    <br><em>→ Cần cập nhật vào hệ thống lưu trữ</em>
                </div>
            </div>
        `;
    }
    
    if (result.storedOnly.length > 0) {
        notesHTML += `
            <div class="note-item error">
                <span class="note-icon">❌</span>
                <div class="note-text">
                    <strong>Email chỉ có trong Stored:</strong><br>
                    ${result.storedOnly.map(item => `• ${item.email}`).join('<br>')}
                    <br><em>→ Có thể đã bị xóa khỏi Family</em>
                </div>
            </div>
        `;
    }
    
    // Ghi chú cho trường hợp 3: Email tương tự
    if (result.similarPairs.length > 0) {
        notesHTML += `
            <div class="note-item warning">
                <span class="note-icon">⚠️</span>
                <div class="note-text">
                    <strong>Email nghi ngờ tương tự:</strong><br>
                    ${result.similarPairs.map(pair => {
                        const similarity = Math.round(pair.similarity * 100);
                        return `• ${pair.familyEmail.email} ↔ ${pair.storedEmail.email} (${similarity}% tương tự)`;
                    }).join('<br>')}
                    <br><em>→ Cần kiểm tra và xác nhận thủ công</em>
                </div>
            </div>
        `;
    }
    
    notesContainer.innerHTML = notesHTML;
}

// Hiển thị differences cho một cặp
function displayDifferencesForPair(familyOnly, storedOnly, familyId, storedId) {
    const familyDiv = document.getElementById(familyId);
    const storedDiv = document.getElementById(storedId);
    
    if (familyDiv) {
        familyDiv.innerHTML = '';
        if (familyOnly.length === 0) {
            familyDiv.innerHTML = '<p class="no-differences">Không có email nào</p>';
        } else {
            familyOnly.forEach(item => {
                const div = document.createElement('div');
                div.className = 'email-item email-red';
                div.innerHTML = `
                    <span class="email-name">${item.name}</span>
                    <span class="email-address">${item.email}</span>
                `;
                familyDiv.appendChild(div);
            });
        }
    }
    
    if (storedDiv) {
        storedDiv.innerHTML = '';
        if (storedOnly.length === 0) {
            storedDiv.innerHTML = '<p class="no-differences">Không có email nào</p>';
        } else {
            storedOnly.forEach(item => {
                const div = document.createElement('div');
                div.className = 'email-item email-red';
                div.innerHTML = `
                    <span class="email-name">${item.name}</span>
                    <span class="email-address">${item.email}</span>
                `;
                storedDiv.appendChild(div);
            });
        }
    }
}

// Hiển thị possible matches cho một cặp
function displayPossibleMatchesForPair(similarPairs, containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    container.innerHTML = '';
    
    similarPairs.forEach(pair => {
        const div = document.createElement('div');
        div.className = 'possible-match-item';
        
        const similarityPercent = Math.round(pair.similarity * 100);
        
        div.innerHTML = `
            <div class="match-header">
                <span class="similarity-score">Tương tự ${similarityPercent}%</span>
            </div>
            <div class="match-emails">
                <div class="email-comparison">
                    <div class="email-item email-yellow">
                        <span class="email-name">${pair.familyEmail.name}</span>
                        <span class="email-address" id="family-${pair.familyEmail.email}-${containerId}">${pair.familyEmail.email}</span>
                    </div>
                    <div class="email-item email-yellow">
                        <span class="email-name">${pair.storedEmail.name}</span>
                        <span class="email-address" id="stored-${pair.storedEmail.email}-${containerId}">${pair.storedEmail.email}</span>
                    </div>
                </div>
            </div>
        `;
        
        container.appendChild(div);
        
        // Highlight differences
        highlightDifferencesForPair(pair.familyEmail.email, pair.storedEmail.email, pair.differences, containerId);
    });
}

// Highlight differences cho một cặp
function highlightDifferencesForPair(email1, email2, differences, containerId) {
    const familyElement = document.getElementById(`family-${email1}-${containerId}`);
    const storedElement = document.getElementById(`stored-${email2}-${containerId}`);
    
    if (familyElement && storedElement) {
        let familyHTML = '';
        let storedHTML = '';
        
        const maxLength = Math.max(email1.length, email2.length);
        
        for (let i = 0; i < maxLength; i++) {
            const char1 = email1[i] || '';
            const char2 = email2[i] || '';
            
            if (char1 !== char2) {
                familyHTML += `<span class="char-different">${char1}</span>`;
                storedHTML += `<span class="char-different">${char2}</span>`;
            } else {
                familyHTML += char1;
                storedHTML += char2;
            }
        }
        
        familyElement.innerHTML = familyHTML;
        storedElement.innerHTML = storedHTML;
    }
}

// Cập nhật bảng so sánh cho một cặp theo đúng spec
function updateComparisonTableForPair(result, tbodyId) {
    const tbody = document.getElementById(tbodyId);
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    // Trường hợp 1: Email khớp hoàn toàn (xanh lá, chung hàng)
    // Chỉ hiển thị trong chế độ "chi tiết"
    if (currentViewMode === 'detailed') {
        result.exactMatches.forEach(match => {
            const row = document.createElement('tr');
            row.className = 'match-row exact-match';
            row.innerHTML = `
                <td class="email-cell">
                    <span class="email-address email-perfect">${match.familyEmail.email}</span>
                </td>
                <td class="email-cell">
                    <span class="email-address email-perfect">${match.storedEmail.email}</span>
                </td>
            `;
            tbody.appendChild(row);
        });
    }
    
    // Trường hợp 3: Email nghi ngờ (vàng, chung hàng, highlight đỏ phần khác)
    result.similarPairs.forEach(pair => {
        const row = document.createElement('tr');
        row.className = 'match-row similar-match';
        const highlightedFamily = buildHighlightedEmail(pair.familyEmail.email, pair.storedEmail.email, 'family');
        const highlightedStored = buildHighlightedEmail(pair.familyEmail.email, pair.storedEmail.email, 'stored');
        row.innerHTML = `
            <td class="email-cell">
                <span class="email-address email-similar">${highlightedFamily}</span>
            </td>
            <td class="email-cell">
                <span class="email-address email-similar">${highlightedStored}</span>
            </td>
        `;
        tbody.appendChild(row);
    });
    
    // Trường hợp 2a: Chỉ có trong Family (đỏ, một mình một hàng)
    result.familyOnly.forEach(item => {
        const row = document.createElement('tr');
        row.className = 'match-row family-only';
        row.innerHTML = `
            <td class="email-cell">
                <span class="email-address email-different">${item.email}</span>
            </td>
            <td class="email-cell">
                <span class="email-empty">-</span>
            </td>
        `;
        tbody.appendChild(row);
    });
    
    // Trường hợp 2b: Chỉ có trong Stored (đỏ, một mình một hàng)
    result.storedOnly.forEach(item => {
        const row = document.createElement('tr');
        row.className = 'match-row stored-only';
        row.innerHTML = `
            <td class="email-cell">
                <span class="email-empty">-</span>
            </td>
            <td class="email-cell">
                <span class="email-address email-different">${item.email}</span>
            </td>
        `;
        tbody.appendChild(row);
    });
}

// Render vào email-grid cho một cặp
function renderEmailGridForPair(result, gridId) {
    const grid = document.getElementById(gridId);
    if (!grid) return;
    
    // Exact matches (xanh) — chỉ hiển thị 1 dòng, span 2 cột
    result.exactMatches.forEach(match => {
        const single = document.createElement('div');
        single.className = 'cell email-green two-col';
        single.textContent = match.familyEmail.email;
        grid.appendChild(single);
    });
    
    // Similar pairs (vàng + highlight đỏ từng ký tự)
    result.similarPairs.forEach(pair => {
        const left = document.createElement('div');
        left.className = 'cell email-yellow';
        left.innerHTML = buildHighlightedEmail(pair.familyEmail.email, pair.storedEmail.email, 'family');
        const right = document.createElement('div');
        right.className = 'cell email-yellow';
        right.innerHTML = buildHighlightedEmail(pair.familyEmail.email, pair.storedEmail.email, 'stored');
        grid.appendChild(left);
        grid.appendChild(right);
    });
    
    // Family only (đỏ, bên phải '-')
    result.familyOnly.forEach(item => {
        const left = document.createElement('div');
        left.className = 'cell email-red';
        left.textContent = item.email;
        const right = document.createElement('div');
        right.className = 'cell email-empty';
        right.textContent = '-';
        grid.appendChild(left);
        grid.appendChild(right);
    });
    
    // Stored only (đỏ, bên trái '-')
    result.storedOnly.forEach(item => {
        const left = document.createElement('div');
        left.className = 'cell email-empty';
        left.textContent = '-';
        const right = document.createElement('div');
        right.className = 'cell email-red';
        right.textContent = item.email;
        grid.appendChild(left);
        grid.appendChild(right);
    });
}

// Render 1 dòng cho mỗi kết quả: family -> stored | màu theo trạng thái
function renderOneLineForPair(result, rootId) {
    const root = document.getElementById(rootId);
    if (!root) return;

    // Build one single line for the whole pair
    const segmentsGreen = result.exactMatches.map(m => `${m.familyEmail.email} → ${m.storedEmail.email}`);

    const segmentsYellow = result.similarPairs.map(p => {
        const left = buildHighlightedEmail(p.familyEmail.email, p.storedEmail.email, 'family');
        const right = buildHighlightedEmail(p.familyEmail.email, p.storedEmail.email, 'stored');
        return `${left} → ${right}`;
    });

    const segmentsRedLeft = result.familyOnly.map(i => `${i.email} → -`);
    const segmentsRedRight = result.storedOnly.map(i => `- → ${i.email}`);

    // Create containers by severity: red > yellow > green (to ensure visibility)
    if (segmentsRedLeft.length || segmentsRedRight.length) {
        const line = document.createElement('div');
        line.className = 'cell-line email-red';
        line.innerHTML = [...segmentsRedLeft, ...segmentsRedRight, ...segmentsYellow, ...segmentsGreen].join(' ; ');
        root.appendChild(line);
        return;
    }

    if (segmentsYellow.length) {
        const line = document.createElement('div');
        line.className = 'cell-line email-yellow';
        line.innerHTML = [...segmentsYellow, ...segmentsGreen].join(' ; ');
        root.appendChild(line);
        return;
    }

    // Only green
    const line = document.createElement('div');
    line.className = 'cell-line email-green';
    line.textContent = segmentsGreen.join(' ; ');
    root.appendChild(line);
}

// Hàm chọn nhanh số cặp
function selectPairs(number) {
    const numberOfPairsInput = document.getElementById('numberOfPairs');
    if (numberOfPairsInput) {
        numberOfPairsInput.value = number;
        updatePairTabs();
        
        // Cập nhật trạng thái active cho các nút MỚI - LOGIC ĐÚNG
        document.querySelectorAll('.new-btn').forEach(btn => {
            btn.classList.remove('active');
            // Reset inline style
            btn.style.backgroundColor = '';
            btn.style.borderColor = '';
            btn.style.color = '';
            btn.style.transform = '';
            btn.style.boxShadow = '';
        });
        
        // Chỉ tô xanh nếu là 1, 2, hoặc 3 cặp (KHÔNG tô nếu 4+)
        if (number >= 1 && number <= 3) {
            const targetButton = document.getElementById(`btn${number}`);
            if (targetButton) {
                targetButton.classList.add('active');
                // Force inline style để đảm bảo màu
                targetButton.style.backgroundColor = '#3182ce';
                targetButton.style.borderColor = '#3182ce';
                targetButton.style.color = 'white';
                targetButton.style.transform = 'translateY(-2px)';
                targetButton.style.boxShadow = '0 4px 16px rgba(49, 130, 206, 0.3)';
            }
        }
        // Nếu number > 3, không tô màu nút nào
    }
}

// FUNCTION ĐỒNG BỘ - Cập nhật cả input và nút
function testButton(number) {
    updatePairSelection(number);
}

// FUNCTION CHUNG - Đồng bộ input và nút
function updatePairSelection(number) {
    // Cập nhật input
    const numberOfPairsInput = document.getElementById('numberOfPairs');
    if (numberOfPairsInput) {
        numberOfPairsInput.value = number;
    }
    
    // Reset tất cả nút
    document.querySelectorAll('.new-btn').forEach(btn => {
        btn.style.backgroundColor = '';
        btn.style.borderColor = '';
        btn.style.color = '';
        btn.classList.remove('active');
    });
    
    // Chỉ tô màu nếu là 1, 2, hoặc 3 cặp
    if (number >= 1 && number <= 3) {
        const targetButton = document.getElementById(`btn${number}`);
        if (targetButton) {
            targetButton.style.backgroundColor = '#3182ce';
            targetButton.style.borderColor = '#3182ce';
            targetButton.style.color = 'white';
            targetButton.classList.add('active');
        }
    }
    
    // Cập nhật email containers
    updatePairTabs();
}

// FUNCTION ĐỒNG BỘ NÚT KHI NHẬP SỐ
function syncButtonsWithInput(number) {
    // Reset tất cả nút
    document.querySelectorAll('.new-btn').forEach(btn => {
        btn.style.backgroundColor = '';
        btn.style.borderColor = '';
        btn.style.color = '';
        btn.classList.remove('active');
    });
    
    // Chỉ tô màu nếu là 1, 2, hoặc 3 cặp
    if (number >= 1 && number <= 3) {
        const targetButton = document.getElementById(`btn${number}`);
        if (targetButton) {
            targetButton.style.backgroundColor = '#3182ce';
            targetButton.style.borderColor = '#3182ce';
            targetButton.style.color = 'white';
            targetButton.classList.add('active');
        }
    }
}

// Hàm hiển thị toast (sử dụng từ app.js)
// showToast is defined in app.js

// Guide Modal Functions
function showGuideModal() {
    const modal = document.getElementById('guideModal');
    if (modal) {
        modal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
        
        // Add click outside to close
        modal.addEventListener('click', function(e) {
            if (e.target === modal) {
                hideGuideModal();
            }
        });
    }
}

function hideGuideModal() {
    const modal = document.getElementById('guideModal');
    if (modal) {
        modal.style.display = 'none';
        document.body.style.overflow = 'auto';
    }
}

// Add ESC key to close modal
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        hideGuideModal();
    }
});

// Export functions to global scope
window.checkAllFamilyEmails = checkAllFamilyEmails;
window.clearAllFamilyForms = clearAllFamilyForms;
window.switchToDetailedView = switchToDetailedView;
window.switchToOverviewView = switchToOverviewView;
window.testButton = testButton;
window.updatePairTabs = updatePairTabs;
window.showGuideModal = showGuideModal;
window.hideGuideModal = hideGuideModal;

// Ensure exports are available after DOM ready
document.addEventListener('DOMContentLoaded', function() {
    // Re-export functions to ensure availability
    window.checkAllFamilyEmails = checkAllFamilyEmails;
    window.clearAllFamilyForms = clearAllFamilyForms;
    window.switchToDetailedView = switchToDetailedView;
    window.switchToOverviewView = switchToOverviewView;
    window.testButton = testButton;
    window.updatePairTabs = updatePairTabs;
    window.showGuideModal = showGuideModal;
    window.hideGuideModal = hideGuideModal;
});
