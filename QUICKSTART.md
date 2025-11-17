# Quick Start Guide

Get your IP Camera NVR running in 5 minutes!

## Step 1: Start the Application

### Using Docker (Recommended)

**Windows:**
```batch
start.bat
```

**Linux/Mac:**
```bash
docker-compose up -d
```

This starts:
- RTSPtoWeb on port 8083 (stream server)
- Nginx on port 8080 (web server)

## Step 2: Find Your Computer's IP Address

### Windows:
```batch
ipconfig
```
Look for "IPv4 Address" (e.g., 192.168.1.50)

### Linux/Mac:
```bash
ifconfig
# or
ip addr show
```

## Step 3: Open in Media Station X

1. Open **Media Station X** on your TV/device
2. Enter this URL:
   ```
   http://[YOUR_IP]:8080/start.json
   ```
   Example: `http://192.168.1.50:8080/start.json`

3. Press OK/Enter

## Step 4: Add Your First Camera

1. In MSX, select **"Manage Cameras"**
2. Click **"+ Add Camera"**
3. Fill in the form:

   ```
   Camera Name:     Front Door
   IP Address:      192.168.1.100
   Port:            554
   Username:        admin
   Password:        yourpassword
   RTSP Path:       /stream1
   Manufacturer:    Select from dropdown (auto-fills path)
   ```

4. Click **"Save Camera"**

## Step 5: View Live Cameras

1. Go back to main menu
2. Select **"8-Camera Grid View"**
3. Your cameras will start streaming!

## Finding Your Camera's RTSP Path

### Method 1: Check Camera Manual
Look for "RTSP URL" or "Stream URL" in your camera's documentation

### Method 2: Common Paths by Brand

**Hikvision:**
```
/Streaming/Channels/101
/h264/ch1/main/av_stream
```

**Dahua:**
```
/cam/realmonitor?channel=1&subtype=0
/live/ch00_0
```

**Reolink:**
```
/h264Preview_01_main
/bcs/channel0_main.bcs
```

**Amcrest:**
```
/cam/realmonitor?channel=1&subtype=0
```

**Generic/Others:**
```
/stream1
/live
/h264
```

### Method 3: Test with VLC

1. Open **VLC Media Player**
2. Go to **Media → Open Network Stream**
3. Enter:
   ```
   rtsp://username:password@camera-ip:554/stream1
   ```
4. Try different paths until you see video
5. Use that working path in the MSX app

## Troubleshooting

### "No Cameras Configured"
- Make sure you added cameras in "Manage Cameras"
- Cameras are stored in browser storage

### "Connection Failed"
1. **Check camera IP**: Can you ping it?
   ```
   ping 192.168.1.100
   ```

2. **Test RTSP URL in VLC**: Does it work?

3. **Check RTSPtoWeb**: Is it running?
   ```
   docker ps
   # or visit
   http://localhost:8083
   ```

4. **Verify credentials**: Username and password correct?

### Black Screen
- **Wrong RTSP path**: Try different paths for your camera model
- **Firewall**: Check if port 554 is blocked
- **Camera limit**: Some cameras limit simultaneous connections

### Services Not Starting
```bash
# Check Docker is running
docker ps

# View logs
docker-compose logs

# Restart services
docker-compose restart
```

## Next Steps

- Add up to 8 cameras
- Try different grid layouts (2x2, 3x3, 4x4)
- Take snapshots with the camera button
- Use fullscreen mode for better viewing

## Need More Help?

- Check the full **README.md** for detailed documentation
- Test RTSP URLs with VLC before adding to app
- Review RTSPtoWeb logs: `docker-compose logs -f rtsptoweb`

## Common Mistakes

1. ❌ Using `localhost` in MSX - MSX device can't reach your localhost
   ✅ Use your computer's local IP (e.g., 192.168.1.50)

2. ❌ Wrong RTSP path
   ✅ Select manufacturer from dropdown or test with VLC first

3. ❌ Missing username/password
   ✅ Most cameras require authentication

4. ❌ Services not running
   ✅ Run `docker ps` to verify containers are up

5. ❌ Firewall blocking
   ✅ Allow ports 554, 8080, 8083 through firewall

Enjoy your IP Camera NVR! 📹
