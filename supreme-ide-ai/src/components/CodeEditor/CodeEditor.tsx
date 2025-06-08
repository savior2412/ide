import { useRef, useEffect } from 'react';
import Editor from '@monaco-editor/react';
import styles from './CodeEditor.module.css';

interface CodeEditorProps {
  value: string;
  onChange: (value: string | undefined) => void;
  language?: string;
}

const CodeEditor = ({ value, onChange, language }: CodeEditorProps) => {
  const editorRef = useRef<any>(null);

  // Handle editor mount
  const handleEditorMount = (editor: any, monaco: any) => {
    editorRef.current = editor;
    console.log('📝 Monaco Editor mounted with monaco instance:', !!monaco);
  };

  // Listen for scroll-to-line events
  useEffect(() => {
    const handleScrollToLine = (event: CustomEvent) => {
      const { line, column } = event.detail;
      
      if (editorRef.current) {
        console.log('📍 CodeEditor: Scrolling to line', line, 'column', column);
        
        // Reveal the line in the center
        editorRef.current.revealLineInCenter(line);
        
        // Set cursor position
        editorRef.current.setPosition({
          lineNumber: line,
          column: column || 1
        });
        
        // Select the entire line to highlight it
        editorRef.current.setSelection({
          startLineNumber: line,
          startColumn: 1,
          endLineNumber: line,
          endColumn: editorRef.current.getModel()?.getLineMaxColumn(line) || 1
        });
        
        // Focus the editor
        editorRef.current.focus();
        
        // Add a decorative highlight for 3 seconds
        const decorations = editorRef.current.createDecorationsCollection([
          {
            range: { startLineNumber: line, startColumn: 1, endLineNumber: line, endColumn: 1 },
            options: {
              isWholeLine: true,
              className: 'highlighted-line',
              linesDecorationsClassName: 'highlighted-line-decoration'
            }
          }
        ]);
        
        // Remove highlight after 3 seconds
        setTimeout(() => {
          decorations.clear();
        }, 3000);
      }
    };

    window.addEventListener('scroll-to-line', handleScrollToLine as EventListener);
    
    return () => {
      window.removeEventListener('scroll-to-line', handleScrollToLine as EventListener);
    };
  }, []);

  return (
    <div className={styles.editorContainer}>
      <Editor
        height="100%"
        language={language || 'plaintext'}
        value={value}
        onChange={onChange}
        onMount={handleEditorMount}
        theme="vs-dark"
        options={{
          selectOnLineNumbers: true,
          automaticLayout: true,
          minimap: { enabled: false },
          fontSize: 14,
          wordWrap: 'on',
          lineNumbers: 'on',
          glyphMargin: true,
          folding: true,
          lineDecorationsWidth: 0,
          lineNumbersMinChars: 3,
        }}
      />
    </div>
  );
};

export default CodeEditor;
