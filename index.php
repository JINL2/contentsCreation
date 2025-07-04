<?php
/**
 * Contents Helper Website
 * PHP 리다이렉트 파일 (Apache가 index.html을 못 찾을 때를 대비)
 */

// 직접 index.html 내용을 포함시킴
$indexFile = __DIR__ . '/index.html';

if (file_exists($indexFile)) {
    // URL 파라미터를 유지하면서 index.html을 직접 표시
    readfile($indexFile);
} else {
    // index.html이 없으면 에러 메시지
    http_response_code(404);
    echo "<h1>Error 404</h1>";
    echo "<p>index.html file not found in: " . __DIR__ . "</p>";
    echo "<p>Please check the installation.</p>";
}
exit();
?>