-- 기존 테이블에 company_id와 store_id 컬럼 추가하는 마이그레이션 스크립트
-- 이미 테이블이 존재하는 경우 이 스크립트를 실행하세요

-- 1. content_uploads 테이블에 컬럼 추가
ALTER TABLE content_uploads 
ADD COLUMN IF NOT EXISTS company_id TEXT,
ADD COLUMN IF NOT EXISTS store_id TEXT;

-- 2. user_activities 테이블에 컬럼 추가
ALTER TABLE user_activities 
ADD COLUMN IF NOT EXISTS company_id TEXT,
ADD COLUMN IF NOT EXISTS store_id TEXT;

-- 3. user_progress 테이블에 컬럼 추가
ALTER TABLE user_progress 
ADD COLUMN IF NOT EXISTS company_id TEXT,
ADD COLUMN IF NOT EXISTS store_id TEXT;

-- 4. 새로운 인덱스 추가 (회사별/지점별 필터링 성능 향상)
CREATE INDEX IF NOT EXISTS idx_content_uploads_company ON content_uploads(company_id, created_at);
CREATE INDEX IF NOT EXISTS idx_content_uploads_store ON content_uploads(store_id, created_at);
CREATE INDEX IF NOT EXISTS idx_user_activities_company ON user_activities(company_id, created_at);
CREATE INDEX IF NOT EXISTS idx_user_activities_store ON user_activities(store_id, created_at);
CREATE INDEX IF NOT EXISTS idx_user_progress_company ON user_progress(company_id);
CREATE INDEX IF NOT EXISTS idx_user_progress_store ON user_progress(store_id);

-- 5. 복합 인덱스 추가 (회사+지점 조합 검색)
CREATE INDEX IF NOT EXISTS idx_content_uploads_company_store ON content_uploads(company_id, store_id);
CREATE INDEX IF NOT EXISTS idx_user_activities_company_store ON user_activities(company_id, store_id);
CREATE INDEX IF NOT EXISTS idx_user_progress_company_store ON user_progress(company_id, store_id);

-- 6. 기존 metadata에서 company_id와 store_id 마이그레이션 (옵션)
-- metadata JSONB 필드에 이미 company_id나 store_id가 있다면 실행
/*
-- content_uploads 마이그레이션
UPDATE content_uploads 
SET 
    company_id = COALESCE(company_id, metadata->>'company_id'),
    store_id = COALESCE(store_id, metadata->>'store_id')
WHERE metadata IS NOT NULL 
AND (metadata->>'company_id' IS NOT NULL OR metadata->>'store_id' IS NOT NULL);

-- user_activities 마이그레이션
UPDATE user_activities 
SET 
    company_id = COALESCE(company_id, metadata->>'company_id'),
    store_id = COALESCE(store_id, metadata->>'store_id')
WHERE metadata IS NOT NULL 
AND (metadata->>'company_id' IS NOT NULL OR metadata->>'store_id' IS NOT NULL);

-- user_progress 마이그레이션
UPDATE user_progress 
SET 
    company_id = COALESCE(company_id, metadata->>'company_id'),
    store_id = COALESCE(store_id, metadata->>'store_id')
WHERE metadata IS NOT NULL 
AND (metadata->>'company_id' IS NOT NULL OR metadata->>'store_id' IS NOT NULL);
*/

-- 7. 회사별/지점별 통계를 위한 뷰(View) 생성
-- 회사별 일일 통계
CREATE OR REPLACE VIEW company_stats AS
SELECT 
    company_id,
    DATE(created_at) as date,
    COUNT(DISTINCT user_id) as active_users,
    COUNT(*) as total_uploads,
    SUM(points_earned) as total_points
FROM content_uploads
WHERE company_id IS NOT NULL
GROUP BY company_id, DATE(created_at);

-- 지점별 일일 통계
CREATE OR REPLACE VIEW store_stats AS
SELECT 
    company_id,
    store_id,
    DATE(created_at) as date,
    COUNT(DISTINCT user_id) as active_users,
    COUNT(*) as total_uploads,
    SUM(points_earned) as total_points
FROM content_uploads
WHERE store_id IS NOT NULL
GROUP BY company_id, store_id, DATE(created_at);

-- 회사별 리더보드
CREATE OR REPLACE VIEW company_leaderboard AS
SELECT 
    up.company_id,
    up.user_id,
    up.total_points,
    up.current_level,
    up.total_uploads,
    ROW_NUMBER() OVER (PARTITION BY up.company_id ORDER BY up.total_points DESC) as rank
FROM user_progress up
WHERE up.company_id IS NOT NULL;

-- 지점별 리더보드
CREATE OR REPLACE VIEW store_leaderboard AS
SELECT 
    up.company_id,
    up.store_id,
    up.user_id,
    up.total_points,
    up.current_level,
    up.total_uploads,
    ROW_NUMBER() OVER (PARTITION BY up.store_id ORDER BY up.total_points DESC) as rank
FROM user_progress up
WHERE up.store_id IS NOT NULL;

-- 8. 회사별 컨텐츠 아이디어 필터링을 위한 준비
-- contents_idea 테이블에도 company_id 추가 (특정 회사만을 위한 아이디어)
ALTER TABLE contents_idea 
ADD COLUMN IF NOT EXISTS company_id TEXT,
ADD COLUMN IF NOT EXISTS store_id TEXT;

CREATE INDEX IF NOT EXISTS idx_contents_idea_company ON contents_idea(company_id);
CREATE INDEX IF NOT EXISTS idx_contents_idea_store ON contents_idea(store_id);

-- 9. 통계 함수: 회사의 월간 성과
CREATE OR REPLACE FUNCTION get_company_monthly_stats(p_company_id TEXT, p_year INTEGER, p_month INTEGER)
RETURNS TABLE (
    total_users INTEGER,
    total_uploads INTEGER,
    total_points INTEGER,
    avg_uploads_per_user NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(DISTINCT user_id)::INTEGER as total_users,
        COUNT(*)::INTEGER as total_uploads,
        COALESCE(SUM(points_earned), 0)::INTEGER as total_points,
        ROUND(COUNT(*)::NUMERIC / NULLIF(COUNT(DISTINCT user_id), 0), 2) as avg_uploads_per_user
    FROM content_uploads
    WHERE company_id = p_company_id
    AND EXTRACT(YEAR FROM created_at) = p_year
    AND EXTRACT(MONTH FROM created_at) = p_month;
END;
$$ LANGUAGE plpgsql;

-- 10. 실행 완료 메시지
DO $$
BEGIN
    RAISE NOTICE 'company_id와 store_id 컬럼이 성공적으로 추가되었습니다.';
    RAISE NOTICE '회사별/지점별 통계 뷰가 생성되었습니다.';
END $$;
