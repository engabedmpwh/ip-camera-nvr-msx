/**
 * Camera Storage Manager
 * Handles saving and retrieving camera configurations from localStorage
 */

var CameraStorage = (function() {
    'use strict';

    var STORAGE_KEY = 'ip_camera_nvr_cameras';

    /**
     * Get all cameras from localStorage
     * @returns {Array} Array of camera objects
     */
    function getCameras() {
        try {
            var stored = localStorage.getItem(STORAGE_KEY);
            return stored ? JSON.parse(stored) : [];
        } catch (e) {
            console.error('Error reading cameras from storage:', e);
            return [];
        }
    }

    /**
     * Save cameras to localStorage
     * @param {Array} cameras - Array of camera objects
     * @returns {boolean} Success status
     */
    function saveCameras(cameras) {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(cameras));
            return true;
        } catch (e) {
            console.error('Error saving cameras to storage:', e);
            return false;
        }
    }

    /**
     * Add a new camera
     * @param {Object} camera - Camera object
     * @returns {Object} Added camera with generated ID
     */
    function addCamera(camera) {
        var cameras = getCameras();
        camera.id = generateId();
        camera.createdAt = new Date().toISOString();
        camera.status = 'inactive';
        cameras.push(camera);
        saveCameras(cameras);
        return camera;
    }

    /**
     * Update an existing camera
     * @param {string} id - Camera ID
     * @param {Object} updates - Updated camera properties
     * @returns {Object|null} Updated camera or null if not found
     */
    function updateCamera(id, updates) {
        var cameras = getCameras();
        var index = cameras.findIndex(function(cam) {
            return cam.id === id;
        });

        if (index === -1) {
            return null;
        }

        cameras[index] = Object.assign({}, cameras[index], updates);
        cameras[index].updatedAt = new Date().toISOString();
        saveCameras(cameras);
        return cameras[index];
    }

    /**
     * Delete a camera
     * @param {string} id - Camera ID
     * @returns {boolean} Success status
     */
    function deleteCamera(id) {
        var cameras = getCameras();
        var filtered = cameras.filter(function(cam) {
            return cam.id !== id;
        });

        if (filtered.length === cameras.length) {
            return false;
        }

        saveCameras(filtered);
        return true;
    }

    /**
     * Get a single camera by ID
     * @param {string} id - Camera ID
     * @returns {Object|null} Camera object or null if not found
     */
    function getCamera(id) {
        var cameras = getCameras();
        return cameras.find(function(cam) {
            return cam.id === id;
        }) || null;
    }

    /**
     * Generate unique camera ID
     * @returns {string} Unique ID
     */
    function generateId() {
        return 'cam_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    /**
     * Build RTSP URL from camera configuration
     * @param {Object} camera - Camera object
     * @returns {string} RTSP URL
     */
    function buildRtspUrl(camera) {
        var auth = '';
        if (camera.username && camera.password) {
            auth = camera.username + ':' + camera.password + '@';
        }

        var port = camera.port || 554;
        var path = camera.rtspPath || '/stream1';

        // Ensure path starts with /
        if (path.charAt(0) !== '/') {
            path = '/' + path;
        }

        return 'rtsp://' + auth + camera.ip + ':' + port + path;
    }

    /**
     * Get common RTSP paths for different manufacturers
     * @param {string} manufacturer - Camera manufacturer
     * @returns {Array} Array of common RTSP paths
     */
    function getRtspPaths(manufacturer) {
        var paths = {
            hikvision: [
                '/Streaming/Channels/101',
                '/Streaming/Channels/102',
                '/h264/ch1/main/av_stream',
                '/h264/ch1/sub/av_stream'
            ],
            dahua: [
                '/cam/realmonitor?channel=1&subtype=0',
                '/cam/realmonitor?channel=1&subtype=1',
                '/live/ch00_0',
                '/live/ch00_1'
            ],
            axis: [
                '/axis-media/media.amp',
                '/axis-media/media.amp?videocodec=h264',
                '/mjpg/video.mjpg'
            ],
            reolink: [
                '/h264Preview_01_main',
                '/h264Preview_01_sub',
                '/bcs/channel0_main.bcs'
            ],
            amcrest: [
                '/cam/realmonitor?channel=1&subtype=0',
                '/cam/realmonitor?channel=1&subtype=1'
            ],
            foscam: [
                '/videoMain',
                '/videoSub',
                '/11'
            ],
            vivotek: [
                '/live.sdp',
                '/live2.sdp'
            ],
            generic: [
                '/stream1',
                '/stream2',
                '/live',
                '/h264'
            ]
        };

        return paths[manufacturer] || paths.generic;
    }

    /**
     * Clear all cameras from storage
     * @returns {boolean} Success status
     */
    function clearAll() {
        try {
            localStorage.removeItem(STORAGE_KEY);
            return true;
        } catch (e) {
            console.error('Error clearing storage:', e);
            return false;
        }
    }

    // Public API
    return {
        getCameras: getCameras,
        saveCameras: saveCameras,
        addCamera: addCamera,
        updateCamera: updateCamera,
        deleteCamera: deleteCamera,
        getCamera: getCamera,
        buildRtspUrl: buildRtspUrl,
        getRtspPaths: getRtspPaths,
        clearAll: clearAll
    };
})();
