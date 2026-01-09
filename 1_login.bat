@echo off
echo ===================================================
echo STEP 1: FIREBASE LOGIN
echo ===================================================
echo Setting up environment variables...
set "PATH=%PATH%;C:\Program Files\nodejs;C:\Users\nagal\AppData\Roaming\npm"

echo Checking for firebase...
call firebase --version
if %ERRORLEVEL% NEQ 0 (
    echo Error: Firebase command not found even after path update.
    pause
    exit /b
)

echo.
echo Launching browser for login...
echo Please sign in with your Google account in the window that opens.
echo.
call firebase login --interactive
echo.
echo Login process finished.
pause
