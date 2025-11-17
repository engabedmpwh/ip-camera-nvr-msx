# IP Camera NVR for Media Station X

A lightweight IP camera viewer application for **Media Station X (MSX)** platform. View up to 8 IP cameras simultaneously with support for RTSP/RTMP streams via WebRTC or HLS.

## Features

- **Multi-Camera View**: Display up to 8 cameras in a grid layout (2x4, 2x2, 3x3, or single camera)
- **Live Streaming**: Low-latency WebRTC streaming with HLS fallback
- **Camera Management**: Add, edit, and delete camera configurations
- **Multiple Manufacturers**: Support for Hikvision, Dahua, Axis, Reolink, Amcrest, Foscam, Vivotek, and generic cameras
- **Authentication**: Username/password support for camera credentials
- **Auto-Reconnect**: Automatic reconnection on stream failure
- **Snapshot Capture**: Take snapshots from live streams
- **Fullscreen Mode**: Full-screen viewing support
- **Responsive Design**: Modern, clean interface

## Architecture

```
┌─────────────────┐
│   MSX Player    │
│  (TV/Browser)   │
└────────┬────────┘
         │
         ↓
┌─────────────────┐      ┌──────────────┐
│  MSX App        │      │  RTSPtoWeb   │
│  (JSON + HTML)  │←────→│   Backend    │
└─────────────────┘      └──────┬───────┘
                                │
                         ┌──────┴───────┐
                         ↓              ↓
                    ┌─────────┐   ┌─────────┐
                    │ Camera 1│   │ Camera 8│
                    └─────────┘   └─────────┘
```

## Prerequisites

- **Docker** (recommended) or **Node.js** + **Go** for manual installation
- **Media Station X** app installed on your device
- IP cameras with **RTSP** support
- Network access to cameras

## Quick Start (Docker)

### 1. Clone or Download This Project

```bash
cd C:\1\ip-camera-nvr-msx
```

### 2. Start the Backend Services

```bash
docker-compose up -d
```

This will start:
- **RTSPtoWeb** server on port `8083` (stream conversion)
- **Nginx** web server on port `8080` (MSX app hosting)
- **Camera Sync API** on port `8084` (optional, for automatic config sync)

### 3. Verify Services Are Running

```bash
docker-compose ps
```

You should see both containers running.

### 4. Open in Media Station X

**Option A: Local Network**
1. Open Media Station X app
2. Enter URL: `http://[YOUR_IP]:8080/start.json`
3. Replace `[YOUR_IP]` with your computer's local IP address

**Option B: GitHub Pages / Web Hosting**
1. Upload the project to a web server with CORS enabled
2. Update the backend URLs in `player.js` to point to your RTSPtoWeb server
3. Open MSX with your hosted URL

### 5. Add Your Cameras

1. In the MSX app, navigate to **Manage Cameras**
2. Click **+ Add Camera**
3. Fill in camera details:
   - **Camera Name**: e.g., "Front Door"
   - **IP Address**: e.g., "192.168.1.100"
   - **Port**: Usually `554` for RTSP
   - **Username & Password**: Camera credentials
   - **RTSP Path**: Camera-specific path (auto-filled if you select manufacturer)
4. Click **Save Camera**

### 6. View Live Cameras

1. Go back to **Camera Viewer**
2. Click **8-Camera Grid View**
3. Your cameras will start streaming automatically

## Manual Installation (Without Docker)

### Install RTSPtoWeb

```bash
# Install Go if not already installed
# Then clone and run RTSPtoWeb
git clone https://github.com/deepch/RTSPtoWeb.git
cd RTSPtoWeb
GO111MODULE=on go run *.go
```

### Serve MSX Files

Use any HTTP server with CORS support:

```bash
# Python 3
python -m http.server 8080

# OR Node.js http-server
npx http-server -p 8080 --cors
```

### Update Configuration

Edit `plugins/js/player.js` and update the backend URL if needed:

```javascript
var BACKEND_URL = 'http://localhost:8083';
```

## Common RTSP Paths by Manufacturer

| Manufacturer | Common RTSP Paths |
|--------------|-------------------|
| **Hikvision** | `/Streaming/Channels/101`, `/h264/ch1/main/av_stream` |
| **Dahua** | `/cam/realmonitor?channel=1&subtype=0`, `/live/ch00_0` |
| **Axis** | `/axis-media/media.amp` |
| **Reolink** | `/h264Preview_01_main`, `/bcs/channel0_main.bcs` |
| **Amcrest** | `/cam/realmonitor?channel=1&subtype=0` |
| **Foscam** | `/videoMain`, `/11` |
| **Vivotek** | `/live.sdp` |
| **Generic** | `/stream1`, `/live`, `/h264` |

## Configuration Files

### RTSPtoWeb Config (`backend/config.json`)

The camera configurations are stored in `config.json`:

```json
{
  "server": {
    "http_port": ":8083",
    "http_demo": true,
    "http_dir": "../plugins"
  },
  "streams": {
    "cam_123": {
      "name": "Front Door",
      "channels": {
        "0": {
          "url": "rtsp://admin:password@192.168.1.100:554/stream1",
          "on_demand": true
        }
      }
    }
  }
}
```

### MSX Start File (`start.json`)

Main entry point for the MSX application. Defines menus and navigation.

## Troubleshooting

### Cameras Not Connecting

1. **Check camera IP and port**: Ensure the camera is reachable
   ```bash
   ping 192.168.1.100
   ```

2. **Verify RTSP URL**: Test with VLC or ffplay
   ```bash
   ffplay rtsp://admin:password@192.168.1.100:554/stream1
   ```

3. **Check RTSPtoWeb logs**:
   ```bash
   docker-compose logs -f rtsptoweb
   ```

4. **Firewall**: Ensure ports 554 (RTSP), 8083 (RTSPtoWeb) are not blocked

### Black Screen or Loading Forever

- **RTSP Path**: Try different RTSP paths for your camera model
- **Credentials**: Double-check username and password
- **Network**: Ensure MSX device can reach the backend server
- **CORS**: Verify CORS headers are enabled on your web server

### High Latency

- **Use WebRTC**: Preferred for low latency (~100ms)
- **Network**: Check network bandwidth and quality
- **Camera Settings**: Lower camera bitrate/resolution if needed

### "No Cameras Configured" Message

- Add cameras via the **Manage Cameras** interface
- Cameras are stored in browser localStorage

## Cloud Deployment (Free Options)

### For MSX App Files (start.json, HTML, JS, CSS)

1. **GitHub Pages** (Recommended)
   - Push files to GitHub repository
   - Enable GitHub Pages in repo settings
   - Access via `https://[username].github.io/[repo]/start.json`

2. **Netlify**
   - Deploy via drag-and-drop or Git
   - Free tier includes HTTPS and CDN

3. **Vercel**
   - Free deployment with automatic HTTPS

### For RTSPtoWeb Backend

**Important**: RTSPtoWeb requires network access to your local cameras.

**Options:**
1. **Keep on local machine**: Most reliable for home use
2. **VPS/Cloud Server**:
   - Rent a small VPS (DigitalOcean, Linode, AWS EC2)
   - Setup VPN to access local cameras
3. **Cloudflare Tunnel**: Free tunnel to expose local RTSPtoWeb securely

## Project Structure

```
ip-camera-nvr-msx/
├── start.json                 # MSX entry point
├── docker-compose.yml         # Docker services
├── nginx.conf                 # Web server config
├── plugins/
│   ├── manager.html           # Camera management UI
│   ├── viewer.html            # Camera grid viewer
│   ├── css/
│   │   ├── manager.css        # Manager styles
│   │   └── viewer.css         # Viewer styles
│   └── js/
│       ├── storage.js         # LocalStorage handler
│       ├── manager.js         # Manager logic
│       ├── player.js          # Video player (WebRTC/HLS)
│       └── viewer.js          # Grid viewer logic
├── backend/
│   ├── config.json            # RTSPtoWeb config
│   └── sync-cameras.js        # Camera sync API (optional)
└── README.md                  # This file
```

## Customization

### Change Grid Layout

Edit `plugins/viewer.html`:

```html
<select id="layoutSelect">
    <option value="2x2">2x2 Grid (4 cameras)</option>
    <option value="2x4" selected>2x4 Grid (8 cameras)</option>
    <option value="4x4">4x4 Grid (16 cameras)</option>
</select>
```

Add corresponding CSS in `plugins/css/viewer.css`.

### Change Backend URL

Edit `plugins/js/player.js`:

```javascript
var BACKEND_URL = 'http://your-backend-url:8083';
```

### Add More Camera Manufacturers

Edit `plugins/js/storage.js` and add to `getRtspPaths()` function.

## Performance

- **CPU Usage**: ~0.2-1% per stream (RTSPtoWeb)
- **Memory**: ~50-100MB per stream
- **Bandwidth**: Depends on camera bitrate (typically 2-8 Mbps per camera)
- **Recommended**:
  - 4 cameras: 2-core CPU, 2GB RAM
  - 8 cameras: 4-core CPU, 4GB RAM

## Security Considerations

1. **HTTPS**: Use HTTPS for production deployments
2. **Authentication**: Enable RTSPtoWeb authentication if exposed to internet
3. **Firewall**: Restrict access to backend services
4. **Camera Credentials**: Never hardcode passwords in public repositories
5. **Network Isolation**: Consider VLAN for camera network

## License

This project is provided as-is for use with Media Station X platform.

## Credits

- **Media Station X**: [benzac.de](https://msx.benzac.de/)
- **RTSPtoWeb**: [github.com/deepch/RTSPtoWeb](https://github.com/deepch/RTSPtoWeb)

## Support

For issues or questions:
1. Check RTSPtoWeb documentation for streaming issues
2. Visit MSX Wiki for MSX-specific questions
3. Test RTSP URLs directly with VLC to isolate camera issues

## Changelog

### Version 1.0.0 (2025-01-16)
- Initial release
- 8-camera grid support
- WebRTC and HLS streaming
- Camera management interface
- Auto-reconnect functionality
- Snapshot capture
- Multiple manufacturer presets
