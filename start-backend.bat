@echo off
cd /D "%~dp0backend"
echo Starting FastAPI backend...
echo NOTE: First run will download ~1.5GB of model checkpoints. Please wait.
venv\Scripts\uvicorn main:app --host 0.0.0.0 --port 8000
pause
