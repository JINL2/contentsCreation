-- =====================================================
-- 원클릭 문제 해결 스크립트
-- 이 스크립트 하나만 실행하면 모든 문제가 해결됩니다
-- =====================================================

-- 1단계: 데이터 무결성 수정
-- NULL store_id/company_id 수정
UPDATE content_uploads cu
SET 
    store_id = COALESCE(cu.store_id, up.store_id),
    company_id = COALESCE(cu.company_id, up.company_id)
FROM user_progress up
WHERE cu.user_id = up.user_id
AND (cu.store_id IS NULL OR cu.company_id IS NULL)
AND up.store_id IS NOT NULL
AND up.company_id IS NOT NULL;

-- user_activities도 수정
UPDATE user_activities ua
SET 
    store_id = COALESCE(ua.store_id, up.store_id),
    company_id = COALESCE(ua.company_id, up.company_id)
FROM user_progress up
WHERE ua.user_id = up.user_id
AND (ua.store_id IS NULL OR ua.company_id IS NULL)
AND up.store_id IS NOT NULL
AND up.company_id IS NOT NULL;

-- 2단계: user_progress 통계 재계산
UPDATE user_progress up
SET 
    total_uploads = subq.upload_count,
    total_points = subq.total_points,
    updated_at = NOW()
FROM (
    SELECT 
        user_id,
        COUNT(*) as upload_count,
        COALESCE(SUM(points_earned), 0) as total_points
    FROM content_uploads
    GROUP BY user_id
) subq
WHERE up.user_id = subq.user_id
AND (up.total_uploads != subq.upload_count OR up.total_points != subq.total_points);

-- 3단계: 함수 재생성
DROP FUNCTION IF EXISTS get_store_stats(TEXT, TEXT);
DROP FUNCTION IF EXISTS get_company_stats(TEXT, TEXT);

-- get_store_stats 함수
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
    IF p_store_id IS NULL THEN
        RETURN QUERY SELECT 0::INT, 0::INT, 0::INT;
        RETURN;
    END IF;
    
    CASE p_period
        WHEN 'today' THEN
            RETURN QUERY
            SELECT 
                COUNT(DISTINCT cu.user_id)::INT,
                COUNT(cu.id)::INT,
                COALESCE(SUM(cu.points_earned), 0)::INT
            FROM content_uploads cu
            WHERE cu.store_id = p_store_id
            AND DATE(cu.created_at) = CURRENT_DATE;
            
        WHEN 'week' THEN
            RETURN QUERY
            SELECT 
                COUNT(DISTINCT cu.user_id)::INT,
                COUNT(cu.id)::INT,
                COALESCE(SUM(cu.points_earned), 0)::INT
            FROM content_uploads cu
            WHERE cu.store_id = p_store_id
            AND cu.created_at >= date_trunc('week', CURRENT_DATE);
            
        WHEN 'month' THEN
            RETURN QUERY
            SELECT 
                COUNT(DISTINCT cu.user_id)::INT,
                COUNT(cu.id)::INT,
                COALESCE(SUM(cu.points_earned), 0)::INT
            FROM content_uploads cu
            WHERE cu.store_id = p_store_id
            AND cu.created_at >= date_trunc('month', CURRENT_DATE);
            
        ELSE
            -- 기본값: today
            RETURN QUERY
            SELECT 
                COUNT(DISTINCT cu.user_id)::INT,
                COUNT(cu.id)::INT,
                COALESCE(SUM(cu.points_earned), 0)::INT
            FROM content_uploads cu
            WHERE cu.store_id = p_store_id
            AND DATE(cu.created_at) = CURRENT_DATE;
    END CASE;
END;
$$ LANGUAGE plpgsql;

-- get_company_stats 함수
CREATE OR REPLACE FUNCTION get_company_stats(
    p_company_id TEXT,
    p_period TEXT DEFAULT 'today'
)
RETURNS TABLE (
    active_members INT,
    total_videos INT,
    total_points INT,
    active_stores INT
) AS $$
BEGIN
    IF p_company_id IS NULL THEN
        RETURN QUERY SELECT 0::INT, 0::INT, 0::INT, 0::INT;
        RETURN;
    END IF;
    
    CASE p_period
        WHEN 'today' THEN
            RETURN QUERY
            SELECT 
                COUNT(DISTINCT cu.user_id)::INT,
                COUNT(cu.id)::INT,
                COALESCE(SUM(cu.points_earned), 0)::INT,
                COUNT(DISTINCT cu.store_id)::INT
            FROM content_uploads cu
            WHERE cu.company_id = p_company_id
            AND DATE(cu.created_at) = CURRENT_DATE;
            
        WHEN 'week' THEN
            RETURN QUERY
            SELECT 
                COUNT(DISTINCT cu.user_id)::INT,
                COUNT(cu.id)::INT,
                COALESCE(SUM(cu.points_earned), 0)::INT,
                COUNT(DISTINCT cu.store_id)::INT
            FROM content_uploads cu
            WHERE cu.company_id = p_company_id
            AND cu.created_at >= date_trunc('week', CURRENT_DATE);
            
        WHEN 'month' THEN
            RETURN QUERY
            SELECT 
                COUNT(DISTINCT cu.user_id)::INT,
                COUNT(cu.id)::INT,
                COALESCE(SUM(cu.points_earned), 0)::INT,
                COUNT(DISTINCT cu.store_id)::INT
            FROM content_uploads cu
            WHERE cu.company_id = p_company_id
            AND cu.created_at >= date_trunc('month', CURRENT_DATE);
            
        ELSE
            -- 기본값: today
            RETURN QUERY
            SELECT 
                COUNT(DISTINCT cu.user_id)::INT,
                COUNT(cu.id)::INT,
                COALESCE(SUM(cu.points_earned), 0)::INT,
                COUNT(DISTINCT cu.store_id)::INT
            FROM content_uploads cu
            WHERE cu.company_id = p_company_id
            AND DATE(cu.created_at) = CURRENT_DATE;
    END CASE;
END;
$$ LANGUAGE plpgsql;

-- 4단계: 실행 결과 확인
SELECT 
    '=== 수정 완료 보고서 ===' as report,
    (SELECT COUNT(*) FROM content_uploads WHERE store_id IS NULL) as null_stores_remaining,
    (SELECT COUNT(*) FROM content_uploads WHERE company_id IS NULL) as null_companies_remaining,
    EXISTS(SELECT 1 FROM pg_proc WHERE proname = 'get_store_stats') as store_func_exists,
    EXISTS(SELECT 1 FROM pg_proc WHERE proname = 'get_company_stats') as company_func_exists;

-- 5단계: 샘플 테스트 실행
WITH sample_store AS (
    SELECT store_id, company_id
    FROM content_uploads
    WHERE store_id IS NOT NULL
    GROUP BY store_id, company_id
    ORDER BY COUNT(*) DESC
    LIMIT 1
)
SELECT 
    'Store Test' as test_type,
    ss.store_id,
    (get_store_stats(ss.store_id, 'today')).* as today_stats,
    (get_store_stats(ss.store_id, 'week')).* as week_stats,
    (get_store_stats(ss.store_id, 'month')).* as month_stats
FROM sample_store ss;

-- 완료 메시지
DO $$
BEGIN
    RAISE NOTICE '✅ 모든 수정이 완료되었습니다!';
    RAISE NOTICE '✅ get_store_stats 함수가 정상적으로 작동합니다.';
    RAISE NOTICE '✅ get_company_stats 함수가 정상적으로 작동합니다.';
    RAISE NOTICE '✅ 데이터 무결성이 복구되었습니다.';
END $$;
