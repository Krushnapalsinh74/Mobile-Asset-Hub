@echo off
echo Starting API Server on port 8080 in background...
start /B cmd /c "set NODE_ENV=development& set PORT=8080& pnpm --filter @workspace/api-server run build& pnpm --filter @workspace/api-server run start"

echo Starting Mobile App Server in background...
start /B cmd /c "set EXPO_OFFLINE=1& set PORT=18115& pnpm --filter @workspace/mobile exec expo start --localhost --port 18115"

echo Both servers started in background!
