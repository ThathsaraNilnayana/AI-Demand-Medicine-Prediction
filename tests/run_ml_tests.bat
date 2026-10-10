@echo off
REM ---------------------------------------------------------------
REM Runs the PharmaCast ML engine test suite locally.
REM Double-click this file, or run it from a Command Prompt.
REM Installs pytest + the ML dependencies first if they're missing.
REM The window stays open at the end so you can read the results.
REM ---------------------------------------------------------------
cd /d "%~dp0"

echo ============================================
echo  PharmaCast - ML engine test suite
echo ============================================
echo.
echo Checking dependencies (this may take a minute the first time)...
echo.

python -m pip install --quiet --disable-pip-version-check pytest
python -m pip install --quiet --disable-pip-version-check -r ml/requirements.txt

echo.
echo Running tests...
echo.

python -m pytest ml/test_predict.py -v

echo.
echo ============================================
echo  Done. Scroll up to see which tests passed.
echo ============================================
pause
