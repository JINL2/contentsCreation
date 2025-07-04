-- 비디오 삭제를 위한 SQL 스크립트
-- 외래 키 제약 조건을 처리하는 방법

-- 방법 1: CASCADE 삭제 (관련된 모든 데이터를 함께 삭제)
-- 특정 비디오 ID로 삭제하는 경우
BEGIN;

-- 1. 먼저 user_activities에서 관련 레코드 삭제
DELETE FROM user_activities 
WHERE upload_id IN (
    SELECT id FROM content_uploads 
    WHERE title = 'Test video từ Cameraon' 
       OR title = 'Video thử nghiệm từ Cameraon'
);

-- 2. video_reviews에서 관련 레코드 삭제 (있다면)
DELETE FROM video_reviews 
WHERE video_id IN (
    SELECT id FROM content_uploads 
    WHERE title = 'Test video từ Cameraon' 
       OR title = 'Video thử nghiệm từ Cameraon'
);

-- 3. 마지막으로 content_uploads에서 삭제
DELETE FROM content_uploads 
WHERE title = 'Test video từ Cameraon' 
   OR title = 'Video thử nghiệm từ Cameraon';

COMMIT;

-- 방법 2: 특정 ID로 삭제하는 경우
-- 먼저 삭제하려는 비디오의 ID를 확인하고 아래 쿼리를 실행
/*
BEGIN;

-- 예시: 특정 ID로 삭제
DELETE FROM user_activities WHERE upload_id = 'your-video-id-here';
DELETE FROM video_reviews WHERE video_id = 'your-video-id-here';
DELETE FROM content_uploads WHERE id = 'your-video-id-here';

COMMIT;
*/

-- 방법 3: 외래 키 제약 조건에 CASCADE 옵션 추가 (영구적 해결)
-- 이렇게 하면 content_uploads 삭제 시 자동으로 관련 레코드 삭제
/*
ALTER TABLE user_activities
DROP CONSTRAINT user_activities_upload_id_fkey;

ALTER TABLE user_activities
ADD CONSTRAINT user_activities_upload_id_fkey 
FOREIGN KEY (upload_id) 
REFERENCES content_uploads(id) 
ON DELETE CASCADE;
*/
