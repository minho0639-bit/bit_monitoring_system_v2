#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
장치 삭제 테스트 스크립트
AlertLog cascade 삭제가 제대로 작동하는지 테스트
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app import app, db, Device, PingLog, AlertLog, ping_device
from datetime import datetime, timezone

def test_device_deletion():
    """장치 삭제 테스트"""
    with app.app_context():
        # 테스트용 장치 생성
        test_device = Device(
            name="삭제 테스트 장치",
            ip_address="8.8.8.8",
            description="삭제 테스트용",
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
        
        print(f"테스트 장치 생성: {test_device.name} (ID: {test_device.id})")
        
        # ping 로그 생성
        ping_log = PingLog(
            device_id=test_device.id,
            is_success=True,
            response_time=10.5,
            error_message=None
        )
        db.session.add(ping_log)
        
        # 알림 로그 생성
        alert_log = AlertLog(
            device_id=test_device.id,
            alert_type='ping_failed',
            message='테스트 알림',
            email_sent=False
        )
        db.session.add(alert_log)
        
        db.session.commit()
        
        print(f"Ping 로그 생성: {ping_log.id}")
        print(f"Alert 로그 생성: {alert_log.id}")
        
        # 장치 삭제 전 로그 개수 확인
        ping_count_before = PingLog.query.filter_by(device_id=test_device.id).count()
        alert_count_before = AlertLog.query.filter_by(device_id=test_device.id).count()
        
        print(f"삭제 전 - Ping 로그: {ping_count_before}개, Alert 로그: {alert_count_before}개")
        
        # 장치 삭제
        print("장치 삭제 중...")
        db.session.delete(test_device)
        db.session.commit()
        
        # 삭제 후 로그 개수 확인
        ping_count_after = PingLog.query.filter_by(device_id=test_device.id).count()
        alert_count_after = AlertLog.query.filter_by(device_id=test_device.id).count()
        
        print(f"삭제 후 - Ping 로그: {ping_count_after}개, Alert 로그: {alert_count_after}개")
        
        if ping_count_after == 0 and alert_count_after == 0:
            print("✅ 장치 삭제 성공! 관련 로그들이 모두 삭제되었습니다.")
        else:
            print("❌ 장치 삭제 실패! 일부 로그가 남아있습니다.")
        
        print("\n=== 테스트 완료 ===")

if __name__ == "__main__":
    test_device_deletion()