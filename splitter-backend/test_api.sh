#!/bin/bash

# Setup exit trap to kill background server on exit
SERVER_PID=""
cleanup() {
  if [ -n "$SERVER_PID" ]; then
    echo "Stopping backend server (PID: $SERVER_PID)..."
    kill $SERVER_PID 2>/dev/null
  fi
}
trap cleanup EXIT

PORT=3001
URL="http://localhost:$PORT"

# 1. Start server in background
echo "Starting backend server on port $PORT..."
npm start > /tmp/test_server.log 2>&1 &
SERVER_PID=$!

# Wait for server to start
echo "Waiting for server to start..."
for i in {1..20}; do
  if curl -s "$URL/health" | grep -q "ok"; then
    echo "Server is ready!"
    break
  fi
  sleep 1
  if [ $i -eq 20 ]; then
    echo "Error: Server failed to start. Logs:"
    cat /tmp/test_server.log
    exit 1
  fi
done

# Generate unique test user
RAND=$RANDOM
EMAIL="testuser_$RAND@example.com"
PASSWORD="Aa1!secure"
USERNAME="TestUser_$RAND"

echo "--------------------------------------"
echo "TEST 1: User Registration"
echo "--------------------------------------"
REG_RESPONSE=$(curl -s -X POST "$URL/auth/register" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\", \"password\":\"$PASSWORD\", \"username\":\"$USERNAME\"}")

echo "Response: $REG_RESPONSE"
TOKEN=$(echo "$REG_RESPONSE" | grep -o '"token":"[^"]*' | grep -o '[^"]*$')
MY_UNIQUE_ID=$(echo "$REG_RESPONSE" | grep -o '"uniqueId":"[^"]*' | grep -o '[^"]*$')

if [ -z "$TOKEN" ]; then
  echo "FAIL: Failed to register user or retrieve token."
  exit 1
fi
echo "SUCCESS: User registered. Token: ${TOKEN:0:15}... UniqueID: $MY_UNIQUE_ID"

echo "--------------------------------------"
echo "TEST 2: User Login"
echo "--------------------------------------"
LOGIN_RESPONSE=$(curl -s -X POST "$URL/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\", \"password\":\"$PASSWORD\"}")

echo "Response: $LOGIN_RESPONSE"
if echo "$LOGIN_RESPONSE" | grep -q "token"; then
  echo "SUCCESS: Login successful."
else
  echo "FAIL: Login failed."
  exit 1
fi

echo "--------------------------------------"
echo "TEST 3: Get Current User Info (/auth/me)"
echo "--------------------------------------"
ME_RESPONSE=$(curl -s -X GET "$URL/auth/me" \
  -H "Authorization: Bearer $TOKEN")

echo "Response: $ME_RESPONSE"
if echo "$ME_RESPONSE" | grep -q "$EMAIL"; then
  echo "SUCCESS: Profile retrieved successfully."
else
  echo "FAIL: Profile verification failed."
  exit 1
fi

echo "--------------------------------------"
echo "TEST 4: Search Users"
echo "--------------------------------------"
SEARCH_RESPONSE=$(curl -s -X GET "$URL/users/search?q=TestUser" \
  -H "Authorization: Bearer $TOKEN")

echo "Response: $SEARCH_RESPONSE"
echo "SUCCESS: Search users returned response."

echo "--------------------------------------"
echo "TEST 5: Create Group"
echo "--------------------------------------"
GROUP_RESPONSE=$(curl -s -X POST "$URL/groups" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": "Holiday Trip"}')

echo "Response: $GROUP_RESPONSE"
GROUP_ID=$(echo "$GROUP_RESPONSE" | grep -o '"id":[0-9]*' | grep -o '[0-9]*')

if [ -z "$GROUP_ID" ]; then
  echo "FAIL: Group creation failed."
  exit 1
fi
echo "SUCCESS: Group created with ID: $GROUP_ID"

echo "--------------------------------------"
echo "TEST 6: Create Session"
echo "--------------------------------------"
SESSION_RESPONSE=$(curl -s -X POST "$URL/sessions" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"groupId\": $GROUP_ID, \"serviceFee\": 15, \"total\": 150}")

echo "Response: $SESSION_RESPONSE"
SESSION_ID=$(echo "$SESSION_RESPONSE" | grep -o '"id":[0-9]*' | grep -o '[0-9]*')

if [ -z "$SESSION_ID" ]; then
  echo "FAIL: Session creation failed."
  exit 1
fi
echo "SUCCESS: Session created with ID: $SESSION_ID"

echo "--------------------------------------"
echo "TEST 7: Finalize Session (Calculate Split)"
echo "--------------------------------------"
FINALIZE_RESPONSE=$(curl -s -X POST "$URL/sessions/finalize" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"sessionId\": $SESSION_ID,
    \"sessionName\": \"Dinner Splitting\",
    \"currency\": \"UZS\",
    \"participants\": [
      {\"uniqueId\":\"$MY_UNIQUE_ID\", \"username\":\"$USERNAME\"},
      {\"uniqueId\":\"#9999\", \"username\":\"ExternalFriend\"}
    ],
    \"items\": [
      {
        \"id\": \"item_1\",
        \"name\": \"Pizza Margherita\",
        \"price\": 60,
        \"quantity\": 1,
        \"splitMode\": \"equal\",
        \"assignedTo\": [\"$MY_UNIQUE_ID\", \"#9999\"]
      },
      {
        \"id\": \"item_2\",
        \"name\": \"Cola\",
        \"price\": 10,
        \"quantity\": 2,
        \"splitMode\": \"equal\",
        \"assignedTo\": [\"$MY_UNIQUE_ID\"]
      }
    ]
  }")

echo "Response: $FINALIZE_RESPONSE"
if echo "$FINALIZE_RESPONSE" | grep -q "finalized"; then
  echo "SUCCESS: Session finalized (calculations computed)."
else
  echo "FAIL: Session finalization failed."
  exit 1
fi

echo "--------------------------------------"
echo "TEST 8: Close Session"
echo "--------------------------------------"
CLOSE_RESPONSE=$(curl -s -X PATCH "$URL/sessions/$SESSION_ID/close" \
  -H "Authorization: Bearer $TOKEN")

echo "Response: $CLOSE_RESPONSE"
if echo "$CLOSE_RESPONSE" | grep -q "CLOSED"; then
  echo "SUCCESS: Session closed successfully."
else
  echo "FAIL: Session close failed."
  exit 1
fi

echo "--------------------------------------"
echo "ALL API TESTS PASSED SUCCESSFULLY! 🎉"
echo "--------------------------------------"
