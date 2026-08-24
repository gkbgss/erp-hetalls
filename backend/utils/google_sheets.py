import urllib.request
import csv
import io
from datetime import datetime

SHEET_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vTkTIObrXy88vQVg2_bAI2T8vPa1tXT5IWZw8tdvF9BW7aYj9qqTA6WeZjpJHlBlw4dpTj_o7dYhtzW/pub?output=csv"

def fetch_google_sheet_orders():
    try:
        req = urllib.request.Request(SHEET_URL, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req) as response:
            csv_data = response.read().decode('utf-8')
    except Exception as e:
        print(f"Error fetching Google Sheet: {e}")
        return []
    
    reader = csv.reader(io.StringIO(csv_data))
    header = next(reader, None)
    
    orders = []
    # Column indices based on screenshot and requirements:
    # A=0, B=1, ... I=8 (Order Date), O=14 (Status), AK=36 (Price)
    for i, row in enumerate(reader):
        if not row or len(row) < 15:
            continue
            
        try:
            # Order Date (Column I / index 8)
            order_date_str = row[8].strip()
            order_date = None
            if order_date_str:
                try:
                    # Format in screenshot: 23-Jul-2026
                    order_date = datetime.strptime(order_date_str, "%d-%b-%Y")
                except ValueError:
                    pass
            
            # Price (Column AK / index 36)
            price = 0.0
            if len(row) > 36:
                price_str = row[36].replace('$', '').replace(',', '').strip()
                if price_str:
                    try:
                        price = float(price_str)
                    except ValueError:
                        pass
            
            # Portals (Column E / index 4)
            platform = row[4].strip().lower() if len(row) > 4 else "unknown"
            if "amazon" in platform:
                platform = "amazon"
            elif "etsy" in platform:
                platform = "etsy"
                
            # Order No (Column F / index 5)
            order_id = row[5].strip() if len(row) > 5 else f"ORD-{i}"
            
            # Buyer Name (Column G / index 6)
            customer = row[6].strip() if len(row) > 6 else "Unknown"
            
            # Status (Column O / index 14)
            status = row[14].strip().lower() if len(row) > 14 else "unknown"
            
            # Product Name (Column K + L / index 10, 11)
            material = row[10].strip() if len(row) > 10 else ""
            size = row[11].strip() if len(row) > 11 else ""
            product_name = f"{material} {size}".strip()
            if not product_name:
                product_name = "Custom Rug"
                
            orders.append({
                "id": i,
                "order_date": order_date,
                "amount": price,
                "platform": platform,
                "status": status,
                "order_id": order_id,
                "customer_name": customer,
                "product_name": product_name,
            })
        except Exception as e:
            print(f"Row error: {e}")
            continue
            
    return orders
