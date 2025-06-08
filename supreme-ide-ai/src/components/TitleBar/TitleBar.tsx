import { Window } from '@tauri-apps/api/window';
import styles from './TitleBar.module.css';

const TitleBar = () => {
  const appWindow = Window.getCurrent();

  return (
    <div className={styles.container} data-tauri-drag-region>
      <div className={styles.menu}>
        <span className={`${styles.menuItem} ${styles.active} text-glow-cyan`}>File</span>
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