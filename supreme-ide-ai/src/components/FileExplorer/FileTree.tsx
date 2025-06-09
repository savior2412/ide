import React, { useState, useEffect, useMemo, useRef } from 'react';
import { invoke } from '@tauri-apps/api/core';
import styles from './FileTree.module.css';

// File icons mapping giống VS Code
const FILE_ICONS: { [key: string]: string } = {
  // Programming languages
  'js': '🟨',
  'jsx': '⚛️',
  'ts': '🟦',
  'tsx': '⚛️',
  'py': '🐍',
  'java': '☕',
  'cpp': '⚙️',
  'c': '⚙️',
  'cs': '🔷',
  'go': '🔷',
  'rs': '🦀',
  'php': '🐘',
  'rb': '💎',
  'swift': '🦉',
  'kt': '🏃',
  'scala': '🏃',
  
  // Web technologies
  'html': '🌐',
  'css': '🎨',
  'scss': '🎨',
  'sass': '🎨',
  'less': '🎨',
  'vue': '💚',
  'svelte': '🧡',
  
  // Data formats
  'json': '📄',
  'xml': '📄',
  'yaml': '📄',
  'yml': '📄',
  'toml': '📄',
  'csv': '📊',
  
  // Documentation
  'md': '📝',
  'mdx': '📝',
  'txt': '📄',
  'pdf': '📕',
  'doc': '📘',
  'docx': '📘',
  
  // Images
  'png': '🖼️',
  'jpg': '🖼️',
  'jpeg': '🖼️',
  'gif': '🖼️',
  'svg': '🎨',
  'ico': '🖼️',
  'webp': '🖼️',
  
  // Archives
  'zip': '📦',
  'rar': '📦',
  'tar': '📦',
  'gz': '📦',
  '7z': '📦',
  
  // Config files
  'gitignore': '🚫',
  'env': '⚙️',
  'config': '⚙️',
  'conf': '⚙️',
  'ini': '⚙️',
  'lock': '🔒',
  
  // Default
  'default': '📄'
};

const FOLDER_ICONS = {
  open: '📂',
  closed: '📁',
  special: {
    'node_modules': '📦',
    'src': '📁',
    'components': '🧩',
    'pages': '📄',
    'public': '🌐',
    'assets': '🖼️',
    'images': '🖼️',
    'styles': '🎨',
    'utils': '🛠️',
    'hooks': '🪝',
    'services': '⚙️',
    'api': '🔌',
    'types': '📝',
    'tests': '🧪',
    '__tests__': '🧪',
    'docs': '📚',
    'config': '⚙️',
    '.git': '📚',
    '.vscode': '⚙️',
    'dist': '📦',
    'build': '🏗️',
    'target': '🎯'
  }
};

interface FileEntry {
  name: string;
  path: string;
  is_dir: boolean;
  children?: FileEntry[];
}

interface FileTreeProps {
  fileTree: FileEntry[];
  onFileSelect: (path: string) => void;
  workspacePath?: string;
}

interface SearchMatch {
  path: string;
  name: string;
  is_dir: boolean;
  matchedText: string;
  score: number;
}

interface CodeSearchMatch {
  file_path: string;
  file_name: string;
  line_number: number;
  line_content: string;
  match_start: number;
  match_end: number;
  context_before?: string;
  context_after?: string;
}

interface CodeSearchResult {
  query: string;
  total_matches: number;
  files_count: number;
  matches: CodeSearchMatch[];
}

const FileTree: React.FC<FileTreeProps> = ({ fileTree, onFileSelect, workspacePath }) => {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [activeFile, setActiveFile] = useState<string>('');
  const [searchResults, setSearchResults] = useState<SearchMatch[]>([]);
  const [isSearchMode, setIsSearchMode] = useState<boolean>(false);
  const [searchType, setSearchType] = useState<'files' | 'content'>('files');
  const [codeSearchResults, setCodeSearchResults] = useState<CodeSearchResult | null>(null);
  const [caseSensitive, setCaseSensitive] = useState<boolean>(false);
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Get file icon
  const getFileIcon = (fileName: string): string => {
    const extension = fileName.split('.').pop()?.toLowerCase() || '';
    const nameWithoutExt = fileName.replace(/\.[^/.]+$/, '');
    
    // Special file names
    if (fileName === '.gitignore') return FILE_ICONS['gitignore'];
    if (fileName.includes('.env')) return FILE_ICONS['env'];
    if (fileName.includes('package.json')) return '📦';
    if (fileName.includes('README')) return '📚';
    if (fileName.includes('LICENSE')) return '📜';
    if (fileName.includes('Dockerfile')) return '🐳';
    if (nameWithoutExt.includes('config')) return FILE_ICONS['config'];
    
    return FILE_ICONS[extension] || FILE_ICONS['default'];
  };

  // Get folder icon
  const getFolderIcon = (folderName: string, isOpen: boolean): string => {
    const specialIcon = FOLDER_ICONS.special[folderName as keyof typeof FOLDER_ICONS.special];
    if (specialIcon) return specialIcon;
    return isOpen ? FOLDER_ICONS.open : FOLDER_ICONS.closed;
  };

  // Flatten file tree for searching
  const flattenFileTree = (nodes: FileEntry[], path: string = ''): FileEntry[] => {
    let result: FileEntry[] = [];
    
    for (const node of nodes) {
      const fullPath = path ? `${path}/${node.name}` : node.name;
      result.push({ ...node, path: fullPath });
      
      if (node.is_dir && node.children) {
        result = result.concat(flattenFileTree(node.children, fullPath));
      }
    }
    
    return result;
  };

  // Search algorithm with fuzzy matching
  const searchFiles = (query: string, files: FileEntry[]): SearchMatch[] => {
    if (!query.trim()) return [];
    
    const queryLower = query.toLowerCase();
    const results: SearchMatch[] = [];
    
    for (const file of files) {
      const nameLower = file.name.toLowerCase();
      const pathLower = file.path.toLowerCase();
      
      // Exact name match (highest score)
      if (nameLower === queryLower) {
        results.push({
          path: file.path,
          name: file.name,
          is_dir: file.is_dir,
          matchedText: file.name,
          score: 100
        });
        continue;
      }
      
      // Name starts with query
      if (nameLower.startsWith(queryLower)) {
        results.push({
          path: file.path,
          name: file.name,
          is_dir: file.is_dir,
          matchedText: file.name,
          score: 90
        });
        continue;
      }
      
      // Name contains query
      if (nameLower.includes(queryLower)) {
        results.push({
          path: file.path,
          name: file.name,
          is_dir: file.is_dir,
          matchedText: file.name,
          score: 80
        });
        continue;
      }
      
      // Path contains query
      if (pathLower.includes(queryLower)) {
        results.push({
          path: file.path,
          name: file.name,
          is_dir: file.is_dir,
          matchedText: file.path,
          score: 70
        });
        continue;
      }
      
      // Fuzzy match in name
      if (fuzzyMatch(nameLower, queryLower)) {
        results.push({
          path: file.path,
          name: file.name,
          is_dir: file.is_dir,
          matchedText: file.name,
          score: 60
        });
      }
    }
    
    // Sort by score (highest first), then by name
    return results.sort((a, b) => {
      if (a.score !== b.score) return b.score - a.score;
      return a.name.localeCompare(b.name);
    }).slice(0, 50); // Limit to 50 results
  };

  // Simple fuzzy matching
  const fuzzyMatch = (str: string, pattern: string): boolean => {
    let patternIdx = 0;
    let strIdx = 0;
    
    while (strIdx < str.length && patternIdx < pattern.length) {
      if (str[strIdx] === pattern[patternIdx]) {
        patternIdx++;
      }
      strIdx++;
    }
    
    return patternIdx === pattern.length;
  };

  // Flatten files for search
  const allFiles = useMemo(() => flattenFileTree(fileTree), [fileTree]);

  // Search code in files
  const searchCodeInFiles = async (query: string) => {
    if (!workspacePath || !query.trim()) {
      setCodeSearchResults(null);
      return;
    }

    setIsSearching(true);
    try {
      const result = await invoke<CodeSearchResult>('search_in_files', {
        workspacePath,
        query: query.trim(),
        caseSensitive,
        useRegex: false
      });
      setCodeSearchResults(result);
      console.log(`🔍 Found ${result.total_matches} matches in ${result.files_count} files`);
    } catch (error) {
      console.error('❌ Code search failed:', error);
      setCodeSearchResults(null);
    } finally {
      setIsSearching(false);
    }
  };

  // Handle search
  useEffect(() => {
    if (searchQuery.trim()) {
      setIsSearchMode(true);
      
      if (searchType === 'files') {
        // File name search
        const results = searchFiles(searchQuery, allFiles);
        setSearchResults(results);
        setCodeSearchResults(null);
      } else {
        // Code content search
        setSearchResults([]);
        searchCodeInFiles(searchQuery);
      }
    } else {
      setIsSearchMode(false);
      setSearchResults([]);
      setCodeSearchResults(null);
    }
  }, [searchQuery, allFiles, searchType, caseSensitive, workspacePath]);

  // Toggle folder expansion
  const toggleFolder = (folderPath: string) => {
    setExpandedFolders(prev => {
      const newSet = new Set(prev);
      if (newSet.has(folderPath)) {
        newSet.delete(folderPath);
      } else {
        newSet.add(folderPath);
      }
      return newSet;
    });
  };

  // Handle file selection
  const handleFileSelect = (path: string) => {
    setActiveFile(path);
    onFileSelect(path);
  };

  // Handle code search result click - open file and jump to line
  const handleCodeMatchClick = (match: CodeSearchMatch) => {
    setActiveFile(match.file_path);
    
    // Create event to open file and jump to specific line
    const event = new CustomEvent('open-file-with-location', {
      detail: {
        filePath: match.file_path,
        line: match.line_number,
        column: match.match_start + 1 // Convert to 1-based
      }
    });
    window.dispatchEvent(event);
    
    console.log(`🎯 Jumping to ${match.file_path}:${match.line_number}:${match.match_start + 1}`);
  };

  // Highlight search text
  const highlightText = (text: string, query: string): React.ReactNode => {
    if (!query.trim()) return text;
    
    const queryLower = query.toLowerCase();
    const textLower = text.toLowerCase();
    const index = textLower.indexOf(queryLower);
    
    if (index === -1) return text;
    
    const before = text.slice(0, index);
    const match = text.slice(index, index + query.length);
    const after = text.slice(index + query.length);
    
    return (
      <>
        {before}
        <span className={styles.highlight}>{match}</span>
        {highlightText(after, query)}
      </>
    );
  };

  // Render file tree recursively
  const renderTreeNode = (node: FileEntry, level: number = 0, path: string = ''): React.ReactNode => {
    const fullPath = path ? `${path}/${node.name}` : node.name;
    const isExpanded = expandedFolders.has(fullPath);
    const isActive = activeFile === fullPath;

    return (
      <div key={fullPath} className={styles.treeNode}>
        <div
          className={`${styles.nodeContent} ${isActive ? styles.active : ''}`}
          style={{ paddingLeft: `${level * 20 + 8}px` }}
          onClick={() => {
            if (node.is_dir) {
              toggleFolder(fullPath);
            } else {
              handleFileSelect(fullPath);
            }
          }}
        >
          {node.is_dir && (
            <span className={`${styles.chevron} ${isExpanded ? styles.expanded : ''}`}>
              ▶
            </span>
          )}
          <span className={styles.icon}>
            {node.is_dir ? getFolderIcon(node.name, isExpanded) : getFileIcon(node.name)}
          </span>
          <span className={styles.name}>{node.name}</span>
        </div>
        
        {node.is_dir && isExpanded && node.children && (
          <div className={styles.children}>
            {node.children.map(child => renderTreeNode(child, level + 1, fullPath))}
          </div>
        )}
      </div>
    );
  };

  // Render file search results
  const renderFileSearchResults = (): React.ReactNode => {
    if (searchResults.length === 0) {
      return (
        <div className={styles.noResults}>
          <span className={styles.noResultsIcon}>🔍</span>
          <span>Không tìm thấy file nào</span>
        </div>
      );
    }

    return (
      <div className={styles.searchResults}>
        <div className={styles.searchHeader}>
          <span className={styles.searchIcon}>📁</span>
          <span>File Results ({searchResults.length})</span>
        </div>
        {searchResults.map((result, index) => (
          <div
            key={`${result.path}-${index}`}
            className={`${styles.searchResult} ${activeFile === result.path ? styles.active : ''}`}
            onClick={() => handleFileSelect(result.path)}
          >
            <span className={styles.icon}>
              {result.is_dir ? getFolderIcon(result.name, false) : getFileIcon(result.name)}
            </span>
            <div className={styles.resultInfo}>
              <div className={styles.resultName}>
                {highlightText(result.name, searchQuery)}
              </div>
              <div className={styles.resultPath}>
                {highlightText(result.path, searchQuery)}
              </div>
            </div>
            <span className={styles.score}>{result.score}</span>
          </div>
        ))}
      </div>
    );
  };

  // Render code search results
  const renderCodeSearchResults = (): React.ReactNode => {
    if (isSearching) {
      return (
        <div className={styles.loading}>
          <div className={styles.loadingSpinner}></div>
          <span>Searching in files...</span>
        </div>
      );
    }

    if (!codeSearchResults || codeSearchResults.matches.length === 0) {
      return (
        <div className={styles.noResults}>
          <span className={styles.noResultsIcon}>🔍</span>
          <span>Không tìm thấy code nào</span>
        </div>
      );
    }

    // Group matches by file
    const matchesByFile = codeSearchResults.matches.reduce((acc, match) => {
      if (!acc[match.file_path]) {
        acc[match.file_path] = [];
      }
      acc[match.file_path].push(match);
      return acc;
    }, {} as Record<string, CodeSearchMatch[]>);

    return (
      <div className={styles.codeSearchResults}>
        <div className={styles.searchHeader}>
          <span className={styles.searchIcon}>🔍</span>
          <span>Code Results ({codeSearchResults.total_matches} in {codeSearchResults.files_count} files)</span>
        </div>
        
        {Object.entries(matchesByFile).map(([filePath, matches]) => (
          <div key={filePath} className={styles.fileGroup}>
            <div className={styles.fileHeader}>
              <span className={styles.icon}>{getFileIcon(matches[0].file_name)}</span>
              <span className={styles.fileName}>{matches[0].file_name}</span>
              <span className={styles.filePath}>{filePath}</span>
              <span className={styles.matchCount}>({matches.length})</span>
            </div>
            
            <div className={styles.matchesList}>
              {matches.map((match, index) => (
                <div
                  key={`${filePath}-${match.line_number}-${index}`}
                  className={styles.codeMatch}
                  onClick={() => handleCodeMatchClick(match)}
                  title={`Click to jump to line ${match.line_number}`}
                >
                  <div className={styles.lineNumber}>
                    {match.line_number}
                  </div>
                  <div className={styles.codeContent}>
                    <div className={styles.mainLine}>
                      {highlightText(match.line_content.trim(), searchQuery)}
                    </div>
                    {match.context_before && (
                      <div className={styles.contextLine}>
                        {match.context_before.trim()}
                      </div>
                    )}
                    {match.context_after && (
                      <div className={styles.contextLine}>
                        {match.context_after.trim()}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  };

  // Focus search on Ctrl+Shift+F
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'F') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
      if (e.key === 'Escape' && isSearchMode) {
        setSearchQuery('');
        setIsSearchMode(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isSearchMode]);

  return (
    <div className={styles.fileTree}>
      {/* Search Header */}
      <div className={styles.searchContainer}>
        <div className={styles.searchInputWrapper}>
          <span className={styles.searchIcon}>🔍</span>
          <input
            ref={searchInputRef}
            type="text"
            placeholder="Tìm kiếm files... (Ctrl+Shift+F)"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={styles.searchInput}
          />
          {searchQuery && (
            <button
              className={styles.clearButton}
              onClick={() => setSearchQuery('')}
              title="Xóa tìm kiếm"
            >
              ×
            </button>
          )}
        </div>
        {isSearchMode && (
          <div className={styles.searchStats}>
            {searchResults.length} kết quả cho "{searchQuery}"
          </div>
        )}
      </div>

      {/* Search Type Controls */}
      {isSearchMode && (
        <div className={styles.searchControls}>
          <div className={styles.searchTypeButtons}>
            <button
              className={`${styles.searchTypeButton} ${searchType === 'files' ? styles.active : ''}`}
              onClick={() => setSearchType('files')}
              title="Search file names"
            >
              📁 Files
            </button>
            <button
              className={`${styles.searchTypeButton} ${searchType === 'content' ? styles.active : ''}`}
              onClick={() => setSearchType('content')}
              title="Search in file content"
            >
              🔍 Code
            </button>
          </div>
          
          <div className={styles.searchOptions}>
            <button
              className={`${styles.optionButton} ${caseSensitive ? styles.active : ''}`}
              onClick={() => setCaseSensitive(!caseSensitive)}
              title="Case sensitive"
            >
              Aa
            </button>
          </div>
        </div>
      )}

      {/* Content */}
      <div className={styles.treeContent}>
        {isSearchMode ? (
          searchType === 'files' ? renderFileSearchResults() : renderCodeSearchResults()
        ) : (
          <div className={styles.treeContainer}>
            {fileTree.length > 0 ? (
              fileTree.map(node => renderTreeNode(node))
            ) : (
              <div className={styles.emptyState}>
                <span className={styles.emptyIcon}>📁</span>
                <span>Chưa có file nào</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default FileTree; 