-- 데이터 무결성 확인 및 수정 스크립트
-- 실행일: 2025-06-29

-- =====================================================
-- 1. 데이터 무결성 확인
-- =====================================================

-- 1.1 NULL store_id/company_id 확인
SELECT 
    'content_uploads with NULL store_id' as issue,
    COUNT(*) as count
FROM content_uploads
WHERE store_id IS NULL OR company_id IS NULL

UNION ALL

SELECT 
    'user_activities with NULL store_id' as issue,
    COUNT(*) as count
FROM user_activities
WHERE store_id IS NULL OR company_id IS NULL

UNION ALL

SELECT 
    'user_progress with NULL store_id' as issue,
    COUNT(*) as count
FROM user_progress
WHERE store_id IS NULL OR company_id IS NULL;

-- 1.2 데이터 불일치 확인
WITH upload_stats AS (
    SELECT 
        user_id,
        COUNT(*) as upload_count,
        SUM(points_earned) as total_points
    FROM content_uploads
    GROUP BY user_id
),
progress_stats AS (
    SELECT 
        user_id,
        total_uploads,
        total_points
    FROM user_progress
)
SELECT 
    'Data mismatch between uploads and progress' as issue,
    COUNT(*) as count
FROM upload_stats u
JOIN progress_stats p ON u.user_id = p.user_id
WHERE u.upload_count != p.total_uploads
   OR u.total_points != p.total_points;

-- =====================================================
-- 2. 데이터 무결성 수정
-- =====================================================

-- 2.1 user_progress에서 store_id/company_id 가져와서 다른 테이블 업데이트
-- content_uploads 업데이트
UPDATE content_uploads cu
SET 
    store_id = COALESCE(cu.store_id, up.store_id),
    company_id = COALESCE(cu.company_id, up.company_id)
FROM user_progress up
WHERE cu.user_id = up.user_id
AND (cu.store_id IS NULL OR cu.company_id IS NULL);

-- user_activities 업데이트
UPDATE user_activities ua
SET 
    store_id = COALESCE(ua.store_id, up.store_id),
    company_id = COALESCE(ua.company_id, up.company_id)
FROM user_progress up
WHERE ua.user_id = up.user_id
AND (ua.store_id IS NULL OR ua.company_id IS NULL);

-- 2.2 user_progress의 통계 재계산
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

-- =====================================================
-- 3. 통합된 get_store_stats 함수 (최종 버전)
-- =====================================================

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
    -- content_uploads 테이블을 기준으로 통계 계산
    -- (실제 업로드된 컨텐츠가 가장 정확한 지표)
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
    END IF;
    
    -- 결과가 없는 경우 0 반환
    IF NOT FOUND THEN
        RETURN QUERY SELECT 0::INT, 0::INT, 0::INT;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 4. get_company_stats 함수 생성 (회사별 통계)
-- =====================================================

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
    END IF;
    
    -- 결과가 없는 경우 0 반환
    IF NOT FOUND THEN
        RETURN QUERY SELECT 0::INT, 0::INT, 0::INT, 0::INT;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 5. 데이터 검증 쿼리
-- =====================================================

-- 5.1 스토어별 통계 확인
SELECT 
    store_id,
    company_id,
    COUNT(DISTINCT user_id) as users,
    COUNT(*) as uploads,
    SUM(points_earned) as points,
    MIN(created_at) as first_upload,
    MAX(created_at) as last_upload
FROM content_uploads
WHERE store_id IS NOT NULL
GROUP BY store_id, company_id
ORDER BY uploads DESC;

-- 5.2 회사별 통계 확인
SELECT 
    company_id,
    COUNT(DISTINCT store_id) as stores,
    COUNT(DISTINCT user_id) as users,
    COUNT(*) as uploads,
    SUM(points_earned) as points
FROM content_uploads
WHERE company_id IS NOT NULL
GROUP BY company_id
ORDER BY uploads DESC;

-- 5.3 함수 테스트
-- 특정 스토어의 통계
SELECT 'Today' as period, * FROM get_store_stats('16f4c231-185a-4564-b473-bad1e9b305e8', 'today')
UNION ALL
SELECT 'Week' as period, * FROM get_store_stats('16f4c231-185a-4564-b473-bad1e9b305e8', 'week')
UNION ALL
SELECT 'Month' as period, * FROM get_store_stats('16f4c231-185a-4564-b473-bad1e9b305e8', 'month');

-- 특정 회사의 통계
SELECT 'Today' as period, * FROM get_company_stats('cameraon', 'today')
UNION ALL
SELECT 'Week' as period, * FROM get_company_stats('cameraon', 'week')
UNION ALL
SELECT 'Month' as period, * FROM get_company_stats('cameraon', 'month');

-- =====================================================
-- 6. 트리거 생성: 데이터 일관성 유지
-- =====================================================

-- content_uploads 삽입 시 user_progress 자동 업데이트
CREATE OR REPLACE FUNCTION sync_user_progress()
RETURNS TRIGGER AS $$
BEGIN
    -- user_progress 업데이트
    INSERT INTO user_progress (
        user_id, 
        company_id, 
        store_id, 
        total_points, 
        total_uploads,
        last_activity_date
    )
    VALUES (
        NEW.user_id,
        NEW.company_id,
        NEW.store_id,
        NEW.points_earned,
        1,
        CURRENT_DATE
    )
    ON CONFLICT (user_id) DO UPDATE
    SET 
        total_points = user_progress.total_points + NEW.points_earned,
        total_uploads = user_progress.total_uploads + 1,
        last_activity_date = CURRENT_DATE,
        updated_at = NOW(),
        -- store_id와 company_id가 NULL인 경우 업데이트
        store_id = COALESCE(user_progress.store_id, NEW.store_id),
        company_id = COALESCE(user_progress.company_id, NEW.company_id);
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 트리거 생성
DROP TRIGGER IF EXISTS trigger_sync_user_progress ON content_uploads;
CREATE TRIGGER trigger_sync_user_progress
AFTER INSERT ON content_uploads
FOR EACH ROW
EXECUTE FUNCTION sync_user_progress();

-- =====================================================
-- 7. 실행 완료 메시지
-- =====================================================
DO $$
BEGIN
    RAISE NOTICE '데이터 무결성 검사 및 수정 완료';
    RAISE NOTICE 'get_store_stats 및 get_company_stats 함수 재생성 완료';
    RAISE NOTICE '자동 동기화 트리거 생성 완료';
END $$;
