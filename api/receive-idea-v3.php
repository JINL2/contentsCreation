<?php
/**
 * Enhanced API Endpoint with Python Workflow Integration
 * Receives data from Supabase and triggers Python workflows
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
    
    // === 로그 기록 ===
    $logDir = __DIR__ . '/logs';
    if (!file_exists($logDir)) {
        mkdir($logDir, 0777, true);
    }
    
    // 일별 로그 파일
    $logFile = $logDir . '/api_log_' . date('Y-m-d') . '.txt';
    $logEntry = date('Y-m-d H:i:s') . ' - Received idea #' . $data['id'] . PHP_EOL;
    $logEntry .= 'Data: ' . json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE) . PHP_EOL;
    file_put_contents($logFile, $logEntry, FILE_APPEND);
    
    // === Python 워크플로우 API 호출 ===
    
    // API 타입 결정 (기본값: create_contents_on_user_idea)
    $apiType = $data['api_type'] ?? 'create_contents_on_user_idea';
    
    // Python API 서버 URL - 워크플로우 매핑 설정 사용
    // 매핑 설정 파일 읽기
    $mappingFile = '/Applications/XAMPP/xamppfiles/htdocs/mysite/workflow-automation/config/workflow_mapping.json';
    $mappingConfig = json_decode(file_get_contents($mappingFile), true);
    
    // API 타입에 해당하는 워크플로우 찾기
    $workflowId = null;
    foreach ($mappingConfig['mappings'] as $mapping) {
        if ($mapping['api_type'] === $apiType && $mapping['enabled']) {
            $workflowId = $mapping['workflow'];
            break;
        }
    }
    
    if (!$workflowId) {
        throw new Exception('No workflow mapped for API type: ' . $apiType);
    }
    
    // Python API 서버 URL
    $pythonApiUrl = 'http://localhost:5001/workflows/' . $workflowId . '/run';
    
    // 워크플로우에 전달할 데이터 - Python API 형식에 맞게
    $workflowPayload = $data;  // 데이터를 그대로 전달
    
    // cURL 초기화
    $ch = curl_init($pythonApiUrl);
    curl_setopt($ch, CURLOPT_POST, 1);
    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($workflowPayload));
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'Content-Type: application/json',
        'Accept: application/json'
    ]);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_TIMEOUT, 10);
    curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, 5);
    
    // API 호출 실행
    $pythonResponse = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $curlError = curl_error($ch);
    curl_close($ch);
    
    // Python API 응답 로깅
    $apiLogEntry = date('Y-m-d H:i:s') . ' - Python API Response' . PHP_EOL;
    $apiLogEntry .= 'HTTP Code: ' . $httpCode . PHP_EOL;
    $apiLogEntry .= 'Response: ' . $pythonResponse . PHP_EOL;
    if ($curlError) {
        $apiLogEntry .= 'cURL Error: ' . $curlError . PHP_EOL;
    }
    $apiLogEntry .= str_repeat('-', 80) . PHP_EOL;
    file_put_contents($logFile, $apiLogEntry, FILE_APPEND);
    
    // === 응답 처리 ===
    
    $responseData = [
        'status' => 'success',
        'message' => 'Idea received and queued for processing',
        'data' => [
            'id' => $data['id'],
            'api_type' => $apiType,
            'received_at' => date('c')
        ]
    ];
    
    // Python API 응답이 있으면 포함
    if ($pythonResponse && $httpCode == 200) {
        $pythonData = json_decode($pythonResponse, true);
        if ($pythonData && isset($pythonData['job_id'])) {
            $responseData['data']['job_id'] = $pythonData['job_id'];
            $responseData['data']['workflow_status'] = 'queued';
        }
    } else {
        // Python API 실패해도 PHP는 성공 응답 (Supabase 재시도 방지)
        $responseData['data']['workflow_status'] = 'pending';
        $responseData['data']['workflow_error'] = $curlError ?: 'Python API not available';
    }
    
    // === 통계 업데이트 ===
    $summaryFile = $logDir . '/summary.json';
    $summary = [];
    if (file_exists($summaryFile)) {
        $summary = json_decode(file_get_contents($summaryFile), true) ?: [];
    }
    
    // 오늘 통계
    $today = date('Y-m-d');
    if (!isset($summary[$today])) {
        $summary[$today] = [
            'total_received' => 0,
            'workflow_success' => 0,
            'workflow_failed' => 0
        ];
    }
    
    $summary[$today]['total_received']++;
    if ($httpCode == 200) {
        $summary[$today]['workflow_success']++;
    } else {
        $summary[$today]['workflow_failed']++;
    }
    
    file_put_contents($summaryFile, json_encode($summary, JSON_PRETTY_PRINT));
    
    // 성공 응답 반환
    echo json_encode($responseData);
    
} catch (Exception $e) {
    // 에러 로깅
    error_log('API Error: ' . $e->getMessage());
    
    if (isset($logFile)) {
        $errorEntry = date('Y-m-d H:i:s') . ' - ERROR: ' . $e->getMessage() . PHP_EOL;
        $errorEntry .= str_repeat('-', 80) . PHP_EOL;
        file_put_contents($logFile, $errorEntry, FILE_APPEND);
    }
    
    // 에러 응답
    http_response_code(400);
    echo json_encode([
        'status' => 'error',
        'message' => $e->getMessage()
    ]);
}
?>