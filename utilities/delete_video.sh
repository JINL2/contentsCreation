#!/bin/bash

# 비디오 삭제를 위한 스크립트
# 사용법: ./delete_video.sh "video_id"

VIDEO_ID=$1

if [ -z "$VIDEO_ID" ]; then
    echo "사용법: ./delete_video.sh <video_id>"
    echo "예시: ./delete_video.sh 30b77d5c-d404-441f-8a17-806587e9ce78"
    exit 1
fi

echo "비디오 ID: $VIDEO_ID 삭제 프로세스 시작..."

# Supabase CLI나 직접 SQL을 실행할 수 있는 환경에서 실행
cat << EOF > delete_video_temp.sql
-- 트랜잭션 시작
BEGIN;

-- 1. user_activities에서 관련 레코드 삭제
DELETE FROM user_activities 
WHERE upload_id = '$VIDEO_ID';

-- 2. video_reviews에서 관련 레코드 삭제
DELETE FROM video_reviews 
WHERE video_id = '$VIDEO_ID';

-- 3. content_uploads에서 비디오 삭제
DELETE FROM content_uploads 
WHERE id = '$VIDEO_ID';

-- 변경사항 확정
COMMIT;
EOF

echo "SQL 스크립트가 생성되었습니다: delete_video_temp.sql"
echo "이제 Supabase Dashboard의 SQL Editor에서 이 스크립트를 실행하세요."
