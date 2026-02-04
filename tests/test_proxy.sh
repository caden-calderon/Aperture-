#!/bin/bash
# Test script for Aperture proxy
# Run after starting the app with: pnpm tauri dev

PROXY_URL="http://127.0.0.1:5400"

echo "Testing Aperture Proxy"
echo "======================"
echo ""

# Test 1: Check proxy is running
echo "1. Checking proxy health..."
if curl -s -o /dev/null -w "%{http_code}" "$PROXY_URL/" --max-time 2 | grep -q "502\|503\|504"; then
    echo "   Proxy is running (got upstream error as expected with no valid request)"
else
    echo "   Proxy may not be running. Response: $(curl -s -o /dev/null -w "%{http_code}" "$PROXY_URL/" --max-time 2)"
fi
echo ""

# Test 2: Test Anthropic path routing (requires API key to work fully)
echo "2. Testing Anthropic path routing..."
echo "   Sending request to /v1/messages"
RESPONSE=$(curl -s -X POST "$PROXY_URL/v1/messages" \
    -H "Content-Type: application/json" \
    -H "x-api-key: test-key" \
    -H "anthropic-version: 2023-06-01" \
    -d '{"model": "claude-3-haiku-20240307", "max_tokens": 10, "messages": [{"role": "user", "content": "Hi"}]}' \
    --max-time 5 2>&1)

if [[ "$RESPONSE" == *"invalid_api_key"* ]] || [[ "$RESPONSE" == *"authentication_error"* ]]; then
    echo "   SUCCESS: Request reached Anthropic API (auth error expected with test key)"
elif [[ "$RESPONSE" == *"error"* ]]; then
    echo "   Request forwarded (got error response): ${RESPONSE:0:100}..."
else
    echo "   Response: ${RESPONSE:0:100}..."
fi
echo ""

# Test 3: Check proxy logs request method and path
echo "3. To verify full logging, check the terminal running 'pnpm tauri dev'"
echo "   You should see lines like:"
echo "   --> POST /v1/messages"
echo "   <-- POST /v1/messages -> 401"
echo ""

echo "Done!"
