module.exports = {
  apps: [
    {
      name: "circleica",
      script: "node_modules/next/dist/bin/next",
      args: "start",
      cwd: "/opt/circleica",
      interpreter: "node",
      exec_mode: "fork",
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "512M",
      env: {
        NODE_ENV: "production",
        PORT: 3000,
        NODE_OPTIONS: "--max-http-header-size=1048576",
      },
    },
  ],
}
