#!/bin/bash

# Ping 모니터링 시스템 실행 스크립트

echo "Ping 모니터링 시스템을 시작합니다..."

# Python 가상환경 확인 및 생성
if [ ! -d "venv" ]; then
    echo "가상환경을 생성합니다..."
    python3 -m venv venv
fi

# 가상환경 활성화
echo "가상환경을 활성화합니다..."
source venv/bin/activate

# 의존성 설치
echo "의존성을 설치합니다..."
pip install -r requirements.txt

# 환경변수 파일 확인
if [ ! -f ".env" ]; then
    echo "환경변수 파일을 생성합니다..."
    cp .env.example .env
    echo "⚠️  .env 파일을 편집하여 이메일 설정을 구성하세요."
fi

# ping 권한 확인
echo "ping 권한을 확인합니다..."
if ! ping -c 1 8.8.8.8 > /dev/null 2>&1; then
    echo "⚠️  ping 명령어 실행 권한이 없습니다."
    echo "다음 명령어로 권한을 설정하세요:"
    echo "sudo setcap cap_net_raw+ep /usr/bin/ping"
fi

# Flask 앱 실행
echo "웹 서버를 시작합니다..."
echo "브라우저에서 http://localhost:5000 으로 접속하세요."
echo "종료하려면 Ctrl+C를 누르세요."

python app.py