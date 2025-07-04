-- =====================================================
-- Jin 사용자 앱 화면 시뮬레이션
-- URL 접속시 실제로 보여질 데이터 테스트
-- =====================================================

-- URL: http://localhost/mysite/contents_helper_website/?user_id=0d2e61ad-e230-454e-8b90-efbe1c1a9268&user_name=Jin&store_id=16f4c231-185a-4564-b473-bad1e9b305e8

-- =====================================================
-- 앱 상단 헤더 - 사용자 정보
-- =====================================================
SELECT 
    '📱 APP HEADER' as screen_section,
    'User Info' as component,
    up.metadata->>'name' as display_name,
    up.total_points as points,
    up.current_level as level,
    up.streak_days as streak
FROM user_progress up
WHERE up.user_id = '0d2e61ad-e230-454e-8b90-efbe1c1a9268';

-- =====================================================
-- 사용자 상세 통계 섹션
-- =====================================================
WITH user_stats AS (
    SELECT 
        COUNT(*) as total_uploads,
        COUNT(CASE WHEN DATE(created_at) = CURRENT_DATE THEN 1 END) as today_uploads
    FROM content_uploads
    WHERE user_id = '0d2e61ad-e230-454e-8b90-efbe1c1a9268'
)
SELECT 
    '📊 USER STATS SECTION' as screen_section,
    'Statistics' as component,
    us.total_uploads as total_videos,
    us.today_uploads as videos_today,
    up.total_points as total_points,
    up.current_level as current_level
FROM user_stats us
CROSS JOIN user_progress up
WHERE up.user_id = '0d2e61ad-e230-454e-8b90-efbe1c1a9268';

-- =====================================================
-- 팀 성과 모달 - showTeamPerformanceModal()
-- =====================================================
-- Today Tab
SELECT 
    '🏢 TEAM PERFORMANCE - TODAY' as screen_section,
    'Modal Content' as component,
    active_members,
    total_videos,
    total_points
FROM get_store_stats('16f4c231-185a-4564-b473-bad1e9b305e8', 'today');

-- Week Tab
SELECT 
    '🏢 TEAM PERFORMANCE - WEEK' as screen_section,
    'Modal Content' as component,
    active_members,
    total_videos,
    total_points
FROM get_store_stats('16f4c231-185a-4564-b473-bad1e9b305e8', 'week');

-- Month Tab
SELECT 
    '🏢 TEAM PERFORMANCE - MONTH' as screen_section,
    'Modal Content' as component,
    active_members,
    total_videos,
    total_points
FROM get_store_stats('16f4c231-185a-4564-b473-bad1e9b305e8', 'month');

-- =====================================================
-- 랭킹 모달 - showRankingModal()
-- =====================================================
-- Store Ranking
WITH store_ranking AS (
    SELECT 
        user_id,
        ROW_NUMBER() OVER (ORDER BY total_points DESC) as rank,
        total_points,
        current_level,
        total_uploads
    FROM user_progress
    WHERE store_id = '16f4c231-185a-4564-b473-bad1e9b305e8'
)
SELECT 
    '🏆 STORE RANKING' as screen_section,
    'Jin Position' as component,
    rank as jin_rank,
    (SELECT COUNT(*) FROM store_ranking) as total_members,
    total_points as jin_points,
    current_level as jin_level
FROM store_ranking
WHERE user_id = '0d2e61ad-e230-454e-8b90-efbe1c1a9268';

-- Company Ranking (if company_id exists)
WITH company_ranking AS (
    SELECT 
        user_id,
        ROW_NUMBER() OVER (ORDER BY total_points DESC) as rank,
        total_points,
        current_level
    FROM user_progress
    WHERE company_id = (SELECT company_id FROM user_progress WHERE user_id = '0d2e61ad-e230-454e-8b90-efbe1c1a9268')
)
SELECT 
    '🏆 COMPANY RANKING' as screen_section,
    'Jin Position' as component,
    rank as jin_rank,
    (SELECT COUNT(*) FROM company_ranking) as total_members,
    total_points as jin_points,
    current_level as jin_level
FROM company_ranking
WHERE user_id = '0d2e61ad-e230-454e-8b90-efbe1c1a9268';

-- =====================================================
-- 최근 아이디어 카드 (showIdeas)
-- =====================================================
SELECT 
    '💡 IDEA CARDS' as screen_section,
    'Available Ideas' as component,
    COUNT(*) as available_ideas,
    COUNT(CASE WHEN is_choosen = true AND is_upload = false THEN 1 END) as chosen_not_uploaded,
    COUNT(CASE WHEN is_auto_created = false THEN 1 END) as custom_ideas
FROM contents_idea
WHERE is_upload = false;

-- =====================================================
-- 완료 화면 데이터 (Step 4)
-- =====================================================
WITH recent_upload AS (
    SELECT 
        points_earned,
        created_at
    FROM content_uploads
    WHERE user_id = '0d2e61ad-e230-454e-8b90-efbe1c1a9268'
    ORDER BY created_at DESC
    LIMIT 1
)
SELECT 
    '✅ COMPLETION SCREEN' as screen_section,
    'Last Upload' as component,
    points_earned as earned_points,
    created_at as upload_time
FROM recent_upload;

-- =====================================================
-- JavaScript 콘솔 로그 시뮬레이션
-- =====================================================
DO $$
DECLARE
    v_store_stats RECORD;
    v_user_stats RECORD;
BEGIN
    -- 사용자 통계
    SELECT * INTO v_user_stats
    FROM user_progress
    WHERE user_id = '0d2e61ad-e230-454e-8b90-efbe1c1a9268';
    
    -- 스토어 통계
    SELECT * INTO v_store_stats
    FROM get_store_stats('16f4c231-185a-4564-b473-bad1e9b305e8', 'today');
    
    RAISE NOTICE '';
    RAISE NOTICE '=== JavaScript Console Output ===';
    RAISE NOTICE 'Contents Helper 초기화 중...';
    RAISE NOTICE 'URL 파라미터로 사용자 설정: {';
    RAISE NOTICE '  userId: "0d2e61ad-e230-454e-8b90-efbe1c1a9268",';
    RAISE NOTICE '  userName: "Jin",';
    RAISE NOTICE '  storeId: "16f4c231-185a-4564-b473-bad1e9b305e8"';
    RAISE NOTICE '}';
    RAISE NOTICE '';
    RAISE NOTICE '사용자 통계: {';
    RAISE NOTICE '  totalPoints: %,', v_user_stats.total_points;
    RAISE NOTICE '  level: %,', v_user_stats.current_level;
    RAISE NOTICE '  totalUploads: %', v_user_stats.total_uploads;
    RAISE NOTICE '}';
    RAISE NOTICE '';
    RAISE NOTICE 'Store Stats (Today): {';
    RAISE NOTICE '  active_members: %,', v_store_stats.active_members;
    RAISE NOTICE '  total_videos: %,', v_store_stats.total_videos;
    RAISE NOTICE '  total_points: %', v_store_stats.total_points;
    RAISE NOTICE '}';
    RAISE NOTICE '';
END $$;

-- =====================================================
-- 데이터 검증 체크리스트
-- =====================================================
WITH validation AS (
    SELECT 
        -- 데이터 존재 여부
        EXISTS(SELECT 1 FROM user_progress WHERE user_id = '0d2e61ad-e230-454e-8b90-efbe1c1a9268') as user_exists,
        EXISTS(SELECT 1 FROM content_uploads WHERE user_id = '0d2e61ad-e230-454e-8b90-efbe1c1a9268') as has_uploads,
        EXISTS(SELECT 1 FROM pg_proc WHERE proname = 'get_store_stats') as function_exists,
        -- 데이터 일관성
        (SELECT COUNT(*) FROM content_uploads WHERE user_id = '0d2e61ad-e230-454e-8b90-efbe1c1a9268' AND store_id != '16f4c231-185a-4564-b473-bad1e9b305e8') as wrong_store_count,
        (SELECT COUNT(*) FROM content_uploads WHERE user_id = '0d2e61ad-e230-454e-8b90-efbe1c1a9268' AND store_id IS NULL) as null_store_count
)
SELECT 
    '✔️ VALIDATION CHECKLIST' as section,
    CASE WHEN user_exists THEN '✅' ELSE '❌' END || ' User Profile Exists' as check1,
    CASE WHEN has_uploads THEN '✅' ELSE '❌' END || ' Has Uploads' as check2,
    CASE WHEN function_exists THEN '✅' ELSE '❌' END || ' Functions Exist' as check3,
    CASE WHEN wrong_store_count = 0 AND null_store_count = 0 THEN '✅' ELSE '❌' END || ' Data Integrity OK' as check4
FROM validation;

-- =====================================================
-- 문제가 있을 경우 수정 명령
-- =====================================================
SELECT 
    '🔧 FIX COMMANDS' as section,
    'If data issues exist, run:' as instruction,
    '/setup/fix_jin_data_immediate.sql' as fix_script,
    'This will correct all data for Jin user' as description;
