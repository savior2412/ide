import React from 'react';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import './App.css';
import TitleBar from './components/TitleBar/TitleBar';
import FileExplorer from './components/FileExplorer/FileExplorer';
import MainPanel from './components/MainPanel/MainPanel';
import AssistantPanel from './components/AssistantPanel/AssistantPanel';

function App() {
  return (
    <div className="app-shell">
      <TitleBar />
      <div className="app-container">
        <PanelGroup direction="horizontal">
          {/* Cột Trái: File Explorer */}
          <Panel defaultSize={20} minSize={15}>
            <FileExplorer />
          </Panel>

          <PanelResizeHandle className="resize-handle-horizontal">
            <div />
          </PanelResizeHandle>

          {/* Cột Giữa: Main Panel */}
          <Panel defaultSize={55} minSize={30}>
            <MainPanel />
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