<?php
/**
 * Enhanced API Endpoint for receiving contents_idea data
 * This version includes better error handling and logging
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
    
    // Create logs directory if it doesn't exist
    $logDir = __DIR__ . '/logs';
    if (!file_exists($logDir)) {
        mkdir($logDir, 0777, true);
    }
    
    // Log received data with timestamp
    $timestamp = date('Y-m-d H:i:s');
    $logFile = $logDir . '/api_log_' . date('Y-m-d') . '.txt';
    $logEntry = "[$timestamp] Received idea #" . $data['id'] . PHP_EOL;
    $logEntry .= "Data: " . json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE) . PHP_EOL;
    $logEntry .= str_repeat('-', 80) . PHP_EOL;
    file_put_contents($logFile, $logEntry, FILE_APPEND | LOCK_EX);
    
    // Process the data
    $processedData = [
        'id' => $data['id'],
        'idea_text' => $data['idea_text'] ?? '',
        'scenario' => $data['scenario'] ?? null,
        'is_auto_created' => $data['is_auto_created'] ?? false,
        'is_fetched' => $data['is_fetched'] ?? false,
        'received_at' => $timestamp,
        'processed' => true
    ];
    
    // Save to JSON file (organized by date)
    $dataFile = $logDir . '/ideas_' . date('Y-m-d') . '.json';
    $existingData = [];
    if (file_exists($dataFile)) {
        $existingData = json_decode(file_get_contents($dataFile), true) ?: [];
    }
    $existingData[] = $processedData;
    file_put_contents($dataFile, json_encode($existingData, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE), LOCK_EX);
    
    // Create summary file
    $summaryFile = $logDir . '/summary.json';
    $summary = [];
    if (file_exists($summaryFile)) {
        $summary = json_decode(file_get_contents($summaryFile), true) ?: [];
    }
    
    // Update summary statistics
    $today = date('Y-m-d');
    if (!isset($summary[$today])) {
        $summary[$today] = [
            'total_received' => 0,
            'last_updated' => null
        ];
    }
    $summary[$today]['total_received']++;
    $summary[$today]['last_updated'] = $timestamp;
    
    file_put_contents($summaryFile, json_encode($summary, JSON_PRETTY_PRINT), LOCK_EX);
    
    // Return success response
    $response = [
        'status' => 'success',
        'message' => 'Idea received and processed successfully',
        'data' => [
            'id' => $data['id'],
            'idea_text' => $data['idea_text'] ?? '',
            'processed_at' => $timestamp
        ]
    ];
    
    echo json_encode($response, JSON_UNESCAPED_UNICODE);
    
    // Optional: Send notification or trigger other actions
    // notifySlack($data);
    // triggerWorkflow($data);
    
} catch (Exception $e) {
    // Log error
    error_log('API Error: ' . $e->getMessage());
    
    if (isset($logDir) && is_dir($logDir)) {
        $errorLog = $logDir . '/error_log.txt';
        $errorEntry = date('Y-m-d H:i:s') . ' - ' . $e->getMessage() . PHP_EOL;
        file_put_contents($errorLog, $errorEntry, FILE_APPEND | LOCK_EX);
    }
    
    // Return error response
    http_response_code(400);
    echo json_encode([
        'status' => 'error',
        'message' => $e->getMessage()
    ], JSON_UNESCAPED_UNICODE);
}

// Optional notification function (example)
function notifySlack($data) {
    // Implement Slack webhook notification
    // $webhookUrl = 'https://hooks.slack.com/services/YOUR/WEBHOOK/URL';
    // ...
}

// Optional workflow trigger (example)
function triggerWorkflow($data) {
    // Implement workflow trigger logic
    // Could call another API, send email, etc.
}
?>