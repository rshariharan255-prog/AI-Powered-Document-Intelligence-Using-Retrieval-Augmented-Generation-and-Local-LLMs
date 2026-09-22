@echo off
title Local RAG Document Assistant - Starter
echo ================================================================
echo           LOCAL RAG DOCUMENT ASSISTANT - STARTUP
echo ================================================================
echo.

:: 1. Start Ollama if not already running
echo [1/3] Checking Ollama service...
start /b "" ollama serve >nul 2>&1
timeout /t 2 /nobreak >nul

:: 2. Start FastAPI Backend
echo [2/3] Starting FastAPI Backend on http://127.0.0.1:8000 ...
start "RAG Backend (FastAPI)" cmd /k "cd /d %~dp0backend && .\venv\Scripts\python.exe -m uvicorn main:app --reload --port 8000"

:: 3. Start React Frontend
echo [3/3] Starting React Frontend on http://localhost:5173 ...
start "RAG Frontend (Vite)" cmd /k "cd /d %~dp0frontend && npm.cmd run dev"

:: 4. Wait and open browser
timeout /t 3 /nobreak >nul
start http://localhost:5173

echo.
echo ================================================================
echo All services launched! You can now use the application.
echo ================================================================
pause
