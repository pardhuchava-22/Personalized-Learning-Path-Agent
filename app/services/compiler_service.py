from __future__ import annotations

import subprocess
import sys
import tempfile
from typing import Dict, List, Optional


class CompilerService:
    """Backend-only compiler helper.

    This file is intentionally isolated from the login pages and UI so the
    student/faculty login design remains unchanged.
    """

    @staticmethod
    def run_python_code(code: str) -> Dict[str, object]:
        """Run Python code in a temporary file and return stdout/stderr."""
        with tempfile.NamedTemporaryFile("w", suffix=".py", delete=False) as temp_file:
            temp_file.write(code)
            temp_path = temp_file.name

        try:
            result = subprocess.run(
                [sys.executable, temp_path],
                capture_output=True,
                text=True,
                timeout=15,
            )
            return {
                "success": result.returncode == 0,
                "stdout": result.stdout,
                "stderr": result.stderr,
                "exit_code": result.returncode,
            }
        except subprocess.TimeoutExpired:
            return {
                "success": False,
                "stdout": "",
                "stderr": "Execution timed out after 15 seconds.",
                "exit_code": -1,
            }
        finally:
            try:
                import os
                os.remove(temp_path)
            except Exception:
                pass

    @staticmethod
    def run_javascript_code(code: str) -> Dict[str, object]:
        """Run JavaScript code using Node.js when available."""
        try:
            result = subprocess.run(
                ["node", "-e", code],
                capture_output=True,
                text=True,
                timeout=15,
            )
            return {
                "success": result.returncode == 0,
                "stdout": result.stdout,
                "stderr": result.stderr,
                "exit_code": result.returncode,
            }
        except FileNotFoundError:
            return {
                "success": False,
                "stdout": "",
                "stderr": "Node.js is not installed in this environment.",
                "exit_code": -1,
            }
        except subprocess.TimeoutExpired:
            return {
                "success": False,
                "stdout": "",
                "stderr": "JavaScript execution timed out after 15 seconds.",
                "exit_code": -1,
            }


class CodeRemediationService:
    """Simple code remediation helper for challenge feedback."""

    @staticmethod
    def explain_error(code: str, error_text: str) -> str:
        if "SyntaxError" in error_text or "IndentationError" in error_text:
            return (
                "Check the syntax and indentation in your code. Make sure every block and statement is correctly written."
            )
        if "NameError" in error_text:
            return (
                "A variable or function name is not defined. Verify the spelling and scope of each identifier."
            )
        if "TypeError" in error_text:
            return (
                "The data type does not match what the code expects. Check your variable types and function arguments."
            )
        if "ZeroDivisionError" in error_text:
            return (
                "You are dividing by zero. Verify your divisor before performing the calculation."
            )
        if not error_text.strip():
            return "No runtime error detected. Review the logic and test your output against expected values."
        return (
            f"Review the code around the reported error: {error_text}. "
            "Break the problem into smaller steps and test each part separately."
        )

    @staticmethod
    def suggest_fix(code: str, error_text: str) -> str:
        if "SyntaxError" in error_text or "IndentationError" in error_text:
            return "Add the missing colon, correct indentation, and check for bracket balance."
        if "NameError" in error_text:
            return "Define the missing variable or function before using it."
        if "TypeError" in error_text:
            return "Convert values to the right type before performing operations."
        if "ZeroDivisionError" in error_text:
            return "Avoid dividing by zero by checking the divisor before the division."
        return "Refactor the code into smaller steps and validate input/output after each step."
