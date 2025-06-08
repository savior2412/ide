import React from 'react';
import Editor from '@monaco-editor/react';
import styles from './CodeEditor.module.css';

interface CodeEditorProps {
  value: string;
  onChange: (value: string | undefined) => void;
  language?: string;
}

const CodeEditor = ({ value, onChange, language }: CodeEditorProps) => {
  return (
    <div className={styles.editorContainer}>
      <Editor
        height="100%"
        language={language || 'plaintext'}
        value={value}
        onChange={onChange}
        theme="vs-dark"
        options={{
          selectOnLineNumbers: true,
          automaticLayout: true,
          minimap: { enabled: false },
          fontSize: 14,
          wordWrap: 'on',
        }}
      />
    </div>
  );
};

export default CodeEditor;
