-- ===============================================
-- Video Review System Tables
-- Created: 2025-06-29
-- Purpose: Tinder-style video review feature
-- ===============================================

-- 1. 비디오 리뷰 테이블
CREATE TABLE IF NOT EXISTS video_reviews (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    video_id UUID NOT NULL REFERENCES content_uploads(id) ON DELETE CASCADE,
    reviewer_id UUID NOT NULL,
    action VARCHAR(20) NOT NULL CHECK (action IN ('skip', 'like', 'rate')),
    rating INTEGER CHECK (rating >= 0 AND rating <= 5),
    comment TEXT,
    points_earned INTEGER DEFAULT 0,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 인덱스 추가
CREATE INDEX idx_video_reviews_video_id ON video_reviews(video_id);
CREATE INDEX idx_video_reviews_reviewer_id ON video_reviews(reviewer_id);
CREATE INDEX idx_video_reviews_created_at ON video_reviews(created_at);
CREATE INDEX idx_video_reviews_action ON video_reviews(action);

-- 중복 리뷰 방지 (한 사용자가 같은 비디오를 두 번 평가할 수 없음)
CREATE UNIQUE INDEX idx_video_reviews_unique_review ON video_reviews(video_id, reviewer_id);

-- 2. 리뷰 세션 추적 테이블
CREATE TABLE IF NOT EXISTS review_sessions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ended_at TIMESTAMP WITH TIME ZONE,
    videos_reviewed INTEGER DEFAULT 0,
    points_earned INTEGER DEFAULT 0,
    streak_count INTEGER DEFAULT 0,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 인덱스 추가
CREATE INDEX idx_review_sessions_user_id ON review_sessions(user_id);
CREATE INDEX idx_review_sessions_started_at ON review_sessions(started_at);

-- 3. 일일 리뷰 목표
CREATE TABLE IF NOT EXISTS daily_review_goals (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    date DATE NOT NULL,
    target INTEGER DEFAULT 20,
    achieved INTEGER DEFAULT 0,
    bonus_claimed BOOLEAN DEFAULT FALSE,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, date)
);

-- 인덱스 추가
CREATE INDEX idx_daily_review_goals_user_id ON daily_review_goals(user_id);
CREATE INDEX idx_daily_review_goals_date ON daily_review_goals(date);

-- 4. content_uploads 테이블에 리뷰 관련 컬럼 추가 (이미 없는 경우)
ALTER TABLE content_uploads 
ADD COLUMN IF NOT EXISTS review_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS avg_rating NUMERIC(3,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS like_count INTEGER DEFAULT 0;

-- 5. 리뷰 통계 뷰
CREATE OR REPLACE VIEW video_review_stats AS
SELECT 
    cu.id as video_id,
    cu.user_id,
    cu.title,
    cu.video_url,
    COUNT(DISTINCT vr.reviewer_id) as review_count,
    COUNT(DISTINCT CASE WHEN vr.action = 'like' THEN vr.reviewer_id END) as like_count,
    AVG(CASE WHEN vr.rating > 0 THEN vr.rating END)::NUMERIC(3,2) as avg_rating,
    COUNT(DISTINCT vr.comment) FILTER (WHERE vr.comment IS NOT NULL AND vr.comment != '') as comment_count
FROM content_uploads cu
LEFT JOIN video_reviews vr ON cu.id = vr.video_id
GROUP BY cu.id;

-- 6. 사용자 리뷰 활동 통계 뷰
CREATE OR REPLACE VIEW user_review_stats AS
SELECT 
    reviewer_id as user_id,
    COUNT(*) as total_reviews,
    COUNT(*) FILTER (WHERE action = 'like') as total_likes,
    COUNT(*) FILTER (WHERE action = 'skip') as total_skips,
    AVG(rating) FILTER (WHERE rating > 0) as avg_rating_given,
    COUNT(*) FILTER (WHERE comment IS NOT NULL AND comment != '') as total_comments,
    SUM(points_earned) as total_points_from_reviews,
    DATE(created_at) as review_date
FROM video_reviews
GROUP BY reviewer_id, DATE(created_at);

-- 7. 리뷰 관련 포인트 시스템 추가
INSERT INTO points_system (activity_type, activity_name, points, description, icon, is_active)
VALUES 
    ('review_like', 'Thích video', 5, 'Nhấn nút thích khi đánh giá video', '❤️', true),
    ('review_rate', 'Đánh giá sao', 3, 'Đánh giá video bằng sao', '⭐', true),
    ('review_comment', 'Bình luận video', 10, 'Viết bình luận cho video', '💬', true),
    ('review_streak_5', 'Đánh giá liên tiếp', 20, 'Đánh giá 5 video liên tiếp', '🔥', true),
    ('review_daily_goal', 'Mục tiêu hàng ngày', 50, 'Hoàn thành 20 đánh giá trong ngày', '🎯', true)
ON CONFLICT (activity_type) DO UPDATE
SET points = EXCLUDED.points,
    description = EXCLUDED.description,
    icon = EXCLUDED.icon;

-- 8. 트리거: 리뷰 후 content_uploads 통계 업데이트
CREATE OR REPLACE FUNCTION update_video_stats_after_review()
RETURNS TRIGGER AS $$
BEGIN
    -- content_uploads 테이블 업데이트
    UPDATE content_uploads
    SET 
        review_count = (
            SELECT COUNT(DISTINCT reviewer_id) 
            FROM video_reviews 
            WHERE video_id = NEW.video_id
        ),
        like_count = (
            SELECT COUNT(*) 
            FROM video_reviews 
            WHERE video_id = NEW.video_id AND action = 'like'
        ),
        avg_rating = (
            SELECT AVG(rating)::NUMERIC(3,2) 
            FROM video_reviews 
            WHERE video_id = NEW.video_id AND rating > 0
        )
    WHERE id = NEW.video_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_video_stats
AFTER INSERT OR UPDATE ON video_reviews
FOR EACH ROW
EXECUTE FUNCTION update_video_stats_after_review();

-- 9. 함수: 다음 리뷰할 비디오 가져오기
CREATE OR REPLACE FUNCTION get_next_review_video(
    p_reviewer_id UUID,
    p_company_id UUID DEFAULT NULL,
    p_store_id UUID DEFAULT NULL
)
RETURNS TABLE (
    video_id UUID,
    title TEXT,
    video_url TEXT,
    user_id UUID,
    creator_name TEXT,
    created_at TIMESTAMP WITH TIME ZONE,
    metadata JSONB
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        cu.id as video_id,
        cu.title,
        cu.video_url,
        cu.user_id,
        up.metadata->>'name' as creator_name,
        cu.created_at,
        cu.metadata
    FROM content_uploads cu
    LEFT JOIN user_progress up ON cu.user_id = up.user_id
    WHERE cu.status = 'uploaded'
        AND cu.id NOT IN (
            SELECT video_id 
            FROM video_reviews 
            WHERE reviewer_id = p_reviewer_id
        )
        AND (p_company_id IS NULL OR cu.company_id = p_company_id)
        AND (p_store_id IS NULL OR cu.store_id = p_store_id)
    ORDER BY 
        CASE 
            WHEN cu.company_id = p_company_id THEN 1
            WHEN cu.store_id = p_store_id THEN 2
            ELSE 3
        END,
        cu.review_count ASC,  -- 리뷰가 적은 비디오 우선
        cu.created_at DESC    -- 최신 비디오 우선
    LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- 10. 함수: 일일 리뷰 통계 가져오기
CREATE OR REPLACE FUNCTION get_daily_review_stats(
    p_user_id UUID,
    p_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE (
    reviewed_today INTEGER,
    points_earned_today INTEGER,
    daily_target INTEGER,
    target_achieved BOOLEAN,
    bonus_claimed BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COALESCE(COUNT(vr.id), 0)::INTEGER as reviewed_today,
        COALESCE(SUM(vr.points_earned), 0)::INTEGER as points_earned_today,
        COALESCE(drg.target, 20) as daily_target,
        COALESCE(drg.achieved >= drg.target, false) as target_achieved,
        COALESCE(drg.bonus_claimed, false) as bonus_claimed
    FROM daily_review_goals drg
    LEFT JOIN video_reviews vr ON vr.reviewer_id = p_user_id 
        AND DATE(vr.created_at) = p_date
    WHERE drg.user_id = p_user_id AND drg.date = p_date
    GROUP BY drg.target, drg.achieved, drg.bonus_claimed;
END;
$$ LANGUAGE plpgsql;

-- 11. RLS 정책 (필요한 경우)
-- ALTER TABLE video_reviews ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE review_sessions ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE daily_review_goals ENABLE ROW LEVEL SECURITY;

-- 모든 테이블에 대해 PUBLIC 권한 부여 (개발 환경)
GRANT ALL ON video_reviews TO PUBLIC;
GRANT ALL ON review_sessions TO PUBLIC;
GRANT ALL ON daily_review_goals TO PUBLIC;

-- 시퀀스 권한도 부여
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO PUBLIC;

COMMENT ON TABLE video_reviews IS 'Stores user reviews and ratings for videos';
COMMENT ON TABLE review_sessions IS 'Tracks review sessions for streak counting';
COMMENT ON TABLE daily_review_goals IS 'Tracks daily review goals and achievements';

-- ===============================================
-- End of Video Review System Tables
-- ===============================================