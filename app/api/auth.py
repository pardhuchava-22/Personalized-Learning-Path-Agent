from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database.db import get_db
from app.repositories.user_repo import UserRepository
from app.services.auth_service import verify_password, get_password_hash, create_access_token, create_refresh_token, verify_token
from app.schemas.auth import LoginRequest, TokenSchema, TokenRefreshRequest, UserRegisterRequest, UserProfileResponse
from app.models.user import User
import datetime

router = APIRouter(prefix="/auth", tags=["auth"])

@router.post("/token/", response_model=TokenSchema)
def login_for_token(login_data: LoginRequest, db: Session = Depends(get_db)):
    user = UserRepository.get_by_username(db, login_data.username)
    if not user or not verify_password(login_data.password, user.password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials. Please check your username and password."
        )
        
    # Update last login
    user.last_login = datetime.datetime.utcnow()
    db.commit()
    
    access = create_access_token(data={"sub": user.username, "role": user.role})
    refresh = create_refresh_token(data={"sub": user.username})
    
    return {"access": access, "refresh": refresh}

@router.post("/token/refresh/", response_model=TokenSchema)
def refresh_token(refresh_data: TokenRefreshRequest, db: Session = Depends(get_db)):
    payload = verify_token(refresh_data.refresh)
    if not payload or "sub" not in payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session expired. Please login again."
        )
        
    username = payload["sub"]
    user = UserRepository.get_by_username(db, username)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found."
        )
        
    access = create_access_token(data={"sub": user.username, "role": user.role})
    refresh = create_refresh_token(data={"sub": user.username})
    
    return {"access": access, "refresh": refresh}
