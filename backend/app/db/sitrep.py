"""
Situation Report Script
Shows system health and database statistics.
"""
import sys
import os
import requests
from sqlmodel import Session, select, func, create_engine, text
from datetime import datetime

sys.path.append(os.getcwd())

from app.models.user import User
from app.models.gym import Gym
from app.models.trainer import Trainer
from app.models.session import UserSession

# Create engine without echo to suppress SQL logs
try:
    db_url = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@db:5432/app")
    engine = create_engine(db_url, echo=False)
except Exception as e:
    print(f"Failed to create engine: {e}")
    sys.exit(1)

API_URL = os.getenv("API_URL", "http://localhost:8000")

def check_api_health():
    """Check main API health endpoint."""
    try:
        resp = requests.get(f"{API_URL}/health", timeout=3)
        return "OK" if resp.status_code == 200 else f"HTTP {resp.status_code}"
    except Exception as e:
        return f"UNREACHABLE"

def get_counts(session, model):
    """Get total count for a model."""
    return session.exec(select(func.count()).select_from(model)).one()

def get_status_distribution(session, model):
    """Get verification status distribution."""
    stmt = select(model.verification_status, func.count()).group_by(model.verification_status)
    results = session.exec(stmt).all()
    return {status: count for status, count in results}

def get_session_stats(session):
    """Get session statistics."""
    total_sessions = session.exec(select(func.count()).select_from(UserSession)).one()
    active_sessions = session.exec(
        select(func.count()).select_from(UserSession).where(UserSession.is_active == True)
    ).one()
    expired_sessions = session.exec(
        select(func.count()).select_from(UserSession).where(
            UserSession.expires_at < datetime.utcnow(),
            UserSession.is_active == True
        )
    ).one()
    
    return {
        'total': total_sessions,
        'active': active_sessions,
        'expired': expired_sessions
    }

def get_active_sessions(session):
    """Get list of active sessions with user info."""
    stmt = select(UserSession, User).join(User).where(
        UserSession.is_active == True,
        UserSession.expires_at > datetime.utcnow()
    )
    results = session.exec(stmt).all()
    return results

def run_sitrep():
    print("\n" + "="*60)
    print("SYSTEM SITREP")
    print("="*60 + "\n")
    
    # API Health
    print("API Health:")
    print(f"  /health -> {check_api_health()}\n")
    
    # Database Stats
    with Session(engine) as session:
        user_total = get_counts(session, User)
        gym_total = get_counts(session, Gym)
        trainer_total = get_counts(session, Trainer)
        
        print("Database Statistics:")
        print(f"  Users:    {user_total}")
        print(f"  Gyms:     {gym_total}")
        print(f"  Trainers: {trainer_total}\n")
        
    # Database Size & Table Stats
    try:
        # DB Size
        db_size = session.exec(select(func.pg_size_pretty(func.pg_database_size(func.current_database())))).one()
        print(f"Database Size: {db_size}\n")
        
        # Table Row Counts (using information_schema for approximate or explicit counts)
        # Getting all table names in public schema
        # Use text() for system catalog queries efficiently
        tables_query = text("SELECT tablename FROM pg_catalog.pg_tables WHERE schemaname = 'public'")
        tables = session.exec(tables_query).all()
        
        print("Table Row Counts:")
        for row in tables:
            table = row[0] # Extract table name from tuple/row
            try:
                # Use raw SQL for dynamic table counting
                # Quote table name to handle reserved keywords like "user"
                cnt = session.exec(text(f'SELECT count(*) FROM "{table}"')).one()[0]
                print(f"  {table:25s} : {cnt}")
            except Exception as e:
                # print(f"  Error counting {table}: {e}")
                pass
        print()
        
    except Exception as e:
        print(f"Could not fetch detailed DB stats: {e}")

    # Session Statistics
    with Session(engine) as session:
        # Re-using session context for stats
        
        # Session Statistics
        session_stats = get_session_stats(session)
        print("Session Statistics:")
        print(f"  Total Sessions:   {session_stats['total']}")
        print(f"  Active Sessions:  {session_stats['active']}")
        print(f"  Expired (stale):  {session_stats['expired']}\n")
        
        # Active Sessions Detail
        active_sessions = get_active_sessions(session)
        if active_sessions:
            print("Active Sessions (Time Remaining):")
            for user_session, user in active_sessions:
                # Time tracking is based on explicit 'expires_at' timestamp stored in DB
                time_left = (user_session.expires_at - datetime.utcnow()).total_seconds() / 3600
                print(f"  {user.email:30s} - {time_left:.1f}h remaining (Expires: {user_session.expires_at} UTC)")
            print()
            
    print("\n" + "="*60 + "\n")

if __name__ == "__main__":
    run_sitrep()
