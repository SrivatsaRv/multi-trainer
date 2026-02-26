from sqlmodel import Session, select
from app.db.session import engine
from app.models.user import User
from app.core.security import get_password_hash

def fix_password():
    with Session(engine) as session:
        user = session.exec(select(User).where(User.email == "tr_active@example.com")).first()
        if user:
            print(f"Updating password for {user.email}")
            user.hashed_password = get_password_hash("password123")
            session.add(user)
            session.commit()
            print("Password updated.")
        else:
            print("User not found.")

if __name__ == "__main__":
    fix_password()
