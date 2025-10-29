#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Ping 기반 모니터링 시스템
Linux 웹서버에서 ICMP ping을 통한 장치 모니터링 및 알림 시스템
"""

import os
import sys
import time
import threading
import smtplib
import logging
import subprocess
import re
from datetime import datetime, timedelta, timezone
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import List, Dict, Optional

from flask import Flask, render_template, request, jsonify, redirect, url_for, flash
from flask_sqlalchemy import SQLAlchemy
import schedule

# Flask 앱 초기화
app = Flask(__name__)
app.config['SECRET_KEY'] = 'your-secret-key-here'
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///monitoring.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

# 데이터베이스 초기화
db = SQLAlchemy(app)

# 로깅 설정
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('monitoring.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

# 이메일 설정은 이제 데이터베이스에서 관리됩니다

# 데이터베이스 모델
class Device(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    ip_address = db.Column(db.String(45), nullable=False, unique=True)
    description = db.Column(db.Text)
    is_active = db.Column(db.Boolean, default=True)
    status = db.Column(db.String(20), default='unknown')  # 'active', 'failed', 'unknown'
    last_ping_time = db.Column(db.DateTime)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
    
    # 관계 설정
    ping_logs = db.relationship('PingLog', backref='device', lazy=True, cascade='all, delete-orphan')
    alert_logs = db.relationship('AlertLog', backref='device', lazy=True, cascade='all, delete-orphan')

class PingLog(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    device_id = db.Column(db.Integer, db.ForeignKey('device.id'), nullable=False)
    is_success = db.Column(db.Boolean, nullable=False)
    response_time = db.Column(db.Float)  # ms 단위
    timestamp = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    error_message = db.Column(db.Text)

class AlertLog(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    device_id = db.Column(db.Integer, db.ForeignKey('device.id'), nullable=False)
    alert_type = db.Column(db.String(50), nullable=False)  # 'ping_failed', 'ping_recovered'
    message = db.Column(db.Text, nullable=False)
    timestamp = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    email_sent = db.Column(db.Boolean, default=False)

class EmailSettings(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    smtp_server = db.Column(db.String(100), nullable=False, default='smtp.gmail.com')
    smtp_port = db.Column(db.Integer, nullable=False, default=587)
    smtp_username = db.Column(db.String(100), nullable=False)
    smtp_password = db.Column(db.String(100), nullable=False)
    alert_emails = db.Column(db.Text, nullable=False)  # 여러 이메일을 줄바꿈으로 구분
    is_enabled = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

# 전역 변수
monitoring_active = False
monitoring_thread = None
last_alert_time = {}  # 장치별 마지막 알림 시간

def get_email_settings():
    """이메일 설정을 데이터베이스에서 가져오기"""
    settings = EmailSettings.query.first()
    if not settings:
        # 기본 설정 생성 (빈 값으로 초기화)
        settings = EmailSettings(
            smtp_server='smtp.gmail.com',
            smtp_port=587,
            smtp_username='',
            smtp_password='',
            alert_emails=''
        )
        db.session.add(settings)
        db.session.commit()
    return settings

def get_alert_emails_list(settings):
    """알림 이메일 목록을 리스트로 반환"""
    if not settings.alert_emails:
        return []
    
    # 줄바꿈과 쉼표로 구분된 이메일들을 정리
    emails = []
    for line in settings.alert_emails.split('\n'):
        for email in line.split(','):
            email = email.strip()
            if email and '@' in email:
                emails.append(email)
    
    return emails

def send_email_alert(device: Device, alert_type: str, message: str):
    """이메일 알림 전송 (여러 수신자 지원)"""
    try:
        settings = get_email_settings()
        alert_emails = get_alert_emails_list(settings)
        
        if not settings.is_enabled or not settings.smtp_username or not settings.smtp_password or not alert_emails:
            logger.warning("이메일 설정이 완료되지 않았습니다.")
            return False
    
        # 여러 수신자에게 이메일 전송
        success_count = 0
        failed_emails = []
        
        for alert_email in alert_emails:
            try:
                msg = MIMEMultipart()
                msg['From'] = settings.smtp_username
                msg['To'] = alert_email
                msg['Subject'] = f"[모니터링 알림] {device.name} ({device.ip_address})"
                
                body = f"""
모니터링 시스템 알림

장치명: {device.name}
IP 주소: {device.ip_address}
알림 유형: {alert_type}
메시지: {message}
시간: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}
수신자: {alert_email}

모니터링 시스템
                """
                
                msg.attach(MIMEText(body, 'plain', 'utf-8'))
                
                server = smtplib.SMTP(settings.smtp_server, settings.smtp_port)
                server.starttls()
                server.login(settings.smtp_username, settings.smtp_password)
                text = msg.as_string()
                server.sendmail(settings.smtp_username, alert_email, text)
                server.quit()
                
                success_count += 1
                logger.info(f"이메일 알림 전송 완료: {device.name} -> {alert_email}")
                
            except Exception as e:
                failed_emails.append(f"{alert_email}: {str(e)}")
                logger.error(f"이메일 전송 실패: {device.name} -> {alert_email} - {e}")
        
        if success_count > 0:
            logger.info(f"이메일 알림 전송 완료: {device.name} ({success_count}/{len(alert_emails)}명)")
            if failed_emails:
                logger.warning(f"일부 이메일 전송 실패: {', '.join(failed_emails)}")
            return True
        else:
            logger.error(f"모든 이메일 전송 실패: {device.name}")
            return False
        
    except smtplib.SMTPAuthenticationError as e:
        logger.error(f"이메일 인증 실패: {device.name} - {e}")
        return False
    except smtplib.SMTPConnectError as e:
        logger.error(f"SMTP 서버 연결 실패: {device.name} - {e}")
        return False
    except smtplib.SMTPException as e:
        logger.error(f"SMTP 오류: {device.name} - {e}")
        return False
    except Exception as e:
        logger.error(f"이메일 전송 실패: {device.name} - {e}")
        return False

def ping_device(device: Device) -> Dict:
    """단일 장치에 ping 테스트 수행 (실제 Linux ping 명령어 사용)"""
    try:
        # ping 명령어 실행 (3번 시도, 5초 타임아웃)
        # sudo 없이 시도하고, 실패하면 sudo로 재시도
        cmd = ['ping', '-c', '3', '-W', '5', device.ip_address]
        
        start_time = time.time()
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=10)
        end_time = time.time()
        
        # 권한 오류가 발생하면 sudo로 재시도
        if result.returncode == 2 and "Operation not permitted" in result.stderr:
            logger.info(f"권한 오류로 인해 sudo로 재시도: {device.ip_address}")
            cmd = ['sudo', 'ping', '-c', '3', '-W', '5', device.ip_address]
            result = subprocess.run(cmd, capture_output=True, text=True, timeout=10)
        
        # ping 결과 파싱
        output = result.stdout
        error_output = result.stderr
        
        # 성공 패턴: "64 bytes from IP: icmp_seq=1 ttl=64 time=0.028 ms"
        success_pattern = r'(\d+) bytes from .*: icmp_seq=\d+ ttl=\d+ time=([\d.]+) ms'
        success_matches = re.findall(success_pattern, output)
        
        # 실패 패턴들
        failure_patterns = [
            r'Destination Host Unreachable',
            r'Network is unreachable',
            r'No route to host',
            r'Request timeout',
            r'Name or service not known',
            r'ping: .*: Temporary failure in name resolution'
        ]
        
        # 실패 메시지 확인
        failure_message = None
        for pattern in failure_patterns:
            if re.search(pattern, output) or re.search(pattern, error_output):
                failure_message = re.search(pattern, output + error_output).group()
                break
        
        if success_matches and not failure_message:
            # 성공한 경우 - 평균 응답시간 계산
            response_times = [float(match[1]) for match in success_matches]
            avg_response_time = sum(response_times) / len(response_times)
            
            return {
                'success': True,
                'response_time': round(avg_response_time, 2),
                'error': None,
                'raw_output': output
            }
        else:
            # 실패한 경우
            error_msg = failure_message or "No response received"
            if result.returncode != 0:
                error_msg = f"Ping failed (exit code: {result.returncode})"
            
            return {
                'success': False,
                'response_time': None,
                'error': error_msg,
                'raw_output': output + error_output
            }
            
    except subprocess.TimeoutExpired:
        return {
            'success': False,
            'response_time': None,
            'error': 'Ping timeout (10 seconds)',
            'raw_output': ''
        }
    except FileNotFoundError:
        return {
            'success': False,
            'response_time': None,
            'error': 'Ping command not found. Please install ping utility.',
            'raw_output': ''
        }
    except Exception as e:
        return {
            'success': False,
            'response_time': None,
            'error': f'Unexpected error: {str(e)}',
            'raw_output': ''
        }

def check_device_status(device: Device, ping_result: Dict):
    """장치 상태 확인 및 알림 처리"""
    current_time = datetime.now(timezone.utc)
    device_key = f"{device.id}_{device.ip_address}"
    
    # ping 실패 시
    if not ping_result['success']:
        # 마지막 알림이 5분 이상 지났거나, 첫 알림인 경우
        if (device_key not in last_alert_time or 
            (current_time - last_alert_time[device_key]).seconds >= 300):
            
            # 알림 로그 생성
            alert = AlertLog(
                device_id=device.id,
                alert_type='ping_failed',
                message=f"Ping 실패: {ping_result['error']}"
            )
            db.session.add(alert)
            
            # 이메일 알림 전송
            email_sent = send_email_alert(device, 'ping_failed', ping_result['error'])
            alert.email_sent = email_sent
            
            db.session.commit()
            last_alert_time[device_key] = current_time
            
            logger.warning(f"장치 {device.name} ping 실패: {ping_result['error']}")
    
    # ping 성공 시 (이전에 실패했던 경우 복구 알림)
    else:
        if device_key in last_alert_time:
            # 복구 알림
            alert = AlertLog(
                device_id=device.id,
                alert_type='ping_recovered',
                message=f"Ping 복구: 응답시간 {ping_result['response_time']}ms"
            )
            db.session.add(alert)
            
            # 이메일 알림 전송
            email_sent = send_email_alert(device, 'ping_recovered', 
                                        f"응답시간 {ping_result['response_time']}ms")
            alert.email_sent = email_sent
            
            db.session.commit()
            del last_alert_time[device_key]
            
            logger.info(f"장치 {device.name} ping 복구: {ping_result['response_time']}ms")

def monitor_devices():
    """모든 활성 장치 모니터링"""
    while monitoring_active:
        try:
            with app.app_context():
                active_devices = Device.query.filter_by(is_active=True).all()
                
                for device in active_devices:
                    ping_result = ping_device(device)
                    
                    # 장치 상태 업데이트
                    if ping_result['success']:
                        device.status = 'active'
                    else:
                        device.status = 'failed'
                    device.last_ping_time = datetime.now(timezone.utc)
                    
                    # ping 로그 저장
                    ping_log = PingLog(
                        device_id=device.id,
                        is_success=ping_result['success'],
                        response_time=ping_result['response_time'],
                        error_message=ping_result['error']
                    )
                    db.session.add(ping_log)
                    
                    # 장치 상태 확인 및 알림
                    check_device_status(device, ping_result)
                
                db.session.commit()
            
            # 30초 대기
            time.sleep(30)
            
        except Exception as e:
            logger.error(f"모니터링 중 오류 발생: {e}")
            time.sleep(30)

def start_monitoring():
    """모니터링 시작"""
    global monitoring_active, monitoring_thread
    
    if not monitoring_active:
        monitoring_active = True
        monitoring_thread = threading.Thread(target=monitor_devices, daemon=True)
        monitoring_thread.start()
        logger.info("모니터링이 시작되었습니다.")

def stop_monitoring():
    """모니터링 중지"""
    global monitoring_active
    
    if monitoring_active:
        monitoring_active = False
        logger.info("모니터링이 중지되었습니다.")

# 웹 라우트
@app.route('/')
def index():
    """메인 대시보드"""
    devices = Device.query.all()
    recent_logs = PingLog.query.order_by(PingLog.timestamp.desc()).limit(50).all()
    recent_alerts = AlertLog.query.order_by(AlertLog.timestamp.desc()).limit(20).all()
    
    # 통계 계산
    total_devices = Device.query.count()
    active_devices = Device.query.filter_by(is_active=True).count()
    failed_devices = len([d for d in devices if d.id in [a.device_id for a in recent_alerts if a.alert_type == 'ping_failed']])
    
    return render_template('index.html', 
                         devices=devices,
                         recent_logs=recent_logs,
                         recent_alerts=recent_alerts,
                         total_devices=total_devices,
                         active_devices=active_devices,
                         failed_devices=failed_devices,
                         monitoring_active=monitoring_active)

@app.route('/devices')
def devices():
    """장치 관리 페이지"""
    devices = Device.query.all()
    return render_template('devices.html', devices=devices)

@app.route('/add_device', methods=['GET', 'POST'])
def add_device():
    """장치 추가"""
    if request.method == 'POST':
        name = request.form['name']
        ip_address = request.form['ip_address']
        description = request.form.get('description', '')
        
        # IP 주소 중복 확인
        existing_device = Device.query.filter_by(ip_address=ip_address).first()
        if existing_device:
            flash('이미 등록된 IP 주소입니다.', 'error')
            return redirect(url_for('add_device'))
        
        device = Device(
            name=name,
            ip_address=ip_address,
            description=description
        )
        
        db.session.add(device)
        db.session.commit()
        
        flash('장치가 성공적으로 추가되었습니다.', 'success')
        return redirect(url_for('devices'))
    
    return render_template('add_device.html')

@app.route('/edit_device/<int:device_id>', methods=['GET', 'POST'])
def edit_device(device_id):
    """장치 수정"""
    device = Device.query.get_or_404(device_id)
    
    if request.method == 'POST':
        device.name = request.form['name']
        device.ip_address = request.form['ip_address']
        device.description = request.form.get('description', '')
        device.is_active = 'is_active' in request.form
        device.updated_at = datetime.now(timezone.utc)
        
        db.session.commit()
        flash('장치 정보가 업데이트되었습니다.', 'success')
        return redirect(url_for('devices'))
    
    return render_template('edit_device.html', device=device)

@app.route('/delete_device/<int:device_id>')
def delete_device(device_id):
    """장치 삭제"""
    device = Device.query.get_or_404(device_id)
    db.session.delete(device)
    db.session.commit()
    
    flash('장치가 삭제되었습니다.', 'success')
    return redirect(url_for('devices'))

@app.route('/toggle_monitoring')
def toggle_monitoring():
    """모니터링 시작/중지"""
    if monitoring_active:
        stop_monitoring()
        flash('모니터링이 중지되었습니다.', 'info')
    else:
        start_monitoring()
        flash('모니터링이 시작되었습니다.', 'success')
    
    return redirect(url_for('index'))

@app.route('/logs')
def logs():
    """전체 로그 페이지"""
    page = request.args.get('page', 1, type=int)
    per_page = 50
    
    # ping 로그
    ping_logs = PingLog.query.order_by(PingLog.timestamp.desc()).paginate(
        page=page, per_page=per_page, error_out=False
    )
    
    # 알림 로그
    alert_logs = AlertLog.query.order_by(AlertLog.timestamp.desc()).limit(20).all()
    
    return render_template('logs.html', 
                         ping_logs=ping_logs,
                         alert_logs=alert_logs)

@app.route('/email_settings', methods=['GET', 'POST'])
def email_settings():
    """이메일 설정 페이지"""
    settings = get_email_settings()
    
    if request.method == 'POST':
        settings.smtp_server = request.form['smtp_server']
        settings.smtp_port = int(request.form['smtp_port'])
        settings.smtp_username = request.form['smtp_username']
        settings.smtp_password = request.form['smtp_password']
        settings.alert_emails = request.form['alert_emails']
        settings.is_enabled = 'is_enabled' in request.form
        settings.updated_at = datetime.now(timezone.utc)
        
        db.session.commit()
        flash('이메일 설정이 저장되었습니다.', 'success')
        return redirect(url_for('email_settings'))
    
    return render_template('email_settings.html', settings=settings)

@app.route('/api/test_email', methods=['POST'])
def test_email():
    """테스트 이메일 전송"""
    try:
        # 폼 데이터에서 설정 가져오기
        smtp_server = request.form.get('smtp_server', '').strip()
        smtp_port = request.form.get('smtp_port', '587')
        smtp_username = request.form.get('smtp_username', '').strip()
        smtp_password = request.form.get('smtp_password', '').strip()
        alert_emails_text = request.form.get('alert_emails', '').strip()
        is_enabled = request.form.get('is_enabled') == 'on'
        
        # 설정 검증
        if not smtp_server or not smtp_username or not smtp_password or not alert_emails_text:
            return jsonify({'success': False, 'message': '이메일 설정이 완전하지 않습니다. 모든 필드를 입력해주세요.'})
        
        if not is_enabled:
            return jsonify({'success': False, 'message': '이메일 알림이 비활성화되어 있습니다. 먼저 이메일 알림을 활성화해주세요.'})
        
        # 이메일 주소 형식 검증
        import re
        email_pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
        if not re.match(email_pattern, smtp_username):
            return jsonify({'success': False, 'message': f'사용자명 이메일 형식이 올바르지 않습니다: {smtp_username}'})
        
        # 알림 이메일 목록 파싱 및 검증
        alert_emails = []
        for line in alert_emails_text.split('\n'):
            for email in line.split(','):
                email = email.strip()
                if email and '@' in email:
                    if not re.match(email_pattern, email):
                        return jsonify({'success': False, 'message': f'알림 이메일 형식이 올바르지 않습니다: {email}'})
                    alert_emails.append(email)
        
        if not alert_emails:
            return jsonify({'success': False, 'message': '유효한 알림 이메일 주소를 입력해주세요.'})
        
        # 포트 번호 검증
        try:
            smtp_port = int(smtp_port)
            if smtp_port <= 0 or smtp_port > 65535:
                return jsonify({'success': False, 'message': f'포트 번호가 올바르지 않습니다: {smtp_port}'})
        except ValueError:
            return jsonify({'success': False, 'message': f'포트 번호는 숫자여야 합니다: {smtp_port}'})
        
        # 여러 수신자에게 테스트 이메일 전송
        success_count = 0
        failed_emails = []
        
        for alert_email in alert_emails:
            try:
                msg = MIMEMultipart()
                msg['From'] = smtp_username
                msg['To'] = alert_email
                msg['Subject'] = '[테스트] Ping 모니터링 시스템 이메일 설정 확인'
                
                body = f"""
이것은 Ping 모니터링 시스템의 테스트 이메일입니다.

설정 정보:
- SMTP 서버: {smtp_server}:{smtp_port}
- 사용자명: {smtp_username}
- 알림 이메일: {alert_email}
- 총 수신자: {len(alert_emails)}명
- 전송 시간: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}

이메일 설정이 정상적으로 작동합니다.

Ping 모니터링 시스템
                """
                
                msg.attach(MIMEText(body, 'plain', 'utf-8'))
                
                server = smtplib.SMTP(smtp_server, smtp_port)
                server.starttls()
                server.login(smtp_username, smtp_password)
                text = msg.as_string()
                server.sendmail(smtp_username, alert_email, text)
                server.quit()
                
                success_count += 1
                
            except Exception as e:
                failed_emails.append(f"{alert_email}: {str(e)}")
        
        if success_count > 0:
            message = f"테스트 이메일이 {success_count}명에게 전송되었습니다."
            if failed_emails:
                message += f"\n\n일부 전송 실패:\n" + "\n".join(failed_emails)
            return jsonify({'success': True, 'message': message})
        else:
            return jsonify({'success': False, 'message': f'모든 이메일 전송에 실패했습니다:\n' + "\n".join(failed_emails)})
        
    except smtplib.SMTPAuthenticationError as e:
        error_msg = "🔐 인증 실패: 사용자명 또는 비밀번호가 올바르지 않습니다.\n\n"
        if "gmail" in smtp_server.lower():
            error_msg += "Gmail 설정 방법:\n"
            error_msg += "1. Google 계정에서 2단계 인증 활성화\n"
            error_msg += "2. 앱 비밀번호 생성 (16자리)\n"
            error_msg += "3. 일반 비밀번호 대신 앱 비밀번호 사용\n"
            error_msg += "4. 링크: https://support.google.com/accounts/answer/185833"
        elif "naver" in smtp_server.lower():
            error_msg += "Naver 설정 방법:\n"
            error_msg += "1. Naver 메일에서 POP3/IMAP 설정 활성화\n"
            error_msg += "2. 보안 설정에서 '보안 수준이 낮은 앱의 액세스' 허용"
        elif "outlook" in smtp_server.lower() or "hotmail" in smtp_server.lower():
            error_msg += "Outlook 설정 방법:\n"
            error_msg += "1. Microsoft 계정에서 2단계 인증 활성화\n"
            error_msg += "2. 앱 비밀번호 생성\n"
            error_msg += "3. 일반 비밀번호 대신 앱 비밀번호 사용"
        return jsonify({'success': False, 'message': error_msg})
    except smtplib.SMTPConnectError as e:
        return jsonify({'success': False, 'message': f'🌐 SMTP 서버 연결 실패\n\n서버: {smtp_server}\n포트: {smtp_port}\n\n확인사항:\n- 서버 주소와 포트 번호가 올바른지 확인\n- 방화벽에서 포트 587이 차단되지 않았는지 확인\n- 네트워크 연결 상태 확인'})
    except smtplib.SMTPException as e:
        return jsonify({'success': False, 'message': f'📧 SMTP 오류\n\n오류 내용: {str(e)}\n\n확인사항:\n- 이메일 주소 형식이 올바른지 확인\n- SMTP 서버 설정이 정확한지 확인'})
    except Exception as e:
        return jsonify({'success': False, 'message': f'❌ 예상치 못한 오류\n\n오류 내용: {str(e)}\n\n시스템 관리자에게 문의하세요.'})

@app.route('/api/device_status/<int:device_id>')
def device_status(device_id):
    """장치 상태 API"""
    device = Device.query.get_or_404(device_id)
    
    # 최근 24시간 로그
    since = datetime.now(timezone.utc) - timedelta(hours=24)
    logs = PingLog.query.filter(
        PingLog.device_id == device_id,
        PingLog.timestamp >= since
    ).order_by(PingLog.timestamp.desc()).all()
    
    # 성공률 계산
    total_pings = len(logs)
    successful_pings = len([log for log in logs if log.is_success])
    success_rate = (successful_pings / total_pings * 100) if total_pings > 0 else 0
    
    # 평균 응답시간
    successful_logs = [log for log in logs if log.is_success and log.response_time]
    avg_response_time = sum(log.response_time for log in successful_logs) / len(successful_logs) if successful_logs else 0
    
    return jsonify({
        'device': {
            'id': device.id,
            'name': device.name,
            'ip_address': device.ip_address,
            'is_active': device.is_active
        },
        'stats': {
            'total_pings': total_pings,
            'successful_pings': successful_pings,
            'success_rate': round(success_rate, 2),
            'avg_response_time': round(avg_response_time, 2)
        },
        'recent_logs': [{
            'timestamp': log.timestamp.isoformat(),
            'is_success': log.is_success,
            'response_time': log.response_time,
            'error_message': log.error_message
        } for log in logs[:10]]
    })

if __name__ == '__main__':
    with app.app_context():
        db.create_all()
        logger.info("데이터베이스 테이블이 생성되었습니다.")
    
    # 모니터링 자동 시작
    start_monitoring()
    
    # Flask 앱 실행
    app.run(host='0.0.0.0', port=8000, debug=True)