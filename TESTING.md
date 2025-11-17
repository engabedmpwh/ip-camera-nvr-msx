# Testing Guide - IP Camera NVR for MSX

Complete testing guide with and without real IP cameras.

## Prerequisites Check

### 1. Check Docker Installation
```bash
docker --version
docker-compose --version
```

If not installed, download from: https://www.docker.com/products/docker-desktop/

### 2. Check Network Connectivity
```bash
# Get your local IP address
ipconfig
```
Note your IPv4 address (e.g., 192.168.1.50)

## Testing Methods

### Method 1: Test Without Real Cameras (Recommended First)

You can test the entire UI without actual cameras using demo streams.

#### Step 1: Start the Services
```bash
cd C:\1\ip-camera-nvr-msx
docker-compose up -d
```

#### Step 2: Verify Services Running
```bash
docker ps
```

You should see:
- `ip-camera-nvr-backend` (RTSPtoWeb)
- `ip-camera-nvr-web` (Nginx)

#### Step 3: Check RTSPtoWeb is Running
Open browser: http://localhost:8083

You should see RTSPtoWeb demo page.

#### Step 4: Check Web Server
Open browser: http://localhost:8080/start.json

You should see JSON configuration.

#### Step 5: Test Manager UI
Open browser: http://localhost:8080/plugins/manager.html

You should see the camera management interface.

#### Step 6: Add a Test Camera
In the manager interface:
1. Click **"+ Add Camera"**
2. Fill in dummy data:
   - Name: `Test Camera 1`
   - IP: `192.168.1.100`
   - Port: `554`
   - Username: `admin`
   - Password: `test123`
   - RTSP Path: `/stream1`
   - Manufacturer: `Hikvision`
3. Click **"Save Camera"**

You should see the camera card appear.

#### Step 7: Test Viewer UI
Open browser: http://localhost:8080/plugins/viewer.html

You should see:
- 8-camera grid layout
- Your test camera in the first cell
- "Connecting..." message (will fail without real camera, that's OK for UI test)

#### Step 8: Test with Public Demo Stream
Use a public RTSP test stream:

1. Go back to manager
2. Add this camera:
   - Name: `Big Buck Bunny Demo`
   - IP: `wowzaec2demo.streamlock.net`
   - Port: `554`
   - Username: *(leave empty)*
   - Password: *(leave empty)*
   - RTSP Path: `/vod/mp4:BigBuckBunny_115k.mp4`
   - Manufacturer: `Generic`

3. Go to viewer - you should see the demo video playing!

### Method 2: Test with Real IP Camera

If you have an IP camera:

#### Step 1: Find Camera IP
Check your router's connected devices or use a network scanner:
```bash
# Windows (if you have it)
arp -a

# Or use Advanced IP Scanner (free tool)
```

#### Step 2: Test Camera RTSP Stream with VLC
1. Download VLC if you don't have it
2. Open VLC → Media → Open Network Stream
3. Enter:
   ```
   rtsp://username:password@CAMERA_IP:554/stream1
   ```
4. Try different paths if it doesn't work:
   - `/h264/ch1/main/av_stream` (Hikvision)
   - `/cam/realmonitor?channel=1&subtype=0` (Dahua)
   - `/live` (Generic)

#### Step 3: Add Camera to App
Once you find working RTSP URL in VLC:
1. Open manager: http://localhost:8080/plugins/manager.html
2. Add camera with the working settings
3. Save

#### Step 4: View Live Stream
Open viewer: http://localhost:8080/plugins/viewer.html

You should see your camera streaming live!

### Method 3: Test in Media Station X

#### Step 1: Get Your Computer's IP
```bash
ipconfig
```
Note your IPv4 address (e.g., 192.168.1.50)

#### Step 2: Open in MSX
1. Open Media Station X app on your TV/device
2. Enter URL:
   ```
   http://192.168.1.50:8080/start.json
   ```
   (Replace with your actual IP)
3. Press OK

#### Step 3: Navigate MSX App
1. You should see "IP Camera NVR" app
2. Select "Manage Cameras"
3. Add your cameras
4. Go back and select "8-Camera Grid View"

### Method 4: Test with RTSP Simulator

If you don't have cameras but want to test streaming:

#### Option A: Use FFmpeg to Create RTSP Stream
```bash
# Install FFmpeg first, then:
ffmpeg -re -stream_loop -1 -i test_video.mp4 -c copy -f rtsp rtsp://localhost:8554/stream1
```

Then add camera:
- IP: `localhost` (or your PC IP)
- Port: `8554`
- Path: `/stream1`

#### Option B: Use Public Test Streams
```
rtsp://wowzaec2demo.streamlock.net:554/vod/mp4:BigBuckBunny_115k.mp4
```

## Testing Checklist

### UI Testing
- [ ] Manager page loads correctly
- [ ] Can add new camera
- [ ] Camera appears in list
- [ ] Can edit camera
- [ ] Can delete camera
- [ ] Manufacturer dropdown works
- [ ] RTSP path auto-fills when selecting manufacturer

### Viewer Testing
- [ ] Viewer page loads with grid layout
- [ ] Layout selector works (1x1, 2x2, 2x4, 3x3)
- [ ] Refresh button works
- [ ] Fullscreen button works
- [ ] Camera cells display correctly
- [ ] Loading indicator shows when connecting
- [ ] Error message shows when connection fails

### Streaming Testing (with real camera/demo stream)
- [ ] Video stream starts playing
- [ ] Status indicator turns green when live
- [ ] Video quality is acceptable
- [ ] Audio works (if camera has audio)
- [ ] Multiple cameras play simultaneously
- [ ] Snapshot button works
- [ ] Maximize button works

### Backend Testing
- [ ] Docker containers start successfully
- [ ] RTSPtoWeb accessible on port 8083
- [ ] Web server accessible on port 8080
- [ ] No errors in logs: `docker-compose logs`

### MSX Integration Testing
- [ ] MSX can load start.json
- [ ] Menu navigation works
- [ ] Manager opens in MSX
- [ ] Viewer opens in MSX
- [ ] About panel shows information
- [ ] Can add cameras from MSX interface

## Common Test Issues & Solutions

### Issue: Docker containers won't start
**Solution:**
```bash
# Check Docker is running
docker ps

# Check logs
docker-compose logs

# Restart services
docker-compose down
docker-compose up -d
```

### Issue: Can't access http://localhost:8080
**Solution:**
```bash
# Check if port is in use
netstat -ano | findstr :8080

# Try different port in docker-compose.yml
```

### Issue: Camera shows "Connection Failed"
**Solution:**
1. Test RTSP URL in VLC first
2. Verify camera IP is correct
3. Check username/password
4. Try different RTSP paths
5. Check firewall allows port 554

### Issue: MSX can't load the app
**Solution:**
1. Use your PC's IP, not `localhost`
2. Ensure MSX device is on same network
3. Check Windows Firewall allows ports 8080, 8083
4. Try accessing from phone browser first: `http://YOUR_IP:8080`

### Issue: Stream is very slow/laggy
**Solution:**
1. Prefer WebRTC over HLS (automatic)
2. Check network bandwidth
3. Lower camera resolution/bitrate
4. Reduce number of simultaneous cameras

## Viewing Logs

### View all logs:
```bash
docker-compose logs -f
```

### View specific service:
```bash
docker-compose logs -f rtsptoweb
docker-compose logs -f web-server
```

### Check browser console:
1. Open browser (Chrome/Edge)
2. Press F12
3. Go to Console tab
4. Look for errors

## Performance Testing

### Monitor Docker Resources:
```bash
docker stats
```

Expected usage per camera:
- CPU: 0.2-1%
- Memory: 50-100MB
- Network: 2-8 Mbps (depends on camera bitrate)

## Test Scenarios

### Scenario 1: Single Camera Test
1. Add 1 camera
2. View in 1x1 layout
3. Verify smooth playback
4. Take snapshot
5. Test fullscreen

### Scenario 2: Multiple Camera Test
1. Add 4 cameras
2. View in 2x2 layout
3. Verify all streams load
4. Check status indicators
5. Test layout switching

### Scenario 3: Maximum Capacity Test
1. Add 8 cameras
2. View in 2x4 layout
3. Monitor CPU/memory usage
4. Verify acceptable performance
5. Test auto-reconnect (disable/enable network)

### Scenario 4: Network Failure Test
1. Start streaming
2. Disconnect camera from network
3. Verify error message appears
4. Reconnect camera
5. Verify auto-reconnect works

## Automated Testing (Optional)

Create a test script:

```javascript
// test-cameras.js
const cameras = [
    {
        name: "Demo Camera 1",
        ip: "wowzaec2demo.streamlock.net",
        port: 554,
        rtspPath: "/vod/mp4:BigBuckBunny_115k.mp4"
    }
];

localStorage.setItem('ip_camera_nvr_cameras', JSON.stringify(cameras));
console.log('Test cameras loaded');
```

Run in browser console on manager page.

## Success Criteria

✅ **Basic Functionality:**
- All pages load without errors
- Can add/edit/delete cameras
- UI is responsive and usable

✅ **Streaming (with test stream):**
- Demo stream plays successfully
- Status indicators work
- Controls (snapshot, maximize) function

✅ **MSX Integration:**
- App loads in MSX
- Navigation works
- Can manage cameras from TV interface

✅ **Performance:**
- No significant lag with multiple streams
- Acceptable CPU/memory usage
- Streams auto-reconnect on failure

## Need Help?

If tests fail:
1. Check TESTING.md troubleshooting section
2. Review logs: `docker-compose logs -f`
3. Test RTSP URLs with VLC
4. Verify network connectivity
5. Check firewall settings

Happy Testing! 🧪
