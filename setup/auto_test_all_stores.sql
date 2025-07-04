-- =====================================================
-- 실제 데이터 기반 자동 테스트 스크립트
-- 모든 활성 스토어를 자동으로 찾아서 테스트
-- =====================================================

-- 1. 함수 재생성 (문제 해결을 위해)
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
    -- p_period 값 디버깅
    RAISE NOTICE 'get_store_stats called with store_id: %, period: %', p_store_id, p_period;
    
    IF p_store_id IS NULL THEN
        RETURN QUERY SELECT 0::INT, 0::INT, 0::INT;
        RETURN;
    END IF;
    
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
        -- 기본값: today
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

-- 2. 가장 활발한 스토어 찾기
WITH active_stores AS (
    SELECT 
        store_id,
        company_id,
        COUNT(*) as total_uploads,
        COUNT(DISTINCT user_id) as unique_users,
        COUNT(CASE WHEN DATE(created_at) = CURRENT_DATE THEN 1 END) as today_uploads
    FROM content_uploads
    WHERE store_id IS NOT NULL
    GROUP BY store_id, company_id
    ORDER BY today_uploads DESC, total_uploads DESC
    LIMIT 3
)
SELECT * FROM active_stores;

-- 3. 찾은 스토어들로 자동 테스트
WITH test_stores AS (
    SELECT store_id, company_id
    FROM content_uploads
    WHERE store_id IS NOT NULL
    GROUP BY store_id, company_id
    ORDER BY COUNT(*) DESC
    LIMIT 3
)
SELECT 
    ts.store_id,
    ts.company_id,
    -- Today
    gss_today.active_members as today_users,
    gss_today.total_videos as today_videos,
    gss_today.total_points as today_points,
    -- Week
    gss_week.active_members as week_users,
    gss_week.total_videos as week_videos,
    gss_week.total_points as week_points,
    -- Month
    gss_month.active_members as month_users,
    gss_month.total_videos as month_videos,
    gss_month.total_points as month_points
FROM test_stores ts
CROSS JOIN LATERAL get_store_stats(ts.store_id, 'today') gss_today
CROSS JOIN LATERAL get_store_stats(ts.store_id, 'week') gss_week
CROSS JOIN LATERAL get_store_stats(ts.store_id, 'month') gss_month;

-- 4. JavaScript에서 사용하는 정확한 방식으로 테스트
-- script.js의 loadPerformanceData 함수 시뮬레이션
DO $$
DECLARE
    v_store_id TEXT;
    v_result RECORD;
BEGIN
    -- 가장 활발한 스토어 선택
    SELECT store_id INTO v_store_id
    FROM content_uploads
    WHERE store_id IS NOT NULL
    GROUP BY store_id
    ORDER BY COUNT(*) DESC
    LIMIT 1;
    
    -- Today 테스트
    RAISE NOTICE 'Testing store: %', v_store_id;
    
    SELECT * INTO v_result FROM get_store_stats(v_store_id, 'today');
    RAISE NOTICE 'Today - Members: %, Videos: %, Points: %', 
        v_result.active_members, v_result.total_videos, v_result.total_points;
    
    -- Week 테스트
    SELECT * INTO v_result FROM get_store_stats(v_store_id, 'week');
    RAISE NOTICE 'Week - Members: %, Videos: %, Points: %', 
        v_result.active_members, v_result.total_videos, v_result.total_points;
    
    -- Month 테스트
    SELECT * INTO v_result FROM get_store_stats(v_store_id, 'month');
    RAISE NOTICE 'Month - Members: %, Videos: %, Points: %', 
        v_result.active_members, v_result.total_videos, v_result.total_points;
END $$;

-- 5. 데이터 검증 - 함수 결과와 직접 쿼리 비교
WITH validation AS (
    SELECT 
        store_id,
        -- Direct count
        COUNT(DISTINCT CASE WHEN DATE(created_at) = CURRENT_DATE THEN user_id END) as direct_today_users,
        COUNT(CASE WHEN DATE(created_at) = CURRENT_DATE THEN id END) as direct_today_videos,
        -- Function result
        (get_store_stats(store_id, 'today')).active_members as func_today_users,
        (get_store_stats(store_id, 'today')).total_videos as func_today_videos
    FROM content_uploads
    WHERE store_id IS NOT NULL
    GROUP BY store_id
    HAVING COUNT(*) > 0
    LIMIT 5
)
SELECT 
    store_id,
    direct_today_users,
    func_today_users,
    CASE WHEN direct_today_users = func_today_users THEN '✅ PASS' ELSE '❌ FAIL' END as user_test,
    direct_today_videos,
    func_today_videos,
    CASE WHEN direct_today_videos = func_today_videos THEN '✅ PASS' ELSE '❌ FAIL' END as video_test
FROM validation;

-- 6. 회사별 통계 함수도 테스트
DROP FUNCTION IF EXISTS get_company_stats(TEXT, TEXT);

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
    
    IF p_period = 'today' THEN
        RETURN QUERY
        SELECT 
            COUNT(DISTINCT cu.user_id)::INT as active_members,
            COUNT(cu.id)::INT as total_videos,
            COALESCE(SUM(cu.points_earned), 0)::INT as total_points,
            COUNT(DISTINCT cu.store_id)::INT as active_stores
        FROM content_uploads cu
        WHERE cu.company_id = p_company_id
        AND DATE(cu.created_at) = CURRENT_DATE;
        
    ELSIF p_period = 'week' THEN
        RETURN QUERY
        SELECT 
            COUNT(DISTINCT cu.user_id)::INT as active_members,
            COUNT(cu.id)::INT as total_videos,
            COALESCE(SUM(cu.points_earned), 0)::INT as total_points,
            COUNT(DISTINCT cu.store_id)::INT as active_stores
        FROM content_uploads cu
        WHERE cu.company_id = p_company_id
        AND cu.created_at >= date_trunc('week', CURRENT_DATE);
        
    ELSIF p_period = 'month' THEN
        RETURN QUERY
        SELECT 
            COUNT(DISTINCT cu.user_id)::INT as active_members,
            COUNT(cu.id)::INT as total_videos,
            COALESCE(SUM(cu.points_earned), 0)::INT as total_points,
            COUNT(DISTINCT cu.store_id)::INT as active_stores
        FROM content_uploads cu
        WHERE cu.company_id = p_company_id
        AND cu.created_at >= date_trunc('month', CURRENT_DATE);
    ELSE
        -- 기본값: today
        RETURN QUERY
        SELECT 
            COUNT(DISTINCT cu.user_id)::INT as active_members,
            COUNT(cu.id)::INT as total_videos,
            COALESCE(SUM(cu.points_earned), 0)::INT as total_points,
            COUNT(DISTINCT cu.store_id)::INT as active_stores
        FROM content_uploads cu
        WHERE cu.company_id = p_company_id
        AND DATE(cu.created_at) = CURRENT_DATE;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- 7. 회사별 통계 테스트
SELECT 
    company_id,
    (get_company_stats(company_id, 'today')).*
FROM (
    SELECT DISTINCT company_id 
    FROM content_uploads 
    WHERE company_id IS NOT NULL 
    LIMIT 3
) companies;

-- 8. 최종 검증 - 모든 것이 제대로 작동하는지
SELECT 
    '=== Final Verification ===' as test,
    EXISTS(SELECT 1 FROM pg_proc WHERE proname = 'get_store_stats') as store_func_exists,
    EXISTS(SELECT 1 FROM pg_proc WHERE proname = 'get_company_stats') as company_func_exists,
    COUNT(*) as total_uploads,
    COUNT(DISTINCT store_id) as unique_stores,
    COUNT(DISTINCT company_id) as unique_companies
FROM content_uploads;

-- 9. 샘플 JavaScript 호출 시뮬레이션
-- 이것이 실제 JavaScript에서 호출하는 방식입니다
SELECT row_to_json(t) as result
FROM (
    SELECT * FROM get_store_stats('16f4c231-185a-4564-b473-bad1e9b305e8', 'today')
) t;
