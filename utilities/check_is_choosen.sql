-- is_choosen=true인 아이디어들 확인
SELECT 
    id,
    title_vi,
    title_ko,
    is_choosen,
    is_upload,
    is_auto_created,
    created_at
FROM contents_idea
WHERE is_choosen = true 
    AND is_upload = false 
    AND is_auto_created = true
ORDER BY created_at DESC;

-- 전체 통계
SELECT 
    COUNT(*) as total_ideas,
    COUNT(CASE WHEN is_choosen = true THEN 1 END) as choosen_ideas,
    COUNT(CASE WHEN is_choosen = true AND is_upload = false AND is_auto_created = true THEN 1 END) as available_choosen_ideas
FROM contents_idea;
