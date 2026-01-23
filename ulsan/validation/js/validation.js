
// State
let schoolsData = {};
let teachers = []; // { id: number, name: string, schools: [] }
let assignedSchools = new Set(); // Set of school names

// DOM Elements
const schoolListContainer = document.getElementById('school-list-container');
const teacherListContainer = document.getElementById('teacher-list');
const addTeacherBtn = document.getElementById('add-teacher-btn');
const unassignedCountFn = document.getElementById('unassigned-count');

// Initialization
async function init() {
    try {
        const response = await fetch('../2026/data/schools.json');
        schoolsData = await response.json();
        
        renderSchoolSidebar();
        addTeacher(); // Start with one teacher
        
        // Add Event Listeners
        addTeacherBtn.addEventListener('click', () => addTeacher());
        
    } catch (error) {
        console.error('Failed to load schools data:', error);
        alert('데이터를 불러오는데 실패했습니다.');
    }
}

// Data Parsing Helpers
function parseDate(mmdd) {
    const [month, day] = mmdd.split('.').map(Number);
    return new Date(2026, month - 1, day);
}

function checkDateOverlap(ranges1, ranges2) {
    // ranges are array of strings like "05.14~07.02"
    for (const r1 of ranges1) {
        const [start1Str, end1Str] = r1.split('~');
        const start1 = parseDate(start1Str);
        const end1 = parseDate(end1Str);

        for (const r2 of ranges2) {
            const [start2Str, end2Str] = r2.split('~');
            const start2 = parseDate(start2Str);
            const end2 = parseDate(end2Str);

            // Check overlap: StartA <= EndB && StartB <= EndA
            if (start1 <= end2 && start2 <= end1) {
                return true;
            }
        }
    }
    return false;
}

function checkDayOverlap(schedule1, schedule2) {
    const days = ['mon', 'tue', 'wed', 'thu', 'fri'];
    for (const day of days) {
        if (schedule1[day] !== '-' && schedule2[day] !== '-') {
            return day; // Returns the overlapping day
        }
    }
    return null;
}

const dayMap = {
    'mon': '월', 'tue': '화', 'wed': '수', 'thu': '목', 'fri': '금'
};

// --- Rendering ---

function renderSchoolSidebar() {
    schoolListContainer.innerHTML = '';
    let totalUnassigned = 0;

    const regions = { 
        'jung-gu': '중구', 'nam-gu': '남구', 'dong-gu': '동구', 
        'buk-gu': '북구', 'ulju-gun': '울주군', 'support': '보조강사 전용'
    };

    for (const [key, label] of Object.entries(regions)) {
        if (!schoolsData[key]) continue;

        const groupDiv = document.createElement('div');
        groupDiv.className = 'school-group';
        
        const title = document.createElement('div');
        title.className = 'school-group-title';
        title.textContent = label;
        groupDiv.appendChild(title);

        schoolsData[key].forEach(school => {
            // Uniquely identify school by name (assuming names are unique across file, or combine with region)
            // Based on JSON, names seem unique enough for this scope, or we use composite ID.
            // Using name as ID for simplicity as per requirement "assign school by name"
            const uniqueId = `${key}-${school.name}`;
            
            // If assigned, don't show or grey out? 
            // Requirement: "All schools ... should be available". 
            // Better to show them but visually disable if assigned.
            const isAssigned = assignedSchools.has(school.name);

            if (!isAssigned) totalUnassigned++;

            const item = document.createElement('div');
            item.className = 'school-item';
            if (isAssigned) {
                item.style.opacity = '0.4';
                item.style.pointerEvents = 'none';
                item.style.background = '#eee';
            } else {
                item.draggable = true;
                item.addEventListener('dragstart', (e) => {
                    e.dataTransfer.setData('text/plain', JSON.stringify({
                        region: key,
                        school: school
                    }));
                    item.classList.add('is-dragging');
                });
                item.addEventListener('dragend', () => {
                    item.classList.remove('is-dragging');
                });
            }

            item.innerHTML = `
                <div class="school-name">${school.name}</div>
                <div class="school-info">${school.totalSessions}차시</div>
            `;
            
            groupDiv.appendChild(item);
        });

        schoolListContainer.appendChild(groupDiv);
    }
    
    unassignedCountFn.textContent = totalUnassigned;
}

function renderTeachers() {
    teacherListContainer.innerHTML = '';
    teachers.forEach(teacher => {
        const card = document.createElement('div');
        card.className = 'teacher-card';
        card.dataset.id = teacher.id;

        // Validation
        const conflicts = validateTeacher(teacher);
        const stats = calculateStats(teacher);

        // HTML
        card.innerHTML = `
            <div class="teacher-header">
                <input type="text" class="teacher-name-input" value="${teacher.name}" onchange="updateTeacherName(${teacher.id}, this.value)">
                <button class="btn btn-outline" style="padding: 0.3rem 0.8rem; font-size: 0.8rem;" onclick="removeTeacher(${teacher.id})">삭제</button>
            </div>
            
            <div class="teacher-stats">
                <div class="stat-item">
                    <span class="stat-label">총 차시</span>
                    <span class="stat-value">${stats.totalSessions}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">출강 요일</span>
                    <span class="stat-value">${stats.busyDays.join(', ') || '-'}</span>
                </div>
            </div>

            ${conflicts.length > 0 ? `
                <div class="validation-result error">
                    <ul class="caution-list" style="margin:0;">
                        ${conflicts.map(c => `<li>${c}</li>`).join('')}
                    </ul>
                </div>
            ` : ''}

            <div class="assigned-schools-list" id="drop-zone-${teacher.id}">
                ${teacher.schools.map(s => `
                    <div class="school-tag">
                        <span class="tag-name">${s.name}</span>
                        <span class="tag-info">${s.totalSessions}차시</span>
                        <button class="remove-school-btn" onclick="removeSchoolFromTeacher(${teacher.id}, '${s.name}')">&times;</button>
                    </div>
                `).join('')}
            </div>
        `;

        // DnD Events for Drop Zone
        const dropZone = card.querySelector(`#drop-zone-${teacher.id}`);
        
        dropZone.addEventListener('dragover', (e) => {
            e.preventDefault(); // allow drop
            card.classList.add('drag-over');
        });

        dropZone.addEventListener('dragleave', () => {
            card.classList.remove('drag-over');
        });

        dropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            card.classList.remove('drag-over');
            const data = e.dataTransfer.getData('text/plain');
            if (data) {
                const { region, school } = JSON.parse(data);
                addSchoolToTeacher(teacher.id, school);
            }
        });

        teacherListContainer.appendChild(card);
    });
}

// --- Logic Actions ---

function addTeacher() {
    const id = Date.now();
    teachers.push({
        id: id,
        name: `강사 ${teachers.length + 1}`,
        schools: []
    });
    renderTeachers();
}

function removeTeacher(id) {
    if (!confirm('정말 삭제하시겠습니까?')) return;
    const teacher = teachers.find(t => t.id === id);
    if (teacher) {
        teacher.schools.forEach(s => assignedSchools.delete(s.name));
        teachers = teachers.filter(t => t.id !== id);
        renderTeachers();
        renderSchoolSidebar();
    }
}

function updateTeacherName(id, newName) {
    const t = teachers.find(t => t.id === id);
    if(t) t.name = newName;
}

function addSchoolToTeacher(teacherId, school) {
    // Global Validations (Rule 3)
    if (assignedSchools.has(school.name)) {
        alert('이미 다른 강사에게 배정된 학교입니다.');
        return;
    }

    const teacher = teachers.find(t => t.id === teacherId);
    if (!teacher) return;

    // Check if school already added to this teacher (redundant if Rule 3 holds, but safe)
    if (teacher.schools.find(s => s.name === school.name)) return;

    teacher.schools.push(school);
    assignedSchools.add(school.name);
    
    renderTeachers();
    renderSchoolSidebar();
}

function removeSchoolFromTeacher(teacherId, schoolName) {
    const teacher = teachers.find(t => t.id === teacherId);
    if (!teacher) return;

    teacher.schools = teacher.schools.filter(s => s.name !== schoolName);
    assignedSchools.delete(schoolName);
    
    renderTeachers();
    renderSchoolSidebar();
}

// --- Validation & Stats ---

function validateTeacher(teacher) {
    const conflicts = [];
    const schools = teacher.schools;

    // Check every pair
    for (let i = 0; i < schools.length; i++) {
        for (let j = i + 1; j < schools.length; j++) {
            const s1 = schools[i];
            const s2 = schools[j];

            // 1. Check Date Range Overlap
            const isDateOverlap = checkDateOverlap(s1.dateRange, s2.dateRange);

            if (isDateOverlap) {
                // 2. If Date Overlap, Check Day Overlap
                const overlapDay = checkDayOverlap(s1.schedule, s2.schedule);
                
                if (overlapDay) {
                    conflicts.push(`[중복] ${s1.name}초 & ${s2.name}초 : ${dayMap[overlapDay]}요일에 수업이 겹칩니다.`);
                }
            }
        }
    }

    return conflicts;
}

function calculateStats(teacher) {
    let totalSessions = 0;
    const dayCounts = { 'mon': 0, 'tue': 0, 'wed': 0, 'thu': 0, 'fri': 0 };
    
    // Logic for "fully booked days"
    // Interpretation: "Which days are they going to classes?"
    // If a teacher has ANY class on Mon, Mon is a working day.
    // Or does "전부 출강" mean every single assigned school has a class on that day?
    // User said: "한 강사에 추가된 학교를 기준으로, 어떤 요일을 전부 출강하게 되는지"
    // "전부 출강" usually means "Is fully booked" or "Goes to every school"?
    // Or "Which days have classes assigned?"
    // Looking at the phrase: "어떤 요일을 전부 출강하게 되는지"
    // If I have School A (Mon, Tue) and School B (Wed), my working days are Mon, Tue, Wed.
    // That seems most useful.
    
    teacher.schools.forEach(s => {
        if (typeof s.totalSessions === 'number') {
            totalSessions += s.totalSessions;
        } else {
             // Handle "12(1,5학년)<br>24(3학년)" case? 
             // The JSON has implicit totalSessions field which is a number in most cases, but string in some?
             // Checking JSON...
             // JSON: "totalSessions": 108 (number), but "classSessions" can be string.
             // "totalSessions" seems to be consistently a number in the JSON view I saw earlier.
             // Wait, let's check line 189 in JSON view: "totalSessions": 108.
             // Okay, totalSessions is number.
             totalSessions += parseInt(s.totalSessions);
        }

        ['mon', 'tue', 'wed', 'thu', 'fri'].forEach(day => {
            if (s.schedule[day] !== '-') {
                dayCounts[day]++;
            }
        });
    });

    // Busy days: any day with count > 0
    const busyDays = Object.keys(dayCounts)
        .filter(d => dayCounts[d] > 0)
        .map(d => dayMap[d]);

    return { totalSessions, busyDays };
}

// Start
init();
