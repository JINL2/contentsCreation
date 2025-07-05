// Supabase 초기화
const { createClient } = supabase;
const supabaseClient = createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey);

// 전역 상태 관리
let currentState = {
    userId: null,
    userName: null,
    companyId: null,
    storeId: null,
    allVideos: [],
    reviewedVideos: [],
    currentVideoIndex: 0,
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
    integrityCheckInterval: null,
    errorVideos: [],
    isLoading: false,
    hasInitialized: false
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
    console.log('🎬 Khởi tạo Video Review v3 Fixed...');
    
    // 중복 초기화 방지
    if (currentState.hasInitialized) {
        console.warn('⚠️ Video Review đã được khởi tạo!');
        return;
    }
    currentState.hasInitialized = true;
    
    // 플로팅 버튼 초기 숨김
    const floatingBtn = document.getElementById('floatingNextBtn');
    if (floatingBtn) {
        floatingBtn.classList.remove('show');
        floatingBtn.style.display = 'none';
    }
    
    // 사용자 정보 설정
    const urlParams = getURLParameters();
    currentState.userId = urlParams.user_id;
    currentState.userName = urlParams.user_name || 'Ẩn danh';
    currentState.companyId = urlParams.company_id;
    currentState.storeId = urlParams.store_id;
    
    if (!currentState.userId) {
        showError('❌ Không tìm thấy thông tin người dùng.');
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 2000);
        return;
    }
    
    console.log('👤 Người dùng:', currentState.userName);
    console.log('🏢 Công ty ID:', currentState.companyId);
    console.log('🔑 User ID:', currentState.userId);
    
    // 하단 컨트롤 영역 표시
    const bottomControls = document.getElementById('bottomControls');
    if (bottomControls) {
        bottomControls.style.display = 'block';
    }
    
    // 진행 상황 로드
    await loadTodayProgress();
    
    // 별점 이벤트 리스너
    setupStarRating();
    
    // 무결성 체크 시작
    startIntegrityCheck();
    
    // 모든 비디오 로드
    await loadAllVideos();
});

// 음소거 해제 버튼 표시 함수 추가
function showUnmuteButton() {
    // 기존 버튼이 있으면 제거
    let existingBtn = document.getElementById('unmuteButton');
    if (existingBtn) {
        existingBtn.remove();
    }
    
    // 음소거 해제 버튼 생성
    const unmuteBtn = document.createElement('button');
    unmuteBtn.id = 'unmuteButton';
    unmuteBtn.innerHTML = '🔊 Bật âm thanh';
    unmuteBtn.style.cssText = `
        position: fixed;
        bottom: 150px;
        left: 50%;
        transform: translateX(-50%);
        background: #ff6b35;
        color: white;
        border: none;
        padding: 12px 24px;
        border-radius: 25px;
        font-size: 16px;
        font-weight: bold;
        cursor: pointer;
        z-index: 1001;
        box-shadow: 0 4px 12px rgba(255, 107, 53, 0.3);
        transition: all 0.3s ease;
    `;
    
    unmuteBtn.onclick = function() {
        const videoElement = document.getElementById('reviewVideo');
        if (videoElement) {
            videoElement.muted = false;
            videoElement.volume = 1.0;
            console.log('🔊 Âm thanh được bật');
            this.remove();
            showSuccess('Âm thanh đã được bật!');
        }
    };
    
    unmuteBtn.onmouseover = function() {
        this.style.transform = 'translateX(-50%) scale(1.05)';
        this.style.boxShadow = '0 6px 16px rgba(255, 107, 53, 0.4)';
    };
    
    unmuteBtn.onmouseout = function() {
        this.style.transform = 'translateX(-50%) scale(1)';
        this.style.boxShadow = '0 4px 12px rgba(255, 107, 53, 0.3)';
    };
    
    document.body.appendChild(unmuteBtn);
}

// 오늘 평가 진행 상황 로드
async function loadTodayProgress() {
    try {
        const today = new Date().toISOString().split('T')[0];
        
        // reviewer_id로 직접 필터링
        const { count, error } = await supabaseClient
            .from('video_reviews')
            .select('*', { count: 'exact', head: true })
            .eq('reviewer_id', currentState.userId)
            .gte('created_at', today + 'T00:00:00')
            .lte('created_at', today + 'T23:59:59');
        
        if (error && error.code !== 'PGRST116') {
            console.error('❌ Lỗi khi tải tiến độ:', error);
        }
        
        currentState.reviewedToday = count || 0;
        updateProgressUI();
        
        console.log(`📊 Hôm nay đã đánh giá: ${currentState.reviewedToday} video`);
        
    } catch (error) {
        console.error('❌ Lỗi khi tải tiến độ:', error);
    }
}

// 모든 비디오 로드
async function loadAllVideos() {
    if (currentState.isLoading) {
        console.warn('⚠️ Đang tải video, vui lòng đợi...');
        return;
    }
    
    currentState.isLoading = true;
    showLoadingState();
    
    try {
        // 비디오 로드
        const { data: videos, error } = await supabaseClient
            .from('content_uploads')
            .select('*')
            .eq('status', 'uploaded')
            .eq('company_id', currentState.companyId)
            .order('created_at', { ascending: false })
            .limit(100);
        
        if (error) throw error;
        
        if (!videos || videos.length === 0) {
            showEmptyState('Không có video nào trong công ty');
            return;
        }
        
        console.log(`📹 Tìm thấy ${videos.length} video`);
        
        // 이미 평가한 비디오 목록
        const reviewedIds = await getReviewedVideos();
        currentState.reviewedVideos = reviewedIds;
        
        console.log('📝 Danh sách video đã đánh giá:', reviewedIds);
        
        // 비디오 분류
        const unreviewedVideos = videos.filter(v => !reviewedIds.includes(v.id));
        const reviewedVideosData = videos.filter(v => reviewedIds.includes(v.id));
        
        // 각 그룹 내에서 최신순(created_at DESC)으로 정렬
        unreviewedVideos.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        reviewedVideosData.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        
        // 평가되지 않은 비디오를 먼저 (최신순), 평가된 비디오를 나중에 (최신순)
        currentState.allVideos = [...unreviewedVideos, ...reviewedVideosData];
        
        console.log(`✅ Chưa đánh giá: ${unreviewedVideos.length}`);
        console.log(`☑️ Đã đánh giá: ${reviewedVideosData.length}`);
        
        if (currentState.allVideos.length === 0) {
            showEmptyState('Không có video nào để hiển thị');
            return;
        }
        
        // 첫 번째 비디오 표시
        displayCurrentVideo();
        
    } catch (error) {
        console.error('❌ Lỗi khi tải video:', error);
        showError('Không thể tải video. Vui lòng thử lại sau.');
    } finally {
        currentState.isLoading = false;
    }
}

// 이미 평가한 비디오 ID 목록 - 수정된 버전
async function getReviewedVideos() {
    try {
        // reviewer_id로 직접 필터링
        const { data, error } = await supabaseClient
            .from('video_reviews')
            .select('video_id')
            .eq('reviewer_id', currentState.userId);
        
        if (error && error.code !== 'PGRST116') {
            console.error('❌ Lỗi truy vấn video_reviews:', error);
            return [];
        }
        
        if (!data) return [];
        
        const reviewedIds = data.map(r => r.video_id);
        console.log(`🎯 User ${currentState.userId} đã đánh giá ${reviewedIds.length} video`);
        
        return reviewedIds;
        
    } catch (error) {
        console.error('❌ Lỗi khi lấy danh sách đánh giá:', error);
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
    
    console.log(`📺 Hiển thị video: ${currentState.currentVideo.title} (ID: ${currentState.currentVideo.id})`);
    console.log(`✅ Đã đánh giá: ${isReviewed}`);
    
    displayVideo(currentState.currentVideo, isReviewed);
}

// 비디오 표시
function displayVideo(video, isReviewed) {
    hideLoadingState();
    
    const videoElement = document.getElementById('reviewVideo');
    const playerDiv = document.getElementById('videoPlayer');
    
    // 상태 초기화
    currentState.videoCanPlay = false;
    currentState.actualWatchTime = 0;
    currentState.lastRating = null;
    
    // UI 표시
    playerDiv.style.display = 'block';
    
    // 평가된 비디오 처리
    if (isReviewed) {
        // 글로벌 함수 호출
        if (typeof window.showReviewedVideoUI === 'function') {
            window.showReviewedVideoUI();
        }
    } else {
        // 미평가 비디오 UI 복원
        if (typeof window.showUnreviewedVideoUI === 'function') {
            window.showUnreviewedVideoUI();
        }
        
        // 초기 비활성화
        disableRating();
    }
    
    // 비디오 설정
    videoElement.crossOrigin = 'anonymous';
    videoElement.src = video.video_url;
    videoElement.volume = 1.0; // 볼륨을 최대로 설정
    
    // 비디오 클릭 이벤트 추가
    videoElement.onclick = function() {
        if (this.muted) {
            this.muted = false;
            this.volume = 1.0;
            console.log('🔊 Âm thanh được bật bằng cách nhấp vào video');
            
            // 음소거 해제 버튼 제거
            const unmuteBtn = document.getElementById('unmuteButton');
            if (unmuteBtn) {
                unmuteBtn.remove();
            }
            showSuccess('Âm thanh đã được bật!');
        }
    };
    
    // 이벤트 리스너 초기화
    videoElement.onloadedmetadata = null;
    videoElement.oncanplay = null;
    videoElement.onplay = null;
    videoElement.onerror = null;
    videoElement.ontimeupdate = null;
    videoElement.onloadstart = null;
    videoElement.onprogress = null;
    
    // 미평가 비디오만 이벤트 추가
    if (!isReviewed) {
        // 로드 시작
        videoElement.onloadstart = () => {
            console.log('🔄 Bắt đầu tải video...');
        };
        
        // 로드 진행
        videoElement.onprogress = () => {
            console.log('📊 Đang tải video...');
        };
        
        // 재생 가능
        videoElement.oncanplay = () => {
            console.log('✅ Video sẵn sàng phát');
            currentState.videoCanPlay = true;
            
            // 먼저 음소거 없이 자동 재생 시도
            videoElement.muted = false;
            
            const playPromise = videoElement.play();
            
            if (playPromise !== undefined) {
                playPromise
                    .then(() => {
                        console.log('▶️ Tự động phát thành công với âm thanh');
                        // 성공적으로 재생되면 추가 작업 필요 없음
                    })
                    .catch(error => {
                        console.log('🔇 Âm thanh bị chặn, thử lại với âm lượng tắt...');
                        
                        // 음소거하고 재생
                        videoElement.muted = true;
                        videoElement.play()
                            .then(() => {
                                console.log('🔇 Video đang phát ở chế độ tắt tiếng');
                                
                                // 0.5초 후 비디오 일시정지하고 음소거 해제 버튼 표시
                                setTimeout(() => {
                                    videoElement.pause();
                                    console.log('⏸️ Video tạm dừng để bật âm thanh');
                                    
                                    // 음소거 해제 버튼 표시
                                    showUnmuteButton();
                                    
                                    // 버튼 클릭 시 재생 재개
                                    const originalOnclick = document.getElementById('unmuteButton').onclick;
                                    document.getElementById('unmuteButton').onclick = function() {
                                        const video = document.getElementById('reviewVideo');
                                        if (video) {
                                            video.muted = false;
                                            video.volume = 1.0;
                                            video.play();
                                            console.log('🔊 Âm thanh được bật và video tiếp tục phát');
                                            this.remove();
                                            showSuccess('Âm thanh đã được bật!');
                                        }
                                    };
                                }, 500);
                            })
                            .catch(error => {
                                console.error('❌ Không thể phát video:', error);
                                showVideoError('Không thể phát video. Vui lòng nhấn play.');
                            });
                    });
            }
        };
        
        // 시간 업데이트
        videoElement.ontimeupdate = () => {
            if (videoElement.currentTime > 0) {
                currentState.actualWatchTime = videoElement.currentTime;
                
                // 3초 이상 시청 시 평가 활성화
                if (currentState.actualWatchTime >= currentState.minWatchTime && currentState.videoCanPlay) {
                    enableRating();
                }
            }
        };
        
        // 에러 처리
        videoElement.onerror = (e) => {
            console.error('❌ Lỗi video:', e);
            
            // 에러 비디오 추가
            if (currentState.currentVideo && !currentState.errorVideos.includes(currentState.currentVideo.id)) {
                currentState.errorVideos.push(currentState.currentVideo.id);
            }
            
            const errorMessage = getVideoErrorMessage(videoElement.error);
            showVideoError(errorMessage);
            
            // UI 숨기고 다음 비디오
            playerDiv.style.display = 'none';
            const bottomControls = document.getElementById('bottomControls');
            if (bottomControls) {
                bottomControls.style.display = 'none';
            }
            showLoadingState();
            
            setTimeout(() => {
                hideLoadingState();
                nextVideo();
            }, 2000);
        };
    }
    
    // 비디오 로드
    videoElement.load();
    
    // 타임아웃 설정 (15초)
    const loadTimeout = setTimeout(() => {
        if (!currentState.videoCanPlay && !isReviewed) {
            console.log('⏱️ Video tải quá lâu');
            showVideoError('Video tải quá lâu. Chuyển sang video khác...');
            nextVideo();
        }
    }, 15000);
    
    // 재생 가능 시 타임아웃 취소
    const originalOnCanPlay = videoElement.oncanplay;
    videoElement.oncanplay = function() {
        clearTimeout(loadTimeout);
        if (originalOnCanPlay) originalOnCanPlay.call(this);
    };
    
    // 비디오 정보 표시 제거 - 영상만 표시
    
    // 진행 상황 업데이트
    updateVideoProgress();
}

// 비디오 에러 메시지 생성
function getVideoErrorMessage(error) {
    if (!error) return 'Video không thể phát';
    
    switch (error.code) {
        case 1: // MEDIA_ERR_ABORTED
            return 'Tải video bị hủy';
        case 2: // MEDIA_ERR_NETWORK
            return 'Lỗi mạng khi tải video';
        case 3: // MEDIA_ERR_DECODE
            return 'Video không thể giải mã';
        case 4: // MEDIA_ERR_SRC_NOT_SUPPORTED
            return 'Định dạng video không được hỗ trợ';
        default:
            return 'Video không thể phát do lỗi CORS hoặc kết nối';
    }
}

// 비디오 진행 상황 업데이트
function updateVideoProgress() {
    const progressInfo = document.querySelector('.progress-info');
    const totalVideos = currentState.allVideos.length;
    const currentPosition = currentState.currentVideoIndex + 1;
    const unreviewedCount = currentState.allVideos.filter(v => !currentState.reviewedVideos.includes(v.id)).length;
    
    progressInfo.innerHTML = `
        <span class="progress-text">
            Video ${currentPosition}/${totalVideos} 
            (còn ${unreviewedCount} chưa đánh giá)
        </span>
        <span class="streak-info">🔥 ${currentState.reviewStreak}</span>
    `;
}

// 다음 비디오
function nextVideo() {
    currentState.currentVideoIndex++;
    
    // 비디오 정지
    const videoElement = document.getElementById('reviewVideo');
    if (videoElement) {
        videoElement.pause();
        videoElement.src = '';
    }
    
    // 별점 초기화
    resetStarRating();
    
    // 플로팅 버튼 숨김
    const floatingBtn = document.getElementById('floatingNextBtn');
    if (floatingBtn) {
        floatingBtn.classList.remove('show');
    }
    
    // 음소거 해제 버튼 제거
    const unmuteBtn = document.getElementById('unmuteButton');
    if (unmuteBtn) {
        unmuteBtn.remove();
    }
    
    // 다음 비디오 표시
    displayCurrentVideo();
}

// 무결성 체크
function startIntegrityCheck() {
    currentState.integrityCheckInterval = setInterval(() => {
        const videoElement = document.getElementById('reviewVideo');
        const stars = document.querySelectorAll('.star');
        
        if (!currentState.currentVideo) return;
        
        const isReviewed = currentState.reviewedVideos.includes(currentState.currentVideo.id);
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

// 평가 활성화/비활성화
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
    
    const title = document.querySelector('.rating-title');
    if (title) {
        title.textContent = 'Bạn có thể đánh giá video!';
    }
}

// 별점 설정
function setupStarRating() {
    const stars = document.querySelectorAll('.star');
    
    // 기존 이벤트 제거
    stars.forEach(star => {
        star.replaceWith(star.cloneNode(true));
    });
    
    // 새 이벤트 추가
    document.querySelectorAll('.star').forEach(star => {
        star.addEventListener('click', async function(e) {
            const videoElement = document.getElementById('reviewVideo');
            
            if (!currentState.videoCanPlay || videoElement.currentTime < currentState.minWatchTime) {
                showError(`❌ Bạn phải xem ít nhất ${currentState.minWatchTime} giây để đánh giá!`);
                return;
            }
            
            const rating = parseInt(this.dataset.rating);
            await selectRating(rating);
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
    const saved = await saveReview('rate', rating, null);
    
    if (saved) {
        // 포인트 애니메이션
        showPointsAnimation(5);
        
        // 연속 평가 체크
        currentState.reviewStreak++;
        if (currentState.reviewStreak % 5 === 0) {
            showStreakAnimation();
            await addBonusPoints(20);
        }
        
        // 평가 완료 목록에 추가
        if (!currentState.reviewedVideos.includes(currentState.currentVideo.id)) {
            currentState.reviewedVideos.push(currentState.currentVideo.id);
        }
        
        // 플로팅 다음 버튼 표시
        const floatingBtn = document.getElementById('floatingNextBtn');
        if (floatingBtn) {
            floatingBtn.style.display = 'flex';
            setTimeout(() => {
                floatingBtn.classList.add('show');
            }, 100);
        }
        
        // 별점 컨테이너 숨김
        const starContainer = document.getElementById('starRatingContainer');
        if (starContainer) {
            starContainer.style.display = 'none';
        }
        
        // 다음 비디오 안내 표시
        const reviewedContainer = document.getElementById('alreadyReviewedContainer');
        if (reviewedContainer) {
            reviewedContainer.innerHTML = `
                <p class="already-reviewed-message">✓ Đánh giá hoàn tất! Bấm nút bên dưới để xem video tiếp theo</p>
            `;
            reviewedContainer.style.display = 'block';
        }
    }
    
    // 다음 비디오 - 자동으로 넘어가지 않음
    setTimeout(() => {
        player.classList.remove('fade-out');
    }, 1000);
}

// 리뷰 저장
async function saveReview(action, rating, comment) {
    if (!currentState.currentVideo) return false;
    
    try {
        // 중복 확인 - reviewer_id로 직접 확인
        const { data: existingReview, error: checkError } = await supabaseClient
            .from('video_reviews')
            .select('id')
            .eq('video_id', currentState.currentVideo.id)
            .eq('reviewer_id', currentState.userId)
            .single();
        
        if (existingReview) {
            console.log('⚠️ Video đã được đánh giá bởi user này');
            showError('Bạn đã đánh giá video này!');
            return false;
        }
        
        const videoElement = document.getElementById('reviewVideo');
        
        const reviewData = {
            video_id: currentState.currentVideo.id,
            reviewer_id: currentState.userId, // 실제 사용자 ID 사용
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
        
        console.log('💾 Lưu đánh giá:', reviewData);
        
        const { error } = await supabaseClient
            .from('video_reviews')
            .insert([reviewData]);
        
        if (error) {
            if (error.code === '23505') {
                showError('Bạn đã đánh giá video này!');
                return false;
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
        
        return true;
        
    } catch (error) {
        console.error('❌ Lỗi khi lưu đánh giá:', error);
        showError('Không thể lưu đánh giá. Vui lòng thử lại.');
        return false;
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
        
        if (fetchError && fetchError.code !== 'PGRST116') throw fetchError;
        
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
        console.error('❌ Lỗi khi cập nhật điểm:', error);
    }
}

// 보너스 포인트
async function addBonusPoints(points) {
    currentState.earnedPoints += points;
    await updateUserPoints(points);
    updateProgressUI();
}

// UI 업데이트
function updateProgressUI() {
    // DOM 요소 존재 확인
    const todayReviewedEl = document.getElementById('todayReviewed');
    const todayTargetEl = document.getElementById('todayTarget');
    const reviewStreakEl = document.getElementById('reviewStreak');
    const earnedPointsEl = document.getElementById('earnedPoints');
    const reviewProgressFillEl = document.getElementById('reviewProgressFill');
    
    if (todayReviewedEl) todayReviewedEl.textContent = currentState.reviewedToday;
    if (todayTargetEl) todayTargetEl.textContent = currentState.dailyTarget;
    if (reviewStreakEl) reviewStreakEl.textContent = currentState.reviewStreak;
    if (earnedPointsEl) earnedPointsEl.textContent = currentState.earnedPoints;
    
    if (reviewProgressFillEl) {
        const progress = Math.min((currentState.reviewedToday / currentState.dailyTarget) * 100, 100);
        reviewProgressFillEl.style.width = `${progress}%`;
    }
}

// UI 헬퍼 함수들
function showLoadingState() {
    document.getElementById('loadingState').style.display = 'block';
    document.getElementById('videoPlayer').style.display = 'none';
    document.getElementById('emptyState').style.display = 'none';
}

function hideLoadingState() {
    document.getElementById('loadingState').style.display = 'none';
}

function showEmptyState(message) {
    document.getElementById('emptyState').style.display = 'block';
    document.getElementById('loadingState').style.display = 'none';
    document.getElementById('videoPlayer').style.display = 'none';
    
    const emptyStateDiv = document.getElementById('emptyState');
    emptyStateDiv.innerHTML = `
        <div class="empty-icon">🎬</div>
        <h3>${message}</h3>
        <p>Hãy quay lại sau khi có video mới.</p>
        <div style="margin-top: 1rem;">
            <button class="btn btn-primary" onclick="goBack()">Quay lại trang chính</button>
        </div>
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

// 전역 함수
window.goBack = goBack;
window.nextVideo = nextVideo;

// 페이지 언로드 시 정리
window.addEventListener('beforeunload', () => {
    if (currentState.integrityCheckInterval) {
        clearInterval(currentState.integrityCheckInterval);
    }
});

// CSS 애니메이션 추가
if (!document.getElementById('videoReviewAnimations')) {
    const style = document.createElement('style');
    style.id = 'videoReviewAnimations';
    style.textContent = `
        @keyframes slideUp {
            from {
                transform: translateX(-50%) translateY(20px);
                opacity: 0;
            }
            to {
                transform: translateX(-50%) translateY(0);
                opacity: 1;
            }
        }
        
        @keyframes slideDown {
            from {
                transform: translateX(-50%) translateY(0);
                opacity: 1;
            }
            to {
                transform: translateX(-50%) translateY(20px);
                opacity: 0;
            }
        }
        
        .fade-out {
            animation: fadeOut 0.5s ease-out forwards;
        }
        
        @keyframes fadeOut {
            from {
                opacity: 1;
            }
            to {
                opacity: 0;
            }
        }
        
        .already-reviewed-message {
            text-align: center;
            color: #fff;
            padding: 2rem;
        }
    `;
    document.head.appendChild(style);
}

console.log('✅ Video Review v3 Fixed loaded successfully!');