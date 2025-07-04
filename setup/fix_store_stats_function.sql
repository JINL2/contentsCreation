-- get_store_stats 함수 수정
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
        SELECT 
            COUNT(DISTINCT cu.user_id)::INT as active_members,
            COUNT(cu.id)::INT as total_videos,
            COALESCE(SUM(cu.points_earned), 0)::INT as total_points
        FROM content_uploads cu
        WHERE cu.store_id = p_store_id
        AND DATE(cu.created_at) = CURRENT_DATE;
        
    ELSIF p_period = 'week' THEN
        RETURN QUERY
        SELECT 
            COUNT(DISTINCT cu.user_id)::INT as active_members,
            COUNT(cu.id)::INT as total_videos,
            COALESCE(SUM(cu.points_earned), 0)::INT as total_points
        FROM content_uploads cu
        WHERE cu.store_id = p_store_id
        AND cu.created_at >= date_trunc('week', CURRENT_DATE);
        
    ELSIF p_period = 'month' THEN
        RETURN QUERY
        SELECT 
            COUNT(DISTINCT cu.user_id)::INT as active_members,
            COUNT(cu.id)::INT as total_videos,
            COALESCE(SUM(cu.points_earned), 0)::INT as total_points
        FROM content_uploads cu
        WHERE cu.store_id = p_store_id
        AND cu.created_at >= date_trunc('month', CURRENT_DATE);
        
    ELSE
        -- 기본값은 today
        RETURN QUERY
        SELECT 
            COUNT(DISTINCT cu.user_id)::INT as active_members,
            COUNT(cu.id)::INT as total_videos,
            COALESCE(SUM(cu.points_earned), 0)::INT as total_points
        FROM content_uploads cu
        WHERE cu.store_id = p_store_id
        AND DATE(cu.created_at) = CURRENT_DATE;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- 테스트를 위한 쿼리
-- 전체 업로드 확인
SELECT 
    cu.*,
    up.metadata as user_metadata
FROM content_uploads cu
LEFT JOIN user_progress up ON cu.user_id = up.user_id
WHERE cu.user_id = '0d2e61ad-e230-454e-8b90-efbe1c1a9268'
ORDER BY cu.created_at DESC;

-- 오늘 업로드 확인
SELECT 
    store_id,
    COUNT(*) as uploads_today,
    COUNT(DISTINCT user_id) as active_users,
    SUM(points_earned) as total_points
FROM content_uploads
WHERE store_id = '16f4c231-185a-4564-b473-bad1e9b305e8'
AND DATE(created_at) = CURRENT_DATE
GROUP BY store_id;

-- 이번 주 업로드 확인
SELECT 
    store_id,
    COUNT(*) as uploads_this_week,
    COUNT(DISTINCT user_id) as active_users,
    SUM(points_earned) as total_points
FROM content_uploads
WHERE store_id = '16f4c231-185a-4564-b473-bad1e9b305e8'
AND created_at >= date_trunc('week', CURRENT_DATE)
GROUP BY store_id;

-- store_id가 NULL인 레코드가 있는지 확인
SELECT COUNT(*) as null_store_count
FROM content_uploads
WHERE store_id IS NULL
AND user_id = '0d2e61ad-e230-454e-8b90-efbe1c1a9268';
