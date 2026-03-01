# EquiMind Risk Scoring System Documentation

## How Risk Scores Are Calculated

### 1. Data Flow Overview
```
Real Network Data → ML Model → Risk Score → Entity Update → UI Display
```

### 2. Risk Score Sources

#### A. Machine Learning Model (`backend/models.py`)
- **Primary Source**: MLP (Multi-Layer Perceptron) neural network
- **Input**: Real network traffic features (37 features from UNSW-NB15 dataset)
- **Output**: Risk score (0-100) and attack classification
- **Location**: `predict()` function in `models.py`

```python
# Risk score calculation in models.py
risk_score = int(final_score * 100)  # ML model output scaled to 0-100
```

#### B. Contextual Risk Enhancement (`backend/scorer.py`)
The ML risk score is enhanced with contextual factors:

```python
def compute_risk_score(
    attack_cat: str,           # Attack category from ML model
    confidence: float,         # ML model confidence
    is_offhours: bool,        # Time-based risk factor
    device_ok: bool,          # Device posture check
    mfa_used: bool,           # Multi-factor authentication
    location_known: bool,     # Geographic location validation
    behavioral_anomaly: float, # Behavioral deviation score
    ml_risk_score: int = 50,  # Base ML risk score
    ml_risk_level: str = "MEDIUM"
) -> Dict[str, Any]:
```

**Risk Components:**
1. **Network Score (33% max)**: ML model risk × 0.33 for attacks, behavioral_anomaly × 20 for normal
2. **Identity Score (33% max)**: 
   - No MFA: +15 points
   - Off-hours access: +10 points  
   - Unknown location: +8 points
3. **Device Score (33% max)**:
   - Device posture failure: +20 points

**Final Formula:**
```
Total Risk = Network Score + Identity Score + Device Score (capped at 100)
```

### 3. Location Data Sources

#### A. Simulated Locations (`backend/simulator.py`)
```python
LOCATIONS = [
    "Mumbai, IN", "Pune, IN", "Delhi, IN", "Bangalore, IN",
    "Frankfurt, DE", "New York, US", "London, UK", "Tokyo, JP",
    "Singapore, SG", "Sydney, AU"
]
```

#### B. IP Address Mapping
- **Source IPs**: Randomly assigned from predefined pool
- **Location Determination**: Based on entity's registered location vs access location
- **Risk Factor**: `location_known = location in [entity["location"], "Internal"]`

#### C. Entity Base Locations (`backend/entities.py`)
Each entity has a registered location:
```python
{"id": "u01", "name": "j.hernandez", "location": "Mumbai, IN", ...}
{"id": "u02", "name": "r.chen", "location": "Pune, IN", ...}
```

### 4. Entity Risk Score Updates

#### A. Real-time Updates (`backend/simulator.py`)
```python
# Update entity risk score in real-time
prev_score = entity["risk_score"]
update_entity_score(entity["id"], score_result["risk_score"])
```

#### B. Database Persistence (`backend/entities.py`)
- **Supabase Mode**: Risk scores stored in `entities` table
- **Fallback Mode**: In-memory cache with hardcoded entities
- **Update Function**: `update_entity_score()` handles both modes

### 5. Risk Score Display in UI

#### A. Entity Inspector (`frontend/src/pages/EntityInspector.jsx`)
- **Source**: `entity.risk_score` from Supabase or fallback
- **Calculation**: `Math.round(entity.risk_score || 0)`
- **Radar Chart**: Derived from risk score with entity-specific variations

#### B. Radar Chart Values
```javascript
// Enhanced radar data with realistic variations
const baseRisk = entity.risk_score || 0
const entityHash = entity.name.split('').reduce((a, b) => a + b.charCodeAt(0), 0) % 100

const radarData = [
  { 
    axis: 'Location', 
    normal: 80, 
    current: Math.max(10, Math.min(100, 80 - (baseRisk * 0.8) + (entityHash % 20) - 10))
  },
  // ... other factors
]
```

### 6. Why Different Entities Have Different Scores

#### A. Base Risk Factors
- **Role-based**: Different job functions have different baseline risks
- **Department**: IT/Security roles may have higher baseline access
- **Location**: Geographic risk factors
- **Device**: Personal vs corporate devices

#### B. Behavioral Patterns
- **Time Patterns**: Access outside normal hours
- **Location Variance**: Accessing from unusual geographic locations
- **Volume Patterns**: Data transfer amounts
- **Device Changes**: Using different devices

#### C. Recent Activity Impact
- **Event History**: Recent security events affect current score
- **Attack Patterns**: Detected attack attempts increase risk
- **Policy Violations**: Breaking security policies

### 7. Location Risk Assessment

#### A. Known vs Unknown Locations
```python
location_known = location in [entity["location"], "Internal"]
if not location_known: 
    identity_score += 8  # Add 8 points for unknown location
```

#### B. Geographic Risk Factors
- **Registered Location**: Entity's home base (Mumbai, Pune, etc.)
- **Access Location**: Where they're currently accessing from
- **Internal**: Corporate network access (always trusted)
- **Unknown**: Any location not in entity's profile

#### C. IP-to-Location Mapping
- **Simulated**: Random assignment for demo purposes
- **Real Implementation**: Would use GeoIP databases
- **Risk Calculation**: Distance from registered location affects score

### 8. Risk Thresholds

```python
# Risk level thresholds (models.py)
if risk_score < 30:    level = "LOW"
elif risk_score < 50:  level = "MEDIUM"  
elif risk_score < 65:  level = "HIGH"
else:                  level = "CRITICAL"
```

### 9. Data Sources Summary

| Component | Source | Purpose |
|-----------|--------|---------|
| **Base Risk** | ML Model (UNSW-NB15 dataset) | Network traffic analysis |
| **Entity Data** | Supabase `entities` table | User profiles, locations |
| **Location** | Simulated from predefined list | Geographic risk assessment |
| **IP Addresses** | Random from IP pool | Network source identification |
| **Behavioral** | Real-time event analysis | Pattern deviation detection |
| **Contextual** | Time, device, MFA factors | Environmental risk factors |

### 10. Real vs Simulated Data

#### Real Data:
- **Network Traffic**: Actual UNSW-NB15 dataset samples
- **ML Predictions**: Real neural network inference
- **Entity Updates**: Persistent database storage
- **Risk Calculations**: Mathematical algorithms

#### Simulated Data:
- **Locations**: Predefined city list for demo
- **IP Addresses**: Random assignment from pool
- **Time Factors**: Based on actual system time
- **Device Status**: Random simulation for demo

This system provides realistic risk assessment while using a combination of real ML analysis and simulated environmental factors for demonstration purposes.