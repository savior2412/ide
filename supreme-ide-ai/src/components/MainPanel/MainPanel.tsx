import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import { invoke } from '@tauri-apps/api/core';
import styles from './MainPanel.module.css';
import CodeEditor from '../CodeEditor/CodeEditor';

interface TerminalSession {
  id: string;
  name: string;
  history: Array<{ command: string; output: string; timestamp: Date }>;
  currentPath: string;
}

interface Problem {
  type: 'error' | 'warning' | 'info';
  severity: 'error' | 'warning' | 'info';
  file: string;
  line: number;
  column: number;
  message: string;
  code?: string;
  source: string;
  category?: string;
  quickFix?: string;
  relatedInformation?: string;
}

interface FileGroup {
  fileName: string;
  filePath: string;
  fileType: string;
  icon: string;
  problemCount: number;
  problems: Problem[];
}

interface ProblemsData {
  fileGroups: FileGroup[];
  totalProblems: number;
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

interface CodeTab {
  id: string;
  name: string;
  path: string;
  content: string;
  language: string;
  isActive: boolean;
  isDirty?: boolean;
}

interface MainPanelProps {
  filePath?: string;
  fileContent: string;
  isDirty: boolean;
  onContentChange: (content: string) => void;
  workspacePath?: string;
}

type BottomTabType = 'terminal' | 'problems' | 'output' | 'debug' | 'ports';

const MainPanel = ({ filePath, fileContent, isDirty, onContentChange, workspacePath }: MainPanelProps) => {
  const [terminals, setTerminals] = useState<TerminalSession[]>([]);
  const [activeTerminalId, setActiveTerminalId] = useState<string>('');
  const [terminalInput, setTerminalInput] = useState('');
  const [activeBottomTab, setActiveBottomTab] = useState<BottomTabType>('terminal');
  
  // Real problems from workspace analysis
  const [problemsData, setProblemsData] = useState<ProblemsData>({ fileGroups: [], totalProblems: 0 });
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());

  // Code tabs management - Main tabs at top
  const [codeTabs, setCodeTabs] = useState<CodeTab[]>([]);
  const [activeCodeTab, setActiveCodeTab] = useState<string>('');

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

  // Navigation function for "Open in Terminal"
  const navigateToPath = (path: string) => {
    console.log('🚀 MainPanel: Navigating terminal to path:', path);
    
    try {
      // Switch to terminal tab
      setActiveBottomTab('terminal');
      console.log('✅ MainPanel: Switched to terminal tab');
      
      // Check if there's already a terminal for this path
      const existingTerminal = terminals.find(t => t.currentPath === path);
      
      if (existingTerminal) {
        // Switch to existing terminal
        setActiveTerminalId(existingTerminal.id);
        console.log('✅ MainPanel: Switched to existing terminal for path:', path);
      } else {
        // Create new terminal for this path
        const pathName = path.split('/').pop() || 'Root';
        const newTerminal: TerminalSession = {
          id: `terminal-${Date.now()}`,
          name: `📁 ${pathName}`,
          history: [{
            command: '',
            output: `Terminal opened in: ${path}
Type 'help' for available commands.`,
            timestamp: new Date()
          }],
          currentPath: path
        };
        
        setTerminals(prev => [...prev, newTerminal]);
        setActiveTerminalId(newTerminal.id);
        console.log('✅ MainPanel: Created new terminal for path:', path);
      }
      
      // Clear any pending input
      setTerminalInput('');
      
      // Focus the input with visual effect
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
          console.log('✅ MainPanel: Terminal input focused');
          // Visual highlight effect
          inputRef.current.style.background = 'rgba(0, 212, 255, 0.1)';
          setTimeout(() => {
            if (inputRef.current) {
              inputRef.current.style.background = '';
            }
          }, 500);
        } else {
          console.warn('⚠️ MainPanel: Terminal input ref not found');
        }
      }, 100);
    } catch (error) {
      console.error('❌ MainPanel: navigateToPath failed:', error);
    }
  };

  // Expose global navigation function and listen for events
  useEffect(() => {
    const handleNavigateToPath = (event: CustomEvent) => {
      const path = event.detail.path;
      console.log('🎯 MainPanel: Received navigation event for:', path);
      navigateToPath(path);
    };

    // Listen for custom events
    window.addEventListener('navigate-terminal', handleNavigateToPath as EventListener);

    // Expose functions globally
    (window as any).navigateTerminalToPath = navigateToPath;

    return () => {
      window.removeEventListener('navigate-terminal', handleNavigateToPath as EventListener);
      delete (window as any).navigateTerminalToPath;
    };
  }, []);

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

  // Realtime error detection - refresh problems every 5 seconds
  useEffect(() => {
    if (!workspacePath) return;

    const interval = setInterval(() => {
      console.log('🔄 MainPanel: Auto-refreshing problems...');
      analyzeWorkspaceProblems();
    }, 5000); // Refresh every 5 seconds

    return () => {
      clearInterval(interval);
    };
  }, [workspacePath]);

  // Listen for file changes to trigger immediate problem refresh
  useEffect(() => {
    const handleFileChange = () => {
      if (workspacePath) {
        console.log('📝 File change detected, refreshing problems...');
        setTimeout(() => {
          analyzeWorkspaceProblems();
        }, 1000); // 1 second delay to allow file save to complete
      }
    };

    // Listen for editor content changes
    window.addEventListener('file-changed', handleFileChange);
    
    return () => {
      window.removeEventListener('file-changed', handleFileChange);
    };
  }, [workspacePath]);

  // Auto-refresh problems when file content changes
  useEffect(() => {
    if (workspacePath && filePath && isDirty) {
      console.log('🔄 File changed, auto-refreshing problems...');
      // Debounce để tránh quá nhiều requests
      const debounceTimer = setTimeout(() => {
        analyzeWorkspaceProblems();
      }, 1000); // Refresh sau 1s không có thay đổi
      
      return () => clearTimeout(debounceTimer);
    }
  }, [workspacePath, filePath, fileContent, isDirty]);

  // Periodic refresh problems (mỗi 30s)
  useEffect(() => {
    if (!workspacePath) return;
    
    const intervalId = setInterval(() => {
      console.log('⏰ Periodic problems refresh...');
      analyzeWorkspaceProblems();
    }, 30000); // 30 seconds
    
    return () => clearInterval(intervalId);
  }, [workspacePath]);

  const analyzeWorkspaceProblems = async () => {
    if (!workspacePath) return;
    
    setIsAnalyzing(true);
    try {
      const result = await invoke('analyze_workspace_problems', { 
        workspacePath: workspacePath 
      }) as ProblemsData;
      
      setProblemsData(result);
      
      // Convert to flat list for backward compatibility
      const allProblems: Problem[] = [];
      result.fileGroups.forEach(group => {
        group.problems.forEach(problem => {
          allProblems.push(problem);
        });
      });
      
    } catch (error) {
      console.error('Failed to analyze workspace problems:', error);
      setProblemsData({ fileGroups: [], totalProblems: 0 });
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Refresh problems manually
  const refreshProblems = () => {
    analyzeWorkspaceProblems();
  };

  const createNewTerminal = (path?: string) => {
    const terminalPath = path || workspacePath || '';
    const pathName = terminalPath.split('/').pop() || 'Root';
    
    const newTerminal: TerminalSession = {
      id: `terminal-${Date.now()}`,
      name: `💻 ${pathName}`,
      history: [{
        command: '',
        output: `Welcome to Supreme IDE Terminal!
Current directory: ${terminalPath}
Type 'help' for available commands.`,
        timestamp: new Date()
      }],
      currentPath: terminalPath
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



  const getWorkspaceName = (): string => {
    return workspacePath ? workspacePath.split('/').pop() || 'Workspace' : 'No Workspace';
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
    
    // Update active tab content and mark as dirty
    setCodeTabs(prev => prev.map(tab => {
      if (tab.isActive) {
        return { ...tab, content: value || '', isDirty: true };
      }
      return tab;
    }));
    
    // Emit file change event for realtime error detection
    const event = new CustomEvent('file-changed');
    window.dispatchEvent(event);
  };

  const activeTerminal = terminals.find(t => t.id === activeTerminalId);

  const getTabCount = (tab: BottomTabType) => {
    switch (tab) {
      case 'terminal': return terminals.length;
      case 'problems': return problemsData.totalProblems;
      case 'output': return outputEntries.length;
      case 'debug': return debugEntries.length;
      case 'ports': return ports.length;
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
                    onClick={() => createNewTerminal()}
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
                <span>Problems ({problemsData.totalProblems})</span>
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
                  title="Clear Problems"
                  onClick={() => setProblemsData({ fileGroups: [], totalProblems: 0 })}
                >
                  🗑️
                </button>
              </div>
            </div>
            
            {problemsData.fileGroups.length === 0 ? (
              <div className={styles.emptyState}>
                {isAnalyzing ? (
                  <div>
                    <div className={styles.loadingSpinner}>⚡</div>
                    <div>Analyzing workspace...</div>
                  </div>
                ) : (
                  <div>
                    <div>🎉</div>
                    <div>No problems found</div>
                  </div>
                )}
              </div>
            ) : (
              <div className={styles.problemsList}>
                {problemsData.fileGroups.map((group) => {
                  const isCollapsed = collapsedGroups.has(group.filePath);
                  return (
                    <div key={group.filePath} className={styles.fileGroup}>
                      <div 
                        className={styles.fileHeader}
                        onClick={() => toggleGroupCollapse(group.filePath)}
                      >
                        <span className={styles.collapseIcon}>
                          {isCollapsed ? '▶' : '▼'}
                        </span>
                        <span className={styles.fileIcon}>{group.icon}</span>
                        <span className={styles.fileName}>{group.fileName}</span>
                        <span className={styles.filePath}>{group.filePath}</span>
                        <span className={styles.problemCount}>({group.problemCount})</span>
                      </div>
                      
                      {!isCollapsed && (
                        <div className={styles.problemsGroup}>
                          {group.problems.map((problem, index) => (
                            <div 
                              key={`${group.filePath}-${index}`} 
                              className={`${styles.problemItem} ${styles[problem.severity]}`}
                              onClick={() => handleProblemClick(problem)}
                              title={problem.quickFix || problem.relatedInformation}
                            >
                              <div className={styles.problemHeader}>
                                <span className={`${styles.problemIcon} ${styles[problem.severity]}`}>
                                  {getProblemIcon(problem.severity)}
                                </span>
                                <span className={styles.sourceIcon}>
                                  {getSourceIcon(problem.source)}
                                </span>
                                <span className={styles.problemLocation}>
                                  [Ln {problem.line}, Col {problem.column}]
                                </span>
                              </div>
                              <div className={styles.problemContent}>
                                <span className={styles.problemMessage}>
                                  {problem.message}
                                </span>
                                {problem.code && (
                                  <span className={styles.problemCode}>
                                    {problem.code}
                                  </span>
                                )}
                              </div>
                              {problem.category && (
                                <div className={styles.problemCategory}>
                                  {problem.category}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
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

  // Navigation handlers
  const openFileInEditor = useCallback(async (filePath: string, line?: number, column?: number) => {
    try {
      console.log('🔄 Opening file in editor:', filePath);
      
      // Check if tab already exists
      const existingTabIndex = codeTabs.findIndex(tab => tab.path === filePath);
      
      if (existingTabIndex >= 0) {
        // Switch to existing tab
        const existingTab = codeTabs[existingTabIndex];
        console.log('✅ Switching to existing tab:', existingTab.name);
        setActiveCodeTab(existingTab.id);
        setCodeTabs(prev => prev.map(tab => ({
          ...tab,
          isActive: tab.id === existingTab.id
        })));
      } else {
        // Create new tab for file
        const fileName = filePath.split('/').pop() || filePath;
        const fileLanguage = getLanguageFromPath(filePath);
        
        console.log('➕ Creating new tab:', fileName, 'Language:', fileLanguage);
        
        const newTab: CodeTab = {
          id: `tab-${Date.now()}`,
          name: fileName,
          path: filePath,
          content: '',
          language: fileLanguage,
          isActive: true,
          isDirty: false
        };

        // Load file content
        try {
          const content = await invoke('read_file_content', {
            filePath: filePath
          }) as string;
          newTab.content = content;
          console.log('✅ File content loaded successfully');
        } catch (contentError) {
          console.warn('⚠️ Could not load file content, using placeholder');
          newTab.content = `// Could not load file: ${filePath}\n// File may not exist or is not accessible`;
        }

        // Deactivate all other tabs and add new tab
        setCodeTabs(prev => [...prev.map(tab => ({ ...tab, isActive: false })), newTab]);
        setActiveCodeTab(newTab.id);
        console.log('✅ New tab created and activated');
      }

      // Navigate to line/column if specified (for error/problem navigation)
      if (line !== undefined) {
        console.log(`🎯 Navigating to line ${line}, column ${column || 1}`);
        // Emit event for CodeEditor to scroll to line
        setTimeout(() => {
          const event = new CustomEvent('scroll-to-line', {
            detail: { line, column: column || 1 }
          });
          window.dispatchEvent(event);
        }, existingTabIndex >= 0 ? 100 : 300); // Longer delay for new tabs
      }

    } catch (error) {
      console.error('❌ Failed to open file in editor:', error);
    }
  }, [codeTabs, activeCodeTab]);

  const closeCodeTab = (tabId: string) => {
    console.log('🗑️ Closing tab:', tabId);
    setCodeTabs(prev => {
      const filtered = prev.filter(tab => tab.id !== tabId);
      
      // If we're closing the active tab, switch to another tab
      if (activeCodeTab === tabId) {
        if (filtered.length > 0) {
          // Find the tab that was to the right of the closed tab, or the rightmost tab
          const closedTabIndex = prev.findIndex(tab => tab.id === tabId);
          let newActiveTab;
          
          if (closedTabIndex < filtered.length) {
            // Tab to the right exists
            newActiveTab = filtered[closedTabIndex];
          } else {
            // Use the rightmost tab
            newActiveTab = filtered[filtered.length - 1];
          }
          
          setActiveCodeTab(newActiveTab.id);
          return filtered.map(tab => ({
            ...tab,
            isActive: tab.id === newActiveTab.id
          }));
        } else {
          // No tabs left
          setActiveCodeTab('');
          return filtered;
        }
      }
      
      return filtered;
    });
  };

  const switchCodeTab = (tabId: string) => {
    console.log('🔄 Switching to tab:', tabId);
    setActiveCodeTab(tabId);
    setCodeTabs(prev => prev.map(tab => ({
      ...tab,
      isActive: tab.id === tabId
    })));
  };

  const getLanguageFromPath = (filePath: string): string => {
    const ext = filePath.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'ts': return 'typescript';
      case 'tsx': return 'typescript';
      case 'js': return 'javascript';
      case 'jsx': return 'javascript';
      case 'py': return 'python';
      case 'rs': return 'rust';
      case 'json': return 'json';
      case 'css': return 'css';
      case 'html': return 'html';
      default: return 'text';
    }
  };

  const getLanguageIcon = (language: string): string => {
    switch (language.toLowerCase()) {
      case 'typescript': return 'TS';
      case 'javascript': return 'JS';
      case 'python': return 'PY';
      case 'rust': return 'RS';
      case 'json': return 'JSON';
      case 'css': return 'CSS';
      case 'html': return 'HTML';
      default: return '📄';
    }
  };

  const toggleGroupCollapse = (groupPath: string) => {
    setCollapsedGroups(prev => {
      const newSet = new Set(prev);
      if (newSet.has(groupPath)) {
        newSet.delete(groupPath);
      } else {
        newSet.add(groupPath);
      }
      return newSet;
    });
  };

  const getProblemIcon = (severity: string) => {
    switch (severity) {
      case 'error':
        return '❌';
      case 'warning':
        return '⚠️';
      case 'info':
        return 'ℹ️';
      default:
        return '•';
    }
  };



  const getSourceIcon = (source: string) => {
    switch (source.toLowerCase()) {
      case 'ts':
      case 'typescript':
        return '🟦';
      case 'pylance':
      case 'python':
        return '🐍';
      case 'rust':
        return '🦀';
      case 'javascript':
      case 'js':
        return '🟨';
      default:
        return '📄';
    }
  };

  const handleProblemClick = (problem: Problem) => {
    console.log('🔍 Clicked on problem:', problem.message, 'File:', problem.file);
    // Navigate to file and line - this will automatically open tab and switch to it
    openFileInEditor(problem.file, problem.line, problem.column);
  };



  // Expose openFileInEditor globally for FileExplorer
  useEffect(() => {
    const handleOpenFileInEditor = (event: CustomEvent) => {
      const filePath = event.detail.filePath;
      const line = event.detail.line;
      const column = event.detail.column;
      console.log('📂 MainPanel: Received file open event for:', filePath);
      openFileInEditor(filePath, line, column);
    };

    // Listen for custom events
    window.addEventListener('open-file-in-editor', handleOpenFileInEditor as EventListener);

    // Expose function globally
    (window as any).openFileInEditor = openFileInEditor;

    return () => {
      window.removeEventListener('open-file-in-editor', handleOpenFileInEditor as EventListener);
      delete (window as any).openFileInEditor;
    };
  }, []);

  return (
    <div className={styles.container}>
      {/* Code Tabs Bar - Positioned at top like VS Code */}
      {codeTabs.length > 0 && (
        <div className={styles.codeTabsContainer}>
          <div className={styles.codeTabsBar}>
            {codeTabs.map((tab) => (
              <div
                key={tab.id}
                className={`${styles.codeTab} ${tab.isActive ? styles.activeTab : ''}`}
                onClick={() => switchCodeTab(tab.id)}
                title={tab.path} // Show full path on hover
              >
                <span className={styles.tabIcon}>
                  {getLanguageIcon(tab.language)}
                </span>
                <span className={styles.tabName}>{tab.name}</span>
                {tab.isDirty && <span className={styles.tabDirty}>●</span>}
                <button
                  className={styles.tabCloseButton}
                  onClick={(e) => {
                    e.stopPropagation();
                    closeCodeTab(tab.id);
                  }}
                  title="Close tab"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className={styles.mainContent}>
        <PanelGroup direction="vertical" className={styles.panelGroup}>
          {/* Editor Panel */}
          <Panel defaultSize={70} minSize={30} className={styles.editorPanelWrapper}>
            <div className={styles.editorPanel}>
              {/* Editor Content - show content of active tab or default */}
              {codeTabs.length > 0 ? (
                // Show content from active tab
                <CodeEditor
                  value={codeTabs.find(tab => tab.isActive)?.content || '// No content available'}
                  onChange={handleEditorChange}
                  language={codeTabs.find(tab => tab.isActive)?.language || 'text'}
                />
              ) : (
                // Show default content when no tabs open
                <CodeEditor
                  value={'// Không có file nào được mở\n// Click vào lỗi trong Problems panel để mở file\n// Hoặc dùng File Explorer để mở file'}
                  onChange={handleEditorChange}
                  language="text"
                />
              )}
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
    </div>
  );
};

export default MainPanel;