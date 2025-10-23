const ping = require('ping');

async function testPing() {
    console.log('🧪 Ping 테스트 시작...\n');

    const testHosts = [
        { name: 'Google DNS', ip: '8.8.8.8' },
        { name: 'Cloudflare DNS', ip: '1.1.1.1' },
        { name: 'Invalid IP', ip: '192.168.999.999' },
        { name: 'Localhost', ip: '127.0.0.1' }
    ];

    for (const host of testHosts) {
        try {
            console.log(`Pinging ${host.name} (${host.ip})...`);
            
            const result = await ping.promise.probe(host.ip, {
                timeout: 10,
                extra: ['-c', '1']
            });
            
            console.log(`✅ ${host.name}:`, {
                alive: result.alive,
                time: result.time,
                output: result.output ? result.output.substring(0, 100) + '...' : 'No output'
            });
            
        } catch (error) {
            console.log(`❌ ${host.name}: Error - ${error.message}`);
        }
        
        console.log('---');
    }
}

// 실행
testPing().catch(console.error);