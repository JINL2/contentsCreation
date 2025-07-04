-- Contents Helper Website 데이터베이스 업데이트
-- 2025년 6월 29일
-- 목적: RLS 제거 및 새로운 기능을 위한 스키마 업데이트

-- =====================================================
-- 1. Row Level Security (RLS) 비활성화
-- =====================================================

-- 모든 테이블의 RLS 비활성화
ALTER TABLE contents_idea DISABLE ROW LEVEL SECURITY;
ALTER TABLE content_uploads DISABLE ROW LEVEL SECURITY;
ALTER TABLE user_activities DISABLE ROW LEVEL SECURITY;
ALTER TABLE user_progress DISABLE ROW LEVEL SECURITY;
ALTER TABLE daily_challenges DISABLE ROW LEVEL SECURITY;
ALTER TABLE points_system DISABLE ROW LEVEL SECURITY;
ALTER TABLE level_system DISABLE ROW LEVEL SECURITY;
ALTER TABLE achievement_system DISABLE ROW LEVEL SECURITY;

-- 기존 정책 제거 (있을 경우)
DROP POLICY IF EXISTS "Enable all access" ON contents_idea;
DROP POLICY IF EXISTS "Enable all access" ON content_uploads;
DROP POLICY IF EXISTS "Enable all access" ON user_activities;
DROP POLICY IF EXISTS "Enable all access" ON user_progress;
DROP POLICY IF EXISTS "Enable all access" ON daily_challenges;
DROP POLICY IF EXISTS "Enable all access" ON points_system;
DROP POLICY IF EXISTS "Enable all access" ON level_system;
DROP POLICY IF EXISTS "Enable all access" ON achievement_system;

-- =====================================================
-- 2. "내 아이디어로 제작하기" 기능을 위한 테이블 수정
-- =====================================================

-- contents_idea 테이블에 컬럼 추가
ALTER TABLE contents_idea 
ADD COLUMN IF NOT EXISTS is_auto_created BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS created_by_user_id TEXT,
ADD COLUMN IF NOT EXISTS custom_idea_metadata JSONB;

-- content_uploads 테이블에 컬럼 추가
ALTER TABLE content_uploads
ADD COLUMN IF NOT EXISTS is_auto_created BOOLEAN DEFAULT TRUE;

-- 기존 데이터 업데이트 (모두 자동 생성으로 표시)
UPDATE contents_idea SET is_auto_created = TRUE WHERE is_auto_created IS NULL;
UPDATE content_uploads SET is_auto_created = TRUE WHERE is_auto_created IS NULL;

-- =====================================================
-- 3. 영상 공유 및 평가 시스템을 위한 테이블 생성
-- =====================================================

-- 영상 평가 테이블 생성
CREATE TABLE IF NOT EXISTS video_ratings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    upload_id UUID REFERENCES content_uploads(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL,
    company_id TEXT NOT NULL,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(upload_id, user_id) -- 한 사용자는 한 영상에 한 번만 평가
);

-- 평가 통계를 위한 인덱스
CREATE INDEX IF NOT EXISTS idx_video_ratings_upload ON video_ratings(upload_id);
CREATE INDEX IF NOT EXISTS idx_video_ratings_company ON video_ratings(company_id);

-- content_uploads 테이블에 평가 관련 컬럼 추가
ALTER TABLE content_uploads
ADD COLUMN IF NOT EXISTS avg_rating DECIMAL(3,2),
ADD COLUMN IF NOT EXISTS rating_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS view_count INTEGER DEFAULT 0;

-- =====================================================
-- 4. 평가 통계 자동 업데이트 트리거
-- =====================================================

-- 평가 통계 자동 업데이트 함수
CREATE OR REPLACE FUNCTION update_video_rating_stats()
RETURNS TRIGGER AS $$
BEGIN
    -- content_uploads 테이블의 평가 통계 업데이트
    UPDATE content_uploads
    SET avg_rating = (
        SELECT AVG(rating)::DECIMAL(3,2) 
        FROM video_ratings 
        WHERE upload_id = NEW.upload_id
    ),
    rating_count = (
        SELECT COUNT(*) 
        FROM video_ratings 
        WHERE upload_id = NEW.upload_id
    )
    WHERE id = NEW.upload_id;
    
    -- 평가자에게 포인트 부여 (5포인트)
    INSERT INTO user_activities (
        user_id, 
        activity_type, 
        activity_id,
        points_earned, 
        metadata,
        created_at
    )
    VALUES (
        NEW.user_id, 
        'rate_video',
        NEW.upload_id::TEXT,
        5, 
        jsonb_build_object(
            'upload_id', NEW.upload_id, 
            'rating', NEW.rating,
            'company_id', NEW.company_id
        ),
        NOW()
    );
    
    -- user_progress 업데이트
    UPDATE user_progress
    SET total_points = total_points + 5,
        updated_at = NOW()
    WHERE user_id = NEW.user_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 트리거 생성
DROP TRIGGER IF EXISTS trigger_update_rating_stats ON video_ratings;
CREATE TRIGGER trigger_update_rating_stats
AFTER INSERT OR UPDATE ON video_ratings
FOR EACH ROW
EXECUTE FUNCTION update_video_rating_stats();

-- =====================================================
-- 5. 스토어별 성과 비교를 위한 뷰(View) 생성
-- =====================================================

-- 스토어별 일일 성과 뷰
CREATE OR REPLACE VIEW store_performance AS
SELECT 
    store_id,
    company_id,
    COUNT(DISTINCT user_id) as active_users,
    COUNT(*) as total_uploads,
    AVG(CASE WHEN metadata->>'duration' IS NOT NULL 
        THEN (metadata->>'duration')::INTEGER ELSE 0 END) as avg_video_duration,
    SUM(points_earned) as total_points,
    DATE(created_at) as date
FROM content_uploads
WHERE store_id IS NOT NULL
GROUP BY store_id, company_id, DATE(created_at);

-- 스토어별 주간 랭킹 뷰
CREATE OR REPLACE VIEW store_weekly_ranking AS
SELECT 
    store_id,
    company_id,
    COUNT(*) as weekly_uploads,
    SUM(points_earned) as weekly_points,
    COUNT(DISTINCT user_id) as active_members,
    RANK() OVER (PARTITION BY company_id ORDER BY COUNT(*) DESC) as upload_rank,
    RANK() OVER (PARTITION BY company_id ORDER BY SUM(points_earned) DESC) as points_rank
FROM content_uploads
WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'
    AND store_id IS NOT NULL
GROUP BY store_id, company_id;

-- 스토어별 월간 랭킹 뷰
CREATE OR REPLACE VIEW store_monthly_ranking AS
SELECT 
    store_id,
    company_id,
    COUNT(*) as monthly_uploads,
    SUM(points_earned) as monthly_points,
    COUNT(DISTINCT user_id) as active_members,
    AVG(avg_rating) as avg_store_rating,
    RANK() OVER (PARTITION BY company_id ORDER BY COUNT(*) DESC) as upload_rank,
    RANK() OVER (PARTITION BY company_id ORDER BY SUM(points_earned) DESC) as points_rank
FROM content_uploads
WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
    AND store_id IS NOT NULL
GROUP BY store_id, company_id;

-- =====================================================
-- 6. 사용자 창의성 통계 뷰
-- =====================================================

CREATE OR REPLACE VIEW user_creativity_stats AS
SELECT 
    company_id,
    store_id,
    user_id,
    COUNT(CASE WHEN is_auto_created = FALSE THEN 1 END) as custom_ideas_count,
    COUNT(CASE WHEN is_auto_created = TRUE THEN 1 END) as auto_ideas_count,
    COUNT(*) as total_uploads,
    ROUND(COUNT(CASE WHEN is_auto_created = FALSE THEN 1 END)::NUMERIC / 
          NULLIF(COUNT(*)::NUMERIC, 0) * 100, 2) as creativity_ratio
FROM content_uploads
GROUP BY company_id, store_id, user_id;

-- =====================================================
-- 7. 인기 영상 뷰
-- =====================================================

CREATE OR REPLACE VIEW popular_videos AS
SELECT 
    cu.*,
    ci.title as idea_title,
    ci.category,
    ci.emotion,
    ci.target_audience,
    ci.viral_tags,
    up.metadata->>'user_name' as creator_name
FROM content_uploads cu
LEFT JOIN contents_idea ci ON cu.content_idea_id = ci.id
LEFT JOIN user_progress up ON cu.user_id = up.user_id
WHERE cu.avg_rating >= 4.0
    AND cu.rating_count >= 3  -- 최소 3명 이상이 평가한 영상
ORDER BY cu.avg_rating DESC, cu.rating_count DESC;

-- =====================================================
-- 8. 회사별 영상 갤러리 뷰
-- =====================================================

CREATE OR REPLACE VIEW company_video_gallery AS
SELECT 
    cu.id,
    cu.video_url,
    cu.title,
    cu.description,
    cu.created_at,
    cu.avg_rating,
    cu.rating_count,
    cu.view_count,
    cu.company_id,
    cu.store_id,
    cu.user_id,
    cu.is_auto_created,
    ci.title as idea_title,
    ci.category,
    ci.viral_tags,
    up.metadata->>'user_name' as creator_name,
    CASE 
        WHEN cu.created_at >= CURRENT_DATE - INTERVAL '7 days' THEN '신규'
        WHEN cu.avg_rating >= 4.5 AND cu.rating_count >= 5 THEN '인기'
        ELSE NULL
    END as badge
FROM content_uploads cu
LEFT JOIN contents_idea ci ON cu.content_idea_id = ci.id
LEFT JOIN user_progress up ON cu.user_id = up.user_id
WHERE cu.video_url IS NOT NULL
ORDER BY cu.created_at DESC;

-- =====================================================
-- 9. 활동 포인트 추가 (평가 활동)
-- =====================================================

-- points_system 테이블에 평가 활동 추가
INSERT INTO points_system (activity_type, points, description, icon)
VALUES ('rate_video', 5, 'Đánh giá video của đồng nghiệp', '⭐')
ON CONFLICT (activity_type) DO UPDATE
SET points = 5,
    description = 'Đánh giá video của đồng nghiệp',
    icon = '⭐';

-- =====================================================
-- 10. 샘플 데이터 추가 (선택사항)
-- =====================================================

-- 커스텀 아이디어 샘플 (주석 처리됨 - 필요 시 실행)
/*
INSERT INTO contents_idea (
    title, category, emotion, target_audience, hook1, body1, hook2, body2, conclusion,
    cta, viral_tags, is_choosen, is_upload, is_auto_created, created_by_user_id
) VALUES (
    '우리 가게만의 특별한 서비스',
    '정보',
    '자부심',
    '고객',
    '손님들이 모르는 우리 가게의 비밀',
    '다른 가게에는 없는 특별한 서비스가 있습니다',
    '바로 이것!',
    '매일 아침 직접 구운 쿠키를 무료로 드려요',
    '오늘 방문하시면 특별한 경험을 하실 수 있어요!',
    '지금 바로 방문하세요',
    ARRAY['일상', '공감', '정보'],
    false,
    false,
    false,  -- 사용자가 직접 만든 아이디어
    'emp001'
);
*/

-- =====================================================
-- 완료 메시지
-- =====================================================
-- 모든 업데이트가 완료되었습니다.
-- RLS가 비활성화되어 모든 사용자가 데이터에 접근할 수 있습니다.
-- 새로운 기능을 위한 테이블과 뷰가 생성되었습니다.
