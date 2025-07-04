-- =====================================================
-- Jin 사용자 실제 파라미터로 테스트
-- URL: http://localhost/mysite/contents_helper_website/?user_id=0d2e61ad-e230-454e-8b90-efbe1c1a9268&user_name=Jin&store_id=16f4c231-185a-4564-b473-bad1e9b305e8
-- =====================================================

-- 테스트 파라미터
-- user_id: 0d2e61ad-e230-454e-8b90-efbe1c1a9268
-- user_name: Jin
-- store_id: 16f4c231-185a-4564-b473-bad1e9b305e8

-- =====================================================
-- 1. Jin 사용자의 현재 상태 확인
-- =====================================================
SELECT 
    '=== 1. Jin User Profile ===' as section,
    user_id,
    metadata->>'name' as user_name,
    store_id,
    company_id,
    total_uploads,
    total_points,
    current_level,
    created_at,
    updated_at
FROM user_progress
WHERE user_id = '0d2e61ad-e230-454e-8b90-efbe1c1a9268';

-- =====================================================
-- 2. Jin의 업로드 내역 확인
-- =====================================================
SELECT 
    '=== 2. Jin Upload History ===' as section,
    cu.id as upload_id,
    cu.created_at,
    cu.store_id as upload_store_id,
    cu.company_id as upload_company_id,
    cu.points_earned,
    cu.title,
    DATE(cu.created_at) as upload_date,
    CASE 
        WHEN cu.store_id = '16f4c231-185a-4564-b473-bad1e9b305e8' THEN '✅ Correct Store'
        WHEN cu.store_id IS NULL THEN '❌ NULL Store'
        ELSE '⚠️ Different Store: ' || cu.store_id
    END as store_check
FROM content_uploads cu
WHERE cu.user_id = '0d2e61ad-e230-454e-8b90-efbe1c1a9268'
ORDER BY cu.created_at DESC;

-- =====================================================
-- 3. 스토어별 통계 직접 계산
-- =====================================================
WITH direct_stats AS (
    SELECT 
        -- 오늘
        COUNT(DISTINCT CASE WHEN DATE(created_at) = CURRENT_DATE THEN user_id END) as today_users,
        COUNT(CASE WHEN DATE(created_at) = CURRENT_DATE THEN id END) as today_videos,
        COALESCE(SUM(CASE WHEN DATE(created_at) = CURRENT_DATE THEN points_earned END), 0) as today_points,
        -- 이번 주
        COUNT(DISTINCT CASE WHEN created_at >= date_trunc('week', CURRENT_DATE) THEN user_id END) as week_users,
        COUNT(CASE WHEN created_at >= date_trunc('week', CURRENT_DATE) THEN id END) as week_videos,
        COALESCE(SUM(CASE WHEN created_at >= date_trunc('week', CURRENT_DATE) THEN points_earned END), 0) as week_points,
        -- 이번 달
        COUNT(DISTINCT CASE WHEN created_at >= date_trunc('month', CURRENT_DATE) THEN user_id END) as month_users,
        COUNT(CASE WHEN created_at >= date_trunc('month', CURRENT_DATE) THEN id END) as month_videos,
        COALESCE(SUM(CASE WHEN created_at >= date_trunc('month', CURRENT_DATE) THEN points_earned END), 0) as month_points
    FROM content_uploads
    WHERE store_id = '16f4c231-185a-4564-b473-bad1e9b305e8'
)
SELECT 
    '=== 3. Direct Stats Calculation ===' as section,
    'Today' as period,
    today_users as active_members,
    today_videos as total_videos,
    today_points as total_points
FROM direct_stats
UNION ALL
SELECT 
    '=== 3. Direct Stats Calculation ===' as section,
    'Week' as period,
    week_users,
    week_videos,
    week_points
FROM direct_stats
UNION ALL
SELECT 
    '=== 3. Direct Stats Calculation ===' as section,
    'Month' as period,
    month_users,
    month_videos,
    month_points
FROM direct_stats;

-- =====================================================
-- 4. get_store_stats 함수 실행 결과
-- =====================================================
SELECT 
    '=== 4. Function Results ===' as section,
    'Today' as period,
    (get_store_stats('16f4c231-185a-4564-b473-bad1e9b305e8', 'today')).*
UNION ALL
SELECT 
    '=== 4. Function Results ===' as section,
    'Week' as period,
    (get_store_stats('16f4c231-185a-4564-b473-bad1e9b305e8', 'week')).*
UNION ALL
SELECT 
    '=== 4. Function Results ===' as section,
    'Month' as period,
    (get_store_stats('16f4c231-185a-4564-b473-bad1e9b305e8', 'month')).*;

-- =====================================================
-- 5. 문제 진단
-- =====================================================
WITH problem_check AS (
    SELECT 
        COUNT(*) as total_uploads,
        COUNT(CASE WHEN store_id IS NULL THEN 1 END) as null_store_count,
        COUNT(CASE WHEN store_id != '16f4c231-185a-4564-b473-bad1e9b305e8' THEN 1 END) as wrong_store_count,
        COUNT(CASE WHEN company_id IS NULL THEN 1 END) as null_company_count
    FROM content_uploads
    WHERE user_id = '0d2e61ad-e230-454e-8b90-efbe1c1a9268'
)
SELECT 
    '=== 5. Problem Diagnosis ===' as section,
    total_uploads,
    null_store_count,
    wrong_store_count,
    null_company_count,
    CASE 
        WHEN null_store_count > 0 OR wrong_store_count > 0 THEN '❌ 데이터 수정 필요'
        ELSE '✅ 데이터 정상'
    END as diagnosis
FROM problem_check;

-- =====================================================
-- 6. 데이터 수정 (필요한 경우)
-- =====================================================
-- 주석 처리됨 - 필요시 주석 해제하여 실행
/*
-- Jin의 모든 업로드를 올바른 store_id로 업데이트
UPDATE content_uploads
SET 
    store_id = '16f4c231-185a-4564-b473-bad1e9b305e8',
    company_id = COALESCE(company_id, (SELECT company_id FROM user_progress WHERE user_id = '0d2e61ad-e230-454e-8b90-efbe1c1a9268'))
WHERE user_id = '0d2e61ad-e230-454e-8b90-efbe1c1a9268'
AND (store_id IS NULL OR store_id != '16f4c231-185a-4564-b473-bad1e9b305e8');

-- user_progress도 업데이트
UPDATE user_progress
SET 
    store_id = '16f4c231-185a-4564-b473-bad1e9b305e8',
    updated_at = NOW()
WHERE user_id = '0d2e61ad-e230-454e-8b90-efbe1c1a9268'
AND (store_id IS NULL OR store_id != '16f4c231-185a-4564-b473-bad1e9b305e8');
*/

-- =====================================================
-- 7. JavaScript 시뮬레이션 (앱에서 실제 호출하는 방식)
-- =====================================================
-- script.js의 loadPerformanceData 함수 시뮬레이션
DO $$
DECLARE
    v_result RECORD;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '=== JavaScript Simulation ===';
    RAISE NOTICE 'Store ID: 16f4c231-185a-4564-b473-bad1e9b305e8';
    
    -- Today
    SELECT * INTO v_result FROM get_store_stats('16f4c231-185a-4564-b473-bad1e9b305e8', 'today');
    RAISE NOTICE 'Today - Members: %, Videos: %, Points: %', 
        v_result.active_members, v_result.total_videos, v_result.total_points;
    
    -- Week
    SELECT * INTO v_result FROM get_store_stats('16f4c231-185a-4564-b473-bad1e9b305e8', 'week');
    RAISE NOTICE 'Week - Members: %, Videos: %, Points: %', 
        v_result.active_members, v_result.total_videos, v_result.total_points;
    
    -- Month
    SELECT * INTO v_result FROM get_store_stats('16f4c231-185a-4564-b473-bad1e9b305e8', 'month');
    RAISE NOTICE 'Month - Members: %, Videos: %, Points: %', 
        v_result.active_members, v_result.total_videos, v_result.total_points;
    
    RAISE NOTICE '';
END $$;

-- =====================================================
-- 8. 같은 스토어의 다른 사용자들
-- =====================================================
SELECT 
    '=== 8. Other Users in Same Store ===' as section,
    cu.user_id,
    up.metadata->>'name' as user_name,
    COUNT(cu.id) as uploads,
    SUM(cu.points_earned) as total_points,
    MAX(cu.created_at) as last_upload
FROM content_uploads cu
LEFT JOIN user_progress up ON cu.user_id = up.user_id
WHERE cu.store_id = '16f4c231-185a-4564-b473-bad1e9b305e8'
GROUP BY cu.user_id, up.metadata->>'name'
ORDER BY uploads DESC;

-- =====================================================
-- 9. 시간대별 업로드 분포
-- =====================================================
SELECT 
    '=== 9. Upload Time Distribution ===' as section,
    DATE(created_at) as upload_date,
    COUNT(*) as upload_count,
    COUNT(DISTINCT user_id) as unique_users,
    SUM(points_earned) as daily_points
FROM content_uploads
WHERE store_id = '16f4c231-185a-4564-b473-bad1e9b305e8'
AND created_at >= CURRENT_DATE - INTERVAL '7 days'
GROUP BY DATE(created_at)
ORDER BY upload_date DESC;

-- =====================================================
-- 10. 최종 검증 - 앱에서 표시될 데이터
-- =====================================================
WITH app_display AS (
    SELECT 
        -- Jin의 개인 통계
        (SELECT total_points FROM user_progress WHERE user_id = '0d2e61ad-e230-454e-8b90-efbe1c1a9268') as jin_total_points,
        (SELECT current_level FROM user_progress WHERE user_id = '0d2e61ad-e230-454e-8b90-efbe1c1a9268') as jin_level,
        (SELECT total_uploads FROM user_progress WHERE user_id = '0d2e61ad-e230-454e-8b90-efbe1c1a9268') as jin_total_uploads,
        -- 스토어 통계 (오늘)
        (SELECT active_members FROM get_store_stats('16f4c231-185a-4564-b473-bad1e9b305e8', 'today')) as today_active_members,
        (SELECT total_videos FROM get_store_stats('16f4c231-185a-4564-b473-bad1e9b305e8', 'today')) as today_videos,
        (SELECT total_points FROM get_store_stats('16f4c231-185a-4564-b473-bad1e9b305e8', 'today')) as today_points
)
SELECT 
    '=== 10. App Display Data ===' as section,
    'Jin Personal Stats' as category,
    jin_total_points as value1,
    jin_level as value2,
    jin_total_uploads as value3
FROM app_display
UNION ALL
SELECT 
    '=== 10. App Display Data ===' as section,
    'Store Today Stats' as category,
    today_active_members as value1,
    today_videos as value2,
    today_points as value3
FROM app_display;

-- =====================================================
-- 완료 메시지
-- =====================================================
SELECT 
    '=== Test Complete ===' as status,
    'User: Jin (0d2e61ad-e230-454e-8b90-efbe1c1a9268)' as user_info,
    'Store: 16f4c231-185a-4564-b473-bad1e9b305e8' as store_info,
    CURRENT_TIMESTAMP as test_time;
