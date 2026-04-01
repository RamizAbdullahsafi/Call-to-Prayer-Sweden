@echo off
REM Always runs in THIS folder (where package.json lives). Double-click this file, or run from PowerShell here.
cd /d "%~dp0"

echo.
echo [1/2] Building web (dist/)...
call npm run build
if errorlevel 1 (
  echo BUILD FAILED — fix errors above, then try again.
  pause
  exit /b 1
)

echo.
echo [2/2] Copying web assets into android/ ...
call npx cap sync android
if errorlevel 1 (
  echo SYNC FAILED — is the "android" folder present next to this file?
  pause
  exit /b 1
)

echo.
echo Done. Open Android Studio: File - Open - choose the "android" folder inside this project.
pause
