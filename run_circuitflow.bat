@echo off
title CircuitFlow AI — Desktop PCB Design ^& Engineering
color 0b

echo ================================================================================
echo                   CIRCUITFLOW AI — DESKTOP PCB ENGINEERING
echo ================================================================================
echo.
echo [1/2] Checking Python environment...
python --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Python is not installed or not in PATH. Please install Python 3.10+.
    pause
    exit /b 1
)

echo [2/2] Launching CircuitFlow AI Application...
echo.
echo Server running at: http://127.0.0.1:8000
echo.
echo Press Ctrl+C in this console to stop CircuitFlow AI.
echo ================================================================================

start http://127.0.0.1:8000
python run_backend.py

