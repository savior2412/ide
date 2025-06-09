// src/components/FileExplorer/FileExplorer.tsx (ENHANCED WITH CONTEXT MENU)
import styles from './FileExplorer.module.css';
import { useState, useRef, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import FileTree from './FileTree';

// SVG Icons as React Components for reusability
const FileIcon = ({ extension }: { extension?: string }) => {
  const getIconColor = (ext?: string) => {
    if (!ext) return '#9ca3af';
    switch (ext.toLowerCase()) {
      case 'js': case 'jsx': return '#f7df1e';
      case 'ts': case 'tsx': return '#3178c6';
      case 'py': return '#3776ab';
      case 'html': return '#e34f26';
      case 'css': return '#1572b6';
      case 'json': return '#000000';
      case 'md': return '#000000';
      case 'rs': return '#ce422b';
      case 'go': return '#00add8';
      case 'java': return '#ed8b00';
      case 'cpp': case 'c': return '#00599c';
      default: return '#9ca3af';
    }
  };

  return (
    <svg className={styles.fileIcon} fill="none" stroke={getIconColor(extension)} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"></path>
    </svg>
  );
};

const FolderIcon = ({ isOpen }: { isOpen: boolean }) => (
  <svg className={styles.fileIcon} fill="none" stroke="#67e8f9" viewBox="0 0 24 24">
    {isOpen ? (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"></path>
    ) : (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"></path>
    )}
  </svg>
);

const ChevronIcon = ({ isOpen }: { isOpen: boolean }) => (
  <svg 
    className={`${styles.chevronIcon} ${isOpen ? styles.chevronOpen : ''}`} 
    fill="none" 
    stroke="currentColor" 
    viewBox="0 0 24 24"
  >
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path>
  </svg>
);

interface FileEntry {
  name: string;
  path: string;
  is_dir: boolean;
  children?: FileEntry[];
}

interface FileExplorerProps {
  fileTree: FileEntry[];
  onFileSelect: (path: string) => void;
  onRefresh?: () => void;
  workspacePath?: string;
}

interface ContextMenuState {
  visible: boolean;
  x: number;
  y: number;
  targetPath: string;
  isDirectory: boolean;
}

interface InputModalState {
  visible: boolean;
  title: string;
  placeholder: string;
  defaultValue: string;
  onConfirm: (value: string) => void;
  onCancel: () => void;
}

const FileExplorer = ({ fileTree, onFileSelect, onRefresh, workspacePath }: FileExplorerProps) => {
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [activeFile, setActiveFile] = useState<string>('');
  const [showShortcuts, setShowShortcuts] = useState<boolean>(false);
  const [contextMenu, setContextMenu] = useState<ContextMenuState>({
    visible: false,
    x: 0,
    y: 0,
    targetPath: '',
    isDirectory: false
  });
  const [inputModal, setInputModal] = useState<InputModalState>({
    visible: false,
    title: '',
    placeholder: '',
    defaultValue: '',
    onConfirm: () => {},
    onCancel: () => {}
  });
  
  const contextMenuRef = useRef<HTMLDivElement>(null);
  const fileExplorerRef = useRef<HTMLDivElement>(null);

  // Detect OS for keyboard shortcuts
  const isMac = typeof navigator !== 'undefined' && navigator.platform.toUpperCase().indexOf('MAC') >= 0;
  const cmdKey = isMac ? '⌘' : 'Ctrl';

  // Helper function to show input modal
  const showInputModal = (title: string, placeholder: string, defaultValue: string): Promise<string | null> => {
    return new Promise((resolve) => {
      setInputModal({
        visible: true,
        title,
        placeholder,
        defaultValue,
        onConfirm: (value: string) => {
          setInputModal(prev => ({ ...prev, visible: false }));
          resolve(value);
        },
        onCancel: () => {
          setInputModal(prev => ({ ...prev, visible: false }));
          resolve(null);
        }
      });
    });
  };

  // Helper function for delete confirmation
  const showDeleteConfirmation = (fileName: string): Promise<boolean> => {
    return new Promise((resolve) => {
      setInputModal({
        visible: true,
        title: 'Xác nhận xóa',
        placeholder: `Nhập tên file "${fileName}" để xác nhận`,
        defaultValue: '',
        onConfirm: (value: string) => {
          setInputModal(prev => ({ ...prev, visible: false }));
          resolve(value === fileName);
        },
        onCancel: () => {
          setInputModal(prev => ({ ...prev, visible: false }));
          resolve(false);
        }
      });
    });
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (contextMenuRef.current && !contextMenuRef.current.contains(event.target as Node)) {
        setContextMenu(prev => ({ ...prev, visible: false }));
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      const isCmd = isMac ? event.metaKey : event.ctrlKey;
      
      // Show/hide shortcuts help
      if (isCmd && event.key === '/') {
        event.preventDefault();
        setShowShortcuts(prev => !prev);
        return;
      }
      
      // Global shortcuts
      if (isCmd && event.shiftKey && event.key === 'N') {
        event.preventDefault();
        handleNewFile();
      } else if (isCmd && event.shiftKey && event.key === 'F') {
        event.preventDefault();
        handleNewFolder();
      } else if (event.key === 'F2' && activeFile) {
        event.preventDefault();
        handleRename(activeFile);
      } else if (event.key === 'Delete' && activeFile) {
        event.preventDefault();
        handleDelete(activeFile);
      } else if (isCmd && event.key === 'c' && activeFile) {
        event.preventDefault();
        handleCopyPath(activeFile);
      } else if (event.key === 'Escape') {
        setContextMenu(prev => ({ ...prev, visible: false }));
        setShowShortcuts(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [activeFile, isMac]);

  const handleFileClick = async (filePath: string) => {
    setActiveFile(filePath);
    onFileSelect(filePath);
  };

  const handleRightClick = (e: React.MouseEvent, path: string, isDirectory: boolean) => {
    e.preventDefault();
    e.stopPropagation();
    
    console.log('🖱️ Right click on:', path, 'isDir:', isDirectory);
    
    setContextMenu({
      visible: true,
      x: e.clientX,
      y: e.clientY,
      targetPath: path,
      isDirectory
    });
  };

  const handleContainerRightClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    console.log('🖱️ Right click on workspace');
    
    setContextMenu({
      visible: true,
      x: e.clientX,
      y: e.clientY,
      targetPath: '',
      isDirectory: true
    });
  };

  const toggleFolder = (folderPath: string) => {
    const newExpanded = new Set(expandedFolders);
    if (newExpanded.has(folderPath)) {
      newExpanded.delete(folderPath);
    } else {
      newExpanded.add(folderPath);
    }
    setExpandedFolders(newExpanded);
  };

  const sortEntries = (entries: FileEntry[]) => {
    return [...entries].sort((a, b) => {
      // Folders first, then files
      if (a.is_dir && !b.is_dir) return -1;
      if (!a.is_dir && b.is_dir) return 1;
      // Then alphabetically
      return a.name.toLowerCase().localeCompare(b.name.toLowerCase());
    });
  };

  const getFileExtension = (filename: string) => {
    return filename.split('.').pop()?.toLowerCase();
  };

  const handleNewFile = async (targetPath?: string) => {
    console.log('🔧 handleNewFile called with targetPath:', targetPath);
    console.log('🔧 workspacePath:', workspacePath);
    
    const fileName = await showInputModal('Tạo file mới', 'Nhập tên file...', 'untitled.txt');
    console.log('📝 User entered fileName:', fileName);
    
    if (fileName) {
      try {
        // Build absolute path
        let newFilePath: string;
        if (targetPath) {
          newFilePath = `${targetPath}/${fileName}`;
        } else if (workspacePath) {
          newFilePath = `${workspacePath}/${fileName}`;
        } else {
          newFilePath = fileName;
        }
        
        console.log('🔧 Creating file at:', newFilePath);
        console.log('🔧 About to invoke create_new_file...');
        
        await invoke('create_new_file', { filePath: newFilePath });
        
        console.log('📝 Created new file:', newFilePath);
        console.log('🔄 About to call onRefresh...');
        
        if (onRefresh) {
          onRefresh();
          console.log('✅ onRefresh called successfully');
        } else {
          console.warn('⚠️ onRefresh is not available');
        }
      } catch (error) {
        console.error('❌ Failed to create file:', error);
        alert(`Lỗi tạo file: ${error}`);
      }
    } else {
      console.log('❌ User cancelled file creation');
    }
  };

  const handleNewFolder = async (targetPath?: string) => {
    console.log('🔧 handleNewFolder called with targetPath:', targetPath);
    console.log('🔧 workspacePath:', workspacePath);
    
    const folderName = await showInputModal('Tạo thư mục mới', 'Nhập tên thư mục...', 'New Folder');
    console.log('📁 User entered folderName:', folderName);
    
    if (folderName) {
      try {
        // Build absolute path
        let newFolderPath: string;
        if (targetPath) {
          newFolderPath = `${targetPath}/${folderName}`;
        } else if (workspacePath) {
          newFolderPath = `${workspacePath}/${folderName}`;
        } else {
          newFolderPath = folderName;
        }
        
        console.log('🔧 Creating folder at:', newFolderPath);
        console.log('🔧 About to invoke create_new_folder...');
        
        await invoke('create_new_folder', { folderPath: newFolderPath });
        
        console.log('📁 Created new folder:', newFolderPath);
        console.log('🔄 About to call onRefresh...');
        
        if (onRefresh) {
          onRefresh();
          console.log('✅ onRefresh called successfully');
        } else {
          console.warn('⚠️ onRefresh is not available');
        }
      } catch (error) {
        console.error('❌ Failed to create folder:', error);
        alert(`Lỗi tạo thư mục: ${error}`);
      }
    } else {
      console.log('❌ User cancelled folder creation');
    }
  };

  const handleRename = async (targetPath: string) => {
    const currentName = targetPath.split('/').pop() || '';
    const newName = await showInputModal('Đổi tên', 'Nhập tên mới...', currentName);
    if (newName && newName !== currentName) {
      try {
        const pathWithoutName = targetPath.substring(0, targetPath.lastIndexOf('/'));
        const newPath = pathWithoutName ? `${pathWithoutName}/${newName}` : newName;
        await invoke('rename_file_or_folder', { oldPath: targetPath, newPath });
        console.log('✏️ Renamed:', targetPath, '→', newPath);
        onRefresh?.();
      } catch (error) {
        console.error('❌ Failed to rename:', error);
        alert(`Lỗi đổi tên: ${error}`);
      }
    }
  };

  const handleDelete = async (targetPath: string) => {
    const fileName = targetPath.split('/').pop() || targetPath;
    const shouldDelete = await showDeleteConfirmation(fileName);
    
    if (shouldDelete) {
      try {
        await invoke('delete_file_or_folder', { path: targetPath });
        console.log('🗑️ Deleted:', targetPath);
        onRefresh?.();
      } catch (error) {
        console.error('❌ Failed to delete:', error);
        alert(`Lỗi xóa: ${error}`);
      }
    }
  };

  const handleCopyPath = async (targetPath: string) => {
    try {
      await navigator.clipboard.writeText(targetPath);
      console.log('📋 Copied path:', targetPath);
      // Show temporary feedback
      const notification = document.createElement('div');
      notification.textContent = 'Path copied!';
      notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #00d4ff;
        color: black;
        padding: 8px 16px;
        border-radius: 4px;
        z-index: 999999;
        font-size: 12px;
      `;
      document.body.appendChild(notification);
      setTimeout(() => document.body.removeChild(notification), 2000);
    } catch (error) {
      console.error('❌ Failed to copy path:', error);
    }
  };

  const handleOpenTerminal = (targetPath: string) => {
    // If targetPath is a file, get its parent directory
    const { isDirectory } = contextMenu;
    let terminalPath = targetPath;
    
    if (targetPath && !isDirectory) {
      // For files, navigate to parent directory
      terminalPath = targetPath.substring(0, targetPath.lastIndexOf('/')) || workspacePath || '.';
    } else if (!targetPath) {
      // For workspace root
      terminalPath = workspacePath || '.';
    }
    
    console.log('⚡ Opening terminal in:', terminalPath, `(original: ${targetPath}, isDirectory: ${isDirectory})`);
    
          // Try using the global function first (cleaner approach)
      if ((window as any).navigateTerminalToPath) {
        console.log('🎯 Using global navigation function');
        try {
          (window as any).navigateTerminalToPath(terminalPath);
          console.log('✅ Global function called successfully');
          return;
        } catch (error) {
          console.error('❌ Global function failed:', error);
        }
      }
      
      // Fallback: dispatch custom event
      console.log('📡 Using custom event approach');
      const event = new CustomEvent('navigate-terminal', {
        detail: { path: terminalPath }
      });
      window.dispatchEvent(event);
    
          // Legacy fallback (keep as last resort)
      setTimeout(() => {
        const terminalTab = document.querySelector('[data-tab="terminal"]') as HTMLElement;
        if (terminalTab && !document.querySelector('.activeTab[data-tab="terminal"]')) {
          console.log('🔄 Fallback: clicking terminal tab');
          terminalTab.click();
        }
      }, 100);
  };

  const handleContextMenuAction = async (action: string) => {
    const { targetPath, isDirectory } = contextMenu;
    
    console.log(`🔧 Context menu action: ${action} on ${targetPath || 'workspace'}`);
    console.log(`📋 Full context:`, { action, targetPath, isDirectory, workspacePath });
    
    try {
      switch (action) {
        case 'new-file':
          console.log('🆕 Executing new-file action...');
          await handleNewFile(targetPath);
          console.log('✅ New file action completed');
          break;
          
        case 'new-folder':
          console.log('🆕 Executing new-folder action...');
          await handleNewFolder(targetPath);
          console.log('✅ New folder action completed');
          break;
          
        case 'rename':
          console.log('✏️ Executing rename action...');
          if (!targetPath) {
            console.error('❌ Cannot rename: no target path');
            alert('Không thể đổi tên: không có file/folder được chọn');
            return;
          }
          await handleRename(targetPath);
          console.log('✅ Rename action completed');
          break;
          
        case 'delete':
          console.log('🗑️ Executing delete action...');
          if (!targetPath) {
            console.error('❌ Cannot delete: no target path');
            alert('Không thể xóa: không có file/folder được chọn');
            return;
          }
          await handleDelete(targetPath);
          console.log('✅ Delete action completed');
          break;
          
        case 'copy-path':
          console.log('📋 Executing copy-path action...');
          if (!targetPath) {
            console.error('❌ Cannot copy path: no target path');
            alert('Không thể copy đường dẫn: không có file/folder được chọn');
            return;
          }
          await handleCopyPath(targetPath);
          console.log('✅ Copy path action completed');
          break;
          
        case 'open-terminal':
          console.log('⚡ Executing open-terminal action...');
          handleOpenTerminal(targetPath);
          console.log('✅ Open terminal action completed');
          break;
          
        case 'run-python':
        case 'run-node':
        case 'run-rust':
          console.log(`🏃 Executing ${action} action...`);
          const result = await invoke('run_file_in_terminal', { 
            filePath: targetPath, 
            workspacePath: workspacePath || '.' 
          });
          console.log(`🏃 Run result:`, result);
          break;
          
        default:
          console.warn('❓ Unknown context menu action:', action);
      }
    } catch (error) {
      console.error('❌ Context menu action failed:', error);
      alert(`Lỗi: ${error}`);
    }
    
    setContextMenu(prev => ({ ...prev, visible: false }));
  };

  const renderTree = (nodes: FileEntry[], level = 0) => (
    <ul style={{ listStyle: 'none', paddingLeft: level * 12, margin: 0 }}>
      {sortEntries(nodes).map((node) => {
        const isExpanded = expandedFolders.has(node.path);
        const extension = node.name.split('.').pop();

        return (
          <li key={node.path} style={{ marginBottom: 1 }}>
            {node.is_dir ? (
              <div>
                <div 
                  className={styles.fileItem}
                  style={{ 
                    color: '#67e8f9', 
                    fontWeight: 500,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4
                  }}
                  onClick={() => toggleFolder(node.path)}
                  onContextMenu={(e) => handleRightClick(e, node.path, true)}
                >
                  <ChevronIcon isOpen={isExpanded} />
                  <FolderIcon isOpen={isExpanded} />
                  {node.name}
                </div>
                {isExpanded && node.children && renderTree(node.children, level + 1)}
              </div>
            ) : (
              <div
                className={styles.fileItem}
                style={{ 
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  paddingLeft: 20
                }}
                onClick={() => handleFileClick(node.path)}
                onContextMenu={(e) => handleRightClick(e, node.path, false)}
              >
                <FileIcon extension={extension} />
                {node.name}
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );

  const renderContextMenu = () => {
    if (!contextMenu.visible) return null;

    const { targetPath, isDirectory } = contextMenu;
    const extension = targetPath ? getFileExtension(targetPath) : null;
    const isWorkspace = !targetPath;

    // Improved viewport positioning
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const menuWidth = 240;
    const menuHeight = 320;
    
    let adjustedX = contextMenu.x;
    let adjustedY = contextMenu.y;
    
    if (contextMenu.x + menuWidth > viewportWidth) {
      adjustedX = Math.max(10, viewportWidth - menuWidth - 10);
    }
    
    if (contextMenu.y + menuHeight > viewportHeight) {
      adjustedY = Math.max(10, viewportHeight - menuHeight - 10);
    }

    return (
      <div
        ref={contextMenuRef}
        className={styles.contextMenu}
        style={{
          left: adjustedX,
          top: adjustedY,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* New File/Folder options */}
        <div 
          className={styles.contextMenuItem} 
          onClick={(e) => {
            console.log('🔧 Context menu item clicked: new-file');
            e.stopPropagation();
            handleContextMenuAction('new-file');
          }}
        >
          <span>📝</span>
          <span>New File</span>
          <span className={styles.shortcut}>{cmdKey}+Shift+N</span>
        </div>
        <div 
          className={styles.contextMenuItem} 
          onClick={(e) => {
            console.log('🔧 Context menu item clicked: new-folder');
            e.stopPropagation();
            handleContextMenuAction('new-folder');
          }}
        >
          <span>📁</span>
          <span>New Folder</span>
          <span className={styles.shortcut}>{cmdKey}+Shift+F</span>
        </div>
        
        {!isWorkspace && (
          <>
            <div className={styles.contextMenuSeparator}></div>
            
            {/* File/Folder specific actions */}
            <div 
              className={styles.contextMenuItem} 
              onClick={(e) => {
                console.log('🔧 Context menu item clicked: rename');
                e.stopPropagation();
                handleContextMenuAction('rename');
              }}
            >
              <span>✏️</span>
              <span>Rename</span>
              <span className={styles.shortcut}>F2</span>
            </div>
            <div 
              className={styles.contextMenuItem} 
              onClick={(e) => {
                console.log('🔧 Context menu item clicked: delete');
                e.stopPropagation();
                handleContextMenuAction('delete');
              }}
            >
              <span>🗑️</span>
              <span>Delete</span>
              <span className={styles.shortcut}>Del</span>
            </div>
            <div 
              className={styles.contextMenuItem} 
              onClick={(e) => {
                console.log('🔧 Context menu item clicked: copy-path');
                e.stopPropagation();
                handleContextMenuAction('copy-path');
              }}
            >
              <span>📋</span>
              <span>Copy Path</span>
              <span className={styles.shortcut}>{cmdKey}+C</span>
            </div>
            
            <div className={styles.contextMenuSeparator}></div>
            
            {/* Run options based on file type */}
            {!isDirectory && extension === 'py' && (
              <div className={styles.contextMenuItem} onClick={() => handleContextMenuAction('run-python')}>
                <span>🐍</span>
                <span>Run Python File</span>
              </div>
            )}
            {!isDirectory && (extension === 'js' || extension === 'mjs') && (
              <div className={styles.contextMenuItem} onClick={() => handleContextMenuAction('run-node')}>
                <span>📜</span>
                <span>Run with Node.js</span>
              </div>
            )}
            {!isDirectory && extension === 'rs' && (
              <div className={styles.contextMenuItem} onClick={() => handleContextMenuAction('run-rust')}>
                <span>🦀</span>
                <span>Run Rust File</span>
              </div>
            )}
            
            {/* Terminal option - Show for both files and directories */}
            <div className={styles.contextMenuItem} onClick={() => {
              console.log('🔧 Context menu item clicked: open-terminal');
              handleContextMenuAction('open-terminal');
            }}>
              <span>⚡</span>
              <span>Open Terminal Here</span>
            </div>
          </>
        )}
        
        {/* Terminal option for workspace */}
        {isWorkspace && (
          <>
            <div className={styles.contextMenuSeparator}></div>
            <div className={styles.contextMenuItem} onClick={() => {
              console.log('🔧 Context menu item clicked: open-terminal (workspace)');
              handleContextMenuAction('open-terminal');
            }}>
              <span>⚡</span>
              <span>Open Terminal Here</span>
            </div>
          </>
        )}
      </div>
    );
  };

  const renderShortcutsHelp = () => {
    if (!showShortcuts) return null;

    const shortcuts = [
      { key: `${cmdKey}+Shift+N`, action: 'New File' },
      { key: `${cmdKey}+Shift+F`, action: 'New Folder' },
      { key: 'F2', action: 'Rename Selected' },
      { key: 'Delete', action: 'Delete Selected' },
      { key: `${cmdKey}+C`, action: 'Copy Path' },
      { key: 'Right Click', action: 'Context Menu' },
      { key: `${cmdKey}+/`, action: 'Toggle This Help' },
      { key: 'Esc', action: 'Close Menu/Help' },
    ];

    return (
      <div className={styles.shortcutsOverlay}>
        <div className={styles.shortcutsModal}>
          <div className={styles.shortcutsHeader}>
            <h3>⌨️ Keyboard Shortcuts</h3>
            <button onClick={() => setShowShortcuts(false)}>✕</button>
          </div>
          <div className={styles.shortcutsList}>
            {shortcuts.map((shortcut, index) => (
              <div key={index} className={styles.shortcutItem}>
                <span className={styles.shortcutKey}>{shortcut.key}</span>
                <span className={styles.shortcutAction}>{shortcut.action}</span>
              </div>
            ))}
          </div>
          <div className={styles.shortcutsFooter}>
            <small>Press {cmdKey}+/ to toggle this help</small>
          </div>
        </div>
      </div>
    );
  };

  const renderInputModal = () => {
    if (!inputModal.visible) return null;

    return (
      <div className={styles.inputModalOverlay}>
        <div className={styles.inputModalContent}>
          <div className={styles.inputModalHeader}>
            <h3>{inputModal.title}</h3>
          </div>
          <div className={styles.inputModalBody}>
            <input
              type="text"
              placeholder={inputModal.placeholder}
              defaultValue={inputModal.defaultValue}
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  const value = (e.target as HTMLInputElement).value.trim();
                  if (value) {
                    inputModal.onConfirm(value);
                  } else {
                    inputModal.onCancel();
                  }
                } else if (e.key === 'Escape') {
                  inputModal.onCancel();
                }
              }}
              className={styles.inputModalInput}
            />
          </div>
          <div className={styles.inputModalFooter}>
            <button 
              onClick={() => {
                const input = document.querySelector(`.${styles.inputModalInput}`) as HTMLInputElement;
                const value = input?.value.trim();
                if (value) {
                  inputModal.onConfirm(value);
                } else {
                  inputModal.onCancel();
                }
              }}
              className={styles.inputModalButtonPrimary}
            >
              ✅ OK
            </button>
            <button 
              onClick={inputModal.onCancel}
              className={styles.inputModalButtonSecondary}
            >
              ❌ Cancel
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div 
      className={styles.container} 
      ref={fileExplorerRef}
      onContextMenu={handleContainerRightClick}
    >
      <div className={styles.header}>
        <h2 className={styles.title}>File Explorer</h2>
        <div className={styles.shortcuts}>
          <small style={{ color: '#666', fontSize: '10px' }}>
            {cmdKey}+/ for shortcuts | Ctrl+Shift+F for search
          </small>
        </div>
      </div>
      
      {/* New FileTree Component with Search */}
      <FileTree 
        fileTree={fileTree}
        onFileSelect={onFileSelect}
        workspacePath={workspacePath}
      />
      
      {/* Keep original context menu and modals */}
      {renderContextMenu()}
      {renderShortcutsHelp()}
      {renderInputModal()}
    </div>
  );
};

export default FileExplorer;