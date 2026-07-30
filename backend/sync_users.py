import sys
import os

# Add backend directory to sys.path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from database import SessionLocal, Employee, User, Base, engine
from auth import hash_password

Base.metadata.create_all(bind=engine)

def sync_users():
    db = SessionLocal()
    
    # First, fix any legacy @example.com emails in the Employee table
    for emp in db.query(Employee).filter(Employee.email.like('%@example.com')).all():
        emp.email = emp.email.replace('@example.com', '@company.com')
    db.commit()

    employees = db.query(Employee).all()
    
    print(f"Found {len(employees)} employees. Syncing...")
    
    count = 0
    for emp in employees:
        base_email = f"{emp.name.lower().replace(' ', '')}@company.com"
        email = base_email
        counter = 1
        
        while db.query(User).filter(User.email == email).first() is not None:
            # Check if this user is actually the employee we already created
            existing_user = db.query(User).filter(User.email == email).first()
            if existing_user and existing_user.name == emp.name and existing_user.department == emp.department:
                break
            email = f"{emp.name.lower().replace(' ', '')}{counter}@company.com"
            counter += 1
            
        user = db.query(User).filter(User.email == email).first()
        if not user:
            user = User(
                name=emp.name,
                email=email,
                hashed_password=hash_password("123"),
            )
            db.add(user)
            db.flush()
        
        user.department = emp.department
        
        dept_lower = (emp.department or "").lower()
        
        if "it" in dept_lower:
            user.role = "admin"
            user.permissions = ["Dashboard", "Ecommerce", "Inventory", "Accounts", "Hr", "Reports"]
        elif "account" in dept_lower:
            user.role = "accountant"
            user.permissions = ["Accounts", "Reports"]
        elif "logistics" in dept_lower:
            user.role = "logistics"
            user.permissions = ["Accounts", "Reports"]
        elif "e-commerce" in dept_lower or "ecommerce" in dept_lower:
            user.role = "ecommerce"
            user.permissions = ["Dashboard"]
        elif "hr" in dept_lower or "human" in dept_lower:
            user.role = "hr"
            user.permissions = ["Hr"]
        else:
            user.role = "viewer"
            user.permissions = []
            
        count += 1

    db.commit()
    db.close()
    print(f"Successfully synced {count} users!")

if __name__ == "__main__":
    sync_users()
