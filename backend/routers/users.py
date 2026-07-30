from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List, Optional
from database import get_db, User
from auth import get_current_user, hash_password, require_roles

router = APIRouter(prefix="/api/users", tags=["users"])

class UserOut(BaseModel):
    id: int; name: str; email: str; role: str; permissions: list; department: str; is_active: bool
    class Config: from_attributes = True

class UserUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    password: Optional[str] = None
    role: Optional[str] = None
    permissions: Optional[list] = None
    department: Optional[str] = None
    is_active: Optional[bool] = None

@router.get("/", response_model=List[UserOut])
def list_users(db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    return db.query(User).filter(User.is_active == True).all()

@router.put("/{user_id}", response_model=UserOut)
def update_user(user_id: int, payload: UserUpdate, db: Session = Depends(get_db), current_user=Depends(require_roles("admin"))):
    user = db.query(User).filter(User.id == user_id).first()
    if not user: raise Exception("User not found")
    
    # Try to find corresponding Employee by current email or name before updating User
    from database import Employee
    employee = db.query(Employee).filter((Employee.email == user.email) | (Employee.name == user.name)).first()
    
    update_data = payload.dict(exclude_none=True)
    if "password" in update_data:
        user.hashed_password = hash_password(update_data.pop("password"))
        
    for k, v in update_data.items():
        setattr(user, k, v)
        
    if employee:
        if "name" in update_data:
            employee.name = update_data["name"]
        if "email" in update_data:
            employee.email = update_data["email"]
        if "department" in update_data:
            employee.department = update_data["department"]
            
    db.commit(); db.refresh(user)
    return user

@router.delete("/{user_id}")
def delete_user(user_id: int, db: Session = Depends(get_db), current_user=Depends(require_roles("admin"))):
    user = db.query(User).filter(User.id == user_id).first()
    if user:
        db.delete(user); db.commit()
    return {"message": "User deleted"}
