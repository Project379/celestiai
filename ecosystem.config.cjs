module.exports = {
  apps: [{
    name: "claude-mem-worker",
    script: "./start-worker.js",
    env: {
      NODE_ENV: "development",
    },
    autorestart: true,
    watch: false,
    restart_delay: 5000,
    max_restarts: 10,
    error_file: "C:/Users/ntone/.claude-mem/logs/pm2_error.log",
    out_file: "C:/Users/ntone/.claude-mem/logs/pm2_out.log",
  }]
};
