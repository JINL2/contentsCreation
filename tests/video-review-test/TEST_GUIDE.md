# 🎬 Video Review 무결성 테스트 가이드

## 📍 테스트 페이지 접속 방법

### 1. Apache/XAMPP 실행 확인
- XAMPP Control Panel에서 Apache가 실행 중인지 확인
- MySQL도 실행되어 있어야 함

### 2. 테스트 페이지 접속
```
http://localhost/mysite/contents_helper_website/tests/video-review-test/integrity-test.html
```

## 🧪 테스트 시나리오

### 1️⃣ 영상이 로드되지 않으면 리뷰가 안되는지 테스트

#### A. 정상 동작 테스트
1. "Open Normal Review Page" 클릭
2. 비디오가 로드될 때까지 대기
3. 3초 이상 시청 후 별점 클릭 가능 확인

#### B. 조기 평가 차단 테스트
1. "Try Rating Before 3 Seconds" 클릭
2. 비디오 로드 후 즉시 별점 클릭 시도
3. 에러 메시지 확인: "Vui lòng xem ít nhất 3 giây trước khi đánh giá!"

#### C. 비디오 에러 테스트
1. "Test Broken Video URL" 클릭
2. 비디오 로드 실패 시 평가 UI가 나타나지 않는지 확인
3. 자동으로 다음 비디오로 넘어가는지 확인

### 2️⃣ 영상 리뷰가 끝나면 다음 영상이 나오는지 테스트

1. "Test Next Video Flow" 클릭
2. 비디오 3초 이상 시청
3. 별점 클릭하여 평가
4. 자동으로 다음 비디오가 로드되는지 확인
5. Fade-out 애니메이션 확인

### 3️⃣ 영상이 없으면 안내 메시지를 띄우고 메인화면으로 돌아가는지 테스트

1. "Test No Videos Available" 클릭
2. 빈 회사 ID로 페이지 열림
3. "Không còn video để đánh giá" 메시지 확인
4. 5초 카운트다운 확인
5. 자동으로 index.html로 리다이렉트 확인

## 🔒 무결성 테스트

### DevTools 해킹 시도 테스트
1. "Simulate DevTools Hack" 클릭
2. F12로 개발자 도구 열기
3. Console에서 다음 시도:
   ```javascript
   // iframe 내부 접근 시도
   const iframe = document.getElementById('reviewFrame');
   const iframeWindow = iframe.contentWindow;
   
   // 상태 조작 시도
   iframeWindow.currentState.videoLoaded = true;
   iframeWindow.currentState.videoCanPlay = true;
   iframeWindow.currentState.videoPlayTime = 10;
   ```
4. 별점 클릭이 여전히 차단되는지 확인

### UI 조작 테스트
1. "Try UI Manipulation" 클릭
2. 개발자 도구에서 숨겨진 요소 강제 표시 시도
3. 100ms마다 실행되는 무결성 체크가 UI를 다시 숨기는지 확인

## 📊 로그 확인

테스트 페이지 하단의 Test Log에서:
- 🟢 녹색: 성공
- 🔵 파란색: 정보
- 🟡 노란색: 경고
- 🔴 빨간색: 에러

## 🚨 주의사항

1. **반드시 HTTP 프로토콜로 접속**
   - ❌ file:///Applications/XAMPP/...
   - ✅ http://localhost/mysite/...

2. **Supabase 연결 확인**
   - config.js의 API 키가 올바른지 확인
   - 인터넷 연결 상태 확인

3. **테스트 데이터 준비**
   - Jin 사용자의 회사에 비디오가 있어야 함
   - content_uploads 테이블에 status='uploaded' 데이터 필요

## 🛠️ 문제 해결

### Apache 404 에러
```bash
# .htaccess 파일 확인
cd /Applications/XAMPP/xamppfiles/htdocs/mysite/contents_helper_website/
ls -la .htaccess
# 있다면 백업으로 이름 변경
mv .htaccess .htaccess.backup
```

### CORS 에러
- Supabase 대시보드에서 CORS 설정 확인
- http://localhost 허용되어 있는지 확인

### 비디오 로드 실패
1. Supabase Storage 공개 설정 확인
2. 비디오 URL이 올바른지 확인
3. 네트워크 콘솔에서 403/404 에러 확인

## 📱 모바일 테스트

1. 같은 네트워크에 연결
2. 컴퓨터 IP 주소 확인 (예: 192.168.1.100)
3. 모바일에서 접속:
   ```
   http://192.168.1.100/mysite/contents_helper_website/video-review.html?user_id=...
   ```

## ✅ 성공 기준

1. **무결성 체크 ✅**
   - 3초 미만 시청 시 평가 불가
   - 비디오 에러 시 평가 UI 미표시
   - 개발자 도구 조작 차단

2. **자동 플로우 ✅**
   - 평가 후 자동 다음 비디오
   - 비디오 없을 시 5초 후 메인 이동
   - 에러 시 재시도 후 다음 비디오

3. **사용자 경험 ✅**
   - 명확한 에러 메시지
   - 부드러운 전환 애니메이션
   - 진행 상황 표시

---
작성일: 2025년 6월 30일