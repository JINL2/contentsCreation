-- =====================================================
-- Jin 사용자 빠른 테스트 쿼리 모음
-- 복사해서 바로 실행 가능한 원라이너들
-- =====================================================

-- 1. Jin의 현재 스토어 통계 (오늘)
SELECT * FROM get_store_stats('16f4c231-185a-4564-b473-bad1e9b305e8', 'today');

-- 2. Jin의 개인 정보
SELECT user_id, metadata->>'name' as name, store_id, total_points, total_uploads FROM user_progress WHERE user_id = '0d2e61ad-e230-454e-8b90-efbe1c1a9268';

-- 3. Jin의 최근 업로드 5개
SELECT id, created_at, store_id, points_earned, title FROM content_uploads WHERE user_id = '0d2e61ad-e230-454e-8b90-efbe1c1a9268' ORDER BY created_at DESC LIMIT 5;

-- 4. 스토어의 모든 기간 통계 한번에
SELECT 'today' as period, * FROM get_store_stats('16f4c231-185a-4564-b473-bad1e9b305e8', 'today') UNION ALL SELECT 'week', * FROM get_store_stats('16f4c231-185a-4564-b473-bad1e9b305e8', 'week') UNION ALL SELECT 'month', * FROM get_store_stats('16f4c231-185a-4564-b473-bad1e9b305e8', 'month');

-- 5. Jin의 데이터 무결성 체크
SELECT COUNT(*) as total, COUNT(CASE WHEN store_id = '16f4c231-185a-4564-b473-bad1e9b305e8' THEN 1 END) as correct, COUNT(CASE WHEN store_id IS NULL THEN 1 END) as nulls FROM content_uploads WHERE user_id = '0d2e61ad-e230-454e-8b90-efbe1c1a9268';

-- 6. 오늘 스토어 활동 요약
SELECT COUNT(DISTINCT user_id) as users, COUNT(*) as uploads, SUM(points_earned) as points FROM content_uploads WHERE store_id = '16f4c231-185a-4564-b473-bad1e9b305e8' AND DATE(created_at) = CURRENT_DATE;

-- 7. Jin의 스토어 내 순위
SELECT user_id, ROW_NUMBER() OVER (ORDER BY total_points DESC) as rank, total_points FROM user_progress WHERE store_id = '16f4c231-185a-4564-b473-bad1e9b305e8';

-- =====================================================
-- 문제 해결 원라이너
-- =====================================================

-- 8. Jin의 모든 업로드를 올바른 store_id로 수정 (한 줄)
UPDATE content_uploads SET store_id = '16f4c231-185a-4564-b473-bad1e9b305e8' WHERE user_id = '0d2e61ad-e230-454e-8b90-efbe1c1a9268' AND (store_id IS NULL OR store_id != '16f4c231-185a-4564-b473-bad1e9b305e8');

-- 9. Jin의 통계 재계산 (한 줄)
UPDATE user_progress SET total_uploads = (SELECT COUNT(*) FROM content_uploads WHERE user_id = '0d2e61ad-e230-454e-8b90-efbe1c1a9268'), total_points = (SELECT COALESCE(SUM(points_earned), 0) FROM content_uploads WHERE user_id = '0d2e61ad-e230-454e-8b90-efbe1c1a9268') WHERE user_id = '0d2e61ad-e230-454e-8b90-efbe1c1a9268';

-- 10. 함수 존재 확인
SELECT proname, pronargs FROM pg_proc WHERE proname IN ('get_store_stats', 'get_company_stats');

-- =====================================================
-- JavaScript 콘솔에서 확인할 값들
-- =====================================================

-- 11. JavaScript loadPerformanceData 시뮬레이션
SELECT json_build_object('active_members', active_members, 'total_videos', total_videos, 'total_points', total_points) as result FROM get_store_stats('16f4c231-185a-4564-b473-bad1e9b305e8', 'today');

-- 12. 전체 스토어 멤버 리스트
SELECT up.user_id, up.metadata->>'name' as name, up.total_points, COUNT(cu.id) as uploads FROM user_progress up LEFT JOIN content_uploads cu ON up.user_id = cu.user_id WHERE up.store_id = '16f4c231-185a-4564-b473-bad1e9b305e8' GROUP BY up.user_id, up.metadata->>'name', up.total_points ORDER BY up.total_points DESC;

-- =====================================================
-- 디버깅용 상세 쿼리
-- =====================================================

-- 13. 시간대별 업로드 분포 (최근 7일)
SELECT DATE(created_at) as date, COUNT(*) as uploads, COUNT(DISTINCT user_id) as users FROM content_uploads WHERE store_id = '16f4c231-185a-4564-b473-bad1e9b305e8' AND created_at >= CURRENT_DATE - INTERVAL '7 days' GROUP BY DATE(created_at) ORDER BY date DESC;

-- 14. 현재 시간 확인 (타임존 이슈 체크)
SELECT CURRENT_DATE as today, CURRENT_TIMESTAMP as now, date_trunc('week', CURRENT_DATE) as week_start, date_trunc('month', CURRENT_DATE) as month_start;

-- 15. 모든 함수 파라미터 테스트
SELECT 'today' as test, get_store_stats('16f4c231-185a-4564-b473-bad1e9b305e8', 'today') UNION ALL SELECT 'TODAY', get_store_stats('16f4c231-185a-4564-b473-bad1e9b305e8', 'TODAY') UNION ALL SELECT 'Today', get_store_stats('16f4c231-185a-4564-b473-bad1e9b305e8', 'Today');
