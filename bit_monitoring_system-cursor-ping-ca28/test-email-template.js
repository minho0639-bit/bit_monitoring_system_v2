// Test email template generation
const http = require('http');

// Test host data (same as database)
const testHost = {
    id: 3,
    name: "Invalid Test",
    ip_address: "https://invalid-domain-that-does-not-exist.com",
    description: "존재하지 않는 도메인 테스트"
};

const alertMessage = `호스트 ${testHost.name} (${testHost.ip_address})이(가) 오프라인 상태입니다.`;

// Generate email text content (same as server.js)
function generateEmailText(hostInfo, alertMessage) {
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

// Generate email HTML content (same as server.js)
function generateEmailHTML(hostInfo, alertMessage) {
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

console.log('🧪 이메일 템플릿 테스트 시작...\n');

console.log('📧 텍스트 이메일 내용:');
console.log('='.repeat(50));
console.log(generateEmailText(testHost, alertMessage));
console.log('='.repeat(50));

console.log('\n🌐 HTML 이메일 내용:');
console.log('='.repeat(50));
console.log(generateEmailHTML(testHost, alertMessage));
console.log('='.repeat(50));

console.log('\n✅ 테스트 완료!');