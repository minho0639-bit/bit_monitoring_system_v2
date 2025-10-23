// Test email template generation for GitHub host
const testHost = {
    id: 2,
    name: "GitHub",
    ip_address: "https://github.com",
    description: "GitHub 홈페이지 테스트"
};

const alertMessage = `호스트 ${testHost.name} (${testHost.ip_address})이(가) 오프라인 상태입니다.`;

// Generate email text content (same as server.js)
function generateEmailText(hostInfo, alertMessage) {
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

console.log('🧪 GitHub 호스트 이메일 템플릿 테스트\n');

console.log('📧 텍스트 이메일 내용:');
console.log('='.repeat(50));
console.log(generateEmailText(testHost, alertMessage));
console.log('='.repeat(50));

console.log('\n✅ GitHub 호스트 테스트 완료!');