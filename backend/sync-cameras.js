/**
 * Camera Sync Script
 * Syncs camera configurations from MSX app to RTSPtoWeb config
 *
 * This script should be run as a simple HTTP API endpoint that:
 * 1. Receives camera configurations from the frontend
 * 2. Updates the RTSPtoWeb config.json
 * 3. Reloads RTSPtoWeb to apply changes
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

const CONFIG_PATH = path.join(__dirname, 'config.json');
const PORT = 8084;

/**
 * Build RTSP URL from camera data
 */
function buildRtspUrl(camera) {
    let auth = '';
    if (camera.username && camera.password) {
        auth = `${camera.username}:${camera.password}@`;
    }

    const port = camera.port || 554;
    const rtspPath = camera.rtspPath || '/stream1';
    const cleanPath = rtspPath.startsWith('/') ? rtspPath : '/' + rtspPath;

    return `rtsp://${auth}${camera.ip}:${port}${cleanPath}`;
}

/**
 * Update RTSPtoWeb config with camera streams
 */
function updateConfig(cameras) {
    try {
        // Read existing config
        let config = {
            server: {
                http_port: ':8083',
                http_demo: true,
                http_debug: false,
                http_login: '',
                http_password: '',
                http_dir: '../plugins',
                rtsp_port: ':5541'
            },
            streams: {}
        };

        if (fs.existsSync(CONFIG_PATH)) {
            const configData = fs.readFileSync(CONFIG_PATH, 'utf8');
            config = JSON.parse(configData);
        }

        // Clear existing streams
        config.streams = {};

        // Add cameras as streams
        cameras.forEach(camera => {
            const rtspUrl = buildRtspUrl(camera);

            config.streams[camera.id] = {
                name: camera.name,
                channels: {
                    '0': {
                        name: camera.name,
                        url: rtspUrl,
                        on_demand: true,
                        debug: false,
                        status: 0
                    }
                }
            };
        });

        // Write updated config
        fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));

        return { success: true, message: 'Config updated successfully' };
    } catch (error) {
        console.error('Error updating config:', error);
        return { success: false, error: error.message };
    }
}

/**
 * HTTP Server
 */
const server = http.createServer((req, res) => {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }

    if (req.method === 'POST' && req.url === '/sync-cameras') {
        let body = '';

        req.on('data', chunk => {
            body += chunk.toString();
        });

        req.on('end', () => {
            try {
                const cameras = JSON.parse(body);
                const result = updateConfig(cameras);

                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify(result));
            } catch (error) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: false, error: 'Invalid JSON' }));
            }
        });
    } else if (req.method === 'GET' && req.url === '/health') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'ok' }));
    } else {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Not found' }));
    }
});

server.listen(PORT, () => {
    console.log(`Camera sync API listening on port ${PORT}`);
    console.log(`Config path: ${CONFIG_PATH}`);
});
