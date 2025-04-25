from flask import Flask, request, jsonify
from flask_cors import CORS
from pygments.lexers import get_lexer_for_filename, guess_lexer
from pygments.util import ClassNotFound
import re
import json
import os
from pathlib import Path

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

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
        
        # Check for TypeScript/React patterns in the content
        if 'import React' in content or 'from \'react\'' in content:
            if 'interface ' in content or 'type ' in content:
                return 'TypeScript React'
            return 'JavaScript React'
        elif 'interface ' in content or 'type ' in content:
            return 'TypeScript'
            
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

@app.route('/api/analyze', methods=['POST'])
def analyze_code():
    try:
        data = request.json
        code = data.get('code', '')
        filename = data.get('filename', '')  # Get filename if provided
        
        if not code:
            return jsonify({'error': 'No code provided'}), 400
        
        # Detect language/file type
        language = detect_file_type(filename, code)
        
        # Analyze code structure
        structure = analyze_code_structure(code, language)
        
        # Generate explanation
        explanation = generate_code_explanation(code, language, structure)
        
        return jsonify({
            'language': language,
            'explanation': explanation,
            'structure': structure
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True, port=5000) 