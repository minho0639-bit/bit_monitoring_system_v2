# EmailJS 설정 가이드

네트워크 모니터링 시스템에서 실제 이메일을 발송하기 위한 EmailJS 설정 방법입니다.

## 📧 EmailJS란?

EmailJS는 브라우저에서 직접 이메일을 발송할 수 있게 해주는 서비스입니다. 별도의 백엔드 서버 없이도 실제 이메일을 보낼 수 있습니다.

## 🚀 설정 단계

### 1단계: EmailJS 계정 생성

1. [EmailJS.com](https://www.emailjs.com)에 접속
2. "Sign Up" 클릭하여 무료 계정 생성
3. 이메일 인증 완료

### 2단계: 이메일 서비스 연결

1. EmailJS 대시보드에서 "Email Services" 선택
2. "Add New Service" 클릭
3. 사용할 이메일 서비스 선택:
   - **Gmail**: 가장 일반적, 앱 비밀번호 필요
   - **Outlook**: Microsoft 계정 사용
   - **Yahoo**: Yahoo 메일 계정 사용
   - **기타**: SMTP 설정 직접 입력

#### Gmail 설정 예시:
```
Service ID: gmail
Service Name: Gmail
User ID: your-email@gmail.com
Access Token: 앱 비밀번호 (2단계 인증 필요)
```

### 3단계: 이메일 템플릿 생성

1. "Email Templates" 메뉴 선택
2. "Create New Template" 클릭
3. 템플릿 내용 작성:

```html
Subject: {{subject}}

네트워크 모니터링 알림

호스트 정보:
- 이름: {{host_name}}
- IP 주소: {{host_ip}}
- 설명: {{host_description}}

알림 내용: {{alert_message}}

발생 시간: {{timestamp}}

이 알림은 {{from_name}}에서 자동으로 발송되었습니다.

---
Network Monitoring System
```

4. 템플릿 저장 (Template ID 기록)

### 4단계: Public Key 확인

1. "Account" 메뉴에서 "General" 탭 선택
2. "Public Key" 복사 (user_xxxxxxxxxxxxxxxx 형태)

### 5단계: 네트워크 모니터링 시스템에 설정

1. 시스템에서 "설정" 버튼 클릭
2. "EmailJS 설정" 섹션에 다음 정보 입력:
   - **Service ID**: 2단계에서 생성한 서비스 ID
   - **Template ID**: 3단계에서 생성한 템플릿 ID  
   - **Public Key**: 4단계에서 복사한 Public Key

3. "EmailJS 설정 저장" 버튼 클릭
4. "테스트 발송" 버튼으로 동작 확인

## 📋 설정 예시

```
Service ID: service_abc123
Template ID: template_xyz789
Public Key: user_abcdefghijklmnop
```

## 🔧 Gmail 앱 비밀번호 생성 방법

Gmail을 사용하는 경우 앱 비밀번호가 필요합니다:

1. Google 계정 설정으로 이동
2. "보안" 탭 선택
3. "2단계 인증" 활성화 (필수)
4. "앱 비밀번호" 생성
5. "메일" 앱 선택
6. 생성된 16자리 비밀번호를 EmailJS 설정에 사용

## ⚠️ 주의사항

1. **무료 계정 제한**: 월 200개 이메일까지 무료
2. **보안**: Public Key는 공개되어도 안전하지만, Private Key는 절대 노출 금지
3. **템플릿 변수**: 시스템에서 전송하는 변수명과 템플릿의 변수명이 일치해야 함

## 🔗 대안 방법

### 웹훅 사용 (Zapier, IFTTT)

EmailJS 대신 웹훅을 사용할 수도 있습니다:

1. **Zapier**:
   - Webhook 트리거 생성
   - Gmail/Outlook 액션 연결
   - 웹훅 URL을 시스템에 설정

2. **IFTTT**:
   - Webhook 서비스 연결
   - Email 액션 설정
   - 웹훅 URL 복사하여 사용

3. **Discord/Slack**:
   - 웹훅 URL 생성
   - 채팅방으로 알림 전송

## 🧪 테스트 방법

1. 호스트 추가 후 모니터링 활성화
2. 테스트용 호스트의 IP를 잘못된 값으로 설정
3. 오프라인 알림이 이메일로 발송되는지 확인

## 📞 문제 해결

### 이메일이 발송되지 않는 경우:

1. **EmailJS 설정 확인**: Service ID, Template ID, Public Key 정확성
2. **이메일 서비스 상태**: Gmail/Outlook 계정 상태 확인
3. **템플릿 변수**: 변수명 일치 여부 확인
4. **브라우저 콘솔**: 에러 메시지 확인
5. **EmailJS 대시보드**: 발송 로그 확인

### 자주 발생하는 오류:

- `Invalid template ID`: 템플릿 ID 오타
- `Service not found`: 서비스 ID 오타  
- `Unauthorized`: Public Key 오류
- `Template variable not found`: 템플릿 변수명 불일치

## 💡 팁

1. **테스트 템플릿**: 먼저 간단한 테스트 템플릿으로 동작 확인
2. **변수 확인**: 시스템 로그에서 전송되는 변수 확인
3. **제한 관리**: 무료 계정 한도 모니터링
4. **백업 방법**: 웹훅도 함께 설정하여 이중화

---

이 가이드를 따라 설정하면 네트워크 모니터링 시스템에서 실제 이메일 알림을 받을 수 있습니다! 🎉