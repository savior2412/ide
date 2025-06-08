// src/components/FileExplorer/FileExplorer.tsx (ENHANCED WITH CONTEXT MENU)
import styles from './FileExplorer.module.css';
import { useState, useRef, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';

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
}

interface ContextMenuState {
  visible: boolean;
  x: number;
  y: number;
  targetPath: string;
  isDirectory: boolean;
}

const FileExplorer = ({ fileTree, onFileSelect }: FileExplorerProps) => {
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [contextMenu, setContextMenu] = useState<ContextMenuState>({
    visible: false,
    x: 0,
    y: 0,
    targetPath: '',
    isDirectory: false
  });
  const contextMenuRef = useRef<HTMLDivElement>(null);

  // Close context menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (contextMenuRef.current && !contextMenuRef.current.contains(event.target as Node)) {
        setContextMenu(prev => ({ ...prev, visible: false }));
      }
    };

    if (contextMenu.visible) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [contextMenu.visible]);

  const handleFileClick = async (filePath: string) => {
    onFileSelect(filePath);
  };

  const handleRightClick = (e: React.MouseEvent, path: string, isDirectory: boolean) => {
    e.preventDefault();
    e.stopPropagation();
    
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
    
    // Right click on empty area (workspace)
    setContextMenu({
      visible: true,
      x: e.clientX,
      y: e.clientY,
      targetPath: '', // Empty for workspace
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

  const handleContextMenuAction = async (action: string) => {
    const { targetPath } = contextMenu;
    
    console.log(`🔧 Context menu action: ${action} on ${targetPath || 'workspace'}`);
    
    try {
      switch (action) {
        case 'new-file':
          const fileName = prompt('Tên file mới:', 'untitled.txt');
          if (fileName) {
            const newFilePath = targetPath ? `${targetPath}/${fileName}` : fileName;
            await invoke('create_new_file', { filePath: newFilePath });
            console.log('📝 Created new file:', newFilePath);
            // TODO: Refresh file tree
          }
          break;
          
        case 'new-folder':
          const folderName = prompt('Tên thư mục mới:', 'New Folder');
          if (folderName) {
            const newFolderPath = targetPath ? `${targetPath}/${folderName}` : folderName;
            await invoke('create_new_folder', { folderPath: newFolderPath });
            console.log('📁 Created new folder:', newFolderPath);
            // TODO: Refresh file tree
          }
          break;
          
        case 'rename':
          const currentName = targetPath.split('/').pop() || '';
          const newName = prompt('Tên mới:', currentName);
          if (newName && newName !== currentName) {
            const pathWithoutName = targetPath.substring(0, targetPath.lastIndexOf('/'));
            const newPath = pathWithoutName ? `${pathWithoutName}/${newName}` : newName;
            await invoke('rename_file_or_folder', { oldPath: targetPath, newPath });
            console.log('✏️ Renamed:', targetPath, '→', newPath);
            // TODO: Refresh file tree
          }
          break;
          
        case 'delete':
          if (confirm(`Bạn có chắc muốn xóa "${targetPath}"?`)) {
            await invoke('delete_file_or_folder', { path: targetPath });
            console.log('🗑️ Deleted:', targetPath);
            // TODO: Refresh file tree
          }
          break;
          
        case 'run-python':
          const pythonResult = await invoke('run_file_in_terminal', { 
            filePath: targetPath, 
            workspacePath: '.' 
          });
          console.log('🐍 Python result:', pythonResult);
          break;
          
        case 'run-node':
          const nodeResult = await invoke('run_file_in_terminal', { 
            filePath: targetPath, 
            workspacePath: '.' 
          });
          console.log('📜 Node.js result:', nodeResult);
          break;
          
        case 'run-rust':
          const rustResult = await invoke('run_file_in_terminal', { 
            filePath: targetPath, 
            workspacePath: '.' 
          });
          console.log('🦀 Rust result:', rustResult);
          break;
          
        case 'copy-path':
          await navigator.clipboard.writeText(targetPath);
          console.log('📋 Copied path:', targetPath);
          break;
          
        case 'open-terminal':
          console.log('⚡ Opening terminal in:', targetPath);
          // TODO: Implement open terminal here - this would need integration with terminal component
          break;
      }
    } catch (error) {
      console.error('❌ Context menu action failed:', error);
      alert(`Lỗi: ${error}`);
    }
    
    setContextMenu(prev => ({ ...prev, visible: false }));
  };

  const renderContextMenu = () => {
    if (!contextMenu.visible) return null;

    const { targetPath, isDirectory } = contextMenu;
    const extension = targetPath ? getFileExtension(targetPath) : null;
    const isWorkspace = !targetPath;

    // Adjust position to stay within viewport
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const menuWidth = 220; // estimated width
    const menuHeight = 300; // estimated height
    
    let adjustedX = contextMenu.x;
    let adjustedY = contextMenu.y;
    
    // Adjust horizontal position
    if (contextMenu.x + menuWidth > viewportWidth) {
      adjustedX = Math.max(0, viewportWidth - menuWidth);
    }
    
    // Adjust vertical position
    if (contextMenu.y + menuHeight > viewportHeight) {
      adjustedY = Math.max(0, viewportHeight - menuHeight);
    }

    return (
      <div
        ref={contextMenuRef}
        className={styles.contextMenu}
        style={{
          left: adjustedX,
          top: adjustedY,
        }}
      >
        {/* New File/Folder options */}
        <div className={styles.contextMenuItem} onClick={() => handleContextMenuAction('new-file')}>
          📝 New File
        </div>
        <div className={styles.contextMenuItem} onClick={() => handleContextMenuAction('new-folder')}>
          📁 New Folder
        </div>
        
        {!isWorkspace && (
          <>
            <div className={styles.contextMenuSeparator}></div>
            
            {/* File/Folder specific actions */}
            <div className={styles.contextMenuItem} onClick={() => handleContextMenuAction('rename')}>
              ✏️ Rename
            </div>
            <div className={styles.contextMenuItem} onClick={() => handleContextMenuAction('delete')}>
              🗑️ Delete
            </div>
            <div className={styles.contextMenuItem} onClick={() => handleContextMenuAction('copy-path')}>
              📋 Copy Path
            </div>
            
            <div className={styles.contextMenuSeparator}></div>
            
            {/* Run options based on file type */}
            {!isDirectory && extension === 'py' && (
              <div className={styles.contextMenuItem} onClick={() => handleContextMenuAction('run-python')}>
                🐍 Run Python File
              </div>
            )}
            {!isDirectory && (extension === 'js' || extension === 'mjs') && (
              <div className={styles.contextMenuItem} onClick={() => handleContextMenuAction('run-node')}>
                📜 Run with Node.js
              </div>
            )}
            {!isDirectory && extension === 'rs' && (
              <div className={styles.contextMenuItem} onClick={() => handleContextMenuAction('run-rust')}>
                🦀 Run Rust File
              </div>
            )}
            
            {/* Terminal option */}
            {isDirectory && (
              <div className={styles.contextMenuItem} onClick={() => handleContextMenuAction('open-terminal')}>
                ⚡ Open Terminal Here
              </div>
            )}
          </>
        )}
      </div>
    );
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

  return (
    <aside className={`${styles.container} border-glow-cyan`} onContextMenu={handleContainerRightClick}>
      <div className={styles.header}>
        <h2 className={`${styles.title} text-glow-cyan`}>Explorer</h2>
      </div>
      <nav className={styles.nav}>
        {fileTree && fileTree.length > 0 ? renderTree(fileTree) : (
          <div style={{ color: '#888', padding: 16, textAlign: 'center' }}>
            <p>Chưa mở thư mục nào</p>
            <p style={{ fontSize: '12px', marginTop: 8 }}>
              File → Open Folder (Ctrl+Shift+O)
            </p>
          </div>
        )}
      </nav>
      
      {/* Context Menu */}
      {renderContextMenu()}
    </aside>
  );
};

export default FileExplorer;