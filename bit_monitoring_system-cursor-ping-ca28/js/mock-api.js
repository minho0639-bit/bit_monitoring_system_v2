// Mock API Service for Network Monitoring System
// This provides local storage-based data persistence for demo purposes

class MockAPIService {
    constructor() {
        this.initializeStorage();
        this.setupFetchInterceptor();
    }

    initializeStorage() {
        // Initialize hosts if not exists
        if (!localStorage.getItem('network_monitor_hosts')) {
            localStorage.setItem('network_monitor_hosts', JSON.stringify([]));
        }

        // Initialize email settings if not exists
        if (!localStorage.getItem('network_monitor_email_settings')) {
            localStorage.setItem('network_monitor_email_settings', JSON.stringify([]));
        }

        // Initialize monitoring logs if not exists
        if (!localStorage.getItem('network_monitor_logs')) {
            localStorage.setItem('network_monitor_logs', JSON.stringify([]));
        }
    }

    // Generate unique ID
    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    // Get hosts
    getHosts() {
        const hosts = JSON.parse(localStorage.getItem('network_monitor_hosts') || '[]');
        return { data: hosts };
    }

    // Add host
    addHost(hostData) {
        try {
            // Validate required fields
            if (!hostData.name || !hostData.ip_address) {
                throw new Error('호스트명과 IP 주소는 필수입니다.');
            }

            // Validate IP format
            const ipRegex = /^((25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
            if (!ipRegex.test(hostData.ip_address)) {
                throw new Error('올바른 IP 주소 형식이 아닙니다.');
            }

            const hosts = JSON.parse(localStorage.getItem('network_monitor_hosts') || '[]');
            
            // Check for duplicate IP
            if (hosts.some(host => host.ip_address === hostData.ip_address)) {
                throw new Error('이미 등록된 IP 주소입니다.');
            }

            const newHost = {
                id: this.generateId(),
                ...hostData,
                created_at: Date.now(),
                updated_at: Date.now()
            };
            
            hosts.push(newHost);
            localStorage.setItem('network_monitor_hosts', JSON.stringify(hosts));
            
            console.log('Host added successfully:', newHost);
            return newHost;
        } catch (error) {
            console.error('Error adding host:', error);
            throw error;
        }
    }

    // Update host
    updateHost(hostId, updateData) {
        const hosts = JSON.parse(localStorage.getItem('network_monitor_hosts') || '[]');
        const hostIndex = hosts.findIndex(h => h.id === hostId);
        
        if (hostIndex === -1) {
            throw new Error('Host not found');
        }

        hosts[hostIndex] = {
            ...hosts[hostIndex],
            ...updateData,
            updated_at: Date.now()
        };

        localStorage.setItem('network_monitor_hosts', JSON.stringify(hosts));
        return hosts[hostIndex];
    }

    // Delete host
    deleteHost(hostId) {
        const hosts = JSON.parse(localStorage.getItem('network_monitor_hosts') || '[]');
        const filteredHosts = hosts.filter(h => h.id !== hostId);
        localStorage.setItem('network_monitor_hosts', JSON.stringify(filteredHosts));
        return { success: true };
    }

    // Get email settings
    getEmailSettings() {
        const settings = JSON.parse(localStorage.getItem('network_monitor_email_settings') || '[]');
        return { data: settings };
    }

    // Save email settings
    saveEmailSettings(settingsData) {
        try {
            // Validate required fields
            if (!settingsData.smtp_server) {
                throw new Error('SMTP 서버 주소가 필요합니다.');
            }
            if (!settingsData.smtp_port || isNaN(settingsData.smtp_port)) {
                throw new Error('올바른 SMTP 포트 번호가 필요합니다.');
            }
            if (!settingsData.username) {
                throw new Error('사용자명(이메일)이 필요합니다.');
            }
            if (!settingsData.from_email) {
                throw new Error('발신자 이메일이 필요합니다.');
            }
            if (!settingsData.to_emails || !Array.isArray(settingsData.to_emails) || settingsData.to_emails.length === 0) {
                throw new Error('최소 하나의 수신자 이메일이 필요합니다.');
            }

            // Validate email formats
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(settingsData.username)) {
                throw new Error('올바른 사용자 이메일 형식이 아닙니다.');
            }
            if (!emailRegex.test(settingsData.from_email)) {
                throw new Error('올바른 발신자 이메일 형식이 아닙니다.');
            }
            for (const email of settingsData.to_emails) {
                if (!emailRegex.test(email)) {
                    throw new Error(`올바르지 않은 수신자 이메일: ${email}`);
                }
            }

            const settings = JSON.parse(localStorage.getItem('network_monitor_email_settings') || '[]');
            
            if (settings.length > 0) {
                // Update existing
                settings[0] = {
                    ...settings[0],
                    ...settingsData,
                    id: settings[0].id || this.generateId(),
                    updated_at: Date.now()
                };
            } else {
                // Create new
                settings.push({
                    id: this.generateId(),
                    ...settingsData,
                    created_at: Date.now(),
                    updated_at: Date.now()
                });
            }

            localStorage.setItem('network_monitor_email_settings', JSON.stringify(settings));
            console.log('Email settings saved successfully:', settings[0]);
            return settings[0];
        } catch (error) {
            console.error('Error saving email settings:', error);
            throw error;
        }
    }

    // Update email settings
    updateEmailSettings(settingsId, updateData) {
        const settings = JSON.parse(localStorage.getItem('network_monitor_email_settings') || '[]');
        const settingIndex = settings.findIndex(s => s.id === settingsId);
        
        if (settingIndex === -1) {
            // Create new if not found
            return this.saveEmailSettings(updateData);
        }

        settings[settingIndex] = {
            ...settings[settingIndex],
            ...updateData,
            updated_at: Date.now()
        };

        localStorage.setItem('network_monitor_email_settings', JSON.stringify(settings));
        return settings[settingIndex];
    }

    // Add monitoring log
    addMonitoringLog(logData) {
        const logs = JSON.parse(localStorage.getItem('network_monitor_logs') || '[]');
        const newLog = {
            id: this.generateId(),
            ...logData,
            created_at: Date.now()
        };
        
        logs.unshift(newLog); // Add to beginning
        
        // Keep only last 1000 logs
        if (logs.length > 1000) {
            logs.splice(1000);
        }
        
        localStorage.setItem('network_monitor_logs', JSON.stringify(logs));
        return newLog;
    }

    // Setup fetch interceptor to handle API calls
    setupFetchInterceptor() {
        const originalFetch = window.fetch;
        
        window.fetch = async (url, options = {}) => {
            // Check if it's our API call
            if (typeof url === 'string' && url.startsWith('tables/')) {
                return this.handleAPICall(url, options);
            }
            
            // For other requests, use original fetch
            return originalFetch(url, options);
        };
    }

    async handleAPICall(url, options) {
        const method = options.method || 'GET';
        const urlParts = url.split('/');
        const table = urlParts[1];
        const id = urlParts[2];

        console.log('Mock API Call:', { method, table, id, options });

        try {
            let result;

            switch (table) {
                case 'hosts':
                    result = this.handleHostsAPI(method, id, options);
                    break;
                case 'email_settings':
                    result = this.handleEmailSettingsAPI(method, id, options);
                    break;
                case 'monitoring_logs':
                    result = this.handleMonitoringLogsAPI(method, id, options);
                    break;
                default:
                    throw new Error(`Unknown table: ${table}`);
            }

            // Simulate network delay
            await new Promise(resolve => setTimeout(resolve, 100 + Math.random() * 200));

            return new Response(JSON.stringify(result), {
                status: 200,
                headers: { 'Content-Type': 'application/json' }
            });

        } catch (error) {
            console.error('Mock API Error:', error);
            
            // Determine appropriate status code
            let statusCode = 400;
            if (error.message.includes('찾을 수 없')) {
                statusCode = 404;
            } else if (error.message.includes('이미 등록된')) {
                statusCode = 409; // Conflict
            }
            
            return new Response(JSON.stringify({ 
                error: error.message,
                details: error.stack,
                timestamp: new Date().toISOString()
            }), {
                status: statusCode,
                statusText: error.message,
                headers: { 'Content-Type': 'application/json' }
            });
        }
    }

    handleHostsAPI(method, id, options) {
        switch (method) {
            case 'GET':
                return this.getHosts();
            case 'POST':
                const hostData = JSON.parse(options.body);
                return this.addHost(hostData);
            case 'PATCH':
                const updateData = JSON.parse(options.body);
                return this.updateHost(id, updateData);
            case 'DELETE':
                return this.deleteHost(id);
            default:
                throw new Error(`Unsupported method: ${method}`);
        }
    }

    handleEmailSettingsAPI(method, id, options) {
        switch (method) {
            case 'GET':
                return this.getEmailSettings();
            case 'POST':
                const settingsData = JSON.parse(options.body);
                return this.saveEmailSettings(settingsData);
            case 'PUT':
                const updateData = JSON.parse(options.body);
                return this.updateEmailSettings(id, updateData);
            default:
                throw new Error(`Unsupported method: ${method}`);
        }
    }

    handleMonitoringLogsAPI(method, id, options) {
        switch (method) {
            case 'POST':
                const logData = JSON.parse(options.body);
                return this.addMonitoringLog(logData);
            default:
                throw new Error(`Unsupported method: ${method}`);
        }
    }

    // Utility method to clear all data (for testing)
    clearAllData() {
        localStorage.removeItem('network_monitor_hosts');
        localStorage.removeItem('network_monitor_email_settings');
        localStorage.removeItem('network_monitor_logs');
        this.initializeStorage();
    }

    // Export data for backup
    exportData() {
        return {
            hosts: JSON.parse(localStorage.getItem('network_monitor_hosts') || '[]'),
            email_settings: JSON.parse(localStorage.getItem('network_monitor_email_settings') || '[]'),
            monitoring_logs: JSON.parse(localStorage.getItem('network_monitor_logs') || '[]'),
            exported_at: new Date().toISOString()
        };
    }

    // Import data from backup
    importData(data) {
        if (data.hosts) {
            localStorage.setItem('network_monitor_hosts', JSON.stringify(data.hosts));
        }
        if (data.email_settings) {
            localStorage.setItem('network_monitor_email_settings', JSON.stringify(data.email_settings));
        }
        if (data.monitoring_logs) {
            localStorage.setItem('network_monitor_logs', JSON.stringify(data.monitoring_logs));
        }
    }
}

// Initialize the mock API service
window.mockAPI = new MockAPIService();

console.log('Mock API Service initialized. Data will be stored in localStorage.');
console.log('Available methods:', {
    'clearAllData()': 'Clear all stored data',
    'exportData()': 'Export all data as JSON',
    'importData(data)': 'Import data from JSON'
});

// Add global debug functions
window.debugNetworkMonitor = {
    clearData: () => window.mockAPI.clearAllData(),
    exportData: () => window.mockAPI.exportData(),
    importData: (data) => window.mockAPI.importData(data),
    showStoredData: () => {
        console.log('Stored Hosts:', JSON.parse(localStorage.getItem('network_monitor_hosts') || '[]'));
        console.log('Stored Email Settings:', JSON.parse(localStorage.getItem('network_monitor_email_settings') || '[]'));
        console.log('Stored Logs:', JSON.parse(localStorage.getItem('network_monitor_logs') || '[]'));
    }
};