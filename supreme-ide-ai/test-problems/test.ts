import { invoke } from '@tauri-apps/api/core';
import React from 'react';

// Missing invoke import - should cause error when used
const result = invoke('some_command');

// Unused variable
const unusedVariable = "This is never used";

// Undefined variable usage
console.log(undefined_var);
console.log(missing_var);

// Used variable - should not trigger warning
const usedVariable = "This is used";
console.log(usedVariable);

// JSX syntax error - missing closing tag
export default function App() {
    return <div>Hello World;
} 