-- 빠른 테스트 및 디버깅 쿼리
-- 문제 발생 시 즉시 실행하여 원인 파악

-- =====================================================
-- 1. 현재 상태 빠른 확인
-- =====================================================

-- 최근 1시간 동안의 활동
SELECT 
    'Last Hour Activity' as period,
    COUNT(DISTINCT user_id) as active_users,
    COUNT(*) as uploads,
    COUNT(DISTINCT store_id) as active_stores,
    COUNT(DISTINCT company_id) as active_companies,
    COUNT(CASE WHEN store_id IS NULL THEN 1 END) as null_stores,
    COUNT(CASE WHEN company_id IS NULL THEN 1 END) as null_companies
FROM content_uploads
WHERE created_at >= NOW() - INTERVAL '1 hour';

-- 오늘의 전체 통계
SELECT 
    'Today Summary' as period,
    COUNT(DISTINCT cu.user_id) as unique_users,
    COUNT(DISTINCT cu.store_id) as active_stores,
    COUNT(cu.id) as total_uploads,
    SUM(cu.points_earned) as total_points,
    ROUND(AVG(cu.points_earned), 2) as avg_points_per_upload
FROM content_uploads cu
WHERE DATE(cu.created_at) = CURRENT_DATE;

-- =====================================================
-- 2. 특정 스토어 디버깅
-- =====================================================

-- 스토어 ID를 변경하여 사용
WITH target_store AS (
    SELECT '16f4c231-185a-4564-b473-bad1e9b305e8'::text as store_id
)
SELECT 
    'Direct Count' as method,
    COUNT(DISTINCT cu.user_id) as users,
    COUNT(cu.id) as uploads,
    SUM(cu.points_earned) as points
FROM content_uploads cu, target_store ts
WHERE cu.store_id = ts.store_id
AND DATE(cu.created_at) = CURRENT_DATE

UNION ALL

SELECT 
    'Function Result' as method,
    active_members as users,
    total_videos as uploads,
    total_points as points
FROM target_store ts, 
LATERAL get_store_stats(ts.store_id, 'today');

-- 특정 스토어의 사용자별 활동
WITH target_store AS (
    SELECT '16f4c231-185a-4564-b473-bad1e9b305e8'::text as store_id
)
SELECT 
    cu.user_id,
    up.user_name,
    COUNT(cu.id) as uploads_today,
    SUM(cu.points_earned) as points_today,
    up.total_uploads as total_uploads,
    up.total_points as total_points
FROM content_uploads cu
JOIN user_progress up ON cu.user_id = up.user_id
JOIN target_store ts ON cu.store_id = ts.store_id
WHERE DATE(cu.created_at) = CURRENT_DATE
GROUP BY cu.user_id, up.user_name, up.total_uploads, up.total_points
ORDER BY uploads_today DESC;

-- =====================================================
-- 3. 회사별 디버깅
-- =====================================================

-- 회사 ID를 변경하여 사용
WITH target_company AS (
    SELECT 'cameraon'::text as company_id
)
SELECT 
    'Company Overview' as info,
    COUNT(DISTINCT cu.store_id) as total_stores,
    COUNT(DISTINCT cu.user_id) as total_users,
    COUNT(cu.id) as total_uploads,
    SUM(cu.points_earned) as total_points
FROM content_uploads cu, target_company tc
WHERE cu.company_id = tc.company_id;

-- 회사의 스토어별 성과
WITH target_company AS (
    SELECT 'cameraon'::text as company_id
)
SELECT 
    cu.store_id,
    COUNT(DISTINCT cu.user_id) as users,
    COUNT(cu.id) as uploads,
    SUM(cu.points_earned) as points,
    MAX(cu.created_at) as last_activity
FROM content_uploads cu, target_company tc
WHERE cu.company_id = tc.company_id
GROUP BY cu.store_id
ORDER BY uploads DESC;

-- =====================================================
-- 4. 데이터 무결성 빠른 체크
-- =====================================================

-- NULL 값 요약
SELECT 
    'NULL Values Summary' as check_type,
    SUM(CASE WHEN store_id IS NULL THEN 1 ELSE 0 END) as null_stores,
    SUM(CASE WHEN company_id IS NULL THEN 1 ELSE 0 END) as null_companies,
    SUM(CASE WHEN user_id IS NULL THEN 1 ELSE 0 END) as null_users,
    COUNT(*) as total_records,
    ROUND(100.0 * SUM(CASE WHEN store_id IS NOT NULL AND company_id IS NOT NULL THEN 1 ELSE 0 END) / COUNT(*), 2) as integrity_percentage
FROM content_uploads;

-- 불일치 데이터 찾기
WITH data_check AS (
    SELECT 
        up.user_id,
        up.total_uploads as saved_uploads,
        up.total_points as saved_points,
        COUNT(cu.id) as actual_uploads,
        COALESCE(SUM(cu.points_earned), 0) as actual_points
    FROM user_progress up
    LEFT JOIN content_uploads cu ON up.user_id = cu.user_id
    GROUP BY up.user_id, up.total_uploads, up.total_points
    HAVING up.total_uploads != COUNT(cu.id) OR up.total_points != COALESCE(SUM(cu.points_earned), 0)
)
SELECT COUNT(*) as users_with_mismatched_data FROM data_check;

-- =====================================================
-- 5. 함수 동작 테스트
-- =====================================================

-- 모든 기간별 스토어 통계 테스트
WITH test_store AS (
    SELECT store_id, company_id 
    FROM content_uploads 
    WHERE store_id IS NOT NULL 
    ORDER BY created_at DESC 
    LIMIT 1
)
SELECT 
    ts.store_id,
    ts.company_id,
    'today' as period,
    (get_store_stats(ts.store_id, 'today')).*
FROM test_store ts
UNION ALL
SELECT 
    ts.store_id,
    ts.company_id,
    'week' as period,
    (get_store_stats(ts.store_id, 'week')).*
FROM test_store ts
UNION ALL
SELECT 
    ts.store_id,
    ts.company_id,
    'month' as period,
    (get_store_stats(ts.store_id, 'month')).*
FROM test_store ts;

-- 모든 기간별 회사 통계 테스트
WITH test_company AS (
    SELECT company_id 
    FROM content_uploads 
    WHERE company_id IS NOT NULL 
    ORDER BY created_at DESC 
    LIMIT 1
)
SELECT 
    tc.company_id,
    'today' as period,
    (get_company_stats(tc.company_id, 'today')).*
FROM test_company tc
UNION ALL
SELECT 
    tc.company_id,
    'week' as period,
    (get_company_stats(tc.company_id, 'week')).*
FROM test_company tc
UNION ALL
SELECT 
    tc.company_id,
    'month' as period,
    (get_company_stats(tc.company_id, 'month')).*
FROM test_company tc;

-- =====================================================
-- 6. 즉시 수정 쿼리
-- =====================================================

-- NULL store_id/company_id 즉시 수정
UPDATE content_uploads cu
SET 
    store_id = up.store_id,
    company_id = up.company_id
FROM user_progress up
WHERE cu.user_id = up.user_id
AND (cu.store_id IS NULL OR cu.company_id IS NULL)
AND up.store_id IS NOT NULL
AND up.company_id IS NOT NULL;

-- user_progress 통계 재계산
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
WHERE up.user_id = subq.user_id;

-- 실행 결과 확인
SELECT 'Data fixed. Check results with monitoring queries.' as message;
