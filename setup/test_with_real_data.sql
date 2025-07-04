-- =====================================================
-- 실제 데이터로 테스트하는 SQL
-- 실행일: 2025-06-29
-- =====================================================

-- 1. 먼저 실제 데이터가 있는지 확인
-- 최근 업로드된 데이터 확인
SELECT 
    'Recent Uploads' as check_type,
    cu.id,
    cu.user_id,
    cu.store_id,
    cu.company_id,
    cu.created_at,
    cu.points_earned,
    up.user_name,
    up.total_points,
    up.total_uploads
FROM content_uploads cu
LEFT JOIN (
    SELECT user_id, metadata->>'name' as user_name, total_points, total_uploads
    FROM user_progress
) up ON cu.user_id = up.user_id
ORDER BY cu.created_at DESC
LIMIT 5;

-- 2. 실제 스토어 ID와 회사 ID 찾기
WITH real_data AS (
    SELECT 
        store_id,
        company_id,
        COUNT(*) as upload_count,
        MAX(created_at) as last_upload
    FROM content_uploads
    WHERE store_id IS NOT NULL 
    AND company_id IS NOT NULL
    GROUP BY store_id, company_id
    ORDER BY upload_count DESC
    LIMIT 1
)
SELECT 
    'Most Active Store/Company' as info,
    store_id,
    company_id,
    upload_count,
    last_upload
FROM real_data;

-- 3. 가장 활발한 스토어의 실제 데이터로 함수 테스트
WITH test_store AS (
    SELECT 
        store_id,
        company_id
    FROM content_uploads
    WHERE store_id IS NOT NULL
    GROUP BY store_id, company_id
    ORDER BY COUNT(*) DESC
    LIMIT 1
)
SELECT 
    'Function Test Results' as test_type,
    ts.store_id,
    ts.company_id,
    'today' as period,
    (get_store_stats(ts.store_id, 'today')).*
FROM test_store ts
UNION ALL
SELECT 
    'Function Test Results' as test_type,
    ts.store_id,
    ts.company_id,
    'week' as period,
    (get_store_stats(ts.store_id, 'week')).*
FROM test_store ts
UNION ALL
SELECT 
    'Function Test Results' as test_type,
    ts.store_id,
    ts.company_id,
    'month' as period,
    (get_store_stats(ts.store_id, 'month')).*
FROM test_store ts;

-- 4. 직접 집계와 함수 결과 비교
WITH test_store AS (
    SELECT store_id, company_id
    FROM content_uploads
    WHERE store_id IS NOT NULL
    GROUP BY store_id, company_id
    ORDER BY COUNT(*) DESC
    LIMIT 1
),
direct_count AS (
    SELECT 
        ts.store_id,
        -- 오늘
        COUNT(DISTINCT CASE WHEN DATE(cu.created_at) = CURRENT_DATE THEN cu.user_id END) as today_users,
        COUNT(CASE WHEN DATE(cu.created_at) = CURRENT_DATE THEN cu.id END) as today_videos,
        COALESCE(SUM(CASE WHEN DATE(cu.created_at) = CURRENT_DATE THEN cu.points_earned END), 0) as today_points,
        -- 이번 주
        COUNT(DISTINCT CASE WHEN cu.created_at >= date_trunc('week', CURRENT_DATE) THEN cu.user_id END) as week_users,
        COUNT(CASE WHEN cu.created_at >= date_trunc('week', CURRENT_DATE) THEN cu.id END) as week_videos,
        COALESCE(SUM(CASE WHEN cu.created_at >= date_trunc('week', CURRENT_DATE) THEN cu.points_earned END), 0) as week_points,
        -- 이번 달
        COUNT(DISTINCT CASE WHEN cu.created_at >= date_trunc('month', CURRENT_DATE) THEN cu.user_id END) as month_users,
        COUNT(CASE WHEN cu.created_at >= date_trunc('month', CURRENT_DATE) THEN cu.id END) as month_videos,
        COALESCE(SUM(CASE WHEN cu.created_at >= date_trunc('month', CURRENT_DATE) THEN cu.points_earned END), 0) as month_points
    FROM test_store ts
    JOIN content_uploads cu ON cu.store_id = ts.store_id
    GROUP BY ts.store_id
),
function_results AS (
    SELECT 
        ts.store_id,
        -- 오늘
        (get_store_stats(ts.store_id, 'today')).active_members as today_func_users,
        (get_store_stats(ts.store_id, 'today')).total_videos as today_func_videos,
        (get_store_stats(ts.store_id, 'today')).total_points as today_func_points,
        -- 이번 주
        (get_store_stats(ts.store_id, 'week')).active_members as week_func_users,
        (get_store_stats(ts.store_id, 'week')).total_videos as week_func_videos,
        (get_store_stats(ts.store_id, 'week')).total_points as week_func_points,
        -- 이번 달
        (get_store_stats(ts.store_id, 'month')).active_members as month_func_users,
        (get_store_stats(ts.store_id, 'month')).total_videos as month_func_videos,
        (get_store_stats(ts.store_id, 'month')).total_points as month_func_points
    FROM test_store ts
)
SELECT 
    'Comparison' as check_type,
    dc.store_id,
    -- 오늘 비교
    dc.today_users as direct_today_users,
    fr.today_func_users as func_today_users,
    CASE WHEN dc.today_users = fr.today_func_users THEN '✅' ELSE '❌' END as today_users_match,
    dc.today_videos as direct_today_videos,
    fr.today_func_videos as func_today_videos,
    CASE WHEN dc.today_videos = fr.today_func_videos THEN '✅' ELSE '❌' END as today_videos_match,
    -- 주간 비교
    dc.week_users as direct_week_users,
    fr.week_func_users as func_week_users,
    CASE WHEN dc.week_users = fr.week_func_users THEN '✅' ELSE '❌' END as week_users_match,
    -- 월간 비교
    dc.month_users as direct_month_users,
    fr.month_func_users as func_month_users,
    CASE WHEN dc.month_users = fr.month_func_users THEN '✅' ELSE '❌' END as month_users_match
FROM direct_count dc
JOIN function_results fr ON dc.store_id = fr.store_id;

-- 5. 특정 사용자의 데이터 테스트 (Jin 사용자 예시)
WITH jin_user AS (
    SELECT 
        user_id,
        store_id,
        company_id
    FROM user_progress
    WHERE metadata->>'name' = 'Jin'
    LIMIT 1
)
SELECT 
    'Jin User Test' as test_type,
    ju.user_id,
    ju.store_id,
    ju.company_id,
    COUNT(cu.id) as total_uploads,
    SUM(cu.points_earned) as total_points,
    MAX(cu.created_at) as last_upload
FROM jin_user ju
LEFT JOIN content_uploads cu ON cu.user_id = ju.user_id
GROUP BY ju.user_id, ju.store_id, ju.company_id;

-- 6. 회사별 통계 테스트
WITH test_company AS (
    SELECT company_id
    FROM content_uploads
    WHERE company_id IS NOT NULL
    GROUP BY company_id
    ORDER BY COUNT(*) DESC
    LIMIT 1
)
SELECT 
    'Company Stats Test' as test_type,
    tc.company_id,
    'today' as period,
    (get_company_stats(tc.company_id, 'today')).*
FROM test_company tc
UNION ALL
SELECT 
    'Company Stats Test' as test_type,
    tc.company_id,
    'week' as period,
    (get_company_stats(tc.company_id, 'week')).*
FROM test_company tc
UNION ALL
SELECT 
    'Company Stats Test' as test_type,
    tc.company_id,
    'month' as period,
    (get_company_stats(tc.company_id, 'month')).*
FROM test_company tc;

-- 7. NULL 값 체크
SELECT 
    'Data Integrity Check' as check_type,
    COUNT(*) as total_records,
    COUNT(CASE WHEN store_id IS NULL THEN 1 END) as null_store_id,
    COUNT(CASE WHEN company_id IS NULL THEN 1 END) as null_company_id,
    COUNT(CASE WHEN user_id IS NULL THEN 1 END) as null_user_id,
    ROUND(100.0 * COUNT(CASE WHEN store_id IS NOT NULL AND company_id IS NOT NULL THEN 1 END) / COUNT(*), 2) as data_completeness_percent
FROM content_uploads;

-- 8. 오늘 날짜와 시간대 확인
SELECT 
    'Time Check' as check_type,
    CURRENT_DATE as current_date,
    CURRENT_TIMESTAMP as current_timestamp,
    date_trunc('week', CURRENT_DATE) as week_start,
    date_trunc('month', CURRENT_DATE) as month_start;

-- 9. 실제 업로드 시간 분포 확인
SELECT 
    DATE(created_at) as upload_date,
    COUNT(*) as upload_count,
    COUNT(DISTINCT user_id) as unique_users,
    COUNT(DISTINCT store_id) as unique_stores
FROM content_uploads
WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'
GROUP BY DATE(created_at)
ORDER BY upload_date DESC;

-- 10. 가장 최근 업로드 상세 정보
SELECT 
    'Latest Upload Details' as info,
    cu.id as upload_id,
    cu.user_id,
    up.metadata->>'name' as user_name,
    cu.store_id,
    cu.company_id,
    cu.created_at,
    cu.points_earned,
    cu.title,
    cu.video_url
FROM content_uploads cu
LEFT JOIN user_progress up ON cu.user_id = up.user_id
ORDER BY cu.created_at DESC
LIMIT 1;
