import React from 'react';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import styles from './MainPanel.module.css';
import CodeEditor from '../CodeEditor/CodeEditor';
import { getLanguageFromExtension, getLanguageDisplayName } from '../../utils/fileUtils';

interface MainPanelProps {
  file: { path: string, content: string } | null;
  isDirty: boolean;
  onEditorChange: (value: string | undefined) => void;
}

const MainPanel = ({ file, isDirty, onEditorChange }: MainPanelProps) => {
  const getFileName = (path: string) => {
    return path.split(/[\\/]/).pop() || 'Untitled';
  };

  const language = file ? getLanguageFromExtension(file.path) : 'plaintext';
  const languageDisplay = getLanguageDisplayName(language);

  return (
    // Container này giờ chỉ định kiểu, không làm layout nữa
    <div className={styles.container}>
      <PanelGroup direction="vertical">
        {/* Panel Editor */}
        <Panel defaultSize={70} minSize={20}>
          <div className={styles.editorPanel}>
            <div className={styles.panelHeader}>
              <span className={styles.fileName}>
                {file ? getFileName(file.path) : 'No file opened'}
                {isDirty && ' ●'}
              </span>
              <span className={`${styles.language} text-glow-pink`}>
                {languageDisplay} {isDirty ? '(Chưa lưu)' : '(Đã lưu)'}
              </span>
            </div>
            <CodeEditor
              value={file ? file.content : '// Chọn file để bắt đầu chỉnh sửa\n// File -> Open File hoặc File -> Open Folder'}
              onChange={onEditorChange}
              language={language}
            />
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
              <pre><code>
{`... (Terminal placeholder - chức năng terminal sẽ được triển khai sau) ...

$ cd ~/project
$ ls -la
drwxr-xr-x  12 user  staff    384 Jan 15 10:30 .
drwxr-xr-x  25 user  staff    800 Jan 15 09:15 ..
-rw-r--r--   1 user  staff     89 Jan 15 10:29 README.md
-rw-r--r--   1 user  staff    456 Jan 15 10:30 main.py

$ python main.py
Hello, World!

$ █`}
              </code></pre>
            </div>
          </div>
        </Panel>
      </PanelGroup>
    </div>
  );
};

export default MainPanel;