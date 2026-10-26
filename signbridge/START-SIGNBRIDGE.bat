@echo off
setlocal
cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 (
  echo Node.js 20 ou une version plus recente est necessaire.
  echo Telechargement : https://nodejs.org/
  pause
  exit /b 1
)

node tools\serve-dist.mjs

