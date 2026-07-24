from datetime import datetime, timedelta
from typing import Optional
from jose import JWTError, jwt
import bcrypt as _bcrypt
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from database import get_db, User

SECRET_KEY = "rugs-erp-secret-key-2026-change-in-production"
ALGORITHM  = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 480   # 8 hours

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")

def verify_password(plain: str, hashed: str) -> bool:
    return _bcrypt.checkpw(plain.encode(), hashed.encode())

def hash_password(password: str) -> str:
    return _bcrypt.hashpw(password.encode(), _bcrypt.gensalt()).decode()

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    user = db.query(User).filter(User.email == email).first()
    if user is None:
        raise credentials_exception
    return user

def require_roles(*roles_or_perms):
    def checker(current_user: User = Depends(get_current_user)):
        user_role = (current_user.role or "").lower()
        user_perms = [p.lower() for p in (current_user.permissions or [])]
        
        if user_role == "admin":
            return current_user
            
        if user_role in roles_or_perms:
            return current_user
            
        # Fallback to check if they have the specific granular permissions
        # Many roles share the exact name as the permission (e.g. "hr", "ecommerce")
        mapping = {
            "accountant": "accounts",
            "warehouse": "inventory"
        }
        for rp in roles_or_perms:
            perm_to_check = mapping.get(rp, rp)
            if perm_to_check in user_perms:
                return current_user
                
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    return checker
