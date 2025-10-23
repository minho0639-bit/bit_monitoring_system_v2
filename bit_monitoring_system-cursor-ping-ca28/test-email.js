const nodemailer = require('nodemailer');

// Gmail SMTP 설정 테스트
async function testGmailSMTP() {
    console.log('🧪 Gmail SMTP 테스트 시작...\n');

    // Gmail SMTP 설정
    const gmailConfig = {
        host: 'smtp.gmail.com',
        port: 587,
        secure: false, // 587 포트는 TLS 사용
        auth: {
            user: 'your-email@gmail.com', // 실제 Gmail 주소로 변경
            pass: 'your-app-password'     // 앱 비밀번호로 변경
        },
        tls: {
            rejectUnauthorized: false
        }
    };

    try {
        // 1. 연결 테스트
        console.log('1️⃣ SMTP 연결 테스트...');
        const transporter = nodemailer.createTransport(gmailConfig);
        
        await transporter.verify();
        console.log('✅ SMTP 연결 성공!\n');

        // 2. 이메일 발송 테스트
        console.log('2️⃣ 테스트 이메일 발송...');
        
        const testEmail = {
            from: gmailConfig.auth.user,
            to: gmailConfig.auth.user, // 자신에게 발송
            subject: '[TEST] Network Monitoring System - Gmail SMTP Test',
            text: `
Gmail SMTP 테스트 이메일

이 이메일은 네트워크 모니터링 시스템의 Gmail SMTP 설정이 정상적으로 작동하는지 확인하기 위해 발송되었습니다.

설정 정보:
- SMTP 서버: smtp.gmail.com
- 포트: 587
- 보안: TLS
- 발송 시간: ${new Date().toLocaleString('ko-KR')}

✅ Gmail SMTP 설정이 정상적으로 작동합니다!

---
Network Monitoring System
            `,
            html: `
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="UTF-8">
                    <style>
                        body { font-family: Arial, sans-serif; margin: 20px; }
                        .header { background-color: #4CAF50; color: white; padding: 20px; border-radius: 5px; }
                        .content { margin: 20px 0; }
                        .success { color: #4CAF50; font-weight: bold; }
                    </style>
                </head>
                <body>
                    <div class="header">
                        <h1>🧪 Gmail SMTP 테스트 이메일</h1>
                    </div>
                    
                    <div class="content">
                        <p>이 이메일은 네트워크 모니터링 시스템의 Gmail SMTP 설정이 정상적으로 작동하는지 확인하기 위해 발송되었습니다.</p>
                        
                        <h3>설정 정보:</h3>
                        <ul>
                            <li><strong>SMTP 서버:</strong> smtp.gmail.com</li>
                            <li><strong>포트:</strong> 587</li>
                            <li><strong>보안:</strong> TLS</li>
                            <li><strong>발송 시간:</strong> ${new Date().toLocaleString('ko-KR')}</li>
                        </ul>
                        
                        <p class="success">✅ Gmail SMTP 설정이 정상적으로 작동합니다!</p>
                    </div>
                    
                    <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; color: #666;">
                        <p>Network Monitoring System</p>
                    </div>
                </body>
                </html>
            `
        };

        const info = await transporter.sendMail(testEmail);
        console.log('✅ 테스트 이메일 발송 성공!');
        console.log(`📧 메시지 ID: ${info.messageId}\n`);

        console.log('🎉 Gmail SMTP 설정이 완벽하게 작동합니다!');
        console.log('\n📋 다음 단계:');
        console.log('1. server.js에서 실제 Gmail 계정 정보로 설정 변경');
        console.log('2. npm start로 서버 실행');
        console.log('3. 웹 브라우저에서 http://localhost:3000 접속');
        console.log('4. 호스트 추가 후 모니터링 시작');

    } catch (error) {
        console.error('❌ Gmail SMTP 테스트 실패:', error.message);
        console.log('\n🔧 문제 해결 방법:');
        
        if (error.code === 'EAUTH') {
            console.log('1. Gmail 계정에서 2단계 인증이 활성화되어 있는지 확인');
            console.log('2. 앱 비밀번호를 생성했는지 확인');
            console.log('3. 사용자명과 비밀번호가 올바른지 확인');
        } else if (error.code === 'ECONNECTION') {
            console.log('1. 인터넷 연결 상태 확인');
            console.log('2. 방화벽에서 587 포트가 차단되지 않았는지 확인');
        } else {
            console.log('1. Gmail 계정 설정 확인');
            console.log('2. 앱 비밀번호 재생성');
            console.log('3. 네트워크 연결 상태 확인');
        }
        
        console.log('\n📖 Gmail 앱 비밀번호 생성 방법:');
        console.log('1. Google 계정 설정 → 보안');
        console.log('2. 2단계 인증 활성화');
        console.log('3. 앱 비밀번호 생성');
        console.log('4. "메일" 앱 선택');
        console.log('5. 생성된 16자리 비밀번호 사용');
    }
}

// 실행
if (require.main === module) {
    testGmailSMTP();
}

module.exports = { testGmailSMTP };