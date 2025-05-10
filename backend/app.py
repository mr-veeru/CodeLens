"""
CodeLens Backend API
A Flask-based REST API for code analysis and documentation generation.
Provides endpoints for code analysis, language detection, and documentation generation.
"""

from flask import Flask, request, jsonify, make_response
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
import hashlib
import datetime
from werkzeug.middleware.proxy_fix import ProxyFix
import secrets
import pycparser
from pycparser import c_ast
import ast
# Comment out the problematic imports
# from guesslang import Guess
import math

# Configure logging with rotation
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)
handler = RotatingFileHandler('app.log', maxBytes=10000, backupCount=3)
handler.setFormatter(logging.Formatter(
    '%(asctime)s %(levelname)s: %(message)s [in %(pathname)s:%(lineno)d]'
))
logger.addHandler(handler)

app = Flask(__name__)
app.wsgi_app = ProxyFix(app.wsgi_app, x_for=1, x_proto=1)

# Configure application secret key
if not os.environ.get('FLASK_SECRET_KEY'):
    os.environ['FLASK_SECRET_KEY'] = secrets.token_hex(32)
app.secret_key = os.environ.get('FLASK_SECRET_KEY')

# Configure CORS with specific origins
# In production, replace with actual domain
ALLOWED_ORIGINS = os.environ.get('ALLOWED_ORIGINS', 'http://localhost:3000,http://127.0.0.1:3000').split(',')
CORS(app, resources={
    r"/api/*": {
        "origins": ALLOWED_ORIGINS,
        "methods": ["GET", "POST"],
        "allow_headers": ["Content-Type", "Authorization"]
    },
    r"/analyze": {
        "origins": ALLOWED_ORIGINS,
        "methods": ["POST", "OPTIONS"],
        "allow_headers": ["Content-Type", "Authorization"]
    }
})

# Configure rate limiting
limiter = Limiter(
    app=app,
    key_func=get_remote_address,
    default_limits=["200 per day", "50 per hour"],
    storage_uri=os.environ.get("REDIS_URL", "memory://")
)

# In-memory cache configuration
cache = {}
CACHE_EXPIRY = 60 * 60  # 1 hour in seconds

# Security headers middleware
@app.after_request
def add_security_headers(response):
    """
    Add security headers to all responses.
    
    Args:
        response: Flask response object
        
    Returns:
        Response with security headers added
    """
    response.headers['Content-Security-Policy'] = "default-src 'self'"
    response.headers['X-Content-Type-Options'] = 'nosniff'
    response.headers['X-Frame-Options'] = 'DENY'
    response.headers['X-XSS-Protection'] = '1; mode=block'
    response.headers['Strict-Transport-Security'] = 'max-age=31536000; includeSubDomains'
    return response

# Cache decorator
def cache_response(expire=CACHE_EXPIRY):
    """
    Decorator for caching API responses.
    
    Args:
        expire (int): Cache expiration time in seconds
        
    Returns:
        Decorated function with caching functionality
    """
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            # Skip caching for non-GET requests
            if request.method != 'POST':
                return f(*args, **kwargs)
                
            # Generate cache key based on request data
            cache_key = hashlib.md5(request.data).hexdigest()
            
            # Check if result exists in cache
            if cache_key in cache:
                cached_result, timestamp = cache[cache_key]
                # Check if cache has expired
                if time.time() - timestamp < expire:
                    logger.info(f"Cache hit for {cache_key}")
                    return cached_result
            
            # If not in cache or expired, execute the function
            result = f(*args, **kwargs)
            
            # Cache the result
            cache[cache_key] = (result, time.time())
            
            # Clean up old cache entries (simple strategy)
            if len(cache) > 100:  # Limit cache size
                oldest_key = min(cache.items(), key=lambda x: x[1][1])[0]
                cache.pop(oldest_key)
                
            return result
        return decorated_function
    return decorator

# Error handling decorator
def handle_errors(f):
    """
    Decorator for handling errors in API endpoints.
    
    Args:
        f: Function to decorate
        
    Returns:
        Decorated function with error handling
    """
    @wraps(f)
    def decorated_function(*args, **kwargs):
        try:
            return f(*args, **kwargs)
        except Exception as e:
            logger.error(f"Error in {f.__name__}: {str(e)}")
            error_id = hashlib.md5(f"{time.time()}{str(e)}".encode()).hexdigest()[:8]
            logger.error(f"Error ID: {error_id}")
            
            # Include error ID in response for easier troubleshooting
            response = {
                "error": "An internal server error occurred",
                "error_id": error_id
            }
            
            if app.debug:
                response["debug_info"] = str(e)
                
            return jsonify(response), 500
    return decorated_function

# Input validation decorator
def validate_input(f):
    """
    Decorator for validating API input.
    
    Args:
        f: Function to decorate
        
    Returns:
        Decorated function with input validation
    """
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
    """
    Detect the programming language of a file based on its extension and content.
    
    Args:
        filename (str): Name of the file
        content (str): Content of the file
        
    Returns:
        str: Detected programming language
        
    Note:
        Uses both file extension and content analysis for accurate detection
    """
    if filename:
        name_lower = filename.lower()
        if name_lower == '.env' or name_lower.startswith('.env.'):
            return 'Environment Variables'
        if name_lower in ['.gitignore', '.dockerignore']:
            return 'Ignore File'
            
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
    
    # Content-based language detection
    if 'public class ' in content and ('.java' in filename.lower() if filename else True):
        return 'Java'
    elif 'def ' in content and ('.py' in filename.lower() if filename else True):
        return 'Python'
    elif 'function ' in content and ('.js' in filename.lower() if filename else True):
        return 'JavaScript'
    elif '#include' in content and ('.c' in filename.lower() or '.h' in filename.lower() if filename else True):
        return 'C'
    elif '<?php' in content:
        return 'PHP'
    elif 'package ' in content and ('.go' in filename.lower() if filename else True):
        return 'Go'
    elif 'fn ' in content and ('.rs' in filename.lower() if filename else True):
        return 'Rust'
    
    return 'Unknown'

def detect_ml_code(content: str, language: str) -> dict:
    """
    Detect if the code contains machine learning frameworks and patterns.
    
    Args:
        content (str): Code content to analyze
        language (str): Detected programming language
        
    Returns:
        dict: Dictionary containing ML detection results:
            - is_ml_code (bool): Whether the code contains ML patterns
            - frameworks (list): List of detected ML frameworks
            - operations (list): List of detected ML operations
    """
    ml_info = {
        'is_ml_code': False,
        'frameworks': [],
        'operations': []
    }
    
    # Common ML framework imports
    ml_frameworks = {
        'tensorflow': ['tensorflow', 'tf', 'keras'],
        'pytorch': ['torch', 'nn.Module'],
        'scikit-learn': ['sklearn', 'LinearRegression', 'RandomForest'],
        'xgboost': ['xgboost', 'XGBClassifier'],
        'pandas': ['pandas', 'pd.DataFrame'],
        'numpy': ['numpy', 'np.array']
    }
    
    # Common ML operations/patterns
    ml_operations = {
        'training': ['fit', 'train', 'optimizer', 'loss', 'train_test_split'],
        'prediction': ['predict', 'inference', 'evaluate', 'score'],
        'preprocessing': ['transform', 'preprocessing', 'standardization', 'normalize'],
        'evaluation': ['accuracy', 'precision', 'recall', 'f1', 'roc_auc', 'confusion_matrix']
    }
    
    # Detect frameworks
    for framework, patterns in ml_frameworks.items():
        if any(pattern in content for pattern in patterns):
            ml_info['frameworks'].append(framework)
            ml_info['is_ml_code'] = True
    
    # Detect operations
    for operation, patterns in ml_operations.items():
        if any(pattern in content for pattern in patterns):
            ml_info['operations'].append(operation)
            ml_info['is_ml_code'] = True
    
    return ml_info

def analyze_python_structure(content: str) -> dict:
    """
    Analyze the structure of Python code.
    
    Args:
        content (str): Python code content
        
    Returns:
        dict: Dictionary containing code structure analysis:
            - total_lines (int): Total number of lines
            - empty_lines (int): Number of empty lines
            - comment_lines (int): Number of comment lines
            - import_statements (int): Number of import statements
            - function_definitions (int): Number of function definitions
            - class_definitions (int): Number of class definitions
            - variable_declarations (int): Number of variable declarations
            - loops (int): Number of loop statements
            - conditionals (int): Number of conditional statements
    """
    try:
        tree = ast.parse(content)
        structure = {
            'total_lines': len(content.splitlines()),
            'empty_lines': content.count('\n\n'),
            'comment_lines': content.count('#'),
            'import_statements': len([node for node in ast.walk(tree) if isinstance(node, ast.Import) or isinstance(node, ast.ImportFrom)]),
            'function_definitions': len([node for node in ast.walk(tree) if isinstance(node, ast.FunctionDef)]),
            'class_definitions': len([node for node in ast.walk(tree) if isinstance(node, ast.ClassDef)]),
            'variable_declarations': len([node for node in ast.walk(tree) if isinstance(node, ast.Assign)]),
            'loops': len([node for node in ast.walk(tree) if isinstance(node, (ast.For, ast.While))]),
            'conditionals': len([node for node in ast.walk(tree) if isinstance(node, ast.If)])
        }
        return structure
    except Exception as e:
        logger.error(f"Error analyzing Python structure: {str(e)}")
        return {
            'total_lines': len(content.splitlines()),
            'empty_lines': content.count('\n\n'),
            'comment_lines': content.count('#'),
            'import_statements': 0,
            'function_definitions': 0,
            'class_definitions': 0,
            'variable_declarations': 0,
            'loops': 0,
            'conditionals': 0
        }

def analyze_c_structure(content: str) -> dict:
    """
    Analyze the structure of C code.
    
    Args:
        content (str): C code content
        
    Returns:
        dict: Dictionary containing code structure analysis:
            - total_lines (int): Total number of lines
            - empty_lines (int): Number of empty lines
            - comment_lines (int): Number of comment lines
            - import_statements (int): Number of include statements
            - function_definitions (int): Number of function definitions
            - class_definitions (int): Number of struct/union definitions
            - variable_declarations (int): Number of variable declarations
            - loops (int): Number of loop statements
            - conditionals (int): Number of conditional statements
    """
    try:
        parser = pycparser.c_parser.CParser()
        ast = parser.parse(content)
        
        structure = {
            'total_lines': len(content.splitlines()),
            'empty_lines': content.count('\n\n'),
            'comment_lines': content.count('//') + content.count('/*'),
            'import_statements': len([node for node in ast.ext if isinstance(node, pycparser.c_ast.Include)]),
            'function_definitions': len([node for node in ast.ext if isinstance(node, pycparser.c_ast.FuncDef)]),
            'class_definitions': len([node for node in ast.ext if isinstance(node, (pycparser.c_ast.Struct, pycparser.c_ast.Union))]),
            'variable_declarations': len([node for node in ast.ext if isinstance(node, pycparser.c_ast.Decl)]),
            'loops': content.count('for') + content.count('while'),
            'conditionals': content.count('if') + content.count('switch')
        }
        return structure
    except Exception as e:
        logger.error(f"Error analyzing C structure: {str(e)}")
        return {
            'total_lines': len(content.splitlines()),
            'empty_lines': content.count('\n\n'),
            'comment_lines': content.count('//') + content.count('/*'),
            'import_statements': content.count('#include'),
            'function_definitions': content.count('{') - content.count('}'),  # Rough estimate
            'class_definitions': content.count('struct') + content.count('union'),
            'variable_declarations': content.count(';') - content.count('for') - content.count('while'),
            'loops': content.count('for') + content.count('while'),
            'conditionals': content.count('if') + content.count('switch')
        }

def analyze_code_structure(code: str, file_type: str) -> dict:
    """
    Analyze the structure of code based on its type.
    
    Args:
        code (str): Code content to analyze
        file_type (str): Type of the code file
        
    Returns:
        dict: Dictionary containing code structure analysis
    """
    if file_type == 'Python':
        return analyze_python_structure(code)
    elif file_type in ['C', 'C++']:
        return analyze_c_structure(code)
    else:
        # Generic analysis for other languages
        return {
            'total_lines': len(code.splitlines()),
            'empty_lines': code.count('\n\n'),
            'comment_lines': code.count('//') + code.count('/*') + code.count('#'),
            'import_statements': code.count('import') + code.count('require') + code.count('#include'),
            'function_definitions': code.count('function') + code.count('def') + code.count('void') + code.count('int'),
            'class_definitions': code.count('class') + code.count('struct'),
            'variable_declarations': code.count('let') + code.count('const') + code.count('var') + code.count('int') + code.count('float'),
            'loops': code.count('for') + code.count('while'),
            'conditionals': code.count('if') + code.count('switch')
        }

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
    """Generate a human-readable explanation of code with enhanced ML detection."""
    explanation = f"This is {language} code with {structure['total_lines']} lines"
    
    # Add ML-specific explanation if detected
    if 'ml_frameworks' in structure:
        frameworks = ', '.join(structure['ml_frameworks'])
        operations = ', '.join(structure['ml_operations'])
        
        explanation += f". It appears to be a machine learning project using {frameworks}" if frameworks else ". It appears to contain machine learning code"
        explanation += f", performing operations such as {operations}" if operations else ""
    
    explanation += f". It contains {structure['function_definitions']} functions, {structure['class_definitions']} classes, and uses {structure['import_statements']} imports. "
    
    if structure['loops'] > 0 or structure['conditionals'] > 0:
        explanation += f"The code includes {structure['loops']} loops and {structure['conditionals']} conditional statements. "
    
    # Add detailed structure explanation if available
    if 'detailed_structure' in structure:
        detailed = structure['detailed_structure']
        if 'classes' in detailed and detailed['classes']:
            class_names = ', '.join([c['name'] for c in detailed['classes'][:3]])
            explanation += f"Main classes include: {class_names}" + ("..." if len(detailed['classes']) > 3 else "") + ". "
            
        if 'functions' in detailed and detailed['functions']:
            func_names = ', '.join([f['name'] for f in detailed['functions'][:3]])
            explanation += f"Key functions include: {func_names}" + ("..." if len(detailed['functions']) > 3 else "") + "."
    
    return explanation

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

def generate_code_summary(code: str, file_type: str) -> dict:
    """
    Generate a summary of the code content.
    
    Args:
        code (str): Code content to analyze
        file_type (str): Type of the code file
        
    Returns:
        dict: Dictionary containing code summary:
            - language (str): Detected programming language
            - ml_info (dict): Machine learning related information
            - structure (dict): Code structure analysis
            - complexity (dict): Code complexity metrics
    """
    try:
        # Detect language if not provided
        if not file_type:
            file_type = detect_file_type('', code)
        
        # Get ML information
        ml_info = detect_ml_code(code, file_type)
        
        # Analyze code structure
        structure = analyze_code_structure(code, file_type)
        
        # Calculate complexity metrics
        complexity = {
            'cyclomatic_complexity': calculate_cyclomatic_complexity(code),
            'cognitive_complexity': calculate_cognitive_complexity(code),
            'maintainability_index': calculate_maintainability_index(structure)
        }
        
        return {
            'language': file_type,
            'ml_info': ml_info,
            'structure': structure,
            'complexity': complexity
        }
    except Exception as e:
        logger.error(f"Error generating code summary: {str(e)}")
        return {
            'language': file_type or 'Unknown',
            'ml_info': {'is_ml_code': False, 'frameworks': [], 'operations': []},
            'structure': {
                'total_lines': len(code.splitlines()),
                'empty_lines': 0,
                'comment_lines': 0,
                'import_statements': 0,
                'function_definitions': 0,
                'class_definitions': 0,
                'variable_declarations': 0,
                'loops': 0,
                'conditionals': 0
            },
            'complexity': {
                'cyclomatic_complexity': 0,
                'cognitive_complexity': 0,
                'maintainability_index': 0
            }
        }

def calculate_cyclomatic_complexity(code: str) -> int:
    """
    Calculate the cyclomatic complexity of the code.
    
    Args:
        code (str): Code content to analyze
        
    Returns:
        int: Cyclomatic complexity score
    """
    try:
        # Count decision points
        decision_points = (
            code.count('if') + code.count('else') +
            code.count('for') + code.count('while') +
            code.count('case') + code.count('catch') +
            code.count('&&') + code.count('||') +
            code.count('?')  # ternary operator
        )
        return decision_points + 1  # Base complexity is 1
    except Exception as e:
        logger.error(f"Error calculating cyclomatic complexity: {str(e)}")
        return 1

def calculate_cognitive_complexity(code: str) -> int:
    """
    Calculate the cognitive complexity of the code.
    
    Args:
        code (str): Code content to analyze
        
    Returns:
        int: Cognitive complexity score
    """
    try:
        # Count nested structures and breaks in linear flow
        complexity = 0
        nesting_level = 0
        
        for line in code.splitlines():
            # Increase complexity for nested structures
            if any(keyword in line for keyword in ['if', 'for', 'while', 'switch']):
                complexity += (1 + nesting_level)
                nesting_level += 1
            elif '}' in line:
                nesting_level = max(0, nesting_level - 1)
            
            # Increase complexity for breaks in linear flow
            if any(keyword in line for keyword in ['break', 'continue', 'return', 'throw']):
                complexity += 1
        
        return complexity
    except Exception as e:
        logger.error(f"Error calculating cognitive complexity: {str(e)}")
        return 0

def calculate_maintainability_index(structure: dict) -> float:
    """
    Calculate the maintainability index of the code.
    
    Args:
        structure (dict): Code structure analysis
        
    Returns:
        float: Maintainability index score (0-100)
    """
    try:
        # Calculate Halstead volume
        total_lines = structure['total_lines']
        if total_lines == 0:
            return 100.0
            
        # Calculate comment ratio
        comment_ratio = structure['comment_lines'] / total_lines
        
        # Calculate cyclomatic complexity per line
        complexity_per_line = (
            structure['loops'] + 
            structure['conditionals'] + 
            structure['function_definitions']
        ) / total_lines
        
        # Calculate maintainability index
        mi = 171 - 5.2 * math.log(complexity_per_line) - 0.23 * math.log(total_lines) - 16.2 * math.log(comment_ratio)
        
        # Normalize to 0-100 scale
        return max(0, min(100, mi))
    except Exception as e:
        logger.error(f"Error calculating maintainability index: {str(e)}")
        return 0.0

@app.route('/api/analyze', methods=['POST'])
@limiter.limit("10 per minute")
@cache_response(expire=60*10)
@handle_errors
@validate_input
def analyze_code():
    """
    Analyze code and generate documentation.
    
    Returns:
        JSON response containing analysis results
    """
    data = request.get_json()
    code = data['code']
    filename = data.get('filename', '')
    
    file_type = detect_file_type(filename, code)
    structure = analyze_code_structure(code, file_type)
    explanation = generate_code_explanation(code, file_type, structure)
    documented_code = generate_documented_code(code, file_type, structure)
    
    return jsonify({
        'language': file_type,
        'structure': structure,
        'explanation': explanation,
        'documented_code': documented_code
    })

@app.route('/analyze', methods=['POST', 'OPTIONS'])
def analyze_compat():
    """Legacy endpoint for compatibility."""
    if request.method == 'OPTIONS':
        response = make_response()
        response.headers.add('Access-Control-Allow-Origin', '*')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization')
        response.headers.add('Access-Control-Allow-Methods', 'POST,OPTIONS')
        return response
        
    return analyze_code()

@app.route('/api/health', methods=['GET'])
def health_check():
    """
    Health check endpoint.
    
    Returns:
        JSON response indicating API status
    """
    return jsonify({
        'status': 'healthy',
        'timestamp': datetime.datetime.utcnow().isoformat()
    })

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    debug = os.environ.get('FLASK_DEBUG', 'False').lower() == 'true'
    app.run(host='0.0.0.0', port=port, debug=debug) 