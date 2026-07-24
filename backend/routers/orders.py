from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException
from sqlalchemy.orm import Session
from database import get_db, Order
from auth import require_roles
from utils.csv_parser import parse_amazon_orders, parse_etsy_orders
from utils.google_sheets import fetch_google_sheet_orders

router = APIRouter(prefix="/api/orders", tags=["orders"])

@router.get("/")
def get_orders(db: Session = Depends(get_db), current_user=Depends(require_roles("admin", "ecommerce", "analyst"))):
    sheet_orders = fetch_google_sheet_orders()
    return sheet_orders

@router.post("/upload-csv")
async def upload_csv(
    file: UploadFile = File(...),
    platform: str = Form(...),
    db: Session = Depends(get_db),
    current_user=Depends(require_roles("admin", "ecommerce"))
):
    if not file.filename.endswith(('.csv', '.txt')):
        raise HTTPException(status_code=400, detail="Only CSV/TXT files allowed")
        
    content = await file.read()
    content_str = content.decode('utf-8', errors='ignore')
    
    if platform == 'amazon':
        parsed_orders = parse_amazon_orders(content_str)
    elif platform == 'etsy':
        parsed_orders = parse_etsy_orders(content_str)
    else:
        raise HTTPException(status_code=400, detail="Invalid platform")
        
    inserted = 0
    skipped = 0
    
    grouped_orders = {}
    for o in parsed_orders:
        base_id = o['order_id']
        if base_id not in grouped_orders:
            grouped_orders[base_id] = []
        grouped_orders[base_id].append(o)
        
    for base_id, items in grouped_orders.items():
        # Check if this base order already exists in the database
        existing = db.query(Order).filter(Order.order_id.like(f"{base_id}%")).first()
        if existing:
            skipped += len(items)
            continue
            
        for idx, item in enumerate(items):
            item_order_id = base_id
            if len(items) > 1:
                item_order_id = f"{base_id}-{idx+1}"
            
            item['order_id'] = item_order_id
            new_order = Order(**item)
            db.add(new_order)
            inserted += 1
            
    db.commit()
    msg = f"Successfully imported {inserted} new items."
    if skipped > 0:
        msg += f" (Skipped {skipped} duplicate items that were already in the system)."
    return {"message": msg, "inserted": inserted}
