from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database import create_tables
from routers import auth, dashboard, users, orders, inventory, accounts, hr, reports, payroll, breakdown

app = FastAPI(title="Rugs ERP API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Create DB tables on startup
create_tables()

# Ensure admin user exists or is updated
try:
    from database import SessionLocal, User
    from auth import hash_password
    db = SessionLocal()
    admin = db.query(User).filter(User.role == "admin").first()
    if admin:
        admin.email = "IT@hetalls.com"
        admin.hashed_password = hash_password("HetallsF3&##$$$")
    else:
        # Create the initial admin user if the database is completely empty
        admin = User(
            name="Admin User",
            email="IT@hetalls.com",
            hashed_password=hash_password("HetallsF3&##$$$"),
            role="admin",
            permissions=['dashboard', 'ecommerce', 'inventory', 'accounts', 'hr', 'reports'],
            department="IT"
        )
        db.add(admin)
    db.commit()
    db.close()
except Exception as e:
    print(f"Error updating admin: {e}")

# Register routers
app.include_router(auth.router)
app.include_router(dashboard.router)
app.include_router(users.router)
app.include_router(orders.router)
app.include_router(inventory.router)
app.include_router(accounts.router)
app.include_router(hr.router)
app.include_router(reports.router)
app.include_router(payroll.router)
app.include_router(breakdown.router)

@app.get("/")
def root():
    return {"message": "Rugs ERP API is running", "docs": "/docs"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
