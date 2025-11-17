@echo off
echo ================================================
echo    IP Camera NVR - Testing Without Docker
echo ================================================
echo.
echo NOTE: This will test the UI only (without backend)
echo For full testing, install Docker Desktop from:
echo https://www.docker.com/products/docker-desktop/
echo.
echo Starting simple HTTP server...
echo.

REM Check if Python is installed
python --version >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo Using Python HTTP server...
    echo.
    echo Open in browser: http://localhost:8000/plugins/manager.html
    echo Or for MSX: http://[YOUR_IP]:8000/start.json
    echo.
    echo Press Ctrl+C to stop the server
    echo.
    python -m http.server 8000
) else (
    echo Python not found. Checking for Node.js...
    node --version >nul 2>&1
    if %ERRORLEVEL% EQU 0 (
        echo Using Node.js HTTP server...
        echo Installing http-server...
        call npx http-server -p 8000 --cors
    ) else (
        echo.
        echo [ERROR] Neither Python nor Node.js found!
        echo.
        echo Please install one of the following:
        echo 1. Python 3: https://www.python.org/downloads/
        echo 2. Node.js: https://nodejs.org/
        echo 3. Docker Desktop: https://www.docker.com/products/docker-desktop/
        echo.
        pause
        exit /b 1
    )
)
