#!/bin/bash
# 431 错误诊断脚本
# 在服务器上运行: bash diagnose-431.sh

echo "========================================="
echo "  HTTP 431 错误全面诊断"
echo "========================================="
echo ""

# 1. 检查 Node.js --max-http-header-size
echo "【1】检查 Node.js 进程参数:"
ps aux | grep "next" | grep -v grep | head -3
echo ""

# 2. 测试未登录时的响应（无 cookies）
echo "【2】测试未登录访问首页（无 cookies）:"
RESPONSE=$(curl -s -D /tmp/headers_431.txt -o /dev/null http://127.0.0.1:3000/ 2>&1)
echo "  HTTP 状态码: $(head -1 /tmp/headers_431.txt)"
echo "  响应头大小: $(wc -c < /tmp/headers_431.txt) bytes"
echo "  Set-Cookie 头:"
grep -i "set-cookie" /tmp/headers_431.txt | while read line; do
  cookie_name=$(echo "$line" | sed 's/.*set-cookie: //i' | cut -d= -f1)
  cookie_size=$(echo "$line" | wc -c)
  echo "    - $cookie_name: ${cookie_size} bytes"
done
echo ""

# 3. 测试通过 nginx 的响应（无 cookies）
echo "【3】测试未登录访问首页（通过 nginx）:"
RESPONSE=$(curl -s -D /tmp/headers_nginx.txt -o /dev/null http://127.0.0.1/ 2>&1)
echo "  HTTP 状态码: $(head -1 /tmp/headers_nginx.txt)"
echo "  响应头大小: $(wc -c < /tmp/headers_nginx.txt) bytes"
echo ""

# 4. 模拟登录流程 - 获取 CSRF token
echo "【4】模拟登录流程 - 获取 CSRF token:"
rm -f /tmp/cookies_431.txt
CSRF_RESPONSE=$(curl -s -c /tmp/cookies_431.txt -b /tmp/cookies_431.txt http://127.0.0.1:3000/api/auth/csrf 2>&1)
echo "  CSRF 响应: $CSRF_RESPONSE"
echo "  获取到的 cookies:"
cat /tmp/cookies_431.txt 2>/dev/null | grep -v "^#" | while read line; do
  cookie_name=$(echo "$line" | awk '{print $6}')
  cookie_value=$(echo "$line" | awk '{print $NF}')
  echo "    - $cookie_name: ${#cookie_value} bytes"
done
echo ""

# 5. 模拟登录 POST
echo "【5】模拟登录 POST（使用无效凭据测试请求/响应大小）:"
CSRF_TOKEN=$(echo "$CSRF_RESPONSE" | grep -o '"csrfToken":"[^"]*"' | cut -d'"' -f4)
echo "  CSRF Token: $CSRF_TOKEN"

LOGIN_HEADERS=$(curl -s -D /tmp/login_headers.txt -o /tmp/login_body.txt \
  -c /tmp/cookies_431.txt -b /tmp/cookies_431.txt \
  -X POST http://127.0.0.1:3000/api/auth/callback/credentials \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "csrfToken=$CSRF_TOKEN&identifier=test&password=testwrong" \
  -w "\n  请求头大小: %{size_request} bytes\n  响应大小: %{size_download} bytes\n  HTTP状态码: %{http_code}" \
  2>&1)

echo "$LOGIN_HEADERS"
echo ""

echo "  登录后的所有 cookies:"
cat /tmp/cookies_431.txt 2>/dev/null | grep -v "^#" | while read line; do
  cookie_name=$(echo "$line" | awk '{print $6}')
  cookie_value=$(echo "$line" | awk '{print $NF}')
  echo "    - $cookie_name: ${#cookie_value} bytes"
done
echo ""

# 6. 用登录后的 cookies 访问首页（模拟登录后跳转）
echo "【6】用登录后的 cookies 访问首页:"
TOTAL_COOKIE_SIZE=$(cat /tmp/cookies_431.txt 2>/dev/null | grep -v "^#" | awk '{print $6"="$NF}' | tr '\n' '; ' | wc -c)
echo "  总 Cookie 大小: $TOTAL_COOKIE_SIZE bytes"

if [ -f /tmp/cookies_431.txt ]; then
  HOME_RESPONSE=$(curl -s -D /tmp/home_headers.txt -o /dev/null \
    -b /tmp/cookies_431.txt \
    -w "  HTTP 状态码: %{http_code}" \
    http://127.0.0.1:3000/ 2>&1)
  echo "$HOME_RESPONSE"
  echo ""
  echo "  响应头:"
  head -5 /tmp/home_headers.txt 2>/dev/null
fi
echo ""

# 7. 测试通过 nginx 的相同流程
echo "【7】通过 nginx 模拟登录（测试 nginx 缓冲区）:"
rm -f /tmp/cookies_nginx.txt
CSRF_RESPONSE2=$(curl -s -c /tmp/cookies_nginx.txt -b /tmp/cookies_nginx.txt http://127.0.0.1/api/auth/csrf 2>&1)
CSRF_TOKEN2=$(echo "$CSRF_RESPONSE2" | grep -o '"csrfToken":"[^"]*"' | cut -d'"' -f4)

NGINX_LOGIN=$(curl -s -D /tmp/nginx_login_headers.txt -o /tmp/nginx_login_body.txt \
  -c /tmp/cookies_nginx.txt -b /tmp/cookies_nginx.txt \
  -X POST http://127.0.0.1/api/auth/callback/credentials \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "csrfToken=$CSRF_TOKEN2&identifier=test&password=testwrong" \
  -w "  HTTP 状态码: %{http_code}\n  请求头大小: %{size_request} bytes" \
  2>&1)

echo "$NGINX_LOGIN"
echo ""

# 8. 检查 nginx 配置
echo "【8】当前 nginx 配置:"
cat /etc/nginx/conf.d/fangame_new.conf 2>/dev/null
echo ""

# 9. 检查 pm2 环境变量
echo "【9】PM2 环境变量检查:"
pm2 env 0 2>/dev/null | grep -i "node_options\|header\|max"
echo ""

# 10. 检查是否有其他监听 80 端口的进程
echo "【10】监听 80 和 3000 端口的进程:"
ss -tlnp | grep -E ":80|:3000"
echo ""

echo "========================================="
echo "  诊断完成！"
echo "========================================="

# 清理临时文件
rm -f /tmp/headers_431.txt /tmp/headers_nginx.txt /tmp/login_headers.txt /tmp/login_body.txt /tmp/home_headers.txt /tmp/nginx_login_headers.txt /tmp/nginx_login_body.txt /tmp/cookies_431.txt /tmp/cookies_nginx.txt