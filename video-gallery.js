// Video Gallery JavaScript

// Supabase 초기화
const { createClient } = supabase;
const supabaseClient = createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey);

// 전역 상태
let galleryState = {
    currentTab: 'all',
    currentPage: 0,
    pageSize: 12,
    videos: [],
    isLoading: false,
    hasMore: true,
    filters: {
        category: '',
        rating: ''
    },
    currentVideo: null,
    userId: null,
    userName: null,
    companyId: null,
    storeId: null,
    userPoints: 0,
    userLevel: 1
};

// URL 파라미터 파싱
function getURLParameters() {
    const params = new URLSearchParams(window.location.search);
    return {
        user_id: params.get('user_id'),
        user_name: params.get('user_name'),
        company_id: params.get('company_id'),
        store_id: params.get('store_id')
    };
}

// 초기화
document.addEventListener('DOMContentLoaded', async () => {
    console.log('Video Gallery 초기화 중...');
    
    // URL 파라미터에서 사용자 정보 가져오기
    const urlParams = getURLParameters();
    galleryState.userId = urlParams.user_id || 'anonymous';
    galleryState.userName = urlParams.user_name || 'Anonymous';
    galleryState.companyId = urlParams.company_id || null;
    galleryState.storeId = urlParams.store_id || null;
    
    // 사용자 통계 로드 - 가장 먼저 실행
    await loadUserStats();
    
    // 초기 데이터 로드
    await loadGalleryStats();
    await loadVideos();
    
    // 평점 이벤트 리스너 설정
    setupRatingListeners();
    
    // 페이지가 포커스를 받을 때마다 사용자 통계 다시 로드
    window.addEventListener('focus', async () => {
        await loadUserStats();
    });
});

// 사용자 통계 로드 - DB에서 최신 데이터 가져오기
async function loadUserStats() {
    try {
        const { data, error } = await supabaseClient
            .from('user_progress')
            .select('*')
            .eq('user_id', galleryState.userId)
            .single();
        
        if (data) {
            galleryState.userPoints = data.total_points;
            galleryState.userLevel = data.current_level;
            
            // UI 업데이트
            document.getElementById('userPoints').textContent = data.total_points;
            document.getElementById('userLevel').textContent = data.current_level;
            
            console.log('Gallery - DB에서 로드한 사용자 통계:', {
                points: data.total_points,
                level: data.current_level
            });
        }
    } catch (error) {
        console.error('사용자 통계 로드 오류:', error);
    }
}

// 갤러리 통계 로드
async function loadGalleryStats() {
    try {
        // 전체 비디오 수
        const { count: totalVideos } = await supabaseClient
            .from('company_video_gallery')
            .select('*', { count: 'exact', head: true })
            .eq('company_id', galleryState.companyId);
        
        // 고유 크리에이터 수
        const { data: creators } = await supabaseClient
            .from('company_video_gallery')
            .select('user_id')
            .eq('company_id', galleryState.companyId);
        
        const uniqueCreators = new Set(creators?.map(c => c.user_id) || []).size;
        
        // 평균 평점
        const { data: avgData } = await supabaseClient
            .from('company_video_gallery')
            .select('avg_rating')
            .eq('company_id', galleryState.companyId)
            .not('avg_rating', 'is', null);
        
        const avgRating = avgData?.length > 0 
            ? (avgData.reduce((sum, v) => sum + v.avg_rating, 0) / avgData.length).toFixed(1)
            : '0';
        
        // 커스텀 아이디어 수
        const { count: customIdeas } = await supabaseClient
            .from('company_video_gallery')
            .select('*', { count: 'exact', head: true })
            .eq('company_id', galleryState.companyId)
            .eq('is_auto_created', false);
        
        // UI 업데이트
        document.getElementById('totalVideos').textContent = totalVideos || 0;
        document.getElementById('totalCreators').textContent = uniqueCreators;
        document.getElementById('avgRating').textContent = avgRating;
        document.getElementById('customIdeas').textContent = customIdeas || 0;
        
    } catch (error) {
        console.error('갤러리 통계 로드 오류:', error);
    }
}

// 비디오 로드
async function loadVideos(reset = true) {
    if (galleryState.isLoading) return;
    
    galleryState.isLoading = true;
    const container = document.getElementById('galleryContainer');
    
    if (reset) {
        galleryState.currentPage = 0;
        galleryState.videos = [];
        galleryState.hasMore = true;
        container.innerHTML = '<div class="loading-spinner"><div class="spinner"></div><p>Đang tải video...</p></div>';
    }
    
    try {
        // 쿼리 빌드
        let query = supabaseClient
            .from('company_video_gallery')
            .select('*')
            .eq('company_id', galleryState.companyId);
        
        // 탭 필터
        switch (galleryState.currentTab) {
            case 'my-videos':
                query = query.eq('user_id', galleryState.userId);
                break;
            case 'popular':
                query = query.order('avg_rating', { ascending: false, nullsFirst: false });
                break;
            case 'recent':
                query = query.order('created_at', { ascending: false });
                break;
            default:
                query = query.order('created_at', { ascending: false });
        }
        
        // 카테고리 필터
        if (galleryState.filters.category) {
            query = query.eq('category', galleryState.filters.category);
        }
        
        // 평점 필터
        if (galleryState.filters.rating) {
            query = query.gte('avg_rating', parseFloat(galleryState.filters.rating));
        }
        
        // 페이지네이션
        const from = galleryState.currentPage * galleryState.pageSize;
        const to = from + galleryState.pageSize - 1;
        
        const { data: videos, error } = await query.range(from, to);
        
        if (error) throw error;
        
        if (videos.length < galleryState.pageSize) {
            galleryState.hasMore = false;
        }
        
        galleryState.videos = reset ? videos : [...galleryState.videos, ...videos];
        
        // UI 업데이트
        displayVideos(reset);
        
        // 로드 더 버튼 표시/숨기기
        const loadMoreContainer = document.getElementById('loadMoreContainer');
        loadMoreContainer.style.display = galleryState.hasMore ? 'block' : 'none';
        
    } catch (error) {
        console.error('비디오 로드 오류:', error);
        showError('Video를 불러오는 중 오류가 발생했습니다.');
    } finally {
        galleryState.isLoading = false;
    }
}

// 비디오 표시
function displayVideos(reset = true) {
    const container = document.getElementById('galleryContainer');
    
    if (reset) {
        container.innerHTML = '';
    }
    
    if (galleryState.videos.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">🎬</div>
                <h3 class="empty-state-title">Chưa có video nào</h3>
                <p class="empty-state-message">Hãy là người đầu tiên tạo và chia sẻ video!</p>
            </div>
        `;
        return;
    }
    
    galleryState.videos.forEach(video => {
        const card = createVideoCard(video);
        container.appendChild(card);
    });
}

// 비디오 카드 생성
function createVideoCard(video) {
    const card = document.createElement('div');
    card.className = 'video-card';
    card.onclick = () => showVideoDetail(video);
    
    const isMyVideo = video.user_id === galleryState.userId;
    const rating = video.avg_rating ? video.avg_rating.toFixed(1) : 'Chưa có';
    const categoryEmoji = getCategoryEmoji(video.category);
    
    card.innerHTML = `
        <div class="video-thumbnail">
            <video src="${video.video_url}" muted></video>
            <div class="video-play-overlay">
                <div class="play-button">▶</div>
            </div>
            ${!video.is_auto_created ? '<div class="custom-badge">💡 Tùy chỉnh</div>' : ''}
            ${isMyVideo ? '<div class="video-badge">Video của bạn</div>' : ''}
        </div>
        <div class="video-info">
            <h3 class="video-title">${video.title}</h3>
            <div class="video-metadata">
                <span class="video-creator">
                    <span>👤</span>
                    <span>${video.user_name || 'Anonymous'}</span>
                </span>
                <span class="video-date">${formatDate(video.created_at)}</span>
            </div>
            <div class="video-stats">
                <div class="video-rating">
                    <span class="rating-stars-mini">${getStarDisplay(video.avg_rating)}</span>
                    <span>${rating}</span>
                    <span>(${video.rating_count || 0})</span>
                </div>
                <div class="video-category">${categoryEmoji} ${video.category}</div>
            </div>
        </div>
    `;
    
    // 호버 시 비디오 미리보기
    const videoEl = card.querySelector('video');
    card.addEventListener('mouseenter', () => {
        videoEl.play().catch(() => {});
    });
    card.addEventListener('mouseleave', () => {
        videoEl.pause();
        videoEl.currentTime = 0;
    });
    
    return card;
}

// 비디오 상세 보기
async function showVideoDetail(video) {
    galleryState.currentVideo = video;
    
    // 모달 열기
    const modal = document.getElementById('videoDetailModal');
    modal.classList.add('show');
    document.body.style.overflow = 'hidden';
    
    // 비디오 정보 표시
    document.getElementById('modalVideo').src = video.video_url;
    document.getElementById('modalVideoTitle').textContent = video.title;
    document.getElementById('modalCreator').textContent = video.user_name || 'Anonymous';
    document.getElementById('modalDate').textContent = formatDate(video.created_at);
    document.getElementById('modalCategory').textContent = video.category;
    document.getElementById('modalDescription').textContent = video.description || 'Không có mô tả';
    
    // 태그 표시
    const tagsContainer = document.getElementById('modalTags');
    if (video.tags && video.tags.length > 0) {
        tagsContainer.innerHTML = video.tags.map(tag => 
            `<span class="tag">#${tag}</span>`
        ).join('');
    } else {
        tagsContainer.innerHTML = '';
    }
    
    // 현재 평점 표시
    updateRatingDisplay(video.avg_rating, video.rating_count);
    
    // 사용자의 기존 평점 확인
    await checkUserRating(video.id);
}

// 비디오 상세 모달 닫기
function closeVideoDetail(event) {
    if (event && event.target !== event.currentTarget) return;
    
    const modal = document.getElementById('videoDetailModal');
    modal.classList.remove('show');
    document.body.style.overflow = '';
    
    // 비디오 정지
    const video = document.getElementById('modalVideo');
    video.pause();
    video.src = '';
    
    galleryState.currentVideo = null;
}

// 사용자 평점 확인
async function checkUserRating(uploadId) {
    try {
        const { data, error } = await supabaseClient
            .from('video_ratings')
            .select('rating')
            .eq('upload_id', uploadId)
            .eq('user_id', galleryState.userId)
            .single();
        
        if (data) {
            // 기존 평점 표시
            updateStarSelection(data.rating);
        } else {
            // 평점 초기화
            updateStarSelection(0);
        }
    } catch (error) {
        console.log('사용자 평점 확인:', error);
        updateStarSelection(0);
    }
}

// 평점 이벤트 리스너 설정
function setupRatingListeners() {
    const stars = document.querySelectorAll('.rating-stars .star');
    
    stars.forEach(star => {
        star.addEventListener('click', async () => {
            const rating = parseInt(star.dataset.rating);
            await submitRating(rating);
        });
        
        star.addEventListener('mouseenter', () => {
            const rating = parseInt(star.dataset.rating);
            highlightStars(rating);
        });
    });
    
    document.querySelector('.rating-stars').addEventListener('mouseleave', () => {
        const currentRating = document.querySelector('.star.active');
        if (currentRating) {
            highlightStars(parseInt(currentRating.dataset.rating));
        } else {
            highlightStars(0);
        }
    });
}

// 별점 하이라이트
function highlightStars(rating) {
    const stars = document.querySelectorAll('.rating-stars .star');
    stars.forEach((star, index) => {
        if (index < rating) {
            star.textContent = '★';
            star.classList.add('filled');
        } else {
            star.textContent = '☆';
            star.classList.remove('filled');
        }
    });
}

// 별점 선택 업데이트
function updateStarSelection(rating) {
    const stars = document.querySelectorAll('.rating-stars .star');
    stars.forEach((star, index) => {
        star.classList.remove('active');
        if (index < rating) {
            star.classList.add('active');
            star.textContent = '★';
        } else {
            star.textContent = '☆';
        }
    });
}

// 평점 제출
async function submitRating(rating) {
    if (!galleryState.currentVideo) return;
    
    try {
        showLoading('Đang gửi đánh giá...');
        
        // 평점 저장 또는 업데이트
        const { error } = await supabaseClient
            .from('video_ratings')
            .upsert({
                upload_id: galleryState.currentVideo.id,
                user_id: galleryState.userId,
                rating: rating,
                rated_at: new Date().toISOString()
            }, {
                onConflict: 'upload_id,user_id'
            });
        
        if (error) throw error;
        
        // 포인트 추가 (첫 평가인 경우)
        const { data: existingRating } = await supabaseClient
            .from('video_ratings')
            .select('id')
            .eq('upload_id', galleryState.currentVideo.id)
            .eq('user_id', galleryState.userId)
            .single();
        
        if (!existingRating) {
            // await addPoints(5); // 평가 포인트 - 잠시 비활성화 (중복 포인트 방지)
        }
        
        // UI 업데이트
        updateStarSelection(rating);
        showSuccess('Đánh giá của bạn đã được ghi nhận!');
        
        // 평균 평점 다시 계산
        await updateVideoRating(galleryState.currentVideo.id);
        
    } catch (error) {
        console.error('평점 제출 오류:', error);
        showError('Không thể gửi đánh giá. Vui lòng thử lại.');
    } finally {
        hideLoading();
    }
}

// 비디오 평점 업데이트
async function updateVideoRating(uploadId) {
    try {
        // 평균 평점 계산
        const { data: ratings } = await supabaseClient
            .from('video_ratings')
            .select('rating')
            .eq('upload_id', uploadId);
        
        if (ratings && ratings.length > 0) {
            const avgRating = ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length;
            const ratingCount = ratings.length;
            
            // content_uploads 테이블 업데이트
            await supabaseClient
                .from('content_uploads')
                .update({
                    avg_rating: avgRating,
                    rating_count: ratingCount
                })
                .eq('id', uploadId);
            
            // UI 업데이트
            updateRatingDisplay(avgRating, ratingCount);
            
            // 갤러리에서도 업데이트
            const videoIndex = galleryState.videos.findIndex(v => v.id === uploadId);
            if (videoIndex !== -1) {
                galleryState.videos[videoIndex].avg_rating = avgRating;
                galleryState.videos[videoIndex].rating_count = ratingCount;
            }
        }
    } catch (error) {
        console.error('평점 업데이트 오류:', error);
    }
}

// 평점 표시 업데이트
function updateRatingDisplay(avgRating, ratingCount) {
    const currentRating = avgRating ? avgRating.toFixed(1) : 'Chưa có';
    document.getElementById('currentRating').textContent = `${currentRating} ${avgRating ? getStarDisplay(avgRating) : ''}`;
    document.getElementById('totalRatings').textContent = ratingCount || 0;
}

// 포인트 추가 - 즉시 DB 업데이트
async function addPoints(points) {
    galleryState.userPoints += points;
    document.getElementById('userPoints').textContent = galleryState.userPoints;
    
    try {
        // Supabase 즉시 업데이트
        const { error } = await supabaseClient
            .from('user_progress')
            .update({ 
                total_points: galleryState.userPoints,
                updated_at: new Date().toISOString()
            })
            .eq('user_id', galleryState.userId);
        
        if (error) throw error;
        
        console.log('Gallery - 포인트 즉시 업데이트:', {
            points: galleryState.userPoints
        });
    } catch (error) {
        console.error('포인트 업데이트 오류:', error);
    }
}

// 탭 전환
function switchGalleryTab(tab) {
    galleryState.currentTab = tab;
    
    // 탭 버튼 활성화 상태 변경
    document.querySelectorAll('.filter-tab').forEach(t => {
        t.classList.remove('active');
    });
    event.target.closest('.filter-tab').classList.add('active');
    
    // 비디오 다시 로드
    loadVideos(true);
}

// 필터 적용
function applyFilters() {
    galleryState.filters.category = document.getElementById('categoryFilter').value;
    galleryState.filters.rating = document.getElementById('ratingFilter').value;
    
    // 비디오 다시 로드
    loadVideos(true);
}

// 더 많은 비디오 로드
function loadMoreVideos() {
    galleryState.currentPage++;
    loadVideos(false);
}

// 비디오 공유
function shareVideo() {
    if (!galleryState.currentVideo) return;
    
    const shareUrl = `${window.location.origin}/video-gallery.html?video=${galleryState.currentVideo.id}`;
    const shareText = `Xem video "${galleryState.currentVideo.title}" trên Contents Helper!`;
    
    if (navigator.share) {
        navigator.share({
            title: galleryState.currentVideo.title,
            text: shareText,
            url: shareUrl
        }).catch(err => console.log('공유 오류:', err));
    } else {
        // 클립보드에 복사
        navigator.clipboard.writeText(shareUrl)
            .then(() => showSuccess('Link đã được sao chép!'))
            .catch(() => showError('Không thể sao chép link'));
    }
}

// 비디오 다운로드
function downloadVideo() {
    if (!galleryState.currentVideo) return;
    
    const link = document.createElement('a');
    link.href = galleryState.currentVideo.video_url;
    link.download = `${galleryState.currentVideo.title}.mp4`;
    link.click();
}

// 유틸리티 함수들
function formatDate(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now - date;
    
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    
    if (minutes < 60) return `${minutes} phút trước`;
    if (hours < 24) return `${hours} giờ trước`;
    if (days < 7) return `${days} ngày trước`;
    
    return date.toLocaleDateString('vi-VN');
}

function getCategoryEmoji(category) {
    const emojis = {
        '일상': '🏠',
        '음식': '🍔',
        '패션': '👗',
        '뷰티': '💄',
        '여행': '✈️',
        '정보': '📌'
    };
    return emojis[category] || '📝';
}

function getStarDisplay(rating) {
    if (!rating) return '☆☆☆☆☆';
    const filled = Math.round(rating);
    return '★'.repeat(filled) + '☆'.repeat(5 - filled);
}

// UI 헬퍼 함수들
function showLoading(message) {
    const overlay = document.getElementById('loadingOverlay');
    const text = overlay.querySelector('.loading-text');
    text.textContent = message || '처리 중...';
    overlay.style.display = 'flex';
}

function hideLoading() {
    document.getElementById('loadingOverlay').style.display = 'none';
}

function showError(message) {
    const toast = document.getElementById('errorToast');
    const messageEl = toast.querySelector('.error-message');
    messageEl.textContent = message;
    toast.style.display = 'flex';
    
    setTimeout(() => {
        toast.style.display = 'none';
    }, 5000);
}

function showSuccess(message) {
    const toast = document.getElementById('successToast');
    const messageEl = toast.querySelector('.success-message');
    messageEl.textContent = message;
    toast.style.display = 'flex';
    
    setTimeout(() => {
        toast.style.display = 'none';
    }, 3000);
}

function closeError() {
    document.getElementById('errorToast').style.display = 'none';
}

// 전역 함수로 내보내기
window.switchGalleryTab = switchGalleryTab;
window.applyFilters = applyFilters;
window.loadMoreVideos = loadMoreVideos;
window.showVideoDetail = showVideoDetail;
window.closeVideoDetail = closeVideoDetail;
window.shareVideo = shareVideo;
window.downloadVideo = downloadVideo;
window.closeError = closeError;