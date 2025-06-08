import React from 'react';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import styles from './MainPanel.module.css';
import CodeEditor from '../CodeEditor/CodeEditor';

const MainPanel = () => {
  return (
    // Container này giờ chỉ để định kiểu, không làm layout nữa
    <div className={styles.container}>
      <PanelGroup direction="vertical">
        {/* Panel Editor */}
        <Panel defaultSize={70} minSize={20}>
          <div className={styles.editorPanel}>
            <div className={styles.panelHeader}>
              <span className={styles.fileName}>inventory.py</span>
              <span className={`${styles.language} text-glow-pink`}>Python 3.9</span>
            </div>
            <CodeEditor />
          </div>
        </Panel>
        
        <PanelResizeHandle className="resize-handle-vertical">
          <div />
        </PanelResizeHandle>

        {/* Panel Terminal */}
        <Panel defaultSize={30} minSize={10}>
          <div className={styles.terminalPanel}>
            <div className={styles.terminalHeader}>
              <span className={`${styles.terminalTitle} text-glow-cyan`}>X Terminal 1</span>
              <div className={styles.terminalControls}>
                <button className={styles.closeButton}>×</button>
              </div>
            </div>
            <div className={styles.terminalBody}>
              <pre><code>... (Nội dung terminal giữ nguyên) ...</code></pre>
            </div>
          </div>
        </Panel>
      </PanelGroup>
    </div>
  );
};

export default MainPanel;