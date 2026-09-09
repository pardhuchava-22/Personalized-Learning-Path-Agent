from fastapi import APIRouter
from pydantic import BaseModel

from app.services.compiler_service import CompilerService, CodeRemediationService

router = APIRouter(prefix="/compiler", tags=["compiler"])


class CodeRequest(BaseModel):
    code: str
    language: str = "python"


class RemediationRequest(BaseModel):
    code: str
    error_text: str


@router.post("/run")
def run_code(request: CodeRequest):
    if request.language.lower() == "javascript":
        return CompilerService.run_javascript_code(request.code)
    return CompilerService.run_python_code(request.code)


@router.post("/remediation")
def remediation(request: RemediationRequest):
    return {
        "explanation": CodeRemediationService.explain_error(request.code, request.error_text),
        "suggested_fix": CodeRemediationService.suggest_fix(request.code, request.error_text),
    }
