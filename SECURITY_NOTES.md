# Security Notes

## Known Vulnerabilities

### xlsx Package (High Severity)
- **Issue**: Prototype Pollution and ReDoS vulnerabilities in xlsx package
- **Impact**: Used for Excel file parsing in DataProcessor component
- **Status**: No fix available from package maintainer
- **Mitigation**: 
  - Consider replacing with safer alternatives like `exceljs` or `node-xlsx`
  - Limit file upload size and validate file types
  - Run in sandboxed environment (Docker container)
  - Monitor for unusual activity

### Recommended Actions
1. Replace xlsx with safer alternative when possible
2. Implement strict file validation
3. Consider server-side file processing instead of client-side
4. Regular security audits and dependency updates

## Build Workaround
The Docker build temporarily skips `npm audit fix` due to unfixable vulnerabilities in xlsx.
This should be addressed in future releases by replacing the vulnerable dependency.