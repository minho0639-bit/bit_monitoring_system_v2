#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
모니터링 시스템 테스트 스크립트
실제 ping 기능이 제대로 작동하는지 테스트
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app import app, db, Device, PingLog, ping_device
from datetime import datetime

def test_monitoring():
    """모니터링 시스템 테스트"""
    with app.app_context():
        # 테스트용 장치 생성
        test_device = Device(
            name="테스트 장치",
            ip_address="8.8.8.8",
            description="Google DNS 테스트",
            is_active=True
        )
        
        # 기존 테스트 장치가 있으면 삭제
        existing = Device.query.filter_by(ip_address="8.8.8.8").first()
        if existing:
            db.session.delete(existing)
            db.session.commit()
        
        # 새 장치 추가
        db.session.add(test_device)
        db.session.commit()
        
        print(f"테스트 장치 생성: {test_device.name} ({test_device.ip_address})")
        
        # ping 테스트 실행
        print("\n=== Ping 테스트 실행 ===")
        ping_result = ping_device(test_device)
        
        print(f"성공: {ping_result['success']}")
        if ping_result['success']:
            print(f"응답시간: {ping_result['response_time']}ms")
        else:
            print(f"오류: {ping_result['error']}")
        
        if 'raw_output' in ping_result and ping_result['raw_output']:
            print(f"\nRaw ping 출력:\n{ping_result['raw_output']}")
        
        # ping 로그 저장
        ping_log = PingLog(
            device_id=test_device.id,
            is_success=ping_result['success'],
            response_time=ping_result['response_time'],
            error_message=ping_result['error']
        )
        db.session.add(ping_log)
        db.session.commit()
        
        print(f"\nPing 로그 저장 완료")
        
        # 로컬호스트 테스트
        print("\n=== 로컬호스트 테스트 ===")
        localhost_device = Device(
            name="로컬호스트",
            ip_address="127.0.0.1",
            description="로컬호스트 테스트",
            is_active=True
        )
        
        # 기존 로컬호스트 장치가 있으면 삭제
        existing_local = Device.query.filter_by(ip_address="127.0.0.1").first()
        if existing_local:
            db.session.delete(existing_local)
            db.session.commit()
        
        db.session.add(localhost_device)
        db.session.commit()
        
        ping_result_local = ping_device(localhost_device)
        print(f"로컬호스트 성공: {ping_result_local['success']}")
        if ping_result_local['success']:
            print(f"응답시간: {ping_result_local['response_time']}ms")
        else:
            print(f"오류: {ping_result_local['error']}")
        
        # 실패 테스트 (존재하지 않는 IP)
        print("\n=== 실패 테스트 (존재하지 않는 IP) ===")
        fail_device = Device(
            name="실패 테스트",
            ip_address="192.168.999.999",
            description="존재하지 않는 IP 테스트",
            is_active=True
        )
        
        ping_result_fail = ping_device(fail_device)
        print(f"실패 테스트 결과: {ping_result_fail['success']}")
        if not ping_result_fail['success']:
            print(f"오류 메시지: {ping_result_fail['error']}")
        
        print("\n=== 테스트 완료 ===")

if __name__ == "__main__":
    test_monitoring()