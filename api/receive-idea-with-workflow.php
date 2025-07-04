<?php
/**
 * API Endpoint for receiving contents_idea data and triggering Python workflow
 * This endpoint receives data from Supabase polling and forwards to Python workflow automation
 */

// Set headers
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

// Handle preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Only accept POST requests
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode([
        'status' => 'error',
        'message' => 'Method not allowed. Use POST method.'
    ]);
    exit();
}

try {
    // Get input data
    $input = file_get_contents('php://input');
    $data = json_decode($input, true);
    
    // Validate JSON
    if (json_last_error() !== JSON_ERROR_NONE) {
        throw new Exception('Invalid JSON: ' . json_last_error_msg());
    }
    
    // Validate required fields
    if (!isset($data['id'])) {
        throw new Exception('Missing required field: id');
    }
    
    // Log received data
    $logDir = __DIR__ . '/logs';
    if (!file_exists($logDir)) {
        mkdir($logDir, 0777, true);
    }
    
    $logFile = $logDir . '/api_log_' . date('Y-m-d') . '.txt';
    $logEntry = date('Y-m-d H:i:s') . ' - Received idea #' . $data['id'] . PHP_EOL;
    $logEntry .= 'Data: ' . json_encode($data, JSON_PRETTY_PRINT) . PHP_EOL;
    file_put_contents($logFile, $logEntry, FILE_APPEND);
    
    // === 1. Python 워크플로우 API 호출 ===
    $workflowApiUrl = 'http://localhost:5000/workflows/process_idea/run';
    
    // 워크플로우에 전달할 데이터 준비
    $workflowData = [
        'idea_id' => $data['id'],
        'title_vi' => $data['title_vi'] ?? '',
        'title_ko' => $data['title_ko'] ?? '',
        'scenario' => $data['scenario'] ?? [],
        'company_id' => $data['company_id'] ?? null,
        'store_id' => $data['store_id'] ?? null,
        'created_at' => $data['created_at'] ?? date('c'),
        'raw_data' => $data  // 전체 데이터도 포함
    ];
    
    // cURL로 Python API 호출
    $ch = curl_init($workflowApiUrl);
    curl_setopt($ch, CURLOPT_POST, 1);
    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($workflowData));
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'Content-Type: application/json',
        // 'X-API-Key: your-api-key-here'  // API 키가 필요한 경우
    ]);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_TIMEOUT, 10);
    
    $workflowResponse = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $curlError = curl_error($ch);
    curl_close($ch);
    
    // 워크플로우 호출 결과 로깅
    $workflowLog = date('Y-m-d H:i:s') . ' - Workflow API call for idea #' . $data['id'] . PHP_EOL;
    $workflowLog .= 'HTTP Code: ' . $httpCode . PHP_EOL;
    $workflowLog .= 'Response: ' . $workflowResponse . PHP_EOL;
    if ($curlError) {
        $workflowLog .= 'Error: ' . $curlError . PHP_EOL;
    }
    $workflowLog .= str_repeat('-', 80) . PHP_EOL;
    file_put_contents($logFile, $workflowLog, FILE_APPEND);
    
    // === 2. 알림 전송 (선택사항) ===
    // 슬랙, 이메일, 웹훅 등으로 알림 전송
    
    // Slack 웹훅 예시 (설정 필요)
    $slackWebhook = getenv('SLACK_WEBHOOK_URL'); // 환경변수에서 가져오기
    if ($slackWebhook) {
        $slackMessage = [
            'text' => "🎯 새로운 아이디어가 도착했습니다!",
            'attachments' => [
                [
                    'color' => 'good',
                    'fields' => [
                        ['title' => 'ID', 'value' =>