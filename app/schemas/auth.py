from pydantic import BaseModel, EmailStr
from typing import Optional, Any

class TokenSchema(BaseModel):
    access: str
    refresh: str

class TokenRefreshRequest(BaseModel):
    refresh: str

class LoginRequest(BaseModel):
    username: str
    password: str

class UserRegisterRequest(BaseModel):
    username: str
    email: EmailStr
    password: str
    password_confirm: str
    role: Optional[str] = 'student'
    first_name: Optional[str] = ''
    last_name: Optional[str] = ''
    department: Optional[str] = None
    institution: Optional[str] = None

class UserProfileResponse(BaseModel):
    id: int
    username: str
    email: str
    first_name: str
    last_name: str
    role: str
    phone: Optional[str] = None
    profile_picture: Optional[str] = None
    institution: Optional[str] = None
    department: Optional[str] = None
    is_verified: bool

    class Config:
        from_attributes = True
