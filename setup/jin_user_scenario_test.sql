-- =====================================================
-- 문제 재현 및 해결 시나리오
-- =====================================================

-- 시나리오: Jin 사용자의 스토어 통계가 제대로 나오지 않는 문제

-- 1. 문제 재현: Jin 사용자 찾기
SELECT 
    '=== Jin 사용자 정보 ===' as step,
    up.user_id,
    up.metadata->>'name' as user_name,
    up.store_id,
    up.company_id,
    up.total_uploads,
    up.total_points
FROM user_progress up
WHERE up.metadata->>'name' = 'Jin';

-- 2. Jin의 실제 업로드 확인
WITH jin_user AS (
    SELECT user_id, store_id, company_id
    FROM user_progress
    WHERE metadata->>'name' = 'Jin'
    LIMIT 1
)
SELECT 
    '=== Jin의 업로드 내역 ===' as step,
    cu.id,
    cu.created_at,
    cu.store_id as upload_store_id,
    cu.company_id as upload_company_id,
    ju.store_id as profile_store_id,
    ju.company_id as profile_company_id,
    CASE 
        WHEN cu.store_id IS NULL THEN '❌ Store ID 누락'
        WHEN cu.store_id != ju.store_id THEN '⚠️ Store ID 불일치'
        ELSE '✅ OK'
    END as store_status,
    cu.points_earned
FROM jin_user ju
LEFT JOIN content_uploads cu ON cu.user_id = ju.user_id
ORDER BY cu.created_at DESC;

-- 3. 문제 확인: NULL 또는 불일치 데이터
WITH jin_user AS (
    SELECT user_id, store_id, company_id
    FROM user_progress
    WHERE metadata->>'name' = 'Jin'
    LIMIT 1
)
SELECT 
    '=== 문제 요약 ===' as step,
    COUNT(*) as total_uploads,
    COUNT(CASE WHEN cu.store_id IS NULL THEN 1 END) as null_store_uploads,
    COUNT(CASE WHEN cu.store_id != ju.store_id THEN 1 END) as mismatched_store_uploads,
    ju.store_id as correct_store_id
FROM jin_user ju
LEFT JOIN content_uploads cu ON cu.user_id = ju.user_id
GROUP BY ju.store_id;

-- 4. 수정 전 함수 테스트 결과
WITH jin_store AS (
    SELECT store_id
    FROM user_progress
    WHERE metadata->>'name' = 'Jin'
    LIMIT 1
)
SELECT 
    '=== 수정 전 함수 결과 ===' as step,
    (get_store_stats(js.store_id, 'today')).*
FROM jin_store js;

-- 5. 데이터 수정
WITH jin_info AS (
    SELECT user_id, store_id, company_id
    FROM user_progress
    WHERE metadata->>'name' = 'Jin'
    LIMIT 1
)
UPDATE content_uploads cu
SET 
    store_id = ji.store_id,
    company_id = ji.company_id
FROM jin_info ji
WHERE cu.user_id = ji.user_id
AND (cu.store_id IS NULL OR cu.store_id != ji.store_id);

-- 6. 수정 후 확인
WITH jin_user AS (
    SELECT user_id, store_id, company_id
    FROM user_progress
    WHERE metadata->>'name' = 'Jin'
    LIMIT 1
)
SELECT 
    '=== 수정 후 상태 ===' as step,
    COUNT(*) as total_uploads,
    COUNT(CASE WHEN cu.store_id = ju.store_id THEN 1 END) as correct_store_uploads,
    COUNT(CASE WHEN DATE(cu.created_at) = CURRENT_DATE THEN 1 END) as today_uploads
FROM jin_user ju
LEFT JOIN content_uploads cu ON cu.user_id = ju.user_id
GROUP BY ju.store_id;

-- 7. 수정 후 함수 테스트 결과
WITH jin_store AS (
    SELECT store_id
    FROM user_progress
    WHERE metadata->>'name' = 'Jin'
    LIMIT 1
)
SELECT 
    '=== 수정 후 함수 결과 ===' as step,
    js.store_id,
    'today' as period,
    (get_store_stats(js.store_id, 'today')).*
FROM jin_store js
UNION ALL
SELECT 
    '=== 수정 후 함수 결과 ===' as step,
    js.store_id,
    'week' as period,
    (get_store_stats(js.store_id, 'week')).*
FROM jin_store js
UNION ALL
SELECT 
    '=== 수정 후 함수 결과 ===' as step,
    js.store_id,
    'month' as period,
    (get_store_stats(js.store_id, 'month')).*
FROM jin_store js;

-- 8. 전체 스토어 데이터 건강도 체크
SELECT 
    '=== 전체 데이터 건강도 ===' as step,
    store_id,
    COUNT(*) as total_uploads,
    COUNT(DISTINCT user_id) as unique_users,
    COUNT(CASE WHEN DATE(created_at) = CURRENT_DATE THEN 1 END) as today_uploads,
    SUM(CASE WHEN DATE(created_at) = CURRENT_DATE THEN points_earned ELSE 0 END) as today_points,
    ROUND(100.0 * COUNT(CASE WHEN user_id IS NOT NULL AND points_earned IS NOT NULL THEN 1 END) / COUNT(*), 2) as data_quality_percent
FROM content_uploads
WHERE store_id IS NOT NULL
GROUP BY store_id
ORDER BY total_uploads DESC
LIMIT 10;

-- 9. JavaScript 호출 시뮬레이션 (실제 앱에서 사용하는 방식)
-- Supabase RPC 호출 형식
WITH test_params AS (
    SELECT 
        store_id,
        'today'::text as period
    FROM user_progress
    WHERE metadata->>'name' = 'Jin'
    LIMIT 1
)
SELECT 
    '=== JavaScript RPC 시뮬레이션 ===' as step,
    tp.store_id,
    tp.period,
    row_to_json((SELECT x FROM (SELECT * FROM get_store_stats(tp.store_id, tp.period)) x)) as result
FROM test_params tp;

-- 10. 최종 검증
DO $$
DECLARE
    v_jin_store_id TEXT;
    v_today_stats RECORD;
BEGIN
    -- Jin의 store_id 가져오기
    SELECT store_id INTO v_jin_store_id
    FROM user_progress
    WHERE metadata->>'name' = 'Jin'
    LIMIT 1;
    
    -- 함수 실행
    SELECT * INTO v_today_stats 
    FROM get_store_stats(v_jin_store_id, 'today');
    
    -- 결과 출력
    RAISE NOTICE '===================================';
    RAISE NOTICE 'Jin의 스토어 통계 테스트 완료';
    RAISE NOTICE 'Store ID: %', v_jin_store_id;
    RAISE NOTICE 'Today Active Members: %', v_today_stats.active_members;
    RAISE NOTICE 'Today Videos: %', v_today_stats.total_videos;
    RAISE NOTICE 'Today Points: %', v_today_stats.total_points;
    RAISE NOTICE '===================================';
END $$;
