/**
 * Camera Player
 * Handles video streaming via WebRTC or HLS
 */

var CameraPlayer = (function() {
    'use strict';

    var BACKEND_URL = 'http://localhost:8083';
    var RECONNECT_INTERVAL = 5000;

    /**
     * Player instance for a single camera
     */
    function Player(container, camera) {
        this.container = container;
        this.camera = camera;
        this.videoElement = null;
        this.peerConnection = null;
        this.reconnectTimer = null;
        this.isPlaying = false;
    }

    /**
     * Initialize and start playback
     */
    Player.prototype.init = function() {
        this.createVideoElement();
        this.startPlayback();
    };

    /**
     * Create video element
     */
    Player.prototype.createVideoElement = function() {
        this.videoElement = document.createElement('video');
        this.videoElement.autoplay = true;
        this.videoElement.muted = true;
        this.videoElement.playsInline = true;
        this.videoElement.style.width = '100%';
        this.videoElement.style.height = '100%';
        this.videoElement.style.objectFit = 'contain';
        this.container.appendChild(this.videoElement);
    };

    /**
     * Start video playback
     */
    Player.prototype.startPlayback = function() {
        var self = this;

        // Show loading state
        this.showLoading();

        // Build stream URL for RTSPtoWeb
        var streamId = this.getStreamId();

        // Try WebRTC first, fallback to HLS
        this.playWebRTC(streamId).catch(function(error) {
            console.error('WebRTC failed:', error);
            self.playHLS(streamId).catch(function(hlsError) {
                console.error('HLS failed:', hlsError);
                self.showError('Failed to connect to camera');
            });
        });
    };

    /**
     * Play stream using WebRTC
     */
    Player.prototype.playWebRTC = function(streamId) {
        var self = this;

        return new Promise(function(resolve, reject) {
            // Create RTCPeerConnection
            self.peerConnection = new RTCPeerConnection({
                iceServers: [{
                    urls: 'stun:stun.l.google.com:19302'
                }]
            });

            // Handle incoming tracks
            self.peerConnection.ontrack = function(event) {
                self.videoElement.srcObject = event.streams[0];
                self.hideLoading();
                self.isPlaying = true;
                self.updateStatus(true);
                resolve();
            };

            // Handle connection state
            self.peerConnection.oniceconnectionstatechange = function() {
                if (self.peerConnection.iceConnectionState === 'disconnected' ||
                    self.peerConnection.iceConnectionState === 'failed') {
                    self.handleDisconnect();
                }
            };

            // Add transceiver for receiving video
            self.peerConnection.addTransceiver('video', { direction: 'recvonly' });
            self.peerConnection.addTransceiver('audio', { direction: 'recvonly' });

            // Create offer
            self.peerConnection.createOffer().then(function(offer) {
                return self.peerConnection.setLocalDescription(offer);
            }).then(function() {
                // Send offer to RTSPtoWeb
                return fetch(BACKEND_URL + '/stream/' + streamId + '/webrtc', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        sdp: self.peerConnection.localDescription.sdp
                    })
                });
            }).then(function(response) {
                return response.json();
            }).then(function(data) {
                // Set remote description
                return self.peerConnection.setRemoteDescription(
                    new RTCSessionDescription({ type: 'answer', sdp: data.sdp })
                );
            }).catch(reject);
        });
    };

    /**
     * Play stream using HLS
     */
    Player.prototype.playHLS = function(streamId) {
        var self = this;

        return new Promise(function(resolve, reject) {
            var hlsUrl = BACKEND_URL + '/stream/' + streamId + '/hls/index.m3u8';

            // Check if browser supports HLS natively (Safari)
            if (self.videoElement.canPlayType('application/vnd.apple.mpegurl')) {
                self.videoElement.src = hlsUrl;
                self.videoElement.addEventListener('loadeddata', function() {
                    self.hideLoading();
                    self.isPlaying = true;
                    self.updateStatus(true);
                    resolve();
                });
                self.videoElement.addEventListener('error', reject);
            } else if (typeof Hls !== 'undefined' && Hls.isSupported()) {
                // Use hls.js for other browsers
                var hls = new Hls();
                hls.loadSource(hlsUrl);
                hls.attachMedia(self.videoElement);
                hls.on(Hls.Events.MANIFEST_PARSED, function() {
                    self.videoElement.play();
                    self.hideLoading();
                    self.isPlaying = true;
                    self.updateStatus(true);
                    resolve();
                });
                hls.on(Hls.Events.ERROR, function(event, data) {
                    if (data.fatal) {
                        reject(new Error('HLS error: ' + data.type));
                    }
                });
            } else {
                reject(new Error('HLS not supported'));
            }
        });
    };

    /**
     * Get stream ID for RTSPtoWeb
     */
    Player.prototype.getStreamId = function() {
        // Use camera ID as stream ID
        return this.camera.id;
    };

    /**
     * Handle disconnection
     */
    Player.prototype.handleDisconnect = function() {
        var self = this;

        this.isPlaying = false;
        this.updateStatus(false);
        this.showError('Connection lost. Reconnecting...');

        // Attempt to reconnect
        this.reconnectTimer = setTimeout(function() {
            self.stop();
            self.startPlayback();
        }, RECONNECT_INTERVAL);
    };

    /**
     * Stop playback
     */
    Player.prototype.stop = function() {
        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = null;
        }

        if (this.peerConnection) {
            this.peerConnection.close();
            this.peerConnection = null;
        }

        if (this.videoElement && this.videoElement.srcObject) {
            var tracks = this.videoElement.srcObject.getTracks();
            for (var i = 0; i < tracks.length; i++) {
                tracks[i].stop();
            }
            this.videoElement.srcObject = null;
        }

        this.isPlaying = false;
        this.updateStatus(false);
    };

    /**
     * Show loading indicator
     */
    Player.prototype.showLoading = function() {
        var loading = document.createElement('div');
        loading.className = 'camera-loading';
        loading.innerHTML = '<div class="spinner"></div><p>Connecting...</p>';
        this.container.appendChild(loading);
    };

    /**
     * Hide loading indicator
     */
    Player.prototype.hideLoading = function() {
        var loading = this.container.querySelector('.camera-loading');
        if (loading) {
            loading.remove();
        }
    };

    /**
     * Show error message
     */
    Player.prototype.showError = function(message) {
        this.hideLoading();

        var error = this.container.querySelector('.camera-error');
        if (!error) {
            error = document.createElement('div');
            error.className = 'camera-error';
            this.container.appendChild(error);
        }

        error.innerHTML = '<div class="camera-error-icon">⚠</div><p>' + escapeHtml(message) + '</p>';
    };

    /**
     * Update camera status
     */
    Player.prototype.updateStatus = function(isLive) {
        var statusIndicator = this.container.parentElement.querySelector('.camera-status-indicator');
        if (statusIndicator) {
            if (isLive) {
                statusIndicator.classList.add('live');
            } else {
                statusIndicator.classList.remove('live');
            }
        }
    };

    /**
     * Take snapshot
     */
    Player.prototype.takeSnapshot = function() {
        if (!this.videoElement) return null;

        var canvas = document.createElement('canvas');
        canvas.width = this.videoElement.videoWidth;
        canvas.height = this.videoElement.videoHeight;

        var ctx = canvas.getContext('2d');
        ctx.drawImage(this.videoElement, 0, 0, canvas.width, canvas.height);

        return canvas.toDataURL('image/jpeg');
    };

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

    // Public API
    return {
        Player: Player
    };
})();
