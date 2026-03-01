import { useState } from 'react'
import { Panel } from '../components/ui/Panel'
import { Upload, FileJson, FileSpreadsheet, Database, Trash2, Play } from 'lucide-react'

export function DataProcessor() {
  const [uploadedData, setUploadedData] = useState([])
  const [results, setResults] = useState([])
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState(null)

  const handleFileUpload = async (event) => {
    const file = event.target.files[0]
    if (!file) return

    setError(null)
    const fileType = file.name.split('.').pop().toLowerCase()

    try {
      let data = []
      
      if (fileType === 'json') {
        const text = await file.text()
        const parsed = JSON.parse(text)
        data = Array.isArray(parsed) ? parsed : [parsed]
      } 
      else if (fileType === 'csv') {
        const text = await file.text()
        data = parseCSV(text)
      }
      else if (fileType === 'xlsx' || fileType === 'xls') {
        // For Excel files, we'll use a library
        const arrayBuffer = await file.arrayBuffer()
        data = await parseExcel(arrayBuffer)
      }
      else if (fileType === 'parquet') {
        setError('Parquet files require server-side processing. Please use CSV, JSON, or Excel format.')
        return
      }
      else {
        setError('Unsupported file type. Please use JSON, CSV, or Excel files.')
        return
      }

      setUploadedData(data)
      setResults([])
    } catch (err) {
      setError(`Failed to parse file: ${err.message}`)
    }
  }

  const parseCSV = (text) => {
    const lines = text.trim().split('\n')
    if (lines.length < 2) return []
    
    const headers = lines[0].split(',').map(h => h.trim())
    const data = []
    
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',')
      const obj = {}
      headers.forEach((header, index) => {
        const value = values[index]?.trim()
        // Try to parse as number
        obj[header] = isNaN(value) ? value : parseFloat(value)
      })
      data.push(obj)
    }
    
    return data
  }

  const parseExcel = async (arrayBuffer) => {
    // Using xlsx library (needs to be installed)
    try {
      const XLSX = await import('xlsx')
      const workbook = XLSX.read(arrayBuffer, { type: 'array' })
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]]
      return XLSX.utils.sheet_to_json(firstSheet)
    } catch (err) {
      throw new Error('Excel parsing requires xlsx library. Please install it or use CSV/JSON format.')
    }
  }

  const processData = async () => {
    if (uploadedData.length === 0) {
      setError('No data to process')
      return
    }

    setProcessing(true)
    setError(null)
    const newResults = []

    try {
      for (const item of uploadedData) {
        const response = await fetch('http://localhost:8000/predict', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(item)
        })

        if (!response.ok) {
          throw new Error(`API error: ${response.statusText}`)
        }

        const result = await response.json()
        newResults.push({
          input: item,
          score: result.risk_score / 100, // Convert to 0-1 range
          label: result.is_attack ? 'Attack' : 'Normal',
          attackCat: result.attack_cat,
          confidence: result.confidence,
          riskLevel: result.risk_level,
          timestamp: new Date().toISOString()
        })
      }

      setResults(newResults)
    } catch (err) {
      setError(`Processing failed: ${err.message}`)
    } finally {
      setProcessing(false)
    }
  }

  const clearData = () => {
    setUploadedData([])
    setResults([])
    setError(null)
  }

  const getFileIcon = (filename) => {
    if (!filename) return <FileJson size={16} />
    const ext = filename.split('.').pop().toLowerCase()
    if (ext === 'json') return <FileJson size={16} />
    if (ext === 'csv' || ext === 'xlsx' || ext === 'xls') return <FileSpreadsheet size={16} />
    if (ext === 'parquet') return <Database size={16} />
    return <FileJson size={16} />
  }

  const getRiskColor = (score) => {
    if (score >= 0.7) return 'var(--red)'
    if (score >= 0.4) return 'var(--amber)'
    return 'var(--green)'
  }

  return (
    <div style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '12px', height: '100%', overflowY: 'auto' }}>
      
      {/* Header */}
      <Panel title="MANUAL DATA PROCESSOR">
        <div style={{ fontFamily: 'var(--font-body)', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
          Upload network traffic data in JSON, CSV, or Excel format for risk analysis
        </div>

        {/* Upload Section */}
        <div style={{ 
          display: 'flex', 
          gap: '12px', 
          alignItems: 'center',
          padding: '16px',
          background: 'var(--bg-elevated)',
          borderRadius: '6px',
          border: '1px solid var(--border-base)',
        }}>
          <label style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '12px 16px',
            background: 'var(--bg-panel)',
            border: '1px dashed var(--cyan-dim)',
            borderRadius: '6px',
            cursor: 'pointer',
            transition: 'all 0.2s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = 'var(--cyan)'
            e.currentTarget.style.background = 'var(--cyan-glow)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = 'var(--cyan-dim)'
            e.currentTarget.style.background = 'var(--bg-panel)'
          }}>
            <Upload size={20} color="var(--cyan)" />
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--text-primary)' }}>
                Choose File
              </div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'var(--text-dim)' }}>
                Supports: JSON, CSV, Excel (.xlsx, .xls)
              </div>
            </div>
            <input
              type="file"
              accept=".json,.csv,.xlsx,.xls,.parquet"
              onChange={handleFileUpload}
              style={{ display: 'none' }}
            />
          </label>

          <button
            onClick={processData}
            disabled={uploadedData.length === 0 || processing}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '12px 20px',
              background: uploadedData.length > 0 && !processing ? 'var(--green)' : 'var(--bg-panel)',
              border: '1px solid var(--border-base)',
              borderRadius: '6px',
              color: uploadedData.length > 0 && !processing ? '#000' : 'var(--text-dim)',
              fontFamily: 'var(--font-mono)',
              fontSize: '11px',
              fontWeight: 600,
              letterSpacing: '1px',
              cursor: uploadedData.length > 0 && !processing ? 'pointer' : 'not-allowed',
              transition: 'all 0.2s',
              opacity: uploadedData.length > 0 && !processing ? 1 : 0.5,
            }}>
            <Play size={16} />
            {processing ? 'PROCESSING...' : 'PROCESS DATA'}
          </button>

          <button
            onClick={clearData}
            disabled={uploadedData.length === 0 && results.length === 0}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '12px 16px',
              background: 'transparent',
              border: '1px solid var(--border-base)',
              borderRadius: '6px',
              color: 'var(--red)',
              fontFamily: 'var(--font-mono)',
              fontSize: '11px',
              cursor: uploadedData.length > 0 || results.length > 0 ? 'pointer' : 'not-allowed',
              transition: 'all 0.2s',
              opacity: uploadedData.length > 0 || results.length > 0 ? 1 : 0.5,
            }}>
            <Trash2 size={16} />
            CLEAR
          </button>
        </div>

        {/* Error Display */}
        {error && (
          <div style={{
            marginTop: '12px',
            padding: '12px',
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid var(--red)',
            borderRadius: '6px',
            fontFamily: 'var(--font-mono)',
            fontSize: '11px',
            color: 'var(--red)',
          }}>
            ERROR: {error}
          </div>
        )}

        {/* Stats */}
        {uploadedData.length > 0 && (
          <div style={{
            marginTop: '12px',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
            gap: '12px',
          }}>
            <div style={{
              padding: '12px',
              background: 'var(--bg-elevated)',
              borderRadius: '6px',
              textAlign: 'center',
            }}>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: '24px', color: 'var(--cyan)', fontWeight: 700 }}>
                {uploadedData.length}
              </div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'var(--text-dim)', letterSpacing: '1px' }}>
                RECORDS LOADED
              </div>
            </div>
            <div style={{
              padding: '12px',
              background: 'var(--bg-elevated)',
              borderRadius: '6px',
              textAlign: 'center',
            }}>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: '24px', color: 'var(--green)', fontWeight: 700 }}>
                {results.length}
              </div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'var(--text-dim)', letterSpacing: '1px' }}>
                PROCESSED
              </div>
            </div>
          </div>
        )}
      </Panel>

      {/* Results Table */}
      {results.length > 0 && (
        <Panel title="ANALYSIS RESULTS">
          <div style={{ overflowX: 'auto' }}>
            <table style={{
              width: '100%',
              borderCollapse: 'collapse',
              fontFamily: 'var(--font-mono)',
              fontSize: '11px',
            }}>
              <thead>
                <tr style={{ 
                  background: 'var(--bg-elevated)',
                  borderBottom: '2px solid var(--border-base)',
                }}>
                  <th style={{ padding: '12px', textAlign: 'left', color: 'var(--text-dim)', fontWeight: 600, letterSpacing: '1px' }}>
                    #
                  </th>
                  <th style={{ padding: '12px', textAlign: 'left', color: 'var(--text-dim)', fontWeight: 600, letterSpacing: '1px' }}>
                    PROTOCOL
                  </th>
                  <th style={{ padding: '12px', textAlign: 'left', color: 'var(--text-dim)', fontWeight: 600, letterSpacing: '1px' }}>
                    SERVICE
                  </th>
                  <th style={{ padding: '12px', textAlign: 'left', color: 'var(--text-dim)', fontWeight: 600, letterSpacing: '1px' }}>
                    STATE
                  </th>
                  <th style={{ padding: '12px', textAlign: 'right', color: 'var(--text-dim)', fontWeight: 600, letterSpacing: '1px' }}>
                    SBYTES
                  </th>
                  <th style={{ padding: '12px', textAlign: 'right', color: 'var(--text-dim)', fontWeight: 600, letterSpacing: '1px' }}>
                    DBYTES
                  </th>
                  <th style={{ padding: '12px', textAlign: 'right', color: 'var(--text-dim)', fontWeight: 600, letterSpacing: '1px' }}>
                    DURATION
                  </th>
                  <th style={{ padding: '12px', textAlign: 'right', color: 'var(--text-dim)', fontWeight: 600, letterSpacing: '1px' }}>
                    RISK SCORE
                  </th>
                  <th style={{ padding: '12px', textAlign: 'center', color: 'var(--text-dim)', fontWeight: 600, letterSpacing: '1px' }}>
                    RISK LEVEL
                  </th>
                  <th style={{ padding: '12px', textAlign: 'center', color: 'var(--text-dim)', fontWeight: 600, letterSpacing: '1px' }}>
                    LABEL
                  </th>
                  <th style={{ padding: '12px', textAlign: 'left', color: 'var(--text-dim)', fontWeight: 600, letterSpacing: '1px' }}>
                    ATTACK TYPE
                  </th>
                </tr>
              </thead>
              <tbody>
                {results.map((result, index) => (
                  <tr key={index} style={{
                    borderBottom: '1px solid var(--border-base)',
                    transition: 'background 0.2s',
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-elevated)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
                    <td style={{ padding: '12px', color: 'var(--text-dim)' }}>
                      {index + 1}
                    </td>
                    <td style={{ padding: '12px', color: 'var(--text-primary)' }}>
                      {result.input.proto || '—'}
                    </td>
                    <td style={{ padding: '12px', color: 'var(--text-primary)' }}>
                      {result.input.service || '—'}
                    </td>
                    <td style={{ padding: '12px', color: 'var(--text-primary)' }}>
                      {result.input.state || '—'}
                    </td>
                    <td style={{ padding: '12px', textAlign: 'right', color: 'var(--text-secondary)' }}>
                      {result.input.sbytes ? (result.input.sbytes / 1024).toFixed(1) + 'K' : '—'}
                    </td>
                    <td style={{ padding: '12px', textAlign: 'right', color: 'var(--text-secondary)' }}>
                      {result.input.dbytes ? (result.input.dbytes / 1024).toFixed(1) + 'K' : '—'}
                    </td>
                    <td style={{ padding: '12px', textAlign: 'right', color: 'var(--text-secondary)' }}>
                      {result.input.dur ? result.input.dur.toFixed(3) + 's' : '—'}
                    </td>
                    <td style={{ 
                      padding: '12px', 
                      textAlign: 'right',
                      color: getRiskColor(result.score),
                      fontWeight: 700,
                    }}>
                      {(result.score * 100).toFixed(0)}
                    </td>
                    <td style={{ padding: '12px', textAlign: 'center' }}>
                      <span style={{
                        padding: '4px 12px',
                        borderRadius: '4px',
                        background: result.riskLevel === 'critical' ? 'rgba(239, 68, 68, 0.2)' : 
                                   result.riskLevel === 'high' ? 'rgba(251, 146, 60, 0.2)' :
                                   result.riskLevel === 'medium' ? 'rgba(250, 204, 21, 0.2)' :
                                   'rgba(34, 197, 94, 0.2)',
                        color: result.riskLevel === 'critical' ? 'var(--red)' : 
                               result.riskLevel === 'high' ? 'var(--amber)' :
                               result.riskLevel === 'medium' ? 'var(--amber)' :
                               'var(--green)',
                        fontSize: '10px',
                        fontWeight: 600,
                        letterSpacing: '1px',
                        textTransform: 'uppercase',
                      }}>
                        {result.riskLevel}
                      </span>
                    </td>
                    <td style={{ padding: '12px', textAlign: 'center' }}>
                      <span style={{
                        padding: '4px 12px',
                        borderRadius: '4px',
                        background: result.label === 'Attack' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(34, 197, 94, 0.2)',
                        color: result.label === 'Attack' ? 'var(--red)' : 'var(--green)',
                        fontSize: '10px',
                        fontWeight: 600,
                        letterSpacing: '1px',
                      }}>
                        {result.label}
                      </span>
                    </td>
                    <td style={{ padding: '12px', color: 'var(--text-secondary)', fontSize: '11px' }}>
                      {result.attackCat || 'Normal'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      )}

      {/* Sample Data Format */}
      <Panel title="SAMPLE DATA FORMAT">
        <div style={{ fontFamily: 'var(--font-body)', fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '12px' }}>
          Your data should include the following fields (example JSON format):
        </div>
        <pre style={{
          fontFamily: 'var(--font-mono)',
          fontSize: '10px',
          color: 'var(--cyan)',
          background: 'var(--bg-panel)',
          padding: '16px',
          borderRadius: '6px',
          overflowX: 'auto',
          lineHeight: '1.6',
        }}>
{`{
  "proto": "tcp",
  "service": "http",
  "state": "SYN",
  "attack_cat": "DoS Hulk",
  "sbytes": 8000,
  "dbytes": 2500,
  "stcpb": 500000,
  "dtcpb": 300000,
  "response_body_len": 800,
  "sloss": 5,
  "dloss": 3,
  "spkts": 80,
  "dpkts": 25,
  "swin": 128,
  "dwin": 128,
  "dmean": 50,
  "ct_src_dport_ltm": 5,
  "ct_dst_sport_ltm": 3,
  "trans_depth": 1,
  "ct_ftp_cmd": 0,
  "ct_flw_http_mthd": 1,
  "is_ftp_login": 0,
  "is_sm_ips_ports": 0,
  "dur": 0.2,
  "rate": 10000,
  "sload": 7000,
  "dload": 2000,
  "sinpkt": 0.01,
  "dinpkt": 0.02,
  "sjit": 0.002,
  "djit": 0.003,
  "tcprtt": 0.008,
  "synack": 0.004,
  "ackdat": 0.002
}`}
        </pre>
      </Panel>

    </div>
  )
}
