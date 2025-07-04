# 🧪 Contents Helper Website - Quick Test Guide

## 🚀 빠른 테스트 URL

### 1️⃣ 복사해서 바로 사용
```
http://localhost/mysite/contents_helper_website/?user_id=0d2e61ad-e230-454e-8b90-efbe1c1a9268&user_name=Jin&company_id=ebd66ba7-fde7-4332-b6b5-0d8a7f615497&store_id=16f4c231-185a-4564-b473-bad1e9b305e8
```

### 2️⃣ 파라미터 설명
| 파라미터 | 값 | 설명 |
|---------|---|------|
| `user_id` | 0d2e61ad-e230-454e-8b90-efbe1c1a9268 | Jin의 고유 ID |
| `user_name` | Jin | 사용자 이름 |
| `company_id` | ebd66ba7-fde7-4332-b6b5-0d8a7f615497 | 회사 ID |
| `store_id` | 16f4c231-185a-4564-b473-bad1e9b305e8 | 스토어 ID |

## 🗄️ Supabase 연결 정보 (중요!)

> **⚠️ 이 프로젝트는 Supabase를 사용합니다!**

```javascript
// config.js에 이미 설정됨
const SUPABASE_CONFIG = {
    url: 'https://yenfccoefczqxckbizqa.supabase.co',
    anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
};
```

- **Project ID**: `yenfccoefczqxckbizqa`
- **Region**: Singapore (ap-southeast-1)
- **Dashboard**: https://supabase.com/dashboard/project/yenfccoefczqxckbizqa

## 🔧 데이터 무결성 문제 해결 (Supabase MCP 사용)

### 문제 증상
- ❌ 개인 통계는 표시되지만 팀 성과가 0으로 표시
- ❌ User(2) ≠ Store(0) ≠ Company(0)

### 즉시 해결 방법

#### 1. Supabase MCP로 직접 수정 (권장) ⭐
```sql
-- 1. 문제 진단
SELECT user_id, company_id, store_id, COUNT(*) 
FROM content_uploads 
WHERE user_id = '0d2e61ad-e230-454e-8b90-efbe1c1a9268'
GROUP BY user_id, company_id, store_id;

-- 2. NULL 데이터 수정
UPDATE content_uploads
SET 
    company_id = 'ebd66ba7-fde7-4332-b6b5-0d8a7f615497',
    store_id = '16f4c231-185a-4564-b473-bad1e9b305e8'
WHERE user_id = '0d2e61ad-e230-454e-8b90-efbe1c1a9268'
AND (company_id IS NULL OR store_id IS NULL);

-- 3. 결과 확인
SELECT * FROM get_store_stats('16f4c231-185a-4564-b473-bad1e9b305e8', 'week');
```

#### 2. 또는 준비된 SQL 스크립트 실행
- 위치: `/setup/fix_jin_data_immediate.sql`
- Supabase Dashboard → SQL Editor에서 실행

## ✅ 테스트 체크리스트

### 1. 페이지 로드 확인
- [ ] URL 파라미터로 접속
- [ ] 사용자 정보 표시 확인 (Jin, Company: ebd66ba7..., Store: 16f4c231...)
- [ ] 포인트와 레벨 표시

### 2. 팀 성과 확인
- [ ] "📊 Thành tích đội" 클릭
- [ ] 주간 통계 확인 (활성 멤버: 1, 비디오: 1, 포인트: 120)
- [ ] 월간 통계 확인

### 3. 기능 테스트
- [ ] 아이디어 카드 확장/축소
- [ ] 포인트 가이드 모달 확인
- [ ] 랭킹 시스템 확인

## 🛠️ 문제 발생시

### 404 에러
```bash
# .htaccess 파일 이름 변경
mv .htaccess .htaccess.backup
```

### 데이터 안 보임
1. 브라우저 개발자 도구 (F12) → Console 확인
2. Supabase Dashboard에서 데이터 확인
3. `company_id`, `store_id` NULL 체크

### CORS 에러
- file:// 프로토콜로 직접 열기
- 또는 XAMPP/MAMP 등 로컬 서버 사용

## 📱 모바일 테스트
1. 같은 네트워크에서 접속
2. `http://[YOUR-IP]/mysite/contents_helper_website/` + 파라미터
3. 또는 ngrok 사용

---
**마지막 업데이트**: 2025년 6월 29일
