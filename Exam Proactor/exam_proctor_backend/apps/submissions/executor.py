import subprocess
import tempfile
import os

import sys

def run_code(language, code, test_cases, timeout=5):
    """
    Executes code against test cases.
    language: 'python', 'java', 'c', 'cpp'
    code: string of code
    test_cases: list of dicts [{'input': '...', 'expected_output': '...'}, ...]
    Returns list of results array.
    """
    results = []

    if language == 'python':
        for idx, tc in enumerate(test_cases):
            tc_input = tc.get('input', tc.get('input_data', ''))
            tc_expected = str(tc.get('expected_output', tc.get('expected', ''))).strip()
            
            with tempfile.NamedTemporaryFile('w', suffix='.py', delete=False) as f:
                f.write(code)
                filepath = f.name
            try:
                process = subprocess.run(
                    [sys.executable, filepath],
                    input=tc_input.encode('utf-8'),
                    capture_output=True,
                    timeout=timeout
                )
                output = process.stdout.decode('utf-8').strip()
                error = process.stderr.decode('utf-8').strip()
                
                # Strict compiler accuracy validation
                has_error = bool(error) or (process.returncode != 0)
                if has_error:
                    passed = False
                elif tc_expected:
                    passed = (output == tc_expected)
                else:
                    passed = False
                
                results.append({
                    'test_case_id': tc.get('id', idx),
                    'passed': passed,
                    'output': error if has_error else output,
                    'expected': tc_expected
                })
            except subprocess.TimeoutExpired:
                results.append({
                    'test_case_id': tc.get('id', idx),
                    'passed': False,
                    'output': "Execution Timed Out",
                    'expected': tc_expected
                })
            except Exception as e:
                results.append({
                    'test_case_id': tc.get('id', idx),
                    'passed': False,
                    'output': str(e),
                    'expected': tc_expected
                })
            finally:
                if os.path.exists(filepath):
                    os.remove(filepath)

    elif language == 'java':
        for idx, tc in enumerate(test_cases):
            tc_input = tc.get('input', tc.get('input_data', ''))
            tc_expected = str(tc.get('expected_output', tc.get('expected', ''))).strip()
            
            # For Java, must know the class name. Assuming public class Main.
            dirpath = tempfile.mkdtemp()
            filepath = os.path.join(dirpath, "Main.java")
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(code)
                
            try:
                # Compile
                compile_proc = subprocess.run(['javac', filepath], capture_output=True, timeout=timeout)
                if compile_proc.returncode != 0:
                    results.append({
                        'test_case_id': tc.get('id', idx),
                        'passed': False,
                        'output': compile_proc.stderr.decode('utf-8').strip(),
                        'expected': tc_expected
                    })
                    continue
                
                # Execute
                process = subprocess.run(
                    ['java', '-cp', dirpath, 'Main'],
                    input=tc_input.encode('utf-8'),
                    capture_output=True,
                    timeout=timeout
                )
                output = process.stdout.decode('utf-8').strip()
                error = process.stderr.decode('utf-8').strip()
                
                # Strict compiler accuracy validation
                has_error = bool(error) or (process.returncode != 0)
                if has_error:
                    passed = False
                elif tc_expected:
                    passed = (output == tc_expected)
                else:
                    passed = False
                
                results.append({
                    'test_case_id': tc.get('id', idx),
                    'passed': passed,
                    'output': error if has_error else output,
                    'expected': tc_expected
                })
            except subprocess.TimeoutExpired:
                 results.append({
                    'test_case_id': tc.get('id', idx),
                    'passed': False,
                    'output': "Execution Timed Out",
                    'expected': tc_expected
                })
            except Exception as e:
                results.append({
                    'test_case_id': tc.get('id', idx),
                    'passed': False,
                    'output': str(e),
                    'expected': tc_expected
                })
            finally:
                for f in os.listdir(dirpath):
                    os.remove(os.path.join(dirpath, f))
                os.rmdir(dirpath)
                
    elif language == 'c':
        for idx, tc in enumerate(test_cases):
            tc_input = tc.get('input', tc.get('input_data', ''))
            tc_expected = str(tc.get('expected_output', tc.get('expected', ''))).strip()
            
            with tempfile.NamedTemporaryFile('w', suffix='.c', delete=False) as f:
                f.write(code)
                filepath = f.name
            
            exepath = filepath[:-2]
            if os.name == 'nt':
                 exepath += ".exe"
                 
            try:
                # Compile
                compile_proc = subprocess.run(['gcc', filepath, '-o', exepath], capture_output=True, timeout=timeout)
                if compile_proc.returncode != 0:
                     results.append({
                        'test_case_id': tc.get('id', idx),
                        'passed': False,
                        'output': compile_proc.stderr.decode('utf-8').strip(),
                        'expected': tc_expected
                    })
                     continue
                
                # Execute
                process = subprocess.run(
                    [exepath],
                    input=tc_input.encode('utf-8'),
                    capture_output=True,
                    timeout=timeout
                )
                output = process.stdout.decode('utf-8').strip()
                error = process.stderr.decode('utf-8').strip()
                
                # Strict compiler accuracy validation
                has_error = bool(error) or (process.returncode != 0)
                if has_error:
                    passed = False
                elif tc_expected:
                    passed = (output == tc_expected)
                else:
                    passed = False
                
                results.append({
                    'test_case_id': tc.get('id', idx),
                    'passed': passed,
                    'output': error if has_error else output,
                    'expected': tc_expected
                })
            except subprocess.TimeoutExpired:
                 results.append({
                    'test_case_id': tc.get('id', idx),
                    'passed': False,
                    'output': "Execution Timed Out",
                    'expected': tc_expected
                })
            except Exception as e:
                results.append({
                    'test_case_id': tc.get('id', idx),
                    'passed': False,
                    'output': str(e),
                    'expected': tc_expected
                })
            finally:
                if os.path.exists(filepath):
                    os.remove(filepath)
                if os.path.exists(exepath):
                    os.remove(exepath)
    
    return results
