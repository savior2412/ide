fn main() {
    // Unwrap usage - should trigger warning
    let result = Some(42).unwrap();
    
    // Unused variable - should trigger warning  
    let unused_var = "never used";
    
    // Used variable - should not trigger warning
    let used_var = "this is used";
    println!("{}", used_var);
    
    println!("Result: {}", result);
} 