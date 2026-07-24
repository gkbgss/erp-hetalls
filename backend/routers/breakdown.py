from fastapi import APIRouter, Depends, Query
import urllib.request
import urllib.parse
import csv
from io import StringIO
from datetime import datetime
from auth import get_current_user
import time
import threading

router = APIRouter(prefix="/api/breakdown", tags=["breakdown"])

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

@router.get("/daily-sales")
def daily_sales(date: str = Query(default="today"), current_user=Depends(get_current_user)):
    data = fetch_sheet_csv("ORDERS")
    
    if not data or len(data) < 2:
        return {"headers": [], "sub_headers": [], "rows": [], "total_rows": 0}
        
    now = datetime.utcnow()
    
    # Store aggregated data: { date_obj: { "total": sum, (portal, material): sum } }
    aggregated = {}
    unique_combinations = set()
    
    for row in data[1:]: # Skip header
        if len(row) < 37: continue
        status = row[14].strip().lower() if len(row) > 14 else ""
        if status == "returned": continue
        
        row_dt = parse_date(row[8])
        if not row_dt: continue
        
        # Filtering logic
        row_date_obj = row_dt.date()
        
        if date == "today":
            if row_date_obj != now.date(): continue
        elif date == "all":
            pass
        elif date.startswith("month|"):
            parts = date.split("|")[1].split("-")
            if row_date_obj.year != int(parts[0]) or row_date_obj.month != int(parts[1]):
                continue
        else:
            try:
                parts = date.split("|")
                start_dt = datetime.strptime(parts[0], "%Y-%m-%d").date()
                end_dt = datetime.strptime(parts[1], "%Y-%m-%d").date() if len(parts) > 1 else start_dt
                if row_date_obj < start_dt or row_date_obj > end_dt:
                    continue
            except ValueError:
                continue
                
        portal = row[4].strip() or "Unknown Portal"
        material = row[10].strip() or "Unknown Material"
        price = parse_price(row[36])
        
        if price <= 0: continue
        
        unique_combinations.add((portal, material))
        
        if row_date_obj not in aggregated:
            aggregated[row_date_obj] = {"total": 0.0}
            
        aggregated[row_date_obj]["total"] += price
        aggregated[row_date_obj][(portal, material)] = aggregated[row_date_obj].get((portal, material), 0.0) + price

    # Build dynamic headers based on sorted unique combinations
    # Group by portal first, then material
    sorted_combos = sorted(list(unique_combinations), key=lambda x: (x[0], x[1]))
    
    headers = ["", "HG TOTAL"]
    sub_headers = ["", ""]
    
    for combo in sorted_combos:
        headers.append(combo[0])      # Portal
        sub_headers.append(combo[1])  # Material
        
    # Build rows
    sorted_dates = sorted(aggregated.keys(), reverse=True)
    rows = []
    
    for d in sorted_dates:
        date_str = d.strftime("%d-%b-%Y")
        row_data = [date_str, str(round(aggregated[d]["total"], 2))]
        
        for combo in sorted_combos:
            val = aggregated[d].get(combo, 0.0)
            row_data.append(str(round(val, 2)) if val > 0 else "0")
            
        rows.append(row_data)
        
    return {
        "headers": headers,
        "sub_headers": sub_headers,
        "rows": rows,
        "total_rows": len(rows)
    }
