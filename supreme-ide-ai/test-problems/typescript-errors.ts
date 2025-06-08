// TypeScript Test File with various LSP diagnostics
import React from 'react';
import { useState } from 'react';

// Error: Variable 'missing_var' is not defined
console.log(missing_var);

// Error: Property 'invalidProp' does not exist 
const user = { name: 'John', age: 30 };
console.log(user.invalidProp);

// Warning: Unused variable
const unusedVariable = 'never used';

// Error: Cannot find name 'undefinedFunction'
const result = undefinedFunction();

// Error: Argument of type 'string' is not assignable to parameter of type 'number'
function addNumbers(a: number, b: number): number {
    return a + b;
}
addNumbers('5', 10);

// Error: Cannot find name 'Document'
const doc: Document = new Document();

// Missing semicolon (should trigger warning)
const missingSecicolon = 'test'

interface UserInterface {
    name: string;
    email: string;
}

// Error: Property 'phone' does not exist on type 'UserInterface'
const userData: UserInterface = {
    name: 'Alice',
    email: 'alice@example.com'
};
console.log(userData.phone); 