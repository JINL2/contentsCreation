-- =====================================================
-- 데이터 무결성 문제 해결 스크립트
-- 작성일: 2025-06-29
-- 목적: NULL company_id, store_id 데이터 정리
-- =====================================================

-- 1. 현재 NULL 데이터 상태 확인
SELECT 'content_uploads' as table_name, COUNT(*) as null_count 
FROM content_uploads 
WHERE company_id IS NULL OR store_id IS NULL
UNION ALL
SELECT 'user_activities' as table_name, COUNT(*) as null_count 
FROM user_activities 
WHERE company_id IS NULL OR store_id IS NULL
UNION ALL
SELECT 'user_progress' as table_name, COUNT(*) as null_count 
FROM user_progress 
WHERE company_id IS NULL OR store_id IS NULL;

-- 2. Jin 사용자의 데이터 수정
-- Jin의 활동 데이터 업데이트
UPDATE content_uploads
SET 
    company_id = 'ebd66ba7-fde7-4332-b6b5-0d8a7f615497',
    store_id = '16f4c231-185a-4564-b473-bad1e9b305e8'
WHERE user_id = '0d2e61ad-e230-454e-8b90-efbe1c1a9268'
AND (company_id IS NULL OR store_id IS NULL);

UPDATE user_activities
SET 
    company_id = 'ebd66ba7-fde7-4332-b6b5-0d8a7f615497',
    store_id = '16f4c231-185a-4564-b473-bad1e9b305e8'
WHERE user_id = '0d2e61ad-e230-454e-8b90-efbe1c1a9268'
AND (company_id IS NULL OR store_id IS NULL);

-- 3. Khả Anh 사용자의 데이터 수정 (같은 회사, 다른 스토어)
UPDATE content_uploads
SET 
    company_id = 'ebd66ba7-fde7-4332-b6b5-0d8a7f615497',
    store_id = '22222222-185a-4564-b473-bad1e9b305e8'  -- 다른 스토어
WHERE user_id = 'b9c4eb2e-97f6-4e3f-b1a4-f5a3dc9e8f12'  -- Khả Anh의 user_id (확인 필요)
AND (company_id IS NULL OR store_id IS NULL);

UPDATE user_activities
SET 
    company_id = 'ebd66ba7-fde7-4332-b6b5-0d8a7f615497',
    store_id = '22222222-185a-4564-b473-bad1e9b305e8'
WHERE user_id = 'b9c4eb2e-97f6-4e3f-b1a4-f5a3dc9e8f12'
AND (company_id IS NULL OR store_id IS NULL);

-- 4. user_progress 테이블의 company_id, store_id 업데이트
-- metadata에서 정보 추출하여 별도 컬럼으로 이동
UPDATE user_progress
SET 
    company_id = COALESCE(
        company_id,
        (metadata->>'company_id')::uuid
    ),
    store_id = COALESCE(
        store_id,
        (metadata->>'store_id')::uuid
    )
WHERE (company_id IS NULL OR store_id IS NULL)
AND metadata IS NOT NULL;

-- 5. Jin의 user_progress 데이터 확인 및 수정
UPDATE user_progress
SET 
    company_id = 'ebd66ba7-fde7-4332-b6b5-0d8a7f615497',
    store_id = '16f4c231-185a-4564-b473-bad1e9b305e8'
WHERE user_id = '0d2e61ad-e230-454e-8b90-efbe1c1a9268'
AND (company_id IS NULL OR store_id IS NULL);

-- 6. 뷰 데이터 새로고침 (필요한 경우)
REFRESH MATERIALIZED VIEW CONCURRENTLY IF EXISTS company_leaderboard;
REFRESH MATERIALIZED VIEW CONCURRENTLY IF EXISTS store_leaderboard;

-- 7. 결과 확인
SELECT 
    'Jin의 content_uploads' as description,
    COUNT(*) as total,
    SUM(CASE WHEN company_id IS NOT NULL AND store_id IS NOT NULL THEN 1 ELSE 0 END) as fixed_count
FROM content_uploads
WHERE user_id = '0d2e61ad-e230-454e-8b90-efbe1c1a9268'
UNION ALL
SELECT 
    'Jin의 user_activities' as description,
    COUNT(*) as total,
    SUM(CASE WHEN company_id IS NOT NULL AND store_id IS NOT NULL THEN 1 ELSE 0 END) as fixed_count
FROM user_activities
WHERE user_id = '0d2e61ad-e230-454e-8b90-efbe1c1a9268';

-- 8. 팀 성과 다시 계산
SELECT * FROM get_store_stats('16f4c231-185a-4564-b473-bad1e9b305e8', 'week');
