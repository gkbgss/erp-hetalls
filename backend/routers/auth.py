from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from pydantic import BaseModel, EmailStr
from typing import Optional
from database import get_db, User
from auth import verify_password, hash_password, create_access_token, get_current_user

router = APIRouter(prefix="/api/auth", tags=["auth"])

class UserCreate(BaseModel):
    name:       str
    email:      str
    password:   str
    role:       str = "viewer"
    permissions: list = []
    department: str = "General"

class UserOut(BaseModel):
    id:         int
    name:       str
    email:      str
    role:       str
    permissions: list
    department: str
    is_active:  bool
    class Config:
        from_attributes = True

class TokenResponse(BaseModel):
    access_token: str
    token_type:   str
    user:         UserOut

@router.post("/login", response_model=TokenResponse)
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == form_data.username).first()
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password")
    if not user.is_active:
        raise HTTPException(status_code=403, detail="Account deactivated. Contact admin.")
    token = create_access_token({"sub": user.email, "role": user.role})
    return {"access_token": token, "token_type": "bearer", "user": user}

@router.get("/me", response_model=UserOut)
def me(current_user: User = Depends(get_current_user)):
    return current_user

@router.post("/register", response_model=UserOut)
def register(payload: UserCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Only admins can create users")
    if db.query(User).filter(User.email == payload.email).first():
        raise HTTPException(status_code=400, detail="Email already registered")
    
    if not payload.permissions:
        # Default permissions based on role if none provided
        defaults = {
            'admin': ['dashboard', 'ecommerce', 'inventory', 'accounts', 'hr', 'reports'],
            'hr': ['dashboard', 'hr'],
            'accountant': ['dashboard', 'accounts', 'reports'],
            'warehouse': ['dashboard', 'inventory'],
            'ecommerce': ['dashboard', 'ecommerce'],
            'analyst': ['dashboard', 'ecommerce', 'inventory', 'accounts', 'hr', 'reports'],
            'viewer': ['dashboard']
        }
        payload.permissions = defaults.get(payload.role, ['dashboard'])

    user = User(
        name=payload.name,
        email=payload.email,
        hashed_password=hash_password(payload.password),
        role=payload.role,
        permissions=payload.permissions,
        department=payload.department,
    )
    db.add(user)
    
    # Also create a matching Employee record if it doesn't exist
    from database import Employee
    emp = db.query(Employee).filter(Employee.email == payload.email).first()
    if not emp:
        emp = Employee(
            name=payload.name,
            email=payload.email,
            department=payload.department,
            role="Employee"
        )
        db.add(emp)
        
    db.commit()
    db.refresh(user)
    return user
