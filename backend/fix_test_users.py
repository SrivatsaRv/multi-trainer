from sqlmodel import Session, select
from app.db.session import engine
from app.models.user import User
from app.core.security import get_password_hash

def fix_all_passwords():
    emails = ["testuser@example.com", "gym_draft@example.com", "tr_active@example.com", "admin@example.com"]
    with Session(engine) as session:
        for email in emails:
            user = session.exec(select(User).where(User.email == email)).first()
            if not user:
                print(f"User {email} not found, creating it!")
                user = User(
                    email=email,
                    hashed_password=get_password_hash("password123"),
                    full_name=email.split("@")[0],
                    role="GYM_ADMIN" if "gym" in email else "TRAINER",
                    is_active=True
                )
                session.add(user)
            else:
                user.hashed_password = get_password_hash("password123")
                session.add(user)
        session.commit()
        print("Passwords reset successfully.")

if __name__ == "__main__":
    fix_all_passwords()
