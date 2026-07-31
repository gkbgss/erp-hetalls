import sys
import os

# Add backend directory to sys.path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from database import SessionLocal, Employee, User, Base, engine
from auth import hash_password

Base.metadata.create_all(bind=engine)

def sync_users():
    db = SessionLocal()
    
    # 1. Fix legacy emails in Employee table
    for emp in db.query(Employee).all():
        if emp.email and ('@example.com' in emp.email or '@company.com' in emp.email):
            new_email = emp.email.replace('@example.com', '@hetalls.com').replace('@company.com', '@hetalls.com')
            if not db.query(Employee).filter(Employee.email == new_email).first():
                emp.email = new_email
            else:
                db.delete(emp)
            
    # Fix legacy emails in User table
    for user in db.query(User).all():
        if user.email and ('@example.com' in user.email or '@company.com' in user.email):
            new_email = user.email.replace('@example.com', '@hetalls.com').replace('@company.com', '@hetalls.com')
            if not db.query(User).filter(User.email == new_email).first():
                user.email = new_email
            else:
                db.delete(user)
                
    try:
        db.commit()
    except Exception as e:
        db.rollback()
        print(f"Error during legacy email fix: {e}")

    # Remove duplicate employees with salary == 0
    from collections import defaultdict
    name_map = defaultdict(list)
    for emp in db.query(Employee).all():
        name_map[emp.name.lower().strip()].append(emp)
        
    for name, emps in name_map.items():
        if len(emps) > 1:
            for emp in emps:
                if getattr(emp, 'salary', 0) == 0:
                    db.delete(emp)
                    print(f"Deleted duplicate zero-salary employee: {emp.name} ({emp.email})")
    db.commit()

    employees = db.query(Employee).all()
    print(f"Found {len(employees)} employees. Syncing to Users...")
    
    count = 0
    for emp in employees:
        base_email = emp.email if emp.email else f"{emp.name.lower().replace(' ', '')}@hetalls.com"
        email = base_email
        counter = 1
        
        while db.query(User).filter(User.email == email).first() is not None:
            existing_user = db.query(User).filter(User.email == email).first()
            if existing_user and existing_user.name == emp.name:
                break
            email = f"{emp.name.lower().replace(' ', '')}{counter}@hetalls.com"
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
            if not user.role or user.role == "viewer":
                user.role = "viewer"
                user.permissions = []
            
        count += 1

    db.commit()
    
    # Sync missing users to employees (if manually added via User Management)
    users = db.query(User).all()
    print(f"Found {len(users)} users. Syncing back to Employees...")
    emp_count = 0
    for user in users:
        emp = db.query(Employee).filter(Employee.email == user.email).first()
        if not emp:
            emp = Employee(
                name=user.name,
                email=user.email,
                department=user.department or "General",
                role="Employee"
            )
            db.add(emp)
            emp_count += 1
            
    db.commit()
    db.close()
    print(f"Successfully synced {count} users and {emp_count} employees!")

if __name__ == "__main__":
    sync_users()
