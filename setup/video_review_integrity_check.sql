-- 서버 측 무결성 검증을 위한 SQL 트리거
-- video_reviews 테이블에 평가 삽입 전 검증

-- 1. 시청 시간 검증 함수
CREATE OR REPLACE FUNCTION validate_video_review()
RETURNS TRIGGER AS $$
BEGIN
    -- metadata에서 시청 정보 추출
    DECLARE
        watch_time INTEGER;
        video_loaded BOOLEAN;
        watch_percentage NUMERIC;
    BEGIN
        watch_time := (NEW.metadata->>'watch_time')::INTEGER;
        video_loaded := (NEW.metadata->>'video_loaded')::BOOLEAN;
        watch_percentage := (NEW.metadata->>'watch_percentage')::NUMERIC;
        
        -- 비디오가 로드되지 않았으면 거부
        IF video_loaded IS NULL OR video_loaded = false THEN
            RAISE EXCEPTION '비디오가 정상적으로 로드되지 않았습니다';
        END IF;
        
        -- 최소 시청 시간 체크 (3초)
        IF watch_time IS NULL OR watch_time < 3 THEN
            RAISE EXCEPTION '최소 3초 이상 시청해야 평가할 수 있습니다';
        END IF;
        
        -- 시청 비율이 너무 낮으면 경고 (10% 미만)
        IF watch_percentage IS NOT NULL AND watch_percentage < 10 THEN
            -- 경고만 하고 저장은 허용 (짧은 비디오일 수 있음)
            RAISE NOTICE '시청 비율이 낮습니다: %', watch_percentage;
        END IF;
        
        RETURN NEW;
    END;
END;
$$ LANGUAGE plpgsql;

-- 2. 트리거 생성
DROP TRIGGER IF EXISTS validate_review_before_insert ON video_reviews;
CREATE TRIGGER validate_review_before_insert
    BEFORE INSERT ON video_reviews
    FOR EACH ROW
    EXECUTE FUNCTION validate_video_review();

-- 3. 의심스러운 평가 패턴 감지 뷰
CREATE OR REPLACE VIEW suspicious_review_patterns AS
SELECT 
    metadata->>'actual_user_id' as user_id,
    DATE(created_at) as review_date,
    COUNT(*) as total_reviews,
    AVG((metadata->>'watch_time')::INTEGER) as avg_watch_time,
    AVG((metadata->>'watch_percentage')::NUMERIC) as avg_watch_percentage,
    COUNT(CASE WHEN (metadata->>'watch_time')::INTEGER < 3 THEN 1 END) as quick_reviews,
    COUNT(CASE WHEN rating = 5 THEN 1 END) as five_star_count,
    COUNT(CASE WHEN rating = 1 THEN 1 END) as one_star_count
FROM video_reviews
WHERE metadata->>'actual_user_id' IS NOT NULL
GROUP BY metadata->>'actual_user_id', DATE(created_at)
HAVING 
    -- 하루에 100개 이상 평가 (의심스러움)
    COUNT(*) > 100 OR
    -- 평균 시청 시간이 5초 미만
    AVG((metadata->>'watch_time')::INTEGER) < 5 OR
    -- 모든 평가가 5점 또는 1점
    (COUNT(CASE WHEN rating = 5 THEN 1 END) = COUNT(*) OR
     COUNT(CASE WHEN rating = 1 THEN 1 END) = COUNT(*))
ORDER BY review_date DESC, total_reviews DESC;

-- 4. 무결성 리포트 함수
CREATE OR REPLACE FUNCTION get_review_integrity_report(
    p_company_id UUID,
    p_date_from DATE DEFAULT CURRENT_DATE - INTERVAL '7 days',
    p_date_to DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE (
    report_date DATE,
    total_reviews BIGINT,
    valid_reviews BIGINT,
    suspicious_reviews BIGINT,
    avg_watch_time NUMERIC,
    integrity_score NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        DATE(vr.created_at) as report_date,
        COUNT(*) as total_reviews,
        COUNT(CASE 
            WHEN (vr.metadata->>'watch_time')::INTEGER >= 3 
            AND (vr.metadata->>'video_loaded')::BOOLEAN = true 
            THEN 1 
        END) as valid_reviews,
        COUNT(CASE 
            WHEN (vr.metadata->>'watch_time')::INTEGER < 3 
            OR (vr.metadata->>'video_loaded')::BOOLEAN = false 
            OR vr.metadata->>'watch_time' IS NULL
            THEN 1 
        END) as suspicious_reviews,
        AVG((vr.metadata->>'watch_time')::INTEGER) as avg_watch_time,
        ROUND(
            (COUNT(CASE 
                WHEN (vr.metadata->>'watch_time')::INTEGER >= 3 
                AND (vr.metadata->>'video_loaded')::BOOLEAN = true 
                THEN 1 
            END)::NUMERIC / COUNT(*)::NUMERIC) * 100, 
            2
        ) as integrity_score
    FROM video_reviews vr
    JOIN content_uploads cu ON vr.video_id = cu.id
    WHERE cu.company_id = p_company_id
    AND DATE(vr.created_at) BETWEEN p_date_from AND p_date_to
    GROUP BY DATE(vr.created_at)
    ORDER BY report_date DESC;
END;
$$ LANGUAGE plpgsql;

-- 사용 예시:
-- SELECT * FROM get_review_integrity_report('your-company-id'::uuid);
