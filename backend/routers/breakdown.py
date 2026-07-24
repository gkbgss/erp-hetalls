from fastapi import APIRouter, Depends, Query
import urllib.request
import urllib.parse
import csv
from io import StringIO
from datetime import datetime
from auth import get_current_user

router = APIRouter(prefix="/api/breakdown", tags=["breakdown"])

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

SHEET_URL = "https://docs.google.com/spreadsheets/d/1SVvZnv8yphJNJp_qNKZdkB-WByslByjeRPM0_0oLQuE/export?format=csv&gid=1569773873"

def _fetch_from_google(sheet_name):
    try:
        # cachebuster
        url_with_cb = f"{SHEET_URL}&cb={int(time.time())}"
        req = urllib.request.Request(url_with_cb)
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

@router.get("/daily-sales")
def daily_sales(date: str = Query(default="today"), current_user=Depends(get_current_user)):
    """
    Fetch daily sales data from 'DAILY SALE BRANDS N PORTAL' sheet.
    date param: 'today', 'all', or 'YYYY-MM-DD' for a specific date.
    """
    data = fetch_sheet_csv("DAILY SALE BRANDS N PORTAL")
    
    if not data or len(data) < 3:
        return {"headers": [], "sub_headers": [], "rows": []}
    
    # Row 0 = headers (merged cells / main headings)
    # Row 1 = sub-headers (individual column names)
    # Row 2+ = data rows
    raw_headers = data[0] if len(data) > 0 else []
    sub_headers = data[1] if len(data) > 1 else []
    
    # Fill forward headers (merged cells appear as empty in CSV)
    headers = []
    last_header = ""
    for h in raw_headers:
        if h.strip():
            last_header = h.strip()
        headers.append(last_header)
    
    # Determine target date for filtering
    now = datetime.utcnow()
    target_date = None
    filter_all = False
    
    if date == "all":
        filter_all = True
    elif date == "today":
        target_date = now.strftime("%d-%b-%Y")  # e.g. "23-Jul-2026"
    else:
        # Expect YYYY-MM-DD format, convert to sheet format
        try:
            dt = datetime.strptime(date, "%Y-%m-%d")
            target_date = dt.strftime("%-d-%b-%Y")  # e.g. "1-Nov-2025"
        except ValueError:
            # Try Windows-compatible format
            try:
                dt = datetime.strptime(date, "%Y-%m-%d")
                target_date = f"{dt.day}-{dt.strftime('%b')}-{dt.year}"
            except ValueError:
                target_date = date
    
    rows = []
    for row in data[2:]:  # Skip header rows
        if not row or not any(cell.strip() for cell in row):
            continue
        
        # Column A (index 0) is the date column
        row_date = row[0].strip() if len(row) > 0 else ""
        if not row_date:
            continue
            
        if not filter_all:
            try:
                row_dt = datetime.strptime(row_date, "%d-%b-%Y").date()
                if date == "today":
                    if row_dt != now.date():
                        continue
                elif date.startswith("month|"):
                    parts = date.split("|")[1].split("-")
                    if row_dt.year != int(parts[0]) or row_dt.month != int(parts[1]):
                        continue
                else:
                    parts = date.split("|")
                    start_dt = datetime.strptime(parts[0], "%Y-%m-%d").date()
                    end_dt = datetime.strptime(parts[1], "%Y-%m-%d").date() if len(parts) > 1 else start_dt
                    
                    if row_dt < start_dt or row_dt > end_dt:
                        continue
            except ValueError:
                continue
        
        rows.append(row)
        
    # Sort descending by date (newest first)
    def get_date(r):
        try:
            return datetime.strptime(r[0].strip(), "%d-%b-%Y").date()
        except:
            return datetime.min.date()
            
    rows.sort(key=get_date, reverse=True)
    
    return {
        "headers": headers,
        "sub_headers": [s.strip() for s in sub_headers],
        "rows": rows,
        "total_rows": len(rows),
    }
