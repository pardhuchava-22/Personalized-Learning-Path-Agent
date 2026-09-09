from sqlalchemy.orm import Session
from typing import Optional, List
from app.models.user import User

class UserRepository:
    @staticmethod
    def get_by_id(db: Session, user_id: int) -> Optional[User]:
        return db.query(User).filter(User.id == user_id).first()
        
    @staticmethod
    def get_by_username(db: Session, username: str) -> Optional[User]:
        return db.query(User).filter(User.username == username).first()
        
    @staticmethod
    def get_by_email(db: Session, email: str) -> Optional[User]:
        return db.query(User).filter(User.email == email).first()
        
    @staticmethod
    def get_users_by_role(db: Session, role: str) -> List[User]:
        return db.query(User).filter(User.role == role).all()
        
    @staticmethod
    def create(db: Session, user_obj: User) -> User:
        db.add(user_obj)
        db.commit()
        db.refresh(user_obj)
        return user_obj
        
    @staticmethod
    def delete(db: Session, user_obj: User) -> None:
        db.delete(user_obj)
        db.commit()
