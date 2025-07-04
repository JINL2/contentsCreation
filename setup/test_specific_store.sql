-- =====================================================
-- 특정 스토어 ID로 직접 테스트
-- Store ID: 16f4c231-185a-4564-b473-bad1e9b305e8 (예시)
-- =====================================================

-- 1. 특정 스토어의 모든 업로드 확인
SELECT 
    '=== Store Upload History ===' as section,
    cu.id,
    cu.user_id,
    up.metadata->>'name' as user_name,
    cu.created_at,
    cu.points_earned,
    cu.title,
    DATE(cu.created_at) as upload_date,
    CASE 
        WHEN DATE(cu.created_at) = CURRENT_DATE THEN 'Today'
        WHEN cu.created_at >= date_trunc('week', CURRENT_DATE) THEN 'This Week'
        WHEN cu.created_at >= date_trunc('month', CURRENT_DATE) THEN 'This Month'
        ELSE 'Older'
    END as period
FROM content_uploads cu
LEFT JOIN user_progress up ON cu.user_id = up.user_id
WHERE cu.store_id = '16f4c231-185a-4564-b473-bad1e9b305e8'
ORDER BY cu.created_at DESC;

-- 2. 기간별 집계 - 직접 계산
WITH store_data AS (
    SELECT 
        '16f4c231-185a-4564-b473-bad1e9b305e8' as store_id
)
SELECT 
    '=== Direct Count by Period ===' as section,
    'Today' as period,
    COUNT(DISTINCT cu.user_id) as active_users,
    COUNT(cu.id) as total_videos,
    COALESCE(SUM(cu.points_earned), 0) as total_points
FROM store_data sd
LEFT JOIN content_uploads cu ON cu.store_id = sd.store_id AND DATE(cu.created_at) = CURRENT_DATE
UNION ALL
SELECT 
    '=== Direct Count by Period ===' as section,
    'This Week' as period,
    COUNT(DISTINCT cu.user_id) as active_users,
    COUNT(cu.id) as total_videos,
    COALESCE(SUM(cu.points_earned), 0) as total_points
FROM store_data sd
LEFT JOIN content_uploads cu ON cu.store_id = sd.store_id AND cu.created_at >= date_trunc('week', CURRENT_DATE)
UNION ALL
SELECT 
    '=== Direct Count by Period ===' as section,
    'This Month' as period,
    COUNT(DISTINCT cu.user_id) as active_users,
    COUNT(cu.id) as total_videos,
    COALESCE(SUM(cu.points_earned), 0) as total_points
FROM store_data sd
LEFT JOIN content_uploads cu ON cu.store_id = sd.store_id AND cu.created_at >= date_trunc('month', CURRENT_DATE);

-- 3. 함수 테스트 - get_store_stats
SELECT 
    '=== Function Results ===' as section,
    'Today' as period,
    (get_store_stats('16f4c231-185a-4564-b473-bad1e9b305e8', 'today')).*
UNION ALL
SELECT 
    '=== Function Results ===' as section,
    'Week' as period,
    (get_store_stats('16f4c231-185a-4564-b473-bad1e9b305e8', 'week')).*
UNION ALL
SELECT 
    '=== Function Results ===' as section,
    'Month' as period,
    (get_store_stats('16f4c231-185a-4564-b473-bad1e9b305e8', 'month')).*;

-- 4. JavaScript에서 사용하는 것과 동일한 방식으로 테스트
-- script.js의 loadPerformanceData 함수에서 사용하는 방식
SELECT * FROM get_store_stats('16f4c231-185a-4564-b473-bad1e9b305e8', 'today');

-- 5. 데이터 무결성 체크 - 이 스토어의 데이터만
SELECT 
    '=== Store Data Integrity ===' as section,
    COUNT(*) as total_uploads,
    COUNT(CASE WHEN user_id IS NULL THEN 1 END) as null_users,
    COUNT(CASE WHEN points_earned IS NULL THEN 1 END) as null_points,
    COUNT(CASE WHEN created_at IS NULL THEN 1 END) as null_dates
FROM content_uploads
WHERE store_id = '16f4c231-185a-4564-b473-bad1e9b305e8';

-- 6. 사용자별 업로드 통계
SELECT 
    '=== Users in Store ===' as section,
    cu.user_id,
    up.metadata->>'name' as user_name,
    COUNT(cu.id) as upload_count,
    SUM(cu.points_earned) as total_points,
    MIN(cu.created_at) as first_upload,
    MAX(cu.created_at) as last_upload
FROM content_uploads cu
LEFT JOIN user_progress up ON cu.user_id = up.user_id
WHERE cu.store_id = '16f4c231-185a-4564-b473-bad1e9b305e8'
GROUP BY cu.user_id, up.metadata->>'name'
ORDER BY upload_count DESC;

-- 7. 회사 ID로 테스트 (cameraon)
SELECT 
    '=== Company Stats Test ===' as section,
    'Today' as period,
    (get_company_stats('cameraon', 'today')).*
UNION ALL
SELECT 
    '=== Company Stats Test ===' as section,
    'Week' as period,
    (get_company_stats('cameraon', 'week')).*
UNION ALL
SELECT 
    '=== Company Stats Test ===' as section,
    'Month' as period,
    (get_company_stats('cameraon', 'month')).*;

-- 8. 모든 스토어 목록과 업로드 수
SELECT 
    '=== All Stores Summary ===' as section,
    store_id,
    company_id,
    COUNT(*) as total_uploads,
    COUNT(DISTINCT user_id) as unique_users,
    MIN(created_at)::date as first_upload_date,
    MAX(created_at)::date as last_upload_date,
    COUNT(CASE WHEN DATE(created_at) = CURRENT_DATE THEN 1 END) as uploads_today
FROM content_uploads
WHERE store_id IS NOT NULL
GROUP BY store_id, company_id
ORDER BY total_uploads DESC;

-- 9. 실제로 함수가 존재하는지 확인
SELECT 
    '=== Function Check ===' as section,
    proname as function_name,
    pronargs as arg_count,
    proargtypes
FROM pg_proc
WHERE proname IN ('get_store_stats', 'get_company_stats');

-- 10. 오류 테스트 - NULL 파라미터
SELECT 
    '=== Error Test ===' as section,
    'NULL store_id test' as test_type,
    (get_store_stats(NULL, 'today')).*;
