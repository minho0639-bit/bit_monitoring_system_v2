// No-Signup Email Service for Network Monitoring System
// Multiple methods to send emails without requiring user registration

class NoSignupEmailService {
    constructor() {
        this.services = {
            formspree: {
                enabled: false,
                endpoint: null
            },
            netlify: {
                enabled: false,
                endpoint: null
            },
            webhook: {
                enabled: false,
                url: null
            }
        };
        
        this.loadSavedSettings();
    }

    // Load saved settings from localStorage
    loadSavedSettings() {
        try {
            const saved = localStorage.getItem('no_signup_email_settings');
            if (saved) {
                this.services = { ...this.services, ...JSON.parse(saved) };
            }
        } catch (error) {
            console.error('Failed to load email settings:', error);
        }
    }

    // Save settings to localStorage
    saveSettings() {
        try {
            localStorage.setItem('no_signup_email_settings', JSON.stringify(this.services));
        } catch (error) {
            console.error('Failed to save email settings:', error);
        }
    }

    // Configure Formspree (no signup required for basic use)
    configureFormspree(email) {
        if (!email || !this.isValidEmail(email)) {
            throw new Error('올바른 이메일 주소를 입력해주세요.');
        }
        
        this.services.formspree = {
            enabled: true,
            endpoint: `https://formspree.io/f/${email.replace('@', '-at-').replace('.', '-dot-')}`
        };
        
        this.saveSettings();
        console.log('Formspree configured for:', email);
    }

    // Configure Netlify Forms
    configureNetlify(formName = 'network-monitor-alerts') {
        this.services.netlify = {
            enabled: true,
            endpoint: `/.netlify/forms/${formName}`
        };
        
        this.saveSettings();
        console.log('Netlify Forms configured');
    }

    // Configure custom webhook
    configureWebhook(webhookUrl) {
        if (!webhookUrl || !webhookUrl.startsWith('http')) {
            throw new Error('올바른 웹훅 URL을 입력해주세요.');
        }
        
        this.services.webhook = {
            enabled: true,
            url: webhookUrl
        };
        
        this.saveSettings();
        console.log('Webhook configured:', webhookUrl);
    }

    // Send email via Formspree
    async sendViaFormspree(hostInfo, alertMessage, recipientEmail) {
        if (!this.services.formspree.enabled) {
            throw new Error('Formspree가 설정되지 않았습니다.');
        }

        try {
            const formData = new FormData();
            formData.append('subject', `[ALERT] ${hostInfo.name} (${hostInfo.ip_address}) - Network Issue`);
            formData.append('message', this.generateEmailBody(hostInfo, alertMessage));
            formData.append('_replyto', recipientEmail || 'admin@company.com');
            formData.append('host_name', hostInfo.name);
            formData.append('host_ip', hostInfo.ip_address);
            formData.append('alert_type', 'network_monitoring');
            formData.append('timestamp', new Date().toISOString());

            const response = await fetch(this.services.formspree.endpoint, {
                method: 'POST',
                body: formData,
                headers: {
                    'Accept': 'application/json'
                }
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(`Formspree error: ${errorData.error || response.statusText}`);
            }

            const result = await response.json();
            console.log('Formspree email sent successfully:', result);
            
            return {
                success: true,
                method: 'formspree',
                message: 'Formspree를 통해 이메일이 발송되었습니다.',
                response: result
            };

        } catch (error) {
            console.error('Formspree sending failed:', error);
            throw new Error(`Formspree 발송 실패: ${error.message}`);
        }
    }

    // Send email via Netlify Forms
    async sendViaNetlify(hostInfo, alertMessage) {
        if (!this.services.netlify.enabled) {
            throw new Error('Netlify Forms가 설정되지 않았습니다.');
        }

        try {
            const formData = new FormData();
            formData.append('form-name', 'network-monitor-alerts');
            formData.append('subject', `[ALERT] ${hostInfo.name} (${hostInfo.ip_address})`);
            formData.append('message', this.generateEmailBody(hostInfo, alertMessage));
            formData.append('host_name', hostInfo.name);
            formData.append('host_ip', hostInfo.ip_address);
            formData.append('alert_message', alertMessage);
            formData.append('timestamp', new Date().toISOString());

            const response = await fetch(this.services.netlify.endpoint, {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                throw new Error(`Netlify Forms error: ${response.statusText}`);
            }

            console.log('Netlify Forms submission successful');
            
            return {
                success: true,
                method: 'netlify',
                message: 'Netlify Forms를 통해 알림이 제출되었습니다.',
                response: 'submitted'
            };

        } catch (error) {
            console.error('Netlify Forms sending failed:', error);
            throw new Error(`Netlify Forms 발송 실패: ${error.message}`);
        }
    }

    // Send via custom webhook
    async sendViaWebhook(hostInfo, alertMessage) {
        if (!this.services.webhook.enabled) {
            throw new Error('웹훅이 설정되지 않았습니다.');
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
                subject: `[ALERT] ${hostInfo.name} (${hostInfo.ip_address}) - ${alertMessage}`,
                message: this.generateEmailBody(hostInfo, alertMessage)
            };

            const response = await fetch(this.services.webhook.url, {
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
                message: '웹훅을 통해 알림이 발송되었습니다.',
                webhookResponse: responseText
            };

        } catch (error) {
            console.error('Webhook sending failed:', error);
            throw new Error(`웹훅 발송 실패: ${error.message}`);
        }
    }

    // Generate mailto link (opens default email client)
    generateMailtoLink(hostInfo, alertMessage, recipientEmail = 'admin@company.com') {
        const subject = encodeURIComponent(`[ALERT] ${hostInfo.name} (${hostInfo.ip_address}) - Network Issue`);
        const body = encodeURIComponent(this.generateEmailBody(hostInfo, alertMessage));
        
        return `mailto:${recipientEmail}?subject=${subject}&body=${body}`;
    }

    // Open mailto link
    openMailtoLink(hostInfo, alertMessage, recipientEmail) {
        try {
            const mailtoUrl = this.generateMailtoLink(hostInfo, alertMessage, recipientEmail);
            window.open(mailtoUrl, '_blank');
            
            return {
                success: true,
                method: 'mailto',
                message: '기본 이메일 클라이언트가 열렸습니다.',
                mailtoUrl: mailtoUrl
            };
        } catch (error) {
            throw new Error(`Mailto 링크 생성 실패: ${error.message}`);
        }
    }

    // Main send method - tries all available methods
    async sendAlert(hostInfo, alertMessage, recipientEmail = 'admin@company.com') {
        const results = [];
        let hasSuccessfulSend = false;

        console.log('No-signup email alert attempt:', {
            host: hostInfo.name,
            ip: hostInfo.ip_address,
            message: alertMessage,
            availableMethods: this.getAvailableMethods()
        });

        // Method 1: Try Formspree
        if (this.services.formspree.enabled) {
            try {
                const result = await this.sendViaFormspree(hostInfo, alertMessage, recipientEmail);
                results.push(result);
                hasSuccessfulSend = true;
                console.log('✅ Formspree 발송 성공');
            } catch (error) {
                console.warn('❌ Formspree 발송 실패:', error.message);
                results.push({ success: false, method: 'formspree', error: error.message });
            }
        }

        // Method 2: Try Netlify Forms
        if (this.services.netlify.enabled && !hasSuccessfulSend) {
            try {
                const result = await this.sendViaNetlify(hostInfo, alertMessage);
                results.push(result);
                hasSuccessfulSend = true;
                console.log('✅ Netlify Forms 발송 성공');
            } catch (error) {
                console.warn('❌ Netlify Forms 발송 실패:', error.message);
                results.push({ success: false, method: 'netlify', error: error.message });
            }
        }

        // Method 3: Try Webhook
        if (this.services.webhook.enabled && !hasSuccessfulSend) {
            try {
                const result = await this.sendViaWebhook(hostInfo, alertMessage);
                results.push(result);
                hasSuccessfulSend = true;
                console.log('✅ 웹훅 발송 성공');
            } catch (error) {
                console.warn('❌ 웹훅 발송 실패:', error.message);
                results.push({ success: false, method: 'webhook', error: error.message });
            }
        }

        // Method 4: Fallback to mailto (always available)
        if (!hasSuccessfulSend) {
            try {
                const result = this.openMailtoLink(hostInfo, alertMessage, recipientEmail);
                results.push(result);
                hasSuccessfulSend = true;
                console.log('✅ Mailto 링크 생성 성공');
            } catch (error) {
                console.warn('❌ Mailto 링크 생성 실패:', error.message);
                results.push({ success: false, method: 'mailto', error: error.message });
            }
        }

        return {
            success: hasSuccessfulSend,
            message: hasSuccessfulSend ? 
                '알림이 성공적으로 발송되었습니다.' : 
                '모든 발송 방법이 실패했습니다.',
            results: results,
            availableMethods: this.getAvailableMethods()
        };
    }

    // Get available methods
    getAvailableMethods() {
        const methods = [];
        
        if (this.services.formspree.enabled) {
            methods.push('Formspree');
        }
        
        if (this.services.netlify.enabled) {
            methods.push('Netlify Forms');
        }
        
        if (this.services.webhook.enabled) {
            methods.push('Webhook');
        }
        
        methods.push('Mailto Link'); // Always available
        
        return methods;
    }

    // Generate email body
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
        `.trim();
    }

    // Determine alert severity
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

    // Validate email address
    isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    // Get service status
    getServiceStatus() {
        return {
            formspree: {
                enabled: this.services.formspree.enabled,
                configured: !!this.services.formspree.endpoint
            },
            netlify: {
                enabled: this.services.netlify.enabled,
                configured: !!this.services.netlify.endpoint
            },
            webhook: {
                enabled: this.services.webhook.enabled,
                configured: !!this.services.webhook.url
            },
            mailto: {
                enabled: true,
                configured: true
            }
        };
    }

    // Clear all configurations
    clearAllConfigurations() {
        this.services = {
            formspree: { enabled: false, endpoint: null },
            netlify: { enabled: false, endpoint: null },
            webhook: { enabled: false, url: null }
        };
        
        localStorage.removeItem('no_signup_email_settings');
        console.log('All email configurations cleared');
    }
}

// Export for use in main application
if (typeof window !== 'undefined') {
    window.NoSignupEmailService = NoSignupEmailService;
}

console.log('No-Signup Email Service loaded. No registration required!');