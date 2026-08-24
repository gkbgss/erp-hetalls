from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func, extract
from database import get_db, Order, Product, Invoice, Expense, Employee
from auth import require_roles, get_current_user
from datetime import datetime, timedelta
import urllib.request
import csv
import io
import time
import threading

router = APIRouter(prefix="/api/reports", tags=["reports"])

@router.get("/sales-summary")
def sales_summary(company: str = "", db: Session = Depends(get_db), current_user=Depends(require_roles("admin", "accountant", "analyst"))):
    now = datetime.utcnow()
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    week_start  = now - timedelta(days=now.weekday())

    def filter_co(q, model):
        return q.filter(model.company == company) if company else q

    total_rev  = filter_co(db.query(func.sum(Order.amount)).filter(Order.status != "returned"), Order).scalar() or 0
    month_rev  = filter_co(db.query(func.sum(Order.amount)).filter(Order.order_date >= month_start, Order.status != "returned"), Order).scalar() or 0
    week_rev   = filter_co(db.query(func.sum(Order.amount)).filter(Order.order_date >= week_start,  Order.status != "returned"), Order).scalar() or 0
    total_ord  = filter_co(db.query(func.count(Order.id)), Order).scalar() or 0
    total_exp  = filter_co(db.query(func.sum(Expense.amount)), Expense).scalar() or 0

    return {
        "total_revenue":   round(total_rev, 2),
        "monthly_revenue": round(month_rev, 2),
        "weekly_revenue":  round(week_rev,  2),
        "total_orders":    total_ord,
        "total_expenses":  round(total_exp, 2),
        "net_profit":      round(total_rev - total_exp, 2),
    }

@router.get("/monthly-breakdown")
def monthly_breakdown(company: str = "", db: Session = Depends(get_db), current_user=Depends(require_roles("admin", "accountant", "analyst"))):
    """12 months of revenue, expenses, and order count."""
    now = datetime.utcnow()
    results = []

    def filter_co(q, model):
        return q.filter(model.company == company) if company else q

    for i in range(11, -1, -1):
        d = now - timedelta(days=i * 30)
        y, m = d.year, d.month
        label = d.strftime("%b %Y")

        rev = filter_co(db.query(func.sum(Order.amount)).filter(
            extract("year", Order.order_date) == y,
            extract("month", Order.order_date) == m,
            Order.status != "returned"
        ), Order).scalar() or 0

        exp = filter_co(db.query(func.sum(Expense.amount)).filter(
            extract("year", Expense.date) == y,
            extract("month", Expense.date) == m
        ), Expense).scalar() or 0

        orders = filter_co(db.query(func.count(Order.id)).filter(
            extract("year", Order.order_date) == y,
            extract("month", Order.order_date) == m
        ), Order).scalar() or 0

        results.append({"month": label, "revenue": round(rev, 2), "expenses": round(exp, 2), "orders": orders})
    return results

@router.get("/top-products")
def top_products(company: str = "", db: Session = Depends(get_db), current_user=Depends(require_roles("admin", "accountant", "analyst"))):
    q = db.query(
        Order.product_name,
        Order.sku,
        func.count(Order.id).label("order_count"),
        func.sum(Order.quantity).label("units_sold"),
        func.sum(Order.amount).label("total_revenue")
    ).filter(Order.status != "returned")
    
    if company:
        q = q.filter(Order.company == company)
        
    rows = q.group_by(Order.sku, Order.product_name).order_by(func.sum(Order.amount).desc()).limit(10).all()

    return [
        {
            "product_name":  r.product_name,
            "sku":           r.sku,
            "order_count":   r.order_count,
            "units_sold":    r.units_sold,
            "total_revenue": round(r.total_revenue or 0, 2)
        }
        for r in rows
    ]

@router.get("/platform-comparison")
def platform_comparison(company: str = "", db: Session = Depends(get_db), current_user=Depends(require_roles("admin", "accountant", "analyst"))):
    platforms = ["amazon", "etsy"]
    result = []
    
    def filter_co(q, model):
        return q.filter(model.company == company) if company else q
        
    for p in platforms:
        rev    = filter_co(db.query(func.sum(Order.amount)).filter(Order.platform == p, Order.status != "returned"), Order).scalar() or 0
        count  = filter_co(db.query(func.count(Order.id)).filter(Order.platform == p), Order).scalar() or 0
        ret    = filter_co(db.query(func.count(Order.id)).filter(Order.platform == p, Order.status == "returned"), Order).scalar() or 0
        result.append({
            "platform":       p,
            "total_revenue":  round(rev, 2),
            "total_orders":   count,
            "returns":        ret,
            "return_rate":    round((ret / count * 100) if count else 0, 1),
            "avg_order":      round(rev / count if count else 0, 2),
        })
    return result

@router.get("/dept-headcount")
def dept_headcount(company: str = "", db: Session = Depends(get_db), current_user=Depends(require_roles("admin", "hr", "analyst"))):
    q = db.query(Employee.department, func.count(Employee.id).label("count")).filter(Employee.is_active == True)
    if company:
        q = q.filter(Employee.company == company)
    rows = q.group_by(Employee.department).all()
    return [{"department": r.department, "count": r.count} for r in rows]

_SRK_SHEET_URL = "https://docs.google.com/spreadsheets/d/1pMyWyI6J2YM7DzlYJ9__M8bZNaGPyrgTVAItoSiYYNg/export?format=csv&gid=2023338778"
_SRK_CACHE = {"time": 0, "data": []}
_SRK_LOCK = threading.Lock()

def get_srk_sheet_rows():
    now = time.time()
    with _SRK_LOCK:
        if now - _SRK_CACHE["time"] < 30 and _SRK_CACHE["data"]:
            return _SRK_CACHE["data"]
            
    try:
        req = urllib.request.Request(_SRK_SHEET_URL, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req) as response:
            csv_content = response.read().decode('utf-8', errors='ignore')
            rows = list(csv.reader(io.StringIO(csv_content)))
            with _SRK_LOCK:
                _SRK_CACHE["time"] = time.time()
                _SRK_CACHE["data"] = rows
            return rows
    except Exception as e:
        print(f"Error fetching SRK Google Sheet: {e}")
        with _SRK_LOCK:
            return _SRK_CACHE["data"] or []

@router.get("/google-sheet-links")
def get_google_sheet_links(company: str = "", current_user=Depends(get_current_user)):
    rows = get_srk_sheet_rows()
    if not rows:
        return []
        
    display_comp_list = [
        ("Hetalls Global", (34, 35), ["hetalls global", "h.g", "hg"]),
        ("MMC", (36, 37), ["mmc"]),
        ("Hetalls", (38, 39), ["hetalls", "h.o", "ho"]),
        ("MKM", (40, 41), ["mkm"]),
        ("Eastern", (42, 43), ["eastern"]),
        ("Cotton Cheese", (44, 45), ["cotton cheese"]),
        ("MMCO", (46, 47), ["mmco"]),
        ("HOMESPUN", (48, 49), ["homespun"])
    ]
    
    clean_comp = company.strip().lower()
    
    target_comps = []
    if clean_comp in ["", "all", "all companies", "all_companies"]:
        target_comps = display_comp_list
    else:
        for comp_name, cols, aliases in display_comp_list:
            if clean_comp == comp_name.lower() or clean_comp in aliases:
                target_comps.append((comp_name, cols, aliases))
                
    if not target_comps:
        return []
        
    links = []
    seen_urls = set()
    
    for row in rows:
        if len(row) <= 33:
            continue
        title = row[33].strip()
        if not title or title.lower() == "title" or title == "TITLE ":
            continue
            
        for comp_name, cols, _ in target_comps:
            for idx in cols:
                if idx < len(row):
                    url = row[idx].strip()
                    if url and ("http" in url.lower() or "script.google" in url.lower()):
                        unique_key = f"{comp_name}|{url}"
                        if unique_key not in seen_urls:
                            seen_urls.add(unique_key)
                            links.append({"company": comp_name, "title": title, "url": url})
                        
    return links
