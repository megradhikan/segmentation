$backendDir = "$PSScriptRoot\backend"
$frontendDir = "$PSScriptRoot\frontend"
$uvicorn = "$backendDir\venv\Scripts\python.exe"

Write-Host "Starting FastAPI backend..."
Start-Process -FilePath $uvicorn `
    -ArgumentList "-m", "uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000" `
    -WorkingDirectory $backendDir `
    -WindowStyle Normal

Write-Host "Starting Vite frontend..."
Start-Process -FilePath "cmd.exe" `
    -ArgumentList "/k npm run dev" `
    -WorkingDirectory $frontendDir `
    -WindowStyle Normal

Write-Host ""
Write-Host "Backend:  http://localhost:8000  (first run downloads ~1.5GB models - takes a few minutes)"
Write-Host "Frontend: http://localhost:5173"
