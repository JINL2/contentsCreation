# 🚀 다음 작업을 위한 가이드

## 📚 필수 읽어야 할 문서들 (순서대로)

### 1. **feature-update-2025-06.md** 📌
- **왜 읽어야 하나**: 새로운 기능의 목적과 이유가 상세히 설명되어 있음
- **핵심 내용**: 
  - 3가지 새 기능의 "왜"와 기대효과
  - 기술적 구현 계획
  - 장기적 비전

### 2. **database-structure.md** 🗄️
- **왜 읽어야 하나**: 업데이트된 DB 구조를 정확히 알아야 프론트엔드 구현 가능
- **핵심 내용**:
  - 새로운 테이블: video_ratings
  - 수정된 컬럼들: is_auto_created, avg_rating 등
  - 새로운 뷰들: store_performance, popular_videos 등
  - 섹션 7에 2025년 6월 29일 업데이트 내역 정리됨

### 3. **project-report.md** 📊
- **왜 읽어야 하나**: 현재 프로젝트 상태와 기존 기능 파악
- **핵심 내용**:
  - 완료된 기능들
  - 현재 UI/UX 구조
  - 게임화 시스템 현황

### 4. **README.md** 📖
- **왜 읽어야 하나**: 프로젝트 전체 구조와 설정 방법 확인
- **핵심 내용**:
  - 파일 구조
  - URL 파라미터 사용법
  - Phase 2.5 새로운 기능 계획

## 🛠️ 프론트엔드 작업 시작점

### 구현해야 할 3가지 핵심 기능

#### 1. 스토어별 성과 비교 시스템
- **파일**: `script.js`에 새 함수 추가
- **UI**: 팀 성과 버튼 및 모달
- **DB 연결**: store_performance, store_weekly_ranking 뷰 사용

#### 2. "내 아이디어로 제작하기" 기능
- **파일**: `script.js`의 showIdeas() 함수 수정
- **UI**: 5개 카드 아래 커스텀 버튼
- **DB 연결**: is_auto_created = false로 저장

#### 3. 영상 공유 및 평가 시스템
- **파일**: 새로운 `video-gallery.js` 생성
- **UI**: 갤러리 페이지, 별점 평가 모달
- **DB 연결**: video_ratings 테이블, company_video_gallery 뷰

## 📝 작업 순서 추천

1. **"내 아이디어로 제작하기"** (가장 간단)
   - showIdeas() 함수에 버튼 추가
   - 커스텀 폼 만들기
   - DB 저장 로직

2. **영상 갤러리 및 평가**
   - 새 페이지/섹션 생성
   - 비디오 그리드 레이아웃
   - 별점 평가 UI

3. **스토어별 성과 비교** (가장 복잡)
   - 차트 라이브러리 필요
   - 대시보드 UI
   - 복잡한 데이터 시각화

## 🔑 중요 포인트

- **목적 우선**: 기능 구현보다 "왜" 이 기능이 필요한지 항상 기억
- **회사별 격리**: company_id로 데이터 필터링 필수
- **포인트 시스템**: 모든 활동에 포인트 부여 잊지 말기
- **모바일 최적화**: 기존 모바일 UX 패턴 유지

## 💡 팁

```javascript
// Supabase 쿼리 예시
// 1. 같은 회사 영상만 가져오기
const { data: videos } = await supabaseClient
    .from('company_video_gallery')
    .select('*')
    .eq('company_id', currentState.companyId)
    .order('created_at', { ascending: false });

// 2. 커스텀 아이디어 저장
const customIdea = {
    title_ko: '나만의 아이디어',
    title_vi: 'Ý tưởng của tôi',
    is_auto_created: false,
    created_by_user_id: currentState.userId,
    // ... 나머지 필드
};
```

---
*이 문서를 참고하여 프론트엔드 구현을 시작하세요!*
