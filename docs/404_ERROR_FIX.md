# 404 에러 해결 가이드

## 문제: Object not found! (404 Error)

### 1. 파일 위치 확인

먼저 다음 파일이 있는지 확인하세요:
```
/Applications/XAMPP/xamppfiles/htdocs/mysite/contents_helper_website/index.html
```

### 2. 터미널에서 확인 명령어

```bash
# 디렉토리 확인
ls -la /Applications/XAMPP/xamppfiles/htdocs/mysite/contents_helper_website/

# index.html 파일 확인
ls -la /Applications/XAMPP/xamppfiles/htdocs/mysite/contents_helper_website/index.html

# 파일 권한 확인
ls -la /Applications/XAMPP/xamppfiles/htdocs/mysite/contents_helper_website/ | grep index
```

### 3. 가능한 원인들

#### A. index.html 파일이 없는 경우
- 파일명이 다를 수 있음 (Index.html, INDEX.HTML 등)
- 파일이 다른 위치에 있을 수 있음

#### B. Apache 설정 문제
`/Applications/XAMPP/xamppfiles/etc/httpd.conf` 파일에서 확인:
```apache
DirectoryIndex index.html index.php
```

#### C. 권한 문제
```bash
# 권한 수정 (XAMPP 디렉토리로 이동 후)
chmod 755 /Applications/XAMPP/xamppfiles/htdocs/mysite/contents_helper_website
chmod 644 /Applications/XAMPP/xamppfiles/htdocs/mysite/contents_helper_website/index.html
```

### 4. 즉시 해결 방법

#### 방법 1: 직접 파일명 입력
```
http://localhost/mysite/contents_helper_website/index.html?user_id=0d2e61ad-e230-454e-8b90-efbe1c1a9268&user_name=Jin&store_id=16f4c231-185a-4564-b473-bad1e9b305e8
```

#### 방법 2: 다른 파일 찾기
```bash
# HTML 파일 찾기
find /Applications/XAMPP/xamppfiles/htdocs/mysite/contents_helper_website -name "*.html" -type f
```

### 5. 파일 목록 확인

현재 디렉토리에 있는 파일들:
- index.html (메인 페이지)
- video-gallery.html
- test-video-upload.html
- admin-game-system.html
- 기타 테스트 파일들

### 6. Apache 에러 로그 확인

```bash
tail -f /Applications/XAMPP/xamppfiles/logs/error_log
```

### 7. 임시 해결책

만약 index.html이 없다면, 임시로 index.php 파일을 만들어보세요:

```php
<?php
// index.php
header("Location: index.html");
exit();
?>
```

또는 .htaccess 파일 생성:
```apache
DirectoryIndex index.html index.php
Options +Indexes
```

### 8. 확인 사항

1. XAMPP가 실행 중인가?
2. Apache 서비스가 켜져 있는가?
3. 올바른 포트(80)를 사용하는가?

### 9. 디버깅 체크리스트

- [ ] index.html 파일 존재 확인
- [ ] 파일 권한 확인 (읽기 가능)
- [ ] Apache 실행 중
- [ ] 올바른 경로 사용
- [ ] 대소문자 확인

### 10. 대체 URL 시도

다음 URL들을 시도해보세요:
1. `http://localhost/mysite/contents_helper_website/`
2. `http://localhost:80/mysite/contents_helper_website/`
3. `http://127.0.0.1/mysite/contents_helper_website/`
4. 파일명 직접 지정: `http://localhost/mysite/contents_helper_website/index.html`

## 즉시 실행할 명령어

```bash
# 1. 파일 확인
ls /Applications/XAMPP/xamppfiles/htdocs/mysite/contents_helper_website/

# 2. index.html이 있다면 권한 수정
sudo chmod 644 /Applications/XAMPP/xamppfiles/htdocs/mysite/contents_helper_website/index.html

# 3. Apache 재시작
sudo /Applications/XAMPP/xamppfiles/bin/apachectl restart
```

이 중 하나로 해결되어야 합니다!
