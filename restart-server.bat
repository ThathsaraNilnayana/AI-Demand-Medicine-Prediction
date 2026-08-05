@echo off
title PharmaCast Server
cd /d "%~dp0"

echo Stopping any running PharmaCast/Node server...
taskkill /IM node.exe /F >nul 2>&1
timeout /t 2 /nobreak >nul

echo Starting PharmaCast server on port 8051...
node server.js > server-log.txt 2>&1

pause >nul
