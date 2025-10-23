const http = require('http');
const https = require('https');
const net = require('net');

// Check if IP is internal
function isInternalIP(ip) {
    const parts = ip.split('.').map(Number);
    if (parts.length !== 4) return false;
    
    // 192.168.x.x
    if (parts[0] === 192 && parts[1] === 168) return true;
    
    // 10.x.x.x
    if (parts[0] === 10) return true;
    
    // 172.16-31.x.x
    if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true;
    
    return false;
}

// Check specific port
async function checkPort(host, port, timeout = 5000) {
    return new Promise((resolve) => {
        const startTime = Date.now();
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

// Check internal IP ports
async function checkInternalPorts(ip) {
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

// Check internal IP with HTTP requests
async function checkInternalHTTP(ip) {
    const urls = [
        `http://${ip}`,
        `http://${ip}:8080`,
        `http://${ip}:3000`
    ];
    
    const httpChecks = urls.map(url => checkHttpEndpointWithTimeout(url, 1000));
    
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

// Check internal IP with multiple methods
async function checkInternalIP(ip) {
    console.log(`내부 IP ${ip} 체크 시작...`);
    
    const methods = [
        checkInternalPorts(ip),
        checkInternalHTTP(ip)
    ];
    
    try {
        const result = await Promise.race(methods);
        if (result.isOnline) {
            console.log(`내부 IP ${ip} 온라인으로 감지됨:`, result);
            return result;
        }
        
        console.log(`내부 IP ${ip} 오프라인으로 감지됨`);
        return { isOnline: false, responseTime: null };
        
    } catch (error) {
        console.log(`내부 IP ${ip} 체크 중 오류:`, error.message);
        return { isOnline: false, responseTime: null };
    }
}

// Test function
async function testInternalIPs() {
    const testIPs = [
        '192.168.1.555',  // 존재하지 않는 IP
        '192.168.1.888',  // 존재하지 않는 IP
        '192.168.1.999',  // 존재하지 않는 IP
        '192.168.1.200',  // 존재하지 않는 IP
        '8.8.8.8',        // 외부 IP (Google DNS)
        '172.30.0.1'      // 게이트웨이 IP
    ];
    
    for (const ip of testIPs) {
        console.log(`\n=== ${ip} 테스트 ===`);
        console.log(`내부 IP 여부: ${isInternalIP(ip)}`);
        
        if (isInternalIP(ip)) {
            const result = await checkInternalIP(ip);
            console.log(`최종 결과: ${result.isOnline ? '온라인' : '오프라인'}`);
        } else {
            console.log('외부 IP이므로 내부 IP 체크 건너뜀');
        }
    }
}

// Run test
testInternalIPs().catch(console.error);