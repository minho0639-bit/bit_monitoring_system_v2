const http = require('http');
const https = require('https');
const { URL } = require('url');

// HTTP-based ping function (alternative to ICMP ping)
async function pingHost(host) {
    const startTime = Date.now();
    
    try {
        console.log(`Checking ${host.name} (${host.ip_address})...`);
        
        // Try different methods based on the input
        let isOnline = false;
        let responseTime = null;
        
        // Method 1: Try HTTP/HTTPS if it looks like a URL
        if (host.ip_address.includes('http://') || host.ip_address.includes('https://')) {
            const result = await checkHttpEndpoint(host.ip_address);
            isOnline = result.isOnline;
            responseTime = result.responseTime;
        }
        // Method 2: Try common web ports for IP addresses
        else if (isValidIP(host.ip_address)) {
            const result = await checkIPAddress(host.ip_address);
            isOnline = result.isOnline;
            responseTime = result.responseTime;
        }
        // Method 3: Try as domain name
        else {
            const result = await checkDomain(host.ip_address);
            isOnline = result.isOnline;
            responseTime = result.responseTime;
        }
        
        const totalTime = Date.now() - startTime;
        
        console.log(`Check result for ${host.name}:`, {
            alive: isOnline,
            time: responseTime || totalTime,
            method: 'HTTP-based'
        });
        
        return {
            host_id: host.id,
            is_online: isOnline,
            response_time: responseTime || totalTime,
            timestamp: new Date().toISOString()
        };
        
    } catch (error) {
        console.error(`Check failed for ${host.name}:`, error);
        return {
            host_id: host.id,
            is_online: false,
            response_time: null,
            timestamp: new Date().toISOString()
        };
    }
}

// Check HTTP/HTTPS endpoint
async function checkHttpEndpoint(url) {
    return new Promise((resolve) => {
        const startTime = Date.now();
        const isHttps = url.startsWith('https://');
        const client = isHttps ? https : http;
        
        const req = client.get(url, { timeout: 10000 }, (res) => {
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

// Check IP address on common ports
async function checkIPAddress(ip) {
    const ports = [80, 443, 22, 21, 25, 53, 110, 143, 993, 995];
    
    for (const port of ports) {
        try {
            const result = await checkPort(ip, port);
            if (result.isOnline) {
                return result;
            }
        } catch (error) {
            // Continue to next port
        }
    }
    
    return { isOnline: false, responseTime: null };
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
async function checkPort(host, port) {
    return new Promise((resolve) => {
        const startTime = Date.now();
        const net = require('net');
        
        const socket = new net.Socket();
        
        socket.setTimeout(5000);
        
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

async function testPing() {
    console.log('🧪 HTTP-based Ping 테스트 시작...\n');

    const testHosts = [
        { id: 1, name: 'Google', ip_address: 'https://www.google.com' },
        { id: 2, name: 'GitHub', ip_address: 'https://github.com' },
        { id: 3, name: 'Invalid Domain', ip_address: 'https://invalid-domain-that-does-not-exist.com' },
        { id: 4, name: 'Google DNS', ip_address: '8.8.8.8' },
        { id: 5, name: 'Cloudflare DNS', ip_address: '1.1.1.1' },
        { id: 6, name: 'Invalid IP', ip_address: '192.168.999.999' }
    ];

    for (const host of testHosts) {
        const result = await pingHost(host);
        console.log(`Result: ${result.is_online ? '✅ ONLINE' : '❌ OFFLINE'} - ${result.response_time || 'N/A'}ms`);
        console.log('---');
    }
}

// 실행
testPing().catch(console.error);