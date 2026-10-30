@echo off
set "PATH=%APPDATA%\npm;%PATH%"
echo ===================================================
echo Starting Knowledge Park Mobile App (Expo)...
echo ===================================================
echo.
echo Launching Expo Metro Bundler in a separate window...
start "Expo Dev Server" cmd /k "set ^"PATH=%APPDATA%\npm;%PATH%^" && pnpm --filter @workspace/mobile start"

echo.
echo Expo Dev Server is starting!
echo Access Web: http://localhost:8081
echo Or scan the QR code in the Expo window using Expo Go.

