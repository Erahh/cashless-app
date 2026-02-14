@echo off
set /p msg="Enter commit message (or press enter for 'updated UI'): "
if "%msg%"=="" set msg=updated UI

echo Staging changes...
git add .

echo Committing...
git commit -m "%msg%"

echo Pulling latest changes from GitHub...
:: This merges remote changes and automatically keeps YOUR local changes if there is a conflict
git pull origin master -X ours --no-edit

echo Pushing to GitHub...
git push origin master

echo.
echo Done! Your UI updates are now on GitHub. 🚀
pause
