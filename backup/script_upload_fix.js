// handleUpload 함수 수정 - NULL 체크 강화
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
        
        // company_id와 store_id 확인 및 검증
        const companyId = currentState.companyId || null;
        const storeId = currentState.storeId || null;
        
        console.log('Upload data validation:', {
            userId: currentState.userId,
            companyId: companyId,
            storeId: storeId,
            hasCompanyId: !!companyId,
            hasStoreId: !!storeId
        });
        
        // content_uploads 테이블에 저장
        const totalPoints = calculateTotalPoints();
        const uploadData = {
            content_idea_id: currentState.selectedIdea.id,
            user_id: currentState.userId,
            video_url: publicUrl,
            title: videoTitle || currentState.selectedIdea.title_ko,
            description: videoDescription,
            file_size: currentState.uploadedVideo.size,
            points_earned: totalPoints,
            status: 'uploaded',
            company_id: companyId,  // NULL이어도 명시적으로 저장
            store_id: storeId,      // NULL이어도 명시적으로 저장
            metadata: {
                category: currentState.selectedIdea.category,
                emotion: currentState.selectedIdea.emotion,
                tags: currentState.selectedIdea.viral_tags || [],
                original_filename: currentState.uploadedVideo.name,
                company_id: companyId,
                store_id: storeId,
                user_name: currentState.userName
            },
            device_info: {
                userAgent: navigator.userAgent,
                platform: navigator.platform
            }
        };
        
        // 데이터 검증 로그
        console.log('Uploading with data:', uploadData);
        
        const { data: uploadRecord, error: uploadRecordError } = await supabaseClient
            .from('content_uploads')
            .insert([uploadData])
            .select()
            .single();
        
        if (uploadRecordError) {
            console.error('Upload record error:', uploadRecordError);
            throw uploadRecordError;
        }
        
        console.log('Upload successful:', uploadRecord);
        
        // contents_idea 테이블 업데이트
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
        addPoints(GAME_CONFIG.points.upload_video || 50);
        if (videoTitle || videoDescription) {
            addPoints(GAME_CONFIG.points.add_metadata || 20);
        }
        addPoints(GAME_CONFIG.points.complete || 20);
        
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

// recordActivity 함수도 수정
async function recordActivity(activityType, contentIdeaId, viewedIds = null, uploadId = null) {
    try {
        // company_id와 store_id 확인
        const companyId = currentState.companyId || null;
        const storeId = currentState.storeId || null;
        
        const activityData = {
            user_id: currentState.userId,
            session_id: currentState.sessionId,
            activity_type: activityType,
            content_idea_id: contentIdeaId,
            upload_id: uploadId,
            points_earned: 0,
            company_id: companyId,  // NULL이어도 명시적으로 저장
            store_id: storeId,      // NULL이어도 명시적으로 저장
            metadata: {
                user_name: currentState.userName,
                company_id: companyId,
                store_id: storeId
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
        
        console.log('Recording activity:', activityData);
        
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
