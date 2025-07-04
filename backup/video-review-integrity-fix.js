// 무결성 개선 사항 (video-review.js에 추가)

// 1. 서버 측 검증을 위한 시청 기록
let watchHistory = {
    startTime: null,
    endTime: null,
    totalWatchTime: 0,
    videoLoadSuccess: false
};

// 2. 평가 제출 시 추가 검증
async function submitRating(rating) {
    // 클라이언트 측 검증
    if (!currentState.videoLoaded) {
        showError('비디오가 로드되지 않았습니다!');
        return;
    }
    
    if (currentState.videoPlayTime < currentState.minWatchTime) {
        showError(`최소 ${currentState.minWatchTime}초 이상 시청해야 합니다!`);
        return;
    }
    
    // 비디오 엘리먼트 상태 재확인
    const videoElement = document.getElementById('reviewVideo');
    if (videoElement.error || videoElement.readyState < 2) {
        showError('비디오 재생 오류가 발생했습니다!');
        return;
    }
    
    // 서버로 전송할 메타데이터에 시청 정보 포함
    const reviewData = {
        video_id: currentState.currentVideo.id,
        rating: rating,
        metadata: {
            actual_user_id: currentState.userId,
            watch_time: currentState.videoPlayTime,
            video_duration: videoElement.duration,
            watch_percentage: (currentState.videoPlayTime / videoElement.duration) * 100,
            video_loaded: currentState.videoLoaded,
            timestamp: new Date().toISOString()
        }
    };
    
    // 서버 측에서도 검증 가능하도록 데이터 전송
    // ...
}

// 3. 개발자 도구 방지 (완벽하진 않지만 기본적인 방어)
setInterval(() => {
    const videoElement = document.getElementById('reviewVideo');
    const controlsDiv = document.getElementById('reviewControls');
    
    // 비디오가 로드되지 않았는데 컨트롤이 표시되면 숨김
    if (!currentState.videoLoaded && controlsDiv.style.display !== 'none') {
        controlsDiv.style.display = 'none';
        console.warn('무결성 위반 감지: 컨트롤 강제 숨김');
    }
}, 1000);

// 4. 페이지 이탈 시 기록
window.addEventListener('beforeunload', () => {
    if (currentState.currentVideo && !currentState.lastRating) {
        // 평가하지 않고 이탈한 경우 기록
        console.log('비디오 시청 후 평가 없이 이탈');
    }
});