-- 게임 시스템 테이블 설정
-- 이 파일을 Supabase SQL Editor에서 실행하세요

-- 점수 시스템 테이블
CREATE TABLE IF NOT EXISTS points_system (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    activity_type VARCHAR(50) UNIQUE NOT NULL,
    activity_name VARCHAR(100) NOT NULL,
    points INTEGER NOT NULL,
    description TEXT,
    icon VARCHAR(10),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 레벨 시스템 테이블
CREATE TABLE IF NOT EXISTS level_system (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    level_number INTEGER UNIQUE NOT NULL,
    level_name VARCHAR(100) NOT NULL,
    required_points INTEGER NOT NULL,
    icon VARCHAR(10),
    color VARCHAR(20),
    benefits TEXT[],
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 업적 시스템 테이블
CREATE TABLE IF NOT EXISTS achievement_system (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    achievement_code VARCHAR(50) UNIQUE NOT NULL,
    achievement_name VARCHAR(100) NOT NULL,
    description TEXT,
    condition_type VARCHAR(50),
    condition_value INTEGER,
    points_reward INTEGER DEFAULT 0,
    icon VARCHAR(10),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 초기 데이터 삽입
INSERT INTO points_system (activity_type, activity_name, points, description, icon) VALUES
('select_idea', 'Chọn ý tưởng', 10, 'Chọn 1 ý tưởng để tạo nội dung', '✋'),
('upload_video', 'Tải video lên', 50, 'Upload video hoàn chỉnh', '🎥'),
('add_metadata', 'Thêm metadata', 20, 'Nhập tiêu đề và mô tả', '📝'),
('complete', 'Hoàn thành', 20, 'Hoàn tất quy trình', '✅'),
('daily_bonus', 'Thưởng hàng ngày', 30, 'Tạo nội dung mỗi ngày', '🎆')
ON CONFLICT (activity_type) DO UPDATE SET
    points = EXCLUDED.points,
    description = EXCLUDED.description,
    updated_at = NOW();

-- 레벨 시스템 초기 데이터
INSERT INTO level_system (level_number, level_name, required_points, icon, color) VALUES
(1, 'Người mới bắt đầu', 0, '🌱', '#10B981'),
(2, 'Nhà sáng tạo junior', 100, '🌿', '#059669'),
(3, 'Nhà sáng tạo senior', 500, '🌳', '#047857'),
(4, 'Nhà sáng tạo chuyên nghiệp', 1000, '🏆', '#D97706'),
(5, 'Nhà sáng tạo huyền thoại', 2000, '👑', '#DC2626')
ON CONFLICT (level_number) DO UPDATE SET
    required_points = EXCLUDED.required_points,
    icon = EXCLUDED.icon,
    updated_at = NOW();

-- 업적 시스템 초기 데이터
INSERT INTO achievement_system (achievement_code, achievement_name, description, condition_type, condition_value, points_reward, icon) VALUES
('first_step', 'Bước đầu tiên', 'Hoàn thành nội dung đầu tiên', 'first_content', 1, 50, '🎯'),
('enthusiastic', 'Nhiệt tình', 'Tạo 3 nội dung trong một ngày', 'daily_count', 3, 100, '🔥'),
('weekly_streak', 'Chuỗi tuần', 'Tạo nội dung 7 ngày liên tiếp', 'streak', 7, 200, '📅'),
('versatile', 'Đa năng', 'Thử 5 danh mục khác nhau', 'category_variety', 5, 150, '🎨'),
('quality_king', 'Vua chất lượng', 'Hoàn thành metadata cho 10 nội dung', 'metadata_count', 10, 200, '👑')
ON CONFLICT (achievement_code) DO UPDATE SET
    points_reward = EXCLUDED.points_reward,
    condition_value = EXCLUDED.condition_value,
    updated_at = NOW();

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_points_system_activity_type ON points_system(activity_type);
CREATE INDEX IF NOT EXISTS idx_level_system_level_number ON level_system(level_number);
CREATE INDEX IF NOT EXISTS idx_level_system_required_points ON level_system(required_points);
CREATE INDEX IF NOT EXISTS idx_achievement_system_code ON achievement_system(achievement_code);

-- 업데이트 시간 자동 갱신 트리거
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 트리거 생성
CREATE TRIGGER update_points_system_updated_at BEFORE UPDATE
    ON points_system FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_level_system_updated_at BEFORE UPDATE
    ON level_system FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_achievement_system_updated_at BEFORE UPDATE
    ON achievement_system FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS 정책 설정
ALTER TABLE points_system ENABLE ROW LEVEL SECURITY;
ALTER TABLE level_system ENABLE ROW LEVEL SECURITY;
ALTER TABLE achievement_system ENABLE ROW LEVEL SECURITY;

-- 모든 사용자가 읽기 가능
CREATE POLICY "Points system readable by all" ON points_system
    FOR SELECT USING (true);

CREATE POLICY "Level system readable by all" ON level_system
    FOR SELECT USING (true);

CREATE POLICY "Achievement system readable by all" ON achievement_system
    FOR SELECT USING (true);

-- 뷰 생성: 활성화된 항목만 보기
CREATE OR REPLACE VIEW active_points_system AS
SELECT * FROM points_system WHERE is_active = true ORDER BY points DESC;

CREATE OR REPLACE VIEW active_level_system AS
SELECT * FROM level_system WHERE is_active = true ORDER BY level_number ASC;

CREATE OR REPLACE VIEW active_achievement_system AS
SELECT * FROM achievement_system WHERE is_active = true ORDER BY points_reward DESC;

-- 테이블 설명 코멘트
COMMENT ON TABLE points_system IS '각 활동별 점수를 정의하는 테이블';
COMMENT ON TABLE level_system IS '레벨별 요구 점수와 정보를 관리하는 테이블';
COMMENT ON TABLE achievement_system IS '업적 시스템과 보상을 관리하는 테이블';

-- 점수 시스템 사용 예시
-- UPDATE points_system SET points = 15 WHERE activity_type = 'select_idea';
-- UPDATE level_system SET required_points = 150 WHERE level_number = 2;