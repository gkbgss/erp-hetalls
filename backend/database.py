import os
from sqlalchemy import create_engine, Column, Integer, String, Float, DateTime, Boolean, Text, JSON
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from datetime import datetime

SQLALCHEMY_DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./rugs_erp_v2.db")
if SQLALCHEMY_DATABASE_URL.startswith("postgres://"):
    SQLALCHEMY_DATABASE_URL = SQLALCHEMY_DATABASE_URL.replace("postgres://", "postgresql://", 1)

connect_args = {"check_same_thread": False} if SQLALCHEMY_DATABASE_URL.startswith("sqlite") else {}
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args=connect_args)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# ─── Models ───────────────────────────────────────────────────────────────────

class User(Base):
    __tablename__ = "users"
    id            = Column(Integer, primary_key=True, index=True)
    name          = Column(String, nullable=False)
    email         = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    role          = Column(String, default="viewer")      # admin, accountant, ecommerce, warehouse, hr, analyst, viewer
    permissions   = Column(JSON, default=list)            # granular permissions: ecommerce, inventory, accounts, hr, reports
    department    = Column(String, default="General")
    is_active     = Column(Boolean, default=True)
    created_at    = Column(DateTime, default=datetime.utcnow)

class Order(Base):
    __tablename__ = "orders"
    id            = Column(Integer, primary_key=True, index=True)
    company       = Column(String, default="Hetalls Global", index=True)
    order_id      = Column(String, unique=True, index=True)
    platform      = Column(String)                        # amazon | etsy
    customer_name = Column(String)
    product_name  = Column(String)
    sku           = Column(String)
    quantity      = Column(Integer, default=1)
    amount        = Column(Float)
    status        = Column(String, default="pending")     # pending, processing, shipped, delivered, returned
    order_date    = Column(DateTime, default=datetime.utcnow)
    created_at    = Column(DateTime, default=datetime.utcnow)

class Product(Base):
    __tablename__ = "products"
    id            = Column(Integer, primary_key=True, index=True)
    company       = Column(String, default="Hetalls Global", index=True)
    sku           = Column(String, unique=True, index=True)
    name          = Column(String, nullable=False)
    category      = Column(String)
    size          = Column(String)
    color         = Column(String)
    material      = Column(String)
    cost_price    = Column(Float, default=0.0)
    sell_price    = Column(Float, default=0.0)
    stock_qty     = Column(Integer, default=0)
    reorder_level = Column(Integer, default=10)
    location      = Column(String, default="FBA")
    is_active     = Column(Boolean, default=True)
    created_at    = Column(DateTime, default=datetime.utcnow)

class Invoice(Base):
    __tablename__ = "invoices"
    id            = Column(Integer, primary_key=True, index=True)
    company       = Column(String, default="Hetalls Global", index=True)
    invoice_no    = Column(String, unique=True, index=True)
    client_name   = Column(String)
    amount        = Column(Float)
    tax           = Column(Float, default=0.0)
    total         = Column(Float)
    status        = Column(String, default="pending")     # pending, paid, overdue
    due_date      = Column(DateTime)
    created_at    = Column(DateTime, default=datetime.utcnow)

class Expense(Base):
    __tablename__ = "expenses"
    id            = Column(Integer, primary_key=True, index=True)
    company       = Column(String, default="Hetalls Global", index=True)
    title         = Column(String)
    category      = Column(String)
    amount        = Column(Float)
    date          = Column(DateTime, default=datetime.utcnow)
    notes         = Column(Text, nullable=True)

class Employee(Base):
    __tablename__ = "employees"
    id            = Column(Integer, primary_key=True, index=True)
    company       = Column(String, default="Hetalls Global", index=True)
    name          = Column(String)
    email         = Column(String, unique=True)
    department    = Column(String)
    role          = Column(String)
    salary        = Column(Float, default=0.0)
    join_date     = Column(DateTime, default=datetime.utcnow)
    is_active     = Column(Boolean, default=True)

# ─── Helpers ──────────────────────────────────────────────────────────────────

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def create_tables():
    Base.metadata.create_all(bind=engine)
