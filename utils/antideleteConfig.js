/**
 * Anti-Delete Configuration Manager
 * Saves and loads anti-delete settings with routing options
 */

const fs = require('fs');
const path = require('path');

const CONFIG_FILE = path.join(process.cwd(), 'data', 'antidelete_config.json');

// Ensure data directory exists
function ensureDataDir() {
    const dataDir = path.join(process.cwd(), 'data');
    if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
    }
}

// Default config
const defaultConfig = {
    enabled: false,
    route: 'dm' // 'dm' = send to bot owner, 'chat' = send to where message was deleted
};

// Load anti-delete config
function loadAntiDeleteConfig() {
    try {
        ensureDataDir();
        if (fs.existsSync(CONFIG_FILE)) {
            const data = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
            return {
                enabled: data.enabled !== undefined ? data.enabled : defaultConfig.enabled,
                route: data.route || defaultConfig.route
            };
        }
    } catch (error) {
        console.error('Error loading anti-delete config:', error);
    }
    return { ...defaultConfig };
}

// Save anti-delete config
function saveAntiDeleteConfig(config) {
    try {
        ensureDataDir();
        fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
    } catch (error) {
        console.error('Error saving anti-delete config:', error);
    }
}

// Get current status
function isAntiDeleteEnabled() {
    const config = loadAntiDeleteConfig();
    return config.enabled;
}

// Get current route
function getAntiDeleteRoute() {
    const config = loadAntiDeleteConfig();
    return config.route;
}

// Enable anti-delete
function enableAntiDelete() {
    const config = loadAntiDeleteConfig();
    config.enabled = true;
    saveAntiDeleteConfig(config);
}

// Disable anti-delete
function disableAntiDelete() {
    const config = loadAntiDeleteConfig();
    config.enabled = false;
    saveAntiDeleteConfig(config);
}

// Set route: 'dm' or 'chat'
function setAntiDeleteRoute(route) {
    if (route !== 'dm' && route !== 'chat') return false;
    const config = loadAntiDeleteConfig();
    config.route = route;
    saveAntiDeleteConfig(config);
    return true;
}

module.exports = {
    isAntiDeleteEnabled,
    getAntiDeleteRoute,
    enableAntiDelete,
    disableAntiDelete,
    setAntiDeleteRoute,
    loadAntiDeleteConfig,
    saveAntiDeleteConfig
};