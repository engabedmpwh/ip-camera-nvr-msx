/**
 * Camera Manager UI
 * Handles camera management interface interactions
 */

(function() {
    'use strict';

    var modal = document.getElementById('cameraModal');
    var addBtn = document.getElementById('addCameraBtn');
    var closeBtn = document.getElementsByClassName('close')[0];
    var form = document.getElementById('cameraForm');
    var cameraList = document.getElementById('cameraList');
    var modalTitle = document.getElementById('modalTitle');
    var connectionTypeRadios = document.getElementsByName('connectionType');
    var manualConfig = document.getElementById('manualConfig');
    var autoConfig = document.getElementById('autoConfig');
    var manufacturerSelect = document.getElementById('manufacturer');
    var rtspPathInput = document.getElementById('rtspPath');
    var testBtn = document.getElementById('testBtn');
    var scanBtn = document.getElementById('scanBtn');

    var editingCameraId = null;

    /**
     * Initialize the manager
     */
    function init() {
        loadCameras();
        attachEventListeners();
    }

    /**
     * Attach event listeners
     */
    function attachEventListeners() {
        addBtn.addEventListener('click', openAddModal);
        closeBtn.addEventListener('click', closeModal);
        window.addEventListener('click', function(event) {
            if (event.target === modal) {
                closeModal();
            }
        });

        form.addEventListener('submit', handleSubmit);

        for (var i = 0; i < connectionTypeRadios.length; i++) {
            connectionTypeRadios[i].addEventListener('change', handleConnectionTypeChange);
        }

        manufacturerSelect.addEventListener('change', handleManufacturerChange);
        testBtn.addEventListener('click', testConnection);
        scanBtn.addEventListener('click', scanNetwork);
    }

    /**
     * Load and display all cameras
     */
    function loadCameras() {
        var cameras = CameraStorage.getCameras();

        if (cameras.length === 0) {
            showEmptyState();
            return;
        }

        cameraList.innerHTML = '';

        for (var i = 0; i < cameras.length; i++) {
            var card = createCameraCard(cameras[i]);
            cameraList.appendChild(card);
        }
    }

    /**
     * Show empty state message
     */
    function showEmptyState() {
        cameraList.innerHTML = '<div class="empty-state">' +
            '<h2>No Cameras Added</h2>' +
            '<p>Click "Add Camera" to get started</p>' +
            '</div>';
    }

    /**
     * Create camera card element
     */
    function createCameraCard(camera) {
        var card = document.createElement('div');
        card.className = 'camera-card';

        var statusClass = camera.status === 'active' ? 'status-active' : 'status-inactive';
        var statusText = camera.status === 'active' ? 'Active' : 'Inactive';

        card.innerHTML = '<h3>' + escapeHtml(camera.name) + '</h3>' +
            '<div class="camera-info"><strong>IP:</strong> ' + escapeHtml(camera.ip) + ':' + (camera.port || 554) + '</div>' +
            '<div class="camera-info"><strong>Path:</strong> ' + escapeHtml(camera.rtspPath || '/stream1') + '</div>' +
            (camera.manufacturer ? '<div class="camera-info"><strong>Make:</strong> ' + escapeHtml(camera.manufacturer) + '</div>' : '') +
            '<span class="camera-status ' + statusClass + '">' + statusText + '</span>' +
            '<div class="camera-actions">' +
                '<button class="btn-secondary edit-btn" data-id="' + camera.id + '">Edit</button>' +
                '<button class="btn-danger delete-btn" data-id="' + camera.id + '">Delete</button>' +
            '</div>';

        var editBtn = card.querySelector('.edit-btn');
        var deleteBtn = card.querySelector('.delete-btn');

        editBtn.addEventListener('click', function() {
            openEditModal(camera.id);
        });

        deleteBtn.addEventListener('click', function() {
            handleDelete(camera.id);
        });

        return card;
    }

    /**
     * Open add camera modal
     */
    function openAddModal() {
        editingCameraId = null;
        modalTitle.textContent = 'Add Camera';
        form.reset();
        modal.style.display = 'block';
    }

    /**
     * Open edit camera modal
     */
    function openEditModal(cameraId) {
        editingCameraId = cameraId;
        modalTitle.textContent = 'Edit Camera';

        var camera = CameraStorage.getCamera(cameraId);
        if (!camera) {
            alert('Camera not found');
            return;
        }

        document.getElementById('cameraId').value = camera.id;
        document.getElementById('cameraName').value = camera.name;
        document.getElementById('cameraIp').value = camera.ip;
        document.getElementById('cameraPort').value = camera.port || 554;
        document.getElementById('cameraUsername').value = camera.username || '';
        document.getElementById('cameraPassword').value = camera.password || '';
        document.getElementById('rtspPath').value = camera.rtspPath || '/stream1';
        document.getElementById('manufacturer').value = camera.manufacturer || '';

        modal.style.display = 'block';
    }

    /**
     * Close modal
     */
    function closeModal() {
        modal.style.display = 'none';
        form.reset();
        editingCameraId = null;
    }

    /**
     * Handle form submission
     */
    function handleSubmit(e) {
        e.preventDefault();

        var cameraData = {
            name: document.getElementById('cameraName').value,
            ip: document.getElementById('cameraIp').value,
            port: parseInt(document.getElementById('cameraPort').value) || 554,
            username: document.getElementById('cameraUsername').value,
            password: document.getElementById('cameraPassword').value,
            rtspPath: document.getElementById('rtspPath').value,
            manufacturer: document.getElementById('manufacturer').value
        };

        if (editingCameraId) {
            CameraStorage.updateCamera(editingCameraId, cameraData);
        } else {
            CameraStorage.addCamera(cameraData);
        }

        closeModal();
        loadCameras();
    }

    /**
     * Handle camera deletion
     */
    function handleDelete(cameraId) {
        if (confirm('Are you sure you want to delete this camera?')) {
            CameraStorage.deleteCamera(cameraId);
            loadCameras();
        }
    }

    /**
     * Handle connection type change
     */
    function handleConnectionTypeChange() {
        var selectedType = null;
        for (var i = 0; i < connectionTypeRadios.length; i++) {
            if (connectionTypeRadios[i].checked) {
                selectedType = connectionTypeRadios[i].value;
                break;
            }
        }

        if (selectedType === 'manual') {
            manualConfig.style.display = 'block';
            autoConfig.style.display = 'none';
        } else {
            manualConfig.style.display = 'none';
            autoConfig.style.display = 'block';
        }
    }

    /**
     * Handle manufacturer selection change
     */
    function handleManufacturerChange() {
        var manufacturer = manufacturerSelect.value;
        if (!manufacturer) return;

        var paths = CameraStorage.getRtspPaths(manufacturer);
        if (paths && paths.length > 0) {
            rtspPathInput.value = paths[0];
        }
    }

    /**
     * Test camera connection
     */
    function testConnection() {
        var ip = document.getElementById('cameraIp').value;
        var port = document.getElementById('cameraPort').value || 554;
        var username = document.getElementById('cameraUsername').value;
        var password = document.getElementById('cameraPassword').value;
        var rtspPath = document.getElementById('rtspPath').value || '/stream1';

        if (!ip) {
            alert('Please enter camera IP address');
            return;
        }

        var cameraData = {
            ip: ip,
            port: port,
            username: username,
            password: password,
            rtspPath: rtspPath
        };

        var rtspUrl = CameraStorage.buildRtspUrl(cameraData);

        alert('Testing connection to:\n' + rtspUrl + '\n\nNote: Actual connection test requires backend server.');

        // TODO: Implement actual connection test via backend API
    }

    /**
     * Scan network for cameras
     */
    function scanNetwork() {
        var scanResults = document.getElementById('scanResults');
        scanBtn.disabled = true;
        scanBtn.textContent = 'Scanning...';
        scanResults.innerHTML = '<p style="color: #2196F3;">🔍 Scanning network for IP cameras...</p>' +
            '<p style="font-size: 12px;">This may take 5-10 seconds...</p>';

        // Call camera scanner API
        fetch('http://localhost:8085/scan')
            .then(function(response) {
                return response.json();
            })
            .then(function(data) {
                scanBtn.disabled = false;
                scanBtn.textContent = 'Scan Network';

                if (data.success && data.cameras && data.cameras.length > 0) {
                    displayScanResults(data.cameras);
                } else {
                    scanResults.innerHTML = '<p style="color: #ff9800;">⚠ No cameras found on network: ' + (data.network || 'unknown') + '</p>' +
                        '<p style="font-size: 12px;">Make sure cameras are powered on and connected to the same network.</p>';
                }
            })
            .catch(function(error) {
                scanBtn.disabled = false;
                scanBtn.textContent = 'Scan Network';
                scanResults.innerHTML = '<p style="color: #f44336;">❌ Scanner service not available</p>' +
                    '<p style="font-size: 12px;">Please start the scanner: <code>node backend/camera-scanner.js</code></p>' +
                    '<p style="font-size: 12px;">Error: ' + error.message + '</p>';
            });
    }

    /**
     * Display scan results
     */
    function displayScanResults(cameras) {
        var scanResults = document.getElementById('scanResults');
        var html = '<p style="color: #4CAF50;">✅ Found ' + cameras.length + ' device(s):</p>';

        html += '<div style="max-height: 300px; overflow-y: auto;">';

        for (var i = 0; i < cameras.length; i++) {
            var camera = cameras[i];
            var btnId = 'select-cam-' + i;

            html += '<div style="background: rgba(255,255,255,0.1); padding: 10px; margin: 5px 0; border-radius: 6px; display: flex; justify-content: space-between; align-items: center;">';
            html += '<div>';
            html += '<strong>' + camera.ip + '</strong>';
            if (camera.manufacturer && camera.manufacturer !== 'Unknown') {
                html += ' <span style="color: #4CAF50;">(' + camera.manufacturer + ')</span>';
            }
            if (camera.model && camera.model !== 'Unknown') {
                html += '<br><small>' + camera.model + '</small>';
            }
            html += '<br><small style="color: rgba(255,255,255,0.7);">Port: ' + camera.port + ' | Type: ' + camera.type + '</small>';
            html += '</div>';
            html += '<button class="btn-secondary select-camera-btn" data-index="' + i + '" data-ip="' + camera.ip + '" data-port="' + camera.port + '" data-manufacturer="' + (camera.manufacturer || '') + '">Select</button>';
            html += '</div>';
        }

        html += '</div>';
        scanResults.innerHTML = html;

        // Add click handlers to select buttons
        var selectButtons = document.getElementsByClassName('select-camera-btn');
        for (var j = 0; j < selectButtons.length; j++) {
            selectButtons[j].addEventListener('click', function() {
                selectScannedCamera(this.dataset);
            });
        }
    }

    /**
     * Select a scanned camera and fill in the form
     */
    function selectScannedCamera(cameraData) {
        // Switch to manual config
        document.querySelector('input[name="connectionType"][value="manual"]').checked = true;
        handleConnectionTypeChange();

        // Fill in the form
        document.getElementById('cameraIp').value = cameraData.ip;
        document.getElementById('cameraPort').value = cameraData.port || 80;

        if (cameraData.manufacturer && cameraData.manufacturer !== 'Unknown') {
            var manufacturerLower = cameraData.manufacturer.toLowerCase();
            document.getElementById('manufacturer').value = manufacturerLower;
            handleManufacturerChange();
        }

        alert('Camera selected! Please fill in username, password, and verify the RTSP path.');
    }

    /**
     * Escape HTML to prevent XSS
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

    // Initialize on DOM ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
