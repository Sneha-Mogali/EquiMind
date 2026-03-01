# EquiMind Changelog

## v2.0.0 - System Consolidation & Optimization (Current)

### Major Changes

**✅ Merged Risk Engine into Backend**
- Integrated TensorFlow ML models from `risk_engine/` into `backend/`
- Consolidated monitoring, inference, and risk computation
- Removed duplicate code and redundant files
- Single unified backend API

**✅ Cleaned Repository Structure**
- Removed 20+ redundant files
- Deleted duplicate startup scripts
- Cleaned up nested git repositories
- Removed unused schemas and test files
- Optimized .gitignore

**✅ Improved Documentation**
- Consolidated README with clear quick start
- Created comprehensive ARCHITECTURE.md
- Updated START_HERE.md with streamlined instructions
- Added detailed backend/README.md
- Simplified monitoring setup docs

**✅ Code Optimization**
- Removed redundant imports in main.py
- Cleaned up monitoring integration
- Optimized WebSocket connection management
- Improved error handling
- Better startup logging

### Files Removed

**Redundant Risk Engine Files:**
- `risk_engine/app/main.py` (merged into backend)
- `risk_engine/app/inference.py` (merged into backend/models.py)
- `risk_engine/app/monitoring.py` (merged into backend/monitoring.py)
- `risk_engine/app/risk_engine.py` (merged into backend/models.py)
- `risk_engine/app/data_simulator.py` (functionality in backend/simulator.py)
- `risk_engine/app/model_validator.py` (not needed for core functionality)
- `risk_engine/app/utils.py` (empty file)

**Redundant Startup Scripts:**
- `risk_engine/setup.bat`
- `risk_engine/setup.ps1`
- `risk_engine/start.py`
- `risk_engine/run.bat`
- `risk_engine/start-all.bat`
- `risk_engine/start-all.ps1`
- `risk_engine/start_simple.bat`
- `risk_engine/start_working.bat`
- `risk_engine/start-monitoring.bat`
- `risk_engine/simple_main.py`
- `risk_engine/working_main.py`

**Redundant Documentation:**
- `DUPLICATE_EVENTS_FIX.md`
- `ENHANCED_FEATURES_SUMMARY.md`
- `QUICK_START.md` (merged into START_HERE.md)

**Misplaced/Unused Files:**
- `UserPortal.jsx` (misplaced in root)
- `test_events.py` (test file in root)
- `test_realistic_threats.py` (test file in root)
- `backend/schemas.py` (unused)
- `backend/.git/` (nested git repo)

**Runtime Files:**
- `risk_engine/equimind_risk_engine.log`
- `risk_engine/equimind_threats.db`
- `risk_engine/test-connection.py`
- `risk_engine/requirements.txt` (merged into backend)

### Current Structure

```
EquiMind/
├── backend/              # Unified backend with ML
│   ├── main.py
│   ├── models.py
│   ├── monitoring.py
│   ├── simulator.py
│   ├── scorer.py
│   ├── entities.py
│   ├── requirements.txt
│   └── models/          # TensorFlow models
├── frontend/            # React dashboard
├── risk_engine/         # Monitoring configs only
│   ├── prometheus.yml
│   ├── grafana-dashboard.json
│   └── docker-compose.monitoring.yml
├── shared/              # Shared contracts
├── README.md            # Main documentation
├── START_HERE.md        # Quick start guide
├── ARCHITECTURE.md      # System design
├── launch-equimind.bat  # Windows launcher
├── launch-equimind.ps1  # PowerShell launcher
└── stop-equimind.bat    # Stop script
```

### Technical Improvements

**Backend:**
- TensorFlow models integrated with RobustScalingLayer
- Prometheus metrics fully instrumented
- WebSocket connection tracking improved
- Better error handling and logging
- Cleaner imports and dependencies

**Models:**
- MLP model for risk prediction
- Autoencoder for anomaly detection
- Proper model loading with fallback
- Feature preprocessing optimized

**Monitoring:**
- Comprehensive Prometheus metrics
- Per-entity risk tracking
- ML inference latency monitoring
- Event categorization metrics

### Breaking Changes

- Risk engine must now be accessed via backend API (port 8000)
- Old risk_engine startup scripts no longer work
- Use `python backend/main.py` or `launch-equimind.bat`

### Migration Guide

**Old Way:**
```bash
cd risk_engine
python start.py
```

**New Way:**
```bash
cd backend
python main.py
```

Or use the launcher:
```bash
launch-equimind.bat  # Windows
./launch-equimind.ps1  # PowerShell
```

### Dependencies

**Backend (requirements.txt):**
- fastapi
- uvicorn[standard]
- tensorflow
- prometheus-client
- prometheus-fastapi-instrumentator
- numpy, pandas, scikit-learn
- pydantic, websockets
- python-dotenv

**Frontend (package.json):**
- react, react-dom
- vite
- tailwindcss
- recharts

### Performance

- ML inference: <100ms average
- WebSocket latency: <10ms
- Event generation: 3s interval (configurable)
- Memory footprint: ~500MB (with TensorFlow)

### Next Steps

See ARCHITECTURE.md for:
- Detailed system design
- Scalability recommendations
- Production deployment guide
- Future enhancement roadmap

---

## v1.0.0 - Initial Release

- Basic zero-trust architecture
- Separate backend and risk_engine
- ML models for threat detection
- React dashboard
- WebSocket streaming
- Prometheus monitoring
