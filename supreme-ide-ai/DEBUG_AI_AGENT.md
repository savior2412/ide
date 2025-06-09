# 🔧 AI Agent Debug Guide

## Quick Debug Commands

### 1. Test Backend Connection
```bash
# Check if Tauri backend is running
curl -X POST http://localhost:1420/api/test
```

### 2. Verify Rust Commands Registration
```rust
// In browser console
await window.__TAURI__.invoke('ai_agent_file_operation', {
  request: {
    action: 'read_file',
    parameters: { path: 'package.json' }
  }
});
```

### 3. Test localStorage API Key
```javascript
// Browser console
console.log('API Key:', localStorage.getItem('ai_agent_api_key'));
console.log('Model:', localStorage.getItem('ai_agent_model'));
```

### 4. Direct Service Test
```javascript
// Browser console test
import { AIAgentService } from './src/utils/aiAgentService';
const agent = new AIAgentService('test-key');
agent.setWorkspace('/Users/savior/Desktop/ide');
```

## Common Issues & Solutions

### Issue 1: "Cannot find module '@tauri-apps/api/core'"
**Solution:** 
```bash
npm install @tauri-apps/api@latest
```

### Issue 2: AI Agent not connecting
**Check:**
- ✅ API key set in localStorage
- ✅ Tauri backend running
- ✅ Network connection for AI API

### Issue 3: File operations failing
**Debug:**
```bash
# Check file permissions
ls -la /Users/savior/Desktop/ide/
# Check workspace path
echo $PWD
```

### Issue 4: TypeScript errors
**Quick fix:**
```bash
# Rebuild types
npm run build
# Clear cache
rm -rf node_modules/.vite
```

## Performance Benchmarks

### Expected Response Times:
- 📖 Read file (small): <100ms
- 📖 Read file (large): <500ms  
- 🔍 Search workspace: <2s
- 🧮 Code analysis: <300ms
- 🤖 AI chat response: <5s

### Memory Usage:
- 🧠 Frontend: <100MB
- ⚙️ Backend (Rust): <50MB
- 📁 Workspace scanning: <200MB

## Test Automation Script

```bash
#!/bin/bash
echo "🧪 Starting AI Agent Tests..."

# Test 1: File Read
echo "Test 1: File Read"
curl -X POST http://localhost:1420/invoke -d '{
  "cmd": "ai_agent_file_operation",
  "args": {
    "request": {
      "action": "read_file", 
      "parameters": {"path": "package.json"}
    }
  }
}'

# Test 2: Search
echo "Test 2: Search"
curl -X POST http://localhost:1420/invoke -d '{
  "cmd": "ai_agent_file_operation", 
  "args": {
    "request": {
      "action": "search_content",
      "parameters": {"query": "React", "workspace": "/path/to/workspace"}
    }
  }
}'

echo "✅ Tests completed!"
```

## Monitoring & Logging

### Frontend Logs:
```javascript
// Enable verbose logging
localStorage.setItem('ai_agent_debug', 'true');
// Check logs
console.log('AI Agent Logs:', localStorage.getItem('ai_agent_logs'));
```

### Backend Logs:
```bash
# Monitor Rust logs  
tail -f ~/.tauri/logs/app.log
# Monitor specific operations
grep "AI Agent" ~/.tauri/logs/app.log
``` 