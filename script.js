// 에러 핸들링을 위한 전역 에러 핸들러
window.onerror = function(msg, url, lineNo, columnNo, error) {
    console.error('🔴 Global Error Caught:');
    console.error('Message:', msg);
    console.error('Script:', url);
    console.error('Line:', lineNo);
    console.error('Column:', columnNo);
    console.error('Error object:', error);
    
    // 사용자에게 에러 표시
    const container = document.getElementById('ideaCards');
    if (container) {
        container.innerHTML = `
            <div style="color: red; padding: 20px; background: #fee; border-radius: 8px;">
                <h3>⚠️ 에러가 발생했습니다</h3>
                <p>${msg}</p>
                <p>Line: ${lineNo}</p>
                <p>페이지를 새로고침해주세요 (Ctrl+F5)</p>
            </div>
        `;
    }
    return false;
};

// Supabase 초기화
console.log('🔵 Initializing Supabase...');
const { createClient } = supabase;
const supabaseClient = createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey);
console.log('🟢 Supabase client created successfully');

// 카테고리와 감정 이모지는 config.js에서 가져옴
// config.js에 없는 추가 카테고리만 병합
if (typeof CATEGORY_EMOJI !== 'undefined') {
    // 영어 카테고리 추가
    CATEGORY_EMOJI['staff_problem_solving'] = '🤝';
    CATEGORY_EMOJI['staff_extra_coin'] = '💰';
    CATEGORY_EMOJI['staff_smile'] = '😊';
    CATEGORY_EMOJI['staff_greeting'] = '👋';
    CATEGORY_EMOJI['staff_uniform'] = '👔';
    CATEGORY_EMOJI['fomo'] = '😱';
    CATEGORY_EMOJI['inclusion'] = '🤗';
    CATEGORY_EMOJI['loyalty'] = '💛';
    CATEGORY_EMOJI['surprise'] = '😮';
    CATEGORY_EMOJI['joy'] = '😄';
}

if (typeof EMOTION_EMOJI !== 'undefined') {
    // 추가 감정
    EMOTION_EMOJI['fomo'] = '😱';
    EMOTION_EMOJI['inclusion'] = '🤗';
    EMOTION_EMOJI['loyalty'] = '💛';
    EMOTION_EMOJI['surprise'] = '😮';
    EMOTION_EMOJI['joy'] = '😄';
}

// 전역 상태 관리
let currentState = {
    step: 1,
    selectedIdea: null,
    uploadedVideo: null,
    userPoints: 0,
    userLevel: 1,
    userStreak: 0,
    earnedPoints: 0,
    newAchievements: [],
    userId: null,
    sessionId: null,
    userName: null,
    companyId: null,
    storeId: null,
    userEmail: null
};

// 동적 게임 설정
let GAME_CONFIG = {
    points: {},  // Supabase에서 로드
    levels: [],  // Supabase에서 로드
    achievements: []  // Supabase에서 로드
};

// 로컬 스토리지 키
const STORAGE_KEYS = {
    userPoints: 'contents_helper_points',
    userLevel: 'contents_helper_level',
    userStreak: 'contents_helper_streak',
    lastActivity: 'contents_helper_last_activity',
    achievements: 'contents_helper_achievements',
    completedContents: 'contents_helper_completed',
    userId: 'contents_helper_user_id'
};

// ========================================
// 스켈레톤 UI 관련 함수 (먼저 정의)
// ========================================

// 스켈레톤 UI 표시
function showSkeletonUI() {
    // 사용자 통계 스켈레톤
    const userPoints = document.getElementById('userPoints');
    const userLevel = document.getElementById('userLevel');
    const userStreak = document.getElementById('userStreak');
    
    if (userPoints) userPoints.innerHTML = '<span class="skeleton-text">---</span>';
    if (userLevel) userLevel.innerHTML = '<span class="skeleton-text">-</span>';
    if (userStreak) userStreak.innerHTML = '<span class="skeleton-text">-</span>';
    
    // 아이디어 카드 스켈레톤
    const ideaContainer = document.getElementById('ideaCards');
    if (ideaContainer) {
        ideaContainer.innerHTML = `
            <div class="skeleton-card">
                <div class="skeleton-header"></div>
                <div class="skeleton-title"></div>
                <div class="skeleton-subtitle"></div>
            </div>
            <div class="skeleton-card">
                <div class="skeleton-header"></div>
                <div class="skeleton-title"></div>
                <div class="skeleton-subtitle"></div>
            </div>
            <div class="skeleton-card">
                <div class="skeleton-header"></div>
                <div class="skeleton-title"></div>
                <div class="skeleton-subtitle"></div>
            </div>
        `;
    }
    
    // 상세 통계 스켈레톤
    const statsElements = ['totalUploads', 'todayUploads', 'totalPointsDisplay', 'currentLevelDisplay'];
    statsElements.forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            element.innerHTML = '<span class="skeleton-text">--</span>';
        }
    });
}

// 스켈레톤 UI 숨기기
function hideSkeletonUI() {
    // 스켈레톤 요소들 제거
    document.querySelectorAll('.skeleton-text').forEach(el => {
        el.classList.remove('skeleton-text');
    });
    
    document.querySelectorAll('.skeleton-card').forEach(el => {
        el.remove();
    });
}

// 초기화
document.addEventListener('DOMContentLoaded', async () => {
    console.log('Contents Helper 초기화 중...');
    
    try {
        // 스켈레톤 UI 표시
        showSkeletonUI();
        
        console.log('1. 게임 설정 로드 시작');
        // 게임 설정 로드 (가장 먼저)
        await loadGameConfig();
        
        console.log('2. 사용자 초기화');
        // 사용자 ID 초기화
        initializeUser();
        
        console.log('3. 사용자 정보 표시');
        // 사용자 정보 표시
        displayUserInfo();
        
        console.log('4. 사용자 통계 로드');
        // 사용자 통계 로드
        await loadUserStats();
        
        console.log('5. 상세 통계 표시');
        // 상세 통계 표시
        await displayUserDetailedStats();
        
        console.log('6. 이벤트 리스너 설정');
        // 이벤트 리스너 설정
        setupEventListeners();
        
        console.log('7. 아이디어 로드 시작');
        // 초기 아이디어 로드
        await loadContentIdeas();
        
        console.log('8. 연속 일수 체크');
        // 연속 일수 체크
        checkDailyStreak();
        
        console.log('9. 초기화 완료');
        // 스켈레톤 UI 숨기기
        hideSkeletonUI();
    } catch (error) {
        console.error('초기화 중 오류 발생:', error);
        // 오류 메시지 표시
        const container = document.getElementById('ideaCards');
        if (container) {
            container.innerHTML = '<p style="color: red;">초기화 중 오류가 발생했습니다. 페이지를 새로고침해주세요.</p>';
        }
    }
});

// 게임 설정 로드
async function loadGameConfig() {
    try {
        // 점수 시스템 로드
        const { data: pointsData, error: pointsError } = await supabaseClient
            .from('points_system')
            .select('*')
            .eq('is_active', true)
            .order('points', { ascending: false });
        
        if (pointsError) throw pointsError;
        
        // 점수 시스템을 객체로 변환
        GAME_CONFIG.points = {};
        pointsData.forEach(item => {
            GAME_CONFIG.points[item.activity_type] = item.points;
        });
        
        // 레벨 시스템 로드
        const { data: levelsData, error: levelsError } = await supabaseClient
            .from('level_system')
            .select('*')
            .eq('is_active', true)
            .order('level_number', { ascending: true });
        
        if (levelsError) throw levelsError;
        
        GAME_CONFIG.levels = levelsData.map(level => ({
            level: level.level_number,
            name: level.level_name,
            requiredPoints: level.required_points,
            icon: level.icon,
            color: level.color
        }));
        
        // 업적 시스템 로드
        const { data: achievementsData, error: achievementsError } = await supabaseClient
            .from('achievement_system')
            .select('*')
            .eq('is_active', true)
            .order('points_reward', { ascending: false });
        
        if (achievementsError) throw achievementsError;
        
        GAME_CONFIG.achievements = achievementsData;
        
        // 점수 가이드 테이블 업데이트
        updatePointsGuideTable(pointsData);
        
        // 점수 가이드 모달 업데이트
        updatePointsModal(pointsData);
        
        console.log('게임 설정 로드 완료:', GAME_CONFIG);
        
    } catch (error) {
        console.error('게임 설정 로드 오류:', error);
        // 기본값 설정
        setDefaultGameConfig();
    }
}

// 점수 가이드 테이블 업데이트
function updatePointsGuideTable(pointsData) {
    const tbody = document.querySelector('.points-table tbody');
    if (!tbody) return;
    
    tbody.innerHTML = pointsData.map(item => `
        <tr>
            <td>${item.icon} ${item.activity_name}</td>
            <td class="points-value">+${item.points}</td>
            <td>${item.description}</td>
        </tr>
    `).join('');
}

// 점수 가이드 모달 업데이트
function updatePointsModal(pointsData) {
    const modalBody = document.getElementById('pointsModalBody');
    if (!modalBody) return;
    
    modalBody.innerHTML = pointsData.map(item => {
        const isHighlight = item.activity_type === 'daily_bonus';
        return `
            <div class="points-item ${isHighlight ? 'highlight' : ''}">
                <div class="points-item-header">
                    <span class="points-icon">${item.icon}</span>
                    <span class="points-title">${item.activity_name}</span>
                    <span class="points-value">+${item.points}</span>
                </div>
                <p class="points-description">${item.description}</p>
            </div>
        `;
    }).join('');
}

// 기본 게임 설정 (네트워크 오류 시)
function setDefaultGameConfig() {
    GAME_CONFIG.points = {
        select_idea: 10,
        upload_video: 50,
        add_metadata: 20,
        complete: 20,
        daily_bonus: 30
    };
    
    GAME_CONFIG.levels = [
        { level: 1, name: 'Người mới bắt đầu', requiredPoints: 0, icon: '🌱' },
        { level: 2, name: 'Nhà sáng tạo junior', requiredPoints: 100, icon: '🌿' },
        { level: 3, name: 'Nhà sáng tạo senior', requiredPoints: 500, icon: '🌳' },
        { level: 4, name: 'Nhà sáng tạo chuyên nghiệp', requiredPoints: 1000, icon: '🏆' },
        { level: 5, name: 'Nhà sáng tạo huyền thoại', requiredPoints: 2000, icon: '👑' }
    ];
    
    // 기본 점수 데이터로 모달 업데이트
    const defaultPointsData = [
        { activity_type: 'select_idea', activity_name: 'Chọn ý tưởng', points: 10, description: 'Chọn 1 ý tưởng để tạo nội dung', icon: '✋' },
        { activity_type: 'upload_video', activity_name: 'Tải video lên', points: 50, description: 'Upload video hoàn chỉnh', icon: '🎥' },
        { activity_type: 'add_metadata', activity_name: 'Thêm metadata', points: 20, description: 'Nhập tiêu đề và mô tả', icon: '📝' },
        { activity_type: 'complete', activity_name: 'Hoàn thành', points: 20, description: 'Hoàn tất quy trình', icon: '✅' },
        { activity_type: 'daily_bonus', activity_name: 'Thưởng hàng ngày', points: 30, description: 'Tạo nội dung mỗi ngày', icon: '🎆' }
    ];
    
    updatePointsModal(defaultPointsData);
}

// URL 파라미터 파싱 함수
function getURLParameters() {
    const params = new URLSearchParams(window.location.search);
    return {
        user_id: params.get('user_id'),
        user_name: params.get('user_name') || params.get('name'), // user_name 우선, name도 호환
        company_id: params.get('company_id'),
        store_id: params.get('store_id'),
        email: params.get('email')
    };
}

// 사용자 ID 초기화
function initializeUser() {
    const urlParams = getURLParameters();
    
    // URL 파라미터로 user_id가 전달된 경우
    if (urlParams.user_id) {
        currentState.userId = urlParams.user_id;
        currentState.userName = urlParams.user_name || 'Unknown User';
        currentState.companyId = urlParams.company_id || null;
        currentState.storeId = urlParams.store_id || null;
        currentState.userEmail = urlParams.email || '';
        
        // 로컬 스토리지에 저장 (null 체크)
        try {
            localStorage.setItem(STORAGE_KEYS.userId, currentState.userId);
            localStorage.setItem('contents_helper_user_name', currentState.userName);
            if (currentState.companyId) {
                localStorage.setItem('contents_helper_company_id', currentState.companyId);
            }
            if (currentState.storeId) {
                localStorage.setItem('contents_helper_store_id', currentState.storeId);
            }
        } catch (e) {
            console.error('로컬 스토리지 저장 오류:', e);
        }
        
        console.log('URL 파라미터로 사용자 설정:', {
            userId: currentState.userId,
            userName: currentState.userName,
            companyId: currentState.companyId,
            storeId: currentState.storeId
        });
    } else {
        // 기존 로컬 스토리지에서 확인
        let userId = localStorage.getItem(STORAGE_KEYS.userId);
        if (!userId) {
            // 새로 생성
            userId = 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
            localStorage.setItem(STORAGE_KEYS.userId, userId);
        }
        currentState.userId = userId;
        currentState.userName = localStorage.getItem('contents_helper_user_name') || 'Anonymous';
        
        // 빈 문자열을 null로 변환
        const savedCompanyId = localStorage.getItem('contents_helper_company_id');
        const savedStoreId = localStorage.getItem('contents_helper_store_id');
        currentState.companyId = savedCompanyId && savedCompanyId !== '' ? savedCompanyId : null;
        currentState.storeId = savedStoreId && savedStoreId !== '' ? savedStoreId : null;
    }
    
    currentState.sessionId = 'session_' + Date.now();
}

// 사용자 통계 로드 - DB 우선
async function loadUserStats() {
    try {
        // 1. 먼저 Supabase에서 최신 데이터 로드
        const { data, error } = await supabaseClient
            .from('user_progress')
            .select('*')
            .eq('user_id', currentState.userId)
            .single();
        
        if (data) {
            // DB 데이터를 신뢰할 수 있는 소스로 사용
            currentState.userPoints = data.total_points;
            currentState.userLevel = data.current_level;
            currentState.userStreak = data.streak_days;
            
            // 로컬 스토리지는 캐시로만 사용
            localStorage.setItem(STORAGE_KEYS.userPoints, data.total_points);
            localStorage.setItem(STORAGE_KEYS.userLevel, data.current_level);
            localStorage.setItem(STORAGE_KEYS.userStreak, data.streak_days);
            
            console.log('DB에서 로드한 사용자 통계:', {
                points: data.total_points,
                level: data.current_level,
                streak: data.streak_days
            });
        } else if (!error || error.code === 'PGRST116') {
            // 사용자 데이터가 없는 경우 로컬 스토리지 값으로 초기화
            currentState.userPoints = parseInt(localStorage.getItem(STORAGE_KEYS.userPoints) || '0');
            currentState.userLevel = parseInt(localStorage.getItem(STORAGE_KEYS.userLevel) || '1');
            currentState.userStreak = parseInt(localStorage.getItem(STORAGE_KEYS.userStreak) || '0');
            
            // 사용자 진행 상황 생성
            await createUserProgress();
        }
    } catch (error) {
        console.error('사용자 통계 로드 오류:', error);
        // 오류 시에만 로컬 스토리지 폴백
        currentState.userPoints = parseInt(localStorage.getItem(STORAGE_KEYS.userPoints) || '0');
        currentState.userLevel = parseInt(localStorage.getItem(STORAGE_KEYS.userLevel) || '1');
        currentState.userStreak = parseInt(localStorage.getItem(STORAGE_KEYS.userStreak) || '0');
    }
    
    updateUserStatsUI();
}

// 사용자 진행 상황 생성
async function createUserProgress() {
    try {
        const progressData = {
            user_id: currentState.userId,
            total_points: currentState.userPoints,
            current_level: currentState.userLevel,
            streak_days: currentState.userStreak,
            company_id: currentState.companyId || null,  // 별도 컬럼으로 추가
            store_id: currentState.storeId || null,      // 별도 컬럼으로 추가
            metadata: {
                name: currentState.userName,
                company_id: currentState.companyId || null,
                store_id: currentState.storeId || null,
                email: currentState.userEmail || null,
                created_from: 'url_parameter'
            }
        };
        
        const { error } = await supabaseClient
            .from('user_progress')
            .insert([progressData]);
        
        if (error) throw error;
        
        console.log('새 사용자 진행 상황 생성:', progressData);
    } catch (error) {
        console.error('사용자 진행 상황 생성 오류:', error);
    }
}

// UI 업데이트
function updateUserStatsUI() {
    document.getElementById('userPoints').textContent = currentState.userPoints;
    document.getElementById('userLevel').textContent = currentState.userLevel;
    document.getElementById('userStreak').textContent = currentState.userStreak;
}

// Fisher-Yates 셔플 알고리즘 - 진짜 랜덤을 위한 함수
function fisherYatesShuffle(array) {
    const arr = [...array]; // 원본 배열 복사
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]]; // ES6 destructuring으로 swap
    }
    return arr;
}

// 이벤트 리스너 설정
function setupEventListeners() {
    // 새로고침 버튼 - 완전히 다시 로드
    document.getElementById('refreshIdeas').addEventListener('click', async () => {
        // 강제로 랜덤 시드 변경을 위해 짧은 딜레이 후 로드
        const container = document.getElementById('ideaCards');
        container.innerHTML = '<div class="loading-spinner"><div class="spinner"></div><p>Đang tải ý tưởng mới...</p></div>';
        
        // 약간의 딜레이로 랜덤 시드 변경 보장
        setTimeout(async () => {
            await loadContentIdeas();
        }, 100);
    });
    
    // 비디오 업로드
    const videoFile = document.getElementById('videoFile');
    const uploadArea = document.getElementById('uploadArea');
    
    videoFile.addEventListener('change', handleVideoSelect);
    
    // 드래그 앤 드롭
    uploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadArea.classList.add('dragover');
    });
    
    uploadArea.addEventListener('dragleave', () => {
        uploadArea.classList.remove('dragover');
    });
    
    uploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadArea.classList.remove('dragover');
        const files = e.dataTransfer.files;
        if (files.length > 0 && files[0].type.startsWith('video/')) {
            videoFile.files = files;
            handleVideoSelect({ target: { files } });
        }
    });
    
    // 업로드 버튼
    document.getElementById('uploadButton').addEventListener('click', handleUpload);
}

// 컨텐츠 아이디어 로드
async function loadContentIdeas() {
    const container = document.getElementById('ideaCards');
    container.innerHTML = '<div class="loading-spinner"><div class="spinner"></div><p>Đang tải ý tưởng...</p></div>';
    
    try {
        // 모든 사용 가능한 아이디어 가져오기 (is_choosen 상태와 관계없이)
        const { data: allIdeas, error } = await supabaseClient
            .from('contents_idea')
            .select('*')
            .eq('is_upload', false)
            .eq('is_auto_created', true);  // 시스템이 만든 아이디어만
        
        if (error) throw error;
        
        if (!allIdeas || allIdeas.length === 0) {
            container.innerHTML = '<p>Tất cả ý tưởng đã được sử dụng. Vui lòng thêm ý tưởng mới!</p>';
            return;
        }
        
        console.log(`🎲 총 ${allIdeas.length}개의 아이디어 중에서 랜덤 선택`);
        
        // Fisher-Yates 셔플로 완전 랜덤 선택
        const shuffled = fisherYatesShuffle([...allIdeas]);
        
        // 5개 선택
        const selectedIdeas = shuffled.slice(0, Math.min(5, shuffled.length));
        
        console.log('🎯 선택된 아이디어:');
        selectedIdeas.forEach((idea, idx) => {
            console.log(`  ${idx + 1}. ${idea.title_vi} (ID: ${idea.id}, is_choosen: ${idea.is_choosen})`);
        });
        
        // UI 업데이트
        container.innerHTML = '';
        selectedIdeas.forEach(idea => {
            const card = createIdeaCard(idea);
            container.appendChild(card);
        });
        
        // ========== 새로운 기능: 커스텀 아이디어 버튼 추가 ==========
        const customIdeaButton = document.createElement('div');
        customIdeaButton.className = 'custom-idea-card';
        customIdeaButton.innerHTML = `
            <div class="custom-idea-content" onclick="showCustomIdeaModal()">
                <div class="custom-idea-icon">💡</div>
                <h3 class="custom-idea-title">Tạo ý tưởng của riêng bạn</h3>
                <p class="custom-idea-subtitle">Thể hiện sự sáng tạo với ý tưởng độc đáo</p>
                <div class="custom-idea-badge">+${GAME_CONFIG.points.select_idea || 10} điểm</div>
            </div>
        `;
        container.appendChild(customIdeaButton);
        // ===========================================================
        
        // 표시된 아이디어 기록
        await recordActivity('view', null, selectedIdeas.map(i => i.id));
        
    } catch (error) {
        console.error('아이디어 로드 오류:', error);
        showError('Có lỗi khi tải ý tưởng.');
        container.innerHTML = '<p>Đã xảy ra lỗi. Vui lòng thử lại.</p>';
    }
}

// 아이디어 카드 생성
function createIdeaCard(idea) {
    const card = document.createElement('div');
    card.className = 'idea-card';
    if (idea.is_choosen) {
        card.className += ' choosen';
    }
    
    const categoryEmoji = CATEGORY_EMOJI[idea.category] || '📝';
    const emotionEmoji = EMOTION_EMOJI[idea.emotion] || '😊';
    
    // 카드 ID 생성
    const cardId = `idea-card-${idea.id}`;
    
    card.innerHTML = `
        ${idea.is_choosen ? '<div class="choosen-badge">🎯 Ý tưởng đã chọn trước đó</div>' : ''}
        <div class="idea-card-header" onclick="toggleIdeaCard('${cardId}')">
            <div class="idea-card-summary">
                <div class="idea-category">${categoryEmoji} ${idea.category}</div>
                <h3 class="idea-title">${idea.title_vi}</h3>
                ${idea.title_ko ? `<p class="idea-subtitle">${idea.title_ko}</p>` : ''}
                ${idea.hook_text ? `<p class="idea-hook">📢 ${idea.hook_text}</p>` : ''}
            </div>
            <div class="expand-icon" id="expand-${cardId}">
                <span class="expand-arrow">▼</span>
            </div>
        </div>
        <div class="idea-card-details" id="details-${cardId}" style="display: none;">
            <div class="idea-info">
                <p><strong>Cảm xúc:</strong> ${idea.emotion} ${emotionEmoji}</p>
                <p><strong>Đối tượng:</strong> ${idea.target_audience}</p>
                ${idea.choose_count > 0 ? `<p><strong>Đã được chọn:</strong> ${idea.choose_count} lần</p>` : ''}
            </div>
            ${idea.viral_tags && idea.viral_tags.length > 0 ? `
                <div class="viral-tags">
                    ${idea.viral_tags.map(tag => `<span class="viral-tag">#${tag}</span>`).join('')}
                </div>
            ` : ''}
            <div class="idea-footer">
                <span class="idea-points">⭐ +${GAME_CONFIG.points.select_idea || 10} điểm</span>
            </div>
            <button class="btn btn-select" onclick="selectIdea(${JSON.stringify(idea).replace(/"/g, '&quot;')})">
                Chọn ý tưởng này →
            </button>
        </div>
    `;
    
    card.id = cardId;
    return card;
}

// 아이디어 선택
async function selectIdea(idea) {
    currentState.selectedIdea = idea;
    
    // 포인트 추가
    await addPoints(GAME_CONFIG.points.select_idea || 10);
    
    // 선택 활동 기록
    await recordActivity('choose', idea.id);
    
    // 시나리오 카드 업데이트
    updateScenarioCard(idea);
    
    // 단계 전환
    goToStep(2);
}

// 시나리오 형식 변환 헬퍼 함수
function convertScenarioFormat(scenario) {
    if (!scenario) return null;
    
    // 이미 구조화된 형식인 경우
    if (scenario.hook1 || scenario.hook2 || scenario.body1 || scenario.body2 || scenario.conclusion) {
        return scenario;
    }
    
    // 배열 형식인 경우
    if (Array.isArray(scenario)) {
        const structured = {};
        
        if (scenario.length >= 5) {
            // 5개 이상의 단계가 있는 경우
            structured.hook1 = `0-3s: ${scenario[0]}`;
            structured.hook2 = `4-7s: ${scenario[1]}`;
            structured.body1 = `8-15s: ${scenario[2]}`;
            structured.body2 = `16-25s: ${scenario[3]}`;
            structured.conclusion = `26-30s: ${scenario[4]}`;
        } else if (scenario.length >= 3) {
            // 3-4개의 단계가 있는 경우
            structured.hook1 = `0-5s: ${scenario[0]}`;
            structured.body1 = `6-20s: ${scenario[1]}`;
            structured.conclusion = `21-30s: ${scenario[2]}`;
            
            if (scenario[3]) {
                structured.body2 = `15-25s: ${scenario[3]}`;
            }
        } else if (scenario.length >= 1) {
            // 1-2개의 단계만 있는 경우
            structured.hook1 = `0-10s: ${scenario[0]}`;
            if (scenario[1]) {
                structured.conclusion = `11-30s: ${scenario[1]}`;
            }
        }
        
        return structured;
    }
    
    // steps 속성이 있는 경우
    if (scenario.steps && Array.isArray(scenario.steps)) {
        return convertScenarioFormat(scenario.steps);
    }
    
    // 문자열인 경우
    if (typeof scenario === 'string') {
        return {
            hook1: "0-10s: 시작",
            body1: `11-25s: ${scenario}`,
            conclusion: "26-30s: 마무리"
        };
    }
    
    return null;
}

// 시나리오 카드 업데이트
function updateScenarioCard(idea) {
    const card = document.getElementById('scenarioCard');
    const emotionEmoji = idea.emotion ? (EMOTION_EMOJI[idea.emotion] || '😊') : '';
    const categoryEmoji = idea.category ? (CATEGORY_EMOJI[idea.category] || '📝') : '';
    
    // 시나리오 파싱
    let scenarioContent = '';
    const structuredScenario = convertScenarioFormat(idea.scenario);
    
    if (structuredScenario) {
        const scenarioParts = [];
        
        if (structuredScenario.hook1) {
            scenarioParts.push({
                type: 'hook1',
                label: '🎬 Hook 1',
                content: structuredScenario.hook1,
                color: '#ff6b35'
            });
        }
        if (structuredScenario.body1) {
            scenarioParts.push({
                type: 'body1',
                label: '📹 Body 1',
                content: structuredScenario.body1,
                color: '#2196f3'
            });
        }
        if (structuredScenario.hook2) {
            scenarioParts.push({
                type: 'hook2',
                label: '🎯 Hook 2',
                content: structuredScenario.hook2,
                color: '#ff9800'
            });
        }
        if (structuredScenario.body2) {
            scenarioParts.push({
                type: 'body2',
                label: '🎥 Body 2',
                content: structuredScenario.body2,
                color: '#03a9f4'
            });
        }
        if (structuredScenario.conclusion) {
            scenarioParts.push({
                type: 'conclusion',
                label: '✨ Kết thúc',
                content: structuredScenario.conclusion,
                color: '#4caf50'
            });
        }
        
        // 원래 구조 순서대로 정렬
        const orderMap = {
            'hook1': 1,
            'body1': 2,
            'hook2': 3,
            'body2': 4,
            'conclusion': 5
        };
        scenarioParts.sort((a, b) => orderMap[a.type] - orderMap[b.type]);
        
        scenarioContent = scenarioParts;
    }
    
    card.innerHTML = `
        <!-- 메인 헤더 -->
        <div class="scenario-mobile-header">
            <div class="scenario-badge-container">
                ${idea.category ? `<span class="category-badge">${categoryEmoji} ${idea.category}</span>` : ''}
                ${idea.emotion ? `<span class="emotion-badge">${emotionEmoji} ${idea.emotion}</span>` : ''}
            </div>
            <h2 class="scenario-main-title">${idea.title_vi}</h2>
            ${idea.title_ko ? `<p class="scenario-subtitle">${idea.title_ko}</p>` : ''}
            ${idea.hook_text ? `<div class="scenario-hook-preview">📢 ${idea.hook_text}</div>` : ''}
        </div>
        
        <!-- 빠른 정보 -->
        <div class="scenario-quick-info">
            ${idea.target_audience ? `
                <div class="quick-info-item">
                    <span class="info-icon">👥</span>
                    <span class="info-text">${idea.target_audience}</span>
                </div>
            ` : ''}
            ${idea.cta_message ? `
                <div class="quick-info-item">
                    <span class="info-icon">📣</span>
                    <span class="info-text">${idea.cta_message}</span>
                </div>
            ` : ''}
            ${idea.viral_tags && idea.viral_tags.length > 0 ? `
                <div class="quick-info-item viral">
                    <span class="info-icon">🔥</span>
                    <span class="info-text">${idea.viral_tags.join(', ')}</span>
                </div>
            ` : ''}
        </div>
        
        <!-- 탭 네비게이션 -->
        <div class="scenario-tabs">
            <button class="tab-button active" onclick="switchScenarioTab('scenario')">
                <span class="tab-icon">🎬</span>
                <span class="tab-label">Kịch bản</span>
            </button>
            <button class="tab-button" onclick="switchScenarioTab('guide')">
                <span class="tab-icon">📸</span>
                <span class="tab-label">Hướng dẫn</span>
            </button>
            <button class="tab-button" onclick="switchScenarioTab('caption')">
                <span class="tab-icon">💬</span>
                <span class="tab-label">Caption</span>
            </button>
        </div>
        
        <!-- 탭 컨텐츠 -->
        <div class="scenario-tab-content">
            <!-- 시나리오 탭 -->
            <div id="scenario-tab" class="tab-panel active">
                ${scenarioContent && scenarioContent.length > 0 ? `
                    <div class="scenario-timeline">
                        ${scenarioContent.map((part, index) => `
                            <div class="timeline-item" onclick="toggleTimelineItem('timeline-${index}')">
                                <div class="timeline-header">
                                    <div class="timeline-dot" style="background: ${part.color}"></div>
                                    <span class="timeline-label">${part.label}</span>
                                    <span class="timeline-expand">▼</span>
                                </div>
                                <div class="timeline-content" id="timeline-${index}" style="display: ${index === 0 ? 'block' : 'none'}">
                                    <p>${part.content}</p>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                ` : '<p class="no-content">Chưa có kịch bản chi tiết</p>'}
            </div>
            
            <!-- 가이드 탭 -->
            <div id="guide-tab" class="tab-panel">
                ${idea.props && idea.props.length > 0 ? `
                    <div class="guide-section">
                        <h4 class="guide-title">🎭 Đạo cụ cần chuẩn bị</h4>
                        <div class="props-grid">
                            ${idea.props.map(prop => `<div class="prop-card">${prop}</div>`).join('')}
                        </div>
                    </div>
                ` : ''}
                
                <div class="guide-section">
                    <h4 class="guide-title">📸 Mẹo quay phim</h4>
                    <div class="tips-content">
                        <p>${idea.filming_tips || 'Hãy quay theo cách tự nhiên nhất!'}</p>
                    </div>
                </div>
            </div>
            
            <!-- 캡션 탭 -->
            <div id="caption-tab" class="tab-panel">
                <div class="caption-section">
                    <h4 class="caption-title">💬 Mẫu caption</h4>
                    <div class="caption-box">
                        <pre>${idea.caption_template}</pre>
                        <button class="copy-button" onclick="copyCaption()">
                            <span>📋 Sao chép</span>
                        </button>
                    </div>
                </div>
                
                ${idea.hashtags && idea.hashtags.length > 0 ? `
                    <div class="hashtag-section">
                        <h4 class="hashtag-title">#️⃣ Hashtag gợi ý</h4>
                        <div class="hashtag-container">
                            ${idea.hashtags.map(tag => `<span class="hashtag-pill">${tag}</span>`).join('')}
                        </div>
                    </div>
                ` : ''}
            </div>
        </div>
    `;
    
    // 현재 아이디어를 전역 변수에 저장
    window.currentScenarioIdea = idea;
}

// 비디오 선택 처리
function handleVideoSelect(e) {
    const file = e.target.files[0];
    if (!file) return;
    
    // 파일 크기 확인 (100MB 제한)
    if (file.size > 100 * 1024 * 1024) {
        showError('Kích thước file phải dưới 100MB.');
        return;
    }
    
    currentState.uploadedVideo = file;
    
    // 프리뷰 표시
    const preview = document.getElementById('videoPreview');
    const uploadArea = document.getElementById('uploadArea');
    const video = preview.querySelector('video');
    const fileName = preview.querySelector('.file-name');
    const fileSize = preview.querySelector('.file-size');
    
    // 비디오 미리보기
    const url = URL.createObjectURL(file);
    video.src = url;
    
    // 파일 정보
    fileName.textContent = file.name;
    fileSize.textContent = formatFileSize(file.size);
    
    // UI 전환
    uploadArea.style.display = 'none';
    preview.style.display = 'block';
    document.getElementById('metadataForm').style.display = 'block';
    document.getElementById('uploadButton').disabled = false;
}

// 파일 크기 포맷
function formatFileSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

// 업로드 처리
async function handleUpload() {
    if (!currentState.uploadedVideo || !currentState.selectedIdea) return;
    
    const uploadButton = document.getElementById('uploadButton');
    uploadButton.disabled = true;
    showLoading('Đang tải video lên...');
    
    try {
        // 파일명 생성
        const timestamp = new Date().getTime();
        const fileName = `${timestamp}_${currentState.uploadedVideo.name}`;
        
        // Storage에 업로드
        const { data: uploadData, error: uploadError } = await supabaseClient.storage
            .from('contents-videos')
            .upload(fileName, currentState.uploadedVideo);
        
        if (uploadError) {
            // 버킷이 없는 경우
            if (uploadError.message.includes('not found')) {
                throw new Error('Vui lòng tạo Storage bucket (contents-videos)');
            }
            throw uploadError;
        }
        
        // 공개 URL 생성
        const { data: { publicUrl } } = supabaseClient.storage
            .from('contents-videos')
            .getPublicUrl(fileName);
        
        // 메타데이터 수집
        const videoTitle = document.getElementById('videoTitle').value || currentState.selectedIdea.title_ko;
        const videoDescription = document.getElementById('videoDescription').value;
        
        // content_uploads 테이블에 저장
        const totalPoints = calculateTotalPoints();
        const { data: uploadRecord, error: uploadRecordError } = await supabaseClient
            .from('content_uploads')
            .insert([
                {
                    content_idea_id: currentState.selectedIdea.id,  // 원래 코드로 복원
                    user_id: currentState.userId,
                    video_url: publicUrl,  // 원래 스키마대로 video_url 사용
                    title: videoTitle || currentState.selectedIdea.title_ko,
                    description: videoDescription,
                    file_size: currentState.uploadedVideo.size,
                    points_earned: totalPoints,
                    status: 'uploaded',
                    company_id: currentState.companyId || null,  // 별도 컬럼으로 추가
                    store_id: currentState.storeId || null,      // 별도 컬럼으로 추가
                    metadata: {
                        category: currentState.selectedIdea.category,
                        emotion: currentState.selectedIdea.emotion,
                        tags: currentState.selectedIdea.viral_tags || [],
                        original_filename: currentState.uploadedVideo.name,
                        company_id: currentState.companyId || null,
                        store_id: currentState.storeId || null,
                        user_name: currentState.userName
                    },
                    device_info: {
                        userAgent: navigator.userAgent,
                        platform: navigator.platform
                    }
                }
            ])
            .select()
            .single();
        
        if (uploadRecordError) throw uploadRecordError;
        
        // contents_idea 테이블 업데이트 (is_upload = true)
        const { error: updateError } = await supabaseClient
            .from('contents_idea')
            .update({ 
                is_upload: true,
                upload_id: uploadRecord?.id,
                upload_time: new Date().toISOString()
            })
            .eq('id', currentState.selectedIdea.id);
        
        if (updateError) {
            console.error('contents_idea 업데이트 오류:', updateError);
        }
        
        // 업로드 활동 기록
        await recordActivity('upload', currentState.selectedIdea.id, null, uploadRecord?.id);
        
        // 포인트 추가
        await addPoints(GAME_CONFIG.points.upload_video || 50);
        if (videoTitle || videoDescription) {
            await addPoints(GAME_CONFIG.points.add_metadata || 20);
        }
        await addPoints(GAME_CONFIG.points.complete || 20);
        
        // 업적 체크
        checkAchievements();
        
        // 완료 화면으로 이동
        goToStep(4);
        updateCompletionScreen();
        
        // 통계 업데이트
        await displayUserDetailedStats();
        
    } catch (error) {
        console.error('업로드 오류:', error);
        showError(error.message || '업로드 중 오류가 발생했습니다.');
        uploadButton.disabled = false;
    } finally {
        hideLoading();
    }
}

// 총 포인트 계산
function calculateTotalPoints() {
    let points = (GAME_CONFIG.points.select_idea || 10) + 
                 (GAME_CONFIG.points.upload_video || 50) + 
                 (GAME_CONFIG.points.complete || 20);
    
    const videoTitle = document.getElementById('videoTitle').value;
    const videoDescription = document.getElementById('videoDescription').value;
    
    if (videoTitle || videoDescription) {
        points += (GAME_CONFIG.points.add_metadata || 20);
    }
    
    return points;
}

// 컨텐츠 제출 저장
function saveContentSubmission(data) {
    const submissions = JSON.parse(localStorage.getItem(STORAGE_KEYS.completedContents) || '[]');
    submissions.push({
        ...data,
        created_at: new Date().toISOString()
    });
    localStorage.setItem(STORAGE_KEYS.completedContents, JSON.stringify(submissions));
}

// 포인트 추가 - 즉시 DB 업데이트
async function addPoints(points) {
    currentState.earnedPoints += points;
    currentState.userPoints += points;
    
    // 로컬 스토리지 임시 업데이트
    localStorage.setItem(STORAGE_KEYS.userPoints, currentState.userPoints.toString());
    
    // 레벨 체크
    checkLevel();
    
    // UI 즉시 업데이트
    updateUserStatsUI();
    
    // 포인트 획득 애니메이션
    showPointsAnimation(points);
    
    // DB에 즉시 반영 (비동기로 처리)
    try {
        await updateUserProgressImmediate();
    } catch (error) {
        console.error('포인트 DB 업데이트 오류:', error);
    }
}

// 레벨 체크
function checkLevel() {
    const newLevel = GAME_CONFIG.levels.findIndex(level => 
        currentState.userPoints < level.requiredPoints
    );
    
    if (newLevel > currentState.userLevel || (newLevel === -1 && currentState.userLevel < GAME_CONFIG.levels.length)) {
        currentState.userLevel = newLevel === -1 ? GAME_CONFIG.levels.length : newLevel;
        localStorage.setItem(STORAGE_KEYS.userLevel, currentState.userLevel.toString());
        
        // 레벨업 알림
        const levelInfo = GAME_CONFIG.levels[currentState.userLevel - 1];
        showSuccess(`Lên cấp! ${levelInfo.icon} ${levelInfo.name}`);
    }
}

// 업적 체크
function checkAchievements() {
    const achievements = JSON.parse(localStorage.getItem(STORAGE_KEYS.achievements) || '[]');
    const submissions = JSON.parse(localStorage.getItem(STORAGE_KEYS.completedContents) || '[]');
    
    // 첫 컨텐츠
    if (submissions.length === 1 && !achievements.includes(1)) {
        unlockAchievement(1);
    }
    
    // 오늘 3개
    const today = new Date().toDateString();
    const todaySubmissions = submissions.filter(s => 
        new Date(s.created_at).toDateString() === today
    );
    if (todaySubmissions.length >= 3 && !achievements.includes(2)) {
        unlockAchievement(2);
    }
    
    // 다양한 카테고리
    const categories = [...new Set(submissions.map(s => s.metadata.category))];
    if (categories.length >= 5 && !achievements.includes(4)) {
        unlockAchievement(4);
    }
}

// 업적 해금
function unlockAchievement(achievementId) {
    const achievements = JSON.parse(localStorage.getItem(STORAGE_KEYS.achievements) || '[]');
    achievements.push(achievementId);
    localStorage.setItem(STORAGE_KEYS.achievements, JSON.stringify(achievements));
    
    const achievement = GAME_CONFIG.achievements.find(a => a.id === achievementId);
    if (achievement) {
        currentState.newAchievements.push(achievement);
        showSuccess(`Thành tựu mới! ${achievement.icon} ${achievement.name}`);
    }
}

// 일일 연속 체크
function checkDailyStreak() {
    const lastActivity = localStorage.getItem(STORAGE_KEYS.lastActivity);
    const today = new Date().toDateString();
    
    if (lastActivity) {
        const lastDate = new Date(lastActivity);
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        
        if (lastDate.toDateString() === yesterday.toDateString()) {
            // 연속 유지
            currentState.userStreak++;
        } else if (lastDate.toDateString() !== today) {
            // 연속 끊김
            currentState.userStreak = 0;
        }
    }
    
    localStorage.setItem(STORAGE_KEYS.userStreak, currentState.userStreak.toString());
    localStorage.setItem(STORAGE_KEYS.lastActivity, today);
}

// 완료 화면 업데이트
function updateCompletionScreen() {
    document.getElementById('earnedPoints').textContent = currentState.earnedPoints;
    
    // 새로운 업적 표시
    const achievementsContainer = document.getElementById('newAchievements');
    if (currentState.newAchievements.length > 0) {
        achievementsContainer.innerHTML = currentState.newAchievements.map(achievement => `
            <div class="achievement-badge">
                ${achievement.icon} ${achievement.name}
            </div>
        `).join('');
    }
}

// 단계 전환
function goToStep(step) {
    currentState.step = step;
    
    // 모든 섹션 숨기기
    document.querySelectorAll('.content-section').forEach(section => {
        section.classList.remove('active');
    });
    
    // 현재 단계 표시
    const sections = ['ideaSelection', 'scenarioDetail', 'videoUpload', 'completion'];
    document.getElementById(sections[step - 1]).classList.add('active');
    
    // 프로그레스 바 업데이트
    updateProgress(step);
}

// 프로그레스 바 업데이트
function updateProgress(step) {
    const progressFill = document.getElementById('progressFill');
    progressFill.style.width = `${(step / 4) * 100}%`;
    
    // 단계 활성화
    document.querySelectorAll('.step').forEach((stepEl, index) => {
        if (index < step) {
            stepEl.classList.add('active');
        } else {
            stepEl.classList.remove('active');
        }
    });
}

// 네비게이션 함수들
function backToIdeas() {
    goToStep(1);
}

function startRecording() {
    goToStep(3);
}

function backToScenario() {
    goToStep(2);
}

async function createAnother() {
    // 상태 초기화
    currentState.selectedIdea = null;
    currentState.uploadedVideo = null;
    currentState.earnedPoints = 0;
    currentState.newAchievements = [];
    
    // 폼 초기화
    document.getElementById('videoFile').value = '';
    document.getElementById('videoTitle').value = '';
    document.getElementById('videoDescription').value = '';
    document.getElementById('uploadArea').style.display = 'block';
    document.getElementById('videoPreview').style.display = 'none';
    document.getElementById('metadataForm').style.display = 'none';
    document.getElementById('uploadButton').disabled = true;
    
    // 통계 업데이트
    await displayUserDetailedStats();
    
    // 새로운 아이디어 로드
    loadContentIdeas();
    
    // 첫 단계로
    goToStep(1);
}

function viewLeaderboard() {
    showRankingModal();
}

// 랭킹 모달 표시
async function showRankingModal() {
    const modal = document.getElementById('rankingModal');
    modal.classList.add('show');
    document.body.style.overflow = 'hidden';
    
    // 기본으로 회사 전체 랭킹 표시 (company 우선)
    document.querySelectorAll('.ranking-tab').forEach(tab => {
        tab.classList.remove('active');
    });
    document.querySelector('.ranking-tab:nth-child(1)').classList.add('active');
    
    document.querySelectorAll('.ranking-panel').forEach(panel => {
        panel.classList.remove('active');
    });
    document.getElementById('company-ranking').classList.add('active');
    
    // 개인 순위 정보 표시
    await loadPersonalRankingInfo();
    await loadRankings('company');
}

// 랭킹 모달 닫기
function closeRankingModal(event) {
    if (event && event.target !== event.currentTarget) {
        return;
    }
    
    const modal = document.getElementById('rankingModal');
    modal.classList.remove('show');
    document.body.style.overflow = '';
}

// 랭킹 탭 전환
async function switchRankingTab(type) {
    // 탭 버튼 활성화 상태 변경
    document.querySelectorAll('.ranking-tab').forEach(tab => {
        tab.classList.remove('active');
    });
    event.target.closest('.ranking-tab').classList.add('active');
    
    // 탭 패널 표시/숨기기
    document.querySelectorAll('.ranking-panel').forEach(panel => {
        panel.classList.remove('active');
    });
    document.getElementById(`${type}-ranking`).classList.add('active');
    
    // 랭킹 데이터 로드
    await loadRankings(type);
}

// 개인 순위 정보 로드
async function loadPersonalRankingInfo() {
    try {
        // 상세 순위 정보 가져오기
        const { data: rankingInfo, error } = await supabaseClient
            .from('user_detailed_ranking')
            .select('*')
            .eq('user_id', currentState.userId)
            .single();
        
        if (error) throw error;
        
        if (rankingInfo) {
            // 개인 순위 정보 UI 업데이트
            updatePersonalRankingUI(rankingInfo);
        }
    } catch (error) {
        console.error('개인 순위 정보 로드 오류:', error);
    }
}

// 개인 순위 UI 업데이트
function updatePersonalRankingUI(rankingInfo) {
    // 랭킹 모달에 개인 순위 정보 섹션 추가
    const modalHeader = document.querySelector('#rankingModal .modal-header');
    const existingInfo = document.getElementById('personalRankingInfo');
    
    if (existingInfo) {
        existingInfo.remove();
    }
    
    const personalInfoHTML = `
        <div id="personalRankingInfo" class="personal-ranking-info">
            <div class="personal-ranking-grid">
                <div class="personal-rank-item">
                    <span class="rank-label">Trong cửa hàng</span>
                    <span class="rank-value">${rankingInfo.store_rank}/${rankingInfo.total_users_in_store}</span>
                    <span class="rank-detail">hạng ${rankingInfo.store_rank} trong ${rankingInfo.total_users_in_store} người</span>
                </div>
                <div class="personal-rank-item">
                    <span class="rank-label">Toàn công ty</span>
                    <span class="rank-value">${rankingInfo.company_rank}/${rankingInfo.total_users_in_company}</span>
                    <span class="rank-detail">hạng ${rankingInfo.company_rank} trong ${rankingInfo.total_users_in_company} người</span>
                </div>
                <div class="personal-rank-item">
                    <span class="rank-label">Cửa hàng của bạn</span>
                    <span class="rank-value">${rankingInfo.store_company_rank}/${rankingInfo.total_stores_in_company}</span>
                    <span class="rank-detail">hạng ${rankingInfo.store_company_rank} trong ${rankingInfo.total_stores_in_company} cửa hàng</span>
                </div>
            </div>
        </div>
    `;
    
    modalHeader.insertAdjacentHTML('afterend', personalInfoHTML);
}

// 랭킹 데이터 로드
async function loadRankings(type) {
    const listId = type === 'company' ? 'companyRankingList' : 'storeRankingList';
    const listElement = document.getElementById(listId);
    
    // 로딩 표시
    listElement.innerHTML = `
        <div class="ranking-loading">
            <div class="spinner"></div>
            <p>Đang tải bảng xếp hạng...</p>
        </div>
    `;
    
    try {
        let data;
        
        if (type === 'company') {
            // 회사 전체 랭킹
            if (!currentState.companyId) {
                listElement.innerHTML = '<p class="no-content">Bạn không thuộc công ty nào</p>';
                return;
            }
            
            const { data: rankings, error } = await supabaseClient
                .from('company_leaderboard')
                .select('*')
                .eq('company_id', currentState.companyId)
                .order('rank', { ascending: true })
                .limit(100); // 더 많은 사용자 표시
            
            if (error) throw error;
            data = rankings;
        } else {
            // 가게별 랭킹
            if (!currentState.storeId) {
                listElement.innerHTML = '<p class="no-content">Bạn không thuộc cửa hàng nào</p>';
                return;
            }
            
            const { data: rankings, error } = await supabaseClient
                .from('store_leaderboard')
                .select('*')
                .eq('store_id', currentState.storeId)
                .order('rank', { ascending: true })
                .limit(100); // 더 많은 사용자 표시
            
            if (error) throw error;
            data = rankings;
        }
        
        if (!data || data.length === 0) {
            listElement.innerHTML = '<p class="no-content">Chưa có dữ liệu xếp hạng</p>';
            return;
        }
        
        // 사용자 이름 가져오기 (비동기로 처리)
        const userIds = [...new Set(data.map(item => item.user_id))];
        const { data: users, error: usersError } = await supabaseClient
            .from('user_progress')
            .select('user_id, metadata')
            .in('user_id', userIds);
        
        const userMap = {};
        if (users) {
            users.forEach(user => {
                userMap[user.user_id] = user.metadata?.name || 'Anonymous';
            });
        }
        
        // 랭킹 리스트 생성
        const top2 = data.slice(0, 2);
        const rest = data.slice(2);
        
        let rankingHTML = '';
        
        // TOP 2 특별 표시
        if (top2.length > 0) {
            rankingHTML += '<div class="top-rankings">';
            rankingHTML += top2.map((item, index) => {
                const isCurrentUser = item.user_id === currentState.userId;
                const userName = userMap[item.user_id] || 'Anonymous';
                const levelInfo = GAME_CONFIG.levels[item.current_level - 1] || GAME_CONFIG.levels[0];
                const medal = index === 0 ? '🥇' : '🥈';
                
                return `
                    <div class="top-ranking-card ${isCurrentUser ? 'current-user' : ''}">
                        <div class="medal">${medal}</div>
                        <div class="top-user-info">
                            <div class="top-user-name">${userName}</div>
                            <div class="top-user-level">${levelInfo.icon} Level: ${item.current_level}</div>
                        </div>
                        <div class="top-user-points">
                            <div class="points-number">${item.total_points}</div>
                            <div class="points-text">points</div>
                        </div>
                    </div>
                `;
            }).join('');
            rankingHTML += '</div>';
        }
        
        // 나머지 순위
        if (rest.length > 0) {
            rankingHTML += '<div class="ranking-list-items">';
            rankingHTML += rest.map(item => {
                const isCurrentUser = item.user_id === currentState.userId;
                const userName = userMap[item.user_id] || 'Anonymous';
                const levelInfo = GAME_CONFIG.levels[item.current_level - 1] || GAME_CONFIG.levels[0];
                const medal = item.rank === 3 ? '🥉 ' : '';
                
                return `
                    <div class="ranking-item ${isCurrentUser ? 'current-user' : ''}">
                        <div class="ranking-position">
                            ${medal}${item.rank}
                        </div>
                        <div class="ranking-user-info">
                            <div class="ranking-user-name">
                                ${userName} ${isCurrentUser ? '(Bạn)' : ''}
                            </div>
                            <div class="ranking-user-stats">
                                <span class="ranking-stat">
                                    ${levelInfo.icon} Level: ${item.current_level}
                                </span>
                            </div>
                        </div>
                        <div class="ranking-points">
                            <span class="ranking-points-value">${item.total_points}</span>
                            <span class="ranking-points-label">points</span>
                        </div>
                    </div>
                `;
            }).join('');
            rankingHTML += '</div>';
        }
        
        listElement.innerHTML = rankingHTML;
        
        // "Check all ranking" 링크 추가
        if (data.length >= 10) {
            listElement.innerHTML += `
                <div class="check-all-ranking">
                    <a href="#" onclick="loadMoreRankings('${type}'); return false;">Check all ranking</a>
                </div>
            `;
        }
        
        // 현재 사용자가 리스트에 없는 경우, 현재 사용자 순위 찾기
        if (!data.find(item => item.user_id === currentState.userId)) {
            const myRank = await findMyRank(type);
            if (myRank) {
                // 최신 데이터로 현재 사용자 정보 다시 로드
                const { data: currentUserData } = await supabaseClient
                    .from('user_progress')
                    .select('*')
                    .eq('user_id', currentState.userId)
                    .single();
                
                const latestPoints = currentUserData?.total_points || currentState.userPoints;
                const latestLevel = currentUserData?.current_level || currentState.userLevel;
                const levelInfo = GAME_CONFIG.levels[latestLevel - 1] || GAME_CONFIG.levels[0];
                
                listElement.innerHTML += `
                    <div style="margin-top: 1rem; padding-top: 1rem; border-top: 2px dashed var(--border-color);">
                        <p style="text-align: center; color: var(--text-secondary); margin-bottom: 1rem;">
                            Vị trí của bạn
                        </p>
                        <div class="ranking-item current-user">
                            <div class="ranking-position">
                                ${myRank}
                            </div>
                            <div class="ranking-user-info">
                                <div class="ranking-user-name">
                                    ${currentState.userName} (Bạn)
                                </div>
                                <div class="ranking-user-stats">
                                    <span class="ranking-stat">
                                        ${levelInfo.icon} Cấp ${latestLevel}
                                    </span>
                                    <span class="ranking-stat">
                                        🎬 ${currentUserData?.total_uploads || 0} video
                                    </span>
                                </div>
                            </div>
                            <div class="ranking-points">
                                <span class="ranking-points-value">${latestPoints}</span>
                                <span class="ranking-points-label">điểm</span>
                            </div>
                        </div>
                    </div>
                `;
            }
        }
        
    } catch (error) {
        console.error('랭킹 로드 오류:', error);
        listElement.innerHTML = '<p class="no-content">Đã xảy ra lỗi khi tải bảng xếp hạng</p>';
    }
}

// 내 순위 찾기 - 최신 데이터 기준
async function findMyRank(type) {
    try {
        // 최신 사용자 데이터 로드
        const { data: currentUserData } = await supabaseClient
            .from('user_progress')
            .select('*')
            .eq('user_id', currentState.userId)
            .single();
        
        const latestPoints = currentUserData?.total_points || currentState.userPoints;
        
        if (type === 'company') {
            const { count, error } = await supabaseClient
                .from('user_progress')
                .select('*', { count: 'exact', head: true })
                .eq('company_id', currentState.companyId)
                .gt('total_points', latestPoints);
            
            if (error) throw error;
            return (count || 0) + 1;
        } else {
            const { count, error } = await supabaseClient
                .from('user_progress')
                .select('*', { count: 'exact', head: true })
                .eq('store_id', currentState.storeId)
                .gt('total_points', latestPoints);
            
            if (error) throw error;
            return (count || 0) + 1;
        }
    } catch (error) {
        console.error('순위 계산 오류:', error);
        return null;
    }
}

// UI 헬퍼 함수들
function showLoading(message) {
    const overlay = document.getElementById('loadingOverlay');
    if (!overlay) {
        // Loading overlay가 없으면 생성
        const loadingHTML = `
            <div id="loadingOverlay" class="loading-overlay">
                <div class="loading-content">
                    <div class="spinner-large"></div>
                    <p class="loading-text">${message || 'Đang xử lý...'}</p>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', loadingHTML);
        return;
    }
    const text = overlay.querySelector('.loading-text');
    text.textContent = message || 'Đang xử lý...';
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

function showPointsAnimation(points) {
    // TODO: 포인트 획득 애니메이션 구현
    console.log(`+${points} 포인트 획득!`);
}

// 활동 기록 함수
async function recordActivity(activityType, contentIdeaId, viewedIds = null, uploadId = null) {
    try {
        const activityData = {
            user_id: currentState.userId,
            session_id: currentState.sessionId,
            activity_type: activityType,
            content_idea_id: contentIdeaId,
            upload_id: uploadId,
            points_earned: 0,
            company_id: currentState.companyId || null,  // 별도 컬럼으로 추가
            store_id: currentState.storeId || null,      // 별도 컬럼으로 추가
            metadata: {
                user_name: currentState.userName,
                company_id: currentState.companyId || null,
                store_id: currentState.storeId || null
            }
        };
        
        // 포인트 계산
        switch (activityType) {
            case 'choose':
                activityData.points_earned = GAME_CONFIG.points.select_idea || 10;
                break;
            case 'upload':
                activityData.points_earned = (GAME_CONFIG.points.upload_video || 50) + (GAME_CONFIG.points.complete || 20);
                break;
        }
        
        // 추가 메타데이터
        if (viewedIds) {
            activityData.metadata.viewed_ideas = viewedIds;
        }
        
        const { error } = await supabaseClient
            .from('user_activities')
            .insert([activityData]);
        
        if (error) throw error;
        
        // 활동 후 사용자 진행 상황 업데이트
        await updateUserProgress();
        
    } catch (error) {
        console.error('활동 기록 오류:', error);
    }
}

// 사용자 진행 상황 업데이트
async function updateUserProgress() {
    try {
        // 먼저 총 업로드 수 계산
        const { count, error: countError } = await supabaseClient
            .from('content_uploads')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', currentState.userId);
        
        const totalUploads = countError ? 0 : (count || 0);
        
        const updateData = {
            total_points: currentState.userPoints,
            current_level: currentState.userLevel,
            streak_days: currentState.userStreak,
            last_activity_date: new Date().toISOString().split('T')[0],
            total_uploads: totalUploads,
            company_id: currentState.companyId || null,  // 별도 컬럼으로 추가
            store_id: currentState.storeId || null,      // 별도 컬럼으로 추가
            updated_at: new Date().toISOString()
        };
        
        // metadata에 사용자 정보 업데이트
        if (currentState.userName || currentState.companyId || currentState.storeId) {
            const { data: existingData } = await supabaseClient
                .from('user_progress')
                .select('metadata')
                .eq('user_id', currentState.userId)
                .single();
            
            updateData.metadata = {
                ...(existingData?.metadata || {}),
                name: currentState.userName,
                company_id: currentState.companyId || null,
                store_id: currentState.storeId || null,
                email: currentState.userEmail || null,
                last_updated: new Date().toISOString()
            };
        }
        
        const { error } = await supabaseClient
            .from('user_progress')
            .update(updateData)
            .eq('user_id', currentState.userId);
        
        if (error) throw error;
        
        console.log('사용자 진행 상황 업데이트:', updateData);
    } catch (error) {
        console.error('사용자 진행 상황 업데이트 오류:', error);
    }
}

// 즉시 포인트만 업데이트하는 함수
async function updateUserProgressImmediate() {
    try {
        const updateData = {
            total_points: currentState.userPoints,
            current_level: currentState.userLevel,
            updated_at: new Date().toISOString()
        };
        
        const { error } = await supabaseClient
            .from('user_progress')
            .update(updateData)
            .eq('user_id', currentState.userId);
        
        if (error) throw error;
        
        console.log('포인트 즉시 업데이트:', {
            points: currentState.userPoints,
            level: currentState.userLevel
        });
    } catch (error) {
        console.error('포인트 즉시 업데이트 오류:', error);
        throw error;
    }
}

// 사용자 정보 표시 함수
function displayUserInfo() {
    const userInfoElement = document.getElementById('userInfo');
    if (userInfoElement && currentState.userName) {
        document.getElementById('displayUserName').textContent = currentState.userName;
        // 회사/지점 정보 표시 (UUID 축약)
        let infoText = '';
        if (currentState.companyId) {
            // UUID 처음 8자리만 표시
            const shortCompanyId = currentState.companyId.length > 8 ? 
                currentState.companyId.substring(0, 8) + '...' : currentState.companyId;
            infoText += `Company: ${shortCompanyId}`;
        }
        if (currentState.storeId) {
            // UUID 처음 8자리만 표시
            const shortStoreId = currentState.storeId.length > 8 ? 
                currentState.storeId.substring(0, 8) + '...' : currentState.storeId;
            infoText += infoText ? ` | Store: ${shortStoreId}` : `Store: ${shortStoreId}`;
        }
        document.getElementById('displayUserDepartment').textContent = infoText || 'Unknown';
        userInfoElement.style.display = 'flex';
    }
}

// 사용자 상세 통계 표시
async function displayUserDetailedStats() {
    try {
        // 총 업로드 수 가져오기
        const { data: uploads, error: uploadsError } = await supabaseClient
            .from('content_uploads')
            .select('*')
            .eq('user_id', currentState.userId);
        
        // 오늘 업로드 수 계산
        const today = new Date().toISOString().split('T')[0];
        const todayUploads = uploads?.filter(upload => 
            upload.created_at.startsWith(today)
        ).length || 0;
        
        // UI 업데이트
        const totalUploads = uploads?.length || 0;
        document.getElementById('totalUploads').textContent = totalUploads;
        document.getElementById('todayUploads').textContent = todayUploads;
        document.getElementById('totalPointsDisplay').textContent = currentState.userPoints;
        document.getElementById('currentLevelDisplay').textContent = currentState.userLevel;
        
        // 통계 섹션 표시
        const statsElement = document.getElementById('userDetailedStats');
        if (statsElement && currentState.userId) {
            statsElement.style.display = 'block';
        }
        
        console.log('사용자 통계:', {
            userId: currentState.userId,
            userName: currentState.userName,
            companyId: currentState.companyId,
            storeId: currentState.storeId,
            totalPoints: currentState.userPoints,
            level: currentState.userLevel,
            totalUploads: totalUploads,
            todayUploads: todayUploads,
            streak: currentState.userStreak
        });
        
    } catch (error) {
        console.error('사용자 통계 조회 오류:', error);
    }
}

// 포인트 가이드 모달 표시
function showPointsModal() {
    const modal = document.getElementById('pointsModal');
    modal.classList.add('show');
    document.body.style.overflow = 'hidden'; // 모바일에서 배경 스크롤 방지
}

// 포인트 가이드 모달 닫기
function closePointsModal(event) {
    // event가 있고 modal-content를 클릭한 경우는 닫지 않음
    if (event && event.target !== event.currentTarget) {
        return;
    }
    
    const modal = document.getElementById('pointsModal');
    modal.classList.remove('show');
    document.body.style.overflow = ''; // 스크롤 복원
}

// 아이디어 카드 토글 함수
function toggleIdeaCard(cardId) {
    const details = document.getElementById(`details-${cardId}`);
    const expandIcon = document.getElementById(`expand-${cardId}`);
    const card = document.getElementById(cardId);
    
    if (details.style.display === 'none') {
        // 다른 열려있는 카드 닫기
        document.querySelectorAll('.idea-card-details').forEach(detail => {
            if (detail.id !== `details-${cardId}`) {
                detail.style.display = 'none';
                const otherCardId = detail.id.replace('details-', '');
                const otherIcon = document.getElementById(`expand-${otherCardId}`);
                if (otherIcon) {
                    otherIcon.querySelector('.expand-arrow').textContent = '▼';
                }
                const otherCard = document.getElementById(otherCardId);
                if (otherCard) {
                    otherCard.classList.remove('expanded');
                }
            }
        });
        
        // 현재 카드 열기
        details.style.display = 'block';
        expandIcon.querySelector('.expand-arrow').textContent = '▲';
        card.classList.add('expanded');
        
        // 모바일에서 카드가 화면에 보이도록 스크롤
        setTimeout(() => {
            card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }, 300);
    } else {
        // 카드 닫기
        details.style.display = 'none';
        expandIcon.querySelector('.expand-arrow').textContent = '▼';
        card.classList.remove('expanded');
    }
}

// 시나리오 탭 전환
function switchScenarioTab(tabName) {
    // 모든 탭 버튼과 패널 비활성화
    document.querySelectorAll('.tab-button').forEach(btn => {
        btn.classList.remove('active');
    });
    document.querySelectorAll('.tab-panel').forEach(panel => {
        panel.classList.remove('active');
    });
    
    // 선택된 탭 활성화
    event.target.closest('.tab-button').classList.add('active');
    document.getElementById(`${tabName}-tab`).classList.add('active');
}

// 타임라인 아이템 토글
function toggleTimelineItem(itemId) {
    const content = document.getElementById(itemId);
    const item = content.parentElement;
    const expand = item.querySelector('.timeline-expand');
    
    if (content.style.display === 'none') {
        // 다른 열려있는 아이템 닫기
        document.querySelectorAll('.timeline-content').forEach(tc => {
            if (tc.id !== itemId) {
                tc.style.display = 'none';
                tc.parentElement.querySelector('.timeline-expand').textContent = '▼';
            }
        });
        
        // 현재 아이템 열기
        content.style.display = 'block';
        expand.textContent = '▲';
    } else {
        // 현재 아이템 닫기
        content.style.display = 'none';
        expand.textContent = '▼';
    }
}

// 캡션 복사
function copyCaption() {
    if (window.currentScenarioIdea && window.currentScenarioIdea.caption_template) {
        navigator.clipboard.writeText(window.currentScenarioIdea.caption_template)
            .then(() => {
                showSuccess('Caption đã được sao chép!');
                // 버튼 텍스트 임시 변경
                const btn = event.target.closest('.copy-button');
                const originalText = btn.innerHTML;
                btn.innerHTML = '<span>✅ Đã sao chép!</span>';
                setTimeout(() => {
                    btn.innerHTML = originalText;
                }, 2000);
            })
            .catch(err => {
                showError('Không thể sao chép caption');
            });
    }
}

// 글로벌 함수로 내보내기
window.backToIdeas = backToIdeas;
window.startRecording = startRecording;
window.backToScenario = backToScenario;
window.createAnother = createAnother;
window.viewLeaderboard = viewLeaderboard;
window.closeError = closeError;
window.showPointsModal = showPointsModal;
window.closePointsModal = closePointsModal;
window.toggleIdeaCard = toggleIdeaCard;
window.selectIdea = selectIdea;
window.switchScenarioTab = switchScenarioTab;
window.toggleTimelineItem = toggleTimelineItem;
window.copyCaption = copyCaption;
window.showRankingModal = showRankingModal;
window.closeRankingModal = closeRankingModal;
window.switchRankingTab = switchRankingTab;

// ========================================
// 커스텀 아이디어 기능 추가
// ========================================

// 커스텀 아이디어 모달 표시
function showCustomIdeaModal() {
    // 모달이 없으면 생성
    if (!document.getElementById('customIdeaModal')) {
        const modalHTML = `
            <div class="modal-overlay" id="customIdeaModal" onclick="closeCustomIdeaModal(event)">
                <div class="modal-content custom-idea-modal" onclick="event.stopPropagation()">
                    <div class="modal-header">
                        <h3>💡 Tạo ý tưởng của riêng bạn</h3>
                        <button class="modal-close" onclick="closeCustomIdeaModal()">×</button>
                    </div>
                    <div class="modal-body">
                        <form id="customIdeaForm">
                            <div class="form-group">
                                <label>Tiêu đề ý tưởng *</label>
                                <input type="text" id="customTitle" required placeholder="VD: Giới thiệu món ăn đặc biệt">
                            </div>
                            
                            <div class="form-row">
                                <div class="form-group">
                                    <label>Danh mục</label>
                                    <select id="customCategory">
                                        <option value="">Chọn danh mục</option>
                                        <option value="일상">일상 (Cuộc sống)</option>
                                        <option value="음식">음식 (Ẩm thực)</option>
                                        <option value="패션">패션 (Thời trang)</option>
                                        <option value="뷰티">뷰티 (Làm đẹp)</option>
                                        <option value="여행">여행 (Du lịch)</option>
                                        <option value="정보">정보 (Thông tin)</option>
                                    </select>
                                </div>
                                
                                <div class="form-group">
                                    <label>Cảm xúc</label>
                                    <select id="customEmotion">
                                        <option value="">Chọn cảm xúc</option>
                                        <option value="기쁨">기쁨 (Vui vẻ)</option>
                                        <option value="놀람">놀람 (Ngạc nhiên)</option>
                                        <option value="감동">감동 (Cảm động)</option>
                                        <option value="재미">재미 (Hài hước)</option>
                                        <option value="유용">유용 (Hữu ích)</option>
                                    </select>
                                </div>
                            </div>
                            
                            <div class="form-group">
                                <label>Đối tượng mục tiêu</label>
                                <input type="text" id="customTarget" placeholder="VD: Khách hàng trẻ, Gia đình có con nhỏ">
                            </div>
                            
                            <div class="form-group">
                                <label>Nội dung chi tiết</label>
                                <textarea id="customContent" rows="4" placeholder="Mô tả chi tiết ý tưởng của bạn..."></textarea>
                            </div>
                            
                            <div class="form-group">
                                <label>Lời kêu gọi hành động (CTA)</label>
                                <input type="text" id="customCTA" placeholder="VD: Ghé thăm cửa hàng ngay hôm nay!">
                            </div>
                            
                            <div class="form-group">
                                <label>Hashtag viral (cách nhau bằng dấu phẩy)</label>
                                <input type="text" id="customTags" placeholder="VD: trending, daily, musttry">
                            </div>
                            
                            <div class="form-actions">
                                <button type="button" class="btn btn-secondary" onclick="closeCustomIdeaModal()">Hủy</button>
                                <button type="submit" class="btn btn-primary">Tạo ý tưởng</button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        
        // Form submit handler
        document.getElementById('customIdeaForm').addEventListener('submit', handleCustomIdeaSubmit);
    }
    
    document.getElementById('customIdeaModal').classList.add('show');
    document.body.style.overflow = 'hidden';
}

// 커스텀 아이디어 모달 닫기
function closeCustomIdeaModal(event) {
    if (event && event.target !== event.currentTarget) {
        return;
    }
    
    const modal = document.getElementById('customIdeaModal');
    modal.classList.remove('show');
    document.body.style.overflow = '';
    
    // 폼 초기화
    document.getElementById('customIdeaForm').reset();
}

// 커스텀 아이디어 제출 처리
async function handleCustomIdeaSubmit(e) {
    e.preventDefault();
    
    const form = e.target;
    const submitButton = form.querySelector('button[type="submit"]');
    submitButton.disabled = true;
    
    showLoading('Đang tạo ý tưởng...');
    
    try {
        // 폼 데이터 수집
        const title = document.getElementById('customTitle').value;
        const category = document.getElementById('customCategory').value || null;
        const emotion = document.getElementById('customEmotion').value || null;
        const target = document.getElementById('customTarget').value || null;
        const content = document.getElementById('customContent').value || null;
        const cta = document.getElementById('customCTA').value || null;
        const tags = document.getElementById('customTags').value
            .split(',')
            .map(tag => tag.trim())
            .filter(tag => tag.length > 0);
        
        // 시나리오 구조 생성 - 컨텐츠가 있을 때만
        let scenario = null;
        if (content) {
            scenario = {
                hook1: `0-3s: ${title}`,
                body1: `4-15s: ${content.substring(0, 100)}`,
                body2: `16-25s: ${content.substring(100) || '더 자세한 내용 소개'}`,
                conclusion: `26-30s: ${cta || '지금 확인해보세요!'}`
            };
        }
        
        // 데이터베이스에 저장할 데이터 준비
        const ideaData = {
            title_vi: title,
            is_auto_created: false,  // 중요: 사용자가 만든 아이디어임을 표시
            created_by_user_id: currentState.userId,
            custom_idea_metadata: {
                created_by: currentState.userName,
                company_id: currentState.companyId,
                store_id: currentState.storeId,
                created_at: new Date().toISOString()
            }
        };
        
        // 선택적 필드 추가 (null이 아닌 경우만)
        if (category) ideaData.category = category;
        if (emotion) ideaData.emotion = emotion;
        if (target) ideaData.target_audience = target;
        if (scenario) ideaData.scenario = scenario;
        if (cta) ideaData.cta_message = cta;
        if (content) ideaData.custom_idea_metadata.content = content;
        
        // 태그 처리
        if (tags.length > 0) {
            ideaData.viral_tags = tags;
        } else {
            ideaData.viral_tags = ['custom', 'creative'];
        }
        
        // 데이터베이스에 저장
        const { data: newIdea, error } = await supabaseClient
            .from('contents_idea')
            .insert([ideaData])
            .select()
            .single();
        
        if (error) throw error;
        
        // 성공 메시지
        showSuccess('Ý tưởng của bạn đã được tạo thành công!');
        
        // 모달 닫기
        closeCustomIdeaModal();
        
        // 생성한 아이디어 바로 선택
        await selectIdea(newIdea);
        
    } catch (error) {
        console.error('커스텀 아이디어 생성 오류:', error);
        showError('Có lỗi khi tạo ý tưởng. Vui lòng thử lại.');
        submitButton.disabled = false;
    } finally {
        hideLoading();
    }
}

// 전역 함수로 내보내기
window.showCustomIdeaModal = showCustomIdeaModal;
window.closeCustomIdeaModal = closeCustomIdeaModal;

// ========================================
// 3. 스토어별 성과 비교 시스템
// ========================================

// 팀 성과 모달 표시
async function showTeamPerformanceModal() {
    // 모달이 없으면 생성
    if (!document.getElementById('teamPerformanceModal')) {
        const teamPerformanceModalHTML = `
            <div class="modal-overlay" id="teamPerformanceModal" onclick="closeTeamPerformanceModal(event)">
                <div class="modal-content team-performance-modal" onclick="event.stopPropagation()">
                    <div class="modal-header">
                        <h3>📊 Thành tích của cửa hàng</h3>
                        <button class="modal-close" onclick="closeTeamPerformanceModal()">×</button>
                    </div>
                    <div class="team-performance-tabs">
                        <button class="performance-tab active" onclick="switchPerformanceTab('today')">
                            <span class="tab-icon">📅</span>
                            <span class="tab-text">Hôm nay</span>
                        </button>
                        <button class="performance-tab" onclick="switchPerformanceTab('week')">
                            <span class="tab-icon">📆</span>
                            <span class="tab-text">Tuần này</span>
                        </button>
                        <button class="performance-tab" onclick="switchPerformanceTab('month')">
                            <span class="tab-icon">📊</span>
                            <span class="tab-text">Tháng này</span>
                        </button>
                    </div>
                    <div class="performance-content">
                        <!-- 오늘 성과 -->
                        <div id="today-performance" class="performance-panel active">
                            <div class="performance-stats-grid">
                                <div class="performance-stat-card">
                                    <div class="stat-icon-container">
                                        <img src="data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2' stroke='%234A90E2' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'/%3E%3Ccircle cx='9' cy='7' r='4' stroke='%234A90E2' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'/%3E%3Cpath d='M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75' stroke='%234A90E2' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E" alt="users">
                                    </div>
                                    <div class="stat-number" id="todayActiveUsers">0</div>
                                    <div class="stat-label">Thành viên hoạt động</div>
                                </div>
                                <div class="performance-stat-card">
                                    <div class="stat-icon-container">
                                        <img src="data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Crect x='2' y='7' width='20' height='15' rx='2' ry='2' stroke='%23616161' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'/%3E%3Cpolygon points='16 2 16 7 21 7' stroke='%23616161' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E" alt="video">
                                    </div>
                                    <div class="stat-number" id="todayUploads">0</div>
                                    <div class="stat-label">Video đã tải</div>
                                </div>
                                <div class="performance-stat-card primary">
                                    <div class="stat-icon-container">
                                        <img src="data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpolygon points='12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2' stroke='%23FFC107' stroke-width='2' stroke-linecap='round' stroke-linejoin='round' fill='%23FFC107'/%3E%3C/svg%3E" alt="star">
                                    </div>
                                    <div class="stat-number" id="todayPoints">0</div>
                                    <div class="stat-label">Tổng điểm</div>
                                </div>
                            </div>
                        </div>
                        
                        <!-- 주간 성과 -->
                        <div id="week-performance" class="performance-panel">
                            <div class="performance-stats-grid">
                                <div class="performance-stat-card">
                                    <div class="stat-icon-container">
                                        <img src="data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2' stroke='%234A90E2' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'/%3E%3Ccircle cx='9' cy='7' r='4' stroke='%234A90E2' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'/%3E%3Cpath d='M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75' stroke='%234A90E2' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E" alt="users">
                                    </div>
                                    <div class="stat-number" id="weekActiveUsers">0</div>
                                    <div class="stat-label">Thành viên hoạt động</div>
                                </div>
                                <div class="performance-stat-card">
                                    <div class="stat-icon-container">
                                        <img src="data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Crect x='2' y='7' width='20' height='15' rx='2' ry='2' stroke='%23616161' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'/%3E%3Cpolygon points='16 2 16 7 21 7' stroke='%23616161' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E" alt="video">
                                    </div>
                                    <div class="stat-number" id="weekUploads">0</div>
                                    <div class="stat-label">Video đã tải</div>
                                </div>
                                <div class="performance-stat-card primary">
                                    <div class="stat-icon-container">
                                        <img src="data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpolygon points='12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2' stroke='%23FFC107' stroke-width='2' stroke-linecap='round' stroke-linejoin='round' fill='%23FFC107'/%3E%3C/svg%3E" alt="star">
                                    </div>
                                    <div class="stat-number" id="weekPoints">0</div>
                                    <div class="stat-label">Tổng điểm</div>
                                </div>
                            </div>
                        </div>
                        
                        <!-- 월간 성과 -->
                        <div id="month-performance" class="performance-panel">
                            <div class="performance-stats-grid">
                                <div class="performance-stat-card">
                                    <div class="stat-icon-container">
                                        <img src="data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2' stroke='%234A90E2' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'/%3E%3Ccircle cx='9' cy='7' r='4' stroke='%234A90E2' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'/%3E%3Cpath d='M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75' stroke='%234A90E2' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E" alt="users">
                                    </div>
                                    <div class="stat-number" id="monthActiveUsers">0</div>
                                    <div class="stat-label">Thành viên hoạt động</div>
                                </div>
                                <div class="performance-stat-card">
                                    <div class="stat-icon-container">
                                        <img src="data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Crect x='2' y='7' width='20' height='15' rx='2' ry='2' stroke='%23616161' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'/%3E%3Cpolygon points='16 2 16 7 21 7' stroke='%23616161' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E" alt="video">
                                    </div>
                                    <div class="stat-number" id="monthUploads">0</div>
                                    <div class="stat-label">Video đã tải</div>
                                </div>
                                <div class="performance-stat-card primary">
                                    <div class="stat-icon-container">
                                        <img src="data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpolygon points='12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2' stroke='%23FFC107' stroke-width='2' stroke-linecap='round' stroke-linejoin='round' fill='%23FFC107'/%3E%3C/svg%3E" alt="star">
                                    </div>
                                    <div class="stat-number" id="monthPoints">0</div>
                                    <div class="stat-label">Tổng điểm</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', teamPerformanceModalHTML);
        
        // Chart.js 로드 확인 제거 - 필요없음
    }
    
    document.getElementById('teamPerformanceModal').classList.add('show');
    document.body.style.overflow = 'hidden';
    
    // 기본 탭 데이터 로드
    await loadPerformanceData('daily');
}

// 팀 성과 모달 닫기
function closeTeamPerformanceModal(event) {
    if (event && event.target !== event.currentTarget) return;
    
    document.getElementById('teamPerformanceModal').classList.remove('show');
    document.body.style.overflow = '';
}

// 성과 탭 전환
async function switchPerformanceTab(period) {
    // 탭 활성화 상태 변경
    document.querySelectorAll('.performance-tab').forEach(tab => {
        tab.classList.remove('active');
    });
    event.target.closest('.performance-tab').classList.add('active');
    
    // 패널 표시/숨기기
    document.querySelectorAll('.performance-panel').forEach(panel => {
        panel.classList.remove('active');
    });
    document.getElementById(`${period}-performance`).classList.add('active');
    
    // 데이터 로드
    await loadPerformanceData(period);
}

// 성과 데이터 로드
async function loadPerformanceData(period) {
    if (!currentState.storeId) {
        showError('Không tìm thấy thông tin cửa hàng');
        return;
    }
    
    try {
        // 간단한 통계 공식
        const { data: statsData, error: statsError } = await supabaseClient
            .rpc('get_store_stats', {
                p_store_id: currentState.storeId,
                p_period: period
            });
        
        if (statsError) throw statsError;
        
        const stats = statsData?.[0] || { active_members: 0, total_videos: 0, total_points: 0 };
        
        // UI 업데이트
        if (period === 'today') {
            document.getElementById('todayActiveUsers').textContent = stats.active_members;
            document.getElementById('todayUploads').textContent = stats.total_videos;
            document.getElementById('todayPoints').textContent = stats.total_points;
            
            // 오늘 활동이 없을 때 안내 메시지
            if (stats.active_members === 0 && stats.total_videos === 0) {
                const panel = document.getElementById('today-performance');
                const statsGrid = panel.querySelector('.performance-stats-grid');
                statsGrid.insertAdjacentHTML('afterend', `
                    <div class="empty-state-message" style="text-align: center; padding: 2rem; color: var(--text-secondary); background: var(--background-color); border-radius: 12px; margin-top: 1rem;">
                        <p style="font-size: 1.1rem; margin-bottom: 0.5rem;">🎬 Chưa có hoạt động nào hôm nay!</p>
                        <p>Hãy là người đầu tiên tạo nội dung hôm nay!</p>
                    </div>
                `);
            }
        } else if (period === 'week') {
            document.getElementById('weekActiveUsers').textContent = stats.active_members;
            document.getElementById('weekUploads').textContent = stats.total_videos;
            document.getElementById('weekPoints').textContent = stats.total_points;
        } else if (period === 'month') {
            document.getElementById('monthActiveUsers').textContent = stats.active_members;
            document.getElementById('monthUploads').textContent = stats.total_videos;
            document.getElementById('monthPoints').textContent = stats.total_points;
        }
        
    } catch (error) {
        console.error('성과 데이터 로드 오류:', error);
        // 오류 시 기본값 표시
        if (period === 'today') {
            document.getElementById('todayActiveUsers').textContent = '0';
            document.getElementById('todayUploads').textContent = '0';
            document.getElementById('todayPoints').textContent = '0';
        } else if (period === 'week') {
            document.getElementById('weekActiveUsers').textContent = '0';
            document.getElementById('weekUploads').textContent = '0';
            document.getElementById('weekPoints').textContent = '0';
        } else if (period === 'month') {
            document.getElementById('monthActiveUsers').textContent = '0';
            document.getElementById('monthUploads').textContent = '0';
            document.getElementById('monthPoints').textContent = '0';
        }
    }
}

// 더 많은 랭킹 로드
async function loadMoreRankings(type) {
    const listId = type === 'company' ? 'companyRankingList' : 'storeRankingList';
    const listElement = document.getElementById(listId);
    
    // 로딩 표시
    const checkAllDiv = listElement.querySelector('.check-all-ranking');
    if (checkAllDiv) {
        checkAllDiv.innerHTML = '<div class="spinner"></div>';
    }
    
    try {
        let data;
        
        if (type === 'company') {
            // 회사 전체 모든 사용자
            const { data: rankings, error } = await supabaseClient
                .from('company_leaderboard')
                .select('*')
                .eq('company_id', currentState.companyId)
                .order('rank', { ascending: true });
            
            if (error) throw error;
            data = rankings;
        } else {
            // 가게별 모든 사용자
            const { data: rankings, error } = await supabaseClient
                .from('store_leaderboard')
                .select('*')
                .eq('store_id', currentState.storeId)
                .order('rank', { ascending: true });
            
            if (error) throw error;
            data = rankings;
        }
        
        // 사용자 이름 가져오기
        const userIds = [...new Set(data.map(item => item.user_id))];
        const { data: users } = await supabaseClient
            .from('user_progress')
            .select('user_id, metadata')
            .in('user_id', userIds);
        
        const userMap = {};
        if (users) {
            users.forEach(user => {
                userMap[user.user_id] = user.metadata?.name || 'Anonymous';
            });
        }
        
        // 전체 랭킹 다시 그리기
        await displayFullRankings(type, data, userMap);
        
    } catch (error) {
        console.error('추가 랭킹 로드 오류:', error);
        if (checkAllDiv) {
            checkAllDiv.innerHTML = '<a href="#" onclick="loadMoreRankings(\'' + type + '\'); return false;">Check all ranking</a>';
        }
    }
}

// 전체 랭킹 표시
async function displayFullRankings(type, data, userMap) {
    const listId = type === 'company' ? 'companyRankingList' : 'storeRankingList';
    const listElement = document.getElementById(listId);
    
    const top2 = data.slice(0, 2);
    const rest = data.slice(2);
    
    let rankingHTML = '';
    
    // TOP 2 특별 표시
    if (top2.length > 0) {
        rankingHTML += '<div class="top-rankings">';
        rankingHTML += top2.map((item, index) => {
            const isCurrentUser = item.user_id === currentState.userId;
            const userName = userMap[item.user_id] || 'Anonymous';
            const levelInfo = GAME_CONFIG.levels[item.current_level - 1] || GAME_CONFIG.levels[0];
            const medal = index === 0 ? '🥇' : '🥈';
            
            return `
                <div class="top-ranking-card ${isCurrentUser ? 'current-user' : ''}">
                    <div class="medal">${medal}</div>
                    <div class="top-user-info">
                        <div class="top-user-name">${userName}</div>
                        <div class="top-user-level">${levelInfo.icon} Level: ${item.current_level}</div>
                    </div>
                    <div class="top-user-points">
                        <div class="points-number">${item.total_points}</div>
                        <div class="points-text">points</div>
                    </div>
                </div>
            `;
        }).join('');
        rankingHTML += '</div>';
    }
    
    // 나머지 순위
    if (rest.length > 0) {
        rankingHTML += '<div class="ranking-list-items" style="max-height: 600px; overflow-y: auto;">';
        rankingHTML += rest.map(item => {
            const isCurrentUser = item.user_id === currentState.userId;
            const userName = userMap[item.user_id] || 'Anonymous';
            const levelInfo = GAME_CONFIG.levels[item.current_level - 1] || GAME_CONFIG.levels[0];
            const medal = item.rank === 3 ? '🥉 ' : '';
            
            return `
                <div class="ranking-item ${isCurrentUser ? 'current-user' : ''}">
                    <div class="ranking-position">
                        ${medal}${item.rank}
                    </div>
                    <div class="ranking-user-info">
                        <div class="ranking-user-name">
                            ${userName} ${isCurrentUser ? '(Bạn)' : ''}
                        </div>
                        <div class="ranking-user-stats">
                            <span class="ranking-stat">
                                ${levelInfo.icon} Level: ${item.current_level}
                            </span>
                        </div>
                    </div>
                    <div class="ranking-points">
                        <span class="ranking-points-value">${item.total_points}</span>
                        <span class="ranking-points-label">points</span>
                    </div>
                </div>
            `;
        }).join('');
        rankingHTML += '</div>';
    }
    
    listElement.innerHTML = rankingHTML;
}

// 전역 함수로 내보내기
window.showTeamPerformanceModal = showTeamPerformanceModal;
window.closeTeamPerformanceModal = closeTeamPerformanceModal;
window.switchPerformanceTab = switchPerformanceTab;
window.loadMoreRankings = loadMoreRankings;

// 갤러리로 네비게이션
function navigateToGallery(event) {
    event.preventDefault();
    const params = new URLSearchParams();
    if (currentState.userId) params.append('user_id', currentState.userId);
    if (currentState.userName) params.append('user_name', currentState.userName);
    if (currentState.companyId) params.append('company_id', currentState.companyId);
    if (currentState.storeId) params.append('store_id', currentState.storeId);
    
    window.location.href = `video-gallery.html?${params.toString()}`;
}

// 비디오 리뷰로 네비게이션
function navigateToReview(event) {
    event.preventDefault();
    const params = new URLSearchParams();
    if (currentState.userId) params.append('user_id', currentState.userId);
    if (currentState.userName) params.append('user_name', currentState.userName);
    if (currentState.companyId) params.append('company_id', currentState.companyId);
    if (currentState.storeId) params.append('store_id', currentState.storeId);
    
    window.location.href = `video-review.html?${params.toString()}`;
}

window.navigateToGallery = navigateToGallery;
window.navigateToReview = navigateToReview;


