@echo off
echo ================================================
echo    IP Camera NVR for Media Station X
echo ================================================
echo.

REM Check if Docker is running
docker ps >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Docker is not running!
    echo Please start Docker Desktop and try again.
    echo.
    pause
    exit /b 1
)

echo [INFO] Starting services with Docker Compose...
docker-compose up -d

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ================================================
    echo Services started successfully!
    echo ================================================
    echo.
    echo RTSPtoWeb Backend: http://localhost:8083
    echo Web Server: http://localhost:8080
    echo.
    echo To access from Media Station X:
    echo Use URL: http://[YOUR_IP]:8080/start.json
    echo.
    echo To view logs:   docker-compose logs -f
    echo To stop:        docker-compose down
    echo.
    echo Opening web interface...
    timeout /t 3 >nul
    start http://localhost:8080
    echo.
    echo Press any key to view logs (Ctrl+C to exit logs)
    pause >nul
    docker-compose logs -f
) else (
    echo.
    echo [ERROR] Failed to start services!
    echo Please check Docker and try again.
    pause
    exit /b 1
)
