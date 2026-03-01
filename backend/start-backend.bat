@echo off
echo Starting EquiMind Backend...

if not exist "venv\Scripts\activate.bat" (
    echo Virtual environment not found. Please run setup-venv.bat first.
    pause
    exit /b 1
)

echo Activating virtual environment...
call venv\Scripts\activate.bat

echo Starting FastAPI server with uvicorn...
uvicorn main:app --host 0.0.0.0 --port 8000 --reload