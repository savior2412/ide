import { useState } from 'react';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import { invoke } from '@tauri-apps/api/core';
import './App.css';
import TitleBar from './components/TitleBar/TitleBar';
import FileExplorer from './components/FileExplorer/FileExplorer';
import MainPanel from './components/MainPanel/MainPanel';
import AssistantPanel from './components/AssistantPanel/AssistantPanel';
import Notification from './components/Notification/Notification';
import { FileEntry, getLanguageFromExtension } from './utils/fileUtils';

interface NotificationState {
  message: string;
  type: 'success' | 'error' | 'info';
}

function App() {
  const [folderTree, setFolderTree] = useState<FileEntry[]>([]);
  const [workspacePath, setWorkspacePath] = useState<string>('');
  const [currentFile, setCurrentFile] = useState<{ path: string, content: string, language: string } | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [notification, setNotification] = useState<NotificationState | null>(null);
  const [isLoadingFolder, setIsLoadingFolder] = useState(false);

  const showNotification = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setNotification({ message, type });
  };

  // Direct invoke cho TitleBar
  const handleOpenFolder = async () => {
    // Prevent multiple simultaneous calls
    if (isLoadingFolder) {
      console.log('⏳ Already loading folder, ignoring request');
      return;
    }

    try {
      setIsLoadingFolder(true);
      console.log('🔄 Frontend: Calling open_folder...');
      
      const result = await invoke<[string, FileEntry[]]>('open_folder');
      const [workspaceDir, tree] = result;
      
      console.log('✅ Frontend: Received workspace:', workspaceDir);
      console.log('✅ Frontend: Received tree with', tree.length, 'entries');
      
      setFolderTree(tree);
      setWorkspacePath(workspaceDir);
      
      console.log('🏠 Frontend: Set workspace path to:', workspaceDir);
      
      showNotification('Workspace opened successfully', 'success');
    } catch (error) {
      console.error('❌ Frontend: Error opening folder:', error);
      showNotification('Failed to open workspace', 'error');
    } finally {
      setIsLoadingFolder(false);
    }
  };

  const handleOpenFile = async () => {
    try {
      const result = await invoke<[string, string]>('open_file_dialog');
      const [path, content] = result;
      const language = getLanguageFromExtension(path);
      setCurrentFile({ path, content, language });
      setIsDirty(false);
      showNotification('File opened successfully', 'success');
    } catch (error) {
      console.error('Error opening file:', error);
      showNotification('Failed to open file', 'error');
    }
  };

  const handleFileSelect = async (filePath: string) => {
    try {
      const content = await invoke<string>('open_file', { path: filePath });
      const language = getLanguageFromExtension(filePath);
      setCurrentFile({ path: filePath, content, language });
      setIsDirty(false);
      showNotification('File loaded successfully', 'success');
    } catch (error) {
      console.error('Không thể đọc file:', error);
      showNotification('Failed to load file', 'error');
    }
  };

  const handleContentChange = (newContent: string) => {
    if (currentFile) {
      setCurrentFile({ ...currentFile, content: newContent });
      setIsDirty(true);
    }
  };

  const handleSave = async () => {
    if (currentFile) {
      try {
        await invoke('save_file', { path: currentFile.path, content: currentFile.content });
        setIsDirty(false);
        showNotification('File saved successfully', 'success');
      } catch (error) {
        console.error('Không thể lưu file:', error);
        showNotification('Failed to save file', 'error');
      }
    }
  };

  const handleSaveAs = async () => {
    if (currentFile) {
      try {
        const newPath = await invoke<string>('save_as_file', { content: currentFile.content });
        const language = getLanguageFromExtension(newPath);
        setCurrentFile({ ...currentFile, path: newPath, language });
        setIsDirty(false);
        showNotification('File saved successfully', 'success');
      } catch (error) {
        console.error('Không thể lưu file:', error);
        showNotification('Failed to save file', 'error');
      }
    }
  };

  return (
    <div className="app">
      <TitleBar 
        onOpenFolder={handleOpenFolder}
        onOpenFile={handleOpenFile}
        onSave={handleSave}
        onSaveAs={handleSaveAs}
      />
      <div className="app-container">
        <PanelGroup direction="horizontal">
          <Panel defaultSize={20} minSize={15}>
            <FileExplorer 
              fileTree={folderTree} 
              onFileSelect={handleFileSelect}
            />
          </Panel>
          <PanelResizeHandle />
          <Panel defaultSize={60} minSize={30}>
            <MainPanel 
              filePath={currentFile?.path}
              fileContent={currentFile?.content || ''}
              language={currentFile?.language || 'text'}
              isDirty={isDirty}
              onContentChange={handleContentChange}
              workspacePath={workspacePath}
            />
          </Panel>
          <PanelResizeHandle />
          <Panel defaultSize={20} minSize={15}>
            <AssistantPanel />
          </Panel>
        </PanelGroup>
      </div>

      {/* Notification */}
      {notification && (
        <Notification
          message={notification.message}
          type={notification.type}
          onClose={() => setNotification(null)}
        />
      )}
    </div>
  );
}

export default App;