from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func, extract
from database import get_db, Product, Invoice, Employee
from auth import get_current_user
from datetime import datetime, timedelta
from utils.google_sheets import fetch_google_sheet_orders

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])

@router.get("/kpis")
def get_kpis(db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    now   = datetime.utcnow()
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

    sheet_orders = fetch_google_sheet_orders()
    
    total_revenue = sum(o["amount"] for o in sheet_orders if o["status"] != "returned")
    
    monthly_revenue = 0.0
    for o in sheet_orders:
        if o["order_date"] and o["order_date"] >= month_start and o["status"] != "returned":
            monthly_revenue += o["amount"]
            
    total_orders = len(sheet_orders)
    pending_orders = sum(1 for o in sheet_orders if "processing" in o["status"] or "pending" in o["status"])

    low_stock      = db.query(func.count(Product.id)).filter(
        Product.stock_qty <= Product.reorder_level, Product.is_active == True
    ).scalar() or 0
    pending_invoices = db.query(func.sum(Invoice.total)).filter(Invoice.status == "pending").scalar() or 0
    overdue_invoices = db.query(func.count(Invoice.id)).filter(Invoice.status == "overdue").scalar() or 0
    total_employees  = db.query(func.count(Employee.id)).filter(Employee.is_active == True).scalar() or 0

    return {
        "total_revenue":     round(total_revenue, 2),
        "monthly_revenue":   round(monthly_revenue, 2),
        "total_orders":      total_orders,
        "pending_orders":    pending_orders,
        "low_stock_alerts":  low_stock,
        "pending_invoices":  round(pending_invoices, 2),
        "overdue_invoices":  overdue_invoices,
        "total_employees":   total_employees,
    }

@router.get("/revenue-chart")
def revenue_chart(db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    """Last 6 months revenue split by platform."""
    sheet_orders = fetch_google_sheet_orders()
    results = []
    now = datetime.utcnow()
    for i in range(5, -1, -1):
        month_date  = now - timedelta(days=i * 30)
        month_label = month_date.strftime("%b %Y")
        y, m        = month_date.year, month_date.month

        amazon = 0
        etsy = 0
        for o in sheet_orders:
            if o["order_date"] and o["order_date"].year == y and o["order_date"].month == m and o["status"] != "returned":
                if o["platform"] == "amazon":
                    amazon += o["amount"]
                elif o["platform"] == "etsy":
                    etsy += o["amount"]

        results.append({"month": month_label, "amazon": round(amazon, 2), "etsy": round(etsy, 2)})

    return results

@router.get("/recent-orders")
def recent_orders(db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    sheet_orders = fetch_google_sheet_orders()
    # Sort by order_date (handle None by assigning a very old date)
    sheet_orders.sort(key=lambda x: x["order_date"] or datetime.min, reverse=True)
    recent = sheet_orders[:8]
    
    return [
        {
            "id":            o["id"],
            "order_id":      o["order_id"],
            "platform":      o["platform"],
            "customer_name": o["customer_name"],
            "product_name":  o["product_name"],
            "amount":        o["amount"],
            "status":        o["status"],
            "order_date":    o["order_date"].isoformat() if o["order_date"] else None,
        }
        for o in recent
    ]

@router.get("/platform-split")
def platform_split(db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    sheet_orders = fetch_google_sheet_orders()
    amazon = sum(o["amount"] for o in sheet_orders if o["platform"] == "amazon" and o["status"] != "returned")
    etsy = sum(o["amount"] for o in sheet_orders if o["platform"] == "etsy" and o["status"] != "returned")
    
    return [
        {"name": "Amazon FBA", "value": round(amazon, 2), "color": "#f59e0b"},
        {"name": "Etsy",       "value": round(etsy,   2), "color": "#d97706"},
    ]
