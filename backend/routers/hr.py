from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from pydantic import BaseModel
from database import get_db, Employee
from auth import require_roles
import csv
from io import StringIO
from datetime import datetime

router = APIRouter(prefix="/api/hr", tags=["hr"])

@router.get("/employees")
def get_employees(db: Session = Depends(get_db), current_user=Depends(require_roles("admin", "hr", "analyst"))):
    employees = db.query(Employee).order_by(Employee.name).all()
    return employees

class SalaryUpdate(BaseModel):
    salary: float

@router.put("/employees/{emp_id}/salary")
def update_salary(
    emp_id: int,
    payload: SalaryUpdate,
    db: Session = Depends(get_db),
    current_user=Depends(require_roles("admin", "hr"))
):
    emp = db.query(Employee).filter(Employee.id == emp_id).first()
    if not emp:
        raise HTTPException(status_code=404, detail="Employee not found")
    emp.salary = round(payload.salary, 2)
    db.commit()
    db.refresh(emp)
    return {"message": f"Salary updated for {emp.name}", "new_salary": emp.salary}

@router.post("/upload")
def upload_employees(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user=Depends(require_roles("admin", "hr"))
):
    if not file.filename.endswith('.csv'):
        raise HTTPException(status_code=400, detail="Only CSV files are supported. Please upload a CSV sheet.")
    
    contents = file.file.read().decode('utf-8')
    csv_reader = csv.DictReader(StringIO(contents))
    
    # Remove all existing data from HR
    db.query(Employee).delete()
    
    for row in csv_reader:
        # Expected headers: Name, Email, Department, Role, Salary
        name = row.get('Name', '').strip()
        email = row.get('Email', '').strip()
        if not name:
            continue
            
        emp = Employee(
            name=name,
            email=email or f"{name.lower().replace(' ', '.')}@example.com",
            department=row.get('Department', 'General').strip(),
            role=row.get('Role', 'Employee').strip(),
            salary=float(row.get('Salary', 0.0) or 0.0),
            join_date=datetime.utcnow(),
            is_active=True
        )
        db.add(emp)
        
    db.commit()
    return {"message": "Employees uploaded successfully"}
