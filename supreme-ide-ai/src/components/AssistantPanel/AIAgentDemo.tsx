import React, { useState } from 'react';
import { AIAgentService, FileOperation } from '../../utils/aiAgentService';

interface AIAgentDemoProps {
  workspacePath: string;
}

const AIAgentDemo: React.FC<AIAgentDemoProps> = ({ workspacePath }) => {
  const [aiAgent] = useState(() => {
    // Initialize với demo API key (hoặc từ localStorage)
    const apiKey = localStorage.getItem('ai_agent_api_key') || 'demo-key';
    const agent = new AIAgentService(apiKey);
    agent.setWorkspace(workspacePath);
    return agent;
  });

  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState<string[]>([]);

  const addResult = (message: string) => {
    setResults(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  const runDemo = async () => {
    setIsRunning(true);
    setResults([]);

    try {
      addResult('🚀 Bắt đầu demo AI Agent...');

      // 1. Tạo file demo
      addResult('📝 Tạo file demo...');
      await aiAgent.executeFileOperation({
        type: 'create',
        path: `${workspacePath}/ai-demo.js`,
        content: `// AI Agent Demo File
function greetUser(name) {
  console.log(\`Hello \${name}!\`);
}

function calculateSum(a, b) {
  return a + b;
}

export { greetUser, calculateSum };`
      });
      addResult('✅ Tạo file ai-demo.js thành công');

      // 2. Đọc và phân tích file
      addResult('🔍 Phân tích code...');
      const analysis = await aiAgent.analyzeCode(`${workspacePath}/ai-demo.js`);
      addResult(`📊 Phân tích: ${analysis.total_lines} lines, ${analysis.analysis.functions.length} functions`);

      // 3. Tìm kiếm content
      addResult('🔎 Tìm kiếm trong workspace...');
      const searchResult = await aiAgent.executeFileOperation({
        type: 'search',
        path: workspacePath,
        query: 'function'
      });
      addResult(`🎯 Tìm thấy ${searchResult.data.results.total_matches} matches`);

      // 4. AI Chat với context
      addResult('💬 AI chat với file context...');
      const chatResponse = await aiAgent.chatWithFileContext(
        "Analyze this JavaScript file and suggest improvements",
        [`${workspacePath}/ai-demo.js`]
      );
      addResult(`🤖 AI Response: ${chatResponse.substring(0, 100)}...`);

      // 5. Batch operations
      addResult('🔄 Thực hiện batch operations...');
      const batchOps: FileOperation[] = [
        {
          type: 'create',
          path: `${workspacePath}/ai-test.txt`,
          content: 'Test file created by AI Agent'
        },
        {
          type: 'read',
          path: `${workspacePath}/ai-demo.js`
        }
      ];
      
      const batchResults = await aiAgent.batchFileOperations(batchOps);
      addResult(`✅ Batch operations: ${batchResults.filter(r => r.success).length}/${batchResults.length} successful`);

      // 6. Workspace summary
      addResult('📋 Lấy workspace summary...');
      const summary = await aiAgent.getWorkspaceSummary();
      addResult(`📁 Workspace có ${summary.summary.results?.files_searched || 0} files`);

      addResult('🎉 Demo hoàn thành thành công!');

    } catch (error) {
      addResult(`❌ Lỗi: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsRunning(false);
    }
  };

  const clearResults = () => {
    setResults([]);
  };

  const demoCommands = [
    {
      title: "📖 Đọc File",
      command: "Đọc file package.json",
      operation: { type: 'read' as const, path: `${workspacePath}/package.json` }
    },
    {
      title: "🔍 Tìm kiếm",  
      command: "Tìm kiếm 'React' trong project",
      operation: { type: 'search' as const, path: workspacePath, query: 'React' }
    },
    {
      title: "📝 Tạo Component",
      command: "Tạo React component mới",
      operation: { 
        type: 'create' as const, 
        path: `${workspacePath}/src/components/AIDemo.tsx`,
        content: `import React from 'react';

interface AIDemoProps {
  title: string;
}

const AIDemo: React.FC<AIDemoProps> = ({ title }) => {
  return (
    <div>
      <h1>{title}</h1>
      <p>This component was created by AI Agent!</p>
    </div>
  );
};

export default AIDemo;`
      }
    }
  ];

  const executeCommand = async (operation: FileOperation, title: string) => {
    setIsRunning(true);
    try {
      addResult(`🔄 ${title}: Đang thực hiện...`);
      const result = await aiAgent.executeFileOperation(operation);
      addResult(`✅ ${title}: Thành công!`);
      console.log('Command result:', result);
    } catch (error) {
      addResult(`❌ ${title}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div style={{ 
      padding: '20px', 
      background: '#1e1e1e', 
      color: 'white', 
      borderRadius: '8px',
      fontFamily: 'monospace'
    }}>
      <h2>🤖 AI Agent Demo</h2>
      <p>Workspace: {workspacePath}</p>

      <div style={{ marginBottom: '20px' }}>
        <button
          onClick={runDemo}
          disabled={isRunning}
          style={{
            background: '#007acc',
            color: 'white',
            border: 'none',
            padding: '10px 20px',
            borderRadius: '5px',
            cursor: isRunning ? 'not-allowed' : 'pointer',
            marginRight: '10px'
          }}
        >
          {isRunning ? '⏳ Đang chạy...' : '🚀 Chạy Full Demo'}
        </button>

        <button
          onClick={clearResults}
          style={{
            background: '#666',
            color: 'white',
            border: 'none',
            padding: '10px 20px',
            borderRadius: '5px',
            cursor: 'pointer'
          }}
        >
          🗑️ Clear Results
        </button>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <h3>📋 Quick Commands:</h3>
        <div style={{ display: 'grid', gap: '10px' }}>
          {demoCommands.map((cmd, index) => (
            <button
              key={index}
              onClick={() => executeCommand(cmd.operation, cmd.title)}
              disabled={isRunning}
              style={{
                background: '#2d2d2d',
                color: 'white',
                border: '1px solid #444',
                padding: '8px 12px',
                borderRadius: '4px',
                cursor: isRunning ? 'not-allowed' : 'pointer',
                textAlign: 'left'
              }}
            >
              {cmd.title}: {cmd.command}
            </button>
          ))}
        </div>
      </div>

      <div style={{
        background: '#2d2d2d',
        padding: '15px',
        borderRadius: '5px',
        maxHeight: '400px',
        overflowY: 'auto',
        border: '1px solid #444'
      }}>
        <h3>📊 Results:</h3>
        {results.length === 0 ? (
          <p style={{ color: '#888' }}>Chưa có kết quả. Chạy demo để xem AI Agent hoạt động!</p>
        ) : (
          results.map((result, index) => (
            <div key={index} style={{ 
              marginBottom: '5px',
              padding: '5px',
              background: result.includes('❌') ? '#4a1515' : 
                         result.includes('✅') ? '#1b4a1b' : 
                         result.includes('🤖') ? '#1a237e' : 'transparent',
              borderRadius: '3px'
            }}>
              {result}
            </div>
          ))
        )}
      </div>

      <div style={{ marginTop: '20px', fontSize: '14px', color: '#888' }}>
        <h4>💡 Cách sử dụng:</h4>
        <ul>
          <li>✅ Thiết lập API key trong Settings trước</li>
          <li>🔄 Chọn workspace folder</li> 
          <li>🚀 Chạy demo để xem các tính năng</li>
          <li>💬 Sử dụng tab "File Agent" để tương tác trực tiếp</li>
        </ul>
      </div>
    </div>
  );
};

export default AIAgentDemo; 