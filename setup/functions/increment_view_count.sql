-- increment_view_count 함수 생성
-- 비디오 조회수를 증가시키는 함수

CREATE OR REPLACE FUNCTION increment_view_count(video_id UUID)
RETURNS void AS $$
BEGIN
    UPDATE content_uploads
    SET view_count = COALESCE(view_count, 0) + 1
    WHERE id = video_id;
END;
$$ LANGUAGE plpgsql;