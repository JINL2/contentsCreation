// 프론트엔드에서 커스텀 아이디어 생성 시뮬레이션
async function testCustomIdeaCreation() {
    console.log("=== 커스텀 아이디어 생성 테스트 시작 ===");
    
    // Supabase 클라이언트 초기화
    const { createClient } = supabase;
    const supabaseClient = createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey);
    
    // 테스트 데이터
    const testCustomIdea = {
        title: "Khuyến mãi cuối tuần - Giảm giá 30%",
        category: "정보",
        emotion: "기쁨",
        target: "Khách hàng thân thiết, người yêu thích ưu đãi",
        content: "Cuối tuần này, cửa hàng chúng tôi có chương trình khuyến mãi đặc biệt! Giảm giá 30% cho tất cả sản phẩm. Đây là cơ hội tuyệt vời để bạn mua sắm với giá ưu đãi. Nhanh tay đến cửa hàng để không bỏ lỡ!",
        cta: "Ghé cửa hàng ngay cuối tuần này!",
        tags: "khuyenmai, sale, weekend, uudai"
    };
    
    // 사용자 정보 (Jin)
    const currentUser = {
        userId: "0d2e61ad-e230-454e-8b90-efbe1c1a9268",
        userName: "Jin",
        companyId: "ebd66ba7-fde7-4332-b6b5-0d8a7f615497",
        storeId: "16f4c231-185a-4564-b473-bad1e9b305e8"
    };
    
    try {
        console.log("1. 폼 데이터 준비 중...");
        
        // 시나리오 구조 생성
        const scenario = {
            hook1: `0-3s: ${testCustomIdea.title}`,
            body1: `4-15s: ${testCustomIdea.content.substring(0, 100)}`,
            body2: `16-25s: ${testCustomIdea.content.substring(100) || 'Đừng bỏ lỡ cơ hội này!'}`,
            conclusion: `26-30s: ${testCustomIdea.cta}`
        };
        
        // 태그 처리
        const viralTags = testCustomIdea.tags
            .split(',')
            .map(tag => tag.trim())
            .filter(tag => tag.length > 0);
        
        console.log("2. Supabase에 저장 중...");
        
        // 데이터베이스에 저장
        const { data: newIdea, error } = await supabaseClient
            .from('contents_idea')
            .insert([{
                title_vi: testCustomIdea.title,
                title_ko: testCustomIdea.title,
                category: testCustomIdea.category,
                emotion: testCustomIdea.emotion,
                target_audience: testCustomIdea.target,
                scenario: scenario,
                cta_message: testCustomIdea.cta,
                viral_tags: viralTags,
                is_auto_created: false,  // 중요: 사용자가 만든 아이디어
                created_by_user_id: currentUser.userId,
                custom_idea_metadata: {
                    content: testCustomIdea.content,
                    created_by: currentUser.userName,
                    company_id: currentUser.companyId,
                    store_id: currentUser.storeId,
                    created_at: new Date().toISOString()
                },
                hook_text: testCustomIdea.title,
                filming_tips: 'Quay cận cảnh sản phẩm khuyến mãi. Tạo không khí sôi động, vui vẻ.',
                caption_template: `🎉 ${testCustomIdea.title}

${testCustomIdea.content}

📍 Địa chỉ: [Điền địa chỉ cửa hàng]
⏰ Thời gian: Thứ 7 & Chủ nhật
📞 Hotline: [Điền số điện thoại]`,
                hashtags: ['#khuyenmai', '#sale', '#weekend', '#uudai', '#giam30']
            }])
            .select()
            .single();
        
        if (error) {
            throw error;
        }
        
        console.log("3. ✅ 저장 성공!");
        console.log("새로운 아이디어 ID:", newIdea.id);
        console.log("제목:", newIdea.title_vi);
        console.log("타입:", newIdea.is_auto_created ? "자동 생성" : "사용자 생성");
        console.log("생성자:", newIdea.created_by_user_id);
        
        // 저장된 아이디어 확인
        console.log("\n4. 저장된 아이디어 확인 중...");
        
        const { data: savedIdea, error: fetchError } = await supabaseClient
            .from('contents_idea')
            .select('*')
            .eq('id', newIdea.id)
            .single();
        
        if (savedIdea) {
            console.log("✅ 데이터베이스에서 확인됨!");
            console.log("- is_auto_created:", savedIdea.is_auto_created);
            console.log("- created_by_user_id:", savedIdea.created_by_user_id);
            console.log("- custom_idea_metadata:", JSON.stringify(savedIdea.custom_idea_metadata, null, 2));
        }
        
        return newIdea;
        
    } catch (error) {
        console.error("❌ 오류 발생:", error);
        return null;
    }
}

// 페이지 로드 시 자동 실행
if (typeof window !== 'undefined') {
    window.testCustomIdeaCreation = testCustomIdeaCreation;
    console.log("테스트 함수가 준비되었습니다. 콘솔에서 testCustomIdeaCreation()을 실행하세요.");
}
