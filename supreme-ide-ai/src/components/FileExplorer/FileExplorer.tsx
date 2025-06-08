import styles from './FileExplorer.module.css';

// SVG Icons as React Components for reusability
const FileIcon = () => (
  <svg className={styles.fileIcon} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"></path></svg>
);
const GitIcon = () => (
    <svg className={styles.fileIcon} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
);
const LockIcon = () => (
    <svg className={styles.fileIcon} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>
);


const FileExplorer = () => {
  return (
    <aside className={`${styles.container} border-glow-cyan`}>
      <div className={styles.header}>
        <h2 className={`${styles.title} text-glow-cyan`}>Project: /NEON_CITY</h2>
      </div>
      <nav className={styles.nav}>
        <div className={styles.navList}>
          <a href="#" className={styles.fileItem}>
            <GitIcon />
            <span>file_change</span>
          </a>
          <a href="#" className={styles.fileItem}>
            <LockIcon />
            <span>auth.py</span>
          </a>
          <a href="#" className={styles.fileItem}>
            <FileIcon />
            <span>file1.py</span>
          </a>
          <a href="#" className={`${styles.fileItem} ${styles.active}`}>
            <FileIcon />
            <span>inventory.py</span>
          </a>
          <a href="#" className={styles.fileItem}>
            <FileIcon />
            <span>hello.py</span>
          </a>
        </div>

        <div className={styles.gitStatus}>
          <h3 className={styles.gitTitle}>Git Status</h3>
          <div className={styles.checkboxList}>
            <label className={styles.checkboxLabel}>
              <input type="checkbox" className={styles.checkbox} />
              <span>pm_re</span>
            </label>
            <label className={styles.checkboxLabel}>
              <input type="checkbox" defaultChecked className={styles.checkbox} />
              <span>soft_code</span>
            </label>
          </div>
        </div>
      </nav>
    </aside>
  );
};

export default FileExplorer;