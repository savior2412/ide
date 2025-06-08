
import React from 'react';
import Editor from '@monaco-editor/react';
import styles from './CodeEditor.module.css';

const CodeEditor = () => {
  const initialCode = `def calculate_total(items):
    total = 0
    for item in items:
        total += item["price"]
    return total

items = [
    { "name": "Pen", "price": 1.5 },
    { "name": "Notebook", "price": 3.0 }
]

print(f"Total: {calculate_total(items)}")`;

  return (
    <div className={styles.editorContainer}>
      <Editor
        height="100%"
        defaultLanguage="python"
        defaultValue={initialCode}
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
