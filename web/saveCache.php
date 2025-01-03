<?php
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
  $input = json_decode(file_get_contents('php://input'), true);

  if (!isset($input['filePath']) || !isset($input['data'])) {
    http_response_code(400);
    echo json_encode(['message' => 'Invalid input']);
    exit;
  }

  $filePath = $input['filePath'];
  $data = $input['data'];

  $fullPath = __DIR__ . $filePath;
  $directory = dirname($fullPath);

  if (!is_dir($directory)) {
    mkdir($directory, 0777, true);
  }

  if (file_put_contents($fullPath, json_encode($data))) {
    http_response_code(200);
    echo json_encode(['message' => 'Cache saved successfully']);
  } else {
    http_response_code(500);
    echo json_encode(['message' => 'Failed to save cache']);
  }
} else {
  http_response_code(405);
  echo json_encode(['message' => 'Method not allowed']);
}
