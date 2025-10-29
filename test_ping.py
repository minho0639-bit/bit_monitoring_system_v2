#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Ping 테스트 스크립트
실제 Linux ping 명령어가 제대로 작동하는지 테스트
"""

import subprocess
import re
import time

def test_ping(ip_address):
    """ping 테스트 실행"""
    print(f"Testing ping to {ip_address}...")
    
    try:
        # ping 명령어 실행 (3번 시도, 5초 타임아웃)
        cmd = ['ping', '-c', '3', '-W', '5', ip_address]
        
        start_time = time.time()
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=10)
        end_time = time.time()
        
        print(f"Exit code: {result.returncode}")
        print(f"STDOUT:\n{result.stdout}")
        if result.stderr:
            print(f"STDERR:\n{result.stderr}")
        
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
            # 성공한 경우
            response_times = [float(match[1]) for match in success_matches]
            avg_response_time = sum(response_times) / len(response_times)
            
            print(f"✅ SUCCESS: Average response time: {avg_response_time:.2f}ms")
            return True, avg_response_time, None
        else:
            # 실패한 경우
            error_msg = failure_message or "No response received"
            if result.returncode != 0:
                error_msg = f"Ping failed (exit code: {result.returncode})"
            
            print(f"❌ FAILED: {error_msg}")
            return False, None, error_msg
            
    except subprocess.TimeoutExpired:
        print("❌ FAILED: Ping timeout (10 seconds)")
        return False, None, "Ping timeout (10 seconds)"
    except FileNotFoundError:
        print("❌ FAILED: Ping command not found")
        return False, None, "Ping command not found"
    except Exception as e:
        print(f"❌ FAILED: Unexpected error: {e}")
        return False, None, f"Unexpected error: {str(e)}"

if __name__ == "__main__":
    # 테스트할 IP 주소들
    test_ips = [
        "8.8.8.8",        # Google DNS (외부)
        "127.0.0.1",      # 로컬호스트
        "192.168.1.1",    # 일반적인 라우터 IP
        "10.0.0.1",       # 일반적인 게이트웨이
        "192.168.219.202" # 사용자가 언급한 IP
    ]
    
    print("=== Ping 테스트 시작 ===\n")
    
    for ip in test_ips:
        success, response_time, error = test_ping(ip)
        print("-" * 50)
    
    print("\n=== 테스트 완료 ===")