/**
 * Camera Viewer UI
 * Manages the camera grid and player instances
 */

(function() {
    'use strict';

    var cameraGrid = document.getElementById('cameraGrid');
    var noCamera = document.getElementById('noCamera');
    var layoutSelect = document.getElementById('layoutSelect');
    var refreshBtn = document.getElementById('refreshBtn');
    var fullscreenBtn = document.getElementById('fullscreenBtn');

    var players = [];
    var currentLayout = '2x4';

    /**
     * Initialize the viewer
     */
    function init() {
        loadCameras();
        attachEventListeners();
    }

    /**
     * Attach event listeners
     */
    function attachEventListeners() {
        layoutSelect.addEventListener('change', handleLayoutChange);
        refreshBtn.addEventListener('click', handleRefresh);
        fullscreenBtn.addEventListener('click', toggleFullscreen);
    }

    /**
     * Load and display cameras
     */
    function loadCameras() {
        var cameras = CameraStorage.getCameras();

        if (cameras.length === 0) {
            showNoCameras();
            return;
        }

        hideNoCameras();

        // Limit to 8 cameras for 2x4 layout
        var maxCameras = getMaxCamerasForLayout(currentLayout);
        var displayCameras = cameras.slice(0, maxCameras);

        // Stop existing players
        stopAllPlayers();

        // Create camera cells
        cameraGrid.innerHTML = '';

        for (var i = 0; i < displayCameras.length; i++) {
            createCameraCell(displayCameras[i]);
        }

        // Fill empty cells if needed
        var emptyCells = maxCameras - displayCameras.length;
        for (var j = 0; j < emptyCells; j++) {
            createEmptyCell();
        }
    }

    /**
     * Create camera cell
     */
    function createCameraCell(camera) {
        var cell = document.createElement('div');
        cell.className = 'camera-cell';
        cell.dataset.cameraId = camera.id;

        // Camera header
        var header = document.createElement('div');
        header.className = 'camera-header';
        header.innerHTML = '<div class="camera-name">' + escapeHtml(camera.name) + '</div>' +
            '<div class="camera-status-indicator"></div>';
        cell.appendChild(header);

        // Camera player container
        var playerContainer = document.createElement('div');
        playerContainer.className = 'camera-player';
        cell.appendChild(playerContainer);

        // Camera info overlay
        var infoOverlay = document.createElement('div');
        infoOverlay.className = 'camera-info-overlay';
        infoOverlay.innerHTML = '<p><strong>IP:</strong> ' + escapeHtml(camera.ip) + ':' + (camera.port || 554) + '</p>' +
            '<p><strong>Path:</strong> ' + escapeHtml(camera.rtspPath || '/stream1') + '</p>';
        cell.appendChild(infoOverlay);

        // Camera controls
        var controls = document.createElement('div');
        controls.className = 'camera-controls';
        controls.innerHTML = '<button onclick="handleSnapshot(\'' + camera.id + '\')">📷 Snapshot</button>' +
            '<button onclick="handleMaximize(\'' + camera.id + '\')">⛶ Maximize</button>';
        cell.appendChild(controls);

        cameraGrid.appendChild(cell);

        // Initialize player
        var player = new CameraPlayer.Player(playerContainer, camera);
        player.init();
        players.push(player);
    }

    /**
     * Create empty cell placeholder
     */
    function createEmptyCell() {
        var cell = document.createElement('div');
        cell.className = 'camera-cell';
        cell.innerHTML = '<div class="camera-player">' +
            '<div style="text-align: center; color: rgba(255,255,255,0.3); padding: 20px;">' +
            '<p>No Camera</p>' +
            '</div></div>';
        cameraGrid.appendChild(cell);
    }

    /**
     * Handle layout change
     */
    function handleLayoutChange() {
        currentLayout = layoutSelect.value;
        cameraGrid.className = 'camera-grid layout-' + currentLayout;
        loadCameras();
    }

    /**
     * Handle refresh
     */
    function handleRefresh() {
        loadCameras();
    }

    /**
     * Toggle fullscreen
     */
    function toggleFullscreen() {
        var container = document.querySelector('.viewer-container');

        if (!document.fullscreenElement &&
            !document.webkitFullscreenElement &&
            !document.mozFullScreenElement) {
            // Enter fullscreen
            if (container.requestFullscreen) {
                container.requestFullscreen();
            } else if (container.webkitRequestFullscreen) {
                container.webkitRequestFullscreen();
            } else if (container.mozRequestFullScreen) {
                container.mozRequestFullScreen();
            }
        } else {
            // Exit fullscreen
            if (document.exitFullscreen) {
                document.exitFullscreen();
            } else if (document.webkitExitFullscreen) {
                document.webkitExitFullscreen();
            } else if (document.mozCancelFullScreen) {
                document.mozCancelFullScreen();
            }
        }
    }

    /**
     * Stop all players
     */
    function stopAllPlayers() {
        for (var i = 0; i < players.length; i++) {
            players[i].stop();
        }
        players = [];
    }

    /**
     * Get max cameras for layout
     */
    function getMaxCamerasForLayout(layout) {
        var limits = {
            '1x1': 1,
            '2x2': 4,
            '2x4': 8,
            '3x3': 9
        };
        return limits[layout] || 8;
    }

    /**
     * Show no cameras message
     */
    function showNoCameras() {
        cameraGrid.style.display = 'none';
        noCamera.style.display = 'flex';
    }

    /**
     * Hide no cameras message
     */
    function hideNoCameras() {
        cameraGrid.style.display = 'grid';
        noCamera.style.display = 'none';
    }

    /**
     * Escape HTML
     */
    function escapeHtml(text) {
        var map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };
        return String(text).replace(/[&<>"']/g, function(m) { return map[m]; });
    }

    /**
     * Handle snapshot (global function)
     */
    window.handleSnapshot = function(cameraId) {
        for (var i = 0; i < players.length; i++) {
            if (players[i].camera.id === cameraId) {
                var dataUrl = players[i].takeSnapshot();
                if (dataUrl) {
                    // Download snapshot
                    var link = document.createElement('a');
                    link.href = dataUrl;
                    link.download = 'snapshot_' + cameraId + '_' + Date.now() + '.jpg';
                    link.click();
                }
                break;
            }
        }
    };

    /**
     * Handle maximize (global function)
     */
    window.handleMaximize = function(cameraId) {
        // Switch to single camera layout
        layoutSelect.value = '1x1';
        currentLayout = '1x1';
        cameraGrid.className = 'camera-grid layout-1x1';

        // Load only the selected camera
        var camera = CameraStorage.getCamera(cameraId);
        if (camera) {
            stopAllPlayers();
            cameraGrid.innerHTML = '';
            createCameraCell(camera);
        }
    };

    // Initialize on DOM ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    // Cleanup on page unload
    window.addEventListener('beforeunload', function() {
        stopAllPlayers();
    });
})();
