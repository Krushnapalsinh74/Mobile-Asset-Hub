@echo off
echo Stopping API Server (Port 8080)...
for /f "tokens=5" %%a in ('netstat -aon ^| find ":8080" ^| find "LISTENING"') do taskkill /f /pid %%a 2>nul

echo Stopping Mobile App Server (Ports 8081, 18115)...
for /f "tokens=5" %%a in ('netstat -aon ^| find ":8081" ^| find "LISTENING"') do taskkill /f /pid %%a 2>nul
for /f "tokens=5" %%a in ('netstat -aon ^| find ":18115" ^| find "LISTENING"') do taskkill /f /pid %%a 2>nul

echo Servers stopped successfully!

