-- Jin 사용자 데이터 무결성 체크 스크립트
-- user_id: 0d2e61ad-e230-454e-8b90-efbe1c1a9268
-- company_id: ebd66ba7-fde7-4332-b6b5-0d8a7f615497
-- store_id: 16f4c231-185a-4564-b473-bad1e9b305e8

-- 1. Jin의 user_progress 확인
SELECT 
    '=== USER PROGRESS ===' as section,
    user_id,
    company_id,
    store_id,
    total_uploads,
    total_points,
    metadata
FROM user_progress
WHERE user_id = '0d2e61ad-e230-454e-8b90-efbe1c1a9268';

-- 2. Jin의 content_uploads 확인
SELECT 
    '=== CONTENT UPLOADS ===' as section,
    id,
    user_id,
    company_id,
    store_id,
    created_at,
    points_earned
FROM content_uploads
WHERE user_id = '0d2e61ad-e230-454e-8b90-efbe1c1a9268'
ORDER BY created_at DESC;

-- 3. 문제 진단 - NULL 값 체크
SELECT 
    '=== NULL CHECK ===' as section,
    COUNT(*) as total_uploads,
    COUNT(CASE WHEN company_id IS NULL THEN 1 END) as null_company_count,
    COUNT(CASE WHEN store_id IS NULL THEN 1 END) as null_store_count,
    COUNT(CASE WHEN company_id = 'ebd66ba7-fde7-4332-b6b5-0d8a7f615497' THEN 1 END) as correct_company_count,
    COUNT(CASE WHEN store_id = '16f4c231-185a-4564-b473-bad1e9b305e8' THEN 1 END) as correct_store_count
FROM content_uploads
WHERE user_id = '0d2e61ad-e230-454e-8b90-efbe1c1a9268';

-- 4. 회사별 통계 확인
SELECT 
    '=== COMPANY STATS ===' as section,
    company_id,
    COUNT(DISTINCT user_id) as users,
    COUNT(*) as uploads,
    SUM(points_earned) as total_points
FROM content_uploads
WHERE company_id = 'ebd66ba7-fde7-4332-b6b5-0d8a7f615497'
GROUP BY company_id;

-- 5. 스토어별 통계 확인
SELECT 
    '=== STORE STATS ===' as section,
    store_id,
    COUNT(DISTINCT user_id) as users,
    COUNT(*) as uploads,
    SUM(points_earned) as total_points
FROM content_uploads
WHERE store_id = '16f4c231-185a-4564-b473-bad1e9b305e8'
GROUP BY store_id;

-- 6. 전체 업로드 현황 (company_id별)
SELECT 
    '=== COMPANY UPLOAD SUMMARY ===' as section,
    company_id,
    COUNT(*) as upload_count
FROM content_uploads
GROUP BY company_id
ORDER BY upload_count DESC;

-- 7. 전체 업로드 현황 (store_id별)
SELECT 
    '=== STORE UPLOAD SUMMARY ===' as section,
    store_id,
    COUNT(*) as upload_count
FROM content_uploads
GROUP BY store_id
ORDER BY upload_count DESC;

-- 8. Jin의 user_activities 확인
SELECT 
    '=== USER ACTIVITIES ===' as section,
    activity_type,
    company_id,
    store_id,
    COUNT(*) as activity_count
FROM user_activities
WHERE user_id = '0d2e61ad-e230-454e-8b90-efbe1c1a9268'
GROUP BY activity_type, company_id, store_id;

-- 9. 데이터 수정 제안
SELECT 
    '=== DATA FIX SUGGESTION ===' as section,
    CASE 
        WHEN company_id IS NULL THEN 'UPDATE content_uploads SET company_id = ''ebd66ba7-fde7-4332-b6b5-0d8a7f615497'' WHERE id = ''' || id || ''';'
        WHEN store_id IS NULL THEN 'UPDATE content_uploads SET store_id = ''16f4c231-185a-4564-b473-bad1e9b305e8'' WHERE id = ''' || id || ''';'
        ELSE 'OK'
    END as fix_sql
FROM content_uploads
WHERE user_id = '0d2e61ad-e230-454e-8b90-efbe1c1a9268'
AND (company_id IS NULL OR store_id IS NULL);
