document.addEventListener('DOMContentLoaded', () => {
    fetch('data/schools.json')
        .then(response => response.json())
        .then(data => {
            renderSchools('jung-gu', data['jung-gu']);
            renderSchools('nam-gu', data['nam-gu']);
            renderSchools('dong-gu', data['dong-gu']);
            renderSchools('buk-gu', data['buk-gu']);
            renderSchools('ulju-gun', data['ulju-gun']);
            renderSchools('support', data['support']);

            // Compile all schools for caution notes
            const allSchools = [
                ...data['jung-gu'],
                ...data['nam-gu'],
                ...data['dong-gu'],
                ...data['buk-gu'],
                ...data['ulju-gun'],
                ...data['support']
            ];
            renderCautionNotes(allSchools);
        })
        .catch(error => {
            console.error('Error loading school data:', error);
        });
});

const sanitizeId = (name) => 'school-' + name.replace(/[^a-zA-Z0-9가-힣]/g, '-');

function scrollToId(id) {
    const element = document.getElementById(id);
    if (!element) return;
    
    element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    
    // Add temporary highlight effect
    element.classList.add('highlight-pulse');
    setTimeout(() => {
        element.classList.remove('highlight-pulse');
    }, 2000);
}

function renderCautionNotes(schools) {
    const container = document.getElementById('region-caution');
    if (!container) return;

    const cautionSchools = schools.filter(s => s.note);

    if (cautionSchools.length === 0) {
        container.innerHTML = '<p class="placeholder-text">별도 참고사항이 없습니다.</p>';
        return;
    }

    const ul = document.createElement('ul');
    ul.className = 'caution-list';

    cautionSchools.forEach(school => {
        const li = document.createElement('li');
        const schoolId = sanitizeId(school.name);
        li.id = `note-${schoolId}`;
        
        // Make the school name clickable to scroll back to table row
        li.innerHTML = `<strong class="text-highlight clickable" onclick="scrollToId('row-${schoolId}')">${school.name}</strong> : ${school.note}`;
        ul.appendChild(li);
    });

    container.innerHTML = '';
    container.appendChild(ul);
}

function renderSchools(regionId, schools) {
    const container = document.getElementById(`region-${regionId}`);
    if (!container) return;

    // Clear loading/placeholder text
    container.innerHTML = '';

    if (!schools || schools.length === 0) {
        container.innerHTML = '<p class="placeholder-text">학교 목록이 곧 업데이트 될 예정입니다.</p>';
        return;
    }

    const tableContainer = document.createElement('div');
    tableContainer.className = 'school-table-container';

    const table = document.createElement('table');
    table.className = 'school-table';

    // Create Header
    const thead = document.createElement('thead');
    thead.innerHTML = `
        <tr>
            <th rowspan="2">학교명</th>
            <th rowspan="2">학년</th>
            <th rowspan="2">학급수</th>
            <th rowspan="2">학급별<br>학생수</th>
            <th rowspan="2">학급별<br>차시</th>
            <th rowspan="2">총차시</th>
            <th rowspan="2">수업기간</th>
            <th colspan="5" class="group-header">요일별 교시</th>
            <th rowspan="2">보조<br>대상</th>
        </tr>
        <tr>
            <th>월</th>
            <th>화</th>
            <th>수</th>
            <th>목</th>
            <th>금</th>
        </tr>
    `;
    table.appendChild(thead);

    // Create Body
    const tbody = document.createElement('tbody');
    schools.forEach(school => {
        const tr = document.createElement('tr');
        const schoolId = sanitizeId(school.name);
        tr.id = `row-${schoolId}`;
        
        // Helper to check for active class
        const getCellClass = (val) => (val && val !== '-') ? 'col-period active' : 'col-period';
        const nameClass = school.caution ? 'school-caution clickable' : '';
        const nameClick = school.caution ? `onclick="scrollToId('note-${schoolId}')"` : '';

        // Handle dateRange (string or array)
        const dateDisplay = Array.isArray(school.dateRange) 
            ? school.dateRange.join('<br>') 
            : school.dateRange;

        tr.innerHTML = `
            <td class="${nameClass}" ${nameClick}>${school.name}</td>
            <td>${school.grade}</td>
            <td>${school.classes}</td>
            <td>${school.students}</td>
            <td>${school.classSessions}</td>
            <td>${school.totalSessions}</td>
            <td>${dateDisplay}</td>
            <td class="${getCellClass(school.schedule.mon)}">${school.schedule.mon}</td>
            <td class="${getCellClass(school.schedule.tue)}">${school.schedule.tue}</td>
            <td class="${getCellClass(school.schedule.wed)}">${school.schedule.wed}</td>
            <td class="${getCellClass(school.schedule.thu)}">${school.schedule.thu}</td>
            <td class="${getCellClass(school.schedule.fri)}">${school.schedule.fri}</td>
            <td style="color: var(--color-primary); font-weight: bold;">${school.support ? 'O' : ''}</td>
        `;
        tbody.appendChild(tr);
    });
    table.appendChild(tbody);

    tableContainer.appendChild(table);
    container.appendChild(tableContainer);
}
