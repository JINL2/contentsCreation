// 온보딩 시스템
class OnboardingSystem {
    constructor() {
        this.hasSeenOnboarding = localStorage.getItem('contents_helper_onboarding_completed') === 'true';
        this.currentStep = 0;
        this.steps = [
            {
                title: "🎉 Chào mừng đến với Contents Helper!",
                content: "Tạo nội dung viral chưa bao giờ dễ dàng đến thế",
                target: null,
                position: 'center'
            },
            {
                title: "💡 Chọn ý tưởng",
                content: "5 ý tưởng được AI tuyển chọn mỗi ngày. Chọn 1 và nhận ngay 10 điểm!",
                target: '.idea-cards',
                position: 'bottom'
            },
            {
                title: "🎬 Quay video",
                content: "Làm theo kịch bản chi tiết. Mỗi video hoàn thành = 100 điểm!",
                target: '.scenario-card',
                position: 'top'
            },
            {
                title: "🏆 Lên cấp",
                content: "Tích điểm, lên level, mở khóa thành tựu và leo top bảng xếp hạng!",
                target: '.user-stats',
                position: 'bottom'
            },
            {
                title: "🎁 Thưởng hàng ngày",
                content: "Đăng nhập mỗi ngày để nhận 30 điểm bonus!",
                target: '.points-guide-button',
                position: 'bottom'
            }
        ];
    }

    start() {
        if (this.hasSeenOnboarding) return;
        
        this.createOverlay();
        this.showStep(0);
    }

    createOverlay() {
        const overlay = document.createElement('div');
        overlay.className = 'onboarding-overlay';
        overlay.innerHTML = `
            <div class="onboarding-tooltip" id="onboardingTooltip">
                <div class="onboarding-content">
                    <h3 class="onboarding-title"></h3>
                    <p class="onboarding-text"></p>
                </div>
                <div class="onboarding-actions">
                    <button class="onboarding-skip" onclick="onboarding.skip()">Bỏ qua</button>
                    <div class="onboarding-dots"></div>
                    <button class="onboarding-next" onclick="onboarding.next()">
                        <span class="next-text">Tiếp theo</span>
                        <span class="next-arrow">→</span>
                    </button>
                </div>
            </div>
            <div class="onboarding-highlight"></div>
        `;
        document.body.appendChild(overlay);
        this.overlay = overlay;
    }

    showStep(index) {
        const step = this.steps[index];
        const tooltip = document.getElementById('onboardingTooltip');
        
        // Update content
        tooltip.querySelector('.onboarding-title').textContent = step.title;
        tooltip.querySelector('.onboarding-text').textContent = step.content;
        
        // Update dots
        const dotsHtml = this.steps.map((_, i) => 
            `<span class="dot ${i === index ? 'active' : ''}"></span>`
        ).join('');
        tooltip.querySelector('.onboarding-dots').innerHTML = dotsHtml;
        
        // Update button text
        const isLastStep = index === this.steps.length - 1;
        tooltip.querySelector('.next-text').textContent = isLastStep ? 'Bắt đầu' : 'Tiếp theo';
        
        // Position tooltip
        if (step.target && step.position !== 'center') {
            const targetEl = document.querySelector(step.target);
            if (targetEl) {
                this.positionTooltip(tooltip, targetEl, step.position);
                this.highlightElement(targetEl);
            }
        } else {
            // Center position
            tooltip.style.position = 'fixed';
            tooltip.style.top = '50%';
            tooltip.style.left = '50%';
            tooltip.style.transform = 'translate(-50%, -50%)';
            this.removeHighlight();
        }
        
        // Show overlay
        this.overlay.classList.add('show');
    }

    positionTooltip(tooltip, target, position) {
        const rect = target.getBoundingClientRect();
        tooltip.style.position = 'fixed';
        
        switch(position) {
            case 'bottom':
                tooltip.style.top = `${rect.bottom + 20}px`;
                tooltip.style.left = `${rect.left + rect.width / 2}px`;
                tooltip.style.transform = 'translateX(-50%)';
                break;
            case 'top':
                tooltip.style.bottom = `${window.innerHeight - rect.top + 20}px`;
                tooltip.style.left = `${rect.left + rect.width / 2}px`;
                tooltip.style.transform = 'translateX(-50%)';
                break;
        }
    }

    highlightElement(element) {
        const highlight = this.overlay.querySelector('.onboarding-highlight');
        const rect = element.getBoundingClientRect();
        
        highlight.style.position = 'fixed';
        highlight.style.top = `${rect.top - 10}px`;
        highlight.style.left = `${rect.left - 10}px`;
        highlight.style.width = `${rect.width + 20}px`;
        highlight.style.height = `${rect.height + 20}px`;
        highlight.style.display = 'block';
    }

    removeHighlight() {
        const highlight = this.overlay.querySelector('.onboarding-highlight');
        highlight.style.display = 'none';
    }

    next() {
        this.currentStep++;
        if (this.currentStep >= this.steps.length) {
            this.complete();
        } else {
            this.showStep(this.currentStep);
        }
    }

    skip() {
        this.complete();
    }

    complete() {
        localStorage.setItem('contents_helper_onboarding_completed', 'true');
        this.overlay.classList.remove('show');
        setTimeout(() => {
            this.overlay.remove();
        }, 300);
        
        // Show welcome animation
        showWelcomeAnimation();
    }
}

// Welcome animation
function showWelcomeAnimation() {
    const welcomeDiv = document.createElement('div');
    welcomeDiv.className = 'welcome-animation';
    welcomeDiv.innerHTML = `
        <div class="welcome-content">
            <div class="welcome-icon">🚀</div>
            <h2 class="welcome-title">Sẵn sàng tạo nội dung viral!</h2>
            <div class="welcome-points">
                <span class="points-animation">+30</span>
                <span class="points-label">Điểm chào mừng!</span>
            </div>
        </div>
    `;
    document.body.appendChild(welcomeDiv);
    
    // Add welcome bonus points
    if (typeof addPoints === 'function') {
        addPoints(30);
    }
    
    setTimeout(() => {
        welcomeDiv.classList.add('fade-out');
        setTimeout(() => welcomeDiv.remove(), 500);
    }, 3000);
}

// Daily bonus check
function checkDailyBonus() {
    const lastBonus = localStorage.getItem('contents_helper_last_bonus');
    const today = new Date().toDateString();
    
    if (lastBonus !== today) {
        // Show daily bonus animation
        showDailyBonusAnimation();
        localStorage.setItem('contents_helper_last_bonus', today);
        
        // Add daily bonus points
        if (typeof addPoints === 'function') {
            addPoints(30);
        }
    }
}

function showDailyBonusAnimation() {
    const bonusDiv = document.createElement('div');
    bonusDiv.className = 'daily-bonus-animation';
    bonusDiv.innerHTML = `
        <div class="bonus-content">
            <div class="bonus-icon">🎁</div>
            <h3 class="bonus-title">Thưởng đăng nhập hàng ngày!</h3>
            <div class="bonus-points">
                <span class="points-value">+30</span>
                <span class="points-text">điểm</span>
            </div>
            <div class="bonus-streak">
                🔥 Chuỗi ${currentState.userStreak + 1} ngày
            </div>
        </div>
    `;
    document.body.appendChild(bonusDiv);
    
    setTimeout(() => {
        bonusDiv.classList.add('show');
    }, 100);
    
    setTimeout(() => {
        bonusDiv.classList.add('fade-out');
        setTimeout(() => bonusDiv.remove(), 500);
    }, 4000);
}

// Initialize onboarding
const onboarding = new OnboardingSystem();

// Export for use in main script
window.onboarding = onboarding;
window.checkDailyBonus = checkDailyBonus;
