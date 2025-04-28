from flask import Flask, request, jsonify
from flask_cors import CORS
from pygments.lexers import get_lexer_for_filename, guess_lexer
from pygments.util import ClassNotFound
import re
import json
import os
from pathlib import Path
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
import logging
from logging.handlers import RotatingFileHandler
from functools import wraps
import time

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)
handler = RotatingFileHandler('app.log', maxBytes=10000, backupCount=3)
handler.setFormatter(logging.Formatter(
    '%(asctime)s %(levelname)s: %(message)s [in %(pathname)s:%(lineno)d]'
))
logger.addHandler(handler)

app = Flask(__name__)

# Configure CORS with specific origins
CORS(app, resources={
    r"/api/*": {
        "origins": ["http://localhost:3000", "http://127.0.0.1:3000"],
        "methods": ["GET", "POST"],
        "allow_headers": ["Content-Type"]
    },
    r"/analyze": {
        "origins": ["http://localhost:3000", "http://127.0.0.1:3000"],
        "methods": ["POST", "OPTIONS"],
        "allow_headers": ["Content-Type"]
    }
})

# Configure rate limiting
limiter = Limiter(
    app=app,
    key_func=get_remote_address,
    default_limits=["200 per day", "50 per hour"]
)

# Error handling decorator
def handle_errors(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        try:
            return f(*args, **kwargs)
        except Exception as e:
            logger.error(f"Error in {f.__name__}: {str(e)}")
            return jsonify({"error": "An internal server error occurred"}), 500
    return decorated_function

# Input validation decorator
def validate_input(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if not request.is_json:
            return jsonify({"error": "Request must be JSON"}), 400
        
        data = request.get_json()
        if not data or 'code' not in data:
            return jsonify({"error": "Missing required field: code"}), 400
        
        if not isinstance(data['code'], str):
            return jsonify({"error": "Code must be a string"}), 400
        
        if len(data['code']) > 1000000:  # 1MB limit
            return jsonify({"error": "Code size exceeds limit"}), 413
            
        return f(*args, **kwargs)
    return decorated_function

def detect_file_type(filename: str, content: str) -> str:
    """Detect file type based on extension and content."""
    # First check the filename
    if filename:
        # Handle files that should be detected by name first
        name_lower = filename.lower()
        if name_lower == '.env' or name_lower.startswith('.env.'):
            return 'Environment Variables'
        if name_lower in ['.gitignore', '.dockerignore']:
            return 'Ignore File'
            
        # Then check extensions
        ext = Path(filename).suffix.lower()
        if ext == '.tsx':
            return 'TypeScript React'
        elif ext == '.ts':
            return 'TypeScript'
        elif ext == '.jsx':
            return 'JavaScript React'
        elif ext == '.json':
            try:
                json.loads(content)
                return 'JSON'
            except:
                pass
        elif ext in ['.yml', '.yaml']:
            return 'YAML'
        elif ext == '.xml':
            return 'XML'
        elif ext == '.toml':
            return 'TOML'
        elif ext in ['.ini', '.cfg', '.config']:
            return 'Configuration File'
        elif ext in ['.md', '.markdown']:
            return 'Markdown'
    
    # Advanced content-based detection when filename is not available
    # Check for common language patterns
    
    # Java
    if 'public class ' in content and ('.java' in filename.lower() if filename else True):
        return 'Java'
        
    # C#
    if 'namespace ' in content and 'using System' in content:
        return 'C#'
        
    # Python
    if ('import ' in content and 'def ' in content) or 'if __name__ == "__main__"' in content:
        return 'Python'
        
    # JavaScript/TypeScript
    if 'function ' in content or 'const ' in content or 'let ' in content:
        if 'interface ' in content or 'type ' in content:
            if 'import React' in content or 'from \'react\'' in content:
                return 'TypeScript React'
            return 'TypeScript'
        if 'import React' in content or 'from \'react\'' in content:
            return 'JavaScript React'
        return 'JavaScript'
        
    # HTML
    if '<!DOCTYPE html>' in content or '<html' in content:
        return 'HTML'
        
    # CSS
    if '{' in content and '}' in content and (':' in content) and (';' in content):
        css_properties = ['margin', 'padding', 'color', 'background', 'font-size', 'display']
        if any(prop in content for prop in css_properties):
            return 'CSS'
    
    # Try to detect programming language using Pygments
    try:
        if filename:
            lexer = get_lexer_for_filename(filename)
        else:
            lexer = guess_lexer(content)
        return lexer.name
    except ClassNotFound:
        # If we can't detect the language, try to determine if it's a config file
        if '=' in content and not any(keyword in content.lower() for keyword in ['if', 'for', 'while', 'def', 'class']):
            return 'Environment Variables'
        
        return "Plain Text"

def analyze_config_file(content: str, file_type: str) -> dict:
    """Analyze configuration and data files."""
    lines = content.split('\n')
    analysis = {
        'total_lines': len(lines),
        'empty_lines': sum(1 for line in lines if not line.strip()),
        'comment_lines': 0,
        'import_statements': 0,
        'function_definitions': 0,
        'class_definitions': 0,
        'variable_declarations': 0,
        'loops': 0,
        'conditionals': 0
    }
    
    non_empty_lines = [line.strip() for line in lines if line.strip()]
    
    if file_type == 'JSON':
        # Count key-value pairs in JSON
        try:
            data = json.loads(content)
            analysis['variable_declarations'] = len(str(data).count(': '))
        except:
            pass
    elif file_type == 'Environment Variables':
        # Count variable declarations in .env files
        analysis['variable_declarations'] = sum(1 for line in non_empty_lines if '=' in line and not line.startswith('#'))
        analysis['comment_lines'] = sum(1 for line in lines if line.strip().startswith('#'))
    elif file_type in ['YAML', 'Configuration File']:
        analysis['variable_declarations'] = sum(1 for line in non_empty_lines if ':' in line)
        analysis['comment_lines'] = sum(1 for line in lines if line.strip().startswith('#'))
    elif file_type == 'XML':
        analysis['variable_declarations'] = content.count('</')  # Count XML tags
        analysis['comment_lines'] = content.count('<!--')
    elif file_type == 'Markdown':
        analysis['comment_lines'] = sum(1 for line in lines if line.strip().startswith('<!--'))
    elif file_type == 'Ignore File':
        analysis['comment_lines'] = sum(1 for line in lines if line.strip().startswith('#'))
        analysis['variable_declarations'] = sum(1 for line in non_empty_lines if not line.startswith('#'))
    
    return analysis

def analyze_code_structure(code: str, file_type: str) -> dict:
    """Analyze basic code structure and patterns."""
    if file_type in ['JSON', 'Environment Variables', 'YAML', 'XML', 'TOML', 'Configuration File', 'Markdown', 'Ignore File']:
        return analyze_config_file(code, file_type)
    
    lines = code.split('\n')
    analysis = {
        'total_lines': len(lines),
        'empty_lines': sum(1 for line in lines if not line.strip()),
        'comment_lines': sum(1 for line in lines if line.strip().startswith(('//', '/*', '*', '#'))),
        'import_statements': sum(1 for line in lines if re.match(r'^\s*(import|from|require|using)\s+', line.strip())),
        'function_definitions': sum(1 for line in lines if re.search(r'(function\s+\w+|\w+\s*:\s*function|\w+\s*=\s*\(.*\)\s*=>|def\s+\w+)', line.strip())),
        'class_definitions': sum(1 for line in lines if re.search(r'(class\s+\w+|interface\s+\w+|type\s+\w+\s*=)', line.strip())),
        'variable_declarations': sum(1 for line in lines if re.match(r'^\s*(var|let|const|int|float|string|bool|\w+:\s*\w+)\s+\w+', line.strip())),
        'loops': sum(1 for line in lines if re.search(r'\b(for|while|do)\b', line.strip())),
        'conditionals': sum(1 for line in lines if re.search(r'\b(if|else|switch|case)\b', line.strip()))
    }
    return analysis

def analyze_function_purpose(func_name: str, func_content: str, language: str) -> str:
    """Analyze function content to determine its purpose."""
    func_name_words = re.findall(r'[A-Z]?[a-z]+|[A-Z]+(?=[A-Z]|$)', func_name)
    func_name_clean = ' '.join(func_name_words).lower()
    
    # Common function name prefixes and their meanings
    prefixes = {
        'get': 'Retrieves or calculates',
        'set': 'Updates or changes',
        'is': 'Checks if',
        'has': 'Checks if it contains',
        'calc': 'Calculates',
        'compute': 'Computes or calculates',
        'create': 'Creates a new',
        'build': 'Constructs',
        'make': 'Creates',
        'generate': 'Produces or creates',
        'find': 'Searches for',
        'search': 'Searches for',
        'parse': 'Analyzes and processes',
        'format': 'Formats or structures',
        'convert': 'Converts or transforms',
        'transform': 'Transforms',
        'validate': 'Validates or checks',
        'check': 'Checks or verifies',
        'handle': 'Manages or processes',
        'process': 'Processes',
        'update': 'Updates',
        'delete': 'Removes',
        'remove': 'Removes',
        'add': 'Adds',
        'insert': 'Inserts',
        'fetch': 'Retrieves data',
        'load': 'Loads data',
        'save': 'Saves or persists',
        'store': 'Stores or saves',
        'render': 'Displays or renders',
        'display': 'Shows or displays',
        'print': 'Outputs or prints',
        'log': 'Records or logs',
        'init': 'Initializes',
        'initialize': 'Sets up initial state',
        'setup': 'Configures or sets up',
        'configure': 'Configures',
        'start': 'Begins or initiates',
        'stop': 'Stops or terminates',
        'pause': 'Temporarily halts',
        'resume': 'Continues after pausing',
        'on': 'Handles event',
        'handle': 'Processes or manages'
    }
    
    # Check for common return types/patterns
    return_patterns = {
        'boolean': ['return true', 'return false', 'return (', 'return !', 'return !!'],
        'string': ['return "', "return '", 'return `', '+', 'concat', 'join', 'toString'],
        'number': ['return 0', 'return 1', 'return -', 'return parseFloat', 'return parseInt', 'Math.'],
        'array': ['return [', 'push(', 'pop(', 'shift(', 'filter(', 'map(', 'forEach(', 'reduce('],
        'object': ['return {', 'return new', '.keys(', '.values(', '.entries('],
        'void': ['return;', 'setState', 'this.state', 'console.log']
    }
    
    # Check for UI-related patterns (React/frontend)
    ui_patterns = ['render', 'component', 'props', 'state', 'useState', 'useEffect', 'return <', 'className', 'style=']
    api_patterns = ['fetch(', 'axios', 'http', '.get(', '.post(', '.put(', '.delete(', 'request', 'response']
    data_patterns = ['map', 'filter', 'reduce', 'forEach', '.find(', '.sort(', 'array', 'object', 'json']
    event_patterns = ['click', 'change', 'submit', 'event', 'handler', 'listener', 'on', 'addEventListener']
    
    # Determine function purpose based on name prefix
    purpose = ""
    for prefix, description in prefixes.items():
        if func_name.lower().startswith(prefix):
            remaining = func_name[len(prefix):].strip()
            if remaining:
                # Convert camelCase to space-separated words
                remaining_words = re.findall(r'[A-Z]?[a-z]+|[A-Z]+(?=[A-Z]|$)', remaining)
                remaining_clean = ' '.join(remaining_words).lower()
                purpose = f"{description} {remaining_clean}"
            else:
                purpose = f"{description} data"
            break
    
    # If no prefix match, use the function name itself
    if not purpose:
        purpose = f"Handles {func_name_clean} functionality"
    
    # Enhance description based on content patterns
    enhancements = []
    
    # Check function content for return type
    return_type = None
    for type_name, patterns in return_patterns.items():
        if any(pattern in func_content for pattern in patterns):
            return_type = type_name
            break
    
    if return_type:
        enhancements.append(f"returns {return_type}")
    
    # Check for specific functionality
    if any(pattern in func_content for pattern in ui_patterns):
        enhancements.append("manages UI components or rendering")
    elif any(pattern in func_content for pattern in api_patterns):
        enhancements.append("communicates with external API or services")
    elif any(pattern in func_content for pattern in data_patterns):
        enhancements.append("processes or transforms data")
    elif any(pattern in func_content for pattern in event_patterns):
        enhancements.append("handles user interactions or events")
    
    # Add enhancements to purpose
    if enhancements:
        purpose += f" and {', '.join(enhancements)}"
    
    return purpose

def generate_code_explanation(code: str, language: str, structure: dict) -> str:
    """Generate a natural language explanation of the code based on its structure."""
    if language in ['JSON', 'Environment Variables', 'YAML', 'XML', 'TOML', 'Configuration File', 'Markdown', 'Ignore File']:
        explanation_parts = [
            f"This {language} file contains {structure['total_lines']} lines.",
            f"It defines {structure['variable_declarations']} {'key-value pairs' if language == 'JSON' else 'variables' if language == 'Environment Variables' else 'entries'}."
        ]
        
        if structure['comment_lines'] > 0:
            explanation_parts.append(f"The file includes {structure['comment_lines']} comment{'s' if structure['comment_lines'] != 1 else ''}.")
        
        if structure['empty_lines'] > 0:
            explanation_parts.append(f"There are {structure['empty_lines']} empty line{'s' if structure['empty_lines'] != 1 else ''} for better readability.")
            
        return " ".join(explanation_parts)
    
    explanation_parts = [
        f"This {language} code contains {structure['total_lines']} lines of code.",
        f"It has {structure['function_definitions']} function{'s' if structure['function_definitions'] != 1 else ''}",
        f"and {structure['class_definitions']} class{'es' if structure['class_definitions'] != 1 else ''}."
    ]
    
    if structure['import_statements'] > 0:
        explanation_parts.append(f"The code imports {structure['import_statements']} external module{'s' if structure['import_statements'] != 1 else ''}.")
    
    if structure['loops'] > 0 or structure['conditionals'] > 0:
        control_flow = []
        if structure['loops'] > 0:
            control_flow.append(f"{structure['loops']} loop{'s' if structure['loops'] != 1 else ''}")
        if structure['conditionals'] > 0:
            control_flow.append(f"{structure['conditionals']} conditional statement{'s' if structure['conditionals'] != 1 else ''}")
        explanation_parts.append(f"It uses {' and '.join(control_flow)} for control flow.")
    
    if structure['variable_declarations'] > 0:
        explanation_parts.append(f"There are {structure['variable_declarations']} variable declaration{'s' if structure['variable_declarations'] != 1 else ''}.")
    
    if structure['comment_lines'] > 0:
        explanation_parts.append(f"The code includes {structure['comment_lines']} comment line{'s' if structure['comment_lines'] != 1 else ''} for documentation.")
    
    return " ".join(explanation_parts)

def generate_documented_code(code: str, language: str, structure: dict) -> str:
    """Generate documented version of the code."""
    lines = code.split('\n')
    documented_lines = []
    
    # Handle configuration and data files
    if language in ['JSON', 'Environment Variables', 'YAML', 'XML', 'TOML', 'Configuration File', 'Markdown', 'Ignore File']:
        if language == 'JSON':
            documented_lines.append('// JSON Configuration File')
            documented_lines.append('// This file contains configuration settings in JSON format.')
            documented_lines.append('')
            return '\n'.join(documented_lines + lines)
        elif language == 'Environment Variables':
            documented_lines.append('# Environment Variables')
            documented_lines.append('# This file contains environment-specific configuration variables.')
            documented_lines.append('')
            return '\n'.join(documented_lines + lines)
        else:
            comment_char = '#' if language in ['YAML', 'Configuration File', 'Ignore File'] else '//'
            documented_lines.append(f'{comment_char} {language} File')
            documented_lines.append(f'{comment_char} This file contains configuration settings.')
            documented_lines.append('')
            return '\n'.join(documented_lines + lines)
    
    # Get appropriate comment syntax for the language
    if language in ['JavaScript', 'TypeScript', 'JavaScript React', 'TypeScript React', 'C', 'C++', 'Java', 'C#']:
        single_line = '//'
        multi_start = '/**'
        multi_line = ' * '
        multi_end = ' */'
    elif language in ['Python', 'Ruby', 'Shell', 'Bash', 'YAML']:
        single_line = '#'
        multi_start = '"""'
        multi_line = ''
        multi_end = '"""'
    elif language in ['HTML', 'XML']:
        single_line = '<!-- '
        multi_start = '<!-- '
        multi_line = ''
        multi_end = ' -->'
    else:  # Default
        single_line = '//'
        multi_start = '/*'
        multi_line = ' * '
        multi_end = ' */'
    
    # Add a file header
    documented_lines.append(f'{multi_start}')
    documented_lines.append(f'{multi_line}File: {language} code')
    documented_lines.append(f'{multi_line}Description: This file contains {language} code with {structure["function_definitions"]} functions and {structure["class_definitions"]} classes.')
    if structure['import_statements'] > 0:
        documented_lines.append(f'{multi_line}Imports: {structure["import_statements"]} external modules/libraries')
    documented_lines.append(f'{multi_line}Total lines: {structure["total_lines"]}')
    documented_lines.append(f'{multi_end}')
    documented_lines.append('')
    
    # Process the code line by line
    i = 0
    while i < len(lines):
        line = lines[i]
        stripped = line.strip()
        
        # Skip empty lines
        if not stripped:
            documented_lines.append(line)
            i += 1
            continue
        
        # Skip existing comments
        if stripped.startswith(('//', '/*', '*/', '#', '<!--', '-->')):
            documented_lines.append(line)
            i += 1
            continue
        
        # Check for import statements
        if re.match(r'^\s*(import|from|require|using)\s+', stripped):
            if i == 0 or not re.match(r'^\s*(import|from|require|using)\s+', lines[i-1].strip()):
                documented_lines.append(f'{single_line} Imports required modules')
            documented_lines.append(line)
            i += 1
            continue
        
        # Check for class definitions
        if re.search(r'(class\s+\w+|interface\s+\w+|type\s+\w+\s*=)', stripped):
            class_name = re.search(r'(class|interface|type)\s+(\w+)', stripped)
            if class_name and len(class_name.groups()) > 1:
                name = class_name.group(2)
                documented_lines.append(f'{multi_start}')
                documented_lines.append(f'{multi_line}{class_name.group(1).capitalize()} {name}')
                documented_lines.append(f'{multi_line}Description: Defines the {name} {class_name.group(1)}')
                documented_lines.append(f'{multi_end}')
            else:
                documented_lines.append(f'{single_line} Defines a {stripped.split()[0]}')
            documented_lines.append(line)
            i += 1
            continue
        
        # Check for function definitions
        func_match = re.search(r'(function\s+(\w+)|\w+\s*:\s*function|(\w+)\s*=\s*\(.*\)\s*=>|def\s+(\w+))', stripped)
        if func_match:
            # Extract function name
            func_name = None
            if func_match.group(2):  # function name()
                func_name = func_match.group(2)
            elif func_match.group(3):  # name = () =>
                func_name = func_match.group(3)
            elif func_match.group(4):  # def name()
                func_name = func_match.group(4)
            
            if func_name:
                # Extract function body
                func_body = ""
                open_braces = 0
                j = i
                
                # For Python (indentation-based)
                if language == 'Python':
                    base_indent = len(line) - len(line.lstrip())
                    while j < len(lines) and (j == i or len(lines[j]) - len(lines[j].lstrip()) > base_indent or not lines[j].strip()):
                        func_body += lines[j] + "\n"
                        j += 1
                else:
                    # For brace-based languages
                    if '{' in line:
                        open_braces += line.count('{') - line.count('}')
                    
                    while j < len(lines) and (open_braces > 0 or j == i):
                        func_body += lines[j] + "\n"
                        j += 1
                        if j < len(lines):
                            open_braces += lines[j-1].count('{') - lines[j-1].count('}')
                
                # Analyze function purpose
                purpose = analyze_function_purpose(func_name, func_body, language)
                
                documented_lines.append(f'{multi_start}')
                documented_lines.append(f'{multi_line}Function: {func_name}')
                documented_lines.append(f'{multi_line}Description: {purpose}')
                
                # Check for parameters
                params = re.search(r'\((.*?)\)', line)
                if params and params.group(1).strip():
                    param_list = params.group(1).split(',')
                    for param in param_list:
                        param = param.strip()
                        if param and param != ')':
                            param_name = param.split(':')[0].strip() if ':' in param else param.split('=')[0].strip()
                            documented_lines.append(f'{multi_line}@param {param_name} - Parameter description')
                
                # Determine return value based on function content
                if language in ['JavaScript', 'TypeScript', 'Java', 'C#']:
                    if 'return ' in func_body:
                        if 'return true' in func_body or 'return false' in func_body:
                            documented_lines.append(f'{multi_line}@returns Boolean indicating success or validation result')
                        elif 'return {' in func_body or 'return new ' in func_body:
                            documented_lines.append(f'{multi_line}@returns Object containing the result data')
                        elif 'return [' in func_body:
                            documented_lines.append(f'{multi_line}@returns Array of items')
                        elif 'return null' in func_body:
                            documented_lines.append(f'{multi_line}@returns Null in certain conditions')
                        else:
                            documented_lines.append(f'{multi_line}@returns Result of the operation')
                    else:
                        documented_lines.append(f'{multi_line}@returns Void - no return value')
                else:
                    documented_lines.append(f'{multi_line}@returns Description of return value')
                
                documented_lines.append(f'{multi_end}')
            else:
                documented_lines.append(f'{single_line} Function definition')
            
            documented_lines.append(line)
            i += 1
            continue
        
        # Check for variable declarations
        var_match = re.match(r'^\s*(var|let|const|int|float|string|bool|\w+:\s*\w+)\s+(\w+)', stripped)
        if var_match:
            var_name = var_match.group(2)
            
            # Try to infer variable purpose
            var_purpose = "stores data"
            if '_id' in var_name or 'Id' in var_name:
                var_purpose = "stores identifier"
            elif 'count' in var_name.lower() or 'num' in var_name.lower():
                var_purpose = "stores numeric count"
            elif 'name' in var_name.lower():
                var_purpose = "stores name string"
            elif 'is' in var_name.lower() or 'has' in var_name.lower() or 'should' in var_name.lower():
                var_purpose = "stores boolean flag"
            elif 'date' in var_name.lower() or 'time' in var_name.lower():
                var_purpose = "stores date/time value"
            elif 'list' in var_name.lower() or 'array' in var_name.lower() or var_name.endswith('s'):
                var_purpose = "stores collection of items"
            elif 'config' in var_name.lower() or 'options' in var_name.lower() or 'settings' in var_name.lower():
                var_purpose = "stores configuration options"
            
            documented_lines.append(f'{single_line} {var_name}: Variable that {var_purpose}')
            documented_lines.append(line)
            i += 1
            continue
        
        # Check for loops
        if re.search(r'\b(for|while|do)\b', stripped):
            loop_purpose = "iterating through items"
            
            # Try to infer loop purpose
            if 'i = 0' in stripped or 'i=0' in stripped or 'let i' in stripped:
                loop_purpose = "iterating through indices"
            elif 'forEach' in stripped or 'map' in stripped:
                loop_purpose = "processing each item in collection"
            elif 'while' in stripped and ('true' in stripped or '1' in stripped):
                loop_purpose = "running continuously until interrupted"
            
            documented_lines.append(f'{single_line} Loop for {loop_purpose}')
            documented_lines.append(line)
            i += 1
            continue
        
        # Check for conditionals
        if re.search(r'\b(if|else|switch|case)\b', stripped):
            if 'if' in stripped:
                # Try to infer condition purpose
                if 'null' in stripped or 'undefined' in stripped:
                    documented_lines.append(f'{single_line} Conditional check for null/undefined value')
                elif '==' in stripped or '===' in stripped:
                    documented_lines.append(f'{single_line} Conditional check for equality')
                elif '>' in stripped or '<' in stripped:
                    documented_lines.append(f'{single_line} Conditional check for comparison')
                else:
                    documented_lines.append(f'{single_line} Conditional check')
            elif 'else' in stripped:
                documented_lines.append(f'{single_line} Alternative condition')
            elif 'switch' in stripped or 'case' in stripped:
                documented_lines.append(f'{single_line} Switch case for multiple conditions')
            documented_lines.append(line)
            i += 1
            continue
        
        # Default: pass through
        documented_lines.append(line)
        i += 1
    
    return '\n'.join(documented_lines)

@app.route('/api/analyze', methods=['POST'])
@limiter.limit("10 per minute")
@handle_errors
@validate_input
def analyze_code():
    start_time = time.time()
    data = request.get_json()
    code = data['code']
    filename = data.get('filename', '')
    
    try:
        # Detect file type
        file_type = detect_file_type(filename, code)
        
        # Analyze code structure
        structure = analyze_code_structure(code, file_type)
        
        # Generate explanation
        explanation = generate_code_explanation(code, file_type, structure)
        
        # Generate documented code
        documented_code = generate_documented_code(code, file_type, structure)
        
        response_time = time.time() - start_time
        logger.info(f"Analysis completed in {response_time:.2f} seconds for file: {filename}")
        
        return jsonify({
            "language": file_type,
            "explanation": explanation,
            "structure": structure,
            "documented_code": documented_code
        })
        
    except Exception as e:
        logger.error(f"Error analyzing code: {str(e)}")
        return jsonify({"error": "Failed to analyze code"}), 500

@app.route('/analyze', methods=['POST', 'OPTIONS'])
def analyze_compat():
    if request.method == 'OPTIONS':
        return '', 200
    return analyze_code()

if __name__ == '__main__':
    app.run(debug=True, port=5000) 