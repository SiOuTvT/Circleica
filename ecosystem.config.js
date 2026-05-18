module.exports = {
  apps: [
    {
      name: "fangame",
      script: "node_modules/next/dist/bin/next",
      args: "start",
      cwd: "/www/wwwroot/fangame",
      interpreter: "node",
      // 增大 HTTP 头大小限制（默认 8KB 太小，NextAuth JWT + CSP 容易超限）
      node_args: "--max-http-header-size=16384",
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "512M",
      env: {
        NODE_ENV: "production",
        PORT: 3000,
      },
    },
  ],
}