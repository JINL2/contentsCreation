-- =====================================================
-- Jin 사용자 데이터 즉시 수정 스크립트
-- 이 스크립트 실행하면 Jin의 모든 데이터가 정상화됩니다
-- =====================================================

-- Jin 사용자 정보
-- user_id: 0d2e61ad-e230-454e-8b90-efbe1c1a9268
-- user_name: Jin
-- store_id: 16f4c231-185a-4564-b473-bad1e9b305e8

-- 1. 현재 문제 상황 확인
SELECT 
    'BEFORE FIX - Jin Upload Issues' as status,
    COUNT(*) as total_uploads,
    COUNT(CASE WHEN store_id IS NULL THEN 1 END) as null_store_uploads,
    COUNT(CASE WHEN store_id = '16f4c231-185a-4564-b473-bad1e9b305e8' THEN 1 END) as correct_store_uploads,
    COUNT(CASE WHEN store_id != '16f4c231-185a-4564-b473-bad1e9b305e8' THEN 1 END) as wrong_store_uploads
FROM content_uploads
WHERE user_id = '0d2e61ad-e230-454e-8b90-efbe1c1a9268';

-- 2. content_uploads 테이블 수정 - Jin의 모든 업로드에 올바른 store_id 설정
UPDATE content_uploads
SET 
    store_id = '16f4c231-185a-4564-b473-bad1e9b305e8',
    company_id = COALESCE(company_id, 'cameraon')  -- company_id가 없으면 기본값 설정
WHERE user_id = '0d2e61ad-e230-454e-8b90-efbe1c1a9268'
AND (store_id IS NULL OR store_id != '16f4c231-185a-4564-b473-bad1e9b305e8');

-- 3. user_activities 테이블도 수정
UPDATE user_activities
SET 
    store_id = '16f4c231-185a-4564-b473-bad1e9b305e8',
    company_id = COALESCE(company_id, 'cameraon')
WHERE user_id = '0d2e61ad-e230-454e-8b90-efbe1c1a9268'
AND (store_id IS NULL OR store_id != '16f4c231-185a-4564-b473-bad1e9b305e8');

-- 4. user_progress 업데이트
UPDATE user_progress
SET 
    store_id = '16f4c231-185a-4564-b473-bad1e9b305e8',
    company_id = COALESCE(company_id, 'cameraon'),
    -- 실제 업로드 수와 포인트로 재계산
    total_uploads = (
        SELECT COUNT(*) 
        FROM content_uploads 
        WHERE user_id = '0d2e61ad-e230-454e-8b90-efbe1c1a9268'
    ),
    total_points = (
        SELECT COALESCE(SUM(points_earned), 0) 
        FROM content_uploads 
        WHERE user_id = '0d2e61ad-e230-454e-8b90-efbe1c1a9268'
    ),
    updated_at = NOW()
WHERE user_id = '0d2e61ad-e230-454e-8b90-efbe1c1a9268';

-- 5. 수정 후 확인
SELECT 
    'AFTER FIX - Jin Upload Status' as status,
    COUNT(*) as total_uploads,
    COUNT(CASE WHEN store_id = '16f4c231-185a-4564-b473-bad1e9b305e8' THEN 1 END) as correct_store_uploads,
    SUM(points_earned) as total_points
FROM content_uploads
WHERE user_id = '0d2e61ad-e230-454e-8b90-efbe1c1a9268';

-- 6. 함수 재생성 (혹시 함수에 문제가 있을 경우를 대비)
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
    IF p_store_id IS NULL THEN
        RETURN QUERY SELECT 0::INT, 0::INT, 0::INT;
        RETURN;
    END IF;
    
    CASE LOWER(p_period)  -- 대소문자 구분 없이 처리
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
            
        ELSE  -- 기본값: today
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

-- 7. 최종 테스트 - 수정된 데이터로 함수 실행
SELECT 
    '=== FINAL TEST - Store Stats ===' as test,
    'Today' as period,
    (get_store_stats('16f4c231-185a-4564-b473-bad1e9b305e8', 'today')).*
UNION ALL
SELECT 
    '=== FINAL TEST - Store Stats ===' as test,
    'Week' as period,
    (get_store_stats('16f4c231-185a-4564-b473-bad1e9b305e8', 'week')).*
UNION ALL
SELECT 
    '=== FINAL TEST - Store Stats ===' as test,
    'Month' as period,
    (get_store_stats('16f4c231-185a-4564-b473-bad1e9b305e8', 'month')).*;

-- 8. Jin의 최종 상태 확인
SELECT 
    '=== FINAL - Jin Profile ===' as info,
    up.user_id,
    up.metadata->>'name' as user_name,
    up.store_id,
    up.company_id,
    up.total_uploads,
    up.total_points,
    up.current_level,
    (SELECT COUNT(*) FROM content_uploads WHERE user_id = up.user_id AND DATE(created_at) = CURRENT_DATE) as uploads_today
FROM user_progress up
WHERE up.user_id = '0d2e61ad-e230-454e-8b90-efbe1c1a9268';

-- 9. 완료 메시지
DO $$
DECLARE
    v_fixed_count INTEGER;
    v_total_uploads INTEGER;
BEGIN
    SELECT 
        COUNT(*),
        SUM(CASE WHEN store_id = '16f4c231-185a-4564-b473-bad1e9b305e8' THEN 1 ELSE 0 END)
    INTO v_total_uploads, v_fixed_count
    FROM content_uploads
    WHERE user_id = '0d2e61ad-e230-454e-8b90-efbe1c1a9268';
    
    RAISE NOTICE '';
    RAISE NOTICE '===== 수정 완료 =====';
    RAISE NOTICE 'Jin 사용자의 총 업로드: %개', v_total_uploads;
    RAISE NOTICE '올바른 store_id로 수정된 업로드: %개', v_fixed_count;
    RAISE NOTICE 'Store ID: 16f4c231-185a-4564-b473-bad1e9b305e8';
    RAISE NOTICE '✅ 모든 데이터가 정상화되었습니다!';
    RAISE NOTICE '';
END $$;
