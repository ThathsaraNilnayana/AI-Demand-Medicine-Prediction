@echo off
cd /d "%~dp0"
echo Starting PharmaCast server...
start "" "http://localhost:8051"
npm start
