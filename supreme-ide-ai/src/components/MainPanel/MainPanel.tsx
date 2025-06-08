// src/components/MainPanel/MainPanel.tsx (FIXED v3)
import styles from './MainPanel.module.css';

const MainPanel = () => {
  return (
    <div className={styles.container}>
      {/* Code Editor Panel - Placeholder for Monaco Editor */}
      <div className={styles.editorPanel}>
        <div className={styles.panelHeader}>
          <span className={styles.fileName}>inventory.py</span>
          <span className={`${styles.language} text-glow-pink`}>Python 3.9</span>
        </div>
        <div className={styles.editorBody}>
          <div className={styles.lineNumbers}>
            <pre>{`1
2
3
4
5
6
7
8
9
10
11
12
13`}</pre>
          </div>
          <div className={styles.codeContent}>
            <pre>
              <code>
                <span className={styles.keyword}>def</span>{' '}
                <span className={styles.function}>calculate_total</span>(items):{'\n'}
                {'    '}<span className={styles.variable}>total</span> = <span className={styles.number}>0</span>{'\n'}
                {'    '}<span className={styles.keyword}>for</span> item <span className={styles.keyword}>in</span> items:{'\n'}
                {'        '}total += item[<span className={styles.string}>"price"</span>]{'\n'}
                {'    '}<span className={styles.keyword}>return</span> total{'\n'}
                {'\n'}
                items = [{'\n'}
                {'    '}{"{"}{' '}<span className={styles.string}>"name"</span>: <span className={styles.string}>"Pen"</span>, <span className={styles.string}>"price"</span>: <span className={styles.number}>1.5</span>{' '}{"}"},{'\n'}
                {'    '}{"{"}{' '}<span className={styles.string}>"name"</span>: <span className={styles.string}>"Notebook"</span>, <span className={styles.string}>"price"</span>: <span className={styles.number}>3.0</span>{' '}{"}"}{'\n'}
                ]{'\n'}
                {'\n'}
                <span className={styles.function}>print</span>
                (<span className={styles.string}>{'f"Total: {calculate_total(items)}"'}</span>)
              </code>
            </pre>
          </div>
        </div>
      </div>

      {/* Terminal Panel - Placeholder for Xterm.js */}
      <div className={styles.terminalPanel}>
        <div className={styles.terminalHeader}>
          <span className={`${styles.terminalTitle} text-glow-cyan`}>X Terminal 1</span>
          <div className={styles.terminalControls}>
            <button className={styles.closeButton}>×</button>
          </div>
        </div>
        <div className={styles.terminalBody}>
          <pre>
            <code>
              <span className={styles.promptUser}>user@cyberdeck</span><span className={styles.promptSymbol}>:</span><span className={styles.promptPath}>~</span><span className={styles.promptSymbol}>$</span> ls -al{'\n'}
              total 80{'\n'}
              -rw-r--r--  1 savior staff    13 Jun  7 03:50 error_test.py{'\n'}
              -rw-r--r--  1 savior staff 11275 Jun  7 01:41 final_reset_and_build.py{'\n'}
              -rwxr-xr-x  1 savior staff    21 Jun  6 23:02 README.md{'\n'}
              <span className={styles.highlight}>-rw-r--r--  1 savior staff   525 Jun  6 23:30 reinstall_deps.py</span>{'\n'}
              -rw-r--r--  1 savior staff  3421 Jun  7 01:40 test_core_files.py{'\n'}
              -rw-r--r--  1 savior staff   200 Jun  7 02:18 .git{'\n'}
              -rw-r--r--  1 savior staff  9005 Jun  7 05:07 step21_build_hybrid_terminal.py{'\n'}
              -rwxr-xr-x  1 savior staff   128 Jun  6 23:21 tests{'\n'}
              <span className={styles.promptUser}>user@cyberdeck</span><span className={styles.promptSymbol}>:</span><span className={styles.promptPath}>~</span><span className={styles.promptSymbol}>$</span>{' '}
              <span className={styles.cursor}>_</span>
            </code>
          </pre>
        </div>
      </div>
    </div>
  );
};

export default MainPanel;