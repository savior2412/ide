# Python Test File with various LSP diagnostics
import os
import sys
import json  # Unused import

# Error: Variable 'undefined_variable' is not defined
print(undefined_variable)

# Error: Another undefined variable
result = calculate_something()

# Variable assignments
name = "Alice" 
age = 25
city = "New York"

# Using defined variables (these should be fine)
print(name)
print(age)

# Error: Using undefined variable in operation
total = count + 10

# Function definition
def process_data(data):
    # Error: undefined variable inside function
    return process_value(data)

# Another undefined variable
user_info = get_user_details()

# Using built-in functions (should be fine)
numbers = [1, 2, 3, 4, 5]
print(len(numbers))
print(max(numbers))

# Error: Undefined variable in f-string
message = f"Hello {username}!"

# Some valid code
for i in range(5):
    print(i)
    
# More undefined variables
config = load_configuration()
database = connect_to_db() 