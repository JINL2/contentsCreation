// Supabase 초기화
const { createClient } = supabase;
const supabaseClient = createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey);

// 전역 상태
let currentState = {
    userId: null,
    userName: null,
    companyId: null,
    storeId: null,
    currentVideo: null,
    videoQueue: [],
    reviewedToday: 0,
    earnedPoints: 0,
    currentIndex: 0
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
    console.log('Video Review Simple 초기화...');
    
    // 사용자 정보 설정
    const urlParams = getURLParameters();
    currentState.userId = urlParams.user_id;
    currentState.userName = urlParams.user_name || 'Anonymous';
    currentState.companyId = urlParams.company_id;
    currentState.storeId = urlParams.store_id;
    
    if (!currentState.userId) {
        showError('사용자 정보가 없습니다.');
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 2000);
        return;
    }
    
    // 별점 이벤트 설정
    setupStarRating();
    
    // 비디오 목록 로드
    await loadAllVideos();
});

// 모든 비디오 로드
async function loadAllVideos() {
    showLoadingState();
    
    try {
        const { data: videos, error } = await supabaseClient
            .from('content_uploads')
            .select('*')
            .eq('status', 'uploaded')
            .eq('company_id', currentState.companyId)
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        
        if (!videos || videos.length === 0) {
            showEmptyState();
            return;
        }
        
        console.log(`${videos.length}개의 비디오 발견`);
        currentState.videoQueue = videos;
        
        // 첫 번째 비디오 표시
        displayNextVideo();
        
    } catch (error) {
        console.error('비디오 로드 오류:', error);
        showError('비디오를 불러올 수 없습니다.');
    }
}

// 다음 비디오 표시
function displayNextVideo() {
    if (currentState.currentIndex >= currentState.videoQueue.length) {
        showEmptyState();
        return;
    }
    
    currentState.currentVideo = currentState.videoQueue[currentState.currentIndex];
    displayVideo(currentState.currentVideo);
}

// 비디오 표시
function displayVideo(video) {
    hideLoadingState();
    
    const videoElement = document.getElementById('reviewVideo');
    const playerDiv = document.getElementById('videoPlayer');
    const controlsDiv = document.getElementById('reviewControls');
    
    console.log('비디오 표시:', video.title);
    console.log('URL:', video.video_url);
    
    // 비디오 정보 표시
    document.getElementById('videoTitle').textContent = video.title || 'Video không có tiêu đề';
    
    // 태그 표시
    const tagsContainer = document.getElementById('videoTags');
    const tags = video.metadata?.tags || [];
    tagsContainer.innerHTML = tags.map(tag => 
        `<span class="video-tag">#${tag}</span>`
    ).join('');
    
    // 비디오 소스 설정 - 단순하게
    videoElement.src = video.video_url;
    
    // UI 표시
    playerDiv.style.display = 'block';
    controlsDiv.style.display = 'flex';
    
    // 별점 초기화
    resetStarRating();
}

// 별점 설정
function setupStarRating() {
    const stars = document.querySelectorAll('.star');
    
    stars.forEach(star => {
        star.addEventListener('click', function() {
            const rating = parseInt(this.dataset.rating);
            selectRating(rating);
        });
        
        star.addEventListener('mouseenter', function() {
            const rating = parseInt(this.dataset.rating);
            highlightStars(rating);
        });
    });
    
    document.getElementById('starRating').addEventListener('mouseleave', function() {
        resetStarRating();
    });
}

// 별점 선택
async function selectRating(rating) {
    highlightStars(rating);
    
    // 평가 저장
    await saveReview(rating);
    
    // 포인트 애니메이션
    showPointsAnimation(5);
    
    // 다음 비디오로
    currentState.currentIndex++;
    currentState.reviewedToday++;
    currentState.earnedPoints += 5;
    
    updateProgressUI();
    
    setTimeout(() => {
        displayNextVideo();
    }, 1500);
}

// 평가 저장 (단순화)
async function saveReview(rating) {
    try {
        // 간단한 리뷰 데이터
        const reviewData = {
            video_id: currentState.currentVideo.id,
            reviewer_id: '00000000-0000-0000-0000-000000000000',
            action: 'rate',
            rating: rating,
            metadata: {
                actual_user_id: currentState.userId,
                reviewer_name: currentState.userName,
                company_id: currentState.companyId,
                store_id: currentState.storeId,
                video_title: currentState.currentVideo.title
            }
        };
        
        const { error } = await supabaseClient
            .from('video_reviews')
            .insert([reviewData]);
        
        if (error) {
            console.error('리뷰 저장 오류:', error);
        } else {
            console.log('리뷰 저장 성공');
        }
        
    } catch (error) {
        console.error('리뷰 저장 실패:', error);
    }
}

// UI 업데이트
function updateProgressUI() {
    document.getElementById('todayReviewed').textContent = currentState.reviewedToday;
    document.getElementById('earnedPoints').textContent = currentState.earnedPoints;
    document.getElementById('reviewStreak').textContent = Math.floor(currentState.reviewedToday / 5);
    
    const progress = Math.min((currentState.reviewedToday / 20) * 100, 100);
    document.getElementById('reviewProgressFill').style.width = `${progress}%`;
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
    const stars = document.querySelectorAll('.star');
    stars.forEach(star => star.classList.remove('active'));
}

// UI 헬퍼 함수들
function showLoadingState() {
    document.getElementById('loadingState').style.display = 'block';
    document.getElementById('videoPlayer').style.display = 'none';
    document.getElementById('emptyState').style.display = 'none';
    document.getElementById('reviewControls').style.display = 'none';
}

function hideLoadingState() {
    document.getElementById('loadingState').style.display = 'none';
}

function showEmptyState() {
    document.getElementById('emptyState').style.display = 'block';
    document.getElementById('loadingState').style.display = 'none';
    document.getElementById('videoPlayer').style.display = 'none';
    document.getElementById('reviewControls').style.display = 'none';
}

function showPointsAnimation(points) {
    const animation = document.getElementById('pointsAnimation');
    document.getElementById('animatedPointsValue').textContent = points;
    
    animation.style.display = 'block';
    
    setTimeout(() => {
        animation.style.display = 'none';
    }, 1000);
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

// 뒤로가기
function goBack() {
    const params = new URLSearchParams();
    if (currentState.userId) params.append('user_id', currentState.userId);
    if (currentState.userName) params.append('user_name', currentState.userName);
    if (currentState.companyId) params.append('company_id', currentState.companyId);
    if (currentState.storeId) params.append('store_id', currentState.storeId);
    
    window.location.href = `index.html?${params.toString()}`;
}

window.goBack = goBack;