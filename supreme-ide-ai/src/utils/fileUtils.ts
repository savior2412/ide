export interface FileEntry {
  name: string;
  path: string;
  is_dir: boolean;
  children?: FileEntry[];
}

export const getLanguageFromExtension = (filePath: string): string => {
  const extension = filePath.split('.').pop()?.toLowerCase();
  
  const languageMap: { [key: string]: string } = {
    // JavaScript/TypeScript
    'js': 'javascript',
    'jsx': 'javascript',
    'ts': 'typescript',
    'tsx': 'typescript',
    
    // Python
    'py': 'python',
    'pyw': 'python',
    
    // Web
    'html': 'html',
    'htm': 'html',
    'css': 'css',
    'scss': 'scss',
    'sass': 'sass',
    'less': 'less',
    
    // Config/Data
    'json': 'json',
    'xml': 'xml',
    'yaml': 'yaml',
    'yml': 'yaml',
    'toml': 'toml',
    
    // Shell/Scripts
    'sh': 'shell',
    'bash': 'shell',
    'zsh': 'shell',
    'fish': 'shell',
    'ps1': 'powershell',
    
    // Systems Programming
    'c': 'c',
    'cpp': 'cpp',
    'cc': 'cpp',
    'cxx': 'cpp',
    'h': 'c',
    'hpp': 'cpp',
    'rs': 'rust',
    'go': 'go',
    
    // Java/C#
    'java': 'java',
    'cs': 'csharp',
    
    // PHP/Ruby
    'php': 'php',
    'rb': 'ruby',
    
    // Markup/Doc
    'md': 'markdown',
    'markdown': 'markdown',
    'tex': 'latex',
    
    // SQL
    'sql': 'sql',
    
    // Other
    'dockerfile': 'dockerfile',
    'env': 'shell',
    'gitignore': 'ignore',
    'txt': 'plaintext',
  };
  
  return languageMap[extension || ''] || 'plaintext';
};

export const getLanguageDisplayName = (language: string): string => {
  const displayMap: { [key: string]: string } = {
    'javascript': 'JavaScript',
    'typescript': 'TypeScript',
    'python': 'Python',
    'html': 'HTML',
    'css': 'CSS',
    'scss': 'SCSS',
    'sass': 'Sass',
    'less': 'Less',
    'json': 'JSON',
    'xml': 'XML',
    'yaml': 'YAML',
    'toml': 'TOML',
    'shell': 'Shell',
    'powershell': 'PowerShell',
    'c': 'C',
    'cpp': 'C++',
    'rust': 'Rust',
    'go': 'Go',
    'java': 'Java',
    'csharp': 'C#',
    'php': 'PHP',
    'ruby': 'Ruby',
    'markdown': 'Markdown',
    'latex': 'LaTeX',
    'sql': 'SQL',
    'dockerfile': 'Dockerfile',
    'plaintext': 'Plain Text',
  };
  
  return displayMap[language] || language.charAt(0).toUpperCase() + language.slice(1);
}; 