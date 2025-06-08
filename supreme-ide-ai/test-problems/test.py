import os
import sys
import requests  # This import is not used

def main():
    # Missing f-string
    name = "John"
    message = "Hello {}".format(name)
    
    # Undefined variable usage
    print(undefined_var)
    
    # Using None/null
    result = null
    
    print(message)

if __name__ == "__main__":
    main() 