from fastapi import APIRouter, Depends
import urllib.request
import urllib.parse
import csv
from io import StringIO
from datetime import datetime
from auth import get_current_user
import time
import threading

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])

# NOTE: The sheet MUST be "Anyone with the link can view" for this to work!
SHEET_URL_TEMPLATE = "https://docs.google.com/spreadsheets/d/e/2PACX-1vTkTIObrXy88vQVg2_bAI2T8vPa1tXT5IWZw8tdvF9BW7aYj9qqTA6WeZjpJHlBlw4dpTj_o7dYhtzW/pub?gid=978055065&single=true&output=csv"

_CACHE = {}
_CACHE_LOCK = threading.Lock()
_FETCHING = set()
CACHE_TTL = 10 # 10 seconds for near-live data

def _fetch_from_google(sheet_name):
    if "{}" in SHEET_URL_TEMPLATE:
        url = SHEET_URL_TEMPLATE.format(urllib.parse.quote(sheet_name))
    else:
        url = SHEET_URL_TEMPLATE
    try:
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req) as response:
            content = response.read().decode('utf-8')
            data = list(csv.reader(StringIO(content)))
            with _CACHE_LOCK:
                _CACHE[sheet_name] = (time.time(), data)
            return data
    except Exception as e:
        print(f"Error fetching sheet {sheet_name}: {e}")
        return None
    finally:
        with _CACHE_LOCK:
            if sheet_name in _FETCHING:
                _FETCHING.remove(sheet_name)

def _bg_fetch(sheet_name):
    with _CACHE_LOCK:
        if sheet_name in _FETCHING:
            return
        _FETCHING.add(sheet_name)
    _fetch_from_google(sheet_name)

def fetch_sheet_csv(sheet_name):
    now = time.time()
    with _CACHE_LOCK:
        if sheet_name in _CACHE:
            cached_time, data = _CACHE[sheet_name]
            if now - cached_time > CACHE_TTL:
                threading.Thread(target=_bg_fetch, args=(sheet_name,)).start()
            return data

    with _CACHE_LOCK:
        _FETCHING.add(sheet_name)
    data = _fetch_from_google(sheet_name)
    return data or []

def parse_price(val_str):
    try:
        if not val_str: return 0.0
        return float(val_str.replace(',', '').replace('$', '').strip())
    except ValueError:
        return 0.0

def parse_date(date_str):
    try:
        if not date_str: return None
        return datetime.strptime(date_str.strip(), "%d-%b-%Y")
    except ValueError:
        return None

# Column mappings for ORDERS sheet based on screenshots:
# E (4): Portal
# F (5): Order No
# G (6): Buyer Name
# I (8): Order Date
# K (10): Material
# L (11): Size
# O (14): Status
# AK (36): Price

@router.get("/kpis")
def get_kpis(current_user=Depends(get_current_user)):
    orders_data = fetch_sheet_csv("ORDERS")
    total_revenue = 0.0
    total_orders = 0
    this_year = 0
    this_month = 0
    today = 0
    
    now = datetime.utcnow()
    current_year = now.year
    current_month = now.month
    
    if current_month >= 4:
        fy_start = datetime(current_year, 4, 1)
        fy_end = datetime(current_year + 1, 3, 31)
    else:
        fy_start = datetime(current_year - 1, 4, 1)
        fy_end = datetime(current_year, 3, 31)

    for row in orders_data[1:]: # Skip header
        if len(row) < 37:
            continue
            
        status = row[14].strip().lower() if len(row) > 14 else ""
        if status == "returned":
            continue

        price = parse_price(row[36])
        total_revenue += price
        total_orders += 1
        
        dt = parse_date(row[8])
        if dt:
            if fy_start <= dt <= fy_end:
                this_year += 1
            if dt.year == current_year and dt.month == current_month:
                this_month += 1
            if dt.date() == now.date():
                today += 1

    return {
        "total_revenue":     round(total_revenue, 2),
        "total_orders":      total_orders,
        "this_year_orders":  this_year,
        "this_month_orders": this_month,
        "today_orders":      today,
    }

@router.get("/companies-revenue")
def companies_revenue(current_user=Depends(get_current_user)):
    orders_data = fetch_sheet_csv("ORDERS")
    portals = {}
    
    colors = ["#f59e0b", "#3b82f6", "#ef4444", "#10b981", "#8b5cf6", "#ec4899", "#f87171", "#fb923c"]
    
    for row in orders_data[1:]:
        if len(row) < 37: continue
        status = row[14].strip().lower() if len(row) > 14 else ""
        if status == "returned": continue
        
        portal = row[4].strip()
        if not portal: continue
        
        price = parse_price(row[36])
        if price > 0:
            portals[portal] = portals.get(portal, 0) + price
            
    results = []
    for i, (portal, total) in enumerate(portals.items()):
        results.append({
            "name": portal,
            "value": round(total, 2),
            "color": colors[i % len(colors)]
        })
        
    return sorted(results, key=lambda x: x["value"], reverse=True)

@router.get("/revenue-chart")
def revenue_chart(current_user=Depends(get_current_user)):
    orders_data = fetch_sheet_csv("ORDERS")
    monthly_data = {}
    
    for row in orders_data[1:]:
        if len(row) < 37: continue
        status = row[14].strip().lower() if len(row) > 14 else ""
        if status == "returned": continue
        
        dt = parse_date(row[8])
        portal = row[4].strip()
        price = parse_price(row[36])
        
        if dt and portal and price > 0:
            month_label = dt.strftime("%b %Y")
            if month_label not in monthly_data:
                monthly_data[month_label] = {"month": month_label, "_dt": dt.replace(day=1)}
            monthly_data[month_label][portal] = monthly_data[month_label].get(portal, 0) + price
            
    # Sort by date
    sorted_months = sorted(monthly_data.values(), key=lambda x: x["_dt"])
    
    # Remove _dt and format
    results = []
    for m in sorted_months:
        del m["_dt"]
        for k in m:
            if k != "month":
                m[k] = round(m[k], 2)
        results.append(m)
        
    # Return last 6 months
    return results[-6:]

@router.get("/recent-orders")
def recent_orders(current_user=Depends(get_current_user)):
    orders_data = fetch_sheet_csv("ORDERS")
    valid_orders = []
    
    for i, row in enumerate(orders_data[1:]):
        if len(row) < 37: continue
        
        dt = parse_date(row[8])
        material = row[10].strip() if len(row) > 10 else ""
        size = row[11].strip() if len(row) > 11 else ""
        
        valid_orders.append({
            "id": i,
            "order_id": row[5].strip() if len(row) > 5 else f"ORD-{i}",
            "platform": row[4].strip() if len(row) > 4 else "Unknown",
            "customer_name": row[6].strip() if len(row) > 6 else "Unknown",
            "product_name": f"{material} {size}".strip(),
            "amount": parse_price(row[36]),
            "status": row[14].strip() if len(row) > 14 else "Unknown",
            "order_date": row[8].strip() if len(row) > 8 else "",
            "_dt": dt or datetime.min
        })
        
    valid_orders.sort(key=lambda x: x["_dt"], reverse=True)
    
    # Remove _dt
    for o in valid_orders:
        del o["_dt"]
        
    return valid_orders[:8]
