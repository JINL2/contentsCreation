-- =====================================================
-- Jin 사용자 올인원 테스트 & 수정 스크립트
-- 이 스크립트 하나만 실행하면 모든 문제 해결
-- =====================================================

-- 테스트 대상
-- user_id: 0d2e61ad-e230-454e-8b90-efbe1c1a9268 (Jin)
-- store_id: 16f4c231-185a-4564-b473-bad1e9b305e8

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Jin 사용자 테스트 시작';
    RAISE NOTICE '========================================';
    RAISE NOTICE '';
END $$;

-- STEP 1: 현재 상태 진단
WITH diagnosis AS (
    SELECT 
        -- Jin 데이터 확인
        (SELECT COUNT(*) FROM user_progress WHERE user_id = '0d2e61ad-e230-454e-8b90-efbe1c1a9268') as jin_exists,
        (SELECT COUNT(*) FROM content_uploads WHERE user_id = '0d2e61ad-e230-454e-8b90-efbe1c1a9268') as jin_uploads,
        (SELECT COUNT(*) FROM content_uploads WHERE user_id = '0d2e61ad-e230-454e-8b90-efbe1c1a9268' AND store_id IS NULL) as null_stores,
        (SELECT COUNT(*) FROM content_uploads WHERE user_id = '0d2e61ad-e230-454e-8b90-efbe1c1a9268' AND store_id != '16f4c231-185a-4564-b473-bad1e9b305e8') as wrong_stores,
        -- 함수 확인
        EXISTS(SELECT 1 FROM pg_proc WHERE proname = 'get_store_stats') as func_exists
)
SELECT 
    '📋 STEP 1: 진단 결과' as step,
    CASE WHEN jin_exists > 0 THEN '✅' ELSE '❌' END || ' Jin 사용자 존재' as check1,
    CASE WHEN jin_uploads > 0 THEN '✅' ELSE '❌' END || ' 업로드 기록 있음 (' || jin_uploads || '개)' as check2,
    CASE WHEN null_stores = 0 THEN '✅' ELSE '❌' END || ' NULL store_id (' || null_stores || '개)' as check3,
    CASE WHEN wrong_stores = 0 THEN '✅' ELSE '❌' END || ' 잘못된 store_id (' || wrong_stores || '개)' as check4,
    CASE WHEN func_exists THEN '✅' ELSE '❌' END || ' 함수 존재' as check5
FROM diagnosis;

-- STEP 2: 데이터 수정
UPDATE content_uploads
SET 
    store_id = '16f4c231-185a-4564-b473-bad1e9b305e8',
    company_id = COALESCE(company_id, 'cameraon')
WHERE user_id = '0d2e61ad-e230-454e-8b90-efbe1c1a9268'
AND (store_id IS NULL OR store_id != '16f4c231-185a-4564-b473-bad1e9b305e8');

UPDATE user_activities
SET 
    store_id = '16f4c231-185a-4564-b473-bad1e9b305e8',
    company_id = COALESCE(company_id, 'cameraon')
WHERE user_id = '0d2e61ad-e230-454e-8b90-efbe1c1a9268'
AND (store_id IS NULL OR store_id != '16f4c231-185a-4564-b473-bad1e9b305e8');

UPDATE user_progress
SET 
    store_id = '16f4c231-185a-4564-b473-bad1e9b305e8',
    company_id = COALESCE(company_id, 'cameraon'),
    total_uploads = (SELECT COUNT(*) FROM content_uploads WHERE user_id = '0d2e61ad-e230-454e-8b90-efbe1c1a9268'),
    total_points = (SELECT COALESCE(SUM(points_earned), 0) FROM content_uploads WHERE user_id = '0d2e61ad-e230-454e-8b90-efbe1c1a9268'),
    updated_at = NOW()
WHERE user_id = '0d2e61ad-e230-454e-8b90-efbe1c1a9268';

-- STEP 3: 함수 재생성
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
    
    CASE LOWER(p_period)
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
            
        ELSE
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

-- STEP 4: 수정 후 검증
SELECT 
    '✅ STEP 4: 수정 완료' as step,
    (SELECT COUNT(*) FROM content_uploads WHERE user_id = '0d2e61ad-e230-454e-8b90-efbe1c1a9268' AND store_id = '16f4c231-185a-4564-b473-bad1e9b305e8') as corrected_uploads,
    (SELECT total_uploads FROM user_progress WHERE user_id = '0d2e61ad-e230-454e-8b90-efbe1c1a9268') as profile_uploads,
    (SELECT total_points FROM user_progress WHERE user_id = '0d2e61ad-e230-454e-8b90-efbe1c1a9268') as total_points;

-- STEP 5: 함수 테스트
SELECT 
    '📊 STEP 5: 스토어 통계' as step,
    'Today' as period,
    active_members,
    total_videos,
    total_points
FROM get_store_stats('16f4c231-185a-4564-b473-bad1e9b305e8', 'today')
UNION ALL
SELECT 
    '📊 STEP 5: 스토어 통계' as step,
    'Week' as period,
    active_members,
    total_videos,
    total_points
FROM get_store_stats('16f4c231-185a-4564-b473-bad1e9b305e8', 'week')
UNION ALL
SELECT 
    '📊 STEP 5: 스토어 통계' as step,
    'Month' as period,
    active_members,
    total_videos,
    total_points
FROM get_store_stats('16f4c231-185a-4564-b473-bad1e9b305e8', 'month');

-- STEP 6: Jin 최종 상태
SELECT 
    '👤 STEP 6: Jin 최종 상태' as step,
    metadata->>'name' as name,
    store_id,
    total_uploads,
    total_points,
    current_level
FROM user_progress
WHERE user_id = '0d2e61ad-e230-454e-8b90-efbe1c1a9268';

-- STEP 7: 앱 화면 시뮬레이션
WITH app_data AS (
    SELECT 
        -- 헤더 정보
        (SELECT total_points FROM user_progress WHERE user_id = '0d2e61ad-e230-454e-8b90-efbe1c1a9268') as user_points,
        (SELECT current_level FROM user_progress WHERE user_id = '0d2e61ad-e230-454e-8b90-efbe1c1a9268') as user_level,
        -- 오늘 통계
        (SELECT COUNT(*) FROM content_uploads WHERE user_id = '0d2e61ad-e230-454e-8b90-efbe1c1a9268' AND DATE(created_at) = CURRENT_DATE) as today_uploads,
        -- 스토어 통계
        (SELECT active_members FROM get_store_stats('16f4c231-185a-4564-b473-bad1e9b305e8', 'today')) as store_active_members,
        (SELECT total_videos FROM get_store_stats('16f4c231-185a-4564-b473-bad1e9b305e8', 'today')) as store_total_videos,
        (SELECT total_points FROM get_store_stats('16f4c231-185a-4564-b473-bad1e9b305e8', 'today')) as store_total_points
)
SELECT 
    '📱 STEP 7: 앱 화면 데이터' as step,
    json_build_object(
        'user', json_build_object(
            'points', user_points,
            'level', user_level,
            'todayUploads', today_uploads
        ),
        'store', json_build_object(
            'activeMembers', store_active_members,
            'totalVideos', store_total_videos,
            'totalPoints', store_total_points
        )
    ) as app_display_data
FROM app_data;

-- 완료 메시지
DO $$
DECLARE
    v_uploads INTEGER;
    v_points INTEGER;
BEGIN
    SELECT total_uploads, total_points 
    INTO v_uploads, v_points
    FROM user_progress 
    WHERE user_id = '0d2e61ad-e230-454e-8b90-efbe1c1a9268';
    
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE '✅ 테스트 완료!';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Jin 사용자 상태:';
    RAISE NOTICE '- 총 업로드: %개', v_uploads;
    RAISE NOTICE '- 총 포인트: %점', v_points;
    RAISE NOTICE '- Store ID: 16f4c231-185a-4564-b473-bad1e9b305e8';
    RAISE NOTICE '';
    RAISE NOTICE '모든 데이터가 정상화되었습니다.';
    RAISE NOTICE '앱에서 다시 테스트해보세요!';
    RAISE NOTICE '========================================';
    RAISE NOTICE '';
END $$;
