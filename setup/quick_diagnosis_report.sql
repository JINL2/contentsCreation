-- =====================================================
-- 빠른 진단 보고서
-- 한 번의 실행으로 모든 문제를 파악
-- =====================================================

-- 전체 시스템 상태 보고서
WITH system_check AS (
    -- 데이터 무결성
    SELECT 
        'Data Integrity' as check_type,
        COUNT(*) as total_records,
        COUNT(CASE WHEN store_id IS NULL THEN 1 END) as null_stores,
        COUNT(CASE WHEN company_id IS NULL THEN 1 END) as null_companies,
        ROUND(100.0 * COUNT(CASE WHEN store_id IS NOT NULL AND company_id IS NOT NULL THEN 1 END) / NULLIF(COUNT(*), 0), 2) as integrity_percent
    FROM content_uploads
),
function_check AS (
    -- 함수 존재 여부
    SELECT 
        'Functions' as check_type,
        EXISTS(SELECT 1 FROM pg_proc WHERE proname = 'get_store_stats') as store_func,
        EXISTS(SELECT 1 FROM pg_proc WHERE proname = 'get_company_stats') as company_func
),
today_activity AS (
    -- 오늘 활동
    SELECT 
        'Today Activity' as check_type,
        COUNT(DISTINCT user_id) as active_users,
        COUNT(DISTINCT store_id) as active_stores,
        COUNT(*) as uploads,
        SUM(points_earned) as points
    FROM content_uploads
    WHERE DATE(created_at) = CURRENT_DATE
)
SELECT * FROM system_check
UNION ALL
SELECT 
    check_type,
    CASE WHEN store_func THEN 1 ELSE 0 END::bigint as total_records,
    CASE WHEN NOT store_func THEN 1 ELSE 0 END::bigint as null_stores,
    CASE WHEN NOT company_func THEN 1 ELSE 0 END::bigint as null_companies,
    CASE WHEN store_func AND company_func THEN 100.0 ELSE 0.0 END as integrity_percent
FROM function_check
UNION ALL
SELECT 
    check_type,
    active_users as total_records,
    active_stores as null_stores,
    uploads as null_companies,
    points::numeric as integrity_percent
FROM today_activity;

-- 상세 문제 진단
SELECT 
    '===== 시스템 진단 결과 =====' as diagnosis,
    CASE 
        WHEN (SELECT COUNT(*) FROM content_uploads WHERE store_id IS NULL) > 0 
        THEN '❌ NULL store_id 발견 - 수정 필요'
        ELSE '✅ 모든 store_id 정상'
    END as store_id_check,
    CASE 
        WHEN (SELECT COUNT(*) FROM content_uploads WHERE company_id IS NULL) > 0 
        THEN '❌ NULL company_id 발견 - 수정 필요'
        ELSE '✅ 모든 company_id 정상'
    END as company_id_check,
    CASE 
        WHEN EXISTS(SELECT 1 FROM pg_proc WHERE proname = 'get_store_stats')
        THEN '✅ get_store_stats 함수 존재'
        ELSE '❌ get_store_stats 함수 없음 - 생성 필요'
    END as function_check,
    CASE 
        WHEN (SELECT COUNT(*) FROM content_uploads WHERE DATE(created_at) = CURRENT_DATE) > 0
        THEN '✅ 오늘 활동 있음'
        ELSE '⚠️ 오늘 활동 없음'
    END as activity_check;

-- 추천 조치사항
DO $$
DECLARE
    v_null_stores INTEGER;
    v_null_companies INTEGER;
    v_func_exists BOOLEAN;
BEGIN
    SELECT COUNT(*) INTO v_null_stores FROM content_uploads WHERE store_id IS NULL;
    SELECT COUNT(*) INTO v_null_companies FROM content_uploads WHERE company_id IS NULL;
    SELECT EXISTS(SELECT 1 FROM pg_proc WHERE proname = 'get_store_stats') INTO v_func_exists;
    
    RAISE NOTICE '';
    RAISE NOTICE '===== 추천 조치사항 =====';
    
    IF v_null_stores > 0 OR v_null_companies > 0 THEN
        RAISE NOTICE '1. 데이터 무결성 수정이 필요합니다.';
        RAISE NOTICE '   실행: /setup/one_click_fix.sql';
    END IF;
    
    IF NOT v_func_exists THEN
        RAISE NOTICE '2. 함수 생성이 필요합니다.';
        RAISE NOTICE '   실행: /setup/one_click_fix.sql';
    END IF;
    
    IF v_null_stores = 0 AND v_null_companies = 0 AND v_func_exists THEN
        RAISE NOTICE '✅ 시스템이 정상 작동 중입니다!';
    END IF;
    
    RAISE NOTICE '';
END $$;

-- 샘플 테스트 (가장 활발한 스토어)
WITH most_active AS (
    SELECT store_id, company_id, COUNT(*) as total
    FROM content_uploads
    WHERE store_id IS NOT NULL
    GROUP BY store_id, company_id
    ORDER BY total DESC
    LIMIT 1
)
SELECT 
    '===== 샘플 테스트 결과 =====' as test,
    ma.store_id,
    ma.company_id,
    ma.total as total_uploads,
    (get_store_stats(ma.store_id, 'today')).* as today_stats
FROM most_active ma;
