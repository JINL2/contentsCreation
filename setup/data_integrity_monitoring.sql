-- 데이터 무결성 모니터링 쿼리
-- 정기적으로 실행하여 데이터 일관성 확인

-- =====================================================
-- 1. 실시간 데이터 무결성 대시보드
-- =====================================================

-- 1.1 전체 데이터 건강도 체크
WITH integrity_check AS (
    -- NULL 값 체크
    SELECT 
        'content_uploads' as table_name,
        COUNT(*) as total_records,
        COUNT(CASE WHEN store_id IS NULL THEN 1 END) as null_store_id,
        COUNT(CASE WHEN company_id IS NULL THEN 1 END) as null_company_id,
        COUNT(CASE WHEN user_id IS NULL THEN 1 END) as null_user_id
    FROM content_uploads
    
    UNION ALL
    
    SELECT 
        'user_activities' as table_name,
        COUNT(*) as total_records,
        COUNT(CASE WHEN store_id IS NULL THEN 1 END) as null_store_id,
        COUNT(CASE WHEN company_id IS NULL THEN 1 END) as null_company_id,
        COUNT(CASE WHEN user_id IS NULL THEN 1 END) as null_user_id
    FROM user_activities
    
    UNION ALL
    
    SELECT 
        'user_progress' as table_name,
        COUNT(*) as total_records,
        COUNT(CASE WHEN store_id IS NULL THEN 1 END) as null_store_id,
        COUNT(CASE WHEN company_id IS NULL THEN 1 END) as null_company_id,
        COUNT(CASE WHEN user_id IS NULL THEN 1 END) as null_user_id
    FROM user_progress
)
SELECT 
    table_name,
    total_records,
    null_store_id,
    null_company_id,
    null_user_id,
    ROUND(100.0 * (total_records - GREATEST(null_store_id, null_company_id)) / NULLIF(total_records, 0), 2) as integrity_score
FROM integrity_check
ORDER BY integrity_score;

-- 1.2 사용자별 데이터 일관성 체크
WITH user_data_check AS (
    SELECT 
        up.user_id,
        up.total_uploads as progress_uploads,
        up.total_points as progress_points,
        COUNT(cu.id) as actual_uploads,
        COALESCE(SUM(cu.points_earned), 0) as actual_points,
        up.store_id as progress_store_id,
        up.company_id as progress_company_id,
        COUNT(DISTINCT cu.store_id) as upload_store_count,
        COUNT(DISTINCT cu.company_id) as upload_company_count
    FROM user_progress up
    LEFT JOIN content_uploads cu ON up.user_id = cu.user_id
    GROUP BY up.user_id, up.total_uploads, up.total_points, up.store_id, up.company_id
)
SELECT 
    user_id,
    CASE 
        WHEN progress_uploads != actual_uploads THEN 'Upload count mismatch'
        WHEN progress_points != actual_points THEN 'Points mismatch'
        WHEN upload_store_count > 1 THEN 'Multiple stores detected'
        WHEN upload_company_count > 1 THEN 'Multiple companies detected'
        ELSE 'OK'
    END as issue,
    progress_uploads,
    actual_uploads,
    progress_points,
    actual_points,
    progress_store_id,
    progress_company_id
FROM user_data_check
WHERE progress_uploads != actual_uploads 
   OR progress_points != actual_points
   OR upload_store_count > 1
   OR upload_company_count > 1
ORDER BY user_id;

-- =====================================================
-- 2. 스토어/회사별 통계 검증
-- =====================================================

-- 2.1 스토어별 통계 비교 (여러 방법으로 계산하여 비교)
WITH method1 AS (
    -- content_uploads 직접 집계
    SELECT 
        store_id,
        COUNT(DISTINCT user_id) as users,
        COUNT(*) as uploads,
        SUM(points_earned) as points
    FROM content_uploads
    WHERE store_id IS NOT NULL
    GROUP BY store_id
),
method2 AS (
    -- user_progress 기준 집계
    SELECT 
        store_id,
        COUNT(DISTINCT user_id) as users,
        SUM(total_uploads) as uploads,
        SUM(total_points) as points
    FROM user_progress
    WHERE store_id IS NOT NULL
    GROUP BY store_id
)
SELECT 
    COALESCE(m1.store_id, m2.store_id) as store_id,
    m1.users as uploads_users,
    m2.users as progress_users,
    m1.uploads as actual_uploads,
    m2.uploads as progress_uploads,
    m1.points as actual_points,
    m2.points as progress_points,
    CASE 
        WHEN m1.uploads != m2.uploads THEN 'Upload mismatch'
        WHEN m1.points != m2.points THEN 'Points mismatch'
        ELSE 'OK'
    END as status
FROM method1 m1
FULL OUTER JOIN method2 m2 ON m1.store_id = m2.store_id
WHERE m1.uploads != m2.uploads OR m1.points != m2.points;

-- 2.2 회사별 통계 검증
WITH company_check AS (
    SELECT 
        cu.company_id,
        COUNT(DISTINCT cu.store_id) as store_count,
        COUNT(DISTINCT cu.user_id) as user_count,
        COUNT(cu.id) as upload_count,
        SUM(cu.points_earned) as total_points,
        MIN(cu.created_at) as first_activity,
        MAX(cu.created_at) as last_activity
    FROM content_uploads cu
    WHERE cu.company_id IS NOT NULL
    GROUP BY cu.company_id
)
SELECT * FROM company_check ORDER BY upload_count DESC;

-- =====================================================
-- 3. 자동 데이터 수정 프로시저
-- =====================================================

-- 3.1 데이터 무결성 자동 수정 함수
CREATE OR REPLACE FUNCTION fix_data_integrity()
RETURNS TABLE (
    fixed_uploads INT,
    fixed_activities INT,
    fixed_progress INT,
    synced_users INT
) AS $$
DECLARE
    v_fixed_uploads INT := 0;
    v_fixed_activities INT := 0;
    v_fixed_progress INT := 0;
    v_synced_users INT := 0;
BEGIN
    -- 1. content_uploads의 NULL store_id/company_id 수정
    UPDATE content_uploads cu
    SET 
        store_id = up.store_id,
        company_id = up.company_id
    FROM user_progress up
    WHERE cu.user_id = up.user_id
    AND (cu.store_id IS NULL OR cu.company_id IS NULL)
    AND up.store_id IS NOT NULL
    AND up.company_id IS NOT NULL;
    
    GET DIAGNOSTICS v_fixed_uploads = ROW_COUNT;
    
    -- 2. user_activities의 NULL store_id/company_id 수정
    UPDATE user_activities ua
    SET 
        store_id = up.store_id,
        company_id = up.company_id
    FROM user_progress up
    WHERE ua.user_id = up.user_id
    AND (ua.store_id IS NULL OR ua.company_id IS NULL)
    AND up.store_id IS NOT NULL
    AND up.company_id IS NOT NULL;
    
    GET DIAGNOSTICS v_fixed_activities = ROW_COUNT;
    
    -- 3. user_progress의 잘못된 통계 수정
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
    
    GET DIAGNOSTICS v_fixed_progress = ROW_COUNT;
    
    -- 4. 새로운 사용자 동기화
    INSERT INTO user_progress (user_id, company_id, store_id, total_uploads, total_points)
    SELECT 
        cu.user_id,
        cu.company_id,
        cu.store_id,
        COUNT(cu.id) as total_uploads,
        COALESCE(SUM(cu.points_earned), 0) as total_points
    FROM content_uploads cu
    LEFT JOIN user_progress up ON cu.user_id = up.user_id
    WHERE up.user_id IS NULL
    GROUP BY cu.user_id, cu.company_id, cu.store_id;
    
    GET DIAGNOSTICS v_synced_users = ROW_COUNT;
    
    RETURN QUERY SELECT v_fixed_uploads, v_fixed_activities, v_fixed_progress, v_synced_users;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 4. 실시간 모니터링 뷰
-- =====================================================

-- 4.1 데이터 건강도 뷰
CREATE OR REPLACE VIEW data_health_monitor AS
WITH upload_stats AS (
    SELECT 
        DATE(created_at) as date,
        COUNT(*) as uploads,
        COUNT(DISTINCT user_id) as users,
        COUNT(CASE WHEN store_id IS NULL THEN 1 END) as null_stores,
        COUNT(CASE WHEN company_id IS NULL THEN 1 END) as null_companies
    FROM content_uploads
    WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'
    GROUP BY DATE(created_at)
)
SELECT 
    date,
    uploads,
    users,
    null_stores,
    null_companies,
    ROUND(100.0 * (uploads - GREATEST(null_stores, null_companies)) / NULLIF(uploads, 0), 2) as data_quality_score
FROM upload_stats
ORDER BY date DESC;

-- 4.2 스토어 활동 모니터
CREATE OR REPLACE VIEW store_activity_monitor AS
SELECT 
    s.store_id,
    s.company_id,
    COUNT(DISTINCT DATE(cu.created_at)) as active_days,
    COUNT(DISTINCT cu.user_id) as total_users,
    COUNT(cu.id) as total_uploads,
    COALESCE(SUM(cu.points_earned), 0) as total_points,
    MAX(cu.created_at) as last_activity,
    CASE 
        WHEN MAX(cu.created_at) > CURRENT_TIMESTAMP - INTERVAL '1 day' THEN 'Active'
        WHEN MAX(cu.created_at) > CURRENT_TIMESTAMP - INTERVAL '7 days' THEN 'Low Activity'
        ELSE 'Inactive'
    END as status
FROM (SELECT DISTINCT store_id, company_id FROM user_progress WHERE store_id IS NOT NULL) s
LEFT JOIN content_uploads cu ON s.store_id = cu.store_id
GROUP BY s.store_id, s.company_id;

-- =====================================================
-- 5. 사용 예시
-- =====================================================

-- 데이터 무결성 자동 수정 실행
SELECT * FROM fix_data_integrity();

-- 데이터 건강도 확인
SELECT * FROM data_health_monitor;

-- 스토어 활동 상태 확인
SELECT * FROM store_activity_monitor WHERE status != 'Active';

-- 특정 스토어의 상세 통계
SELECT 
    'Store Stats' as type,
    store_id,
    get_store_stats(store_id, 'today') as today,
    get_store_stats(store_id, 'week') as this_week,
    get_store_stats(store_id, 'month') as this_month
FROM (SELECT '16f4c231-185a-4564-b473-bad1e9b305e8'::text as store_id) s;
