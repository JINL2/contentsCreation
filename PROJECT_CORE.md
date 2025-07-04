# 📌 PROJECT_CORE.md - Contents Helper Website 핵심 정보
*이 문서는 프로젝트의 변하지 않는 핵심 정보만을 담고 있습니다*

## 🎯 프로젝트 본질
**Contents Helper Website**는 직원들이 스트레스 없이 재미있게 콘텐츠를 만들 수 있도록 돕는 게임화된 플랫폼입니다.

### 핵심 철학
> "직원들이 즐겁게 콘텐츠를 만들면서, 창의성을 개발하고, 팀워크를 강화하며, 회사의 콘텐츠 문화를 만들어가는 플랫폼"

### 대상 사용자
- **1차**: Cameraon 직원들 (콘텐츠 제작자)
- **2차**: 관리자 (성과 분석 및 관리)
- **3차**: 인사팀 (창의성 및 성과 데이터 활용)

## 🏗️ 기술 스택 (절대 불변)

### Backend
- **Supabase** (PostgreSQL)
  - Project ID: `yenfccoefczqxckbizqa`
  - URL: `https://yenfccoefczqxckbizqa.supabase.co`
  - Region: Singapore (ap-southeast-1)
  - Storage Bucket: `contents-videos` (Public)

### Frontend
- **순수 JavaScript** (프레임워크 없음)
- **HTML5 + CSS3**
- **No Build Process** (바로 실행 가능)

### 외부 라이브러리
- 없음 (의도적으로 의존성 최소화)

## 📁 핵심 파일 구조 (절대 경로)
```
/Applications/XAMPP/xamppfiles/htdocs/mysite/contents_helper_website/
├── PROJECT_CORE.md     # 불변의 핵심 정보 (이 파일)
├── whatbefore.md       # 직전 완료 작업
├── whatnext.md         # 다음 할 작업
├── README.md           # 프로젝트 소개
├── index.html          # 메인 애플리케이션 진입점
├── script.js           # 모든 비즈니스 로직
├── style.css           # 스타일 (Cameraon 브랜드: #FF6B35)
├── config.js           # Supabase 연결 정보
├── docs/               # 모든 기술 문서
├── tests/              # 테스트 페이지
├── setup/              # SQL 스크립트 모음
├── backup/             # 백업 파일
└── assets/             # 이미지, 리소스
```

## 💾 데이터베이스 핵심 테이블

### 1. contents_idea
- **목적**: 콘텐츠 아이디어 저장
- **핵심 필드**: scenario (JSONB - hook1, body1, hook2, body2, conclusion)
- **상태 추적**: is_choosen, is_upload, is_auto_created

### 2. content_uploads
- **목적**: 업로드된 영상 정보
- **핵심 필드**: video_url, user_id, company_id, store_id
- **성과 추적**: points_earned, avg_rating, view_count

### 3. user_progress
- **목적**: 사용자 통계 및 진행 상황
- **핵심 필드**: total_points, current_level, total_uploads
- **고유 제약**: user_id (UNIQUE)

### 4. 게임 시스템 테이블
- **points_system**: 활동별 포인트 정의
- **level_system**: 레벨 정보
- **achievement_system**: 업적 시스템

## 🔑 핵심 비즈니스 로직

### 콘텐츠 제작 플로우
```
아이디어 선택(+10점) → 시나리오 확인 → 영상 촬영 → 
업로드(+50점) → 메타데이터(+20점) → 완료(+20점)
```

### 사용자 식별
- URL 파라미터로 전달: `user_id`, `user_name`, `company_id`, `store_id`
- localStorage 백업 저장
- 모든 활동에 company_id, store_id 기록

### 데이터 격리
- 회사별/지점별 데이터 분리
- NULL company_id = 공통 콘텐츠

## 🎮 게임화 원칙

### 개인 동기부여
- 포인트 시스템 (즉각적 보상)
- 레벨 시스템 (장기 목표)
- 업적 시스템 (도전 과제)

### 팀 협업 (진화 방향)
- 스토어별 랭킹
- 팀 성과 통계
- 상호 평가 시스템

## 📊 핵심 성과 지표 (KPI)

### 양적 지표
- 일일 활성 사용자 (DAU)
- 주간 콘텐츠 생산량
- 평균 완료율

### 질적 지표
- 창의성 비율 (커스텀 vs 자동 아이디어)
- 평균 영상 평점
- 팀 참여율

## ⚡ 빠른 시작 명령어

### ⚠️ Apache 접속 문제 해결 방법
**발견된 문제**: Apache DocumentRoot가 `/Applications/XAMPP/xamppfiles/htdocs`로 설정되어 있어 `/mysite` 경로가 없습니다.

#### 해결책 1: 정확한 URL 사용 (권장)
```bash
# 잘못된 URL (404 에러)
http://localhost/mysite/contents_helper_website/

# 올바른 URL ✅
http://localhost/contents_helper_website/?user_id=0d2e61ad-e230-454e-8b90-efbe1c1a9268&user_name=Jin&company_id=ebd66ba7-fde7-4332-b6b5-0d8a7f615497&store_id=16f4c231-185a-4564-b473-bad1e9b305e8
```

#### 해결책 2: .htaccess 파일 복원
.htaccess 파일이 없으면 백업에서 복원:
```bash
# 백업 파일 확인
/backup/.htaccess.backup

# 내용:
# Contents Helper - Simple Apache Config
DirectoryIndex index.php index.html
```

#### 해결책 3: file:// 프로토콜 사용 (임시)
```bash
file:///Applications/XAMPP/xamppfiles/htdocs/mysite/contents_helper_website/index.html?user_id=0d2e61ad-e230-454e-8b90-efbe1c1a9268&user_name=Jin&company_id=ebd66ba7-fde7-4332-b6b5-0d8a7f615497&store_id=16f4c231-185a-4564-b473-bad1e9b305e8
```
⚠️ 주의: file:// 프로토콜은 Supabase API 호출에 CORS 제약이 있어 데이터 로드가 안 될 수 있습니다.

### 🔍 Apache DocumentRoot 문제
1. **현재 상황**: Apache가 `/htdocs`를 루트로 인식
2. **영향**: `/mysite/` 경로로 접근 불가
3. **해결**: URL에서 `/mysite` 제거

### 🚫 절대 하지 말아야 할 것
- **테스트용 임시 파일 생성 금지**: test-*.html 같은 파일을 만들지 마세요
- **프로덕션 환경에서 직접 테스트**: 항상 실제 index.html에서 테스트하세요
- **별도의 테스트 환경 구축 금지**: 실제 사용 환경과 동일하게 테스트하세요

### Supabase 접속
```
https://supabase.com/dashboard/project/yenfccoefczqxckbizqa
```

### AI 프롬프트 모음
**`PROMPTS_COLLECTION.md`** 파일에 상황별 프롬프트 정리되어 있음

## 🔄 필수 문서 관리 시스템

### ⚠️ 중요: 3개 문서 체계
이 프로젝트는 **시간축 기반 3개 문서 체계**로 관리됩니다:

1. **PROJECT_CORE.md** (이 파일)
   - 변경 금지 (핵심 정보만)
   - 프로젝트 본질, 기술 스택, 구조

2. **whatbefore.md** 
   - 매 작업 완료 시 업데이트
   - 방금 완료한 기능, 해결한 문제

3. **whatnext.md**
   - 매 작업 시작 전 확인
   - 다음 할 일, 우선순위

### 업데이트 규칙
```
작업 시작 → whatnext.md 확인
    ↓
작업 진행
    ↓
작업 완료 → whatbefore.md 업데이트
    ↓
다음 작업 → whatnext.md 업데이트
```

**⭐ 새로운 개발자/AI는 반드시 이 3개 파일을 먼저 읽고 시작하세요!**

## 🚨 절대 변경하지 말아야 할 것들

1. **Supabase 프로젝트 ID**
2. **기본 테이블 구조** (컬럼 추가는 가능)
3. **URL 파라미터 방식**
4. **포인트 계산 로직**
5. **이 문서 (PROJECT_CORE.md)**

---
*이 문서는 프로젝트의 DNA입니다. 수정하지 마세요.*
*마지막 검증: 2025년 6월 29일*