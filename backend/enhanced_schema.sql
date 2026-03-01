-- Enhanced EquiMind Schema with Raw Data and IP Blocking
-- Add these tables and modifications to your existing Supabase schema

-- ══════════════════════════════════════════════════════════════════════════════
-- Raw Network Data Table (Store all network features for each event)
-- ══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS raw_network_data (
    id TEXT PRIMARY KEY,
    event_id TEXT REFERENCES events(id) ON DELETE CASCADE,
    -- Network Protocol Data
    proto TEXT,
    service TEXT,
    state TEXT,
    -- Byte and Packet Counts
    sbytes BIGINT,
    dbytes BIGINT,
    spkts INTEGER,
    dpkts INTEGER,
    -- TCP Window and Buffer Data
    swin INTEGER,
    dwin INTEGER,
    stcpb BIGINT,
    dtcpb BIGINT,
    -- Response and Loss Data
    response_body_len INTEGER,
    sloss INTEGER,
    dloss INTEGER,
    -- Connection Statistics
    dmean NUMERIC(10,4),
    ct_src_dport_ltm INTEGER,
    ct_dst_sport_ltm INTEGER,
    trans_depth INTEGER,
    ct_ftp_cmd INTEGER,
    ct_flw_http_mthd INTEGER,
    -- Binary Features
    is_ftp_login NUMERIC(3,1),
    is_sm_ips_ports NUMERIC(3,1),
    -- Flow Features
    dur NUMERIC(10,6),
    rate NUMERIC(15,4),
    sload NUMERIC(15,4),
    dload NUMERIC(15,4),
    sinpkt NUMERIC(10,6),
    dinpkt NUMERIC(10,6),
    sjit NUMERIC(10,6),
    djit NUMERIC(10,6),
    tcprtt NUMERIC(10,6),
    synack NUMERIC(10,6),
    ackdat NUMERIC(10,6),
    -- Additional Network Context
    src_ip INET,
    dst_ip INET,
    src_port INTEGER,
    dst_port INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for raw network data
CREATE INDEX IF NOT EXISTS idx_raw_network_event_id ON raw_network_data(event_id);
CREATE INDEX IF NOT EXISTS idx_raw_network_src_ip ON raw_network_data(src_ip);
CREATE INDEX IF NOT EXISTS idx_raw_network_proto ON raw_network_data(proto);
CREATE INDEX IF NOT EXISTS idx_raw_network_service ON raw_network_data(service);

-- ══════════════════════════════════════════════════════════════════════════════
-- IP Blocking Table (Actual IP blocks and restrictions)
-- ══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS ip_blocks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ip_address INET NOT NULL,
    entity_id TEXT REFERENCES entities(id),
    block_type TEXT NOT NULL, -- 'FULL_BLOCK', 'RATE_LIMIT', 'HONEYPOT_REDIRECT', 'CHALLENGE_REQUIRED'
    reason TEXT NOT NULL,
    blocked_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT TRUE,
    blocked_by TEXT DEFAULT 'system',
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for IP blocks
CREATE INDEX IF NOT EXISTS idx_ip_blocks_ip ON ip_blocks(ip_address);
CREATE INDEX IF NOT EXISTS idx_ip_blocks_entity ON ip_blocks(entity_id);
CREATE INDEX IF NOT EXISTS idx_ip_blocks_active ON ip_blocks(is_active) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_ip_blocks_type ON ip_blocks(block_type);

-- ══════════════════════════════════════════════════════════════════════════════
-- Network Restrictions Table (Service-level restrictions)
-- ══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS network_restrictions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_id TEXT REFERENCES entities(id),
    restriction_type TEXT NOT NULL, -- 'SERVICE_DENY', 'PORT_BLOCK', 'BANDWIDTH_LIMIT', 'TIME_RESTRICTION'
    target TEXT NOT NULL, -- service name, port number, or resource
    restriction_details JSONB NOT NULL,
    applied_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT TRUE,
    applied_by TEXT DEFAULT 'system',
    reason TEXT
);

-- Create indexes for network restrictions
CREATE INDEX IF NOT EXISTS idx_restrictions_entity ON network_restrictions(entity_id);
CREATE INDEX IF NOT EXISTS idx_restrictions_active ON network_restrictions(is_active) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_restrictions_type ON network_restrictions(restriction_type);

-- ══════════════════════════════════════════════════════════════════════════════
-- Autonomous Actions Log (Track all autonomous decisions)
-- ══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS autonomous_actions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_id TEXT REFERENCES entities(id),
    event_id TEXT REFERENCES events(id),
    action_type TEXT NOT NULL, -- 'IP_BLOCK', 'SERVICE_RESTRICT', 'HONEYPOT_MOVE', 'ISOLATION', 'CHALLENGE'
    action_details JSONB NOT NULL,
    risk_score_trigger NUMERIC(5,2),
    confidence_level NUMERIC(5,4),
    executed_at TIMESTAMPTZ DEFAULT NOW(),
    execution_status TEXT DEFAULT 'SUCCESS', -- 'SUCCESS', 'FAILED', 'PARTIAL'
    execution_details JSONB,
    reversed_at TIMESTAMPTZ,
    reversed_by TEXT
);

-- Create indexes for autonomous actions
CREATE INDEX IF NOT EXISTS idx_autonomous_actions_entity ON autonomous_actions(entity_id);
CREATE INDEX IF NOT EXISTS idx_autonomous_actions_event ON autonomous_actions(event_id);
CREATE INDEX IF NOT EXISTS idx_autonomous_actions_type ON autonomous_actions(action_type);
CREATE INDEX IF NOT EXISTS idx_autonomous_actions_executed ON autonomous_actions(executed_at DESC);

-- ══════════════════════════════════════════════════════════════════════════════
-- Enhanced Events Table (Add raw data reference)
-- ══════════════════════════════════════════════════════════════════════════════

-- Add columns to existing events table
ALTER TABLE events ADD COLUMN IF NOT EXISTS raw_data_id TEXT REFERENCES raw_network_data(id);
ALTER TABLE events ADD COLUMN IF NOT EXISTS autonomous_action_taken BOOLEAN DEFAULT FALSE;
ALTER TABLE events ADD COLUMN IF NOT EXISTS action_details JSONB;

-- Create index for raw data reference
CREATE INDEX IF NOT EXISTS idx_events_raw_data ON events(raw_data_id);

-- ══════════════════════════════════════════════════════════════════════════════
-- Enhanced Functions for Autonomous Operations
-- ══════════════════════════════════════════════════════════════════════════════

-- Function to check if IP is blocked
CREATE OR REPLACE FUNCTION is_ip_blocked(check_ip INET)
RETURNS BOOLEAN AS $$
DECLARE
    block_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO block_count
    FROM ip_blocks
    WHERE ip_address = check_ip 
    AND is_active = TRUE 
    AND (expires_at IS NULL OR expires_at > NOW());
    
    RETURN block_count > 0;
END;
$$ LANGUAGE plpgsql;

-- Function to get active restrictions for entity
CREATE OR REPLACE FUNCTION get_entity_restrictions(entity_id_param TEXT)
RETURNS TABLE (
    restriction_type TEXT,
    target TEXT,
    restriction_details JSONB,
    applied_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT nr.restriction_type, nr.target, nr.restriction_details, nr.applied_at, nr.expires_at
    FROM network_restrictions nr
    WHERE nr.entity_id = entity_id_param 
    AND nr.is_active = TRUE 
    AND (nr.expires_at IS NULL OR nr.expires_at > NOW())
    ORDER BY nr.applied_at DESC;
END;
$$ LANGUAGE plpgsql;

-- Function to get entity with all security context
CREATE OR REPLACE FUNCTION get_entity_security_context(entity_id_param TEXT)
RETURNS TABLE (
    entity_data JSONB,
    active_blocks JSONB,
    active_restrictions JSONB,
    recent_actions JSONB
) AS $$
DECLARE
    entity_json JSONB;
    blocks_json JSONB;
    restrictions_json JSONB;
    actions_json JSONB;
BEGIN
    -- Get entity data
    SELECT to_jsonb(e.*) INTO entity_json
    FROM entities e
    WHERE e.id = entity_id_param;
    
    -- Get active IP blocks
    SELECT COALESCE(jsonb_agg(to_jsonb(ib.*)), '[]'::jsonb) INTO blocks_json
    FROM ip_blocks ib
    WHERE ib.entity_id = entity_id_param 
    AND ib.is_active = TRUE;
    
    -- Get active restrictions
    SELECT COALESCE(jsonb_agg(to_jsonb(nr.*)), '[]'::jsonb) INTO restrictions_json
    FROM network_restrictions nr
    WHERE nr.entity_id = entity_id_param 
    AND nr.is_active = TRUE;
    
    -- Get recent autonomous actions
    SELECT COALESCE(jsonb_agg(to_jsonb(aa.*)), '[]'::jsonb) INTO actions_json
    FROM autonomous_actions aa
    WHERE aa.entity_id = entity_id_param
    ORDER BY aa.executed_at DESC
    LIMIT 10;
    
    RETURN QUERY SELECT entity_json, blocks_json, restrictions_json, actions_json;
END;
$$ LANGUAGE plpgsql;

-- ══════════════════════════════════════════════════════════════════════════════
-- Views for Easy Data Access
-- ══════════════════════════════════════════════════════════════════════════════

-- View: Events with raw network data
CREATE OR REPLACE VIEW events_with_raw_data AS
SELECT 
    e.*,
    rnd.proto,
    rnd.service,
    rnd.state,
    rnd.sbytes,
    rnd.dbytes,
    rnd.spkts,
    rnd.dpkts,
    rnd.dur,
    rnd.rate,
    rnd.sload,
    rnd.dload,
    rnd.src_ip,
    rnd.dst_ip,
    rnd.src_port,
    rnd.dst_port
FROM events e
LEFT JOIN raw_network_data rnd ON e.raw_data_id = rnd.id;

-- View: Entities with security status
CREATE OR REPLACE VIEW entities_security_status AS
SELECT 
    e.*,
    (SELECT COUNT(*) FROM ip_blocks ib WHERE ib.entity_id = e.id AND ib.is_active = TRUE) as active_ip_blocks,
    (SELECT COUNT(*) FROM network_restrictions nr WHERE nr.entity_id = e.id AND nr.is_active = TRUE) as active_restrictions,
    (SELECT COUNT(*) FROM autonomous_actions aa WHERE aa.entity_id = e.id AND aa.executed_at > NOW() - INTERVAL '24 hours') as actions_24h
FROM entities e;

-- ══════════════════════════════════════════════════════════════════════════════
-- Comments and Documentation
-- ══════════════════════════════════════════════════════════════════════════════

COMMENT ON TABLE raw_network_data IS 'Complete network flow data for each security event';
COMMENT ON TABLE ip_blocks IS 'Active IP blocks and restrictions applied by the system';
COMMENT ON TABLE network_restrictions IS 'Service-level and resource restrictions for entities';
COMMENT ON TABLE autonomous_actions IS 'Log of all autonomous security actions taken by the system';

COMMENT ON COLUMN ip_blocks.block_type IS 'Type: FULL_BLOCK, RATE_LIMIT, HONEYPOT_REDIRECT, CHALLENGE_REQUIRED';
COMMENT ON COLUMN network_restrictions.restriction_type IS 'Type: SERVICE_DENY, PORT_BLOCK, BANDWIDTH_LIMIT, TIME_RESTRICTION';
COMMENT ON COLUMN autonomous_actions.action_type IS 'Type: IP_BLOCK, SERVICE_RESTRICT, HONEYPOT_MOVE, ISOLATION, CHALLENGE';