<?php
/**
 * API Endpoint for receiving contents_idea data
 * This endpoint receives data from Supabase polling when is_auto_created = false
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
    
    // Log received data (for debugging)
    $logFile = __DIR__ . '/api_log.txt';
    $logEntry = date('Y-m-d H:i:s') . ' - Received idea #' . $data['id'] . PHP_EOL;
    $logEntry .= 'Data: ' . json_encode($data, JSON_PRETTY_PRINT) . PHP_EOL;
    $logEntry .= str_repeat('-', 80) . PHP_EOL;
    file_put_contents($logFile, $logEntry, FILE_APPEND);
    
    // Process the data here
    // You can add your custom logic:
    // - Save to local database
    // - Send notifications
    // - Trigger other actions
    // - Integration with other systems
    
    // Example: Extract scenario data
    $scenario = $data['scenario'] ?? null;
    if ($scenario) {
        $processedData = [
            'id' => $data['id'],
            'idea_text' => $data['idea_text'] ?? '',
            'scenario_hooks' => [
                'hook1' => $scenario['hook1'] ?? '',
                'hook2' => $scenario['hook2'] ?? ''
            ],
            'scenario_bodies' => [
                'body1' => $scenario['body1'] ?? '',
                'body2' => $scenario['body2'] ?? ''
            ],
            'conclusion' => $scenario['conclusion'] ?? '',
            'created_at' => $data['created_at'] ?? date('c'),
            'is_choosen' => $data['is_choosen'] ?? false,
            'is_upload' => $data['is_upload'] ?? false
        ];
    } else {
        $processedData = $data;
    }
    
    // Save to JSON file (as an example)
    $dataFile = __DIR__ . '/received_ideas.json';
    $existingData = [];
    if (file_exists($dataFile)) {
        $existingData = json_decode(file_get_contents($dataFile), true) ?: [];
    }
    $existingData[] = $processedData;
    file_put_contents($dataFile, json_encode($existingData, JSON_PRETTY_PRINT));
    
    // Return success response
    echo json_encode([
        'status' => 'success',
        'message' => 'Idea received and processed successfully',
        'data' => [
            'id' => $data['id'],
            'idea_text' => $data['idea_text'] ?? '',
            'processed_at' => date('c')
        ]
    ]);
    
} catch (Exception $e) {
    // Log error
    error_log('API Error: ' . $e->getMessage());
    
    // Return error response
    http_response_code(400);
    echo json_encode([
        'status' => 'error',
        'message' => $e->getMessage()
    ]);
}
?>