module.exports = {
  apps: [
    {
      name: "fangame",
      script: "node_modules/next/dist/bin/next",
      args: "start",
      cwd: "/www/wwwroot/fangame",
      interpreter: "node",
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
