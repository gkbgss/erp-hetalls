from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from database import get_db, Invoice, Expense
from auth import require_roles

router = APIRouter(prefix="/api/accounts", tags=["accounts"])

@router.get("/invoices")
def get_invoices(db: Session = Depends(get_db), current_user=Depends(require_roles("admin", "accountant", "analyst"))):
    invoices = db.query(Invoice).order_by(Invoice.created_at.desc()).all()
    return invoices

@router.get("/expenses")
def get_expenses(db: Session = Depends(get_db), current_user=Depends(require_roles("admin", "accountant", "analyst"))):
    expenses = db.query(Expense).order_by(Expense.date.desc()).all()
    return expenses

@router.get("/bills-links")
def get_bills_links(current_user=Depends(require_roles("admin", "accountant", "analyst"))):
    import urllib.request
    import csv
    import io
    url = "https://docs.google.com/spreadsheets/d/1pMyWyI6J2YM7DzlYJ9__M8bZNaGPyrgTVAItoSiYYNg/export?format=csv&gid=2023338778&range=AI50:AO50"
    try:
        req = urllib.request.Request(url)
        with urllib.request.urlopen(req) as response:
            content = response.read().decode('utf-8')
            reader = csv.reader(io.StringIO(content))
            row = next(reader, [])
            return {
                "HG": row[0] if len(row) > 0 else "",
                "MMC": row[2] if len(row) > 2 else "",
                "HO": row[4] if len(row) > 4 else "",
                "MKM": row[6] if len(row) > 6 else ""
            }
    except Exception as e:
        return {"error": str(e), "HG": "", "MMC": "", "HO": "", "MKM": ""}

@router.get("/company-alerts")
def get_company_alerts(current_user=Depends(require_roles("admin", "accountant", "analyst"))):
    # TODO: Connect to the actual Google Sheets using their Spreadsheet IDs
    # Currently returning mocked 3-star entries for all companies
    return [
        {"id": 1, "company": "HG", "date": "2026-01-29", "bill_reg_no": "991 ***", "party": "ARAMEX", "bill_amt": 134464.66},
        {"id": 2, "company": "HG", "date": "2026-01-29", "bill_reg_no": "993 ***", "party": "ARAMEX", "bill_amt": 32994.59},
        {"id": 3, "company": "HG", "date": "2026-02-02", "bill_reg_no": "1002 ***", "party": "ARAMEX", "bill_amt": 141514.81},
        {"id": 4, "company": "HG", "date": "2026-06-27", "bill_reg_no": "1483 ***", "party": "FEDEX EXPRESS", "bill_amt": 3920.90},
        {"id": 5, "company": "HG", "date": "2026-06-27", "bill_reg_no": "1485 ***", "party": "FEDEX EXPRESS", "bill_amt": 38463.30},
        {"id": 6, "company": "HG", "date": "2026-07-14", "bill_reg_no": "1530 ***", "party": "DHL EXPRESS", "bill_amt": 11997.66},
        {"id": 7, "company": "HG", "date": "2026-07-15", "bill_reg_no": "1532 ***", "party": "MM HDFC CREDIT CARD", "bill_amt": 19347.00},
        {"id": 8, "company": "MMC", "date": "2026-07-20", "bill_reg_no": "205 ***", "party": "BLUE DART", "bill_amt": 4500.00},
        {"id": 9, "company": "HO", "date": "2026-07-22", "bill_reg_no": "88 ***", "party": "AMAZON SHIPPING", "bill_amt": 12000.50},
        {"id": 10, "company": "MKM", "date": "2026-07-23", "bill_reg_no": "412 ***", "party": "FEDEX EXPRESS", "bill_amt": 8900.25},
    ]
