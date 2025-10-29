// 메인 JavaScript 파일

// 페이지 로드 시 초기화
document.addEventListener('DOMContentLoaded', function() {
    // 자동 새로고침 표시
    showAutoRefreshIndicator();
    
    // 테이블 정렬 기능
    initTableSorting();
    
    // 폼 유효성 검사
    initFormValidation();
});

// 자동 새로고침 표시기
function showAutoRefreshIndicator() {
    const indicator = document.createElement('div');
    indicator.className = 'auto-refresh';
    indicator.innerHTML = '<i class="fas fa-sync-alt fa-spin"></i> 30초마다 자동 새로고침';
    document.body.appendChild(indicator);
    
    // 3초 후 숨기기
    setTimeout(() => {
        indicator.style.opacity = '0';
        setTimeout(() => {
            indicator.remove();
        }, 500);
    }, 3000);
}

// 테이블 정렬 기능
function initTableSorting() {
    const tables = document.querySelectorAll('table');
    tables.forEach(table => {
        const headers = table.querySelectorAll('th');
        headers.forEach((header, index) => {
            header.style.cursor = 'pointer';
            header.addEventListener('click', () => {
                sortTable(table, index);
            });
        });
    });
}

function sortTable(table, columnIndex) {
    const tbody = table.querySelector('tbody');
    const rows = Array.from(tbody.querySelectorAll('tr'));
    
    const isAscending = table.getAttribute('data-sort-direction') !== 'asc';
    
    rows.sort((a, b) => {
        const aText = a.cells[columnIndex].textContent.trim();
        const bText = b.cells[columnIndex].textContent.trim();
        
        // 숫자 비교
        if (!isNaN(aText) && !isNaN(bText)) {
            return isAscending ? aText - bText : bText - aText;
        }
        
        // 문자열 비교
        return isAscending ? 
            aText.localeCompare(bText) : 
            bText.localeCompare(aText);
    });
    
    // 정렬된 행들을 다시 추가
    rows.forEach(row => tbody.appendChild(row));
    
    // 정렬 방향 저장
    table.setAttribute('data-sort-direction', isAscending ? 'asc' : 'desc');
}

// 폼 유효성 검사
function initFormValidation() {
    const forms = document.querySelectorAll('form');
    forms.forEach(form => {
        form.addEventListener('submit', function(e) {
            if (!form.checkValidity()) {
                e.preventDefault();
                e.stopPropagation();
            }
            form.classList.add('was-validated');
        });
    });
}

// IP 주소 유효성 검사
function validateIPAddress(ip) {
    const ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
    const ipv6Regex = /^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$|^::1$|^::$/;
    
    return ipv4Regex.test(ip) || ipv6Regex.test(ip);
}

// 실시간 상태 업데이트
function updateDeviceStatus(deviceId) {
    fetch(`/api/device_status/${deviceId}`)
        .then(response => response.json())
        .then(data => {
            // 상태 업데이트 로직
            console.log('Device status updated:', data);
        })
        .catch(error => {
            console.error('Failed to update device status:', error);
        });
}

// 알림 표시
function showNotification(message, type = 'info') {
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type} alert-dismissible fade show`;
    alertDiv.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    
    const container = document.querySelector('.container');
    container.insertBefore(alertDiv, container.firstChild);
    
    // 5초 후 자동 제거
    setTimeout(() => {
        if (alertDiv.parentNode) {
            alertDiv.remove();
        }
    }, 5000);
}

// 로딩 상태 표시
function showLoading(element) {
    element.innerHTML = `
        <div class="text-center">
            <div class="spinner-border text-primary" role="status">
                <span class="visually-hidden">로딩중...</span>
            </div>
            <p class="mt-2">로딩중...</p>
        </div>
    `;
}

// 에러 상태 표시
function showError(element, message) {
    element.innerHTML = `
        <div class="alert alert-danger">
            <i class="fas fa-exclamation-triangle"></i>
            ${message}
        </div>
    `;
}

// 성공 상태 표시
function showSuccess(element, message) {
    element.innerHTML = `
        <div class="alert alert-success">
            <i class="fas fa-check-circle"></i>
            ${message}
        </div>
    `;
}

// 날짜 포맷팅
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleString('ko-KR', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });
}

// 시간 포맷팅
function formatTime(dateString) {
    const date = new Date(dateString);
    return date.toLocaleTimeString('ko-KR', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });
}

// 상대 시간 표시
function formatRelativeTime(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now - date;
    
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (days > 0) {
        return `${days}일 전`;
    } else if (hours > 0) {
        return `${hours}시간 전`;
    } else if (minutes > 0) {
        return `${minutes}분 전`;
    } else {
        return `${seconds}초 전`;
    }
}

// 페이지 새로고침 방지 (폼 제출 시)
function preventFormResubmission() {
    const forms = document.querySelectorAll('form');
    forms.forEach(form => {
        form.addEventListener('submit', function() {
            const submitBtn = form.querySelector('button[type="submit"]');
            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 처리중...';
            }
        });
    });
}

// 초기화
document.addEventListener('DOMContentLoaded', function() {
    preventFormResubmission();
});