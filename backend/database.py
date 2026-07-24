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

import contextvars
from sqlalchemy import event
from sqlalchemy.orm.attributes import get_history
import json

audit_user_var = contextvars.ContextVar("audit_user_var", default="System")

class AuditLog(Base):
    __tablename__ = "audit_logs"
    id            = Column(Integer, primary_key=True, index=True)
    user_email    = Column(String, index=True)
    action        = Column(String)                        # INSERT, UPDATE, DELETE
    table_name    = Column(String, index=True)
    record_id     = Column(String)
    changes       = Column(JSON, default=dict)
    timestamp     = Column(DateTime, default=datetime.utcnow)

@event.listens_for(SessionLocal, "before_flush")
def receive_before_flush(session, flush_context, instances):
    user_email = audit_user_var.get()
    
    for obj in session.new:
        if type(obj).__name__ == "AuditLog": continue
        audit = AuditLog(
            user_email=user_email,
            action="INSERT",
            table_name=obj.__tablename__,
            record_id=str(getattr(obj, "id", "new")),
            changes={"inserted": True}
        )
        session.add(audit)
        
    for obj in session.dirty:
        if type(obj).__name__ == "AuditLog": continue
        if session.is_modified(obj):
            changes = {}
            for attr in obj.__mapper__.columns.keys():
                # Avoid tracking password hashes
                if attr == "hashed_password": continue
                
                hist = get_history(obj, attr)
                if hist.has_changes():
                    old_val = hist.deleted[0] if hist.deleted else None
                    new_val = hist.added[0] if hist.added else None
                    changes[attr] = {"old": old_val, "new": new_val}
            
            if changes:
                audit = AuditLog(
                    user_email=user_email,
                    action="UPDATE",
                    table_name=obj.__tablename__,
                    record_id=str(getattr(obj, "id", "")),
                    changes=changes
                )
                session.add(audit)
                
    for obj in session.deleted:
        if type(obj).__name__ == "AuditLog": continue
        audit = AuditLog(
            user_email=user_email,
            action="DELETE",
            table_name=obj.__tablename__,
            record_id=str(getattr(obj, "id", "")),
            changes={"deleted": True}
        )
        session.add(audit)

# ─── Helpers ──────────────────────────────────────────────────────────────────

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def create_tables():
    Base.metadata.create_all(bind=engine)
