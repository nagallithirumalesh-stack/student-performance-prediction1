@echo off
echo ===================================================
echo STEP 3: DEPLOY TO FIREBASE
echo ===================================================
echo Setting up environment variables...
set "PATH=%PATH%;C:\Program Files\nodejs;C:\Users\nagal\AppData\Roaming\npm"

echo.
echo Deploying your website...
echo.
call firebase deploy
echo.
echo If successful, you will see a 'Hosting URL' above.
pause
