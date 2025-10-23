// Network Monitoring System - Simplified Main JavaScript
// Focus on core functionality that was working before

class NetworkMonitor {
    constructor() {
        this.hosts = [];
        this.monitoringIntervals = new Map();
        this.emailSettings = null;
        this.isMonitoring = false;
        this.lastAlertTimes = new Map();
        this.logs = [];
        this.maxLogs = 1000;
        this.currentLogFilter = 'all';
        
        this.init();
    }
    
    async init() {
        try {
            this.addLog('info', '네트워크 모니터 초기화 시작');
            
            // Setup event listeners first
            this.setupEventListeners();
            this.addLog('debug', '이벤트 리스너 설정 완료');
            
            // Load data
            await this.loadHosts();
            this.addLog('debug', `호스트 ${this.hosts.length}개 로드 완료`);
            
            await this.loadEmailSettings();
            this.addLog('debug', '이메일 설정 로드 완료');
            
            // Start monitoring and update dashboard
            this.startMonitoring();
            this.addLog('info', '모니터링 시작됨');
            
            this.updateDashboard();
            this.addLog('debug', '대시보드 업데이트 완료');
            
            this.addLog('info', '네트워크 모니터 초기화 성공');
            
        } catch (error) {
            this.addLog('error', '시스템 초기화 실패', error.message);
            this.showNotification('시스템 초기화 중 오류가 발생했습니다. 페이지를 새로고침해 주세요.', 'error');
        }
    }
    
    setupEventListeners() {
        // Add Host Modal
        document.getElementById('addHostBtn').addEventListener('click', () => {
            this.showAddHostModal();
        });
        
        document.querySelectorAll('.add-host-trigger').forEach(btn => {
            btn.addEventListener('click', () => {
                this.showAddHostModal();
            });
        });
        
        document.getElementById('cancelAddHost').addEventListener('click', () => {
            this.hideAddHostModal();
        });
        
        document.getElementById('addHostForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.addHost();
        });
        
        // Settings Modal
        document.getElementById('settingsBtn').addEventListener('click', () => {
            this.showSettingsModal();
        });
        
        document.getElementById('cancelSettings').addEventListener('click', () => {
            this.hideSettingsModal();
        });
        
        document.getElementById('settingsForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveEmailSettings();
        });
        
        // Test email settings button
        document.getElementById('testEmailSettings').addEventListener('click', () => {
            this.testEmailSettings();
        });
        
        // Browser notification permission button
        if (document.getElementById('requestNotificationPermission')) {
            document.getElementById('requestNotificationPermission').addEventListener('click', () => {
                this.requestNotificationPermission();
            });
        }
        
        // Reset data button
        if (document.getElementById('resetDataBtn')) {
            document.getElementById('resetDataBtn').addEventListener('click', () => {
                this.resetAllData();
            });
        }
        
        // Logs Modal
        document.getElementById('logsBtn').addEventListener('click', () => {
            this.showLogsModal();
        });
        
        document.getElementById('closeLogsBtn').addEventListener('click', () => {
            this.hideLogsModal();
        });
        
        document.getElementById('clearLogsBtn').addEventListener('click', () => {
            this.clearLogs();
        });
        
        document.getElementById('exportLogsBtn').addEventListener('click', () => {
            this.exportLogs();
        });
        
        // Log filter buttons
        document.querySelectorAll('.log-filter').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const level = e.target.getAttribute('data-level');
                this.setLogFilter(level);
            });
        });
        
        // Refresh button
        document.getElementById('refreshBtn').addEventListener('click', () => {
            this.refreshAllHosts();
        });
        
        // Search functionality
        document.getElementById('searchInput').addEventListener('input', (e) => {
            this.filterHosts(e.target.value);
        });
        
        // Modal backdrop clicks
        document.getElementById('addHostModal').addEventListener('click', (e) => {
            if (e.target === e.currentTarget) {
                this.hideAddHostModal();
            }
        });
        
        document.getElementById('settingsModal').addEventListener('click', (e) => {
            if (e.target === e.currentTarget) {
                this.hideSettingsModal();
            }
        });
        
        document.getElementById('logsModal').addEventListener('click', (e) => {
            if (e.target === e.currentTarget) {
                this.hideLogsModal();
            }
        });
    }
    
    async loadHosts() {
        try {
            this.addLog('debug', '호스트 데이터 로딩 시작');
            if (window.storageService) {
                this.hosts = window.storageService.getHosts();
                this.addLog('info', `호스트 ${this.hosts.length}개 로드됨`);
            } else {
                this.addLog('warning', 'Storage Service가 초기화되지 않음');
                this.hosts = [];
            }
            this.renderHostsTable();
        } catch (error) {
            this.addLog('error', '호스트 로딩 실패', error.message);
            console.error('Error loading hosts:', error);
            this.hosts = [];
        }
    }
    
    async loadEmailSettings() {
        try {
            this.addLog('debug', '이메일 설정 로딩 시작');
            if (window.storageService) {
                this.emailSettings = window.storageService.getEmailSettings();
                if (this.emailSettings) {
                    this.addLog('info', '이메일 설정 로드됨');
                } else {
                    this.addLog('info', '저장된 이메일 설정 없음');
                }
            } else {
                this.addLog('warning', 'Storage Service가 초기화되지 않음');
                this.emailSettings = null;
            }
        } catch (error) {
            this.addLog('error', '이메일 설정 로딩 실패', error.message);
            console.error('Error loading email settings:', error);
            this.emailSettings = null;
        }
    }
    
    showAddHostModal() {
        document.getElementById('addHostModal').classList.remove('hidden');
        document.getElementById('hostName').focus();
        this.addLog('debug', '호스트 추가 모달 열림');
    }
    
    hideAddHostModal() {
        document.getElementById('addHostModal').classList.add('hidden');
        document.getElementById('addHostForm').reset();
        this.addLog('debug', '호스트 추가 모달 닫힘');
    }
    
    showSettingsModal() {
        document.getElementById('settingsModal').classList.remove('hidden');
        this.populateSettingsForm();
    }
    
    hideSettingsModal() {
        document.getElementById('settingsModal').classList.add('hidden');
    }
    
    populateSettingsForm() {
        // Reset form
        document.getElementById('smtpServer').value = '';
        document.getElementById('smtpPort').value = '587';
        document.getElementById('emailUsername').value = '';
        document.getElementById('emailPassword').value = '';
        document.getElementById('fromEmail').value = '';
        document.getElementById('toEmails').value = '';
        document.getElementById('enableEmailAlerts').checked = true;
        
        // Populate with existing settings
        if (this.emailSettings) {
            try {
                if (this.emailSettings.smtp_server) {
                    document.getElementById('smtpServer').value = this.emailSettings.smtp_server;
                }
                if (this.emailSettings.smtp_port) {
                    document.getElementById('smtpPort').value = this.emailSettings.smtp_port;
                }
                if (this.emailSettings.username) {
                    document.getElementById('emailUsername').value = this.emailSettings.username;
                }
                if (this.emailSettings.password) {
                    document.getElementById('emailPassword').value = this.emailSettings.password;
                }
                if (this.emailSettings.from_email) {
                    document.getElementById('fromEmail').value = this.emailSettings.from_email;
                }
                if (this.emailSettings.to_emails && Array.isArray(this.emailSettings.to_emails)) {
                    document.getElementById('toEmails').value = this.emailSettings.to_emails.join(', ');
                }
                if (typeof this.emailSettings.is_enabled === 'boolean') {
                    document.getElementById('enableEmailAlerts').checked = this.emailSettings.is_enabled;
                }
            } catch (error) {
                console.error('Error populating form:', error);
            }
        }
    }
    
    async addHost() {
        try {
            this.addLog('info', '호스트 추가 시작');
            this.showLoading();
            
            const hostData = {
                name: document.getElementById('hostName').value.trim(),
                ip_address: document.getElementById('hostIP').value.trim(),
                description: document.getElementById('hostDescription').value.trim(),
                monitor_interval: parseInt(document.getElementById('monitorInterval').value),
                is_active: true,
                last_status: 'unknown',
                last_check: null,
                email_alerts: document.getElementById('emailAlerts').checked
            };
            
            // Validate required fields
            if (!hostData.name) {
                throw new Error('호스트명을 입력해주세요.');
            }
            
            if (!hostData.ip_address) {
                throw new Error('IP 주소를 입력해주세요.');
            }
            
            if (!this.isValidIP(hostData.ip_address)) {
                throw new Error('유효하지 않은 IP 주소입니다.');
            }
            
            // Use storage service
            if (!window.storageService) {
                throw new Error('Storage Service가 초기화되지 않았습니다.');
            }
            
            const newHost = window.storageService.addHost(hostData);
            this.hosts.push(newHost);
            
            this.addLog('info', `새 호스트 추가 성공: ${newHost.name} (${newHost.ip_address})`);
            
            this.hideAddHostModal();
            this.renderHostsTable();
            this.updateDashboard();
            this.startMonitoringForHost(newHost);
            
            this.showNotification('호스트가 성공적으로 추가되었습니다.', 'success');
            
        } catch (error) {
            this.addLog('error', '호스트 추가 실패', error.message);
            this.showNotification(error.message, 'error');
        } finally {
            this.hideLoading();
        }
    }
    
    async saveEmailSettings() {
        try {
            this.addLog('info', '이메일 설정 저장 시작');
            this.showLoading();
            
            const smtpServer = document.getElementById('smtpServer').value.trim();
            const smtpPort = document.getElementById('smtpPort').value.trim();
            const emailUsername = document.getElementById('emailUsername').value.trim();
            const fromEmail = document.getElementById('fromEmail').value.trim();
            const toEmailsText = document.getElementById('toEmails').value.trim();
            
            // Basic validation
            if (!smtpServer || !smtpPort || !emailUsername || !fromEmail || !toEmailsText) {
                throw new Error('모든 필수 필드를 입력해주세요.');
            }
            
            const toEmails = toEmailsText.split(',').map(email => email.trim()).filter(email => email);
            if (toEmails.length === 0) {
                throw new Error('최소 하나의 수신자 이메일을 입력해주세요.');
            }
            
            const settingsData = {
                smtp_server: smtpServer,
                smtp_port: parseInt(smtpPort),
                username: emailUsername,
                password: document.getElementById('emailPassword').value,
                from_email: fromEmail,
                to_emails: toEmails,
                is_enabled: document.getElementById('enableEmailAlerts').checked
            };
            
            if (!window.storageService) {
                throw new Error('Storage Service가 초기화되지 않았습니다.');
            }
            
            const savedSettings = window.storageService.saveEmailSettings(settingsData);
            this.emailSettings = savedSettings;
            
            this.addLog('info', '이메일 설정 저장 성공');
            this.hideSettingsModal();
            this.showNotification('이메일 설정이 성공적으로 저장되었습니다.', 'success');
            
        } catch (error) {
            this.addLog('error', '이메일 설정 저장 실패', error.message);
            this.showNotification(error.message, 'error');
        } finally {
            this.hideLoading();
        }
    }
    
    async testEmailSettings() {
        try {
            this.addLog('info', '이메일 설정 테스트 시작');
            this.showLoading();
            
            // Simple validation test
            const smtpServer = document.getElementById('smtpServer').value.trim();
            const emailUsername = document.getElementById('emailUsername').value.trim();
            const toEmailsText = document.getElementById('toEmails').value.trim();
            
            if (!smtpServer || !emailUsername || !toEmailsText) {
                throw new Error('필수 필드를 모두 입력해주세요.');
            }
            
            // Simulate test (since we can't actually send emails from browser)
            await new Promise(resolve => setTimeout(resolve, 1500));
            
            this.addLog('info', '이메일 설정 테스트 완료 (시뮬레이션)');
            this.showNotification('이메일 설정 테스트가 완료되었습니다. (브라우저 제한으로 실제 발송은 불가)', 'success');
            
        } catch (error) {
            this.addLog('error', '이메일 설정 테스트 실패', error.message);
            this.showNotification(`테스트 실패: ${error.message}`, 'error');
        } finally {
            this.hideLoading();
        }
    }
    
    async requestNotificationPermission() {
        try {
            if (!('Notification' in window)) {
                this.showNotification('이 브라우저는 알림을 지원하지 않습니다.', 'error');
                return;
            }
            
            const permission = await Notification.requestPermission();
            
            if (permission === 'granted') {
                this.showNotification('브라우저 알림 권한이 승인되었습니다.', 'success');
                this.addLog('info', '브라우저 알림 권한 승인됨');
                
                // Show test notification
                const testNotification = new Notification('네트워크 모니터링 시스템', {
                    body: '브라우저 알림이 정상적으로 설정되었습니다.'
                });
                
                setTimeout(() => testNotification.close(), 3000);
                
            } else {
                this.showNotification('브라우저 알림 권한이 거부되었습니다.', 'warning');
                this.addLog('warning', '브라우저 알림 권한 거부됨');
            }
            
        } catch (error) {
            this.addLog('error', '브라우저 알림 권한 요청 실패', error.message);
            this.showNotification('브라우저 알림 권한 요청 중 오류가 발생했습니다.', 'error');
        }
    }
    
    async deleteHost(hostId) {
        if (!confirm('이 호스트를 삭제하시겠습니까?')) {
            return;
        }
        
        try {
            this.showLoading();
            
            if (!window.storageService) {
                throw new Error('Storage Service가 초기화되지 않았습니다.');
            }
            
            window.storageService.deleteHost(hostId);
            
            // Stop monitoring
            if (this.monitoringIntervals.has(hostId)) {
                clearInterval(this.monitoringIntervals.get(hostId));
                this.monitoringIntervals.delete(hostId);
            }
            
            // Remove from local array
            this.hosts = this.hosts.filter(host => host.id !== hostId);
            
            this.renderHostsTable();
            this.updateDashboard();
            this.showNotification('호스트가 삭제되었습니다.', 'success');
            this.addLog('info', '호스트 삭제 완료', { hostId });
            
        } catch (error) {
            console.error('Error deleting host:', error);
            this.addLog('error', '호스트 삭제 실패', error.message);
            this.showNotification(error.message, 'error');
        } finally {
            this.hideLoading();
        }
    }
    
    async toggleHostMonitoring(hostId) {
        try {
            const host = this.hosts.find(h => h.id === hostId);
            if (!host) return;
            
            const newActiveState = !host.is_active;
            
            if (!window.storageService) {
                throw new Error('Storage Service가 초기화되지 않았습니다.');
            }
            
            const updatedHost = window.storageService.updateHost(hostId, {
                is_active: newActiveState
            });
            
            const hostIndex = this.hosts.findIndex(h => h.id === hostId);
            this.hosts[hostIndex] = updatedHost;
            
            if (newActiveState) {
                this.startMonitoringForHost(updatedHost);
            } else {
                if (this.monitoringIntervals.has(hostId)) {
                    clearInterval(this.monitoringIntervals.get(hostId));
                    this.monitoringIntervals.delete(hostId);
                }
            }
            
            this.renderHostsTable();
            this.updateDashboard();
            
            const status = newActiveState ? '활성화' : '비활성화';
            this.showNotification(`${host.name} 모니터링이 ${status}되었습니다.`, 'info');
            this.addLog('info', `호스트 모니터링 ${status}`, { hostName: host.name });
            
        } catch (error) {
            console.error('Error toggling host monitoring:', error);
            this.addLog('error', '호스트 모니터링 상태 변경 실패', error.message);
            this.showNotification(error.message, 'error');
        }
    }
    
    renderHostsTable() {
        const tbody = document.getElementById('hostsTableBody');
        const emptyState = document.getElementById('emptyState');
        
        if (this.hosts.length === 0) {
            tbody.innerHTML = '';
            emptyState.classList.remove('hidden');
            return;
        }
        
        emptyState.classList.add('hidden');
        
        tbody.innerHTML = this.hosts.map(host => `
            <tr class="table-row-hover" data-host-id="${host.id}">
                <td class="px-6 py-4 whitespace-nowrap">
                    ${this.getStatusBadge(host.last_status)}
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                    <div class="text-sm font-medium text-gray-900">${this.escapeHtml(host.name)}</div>
                    <div class="text-sm text-gray-500">${this.escapeHtml(host.description || '')}</div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    ${host.ip_address}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    ${this.getResponseTimeDisplay(host)}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    ${host.last_check ? this.formatDateTime(host.last_check) : '없음'}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                    <button class="btn-action btn-toggle ${host.is_active ? 'active' : ''}" 
                            onclick="networkMonitor.toggleHostMonitoring('${host.id}')" 
                            title="${host.is_active ? '모니터링 중지' : '모니터링 시작'}">
                        <i class="fas ${host.is_active ? 'fa-pause' : 'fa-play'}"></i>
                    </button>
                    <button class="btn-action btn-edit" onclick="networkMonitor.editHost('${host.id}')" title="편집">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn-action btn-delete" onclick="networkMonitor.deleteHost('${host.id}')" title="삭제">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `).join('');
    }
    
    getStatusBadge(status) {
        const badges = {
            'online': '<span class="status-online"><i class="fas fa-check-circle mr-1"></i>온라인</span>',
            'offline': '<span class="status-offline"><i class="fas fa-times-circle mr-1"></i>오프라인</span>',
            'unknown': '<span class="status-unknown"><i class="fas fa-question-circle mr-1"></i>알 수 없음</span>',
            'checking': '<span class="status-checking status-pulse"><i class="fas fa-sync-alt mr-1"></i>확인 중</span>'
        };
        return badges[status] || badges['unknown'];
    }
    
    getResponseTimeDisplay(host) {
        if (!host.response_time || host.last_status !== 'online') {
            return '-';
        }
        
        const time = host.response_time;
        let className = 'response-excellent';
        
        if (time > 1000) className = 'response-poor';
        else if (time > 500) className = 'response-fair';
        else if (time > 100) className = 'response-good';
        
        return `<span class="${className}">${time}ms</span>`;
    }
    
    updateDashboard() {
        const onlineCount = this.hosts.filter(h => h.last_status === 'online').length;
        const offlineCount = this.hosts.filter(h => h.last_status === 'offline').length;
        const unknownCount = this.hosts.filter(h => h.last_status === 'unknown' || h.last_status === 'checking').length;
        
        document.getElementById('onlineCount').textContent = onlineCount;
        document.getElementById('offlineCount').textContent = offlineCount;
        document.getElementById('unknownCount').textContent = unknownCount;
        document.getElementById('totalHosts').textContent = this.hosts.length;
    }
    
    startMonitoring() {
        this.hosts.forEach(host => {
            if (host.is_active) {
                this.startMonitoringForHost(host);
            }
        });
        this.isMonitoring = true;
    }
    
    startMonitoringForHost(host) {
        // Clear existing interval
        if (this.monitoringIntervals.has(host.id)) {
            clearInterval(this.monitoringIntervals.get(host.id));
        }
        
        // Start new monitoring interval
        const interval = setInterval(() => {
            this.checkHostStatus(host.id);
        }, host.monitor_interval * 1000);
        
        this.monitoringIntervals.set(host.id, interval);
        
        // Immediate check
        this.checkHostStatus(host.id);
    }
    
    async checkHostStatus(hostId) {
        const host = this.hosts.find(h => h.id === hostId);
        if (!host || !host.is_active) return;
        
        try {
            // Update UI to show checking status
            host.last_status = 'checking';
            this.renderHostsTable();
            
            const startTime = Date.now();
            const result = await this.simulatePing(host.ip_address);
            const responseTime = Date.now() - startTime;
            
            // Update host status
            const newStatus = result.success ? 'online' : 'offline';
            const updateData = {
                last_status: newStatus,
                last_check: Date.now(),
                response_time: result.success ? responseTime : null
            };
            
            // Update in storage
            if (window.storageService) {
                const updatedHost = window.storageService.updateHost(hostId, updateData);
                const hostIndex = this.hosts.findIndex(h => h.id === hostId);
                this.hosts[hostIndex] = updatedHost;
                
                // Simple alert for offline hosts
                if (newStatus === 'offline' && host.email_alerts) {
                    this.sendSimpleAlert(host, 'Host is offline');
                }
                
                this.renderHostsTable();
                this.updateDashboard();
            }
            
        } catch (error) {
            console.error('Error checking host status:', error);
            
            // Update status to offline on error
            if (window.storageService) {
                const updateData = {
                    last_status: 'offline',
                    last_check: Date.now(),
                    response_time: null
                };
                
                const updatedHost = window.storageService.updateHost(hostId, updateData);
                const hostIndex = this.hosts.findIndex(h => h.id === hostId);
                this.hosts[hostIndex] = updatedHost;
                
                this.renderHostsTable();
                this.updateDashboard();
            }
        }
    }
    
    async simulatePing(ipAddress) {
        try {
            // Simple simulation based on IP
            const lastOctet = parseInt(ipAddress.split('.').pop());
            const success = lastOctet % 3 !== 0; // Some hosts will be "down"
            
            // Add some delay to simulate network check
            await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 1000));
            
            return {
                success: success,
                error: success ? null : 'Host unreachable (simulated)'
            };
            
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }
    
    sendSimpleAlert(host, message) {
        try {
            // Simple browser notification
            if ('Notification' in window && Notification.permission === 'granted') {
                const notification = new Notification(`Network Alert: ${host.name}`, {
                    body: `${host.ip_address} - ${message}`,
                    requireInteraction: false
                });
                
                setTimeout(() => notification.close(), 5000);
            }
            
            // Log the alert
            this.addLog('warning', `알림: ${host.name} (${host.ip_address}) - ${message}`);
            
            // Show in-app notification
            this.showNotification(`${host.name}: ${message}`, 'warning');
            
        } catch (error) {
            console.error('Error sending simple alert:', error);
        }
    }
    
    async refreshAllHosts() {
        try {
            this.showLoading();
            
            for (const host of this.hosts) {
                if (host.is_active) {
                    await this.checkHostStatus(host.id);
                }
            }
            
            this.showNotification('모든 호스트 상태가 새로고침되었습니다.', 'success');
            
        } catch (error) {
            console.error('Error refreshing hosts:', error);
            this.showNotification('호스트 새로고침 중 오류가 발생했습니다.', 'error');
        } finally {
            this.hideLoading();
        }
    }
    
    filterHosts(searchTerm) {
        const rows = document.querySelectorAll('#hostsTableBody tr');
        const term = searchTerm.toLowerCase();
        
        rows.forEach(row => {
            const text = row.textContent.toLowerCase();
            if (text.includes(term)) {
                row.style.display = '';
            } else {
                row.style.display = 'none';
            }
        });
    }
    
    resetAllData() {
        if (confirm('모든 데이터를 초기화하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) {
            if (window.storageService) {
                window.storageService.clearAllData();
                this.hosts = [];
                this.emailSettings = null;
                
                // Clear all monitoring intervals
                this.monitoringIntervals.forEach((interval) => {
                    clearInterval(interval);
                });
                this.monitoringIntervals.clear();
                
                this.renderHostsTable();
                this.updateDashboard();
                this.showNotification('모든 데이터가 초기화되었습니다.', 'info');
                this.addLog('info', '데이터 초기화 완료');
            }
        }
    }
    
    editHost(hostId) {
        this.showNotification('편집 기능은 개발 예정입니다.', 'info');
    }
    
    // Utility functions
    isValidIP(ip) {
        const regex = /^((25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
        return regex.test(ip);
    }
    
    isValidEmail(email) {
        const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return regex.test(email);
    }
    
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    formatDateTime(timestamp) {
        return new Date(timestamp).toLocaleString('ko-KR');
    }
    
    showLoading() {
        document.getElementById('loadingOverlay').classList.remove('hidden');
    }
    
    hideLoading() {
        document.getElementById('loadingOverlay').classList.add('hidden');
    }
    
    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <div class="flex items-center justify-between">
                <span>${message}</span>
                <button onclick="this.parentElement.parentElement.remove()" class="ml-4 text-white hover:text-gray-200">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;
        
        document.body.appendChild(notification);
        
        // Show notification
        setTimeout(() => notification.classList.add('show'), 100);
        
        // Auto remove after 5 seconds
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => {
                if (notification.parentElement) {
                    notification.remove();
                }
            }, 300);
        }, 5000);
    }
    
    // Log system functions
    addLog(level, message, details = null) {
        const timestamp = new Date().toISOString();
        const logEntry = {
            timestamp: timestamp,
            level: level,
            message: message,
            details: details,
            id: Date.now() + Math.random()
        };
        
        this.logs.unshift(logEntry);
        
        if (this.logs.length > this.maxLogs) {
            this.logs = this.logs.slice(0, this.maxLogs);
        }
        
        // Console output
        const consoleMessage = `[${timestamp}] ${level.toUpperCase()}: ${message}`;
        switch (level) {
            case 'error':
                console.error(consoleMessage, details);
                break;
            case 'warning':
                console.warn(consoleMessage, details);
                break;
            case 'info':
                console.info(consoleMessage, details);
                break;
            default:
                console.log(consoleMessage, details);
        }
        
        // Update logs modal if open
        if (!document.getElementById('logsModal').classList.contains('hidden')) {
            this.renderLogs();
        }
    }
    
    showLogsModal() {
        document.getElementById('logsModal').classList.remove('hidden');
        this.renderLogs();
    }
    
    hideLogsModal() {
        document.getElementById('logsModal').classList.add('hidden');
    }
    
    setLogFilter(level) {
        this.currentLogFilter = level;
        
        document.querySelectorAll('.log-filter').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-level="${level}"]`).classList.add('active');
        
        this.renderLogs();
    }
    
    renderLogs() {
        const logContent = document.getElementById('logContent');
        const logCount = document.getElementById('logCount');
        const lastUpdate = document.getElementById('lastLogUpdate');
        
        let filteredLogs = this.logs;
        if (this.currentLogFilter !== 'all') {
            filteredLogs = this.logs.filter(log => log.level === this.currentLogFilter);
        }
        
        const logHtml = filteredLogs.map(log => {
            const time = new Date(log.timestamp).toLocaleString('ko-KR');
            const detailsHtml = log.details ? `\n상세: ${JSON.stringify(log.details, null, 2)}` : '';
            
            return `<div class="log-entry ${log.level}">
                <span class="log-timestamp">[${time}]</span> 
                <strong>[${log.level.toUpperCase()}]</strong> 
                ${this.escapeHtml(log.message)}${detailsHtml}
            </div>`;
        }).join('');
        
        logContent.innerHTML = logHtml || '<div class="text-gray-500">로그가 없습니다.</div>';
        
        logCount.textContent = filteredLogs.length;
        lastUpdate.textContent = this.logs.length > 0 ? 
            new Date(this.logs[0].timestamp).toLocaleString('ko-KR') : '-';
        
        logContent.scrollTop = logContent.scrollHeight;
    }
    
    clearLogs() {
        if (confirm('모든 로그를 삭제하시겠습니까?')) {
            this.logs = [];
            this.renderLogs();
            this.addLog('info', '로그가 수동으로 삭제되었습니다.');
        }
    }
    
    exportLogs() {
        try {
            const logText = this.logs.map(log => {
                const time = new Date(log.timestamp).toLocaleString('ko-KR');
                const details = log.details ? `\n상세: ${JSON.stringify(log.details, null, 2)}` : '';
                return `[${time}] [${log.level.toUpperCase()}] ${log.message}${details}`;
            }).join('\n\n');
            
            const blob = new Blob([logText], { type: 'text/plain;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            
            const a = document.createElement('a');
            a.href = url;
            a.download = `network-monitor-logs-${new Date().toISOString().split('T')[0]}.txt`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            
            URL.revokeObjectURL(url);
            
            this.addLog('info', '로그를 파일로 내보냈습니다.');
        } catch (error) {
            this.addLog('error', '로그 내보내기 실패', error.message);
        }
    }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.networkMonitor = new NetworkMonitor();
});

// Handle page visibility change
document.addEventListener('visibilitychange', () => {
    if (window.networkMonitor) {
        if (document.hidden) {
            console.log('Page hidden - monitoring continues');
        } else {
            console.log('Page visible - monitoring active');
        }
    }
});