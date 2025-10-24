const express = require('express');
const nodemailer = require('nodemailer');
const cors = require('cors');
const bodyParser = require('body-parser');
const http = require('http');
const https = require('https');
const { URL } = require('url');
const sqlite3 = require('sqlite3').verbose();
const WebSocket = require('ws');
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');

const app = express();
const PORT = process.env.PORT || 3001;

// Promisify exec for async/await usage
const execAsync = promisify(exec);

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('.'));

// Database setup
const db = new sqlite3.Database('./network_monitor.db');

// Initialize database tables
db.serialize(() => {
    // Hosts table
    db.run(`CREATE TABLE IF NOT EXISTS hosts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        ip_address TEXT NOT NULL,
        description TEXT,
        is_active BOOLEAN DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Ping results table
    db.run(`CREATE TABLE IF NOT EXISTS ping_results (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        host_id INTEGER,
        is_online BOOLEAN,
        response_time REAL,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (host_id) REFERENCES hosts (id)
    )`);

    // Email settings table
    db.run(`CREATE TABLE IF NOT EXISTS email_settings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        smtp_server TEXT NOT NULL,
        smtp_port INTEGER NOT NULL,
        username TEXT NOT NULL,
        password TEXT NOT NULL,
        from_email TEXT NOT NULL,
        to_emails TEXT NOT NULL,
        is_active BOOLEAN DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Alerts table
    db.run(`CREATE TABLE IF NOT EXISTS alerts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        host_id INTEGER,
        alert_type TEXT NOT NULL,
        message TEXT NOT NULL,
        is_sent BOOLEAN DEFAULT 0,
        sent_at DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (host_id) REFERENCES hosts (id)
    )`);
});

// Email service configuration
let emailTransporter = null;
let emailSettings = null;

// Load email settings from database
function loadEmailSettings() {
    return new Promise((resolve, reject) => {
        db.get("SELECT * FROM email_settings WHERE is_active = 1 ORDER BY created_at DESC LIMIT 1", (err, row) => {
            if (err) {
                reject(err);
            } else if (row) {
                emailSettings = row;
                emailSettings.to_emails = JSON.parse(row.to_emails);
                
                // Create nodemailer transporter
                emailTransporter = nodemailer.createTransport({
                    host: row.smtp_server,
                    port: row.smtp_port,
                    secure: row.smtp_port === 465, // true for 465, false for other ports
                    auth: {
                        user: row.username,
                        pass: row.password
                    },
                    tls: {
                        rejectUnauthorized: false
                    }
                });
                
                console.log('Email settings loaded successfully');
                resolve(row);
            } else {
                console.log('No email settings found');
                resolve(null);
            }
        });
    });
}

// Test email configuration
async function testEmailConfiguration(settings) {
    try {
        const transporter = nodemailer.createTransport({
            host: settings.smtp_server,
            port: settings.smtp_port,
            secure: settings.smtp_port === 465,
            auth: {
                user: settings.username,
                pass: settings.password
            },
            tls: {
                rejectUnauthorized: false
            }
        });

        // Verify connection
        await transporter.verify();
        
        // Send test email
        const testEmail = {
            from: settings.from_email,
            to: settings.to_emails[0],
            subject: '[TEST] Network Monitoring System - Email Configuration Test',
            text: `This is a test email from the Network Monitoring System.

Configuration Details:
- SMTP Server: ${settings.smtp_server}
- SMTP Port: ${settings.smtp_port}
- From: ${settings.from_email}
- To: ${settings.to_emails.join(', ')}

Test completed at: ${new Date().toLocaleString('ko-KR')}

If you receive this email, your email configuration is working correctly!`,
            html: `
                <h2>Network Monitoring System - Email Test</h2>
                <p>This is a test email from the Network Monitoring System.</p>
                
                <h3>Configuration Details:</h3>
                <ul>
                    <li><strong>SMTP Server:</strong> ${settings.smtp_server}</li>
                    <li><strong>SMTP Port:</strong> ${settings.smtp_port}</li>
                    <li><strong>From:</strong> ${settings.from_email}</li>
                    <li><strong>To:</strong> ${settings.to_emails.join(', ')}</li>
                </ul>
                
                <p><strong>Test completed at:</strong> ${new Date().toLocaleString('ko-KR')}</p>
                
                <p style="color: green; font-weight: bold;">
                    ✅ If you receive this email, your email configuration is working correctly!
                </p>
            `
        };

        const info = await transporter.sendMail(testEmail);
        return { success: true, messageId: info.messageId };
        
    } catch (error) {
        console.error('Email test failed:', error);
        throw new Error(`Email test failed: ${error.message}`);
    }
}

// Send alert email
async function sendAlertEmail(hostInfo, alertMessage) {
    if (!emailTransporter || !emailSettings) {
        throw new Error('Email service not configured');
    }

    try {
        // Debug: Log host information
        console.log('Sending alert email for host:', {
            id: hostInfo.id,
            name: hostInfo.name,
            ip_address: hostInfo.ip_address,
            description: hostInfo.description
        });

        const emailContent = {
            from: emailSettings.from_email,
            to: emailSettings.to_emails.join(', '),
            subject: `[ALERT] ${hostInfo.name} (${hostInfo.ip_address}) - Network Issue`,
            text: generateEmailText(hostInfo, alertMessage),
            html: generateEmailHTML(hostInfo, alertMessage)
        };

        const info = await emailTransporter.sendMail(emailContent);
        console.log('Alert email sent successfully:', info.messageId);
        
        // Log alert to database
        db.run(
            "INSERT INTO alerts (host_id, alert_type, message, is_sent, sent_at) VALUES (?, ?, ?, ?, ?)",
            [hostInfo.id, 'network_alert', alertMessage, 1, new Date().toISOString()]
        );

        return { success: true, messageId: info.messageId };
        
    } catch (error) {
        console.error('Failed to send alert email:', error);
        
        // Log failed alert
        db.run(
            "INSERT INTO alerts (host_id, alert_type, message, is_sent) VALUES (?, ?, ?, ?)",
            [hostInfo.id, 'network_alert', alertMessage, 0]
        );
        
        throw error;
    }
}

// Generate email text content
function generateEmailText(hostInfo, alertMessage) {
    // Debug: Log host information in email template
    console.log('Generating email text for host:', {
        id: hostInfo.id,
        name: hostInfo.name,
        ip_address: hostInfo.ip_address,
        description: hostInfo.description
    });

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

// Generate email HTML content
function generateEmailHTML(hostInfo, alertMessage) {
    // Debug: Log host information in email template
    console.log('Generating email HTML for host:', {
        id: hostInfo.id,
        name: hostInfo.name,
        ip_address: hostInfo.ip_address,
        description: hostInfo.description
    });

    return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            .header { background-color: #f44336; color: white; padding: 20px; border-radius: 5px; }
            .content { margin: 20px 0; }
            .host-info { background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 10px 0; }
            .alert-message { background-color: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 5px; margin: 10px 0; }
            .footer { color: #666; font-size: 12px; margin-top: 30px; }
        </style>
    </head>
    <body>
        <div class="header">
            <h1>🚨 네트워크 모니터링 알림</h1>
        </div>
        
        <div class="content">
            <h2>호스트 정보</h2>
            <div class="host-info">
                <p><strong>이름:</strong> ${hostInfo.name}</p>
                <p><strong>IP 주소:</strong> ${hostInfo.ip_address}</p>
                <p><strong>설명:</strong> ${hostInfo.description || '없음'}</p>
            </div>
            
            <h2>알림 내용</h2>
            <div class="alert-message">
                <p><strong>${alertMessage}</strong></p>
            </div>
            
            <p><strong>발생 시간:</strong> ${new Date().toLocaleString('ko-KR')}</p>
        </div>
        
        <div class="footer">
            <p>이 알림은 네트워크 모니터링 시스템에서 자동으로 발송되었습니다.</p>
            <p>호스트 상태를 확인하고 필요한 조치를 취해주세요.</p>
            <hr>
            <p>Network Monitoring System</p>
        </div>
    </body>
    </html>
    `;
}

// Execute actual ping command
async function executePing(target) {
    return new Promise((resolve) => {
        const startTime = Date.now();
        
        // Determine ping command based on OS
        const isWindows = process.platform === 'win32';
        const pingCmd = isWindows 
            ? `ping -n 1 -w 5000 ${target}` 
            : `ping -c 1 -W 5 ${target}`;
        
        exec(pingCmd, { timeout: 10000 }, (error, stdout, stderr) => {
            const responseTime = Date.now() - startTime;
            
            if (error) {
                // Ping failed - host is offline
                resolve({
                    isOnline: false,
                    responseTime: null
                });
                return;
            }
            
            // Parse response time from ping output
            let parsedResponseTime = null;
            
            if (isWindows) {
                // Windows ping output parsing
                const timeMatch = stdout.match(/time[<=](\d+)ms/i);
                if (timeMatch) {
                    parsedResponseTime = parseInt(timeMatch[1]);
                }
            } else {
                // Unix/Linux ping output parsing
                const timeMatch = stdout.match(/time=(\d+\.?\d*)/i);
                if (timeMatch) {
                    parsedResponseTime = parseFloat(timeMatch[1]);
                }
            }
            
            // Check if ping was successful
            const isOnline = stdout.includes('bytes from') || 
                           stdout.includes('Reply from') ||
                           stdout.includes('PING') && !stdout.includes('100% packet loss');
            
            resolve({
                isOnline: isOnline,
                responseTime: parsedResponseTime || (isOnline ? responseTime : null)
            });
        });
    });
}

// Real ping function using system ping command
async function pingHost(host) {
    const startTime = Date.now();
    
    try {
        console.log(`Pinging ${host.name} (${host.ip_address})...`);
        
        const result = await executePing(host.ip_address);
        const totalTime = Date.now() - startTime;
        
        console.log(`Ping result for ${host.name}:`, {
            alive: result.isOnline,
            time: result.responseTime,
            method: 'ICMP ping'
        });
        
        return {
            host_id: host.id,
            is_online: result.isOnline,
            response_time: result.responseTime,
            timestamp: new Date().toISOString()
        };
        
    } catch (error) {
        console.error(`Ping failed for ${host.name}:`, error);
        return {
            host_id: host.id,
            is_online: false,
            response_time: null,
            timestamp: new Date().toISOString()
        };
    }
}


// Check IP address on common ports
async function checkIPAddress(ip) {
    // For internal IPs, try fewer ports with shorter timeout
    const ports = [80, 443, 22, 21, 25, 53];
    
    // Use Promise.allSettled to check multiple ports simultaneously
    const portChecks = ports.map(port => checkPort(ip, port, 2000)); // 2 second timeout
    
    try {
        const results = await Promise.allSettled(portChecks);
        
        // Find first successful connection
        for (const result of results) {
            if (result.status === 'fulfilled' && result.value.isOnline) {
                return result.value;
            }
        }
        
        return { isOnline: false, responseTime: null };
    } catch (error) {
        return { isOnline: false, responseTime: null };
    }
}

// Check domain name
async function checkDomain(domain) {
    try {
        // Try HTTP first
        const httpResult = await checkHttpEndpoint(`http://${domain}`);
        if (httpResult.isOnline) {
            return httpResult;
        }
        
        // Try HTTPS
        const httpsResult = await checkHttpEndpoint(`https://${domain}`);
        return httpsResult;
    } catch (error) {
        return { isOnline: false, responseTime: null };
    }
}

// Check specific port
async function checkPort(host, port, timeout = 5000) {
    return new Promise((resolve) => {
        const startTime = Date.now();
        const net = require('net');
        
        const socket = new net.Socket();
        
        socket.setTimeout(timeout);
        
        socket.on('connect', () => {
            const responseTime = Date.now() - startTime;
            socket.destroy();
            resolve({
                isOnline: true,
                responseTime: responseTime
            });
        });
        
        socket.on('error', () => {
            resolve({
                isOnline: false,
                responseTime: null
            });
        });
        
        socket.on('timeout', () => {
            socket.destroy();
            resolve({
                isOnline: false,
                responseTime: null
            });
        });
        
        socket.connect(port, host);
    });
}

// Validate IP address
function isValidIP(ip) {
    const ipRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
    return ipRegex.test(ip);
}

// Check if IP is internal/private
function isInternalIP(ip) {
    const parts = ip.split('.').map(Number);
    
    // 192.168.x.x
    if (parts[0] === 192 && parts[1] === 168) return true;
    
    // 10.x.x.x
    if (parts[0] === 10) return true;
    
    // 172.16.x.x - 172.31.x.x
    if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true;
    
    // 127.x.x.x (localhost)
    if (parts[0] === 127) return true;
    
    return false;
}

// Check internal IP with faster timeout and fewer ports
async function checkInternalIP(ip) {
    // For internal IPs, try multiple methods in parallel with short timeout
    const methods = [
        // Method 1: Check common ports (fastest)
        checkInternalPorts(ip),
        // Method 2: Try ARP table lookup (if available)
        checkARPTable(ip)
    ];
    
    try {
        // Use Promise.race to get the first result
        const result = await Promise.race(methods);
        if (result.isOnline) {
            return result;
        }
        
        // If no quick result, try HTTP method
        const httpResult = await checkInternalHTTP(ip);
        return httpResult;
        
    } catch (error) {
        return { isOnline: false, responseTime: null };
    }
}

// Check internal IP ports
async function checkInternalPorts(ip) {
    // Only check most common ports for internal IPs
    const ports = [80, 443, 22, 21, 23, 25, 53];
    
    const portChecks = ports.map(port => checkPort(ip, port, 200)); // 200ms timeout
    
    try {
        const results = await Promise.allSettled(portChecks);
        
        for (const result of results) {
            if (result.status === 'fulfilled' && result.value.isOnline) {
                return result.value;
            }
        }
        
        return { isOnline: false, responseTime: null };
    } catch (error) {
        return { isOnline: false, responseTime: null };
    }
}

// Check ARP table for internal IP
async function checkARPTable(ip) {
    return new Promise((resolve) => {
        const { exec } = require('child_process');
        
        // Try to find IP in ARP table
        exec(`arp -n ${ip}`, (error, stdout, stderr) => {
            if (error) {
                resolve({ isOnline: false, responseTime: null });
                return;
            }
            
            // Check if IP is in ARP table
            if (stdout.includes(ip) && !stdout.includes('incomplete')) {
                resolve({ isOnline: true, responseTime: 1 });
            } else {
                resolve({ isOnline: false, responseTime: null });
            }
        });
    });
}

// Check internal IP with HTTP requests
async function checkInternalHTTP(ip) {
    // Only check most common HTTP ports
    const urls = [
        `http://${ip}`,
        `http://${ip}:8080`,
        `http://${ip}:3000`
    ];
    
    const httpChecks = urls.map(url => checkHttpEndpointWithTimeout(url, 1000)); // 1 second timeout
    
    try {
        const results = await Promise.allSettled(httpChecks);
        
        for (const result of results) {
            if (result.status === 'fulfilled' && result.value.isOnline) {
                return result.value;
            }
        }
        
        return { isOnline: false, responseTime: null };
    } catch (error) {
        return { isOnline: false, responseTime: null };
    }
}

// Check HTTP endpoint with custom timeout
async function checkHttpEndpointWithTimeout(url, timeout = 5000) {
    return new Promise((resolve) => {
        const startTime = Date.now();
        const isHttps = url.startsWith('https://');
        const client = isHttps ? https : http;
        
        const req = client.get(url, { timeout: timeout }, (res) => {
            const responseTime = Date.now() - startTime;
            resolve({
                isOnline: res.statusCode >= 200 && res.statusCode < 400,
                responseTime: responseTime
            });
        });
        
        req.on('error', () => {
            resolve({
                isOnline: false,
                responseTime: null
            });
        });
        
        req.on('timeout', () => {
            req.destroy();
            resolve({
                isOnline: false,
                responseTime: null
            });
        });
    });
}

// Check if we should send an offline alert (avoid spam)
async function shouldSendOfflineAlert(hostId) {
    return new Promise((resolve, reject) => {
        // Check if host is still active
        db.get("SELECT is_active FROM hosts WHERE id = ?", [hostId], (err, host) => {
            if (err) {
                reject(err);
                return;
            }
            
            if (!host || !host.is_active) {
                // Host is deleted or inactive, don't send alert
                resolve(false);
                return;
            }
            
            // Check if we sent an alert recently (within last 5 minutes)
            const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
            
            db.get(
                "SELECT COUNT(*) as count FROM alerts WHERE host_id = ? AND alert_type = 'network_alert' AND is_sent = 1 AND sent_at > ?",
                [hostId, fiveMinutesAgo],
                (err, result) => {
                    if (err) {
                        reject(err);
                        return;
                    }
                    
                    // Send alert only if no alert was sent in the last 5 minutes
                    resolve(result.count === 0);
                }
            );
        });
    });
}

// Mark that an alert was sent for a host
async function markAlertSent(hostId) {
    return new Promise((resolve, reject) => {
        db.run(
            "INSERT INTO alerts (host_id, alert_type, message, is_sent, sent_at) VALUES (?, ?, ?, ?, ?)",
            [hostId, 'network_alert', 'Host offline alert sent', 1, new Date().toISOString()],
            function(err) {
                if (err) reject(err);
                else resolve(this.lastID);
            }
        );
    });
}

// Reset alert status when host comes back online
async function resetAlertStatus(hostId) {
    return new Promise((resolve, reject) => {
        // We could add a recovery alert here if needed
        // For now, just resolve (no action needed)
        resolve();
    });
}

// Monitor all hosts
async function monitorHosts() {
    try {
        const hosts = await new Promise((resolve, reject) => {
            db.all("SELECT * FROM hosts WHERE is_active = 1", (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });

        for (const host of hosts) {
            const pingResult = await pingHost(host);
            
            // Save ping result to database
            db.run(
                "INSERT INTO ping_results (host_id, is_online, response_time, timestamp) VALUES (?, ?, ?, ?)",
                [pingResult.host_id, pingResult.is_online, pingResult.response_time, pingResult.timestamp]
            );

            // Check if host went offline and send alert
            if (!pingResult.is_online) {
                // Check if we should send an alert (avoid spam)
                const shouldSendAlert = await shouldSendOfflineAlert(host.id);
                
                if (shouldSendAlert) {
                    const alertMessage = `호스트 ${host.name} (${host.ip_address})이(가) 오프라인 상태입니다.`;
                    
                    try {
                        await sendAlertEmail(host, alertMessage);
                        console.log(`Alert sent for offline host: ${host.name}`);
                        
                        // Mark that we sent an alert for this host
                        await markAlertSent(host.id);
                    } catch (emailError) {
                        console.error(`Failed to send alert for ${host.name}:`, emailError);
                    }
                } else {
                    console.log(`Skipping alert for ${host.name} - already sent recently`);
                }
            } else {
                console.log(`Host ${host.name} is online (${pingResult.response_time}ms)`);
                
                // If host came back online, reset alert status
                await resetAlertStatus(host.id);
            }
        }
    } catch (error) {
        console.error('Monitoring error:', error);
    }
}

// API Routes

// Get all hosts
app.get('/api/hosts', (req, res) => {
    db.all("SELECT * FROM hosts WHERE is_active = 1 ORDER BY created_at DESC", (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
        } else {
            res.json(rows);
        }
    });
});

// Add new host
app.post('/api/hosts', (req, res) => {
    const { name, ip_address, description } = req.body;
    
    if (!name || !ip_address) {
        return res.status(400).json({ error: 'Name and IP address are required' });
    }

    db.run(
        "INSERT INTO hosts (name, ip_address, description) VALUES (?, ?, ?)",
        [name, ip_address, description || ''],
        function(err) {
            if (err) {
                res.status(500).json({ error: err.message });
            } else {
                res.json({ id: this.lastID, name, ip_address, description });
            }
        }
    );
});

// Update host
app.put('/api/hosts/:id', (req, res) => {
    const { id } = req.params;
    const { name, ip_address, description, is_active, email_alerts } = req.body;

    // Build dynamic update query
    const updates = [];
    const values = [];
    
    if (name !== undefined) {
        updates.push('name = ?');
        values.push(name);
    }
    if (ip_address !== undefined) {
        updates.push('ip_address = ?');
        values.push(ip_address);
    }
    if (description !== undefined) {
        updates.push('description = ?');
        values.push(description);
    }
    if (is_active !== undefined) {
        updates.push('is_active = ?');
        values.push(is_active);
    }
    if (email_alerts !== undefined) {
        updates.push('email_alerts = ?');
        values.push(email_alerts ? 1 : 0);
    }
    
    updates.push('updated_at = CURRENT_TIMESTAMP');
    values.push(id);

    const query = `UPDATE hosts SET ${updates.join(', ')} WHERE id = ?`;

    db.run(query, values,
        function(err) {
            if (err) {
                res.status(500).json({ error: err.message });
            } else {
                // If host is being deactivated, clean up alerts
                if (is_active === false || is_active === 0) {
                    db.run("DELETE FROM alerts WHERE host_id = ?", [id], (err) => {
                        if (err) {
                            console.error('Error cleaning up alerts for deactivated host:', err);
                        } else {
                            console.log(`Alerts cleaned up for deactivated host ${id}`);
                        }
                    });
                }
                
                res.json({ success: true, changes: this.changes });
            }
        }
    );
});

// Delete host
app.delete('/api/hosts/:id', (req, res) => {
    const { id } = req.params;

    // First, deactivate the host
    db.run("UPDATE hosts SET is_active = 0 WHERE id = ?", [id], function(err) {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }

        // Clean up related data
        // 1. Delete ping results (optional - you might want to keep them for history)
        db.run("DELETE FROM ping_results WHERE host_id = ?", [id], (err) => {
            if (err) {
                console.error('Error deleting ping results:', err);
            }
        });

        // 2. Delete alerts
        db.run("DELETE FROM alerts WHERE host_id = ?", [id], (err) => {
            if (err) {
                console.error('Error deleting alerts:', err);
            }
        });

        console.log(`Host ${id} deleted and related data cleaned up`);
        res.json({ success: true, changes: this.changes });
    });
});

// Get ping results for a host
app.get('/api/hosts/:id/ping-results', (req, res) => {
    const { id } = req.params;
    const limit = req.query.limit || 100;

    db.all(
        "SELECT * FROM ping_results WHERE host_id = ? ORDER BY timestamp DESC LIMIT ?",
        [id, limit],
        (err, rows) => {
            if (err) {
                res.status(500).json({ error: err.message });
            } else {
                res.json(rows);
            }
        }
    );
});

// Configure email settings
app.post('/api/email/settings', async (req, res) => {
    const { smtp_server, smtp_port, username, password, from_email, to_emails, skip_test } = req.body;

    if (!smtp_server || !smtp_port || !username || !password || !from_email || !to_emails) {
        return res.status(400).json({ error: 'All email fields are required' });
    }

    const emailSettings = {
        smtp_server,
        smtp_port: parseInt(smtp_port),
        username,
        password,
        from_email,
        to_emails: Array.isArray(to_emails) ? to_emails : [to_emails]
    };

    try {
        // Test email configuration (unless skipped)
        if (!skip_test) {
            await testEmailConfiguration(emailSettings);
        }

        // Save to database
        db.run(
            "INSERT INTO email_settings (smtp_server, smtp_port, username, password, from_email, to_emails, is_active) VALUES (?, ?, ?, ?, ?, ?, ?)",
            [smtp_server, smtp_port, username, password, from_email, JSON.stringify(emailSettings.to_emails), 1],
            function(err) {
                if (err) {
                    res.status(500).json({ error: err.message });
                } else {
                    // Reload email settings
                    loadEmailSettings().then(() => {
                        res.json({ success: true, message: 'Email settings saved and tested successfully' });
                    });
                }
            }
        );
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// Test email configuration
app.post('/api/email/test', async (req, res) => {
    const { smtp_server, smtp_port, username, password, from_email, to_emails } = req.body;

    if (!smtp_server || !smtp_port || !username || !password || !from_email || !to_emails) {
        return res.status(400).json({ error: 'All email fields are required' });
    }

    const emailSettings = {
        smtp_server,
        smtp_port: parseInt(smtp_port),
        username,
        password,
        from_email,
        to_emails: Array.isArray(to_emails) ? to_emails : [to_emails]
    };

    try {
        const result = await testEmailConfiguration(emailSettings);
        res.json({ success: true, message: 'Test email sent successfully', messageId: result.messageId });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// Get email settings
app.get('/api/email/settings', (req, res) => {
    db.get("SELECT * FROM email_settings WHERE is_active = 1 ORDER BY created_at DESC LIMIT 1", (err, row) => {
        if (err) {
            res.status(500).json({ error: err.message });
        } else if (row) {
            const settings = { ...row };
            settings.to_emails = JSON.parse(row.to_emails);
            delete settings.password; // Don't send password back
            res.json(settings);
        } else {
            res.json(null);
        }
    });
});

// Get alerts
app.get('/api/alerts', (req, res) => {
    const limit = req.query.limit || 50;
    
    db.all(`
        SELECT a.*, h.name as host_name, h.ip_address 
        FROM alerts a 
        LEFT JOIN hosts h ON a.host_id = h.id 
        ORDER BY a.created_at DESC 
        LIMIT ?
    `, [limit], (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
        } else {
            res.json(rows);
        }
    });
});

// Clear alerts for a specific host
app.delete('/api/hosts/:id/alerts', (req, res) => {
    const { id } = req.params;
    
    db.run("DELETE FROM alerts WHERE host_id = ?", [id], function(err) {
        if (err) {
            res.status(500).json({ error: err.message });
        } else {
            console.log(`Cleared ${this.changes} alerts for host ${id}`);
            res.json({ success: true, cleared: this.changes });
        }
    });
});

// Clear all alerts
app.delete('/api/alerts', (req, res) => {
    db.run("DELETE FROM alerts", function(err) {
        if (err) {
            res.status(500).json({ error: err.message });
        } else {
            console.log(`Cleared all ${this.changes} alerts`);
            res.json({ success: true, cleared: this.changes });
        }
    });
});

// Manual ping test
app.post('/api/ping/:id', async (req, res) => {
    const { id } = req.params;
    
    db.get("SELECT * FROM hosts WHERE id = ? AND is_active = 1", [id], async (err, host) => {
        if (err) {
            res.status(500).json({ error: err.message });
        } else if (!host) {
            res.status(404).json({ error: 'Host not found' });
        } else {
            try {
                const pingResult = await pingHost(host);
                
                // Save result to database
                db.run(
                    "INSERT INTO ping_results (host_id, is_online, response_time, timestamp) VALUES (?, ?, ?, ?)",
                    [pingResult.host_id, pingResult.is_online, pingResult.response_time, pingResult.timestamp]
                );
                
                res.json(pingResult);
            } catch (error) {
                res.status(500).json({ error: error.message });
            }
        }
    });
});

// Serve main page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Start monitoring interval (every 30 seconds)
setInterval(monitorHosts, 30000);

// Load email settings on startup
loadEmailSettings().then(() => {
    console.log('Email settings loaded');
}).catch(err => {
    console.error('Failed to load email settings:', err);
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 Network Monitoring System running on port ${PORT}`);
    console.log(`📧 Email service: ${emailTransporter ? 'Configured' : 'Not configured'}`);
    console.log(`⏰ Monitoring interval: 30 seconds`);
});

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down server...');
    db.close((err) => {
        if (err) {
            console.error('Error closing database:', err);
        } else {
            console.log('Database connection closed.');
        }
        process.exit(0);
    });
});