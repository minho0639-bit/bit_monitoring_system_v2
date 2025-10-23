// Simple Storage Service for Network Monitoring System
// Direct localStorage operations without fetch API simulation

class StorageService {
    constructor() {
        this.initializeStorage();
        console.log('Storage Service initialized');
    }

    initializeStorage() {
        // Initialize hosts if not exists
        if (!localStorage.getItem('network_monitor_hosts')) {
            localStorage.setItem('network_monitor_hosts', JSON.stringify([]));
        }

        // Initialize email settings if not exists
        if (!localStorage.getItem('network_monitor_email_settings')) {
            localStorage.setItem('network_monitor_email_settings', JSON.stringify(null));
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

    // Host operations
    getHosts() {
        try {
            const hosts = JSON.parse(localStorage.getItem('network_monitor_hosts') || '[]');
            console.log('Loaded hosts:', hosts);
            return hosts;
        } catch (error) {
            console.error('Error loading hosts:', error);
            return [];
        }
    }

    addHost(hostData) {
        try {
            console.log('Adding host:', hostData);

            // Validate required fields
            if (!hostData.name || !hostData.ip_address) {
                throw new Error('호스트명과 IP 주소는 필수입니다.');
            }

            // Validate IP format
            const ipRegex = /^((25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
            if (!ipRegex.test(hostData.ip_address)) {
                throw new Error('올바른 IP 주소 형식이 아닙니다.');
            }

            const hosts = this.getHosts();
            
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

    updateHost(hostId, updateData) {
        try {
            const hosts = this.getHosts();
            const hostIndex = hosts.findIndex(h => h.id === hostId);
            
            if (hostIndex === -1) {
                throw new Error('호스트를 찾을 수 없습니다.');
            }

            hosts[hostIndex] = {
                ...hosts[hostIndex],
                ...updateData,
                updated_at: Date.now()
            };

            localStorage.setItem('network_monitor_hosts', JSON.stringify(hosts));
            console.log('Host updated successfully:', hosts[hostIndex]);
            return hosts[hostIndex];
        } catch (error) {
            console.error('Error updating host:', error);
            throw error;
        }
    }

    deleteHost(hostId) {
        try {
            const hosts = this.getHosts();
            const filteredHosts = hosts.filter(h => h.id !== hostId);
            localStorage.setItem('network_monitor_hosts', JSON.stringify(filteredHosts));
            console.log('Host deleted successfully:', hostId);
            return true;
        } catch (error) {
            console.error('Error deleting host:', error);
            throw error;
        }
    }

    // Email settings operations
    getEmailSettings() {
        try {
            const settings = JSON.parse(localStorage.getItem('network_monitor_email_settings') || 'null');
            console.log('Loaded email settings:', settings);
            return settings;
        } catch (error) {
            console.error('Error loading email settings:', error);
            return null;
        }
    }

    saveEmailSettings(settingsData) {
        try {
            console.log('Saving email settings:', settingsData);

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

            const existingSettings = this.getEmailSettings();
            
            const newSettings = {
                id: existingSettings?.id || this.generateId(),
                ...settingsData,
                created_at: existingSettings?.created_at || Date.now(),
                updated_at: Date.now()
            };

            localStorage.setItem('network_monitor_email_settings', JSON.stringify(newSettings));
            console.log('Email settings saved successfully:', newSettings);
            return newSettings;
        } catch (error) {
            console.error('Error saving email settings:', error);
            throw error;
        }
    }

    // Monitoring logs operations
    addMonitoringLog(logData) {
        try {
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
        } catch (error) {
            console.error('Error adding monitoring log:', error);
            throw error;
        }
    }

    // Utility methods
    clearAllData() {
        localStorage.removeItem('network_monitor_hosts');
        localStorage.removeItem('network_monitor_email_settings');
        localStorage.removeItem('network_monitor_logs');
        this.initializeStorage();
        console.log('All data cleared');
    }

    exportData() {
        return {
            hosts: this.getHosts(),
            email_settings: this.getEmailSettings(),
            monitoring_logs: JSON.parse(localStorage.getItem('network_monitor_logs') || '[]'),
            exported_at: new Date().toISOString()
        };
    }

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
        console.log('Data imported successfully');
    }
}

// Initialize the storage service
window.storageService = new StorageService();

// Add global debug functions
window.debugNetworkMonitor = {
    clearData: () => window.storageService.clearAllData(),
    exportData: () => window.storageService.exportData(),
    importData: (data) => window.storageService.importData(data),
    showStoredData: () => {
        console.log('Stored Hosts:', window.storageService.getHosts());
        console.log('Stored Email Settings:', window.storageService.getEmailSettings());
        console.log('Stored Logs:', JSON.parse(localStorage.getItem('network_monitor_logs') || '[]'));
    }
};

console.log('Storage Service ready. Use debugNetworkMonitor.showStoredData() to inspect data.');