/**
 * Camera Scanner Service
 * Discovers IP cameras on the network using ONVIF protocol
 */

const http = require('http');
const dgram = require('dgram');
const os = require('os');

const PORT = 8085;
const ONVIF_PORT = 3702;
const SCAN_TIMEOUT = 5000;

/**
 * Get local network interfaces
 */
function getLocalNetworks() {
    const networks = [];
    const interfaces = os.networkInterfaces();

    for (const name of Object.keys(interfaces)) {
        for (const iface of interfaces[name]) {
            // Skip internal and non-IPv4 addresses
            if (iface.family === 'IPv4' && !iface.internal) {
                networks.push({
                    name: name,
                    address: iface.address,
                    netmask: iface.netmask,
                    cidr: iface.cidr
                });
            }
        }
    }

    return networks;
}

/**
 * Generate IP range from network address
 */
function getIPRange(networkAddress) {
    const parts = networkAddress.split('.');
    const baseIP = parts.slice(0, 3).join('.');
    const ips = [];

    // Scan common range 1-254
    for (let i = 1; i <= 254; i++) {
        ips.push(`${baseIP}.${i}`);
    }

    return ips;
}

/**
 * Ping IP address to check if alive
 */
function pingIP(ip, timeout = 1000) {
    return new Promise((resolve) => {
        const socket = dgram.createSocket('udp4');

        const timer = setTimeout(() => {
            socket.close();
            resolve(null);
        }, timeout);

        socket.on('message', () => {
            clearTimeout(timer);
            socket.close();
            resolve(ip);
        });

        socket.on('error', () => {
            clearTimeout(timer);
            socket.close();
            resolve(null);
        });

        // Send WS-Discovery probe
        const probe = buildWSDiscoveryProbe();
        socket.send(probe, ONVIF_PORT, ip, (err) => {
            if (err) {
                clearTimeout(timer);
                socket.close();
                resolve(null);
            }
        });
    });
}

/**
 * Build WS-Discovery SOAP probe message
 */
function buildWSDiscoveryProbe() {
    const probe = `<?xml version="1.0" encoding="UTF-8"?>
<e:Envelope xmlns:e="http://www.w3.org/2003/05/soap-envelope"
    xmlns:w="http://schemas.xmlsoap.org/ws/2004/08/addressing"
    xmlns:d="http://schemas.xmlsoap.org/ws/2005/04/discovery"
    xmlns:dn="http://www.onvif.org/ver10/network/wsdl">
    <e:Header>
        <w:MessageID>uuid:${generateUUID()}</w:MessageID>
        <w:To>urn:schemas-xmlsoap-org:ws:2005:04:discovery</w:To>
        <w:Action>http://schemas.xmlsoap.org/ws/2005/04/discovery/Probe</w:Action>
    </e:Header>
    <e:Body>
        <d:Probe>
            <d:Types>dn:NetworkVideoTransmitter</d:Types>
        </d:Probe>
    </e:Body>
</e:Envelope>`;

    return Buffer.from(probe);
}

/**
 * Generate UUID
 */
function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

/**
 * Scan network for cameras using ONVIF
 */
async function scanForCameras(networkRange) {
    console.log('Starting ONVIF camera scan...');
    console.log('Network range:', networkRange);

    const foundDevices = [];
    const socket = dgram.createSocket('udp4');

    return new Promise((resolve) => {
        const devices = new Set();

        socket.on('message', (msg, rinfo) => {
            const response = msg.toString();

            // Check if response is from an ONVIF device
            if (response.includes('NetworkVideoTransmitter') ||
                response.includes('onvif') ||
                response.includes('Device')) {

                const ip = rinfo.address;
                if (!devices.has(ip)) {
                    devices.add(ip);

                    console.log(`Found camera at: ${ip}`);

                    foundDevices.push({
                        ip: ip,
                        port: 80,
                        manufacturer: extractManufacturer(response),
                        model: extractModel(response),
                        type: 'onvif'
                    });
                }
            }
        });

        socket.on('error', (err) => {
            console.error('Socket error:', err);
        });

        socket.bind(ONVIF_PORT, () => {
            socket.setBroadcast(true);

            // Send broadcast probe
            const probe = buildWSDiscoveryProbe();
            socket.send(probe, ONVIF_PORT, '239.255.255.250', (err) => {
                if (err) {
                    console.error('Broadcast error:', err);
                }
            });

            // Also try multicast
            try {
                socket.addMembership('239.255.255.250');
            } catch (e) {
                console.log('Could not add multicast membership');
            }
        });

        // Stop scanning after timeout
        setTimeout(() => {
            socket.close();
            resolve(foundDevices);
        }, SCAN_TIMEOUT);
    });
}

/**
 * Simple IP scan (ping sweep)
 */
async function simpleScan(networkAddress) {
    console.log('Starting simple IP scan...');

    const ipRange = getIPRange(networkAddress);
    const aliveIPs = [];

    // Scan in batches to avoid overwhelming the network
    const batchSize = 20;
    for (let i = 0; i < ipRange.length; i += batchSize) {
        const batch = ipRange.slice(i, i + batchSize);
        const results = await Promise.all(
            batch.map(ip => checkHTTPPort(ip))
        );

        results.forEach(result => {
            if (result) {
                aliveIPs.push(result);
            }
        });
    }

    console.log(`Found ${aliveIPs.length} devices with HTTP port open`);
    return aliveIPs;
}

/**
 * Check if HTTP port is open (common for cameras)
 */
function checkHTTPPort(ip, timeout = 500) {
    return new Promise((resolve) => {
        const socket = new require('net').Socket();

        socket.setTimeout(timeout);

        socket.on('connect', () => {
            socket.destroy();
            console.log(`Found device at: ${ip}`);
            resolve({
                ip: ip,
                port: 80,
                manufacturer: 'Unknown',
                model: 'Unknown',
                type: 'http'
            });
        });

        socket.on('timeout', () => {
            socket.destroy();
            resolve(null);
        });

        socket.on('error', () => {
            socket.destroy();
            resolve(null);
        });

        socket.connect(80, ip);
    });
}

/**
 * Extract manufacturer from ONVIF response
 */
function extractManufacturer(response) {
    const patterns = [
        /Manufacturer>([^<]+)</i,
        /mfr>([^<]+)</i,
        /Hikvision/i,
        /Dahua/i,
        /Axis/i,
        /Reolink/i
    ];

    for (const pattern of patterns) {
        const match = response.match(pattern);
        if (match) {
            return match[1] || match[0];
        }
    }

    return 'Unknown';
}

/**
 * Extract model from ONVIF response
 */
function extractModel(response) {
    const patterns = [
        /Model>([^<]+)</i,
        /mdl>([^<]+)</i
    ];

    for (const pattern of patterns) {
        const match = response.match(pattern);
        if (match) {
            return match[1];
        }
    }

    return 'Unknown';
}

/**
 * HTTP Server
 */
const server = http.createServer(async (req, res) => {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }

    if (req.method === 'GET' && req.url === '/scan') {
        try {
            const networks = getLocalNetworks();
            console.log('Local networks:', networks);

            if (networks.length === 0) {
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({
                    success: false,
                    error: 'No network interfaces found'
                }));
                return;
            }

            // Use first non-internal network
            const network = networks[0];
            console.log('Scanning network:', network.address);

            // Try ONVIF discovery first
            let cameras = await scanForCameras(network.address);

            // If no ONVIF cameras found, do simple scan
            if (cameras.length === 0) {
                console.log('No ONVIF cameras found, trying simple scan...');
                cameras = await simpleScan(network.address);
            }

            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
                success: true,
                cameras: cameras,
                network: network.address
            }));

        } catch (error) {
            console.error('Scan error:', error);
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
                success: false,
                error: error.message
            }));
        }
    } else if (req.method === 'GET' && req.url === '/health') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'ok' }));
    } else if (req.method === 'GET' && req.url === '/networks') {
        const networks = getLocalNetworks();
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ networks: networks }));
    } else {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Not found' }));
    }
});

server.listen(PORT, () => {
    console.log('========================================');
    console.log('  Camera Scanner Service');
    console.log('========================================');
    console.log(`Listening on port ${PORT}`);
    console.log(`Scan endpoint: http://localhost:${PORT}/scan`);
    console.log('');
    console.log('Local networks:');
    getLocalNetworks().forEach(net => {
        console.log(`  - ${net.name}: ${net.address}`);
    });
    console.log('========================================');
});
