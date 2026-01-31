
import argparse
import sys
import os
sys.path.append(os.getcwd())

from typing import List, Optional
from sqlmodel import Session, select, func
from tabulate import tabulate

from app.db.session import engine
from app.models.user import User, UserRole
from app.models.gym import Gym
from app.models.trainer import Trainer
from app.models.associations import GymTrainer
from app.core.security import get_password_hash

def get_session():
    return Session(engine)

def list_gyms(args):
    """List all gyms with their admin info"""
    with get_session() as session:
        statement = select(Gym, User).join(User, Gym.admin_id == User.id)
        results = session.exec(statement).all()
        
        data = []
        for gym, admin in results:
            data.append([
                gym.id,
                gym.name,
                gym.slug,
                gym.location,
                gym.verification_status,
                admin.email
            ])
        
        print(tabulate(data, headers=["ID", "Name", "Slug", "Location", "Status", "Admin Email"], tablefmt="grid"))

def list_trainers(args):
    """List all trainers with their user info"""
    with get_session() as session:
        statement = select(Trainer, User).join(User, Trainer.user_id == User.id)
        results = session.exec(statement).all()
        
        data = []
        for trainer, user in results:
            data.append([
                trainer.id,
                user.full_name,
                user.email,
                trainer.verification_status,
                ", ".join(trainer.specializations) if trainer.specializations else ""
            ])
        
        print(tabulate(data, headers=["ID", "Name", "Email", "Status", "Specializations"], tablefmt="grid"))

def list_associations(args):
    """List all trainer-gym associations"""
    with get_session() as session:
        # Join GymTrainer -> Gym and GymTrainer -> Trainer
        # And also fetch User info for Gym Admin and Trainer User
        statement = select(
            GymTrainer, 
            Gym, 
            Trainer,
            User 
        ).join(Gym, GymTrainer.gym_id == Gym.id)\
         .join(Trainer, GymTrainer.trainer_id == Trainer.id)\
         .join(User, Trainer.user_id == User.id) # User info for Trainer Name

        results = session.exec(statement).all()
        
        data = []
        for assoc, gym, trainer, trainer_user in results:
            data.append([
                assoc.gym_id,
                gym.name,
                assoc.trainer_id,
                trainer_user.full_name,
                assoc.status
            ])
        
        print(tabulate(data, headers=["Gym ID", "Gym Name", "Trainer ID", "Trainer Name", "Status"], tablefmt="grid"))

def create_gym(args):
    """Create a new gym and its admin user"""
    with get_session() as session:
        # Check existing user
        existing_user = session.exec(select(User).where(User.email == args.email)).first()
        if existing_user:
            print(f"Error: User with email {args.email} already exists.")
            return

        # Create User
        user = User(
            email=args.email,
            full_name=args.admin_name,
            hashed_password=get_password_hash(args.password),
            role=UserRole.GYM_ADMIN,
            is_active=True
        )
        session.add(user)
        session.commit()
        session.refresh(user)

        # Create Gym
        gym = Gym(
            admin_id=user.id,
            name=args.name,
            slug=args.slug,
            location=args.location,
            verification_status="APPROVED" 
        )
        session.add(gym)
        session.commit()
        session.refresh(gym)

        print(f"Successfully created Gym '{gym.name}' (ID: {gym.id}) and Admin '{user.email}' (ID: {user.id})")

def create_trainer(args):
    """Create a new trainer"""
    with get_session() as session:
        # Check existing user
        existing_user = session.exec(select(User).where(User.email == args.email)).first()
        if existing_user:
            print(f"Error: User with email {args.email} already exists.")
            return

        # Create User
        user = User(
            email=args.email,
            full_name=args.name,
            hashed_password=get_password_hash(args.password),
            role=UserRole.TRAINER,
            is_active=True
        )
        session.add(user)
        session.commit()
        session.refresh(user)

        # Create Trainer Profile
        trainer = Trainer(
            user_id=user.id,
            bio="Created via CLI",
            verification_status="APPROVED",
            specializations=args.specializations.split(",") if args.specializations else []
        )
        session.add(trainer)
        session.commit()
        session.refresh(trainer)

        print(f"Successfully created Trainer '{user.full_name}' (ID: {trainer.id}) with User ID: {user.id}")

def delete_gym(args):
    with get_session() as session:
        gym = session.get(Gym, args.id)
        if not gym:
            print(f"Gym with ID {args.id} not found.")
            return
        
        # Determine if we should cascade delete the admin user? 
        # For now, let's just delete the gym profile as requested, maintaining user might be safer unless specified.
        # But usually CLI tools are powerful. Let's delete the Gym.
        
        session.delete(gym)
        session.commit()
        print(f"Deleted Gym ID {args.id}")

def delete_trainer(args):
    with get_session() as session:
        trainer = session.get(Trainer, args.id)
        if not trainer:
            print(f"Trainer with ID {args.id} not found.")
            return
            
        session.delete(trainer)
        session.commit()
        print(f"Deleted Trainer ID {args.id}")

def create_association(args):
    """Create a gym-trainer association"""
    with get_session() as session:
        # Verify Gym
        gym = session.get(Gym, args.gym_id)
        if not gym:
            print(f"Gym ID {args.gym_id} not found.")
            return

        # Verify Trainer
        trainer = session.get(Trainer, args.trainer_id)
        if not trainer:
            print(f"Trainer ID {args.trainer_id} not found.")
            return

        # Create Association
        assoc = GymTrainer(
            gym_id=gym.id,
            trainer_id=trainer.id,
            status="ACTIVE" # Default to ACTIVE for admin creation
        )
        session.add(assoc)
        session.commit()
        print(f"Successfully associated Gym {gym.id} and Trainer {trainer.id}")

def delete_association(args):
    """Delete a gym-trainer association"""
    with get_session() as session:
        statement = select(GymTrainer).where(
            GymTrainer.gym_id == args.gym_id,
            GymTrainer.trainer_id == args.trainer_id
        )
        assoc = session.exec(statement).first()
        
        if not assoc:
            print(f"Association between Gym {args.gym_id} and Trainer {args.trainer_id} not found.")
            return

        session.delete(assoc)
        session.commit()
        print(f"Deleted association between Gym {args.gym_id} and Trainer {args.trainer_id}")

def main():
    parser = argparse.ArgumentParser(description="Multi-Trainer Admin CLI")
    subparsers = parser.add_subparsers(dest="command", help="Available commands")

    # --- List Commands ---
    subparsers.add_parser("list-gyms", help="List all gyms")
    subparsers.add_parser("list-trainers", help="List all trainers")
    subparsers.add_parser("list-associations", help="List all associations")

    # --- Create Gym ---
    gym_parser = subparsers.add_parser("create-gym", help="Create a new gym")
    gym_parser.add_argument("--name", required=True, help="Gym Name")
    gym_parser.add_argument("--slug", required=True, help="Url Slug")
    gym_parser.add_argument("--location", required=True, help="Location")
    gym_parser.add_argument("--admin-name", required=True, help="Admin Full Name")
    gym_parser.add_argument("--email", required=True, help="Admin Email")
    gym_parser.add_argument("--password", required=True, help="Admin Password")

    # --- Create Trainer ---
    trainer_parser = subparsers.add_parser("create-trainer", help="Create a new trainer")
    trainer_parser.add_argument("--name", required=True, help="Full Name")
    trainer_parser.add_argument("--email", required=True, help="Email")
    trainer_parser.add_argument("--password", required=True, help="Password")
    trainer_parser.add_argument("--specializations", help="Comma separated list")

    # --- Association Commands ---
    assoc_parser = subparsers.add_parser("create-association", help="Link Gym and Trainer")
    assoc_parser.add_argument("--gym-id", required=True, type=int, help="Gym ID")
    assoc_parser.add_argument("--trainer-id", required=True, type=int, help="Trainer ID")

    del_assoc_parser = subparsers.add_parser("delete-association", help="Unlink Gym and Trainer")
    del_assoc_parser.add_argument("--gym-id", required=True, type=int, help="Gym ID")
    del_assoc_parser.add_argument("--trainer-id", required=True, type=int, help="Trainer ID")

    # --- Delete Commands ---
    del_gym_parser = subparsers.add_parser("delete-gym", help="Delete a gym by ID")
    del_gym_parser.add_argument("id", type=int, help="Gym ID")

    del_trainer_parser = subparsers.add_parser("delete-trainer", help="Delete a trainer by ID")
    del_trainer_parser.add_argument("id", type=int, help="Trainer ID")

    args = parser.parse_args()

    commands = {
        "list-gyms": list_gyms,
        "list-trainers": list_trainers,
        "list-associations": list_associations,
        "create-gym": create_gym,
        "create-trainer": create_trainer,
        "create-association": create_association,
        "delete-association": delete_association,
        "delete-gym": delete_gym,
        "delete-trainer": delete_trainer
    }

    if args.command in commands:
        commands[args.command](args)
    else:
        parser.print_help()

if __name__ == "__main__":
    main()
