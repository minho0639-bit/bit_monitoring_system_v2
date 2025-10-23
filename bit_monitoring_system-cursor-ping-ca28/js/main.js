// Network Monitoring System - Main JavaScript

class NetworkMonitor {
    constructor() {
        this.hosts = [];
        this.monitoringIntervals = new Map();
        this.emailSettings = null;
        this.isMonitoring = false;
        this.lastAlertTimes = new Map(); // To prevent spam alerts
        this.logs = []; // System logs
        this.maxLogs = 1000; // Maximum number of logs to keep
        this.currentLogFilter = 'all';
        // Initialize email services safely
        try {
            this.emailService = new EmailService();
            console.log('✅ EmailService 초기화 성공');
        } catch (error) {
            console.error('❌ EmailService 초기화 실패:', error);
            this.emailService = null;
        }
        
        try {
            this.noSignupEmailService = new NoSignupEmailService();
            console.log('✅ NoSignupEmailService 초기화 성공');
        } catch (error) {
            console.error('❌ NoSignupEmailService 초기화 실패:', error);
            this.noSignupEmailService = null;
        }
        
        this.init();
    }
    
    async init() {
        try {
            this.addLog('info', '네트워크 모니터 초기화 시작');
            
            // 이벤트 리스너를 먼저 설정
            this.setupEventListeners();
            this.addLog('debug', '이벤트 리스너 설정 완료');
            
            // 데이터 로딩
            await this.loadHosts();
            this.addLog('debug', `호스트 ${this.hosts.length}개 로드 완료`);
            
            await this.loadEmailSettings();
            this.addLog('debug', '이메일 설정 로드 완료');
            
            // Load EmailJS and webhook configurations
            this.loadEmailConfigurations();
            
            // 모니터링 시작 및 대시보드 업데이트
            this.startMonitoring();
            this.addLog('info', '모니터링 시작됨');
            
            // Start real-time ping result updates
            this.startPingResultUpdates();
            
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
            console.log('호스트 추가 폼 submit 이벤트 발생');
            this.addLog('debug', '호스트 추가 폼 제출됨');
            this.addHost();
        });
        
        // Additional click listener for submit button
        document.getElementById('submitAddHost').addEventListener('click', (e) => {
            console.log('호스트 추가 버튼 직접 클릭됨');
            this.addLog('debug', '호스트 추가 버튼 클릭됨');
            
            // If it's not a form submit, prevent default and manually trigger addHost
            if (e.type === 'click' && e.target.type === 'submit') {
                // Let the form handle it naturally
                return;
            }
            
            e.preventDefault();
            this.addHost();
        });
        
        // Settings Modal
        document.getElementById('settingsBtn').addEventListener('click', () => {
            // 새로운 이메일 설정 페이지로 이동
            window.open('email-config-universal.html', '_blank');
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
        document.getElementById('requestNotificationPermission').addEventListener('click', () => {
            this.requestNotificationPermission();
        });
        
        // Reset data button
        document.getElementById('resetDataBtn').addEventListener('click', () => {
            this.resetAllData();
        });

        // EmailJS configuration buttons
        document.getElementById('saveEmailjsConfig').addEventListener('click', () => {
            this.saveEmailjsConfig();
        });

        document.getElementById('testEmailjsConfig').addEventListener('click', () => {
            this.testEmailjsConfig();
        });

        // Webhook configuration button
        document.getElementById('saveWebhookConfig').addEventListener('click', () => {
            this.saveWebhookConfig();
        });

        // No-signup email configuration buttons
        document.getElementById('saveNoSignupConfig').addEventListener('click', () => {
            this.saveNoSignupConfig();
        });

        document.getElementById('testNoSignupEmail').addEventListener('click', () => {
            this.testNoSignupEmail();
        });
        
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
            
            // Try to load from backend API first
            try {
                const response = await fetch('/api/hosts');
                if (response.ok) {
                    this.hosts = await response.json();
                    this.addLog('info', `백엔드에서 호스트 ${this.hosts.length}개 로드됨`);
                    
                    // Load ping results for each host
                    await this.loadPingResults();
                } else {
                    throw new Error(`Backend API error: ${response.status}`);
                }
            } catch (apiError) {
                this.addLog('warning', '백엔드 API 연결 실패, 로컬 스토리지 사용', apiError.message);
                
                // Fallback to local storage
                if (window.storageService) {
                    this.hosts = window.storageService.getHosts();
                    this.addLog('info', `로컬 스토리지에서 호스트 ${this.hosts.length}개 로드됨`);
                } else {
                    this.addLog('warning', 'Storage Service가 초기화되지 않음');
                    this.hosts = [];
                }
            }
            
            this.renderHostsTable();
        } catch (error) {
            this.addLog('error', '호스트 로딩 실패', error.message);
            console.error('Error loading hosts:', error);
            this.hosts = [];
        }
    }
    
    async loadPingResults() {
        try {
            console.log('=== loadPingResults 시작 ===');
            for (const host of this.hosts) {
                try {
                    console.log(`호스트 ${host.name} (${host.ip_address}) ping 결과 로딩 중...`);
                    const response = await fetch(`/api/hosts/${host.id}/ping-results?limit=1`);
                    if (response.ok) {
                        const pingResults = await response.json();
                        if (pingResults.length > 0) {
                            const latestResult = pingResults[0];
                            const isOnline = latestResult.is_online;
                            const status = isOnline ? 'online' : 'offline';
                            
                            // Debug logging
                            console.log(`호스트 ${host.name} (${host.ip_address}) ping 결과:`, {
                                is_online: isOnline,
                                status: status,
                                response_time: latestResult.response_time,
                                timestamp: latestResult.timestamp,
                                이전_상태: host.last_status
                            });
                            
                            host.last_status = status;
                            host.last_check = new Date(latestResult.timestamp).getTime();
                            host.response_time = latestResult.response_time;
                            
                            console.log(`호스트 ${host.name} 상태 업데이트됨: ${host.last_status}`);
                        } else {
                            console.log(`호스트 ${host.name} (${host.ip_address})에 ping 결과 없음`);
                            host.last_status = 'unknown';
                            host.last_check = null;
                            host.response_time = null;
                        }
                    } else {
                        console.error(`호스트 ${host.name} ping 결과 로딩 실패: ${response.status}`);
                    }
                } catch (error) {
                    console.error(`호스트 ${host.id} ping 결과 로딩 중 오류:`, error);
                    host.last_status = 'unknown';
                    host.last_check = null;
                    host.response_time = null;
                }
            }
            console.log('=== loadPingResults 완료 ===');
            this.addLog('info', 'Ping 결과 로드 완료');
        } catch (error) {
            this.addLog('error', 'Ping 결과 로딩 실패', error.message);
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
        
        // Debug form state
        this.debugHostForm();
        
        // Add debug event listeners for form fields
        this.setupHostFormDebug();
    }
    
    hideAddHostModal() {
        document.getElementById('addHostModal').classList.add('hidden');
        document.getElementById('addHostForm').reset();
        document.getElementById('hostFormDebug').classList.add('hidden');
        this.addLog('debug', '호스트 추가 모달 닫힘');
    }
    
    setupHostFormDebug() {
        const debugDiv = document.getElementById('hostFormDebug');
        const debugContent = document.getElementById('hostFormDebugContent');
        
        const updateDebug = () => {
            const hostName = document.getElementById('hostName').value.trim();
            const hostIP = document.getElementById('hostIP').value.trim();
            const hostDesc = document.getElementById('hostDescription').value.trim();
            const monitorInterval = document.getElementById('monitorInterval').value;
            const emailAlerts = document.getElementById('emailAlerts').checked;
            
            const debugInfo = `
                호스트명: "${hostName}" (길이: ${hostName.length})
                IP 주소: "${hostIP}" (유효: ${this.isValidIP(hostIP) ? '✅' : '❌'})
                설명: "${hostDesc}"
                모니터링 간격: ${monitorInterval}초
                이메일 알람: ${emailAlerts ? '활성화' : '비활성화'}
                폼 유효성: ${hostName && hostIP && this.isValidIP(hostIP) ? '✅' : '❌'}
            `;
            
            debugContent.textContent = debugInfo;
            
            // Show debug info if there's any input
            if (hostName || hostIP || hostDesc) {
                debugDiv.classList.remove('hidden');
            } else {
                debugDiv.classList.add('hidden');
            }
        };
        
        // Add event listeners to form fields
        ['hostName', 'hostIP', 'hostDescription', 'monitorInterval', 'emailAlerts'].forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.addEventListener('input', updateDebug);
                element.addEventListener('change', updateDebug);
            }
        });
        
        // Initial update
        updateDebug();
    }
    
    showSettingsModal() {
        document.getElementById('settingsModal').classList.remove('hidden');
        this.populateSettingsForm();
    }
    
    hideSettingsModal() {
        document.getElementById('settingsModal').classList.add('hidden');
    }
    
    populateSettingsForm() {
        console.log('Populating settings form with:', this.emailSettings);
        
        // 기본값으로 폼 초기화
        document.getElementById('smtpServer').value = '';
        document.getElementById('smtpPort').value = '587';
        document.getElementById('emailUsername').value = '';
        document.getElementById('emailPassword').value = '';
        document.getElementById('fromEmail').value = '';
        document.getElementById('toEmails').value = '';
        document.getElementById('enableEmailAlerts').checked = true;
        
        // 기존 설정이 있으면 폼에 채우기
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
                if (typeof this.emailSettings.browser_notifications === 'boolean') {
                    document.getElementById('enableBrowserNotifications').checked = this.emailSettings.browser_notifications;
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
            
            // Verify form elements exist
            const requiredElements = ['hostName', 'hostIP', 'hostDescription', 'monitorInterval', 'emailAlerts'];
            for (const elementId of requiredElements) {
                const element = document.getElementById(elementId);
                if (!element) {
                    this.addLog('error', `폼 요소를 찾을 수 없음: ${elementId}`);
                    throw new Error(`폼 요소를 찾을 수 없습니다: ${elementId}`);
                }
            }
            
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
            
            this.addLog('debug', '호스트 데이터 수집 완료', hostData);
            
            // Validate required fields
            if (!hostData.name) {
                this.addLog('warning', '호스트 추가 실패: 호스트명 누락');
                throw new Error('호스트명을 입력해주세요.');
            }
            
            if (!hostData.ip_address) {
                this.addLog('warning', '호스트 추가 실패: IP 주소 누락');
                throw new Error('IP 주소를 입력해주세요.');
            }
            
            // Validate IP address
            if (!this.isValidIP(hostData.ip_address)) {
                this.addLog('warning', '호스트 추가 실패: 잘못된 IP 주소 형식', { ip: hostData.ip_address });
                throw new Error('유효하지 않은 IP 주소입니다.');
            }
            
            // Try to add host via backend API first
            try {
                const response = await fetch('/api/hosts', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(hostData)
                });
                
                if (response.ok) {
                    const newHost = await response.json();
                    this.hosts.push(newHost);
                    this.addLog('info', `백엔드 API를 통해 호스트 추가 성공`, { 
                        name: newHost.name, 
                        ip: newHost.ip_address,
                        id: newHost.id 
                    });
                } else {
                    throw new Error(`Backend API error: ${response.status}`);
                }
            } catch (apiError) {
                this.addLog('warning', '백엔드 API 연결 실패, 로컬 스토리지 사용', apiError.message);
                
                // Fallback to local storage
                if (!window.storageService) {
                    throw new Error('Storage Service가 초기화되지 않았습니다.');
                }
                
                const newHost = window.storageService.addHost(hostData);
                this.hosts.push(newHost);
                this.addLog('info', `로컬 스토리지를 통해 호스트 추가 성공`, { 
                    name: newHost.name, 
                    ip: newHost.ip_address,
                    id: newHost.id 
                });
            }
            
            this.addLog('info', `새 호스트 추가 성공`, { 
                name: newHost.name, 
                ip: newHost.ip_address,
                id: newHost.id 
            });
            
            this.hideAddHostModal();
            this.renderHostsTable();
            this.updateDashboard();
            this.startMonitoringForHost(newHost);
            
            this.showNotification('호스트가 성공적으로 추가되었습니다.', 'success');
            
        } catch (error) {
            this.addLog('error', '호스트 추가 실패', { error: error.message, stack: error.stack });
            this.showNotification(error.message, 'error');
            
            // Additional debug info on failure
            this.debugHostForm();
        } finally {
            this.hideLoading();
        }
    }
    
    async saveEmailSettings() {
        try {
            this.addLog('info', '이메일 설정 저장 시작');
            this.showLoading();
            
            // 폼 데이터 유효성 검사
            const smtpServer = document.getElementById('smtpServer').value.trim();
            const smtpPort = document.getElementById('smtpPort').value.trim();
            const emailUsername = document.getElementById('emailUsername').value.trim();
            const fromEmail = document.getElementById('fromEmail').value.trim();
            const toEmailsText = document.getElementById('toEmails').value.trim();
            
            this.addLog('debug', '이메일 설정 폼 데이터 수집', {
                smtpServer: smtpServer,
                smtpPort: smtpPort,
                emailUsername: emailUsername,
                fromEmail: fromEmail,
                toEmailsCount: toEmailsText ? toEmailsText.split(',').length : 0
            });
            
            // 기본 필드 검증
            if (!smtpServer) {
                this.addLog('warning', '이메일 설정 저장 실패: SMTP 서버 주소 누락');
                throw new Error('SMTP 서버 주소를 입력해주세요.');
            }
            
            if (!smtpPort || isNaN(parseInt(smtpPort))) {
                this.addLog('warning', '이메일 설정 저장 실패: 올바르지 않은 SMTP 포트');
                throw new Error('올바른 SMTP 포트 번호를 입력해주세요.');
            }
            
            if (!emailUsername) {
                this.addLog('warning', '이메일 설정 저장 실패: 사용자명 누락');
                throw new Error('사용자명(이메일)을 입력해주세요.');
            }
            
            if (!fromEmail) {
                this.addLog('warning', '이메일 설정 저장 실패: 발신자 이메일 누락');
                throw new Error('발신자 이메일을 입력해주세요.');
            }
            
            // 이메일 형식 검증
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(emailUsername)) {
                throw new Error('올바른 사용자 이메일 형식을 입력해주세요.');
            }
            
            if (!emailRegex.test(fromEmail)) {
                throw new Error('올바른 발신자 이메일 형식을 입력해주세요.');
            }
            
            // 수신자 이메일 처리 및 검증
            const toEmails = [];
            if (toEmailsText) {
                const emailList = toEmailsText.split(',').map(email => email.trim()).filter(email => email);
                for (const email of emailList) {
                    if (!emailRegex.test(email)) {
                        throw new Error(`올바르지 않은 수신자 이메일 형식: ${email}`);
                    }
                }
                toEmails.push(...emailList);
            }
            
            if (toEmails.length === 0) {
                throw new Error('최소 하나의 수신자 이메일을 입력해주세요.');
            }
            
            const settingsData = {
                smtp_server: smtpServer,
                smtp_port: parseInt(smtpPort),
                username: emailUsername,
                password: document.getElementById('emailPassword').value, // 빈 값도 허용
                from_email: fromEmail,
                to_emails: toEmails,
                is_enabled: document.getElementById('enableEmailAlerts').checked,
                browser_notifications: document.getElementById('enableBrowserNotifications').checked
            };
            
            this.addLog('debug', '이메일 설정 데이터 준비 완료', settingsData);
            
            // Use storage service directly
            if (!window.storageService) {
                throw new Error('Storage Service가 초기화되지 않았습니다.');
            }
            
            const savedSettings = window.storageService.saveEmailSettings(settingsData);
            this.addLog('info', '이메일 설정 저장 성공', { settingsId: savedSettings.id });
            
            this.emailSettings = savedSettings;
            this.hideSettingsModal();
            this.showNotification('이메일 설정이 성공적으로 저장되었습니다.', 'success');
            
        } catch (error) {
            this.addLog('error', '이메일 설정 저장 중 예외 발생', {
                message: error.message,
                stack: error.stack,
                name: error.name
            });
            
            this.showNotification(error.message, 'error');
        } finally {
            this.hideLoading();
        }
    }
    
    async testEmailSettings() {
        try {
            this.addLog('info', '이메일 설정 테스트 시작');
            this.showLoading();
            
            // 현재 폼의 값들로 임시 설정 객체 생성
            const smtpServer = document.getElementById('smtpServer').value.trim();
            const smtpPort = document.getElementById('smtpPort').value.trim();
            const emailUsername = document.getElementById('emailUsername').value.trim();
            const fromEmail = document.getElementById('fromEmail').value.trim();
            const toEmailsText = document.getElementById('toEmails').value.trim();
            
            this.addLog('debug', '이메일 테스트용 데이터 수집', {
                smtpServer,
                smtpPort,
                emailUsername,
                fromEmail,
                toEmailsLength: toEmailsText.length
            });
            
            // 기본 검증
            if (!smtpServer || !smtpPort || !emailUsername || !fromEmail || !toEmailsText) {
                throw new Error('모든 필수 필드를 입력해주세요.');
            }
            
            // 이메일 형식 검증
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(emailUsername) || !emailRegex.test(fromEmail)) {
                throw new Error('올바른 이메일 형식을 입력해주세요.');
            }
            
            const toEmails = toEmailsText.split(',').map(email => email.trim()).filter(email => email);
            if (toEmails.length === 0) {
                throw new Error('수신자 이메일을 입력해주세요.');
            }
            
            for (const email of toEmails) {
                if (!emailRegex.test(email)) {
                    throw new Error(`올바르지 않은 수신자 이메일: ${email}`);
                }
            }
            
            // 테스트 설정 객체
            const testSettings = {
                smtp_server: smtpServer,
                smtp_port: parseInt(smtpPort),
                username: emailUsername,
                password: document.getElementById('emailPassword').value,
                from_email: fromEmail,
                to_emails: toEmails,
                is_enabled: true
            };
            
            this.addLog('debug', '이메일 서비스를 통한 테스트 시작', testSettings);
            
            // Use the email service to test configuration
            const result = await this.emailService.testEmailConfiguration(testSettings);
            
            this.addLog('info', '이메일 설정 테스트 성공', result);
            this.showNotification(result.message, 'success');
            
        } catch (error) {
            this.addLog('error', '이메일 설정 테스트 실패', error.message);
            this.showNotification(`이메일 설정 테스트 실패: ${error.message}`, 'error');
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
                    body: '브라우저 알림이 정상적으로 설정되었습니다.',
                    icon: '/favicon.ico'
                });
                
                setTimeout(() => testNotification.close(), 3000);
                
            } else if (permission === 'denied') {
                this.showNotification('브라우저 알림 권한이 거부되었습니다. 브라우저 설정에서 수동으로 허용해주세요.', 'warning');
                this.addLog('warning', '브라우저 알림 권한 거부됨');
            } else {
                this.showNotification('브라우저 알림 권한 요청이 취소되었습니다.', 'info');
                this.addLog('info', '브라우저 알림 권한 요청 취소됨');
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
            
            // Stop monitoring for this host
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
            this.addLog('info', `호스트 모니터링 ${status}`, { hostName: host.name, hostId });
            
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
        // Clear existing interval if any
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
        if (!host || !host.is_active) {
            console.log(`호스트 ${hostId}가 비활성화되어 있거나 찾을 수 없음`);
            return;
        }
        
        console.log(`=== checkHostStatus 시작: ${host.name} (${host.ip_address}) ===`);
        
        try {
            // Update UI to show checking status
            host.last_status = 'checking';
            this.renderHostsTable();
            
            const startTime = Date.now();
            
            // Use backend API for actual ping
            console.log(`호스트 ${host.name}에 대해 백엔드 API ping 요청 중...`);
            const response = await fetch(`/api/ping/${hostId}`, {
                method: 'POST'
            });
            
            if (response.ok) {
                const pingResult = await response.json();
                const newStatus = pingResult.is_online ? 'online' : 'offline';
                
                console.log(`호스트 ${host.name} ping 결과:`, {
                    is_online: pingResult.is_online,
                    newStatus: newStatus,
                    response_time: pingResult.response_time,
                    timestamp: pingResult.timestamp,
                    이전_상태: host.last_status
                });
                
                // Update host status
                host.last_status = newStatus;
                host.last_check = new Date(pingResult.timestamp).getTime();
                host.response_time = pingResult.response_time;
                
                const updateData = {
                    last_status: newStatus,
                    last_check: host.last_check,
                    response_time: pingResult.response_time
                };
            
                // Update in storage
                if (window.storageService) {
                    const updatedHost = window.storageService.updateHost(hostId, updateData);
                    const hostIndex = this.hosts.findIndex(h => h.id === hostId);
                    this.hosts[hostIndex] = updatedHost;
                }
                
                // Log the monitoring result
                await this.logMonitoringResult(hostId, newStatus, pingResult.response_time);
                
                // Check for alerts
                if (newStatus === 'offline' && host.email_alerts) {
                    await this.sendAlert(host, 'Host is offline');
                }
                
                console.log(`호스트 ${host.name} 상태 업데이트 완료: ${host.last_status}`);
                this.renderHostsTable();
                this.updateDashboard();
            } else {
                console.error(`호스트 ${host.name} ping API 오류: ${response.status}`);
                throw new Error(`Ping API error: ${response.status}`);
            }
            
        } catch (error) {
            console.error(`호스트 ${host.name} 상태 확인 중 오류:`, error);
            
            // Update status to offline on error
            host.last_status = 'offline';
            host.last_check = Date.now();
            host.response_time = null;
            
            try {
                if (window.storageService) {
                    const updateData = {
                        last_status: 'offline',
                        last_check: Date.now(),
                        response_time: null
                    };
                    
                    const updatedHost = window.storageService.updateHost(hostId, updateData);
                    const hostIndex = this.hosts.findIndex(h => h.id === hostId);
                    this.hosts[hostIndex] = updatedHost;
                }
                
                await this.logMonitoringResult(hostId, 'offline', null, error.message);
                
                if (host.email_alerts) {
                    await this.sendAlert(host, `Host check failed: ${error.message}`);
                }
                
                console.log(`호스트 ${host.name} 오류로 인해 오프라인으로 설정됨`);
                this.renderHostsTable();
                this.updateDashboard();
            } catch (updateError) {
                console.error('호스트 업데이트 중 오류:', updateError);
            }
        }
        
        console.log(`=== checkHostStatus 완료: ${host.name} ===`);
    }
    
    async simulatePing(ipAddress) {
        // Since browsers can't perform actual ping, we simulate it with various methods
        // In a real implementation, you'd need a backend service
        
        try {
            // Try to make a request to determine if host is reachable
            // This is a simulation - replace with actual ping service
            
            // Method 1: Try HTTP request (if it's a web server)
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000);
            
            try {
                const response = await fetch(`http://${ipAddress}`, {
                    method: 'HEAD',
                    mode: 'no-cors',
                    signal: controller.signal
                });
                clearTimeout(timeoutId);
                return { success: true, error: null };
            } catch (fetchError) {
                clearTimeout(timeoutId);
                
                // If CORS error, host might be up but not allowing cross-origin requests
                if (fetchError.name === 'AbortError') {
                    return { success: false, error: 'Timeout' };
                }
                
                // For demo purposes, randomly succeed/fail based on IP
                const lastOctet = parseInt(ipAddress.split('.').pop());
                const success = lastOctet % 3 !== 0; // Simulate some hosts being down
                
                return {
                    success: success,
                    error: success ? null : 'Host unreachable'
                };
            }
            
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }
    
    async logMonitoringResult(hostId, status, responseTime, errorMessage) {
        try {
            const logData = {
                host_id: hostId,
                status: status,
                response_time: responseTime,
                timestamp: Date.now(),
                error_message: errorMessage || null
            };
            
            if (window.storageService) {
                window.storageService.addMonitoringLog(logData);
            }
        } catch (error) {
            console.error('Error logging monitoring result:', error);
        }
    }
    
    async sendAlert(host, message) {
        // Prevent spam alerts - only send if last alert was more than 15 minutes ago
        const lastAlertTime = this.lastAlertTimes.get(host.id);
        const now = Date.now();
        if (lastAlertTime && (now - lastAlertTime) < 15 * 60 * 1000) {
            this.addLog('debug', '알림 스팸 방지: 15분 이내 중복 알림 차단', { host: host.name });
            return;
        }
        
        try {
            this.addLog('info', '알림 발송 시작', { 
                host: host.name, 
                ip: host.ip_address, 
                message 
            });
            
            let alertSent = false;
            const results = [];

            // Method 1: Try no-signup email service first (easier to use)
            if (this.noSignupEmailService) {
                try {
                    const mailtoEmail = localStorage.getItem('mailto_email') || 'admin@company.com';
                    const noSignupResult = await this.noSignupEmailService.sendAlert(host, message, mailtoEmail);
                    results.push(noSignupResult);
                    
                    if (noSignupResult.success) {
                        alertSent = true;
                        this.addLog('info', '회원가입 없는 이메일 서비스로 알림 발송 성공', noSignupResult);
                    }
                } catch (noSignupError) {
                    this.addLog('warning', '회원가입 없는 이메일 서비스 실패', noSignupError.message);
                    results.push({ success: false, method: 'no-signup', error: noSignupError.message });
                }
            } else {
                this.addLog('warning', '회원가입 없는 이메일 서비스가 초기화되지 않음');
            }

            // Method 2: Try EmailJS if configured and no-signup failed
            if (!alertSent && this.emailSettings && this.emailSettings.is_enabled && this.emailService) {
                try {
                    const emailResult = await this.emailService.sendAlert(this.emailSettings, host, message);
                    results.push(emailResult);
                    
                    if (emailResult.success) {
                        alertSent = true;
                        this.addLog('info', 'EmailJS로 알림 발송 성공', emailResult);
                    }
                } catch (emailError) {
                    this.addLog('warning', 'EmailJS 알림 발송 실패', emailError.message);
                    results.push({ success: false, method: 'emailjs', error: emailError.message });
                }
            } else if (!this.emailService) {
                this.addLog('warning', 'EmailService가 초기화되지 않음');
            }

            // Show result to user
            if (alertSent) {
                this.showNotification(`${host.name}에 대한 알림이 발송되었습니다.`, 'success');
                this.lastAlertTimes.set(host.id, now);
                
                // Log successful methods
                const successfulMethods = results.filter(r => r.success).map(r => r.method || 'unknown');
                this.addLog('info', `알림 발송 성공 (${successfulMethods.join(', ')})`);
            } else {
                this.showNotification(`${host.name} 알림 발송에 실패했습니다. 설정을 확인해주세요.`, 'warning');
                this.addLog('warning', '모든 알림 방법 실패', { results });
            }
            
        } catch (error) {
            this.addLog('error', '알림 발송 중 전체 오류', { 
                host: host.name, 
                error: error.message 
            });
            console.error('Error sending alert:', error);
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
    
    // Utility functions
    isValidIP(ip) {
        const regex = /^((25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
        return regex.test(ip);
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
    
    // Debug function to check form state
    debugHostForm() {
        const form = document.getElementById('addHostForm');
        const hostName = document.getElementById('hostName');
        const hostIP = document.getElementById('hostIP');
        const submitBtn = document.getElementById('submitAddHost');
        
        const formState = {
            formExists: !!form,
            hostNameExists: !!hostName,
            hostNameValue: hostName ? hostName.value : 'N/A',
            hostIPExists: !!hostIP,
            hostIPValue: hostIP ? hostIP.value : 'N/A',
            submitBtnExists: !!submitBtn,
            formValid: form ? form.checkValidity() : false
        };
        
        this.addLog('debug', '호스트 폼 상태 확인', formState);
        return formState;
    }
    
    // Placeholder for edit functionality
    editHost(hostId) {
        this.showNotification('편집 기능은 개발 예정입니다.', 'info');
    }

    // EmailJS configuration methods
    saveEmailjsConfig() {
        try {
            const serviceId = document.getElementById('emailjsServiceId').value.trim();
            const templateId = document.getElementById('emailjsTemplateId').value.trim();
            const publicKey = document.getElementById('emailjsPublicKey').value.trim();

            if (!serviceId || !templateId || !publicKey) {
                this.showNotification('모든 EmailJS 설정 필드를 입력해주세요.', 'error');
                return;
            }

            // Configure EmailJS in email service
            if (!this.emailService) {
                throw new Error('EmailService가 초기화되지 않았습니다.');
            }
            const success = this.emailService.configureEmailJS(serviceId, templateId, publicKey);
            
            if (success) {
                this.addLog('info', 'EmailJS 설정 저장 완료', { serviceId, templateId });
                this.showNotification('EmailJS 설정이 저장되었습니다. 이제 실제 이메일을 발송할 수 있습니다!', 'success');
            } else {
                this.addLog('error', 'EmailJS 설정 저장 실패');
                this.showNotification('EmailJS 설정 저장에 실패했습니다.', 'error');
            }
        } catch (error) {
            this.addLog('error', 'EmailJS 설정 저장 중 오류', error.message);
            this.showNotification(`EmailJS 설정 오류: ${error.message}`, 'error');
        }
    }

    async testEmailjsConfig() {
        try {
            this.addLog('info', 'EmailJS 테스트 이메일 발송 시작');
            this.showLoading();

            if (!this.emailService) {
                throw new Error('EmailService가 초기화되지 않았습니다.');
            }
            
            if (!this.emailService.isEmailJSConfigured()) {
                throw new Error('EmailJS 설정을 먼저 저장해주세요.');
            }

            // Create test email settings from current form
            const emailSettings = {
                to_emails: ['test@example.com'], // Will be overridden by EmailJS template
                from_email: 'monitor@company.com'
            };

            // Create test host info
            const testHost = {
                name: 'Test Server',
                ip_address: '192.168.1.100',
                description: 'EmailJS 테스트용 서버'
            };

            const result = await this.emailService.sendAlertEmail(emailSettings, testHost, 'EmailJS 연결 테스트');
            
            this.addLog('info', 'EmailJS 테스트 이메일 발송 성공', result);
            this.showNotification('테스트 이메일이 성공적으로 발송되었습니다!', 'success');

        } catch (error) {
            this.addLog('error', 'EmailJS 테스트 실패', error.message);
            this.showNotification(`테스트 실패: ${error.message}`, 'error');
        } finally {
            this.hideLoading();
        }
    }

    saveWebhookConfig() {
        try {
            const webhookUrl = document.getElementById('webhookUrl').value.trim();

            if (webhookUrl && !webhookUrl.startsWith('http')) {
                this.showNotification('올바른 웹훅 URL을 입력해주세요.', 'error');
                return;
            }

            // Configure webhook in email service
            if (this.emailService) {
                this.emailService.webhookUrl = webhookUrl;
            }
            if (this.noSignupEmailService) {
                this.noSignupEmailService.configureWebhook(webhookUrl);
            }
            
            // Save to localStorage
            localStorage.setItem('webhook_url', webhookUrl);

            if (webhookUrl) {
                this.addLog('info', '웹훅 URL 설정 완료', { webhookUrl });
                this.showNotification('웹훅 설정이 저장되었습니다.', 'success');
            } else {
                this.addLog('info', '웹훅 설정 제거됨');
                this.showNotification('웹훅 설정이 제거되었습니다.', 'info');
            }
        } catch (error) {
            this.addLog('error', '웹훅 설정 저장 중 오류', error.message);
            this.showNotification(`웹훅 설정 오류: ${error.message}`, 'error');
        }
    }

    // Load EmailJS and webhook configurations
    loadEmailConfigurations() {
        try {
            // Load EmailJS config
            const emailjsConfig = localStorage.getItem('emailjs_config');
            if (emailjsConfig) {
                const config = JSON.parse(emailjsConfig);
                document.getElementById('emailjsServiceId').value = config.serviceId || '';
                document.getElementById('emailjsTemplateId').value = config.templateId || '';
                document.getElementById('emailjsPublicKey').value = config.publicKey || '';
            }

            // Load webhook config
            const webhookUrl = localStorage.getItem('webhook_url');
            if (webhookUrl) {
                document.getElementById('webhookUrl').value = webhookUrl;
                if (this.emailService) {
                    this.emailService.webhookUrl = webhookUrl;
                }
                if (this.noSignupEmailService) {
                    this.noSignupEmailService.services.webhook.url = webhookUrl;
                    this.noSignupEmailService.services.webhook.enabled = true;
                }
            }

            // Load no-signup email configurations
            this.loadNoSignupConfigurations();

            this.addLog('debug', '이메일 설정 로드 완료');
        } catch (error) {
            this.addLog('error', '이메일 설정 로드 실패', error.message);
        }
    }

    // Load no-signup email configurations
    loadNoSignupConfigurations() {
        try {
            const noSignupSettings = localStorage.getItem('no_signup_email_settings');
            if (noSignupSettings) {
                const settings = JSON.parse(noSignupSettings);
                
                // Load Formspree settings
                if (settings.formspree && settings.formspree.enabled) {
                    document.getElementById('enableFormspree').checked = true;
                    // Extract email from endpoint
                    const endpoint = settings.formspree.endpoint;
                    if (endpoint) {
                        const emailMatch = endpoint.match(/f\/(.+)/);
                        if (emailMatch) {
                            const email = emailMatch[1].replace('-at-', '@').replace('-dot-', '.');
                            document.getElementById('formspreeEmail').value = email;
                        }
                    }
                }

                // Load mailto settings (always enabled)
                const mailtoEmail = localStorage.getItem('mailto_email');
                if (mailtoEmail) {
                    document.getElementById('mailtoEmail').value = mailtoEmail;
                }
            }

            this.addLog('debug', '회원가입 없는 이메일 설정 로드 완료');
        } catch (error) {
            this.addLog('error', '회원가입 없는 이메일 설정 로드 실패', error.message);
        }
    }

    // Save no-signup email configurations
    saveNoSignupConfig() {
        try {
            const formspreeEnabled = document.getElementById('enableFormspree').checked;
            const formspreeEmail = document.getElementById('formspreeEmail').value.trim();
            const mailtoEmail = document.getElementById('mailtoEmail').value.trim();

            // Configure Formspree if enabled
            if (formspreeEnabled) {
                if (!formspreeEmail || !this.isValidEmail(formspreeEmail)) {
                    this.showNotification('올바른 Formspree 이메일 주소를 입력해주세요.', 'error');
                    return;
                }
                if (this.noSignupEmailService) {
                    this.noSignupEmailService.configureFormspree(formspreeEmail);
                } else {
                    throw new Error('NoSignupEmailService가 초기화되지 않았습니다.');
                }
            }

            // Save mailto email
            if (mailtoEmail && this.isValidEmail(mailtoEmail)) {
                localStorage.setItem('mailto_email', mailtoEmail);
            }

            this.addLog('info', '회원가입 없는 이메일 설정 저장 완료', {
                formspree: formspreeEnabled,
                mailto: !!mailtoEmail
            });
            
            this.showNotification('회원가입 없는 이메일 설정이 저장되었습니다!', 'success');

        } catch (error) {
            this.addLog('error', '회원가입 없는 이메일 설정 저장 실패', error.message);
            this.showNotification(`설정 저장 실패: ${error.message}`, 'error');
        }
    }

    // Test no-signup email
    async testNoSignupEmail() {
        try {
            this.addLog('info', '회원가입 없는 이메일 테스트 시작');
            this.showLoading();

            const mailtoEmail = document.getElementById('mailtoEmail').value.trim() || 'admin@company.com';

            // Create test host info
            const testHost = {
                name: 'Test Server',
                ip_address: '192.168.1.100',
                description: '회원가입 없는 이메일 테스트용 서버'
            };

            if (!this.noSignupEmailService) {
                throw new Error('NoSignupEmailService가 초기화되지 않았습니다.');
            }
            
            const result = await this.noSignupEmailService.sendAlert(testHost, '회원가입 없는 이메일 테스트', mailtoEmail);
            
            this.addLog('info', '회원가입 없는 이메일 테스트 성공', result);
            this.showNotification('테스트가 성공했습니다! 사용 가능한 방법으로 알림이 발송되었습니다.', 'success');

            // Show available methods
            const methods = this.noSignupEmailService.getAvailableMethods();
            this.addLog('info', `사용 가능한 방법: ${methods.join(', ')}`);

        } catch (error) {
            this.addLog('error', '회원가입 없는 이메일 테스트 실패', error.message);
            this.showNotification(`테스트 실패: ${error.message}`, 'error');
        } finally {
            this.hideLoading();
        }
    }
    
    // Debug function to reset all data
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
    
    // Start real-time ping result updates
    startPingResultUpdates() {
        // Update ping results every 10 seconds
        setInterval(async () => {
            try {
                await this.loadPingResults();
                this.renderHostsTable();
                this.updateDashboard();
            } catch (error) {
                console.error('Error updating ping results:', error);
            }
        }, 10000); // Update every 10 seconds
        
        this.addLog('info', '실시간 ping 결과 업데이트 시작됨');
    }
    
    // ===============================
    // LOG SYSTEM FUNCTIONS
    // ===============================
    
    // Add log entry
    addLog(level, message, details = null) {
        const timestamp = new Date().toISOString();
        const logEntry = {
            timestamp: timestamp,
            level: level,
            message: message,
            details: details,
            id: Date.now() + Math.random()
        };
        
        this.logs.unshift(logEntry); // Add to beginning
        
        // Keep only max number of logs
        if (this.logs.length > this.maxLogs) {
            this.logs = this.logs.slice(0, this.maxLogs);
        }
        
        // Console output for debugging
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
            case 'debug':
                console.log(consoleMessage, details);
                break;
            default:
                console.log(consoleMessage, details);
        }
        
        // Update logs modal if open
        if (!document.getElementById('logsModal').classList.contains('hidden')) {
            this.renderLogs();
        }
    }
    
    // Show logs modal
    showLogsModal() {
        document.getElementById('logsModal').classList.remove('hidden');
        this.renderLogs();
    }
    
    // Hide logs modal
    hideLogsModal() {
        document.getElementById('logsModal').classList.add('hidden');
    }
    
    // Set log filter
    setLogFilter(level) {
        this.currentLogFilter = level;
        
        // Update button states
        document.querySelectorAll('.log-filter').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-level="${level}"]`).classList.add('active');
        
        this.renderLogs();
    }
    
    // Render logs in modal
    renderLogs() {
        const logContent = document.getElementById('logContent');
        const logCount = document.getElementById('logCount');
        const lastUpdate = document.getElementById('lastLogUpdate');
        
        // Filter logs
        let filteredLogs = this.logs;
        if (this.currentLogFilter !== 'all') {
            filteredLogs = this.logs.filter(log => log.level === this.currentLogFilter);
        }
        
        // Generate HTML
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
        
        // Update stats
        logCount.textContent = filteredLogs.length;
        lastUpdate.textContent = this.logs.length > 0 ? 
            new Date(this.logs[0].timestamp).toLocaleString('ko-KR') : '-';
        
        // Auto scroll to bottom
        logContent.scrollTop = logContent.scrollHeight;
    }
    
    // Clear all logs
    clearLogs() {
        if (confirm('모든 로그를 삭제하시겠습니까?')) {
            this.logs = [];
            this.renderLogs();
            this.addLog('info', '로그가 수동으로 삭제되었습니다.');
        }
    }
    
    // Export logs to file
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

// Handle page visibility change to pause/resume monitoring
document.addEventListener('visibilitychange', () => {
    if (window.networkMonitor) {
        if (document.hidden) {
            // Page is hidden, could pause monitoring
            console.log('Page hidden - monitoring continues');
        } else {
            // Page is visible, ensure monitoring is active
            console.log('Page visible - monitoring active');
        }
    }
});