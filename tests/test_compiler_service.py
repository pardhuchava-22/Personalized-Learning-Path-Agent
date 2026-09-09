from app.services.compiler_service import CompilerService, CodeRemediationService


def test_python_compiler_runs_code():
    result = CompilerService.run_python_code("print(2 + 3)")
    assert result["success"] is True
    assert "5" in result["stdout"]


def test_remediation_explains_name_error():
    result = CodeRemediationService.explain_error("print(x)", "NameError: name x is not defined")
    assert "not defined" in result.lower()
