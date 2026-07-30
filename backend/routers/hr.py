from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from pydantic import BaseModel
from database import get_db, Employee
from auth import require_roles, get_current_user
import csv
from io import StringIO
from datetime import datetime

router = APIRouter(prefix="/api/hr", tags=["hr"])

@router.get("/employees")
def get_employees(db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    query = db.query(Employee)
    
    # Admins see everyone; others only see their own department
    if (current_user.role or "").lower() != "admin":
        query = query.filter(Employee.department == current_user.department)
        
    employees = query.order_by(Employee.name).all()
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
    
    try:
        contents = file.file.read().decode('utf-8-sig') # utf-8-sig automatically removes BOM if present
    except UnicodeDecodeError:
        file.file.seek(0)
        contents = file.file.read().decode('latin-1')
        
    if not contents.strip():
        raise HTTPException(status_code=400, detail="The uploaded file is completely empty.")
        
    # Auto-detect delimiter (comma, semicolon, tab, etc)
    try:
        dialect = csv.Sniffer().sniff(contents[:2048])
        csv_reader = csv.DictReader(StringIO(contents), dialect=dialect)
    except csv.Error:
        # Fallback to standard comma if sniffer fails
        csv_reader = csv.DictReader(StringIO(contents))
    
    # Remove all existing data from HR
    db.query(Employee).delete()
    
    processed = 0
    headers_found = []
    
    for row in csv_reader:
        if not headers_found:
            headers_found = list(row.keys())
            
        # Normalize headers to lowercase to be extremely forgiving
        norm_row = {str(k).strip().lower(): str(v).strip() for k, v in row.items() if k}
        
        # Fuzzy matching for column names
        name_key = next((k for k in norm_row.keys() if 'name' in k and 'com' not in k and 'company' not in k), None)
        salary_key = next((k for k in norm_row.keys() if 'salary' in k or 'pay' in k or 'amount' in k), None)
        dept_key = next((k for k in norm_row.keys() if 'dept' in k or 'department' in k), None)
        email_key = next((k for k in norm_row.keys() if 'email' in k or 'mail' in k), None)
        role_key = next((k for k in norm_row.keys() if 'role' in k or 'designation' in k), None)
        company_key = next((k for k in norm_row.keys() if 'com' in k or 'company' in k), None)
        
        name = norm_row.get(name_key, '') if name_key else ''
        if not name:
            continue
            
        email = norm_row.get(email_key, '') if email_key else ''
        company = norm_row.get(company_key, 'Hetalls Global') if company_key else 'Hetalls Global'
        
        # Clean up salary string (remove $, ₹, commas)
        raw_salary = norm_row.get(salary_key, '0') if salary_key else '0'
        salary_str = raw_salary.replace(',', '').replace('$', '').replace('₹', '')
        try:
            salary_val = float(salary_str)
        except ValueError:
            salary_val = 0.0
            
        emp = Employee(
            name=name,
            company=company,
            email=email or f"{name.lower().replace(' ', '.')}@example.com",
            department=norm_row.get(dept_key, 'General') if dept_key else 'General',
            role=norm_row.get(role_key, 'Employee') if role_key else 'Employee',
            salary=salary_val,
            join_date=datetime.utcnow(),
            is_active=True
        )
        db.add(emp)
        processed += 1
        
    db.commit()
    
    if processed == 0:
        raise HTTPException(status_code=400, detail=f"No candidates found! The file had these headers: {headers_found}. Make sure the sheet isn't empty.")
        
    return {"message": f"Success! Extracted {processed} candidates."}
