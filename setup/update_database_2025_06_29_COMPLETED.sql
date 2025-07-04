-- Contents Helper Website 데이터베이스 업데이트
-- 2025년 6월 29일
-- 목적: RLS 제거 및 새로운 기능을 위한 스키마 업데이트
-- 상태: ✅ Supabase에 적용 완료

-- =====================================================
-- 이 파일은 이미 Supabase에 적용되었습니다!
-- 재실행하지 마세요.
-- =====================================================

-- 1. Row Level Security (RLS) 비활성화 ✅
-- 2. "내 아이디어로 제작하기" 기능을 위한 테이블 수정 ✅
-- 3. 영상 공유 및 평가 시스템을 위한 테이블 생성 ✅
-- 4. 평가 통계 자동 업데이트 트리거 ✅
-- 5. 스토어별 성과 비교를 위한 뷰(View) 생성 ✅
-- 6. 사용자 창의성 통계 뷰 ✅
-- 7. 인기 영상 뷰 ✅
-- 8. 회사별 영상 갤러리 뷰 ✅
-- 9. 활동 포인트 추가 (평가 활동) ✅

-- =====================================================
-- 적용된 주요 변경사항 요약
-- =====================================================

/*
1. 새로운 테이블:
   - video_ratings: 영상 평가 정보

2. 수정된 테이블:
   - contents_idea: is_auto_created, created_by_user_id, custom_idea_metadata 추가
   - content_uploads: is_auto_created, avg_rating, rating_count, view_count 추가

3. 새로운 뷰:
   - store_performance: 스토어별 일일 성과
   - store_weekly_ranking: 스토어별 주간 랭킹
   - store_monthly_ranking: 스토어별 월간 랭킹
   - user_creativity_stats: 사용자 창의성 통계
   - popular_videos: 인기 영상 목록
   - company_video_gallery: 회사별 영상 갤러리

4. 새로운 트리거:
   - update_video_rating_stats(): 평가 시 자동 통계 업데이트

5. 포인트 시스템:
   - rate_video: 5포인트 (영상 평가 활동)
*/
