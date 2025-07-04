# Contents Helper Website - 테이블 구조 문서

## 1. 수정된 테이블 구조

### contents_idea 테이블 (수정)
기존 컬럼에 추가된 필드:
- `is_choosen` (BOOLEAN): 사용자가 선택했지만 아직 업로드하지 않은 상태
- `is_upload` (BOOLEAN): 업로드 완료된 상태
- `upload_id` (UUID): 업로드된 컨텐츠의 ID
- `upload_time` (TIMESTAMP): 업로드 시간
- `choose_count` (INTEGER): 선택된 횟수
- `viral_tags` (TEXT[]): 바이럴 요소 태그 배열

### 새로운 테이블들

#### content_uploads
사용자가 업로드한 영상 정보 저장:
- `id` (UUID): 기본키
- `created_at` (TIMESTAMP): 생성 시간
- `content_idea_id` (INTEGER): 선택한 아이디어 ID
- `user_id` (TEXT): 사용자 ID
- `company_id` (TEXT): 회사 ID
- `store_id` (TEXT): 가게/지점 ID
- `video_url` (TEXT): 영상 URL
- `thumbnail_url` (TEXT): 썸네일 URL
- `video_duration` (INTEGER): 영상 길이(초)
- `file_size` (BIGINT): 파일 크기
- `title` (TEXT): 영상 제목
- `description` (TEXT): 설명
- `custom_tags` (TEXT[]): 사용자 정의 태그
- `status` (VARCHAR): 상태 (uploaded, processing, completed, failed)
- `points_earned` (INTEGER): 획득 포인트
- `quality_score` (INTEGER): 품질 점수
- `metadata` (JSONB): 추가 메타데이터
- `device_info` (JSONB): 기기 정보
- `is_active` (BOOLEAN): 활성 상태

#### user_activities
사용자 활동 로그:
- `id` (UUID): 기본키
- `created_at` (TIMESTAMP): 생성 시간
- `user_id` (TEXT): 사용자 ID
- `company_id` (TEXT): 회사 ID
- `store_id` (TEXT): 가게/지점 ID
- `session_id` (TEXT): 세션 ID
- `activity_type` (VARCHAR): 활동 유형 (view, choose, upload, complete)
- `content_idea_id` (INTEGER): 관련 아이디어 ID
- `upload_id` (UUID): 관련 업로드 ID
- `points_earned` (INTEGER): 획득 포인트
- `metadata` (JSONB): 추가 정보

#### user_progress
사용자 진행 상황:
- `id` (UUID): 기본키
- `user_id` (TEXT): 사용자 ID (UNIQUE)
- `company_id` (TEXT): 회사 ID
- `store_id` (TEXT): 가게/지점 ID
- `created_at` (TIMESTAMP): 생성 시간
- `updated_at` (TIMESTAMP): 수정 시간
- `total_points` (INTEGER): 총 포인트
- `current_level` (INTEGER): 현재 레벨
- `total_uploads` (INTEGER): 총 업로드 수
- `streak_days` (INTEGER): 연속 일수
- `last_activity_date` (DATE): 마지막 활동 날짜
- `achievements` (JSONB): 달성한 업적
- `preferred_categories` (TEXT[]): 선호 카테고리
- `metadata` (JSONB): 추가 정보

#### daily_challenges
일일 도전 과제:
- `id` (UUID): 기본키
- `created_at` (TIMESTAMP): 생성 시간
- `challenge_date` (DATE): 도전 날짜
- `challenge_type` (VARCHAR): 도전 유형
- `target_category` (VARCHAR): 대상 카테고리
- `target_emotion` (VARCHAR): 대상 감정
- `required_count` (INTEGER): 필요 개수
- `bonus_points` (INTEGER): 보너스 포인트
- `title` (TEXT): 제목
- `description` (TEXT): 설명
- `is_active` (BOOLEAN): 활성 상태

## 2. 주요 기능 로직

### 아이디어 선택 로직
1. `is_upload=false`인 아이디어만 표시
2. `is_choosen=true`인 아이디어를 최소 1개 포함
3. 나머지는 랜덤으로 선택하여 총 5개 표시
4. 선택된 아이디어는 강조 표시 (주황색 테두리)

### 활동 추적
- 아이디어 조회 시: `activity_type='view'`
- 아이디어 선택 시: `activity_type='choose'`
- 영상 업로드 시: `activity_type='upload'`
- 완료 시: `activity_type='complete'`

### 트리거 함수
`update_content_idea_status()`: 
- `choose` 활동 시 → `is_choosen=true`, `choose_count` 증가
- `upload` 활동 시 → `is_upload=true`, `upload_id`, `upload_time` 설정

## 3. 바이럴 태그 시스템

각 카테고리별 바이럴 태그 예시:
- **일상**: 트렌드, 일상, 공감, 재미
- **음식**: 먹방, 맛집, 리뷰, ASMR
- **여행**: 여행팁, 핫플, 브이로그, 숨은명소
- **패션**: 코디, 하울, 트렌드, 스타일링
- **뷰티**: 메이크업, 스킨케어, 리뷰, 튜토리얼

## 4. 구현된 주요 기능

### 프론트엔드
1. **개선된 아이디어 선택**
   - 이전에 선택한 아이디어 표시
   - 바이럴 태그 표시
   - 선택 횟수 추적

2. **데이터베이스 연동**
   - 모든 활동이 DB에 기록
   - 실시간 진행 상황 동기화
   - 업로드 정보 완전 저장

3. **UI/UX 개선**
   - 선택된 카드 시각적 구분
   - 바이럴 요소 강조
   - 더 나은 정보 구조

### 백엔드
1. **자동 상태 업데이트**
   - 트리거를 통한 자동 상태 변경
   - 활동 기록 자동화

2. **RLS 정책**
   - 모든 사용자가 읽기/쓰기 가능
   - 익명 사용자도 사용 가능

## 5. 설치 및 실행

### SQL 실행 순서
1. `/setup/create_tables.sql` 실행
2. Storage 버킷 `contents-videos` 생성 (Public)
3. 웹사이트 테스트

### 주의사항
- 모든 아이디어가 업로드되면 새 아이디어 추가 필요
- 바이럴 태그는 수동으로 추가해야 함
- Storage 버킷은 Public으로 설정 필수

## 6. 회사별/지점별 데이터 관리

### company_id와 store_id 사용
**URL 파라미터 전달 방식**:
```
?user_id=emp001&user_name=김철수&company_id=cameraon&store_id=gangnam
```

### 데이터 저장 위치
1. **user_progress**: 사용자가 어느 회사/지점 소속인지 저장
2. **content_uploads**: 컨텐츠가 어느 회사/지점에서 만들어졌는지 저장
3. **user_activities**: 활동이 어느 회사/지점에서 발생했는지 저장

### 통계 뷰(View)
1. **company_stats**: 회사별 일일 통계
   - 활성 사용자 수
   - 총 업로드 수
   - 총 포인트

2. **store_stats**: 지점별 일일 통계
   - 회사 ID + 지점 ID
   - 활성 사용자 수
   - 총 업로드 수
   - 총 포인트

3. **company_leaderboard**: 회사별 순위
   - 사용자별 포인트 순위
   - 레벨 및 업로드 수 포함

4. **store_leaderboard**: 지점별 순위
   - 지점 내 사용자 순위
   - 전체 통계 포함

### 활용 예시
```sql
-- 특정 회사의 이번 달 통계
SELECT * FROM get_company_monthly_stats('cameraon', 2025, 6);

-- 특정 지점의 TOP 10 사용자
SELECT * FROM store_leaderboard 
WHERE store_id = 'gangnam'
ORDER BY rank
LIMIT 10;

-- 회사별 일일 업로드 추이
SELECT * FROM company_stats 
WHERE company_id = 'cameraon' 
AND date >= CURRENT_DATE - INTERVAL '7 days'
ORDER BY date;
```

### 회사별 컨텐츠 아이디어 필터링
```sql
-- 특정 회사용 아이디어만 보기
SELECT * FROM contents_idea 
WHERE company_id = 'cameraon' OR company_id IS NULL;

-- 특정 지점용 아이디어 우선 표시
SELECT * FROM contents_idea 
WHERE store_id = 'gangnam' OR store_id IS NULL
ORDER BY store_id DESC NULLS LAST;
```

### 인덱스 전략
- 단일 컬럼 인덱스: company_id, store_id 각각
- 복합 인덱스: (company_id, store_id) 조합
- 시간 기반 인덱스: (company_id, created_at) 등

### 데이터 격리 정책
1. **완전 격리**: 회사별로 완전히 분리된 데이터
2. **부분 공유**: 일부 공통 아이디어 + 회사별 아이디어
3. **통계만 격리**: 모든 아이디어 공유, 통계만 분리

현재는 **부분 공유** 방식으로 구현됨:
- company_id/store_id가 NULL인 아이디어는 모든 회사가 사용

## 7. 2025년 6월 29일 업데이트 내역

### RLS (Row Level Security) 비활성화
- 모든 테이블의 RLS가 비활성화됨
- 데이터 보안이 중요하지 않은 프로젝트 특성상 제거
- 모든 사용자가 데이터에 자유롭게 접근 가능

### 새로운 테이블: video_ratings
영상 평가 정보 저장:
- `id` (UUID): 기본키
- `upload_id` (UUID): 평가 대상 영상 ID
- `user_id` (TEXT): 평가자 ID
- `company_id` (TEXT): 회사 ID
- `rating` (INTEGER): 별점 (1-5)
- `comment` (TEXT): 코멘트
- `created_at` (TIMESTAMP): 평가 시간
- UNIQUE 제약: (upload_id, user_id) - 한 사용자는 한 영상에 한 번만 평가

### 기존 테이블 수정

#### contents_idea 테이블 추가 콜럼
- `is_auto_created` (BOOLEAN DEFAULT TRUE): 자동 생성 여부
- `created_by_user_id` (TEXT): 생성한 사용자 ID
- `custom_idea_metadata` (JSONB): 커스텀 아이디어 메타데이터

#### content_uploads 테이블 추가 콜럼
- `is_auto_created` (BOOLEAN DEFAULT TRUE): 자동 생성 아이디어 사용 여부
- `avg_rating` (DECIMAL(3,2)): 평균 평점
- `rating_count` (INTEGER DEFAULT 0): 평가 수
- `view_count` (INTEGER DEFAULT 0): 조회 수

### 새로운 뷰(View)

#### store_performance
스토어별 일일 성과:
- `store_id`, `company_id`: 식별자
- `active_users`: 활성 사용자 수
- `total_uploads`: 총 업로드 수
- `avg_video_duration`: 평균 비디오 길이
- `total_points`: 총 포인트
- `date`: 날짜

#### store_weekly_ranking
스토어별 주간 랭킹:
- `weekly_uploads`: 주간 업로드 수
- `weekly_points`: 주간 포인트
- `active_members`: 활성 멤버 수
- `upload_rank`, `points_rank`: 회사 내 순위

#### store_monthly_ranking
스토어별 월간 랭킹:
- 월간 통계 + 평균 스토어 평점

#### user_creativity_stats
사용자 창의성 통계:
- `custom_ideas_count`: 커스텀 아이디어 수
- `auto_ideas_count`: 자동 아이디어 수
- `creativity_ratio`: 창의성 비율 (%)

#### popular_videos
인기 영상 목록:
- 평점 4.0 이상, 평가 3건 이상
- 제작자 정보, 카테고리, 태그 포함

#### company_video_gallery
회사별 영상 갤러리:
- 모든 업로드된 영상 정보
- "신규" (7일 이내), "인기" (4.5점 이상 + 5건 이상 평가) 배지

### 새로운 트리거

#### update_video_rating_stats()
영상 평가 시 자동 업데이트:
1. content_uploads의 avg_rating, rating_count 업데이트
2. 평가자에게 5포인트 부여
3. user_activities에 'rate_video' 활동 기록
4. user_progress의 total_points 업데이트

### 포인트 시스템 업데이트
- 'rate_video' 활동 타입 추가 (5포인트)
- "⭐ Đánh giá video của đồng nghiệp" 설명

### SQL 업데이트 파일
`/setup/update_database_2025_06_29.sql` 파일을 Supabase SQL Editor에서 실행하여 모든 변경사항을 적용할 수 있습니다.
