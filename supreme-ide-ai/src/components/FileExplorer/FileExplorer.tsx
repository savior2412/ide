// src/components/FileExplorer/FileExplorer.tsx (ENHANCED)
import styles from './FileExplorer.module.css';
import { invoke } from '@tauri-apps/api/core';
import { useState } from 'react';

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
  tree: FileEntry[];
  onOpenFile: (path: string, content: string) => void;
}

const FileExplorer = ({ tree, onOpenFile }: FileExplorerProps) => {
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());

  const handleFileClick = async (filePath: string) => {
    try {
      const content = await invoke('open_file', { path: filePath }) as string;
      onOpenFile(filePath, content);
    } catch (e) {
      console.error('Không thể mở file:', e);
    }
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
    <aside className={`${styles.container} border-glow-cyan`}>
      <div className={styles.header}>
        <h2 className={`${styles.title} text-glow-cyan`}>Explorer</h2>
      </div>
      <nav className={styles.nav}>
        {tree && tree.length > 0 ? renderTree(tree) : (
          <div style={{ color: '#888', padding: 16, textAlign: 'center' }}>
            <p>Chưa mở thư mục nào</p>
            <p style={{ fontSize: '12px', marginTop: 8 }}>
              File → Open Folder (Ctrl+Shift+O)
            </p>
          </div>
        )}
      </nav>
    </aside>
  );
};

export default FileExplorer;