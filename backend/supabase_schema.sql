-- EquiMind Zero Trust Risk Engine - Supabase Schema
-- Run this SQL in your Supabase SQL Editor to create the required tables

-- ══════════════════════════════════════════════════════════════════════════════
-- Entities Table (Users and Service Accounts)
-- ══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS entities (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    role TEXT NOT NULL,
    dept TEXT NOT NULL,
    location TEXT NOT NULL,
    device TEXT NOT NULL,
    trust_reserve INTEGER DEFAULT 15,
    risk_score NUMERIC(5,2) DEFAULT 0.0,
    status TEXT DEFAULT 'active',  -- active, monitored, isolated, blocked, honeypot
    is_honeypot BOOLEAN DEFAULT FALSE,
    honeypot_since TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_entities_dept ON entities(dept);
CREATE INDEX IF NOT EXISTS idx_entities_risk_score ON entities(risk_score DESC);
CREATE INDEX IF NOT EXISTS idx_entities_name ON entities(name);
CREATE INDEX IF NOT EXISTS idx_entities_status ON entities(status);
CREATE INDEX IF NOT EXISTS idx_entities_honeypot ON entities(is_honeypot) WHERE is_honeypot = TRUE;

-- Add comments for documentation
COMMENT ON TABLE entities IS 'Organization entities including users and service accounts';
COMMENT ON COLUMN entities.id IS 'Unique entity identifier (e.g., u01, s01)';
COMMENT ON COLUMN entities.trust_reserve IS 'Trust reserve points (0-15)';
COMMENT ON COLUMN entities.risk_score IS 'Current risk score (0-100)';
COMMENT ON COLUMN entities.status IS 'Entity status: active, monitored, isolated, blocked, honeypot';
COMMENT ON COLUMN entities.is_honeypot IS 'Whether entity is in honeypot environment';

-- ══════════════════════════════════════════════════════════════════════════════
-- Entity Actions Table (Security Actions Log)
-- ══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS entity_actions (
    id TEXT PRIMARY KEY,
    entity_id TEXT REFERENCES entities(id),
    action_type TEXT NOT NULL,  -- honeypot, monitor, isolate, reset, block, unblock
    message TEXT,
    performed_by TEXT DEFAULT 'system',
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    metadata JSONB
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_entity_actions_entity_id ON entity_actions(entity_id);
CREATE INDEX IF NOT EXISTS idx_entity_actions_timestamp ON entity_actions(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_entity_actions_type ON entity_actions(action_type);

-- Add comments
COMMENT ON TABLE entity_actions IS 'Log of security actions performed on entities';
COMMENT ON COLUMN entity_actions.action_type IS 'Type of action: honeypot, monitor, isolate, reset, block, unblock';

-- ══════════════════════════════════════════════════════════════════════════════
-- Events Table (Security Events Log)
-- ══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS events (
    id TEXT PRIMARY KEY,
    entity_id TEXT REFERENCES entities(id),
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    severity TEXT NOT NULL,
    attack_cat TEXT,
    event_type TEXT,
    user_name TEXT,
    device TEXT,
    src_ip TEXT,
    location TEXT,
    risk_score NUMERIC(5,2),
    prev_score NUMERIC(5,2),
    trust_reserve INTEGER,
    decision TEXT,
    confidence NUMERIC(5,4),
    explanation TEXT,
    kill_chain_id TEXT,
    kill_chain_step INTEGER,
    kill_chain_phase TEXT,
    model_version TEXT,
    mlp_score NUMERIC(5,4),
    risk_level TEXT,
    score_breakdown JSONB,
    is_honeypot_activity BOOLEAN DEFAULT FALSE  -- Flag for honeypot user activities
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_events_timestamp ON events(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_events_entity_id ON events(entity_id);
CREATE INDEX IF NOT EXISTS idx_events_severity ON events(severity);
CREATE INDEX IF NOT EXISTS idx_events_decision ON events(decision);
CREATE INDEX IF NOT EXISTS idx_events_kill_chain ON events(kill_chain_id);
CREATE INDEX IF NOT EXISTS idx_events_honeypot ON events(is_honeypot_activity) WHERE is_honeypot_activity = TRUE;

-- Add comments
COMMENT ON TABLE events IS 'Security events and risk assessments';
COMMENT ON COLUMN events.entity_id IS 'Reference to the entity that triggered the event';
COMMENT ON COLUMN events.decision IS 'Access decision: ALLOW, CHALLENGE, RESTRICT, BLOCK';
COMMENT ON COLUMN events.is_honeypot_activity IS 'Whether this event was from a honeypot user';

-- ══════════════════════════════════════════════════════════════════════════════
-- Helper Functions
-- ══════════════════════════════════════════════════════════════════════════════

-- Function to get high-risk entities
CREATE OR REPLACE FUNCTION get_high_risk_entities(threshold INTEGER DEFAULT 65)
RETURNS TABLE (
    id TEXT,
    name TEXT,
    role TEXT,
    dept TEXT,
    risk_score NUMERIC,
    trust_reserve INTEGER,
    status TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT e.id, e.name, e.role, e.dept, e.risk_score, e.trust_reserve, e.status
    FROM entities e
    WHERE e.risk_score >= threshold
    ORDER BY e.risk_score DESC;
END;
$$ LANGUAGE plpgsql;

-- Function to get honeypot entities
CREATE OR REPLACE FUNCTION get_honeypot_entities()
RETURNS TABLE (
    id TEXT,
    name TEXT,
    role TEXT,
    dept TEXT,
    risk_score NUMERIC,
    honeypot_since TIMESTAMPTZ,
    total_events INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        e.id, 
        e.name, 
        e.role, 
        e.dept, 
        e.risk_score, 
        e.honeypot_since,
        (SELECT COUNT(*)::INTEGER FROM events ev WHERE ev.entity_id = e.id AND ev.is_honeypot_activity = TRUE) as total_events
    FROM entities e
    WHERE e.is_honeypot = TRUE
    ORDER BY e.honeypot_since DESC;
END;
$$ LANGUAGE plpgsql;

-- Function to get blocked entities
CREATE OR REPLACE FUNCTION get_blocked_entities()
RETURNS TABLE (
    id TEXT,
    name TEXT,
    role TEXT,
    dept TEXT,
    risk_score NUMERIC,
    status TEXT,
    updated_at TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT e.id, e.name, e.role, e.dept, e.risk_score, e.status, e.updated_at
    FROM entities e
    WHERE e.status IN ('blocked', 'isolated')
    ORDER BY e.updated_at DESC;
END;
$$ LANGUAGE plpgsql;

-- Function to get entity event count
CREATE OR REPLACE FUNCTION get_entity_event_count(entity_id_param TEXT)
RETURNS INTEGER AS $$
DECLARE
    event_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO event_count
    FROM events
    WHERE entity_id = entity_id_param;
    
    RETURN event_count;
END;
$$ LANGUAGE plpgsql;

-- ══════════════════════════════════════════════════════════════════════════════
-- Triggers
-- ══════════════════════════════════════════════════════════════════════════════

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_entities_updated_at BEFORE UPDATE ON entities
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ══════════════════════════════════════════════════════════════════════════════
-- Sample Queries (for testing)
-- ══════════════════════════════════════════════════════════════════════════════

-- Get all entities with their risk scores
-- SELECT id, name, role, dept, risk_score, trust_reserve, status FROM entities ORDER BY risk_score DESC;

-- Get honeypot entities with event counts
-- SELECT * FROM get_honeypot_entities();

-- Get blocked entities
-- SELECT * FROM get_blocked_entities();

-- Get recent high-severity events
-- SELECT id, timestamp, severity, user_name, risk_score, decision FROM events WHERE severity IN ('HIGH', 'CRITICAL') ORDER BY timestamp DESC LIMIT 20;

-- Get honeypot activities
-- SELECT * FROM events WHERE is_honeypot_activity = TRUE ORDER BY timestamp DESC LIMIT 50;

-- Get entity statistics by department
-- SELECT dept, COUNT(*) as entity_count, AVG(risk_score) as avg_risk_score FROM entities GROUP BY dept ORDER BY avg_risk_score DESC;

-- Get event statistics by decision type
-- SELECT decision, COUNT(*) as count FROM events GROUP BY decision ORDER BY count DESC;
