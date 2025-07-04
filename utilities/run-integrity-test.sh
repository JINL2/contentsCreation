#!/bin/bash

# Video Review Integrity Test Quick Launcher
# 작성일: 2025년 6월 30일

echo "🎬 Contents Helper - Video Review 무결성 테스트 실행기"
echo "=================================================="

# 기본 URL
BASE_URL="http://localhost/mysite/contents_helper_website"

# 테스트 파라미터 (Jin 사용자)
USER_ID="0d2e61ad-e230-454e-8b90-efbe1c1a9268"
USER_NAME="Jin"
COMPANY_ID="ebd66ba7-fde7-4332-b6b5-0d8a7f615497"
STORE_ID="16f4c231-185a-4564-b473-bad1e9b305e8"

# 메뉴 표시
echo ""
echo "테스트 옵션을 선택하세요:"
echo "1) 무결성 테스트 페이지 열기"
echo "2) 비디오 리뷰 페이지 직접 열기"
echo "3) 메인 페이지 열기"
echo "4) 모든 페이지 한번에 열기"
echo ""

read -p "선택 (1-4): " choice

case $choice in
    1)
        echo "🧪 무결성 테스트 페이지 열기..."
        open "${BASE_URL}/tests/video-review-test/integrity-test.html"
        ;;
    2)
        echo "🎬 비디오 리뷰 페이지 열기..."
        open "${BASE_URL}/video-review.html?user_id=${USER_ID}&user_name=${USER_NAME}&company_id=${COMPANY_ID}&store_id=${STORE_ID}"
        ;;
    3)
        echo "🏠 메인 페이지 열기..."
        open "${BASE_URL}/index.html?user_id=${USER_ID}&user_name=${USER_NAME}&company_id=${COMPANY_ID}&store_id=${STORE_ID}"
        ;;
    4)
        echo "📂 모든 페이지 열기..."
        open "${BASE_URL}/tests/video-review-test/integrity-test.html"
        sleep 1
        open "${BASE_URL}/video-review.html?user_id=${USER_ID}&user_name=${USER_NAME}&company_id=${COMPANY_ID}&store_id=${STORE_ID}"
        sleep 1
        open "${BASE_URL}/index.html?user_id=${USER_ID}&user_name=${USER_NAME}&company_id=${COMPANY_ID}&store_id=${STORE_ID}"
        ;;
    *)
        echo "❌ 잘못된 선택입니다."
        exit 1
        ;;
esac

echo ""
echo "✅ 실행 완료!"
echo ""
echo "📌 테스트 가이드:"
echo "- 영상 3초 미만 시청 시 평가 차단 확인"
echo "- 영상 로드 실패 시 자동 다음 영상 확인"
echo "- 영상 없을 시 5초 후 메인 이동 확인"
echo ""
echo "📋 테스트 가이드 파일:"
echo "${BASE_URL}/tests/video-review-test/TEST_GUIDE.md"