-- 1. content_uploads 테이블에 store_id가 제대로 저장되어 있는지 확인
SELECT 
    id, 
    user_id, 
    store_id, 
    company_id, 
    created_at,
    metadata
FROM content_uploads
WHERE user_id = '0d2e61ad-e230-454e-8b90-efbe1c1a9268'
ORDER BY created_at DESC;

-- 2. user_activities 테이블도 확인
SELECT 
    id,
    user_id,
    activity_type,
    store_id,
    company_id,
    created_at,
    metadata
FROM user_activities
WHERE user_id = '0d2e61ad-e230-454e-8b90-efbe1c1a9268'
AND activity_type = 'upload'
ORDER BY created_at DESC;

-- 3. user_progress 테이블 확인
SELECT 
    user_id,
    total_uploads,
    store_id,
    company_id,
    metadata
FROM user_progress
WHERE user_id = '0d2e61ad-e230-454e-8b90-efbe1c1a9268';

-- 4. get_store_stats 함수 직접 테스트
SELECT * FROM get_store_stats('16f4c231-185a-4564-b473-bad1e9b305e8', 'today');
SELECT * FROM get_store_stats('16f4c231-185a-4564-b473-bad1e9b305e8', 'week');
SELECT * FROM get_store_stats('16f4c231-185a-4564-b473-bad1e9b305e8', 'month');

-- 5. content_uploads에서 스토어별 통계 직접 확인
SELECT 
    store_id,
    COUNT(DISTINCT user_id) as active_users,
    COUNT(*) as total_videos,
    SUM(points_earned) as total_points
FROM content_uploads
WHERE store_id = '16f4c231-185a-4564-b473-bad1e9b305e8'
AND DATE(created_at) = CURRENT_DATE
GROUP BY store_id;

-- 6. user_activities에서 스토어별 통계 직접 확인
SELECT 
    store_id,
    COUNT(DISTINCT user_id) as active_users,
    SUM(points_earned) as total_points
FROM user_activities
WHERE store_id = '16f4c231-185a-4564-b473-bad1e9b305e8'
AND DATE(created_at) = CURRENT_DATE
GROUP BY store_id;
