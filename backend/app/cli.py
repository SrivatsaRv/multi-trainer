import argparse
import os
import sys

sys.path.append(os.getcwd())

from sqlmodel import Session, select  # noqa: E402
from tabulate import tabulate  # noqa: E402

from app.core.security import get_password_hash  # noqa: E402
from app.db.session import engine  # noqa: E402
from app.models.associations import AssociationStatus, GymTrainer  # noqa: E402
from app.models.booking import SessionPackage  # noqa: E402
from app.models.gym import Gym, VerificationStatus  # noqa: E402
from app.models.session import UserSession  # noqa: E402
from app.models.trainer import Trainer  # noqa: E402
from app.models.user import User, UserRole  # noqa: E402


def get_session():
    return Session(engine)


def list_gyms(args):
    """List all gyms with their admin info"""
    with get_session() as session:
        statement = select(Gym, User).join(User, Gym.admin_id == User.id)
        results = session.exec(statement).all()

        data = []
        for gym, admin in results:
            data.append(
                [
                    gym.id,
                    gym.name,
                    gym.slug,
                    gym.location,
                    gym.verification_status,
                    admin.email,
                    ", ".join(gym.equipment_list) if gym.equipment_list else "None",
                ]
            )

        print(
            tabulate(
                data,
                headers=[
                    "ID",
                    "Name",
                    "Slug",
                    "Location",
                    "Status",
                    "Admin Email",
                    "Equipment",
                ],
                tablefmt="grid",
            )
        )


def list_trainers(args):
    """List all trainers with their user info"""
    with get_session() as session:
        statement = select(Trainer, User).join(User, Trainer.user_id == User.id)
        results = session.exec(statement).all()

        data = []
        for trainer, user in results:
            data.append(
                [
                    trainer.id,
                    user.full_name,
                    user.email,
                    trainer.verification_status,
                    (
                        ", ".join(trainer.specializations)
                        if trainer.specializations
                        else ""
                    ),
                ]
            )

        print(
            tabulate(
                data,
                headers=["ID", "Name", "Email", "Status", "Specializations"],
                tablefmt="grid",
            )
        )


def list_pending(args):
    """List all pending verifications"""
    with get_session() as session:
        pending_gyms = session.exec(
            select(Gym).where(Gym.verification_status == "PENDING")
        ).all()
        pending_trainers = session.exec(
            select(Trainer, User)
            .join(User, Trainer.user_id == User.id)
            .where(Trainer.verification_status == "PENDING")
        ).all()

        print("\n--- PENDING GYMS ---")
        gym_data = [[g.id, g.name, g.location] for g in pending_gyms]
        print(tabulate(gym_data, headers=["ID", "Name", "Location"], tablefmt="grid"))

        print("\n--- PENDING TRAINERS ---")
        trainer_data = [[t.id, u.full_name, u.email] for t, u in pending_trainers]
        print(tabulate(trainer_data, headers=["ID", "Name", "Email"], tablefmt="grid"))


def approve_gym(args):
    with get_session() as session:
        gym = session.get(Gym, args.id)
        if not gym:
            print(f"Gym {args.id} not found.")
            return
        gym.verification_status = VerificationStatus.APPROVED
        session.add(gym)
        session.commit()
        print(f"Gym '{gym.name}' APPROVED.")


def reject_gym(args):
    with get_session() as session:
        gym = session.get(Gym, args.id)
        if not gym:
            print(f"Gym {args.id} not found.")
            return
        gym.verification_status = VerificationStatus.REJECTED
        session.add(gym)
        session.commit()
        print(f"Gym '{gym.name}' REJECTED.")


def approve_trainer(args):
    with get_session() as session:
        trainer = session.get(Trainer, args.id)
        if not trainer:
            print(f"Trainer {args.id} not found.")
            return
        trainer.verification_status = VerificationStatus.APPROVED
        session.add(trainer)
        session.commit()
        print(f"Trainer ID {trainer.id} APPROVED.")


def reject_trainer(args):
    with get_session() as session:
        trainer = session.get(Trainer, args.id)
        if not trainer:
            print(f"Trainer {args.id} not found.")
            return
        trainer.verification_status = VerificationStatus.REJECTED
        session.add(trainer)
        session.commit()
        print(f"Trainer ID {trainer.id} REJECTED.")


def create_gym(args):
    """Create a new gym and its admin user"""
    with get_session() as session:
        # Check existing user
        existing_user = session.exec(
            select(User).where(User.email == args.email)
        ).first()
        if existing_user:
            print(f"Error: User with email {args.email} already exists.")
            return

        # Create User
        user = User(
            email=args.email,
            full_name=args.admin_name,
            hashed_password=get_password_hash(args.password),
            role=UserRole.GYM_ADMIN,
            is_active=True,
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
            verification_status="APPROVED",
        )
        session.add(gym)
        session.commit()
        session.refresh(gym)

        print(
            f"Successfully created Gym '{gym.name}' (ID: {gym.id}) "
            f"and Admin '{user.email}' (ID: {user.id})"
        )


def create_trainer(args):
    """Create a new trainer"""
    with get_session() as session:
        # Check existing user
        existing_user = session.exec(
            select(User).where(User.email == args.email)
        ).first()
        if existing_user:
            print(f"Error: User with email {args.email} already exists.")
            return

        # Create User
        user = User(
            email=args.email,
            full_name=args.name,
            hashed_password=get_password_hash(args.password),
            role=UserRole.TRAINER,
            is_active=True,
        )
        session.add(user)
        session.commit()
        session.refresh(user)

        # Create Trainer Profile
        trainer = Trainer(
            user_id=user.id,
            bio="Created via CLI",
            verification_status="APPROVED",
            specializations=(
                args.specializations.split(",") if args.specializations else []
            ),
        )
        session.add(trainer)
        session.commit()
        session.refresh(trainer)

        print(
            f"Successfully created Trainer '{user.full_name}' "
            f"(ID: {trainer.id}) with User ID: {user.id}"
        )


def delete_gym(args):
    with get_session() as session:
        gym = session.get(Gym, args.id)
        if not gym:
            print(f"Gym with ID {args.id} not found.")
            return

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
            status=AssociationStatus.ACTIVE,  # Default to ACTIVE for admin creation
        )
        session.add(assoc)
        session.commit()
        print(f"Successfully associated Gym {gym.id} and Trainer {trainer.id}")


def list_associations(args):
    """List all gym-trainer associations"""
    with get_session() as session:
        statement = (
            select(GymTrainer, Gym, Trainer, User)
            .join(Gym, GymTrainer.gym_id == Gym.id)
            .join(Trainer, GymTrainer.trainer_id == Trainer.id)
            .join(User, Trainer.user_id == User.id)
        )
        results = session.exec(statement).all()

        data = []
        for assoc, gym, trainer, user in results:
            data.append(
                [
                    gym.name,
                    user.full_name,
                    assoc.status,
                    (
                        assoc.created_at.strftime("%Y-%m-%d")
                        if hasattr(assoc, "created_at") and assoc.created_at
                        else "N/A"
                    ),
                ]
            )

        print(
            tabulate(
                data, headers=["Gym", "Trainer", "Status", "Linked On"], tablefmt="grid"
            )
        )


def make_saas_admin(args):
    """Promote an existing user to SAAS_ADMIN"""
    with get_session() as session:
        user = session.exec(select(User).where(User.email == args.email)).first()
        if not user:
            print(f"Error: User with email {args.email} not found.")
            return

        user.role = UserRole.SAAS_ADMIN
        session.add(user)
        session.commit()
        print(f"Successfully promoted {user.email} to SAAS_ADMIN.")


def list_packages(args):
    """List all session packages for a gym"""
    with get_session() as session:
        statement = select(SessionPackage)
        if hasattr(args, "gym_id") and args.gym_id:
            statement = statement.where(SessionPackage.gym_id == args.gym_id)

        results = session.exec(statement).all()

        data = []
        for p in results:
            data.append([p.id, p.name, f"INR {p.price_inr}", p.session_count, p.gym_id])

        print(
            tabulate(
                data,
                headers=["ID", "Name", "Price", "Sessions", "Gym ID"],
                tablefmt="grid",
            )
        )


def create_package(args):
    """Create a new session package"""
    with get_session() as session:
        gym = session.get(Gym, args.gym_id)
        if not gym:
            print(f"Gym ID {args.gym_id} not found.")
            return

        pkg = SessionPackage(
            name=args.name,
            price_inr=args.price,
            session_count=args.sessions,
            gym_id=args.gym_id,
            description=args.description,
        )
        session.add(pkg)
        session.commit()
        print(f"Successfully created package '{pkg.name}' for Gym {gym.name}")


def delete_package(args):
    """Delete a session package"""
    with get_session() as session:
        pkg = session.get(SessionPackage, args.id)
        if not pkg:
            print(f"Package ID {args.id} not found.")
            return

        session.delete(pkg)
        session.commit()
        print(f"Deleted Package ID {args.id}")


def delete_association(args):
    """Delete a gym-trainer association"""
    with get_session() as session:
        statement = select(GymTrainer).where(
            GymTrainer.gym_id == args.gym_id, GymTrainer.trainer_id == args.trainer_id
        )
        assoc = session.exec(statement).first()

        if not assoc:
            print(
                f"Association between Gym {args.gym_id} and "
                f"Trainer {args.trainer_id} not found."
            )
            return

        session.delete(assoc)
        session.commit()
        print(
            f"Deleted association between Gym {args.gym_id} and "
            f"Trainer {args.trainer_id}"
        )


def list_sessions(args):
    """List all active user sessions"""
    with get_session() as session:
        statement = select(UserSession, User).join(User, UserSession.user_id == User.id)
        results = session.exec(statement).all()

        data = []
        for usess, user in results:
            data.append(
                [
                    usess.id,
                    user.email,
                    usess.is_active,
                    usess.expires_at.strftime("%Y-%m-%d %H:%M"),
                    usess.ip_address or "N/A",
                ]
            )

        print(
            tabulate(
                data,
                headers=["ID", "User", "Active", "Expires At", "IP"],
                tablefmt="grid",
            )
        )


def clear_sessions(args):
    """Force logout all users by invalidating all sessions"""
    with get_session() as session:
        sessions = session.exec(select(UserSession)).all()
        count = 0
        for usess in sessions:
            session.delete(usess)
            count += 1
        session.commit()
        print(f"✅ Executed Global Logout: Cleared {count} active sessions.")


def interactive_menu():
    """Interactive menu-driven console for administrative actions"""
    print("\n" + "=" * 60)
    print("   MULTI-TRAINER PLATFORM - ADMINISTRATIVE CONSOLE")
    print("=" * 60)

    menu_options = [
        ("List Gyms", list_gyms),
        ("List Trainers", list_trainers),
        ("List Associations", list_associations),
        ("List Pending Verifications", list_pending),
        ("Approve Gym", approve_gym),
        ("Reject Gym", reject_gym),
        ("Approve Trainer", approve_trainer),
        ("Reject Trainer", reject_trainer),
        ("Create Gym & Admin", create_gym),
        ("Create Trainer", create_trainer),
        ("Create Association", create_association),
        ("Delete Association", delete_association),
        ("Delete Gym", delete_gym),
        ("Delete Trainer", delete_trainer),
        ("Make SaaS Admin", make_saas_admin),
        ("List Packages", list_packages),
        ("Create Package", create_package),
        ("Delete Package", delete_package),
        ("List Active Sessions", list_sessions),
        ("Clear All Sessions (Global Logout)", clear_sessions),
        ("Exit", None),
    ]

    while True:
        print("\nCOMMANDS:")
        for i, (label, _) in enumerate(menu_options, 1):
            print(f"  {i:2}. {label}")

        try:
            choice = input("\nSelect an option (1-21): ").strip()
            if not choice:
                continue

            idx = int(choice) - 1
            if idx == 20:  # Exit
                print("Exiting Admin Console.")
                break

            if 0 <= idx < len(menu_options):
                label, func = menu_options[idx]
                print(f"\n--- {label.upper()} ---")

                # Handle functions that need arguments
                class Args:
                    pass

                args = Args()

                if func == approve_gym or func == reject_gym or func == delete_gym:
                    args.id = int(input("Enter Gym ID: "))
                elif (
                    func == approve_trainer
                    or func == reject_trainer
                    or func == delete_trainer
                ):
                    args.id = int(input("Enter Trainer ID: "))
                elif func == create_gym:
                    args.name = input("Gym Name: ")
                    args.slug = input("URL Slug: ")
                    args.location = input("Location: ")
                    args.admin_name = input("Admin Name: ")
                    args.email = input("Admin Email: ")
                    args.password = input("Admin Password: ")
                elif func == create_trainer:
                    args.name = input("Full Name: ")
                    args.email = input("Email: ")
                    args.password = input("Password: ")
                    args.specializations = input("Specializations (comma list): ")
                elif func == create_association or func == delete_association:
                    args.gym_id = int(input("Gym ID: "))
                    args.trainer_id = int(input("Trainer ID: "))
                elif func == make_saas_admin:
                    args.email = input("User Email: ")
                elif func == list_packages:
                    gym_id = input("Gym ID (optional, press Enter for all): ").strip()
                    args.gym_id = int(gym_id) if gym_id else None
                elif func == create_package:
                    args.gym_id = int(input("Gym ID: "))
                    args.name = input("Package Name: ")
                    args.price = int(input("Price (INR): "))
                    args.sessions = int(input("Session Count: "))
                    args.description = input("Description: ")
                elif func == delete_package:
                    args.id = int(input("Package ID: "))

                # Confirmation for destructive actions
                if func in [
                    delete_gym,
                    delete_trainer,
                    delete_association,
                    delete_package,
                    clear_sessions,
                    reject_gym,
                    reject_trainer,
                ]:
                    confirm = input(f"Are you sure you want to proceed? [y/N]: ").lower()
                    if confirm != "y":
                        print("Operation cancelled.")
                        continue

                func(args)
                input("\nPress Enter to continue...")
            else:
                print("Invalid choice.")
        except ValueError as e:
            print(f"Invalid input: {e}")
        except KeyboardInterrupt:
            print("\nExiting Admin Console.")
            break
        except Exception as e:
            print(f"Error: {e}")


def main():
    if len(sys.argv) > 1:
        # Keep CLI argument mode for automation/scripts
        parser = argparse.ArgumentParser(description="Multi-Trainer Admin CLI")
        subparsers = parser.add_subparsers(dest="command", help="Available commands")

        # --- List Commands ---
        subparsers.add_parser("list-gyms", help="List all gyms")
        subparsers.add_parser("list-trainers", help="List all trainers")
        subparsers.add_parser("list-associations", help="List all associations")
        subparsers.add_parser("list-pending", help="List pending verifications")

        # --- Approval Commands ---
        app_gym = subparsers.add_parser("approve-gym", help="Approve a gym")
        app_gym.add_argument("id", type=int)

        rej_gym = subparsers.add_parser("reject-gym", help="Reject a gym")
        rej_gym.add_argument("id", type=int)

        app_trainer = subparsers.add_parser("approve-trainer", help="Approve a trainer")
        app_trainer.add_argument("id", type=int)

        rej_trainer = subparsers.add_parser("reject-trainer", help="Reject a trainer")
        rej_trainer.add_argument("id", type=int)

        # --- Create Gym ---
        gym_parser = subparsers.add_parser("create-gym", help="Create a new gym")
        gym_parser.add_argument("--name", required=True, help="Gym Name")
        gym_parser.add_argument("--slug", required=True, help="Url Slug")
        gym_parser.add_argument("--location", required=True, help="Location")
        gym_parser.add_argument("--admin-name", required=True, help="Admin Full Name")
        gym_parser.add_argument("--email", required=True, help="Admin Email")
        gym_parser.add_argument("--password", required=True, help="Admin Password")

        # --- Create Trainer ---
        trainer_parser = subparsers.add_parser(
            "create-trainer", help="Create a new trainer"
        )
        trainer_parser.add_argument("--name", required=True, help="Full Name")
        trainer_parser.add_argument("--email", required=True, help="Email")
        trainer_parser.add_argument("--password", required=True, help="Password")
        trainer_parser.add_argument("--specializations", help="Comma separated list")

        # --- Association Commands ---
        assoc_parser = subparsers.add_parser(
            "create-association", help="Link Gym and Trainer"
        )
        assoc_parser.add_argument("--gym-id", required=True, type=int, help="Gym ID")
        assoc_parser.add_argument(
            "--trainer-id", required=True, type=int, help="Trainer ID"
        )

        del_assoc_parser = subparsers.add_parser(
            "delete-association", help="Unlink Gym and Trainer"
        )
        del_assoc_parser.add_argument("--gym-id", required=True, type=int, help="Gym ID")
        del_assoc_parser.add_argument(
            "--trainer-id", required=True, type=int, help="Trainer ID"
        )

        # --- Delete Commands ---
        del_gym_parser = subparsers.add_parser("delete-gym", help="Delete a gym by ID")
        del_gym_parser.add_argument("id", type=int, help="Gym ID")

        del_trainer_parser = subparsers.add_parser(
            "delete-trainer", help="Delete a trainer by ID"
        )
        del_trainer_parser.add_argument("id", type=int, help="Trainer ID")

        # --- SaaS Admin Commands ---
        saas_parser = subparsers.add_parser(
            "make-saas-admin", help="Promote a user to Platform Admin"
        )
        saas_parser.add_argument("--email", required=True, help="User Email")

        # --- Package Commands ---
        pkg_list = subparsers.add_parser("list-packages", help="List gym packages")
        pkg_list.add_argument("--gym-id", type=int, help="Optional Gym Filter")

        pkg_create = subparsers.add_parser("create-package", help="Create a gym package")
        pkg_create.add_argument("--gym-id", required=True, type=int)
        pkg_create.add_argument("--name", required=True)
        pkg_create.add_argument("--price", required=True, type=int)
        pkg_create.add_argument("--sessions", required=True, type=int)
        pkg_create.add_argument("--description", help="Optional description")

        pkg_del = subparsers.add_parser("delete-package", help="Delete a gym package")
        pkg_del.add_argument("id", type=int)

        # --- Session Commands ---
        subparsers.add_parser("list-sessions", help="List all active user sessions")
        subparsers.add_parser(
            "clear-sessions", help="Force logout all users (Wipe sessions)"
        )

        args = parser.parse_args()

        commands = {
            "list-gyms": list_gyms,
            "list-trainers": list_trainers,
            "list-associations": list_associations,
            "list-pending": list_pending,
            "approve-gym": approve_gym,
            "reject-gym": reject_gym,
            "approve-trainer": approve_trainer,
            "reject-trainer": reject_trainer,
            "create-gym": create_gym,
            "create-trainer": create_trainer,
            "create-association": create_association,
            "delete-association": delete_association,
            "delete-gym": delete_gym,
            "delete-trainer": delete_trainer,
            "make-saas-admin": make_saas_admin,
            "list-packages": list_packages,
            "create-package": create_package,
            "delete-package": delete_package,
            "list-sessions": list_sessions,
            "clear-sessions": clear_sessions,
        }

        if args.command in commands:
            commands[args.command](args)
        else:
            parser.print_help()
    else:
        # Launch interactive menu
        interactive_menu()


if __name__ == "__main__":
    main()
