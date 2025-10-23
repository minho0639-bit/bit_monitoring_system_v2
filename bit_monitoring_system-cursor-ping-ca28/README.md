# 네트워크 모니터링 시스템 (Network Monitoring System)

IP 주소를 입력하여 ping 통신 상태를 실시간으로 모니터링하고, 통신 장애 시 이메일 알람을 발송하는 웹 기반 네트워크 관리 시스템입니다.

## 🚀 주요 기능

### ✅ 현재 구현된 기능

1. **호스트 관리**
   - IP 주소와 호스트 정보 등록
   - 호스트별 모니터링 간격 설정 (30초, 1분, 5분, 10분)
   - 호스트별 이메일 알람 활성화/비활성화
   - 호스트 편집 및 삭제

2. **실시간 모니터링**
   - 자동 ping 상태 체크 (시뮬레이션)
   - 실시간 상태 표시 (온라인/오프라인/알 수 없음)
   - 응답 시간 측정 및 표시
   - 상태 변화 히스토리 로깅

3. **대시보드**
   - 전체 호스트 상태 요약 (온라인/오프라인/알 수 없음/전체)
   - 호스트 목록 테이블 뷰
   - 검색 및 필터링 기능
   - 반응형 디자인 (모바일 지원)

4. **알람 시스템**
   - 이메일 알람 설정 (SMTP 구성)
   - 브라우저 알림 지원
   - 알람 스팸 방지 (15분 간격 제한)
   - 다중 수신자 지원

5. **시스템 로그**
   - 실시간 로그 모니터링
   - 로그 레벨별 필터링 (오류/경고/정보/디버그)
   - 로그 내보내기 기능
   - 상세한 오류 추적

6. **데이터 관리**
   - RESTful API를 통한 데이터 저장
   - 호스트 정보 영구 보관
   - 모니터링 로그 히스토리
   - 이메일 설정 저장

## 📁 프로젝트 구조

```
네트워크 모니터링 시스템/
├── index.html              # 메인 대시보드 페이지
├── css/
│   └── style.css          # 커스텀 스타일시트
├── js/
│   ├── main.js            # 메인 애플리케이션 로직
│   └── email-service.js   # 이메일 서비스 모듈
└── README.md              # 프로젝트 문서
```

## 🔧 기술 스택

- **Frontend**: HTML5, CSS3, JavaScript (ES6+)
- **UI Framework**: Tailwind CSS (CDN)
- **Icons**: Font Awesome 6.4.0
- **Fonts**: Google Fonts (Inter)
- **Data Storage**: RESTful Table API
- **Email Service**: EmailJS / SMTP

## 🌐 주요 엔드포인트

### 호스트 관리 API
- `GET /tables/hosts` - 호스트 목록 조회
- `POST /tables/hosts` - 새 호스트 추가
- `PATCH /tables/hosts/{id}` - 호스트 정보 업데이트
- `DELETE /tables/hosts/{id}` - 호스트 삭제

### 모니터링 로그 API
- `GET /tables/monitoring_logs` - 모니터링 로그 조회
- `POST /tables/monitoring_logs` - 새 로그 엔트리 추가

### 이메일 설정 API
- `GET /tables/email_settings` - 이메일 설정 조회
- `POST /tables/email_settings` - 이메일 설정 생성
- `PUT /tables/email_settings/{id}` - 이메일 설정 업데이트

## 📊 데이터 모델

### hosts 테이블
```javascript
{
  id: "string",                    // 호스트 고유 ID
  name: "string",                  // 호스트 이름
  ip_address: "string",            // IP 주소
  description: "string",           // 호스트 설명
  monitor_interval: "number",      // 모니터링 간격(초)
  is_active: "boolean",           // 모니터링 활성화 여부
  last_status: "string",          // 최근 상태 (online/offline/unknown)
  last_check: "datetime",         // 최근 확인 시간
  email_alerts: "boolean"         // 이메일 알람 활성화
}
```

### monitoring_logs 테이블
```javascript
{
  id: "string",                    // 로그 고유 ID
  host_id: "string",              // 호스트 ID
  status: "string",               // ping 결과 상태
  response_time: "number",        // 응답 시간(ms)
  timestamp: "datetime",          // 확인 시간
  error_message: "string"         // 오류 메시지
}
```

### email_settings 테이블
```javascript
{
  id: "string",                    // 설정 ID
  smtp_server: "string",          // SMTP 서버 주소
  smtp_port: "number",            // SMTP 포트
  username: "string",             // 이메일 계정
  password: "string",             // 비밀번호
  from_email: "string",           // 발신자 이메일
  to_emails: "array",             // 수신자 이메일 목록
  is_enabled: "boolean"           // 이메일 알람 전역 활성화
}
```

## 🔧 이메일 설정 문제 해결 가이드

### 최근 수정 사항 (v1.1.0)
✅ **이메일 설정 저장 기능 개선**
- 상세한 폼 유효성 검사 추가
- 더 명확한 오류 메시지 제공
- 이메일 설정 연결 테스트 기능 추가
- 필수 필드 표시 (빨간색 * 마크)
- SMTP 설정 도움말 추가

### 이메일 설정 저장 시 오류 해결 방법

1. **필수 필드 확인**
   - SMTP 서버, 포트, 사용자명, 발신자 이메일, 수신자 이메일 모두 입력
   - 올바른 이메일 형식 사용 (example@domain.com)

2. **일반적인 SMTP 설정**
   ```
   Gmail:
   - SMTP 서버: smtp.gmail.com
   - 포트: 587
   - 앱 비밀번호 사용 (2단계 인증 필요)
   
   Outlook:
   - SMTP 서버: smtp-mail.outlook.com  
   - 포트: 587
   - 계정 비밀번호 사용
   
   Yahoo:
   - SMTP 서버: smtp.mail.yahoo.com
   - 포트: 587
   - 앱 비밀번호 사용
   ```

3. **연결 테스트 사용**
   - 설정 저장 전 "연결 테스트" 버튼 클릭
   - 설정이 올바른지 미리 확인

4. **시스템 로그 확인**
   - 상단 "로그" 버튼 클릭
   - 오류 레벨 필터로 문제 확인
   - 로그 내보내기로 상세 분석

5. **브라우저 콘솔 확인**
   - F12 키로 개발자 도구 열기
   - Console 탭에서 자세한 오류 메시지 확인

## 📊 로그 시스템 사용법

### 로그 확인 및 문제 해결
1. **로그 모달 열기**: 상단 "로그" 버튼 클릭
2. **로그 필터링**: 오류/경고/정보/디버그 레벨별 보기
3. **로그 내보내기**: 파일로 저장하여 상세 분석
4. **실시간 모니터링**: 문제 발생 시 즉시 로그 확인

### 로그 레벨 설명
- **오류 (ERROR)** 🔴: 시스템 오류 및 실패한 작업
- **경고 (WARNING)** 🟡: 주의가 필요한 상황  
- **정보 (INFO)** 🔵: 일반적인 시스템 동작
- **디버그 (DEBUG)** 🟢: 상세한 기술적 정보

### 이메일 설정 문제 해결 with 로그
1. **로그에서 "이메일 설정" 관련 항목 확인**
2. **API 요청/응답 상태 검토**
3. **폼 유효성 검사 오류 확인**
4. **네트워크 연결 문제 진단**

### 호스트 추가 문제 해결
1. **로그에서 "호스트 추가" 관련 항목 확인**
2. **폼 필드 유효성 검사 결과 확인**
3. **API 요청/응답 상태 점검**
4. **IP 주소 중복 여부 확인**

## 🚧 개발 예정 기능

1. **고급 모니터링**
   - 실제 ping 체크 (백엔드 서비스 필요)
   - 포트별 연결 체크 (HTTP, SSH, FTP 등)
   - 성능 메트릭 수집 (CPU, 메모리, 디스크)
   - 네트워크 지연시간 분석

2. **개선된 알람**
   - 슬랙(Slack) 알림 연동
   - 웹훅 지원
   - 알람 에스컬레이션
   - 알람 템플릿 커스터마이징

3. **리포팅 및 분석**
   - 상태 히스토리 차트
   - 가동시간 통계 (uptime)
   - 성능 트렌드 분석
   - PDF 리포트 생성

4. **사용자 관리**
   - 다중 사용자 지원
   - 역할 기반 접근 제어
   - 사용자별 대시보드
   - 로그인/인증 시스템

5. **고급 UI/UX**
   - 다크 모드 지원
   - 커스터마이징 가능한 대시보드
   - 모바일 앱 개발
   - 실시간 알림 센터

## ⚠️ 제한사항

1. **브라우저 제한**
   - 실제 ping 명령은 브라우저에서 실행 불가 (시뮬레이션으로 구현)
   - CORS 정책으로 인한 일부 네트워크 접근 제한
   - 이메일 발송은 서드파티 서비스 또는 백엔드 필요

2. **보안 고려사항**
   - 이메일 비밀번호 클라이언트 저장 (프로덕션에서 개선 필요)
   - HTTPS 환경에서 사용 권장
   - 민감한 데이터 암호화 필요

## 🛠️ 설치 및 실행

1. **프로젝트 파일 다운로드**
   ```
   index.html
   css/style.css
   js/main.js
   js/email-service.js
   ```

2. **웹 서버에서 실행**
   - 로컬: Live Server 확장 프로그램 사용
   - 프로덕션: 웹 서버에 파일 업로드

3. **이메일 설정**
   - 설정 버튼 클릭
   - SMTP 서버 정보 입력
   - Gmail 사용 시 앱 비밀번호 필요

## 📧 이메일 설정 가이드

### Gmail 설정
```
SMTP 서버: smtp.gmail.com
포트: 587
사용자명: your-email@gmail.com
비밀번호: 앱 비밀번호 (2단계 인증 필요)
```

### Outlook 설정
```
SMTP 서버: smtp-mail.outlook.com
포트: 587
사용자명: your-email@outlook.com
비밀번호: 계정 비밀번호
```

## 🤝 기여하기

1. Fork the project
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Open a Pull Request

## 📝 라이선스

이 프로젝트는 MIT 라이선스 하에 배포됩니다.

## 📞 지원

문제가 발생하거나 질문이 있으시면 이슈를 등록해 주세요.

---

## 🔧 최근 수정 사항 (v1.2.0)

### ✅ 해결된 문제들:

1. **호스트 추가 버튼 문제 해결**
   - Mock API 서비스 추가 (`js/mock-api.js`)
   - localStorage 기반 데이터 저장으로 백엔드 없이도 완전 작동
   - 호스트 추가/수정/삭제 기능 완전 복구

2. **메일 설정 문제 해결**
   - 브라우저 제한으로 인한 실제 이메일 발송 불가 문제 해결
   - 브라우저 알림을 대안으로 제공
   - 이메일 설정 테스트 기능 개선 (시뮬레이션)
   - 설정 저장 및 로드 기능 완전 작동

3. **새로운 기능 추가**
   - 브라우저 알림 시스템 (이메일 대안)
   - 알림 권한 요청 기능
   - 향상된 로깅 시스템
   - Mock API를 통한 완전한 데모 환경

### 🚀 사용 방법 (수정 후)

1. **즉시 사용 가능**: 별도 백엔드 설정 없이 바로 사용
2. **호스트 추가**: "호스트 추가" 버튼이 정상 작동
3. **알림 설정**: 
   - 이메일 설정은 저장되지만 실제 발송은 시뮬레이션
   - 브라우저 알림을 활성화하여 실제 알림 받기
4. **데이터 저장**: localStorage에 자동 저장

### ⚠️ 중요 안내

- **이메일 발송**: 브라우저 보안 제한으로 실제 이메일 발송 불가
- **대안 솔루션**: 브라우저 알림 사용 권장
- **데이터 저장**: localStorage 사용 (브라우저별 개별 저장)
- **실제 운영**: 백엔드 서버 구축 시 완전한 기능 사용 가능

**개발자**: Network Monitoring System Team  
**버전**: v1.2.0 (문제 해결 완료)  
**최종 업데이트**: 2025-01-02