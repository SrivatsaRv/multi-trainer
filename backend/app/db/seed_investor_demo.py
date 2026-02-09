from sqlmodel import Session, select, create_engine
from app.db.session import engine
from app.models.user import User, UserRole
from app.models.gym import Gym, VerificationStatus
from app.core.security import get_password_hash
from app.models.booking import SessionPackage

# Setup
def seed_investor_demo():
    with Session(engine) as session:
        print("🌱 Seeding Investor Demo Data...")

        # 1. Iron Titan Fitness (Hardcore)
        # ------------------------------------------------
        email = "admin@irontitan.com"
        password = "password123"
        hashed_pw = get_password_hash(password)
        
        user = session.exec(select(User).where(User.email == email)).first()
        if not user:
            user = User(email=email, full_name="Marcus 'Titan' Steel", hashed_password=hashed_pw, role=UserRole.GYM_ADMIN, is_active=True)
            session.add(user)
            session.commit()
            session.refresh(user)
            print(f"✅ Created User: {email}")

        gym = session.exec(select(Gym).where(Gym.admin_id == user.id)).first()
        if not gym:
            # Create Gym Profile
            gym = Gym(
                admin_id=user.id,
                name="Iron Titan Fitness",
                slug="iron-titan",
                location="1024 Muscle Blvd, Metro City",
                description="The ultimate destination for serious hypertrophy and strength training. Old school iron, new school science.",
                photos=["https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=2070&auto=format&fit=crop", "https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?q=80&w=2070&auto=format&fit=crop"],
                amenities=["Deadlift Platforms", "Chalk Allowed", "Sauna", "Pro Shop"],
                operating_hours={"mon_fri": "05:00-23:00", "sat_sun": "08:00-20:00"},
                social_links={"instagram": "@irontitan_official"},
                verification_status=VerificationStatus.APPROVED
            )
            session.add(gym)
            session.commit()
            print(f"✅ Created Gym: Iron Titan Fitness")


        # 2. Urban Pulse Yoga (Wellness)
        # ------------------------------------------------
        email = "admin@urbanpulse.com"
        user = session.exec(select(User).where(User.email == email)).first()
        if not user:
            user = User(email=email, full_name="Serena Flow", hashed_password=hashed_pw, role=UserRole.GYM_ADMIN, is_active=True)
            session.add(user)
            session.commit()
            session.refresh(user)
            print(f"✅ Created User: {email}")

        gym = session.exec(select(Gym).where(Gym.admin_id == user.id)).first()
        if not gym:
            gym = Gym(
                admin_id=user.id,
                name="Urban Pulse Yoga",
                slug="urban-pulse",
                location="42 Lotus Lane, Downtown",
                description="Find your center in the chaos of the city. Premium yoga and pilates studio.",
                photos=["https://images.unsplash.com/photo-1599901860904-17e6ed7083a0?q=80&w=2069&auto=format&fit=crop"],
                amenities=["Heated Studio", "Mat Rental", "Showers", "Tea Bar"],
                operating_hours={"daily": "06:00-21:00"},
                verification_status=VerificationStatus.APPROVED
            )
            session.add(gym)
            session.commit()
            print(f"✅ Created Gym: Urban Pulse Yoga")

        # 3. Zenith Performance (Athletic)
        # ------------------------------------------------
        email = "admin@zenithfit.com"
        user = session.exec(select(User).where(User.email == email)).first()
        if not user:
            user = User(email=email, full_name="Coach 'Z' Zenith", hashed_password=hashed_pw, role=UserRole.GYM_ADMIN, is_active=True)
            session.add(user)
            session.commit()
            session.refresh(user)
            print(f"✅ Created User: {email}")

        gym = session.exec(select(Gym).where(Gym.admin_id == user.id)).first()
        if not gym:
            gym = Gym(
                admin_id=user.id,
                name="Zenith Performance",
                slug="zenith-performance",
                location="88 Sprint St, Tech Park",
                description="Elite performance center for athletes. CrossFit affiliation pending.",
                photos=["https://images.unsplash.com/photo-1517963879466-cd11fa9e60de?q=80&w=2070&auto=format&fit=crop"],
                amenities=["Turf Track", "Olympic Racks", "Physio Room"],
                operating_hours={"daily": "24/7 Access"},
                verification_status=VerificationStatus.APPROVED
            )
            session.add(gym)
            session.commit()
            print(f"✅ Created Gym: Zenith Performance")

        print("\n🎉 Seeding Complete!")
        print("Credentials for all Gym Admins: password123")
        print("1. admin@irontitan.com")
        print("2. admin@urbanpulse.com")
        print("3. admin@zenithfit.com")

if __name__ == "__main__":
    seed_investor_demo()
