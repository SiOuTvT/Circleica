#!/bin/bash
echo "========================================="
echo "  Cookie 大小诊断"
echo "========================================="

# 1. 用真实登录测试（使用默认测试账号）
echo ""
echo "【1】尝试登录并检查 Set-Cookie 头大小:"

# 先获取 CSRF token
CSRF_RESPONSE=$(curl -s -c /tmp/fangame-cookies.txt http://127.0.0.1:3000/api/auth/csrf 2>&1)
echo "  CSRF: $CSRF_RESPONSE"

CSRF_TOKEN=$(echo "$CSRF_RESPONSE" | grep -o '"csrfToken":"[^"]*"' | cut -d'"' -f4)
echo "  CSRF Token: ${CSRF_TOKEN:0:20}..."

# 尝试登录（用一个可能存在的用户名）
# 先检查数据库中有哪些用户
echo ""
echo "【2】数据库中的用户头像字段检查:"
# 直接通过 API 测试
echo "  请手动在服务器上运行以下 SQL 查看用户头像大小:"
echo "  mysql -u root -e \"SELECT id, username, LENGTH(avatar) as avatar_len, LEFT(avatar, 50) as avatar_preview FROM fangame.User WHERE avatar IS NOT NULL ORDER BY avatar_len DESC LIMIT 10;\""
echo ""

# 3. 测试一个完整登录流程的 cookie 大小
echo "【3】测试登录后 cookie 大小:"

# 用 curl 模拟登录
LOGIN_RESPONSE=$(curl -s -v -b /tmp/fangame-cookies.txt -c /tmp/fangame-cookies.txt \
  -X POST http://127.0.0.1:3000/api/auth/callback/credentials \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "identifier=admin&password=admin123&csrfToken=$CSRF_TOKEN" \
  2>&1)

echo "  登录响应头:"
echo "$LOGIN_RESPONSE" | grep -i "set-cookie" | while read line; do
  cookie_size=$(echo -n "$line" | wc -c)
  echo "  Cookie: $cookie_size bytes"
  # 提取 cookie 值
  cookie_value=$(echo "$line" | sed 's/.*: //' | cut -d';' -f1)
  value_size=$(echo -n "$cookie_value" | wc -c)
  echo "    Cookie 值大小: $value_size bytes"
done

echo ""
echo "【4】登录后完整 cookie 文件大小:"
if [ -f /tmp/fangame-cookies.txt ]; then
  cat /tmp/fangame-cookies.txt | grep -v "^#" | grep -v "^$" | while read line; do
    echo "  $line"
    cookie_value=$(echo "$line" | awk '{print $NF}')
    value_size=$(echo -n "$cookie_value" | wc -c)
    echo "    大小: $value_size bytes"
  done
  total_size=$(cat /tmp/fangame-cookies.txt | grep -v "^#" | grep -v "^$" | awk '{print $NF}' | tr -d '\n' | wc -c)
  echo "  总 cookie 大小: $total_size bytes"
fi

echo ""
echo "【5】用登录后的 cookie 访问首页:"
RESPONSE=$(curl -s -v -b /tmp/fangame-cookies.txt http://127.0.0.1:3000/ 2>&1)
echo "$RESPONSE" | head -30

# 检查是否 431
STATUS=$(echo "$RESPONSE" | grep "HTTP/")
echo "  状态: $STATUS"

rm -f /tmp/fangame-cookies.txt
echo ""
echo "========================================="
echo "  诊断完成"
echo "========================================="