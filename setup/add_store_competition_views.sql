-- 스토어별 통계 뷰
CREATE OR REPLACE VIEW store_performance AS
SELECT 
    s.store_id,
    s.company_id,
    COUNT(DISTINCT up.user_id) as active_members,
    COUNT(DISTINCT cu.id) as total_videos,
    COALESCE(SUM(up.total_points), 0) as total_points,
    COALESCE(AVG(up.total_points), 0)::INTEGER as avg_points_per_member,
    MAX(cu.upload_time) as last_upload_time
FROM (
    SELECT DISTINCT store_id, company_id 
    FROM user_progress 
    WHERE store_id IS NOT NULL
) s
LEFT JOIN user_progress up ON s.store_id = up.store_id
LEFT JOIN content_uploads cu ON cu.store_id = s.store_id
GROUP BY s.store_id, s.company_id;

-- 회사 내 스토어 순위
CREATE OR REPLACE VIEW company_store_ranking AS
WITH store_ranks AS (
    SELECT 
        store_id,
        company_id,
        active_members,
        total_videos,
        total_points,
        avg_points_per_member,
        RANK() OVER (PARTITION BY company_id ORDER BY total_points DESC) as store_rank,
        COUNT(*) OVER (PARTITION BY company_id) as total_stores_in_company
    FROM store_performance
)
SELECT * FROM store_ranks;

-- 사용자 상세 순위 정보
CREATE OR REPLACE VIEW user_detailed_ranking AS
WITH user_ranks AS (
    SELECT 
        up.user_id,
        up.user_name,
        up.company_id,
        up.store_id,
        up.total_points,
        up.level,
        up.total_uploads,
        -- 스토어 내 순위
        RANK() OVER (PARTITION BY up.store_id ORDER BY up.total_points DESC) as store_rank,
        COUNT(*) OVER (PARTITION BY up.store_id) as total_users_in_store,
        -- 회사 내 순위
        RANK() OVER (PARTITION BY up.company_id ORDER BY up.total_points DESC) as company_rank,
        COUNT(*) OVER (PARTITION BY up.company_id) as total_users_in_company
    FROM user_progress up
    WHERE up.store_id IS NOT NULL
)
SELECT 
    ur.*,
    csr.store_rank as store_company_rank,
    csr.total_stores_in_company
FROM user_ranks ur
LEFT JOIN company_store_ranking csr ON ur.store_id = csr.store_id;

-- 오늘/이번주/이번달 스토어 통계
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
    RETURN QUERY
    SELECT 
        COUNT(DISTINCT ua.user_id)::INT as active_members,
        COUNT(DISTINCT cu.id)::INT as total_videos,
        COALESCE(SUM(ua.points_earned), 0)::INT as total_points
    FROM user_activities ua
    LEFT JOIN content_uploads cu ON cu.user_id = ua.user_id AND cu.store_id = p_store_id
    WHERE ua.store_id = p_store_id
    AND CASE 
        WHEN p_period = 'today' THEN DATE(ua.created_at) = CURRENT_DATE
        WHEN p_period = 'week' THEN ua.created_at >= date_trunc('week', CURRENT_DATE)
        WHEN p_period = 'month' THEN ua.created_at >= date_trunc('month', CURRENT_DATE)
        ELSE FALSE
    END;
END;
$$ LANGUAGE plpgsql;
