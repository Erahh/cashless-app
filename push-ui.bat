@echo off
echo.
echo ========================================
echo   ERA-WALLET - GitHub Push Tool
echo ========================================
echo.

:: Stage all changes
echo [1/3] Staging changes...
git add .

:: Ask for commit message
set /p msg="Enter commit message (or press enter for 'Updated UI'): "
if "%msg%"=="" set msg=Updated UI

:: Commit
echo [2/3] Committing changes...
git commit -m "%msg%"

:: Push
echo [3/3] Pushing to GitHub...
git push

echo.
echo ========================================
echo   Done! Your UI is now on GitHub. 🚀
echo ========================================
pause
