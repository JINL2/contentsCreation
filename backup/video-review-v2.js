// Supabase 초기화
const { createClient } = supabase;
const supabaseClient = createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey);

// 전역 상태 관리
let currentState = {
    userId: null,
    userName: null,
    companyId: null,
    storeId: null,
    allVideos: [],          // 모든 비디오 (평가된 것 포함)
    reviewedVideos: [],     // 이미 평가한 비디오 ID 목록
    currentVideoIndex: 0,   // 현재 비디오 인덱스
    currentVideo: null,
    reviewedToday: 0,
    dailyTarget: 20,
    earnedPoints: 0,
    reviewStreak: 0,
    lastRating: null,
    videoCanPlay: false,
    minWatchTime: 3,
    actualWatchTime: 0,
    integrityViolations: 0,
    integrityCheckInterval: null
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
    console.log('Khởi tạo Video Review...');
    
    // 사용자 정보 설정
    const urlParams = getURLParameters();
    currentState.userId = urlParams.user_id;
    currentState.userName = urlParams.user_name || 'Ẩn danh';
    currentState.companyId = urlParams.company_id;
    currentState.storeId = urlParams.store_id;
    
    if (!currentState.userId) {
        showError('Không tìm thấy thông tin người dùng.');
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 2000);
        return;
    }
    
    // 홈으로 버튼 추가
    addHomeButton();
    
    // 진행 상황 로드
    await loadTodayProgress();
    
    // 별점 이벤트 리스너
    setupStarRating();
    
    // 무결성 체크 인터벌
    startIntegrityCheck();
    
    // 모든 비디오 로드 및 첫 비디오 표시
    await loadAllVideos();
});

// 홈으로 버튼 추가
function addHomeButton() {
    // 기존 버튼이 있으면 제거
    const existingButton = document.querySelector('.home-button');
    if (existingButton) {
        existingButton.remove();
    }
    
    const homeButton = document.createElement('button');
    homeButton.className = 'home-button';
    homeButton.title = 'Về trang chủ';
    homeButton.innerHTML = `
        <svg viewBox="0 0 24 24" width="24" height="24">
            <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" fill="currentColor"/>
        </svg>
    `;
    homeButton.onclick = goBack;
    document.body.appendChild(homeButton);
    
    console.log('Đã thêm nút Home');
}

// 오늘 평가 진행 상황 로드
async function loadTodayProgress() {
    try {
        const today = new Date().toISOString().split('T')[0];
        
        const { count, error } = await supabaseClient
            .from('video_reviews')
            .select('*', { count: 'exact', head: true })
            .filter('metadata->>actual_user_id', 'eq', currentState.userId)
            .gte('created_at', today + 'T00:00:00')
            .lte('created_at', today + 'T23:59:59');
        
        currentState.reviewedToday = count || 0;
        updateProgressUI();
        
    } catch (error) {
        console.error('Lỗi khi tải tiến độ:', error);
    }
}

// 모든 비디오 로드
async function loadAllVideos() {
    showLoadingState();
    
    try {
        // 같은 company_id의 모든 비디오 가져오기 (최신순)
        const { data: videos, error } = await supabaseClient
            .from('content_uploads')
            .select('*')
            .eq('status', 'uploaded')
            .eq('company_id', currentState.companyId)
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        
        if (!videos || videos.length === 0) {
            showEmptyState('Không có video nào trong công ty');
            return;
        }
        
        // 이미 평가한 비디오 목록 가져오기
        const reviewedIds = await getReviewedVideos();
        currentState.reviewedVideos = reviewedIds;
        
        // 비디오를 평가되지 않은 것과 평가된 것으로 분리
        const unreviewedVideos = videos.filter(v => !reviewedIds.includes(v.id));
        const reviewedVideosData = videos.filter(v => reviewedIds.includes(v.id));
        
        // 평가되지 않은 비디오를 먼저, 평가된 비디오를 나중에
        currentState.allVideos = [...unreviewedVideos, ...reviewedVideosData];
        
        console.log(`Tổng ${videos.length} video (chưa đánh giá: ${unreviewedVideos.length}, đã đánh giá: ${reviewedVideosData.length})`);
        
        if (currentState.allVideos.length === 0) {
            showEmptyState('Không có video nào để hiển thị');
            return;
        }
        
        // 첫 번째 비디오 표시
        displayCurrentVideo();
        
    } catch (error) {
        console.error('Lỗi khi tải video:', error);
        showError('Không thể tải video.');
    }
}

// 이미 평가한 비디오 ID 목록 가져오기
async function getReviewedVideos() {
    try {
        const { data, error } = await supabaseClient
            .from('video_reviews')
            .select('video_id')
            .filter('metadata->>actual_user_id', 'eq', currentState.userId);
        
        if (error) {
            console.error('Lỗi truy vấn bảng video_reviews:', error);
            return [];
        }
        
        return data ? data.map(r => r.video_id) : [];
        
    } catch (error) {
        console.error('Lỗi khi lấy danh sách đánh giá:', error);
        return [];
    }
}

// 현재 비디오 표시
function displayCurrentVideo() {
    if (currentState.currentVideoIndex >= currentState.allVideos.length) {
        showEmptyState('Đã xem hết tất cả video');
        return;
    }
    
    currentState.currentVideo = currentState.allVideos[currentState.currentVideoIndex];
    const isReviewed = currentState.reviewedVideos.includes(currentState.currentVideo.id);
    
    displayVideo(currentState.currentVideo, isReviewed);
}

// 비디오 표시
function displayVideo(video, isReviewed) {
    hideLoadingState();
    
    const videoElement = document.getElementById('reviewVideo');
    const playerDiv = document.getElementById('videoPlayer');
    const controlsDiv = document.getElementById('reviewControls');
    
    // 상태 초기화
    currentState.videoCanPlay = false;
    currentState.actualWatchTime = 0;
    currentState.lastRating = null;
    
    // UI 표시
    playerDiv.style.display = 'block';
    
    // 이미 평가된 비디오인 경우
    if (isReviewed) {
        controlsDiv.innerHTML = `
            <div class="already-reviewed-message">
                Bạn đã đánh giá video này
            </div>
            <div style="margin-top: 1rem;">
                <button class="btn btn-primary" onclick="nextVideo()">Xem video tiếp theo →</button>
            </div>
        `;
        controlsDiv.style.display = 'flex';
    } else {
        // 평가되지 않은 비디오 - 기존 컨트롤 복원
        controlsDiv.innerHTML = `
            <div class="rating-container">
                <div class="rating-title" style="color: #fff; font-size: 1.2rem; margin-bottom: 1rem;">
                    Đánh giá video
                </div>
                <div class="star-rating" id="starRating">
                    <span class="star" data-rating="1">⭐</span>
                    <span class="star" data-rating="2">⭐</span>
                    <span class="star" data-rating="3">⭐</span>
                    <span class="star" data-rating="4">⭐</span>
                    <span class="star" data-rating="5">⭐</span>
                </div>
                <p class="rating-hint">Xem ít nhất 3 giây để đánh giá</p>
            </div>
        `;
        controlsDiv.style.display = 'flex';
        
        // 별점 이벤트 리스너 재설정
        setupStarRating();
        
        // 초기에는 별점 비활성화
        disableRating();
    }
    
    // 비디오 설정
    videoElement.crossOrigin = 'anonymous';
    videoElement.src = video.video_url;
    
    // 모든 이벤트 리스너 제거
    videoElement.onloadedmetadata = null;
    videoElement.oncanplay = null;
    videoElement.onplay = null;
    videoElement.onerror = null;
    videoElement.ontimeupdate = null;
    
    // 평가되지 않은 비디오만 이벤트 리스너 추가
    if (!isReviewed) {
        videoElement.oncanplay = () => {
            console.log('Video sẵn sàng phát');
            currentState.videoCanPlay = true;
            
            // 자동 재생
            videoElement.play().catch(e => {
                console.log('Tự động phát thất bại, thử lại với âm lượng tắt');
                videoElement.muted = true;
                videoElement.play().catch(err => {
                    console.error('Phát thất bại:', err);
                    showError('Video không thể phát');
                });
            });
        };
        
        videoElement.ontimeupdate = () => {
            if (videoElement.currentTime > 0) {
                currentState.actualWatchTime = videoElement.currentTime;
                
                // 3초 이상 시청 시 평가 활성화
                if (currentState.actualWatchTime >= currentState.minWatchTime && currentState.videoCanPlay) {
                    enableRating();
                }
            }
        };
        
        videoElement.onerror = (e) => {
            console.error('Lỗi khi tải video:', e);
            const errorMessage = 'Video không thể phát do lỗi CORS hoặc kết nối';
            showVideoError(errorMessage);
            
            // 비디오 플레이어 숨기고 로딩 표시
            document.getElementById('videoPlayer').style.display = 'none';
            document.getElementById('reviewControls').style.display = 'none';
            showLoadingState();
            
            // 2초 후 다음 비디오로
            setTimeout(() => {
                hideLoadingState();
                nextVideo();
            }, 2000);
        };
    }
    
    // 비디오 로드
    videoElement.load();
    
    // 로드 시작 후 10초 내에 재생되지 않으면 다음으로
    const loadTimeout = setTimeout(() => {
        if (!currentState.videoCanPlay) {
            console.log('Video tải quá lâu, chuyển sang video tiếp theo');
            showVideoError('Video tải quá lâu');
            nextVideo();
        }
    }, 10000);
    
    // 비디오가 재생 가능해지면 타임아웃 취소
    const originalOnCanPlay = videoElement.oncanplay;
    videoElement.oncanplay = function() {
        clearTimeout(loadTimeout);
        if (originalOnCanPlay) originalOnCanPlay.call(this);
    };
    
    // 비디오 정보 표시
    document.getElementById('videoTitle').textContent = video.title || 'Video không có tiêu đề';
    
    // 태그 표시
    const tagsContainer = document.getElementById('videoTags');
    const tags = video.metadata?.tags || [];
    tagsContainer.innerHTML = tags.map(tag => 
        `<span class="video-tag">#${tag}</span>`
    ).join('');
    
    // 진행 상황 표시
    const progressInfo = document.querySelector('.progress-info');
    const totalVideos = currentState.allVideos.length;
    const currentPosition = currentState.currentVideoIndex + 1;
    const unreviewedCount = currentState.allVideos.filter(v => !currentState.reviewedVideos.includes(v.id)).length;
    
    progressInfo.innerHTML = `
        <span>Video ${currentPosition}/${totalVideos} (còn ${unreviewedCount} chưa đánh giá)</span>
        <span class="streak-info">🔥 ${currentState.reviewStreak} liên tiếp</span>
    `;
}

// 다음 비디오로 이동
function nextVideo() {
    currentState.currentVideoIndex++;
    
    // 비디오 정지
    const videoElement = document.getElementById('reviewVideo');
    if (videoElement) {
        videoElement.pause();
        videoElement.src = '';
    }
    
    // 다음 비디오 표시
    displayCurrentVideo();
}

// 무결성 체크
function startIntegrityCheck() {
    currentState.integrityCheckInterval = setInterval(() => {
        const videoElement = document.getElementById('reviewVideo');
        const controlsDiv = document.getElementById('reviewControls');
        const stars = document.querySelectorAll('.star');
        
        if (!currentState.currentVideo) return;
        
        const isReviewed = currentState.reviewedVideos.includes(currentState.currentVideo.id);
        
        // 평가된 비디오는 체크하지 않음
        if (isReviewed) return;
        
        // 비디오 상태 체크
        const hasError = videoElement && videoElement.error;
        const currentTime = videoElement ? videoElement.currentTime : 0;
        const canRate = currentState.videoCanPlay && currentTime >= currentState.minWatchTime;
        
        // 에러 처리
        if (hasError) {
            stars.forEach(star => {
                star.style.pointerEvents = 'none';
            });
        } else if (canRate) {
            stars.forEach(star => {
                star.style.pointerEvents = 'auto';
                star.style.opacity = '1';
                star.style.cursor = 'pointer';
            });
        }
    }, 1000);
}

// 평가 비활성화/활성화
function disableRating() {
    const stars = document.querySelectorAll('.star');
    stars.forEach(star => {
        star.style.opacity = '0.3';
        star.style.cursor = 'not-allowed';
        star.style.pointerEvents = 'none';
    });
    
    const hint = document.querySelector('.rating-hint');
    if (hint) {
        hint.textContent = `Xem ít nhất ${currentState.minWatchTime} giây để đánh giá`;
        hint.style.color = '#ff6b35';
    }
}

function enableRating() {
    const stars = document.querySelectorAll('.star');
    stars.forEach(star => {
        star.style.opacity = '1';
        star.style.cursor = 'pointer';
        star.style.pointerEvents = 'auto';
    });
    
    const hint = document.querySelector('.rating-hint');
    if (hint) {
        hint.textContent = 'Đánh giá để nhận +5 điểm';
        hint.style.color = '';
    }
    
    // 타이틀 업데이트
    const title = document.querySelector('.rating-title');
    if (title) {
        title.textContent = 'Bạn đã có thể đánh giá video!';
    }
}

// 별점 평가 설정
function setupStarRating() {
    const stars = document.querySelectorAll('.star');
    
    stars.forEach(star => {
        // 기존 이벤트 리스너 제거
        star.replaceWith(star.cloneNode(true));
    });
    
    // 새로운 이벤트 리스너 추가
    document.querySelectorAll('.star').forEach(star => {
        star.addEventListener('click', function(e) {
            const videoElement = document.getElementById('reviewVideo');
            
            if (!currentState.videoCanPlay || videoElement.currentTime < currentState.minWatchTime) {
                showError(`❌ Bạn phải xem ít nhất ${currentState.minWatchTime} giây để đánh giá!`);
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
    
    const starRating = document.getElementById('starRating');
    if (starRating) {
        starRating.addEventListener('mouseleave', function() {
            if (currentState.lastRating) {
                highlightStars(currentState.lastRating);
            } else {
                resetStarRating();
            }
        });
    }
}

// 별점 선택
async function selectRating(rating) {
    currentState.lastRating = rating;
    highlightStars(rating);
    
    // 평가 저장
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
}

// 평가 제출
async function submitRating(rating) {
    if (!currentState.currentVideo) return;
    
    // 애니메이션
    const player = document.getElementById('videoPlayer');
    player.classList.add('fade-out');
    
    // 리뷰 저장
    await saveReview('rate', rating, null);
    
    // 포인트 애니메이션
    showPointsAnimation(5);
    
    // 연속 평가 체크
    currentState.reviewStreak++;
    if (currentState.reviewStreak % 5 === 0) {
        showStreakAnimation();
        await addBonusPoints(20);
    }
    
    // 현재 비디오를 평가 완료 목록에 추가
    currentState.reviewedVideos.push(currentState.currentVideo.id);
    
    // 다음 비디오
    setTimeout(() => {
        player.classList.remove('fade-out');
        nextVideo();
    }, 1000);
}

// 리뷰 저장
async function saveReview(action, rating, comment) {
    if (!currentState.currentVideo) return;
    
    try {
        // 이미 평가했는지 다시 확인
        if (currentState.reviewedVideos.includes(currentState.currentVideo.id)) {
            console.log('Video đã được đánh giá trước đó');
            showError('Video này đã được bạn đánh giá!');
            return;
        }
        
        const videoElement = document.getElementById('reviewVideo');
        
        const reviewData = {
            video_id: currentState.currentVideo.id,
            reviewer_id: '00000000-0000-0000-0000-000000000000',
            action: action,
            rating: rating,
            comment: comment,
            metadata: {
                actual_user_id: currentState.userId,
                reviewer_name: currentState.userName,
                company_id: currentState.companyId,
                store_id: currentState.storeId,
                watch_time: Math.floor(videoElement.currentTime || 0),
                video_duration: videoElement.duration || 0,
                timestamp: new Date().toISOString()
            }
        };
        
        const { error } = await supabaseClient
            .from('video_reviews')
            .insert([reviewData]);
        
        if (error) {
            console.error('Lỗi khi lưu đánh giá:', error);
            if (error.code === '23505') { // Unique violation
                showError('Bạn đã đánh giá video này rồi!');
                // 추가로 평가 목록에 추가
                if (!currentState.reviewedVideos.includes(currentState.currentVideo.id)) {
                    currentState.reviewedVideos.push(currentState.currentVideo.id);
                }
                // 다음 비디오로 이동
                setTimeout(() => nextVideo(), 1500);
                return;
            }
            throw error;
        }
        
        currentState.reviewedToday++;
        currentState.earnedPoints += 5;
        
        await updateUserPoints(5);
        updateProgressUI();
        
        if (currentState.reviewedToday === currentState.dailyTarget) {
            await addBonusPoints(50);
            showSuccess('🎉 Đạt mục tiêu hàng ngày! +50 điểm thưởng!');
        }
        
    } catch (error) {
        console.error('Lỗi khi lưu đánh giá:', error);
        showError('Không thể lưu đánh giá.');
    }
}

// 사용자 포인트 업데이트
async function updateUserPoints(points) {
    try {
        const { data: userData, error: fetchError } = await supabaseClient
            .from('user_progress')
            .select('total_points')
            .eq('user_id', currentState.userId)
            .single();
        
        if (fetchError) throw fetchError;
        
        const newTotalPoints = (userData?.total_points || 0) + points;
        
        const { error: updateError } = await supabaseClient
            .from('user_progress')
            .update({ 
                total_points: newTotalPoints,
                updated_at: new Date().toISOString()
            })
            .eq('user_id', currentState.userId);
        
        if (updateError) throw updateError;
        
    } catch (error) {
        console.error('Lỗi khi cập nhật điểm:', error);
    }
}

// 보너스 포인트 추가
async function addBonusPoints(points) {
    currentState.earnedPoints += points;
    await updateUserPoints(points);
    updateProgressUI();
}

// 진행 상황 UI 업데이트
function updateProgressUI() {
    document.getElementById('todayReviewed').textContent = currentState.reviewedToday;
    document.getElementById('todayTarget').textContent = currentState.dailyTarget;
    document.getElementById('reviewStreak').textContent = currentState.reviewStreak;
    document.getElementById('earnedPoints').textContent = currentState.earnedPoints;
    
    const progress = Math.min((currentState.reviewedToday / currentState.dailyTarget) * 100, 100);
    document.getElementById('reviewProgressFill').style.width = `${progress}%`;
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

function showEmptyState(message) {
    document.getElementById('emptyState').style.display = 'block';
    document.getElementById('loadingState').style.display = 'none';
    document.getElementById('videoPlayer').style.display = 'none';
    document.getElementById('reviewControls').style.display = 'none';
    
    const emptyStateDiv = document.getElementById('emptyState');
    emptyStateDiv.innerHTML = `
        <div class="empty-icon">🎬</div>
        <h3>${message}</h3>
        <p>Hãy quay lại sau khi có video mới.</p>
        <button class="btn btn-primary" onclick="goBack()">Quay lại trang chính</button>
    `;
}

function showPointsAnimation(points) {
    const animation = document.getElementById('pointsAnimation');
    document.getElementById('animatedPointsValue').textContent = `+${points}`;
    
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

function showVideoError(message) {
    let existingError = document.getElementById('videoErrorMessage');
    if (existingError) {
        existingError.remove();
    }
    
    const errorDiv = document.createElement('div');
    errorDiv.id = 'videoErrorMessage';
    errorDiv.style.cssText = `
        position: fixed;
        bottom: 220px;
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

// 홈으로 돌아가기
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
window.nextVideo = nextVideo;

// 페이지 언로드 시 정리
window.addEventListener('beforeunload', () => {
    if (currentState.integrityCheckInterval) {
        clearInterval(currentState.integrityCheckInterval);
    }
});
