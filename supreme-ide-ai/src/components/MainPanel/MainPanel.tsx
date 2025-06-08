import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import { invoke } from '@tauri-apps/api/core';
import styles from './MainPanel.module.css';
import CodeEditor from '../CodeEditor/CodeEditor';
import { getLanguageDisplayName } from '../../utils/fileUtils';

interface TerminalSession {
  id: string;
  name: string;
  history: Array<{ command: string; output: string; timestamp: Date }>;
  currentPath: string;
}

interface Problem {
  id?: string;
  type: 'error' | 'warning' | 'info';
  file: string;
  line: number;
  column?: number;
  message: string;
  source?: string;
}

interface OutputEntry {
  timestamp: Date;
  source: string;
  message: string;
  type: 'build' | 'task' | 'extension';
}

interface DebugEntry {
  timestamp: Date;
  level: 'log' | 'warn' | 'error' | 'info';
  message: string;
}

interface Port {
  port: number;
  status: 'running' | 'stopped';
  service: string;
  url: string;
}

interface MainPanelProps {
  filePath?: string;
  fileContent: string;
  language: string;
  isDirty: boolean;
  onContentChange: (content: string) => void;
  workspacePath?: string;
}

type BottomTabType = 'terminal' | 'problems' | 'output' | 'debug' | 'ports';

const MainPanel = ({ filePath, fileContent, language, isDirty, onContentChange, workspacePath }: MainPanelProps) => {
  const [terminals, setTerminals] = useState<TerminalSession[]>([]);
  const [activeTerminalId, setActiveTerminalId] = useState<string>('');
  const [terminalInput, setTerminalInput] = useState('');
  const [activeBottomTab, setActiveBottomTab] = useState<BottomTabType>('terminal');
  
  // Real problems from workspace analysis
  const [problems, setProblems] = useState<Problem[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const [outputEntries] = useState<OutputEntry[]>([
    { timestamp: new Date(), source: 'Build', message: 'Starting build process...', type: 'build' },
    { timestamp: new Date(), source: 'Webpack', message: 'Compiled successfully!', type: 'build' },
    { timestamp: new Date(), source: 'Extension', message: 'Python extension activated', type: 'extension' }
  ]);

  const [debugEntries] = useState<DebugEntry[]>([
    { timestamp: new Date(), level: 'info', message: 'Debug session started' },
    { timestamp: new Date(), level: 'log', message: 'Breakpoint hit at line 15' },
    { timestamp: new Date(), level: 'warn', message: 'Variable "y" is undefined' }
  ]);

  const [ports] = useState<Port[]>([
    { port: 5173, status: 'running', service: 'Vite Dev Server', url: 'http://localhost:5173' },
    { port: 3000, status: 'stopped', service: 'React App', url: 'http://localhost:3000' },
    { port: 8080, status: 'running', service: 'API Server', url: 'http://localhost:8080' }
  ]);

  const terminalRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Tạo terminal đầu tiên khi có workspace
  useEffect(() => {
    if (workspacePath && terminals.length === 0) {
      createNewTerminal();
    }
  }, [workspacePath]);

  // Analyze workspace for problems when workspace changes
  useEffect(() => {
    if (workspacePath) {
      analyzeWorkspaceProblems();
    }
  }, [workspacePath]);

  const analyzeWorkspaceProblems = async () => {
    if (!workspacePath) return;
    
    setIsAnalyzing(true);
    try {
      const result = await invoke<Problem[]>('analyze_workspace_problems', { 
        workspacePath 
      });
      
      console.log('🔍 Problems detected:', result.length);
      setProblems(result);
    } catch (error) {
      console.error('❌ Error analyzing workspace:', error);
      setProblems([]);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Refresh problems manually
  const refreshProblems = () => {
    analyzeWorkspaceProblems();
  };

  const createNewTerminal = () => {
    const newTerminal: TerminalSession = {
      id: `terminal-${Date.now()}`,
      name: `Terminal ${terminals.length + 1}`,
      history: [{
        command: '',
        output: `Welcome to Supreme IDE Terminal
Workspace: ${workspacePath}

Type 'help' for available commands.`,
        timestamp: new Date()
      }],
      currentPath: workspacePath || ''
    };
    
    setTerminals(prev => [...prev, newTerminal]);
    setActiveTerminalId(newTerminal.id);
  };

  const closeTerminal = (terminalId: string) => {
    setTerminals(prev => {
      const updated = prev.filter(t => t.id !== terminalId);
      if (activeTerminalId === terminalId && updated.length > 0) {
        setActiveTerminalId(updated[0].id);
      }
      return updated;
    });
  };

  const handleTerminalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!terminalInput.trim() || !activeTerminalId || !workspacePath) return;

    const command = terminalInput.trim();
    setTerminalInput('');

    const activeTerminal = terminals.find(t => t.id === activeTerminalId);
    if (!activeTerminal) return;

    try {
      const result = await invoke<string>('execute_command_in_workspace', { 
        command, 
        workspacePath: activeTerminal.currentPath 
      });
      
      // Update current path if cd command
      let newCurrentPath = activeTerminal.currentPath;
      if (command.startsWith('cd ')) {
        const target = command.substring(3).trim();
        if (target === '~' || target === '') {
          newCurrentPath = workspacePath;
        } else if (target.startsWith('/') || target.includes(':')) {
          newCurrentPath = target;
        } else {
          // For relative paths, update based on successful cd
          if (!result.includes('Error:') && !result.includes('cd:')) {
            if (target === '..') {
              const pathParts = newCurrentPath.split(/[\\/]/);
              pathParts.pop();
              newCurrentPath = pathParts.join('/') || workspacePath;
            } else {
              newCurrentPath = `${activeTerminal.currentPath}/${target}`;
            }
          }
        }
      }
      
      setTerminals(prev => prev.map(terminal => 
        terminal.id === activeTerminalId 
          ? {
              ...terminal,
              currentPath: newCurrentPath,
              history: [...terminal.history, {
                command,
                output: result,
                timestamp: new Date()
              }]
            }
          : terminal
      ));

    } catch (error) {
      setTerminals(prev => prev.map(terminal => 
        terminal.id === activeTerminalId 
          ? {
              ...terminal,
              history: [...terminal.history, {
                command,
                output: `Error: ${error}`,
                timestamp: new Date()
              }]
            }
          : terminal
      ));
    }

    autoScrollTerminal();
  };

  const autoScrollTerminal = useCallback(() => {
    setTimeout(() => {
      if (terminalRef.current) {
        terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
      }
    }, 100);
  }, []);

  const getFileName = (path: string) => {
    return path.split(/[\\/]/).pop() || 'Untitled';
  };

  const getWorkspaceName = () => {
    if (!workspacePath) return 'No Workspace';
    return workspacePath.split(/[\\/]/).pop() || 'Workspace';
  };

  const getCurrentPath = (terminal: TerminalSession) => {
    if (!terminal.currentPath) return getWorkspaceName();
    const relativePath = terminal.currentPath.replace(workspacePath || '', '');
    return relativePath ? `${getWorkspaceName()}${relativePath}` : getWorkspaceName();
  };

  const getPromptPrefix = () => {
    const activeTerminal = terminals.find(t => t.id === activeTerminalId);
    if (!activeTerminal) return `${getWorkspaceName()}:~$ `;
    return `user@Mac ${getCurrentPath(activeTerminal)} % `;
  };

  const handleEditorChange = (value: string | undefined) => {
    onContentChange(value || '');
  };

  const languageDisplay = getLanguageDisplayName(language);
  const activeTerminal = terminals.find(t => t.id === activeTerminalId);

  const getTabCount = (tab: BottomTabType) => {
    switch (tab) {
      case 'problems': return problems.length;
      case 'output': return outputEntries.length;
      case 'debug': return debugEntries.length;
      case 'ports': return ports.filter(p => p.status === 'running').length;
      case 'terminal': return terminals.length;
      default: return 0;
    }
  };

  const renderBottomTabContent = () => {
    switch (activeBottomTab) {
      case 'terminal':
        return (
          <div className={styles.terminalContent}>
            {!workspacePath ? (
              <div className={styles.noWorkspace}>
                <div className={styles.noWorkspaceIcon}>📁</div>
                <h3>No Workspace Opened</h3>
                <p>Open a folder to start using the terminal</p>
                <p className={styles.shortcut}>File → Open Folder (Ctrl+Shift+O)</p>
              </div>
            ) : (
              <>
                {/* Terminal Tabs */}
                <div className={styles.terminalTabs}>
                  {terminals.map(terminal => (
                    <div 
                      key={terminal.id}
                      className={`${styles.terminalTab} ${activeTerminalId === terminal.id ? styles.active : ''}`}
                      onClick={() => setActiveTerminalId(terminal.id)}
                    >
                      <span className={styles.terminalTabIcon}>⚡</span>
                      <span className={styles.terminalTabName}>{terminal.name}</span>
                      {terminals.length > 1 && (
                        <button 
                          className={styles.terminalTabClose}
                          onClick={(e) => {
                            e.stopPropagation();
                            closeTerminal(terminal.id);
                          }}
                        >
                          ×
                        </button>
                      )}
                    </div>
                  ))}
                  <button 
                    className={styles.addTerminalButton}
                    onClick={createNewTerminal}
                    title="Add Terminal"
                  >
                    +
                  </button>
                </div>

                {/* Terminal Output */}
                <div className={styles.terminalOutput} ref={terminalRef}>
                  {activeTerminal?.history.map((entry, index) => (
                    <div key={index} className={styles.terminalEntry}>
                      {entry.command && (
                        <div className={styles.terminalCommand}>
                          <span className={styles.terminalPrompt}>
                            {getPromptPrefix()}
                          </span>
                          <span className={styles.terminalCommandText}>{entry.command}</span>
                        </div>
                      )}
                      {entry.output && (
                        <div className={styles.terminalResult}>
                          {entry.output}
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Terminal Input */}
                <form onSubmit={handleTerminalSubmit} className={styles.terminalInputForm}>
                  <span className={styles.terminalPrompt}>
                    {getPromptPrefix()}
                  </span>
                  <input
                    ref={inputRef}
                    type="text"
                    value={terminalInput}
                    onChange={(e) => setTerminalInput(e.target.value)}
                    placeholder="Type a command..."
                    className={styles.terminalInput}
                    autoFocus
                  />
                </form>
              </>
            )}
          </div>
        );

      case 'problems':
        return (
          <div className={styles.tabContent}>
            <div className={styles.problemsHeader}>
              <div className={styles.problemsTitle}>
                <span>Problems ({problems.length})</span>
                {isAnalyzing && <span className={styles.analyzing}>🔄 Analyzing...</span>}
              </div>
              <div className={styles.problemsActions}>
                <button 
                  className={styles.actionButton} 
                  title="Refresh Analysis"
                  onClick={refreshProblems}
                  disabled={isAnalyzing}
                >
                  🔄
                </button>
                <button 
                  className={styles.actionButton} 
                  title="Clear All"
                  onClick={() => setProblems([])}
                >
                  🗑️
                </button>
              </div>
            </div>
            <div className={styles.problemsList}>
              {problems.length === 0 && !isAnalyzing ? (
                <div className={styles.noProblems}>
                  <div className={styles.noProblemsIcon}>✅</div>
                  <div className={styles.noProblemsText}>
                    {workspacePath ? 'No problems detected in workspace' : 'Open a workspace to analyze for problems'}
                  </div>
                </div>
              ) : (
                problems.map((problem, index) => (
                  <div key={problem.id || index} className={`${styles.problemItem} ${styles[problem.type]}`}>
                    <div className={styles.problemIcon}>
                      {problem.type === 'error' ? '❌' : problem.type === 'warning' ? '⚠️' : 'ℹ️'}
                    </div>
                    <div className={styles.problemDetails}>
                      <div className={styles.problemMessage}>{problem.message}</div>
                      <div className={styles.problemLocation}>
                        {problem.file?.replace(workspacePath + '/', '') || problem.file}:{problem.line}:{problem.column || 1}
                      </div>
                      <div className={styles.problemSource}>{problem.source || 'Code Analyzer'}</div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        );

      case 'output':
        return (
          <div className={styles.tabContent}>
            <div className={styles.outputList}>
              {outputEntries.map((entry, index) => (
                <div key={index} className={styles.outputEntry}>
                  <span className={styles.outputTime}>
                    {entry.timestamp.toLocaleTimeString()}
                  </span>
                  <span className={styles.outputSource}>[{entry.source}]</span>
                  <span className={styles.outputMessage}>{entry.message}</span>
                </div>
              ))}
              {outputEntries.length === 0 && (
                <div className={styles.emptyState}>No output</div>
              )}
            </div>
          </div>
        );

      case 'debug':
        return (
          <div className={styles.tabContent}>
            <div className={styles.debugList}>
              {debugEntries.map((entry, index) => (
                <div key={index} className={`${styles.debugEntry} ${styles[entry.level]}`}>
                  <span className={styles.debugTime}>
                    {entry.timestamp.toLocaleTimeString()}
                  </span>
                  <span className={styles.debugLevel}>[{entry.level.toUpperCase()}]</span>
                  <span className={styles.debugMessage}>{entry.message}</span>
                </div>
              ))}
              {debugEntries.length === 0 && (
                <div className={styles.emptyState}>No debug output</div>
              )}
            </div>
          </div>
        );

      case 'ports':
        return (
          <div className={styles.tabContent}>
            <div className={styles.portsList}>
              {ports.map((port, index) => (
                <div key={index} className={`${styles.portItem} ${styles[port.status]}`}>
                  <span className={styles.portNumber}>{port.port}</span>
                  <span className={styles.portService}>{port.service}</span>
                  <span className={styles.portUrl}>{port.url}</span>
                  <span className={`${styles.portStatus} ${port.status === 'running' ? styles.running : styles.stopped}`}>
                    {port.status}
                  </span>
                </div>
              ))}
              {ports.length === 0 && (
                <div className={styles.emptyState}>No ports</div>
              )}
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className={styles.container}>
      <PanelGroup direction="vertical" className={styles.panelGroup}>
        {/* Editor Panel */}
        <Panel defaultSize={70} minSize={30} className={styles.editorPanelWrapper}>
          <div className={styles.editorPanel}>
            <div className={styles.panelHeader}>
              <span className={styles.fileName}>
                {filePath ? getFileName(filePath) : 'No file opened'}
                {isDirty && ' ●'}
              </span>
              <span className={`${styles.language} text-glow-pink`}>
                {languageDisplay} {isDirty ? '(Chưa lưu)' : '(Đã lưu)'}
              </span>
            </div>
            <CodeEditor
              value={fileContent || '// Chọn file để bắt đầu chỉnh sửa\n// File -> Open File hoặc File -> Open Folder'}
              onChange={handleEditorChange}
              language={language}
            />
          </div>
        </Panel>
        
        <PanelResizeHandle className={styles.resizeHandle} />

        {/* Bottom Panel */}
        <Panel defaultSize={30} minSize={20} className={styles.bottomPanelWrapper}>
          <div className={styles.bottomPanel}>
            {/* Bottom Tab Headers */}
            <div className={styles.bottomTabHeader}>
              <div className={styles.bottomTabs}>
                {(['terminal', 'problems', 'output', 'debug', 'ports'] as const).map((tab) => (
                  <div 
                    key={tab}
                    className={`${styles.bottomTab} ${activeBottomTab === tab ? styles.active : ''}`}
                    onClick={() => setActiveBottomTab(tab)}
                  >
                    <span className={styles.bottomTabIcon}>
                      {tab === 'terminal' && '⚡'}
                      {tab === 'problems' && '🔍'}
                      {tab === 'output' && '📋'}
                      {tab === 'debug' && '🐛'}
                      {tab === 'ports' && '🌐'}
                    </span>
                    <span className={styles.bottomTabName}>
                      {tab.charAt(0).toUpperCase() + tab.slice(1)}
                    </span>
                    {getTabCount(tab) > 0 && (
                      <span className={styles.bottomTabCount}>{getTabCount(tab)}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Bottom Tab Content */}
            <div className={styles.bottomTabBody}>
              {renderBottomTabContent()}
            </div>
          </div>
        </Panel>
      </PanelGroup>
    </div>
  );
};

export default MainPanel;