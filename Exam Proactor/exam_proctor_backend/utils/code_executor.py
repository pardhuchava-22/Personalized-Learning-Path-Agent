"""
Utilities for code execution and testing.
"""
import subprocess
import json
from django.conf import settings
import os
import tempfile

class CodeExecutor:
    """Execute and test code submissions."""
    
    LANGUAGE_EXTENSIONS = {
        'python': '.py',
        'javascript': '.js',
        'java': '.java',
        'cpp': '.cpp',
        'csharp': '.cs',
        'go': '.go',
    }
    
    def __init__(self, language):
        self.language = language
        self.extension = self.LANGUAGE_EXTENSIONS.get(language, '.txt')
    
    def execute(self, code, input_data='', timeout=30):
        """
        Execute code and return output.
        
        Args:
            code: Source code to execute
            input_data: Input to provide to the program
            timeout: Timeout in seconds
            
        Returns:
            dict with keys: success, output, error, execution_time
        """
        try:
            # Create temporary file
            with tempfile.NamedTemporaryFile(mode='w', suffix=self.extension, delete=False) as f:
                f.write(code)
                temp_file = f.name
            
            try:
                if self.language == 'python':
                    return self._execute_python(temp_file, input_data, timeout)
                elif self.language == 'javascript':
                    return self._execute_javascript(temp_file, input_data, timeout)
                elif self.language == 'java':
                    return self._execute_java(temp_file, code, input_data, timeout)
                elif self.language == 'cpp':
                    return self._execute_cpp(temp_file, input_data, timeout)
                else:
                    return {
                        'success': False,
                        'output': '',
                        'error': f'Language {self.language} not supported',
                        'execution_time': 0
                    }
            finally:
                # Clean up temp file
                if os.path.exists(temp_file):
                    os.remove(temp_file)
        except Exception as e:
            return {
                'success': False,
                'output': '',
                'error': str(e),
                'execution_time': 0
            }
    
    def _execute_python(self, file_path, input_data, timeout):
        """Execute Python code."""
        try:
            result = subprocess.run(
                ['python', file_path],
                input=input_data,
                capture_output=True,
                text=True,
                timeout=timeout
            )
            return {
                'success': result.returncode == 0,
                'output': result.stdout,
                'error': result.stderr,
                'execution_time': 0
            }
        except subprocess.TimeoutExpired:
            return {
                'success': False,
                'output': '',
                'error': f'Execution timeout exceeded {timeout}s',
                'execution_time': timeout
            }
    
    def _execute_javascript(self, file_path, input_data, timeout):
        """Execute JavaScript code."""
        try:
            result = subprocess.run(
                ['node', file_path],
                input=input_data,
                capture_output=True,
                text=True,
                timeout=timeout
            )
            return {
                'success': result.returncode == 0,
                'output': result.stdout,
                'error': result.stderr,
                'execution_time': 0
            }
        except subprocess.TimeoutExpired:
            return {
                'success': False,
                'output': '',
                'error': f'Execution timeout exceeded {timeout}s',
                'execution_time': timeout
            }
    
    def _execute_java(self, file_path, code, input_data, timeout):
        """Execute Java code."""
        # For Java, more complex compilation needed
        return {
            'success': False,
            'output': '',
            'error': 'Java execution not yet implemented',
            'execution_time': 0
        }
    
    def _execute_cpp(self, file_path, input_data, timeout):
        """Execute C++ code."""
        # For C++, compilation needed first
        return {
            'success': False,
            'output': '',
            'error': 'C++ execution not yet implemented',
            'execution_time': 0
        }


def run_test_cases(code, test_cases, language, time_limit=30, memory_limit=256):
    """
    Run code against multiple test cases.
    
    Args:
        code: Source code
        test_cases: List of dicts with 'input' and 'expected_output'
        language: Programming language
        time_limit: Time limit in seconds
        memory_limit: Memory limit in MB
        
    Returns:
        dict with test results
    """
    executor = CodeExecutor(language)
    results = {
        'passed': 0,
        'failed': 0,
        'total': len(test_cases),
        'test_results': []
    }
    
    for i, test_case in enumerate(test_cases):
        result = executor.execute(
            code,
            input_data=test_case.get('input', ''),
            timeout=time_limit
        )
        
        expected_output = test_case.get('expected_output', '').strip()
        actual_output = result['output'].strip() if result['success'] else ''
        
        passed = expected_output == actual_output
        
        results['test_results'].append({
            'test_number': i + 1,
            'passed': passed,
            'expected': expected_output,
            'actual': actual_output,
            'error': result['error'] if result['error'] else None
        })
        
        if passed:
            results['passed'] += 1
        else:
            results['failed'] += 1
    
    return results
