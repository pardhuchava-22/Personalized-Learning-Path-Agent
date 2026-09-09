from fastapi import APIRouter, Depends, HTTPException, status, Header
from sqlalchemy.orm import Session
from app.database.db import get_db
from app.repositories.user_repo import UserRepository
from app.services.auth_service import verify_token, get_password_hash
from app.schemas.auth import UserProfileResponse, UserRegisterRequest
from app.models.user import User

router = APIRouter(prefix="/users", tags=["users"])
FACULTY_ROLES = {"faculty", "instructor", "admin"}

# Dependency to extract active user from Authorization header
def get_current_user(authorization: str | None = Header(None), db: Session = Depends(get_db)) -> User:
    if not authorization:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authorization header is missing"
        )
    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token scheme")
        
    token = authorization.split(" ")[1]
    payload = verify_token(token)
    if not payload or "sub" not in payload:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired token")
        
    user = UserRepository.get_by_username(db, payload["sub"])
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
    return user

@router.get("/profile/", response_model=UserProfileResponse)
def get_profile(current_user: User = Depends(get_current_user)):
    return current_user

@router.post("/", response_model=UserProfileResponse)
def register_user(req: UserRegisterRequest, db: Session = Depends(get_db)):
    if req.password != req.password_confirm:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Passwords do not match")
        
    existing = UserRepository.get_by_username(db, req.username)
    if existing:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Username already exists")
        
    user_obj = User(
        username=req.username,
        email=req.email,
        password=get_password_hash(req.password),
        role=req.role,
        first_name=req.first_name,
        last_name=req.last_name,
        department=req.department,
        institution=req.institution
    )
    return UserRepository.create(db, user_obj)

@router.get("/students/")
def get_students(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if current_user.role not in FACULTY_ROLES:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
    return UserRepository.get_users_by_role(db, "student")
