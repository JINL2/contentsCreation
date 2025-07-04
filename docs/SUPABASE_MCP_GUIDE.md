# 🔧 Supabase MCP 데이터 수정 가이드

## 📌 개요
이 프로젝트의 모든 데이터는 **Supabase**에 저장됩니다. 데이터 문제 발생시 Supabase MCP를 사용하여 직접 수정할 수 있습니다.

## 🚨 일반적인 문제: 데이터 무결성

### 증상
```
User(2개) ≠ Store(0개) ≠ Company(0개)
```
- 개인 통계는 보이지만 팀 성과가 0으로 표시
- 원인: `company_id` 또는 `store_id`가 NULL

## ⚡ Supabase MCP로 즉시 해결

### 1. 문제 진단
```sql
-- Supabase MCP를 통해 실행
SELECT 
    user_id,
    company_id,
    store_id,
    COUNT(*) as count
FROM content_uploads
WHERE user_id = '0d2e61ad-e230-454e-8b90-efbe1c1a9268'
GROUP BY user_id, company_id, store_id;
```

### 2. 데이터 수정
```sql
-- NULL인 company_id, store_id 수정
UPDATE content_uploads
SET 
    company_id = 'ebd66ba7-fde7-4332-b6b5-0d8a7f615497',
    store_id = '16f4c231-185a-4564-b473-bad1e9b305e8'
WHERE user_id = '0d2e61ad-e230-454e-8b90-efbe1c1a9268'
AND (company_id IS NULL OR store_id IS NULL);
```

### 3. 관련 테이블도 수정
```sql
-- user_progress 업데이트
UPDATE user_progress
SET 
    company_id = 'ebd66ba7-fde7-4332-b6b5-0d8a7f615497',
    store_id = '16f4c231-185a-4564-b473-bad1e9b305e8'
WHERE user_id = '0d2e61ad-e230-454e-8b90-efbe1c1a9268';

-- user_activities 업데이트
UPDATE user_activities
SET 
    company_id = 'ebd66ba7-fde7-4332-b6b5-0d8a7f615497',
    store_id = '16f4c231-185a-4564-b473-bad1e9b305e8'
WHERE user_id = '0d2e61ad-e230-454e-8b90-efbe1c1a9268'
AND (company_id IS NULL OR store_id IS NULL);
```

### 4. 결과 확인
```sql
-- 스토어 통계 확인
SELECT * FROM get_store_stats('16f4c231-185a-4564-b473-bad1e9b305e8', 'week');
```

## 📊 예상 결과

### ✅ 수정 전
- User: 1개
- Company: 0개
- Store: 0개

### ✅ 수정 후
- User: 1개
- Company: 1개
- Store: 1개
- 주간 통계: 활성 멤버 1명, 비디오 1개, 포인트 120점

## 🎯 Claude에게 요청하는 방법

간단히 이렇게 요청하세요:
```
"Supabase MCP를 사용해서 Jin의 데이터 무결성 문제를 해결해줘"
```

또는
```
"project_id: yenfccoefczqxckbizqa를 사용해서 
content_uploads 테이블의 NULL인 company_id와 store_id를 수정해줘"
```

## 📝 주요 테이블 ID 참조

| 항목 | ID |
|-----|-----|
| **Project ID** | yenfccoefczqxckbizqa |
| **Jin User ID** | 0d2e61ad-e230-454e-8b90-efbe1c1a9268 |
| **Company ID** | ebd66ba7-fde7-4332-b6b5-0d8a7f615497 |
| **Store ID** | 16f4c231-185a-4564-b473-bad1e9b305e8 |

---
**마지막 업데이트**: 2025년 6월 29일
