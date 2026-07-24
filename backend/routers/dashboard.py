from fastapi import APIRouter, Depends
import urllib.request
import urllib.parse
import csv
from io import StringIO
from datetime import datetime
from auth import get_current_user

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])

SHEET_URL_TEMPLATE = "https://docs.google.com/spreadsheets/d/1SVvZnv8yphJNJp_qNKZdkB-WByslByjeRPM0_0oLQuE/gviz/tq?tqx=out:csv&sheet={}"

import time
import threading
import urllib.request
import urllib.parse
import csv
from io import StringIO

_CACHE = {}
_CACHE_LOCK = threading.Lock()
_FETCHING = set()
CACHE_TTL = 10 # 10 seconds for near-live data

def _fetch_from_google(sheet_name):
    url = SHEET_URL_TEMPLATE.format(urllib.parse.quote(sheet_name))
    try:
        req = urllib.request.Request(url)
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

@router.get("/kpis")
def get_kpis(current_user=Depends(get_current_user)):
    # Fetch MONTHLY BRANDS
    brands_data = fetch_sheet_csv("MONTHLY BRANDS")
    total_revenue = 0.0
    for row in brands_data[1:]:  # Skip header
        if len(row) > 1 and row[1]:
            try:
                # Remove commas and $ if any
                val_str = row[1].replace(',', '').replace('$', '').strip()
                if val_str.lower() != 'total':
                    total_revenue += float(val_str)
            except ValueError:
                pass

    # Fetch NEW sheet (orders)
    orders_data = fetch_sheet_csv("NEW")
    now = datetime.utcnow()
    current_year = now.year
    current_month = now.month
    
    if current_month >= 4:
        fy_start = datetime(current_year, 4, 1)
        fy_end = datetime(current_year + 1, 3, 31)
    else:
        fy_start = datetime(current_year - 1, 4, 1)
        fy_end = datetime(current_year, 3, 31)
    
    # Let's normalize current date to compare "Today"
    today_str = now.strftime("%d-%b-%Y") # e.g. "23-Jul-2026"
    
    total_orders = 0
    this_year = 0
    this_month = 0
    today = 0
    
    for row in orders_data:
        # Check if row has any non-empty data to count as an order
        if not any(cell.strip() for cell in row):
            continue
            
        total_orders += 1
        
        # Try to parse the date from column 2 (index 2)
        if len(row) > 2 and row[2]:
            date_str = row[2].strip()
            if not date_str or date_str.lower() == 'date':
                continue
            
            try:
                # e.g., "1-Nov-2025" or "23-Jul-2026"
                dt = datetime.strptime(date_str, "%d-%b-%Y")
                
                # Check financial year
                if fy_start <= dt <= fy_end:
                    this_year += 1
                
                # Check current calendar month
                if dt.year == current_year and dt.month == current_month:
                    this_month += 1
            except ValueError:
                pass
            
            try:
                dt = datetime.strptime(date_str, "%d-%b-%Y")
                if dt.date() == now.date():
                    today += 1
            except ValueError:
                pass

    return {
        "total_revenue":     round(total_revenue, 2),
        "total_orders":      total_orders,
        "this_year_orders":  this_year,
        "this_month_orders": this_month,
        "today_orders":      today,
    }

@router.get("/companies-revenue")
def companies_revenue(current_user=Depends(get_current_user)):
    # Returns the total revenue per company based on MONTHLY BRANDS columns C to J
    # C: ETSY-CASAVANI, D: AMAZON, E: ETSY-RUGSFOREVER, F: WALMART, G: PEPPERFRY
    # H: CASAVANI WEBSITE, I: EBAY-RUGSFOREVER, J: JAYPOR
    brands_data = fetch_sheet_csv("MONTHLY BRANDS")
    
    companies = [
        {"name": "ETSY-CASAVANI", "col_index": 2, "color": "#f87171"},
        {"name": "AMAZON", "col_index": 3, "color": "#f59e0b"},
        {"name": "ETSY-RUGSFOREVER", "col_index": 4, "color": "#fb923c"},
        {"name": "WALMART", "col_index": 5, "color": "#3b82f6"},
        {"name": "PEPPERFRY", "col_index": 6, "color": "#ef4444"},
        {"name": "CASAVANI WEBSITE", "col_index": 7, "color": "#10b981"},
        {"name": "EBAY-RUGSFOREVER", "col_index": 8, "color": "#8b5cf6"},
        {"name": "JAYPOR", "col_index": 9, "color": "#ec4899"},
    ]
    
    results = []
    
    for comp in companies:
        total = 0.0
        idx = comp["col_index"]
        for row in brands_data[1:]:
            if len(row) > idx and row[idx]:
                try:
                    val_str = row[idx].replace(',', '').replace('$', '').strip()
                    if val_str.lower() != 'total':
                        total += float(val_str)
                except ValueError:
                    pass
        if total > 0:
            results.append({"name": comp["name"], "value": round(total, 2), "color": comp["color"]})
            
    return results

@router.get("/revenue-chart")
def revenue_chart(current_user=Depends(get_current_user)):
    """Monthly revenue for all companies from MONTHLY BRANDS."""
    brands_data = fetch_sheet_csv("MONTHLY BRANDS")
    results = []
    
    for row in brands_data[1:]:
        if len(row) > 9 and row[0]:
            month = row[0].strip()
            if not month or month.lower() == 'total':
                continue
            
            def parse_val(v):
                try:
                    return float(v.replace(',', '').replace('$', '').strip()) if v else 0.0
                except ValueError:
                    return 0.0
                
            results.append({
                "month": month,
                "ETSY-CASAVANI": parse_val(row[2]),
                "AMAZON": parse_val(row[3]),
                "ETSY-RUGSFOREVER": parse_val(row[4]),
                "WALMART": parse_val(row[5]),
                "PEPPERFRY": parse_val(row[6]),
                "CASAVANI WEBSITE": parse_val(row[7]),
                "EBAY-RUGSFOREVER": parse_val(row[8]),
                "JAYPOR": parse_val(row[9]),
            })
            
    return results

@router.get("/recent-orders")
def recent_orders(current_user=Depends(get_current_user)):
    # To keep the UI working, we can parse the last 8 rows of NEW sheet or just return empty for now
    orders_data = fetch_sheet_csv("NEW")
    results = []
    # Assuming NEW has no header, or header is first row.
    # We will get the last 8 valid rows
    valid_rows = [r for r in orders_data if len(r) > 3 and r[2]]
    for i, row in enumerate(reversed(valid_rows[-8:])):
        results.append({
            "id": i,
            "order_id": f"EXT-{1000+i}",
            "platform": row[0] if len(row) > 0 else "Unknown",
            "customer_name": "N/A", # Customer name might not be clearly defined
            "product_name": row[1] if len(row) > 1 else "Unknown",
            "amount": float(row[3].replace(',', '').replace('$', '').strip()) if len(row) > 3 and row[3] else 0.0,
            "status": "completed",
            "order_date": row[2] if len(row) > 2 else ""
        })
    return results

