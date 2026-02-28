# Make sure you're in /backend with venv active
uvicorn main:app --reload --port 8000
```

You should see:
```
INFO:     SENTINEL backend started
INFO:     WebSocket ready on ws://127.0.0.1:8000/ws/live
INFO:     Uvicorn running on http://127.0.0.1:8000

# Open browser and hit these:

http://localhost:8000/status      ← should return JSON with tension score
http://localhost:8000/entities    ← should return 13 entities
http://localhost:8000/events      ← starts empty, fills up after a few seconds
http://localhost:8000/docs        ← full auto-generated API docs