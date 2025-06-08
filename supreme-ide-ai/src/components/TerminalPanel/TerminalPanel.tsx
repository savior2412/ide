import { useState, useRef, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import styles from './TerminalPanel.module.css';

interface Problem {
  id: string;
  type: 'error' | 'warning' | 'info';
  message: string;
  file: string;
  line: number;
  column?: number;
  source: string;
}

interface OutputEntry {
  id: string;
  timestamp: string;
  type: 'build' | 'compile' | 'test' | 'general';
  message: string;
  source: string;
}

interface DebugEntry {
  id: string;
  timestamp: string;
  level: 'log' | 'warn' | 'error' | 'debug';
  message: string;
  source?: string;
}

interface Port {
  id: string;
  port: number;
  protocol: 'http' | 'https' | 'tcp' | 'udp';
  status: 'running' | 'stopped' | 'error';
  name: string;
  url?: string;
}

const TerminalPanel = () => {
  const [activeTab, setActiveTab] = useState('terminal');
  const [terminalOutput, setTerminalOutput] = useState<string[]>(['💫 Supreme IDE Terminal - Type "help" for commands', 'user@Mac workspace % ']);
  const [currentInput, setCurrentInput] = useState('');
  const [currentPath, setCurrentPath] = useState('workspace');
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [isExecuting, setIsExecuting] = useState(false);
  const [problems, setProblems] = useState<Problem[]>([]);
  const [outputs, setOutputs] = useState<OutputEntry[]>([]);
  const [debugEntries, setDebugEntries] = useState<DebugEntry[]>([]);
  const [ports, setPorts] = useState<Port[]>([]);
  const terminalRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll terminal to bottom when new output is added
  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [terminalOutput]);

  // Auto-focus input when tab changes to terminal
  useEffect(() => {
    if (activeTab === 'terminal' && inputRef.current && !isExecuting) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [activeTab, isExecuting]);

  // Mock data để demo
  useEffect(() => {
    setProblems([
      {
        id: '1',
        type: 'error',
        message: "Undefined variable 'x'",
        file: 'src/main.py',
        line: 15,
        column: 8,
        source: 'Python Linter'
      },
      {
        id: '2',
        type: 'warning',
        message: 'Unused import statement',
        file: 'src/utils.py',
        line: 3,
        source: 'Python Linter'
      },
      {
        id: '3',
        type: 'info',
        message: 'Consider using type hints',
        file: 'src/app.py',
        line: 1,
        source: 'Python Linter'
      }
    ]);

    setOutputs([
      {
        id: '1',
        timestamp: new Date().toLocaleTimeString(),
        type: 'build',
        message: 'Starting build process...',
        source: 'Build System'
      },
      {
        id: '2',
        timestamp: new Date().toLocaleTimeString(),
        type: 'compile',
        message: 'Compiling TypeScript files...',
        source: 'TypeScript Compiler'
      },
      {
        id: '3',
        timestamp: new Date().toLocaleTimeString(),
        type: 'test',
        message: 'Running test suite...',
        source: 'Test Runner'
      }
    ]);

    setDebugEntries([
      {
        id: '1',
        timestamp: new Date().toLocaleTimeString(),
        level: 'log',
        message: 'Application started successfully',
        source: 'Main'
      },
      {
        id: '2',
        timestamp: new Date().toLocaleTimeString(),
        level: 'warn',
        message: 'Deprecated API usage detected',
        source: 'API'
      },
      {
        id: '3',
        timestamp: new Date().toLocaleTimeString(),
        level: 'error',
        message: 'Connection timeout',
        source: 'Network'
      }
    ]);

    setPorts([
      {
        id: '1',
        port: 3000,
        protocol: 'http',
        status: 'running',
        name: 'React Dev Server',
        url: 'http://localhost:3000'
      },
      {
        id: '2',
        port: 8080,
        protocol: 'http',
        status: 'stopped',
        name: 'API Server'
      }
    ]);
  }, []);

  const tabs = [
    { id: 'terminal', label: 'Terminal', icon: '⚡', count: 0 },
    { id: 'problems', label: 'Problems', icon: '🔍', count: problems.length },
    { id: 'output', label: 'Output', icon: '📋', count: outputs.length },
    { id: 'debug', label: 'Debug Console', icon: '🐛', count: debugEntries.length },
    { id: 'ports', label: 'Ports', icon: '🌐', count: ports.length }
  ];

  const executeCommand = async (command: string) => {
    const trimmedCommand = command.trim();
    
    if (!trimmedCommand) {
      setTerminalOutput(prev => [...prev, `user@Mac ${currentPath} % `]);
      return;
    }

    // Add command to output and history
    const commandLine = `user@Mac ${currentPath} % ${trimmedCommand}`;
    setTerminalOutput(prev => [...prev, commandLine]);
    
    // Add to command history
    setCommandHistory(prev => [...prev, trimmedCommand]);
    setHistoryIndex(-1);
    setIsExecuting(true);

    try {
      // Built-in commands
      if (trimmedCommand === 'clear') {
        setTerminalOutput(['💫 Supreme IDE Terminal - Type "help" for commands', `user@Mac ${currentPath} % `]);
        setIsExecuting(false);
        return;
      }

      if (trimmedCommand === 'help') {
        const helpText = [
          '',
          '💫 Supreme IDE Terminal Commands:',
          '  📁 File Operations:',
          '    ls, dir          - List directory contents',
          '    cd <path>        - Change directory',
          '    pwd              - Show current directory',
          '    cat <file>       - Show file contents',
          '    mkdir <name>     - Create directory',
          '    touch <file>     - Create empty file',
          '    rm <file>        - Remove file',
          '    cp <src> <dest>  - Copy file',
          '    mv <src> <dest>  - Move file',
          '',
          '  ⚡ Development:',
          '    npm/pnpm/yarn    - Package managers',
          '    node <file>      - Run Node.js script',
          '    python <file>    - Run Python script',
          '    cargo <cmd>      - Rust commands',
          '    git <cmd>        - Git commands',
          '',
          '  🛠️ Terminal:',
          '    clear            - Clear terminal',
          '    help             - Show this help',
          '    history          - Show command history',
          '    exit             - Close terminal',
          '',
          '  💡 Tips:',
          '    ↑/↓ arrows      - Navigate command history',
          '    Tab              - Auto-complete (coming soon)',
          '',
        ];
        setTerminalOutput(prev => [...prev, ...helpText, `user@Mac ${currentPath} % `]);
        setIsExecuting(false);
        return;
      }

      if (trimmedCommand === 'history') {
        const historyText = commandHistory.map((cmd, i) => `  ${i + 1}  ${cmd}`);
        setTerminalOutput(prev => [...prev, '', '📝 Command History:', ...historyText, '', `user@Mac ${currentPath} % `]);
        setIsExecuting(false);
        return;
      }

      if (trimmedCommand === 'pwd') {
        setTerminalOutput(prev => [...prev, currentPath, `user@Mac ${currentPath} % `]);
        setIsExecuting(false);
        return;
      }

      if (trimmedCommand.startsWith('cd ')) {
        const newPath = trimmedCommand.substring(3).trim();
        const targetPath = newPath || 'workspace';
        setCurrentPath(targetPath);
        setTerminalOutput(prev => [...prev, `user@Mac ${targetPath} % `]);
        setIsExecuting(false);
        return;
      }

      // Execute external command via backend
      const result = await invoke('execute_command_in_workspace', {
        command: trimmedCommand,
        workspacePath: '.'
      });

      const lines = String(result).split('\n').filter((line: string) => line.trim());
      setTerminalOutput(prev => [...prev, ...lines, `user@Mac ${currentPath} % `]);

    } catch (error) {
      const errorMsg = String(error).replace('Error: ', '');
      setTerminalOutput(prev => [...prev, `❌ ${errorMsg}`, `user@Mac ${currentPath} % `]);
    } finally {
      setIsExecuting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isExecuting) {
      executeCommand(currentInput);
      setCurrentInput('');
    }
    
    // Command history navigation
    else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (commandHistory.length > 0) {
        const newIndex = historyIndex === -1 ? commandHistory.length - 1 : Math.max(0, historyIndex - 1);
        setHistoryIndex(newIndex);
        setCurrentInput(commandHistory[newIndex]);
      }
    }
    
    else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIndex >= 0) {
        const newIndex = historyIndex + 1;
        if (newIndex >= commandHistory.length) {
          setHistoryIndex(-1);
          setCurrentInput('');
        } else {
          setHistoryIndex(newIndex);
          setCurrentInput(commandHistory[newIndex]);
        }
      }
    }
    
    // Ctrl+C to cancel current command
    else if (e.key === 'c' && e.ctrlKey) {
      if (isExecuting) {
        setTerminalOutput(prev => [...prev, '^C', `user@Mac ${currentPath} % `]);
        setIsExecuting(false);
        setCurrentInput('');
      }
    }
    
    // Ctrl+L to clear terminal
    else if (e.key === 'l' && e.ctrlKey) {
      e.preventDefault();
      setTerminalOutput(['💫 Supreme IDE Terminal - Type "help" for commands', `user@Mac ${currentPath} % `]);
    }
  };

  const addDebugEntry = (level: DebugEntry['level'], message: string) => {
    const newEntry: DebugEntry = {
      id: Date.now().toString(),
      timestamp: new Date().toLocaleTimeString(),
      level,
      message,
      source: 'Manual'
    };
    setDebugEntries(prev => [...prev, newEntry]);
  };

  const addPort = () => {
    const portNumber = prompt('Enter port number:', '8080');
    const portName = prompt('Enter port name:', 'New Service');
    
    if (portNumber && portName) {
      const newPort: Port = {
        id: Date.now().toString(),
        port: parseInt(portNumber),
        protocol: 'http',
        status: 'stopped',
        name: portName
      };
      setPorts(prev => [...prev, newPort]);
    }
  };

  const togglePort = (portId: string) => {
    setPorts(prev => prev.map(port => 
      port.id === portId 
        ? { ...port, status: port.status === 'running' ? 'stopped' : 'running' }
        : port
    ));
  };

  const renderTerminal = () => (
    <div className={styles.terminalContainer}>
      <div className={styles.terminalHeader}>
        <span className={styles.terminalTitle}>💻 Interactive Terminal</span>
        <div className={styles.terminalControls}>
          <button 
            className={styles.terminalButton}
            onClick={() => setTerminalOutput(['💫 Supreme IDE Terminal - Type "help" for commands', `user@Mac ${currentPath} % `])}
            title="Clear terminal (Ctrl+L)"
          >
            🗑️ Clear
          </button>
          <button 
            className={styles.terminalButton}
            onClick={() => executeCommand('help')}
            title="Show help"
          >
            ❓ Help
          </button>
        </div>
      </div>
      
      <div ref={terminalRef} className={styles.terminalOutput}>
        {terminalOutput.map((line, index) => (
          <div key={index} className={styles.terminalLine}>
            <span className={styles.terminalText}>{line}</span>
          </div>
        ))}
        
        <div className={styles.inputLine}>
          <span className={styles.prompt}>
            <span className={styles.user}>user@Mac</span>{' '}
            <span className={styles.path}>{currentPath}</span>{' '}
            <span className={styles.promptSymbol}>%</span>{' '}
          </span>
          <input
            ref={inputRef}
            type="text"
            value={currentInput}
            onChange={(e) => setCurrentInput(e.target.value)}
            onKeyDown={handleKeyDown}
            className={styles.terminalInput}
            placeholder={isExecuting ? "Executing..." : "Type a command..."}
            disabled={isExecuting}
            autoFocus
          />
          {isExecuting && <span className={styles.executingIndicator}>⏳</span>}
        </div>
      </div>
      
      <div className={styles.terminalFooter}>
        <span className={styles.footerText}>
          💡 Tips: Use ↑/↓ for history • Ctrl+C to cancel • Ctrl+L to clear
        </span>
      </div>
    </div>
  );

  const renderProblems = () => (
    <div className={styles.problemsContainer}>
      <div className={styles.problemsHeader}>
        <h3>Problems ({problems.length})</h3>
        <button className={styles.clearButton} onClick={() => setProblems([])}>
          Clear All
        </button>
      </div>
      <div className={styles.problemsList}>
        {problems.length === 0 ? (
          <div className={styles.emptyState}>🎉 No problems detected!</div>
        ) : (
          problems.map(problem => (
            <div key={problem.id} className={`${styles.problemItem} ${styles[`problem${problem.type.charAt(0).toUpperCase() + problem.type.slice(1)}`]}`}>
              <div className={styles.problemIcon}>
                {problem.type === 'error' ? '❌' : problem.type === 'warning' ? '⚠️' : 'ℹ️'}
              </div>
              <div className={styles.problemContent}>
                <div className={styles.problemMessage}>{problem.message}</div>
                <div className={styles.problemLocation}>
                  {problem.file}:{problem.line}{problem.column ? `:${problem.column}` : ''} - {problem.source}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );

  const renderOutput = () => (
    <div className={styles.outputContainer}>
      <div className={styles.outputHeader}>
        <h3>Output ({outputs.length})</h3>
        <div className={styles.outputControls}>
          <select className={styles.sourceFilter}>
            <option value="all">All Sources</option>
            <option value="build">Build System</option>
            <option value="compiler">TypeScript Compiler</option>
            <option value="test">Test Runner</option>
          </select>
          <button className={styles.clearButton} onClick={() => setOutputs([])}>
            Clear
          </button>
        </div>
      </div>
      <div className={styles.outputList}>
        {outputs.length === 0 ? (
          <div className={styles.emptyState}>📋 No output</div>
        ) : (
          outputs.map(output => (
            <div key={output.id} className={styles.outputItem}>
              <span className={styles.outputTimestamp}>[{output.timestamp}]</span>
              <span className={`${styles.outputType} ${styles[`output${output.type.charAt(0).toUpperCase() + output.type.slice(1)}`]}`}>
                {output.type.toUpperCase()}
              </span>
              <span className={styles.outputSource}>({output.source})</span>
              <span className={styles.outputMessage}>{output.message}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );

  const renderDebugConsole = () => (
    <div className={styles.debugContainer}>
      <div className={styles.debugHeader}>
        <h3>Debug Console ({debugEntries.length})</h3>
        <div className={styles.debugControls}>
          <button className={styles.debugButton} onClick={() => addDebugEntry('log', 'Manual log entry')}>
            Log
          </button>
          <button className={styles.debugButton} onClick={() => addDebugEntry('warn', 'Manual warning')}>
            Warn
          </button>
          <button className={styles.debugButton} onClick={() => addDebugEntry('error', 'Manual error')}>
            Error
          </button>
          <button className={styles.clearButton} onClick={() => setDebugEntries([])}>
            Clear
          </button>
        </div>
      </div>
      <div className={styles.debugList}>
        {debugEntries.length === 0 ? (
          <div className={styles.emptyState}>🐛 Debug console ready</div>
        ) : (
          debugEntries.map(entry => (
            <div key={entry.id} className={`${styles.debugItem} ${styles[`debug${entry.level.charAt(0).toUpperCase() + entry.level.slice(1)}`]}`}>
              <span className={styles.debugTimestamp}>[{entry.timestamp}]</span>
              <span className={styles.debugLevel}>{entry.level.toUpperCase()}</span>
              {entry.source && <span className={styles.debugSource}>({entry.source})</span>}
              <span className={styles.debugMessage}>{entry.message}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );

  const renderPorts = () => (
    <div className={styles.portsContainer}>
      <div className={styles.portsHeader}>
        <h3>Forwarded Ports ({ports.length})</h3>
        <button className={styles.addPortButton} onClick={() => addPort()}>
          + Add Port
        </button>
      </div>
      <div className={styles.portsList}>
        {ports.length === 0 ? (
          <div className={styles.emptyState}>🌐 No forwarded ports</div>
        ) : (
          ports.map(port => (
            <div key={port.id} className={styles.portItem}>
              <div className={styles.portInfo}>
                <span className={`${styles.portStatus} ${styles[`status${port.status.charAt(0).toUpperCase() + port.status.slice(1)}`]}`}>
                  ●
                </span>
                <span className={styles.portNumber}>{port.port}</span>
                <span className={styles.portProtocol}>({port.protocol.toUpperCase()})</span>
                <span className={styles.portName}>{port.name}</span>
              </div>
              <div className={styles.portActions}>
                {port.url && (
                  <button className={styles.openButton} onClick={() => window.open(port.url)}>
                    Open
                  </button>
                )}
                <button className={styles.stopButton} onClick={() => togglePort(port.id)}>
                  {port.status === 'running' ? 'Stop' : 'Start'}
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );

  const renderTabContent = () => {
    switch (activeTab) {
      case 'terminal':
        return renderTerminal();
      case 'problems':
        return renderProblems();
      case 'output':
        return renderOutput();
      case 'debug':
        return renderDebugConsole();
      case 'ports':
        return renderPorts();
      default:
        return null;
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.tabBar}>
        {tabs.map(tab => (
          <button
            key={tab.id}
            className={`${styles.tab} ${activeTab === tab.id ? styles.activeTab : ''}`}
            onClick={() => setActiveTab(tab.id)}
            data-tab={tab.id}
          >
            <span className={styles.tabIcon}>{tab.icon}</span>
            <span className={styles.tabLabel}>{tab.label}</span>
            {tab.count > 0 && (
              <span className={styles.tabCount}>{tab.count}</span>
            )}
          </button>
        ))}
      </div>
      
      <div className={styles.content}>
        {renderTabContent()}
      </div>
    </div>
  );
};

export default TerminalPanel; 