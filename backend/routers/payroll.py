from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from database import get_db, Employee
from auth import require_roles
import calendar
from datetime import datetime

router = APIRouter(prefix="/api/payroll", tags=["payroll"])

import math

def calc_inr_deductions(gross: float, year_month: str, absent: float = 0, 
                        extra_present: float = 0, extra_hour: float = 0, 
                        less_hour: float = 0, adv1: float = 0, adv2: float = 0, department: str = ""):
    try:
        dt = datetime.strptime(year_month, "%Y-%m")
        y, m = dt.year, dt.month
    except Exception:
        now = datetime.now()
        y, m = now.year, now.month

    # Get total days in month
    _, total_days = calendar.monthrange(y, m)
    
    # Get number of Sundays
    sundays = sum(1 for d in range(1, total_days + 1) if calendar.weekday(y, m, d) == 6)
    
    daily_wage = gross / total_days if total_days else 0
    hourly_wage = daily_wage / 8
    
    # Calculate Additions
    excluded_depts = {'guard', 'store', 'helper', 'field', 'feild', 'carpet production', 'packing', 'production'}
    added_paid_leave = daily_wage if department.lower() not in excluded_depts else 0
    added_extra_present = extra_present * daily_wage
    added_extra_hour = extra_hour * hourly_wage
    added_pay = added_paid_leave + added_extra_present + added_extra_hour
    
    # Calculate Deductions
    sunday_deductions = math.floor(absent / 6)
    deducted_absent = absent * daily_wage
    deducted_penalty = sunday_deductions * daily_wage
    
    deducted_late_pay = 0
    if less_hour > 12:
        deducted_late_pay = 2 * daily_wage
    elif less_hour > 8:
        deducted_late_pay = 1.5 * daily_wage
    elif less_hour > 6:
        deducted_late_pay = 1 * daily_wage
    elif less_hour > 2.4:
        deducted_late_pay = 0.5 * daily_wage
        
    total_advance = adv1 + adv2
    deducted_pay = deducted_absent + deducted_penalty + deducted_late_pay + total_advance
    
    net_pay = max(0, gross + added_pay - deducted_pay)
    
    return {
        "gross": round(gross, 2),
        "month": f"{calendar.month_name[m]} {y}",
        "total_days": total_days,
        "sundays": sundays,
        "per_day": round(daily_wage, 2),
        "absent_days": absent,
        
        "added_paid_leave": round(added_paid_leave, 2),
        "added_extra_present": round(added_extra_present, 2),
        "added_extra_hour": round(added_extra_hour, 2),
        
        "sunday_penalty_days": sunday_deductions,
        "absent_deduction": round(deducted_absent, 2),
        "leave_deduction": 0,
        "sunday_deduction": round(deducted_penalty, 2),
        "late_deduction": round(deducted_late_pay, 2),
        "advance_deduction": round(total_advance, 2),
        
        "total_deductions": round(deducted_pay, 2),
        "net_pay": round(net_pay, 2)
    }

@router.get("/summary")
def payroll_summary(year_month: str = "", db: Session = Depends(get_db), current_user=Depends(require_roles("admin", "hr", "analyst"))):
    employees = db.query(Employee).filter(Employee.is_active == True, Employee.salary > 0).all()
    total_gross = 0
    total_net = 0
    total_deductions = 0
    dept_totals = {}
    
    for e in employees:
        d = calc_inr_deductions(e.salary, year_month, 0, 0, 0, 0, 0, 0, e.department) # Default 0 absent for summary
        total_gross += d["gross"]
        total_net += d["net_pay"]
        total_deductions += d["total_deductions"]
        dept_totals[e.department] = dept_totals.get(e.department, 0) + d["gross"]

    return {
        "total_employees":   len(employees),
        "total_gross":       round(total_gross, 2),
        "total_net":         round(total_net, 2),
        "total_deductions":  round(total_deductions, 2),
        "dept_breakdown":    [{"department": k, "total": round(v, 2)} for k, v in sorted(dept_totals.items(), key=lambda x: -x[1])],
    }

@router.get("/employees")
def payroll_employees(year_month: str = "", db: Session = Depends(get_db), current_user=Depends(require_roles("admin", "hr", "analyst"))):
    employees = db.query(Employee).filter(Employee.is_active == True, Employee.salary > 0).order_by(func.lower(Employee.name).asc()).all()
    result = []
    for e in employees:
        # Defaulting absent to 0 for initial load, frontend will allow modifying per employee locally for calculations
        d = calc_inr_deductions(e.salary, year_month, 0, 0, 0, 0, 0, 0, e.department)
        result.append({
            "id":         e.id,
            "name":       e.name,
            "department": e.department,
            "role":       e.role,
            "salary":     e.salary,
            "payroll":    d
        })
    return result

@router.get("/calculate")
def calculate_salary(salary: float, absent: float = 0, extra_present: float = 0, extra_hour: float = 0, less_hour: float = 0, adv1: float = 0, adv2: float = 0, department: str = "", year_month: str = "", current_user=Depends(require_roles("admin", "hr", "analyst")), db: Session = Depends(get_db)):
    """Real-time salary calculation endpoint for the calculator tool."""
    return calc_inr_deductions(salary, year_month, absent, extra_present, extra_hour, less_hour, adv1, adv2, department)
