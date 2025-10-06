// ===== SCHEDULE MODULE =====
let currentWeek = 0; // 0 = current week, -1 = previous week, 1 = next week
let currentMonth = 0; // 0 = current month, -1 = previous month, 1 = next month
let scheduleData = {
    shifts: [],
    people: [
        { id: 'person1', name: 'Người 1', color: '#3b82f6' },
        { id: 'person2', name: 'Người 2', color: '#10b981' },
        { id: 'person3', name: 'Người 3', color: '#f59e0b' },
        { id: 'person4', name: 'Người 4', color: '#ef4444' }
    ]
};

// Salary configuration
const SALARY_CONFIG = {
    SHIFT_RATE: 120000, // 120k per shift
    MEAL_ALLOWANCE: 40000 // 40k meal allowance
};

// Shift configurations
const shiftConfigs = {
    'shift1': { name: 'Ca 1', start: '08:00', end: '12:00', color: 'shift1' },
    'shift2': { name: 'Ca 2', start: '13:00', end: '17:00', color: 'shift2' },
    'shift3': { name: 'Ca 3', start: '18:00', end: '22:00', color: 'shift3' },
    'shift1-2': { name: 'Ca 1+2', start: '08:00', end: '17:00', color: 'shift1-2' },
    'shift2-3': { name: 'Ca 2+3', start: '13:00', end: '22:00', color: 'shift2-3' },
    'shift1-3': { name: 'Ca 1+3', start: '08:00-12:00, 18:00-22:00', end: '', color: 'shift1-3' },
    'all': { name: 'Cả ngày', start: '08:00', end: '22:00', color: 'all' }
};

const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
const dayNames = ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'Chủ nhật'];

(function initSchedule() {
    // Load schedule data from localStorage
    loadScheduleData();
    
    // Set initial month to May 2025 if current month is before May 2025
    const today = new Date();
    const may2025 = new Date(2025, 4, 1); // Tháng 5/2025 (tháng 4 vì index từ 0)
    
    if (today < may2025) {
        currentMonth = 0; // Reset to current month, but will be limited by changeMonth function
    }
    
    // Initialize schedule views
    renderTeamSchedule();
    renderPersonalSchedule();
    updateScheduleStats();
    
    // Set up event listeners
    setupScheduleEventListeners();
})();

function loadScheduleData() {
    try {
        const saved = localStorage.getItem('schedule_data');
        if (saved) {
            const parsed = JSON.parse(saved);
            scheduleData.shifts = parsed.shifts || [];
            scheduleData.people = parsed.people || scheduleData.people;
        }
    } catch (e) {
    }
}

function saveScheduleData() {
    try {
        localStorage.setItem('schedule_data', JSON.stringify(scheduleData));
    } catch (e) {
        // Handle error silently
    }
}

function setupScheduleEventListeners() {
    // Week navigation
    document.getElementById('changeWeek')?.addEventListener('click', () => changeWeek(1));
    
    // Person selection
    document.getElementById('personSelect')?.addEventListener('change', loadPersonalSchedule);
}

function switchScheduleView(view) {
    // Update button states
    document.getElementById('teamViewBtn').classList.toggle('active', view === 'team');
    document.getElementById('personalViewBtn').classList.toggle('active', view === 'personal');
    
    // Show/hide views
    document.getElementById('teamScheduleView').classList.toggle('active', view === 'team');
    document.getElementById('personalScheduleView').classList.toggle('active', view === 'personal');
    
    if (view === 'team') {
        switchTeamViewMode('week');
    } else if (view === 'personal') {
        switchPersonalViewMode('week');
    }
}

function switchTeamViewMode(mode) {
    // Update button states
    document.getElementById('teamWeekBtn').classList.toggle('active', mode === 'week');
    document.getElementById('teamMonthBtn').classList.toggle('active', mode === 'month');
    
    // Show/hide sub-views
    document.getElementById('teamWeekView').classList.toggle('active', mode === 'week');
    document.getElementById('teamMonthView').classList.toggle('active', mode === 'month');
    
    if (mode === 'week') {
        renderTeamSchedule();
    } else {
        renderTeamMonthlySchedule();
    }
}
window.switchTeamViewMode = switchTeamViewMode;

function switchPersonalViewMode(mode) {
    // Update button states
    document.getElementById('personalWeekBtn').classList.toggle('active', mode === 'week');
    document.getElementById('personalMonthBtn').classList.toggle('active', mode === 'month');
    
    // Show/hide sub-views
    document.getElementById('personalWeekView').classList.toggle('active', mode === 'week');
    document.getElementById('personalMonthView').classList.toggle('active', mode === 'month');
    
    if (mode === 'week') {
        renderPersonalSchedule();
    } else {
        renderPersonalMonthlySchedule();
    }
}
window.switchPersonalViewMode = switchPersonalViewMode;
window.switchScheduleView = switchScheduleView;

// ===== CSV IMPORT =====
// Import features removed per request


function parseCsv(text) {
    // Auto-detect delimiter: comma, semicolon, or tab
    const sample = String(text).split(/\r?\n/).slice(0, 5).join('\n');
    const candidates = [',', ';', '\t'];
    let bestDelim = ',';
    let bestScore = -1;
    for (const d of candidates) {
        const counts = sample.split(/\r?\n/).map(l => l.split(d).length).filter(n => n > 1);
        const score = counts.length > 0 ? counts.reduce((a, b) => a + b, 0) / counts.length : 0;
        if (score > bestScore) { bestScore = score; bestDelim = d; }
    }
    const lines = String(text).replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n').filter(l => l.trim().length > 0);
    const rows = [];
    for (const line of lines) {
        const row = [];
        let cur = '';
        let inQuotes = false;
        for (let i = 0; i < line.length; i++) {
            const ch = line[i];
            if (ch === '"') {
                if (inQuotes && line[i + 1] === '"') { cur += '"'; i++; }
                else { inQuotes = !inQuotes; }
            } else if (ch === bestDelim && !inQuotes) {
                row.push(cur.trim());
                cur = '';
            } else {
                cur += ch;
            }
        }
        row.push(cur.trim());
        rows.push(row);
    }
    if (!rows || rows.length === 0) throw new Error('File rỗng');
    if (rows[0].length < 3) throw new Error('CSV thiếu cột (cần tối thiểu name, day, shift)');
    return rows;
}

function isCentrixMatrixFormat(text) {
    const lines = text.split(/\r?\n/).slice(0, 5);
    // Heuristics: contains Vietnamese title, or first column is employee label, or a row with many day numbers
    const hasTitle = lines.some(l => l.toLowerCase().includes('lịch') || l.toLowerCase().includes('lich'));
    const hasEmployeeHeader = lines.some(l => l.toLowerCase().includes('tên nhân viên') || l.toLowerCase().includes('ten nhan vien'));
    const hasManyDaysRow = lines.some(l => {
        const cells = l.split(/[;,\t]/).map(c => c.trim());
        const nums = cells.filter(c => /^\d{1,2}$/.test(c));
        return nums.length >= 7; // a row listing many day numbers
    });
    return hasTitle || hasEmployeeHeader || hasManyDaysRow;
}

// Parse Centrix matrix schedule exported as semicolon-separated rows where
// row 5 has day headers 1..31 and subsequent rows are employee names with shift tokens
function importCentrixMatrixSchedule(text, fileName) {
    // Auto-detect delimiter for matrix: ; , or tab
    const sample = text.split(/\r?\n/).slice(0, 5).join('\n');
    const delims = [';', ',', '\t'];
    let delim = ';';
    let best = -1;
    for (const d of delims) {
        const counts = sample.split(/\r?\n/).map(l => l.split(d).length).filter(n => n > 1);
        const score = counts.length ? counts.reduce((a,b)=>a+b,0)/counts.length : 0;
        if (score > best) { best = score; delim = d; }
    }
    const rows = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n').map(r => r.split(new RegExp(delim)));
    // Find header row containing days (1..31). It may be row 2 if row 1 has weekday labels.
    let headerRowIndex = -1;
    for (let i = 0; i < Math.min(rows.length, 10); i++) {
        const row = rows[i];
        const nums = row.map(c => c.trim()).filter(c => /^\d{1,2}$/.test(c));
        if (nums.length >= 7) { // enough numbers to be a day row
            headerRowIndex = i;
            break;
        }
    }
    if (headerRowIndex === -1) throw new Error('Không tìm thấy hàng tiêu đề ngày 1..31 trong file.');
    const header = rows[headerRowIndex];
    // Try to detect month/year (Vietnamese like "Tháng Mười" and year 2025 preceding)
    let year = new Date().getFullYear();
    let month = new Date().getMonth() + 1;
    for (let i = 0; i < Math.min(headerRowIndex, 5); i++) {
        const line = rows[i].join(' ');
        const yearMatch = line.match(/(20\d{2})/);
        if (yearMatch) year = parseInt(yearMatch[1], 10);
        const monthMap = {
            'một': 1, 'hai': 2, 'ba': 3, 'tư': 4, 'bốn': 4, 'năm': 5, 'sáu': 6,
            'bảy': 7, 'tám': 8, 'chín': 9, 'mười': 10, 'mười': 10, 'mười một': 11, 'mười hai': 12,
            'muoi': 10, 'muoi mot': 11, 'muoi hai': 12
        };
        const lower = line.toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '');
        if (lower.includes('thang')) {
            if (lower.includes('muoi hai')) month = 12;
            else if (lower.includes('muoi mot')) month = 11;
            else if (lower.includes('muoi')) month = 10;
        }
    }
    // Build mapping from column index -> day number
    const dayCols = [];
    for (let c = 0; c < header.length; c++) {
        const cell = header[c].trim();
        if (/^\d{1,2}$/.test(cell)) {
            dayCols.push({ col: c, day: parseInt(cell, 10) });
        }
    }
    // Data rows start after headerRowIndex; first cell = employee name
    let peopleAdded = 0;
    let shiftsAdded = 0;
    const ensurePersonByName = (name) => {
        let person = scheduleData.people.find(p => p.name.toLowerCase() === name.toLowerCase());
        if (!person) {
            const id = 'person_' + Math.random().toString(36).slice(2, 8);
            person = { id, name, color: randomColor() };
            scheduleData.people.push(person);
            peopleAdded++;
        }
        return person;
    };
    for (let r = headerRowIndex + 1; r < rows.length; r++) {
        const row = rows[r];
        if (!row || row.length === 0) continue;
        const name = (row[0] || '').trim();
        if (!name || name.toLowerCase().includes('tổng')) continue;
        const person = ensurePersonByName(name);
        for (const { col, day } of dayCols) {
            const token = (row[col] || '').trim();
            if (!token) continue;
            const shiftType = normalizeShift(token);
            if (!shiftType) continue;
            // Compute weekday for this calendar date
            const dateObj = new Date(year, month - 1, day);
            const weekdayIndex = dateObj.getDay(); // 0=Sun..6=Sat
            const dayKey = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday'][weekdayIndex];
            const conflicts = checkShiftConflicts(person.id, dayKey, shiftType);
            if (conflicts.length > 0) continue;
            scheduleData.shifts.push({
                id: generateShiftId(),
                personId: person.id,
                day: dayKey,
                shiftType,
                note: null,
                mealAllowance: 'company',
                createdAt: new Date(year, month - 1, day).toISOString()
            });
            shiftsAdded++;
        }
    }
    updatePeopleSelects();
    return { peopleAdded, shiftsAdded };
}
// Expected headers (case-insensitive): name, day, shift, note, color
// day accepts: monday..sunday or Thứ 2..Chủ nhật; shift accepts keys in shiftConfigs
function ingestScheduleCsv(rows) {
    if (!rows || rows.length === 0) throw new Error('CSV rỗng');
    const header = rows[0].map(h => h.toLowerCase());
    const idx = {
        name: header.indexOf('name') !== -1 ? header.indexOf('name') : header.indexOf('tên'),
        day: header.indexOf('day') !== -1 ? header.indexOf('day') : header.indexOf('ngày'),
        shift: header.indexOf('shift') !== -1 ? header.indexOf('shift') : header.indexOf('ca'),
        note: header.indexOf('note') !== -1 ? header.indexOf('note') : header.indexOf('ghi chú'),
        color: header.indexOf('color') !== -1 ? header.indexOf('color') : header.indexOf('màu')
    };
    if (idx.name === -1 || idx.day === -1 || idx.shift === -1) {
        throw new Error('Thiếu cột bắt buộc: name, day, shift');
    }
    let peopleAdded = 0;
    let shiftsAdded = 0;
    const ensurePerson = (name, color) => {
        let person = scheduleData.people.find(p => p.name.toLowerCase() === name.toLowerCase());
        if (!person) {
            const id = 'person_' + Math.random().toString(36).slice(2, 8);
            person = { id, name, color: color || randomColor() };
            scheduleData.people.push(person);
            peopleAdded++;
        } else if (color && /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(color)) {
            person.color = color;
        }
        return person;
    };
    for (let r = 1; r < rows.length; r++) {
        const row = rows[r];
        if (!row || row.length === 0) continue;
        const name = (row[idx.name] || '').trim();
        const dayRaw = (row[idx.day] || '').trim();
        const shiftRaw = (row[idx.shift] || '').trim();
        const note = idx.note !== -1 ? (row[idx.note] || '').trim() : '';
        const color = idx.color !== -1 ? (row[idx.color] || '').trim() : '';
        if (!name || !dayRaw || !shiftRaw) continue;
        const person = ensurePerson(name, color);
        const day = normalizeDay(dayRaw);
        const shiftType = normalizeShift(shiftRaw);
        if (!day || !shiftConfigs[shiftType]) {
            // Handle error silently
            continue;
        }
        // Check conflicts
        const conflicts = checkShiftConflicts(person.id, day, shiftType);
        if (conflicts.length > 0) {
            // Handle error silently
            continue;
        }
        scheduleData.shifts.push({
            id: generateShiftId(),
            personId: person.id,
            day,
            shiftType,
            note: note || null,
            mealAllowance: 'company',
            createdAt: new Date().toISOString()
        });
        shiftsAdded++;
    }
    updatePeopleSelects();
    return { peopleAdded, shiftsAdded };
}

function normalizeDay(v) {
    const s = v.toLowerCase();
    const map = {
        'thứ 2': 'monday', 'thu 2': 'monday', 't2': 'monday', 'monday': 'monday', 'mon': 'monday',
        'thứ 3': 'tuesday', 'thu 3': 'tuesday', 't3': 'tuesday', 'tuesday': 'tuesday', 'tue': 'tuesday',
        'thứ 4': 'wednesday', 'thu 4': 'wednesday', 't4': 'wednesday', 'wednesday': 'wednesday', 'wed': 'wednesday',
        'thứ 5': 'thursday', 'thu 5': 'thursday', 't5': 'thursday', 'thursday': 'thursday', 'thu': 'thursday',
        'thứ 6': 'friday', 'thu 6': 'friday', 't6': 'friday', 'friday': 'friday', 'fri': 'friday',
        'thứ 7': 'saturday', 'thu 7': 'saturday', 't7': 'saturday', 'saturday': 'saturday', 'sat': 'saturday',
        'chủ nhật': 'sunday', 'chu nhat': 'sunday', 'cn': 'sunday', 'sunday': 'sunday', 'sun': 'sunday'
    };
    return map[s] || null;
}

function normalizeShift(v) {
    const s = String(v).toLowerCase().replace(/\s+/g, ' ').trim();
    if (shiftConfigs[s]) return s;
    // Extract all known patterns; prefer combined shifts over single ones
    const re = /(1\+\s*2|2\+\s*3|1\+\s*3|ca\s*1\+\s*2|ca\s*2\+\s*3|ca\s*1\+\s*3|8-17|13-22|8-12,\s*18-22|8-22|ca\s*1|ca\s*2|ca\s*3|\b1\b|\b2\b|\b3\b|8-12|13-17|18-22)/g;
    const matches = s.match(re) || [];
    // Choose the longest match (so 1+2 wins over 1)
    let sel = '';
    for (const m of matches) { if (m.replace(/\s+/g, '').length > sel.length) sel = m; }
    const key = sel ? sel.replace(/\s+/g, '').replace('ca', '') : '';
    const map = {
        '1': 'shift1', '2': 'shift2', '3': 'shift3',
        'ca1': 'shift1', 'ca2': 'shift2', 'ca3': 'shift3',
        '1+2': 'shift1-2', '2+3': 'shift2-3', '1+3': 'shift1-3',
        '8-12': 'shift1', '13-17': 'shift2', '18-22': 'shift3',
        '8-17': 'shift1-2', '13-22': 'shift2-3', '8-12,18-22': 'shift1-3',
        '8-22': 'all'
    };
    return map[key] || null;
}

function randomColor() {
    const colors = ['#3b82f6','#10b981','#f59e0b','#ef4444','#8b5cf6','#06b6d4','#22c55e','#eab308'];
    return colors[Math.floor(Math.random() * colors.length)];
}

function changeWeek(direction) {
    currentWeek += direction;
    updateWeekDisplay();
    renderTeamSchedule();
    renderPersonalSchedule();
}
window.changeWeek = changeWeek;

function updateWeekDisplay() {
    const today = new Date();
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - today.getDay() + 1 + (currentWeek * 7));
    
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    
    const weekDisplay = document.getElementById('currentWeek');
    const personalWeekDisplay = document.getElementById('personalCurrentWeek');
    
    if (weekDisplay) {
        weekDisplay.textContent = `Tuần ${weekStart.getDate()}-${weekEnd.getDate()}/${weekStart.getMonth() + 1}/${weekStart.getFullYear()}`;
    }
    if (personalWeekDisplay) {
        personalWeekDisplay.textContent = `Tuần ${weekStart.getDate()}-${weekEnd.getDate()}/${weekStart.getMonth() + 1}/${weekStart.getFullYear()}`;
    }
}

function renderTeamSchedule() {
    const grid = document.getElementById('teamScheduleGrid');
    if (!grid) return;
    
    // Clear grid
    grid.innerHTML = '';
    
    // Add header row
    grid.appendChild(createScheduleHeader());
    
    // Add time slots
    const timeSlots = [
        { time: '08:00', label: 'Ca 1' },
        { time: '12:00', label: 'Nghỉ trưa' },
        { time: '13:00', label: 'Ca 2' },
        { time: '17:00', label: 'Nghỉ tối' },
        { time: '18:00', label: 'Ca 3' },
        { time: '22:00', label: 'Kết thúc' }
    ];
    
    timeSlots.forEach(slot => {
        const timeCell = document.createElement('div');
        timeCell.className = 'schedule-time-cell';
        timeCell.innerHTML = `
            <div>${slot.time}</div>
            <div style="font-size: 10px; opacity: 0.7;">${slot.label}</div>
        `;
        grid.appendChild(timeCell);
        
        // Add day cells for this time slot
        days.forEach(day => {
            const dayCell = document.createElement('div');
            dayCell.className = 'schedule-slot';
            dayCell.dataset.day = day;
            dayCell.dataset.time = slot.time;
            
            // Check if there's a shift at this time
            const shifts = getShiftsForDayAndTime(day, slot.time);
            if (shifts.length > 0) {
                dayCell.classList.add('occupied');
                const shift = shifts[0];
                const person = scheduleData.people.find(p => p.id === shift.personId);
                const personColor = person ? person.color : '#3b82f6';
                
                const displayName = getDisplayShiftLabel(shift.shiftType, slot.time);
                dayCell.innerHTML = `
                    <div class="shift-info">${getPersonName(shift.personId)}</div>
                    <div class="shift-time">${displayName}</div>
                    ${shift.note ? `<div class="shift-note">${shift.note}</div>` : ''}
                `;
                dayCell.style.borderLeftColor = personColor;
                dayCell.style.borderLeftWidth = '4px';
                dayCell.onclick = () => openEditShiftModal(shift.id);
            } else {
                dayCell.innerHTML = '<div style="opacity: 0.3;">Trống</div>';
                dayCell.onclick = () => openAddShiftModal(day, slot.time);
            }
            
            grid.appendChild(dayCell);
        });
    });
}

function renderPersonalSchedule() {
    const grid = document.getElementById('personalScheduleGrid');
    if (!grid) return;
    
    const selectedPerson = document.getElementById('personSelect')?.value || 'person1';
    
    // Clear grid
    grid.innerHTML = '';
    
    // Add header row
    grid.appendChild(createScheduleHeader());
    
    // Add time slots
    const timeSlots = [
        { time: '08:00', label: 'Ca 1' },
        { time: '12:00', label: 'Nghỉ trưa' },
        { time: '13:00', label: 'Ca 2' },
        { time: '17:00', label: 'Nghỉ tối' },
        { time: '18:00', label: 'Ca 3' },
        { time: '22:00', label: 'Kết thúc' }
    ];
    
    timeSlots.forEach(slot => {
        const timeCell = document.createElement('div');
        timeCell.className = 'schedule-time-cell';
        timeCell.innerHTML = `
            <div>${slot.time}</div>
            <div style="font-size: 10px; opacity: 0.7;">${slot.label}</div>
        `;
        grid.appendChild(timeCell);
        
        // Add day cells for this time slot
        days.forEach(day => {
            const dayCell = document.createElement('div');
            dayCell.className = 'schedule-slot';
            dayCell.dataset.day = day;
            dayCell.dataset.time = slot.time;
            
            // Check if this person has a shift at this time
            const shifts = getShiftsForDayAndTime(day, slot.time).filter(shift => shift.personId === selectedPerson);
            if (shifts.length > 0) {
                dayCell.classList.add('occupied');
                const shift = shifts[0];
                const person = scheduleData.people.find(p => p.id === shift.personId);
                const personColor = person ? person.color : '#3b82f6';
                
                const displayName = getDisplayShiftLabel(shift.shiftType, slot.time);
                dayCell.innerHTML = `
                    <div class="shift-info">${displayName}</div>
                    <div class="shift-time">${shiftConfigs[shift.shiftType].start}${shiftConfigs[shift.shiftType].end ? ' - ' + shiftConfigs[shift.shiftType].end : ''}</div>
                    ${shift.note ? `<div class="shift-note">${shift.note}</div>` : ''}
                `;
                dayCell.style.borderLeftColor = personColor;
                dayCell.style.borderLeftWidth = '4px';
                dayCell.onclick = () => openEditShiftModal(shift.id);
            } else {
                dayCell.innerHTML = '<div style="opacity: 0.3;">Trống</div>';
                dayCell.onclick = () => openAddShiftModal(day, slot.time, selectedPerson);
            }
            
            grid.appendChild(dayCell);
        });
    });
}

function createScheduleHeader() {
    const headerRow = document.createElement('div');
    headerRow.style.gridColumn = '1 / -1';
    headerRow.style.display = 'grid';
    headerRow.style.gridTemplateColumns = '120px repeat(7, 1fr)';
    headerRow.style.gap = '1px';
    headerRow.style.background = 'var(--border-primary)';
    
    // Time column header
    const timeHeader = document.createElement('div');
    timeHeader.className = 'schedule-header-cell';
    timeHeader.textContent = 'Thời gian';
    headerRow.appendChild(timeHeader);
    
    // Day headers
    dayNames.forEach(dayName => {
        const dayHeader = document.createElement('div');
        dayHeader.className = 'schedule-header-cell';
        dayHeader.textContent = dayName;
        headerRow.appendChild(dayHeader);
    });
    
    return headerRow;
}

function getShiftsForDayAndTime(day, time) {
    return scheduleData.shifts.filter(shift => {
        if (shift.day !== day) return false;
        
        const shiftConfig = shiftConfigs[shift.shiftType];
        if (!shiftConfig) return false;
        
        // Check if the time falls within the shift
        return isTimeInShift(time, shiftConfig);
    });
}

function isTimeInShift(time, shiftConfig) {
    // Support combined shifts by start/end
    if (shiftConfig.start === '08:00-12:00, 18:00-22:00') {
        return time === '08:00' || time === '18:00';
    }
    if (shiftConfig.end) {
        // Treat combined ranges as occupying multiple rows
        const startHour = parseInt(shiftConfig.start.split(':')[0]);
        const endHour = parseInt(shiftConfig.end.split(':')[0]);
        const timeHour = parseInt(time.split(':')[0]);
        // Show at the starting hours of each component block
        if (startHour === 8 && endHour >= 17) {
            // Ca 1+2 or All covers 08:00; also show 13:00 if spans past 13
            if (timeHour === 8) return true;
            if (endHour >= 17 && timeHour === 13) return true;
            if (endHour >= 22 && timeHour === 18) return true; // All day
            return false;
        }
        if (startHour === 13 && endHour >= 22) {
            // Ca 2+3: show at 13:00 and 18:00
            return timeHour === 13 || timeHour === 18;
        }
        // Default: single block starting at start
        return time === shiftConfig.start;
    }
    return time === shiftConfig.start;
}

function getPersonName(personId) {
    const person = scheduleData.people.find(p => p.id === personId);
    return person ? person.name : personId;
}

function getDisplayShiftLabel(shiftType, time) {
    switch (shiftType) {
        case 'shift1-2':
            return time === '13:00' ? 'Ca 2' : 'Ca 1';
        case 'shift2-3':
            return time === '18:00' ? 'Ca 3' : 'Ca 2';
        case 'shift1-3':
            return time === '18:00' ? 'Ca 3' : 'Ca 1';
        case 'all':
            if (time === '08:00') return 'Ca 1';
            if (time === '13:00') return 'Ca 2';
            if (time === '18:00') return 'Ca 3';
            return shiftConfigs[shiftType].name;
        default:
            return shiftConfigs[shiftType].name;
    }
}

function openAddShiftModal(day = null, time = null, person = null) {
    const modal = document.getElementById('addShiftModal');
    if (!modal) return;
    
    // Pre-fill form if parameters provided
    if (day) {
        const daySelect = document.getElementById('shiftDay');
        if (daySelect) daySelect.value = day;
    }
    
    if (person) {
        const personSelect = document.getElementById('shiftPerson');
        if (personSelect) personSelect.value = person;
    }
    
    modal.classList.add('show');
}
window.openAddShiftModal = openAddShiftModal;

function closeAddShiftModal() {
    const modal = document.getElementById('addShiftModal');
    if (modal) modal.classList.remove('show');
}
window.closeAddShiftModal = closeAddShiftModal;

function updateShiftTimes() {
    const shiftType = document.getElementById('shiftType')?.value;
    if (!shiftType) return;
    
    const shiftConfig = shiftConfigs[shiftType];
    if (!shiftConfig) return;
    
    // Update the select options to show the correct times
    const select = document.getElementById('shiftType');
    const options = select.querySelectorAll('option');
    
    options.forEach(option => {
        if (option.value === shiftType) {
            option.textContent = `${shiftConfig.name} (${shiftConfig.start}${shiftConfig.end ? '-' + shiftConfig.end : ''})`;
        }
    });
}

function addShift() {
    const personId = document.getElementById('shiftPerson')?.value;
    const day = document.getElementById('shiftDay')?.value;
    const shiftType = document.getElementById('shiftType')?.value;
    const note = document.getElementById('shiftNote')?.value;
    const mealAllowance = document.querySelector('input[name="mealAllowance"]:checked')?.value;
    
    if (!personId || !day || !shiftType) {
        showNotification('Vui lòng điền đầy đủ thông tin!', 'error');
        return;
    }
    
    // Check for conflicts
    const conflicts = checkShiftConflicts(personId, day, shiftType);
    if (conflicts.length > 0) {
        const personName = getPersonName(personId);
        const dayName = dayNames[days.indexOf(day)];
        showNotification(`${personName} đã có ca ${conflicts.join(', ')} vào ${dayName}. Một người không thể làm 2 ca trùng giờ!`, 'error');
        return;
    }
    
    // Add shift
    const shift = {
        id: generateShiftId(),
        personId,
        day,
        shiftType,
        note: note.trim() || null,
        mealAllowance: mealAllowance || 'company',
        createdAt: new Date().toISOString()
    };
    
    scheduleData.shifts.push(shift);
    saveScheduleData();
    
    // Refresh views
    renderTeamSchedule();
    renderPersonalSchedule();
    renderTeamMonthlySchedule();
    renderPersonalMonthlySchedule();
    renderPeopleSummary();
    updateScheduleStats();
    
    closeAddShiftModal();
    showNotification('Đã thêm ca làm việc!');
}
window.addShift = addShift;

function checkShiftConflicts(personId, day, shiftType) {
    const existingShifts = scheduleData.shifts.filter(shift => 
        shift.personId === personId && shift.day === day
    );
    
    const conflicts = [];
    const newShiftConfig = shiftConfigs[shiftType];
    
    existingShifts.forEach(existingShift => {
        const existingConfig = shiftConfigs[existingShift.shiftType];
        if (isShiftOverlapping(newShiftConfig, existingConfig)) {
            conflicts.push(existingConfig.name);
        }
    });
    
    return conflicts;
}

function checkShiftConflictsForEdit(personId, day, shiftType, excludeShiftId) {
    const existingShifts = scheduleData.shifts.filter(shift => 
        shift.personId === personId && 
        shift.day === day && 
        shift.id !== excludeShiftId
    );
    
    const conflicts = [];
    const newShiftConfig = shiftConfigs[shiftType];
    
    existingShifts.forEach(existingShift => {
        const existingConfig = shiftConfigs[existingShift.shiftType];
        if (isShiftOverlapping(newShiftConfig, existingConfig)) {
            conflicts.push(existingConfig.name);
        }
    });
    
    return conflicts;
}

function isShiftOverlapping(shift1, shift2) {
    // Define time ranges for each shift type
    const getTimeRanges = (shift) => {
        switch (shift.start) {
            case '08:00':
                return [{ start: 8, end: 12 }]; // Ca 1: 8h-12h
            case '13:00':
                return [{ start: 13, end: 17 }]; // Ca 2: 13h-17h
            case '18:00':
                return [{ start: 18, end: 22 }]; // Ca 3: 18h-22h
            case '08:00-12:00, 18:00-22:00':
                return [{ start: 8, end: 12 }, { start: 18, end: 22 }]; // Ca 1+3: 8h-12h, 18h-22h
            default:
                return [];
        }
    };
    
    const ranges1 = getTimeRanges(shift1);
    const ranges2 = getTimeRanges(shift2);
    
    // Check if any time ranges overlap
    for (const range1 of ranges1) {
        for (const range2 of ranges2) {
            if (range1.start < range2.end && range2.start < range1.end) {
                return true;
            }
        }
    }
    
    return false;
}

function generateShiftId() {
    return 'shift_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

function generateSchedule() {
    // Simple auto-schedule algorithm
    const people = scheduleData.people;
    const shifts = ['shift1', 'shift2', 'shift3'];
    
    // Clear existing shifts for the week
    scheduleData.shifts = scheduleData.shifts.filter(shift => {
        const shiftDate = new Date(shift.createdAt);
        const today = new Date();
        const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
        return shiftDate > weekAgo;
    });
    
    // Generate random schedule
    days.forEach(day => {
        shifts.forEach(shiftType => {
            const randomPerson = people[Math.floor(Math.random() * people.length)];
            const shift = {
                id: generateShiftId(),
                personId: randomPerson.id,
                day,
                shiftType,
                note: 'Tự động tạo',
                createdAt: new Date().toISOString()
            };
            scheduleData.shifts.push(shift);
        });
    });
    
    saveScheduleData();
    renderTeamSchedule();
    renderPersonalSchedule();
    renderTeamMonthlySchedule();
    renderPersonalMonthlySchedule();
    renderPeopleSummary();
    updateScheduleStats();
    
    showNotification('Đã tạo lịch tự động!');
}
window.generateSchedule = generateSchedule;

function loadPersonalSchedule() {
    renderPersonalSchedule();
    renderPersonalMonthlySchedule();
}
window.loadPersonalSchedule = loadPersonalSchedule;

function updateScheduleStats() {
    const totalHours = calculateTotalHours();
    const activePeople = getActivePeopleCount();
    const coverageRate = calculateCoverageRate();
    const totalSalary = calculateTotalSalary();
    const totalMealAllowance = calculateTotalMealAllowance();
    
    const totalHoursEl = document.getElementById('totalHours');
    const activePeopleEl = document.getElementById('activePeople');
    const coverageRateEl = document.getElementById('coverageRate');
    const totalSalaryEl = document.getElementById('totalSalary');
    const totalMealAllowanceEl = document.getElementById('totalMealAllowance');
    
    if (totalHoursEl) totalHoursEl.textContent = totalHours + 'h';
    if (activePeopleEl) activePeopleEl.textContent = activePeople;
    if (coverageRateEl) coverageRateEl.textContent = coverageRate + '%';
    if (totalSalaryEl) totalSalaryEl.textContent = formatCurrency(totalSalary);
    if (totalMealAllowanceEl) totalMealAllowanceEl.textContent = formatCurrency(totalMealAllowance);
}

function calculateTotalSalary() {
    return scheduleData.shifts.length * SALARY_CONFIG.SHIFT_RATE;
}

function calculateTotalMealAllowance() {
    return scheduleData.shifts.length * SALARY_CONFIG.MEAL_ALLOWANCE;
}

function calculateTotalHours() {
    let totalHours = 0;
    
    scheduleData.shifts.forEach(shift => {
        const config = shiftConfigs[shift.shiftType];
        if (config) {
            if (config.start === '08:00-12:00, 18:00-22:00') {
                totalHours += 8; // 4 hours morning + 4 hours evening
            } else if (config.end) {
                const start = parseInt(config.start.split(':')[0]);
                const end = parseInt(config.end.split(':')[0]);
                totalHours += end - start;
            } else {
                totalHours += 4; // Default 4 hours
            }
        }
    });
    
    return totalHours;
}

function getActivePeopleCount() {
    const activePeople = new Set(scheduleData.shifts.map(shift => shift.personId));
    return activePeople.size;
}

function calculateCoverageRate() {
    const totalSlots = days.length * 3; // 3 shifts per day
    const occupiedSlots = scheduleData.shifts.length;
    return Math.round((occupiedSlots / totalSlots) * 100);
}

function changeMonth(direction) {
    const today = new Date();
    const targetMonth = new Date(today.getFullYear(), today.getMonth() + currentMonth + direction, 1);
    const minDate = new Date(2025, 4, 1); // Tháng 5/2025 (tháng 4 vì index từ 0)
    
    // Kiểm tra giới hạn tháng 5/2025
    if (targetMonth < minDate) {
        showNotification('Không thể xem trước tháng 5/2025!', 'error');
        return;
    }
    
    currentMonth += direction;
    updateMonthDisplay();
    renderTeamMonthlySchedule();
    renderPersonalMonthlySchedule();
}
window.changeMonth = changeMonth;

function updateMonthDisplay() {
    const today = new Date();
    const targetMonth = new Date(today.getFullYear(), today.getMonth() + currentMonth, 1);
    const may2025 = new Date(2025, 4, 1); // Tháng 5/2025
    
    // Nếu tháng hiện tại trước tháng 5/2025, hiển thị tháng 5/2025
    const displayMonth = targetMonth < may2025 ? may2025 : targetMonth;
    
    const monthDisplay = document.getElementById('currentMonth');
    const personalMonthDisplay = document.getElementById('personalCurrentMonth');
    
    if (monthDisplay) {
        monthDisplay.textContent = `Tháng ${displayMonth.getMonth() + 1}/${displayMonth.getFullYear()}`;
    }
    if (personalMonthDisplay) {
        personalMonthDisplay.textContent = `Tháng ${displayMonth.getMonth() + 1}/${displayMonth.getFullYear()}`;
    }
}

function renderTeamMonthlySchedule() {
    const calendar = document.getElementById('teamMonthlyCalendar');
    if (!calendar) return;
    
    const today = new Date();
    const targetMonth = new Date(today.getFullYear(), today.getMonth() + currentMonth, 1);
    const may2025 = new Date(2025, 4, 1); // Tháng 5/2025
    
    // Sử dụng tháng 5/2025 nếu tháng hiện tại trước tháng 5/2025
    const displayMonth = targetMonth < may2025 ? may2025 : targetMonth;
    const lastDay = new Date(displayMonth.getFullYear(), displayMonth.getMonth() + 1, 0).getDate();
    const firstDayOfWeek = displayMonth.getDay();
    
    // Clear calendar
    calendar.innerHTML = '';
    
    // Create grid
    const grid = document.createElement('div');
    grid.className = 'monthly-grid';
    
    // Add day headers
    const dayHeaders = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
    dayHeaders.forEach(day => {
        const header = document.createElement('div');
        header.className = 'schedule-header-cell';
        header.textContent = day;
        grid.appendChild(header);
    });
    
    // Add empty cells for days before month starts
    for (let i = 0; i < firstDayOfWeek; i++) {
        const emptyDay = document.createElement('div');
        emptyDay.className = 'monthly-day other-month';
        grid.appendChild(emptyDay);
    }
    
    // Add days of the month
    for (let day = 1; day <= lastDay; day++) {
        const dayElement = document.createElement('div');
        dayElement.className = 'monthly-day';
        
        // Check if it's today
        const currentDate = new Date(displayMonth.getFullYear(), displayMonth.getMonth(), day);
        if (currentDate.toDateString() === today.toDateString()) {
            dayElement.classList.add('today');
        }
        
        // Day header
        const dayHeader = document.createElement('div');
        dayHeader.className = 'monthly-day-header';
        dayHeader.innerHTML = `
            <span class="monthly-day-number">${day}</span>
        `;
        dayElement.appendChild(dayHeader);
        
        // Get shifts for this day
        const dayShifts = getShiftsForDate(currentDate);
        if (dayShifts.length > 0) {
            const shiftsContainer = document.createElement('div');
            shiftsContainer.className = 'monthly-day-shifts';
            
            dayShifts.forEach(shift => {
                const shiftElement = document.createElement('div');
                const person = scheduleData.people.find(p => p.id === shift.personId);
                const personColor = person ? person.color : '#3b82f6';
                
                shiftElement.className = 'monthly-shift';
                shiftElement.style.backgroundColor = personColor;
                shiftElement.textContent = `${getPersonName(shift.personId)} - ${shiftConfigs[shift.shiftType].name}`;
                shiftElement.onclick = () => openEditShiftModal(shift.id);
                shiftsContainer.appendChild(shiftElement);
            });
            
            dayElement.appendChild(shiftsContainer);
        }
        
        grid.appendChild(dayElement);
    }
    
    calendar.appendChild(grid);
}

function renderPersonalMonthlySchedule() {
    const calendar = document.getElementById('personalMonthlyCalendar');
    if (!calendar) return;
    
    const selectedPerson = document.getElementById('personSelect')?.value || 'person1';
    const today = new Date();
    const targetMonth = new Date(today.getFullYear(), today.getMonth() + currentMonth, 1);
    const may2025 = new Date(2025, 4, 1); // Tháng 5/2025
    
    // Sử dụng tháng 5/2025 nếu tháng hiện tại trước tháng 5/2025
    const displayMonth = targetMonth < may2025 ? may2025 : targetMonth;
    const lastDay = new Date(displayMonth.getFullYear(), displayMonth.getMonth() + 1, 0).getDate();
    const firstDayOfWeek = displayMonth.getDay();
    
    // Clear calendar
    calendar.innerHTML = '';
    
    // Create grid
    const grid = document.createElement('div');
    grid.className = 'monthly-grid';
    
    // Add day headers
    const dayHeaders = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
    dayHeaders.forEach(day => {
        const header = document.createElement('div');
        header.className = 'schedule-header-cell';
        header.textContent = day;
        grid.appendChild(header);
    });
    
    // Add empty cells for days before month starts
    for (let i = 0; i < firstDayOfWeek; i++) {
        const emptyDay = document.createElement('div');
        emptyDay.className = 'monthly-day other-month';
        grid.appendChild(emptyDay);
    }
    
    // Add days of the month
    for (let day = 1; day <= lastDay; day++) {
        const dayElement = document.createElement('div');
        dayElement.className = 'monthly-day';
        
        // Check if it's today
        const currentDate = new Date(displayMonth.getFullYear(), displayMonth.getMonth(), day);
        if (currentDate.toDateString() === today.toDateString()) {
            dayElement.classList.add('today');
        }
        
        // Day header
        const dayHeader = document.createElement('div');
        dayHeader.className = 'monthly-day-header';
        dayHeader.innerHTML = `
            <span class="monthly-day-number">${day}</span>
        `;
        dayElement.appendChild(dayHeader);
        
        // Get shifts for this day and person
        const dayShifts = getShiftsForDate(currentDate).filter(shift => shift.personId === selectedPerson);
        if (dayShifts.length > 0) {
            const shiftsContainer = document.createElement('div');
            shiftsContainer.className = 'monthly-day-shifts';
            
            dayShifts.forEach(shift => {
                const shiftElement = document.createElement('div');
                const person = scheduleData.people.find(p => p.id === shift.personId);
                const personColor = person ? person.color : '#3b82f6';
                
                shiftElement.className = 'monthly-shift';
                shiftElement.style.backgroundColor = personColor;
                shiftElement.textContent = shiftConfigs[shift.shiftType].name;
                shiftElement.onclick = () => openEditShiftModal(shift.id);
                shiftsContainer.appendChild(shiftElement);
            });
            
            dayElement.appendChild(shiftsContainer);
        }
        
        grid.appendChild(dayElement);
    }
    
    calendar.appendChild(grid);
}

function getShiftsForDate(date) {
    const dateStr = date.toISOString().slice(0, 10);
    return scheduleData.shifts.filter(shift => {
        const shiftDate = new Date(shift.createdAt);
        return shiftDate.toISOString().slice(0, 10) === dateStr;
    });
}

function openManagePeopleModal() {
    const modal = document.getElementById('managePeopleModal');
    if (!modal) return;
    
    renderPeopleManagement();
    modal.classList.add('show');
}
window.openManagePeopleModal = openManagePeopleModal;

function closeManagePeopleModal() {
    const modal = document.getElementById('managePeopleModal');
    if (modal) modal.classList.remove('show');
}
window.closeManagePeopleModal = closeManagePeopleModal;

function renderPeopleManagement() {
    const peopleList = document.getElementById('peopleList');
    if (!peopleList) return;
    
    peopleList.innerHTML = '';
    
    scheduleData.people.forEach(person => {
        const personItem = document.createElement('div');
        personItem.className = 'person-edit-item';
        personItem.innerHTML = `
            <input type="color" class="person-color-picker" value="${person.color}" 
                   onchange="updatePersonColor('${person.id}', this.value)">
            <input type="text" class="person-name-input" value="${person.name}" 
                   onchange="updatePersonName('${person.id}', this.value)">
            <button class="btn btn-danger btn-sm" onclick="deletePerson('${person.id}')" title="Xóa người">🗑️</button>
        `;
        peopleList.appendChild(personItem);
    });
}

function updatePersonColor(personId, color) {
    const person = scheduleData.people.find(p => p.id === personId);
    if (person) {
        person.color = color;
        saveScheduleData();
        updatePeopleSelects();
    }
}

function updatePersonName(personId, name) {
    const person = scheduleData.people.find(p => p.id === personId);
    if (person) {
        person.name = name;
        saveScheduleData();
        updatePeopleSelects();
    }
}

function updatePeopleSelects() {
    // Update all select elements with people
    const selects = document.querySelectorAll('#shiftPerson, #personSelect');
    selects.forEach(select => {
        select.innerHTML = '';
        scheduleData.people.forEach(person => {
            const option = document.createElement('option');
            option.value = person.id;
            option.textContent = person.name;
            select.appendChild(option);
        });
    });
}

function savePeopleChanges() {
    saveScheduleData();
    closeManagePeopleModal();
    renderTeamSchedule();
    renderPersonalSchedule();
    renderTeamMonthlySchedule();
    renderPersonalMonthlySchedule();
    renderPeopleSummary();
    updateScheduleStats();
    showNotification('Đã lưu thay đổi thông tin người!');
}
window.savePeopleChanges = savePeopleChanges;

function deletePerson(personId) {
    const person = scheduleData.people.find(p => p.id === personId);
    if (!person) return;
    const confirmDelete = confirm(`Xóa người "${person.name}"? Các ca liên quan cũng sẽ bị xóa.`);
    if (!confirmDelete) return;
    // Remove person
    scheduleData.people = scheduleData.people.filter(p => p.id !== personId);
    // Remove shifts of that person
    const before = scheduleData.shifts.length;
    scheduleData.shifts = scheduleData.shifts.filter(s => s.personId !== personId);
    const removedShifts = before - scheduleData.shifts.length;
    saveScheduleData();
    // Refresh UI
    updatePeopleSelects();
    renderTeamSchedule();
    renderPersonalSchedule();
    renderTeamMonthlySchedule();
    renderPersonalMonthlySchedule();
    renderPeopleSummary();
    updateScheduleStats();
    renderPeopleManagement();
    showNotification(`Đã xóa "${person.name}" và ${removedShifts} ca liên quan.`, 'success');
}
window.deletePerson = deletePerson;

function deleteAllPeople() {
    // Remove all people and their shifts silently
    scheduleData.people = [];
    scheduleData.shifts = [];
    saveScheduleData();
    updatePeopleSelects();
    renderTeamSchedule();
    renderPersonalSchedule();
    renderTeamMonthlySchedule();
    renderPersonalMonthlySchedule();
    renderPeopleManagement();
    renderPeopleSummary();
    updateScheduleStats();
}
window.deleteAllPeople = deleteAllPeople;

function renderPeopleSummary() {
    const peopleGrid = document.getElementById('peopleGrid');
    if (!peopleGrid) return;
    
    peopleGrid.innerHTML = '';
    
    scheduleData.people.forEach(person => {
        const personCard = document.createElement('div');
        personCard.className = 'person-card';
        
        const personShifts = scheduleData.shifts.filter(shift => shift.personId === person.id);
        const totalShifts = personShifts.length;
        const totalSalary = totalShifts * SALARY_CONFIG.SHIFT_RATE;
        const totalMealAllowance = personShifts.length * SALARY_CONFIG.MEAL_ALLOWANCE;
        
        personCard.innerHTML = `
            <div class="person-card-header">
                <div class="person-avatar" style="background-color: ${person.color}">
                    ${person.name.charAt(0).toUpperCase()}
                </div>
                <h4 class="person-name">${person.name}</h4>
            </div>
            <div class="person-stats">
                <div class="person-stat">
                    <div class="person-stat-value">${totalShifts}</div>
                    <div class="person-stat-label">Ca làm</div>
                </div>
                <div class="person-stat">
                    <div class="person-stat-value">${formatCurrency(totalSalary)}</div>
                    <div class="person-stat-label">Lương ca</div>
                </div>
                <div class="person-stat">
                    <div class="person-stat-value">${formatCurrency(totalMealAllowance)}</div>
                    <div class="person-stat-label">Trợ cấp ăn</div>
                </div>
                <div class="person-stat">
                    <div class="person-stat-value">${formatCurrency(totalSalary + totalMealAllowance)}</div>
                    <div class="person-stat-label">Tổng cộng</div>
                </div>
            </div>
        `;
        
        peopleGrid.appendChild(personCard);
    });
}

function formatCurrency(amount) {
    return new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND'
    }).format(amount);
}

// ===== EDIT SHIFT FUNCTIONS =====
let currentEditingShift = null;

function openEditShiftModal(shiftId) {
    const shift = scheduleData.shifts.find(s => s.id === shiftId);
    if (!shift) return;
    
    currentEditingShift = shift;
    const modal = document.getElementById('editShiftModal');
    if (!modal) return;
    
    // Fill form with shift data
    document.getElementById('editShiftPerson').value = shift.personId;
    document.getElementById('editShiftDay').value = shift.day;
    document.getElementById('editShiftType').value = shift.shiftType;
    document.getElementById('editShiftNote').value = shift.note || '';
    
    // Set meal allowance
    const mealAllowance = shift.mealAllowance || 'company';
    document.querySelector(`input[name="editMealAllowance"][value="${mealAllowance}"]`).checked = true;
    
    modal.classList.add('show');
}
window.openEditShiftModal = openEditShiftModal;

function closeEditShiftModal() {
    const modal = document.getElementById('editShiftModal');
    if (modal) modal.classList.remove('show');
    currentEditingShift = null;
}
window.closeEditShiftModal = closeEditShiftModal;

function saveShift() {
    if (!currentEditingShift) return;
    
    const personId = document.getElementById('editShiftPerson')?.value;
    const day = document.getElementById('editShiftDay')?.value;
    const shiftType = document.getElementById('editShiftType')?.value;
    const note = document.getElementById('editShiftNote')?.value;
    const mealAllowance = document.querySelector('input[name="editMealAllowance"]:checked')?.value;
    
    if (!personId || !day || !shiftType) {
        showNotification('Vui lòng điền đầy đủ thông tin!', 'error');
        return;
    }
    
    // Check for conflicts (excluding current shift)
    const conflicts = checkShiftConflictsForEdit(personId, day, shiftType, currentEditingShift.id);
    if (conflicts.length > 0) {
        const personName = getPersonName(personId);
        const dayName = dayNames[days.indexOf(day)];
        showNotification(`${personName} đã có ca ${conflicts.join(', ')} vào ${dayName}. Một người không thể làm 2 ca trùng giờ!`, 'error');
        return;
    }
    
    // Update shift
    currentEditingShift.personId = personId;
    currentEditingShift.day = day;
    currentEditingShift.shiftType = shiftType;
    currentEditingShift.note = note.trim() || null;
    currentEditingShift.mealAllowance = mealAllowance || 'company';
    
    saveScheduleData();
    
    // Refresh all views
    renderTeamSchedule();
    renderPersonalSchedule();
    renderTeamMonthlySchedule();
    renderPersonalMonthlySchedule();
    renderPeopleSummary();
    updateScheduleStats();
    
    closeEditShiftModal();
    showNotification('Đã cập nhật ca làm việc!');
}
window.saveShift = saveShift;

function deleteShift() {
    if (!currentEditingShift) return;
    
    if (confirm('Bạn có chắc chắn muốn xóa ca làm việc này?')) {
        const index = scheduleData.shifts.findIndex(s => s.id === currentEditingShift.id);
        if (index > -1) {
            scheduleData.shifts.splice(index, 1);
            saveScheduleData();
            
    // Refresh all views
    renderTeamSchedule();
    renderPersonalSchedule();
    renderTeamMonthlySchedule();
    renderPersonalMonthlySchedule();
    renderPeopleSummary();
    updateScheduleStats();
    
    closeEditShiftModal();
    showNotification('Đã xóa ca làm việc!');
        }
    }
}
window.deleteShift = deleteShift;

function updateEditShiftTimes() {
    const shiftType = document.getElementById('editShiftType')?.value;
    if (!shiftType) return;
    
    const shiftConfig = shiftConfigs[shiftType];
    if (!shiftConfig) return;
    
    // Update the select options to show the correct times
    const select = document.getElementById('editShiftType');
    const options = select.querySelectorAll('option');
    
    options.forEach(option => {
        if (option.value === shiftType) {
            option.textContent = `${shiftConfig.name} (${shiftConfig.start}${shiftConfig.end ? '-' + shiftConfig.end : ''})`;
        }
    });
}
window.updateEditShiftTimes = updateEditShiftTimes;

// ===== CONFLICT DETECTION =====
// Only show error messages, no visual highlighting

function updateScheduleTab() {
    // This function is called when switching to schedule tab
    renderTeamSchedule();
    renderPersonalSchedule();
    renderTeamMonthlySchedule();
    renderPersonalMonthlySchedule();
    renderPeopleSummary();
    updateScheduleStats();
}
window.updateScheduleTab = updateScheduleTab;

// ===== PASTE SCHEDULE (from Excel) =====
function openPasteScheduleModal() {
    const modal = document.getElementById('pasteScheduleModal');
    if (modal) modal.classList.add('show');
}
window.openPasteScheduleModal = openPasteScheduleModal;

function closePasteScheduleModal() {
    const modal = document.getElementById('pasteScheduleModal');
    if (modal) modal.classList.remove('show');
}
window.closePasteScheduleModal = closePasteScheduleModal;

function ingestPastedSchedule() {
    const ta = document.getElementById('pasteScheduleTextarea');
    if (!ta) return;
    const raw = ta.value || '';
    try {
        const grid = parsePastedTable(raw);
        const result = importGridMatrix(grid);
        saveScheduleData();
        renderTeamSchedule();
        renderPersonalSchedule();
        renderTeamMonthlySchedule();
        renderPersonalMonthlySchedule();
        renderPeopleSummary();
        updateScheduleStats();
        closePasteScheduleModal();
        showNotification(`Đã nhập ${result.shiftsAdded} ca, ${result.peopleAdded} người từ bảng dán!`, 'success');
    } catch (e) {
        // Handle error silently
        showNotification('Không thể đọc bảng dán. Vui lòng kiểm tra định dạng.', 'error');
    }
}
window.ingestPastedSchedule = ingestPastedSchedule;

function parsePastedTable(text) {
    // Normalize NBSP and unicode
    text = String(text).replace(/\u00A0/g, ' ');
    if (text.includes('<table')) {
        const tmp = document.createElement('div');
        tmp.innerHTML = text;
        const rows = Array.from(tmp.querySelectorAll('tr'));
        return rows.map(tr => Array.from(tr.children).map(td => td.textContent.trim()));
    }
    return text.replace(/\r\n/g, '\n').replace(/\r/g, '\n')
        .split('\n')
        .map(line => line.split('\t').map(c => c.trim()))
        .filter(r => r.some(c => c.length > 0));
}

function importGridMatrix(rows) {
    let headerRowIndex = -1;
    for (let i = 0; i < Math.min(rows.length, 10); i++) {
        const nums = rows[i].filter(c => /^\d{1,2}$/.test(c)).length;
        if (nums >= 7) { headerRowIndex = i; break; }
    }
    if (headerRowIndex === -1) throw new Error('Không tìm thấy hàng ngày 1..31');
    const header = rows[headerRowIndex];
    const dayCols = [];
    for (let c = 0; c < header.length; c++) {
        const cell = header[c].trim();
        if (/^\d{1,2}$/.test(cell)) dayCols.push({ col: c, day: parseInt(cell, 10) });
    }
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth() + 1;
    let peopleAdded = 0, shiftsAdded = 0;
    const ensurePerson = (name) => {
        let p = scheduleData.people.find(x => x.name.toLowerCase() === name.toLowerCase());
        if (!p) { p = { id: 'person_' + Math.random().toString(36).slice(2,8), name, color: randomColor() }; scheduleData.people.push(p); peopleAdded++; }
        return p;
    };
    for (let r = headerRowIndex + 1; r < rows.length; r++) {
        const row = rows[r];
        if (!row || row.length === 0) continue;
        const name = (row[0] || '').trim();
        if (!name || name.toLowerCase().includes('tổng')) continue;
        const person = ensurePerson(name);
        for (const { col, day } of dayCols) {
            const token = (row[col] || '').trim();
            if (!token) continue;
            const shiftType = normalizeShift(token);
            if (!shiftType) continue;
            const dateObj = new Date(year, month - 1, day);
            const weekdayIndex = dateObj.getDay();
            const dayKey = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday'][weekdayIndex];
            // During import, allow overwrite: if a shift for same person/day already exists, replace it
            const dupIndex = scheduleData.shifts.findIndex(s => s.personId === person.id && s.day === dayKey);
            if (dupIndex >= 0) {
                scheduleData.shifts[dupIndex].shiftType = shiftType;
                scheduleData.shifts[dupIndex].createdAt = dateObj.toISOString();
            } else {
                scheduleData.shifts.push({ id: generateShiftId(), personId: person.id, day: dayKey, shiftType, note: null, mealAllowance: 'company', createdAt: dateObj.toISOString() });
            }
            shiftsAdded++;
        }
    }
    updatePeopleSelects();
    return { peopleAdded, shiftsAdded };
}