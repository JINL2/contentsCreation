# Jin 사용자 테스트 가이드

## 테스트 URL
```
http://localhost/mysite/contents_helper_website/?user_id=0d2e61ad-e230-454e-8b90-efbe1c1a9268&user_name=Jin&store_id=16f4c231-185a-4564-b473-bad1e9b305e8
```

## 주요 파라미터
- **user_id**: `0d2e61ad-e230-454e-8b90-efbe1c1a9268`
- **user_name**: `Jin`
- **store_id**: `16f4c231-185a-4564-b473-bad1e9b305e8`

## 테스트 SQL 파일 실행 순서

### 1. 빠른 진단 (1분)
```sql
-- /setup/quick_diagnosis_report.sql
```
현재 시스템 상태를 빠르게 확인합니다.

### 2. 문제가 있을 경우 즉시 수정 (2분)
```sql
-- /setup/fix_jin_data_immediate.sql
```
Jin 사용자의 모든 데이터를 정상화합니다.

### 3. 상세 테스트 (3분)
```sql
-- /setup/test_jin_specific_params.sql
```
Jin 사용자의 모든 데이터를 상세히 검사합니다.

### 4. 앱 화면 시뮬레이션 (2분)
```sql
-- /setup/test_jin_app_simulation.sql
```
실제 앱에서 보여질 화면을 시뮬레이션합니다.

## 빠른 테스트 쿼리

### 스토어 통계 확인
```sql
-- 오늘 통계
SELECT * FROM get_store_stats('16f4c231-185a-4564-b473-bad1e9b305e8', 'today');

-- 모든 기간 한번에
SELECT 'today' as period, * FROM get_store_stats('16f4c231-185a-4564-b473-bad1e9b305e8', 'today') 
UNION ALL SELECT 'week', * FROM get_store_stats('16f4c231-185a-4564-b473-bad1e9b305e8', 'week') 
UNION ALL SELECT 'month', * FROM get_store_stats('16f4c231-185a-4564-b473-bad1e9b305e8', 'month');
```

### Jin 개인 정보 확인
```sql
-- Jin 프로필
SELECT user_id, metadata->>'name' as name, store_id, total_points, total_uploads 
FROM user_progress 
WHERE user_id = '0d2e61ad-e230-454e-8b90-efbe1c1a9268';

-- Jin 최근 업로드
SELECT id, created_at, store_id, points_earned, title 
FROM content_uploads 
WHERE user_id = '0d2e61ad-e230-454e-8b90-efbe1c1a9268' 
ORDER BY created_at DESC LIMIT 5;
```

## JavaScript 디버깅

### 브라우저 콘솔에서 확인
```javascript
// 현재 상태 확인
console.log('Current State:', currentState);

// 스토어 통계 함수 직접 호출
const { data, error } = await supabaseClient
    .rpc('get_store_stats', {
        p_store_id: '16f4c231-185a-4564-b473-bad1e9b305e8',
        p_period: 'today'
    });
console.log('Store Stats:', data);
```

### 주요 체크포인트
1. **URL 파라미터 파싱**: `getURLParameters()` 함수 확인
2. **사용자 초기화**: `initializeUser()` 함수에서 store_id 설정 확인
3. **통계 로드**: `loadPerformanceData()` 함수의 RPC 호출 확인
4. **에러 처리**: store_id가 NULL인 경우 처리 확인

## 문제 해결 플로우차트

```
문제 발생
    ↓
1. quick_diagnosis_report.sql 실행
    ↓
2. 문제 있음? → fix_jin_data_immediate.sql 실행
    ↓
3. test_jin_specific_params.sql로 검증
    ↓
4. 앱에서 다시 테스트
```

## 예상 결과

### 정상 작동시:
- **Today**: active_members ≥ 1, total_videos ≥ 0, total_points ≥ 0
- **Week**: 누적된 값들이 Today보다 크거나 같음
- **Month**: 누적된 값들이 Week보다 크거나 같음

### 팀 성과 모달:
- 3개 탭 (Today/Week/Month) 모두 정상 표시
- 각 탭에서 적절한 통계 표시
- 로딩 에러 없음

## 긴급 수정 SQL

데이터 문제 즉시 해결:
```sql
-- Jin의 모든 데이터 정상화
UPDATE content_uploads 
SET store_id = '16f4c231-185a-4564-b473-bad1e9b305e8' 
WHERE user_id = '0d2e61ad-e230-454e-8b90-efbe1c1a9268' 
AND (store_id IS NULL OR store_id != '16f4c231-185a-4564-b473-bad1e9b305e8');

-- 통계 재계산
UPDATE user_progress 
SET total_uploads = (SELECT COUNT(*) FROM content_uploads WHERE user_id = '0d2e61ad-e230-454e-8b90-efbe1c1a9268'),
    total_points = (SELECT COALESCE(SUM(points_earned), 0) FROM content_uploads WHERE user_id = '0d2e61ad-e230-454e-8b90-efbe1c1a9268')
WHERE user_id = '0d2e61ad-e230-454e-8b90-efbe1c1a9268';
```

## 연락처
문제가 지속되면 다음 정보와 함께 보고:
- 브라우저 콘솔 에러 스크린샷
- `quick_diagnosis_report.sql` 실행 결과
- 사용한 URL 전체
