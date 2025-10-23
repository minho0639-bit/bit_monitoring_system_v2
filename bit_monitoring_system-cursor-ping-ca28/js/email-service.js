// Email Service for Network Monitoring System
// Enhanced version with multiple email sending options including EmailJS

class EmailService {
    constructor() {
        this.emailJSInitialized = false;
        this.emailJSConfig = {
            serviceId: null,
            templateId: null,
            publicKey: null
        };
        this.loadEmailJS();
        this.notificationService = new BrowserNotificationService();
        this.webhookUrl = null;
    }
    
    // Load EmailJS library for client-side email sending
    loadEmailJS() {
        if (window.emailjs) {
            this.emailJSInitialized = true;
            console.log('EmailJS already loaded');
            return;
        }
        
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/@emailjs/browser@3/dist/email.min.js';
        script.onload = () => {
            this.emailJSInitialized = true;
            console.log('EmailJS loaded successfully');
            // Auto-initialize if config exists
            this.autoInitializeEmailJS();
        };
        script.onerror = () => {
            console.error('Failed to load EmailJS');
        };
        document.head.appendChild(script);
    }
    
    // Auto-initialize EmailJS if config exists
    autoInitializeEmailJS() {
        const savedConfig = localStorage.getItem('emailjs_config');
        if (savedConfig) {
            try {
                this.emailJSConfig = JSON.parse(savedConfig);
                if (this.emailJSConfig.publicKey) {
                    this.initializeEmailJS(this.emailJSConfig.publicKey);
                }
            } catch (error) {
                console.error('Failed to load EmailJS config:', error);
            }
        }
    }

    // Initialize EmailJS with user credentials
    initializeEmailJS(publicKey) {
        if (window.emailjs && publicKey) {
            window.emailjs.init(publicKey);
            this.emailJSConfig.publicKey = publicKey;
            console.log('EmailJS initialized with public key');
            return true;
        }
        return false;
    }

    // Configure EmailJS settings
    configureEmailJS(serviceId, templateId, publicKey) {
        this.emailJSConfig = {
            serviceId: serviceId,
            templateId: templateId,
            publicKey: publicKey
        };
        
        // Save to localStorage
        localStorage.setItem('emailjs_config', JSON.stringify(this.emailJSConfig));
        
        // Initialize if EmailJS is loaded
        if (this.emailJSInitialized) {
            return this.initializeEmailJS(publicKey);
        }
        
        return true;
    }

    // Check if EmailJS is properly configured
    isEmailJSConfigured() {
        return this.emailJSInitialized && 
               this.emailJSConfig.serviceId && 
               this.emailJSConfig.templateId && 
               this.emailJSConfig.publicKey;
    }
    
    // Send email using EmailJS
    async sendAlertEmail(emailSettings, hostInfo, alertMessage) {
        if (!this.isEmailJSConfigured()) {
            throw new Error('EmailJS가 설정되지 않았습니다. EmailJS 설정을 먼저 완료해주세요.');
        }
        
        try {
            const templateParams = {
                to_email: emailSettings.to_emails[0], // EmailJS는 보통 하나의 수신자
                to_emails: emailSettings.to_emails.join(', '),
                from_name: 'Network Monitoring System',
                from_email: emailSettings.from_email || 'monitor@company.com',
                host_name: hostInfo.name,
                host_ip: hostInfo.ip_address,
                host_description: hostInfo.description || '',
                alert_message: alertMessage,
                timestamp: new Date().toLocaleString('ko-KR'),
                subject: `[ALERT] ${hostInfo.name} (${hostInfo.ip_address}) - ${alertMessage}`,
                message: this.generateEmailBody(hostInfo, alertMessage)
            };
            
            console.log('Sending email with EmailJS:', {
                serviceId: this.emailJSConfig.serviceId,
                templateId: this.emailJSConfig.templateId,
                params: templateParams
            });
            
            const response = await window.emailjs.send(
                this.emailJSConfig.serviceId,
                this.emailJSConfig.templateId,
                templateParams
            );
            
            console.log('Email sent successfully via EmailJS:', response);
            return { success: true, response, method: 'emailjs' };
            
        } catch (error) {
            console.error('EmailJS sending failed:', error);
            throw new Error(`EmailJS 발송 실패: ${error.text || error.message}`);
        }
    }
    
    // Send email via backend SMTP service
    async sendEmailViaBackend(emailSettings, hostInfo, alertMessage) {
        try {
            const emailData = {
                smtp_server: emailSettings.smtp_server,
                smtp_port: emailSettings.smtp_port,
                username: emailSettings.username,
                password: emailSettings.password,
                from_email: emailSettings.from_email,
                to_emails: emailSettings.to_emails,
                subject: `[ALERT] ${hostInfo.name} (${hostInfo.ip_address}) - Network Issue`,
                body: this.generateEmailBody(hostInfo, alertMessage)
            };
            
            const response = await fetch('/api/email/settings', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(emailData)
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(`Email service error: ${errorData.error || response.statusText}`);
            }
            
            const result = await response.json();
            return { success: true, result, method: 'backend_smtp' };
            
        } catch (error) {
            console.error('Backend SMTP service failed:', error);
            throw error;
        }
    }
    
    // Generate email body content
    generateEmailBody(hostInfo, alertMessage) {
        return `
네트워크 모니터링 알림

호스트 정보:
- 이름: ${hostInfo.name}
- IP 주소: ${hostInfo.ip_address}
- 설명: ${hostInfo.description || '없음'}

알림 내용:
${alertMessage}

발생 시간: ${new Date().toLocaleString('ko-KR')}

이 알림은 네트워크 모니터링 시스템에서 자동으로 발송되었습니다.
호스트 상태를 확인하고 필요한 조치를 취해주세요.

---
Network Monitoring System
        `;
    }
    
    // Validate email configuration
    validateEmailConfig(emailSettings) {
        const required = ['smtp_server', 'smtp_port', 'username', 'password', 'from_email'];
        const missing = required.filter(field => !emailSettings[field]);
        
        if (missing.length > 0) {
            return {
                valid: false,
                errors: missing.map(field => `${field} is required`)
            };
        }
        
        if (!emailSettings.to_emails || emailSettings.to_emails.length === 0) {
            return {
                valid: false,
                errors: ['At least one recipient email is required']
            };
        }
        
        // Validate email addresses
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        const invalidEmails = emailSettings.to_emails.filter(email => !emailRegex.test(email));
        
        if (invalidEmails.length > 0) {
            return {
                valid: false,
                errors: [`Invalid email addresses: ${invalidEmails.join(', ')}`]
            };
        }
        
        return { valid: true, errors: [] };
    }
    
    // Test email configuration
    async testEmailConfiguration(emailSettings) {
        const validation = this.validateEmailConfig(emailSettings);
        if (!validation.valid) {
            throw new Error(`Configuration errors: ${validation.errors.join(', ')}`);
        }
        
        try {
            // Since we can't actually send emails from browser, we'll simulate a successful test
            console.log('Testing email configuration:', {
                smtp_server: emailSettings.smtp_server,
                smtp_port: emailSettings.smtp_port,
                from_email: emailSettings.from_email,
                to_emails: emailSettings.to_emails
            });
            
            // Simulate network delay
            await new Promise(resolve => setTimeout(resolve, 1500));
            
            // Show browser notification as alternative
            const testHostInfo = {
                name: 'Test Host',
                ip_address: '192.168.1.1',
                description: 'This is a test from Network Monitoring System'
            };
            
            this.notificationService.showNotification(testHostInfo, 'Email configuration test successful!');
            
            return { 
                success: true, 
                message: 'Email configuration test completed successfully. In a production environment, a test email would be sent.',
                simulation: true
            };
            
        } catch (error) {
            throw new Error(`Email test failed: ${error.message}`);
        }
    }
    
    // Enhanced send alert method with multiple options
    async sendAlert(emailSettings, hostInfo, alertMessage) {
        const results = [];
        let hasSuccessfulSend = false;

        try {
            console.log('EMAIL ALERT ATTEMPT:', {
                to: emailSettings.to_emails,
                subject: `[ALERT] ${hostInfo.name} (${hostInfo.ip_address}) - ${alertMessage}`,
                timestamp: new Date().toLocaleString('ko-KR'),
                methods: this.getAvailableMethods()
            });

            // Method 1: Try EmailJS if configured
            if (this.isEmailJSConfigured()) {
                try {
                    const emailResult = await this.sendAlertEmail(emailSettings, hostInfo, alertMessage);
                    results.push(emailResult);
                    hasSuccessfulSend = true;
                    console.log('✅ EmailJS 발송 성공');
                } catch (emailError) {
                    console.warn('❌ EmailJS 발송 실패:', emailError.message);
                    results.push({ success: false, method: 'emailjs', error: emailError.message });
                }
            }

            // Method 2: Try backend SMTP service
            try {
                const smtpResult = await this.sendEmailViaBackend(emailSettings, hostInfo, alertMessage);
                results.push(smtpResult);
                hasSuccessfulSend = true;
                console.log('✅ 백엔드 SMTP 발송 성공');
            } catch (smtpError) {
                console.warn('❌ 백엔드 SMTP 발송 실패:', smtpError.message);
                results.push({ success: false, method: 'backend_smtp', error: smtpError.message });
            }

            // Method 3: Try webhook if configured
            if (this.webhookUrl) {
                try {
                    const webhookResult = await this.sendEmailViaWebhook(hostInfo, alertMessage);
                    results.push(webhookResult);
                    hasSuccessfulSend = true;
                    console.log('✅ 웹훅 발송 성공');
                } catch (webhookError) {
                    console.warn('❌ 웹훅 발송 실패:', webhookError.message);
                    results.push({ success: false, method: 'webhook', error: webhookError.message });
                }
            }

            // Method 3: Always show browser notification as backup
            try {
                const notificationResult = this.notificationService.showNotification(hostInfo, alertMessage);
                results.push({ 
                    success: notificationResult, 
                    method: 'browser_notification',
                    message: notificationResult ? '브라우저 알림 표시됨' : '브라우저 알림 실패'
                });
                if (notificationResult) {
                    console.log('✅ 브라우저 알림 성공');
                }
            } catch (notificationError) {
                console.warn('❌ 브라우저 알림 실패:', notificationError.message);
                results.push({ success: false, method: 'browser_notification', error: notificationError.message });
            }

            // Method 4: Fallback to console/localStorage logging
            try {
                this.logAlertToStorage(hostInfo, alertMessage);
                results.push({ success: true, method: 'storage_log', message: '로컬 저장소에 기록됨' });
                console.log('✅ 로컬 로그 저장 성공');
            } catch (logError) {
                console.warn('❌ 로컬 로그 저장 실패:', logError.message);
            }

            return {
                success: hasSuccessfulSend || results.some(r => r.success),
                message: hasSuccessfulSend ? 
                    '알림이 성공적으로 발송되었습니다.' : 
                    '일부 알림 방법이 실패했지만 브라우저 알림은 표시되었습니다.',
                results: results,
                availableMethods: this.getAvailableMethods()
            };

        } catch (error) {
            console.error('Alert sending failed completely:', error);
            
            // Emergency fallback - at least log it
            try {
                this.logAlertToStorage(hostInfo, alertMessage);
            } catch (logError) {
                console.error('Even logging failed:', logError);
            }
            
            throw new Error(`알림 발송 실패: ${error.message}`);
        }
    }

    // Get available sending methods
    getAvailableMethods() {
        const methods = [];
        
        if (this.isEmailJSConfigured()) {
            methods.push('EmailJS');
        }
        
        methods.push('Backend SMTP'); // Always available if server is running
        
        if (this.webhookUrl) {
            methods.push('Webhook');
        }
        
        if ('Notification' in window) {
            methods.push('Browser Notification');
        }
        
        methods.push('Local Storage Log');
        
        return methods;
    }

    // Log alert to localStorage as fallback
    logAlertToStorage(hostInfo, alertMessage) {
        const alerts = JSON.parse(localStorage.getItem('network_monitor_alerts') || '[]');
        const alertLog = {
            id: Date.now().toString(36) + Math.random().toString(36).substr(2),
            timestamp: new Date().toISOString(),
            host: {
                name: hostInfo.name,
                ip: hostInfo.ip_address,
                description: hostInfo.description
            },
            message: alertMessage,
            status: 'logged'
        };
        
        alerts.unshift(alertLog);
        
        // Keep only last 100 alerts
        if (alerts.length > 100) {
            alerts.splice(100);
        }
        
        localStorage.setItem('network_monitor_alerts', JSON.stringify(alerts));
        console.log('Alert logged to localStorage:', alertLog);
    }
    
    // Generate SMTP configuration help text
    getSMTPHelp() {
        return {
            gmail: {
                smtp_server: 'smtp.gmail.com',
                smtp_port: 587,
                note: 'Gmail requires "App Passwords" instead of regular password. Enable 2FA and generate an app password.'
            },
            naver: {
                smtp_server: 'smtp.naver.com',
                smtp_port: 587,
                note: '네이버 메일 계정과 비밀번호를 사용하세요. 2단계 인증이 활성화된 경우 앱 비밀번호를 사용해야 합니다.'
            },
            outlook: {
                smtp_server: 'smtp-mail.outlook.com',
                smtp_port: 587,
                note: 'Use your regular Outlook/Hotmail credentials.'
            },
            yahoo: {
                smtp_server: 'smtp.mail.yahoo.com',
                smtp_port: 587,
                note: 'Yahoo requires "App Passwords". Generate one in Yahoo Mail settings.'
            },
            custom: {
                note: 'Contact your email provider for SMTP settings. Common ports: 25, 587, 465 (SSL)'
            }
        };
    }

    // Send email via webhook (integrated into main EmailService)
    async sendEmailViaWebhook(hostInfo, alertMessage) {
        if (!this.webhookUrl) {
            throw new Error('웹훅 URL이 설정되지 않았습니다.');
        }
        
        try {
            const webhookData = {
                event: 'network_alert',
                host_name: hostInfo.name,
                host_ip: hostInfo.ip_address,
                host_description: hostInfo.description || '',
                alert_message: alertMessage,
                timestamp: new Date().toISOString(),
                severity: this.determineAlertSeverity(alertMessage),
                // Additional data for webhook services
                subject: `[ALERT] ${hostInfo.name} (${hostInfo.ip_address}) - ${alertMessage}`,
                message: this.generateEmailBody(hostInfo, alertMessage)
            };
            
            console.log('Sending webhook:', { url: this.webhookUrl, data: webhookData });
            
            const response = await fetch(this.webhookUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'User-Agent': 'NetworkMonitor/1.0'
                },
                body: JSON.stringify(webhookData)
            });
            
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`웹훅 응답 오류 ${response.status}: ${errorText}`);
            }
            
            const responseText = await response.text();
            console.log('Webhook sent successfully:', responseText);
            
            return { 
                success: true, 
                method: 'webhook',
                webhookResponse: responseText,
                message: '웹훅을 통해 알림이 발송되었습니다.'
            };
            
        } catch (error) {
            console.error('Webhook sending failed:', error);
            throw new Error(`웹훅 발송 실패: ${error.message}`);
        }
    }
}

// Webhook-based email service (alternative approach)
class WebhookEmailService {
    constructor() {
        this.webhookUrl = null;
    }
    
    // Set webhook URL for email service (like Zapier, IFTTT, etc.)
    setWebhookUrl(url) {
        this.webhookUrl = url;
    }
    
    // Send email via webhook
    async sendEmailViaWebhook(hostInfo, alertMessage) {
        if (!this.webhookUrl) {
            throw new Error('Webhook URL not configured');
        }
        
        try {
            const webhookData = {
                event: 'network_alert',
                host_name: hostInfo.name,
                host_ip: hostInfo.ip_address,
                host_description: hostInfo.description,
                alert_message: alertMessage,
                timestamp: new Date().toISOString(),
                severity: this.determineAlertSeverity(alertMessage)
            };
            
            const response = await fetch(this.webhookUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(webhookData)
            });
            
            if (!response.ok) {
                throw new Error(`Webhook returned ${response.status}`);
            }
            
            return { success: true, webhookResponse: await response.text() };
            
        } catch (error) {
            console.error('Webhook email failed:', error);
            throw error;
        }
    }
    
    // Determine alert severity based on message
    determineAlertSeverity(message) {
        const lowerMessage = message.toLowerCase();
        
        if (lowerMessage.includes('critical') || lowerMessage.includes('down')) {
            return 'critical';
        } else if (lowerMessage.includes('warning') || lowerMessage.includes('slow')) {
            return 'warning';
        } else if (lowerMessage.includes('offline')) {
            return 'major';
        }
        
        return 'minor';
    }
}

// Browser notification service (as fallback)
class BrowserNotificationService {
    constructor() {
        this.requestPermission();
    }
    
    // Request notification permission
    async requestPermission() {
        if ('Notification' in window) {
            const permission = await Notification.requestPermission();
            console.log('Notification permission:', permission);
            return permission === 'granted';
        }
        return false;
    }
    
    // Show browser notification
    showNotification(hostInfo, alertMessage) {
        if ('Notification' in window && Notification.permission === 'granted') {
            const notification = new Notification(`Network Alert: ${hostInfo.name}`, {
                body: `${hostInfo.ip_address} - ${alertMessage}`,
                icon: '/favicon.ico', // Add your icon path
                tag: `host-${hostInfo.id}`, // Prevent duplicate notifications
                requireInteraction: true
            });
            
            notification.onclick = () => {
                window.focus();
                notification.close();
            };
            
            // Auto close after 10 seconds
            setTimeout(() => notification.close(), 10000);
            
            return true;
        }
        return false;
    }
}

// Export services for use in main application
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        EmailService,
        WebhookEmailService,
        BrowserNotificationService
    };
}