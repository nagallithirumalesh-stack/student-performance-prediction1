@echo off
echo ===================================================
echo STEP 2: FIREBASE INITIALIZATION
echo ===================================================
echo Setting up environment variables...
set "PATH=%PATH%;C:\Program Files\nodejs;C:\Users\nagal\AppData\Roaming\npm"

echo.
echo ---------------------------------------------------
echo INSTRUCTIONS (Read carefully!):
echo ---------------------------------------------------
echo 1. Are you ready to proceed? ......... Type 'Y' and Enter.
echo 2. Which features? ................... Use Down Arrow to find 'Hosting', Press SPACE to select, then ENTER.
echo 3. Project Setup ..................... Select 'Use an existing project' (or 'Create new').
echo 4. Public directory? ................. Type '.' (a single dot) and Enter.
echo 5. Configure as single-page app? ..... Type 'N' and Enter.
echo 6. Set up automatic builds? .......... Type 'N' and Enter.
echo 7. Overwrite index.html? ............. Type 'N' (IMPORTANT: Do NOT overwrite!)
echo ---------------------------------------------------
echo.
echo Starting initialization...
echo.
call firebase init hosting
echo.
echo Initialization finished.
pause
