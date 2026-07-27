const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const SETTINGS_PATH = path.join(process.env.USERPROFILE, '.claude-mem', 'settings.json');

/**
 * Checks if a port is in use and in LISTENING state.
 */
function isPortBusy(port) {
    try {
        const output = execSync(`netstat -ano | findstr :${port}`).toString();
        const lines = output.split('\n');
        // Match exact port to avoid false positives (e.g., 377777 matching 37777)
        return lines.some(line => line.includes(`:${port}`) && line.includes('LISTENING'));
    } catch (e) {
        return false;
    }
}

/**
 * Updates the CLAUDE_MEM_WORKER_PORT in the global settings.json
 */
function updateSettings(port) {
    if (!fs.existsSync(SETTINGS_PATH)) {
        console.error(`[claude-mem-cleanup] Settings file not found at ${SETTINGS_PATH}`);
        return;
    }
    try {
        const settings = JSON.parse(fs.readFileSync(SETTINGS_PATH, 'utf-8'));
        if (settings.CLAUDE_MEM_WORKER_PORT !== String(port)) {
            const oldPort = settings.CLAUDE_MEM_WORKER_PORT;
            settings.CLAUDE_MEM_WORKER_PORT = String(port);
            fs.writeFileSync(SETTINGS_PATH, JSON.stringify(settings, null, 2));
            console.log(`[claude-mem-cleanup] Port conflict detected. Updated port: ${oldPort} -> ${port}`);
        } else {
            console.log(`[claude-mem-cleanup] Port ${port} is ready.`);
        }
    } catch (e) {
        console.error(`[claude-mem-cleanup] Error updating settings: ${e.message}`);
    }
}

const defaultPort = 37777;
let targetPort = defaultPort;

// Always try to reset to default port if it's available
if (isPortBusy(defaultPort)) {
    console.log(`[claude-mem-cleanup] Default port ${defaultPort} is held. Searching for next available...`);
    let port = defaultPort + 1;
    while (isPortBusy(port)) {
        port++;
        if (port > 37800) {
            console.error('[claude-mem-cleanup] Too many ports occupied. Giving up.');
            process.exit(1);
        }
    }
    targetPort = port;
}

updateSettings(targetPort);
