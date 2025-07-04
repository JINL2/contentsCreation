-- 1. contents_idea 테이블 수정
ALTER TABLE contents_idea 
ADD COLUMN IF NOT EXISTS is_choosen BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS is_upload BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS upload_id UUID,
ADD COLUMN IF NOT EXISTS upload_time TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS choose_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS viral_tags TEXT[] DEFAULT '{}';

-- 2. 바이럴 태그 예시 데이터 업데이트 (일부 예시)
UPDATE contents_idea 
SET viral_tags = ARRAY['트렌드', '일상', '공감', '재미']
WHERE category = '일상';

UPDATE contents_idea 
SET viral_tags = ARRAY['먹방', '맛집', '리뷰', 'ASMR']
WHERE category = '음식';

UPDATE contents_idea 
SET viral_tags = ARRAY['여행팁', '핫플', '브이로그', '숨은명소']
WHERE category = '여행';

-- 3. content_uploads 테이블 생성 (유저가 업로드한 컨텐츠 저장)
CREATE TABLE IF NOT EXISTS content_uploads (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- 연결 정보
    content_idea_id INTEGER REFERENCES contents_idea(id),
    user_id TEXT, -- 나중에 인증 시스템 추가시 사용
    company_id TEXT, -- 회사 ID
    store_id TEXT, -- 가게/지점 ID
    
    -- 업로드 정보
    video_url TEXT NOT NULL,
    thumbnail_url TEXT,
    video_duration INTEGER, -- 초 단위
    file_size BIGINT, -- 바이트 단위
    
    -- 메타데이터
    title TEXT NOT NULL,
    description TEXT,
    custom_tags TEXT[],
    
    -- 상태 정보
    status VARCHAR(50) DEFAULT 'uploaded', -- uploaded, processing, completed, failed
    
    -- 게임화 정보
    points_earned INTEGER DEFAULT 0,
    quality_score INTEGER, -- 1-100
    
    -- 추가 정보
    metadata JSONB,
    device_info JSONB, -- 기기 정보, 브라우저 등
    
    -- 인덱스를 위한 필드
    is_active BOOLEAN DEFAULT TRUE
);

-- 4. user_activities 테이블 생성 (사용자 활동 추적)
CREATE TABLE IF NOT EXISTS user_activities (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- 사용자 정보
    user_id TEXT NOT NULL, -- 임시 사용자 ID (로컬스토리지 UUID)
    company_id TEXT, -- 회사 ID
    store_id TEXT, -- 가게/지점 ID
    session_id TEXT,
    
    -- 활동 정보
    activity_type VARCHAR(50) NOT NULL, -- view, choose, upload, complete
    content_idea_id INTEGER REFERENCES contents_idea(id),
    upload_id UUID REFERENCES content_uploads(id),
    
    -- 포인트 정보
    points_earned INTEGER DEFAULT 0,
    
    -- 추가 정보
    metadata JSONB
);

-- 5. user_progress 테이블 생성 (사용자 진행 상황)
CREATE TABLE IF NOT EXISTS user_progress (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id TEXT UNIQUE NOT NULL,
    company_id TEXT, -- 회사 ID
    store_id TEXT, -- 가게/지점 ID
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- 포인트 및 레벨
    total_points INTEGER DEFAULT 0,
    current_level INTEGER DEFAULT 1,
    
    -- 통계
    total_uploads INTEGER DEFAULT 0,
    streak_days INTEGER DEFAULT 0,
    last_activity_date DATE,
    
    -- 업적
    achievements JSONB DEFAULT '[]'::jsonb,
    
    -- 선호도
    preferred_categories TEXT[],
    
    -- 추가 정보
    metadata JSONB
);

-- 6. daily_challenges 테이블 생성 (일일 도전 과제)
CREATE TABLE IF NOT EXISTS daily_challenges (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    challenge_date DATE NOT NULL DEFAULT CURRENT_DATE,
    
    -- 도전 과제 정보
    challenge_type VARCHAR(50) NOT NULL, -- category_specific, emotion_specific, etc
    target_category VARCHAR(50),
    target_emotion VARCHAR(50),
    required_count INTEGER DEFAULT 1,
    bonus_points INTEGER DEFAULT 50,
    
    -- 설명
    title TEXT NOT NULL,
    description TEXT,
    
    is_active BOOLEAN DEFAULT TRUE,
    UNIQUE(challenge_date, challenge_type)
);

-- 7. 인덱스 추가
CREATE INDEX IF NOT EXISTS idx_contents_idea_status ON contents_idea(is_upload, is_choosen);
CREATE INDEX IF NOT EXISTS idx_content_uploads_user ON content_uploads(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_content_uploads_company ON content_uploads(company_id, created_at);
CREATE INDEX IF NOT EXISTS idx_content_uploads_store ON content_uploads(store_id, created_at);
CREATE INDEX IF NOT EXISTS idx_user_activities_user ON user_activities(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_user_activities_company ON user_activities(company_id, created_at);
CREATE INDEX IF NOT EXISTS idx_user_activities_store ON user_activities(store_id, created_at);
CREATE INDEX IF NOT EXISTS idx_user_progress_user ON user_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_user_progress_company ON user_progress(company_id);
CREATE INDEX IF NOT EXISTS idx_user_progress_store ON user_progress(store_id);

-- 8. RLS 정책 설정 (모든 사용자가 읽기/쓰기 가능)
ALTER TABLE content_uploads ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_progress ENABLE ROW LEVEL SECURITY;

-- content_uploads 정책
CREATE POLICY "Allow all users to insert uploads" ON content_uploads
    FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "Allow all users to read uploads" ON content_uploads
    FOR SELECT TO anon USING (true);

CREATE POLICY "Allow users to update their uploads" ON content_uploads
    FOR UPDATE TO anon USING (true);

-- user_activities 정책
CREATE POLICY "Allow all users to insert activities" ON user_activities
    FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "Allow users to read their activities" ON user_activities
    FOR SELECT TO anon USING (true);

-- user_progress 정책
CREATE POLICY "Allow all users to manage progress" ON user_progress
    FOR ALL TO anon USING (true);

-- 9. 트리거 함수: contents_idea의 is_choosen 상태 업데이트
CREATE OR REPLACE FUNCTION update_content_idea_status()
RETURNS TRIGGER AS $$
BEGIN
    -- choose 활동이 기록되면 is_choosen을 true로
    IF NEW.activity_type = 'choose' AND NEW.content_idea_id IS NOT NULL THEN
        UPDATE contents_idea 
        SET is_choosen = true,
            choose_count = choose_count + 1
        WHERE id = NEW.content_idea_id;
    END IF;
    
    -- upload 활동이 기록되면 is_upload를 true로
    IF NEW.activity_type = 'upload' AND NEW.content_idea_id IS NOT NULL THEN
        UPDATE contents_idea 
        SET is_upload = true,
            upload_id = NEW.upload_id,
            upload_time = NOW()
        WHERE id = NEW.content_idea_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 트리거 생성
CREATE TRIGGER trigger_update_content_idea_status
AFTER INSERT ON user_activities
FOR EACH ROW
EXECUTE FUNCTION update_content_idea_status();

-- 10. 샘플 일일 도전 과제 추가
INSERT INTO daily_challenges (challenge_type, title, description, bonus_points)
VALUES 
    ('daily_upload', '오늘의 도전', '오늘 하루 1개 이상의 컨텐츠를 업로드하세요!', 30),
    ('category_specific', '음식 컨텐츠 도전', '음식 카테고리 컨텐츠를 1개 만들어보세요!', 50),
    ('emotion_specific', '재미있는 컨텐츠', '재미있는 감정의 컨텐츠를 만들어보세요!', 40);
