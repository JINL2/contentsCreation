// 드래그 핸들 기능 모듈
export function addDragHandle() {
    const controls = document.getElementById('reviewControls');
    if (!controls) return;
    
    // 이미 핸들이 있으면 중복 추가 방지
    if (controls.querySelector('.drag-handle')) return;
    
    // 드래그 핸들 생성
    const dragHandle = document.createElement('div');
    dragHandle.className = 'drag-handle';
    dragHandle.innerHTML = `
        <div class="handle-bar"></div>
        <div class="drag-guide">Kéo lên xuống để điều chỉnh</div>
    `;
    
    // 컨트롤 내용을 래퍼로 감싸기
    const controlsContent = document.createElement('div');
    controlsContent.className = 'controls-content';
    
    // 기존 내용을 래퍼로 이동
    while (controls.firstChild) {
        controlsContent.appendChild(controls.firstChild);
    }
    
    // 미니 상태 표시 추가
    const miniStatus = document.createElement('div');
    miniStatus.className = 'mini-status';
    miniStatus.innerHTML = `
        <span class="status-text">Nhấn để mở bảng đánh giá</span>
        <span class="tap-hint">↑</span>
    `;
    
    // 핸들과 내용 추가
    controls.appendChild(dragHandle);
    controls.appendChild(miniStatus);
    controls.appendChild(controlsContent);
    
    // 드래그 상태 변수
    let isDragging = false;
    let startY = 0;
    let startHeight = 0;
    let currentHeight = 200; // 기본 높이
    let isMinimized = false;
    let hasDragged = localStorage.getItem('videoReviewDragged') === 'true';
    
    // 초기 높이 설정
    const savedHeight = localStorage.getItem('videoReviewControlsHeight');
    if (savedHeight) {
        currentHeight = parseInt(savedHeight);
        controls.style.height = `${currentHeight}px`;
    }
    
    // 초기 최소화 상태
    const savedMinimized = localStorage.getItem('videoReviewMinimized') === 'true';
    if (savedMinimized) {
        minimize();
    }
    
    // 비디오 뷰어 업데이트
    function updateVideoViewerHeight() {
        const videoViewer = document.querySelector('.video-viewer');
        if (videoViewer) {
            if (isMinimized) {
                videoViewer.style.bottom = '60px';
            } else {
                videoViewer.style.bottom = `${currentHeight}px`;
            }
        }
    }
    
    // 최소화 함수
    function minimize() {
        isMinimized = true;
        controls.classList.add('minimized');
        controls.style.height = '60px';
        updateVideoViewerHeight();
        localStorage.setItem('videoReviewMinimized', 'true');
    }
    
    // 최대화 함수
    function maximize() {
        isMinimized = false;
        controls.classList.remove('minimized');
        controls.style.height = `${currentHeight}px`;
        updateVideoViewerHeight();
        localStorage.setItem('videoReviewMinimized', 'false');
    }
    
    // 터치 이벤트 (모바일)
    dragHandle.addEventListener('touchstart', (e) => {
        e.preventDefault();
        const touch = e.touches[0];
        startDrag(touch.clientY);
    });
    
    dragHandle.addEventListener('touchmove', (e) => {
        e.preventDefault();
        if (!isDragging) return;
        const touch = e.touches[0];
        handleDrag(touch.clientY);
    });
    
    dragHandle.addEventListener('touchend', (e) => {
        e.preventDefault();
        endDrag();
    });
    
    // 마우스 이벤트 (데스크톱)
    dragHandle.addEventListener('mousedown', (e) => {
        e.preventDefault();
        startDrag(e.clientY);
    });
    
    document.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        handleDrag(e.clientY);
    });
    
    document.addEventListener('mouseup', () => {
        endDrag();
    });
    
    // 클릭으로 토글
    dragHandle.addEventListener('click', (e) => {
        // 드래그가 아닌 경우에만 토글
        if (!isDragging && Math.abs(e.clientY - startY) < 5) {
            if (isMinimized) {
                maximize();
            } else {
                minimize();
            }
        }
    });
    
    // 드래그 시작
    function startDrag(clientY) {
        isDragging = true;
        startY = clientY;
        startHeight = isMinimized ? 60 : currentHeight;
        controls.classList.add('dragging');
        
        // 가이드 숨기기
        if (!hasDragged) {
            hasDragged = true;
            controls.classList.add('dragged');
            localStorage.setItem('videoReviewDragged', 'true');
        }
    }
    
    // 드래그 처리
    function handleDrag(clientY) {
        const deltaY = startY - clientY;
        const newHeight = Math.max(60, Math.min(window.innerHeight * 0.8, startHeight + deltaY));
        
        // 높이 업데이트
        controls.style.height = `${newHeight}px`;
        
        // 최소화 상태 자동 전환
        if (newHeight <= 80) {
            if (!isMinimized) {
                controls.classList.add('minimized');
                isMinimized = true;
            }
        } else {
            if (isMinimized) {
                controls.classList.remove('minimized');
                isMinimized = false;
            }
            currentHeight = newHeight;
        }
        
        updateVideoViewerHeight();
    }
    
    // 드래그 종료
    function endDrag() {
        if (!isDragging) return;
        
        isDragging = false;
        controls.classList.remove('dragging');
        
        // 저장
        if (!isMinimized) {
            localStorage.setItem('videoReviewControlsHeight', currentHeight);
        }
        localStorage.setItem('videoReviewMinimized', isMinimized ? 'true' : 'false');
    }
    
    // 초기 비디오 뷰어 높이 설정
    updateVideoViewerHeight();
    
    // ESC 키로 최소화
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && !isMinimized) {
            minimize();
        }
    });
    
    console.log('✅ Drag handle added successfully');
}

// 페이지 로드 시 자동 실행
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', addDragHandle);
} else {
    addDragHandle();
}