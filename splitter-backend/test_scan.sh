#!/bin/bash

# Test receipt scan endpoint
TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MywiZW1haWwiOiJ0ZXN0dXNlckBleGFtcGxlLmNvbSIsImlhdCI6MTc2OTQ0MzI5OCwiZXhwIjoxNzcwMDQ4MDk4fQ.UHSXDSaE9kS1eUujf-w7M6tGtyn4MlbPxpSes9qq7T0"

# Create a simple test receipt (base64 encoded 1x1 pixel image)
BASE64_IMAGE="iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="

curl -X POST http://localhost:3001/sessions/scan \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"sessionName\": \"Test Receipt Scan\",
    \"language\": \"en-US\",
    \"image\": {
      \"mimeType\": \"image/png\",
      \"data\": \"$BASE64_IMAGE\"
    }
  }"
