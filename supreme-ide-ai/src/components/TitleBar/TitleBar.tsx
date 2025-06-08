import { Window } from '@tauri-apps/api/window';
import styles from './TitleBar.module.css';
import { invoke } from '@tauri-apps/api/core';
import { useState, useEffect, useRef } from 'react';

interface TitleBarProps {
  onOpenFolder: (tree: any) => void;
  onOpenFile: (path: string, content: string) => void;
  onSave: () => void;
  onSaveAs: () => void;
}

const TitleBar = ({ onOpenFolder, onOpenFile, onSave, onSaveAs }: TitleBarProps) => {
  const appWindow = Window.getCurrent();
  const [showFileMenu, setShowFileMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
          case 'o':
            e.preventDefault();
            if (e.shiftKey) {
              handleOpenFolder();
            } else {
              handleOpenFile();
            }
            break;
          case 's':
            e.preventDefault();
            if (e.shiftKey) {
              handleSaveAs();
            } else {
              handleSave();
            }
            break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Click outside to close menu
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowFileMenu(false);
      }
    };

    if (showFileMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showFileMenu]);

  const handleOpenFolder = async () => {
    try {
      const tree = await invoke('open_folder');
      onOpenFolder(tree);
      setShowFileMenu(false);
    } catch (e) { 
      console.error('Không thể mở thư mục:', e);
    }
  };
  
  const handleOpenFile = async () => {
    try {
      const result = await invoke('open_file_dialog') as [string, string];
      const [path, content] = result;
      onOpenFile(path, content);
      setShowFileMenu(false);
    } catch (e) { 
      console.error('Không thể mở file:', e);
    }
  };
  
  const handleSave = () => {
    onSave();
    setShowFileMenu(false);
  };
  
  const handleSaveAs = () => {
    onSaveAs();
    setShowFileMenu(false);
  };

  return (
    <div className={styles.container} data-tauri-drag-region>
      <div className={styles.menu}>
        <div ref={menuRef} style={{ position: 'relative' }}>
          <span
            className={`${styles.menuItem} ${styles.active} text-glow-cyan`}
            onClick={() => setShowFileMenu((v) => !v)}
          >File</span>
          {showFileMenu && (
            <div className={styles.fileMenu}>
              <div className={styles.fileMenuItem} onClick={handleOpenFolder}>
                Open Folder <span className={styles.shortcut}>Ctrl+Shift+O</span>
              </div>
              <div className={styles.fileMenuItem} onClick={handleOpenFile}>
                Open File <span className={styles.shortcut}>Ctrl+O</span>
              </div>
              <div className={styles.separator}></div>
              <div className={styles.fileMenuItem} onClick={handleSave}>
                Save <span className={styles.shortcut}>Ctrl+S</span>
              </div>
              <div className={styles.fileMenuItem} onClick={handleSaveAs}>
                Save As <span className={styles.shortcut}>Ctrl+Shift+S</span>
              </div>
            </div>
          )}
        </div>
        <span className={styles.menuItem}>Edit</span>
        <span className={styles.menuItem}>Selection</span>
        <span className={styles.menuItem}>View</span>
        <span className={styles.menuItem}>Go</span>
        <span className={styles.menuItem}>Run</span>
        <span className={styles.menuItem}>Terminal</span>
        <span className={styles.menuItem}>Window</span>
        <span className={styles.menuItem}>Help</span>
      </div>
      <div className={styles.dragRegion} data-tauri-drag-region />
      <div className={styles.windowControls}>
        <button className={styles.controlButton} onClick={() => appWindow.minimize()}>—</button>
        <button className={styles.controlButton} onClick={() => appWindow.toggleMaximize()}>☐</button>
        <button className={`${styles.controlButton} ${styles.closeButtonHover}`} onClick={() => appWindow.close()}>✕</button>
      </div>
    </div>
  );
};

export default TitleBar;