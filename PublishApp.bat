@echo off
setlocal
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\Publish.ps1"
exit /b %ERRORLEVEL%
