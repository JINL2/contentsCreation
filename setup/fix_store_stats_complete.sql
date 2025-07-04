-- 1. 먼저 실제 데이터 확인
-- Jin 사용자의 업로드 확인
SELECT 
    id,
    user_id,
    store_id,
    company_id,
    created_at,
    points_earned,
    status
FROM content_uploads
WHERE user_id = '0d2e61ad-e230-454e-8b90-efbe1c1a9268'
ORDER BY created_at DESC;

-- 2. store_id가 NULL인 경우 업데이트
-- user_progress에서 store_id 가져와서 업데이트
UPDATE content_uploads cu
SET 
    store_id = up.store_id,
    company_id = up.company_id
FROM user_progress up
WHERE cu.user_id = up.user_id
AND cu.user_id = '0d2e61ad-e230-454e-8b90-efbe1c1a9268'
AND (cu.store_id IS NULL OR cu.company_id IS NULL);

-- 3. get_store_stats 함수 재생성
DROP FUNCTION IF EXISTS get_store_stats(TEXT, TEXT);

CREATE OR REPLACE FUNCTION get_store_stats(
    p_store_id TEXT,
    p_period TEXT DEFAULT 'today'
)
RETURNS TABLE (
    active_members INT,
    total_videos INT,
    total_points INT
) AS $$
BEGIN
    IF p_period = 'today' THEN
        RETURN QUERY
        WITH daily_stats AS (
            SELECT 
                COUNT(DISTINCT cu.user_id) as active_users,
                COUNT(cu.id) as total_uploads,
                COALESCE(SUM(cu.points_earned), 0) as total_pts
            FROM content_uploads cu
            WHERE cu.store_id = p_store_id
            AND DATE(cu.created_at) = CURRENT_DATE
        )
        SELECT 
            active_users::INT,
            total_uploads::INT,
            total_pts::INT
        FROM daily_stats;
        
    ELSIF p_period = 'week' THEN
        RETURN QUERY
        WITH weekly_stats AS (
            SELECT 
                COUNT(DISTINCT cu.user_id) as active_users,
                COUNT(cu.id) as total_uploads,
                COALESCE(SUM(cu.points_earned), 0) as total_pts
            FROM content_uploads cu
            WHERE cu.store_id = p_store_id
            AND cu.created_at >= date_trunc('week', CURRENT_DATE)
        )
        SELECT 
            active_users::INT,
            total_uploads::INT,
            total_pts::INT
        FROM weekly_stats;
        
    ELSIF p_period = 'month' THEN
        RETURN QUERY
        WITH monthly_stats AS (
            SELECT 
                COUNT(DISTINCT cu.user_id) as active_users,
                COUNT(cu.id) as total_uploads,
                COALESCE(SUM(cu.points_earned), 0) as total_pts
            FROM content_uploads cu
            WHERE cu.store_id = p_store_id
            AND cu.created_at >= date_trunc('month', CURRENT_DATE)
        )
        SELECT 
            active_users::INT,
            total_uploads::INT,
            total_pts::INT
        FROM monthly_stats;
    END IF;
    
    -- 결과가 없는 경우 0 반환
    IF NOT FOUND THEN
        RETURN QUERY SELECT 0::INT, 0::INT, 0::INT;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- 4. 함수 테스트
SELECT * FROM get_store_stats('16f4c231-185a-4564-b473-bad1e9b305e8', 'today');
SELECT * FROM get_store_stats('16f4c231-185a-4564-b473-bad1e9b305e8', 'week');
SELECT * FROM get_store_stats('16f4c231-185a-4564-b473-bad1e9b305e8', 'month');

-- 5. 직접 통계 확인
SELECT 
    'Today' as period,
    COUNT(DISTINCT user_id) as active_members,
    COUNT(*) as total_videos,
    COALESCE(SUM(points_earned), 0) as total_points
FROM content_uploads
WHERE store_id = '16f4c231-185a-4564-b473-bad1e9b305e8'
AND DATE(created_at) = CURRENT_DATE

UNION ALL

SELECT 
    'This Week' as period,
    COUNT(DISTINCT user_id) as active_members,
    COUNT(*) as total_videos,
    COALESCE(SUM(points_earned), 0) as total_points
FROM content_uploads
WHERE store_id = '16f4c231-185a-4564-b473-bad1e9b305e8'
AND created_at >= date_trunc('week', CURRENT_DATE)

UNION ALL

SELECT 
    'This Month' as period,
    COUNT(DISTINCT user_id) as active_members,
    COUNT(*) as total_videos,
    COALESCE(SUM(points_earned), 0) as total_points
FROM content_uploads
WHERE store_id = '16f4c231-185a-4564-b473-bad1e9b305e8'
AND created_at >= date_trunc('month', CURRENT_DATE);

-- 6. 전체 업로드 데이터 확인 (store_id별)
SELECT 
    store_id,
    company_id,
    COUNT(*) as total_uploads,
    COUNT(DISTINCT user_id) as unique_users,
    MIN(created_at) as first_upload,
    MAX(created_at) as last_upload
FROM content_uploads
WHERE store_id IS NOT NULL
GROUP BY store_id, company_id;
