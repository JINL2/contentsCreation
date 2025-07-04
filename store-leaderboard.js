// 스토어별 리더보드 기능

// 스토어별 리더보드 모달 표시
async function showStoreLeaderboardModal() {
    // 모달이 없으면 생성
    if (!document.getElementById('storeLeaderboardModal')) {
        const modalHTML = `
            <div class="modal-overlay" id="storeLeaderboardModal" onclick="closeStoreLeaderboardModal(event)">
                <div class="modal-content store-leaderboard-modal" onclick="event.stopPropagation()">
                    <div class="modal-header">
                        <h3>🏆 Bảng xếp hạng cửa hàng</h3>
                        <button class="modal-close" onclick="closeStoreLeaderboardModal()">×</button>
                    </div>
                    <div class="leaderboard-tabs">
                        <button class="leaderboard-tab active" onclick="switchLeaderboardPeriod('today')">
                            <span class="tab-icon">📅</span>
                            <span class="tab-text">Hôm nay</span>
                        </button>
                        <button class="leaderboard-tab" onclick="switchLeaderboardPeriod('week')">
                            <span class="tab-icon">📆</span>
                            <span class="tab-text">Tuần này</span>
                        </button>
                        <button class="leaderboard-tab" onclick="switchLeaderboardPeriod('month')">
                            <span class="tab-icon">📊</span>
                            <span class="tab-text">Tháng này</span>
                        </button>
                    </div>
                    <div class="leaderboard-content">
                        <div id="leaderboard-loading" class="loading-spinner" style="display: none;">
                            <div class="spinner"></div>
                            <p>Đang tải dữ liệu...</p>
                        </div>
                        <div id="leaderboard-list" class="store-leaderboard-list">
                            <!-- 동적으로 채워질 내용 -->
                        </div>
                    </div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHTML);
    }
    
    document.getElementById('storeLeaderboardModal').classList.add('show');
    document.body.style.overflow = 'hidden';
    
    // 기본 오늘 데이터 로드
    await loadStoreLeaderboard('today');
}

// 스토어별 리더보드 모달 닫기
function closeStoreLeaderboardModal(event) {
    if (event && event.target !== event.currentTarget) return;
    
    document.getElementById('storeLeaderboardModal').classList.remove('show');
    document.body.style.overflow = '';
}

// 리더보드 기간 전환
async function switchLeaderboardPeriod(period) {
    // 탭 활성화 상태 변경
    document.querySelectorAll('.leaderboard-tab').forEach(tab => {
        tab.classList.remove('active');
    });
    event.target.closest('.leaderboard-tab').classList.add('active');
    
    // 데이터 로드
    await loadStoreLeaderboard(period);
}

// 스토어별 리더보드 데이터 로드
async function loadStoreLeaderboard(period) {
    const listElement = document.getElementById('leaderboard-list');
    const loadingElement = document.getElementById('leaderboard-loading');
    
    // 로딩 표시
    loadingElement.style.display = 'flex';
    listElement.innerHTML = '';
    
    try {
        if (!currentState.companyId) {
            listElement.innerHTML = '<p class="no-content">Bạn không thuộc công ty nào</p>';
            return;
        }
        
        // 기간별 날짜 계산
        const now = new Date();
        let startDate;
        
        switch (period) {
            case 'today':
                startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                break;
            case 'week':
                const weekAgo = new Date(now);
                weekAgo.setDate(weekAgo.getDate() - 7);
                startDate = weekAgo;
                break;
            case 'month':
                startDate = new Date(now.getFullYear(), now.getMonth(), 1);
                break;
            default:
                startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        }
        
        // 회사의 모든 스토어 정보 가져오기
        const { data: stores, error: storesError } = await supabaseClient
            .from('user_progress')
            .select('store_id')
            .eq('company_id', currentState.companyId)
            .not('store_id', 'is', null);
        
        if (storesError) throw storesError;
        
        // 중복 제거하여 유니크한 store_id 목록 만들기
        const uniqueStoreIds = [...new Set(stores.map(s => s.store_id))];
        
        // 각 스토어별 통계 계산
        const storeStats = [];
        
        for (const storeId of uniqueStoreIds) {
            // 해당 기간의 비디오 업로드 수 계산
            const { data: uploads, error: uploadsError } = await supabaseClient
                .from('content_uploads')
                .select('id, points_earned, created_at')
                .eq('store_id', storeId)
                .gte('created_at', startDate.toISOString());
            
            if (uploadsError) continue;
            
            // 활성 사용자 수 계산 (해당 기간에 활동한 사용자)
            const { data: activeUsers, error: activeUsersError } = await supabaseClient
                .from('user_activities')
                .select('user_id')
                .eq('store_id', storeId)
                .gte('created_at', startDate.toISOString());
            
            const uniqueActiveUsers = activeUsersError ? [] : [...new Set(activeUsers.map(u => u.user_id))];
            
            // 총 포인트 계산
            const totalPoints = uploads.reduce((sum, upload) => sum + (upload.points_earned || 0), 0);
            
            storeStats.push({
                store_id: storeId,
                video_count: uploads.length,
                total_points: totalPoints,
                active_users: uniqueActiveUsers.length,
                avg_videos_per_user: uniqueActiveUsers.length > 0 ? 
                    (uploads.length / uniqueActiveUsers.length).toFixed(1) : 0
            });
        }
        
        // 비디오 개수 기준으로 정렬 (내림차순)
        storeStats.sort((a, b) => b.video_count - a.video_count);
        
        // 랭킹 부여
        storeStats.forEach((store, index) => {
            store.rank = index + 1;
            store.is_current = store.store_id === currentState.storeId;
        });
        
        // HTML 생성
        if (storeStats.length === 0) {
            listElement.innerHTML = '<p class="no-content">Chưa có dữ liệu trong khoảng thời gian này</p>';
            return;
        }
        
        // TOP 3 특별 표시
        const top3 = storeStats.slice(0, 3);
        const rest = storeStats.slice(3);
        
        let html = '';
        
        if (top3.length > 0) {
            html += '<div class="top-stores">';
            html += top3.map((store, index) => {
                const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉';
                const storeDisplay = store.store_id.substring(0, 8) + '...';
                
                return `
                    <div class="top-store-card ${store.is_current ? 'current-store' : ''}">
                        <div class="store-rank">${medal}</div>
                        <div class="store-info">
                            <div class="store-name">Store: ${storeDisplay}</div>
                            ${store.is_current ? '<span class="current-badge">(Cửa hàng của bạn)</span>' : ''}
                        </div>
                        <div class="store-stats">
                            <div class="stat-item primary">
                                <div class="stat-value">${store.video_count}</div>
                                <div class="stat-label">Video</div>
                            </div>
                            <div class="stat-item">
                                <div class="stat-value">${store.total_points}</div>
                                <div class="stat-label">Điểm</div>
                            </div>
                            <div class="stat-item">
                                <div class="stat-value">${store.active_users}</div>
                                <div class="stat-label">Người</div>
                            </div>
                        </div>
                    </div>
                `;
            }).join('');
            html += '</div>';
        }
        
        // 나머지 순위
        if (rest.length > 0) {
            html += '<div class="store-ranking-list">';
            html += rest.map(store => {
                const storeDisplay = store.store_id.substring(0, 8) + '...';
                
                return `
                    <div class="store-ranking-item ${store.is_current ? 'current-store' : ''}">
                        <div class="rank-number">${store.rank}</div>
                        <div class="store-details">
                            <div class="store-name">
                                Store: ${storeDisplay}
                                ${store.is_current ? '<span class="current-badge">(Cửa hàng của bạn)</span>' : ''}
                            </div>
                            <div class="store-metrics">
                                <span class="metric">📹 ${store.video_count} video</span>
                                <span class="metric">⭐ ${store.total_points} điểm</span>
                                <span class="metric">👥 ${store.active_users} người</span>
                                <span class="metric">📊 TB: ${store.avg_videos_per_user} video/người</span>
                            </div>
                        </div>
                    </div>
                `;
            }).join('');
            html += '</div>';
        }
        
        // 현재 스토어가 리스트에 없으면 맨 아래 추가
        const currentStoreInList = storeStats.find(s => s.is_current);
        if (!currentStoreInList) {
            // 현재 스토어 통계 계산
            const { data: currentUploads } = await supabaseClient
                .from('content_uploads')
                .select('id')
                .eq('store_id', currentState.storeId)
                .gte('created_at', startDate.toISOString());
            
            const videoCount = currentUploads?.length || 0;
            const storeDisplay = currentState.storeId.substring(0, 8) + '...';
            
            html += `
                <div style="margin-top: 1rem; padding-top: 1rem; border-top: 2px dashed var(--border-color);">
                    <p style="text-align: center; color: var(--text-secondary); margin-bottom: 1rem;">
                        Cửa hàng của bạn
                    </p>
                    <div class="store-ranking-item current-store">
                        <div class="rank-number">-</div>
                        <div class="store-details">
                            <div class="store-name">
                                Store: ${storeDisplay}
                                <span class="current-badge">(Cửa hàng của bạn)</span>
                            </div>
                            <div class="store-metrics">
                                <span class="metric">📹 ${videoCount} video</span>
                                <span class="metric">Chưa có thứ hạng</span>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }
        
        listElement.innerHTML = html;
        
    } catch (error) {
        console.error('Lỗi khi tải dữ liệu leaderboard:', error);
        listElement.innerHTML = '<p class="error-message">Đã xảy ra lỗi khi tải dữ liệu</p>';
    } finally {
        loadingElement.style.display = 'none';
    }
}

// CSS cho store leaderboard
const storeLeaderboardStyles = `
<style>
.store-leaderboard-modal {
    max-width: 600px;
    max-height: 85vh;
    overflow-y: auto;
}

.leaderboard-tabs {
    display: flex;
    gap: 0.5rem;
    margin-bottom: 1.5rem;
    border-bottom: 2px solid var(--border-color);
}

.leaderboard-tab {
    flex: 1;
    padding: 0.75rem 1rem;
    background: none;
    border: none;
    border-bottom: 3px solid transparent;
    cursor: pointer;
    transition: all 0.3s;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    color: var(--text-secondary);
}

.leaderboard-tab:hover {
    background: var(--background-color);
}

.leaderboard-tab.active {
    color: var(--primary-color);
    border-bottom-color: var(--primary-color);
}

.leaderboard-content {
    position: relative;
    min-height: 300px;
}

.top-stores {
    display: grid;
    gap: 1rem;
    margin-bottom: 1.5rem;
}

.top-store-card {
    background: var(--background-color);
    border: 2px solid var(--border-color);
    border-radius: 12px;
    padding: 1.5rem;
    position: relative;
    transition: all 0.3s;
}

.top-store-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.top-store-card.current-store {
    border-color: var(--primary-color);
    background: linear-gradient(to right, rgba(255, 107, 53, 0.05), rgba(255, 107, 53, 0.02));
}

.store-rank {
    font-size: 2rem;
    margin-bottom: 0.5rem;
}

.store-info {
    margin-bottom: 1rem;
}

.store-name {
    font-weight: 600;
    font-size: 1.1rem;
    color: var(--text-primary);
}

.current-badge {
    display: inline-block;
    background: var(--primary-color);
    color: white;
    padding: 0.2rem 0.5rem;
    border-radius: 4px;
    font-size: 0.75rem;
    margin-left: 0.5rem;
}

.store-stats {
    display: flex;
    gap: 1.5rem;
    justify-content: space-around;
}

.stat-item {
    text-align: center;
}

.stat-item.primary .stat-value {
    color: var(--primary-color);
    font-size: 2rem;
    font-weight: 700;
}

.stat-value {
    font-size: 1.5rem;
    font-weight: 600;
    color: var(--text-primary);
}

.stat-label {
    font-size: 0.875rem;
    color: var(--text-secondary);
    margin-top: 0.25rem;
}

.store-ranking-list {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    max-height: 400px;
    overflow-y: auto;
}

.store-ranking-item {
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 1rem;
    background: var(--background-color);
    border: 1px solid var(--border-color);
    border-radius: 8px;
    transition: all 0.3s;
}

.store-ranking-item:hover {
    background: var(--hover-background);
}

.store-ranking-item.current-store {
    border-color: var(--primary-color);
    background: linear-gradient(to right, rgba(255, 107, 53, 0.05), rgba(255, 107, 53, 0.02));
}

.rank-number {
    font-size: 1.25rem;
    font-weight: 600;
    color: var(--text-secondary);
    min-width: 40px;
    text-align: center;
}

.store-details {
    flex: 1;
}

.store-metrics {
    display: flex;
    gap: 1rem;
    margin-top: 0.5rem;
    flex-wrap: wrap;
}

.metric {
    font-size: 0.875rem;
    color: var(--text-secondary);
}

.no-content {
    text-align: center;
    color: var(--text-secondary);
    padding: 3rem;
}

.error-message {
    text-align: center;
    color: #e74c3c;
    padding: 2rem;
}

/* 모바일 최적화 */
@media (max-width: 768px) {
    .store-leaderboard-modal {
        max-width: 100%;
        max-height: 90vh;
    }
    
    .store-stats {
        gap: 1rem;
    }
    
    .stat-item.primary .stat-value {
        font-size: 1.5rem;
    }
    
    .stat-value {
        font-size: 1.25rem;
    }
    
    .store-metrics {
        font-size: 0.75rem;
    }
}
</style>
`;

// 스타일 추가
if (!document.getElementById('storeLeaderboardStyles')) {
    const styleElement = document.createElement('div');
    styleElement.id = 'storeLeaderboardStyles';
    styleElement.innerHTML = storeLeaderboardStyles;
    document.head.appendChild(styleElement);
}

// 전역 함수로 내보내기
window.showStoreLeaderboardModal = showStoreLeaderboardModal;
window.closeStoreLeaderboardModal = closeStoreLeaderboardModal;
window.switchLeaderboardPeriod = switchLeaderboardPeriod;
