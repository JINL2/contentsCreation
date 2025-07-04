# 📝 Contents Helper 프롬프트 모음집
*언제든지 복사해서 사용하세요!*

---

## 🚀 빠른 시작 프롬프트

### 🥇 가장 많이 쓰는 프롬프트 (이것만 있어도 OK!)
```
/Applications/XAMPP/xamppfiles/htdocs/mysite/contents_helper_website/ 경로에서
PROJECT_CORE.md, whatbefore.md, whatnext.md 이 3개 파일을 순서대로 읽어줘.
이게 게임화된 콘텐츠 제작 플랫폼 프로젝트야.
```

### ⚡ 초스피드 버전
```
/Applications/XAMPP/xamppfiles/htdocs/mysite/contents_helper_website/
PROJECT_CORE.md, whatbefore.md, whatnext.md 읽고 시작
```

---

## 💼 작업별 프롬프트

### 1. 영상 갤러리 개발
```
Contents Helper의 영상 갤러리 기능을 완성해줘.

📁 /Applications/XAMPP/xamppfiles/htdocs/mysite/contents_helper_website/
📄 PROJECT_CORE.md → whatbefore.md → whatnext.md 순서로 읽고

video-gallery.js에서:
- content_uploads 테이블 데이터 가져오기
- 썸네일 그리드 레이아웃 구현
- 회사별 필터링 기능 추가
```

### 2. 커스텀 아이디어 기능
```
Contents Helper에 "내 아이디어로 제작하기" 기능을 추가해줘.

먼저 3개 핵심 문서 읽기:
/Applications/XAMPP/xamppfiles/htdocs/mysite/contents_helper_website/
PROJECT_CORE.md, whatbefore.md, whatnext.md

구현 내용:
- 커스텀 아이디어 입력 모달
- contents_idea 테이블에 is_auto_created=false로 저장
- 시나리오 5단계 입력 폼
```

### 3. 스토어 대시보드
```
Contents Helper의 스토어별 성과 대시보드를 만들어줘.

프로젝트 이해: PROJECT_CORE.md → whatbefore.md → whatnext.md
경로: /Applications/XAMPP/xamppfiles/htdocs/mysite/contents_helper_website/

필요 기능:
- store_performance 뷰 활용
- Chart.js로 시각화
- 실시간 순위 표시
```

---

## 🔧 디버깅/수정 프롬프트

### 데이터 무결성 문제
```
Contents Helper에서 팀 성과가 0으로 나오는 문제를 해결해줘.

PROJECT_CORE.md 읽고 docs/SUPABASE_MCP_GUIDE.md 참고해서
Supabase MCP로 데이터 수정해줘.

Project ID: yenfccoefczqxckbizqa
문제: company_id, store_id가 NULL
```

### 포인트 시스템 수정
```
Contents Helper의 포인트가 제대로 계산되지 않아.

/Applications/XAMPP/xamppfiles/htdocs/mysite/contents_helper_website/
PROJECT_CORE.md 읽고 points_system 테이블 확인해줘.

Supabase에서 동적으로 로드되어야 해.
```

### 모바일 UI 문제
```
Contents Helper가 모바일에서 깨져 보여.

3개 문서 읽고 style.css 수정해줘:
PROJECT_CORE.md, whatbefore.md, whatnext.md

특히 아코디언 카드 UI가 문제야.
```

---

## 📊 분석/리포트 프롬프트

### 코드 리뷰
```
Contents Helper의 script.js를 전체적으로 리뷰해줘.

먼저 PROJECT_CORE.md로 프로젝트 구조 이해하고
whatbefore.md로 최근 변경사항 확인한 다음
코드 품질, 성능, 보안 측면에서 분석해줘.
```

### 프로젝트 현황 분석
```
Contents Helper 프로젝트의 현재 상태를 분석해줘.

/Applications/XAMPP/xamppfiles/htdocs/mysite/contents_helper_website/
모든 문서 읽고 다음을 정리해줘:
- 완료된 기능 (whatbefore.md)
- 남은 작업 (whatnext.md)
- 기술적 개선점
```

### 데이터베이스 구조 분석
```
Contents Helper의 DB 구조를 설명해줘.

PROJECT_CORE.md 읽고
docs/database-structure.md 상세히 분석해서
테이블 관계도와 주요 쿼리 패턴을 정리해줘.
```

---

## 🧪 테스트 프롬프트

### 전체 기능 테스트
```
Contents Helper를 Jin 사용자로 전체 테스트해줘.

테스트 URL:
http://localhost/mysite/contents_helper_website/?user_id=0d2e61ad-e230-454e-8b90-efbe1c1a9268&user_name=Jin&company_id=ebd66ba7-fde7-4332-b6b5-0d8a7f615497&store_id=16f4c231-185a-4564-b473-bad1e9b305e8

체크리스트는 docs/QUICK_TEST_GUIDE.md 참고
```

### Supabase 연결 테스트
```
Contents Helper의 Supabase 연결을 테스트해줘.

config.js 확인하고
Project ID: yenfccoefczqxckbizqa
각 테이블에서 데이터 조회 테스트 실행
```

---

## 📚 문서 작업 프롬프트

### 문서 업데이트
```
Contents Helper 작업을 완료했으니 문서를 업데이트해줘.

1. whatbefore.md에 방금 완료한 작업 추가
2. whatnext.md에서 완료된 항목 제거하고 새 작업 추가
3. 변경사항이 크면 PROJECT_CORE.md도 검토

경로: /Applications/XAMPP/xamppfiles/htdocs/mysite/contents_helper_website/
```

### 새 가이드 작성
```
Contents Helper의 [특정 기능] 사용 가이드를 작성해줘.

PROJECT_CORE.md로 기본 이해하고
docs/ 폴더에 새 MD 파일로 작성해줘.

한국어로 작성하고 스크린샷 위치 표시
```

---

## 🎨 UI/UX 작업 프롬프트

### 새 컴포넌트 추가
```
Contents Helper에 [컴포넌트 이름] 추가해줘.

디자인 가이드:
- Cameraon 브랜드 컬러: #FF6B35
- 모바일 퍼스트
- 아코디언 스타일 참고

3개 핵심 문서 먼저 읽고 style.css 확인
```

### 애니메이션 추가
```
Contents Helper의 포인트 획득 시 애니메이션을 추가해줘.

PROJECT_CORE.md 읽고 script.js에서
showPoints() 함수 찾아서 개선해줘.

부드러운 페이드인 + 스케일 효과 원해
```

---

## 🔐 Supabase 작업 프롬프트

### 새 테이블 생성
```
Contents Helper에 [테이블명] 테이블을 추가해줘.

1. PROJECT_CORE.md로 기존 구조 파악
2. setup/ 폴더에 새 SQL 파일 생성
3. docs/database-structure.md 업데이트

Supabase Project: yenfccoefczqxckbizqa
```

### RPC 함수 생성
```
Contents Helper에 [함수명] RPC 함수를 만들어줘.

예시: get_store_stats 함수 참고
반환값: [원하는 데이터 구조]

SQL은 setup/ 폴더에 저장
```

---

## 💡 프롬프트 조합 팁

### 기본 구조
```
[작업 설명]

[경로와 문서]
/Applications/XAMPP/xamppfiles/htdocs/mysite/contents_helper_website/
PROJECT_CORE.md, whatbefore.md, whatnext.md

[구체적 요구사항]
- 요구사항 1
- 요구사항 2

[참고 정보]
Supabase ID: yenfccoefczqxckbizqa
```

### 효과적인 순서
1. **무엇을** 하고 싶은지 명확히
2. **어디서** (경로) 작업할지
3. **어떻게** 해야 하는지 (요구사항)
4. **참고** 정보 제공

---

## 🚨 항상 포함하면 좋은 정보

```
경로: /Applications/XAMPP/xamppfiles/htdocs/mysite/contents_helper_website/
문서: PROJECT_CORE.md → whatbefore.md → whatnext.md
Supabase: yenfccoefczqxckbizqa
테스트: Jin 사용자 URL (위에 있음)
```

---

*이 문서를 북마크하고 필요할 때마다 복사해서 사용하세요!* 🎯