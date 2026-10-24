@echo off
rem Local preview: builds the site and opens http://localhost:5321/
rem Stop with Ctrl+C in this window.
setlocal
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo.
  echo  Node.js is needed for the preview.
  echo  Install the LTS version from https://nodejs.org  or run in PowerShell:
  echo    winget install OpenJS.NodeJS.LTS
  echo  then double-click this file again.
  echo.
  pause
  exit /b 1
)
if not exist node_modules (
  echo  First run: installing build tools, about a minute...
  call npm install --no-audit --no-fund
)
call node engine\build.mjs
if errorlevel 1 (
  pause
  exit /b 1
)
start "" http://localhost:5321/
node engine\serve.mjs 5321
