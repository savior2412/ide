import React, { useState } from 'react';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import './App.css';
import TitleBar from './components/TitleBar/TitleBar';
import FileExplorer from './components/FileExplorer/FileExplorer';
import MainPanel from './components/MainPanel/MainPanel';
import AssistantPanel from './components/AssistantPanel/AssistantPanel';

function App() {
  const [folderTree, setFolderTree] = useState<any[]>([]);
  const [currentFile, setCurrentFile] = useState<{ path: string, content: string } | null>(null);
  const [isDirty, setIsDirty] = useState(false);

  // Callback cho TitleBar
  const handleOpenFolder = (tree: any) => setFolderTree(tree);
  const handleOpenFile = (path: string, content: string) => {
    setCurrentFile({ path, content });
    setIsDirty(false);
  };
  const handleSave = async () => {
    if (currentFile) {
      // Gọi Tauri save_file
      const { invoke } = await import('@tauri-apps/api/core');
      await invoke('save_file', { path: currentFile.path, content: currentFile.content });
      setIsDirty(false);
    }
  };
  const handleSaveAs = async () => {
    if (currentFile) {
      const { invoke } = await import('@tauri-apps/api/core');
      const newPath = await invoke('save_as_file', { content: currentFile.content });
      setCurrentFile({ ...currentFile, path: newPath });
      setIsDirty(false);
    }
  };
  // Khi editor thay đổi
  const handleEditorChange = (value: string | undefined) => {
    if (currentFile && value !== undefined) {
      setCurrentFile({ ...currentFile, content: value });
      setIsDirty(true);
    }
  };

  return (
    <div className="app-shell">
      <TitleBar
        onOpenFolder={handleOpenFolder}
        onOpenFile={handleOpenFile}
        onSave={handleSave}
        onSaveAs={handleSaveAs}
      />
      <div className="app-container">
        <PanelGroup direction="horizontal">
          {/* Cột Trái: File Explorer */}
          <Panel defaultSize={20} minSize={15}>
            <FileExplorer tree={folderTree} onOpenFile={handleOpenFile} />
          </Panel>

          <PanelResizeHandle className="resize-handle-horizontal">
            <div />
          </PanelResizeHandle>

          {/* Cột Giữa: Main Panel */}
          <Panel defaultSize={55} minSize={30}>
            <MainPanel
              file={currentFile}
              isDirty={isDirty}
              onEditorChange={handleEditorChange}
            />
          </Panel>

          <PanelResizeHandle className="resize-handle-horizontal">
            <div />
          </PanelResizeHandle>

          {/* Cột Phải: AI Assistant */}
          <Panel defaultSize={25} minSize={20}>
            <AssistantPanel />
          </Panel>
        </PanelGroup>
      </div>
    </div>
  );
}

export default App;