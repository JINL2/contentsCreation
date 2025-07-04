-- Contents Helper Website - Scenario 형식 변환 SQL

-- 1. 현재 scenario 형식 확인
SELECT 
    id,
    title_vi,
    jsonb_typeof(scenario) as scenario_type,
    scenario
FROM contents_idea
WHERE scenario IS NOT NULL
LIMIT 10;

-- 2. 배열 형식을 구조화된 형식으로 변환하는 함수
CREATE OR REPLACE FUNCTION convert_scenario_to_structured()
RETURNS void AS $$
DECLARE
    rec RECORD;
    structured_scenario jsonb;
BEGIN
    FOR rec IN 
        SELECT id, scenario 
        FROM contents_idea 
        WHERE jsonb_typeof(scenario) = 'array' 
        AND jsonb_array_length(scenario) >= 3
    LOOP
        -- 배열의 각 요소를 구조화된 형식으로 매핑
        structured_scenario := jsonb_build_object(
            'hook1', CASE WHEN jsonb_array_length(rec.scenario) > 0 
                     THEN concat('0-3s: ', rec.scenario->0)::text 
                     ELSE '0-3s: 시작 부분' END,
            'body1', CASE WHEN jsonb_array_length(rec.scenario) > 1 
                     THEN concat('4-15s: ', rec.scenario->1)::text 
                     ELSE '4-15s: 메인 내용' END,
            'conclusion', CASE WHEN jsonb_array_length(rec.scenario) > 2 
                          THEN concat('16-30s: ', rec.scenario->2)::text 
                          ELSE '16-30s: 마무리' END
        );
        
        -- 5개 이상의 요소가 있으면 hook2와 body2도 추가
        IF jsonb_array_length(rec.scenario) >= 5 THEN
            structured_scenario := structured_scenario || jsonb_build_object(
                'hook2', concat('4-7s: ', rec.scenario->1)::text,
                'body1', concat('8-15s: ', rec.scenario->2)::text,
                'body2', concat('16-25s: ', rec.scenario->3)::text,
                'conclusion', concat('26-30s: ', rec.scenario->4)::text
            );
        END IF;
        
        -- 업데이트
        UPDATE contents_idea 
        SET scenario = structured_scenario
        WHERE id = rec.id;
        
        RAISE NOTICE 'Updated ID %', rec.id;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- 3. 함수 실행 (주의: 실행 전 백업 권장)
-- SELECT convert_scenario_to_structured();

-- 4. 샘플 데이터로 테스트 (특정 ID만 업데이트)
UPDATE contents_idea 
SET scenario = '{
  "hook1": "0-3s: 카메라를 보며 인사. \"안녕하세요! 오늘은 특별한 팁을 알려드릴게요!\"",
  "hook2": "4-7s: 주제 소개. \"바로 [주제]인데요, 이거 하나면 완전 달라져요!\"",
  "body1": "8-15s: 첫 번째 단계 시연. 구체적인 방법을 보여주며 설명",
  "body2": "16-25s: 두 번째 단계와 실제 적용. 전후 비교나 결과 보여주기",
  "conclusion": "26-30s: \"어떠셨나요? 댓글로 여러분의 경험도 공유해주세요! 구독과 좋아요 부탁드려요!\""
}'::jsonb
WHERE id = 1;

-- 5. 변환 후 확인
SELECT 
    id,
    title_vi,
    scenario->>'hook1' as hook1,
    scenario->>'hook2' as hook2,
    scenario->>'body1' as body1,
    scenario->>'body2' as body2,
    scenario->>'conclusion' as conclusion
FROM contents_idea
WHERE scenario ? 'hook1'
LIMIT 5;

-- 6. 카테고리별 샘플 구조화 시나리오 예시
-- 일상 카테고리
UPDATE contents_idea 
SET scenario = '{
  "hook1": "0-3s: 충격적인 첫 마디. \"이거 안 하면 진짜 손해예요!\"",
  "hook2": "4-7s: 구체적 상황 제시. \"매일 [상황]하시는 분들 주목!\"",
  "body1": "8-15s: 핵심 내용 전달. 실제 시연이나 설명",
  "body2": "16-25s: 추가 팁이나 주의사항. 실패 사례와 성공 사례",
  "conclusion": "26-30s: 행동 유도. \"오늘부터 바로 시작해보세요! 더 많은 팁은 팔로우!\""
}'::jsonb
WHERE category = '일상' AND id IN (
    SELECT id FROM contents_idea WHERE category = '일상' LIMIT 1
);

-- 음식 카테고리
UPDATE contents_idea 
SET scenario = '{
  "hook1": "0-3s: 음식 클로즈업. \"이 맛을 아직 모르신다고요?\"",
  "hook2": "4-7s: 메뉴 소개. \"오늘은 [메뉴명] 만들어볼게요!\"",
  "body1": "8-15s: 재료 준비와 첫 단계. 핵심 포인트 강조",
  "body2": "16-25s: 조리 과정과 완성. 먹는 장면 포함",
  "conclusion": "26-30s: 맛 평가. \"레시피는 댓글 고정! 만들어보고 후기 남겨주세요!\""
}'::jsonb
WHERE category = '음식' AND id IN (
    SELECT id FROM contents_idea WHERE category = '음식' LIMIT 1
);
