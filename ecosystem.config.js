module.exports = {
  apps: [
    {
      name: "fangame",
      script: "node_modules/next/dist/bin/next",
      args: "start",
      cwd: "/www/wwwroot/fangame",
      interpreter: "node",
      exec_mode: "fork",  // Next.js 不需要 PM2 cluster 模式
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "512M",
      env: {
        NODE_ENV: "production",
        PORT: 3000,
        // 通过 NODE_OPTIONS 增大 HTTP 头限制，比 node_args 更可靠
        NODE_OPTIONS: "--max-http-header-size=16384",
      },
    },
  ],
}