# Contents Helper Website - 프로젝트 종합 보고서
*최종 업데이트: 2025년 6월 29일*

## 📋 프로젝트 개요
직원들이 스트레스 받지 않고 재미있게 컨텐츠를 만들 수 있도록 도와주는 게임화된 웹사이트

### 프로젝트 목표
- **단기 목표**: 개인 중심의 컨텐츠 제작 도구
- **중기 목표**: 팀 협업 플랫폼으로 진화  
- **장기 목표**: 창의성 개발과 회사 컨텐츠 문화 구축

## 🎨 브랜드 디자인
### Cameraon 브랜드 컬러 (Listen Customers 기반)
- **Primary Orange**: #FF6B35 - 메인 브랜드 컬러
- **Primary Light**: #FF8A65 - 밝은 변형
- **Primary Dark**: #E55100 - 어두운 변형
- **Neutral Colors**: Black (#000000), White (#FFFFFF), Gray 계열
- **Status Colors**: Success (#4CAF50), Warning (#FF9800), Error (#F44336)

### 로고 적용
- Listen Customers 프로젝트의 흰색 로고 사용
- 헤더에 "Cameraon" 로고와 "Contents Helper" 텍스트 조합

## 🗄️ Supabase 데이터베이스 정보

### 연결 정보
- **Project Name**: surveyPhoto
- **Project ID**: yenfccoefczqxckbizqa
- **URL**: https://yenfccoefczqxckbizqa.supabase.co
- **Anon Key**: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InllbmZjY29lZmN6cXhja2JpenFhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDU5NDkyNzksImV4cCI6MjA2MTUyNTI3OX0.U1iQUOaNPSrEHf1w_ePqgYzJiRO6Bi48E2Np2hY0nCQ
- **Region**: ap-southeast-1 (싱가포르)
- **Storage Bucket**: contents-videos (Public)

### 핵심 테이블 구조

#### 1. contents_idea
컨텐츠 아이디어 저장 테이블 (시나리오 형식: hook1, body1, hook2, body2, conclusion)
- **기본 필드**: id, title_ko, title_vi, category, emotion, target_audience, hook_text
- **시나리오**: scenario (JSONB - hook1, body1, hook2, body2, conclusion 구조)
- **상태 관리**: is_choosen, is_upload, upload_id, upload_time, choose_count
- **창의성 추적**: is_auto_created (자동생성 여부), created_by_user_id
- **바이럴 요소**: viral_tags (TEXT[])
- **회사/지점**: company_id, store_id (선택적 필터링)

#### 2. content_uploads
업로드된 영상 정보
- **기본 정보**: id, content_idea_id, user_id, created_at
- **파일 정보**: video_url, thumbnail_url, video_duration, file_size
- **메타데이터**: title, description, custom_tags, metadata (JSONB)
- **상태 관리**: status (uploaded/processing/completed/failed), is_active
- **성과 추적**: points_earned, quality_score, avg_rating, rating_count, view_count
- **조직 정보**: company_id, store_id

#### 3. user_progress
사용자 진행 상황 및 통계
- **사용자 정보**: user_id (UNIQUE), metadata (name, email 등)
- **통계**: total_points, current_level, total_uploads, streak_days
- **업적**: achievements (JSONB), preferred_categories
- **조직**: company_id, store_id
- **시간 추적**: created_at, updated_at, last_activity_date

#### 4. user_activities
모든 사용자 활동 로그
- **활동 정보**: activity_type (view/choose/upload/complete/rate_video)
- **관련 ID**: content_idea_id, upload_id
- **세션**: session_id
- **포인트**: points_earned
- **조직**: company_id, store_id

#### 5. 게임 시스템 테이블 (Supabase에서 동적 관리)
- **points_system**: 활동별 포인트 정의
- **level_system**: 레벨별 요구 점수 및 정보
- **achievement_system**: 업적 조건 및 보상
- **daily_challenges**: 일일 도전 과제

#### 6. video_ratings (2025.06.29 추가)
영상 평가 시스템
- **평가 정보**: upload_id, user_id, rating (1-5), comment
- **제약사항**: UNIQUE(upload_id, user_id) - 중복 평가 방지

### 주요 뷰(View) 및 함수

#### 통계 뷰
- **company_stats**: 회사별 일일 통계
- **store_stats**: 지점별 일일 통계  
- **company_leaderboard**: 회사별 사용자 랭킹
- **store_leaderboard**: 지점별 사용자 랭킹
- **store_performance**: 스토어별 성과 (활성 사용자, 업로드 수 등)
- **popular_videos**: 인기 영상 목록 (평점 4.0 이상)
- **user_creativity_stats**: 사용자 창의성 통계

#### RPC 함수
- **get_store_stats(p_store_id, p_period)**: 스토어 통계 조회 (today/week/month)
- **get_contents_helper_button_state(p_user_id)**: 앱 버튼 상태 정보

## 🎮 게임화 시스템

### 포인트 시스템 (Supabase points_system 테이블에서 관리)
- 아이디어 선택: +10 포인트
- 영상 업로드: +50 포인트
- 메타데이터 입력: +20 포인트
- 완료: +20 포인트
- 일일 보너스: +30 포인트
- 영상 평가: +5 포인트 (2025.06.29 추가)

### 레벨 시스템 (Supabase level_system 테이블에서 관리)
1. 🌱 초보 크리에이터 (0점)
2. 🌿 주니어 크리에이터 (100점)
3. 🌳 시니어 크리에이터 (500점)
4. 🏆 마스터 크리에이터 (1000점)
5. 👑 레전드 크리에이터 (2000점)

### 업적 시스템 (구현 예정)
- 첫 걸음: 첫 컨텐츠 완성
- 열정적인 크리에이터: 하루에 3개 제작
- 일주일 연속: 7일 연속 제작
- 다재다능: 5개 카테고리 도전
- 퀄리티 킹: 메타데이터 완성 10개

## 🔧 핵심 기능 구현 현황

### ✅ 완료된 기능

#### 1. 컨텐츠 제작 플로우
- 아이디어 선택 (is_choosen 우선 표시, 없으면 전부 랜덤)
- 시나리오 상세 보기 (탭 기반 UI)
- 비디오 업로드 (드래그 앤 드롭)
- 메타데이터 입력
- 완료 및 포인트 획득

#### 2. 사용자 관리
- URL 파라미터 처리 (user_id, user_name, company_id, store_id)
- 실시간 사용자 통계
- localStorage와 URL 파라미터 병행 사용
- 회사별/지점별 데이터 격리

#### 3. UI/UX 최적화
- 모바일 반응형 디자인
- 아코디언 카드 UI (아이디어 선택)
- 탭 기반 시나리오 뷰
- 포인트 가이드 모달 (Supabase 연동)
- 애니메이션 효과

#### 4. 랭킹 시스템
- 회사별/지점별 랭킹 표시
- TOP 50 표시 (1,2,3위 메달 디자인)
- 현재 사용자 하이라이트
- 팀 성과 통계 (today/week/month)

#### 5. 데이터베이스 연동
- Supabase 완전 통합
- 실시간 데이터 동기화
- 트리거를 통한 자동 상태 업데이트
- RPC 함수 활용

### 🚧 개발 진행 중

#### Phase 2.5 - 새로운 핵심 기능 (2025.06.29 계획)
1. **스토어별 성과 비교 시스템**
   - 팀 단위 평가로 협력 문화 조성
   - 스토어별 대시보드
   
2. **"내 아이디어로 제작하기" 기능**
   - 직원의 창의성과 자발성 측정
   - is_auto_created = false로 추적
   
3. **영상 공유 및 평가 시스템**
   - 회사별 영상 갤러리
   - 별점 평가 (video_ratings 테이블)
   - 피어 리뷰를 통한 품질 향상

## 📁 프로젝트 파일 구조

### 메인 파일
```
contents_helper_website/
├── index.html                    # 메인 페이지
├── index.php                     # PHP 리다이렉트 (선택사항)
├── style.css                     # 스타일시트 (Cameraon 브랜드 적용)
├── script.js                     # 핵심 로직 (DB 연동)
├── config.js                     # Supabase 설정
└── .htaccess                     # Apache 설정
```

### 문서
```
├── README.md                     # 프로젝트 개요 및 설치 가이드
├── project-report.md            # 이 파일 (종합 보고서)
├── database-structure.md        # DB 구조 상세 문서
├── feature-update-2025-06.md    # 새 기능 계획 (Phase 2.5)
├── whatnext.md                  # 다음 작업 가이드
└── listen-customers-analysis.md # 참고 프로젝트 분석
```

### 테스트 및 개발
```
├── test-parameters.html         # 파라미터 테스트 페이지
├── test-video-upload.html       # 비디오 업로드 테스트
├── test-display.html            # 시나리오 표시 테스트
├── test-points-system.html      # 포인트 시스템 테스트
├── test-scenario.html           # 시나리오 변환 테스트
├── video-gallery.html           # 영상 갤러리 (개발 예정)
└── admin-game-system.html       # 게임 시스템 관리
```

### 가이드 및 수정 문서
```
├── JIN_TEST_GUIDE.md           # Jin 사용자 테스트 가이드
├── JIN_TEST_RESULTS.md         # Jin 테스트 결과
├── NEXT_STEPS_GUIDE.md         # 다음 작업자를 위한 가이드
├── button-integration-guide.md  # 앱 통합 가이드
└── 404_ERROR_FIX.md            # 404 에러 해결 가이드
```

### 설치 및 업데이트 SQL
```
setup/
├── create_tables.sql                     # 초기 테이블 생성
├── create_game_tables.sql               # 게임 시스템 테이블
├── add_company_store_columns.sql        # company_id, store_id 추가
├── update_database_2025_06_29.sql       # 최신 업데이트 (RLS 제거, 새 기능)
├── convert_scenario_format.sql          # 시나리오 형식 변환
└── fix_jin_data_immediate.sql           # Jin 데이터 수정
```

### 에셋
```
assets/
└── (이미지, 비디오 등 리소스)
```

## 🚀 설치 및 실행 방법

### 1. 데이터베이스 설정
```sql
-- Supabase SQL Editor에서 순서대로 실행
1. /setup/create_tables.sql
2. /setup/create_game_tables.sql  
3. /setup/add_company_store_columns.sql
4. /setup/update_database_2025_06_29.sql
```

### 2. Storage 버킷 생성
- Supabase Dashboard → Storage
- 새 버킷: `contents-videos` (Public 설정 필수)

### 3. 환경 변수 설정 (config.js)
```javascript
const SUPABASE_CONFIG = {
    url: 'https://yenfccoefczqxckbizqa.supabase.co',
    anonKey: 'your-anon-key'
};
```

### 4. 웹사이트 접속
```
# 기본 접속
http://localhost/mysite/contents_helper_website/

# 파라미터 포함 접속 (권장)
http://localhost/mysite/contents_helper_website/?user_id=emp001&user_name=김철수&company_id=cameraon&store_id=gangnam
```

## 🧪 테스트 데이터

### Jin 사용자 테스트 URL
```
http://localhost/mysite/contents_helper_website/?user_id=0d2e61ad-e230-454e-8b90-efbe1c1a9268&user_name=Jin&company_id=ebd66ba7-fde7-4332-b6b5-0d8a7f615497&store_id=16f4c231-185a-4564-b473-bad1e9b305e8
```

### 테스트 사용자 정보
- **User ID**: 0d2e61ad-e230-454e-8b90-efbe1c1a9268
- **User Name**: Jin
- **Company ID**: ebd66ba7-fde7-4332-b6b5-0d8a7f615497
- **Store ID**: 16f4c231-185a-4564-b473-bad1e9b305e8

## 📊 주요 개선사항 및 성과

### 기술적 개선
- ✅ Supabase RPC 함수 활용으로 성능 최적화
- ✅ company_id, store_id 별도 컬럼으로 인덱싱 개선
- ✅ 트리거를 통한 자동 데이터 정합성 유지
- ✅ 포인트 시스템 DB 기반 동적 관리

### UX 개선
- ✅ 모바일 최적화 (iOS 자동 확대 방지)
- ✅ 아코디언 UI로 정보 단계적 표시
- ✅ 실시간 피드백 및 애니메이션
- ✅ 직관적인 프로그레스 표시

### 비즈니스 가치
- ✅ 개인별 성과 추적 가능
- ✅ 팀별 경쟁 시스템 기반 마련
- ✅ 창의성 측정 지표 확보 가능
- ✅ 데이터 기반 의사결정 지원

## 🎯 다음 단계 (Phase 2.5)

### 1. 스토어별 성과 비교 시스템
- **목적**: 팀 단위 평가로 협력 문화 조성
- **기술**: Chart.js 활용 대시보드
- **DB**: store_performance, store_weekly_ranking 뷰 활용

### 2. "내 아이디어로 제작하기" 기능
- **목적**: 능동적 참여자 발굴
- **기술**: 커스텀 시나리오 입력 폼
- **DB**: is_auto_created = false로 추적

### 3. 영상 공유 및 평가 시스템
- **목적**: 상호 학습과 품질 향상
- **기술**: 갤러리 UI, 별점 시스템
- **DB**: video_ratings 테이블, popular_videos 뷰

## 🔍 알려진 이슈 및 해결방법

### 1. 404 에러
- 원인: index.html 파일 경로 문제
- 해결: 404_ERROR_FIX.md 참조

### 2. store_id NULL 문제
- 원인: URL 파라미터 누락
- 해결: fix_jin_data_immediate.sql 실행

### 3. 포인트 불일치
- 원인: 하드코딩된 포인트 값
- 해결: points_system 테이블에서 동적 로드

## 📞 연락처 및 지원

- **프로젝트 담당**: Cameraon Team
- **기술 문서**: 이 보고서 및 관련 MD 파일 참조
- **긴급 수정**: setup/one_click_fix.sql 실행

## 🏆 프로젝트 성과 요약

**완료율**: 85% (Phase 1 완료, Phase 2.5 진행 중)

**주요 성과**:
- ✅ 게임화를 통한 직원 참여도 향상 기반 구축
- ✅ 체계적인 컨텐츠 제작 프로세스 구축
- ✅ 데이터 기반 컨텐츠 전략 수립 가능
- ✅ Cameraon 브랜드 아이덴티티 강화
- ✅ 확장 가능한 아키텍처 구현

**다음 목표**:
- 🎯 팀 협업 플랫폼으로 진화
- 🎯 창의성 개발 도구로 발전
- 🎯 회사 고유의 컨텐츠 문화 구축

---
*프로젝트 시작일: 2025년 6월 초*
*최종 업데이트: 2025년 6월 29일*
*개발: AI Assistant & Cameraon Team*