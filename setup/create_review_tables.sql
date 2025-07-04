-- Video Review System Tables
-- 비디오 리뷰 시스템을 위한 데이터베이스 테이블 생성

-- 리뷰 세션 테이블
CREATE TABLE IF NOT EXISTS review_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    company_id UUID,
    store_id UUID,
    started_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    ended_at TIMESTAMP WITH TIME ZONE,
    videos_reviewed INTEGER DEFAULT 0,
    points_earned INTEGER DEFAULT 0,
    streak_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- 인덱스
    INDEX idx_review_sessions_user_id (user_id),
    INDEX idx_review_sessions_started_at (started_at)
);

-- 일일 리뷰 목표 테이블
CREATE TABLE IF NOT EXISTS daily_review_goals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    date DATE NOT NULL,
    target INTEGER DEFAULT 20,
    achieved INTEGER DEFAULT 0,
    bonus_claimed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- 유니크 제약
    UNIQUE(user_id, date),
    
    -- 인덱스
    INDEX idx_daily_goals_user_date (user_id, date)
);

-- 리뷰 활동 로그 테이블
CREATE TABLE IF NOT EXISTS review_activity_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    session_id UUID REFERENCES review_sessions(id),
    video_id UUID NOT NULL,
    action_type VARCHAR(20) NOT NULL, -- skip, rate, like, comment
    rating INTEGER,
    points_earned INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- 인덱스
    INDEX idx_activity_logs_user_id (user_id),
    INDEX idx_activity_logs_session_id (session_id),
    INDEX idx_activity_logs_created_at (created_at)
);

-- 리뷰 관련 업적 테이블
CREATE TABLE IF NOT EXISTS review_achievements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    achievement_key VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    icon VARCHAR(10),
    required_count INTEGER NOT NULL,
    points_reward INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 사용자별 업적 달성 기록
CREATE TABLE IF NOT EXISTS user_review_achievements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    achievement_id UUID REFERENCES review_achievements(id),
    achieved_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    progress INTEGER DEFAULT 0,
    
    -- 유니크 제약
    UNIQUE(user_id, achievement_id),
    
    -- 인덱스
    INDEX idx_user_achievements (user_id)
);

-- 리뷰 업적 초기 데이터 삽입
INSERT INTO review_achievements (achievement_key, name, description, icon, required_count, points_reward) VALUES
('review_master', '평가왕', '100개 비디오 평가', '👑', 100, 100),
('fair_judge', '공정한 심사위원', '모든 점수대 고루 사용', '⚖️', 5, 50),
('supporter', '응원단장', '100개 좋아요', '❤️', 100, 50),
('critic', '비평가', '50개 댓글 작성', '💬', 50, 75),
('streak_master', '연속 평가 마스터', '7일 연속 평가', '🔥', 7, 100),
('daily_achiever', '일일 목표 달성자', '일일 목표 10회 달성', '🎯', 10, 50),
('speed_reviewer', '스피드 리뷰어', '하루에 50개 평가', '⚡', 50, 100),
('early_bird', '얼리버드', '오전 6시 전 평가', '🌅', 1, 20),
('night_owl', '올빼미', '자정 이후 평가', '🦉', 1, 20);

-- 리뷰 통계 뷰
CREATE OR REPLACE VIEW user_review_stats AS
SELECT 
    u.user_id,
    COUNT(DISTINCT ral.video_id) as total_videos_reviewed,
    COUNT(DISTINCT CASE WHEN ral.action_type = 'like' THEN ral.video_id END) as total_likes,
    COUNT(DISTINCT CASE WHEN ral.action_type = 'rate' THEN ral.video_id END) as total_ratings,
    COUNT(DISTINCT CASE WHEN ral.action_type = 'comment' THEN ral.video_id END) as total_comments,
    SUM(ral.points_earned) as total_points_from_reviews,
    COUNT(DISTINCT DATE(ral.created_at)) as active_days,
    MAX(ral.created_at) as last_review_at
FROM user_progress u
LEFT JOIN review_activity_logs ral ON u.user_id = ral.user_id
GROUP BY u.user_id;

-- 주간 리뷰 리더보드 뷰
CREATE OR REPLACE VIEW weekly_review_leaderboard AS
WITH weekly_stats AS (
    SELECT 
        ral.user_id,
        COUNT(DISTINCT ral.video_id) as videos_reviewed,
        SUM(ral.points_earned) as points_earned,
        up.metadata->>'name' as user_name,
        up.company_id,
        up.store_id
    FROM review_activity_logs ral
    JOIN user_progress up ON ral.user_id = up.user_id
    WHERE ral.created_at >= CURRENT_DATE - INTERVAL '7 days'
    GROUP BY ral.user_id, up.metadata, up.company_id, up.store_id
)
SELECT 
    *,
    RANK() OVER (PARTITION BY company_id ORDER BY videos_reviewed DESC) as company_rank,
    RANK() OVER (PARTITION BY store_id ORDER BY videos_reviewed DESC) as store_rank
FROM weekly_stats
ORDER BY videos_reviewed DESC;

-- 댓글 추가 (video_ratings 테이블 수정)
ALTER TABLE video_ratings 
ADD COLUMN IF NOT EXISTS comment TEXT,
ADD COLUMN IF NOT EXISTS is_liked BOOLEAN DEFAULT FALSE;

-- 트리거 함수: 리뷰 세션 업데이트 시간
CREATE OR REPLACE FUNCTION update_review_session_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 트리거 생성
CREATE TRIGGER update_review_sessions_updated_at
    BEFORE UPDATE ON review_sessions
    FOR EACH ROW
    EXECUTE FUNCTION update_review_session_timestamp();

CREATE TRIGGER update_daily_goals_updated_at
    BEFORE UPDATE ON daily_review_goals
    FOR EACH ROW
    EXECUTE FUNCTION update_review_session_timestamp();

-- RLS 정책 (필요한 경우)
ALTER TABLE review_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_review_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE review_activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_review_achievements ENABLE ROW LEVEL SECURITY;

-- 모든 사용자가 자신의 데이터에만 접근 가능 (옵션)
CREATE POLICY "Users can manage own review sessions" 
    ON review_sessions FOR ALL 
    USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can manage own daily goals" 
    ON daily_review_goals FOR ALL 
    USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can view own activity logs" 
    ON review_activity_logs FOR ALL 
    USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can view own achievements" 
    ON user_review_achievements FOR ALL 
    USING (auth.uid()::text = user_id::text);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_review_sessions_company_store 
    ON review_sessions(company_id, store_id);

CREATE INDEX IF NOT EXISTS idx_activity_logs_video_id 
    ON review_activity_logs(video_id);

CREATE INDEX IF NOT EXISTS idx_activity_logs_action_type 
    ON review_activity_logs(action_type);