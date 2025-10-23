# 🚨 알림 관리 가이드

네트워크 모니터링 시스템의 알림 관리 및 중복 알림 방지 기능에 대한 가이드입니다.

## 🔧 수정된 기능들

### ✅ 중복 알림 방지
- **5분 간격 제한**: 같은 호스트에 대해 5분 이내 중복 알림 방지
- **호스트 상태 확인**: 비활성화된 호스트에 대해서는 알림 발송 안 함
- **자동 정리**: 호스트 삭제/비활성화 시 관련 알림 자동 정리

### ✅ 호스트 관리 개선
- **비활성화**: 호스트 모니터링 중지 시 알림 정리
- **삭제**: 호스트 삭제 시 모든 관련 데이터 정리
- **상태 추적**: 호스트 상태 변경 시 자동 알림 관리

## 🚀 사용 방법

### 1. 호스트 모니터링 중지

**웹 인터페이스:**
1. 호스트 목록에서 "일시정지" 버튼 클릭
2. 호스트가 비활성화되고 알림이 정리됨

**API:**
```bash
curl -X PUT http://localhost:3001/api/hosts/{id} \
  -H "Content-Type: application/json" \
  -d '{"is_active": false}'
```

### 2. 호스트 완전 삭제

**웹 인터페이스:**
1. 호스트 목록에서 "삭제" 버튼 클릭
2. 호스트와 모든 관련 데이터가 삭제됨

**API:**
```bash
curl -X DELETE http://localhost:3001/api/hosts/{id}
```

### 3. 알림 수동 정리

**특정 호스트 알림 정리:**
```bash
curl -X DELETE http://localhost:3001/api/hosts/{id}/alerts
```

**모든 알림 정리:**
```bash
curl -X DELETE http://localhost:3001/api/alerts
```

## 📊 알림 상태 확인

### 현재 알림 목록 확인
```bash
curl -s http://localhost:3001/api/alerts
```

### 호스트별 알림 확인
```bash
curl -s http://localhost:3001/api/hosts/{id}/ping-results
```

## 🔍 문제 해결

### 계속 알림이 오는 경우

1. **호스트 상태 확인:**
   ```bash
   curl -s http://localhost:3001/api/hosts
   ```
   - `is_active: 1`인 호스트만 모니터링됨

2. **알림 정리:**
   ```bash
   # 특정 호스트 알림 정리
   curl -X DELETE http://localhost:3001/api/hosts/{id}/alerts
   
   # 모든 알림 정리
   curl -X DELETE http://localhost:3001/api/alerts
   ```

3. **호스트 완전 삭제:**
   ```bash
   curl -X DELETE http://localhost:3001/api/hosts/{id}
   ```

### 중복 알림 방지 확인

1. **알림 간격 확인:**
   - 같은 호스트에 대해 5분 이내 중복 알림 방지
   - 호스트가 온라인으로 복구되면 알림 상태 리셋

2. **로그 확인:**
   - 서버 로그에서 "Skipping alert" 메시지 확인
   - "already sent recently" 메시지로 중복 방지 확인

## 📋 알림 규칙

### 알림 발송 조건
1. **호스트가 활성 상태** (`is_active = 1`)
2. **ping 결과가 오프라인** (`is_online = false`)
3. **최근 5분 이내 알림 없음**

### 알림 정지 조건
1. **호스트 비활성화** (`is_active = 0`)
2. **호스트 삭제**
3. **호스트 온라인 복구**

## 🛠️ 고급 설정

### 알림 간격 조정
서버 코드에서 `shouldSendOfflineAlert` 함수의 시간 간격을 수정:

```javascript
// 현재: 5분 간격
const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();

// 예: 10분 간격으로 변경
const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
```

### 알림 유형 추가
새로운 알림 유형을 추가하려면 `alerts` 테이블의 `alert_type` 필드 활용:

```sql
-- 복구 알림 추가 예시
INSERT INTO alerts (host_id, alert_type, message, is_sent, sent_at) 
VALUES (?, 'recovery_alert', 'Host came back online', 1, ?);
```

## 🎯 모니터링 모범 사례

### 1. 호스트 관리
- **불필요한 호스트 정기 정리**: 사용하지 않는 호스트는 삭제
- **테스트 호스트 분리**: 테스트용 호스트는 별도 관리
- **설명 추가**: 각 호스트에 명확한 설명 추가

### 2. 알림 관리
- **정기적인 알림 정리**: 월 1회 정도 오래된 알림 정리
- **알림 로그 모니터링**: 서버 로그에서 알림 상태 확인
- **이메일 설정 확인**: Gmail SMTP 설정이 올바른지 정기 확인

### 3. 성능 최적화
- **모니터링 간격 조정**: 필요에 따라 30초 → 1분으로 조정
- **데이터베이스 정리**: 오래된 ping 결과 정기 삭제
- **로그 로테이션**: 서버 로그 크기 관리

## 🚨 긴급 상황 대응

### 모든 알림 중지
```bash
# 모든 호스트 비활성화
curl -X PUT http://localhost:3001/api/hosts/1 -H "Content-Type: application/json" -d '{"is_active": false}'
curl -X PUT http://localhost:3001/api/hosts/2 -H "Content-Type: application/json" -d '{"is_active": false}'
# ... 모든 호스트에 대해 반복

# 모든 알림 정리
curl -X DELETE http://localhost:3001/api/alerts
```

### 시스템 재시작
```bash
# 서버 중지
pkill -f "node server.js"

# 서버 재시작
PORT=3001 node server.js
```

## 📞 지원

문제가 지속되면 다음을 확인하세요:

1. **서버 로그**: 콘솔에서 오류 메시지 확인
2. **데이터베이스 상태**: SQLite 파일 상태 확인
3. **네트워크 연결**: 서버와 클라이언트 간 연결 확인
4. **이메일 설정**: Gmail SMTP 설정 재확인

---

이제 중복 알림 문제가 완전히 해결되었습니다! 🎉