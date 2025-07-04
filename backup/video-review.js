// Supabase 초기화
const { createClient } = supabase;
const supabaseClient = createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey);

// CATEGORY_EMOJI와 EMOTION_EMOJI는 config.js에서 가져옵니다

// 전역 상태 관리
let currentState = {
    userId: null,
    userName: null,
    companyId: null,
    storeId: null,
    currentVideo: null,
    videoQueue: [],
    reviewedToday: 0,
    dailyTarget: 20,
    earnedPoints: 0,
    reviewStreak: 0,
    lastRating: null,
    videoLoaded: false,  // 비디오 로드 상태
    videoPlayTime: 0,    // 비디오 재생 시간
    minWatchTime: 3,     // 최소 시청 시간 (초)
    retryCount: 0,       // 재시도 횟수
    maxRetries: 3,       // 최대 재시도 횟수
    videoStartTime: null, // 비디오 시작 시간
    actualWatchTime: 0,   // 실제 시청 시간
    transitioning: false,  // 전환 중 플래그
    integrityViolations: 0, // 무결성 위반 횟수
    videoCanPlay: false,  // 비디오 재생 가능 상태
    videoErrorCount: 0,   // 비디오 에러 발생 횟수
    integrityCheckInterval: null, // 무결성 체크 인터벌 ID
    errorVideos: []      // 에러가 발생한 비디오 ID 목록
};

// URL 파라미터 파싱
function getURLParameters() {
    const params = new URLSearchParams(window.location.search);
    return {
        user_id: params.get('user_id'),
        user_name: params.get('user_name') || params.get('name'),
        company_id: params.get('company_id'),
        store_id: params.get('store_id')
    };
}

// 초기화
document.addEventListener('DOMContentLoaded', async () => {
    console.log('Video Review 초기화 중...');
    console.log('Supabase Config:', SUPABASE_CONFIG);
    console.log('Supabase Client:', supabaseClient);
    
    // 사용자 정보 설정
    const urlParams = getURLParameters();
    currentState.userId = urlParams.user_id;
    currentState.userName = urlParams.user_name || 'Anonymous';
    currentState.companyId = urlParams.company_id;
    currentState.storeId = urlParams.store_id;
    
    console.log('Current State:', currentState);
    
    if (!currentState.userId) {
        showError('사용자 정보가 없습니다.');
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 2000);
        return;
    }
    
    // 오늘 평가 진행 상황 로드 (에러가 있어도 계속)
    try {
        await loadTodayProgress();
    } catch (e) {
        console.error('진행 상황 로드 실패:', e);
    }
    
    // 별점 이벤트 리스너
    setupStarRating();
    
    // 무결성 체크 인터벌 (1초마다)
    currentState.integrityCheckInterval = setInterval(() => {
        const videoElement = document.getElementById('reviewVideo');
        const controlsDiv = document.getElementById('reviewControls');
        const playerDiv = document.getElementById('videoPlayer');
        const stars = document.querySelectorAll('.star');
        
        // 비디오 엘리먼트 상태 체크
        const hasError = videoElement && videoElement.error;
        const currentTime = videoElement ? videoElement.currentTime : 0;
        const canRate = currentState.videoCanPlay && currentTime >= currentState.minWatchTime;
        
        // 비디오 에러가 있을 때만 숨김
        if (hasError) {
            if (playerDiv && playerDiv.style.display !== 'none') {
                playerDiv.style.display = 'none';
                console.warn('비디오 에러로 인한 플레이어 숨김');
            }
            if (controlsDiv && controlsDiv.style.display !== 'none') {
                controlsDiv.style.display = 'none';
            }
            
            // 별점 클릭 이벤트 제거
            stars.forEach(star => {
                star.style.pointerEvents = 'none';
            });
        } else if (currentState.videoCanPlay) {
            // 비디오가 정상적으로 재생 가능하면 UI 표시
            if (playerDiv && playerDiv.style.display === 'none' && !hasError) {
                playerDiv.style.display = 'block';
            }
            if (controlsDiv && controlsDiv.style.display === 'none' && !hasError) {
                controlsDiv.style.display = 'flex';
            }
            
            // 3초 이상 시청했으면 별점 활성화
            if (canRate) {
                stars.forEach(star => {
                    star.style.pointerEvents = 'auto';
                    star.style.opacity = '1';
                    star.style.cursor = 'pointer';
                });
            } else {
                // 3초 미만일 때는 비활성화 상태로 표시
                stars.forEach(star => {
                    star.style.pointerEvents = 'none';
                    star.style.opacity = '0.3';
                    star.style.cursor = 'not-allowed';
                });
            }
        }
        
        // 비디오 에러 감지 시 즉시 다음으로
        if (hasError && !currentState.transitioning) {
            currentState.transitioning = true;
            console.error('비디오 재생 불가, 다음 비디오로 이동');
            // 에러 메시지 표시
            showVideoError('Video không thể phát. Đang chuyển sang video khác...');
            setTimeout(() => {
                currentState.transitioning = false;
                loadNextVideo();
            }, 2000);
        }
    }, 1000);
    
    // 페이지 언로드 시 인터벌 정리
    window.addEventListener('beforeunload', () => {
        if (currentState.integrityCheckInterval) {
            clearInterval(currentState.integrityCheckInterval);
        }
    });
    
    // 첫 비디오 로드
    await loadNextVideo();
});

// 오늘 평가 진행 상황 로드
async function loadTodayProgress() {
    try {
        console.log('오늘 평가 진행 상황 로드 중...');
        const today = new Date().toISOString().split('T')[0];
        
        // 오늘 평가한 비디오 수 조회
        // metadata에서 actual_user_id로 조회
        const { count, error } = await supabaseClient
            .from('video_reviews')
            .select('*', { count: 'exact', head: true })
            .filter('metadata->>actual_user_id', 'eq', currentState.userId)
            .gte('created_at', today + 'T00:00:00')
            .lte('created_at', today + 'T23:59:59');
        
        if (error) {
            console.error('video_reviews 테이블 조회 오류:', error);
            // 테이블이 없을 수 있으므로 계속 진행
        }
        
        currentState.reviewedToday = count || 0;
        console.log(`오늘 평가한 비디오: ${currentState.reviewedToday}개`);
        
        // UI 업데이트
        updateProgressUI();
        
    } catch (error) {
        console.error('진행 상황 로드 오류:', error);
        // 에러가 있어도 계속 진행
    }
}

// 진행 상황 UI 업데이트
function updateProgressUI() {
    document.getElementById('todayReviewed').textContent = currentState.reviewedToday;
    document.getElementById('todayTarget').textContent = currentState.dailyTarget;
    document.getElementById('reviewStreak').textContent = currentState.reviewStreak;
    document.getElementById('earnedPoints').textContent = currentState.earnedPoints;
    
    // 프로그레스 바 업데이트
    const progress = Math.min((currentState.reviewedToday / currentState.dailyTarget) * 100, 100);
    document.getElementById('reviewProgressFill').style.width = `${progress}%`;
}

// 사용자 정보를 숨기기 위한 설정
const HIDE_USER_INFO = true;

// 다음 비디오 로드
async function loadNextVideo() {
    showLoadingState();
    
    try {
        console.log('비디오 로드 시작...');
        console.log('Company ID:', currentState.companyId);
        
        // 같은 company_id의 비디오 가져오기
        let query = supabaseClient
            .from('content_uploads')
            .select('*')
            .eq('status', 'uploaded')
            .order('created_at', { ascending: false })
            .limit(50);
        
        // company_id로 필터링 (필수)
        if (currentState.companyId) {
            query = query.eq('company_id', currentState.companyId);
        } else {
            console.error('company_id가 없습니다!');
            showError('회사 정보가 없습니다.');
            return;
        }
        
        const { data: videos, error } = await query;
        
        if (error) {
            console.error('Supabase 쿼리 오류:', error);
            throw error;
        }
        
        if (!videos || videos.length === 0) {
            console.log('같은 회사의 비디오가 없습니다.');
            showEmptyState();
            return;
        }
        
        console.log(`같은 회사의 비디오 ${videos.length}개 발견`);
        
        // 이미 평가한 비디오 필터링
        const reviewedVideos = await getReviewedVideos();
        const unreviewed = videos.filter(v => !reviewedVideos.includes(v.id));
        
        console.log(`평가하지 않은 비디오: ${unreviewed.length}개`);
        
        if (unreviewed.length === 0) {
            showEmptyState();
            return;
        }
        
        // 에러가 발생하지 않은 비디오만 필터링
        const playableVideos = unreviewed.filter(v => !currentState.errorVideos.includes(v.id));
        
        console.log(`재생 가능한 비디오: ${playableVideos.length}개`);
        console.log(`에러 비디오: ${currentState.errorVideos.length}개`);
        
        // 재생 가능한 비디오가 없으면 빈 상태 표시
        if (playableVideos.length === 0) {
            console.log('재생 가능한 비디오가 없습니다.');
            showEmptyState();
            return;
        }
        
        // 비디오 큐가 비어있으면 재생 가능한 비디오로 채우기
        if (!currentState.videoQueue || currentState.videoQueue.length === 0) {
            currentState.videoQueue = [...playableVideos];
            currentState.retryCount = 0; // 재시도 횟수 초기화
        }
        
        // 큐가 비었으면 빈 상태 표시
        if (currentState.videoQueue.length === 0) {
            console.log('모든 비디오를 시도했습니다.');
            showEmptyState();
            return;
        }
        
        // 첫 번째 비디오 선택 및 큐에서 제거
        currentState.currentVideo = currentState.videoQueue.shift();
        displayVideo(currentState.currentVideo);
        
    } catch (error) {
        console.error('비디오 로드 오류:', error);
        showError('비디오를 불러올 수 없습니다.');
    }
}

// 이미 평가한 비디오 ID 목록 가져오기
async function getReviewedVideos() {
    try {
        console.log('이미 평가한 비디오 조회 중...');
        // metadata에서 actual_user_id로 조회
        const { data, error } = await supabaseClient
            .from('video_reviews')
            .select('video_id')
            .filter('metadata->>actual_user_id', 'eq', currentState.userId);
        
        if (error) {
            console.error('video_reviews 테이블 조회 오류:', error);
            // 테이블이 없을 수 있으므로 빈 배열 반환
            return [];
        }
        
        const reviewedIds = data ? data.map(r => r.video_id) : [];
        console.log(`이미 평가한 비디오: ${reviewedIds.length}개`);
        return reviewedIds;
        
    } catch (error) {
        console.error('평가 목록 조회 오류:', error);
        return [];
    }
}

// 비디오 표시
function displayVideo(video) {
    hideLoadingState();
    
    const videoElement = document.getElementById('reviewVideo');
    const playerDiv = document.getElementById('videoPlayer');
    const controlsDiv = document.getElementById('reviewControls');
    
    console.log('비디오 표시 시작:', video);
    console.log('비디오 URL:', video.video_url);
    
    // 비디오 상태 초기화
    currentState.videoLoaded = false;
    currentState.videoCanPlay = false;
    currentState.videoPlayTime = 0;
    currentState.videoErrorCount = 0;
    currentState.videoStartTime = null;
    currentState.actualWatchTime = 0;
    currentState.ratingEnabled = false;
    
    // 평가 컨트롤 초기화
    disableRating();
    
    // UI 초기 상태 설정 (비디오는 표시하되 컨트롤은 비활성화)
    playerDiv.style.display = 'block';
    controlsDiv.style.display = 'flex';
    
    // CORS 설정 추가 - GitHub Pages에서 Supabase 비디오 재생을 위해
    videoElement.crossOrigin = 'anonymous';
    
    // 비디오 소스 설정
    videoElement.src = video.video_url;
    
    // 모든 이벤트 리스너 제거 (중복 방지)
    videoElement.onloadedmetadata = null;
    videoElement.oncanplay = null;
    videoElement.oncanplaythrough = null;
    videoElement.onplay = null;
    videoElement.onpause = null;
    videoElement.onerror = null;
    videoElement.ontimeupdate = null;
    
    // 비디오 이벤트 리스너 추가
    videoElement.onloadedmetadata = () => {
        console.log('비디오 메타데이터 로드 완료');
        currentState.videoLoaded = true;
    };
    
    videoElement.oncanplay = () => {
        console.log('비디오 재생 준비 완료');
        currentState.videoCanPlay = true;
        
        // 비디오가 재생 가능하고 에러가 없으면 UI 표시
        if (!videoElement.error && currentState.videoErrorCount === 0) {
            playerDiv.style.display = 'block';
            controlsDiv.style.display = 'flex';
            
            // 초기에는 별점 비활성화 상태로 표시
            const stars = document.querySelectorAll('.star');
            stars.forEach(star => {
                star.style.opacity = '0.3';
                star.style.cursor = 'not-allowed';
            });
            
            // 자동 재생 시도
            videoElement.play().catch(e => {
                console.log('자동 재생 실패, 음소거 후 재시도:', e);
                videoElement.muted = true;
                videoElement.play().catch(err => {
                    console.error('음소거 후도 재생 실패:', err);
                    currentState.videoErrorCount++;
                    showVideoError('Video không thể phát. Đang chuyển sang video khác...');
                    setTimeout(() => loadNextVideo(), 2000);
                });
            });
        }
    };
    
    // 재생 시간 추적 (더 정확하게)
    videoElement.ontimeupdate = () => {
        if (videoElement.currentTime > 0 && !videoElement.paused && !videoElement.ended) {
            currentState.actualWatchTime = videoElement.currentTime;
            
            // 최소 시청 시간 충족 시 평가 활성화
            if (currentState.actualWatchTime >= currentState.minWatchTime && currentState.videoCanPlay) {
                enableRating();
            }
        }
    };
    
    // 비디오 재생 시작 추적
    videoElement.onplay = () => {
        if (!currentState.videoStartTime) {
            currentState.videoStartTime = Date.now();
        }
        console.log('비디오 재생 시작');
    };
    
    videoElement.onpause = () => {
        console.log('비디오 일시정지');
    };
    
    videoElement.onerror = (e) => {
        console.error('비디오 로드 에러:', e);
        console.error('에러 타입:', videoElement.error);
        console.error('에러 비디오 ID:', currentState.currentVideo.id);
        
        currentState.videoErrorCount++;
        currentState.videoCanPlay = false;
        currentState.videoLoaded = false;
        
        // 에러가 발생한 비디오 ID를 목록에 추가
        if (currentState.currentVideo && !currentState.errorVideos.includes(currentState.currentVideo.id)) {
            currentState.errorVideos.push(currentState.currentVideo.id);
            console.log('에러 비디오 목록에 추가:', currentState.currentVideo.id);
        }
        
        // 비디오 에러 시 UI 숨기기
        playerDiv.style.display = 'none';
        controlsDiv.style.display = 'none';
        
        // 재시도 횟수 체크
        currentState.retryCount++;
        
        // 비디오 영역에 에러 메시지 표시
        showVideoError(`Video không thể phát. Đang thử video khác... (${currentState.errorVideos.length} video lỗi)`);
        
        // 2초 후 다음 비디오로 이동
        setTimeout(() => {
            currentState.transitioning = false;
            loadNextVideo();
        }, 2000);
        
        return; // 에러 시 더 이상 진행하지 않음
    };
    
    // 비디오 로드
    videoElement.load();
    
    // 비디오 정보 표시 (사용자 정보 숨김)
    document.getElementById('videoTitle').textContent = video.title || 'Video không có tiêu đề';
    
    // 태그 표시
    const tagsContainer = document.getElementById('videoTags');
    const tags = video.metadata?.tags || [];
    tagsContainer.innerHTML = tags.map(tag => 
        `<span class="video-tag">#${tag}</span>`
    ).join('');
    
    // UI는 oncanplay 이벤트에서 표시됨
    
    // 별점 초기화
    resetStarRating();
}

// 상대 시간 계산
function getRelativeTime(timestamp) {
    const now = new Date();
    const time = new Date(timestamp);
    const diff = now - time;
    
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    
    if (minutes < 60) return `${minutes} phút trước`;
    if (hours < 24) return `${hours} giờ trước`;
    return `${days} ngày trước`;
}

// 평가 비활성화
function disableRating() {
    const stars = document.querySelectorAll('.star');
    stars.forEach(star => {
        star.style.opacity = '0.3';
        star.style.cursor = 'not-allowed';
    });
    
    // 안내 메시지 표시
    const hint = document.querySelector('.rating-hint');
    if (hint) {
        hint.textContent = `Xem ít nhất ${currentState.minWatchTime} giây để đánh giá`;
        hint.style.color = '#ff6b35';
    }
}

// 평가 활성화
function enableRating() {
    // 비디오가 정상적으로 재생 중인지 최종 확인
    const videoElement = document.getElementById('reviewVideo');
    if (!videoElement || videoElement.error || !currentState.videoCanPlay) {
        console.error('평가 활성화 실패: 비디오 상태 불량');
        return;
    }
    
    const stars = document.querySelectorAll('.star');
    stars.forEach(star => {
        star.style.opacity = '1';
        star.style.cursor = 'pointer';
        star.style.pointerEvents = 'auto';
    });
    
    // 안내 메시지 복원
    const hint = document.querySelector('.rating-hint');
    if (hint) {
        hint.textContent = 'Đánh giá để nhận +5 điểm';
        hint.style.color = '';
    }
    
    // 성공 메시지는 한 번만 표시
    if (!currentState.ratingEnabled) {
        currentState.ratingEnabled = true;
        showSuccess('Bạn đã có thể đánh giá video!');
    }
}

// 별점 평가 설정
function setupStarRating() {
    const stars = document.querySelectorAll('.star');
    
    stars.forEach(star => {
        star.addEventListener('click', function(e) {
            // 무결성 다중 체크
            const videoElement = document.getElementById('reviewVideo');
            const controlsDiv = document.getElementById('reviewControls');
            
            // 1. 비디오 엘리먼트 체크
            if (!videoElement || videoElement.error || videoElement.readyState < 2) {
                showError('Video chưa được tải đúng cách!');
                currentState.integrityViolations++;
                console.error('무결성 위반: 비디오 엘리먼트 상태 불량');
                e.preventDefault();
                e.stopPropagation();
                return;
            }
            
            // 2. 컨트롤 표시 상태 체크
            if (!controlsDiv || controlsDiv.style.display === 'none') {
                showError('Lỗi hiển thị giao diện!');
                currentState.integrityViolations++;
                console.error('무결성 위반: 컨트롤 미표시 상태에서 클릭');
                e.preventDefault();
                e.stopPropagation();
                return;
            }
            
            // 3. 비디오 재생 가능 상태 체크
            if (!currentState.videoCanPlay) {
                showError('Video chưa sẵn sàng!');
                return;
            }
            
            // 4. 실제 시청 시간 체크 (currentTime 사용)
            if (videoElement.currentTime < currentState.minWatchTime) {
                alert(`❌ 비디오를 ${currentState.minWatchTime}초 이상 시청해야 평가할 수 있습니다!`);
                return;
            }
            
            // 5. 비디오 URL 체크
            if (!currentState.currentVideo || !currentState.currentVideo.video_url) {
                showError('Không tìm thấy video!');
                currentState.integrityViolations++;
                console.error('무결성 위반: 비디오 정보 없음');
                return;
            }
            
            const rating = parseInt(this.dataset.rating);
            selectRating(rating);
        });
        
        star.addEventListener('mouseenter', function() {
            const videoElement = document.getElementById('reviewVideo');
            if (!currentState.videoCanPlay || videoElement.currentTime < currentState.minWatchTime) {
                return;
            }
            const rating = parseInt(this.dataset.rating);
            highlightStars(rating);
        });
    });
    
    document.getElementById('starRating').addEventListener('mouseleave', function() {
        if (currentState.lastRating) {
            highlightStars(currentState.lastRating);
        } else {
            resetStarRating();
        }
    });
}

// 별점 선택
async function selectRating(rating) {
    currentState.lastRating = rating;
    highlightStars(rating);
    
    // 자동으로 평가 저장하고 다음 비디오로
    await submitRating(rating);
}

// 별 하이라이트
function highlightStars(rating) {
    const stars = document.querySelectorAll('.star');
    stars.forEach((star, index) => {
        if (index < rating) {
            star.classList.add('active');
        } else {
            star.classList.remove('active');
        }
    });
}

// 별점 초기화
function resetStarRating() {
    currentState.lastRating = null;
    const stars = document.querySelectorAll('.star');
    stars.forEach(star => star.classList.remove('active'));
    document.getElementById('commentSection').style.display = 'none';
    document.getElementById('commentInput').value = '';
}

// 별점 평가 제출
async function submitRating(rating) {
    if (!currentState.currentVideo) return;
    
    // 강화된 무결성 검증
    const videoElement = document.getElementById('reviewVideo');
    const controlsDiv = document.getElementById('reviewControls');
    
    // 1. 비디오 엘리먼트 검증
    if (!videoElement || videoElement.error || videoElement.readyState < 2) {
        showError('Video không hợp lệ!');
        currentState.integrityViolations++;
        console.error('무결성 위반: 평가 제출 시 비디오 상태 불량');
        // 즉시 다음 비디오로
        setTimeout(() => loadNextVideo(), 1000);
        return;
    }
    
    // 2. 실제 재생 시간 검증 (currentTime 사용)
    const currentTime = videoElement.currentTime || 0;
    if (currentTime < currentState.minWatchTime) {
        showError(`Video phải được xem ít nhất ${currentState.minWatchTime} giây!`);
        currentState.integrityViolations++;
        console.error('무결성 위반: 실제 재생 시간 부족', currentTime);
        return;
    }
    
    // 3. 비디오 재생 가능 상태 검증
    if (!currentState.videoCanPlay) {
        showError('Video chưa sẵn sàng!');
        currentState.integrityViolations++;
        return;
    }
    
    // 4. 컨트롤 표시 상태 검증
    if (!controlsDiv || controlsDiv.style.display === 'none') {
        showError('Lỗi giao diện!');
        currentState.integrityViolations++;
        return;
    }
    
    // 5. 무결성 위반 횟수 체크
    if (currentState.integrityViolations > 3) {
        showError('Phát hiện hành vi bất thường. Vui lòng tải lại trang.');
        setTimeout(() => window.location.reload(), 2000);
        return;
    }
    
    // 평가 애니메이션
    const player = document.getElementById('videoPlayer');
    player.classList.add('fade-out');
    
    // 리뷰 저장 (개선된 메타데이터 포함)
    await saveReview('rate', rating, null);
    
    // 포인트 애니메이션
    const points = 5; // 평가 시 +5포인트
    showPointsAnimation(points);
    
    // 연속 평가 체크
    currentState.reviewStreak++;
    if (currentState.reviewStreak % 5 === 0) {
        showStreakAnimation();
        // 연속 평가 보너스
        await addBonusPoints(20);
    }
    
    // 상태 초기화
    currentState.videoLoaded = false;
    currentState.videoCanPlay = false;
    currentState.videoPlayTime = 0;
    currentState.videoStartTime = null;
    currentState.actualWatchTime = 0;
    currentState.retryCount = 0;
    currentState.videoErrorCount = 0;
    
    // 다음 비디오
    setTimeout(() => {
        player.classList.remove('fade-out');
        loadNextVideo();
    }, 1000);
}

// 리뷰 저장
async function saveReview(action, rating, comment) {
    if (!currentState.currentVideo) return;
    
    try {
        const videoElement = document.getElementById('reviewVideo');
        
        // reviewer_id를 전달하지 않고 metadata에 user_id 저장
        const reviewData = {
            video_id: currentState.currentVideo.id,
            reviewer_id: '00000000-0000-0000-0000-000000000000', // 기본 UUID
            action: action,
            rating: rating,
            comment: comment,
            metadata: {
                actual_user_id: currentState.userId,  // 실제 user_id를 metadata에 저장
                reviewer_name: currentState.userName,
                company_id: currentState.companyId,
                store_id: currentState.storeId,
                // 무결성 검증을 위한 추가 데이터
                watch_time: Math.floor(videoElement.currentTime || 0),
                actual_watch_time: currentState.actualWatchTime,
                video_duration: videoElement.duration || 0,
                watch_percentage: videoElement.duration ? (videoElement.currentTime / videoElement.duration) * 100 : 0,
                video_loaded: currentState.videoLoaded,
                video_can_play: currentState.videoCanPlay,
                video_url: currentState.currentVideo.video_url,
                timestamp: new Date().toISOString(),
                browser_info: navigator.userAgent,
                integrity_violations: currentState.integrityViolations,
                video_error_count: currentState.videoErrorCount
            }
        };
        
        const { error } = await supabaseClient
            .from('video_reviews')
            .insert([reviewData]);
        
        if (error) throw error;
        
        // 평가 수 증가
        currentState.reviewedToday++;
        
        // 포인트 계산 및 추가
        const points = calculatePoints(action, rating, !!comment);
        currentState.earnedPoints += points;
        
        // 사용자 포인트 업데이트
        await updateUserPoints(points);
        
        // UI 업데이트
        updateProgressUI();
        
        // 일일 목표 달성 체크
        if (currentState.reviewedToday === currentState.dailyTarget) {
            await addBonusPoints(50);
            showSuccess('🎉 일일 목표 달성! +50 보너스 포인트!');
        }
        
    } catch (error) {
        console.error('리뷰 저장 오류:', error);
        showError('평가를 저장할 수 없습니다.');
    }
}

// 포인트 계산
function calculatePoints(action, rating, hasComment) {
    if (action === 'rate' && rating > 0) {
        return 5; // 평가 시 +5포인트
    }
    return 0;
}

// 사용자 포인트 업데이트
async function updateUserPoints(points) {
    try {
        // 현재 포인트 조회
        const { data: userData, error: fetchError } = await supabaseClient
            .from('user_progress')
            .select('total_points')
            .eq('user_id', currentState.userId)
            .single();
        
        if (fetchError) throw fetchError;
        
        const newTotalPoints = (userData?.total_points || 0) + points;
        
        // 포인트 업데이트
        const { error: updateError } = await supabaseClient
            .from('user_progress')
            .update({ 
                total_points: newTotalPoints,
                updated_at: new Date().toISOString()
            })
            .eq('user_id', currentState.userId);
        
        if (updateError) throw updateError;
        
    } catch (error) {
        console.error('포인트 업데이트 오류:', error);
    }
}

// 보너스 포인트 추가
async function addBonusPoints(points) {
    currentState.earnedPoints += points;
    await updateUserPoints(points);
    updateProgressUI();
}

// UI 헬퍼 함수들
function showLoadingState() {
    document.getElementById('loadingState').style.display = 'block';
    document.getElementById('videoPlayer').style.display = 'none';
    document.getElementById('emptyState').style.display = 'none';
    document.getElementById('reviewControls').style.display = 'none';
    document.getElementById('commentSection').style.display = 'none';
}

function hideLoadingState() {
    document.getElementById('loadingState').style.display = 'none';
}

function showEmptyState() {
    console.log('Showing empty state...');
    document.getElementById('emptyState').style.display = 'block';
    document.getElementById('loadingState').style.display = 'none';
    document.getElementById('videoPlayer').style.display = 'none';
    document.getElementById('reviewControls').style.display = 'none';
    document.getElementById('commentSection').style.display = 'none';
    
    // 재시도 횟수에 따른 메시지 변경
    const emptyStateDiv = document.getElementById('emptyState');
    if (currentState.retryCount >= currentState.maxRetries) {
        // 재시도 실패로 인한 종료
        emptyStateDiv.innerHTML = `
            <div class="empty-icon">⚠️</div>
            <h3>Không thể tải video</h3>
            <p>Đã thử ${currentState.maxRetries} lần nhưng không thể tải video.</p>
            <p>Vui lòng kiểm tra kết nối mạng và thử lại sau.</p>
            <p class="countdown-text">Tự động quay lại sau <span id="countdown">5</span> giây...</p>
            <button class="btn btn-primary" onclick="goBack()">Quay lại trang chính</button>
        `;
    } else {
        // 모든 비디오 평가 완료
        emptyStateDiv.innerHTML = `
            <div class="empty-icon">🎬</div>
            <h3>Không còn video để đánh giá</h3>
            <p>Bạn đã đánh giá tất cả video của công ty!</p>
            <p>Hãy quay lại sau khi có video mới.</p>
            <p class="countdown-text">Tự động quay lại sau <span id="countdown">5</span> giây...</p>
            <button class="btn btn-primary" onclick="goBack()">Quay lại trang chính</button>
        `;
    }
    
    // 카운트다운 및 자동 리다이렉트
    let countdown = 5;
    const countdownElement = document.getElementById('countdown');
    
    const countdownInterval = setInterval(() => {
        countdown--;
        if (countdownElement) {
            countdownElement.textContent = countdown;
        }
        
        if (countdown <= 0) {
            clearInterval(countdownInterval);
            goBack();
        }
    }, 1000);
}

function showPointsAnimation(points) {
    const animation = document.getElementById('pointsAnimation');
    document.getElementById('animatedPointsValue').textContent = points;
    
    animation.style.display = 'block';
    
    setTimeout(() => {
        animation.style.display = 'none';
    }, 1000);
}

function showStreakAnimation() {
    const animation = document.getElementById('streakAnimation');
    animation.style.display = 'block';
    
    setTimeout(() => {
        animation.style.display = 'none';
    }, 2000);
}

function showSuccess(message) {
    const toast = document.getElementById('successToast');
    toast.querySelector('.toast-message').textContent = message;
    toast.style.display = 'flex';
    
    setTimeout(() => {
        toast.style.display = 'none';
    }, 3000);
}

function showError(message) {
    const toast = document.getElementById('errorToast');
    toast.querySelector('.toast-message').textContent = message;
    toast.style.display = 'flex';
    
    setTimeout(() => {
        toast.style.display = 'none';
    }, 3000);
}

// 비디오 에러 전용 표시 함수 - 화면 하단에 토스트 형태로 표시
function showVideoError(message) {
    // 기존 에러 메시지가 있으면 제거
    let existingError = document.getElementById('videoErrorMessage');
    if (existingError) {
        existingError.remove();
    }
    
    // 에러 메시지 div를 body에 추가
    const errorDiv = document.createElement('div');
    errorDiv.id = 'videoErrorMessage';
    errorDiv.style.cssText = `
        position: fixed;
        bottom: 140px;
        left: 50%;
        transform: translateX(-50%);
        background: rgba(0,0,0,0.95);
        color: #fff;
        padding: 0.75rem 1.5rem;
        border-radius: 8px;
        border: 1px solid #ff4458;
        font-size: 14px;
        z-index: 1000;
        display: flex;
        align-items: center;
        gap: 0.5rem;
        max-width: 90%;
        animation: slideUp 0.3s ease-out;
        box-shadow: 0 4px 12px rgba(0,0,0,0.5);
    `;
    
    errorDiv.innerHTML = `<span style="font-size: 1.2rem;">⚠️</span> <span>${message}</span>`;
    document.body.appendChild(errorDiv);
    
    // 3초 후 자동 숨김 (2초는 너무 짧음)
    setTimeout(() => {
        if (errorDiv && errorDiv.parentNode) {
            errorDiv.style.animation = 'slideDown 0.3s ease-out';
            setTimeout(() => {
                if (errorDiv.parentNode) {
                    errorDiv.remove();
                }
            }, 300);
        }
    }, 3000);
}

// 뒤로가기
function goBack() {
    const params = new URLSearchParams();
    if (currentState.userId) params.append('user_id', currentState.userId);
    if (currentState.userName) params.append('user_name', currentState.userName);
    if (currentState.companyId) params.append('company_id', currentState.companyId);
    if (currentState.storeId) params.append('store_id', currentState.storeId);
    
    window.location.href = `index.html?${params.toString()}`;
}

// 전역 함수로 내보내기
window.goBack = goBack;

// 페이지 이탈 시 기록
window.addEventListener('beforeunload', () => {
    if (currentState.currentVideo && !currentState.lastRating) {
        // 평가하지 않고 이탈한 경우 기록
        console.log('비디오 시청 후 평가 없이 이탈:', {
            video_id: currentState.currentVideo.id,
            watch_time: currentState.videoPlayTime,
            actual_watch_time: currentState.actualWatchTime
        });
    }
});