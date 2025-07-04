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

// updateScenarioCard 함수의 scenario 처리 부분을 다음과 같이 수정:
function updateScenarioCardFixed(idea) {
    const card = document.getElementById('scenarioCard');
    const emotionEmoji = EMOTION_EMOJI[idea.emotion] || '😊';
    
    // 시나리오 변환
    const structuredScenario = convertScenarioFormat(idea.scenario);
    
    let scenarioContent = '';
    if (structuredScenario) {
        const scenarioParts = [];
        
        // 시간 추출 함수
        const extractTime = (text) => {
            const match = text.match(/(\d+)[-~](\d+)s/);
            return match ? parseInt(match[1]) : 999;
        };
        
        // 각 파트 처리
        const partConfig = {
            hook1: { label: '🎬 Hook 1 (Mở đầu)', color: '#ff6b35' },
            hook2: { label: '🎯 Hook 2 (Điểm nhấn)', color: '#ff9800' },
            body1: { label: '📹 Body 1 (Phần chính 1)', color: '#2196f3' },
            body2: { label: '🎥 Body 2 (Phần chính 2)', color: '#03a9f4' },
            conclusion: { label: '✨ Conclusion (Kết thúc)', color: '#4caf50' }
        };
        
        Object.entries(partConfig).forEach(([key, config]) => {
            if (structuredScenario[key]) {
                scenarioParts.push({
                    type: key,
                    label: config.label,
                    content: structuredScenario[key],
                    time: extractTime(structuredScenario[key]),
                    color: config.color
                });
            }
        });
        
        // 시간 순서로 정렬
        scenarioParts.sort((a, b) => a.time - b.time);
        
        // HTML 생성
        scenarioContent = `
            <div class="structured-scenario">
                <div class="timeline-indicator">🕑 Thứ tự thời gian</div>
                ${scenarioParts.map(part => `
                    <div class="scenario-part ${part.type}" style="border-color: ${part.color}">
                        <div class="part-label" style="color: ${part.color}">${part.label}</div>
                        <div class="part-content">${part.content}</div>
                    </div>
                `).join('')}
            </div>
        `;
    } else if (idea.scenario) {
        // 변환할 수 없는 형식인 경우 원본 표시
        scenarioContent = `
            <div class="scenario-raw">
                <pre>${JSON.stringify(idea.scenario, null, 2)}</pre>
                <p style="color: orange;">⚠️ 시나리오 형식을 변환할 수 없습니다.</p>
            </div>
        `;
    }
    
    // 나머지 카드 내용은 동일...
    card.innerHTML = `
        <div class="scenario-header">
            <div class="scenario-title">
                <h3>${idea.title_vi}</h3>
                <p class="idea-subtitle">${idea.title_ko}</p>
                ${idea.hook_text ? `<p class="idea-hook-main">📢 Hook: ${idea.hook_text}</p>` : ''}
            </div>
            <div class="scenario-emotion">${emotionEmoji} ${idea.emotion}</div>
        </div>
        
        ${scenarioContent ? `
        <div class="scenario-section">
            <h4>🎬 Kịch bản chi tiết</h4>
            ${scenarioContent}
        </div>
        ` : ''}
        
        <!-- 나머지 섹션들... -->
    `;
}

// 테스트를 위한 샘플 데이터
const testScenarios = {
    // 구조화된 형식
    structured: {
        hook1: "0-3s: 시작 인사",
        hook2: "4-7s: 주제 소개",
        body1: "8-15s: 메인 내용 1",
        body2: "16-25s: 메인 내용 2",
        conclusion: "26-30s: 마무리"
    },
    
    // 배열 형식
    array: [
        "카메라를 보며 인사",
        "오늘의 주제 소개",
        "메인 내용 설명",
        "추가 팁 제공",
        "마무리 인사와 CTA"
    ],
    
    // 짧은 배열
    shortArray: [
        "시작",
        "메인",
        "끝"
    ]
};

// 콘솔에서 테스트
console.log('Scenario Format Converter Test:');
console.log('Structured:', convertScenarioFormat(testScenarios.structured));
console.log('Array:', convertScenarioFormat(testScenarios.array));
console.log('Short Array:', convertScenarioFormat(testScenarios.shortArray));
