const { spawn } = require('child_process');

/**
 * Robust wrapper to start the claude-mem worker on Windows.
 * This script is managed by PM2 and handles the shell spawning of npx.
 */
const cmd = process.platform === 'win32' ? 'npx.cmd' : 'npx';
const args = ['claude-mem', 'start'];

console.log(`[wrapper] Starting claude-mem worker: ${cmd} ${args.join(' ')}`);

const child = spawn(cmd, args, {
    stdio: 'inherit',
    shell: true,
    windowsHide: true,
    env: process.env
});

child.on('error', (err) => {
    console.error('[wrapper] Failed to start worker:', err);
    process.exit(1);
});

child.on('exit', (code) => {
    console.log(`[wrapper] Worker exited with code ${code}`);
    process.exit(code || 0);
});
