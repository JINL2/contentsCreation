# Listen-Customers 프로젝트 분석 및 활용 가능한 기능

## 프로젝트 개요
Listen-Customers는 고객 피드백 수집 시스템으로, 사진 업로드, 평점, 의견 수집, 프로모션 코드 발급 등의 기능을 제공합니다.

## Contents Helper Website에서 활용 가능한 기능들

### 1. Supabase 연동 구조
```javascript
// Supabase 초기화
const SUPABASE_URL = 'https://yenfccoefczqxckbizqa.supabase.co';
const SUPABASE_ANON_KEY = 'your-anon-key';
const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
```

**활용 방안**: 
- 컨텐츠 아이디어 저장 및 조회
- 사용자가 만든 영상 메타데이터 저장
- 게임화 진행 상황 추적

### 2. 이미지/비디오 업로드 시스템
```javascript
// 이미지 압축 함수
async function compressImage(file, maxWidth = 1200, quality = 0.8) {
    // 파일 크기가 1MB 미만이면 압축하지 않음
    if (file.size < 1024 * 1024) {
        return file;
    }
    // Canvas를 사용한 이미지 리사이징 및 압축
}

// Storage 업로드
const { data, error } = await supabaseClient.storage
    .from('contents-videos')  // 새로운 버킷명
    .upload(fileName, videoFile);
```

**활용 방안**:
- 사용자가 만든 영상을 Storage에 업로드
- 썸네일 생성 및 저장
- 미리보기 기능 구현

### 3. 동적 UI 생성 패턴
```javascript
// 데이터베이스에서 옵션 로드 후 UI 업데이트
async function loadContentIdeas() {
    const { data, error } = await supabaseClient
        .from('contents_idea')
        .select('*')
        .limit(5);  // 5개 랜덤 선택
    
    // UI 동적 생성
    data.forEach(idea => {
        const card = createContentCard(idea);
        container.appendChild(card);
    });
}
```

**활용 방안**:
- 5개의 컨텐츠 아이디어를 카드 형태로 표시
- 사용자가 선택하면 상세 정보 표시
- 게임화 요소로 카드 선택 애니메이션 추가

### 4. 단계별 폼 검증 시스템
```javascript
// 단계별 검증
1. 컨텐츠 아이디어 선택 검증
2. 영상 업로드 검증
3. 메타데이터 입력 검증
4. 최종 제출 전 확인
```

**활용 방안**:
- 프로그레스 바로 진행 상황 표시
- 각 단계마다 포인트 획득
- 완료 시 보상 시스템

### 5. 성공/에러 메시지 처리
```javascript
// 성공 메시지 표시
successMessage.innerHTML = `
    <h2>🎉 컨텐츠 제작 완료!</h2>
    <p>획득 포인트: +100</p>
    <div class="achievement">새로운 업적 달성!</div>
`;

// 에러 처리
errorMessage.innerHTML = `
    <div class="error-content">
        <h3>⚠️ 오류 발생</h3>
        <p>${error.message}</p>
    </div>
`;
```

### 6. 로컬 스토리지 활용
```javascript
// 진행 상황 저장
localStorage.setItem('currentContentId', contentId);
localStorage.setItem('userPoints', points);
localStorage.setItem('achievements', JSON.stringify(achievements));
```

**활용 방안**:
- 작업 중인 컨텐츠 임시 저장
- 사용자 포인트 및 레벨 저장
- 달성한 업적 목록 관리

### 7. Edge Functions 활용
```javascript
// 영상 처리 Edge Function
const { data, error } = await supabaseClient.functions.invoke('process-video', {
    body: { 
        videoUrl: uploadedVideoUrl,
        contentIdea: selectedIdea
    }
});
```

**활용 방안**:
- 영상 썸네일 자동 생성
- 영상 메타데이터 추출
- AI를 통한 컨텐츠 품질 점수 계산

### 8. 게임화 요소 구현 아이디어

#### 포인트 시스템
- 컨텐츠 아이디어 선택: +10 포인트
- 영상 업로드 완료: +50 포인트
- 메타데이터 입력: +20 포인트
- 일일 연속 제작: 보너스 포인트

#### 레벨 시스템
```javascript
const levels = [
    { level: 1, name: "초보 크리에이터", requiredPoints: 0 },
    { level: 2, name: "주니어 크리에이터", requiredPoints: 100 },
    { level: 3, name: "시니어 크리에이터", requiredPoints: 500 },
    { level: 4, name: "마스터 크리에이터", requiredPoints: 1000 }
];
```

#### 업적 시스템
```javascript
const achievements = [
    { id: 1, name: "첫 번째 컨텐츠", description: "첫 컨텐츠를 완성했어요!" },
    { id: 2, name: "일주일 연속 제작", description: "7일 연속으로 컨텐츠를 만들었어요!" },
    { id: 3, name: "다양한 카테고리", description: "5개의 다른 카테고리에서 컨텐츠를 만들었어요!" }
];
```

### 9. 반응형 디자인 패턴
```css
/* 모바일 우선 디자인 */
.container {
    max-width: 600px;
    margin: 0 auto;
    padding: 20px;
}

/* 카드 레이아웃 */
.content-cards {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: 20px;
}
```

### 10. 애니메이션 및 인터랙션
```css
/* 카드 선택 애니메이션 */
.card:hover {
    transform: translateY(-5px);
    box-shadow: 0 10px 30px rgba(0,0,0,0.2);
}

/* 포인트 획득 애니메이션 */
@keyframes pointBurst {
    0% { transform: scale(0); opacity: 1; }
    100% { transform: scale(1.5); opacity: 0; }
}
```

## 데이터베이스 구조 제안

### user_progress 테이블
- `user_id`: UUID
- `total_points`: 총 포인트
- `current_level`: 현재 레벨
- `streak_days`: 연속 제작 일수
- `last_activity`: 마지막 활동 시간

### content_submissions 테이블
- `id`: UUID
- `user_id`: 사용자 ID
- `content_idea_id`: 선택한 컨텐츠 아이디어 ID
- `video_url`: 업로드된 영상 URL
- `thumbnail_url`: 썸네일 URL
- `metadata`: JSONB (추가 정보)
- `points_earned`: 획득한 포인트
- `created_at`: 생성 시간

### user_achievements 테이블
- `user_id`: UUID
- `achievement_id`: 업적 ID
- `unlocked_at`: 달성 시간

## 구현 우선순위

1. **기본 기능 (Phase 1)**
   - Supabase 연동
   - contents_idea 테이블에서 5개 랜덤 선택 및 표시
   - 영상 업로드 기능
   - Storage에 영상 저장

2. **게임화 요소 (Phase 2)**
   - 포인트 시스템
   - 레벨 시스템
   - 간단한 업적

3. **고급 기능 (Phase 3)**
   - Edge Functions로 영상 처리
   - 리더보드
   - 팀/부서별 경쟁
   - 보상 시스템

## 주의사항
- Storage 버킷 생성 필요 (`contents-videos`)
- RLS 정책 설정 필요
- 영상 파일 크기 제한 고려 (예: 100MB)
- 모바일 최적화 필수
