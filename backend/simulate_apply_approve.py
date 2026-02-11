from app.db.session import get_session
from app.models.gym_application import GymApplication, ApplicationStatus
from app.models.associations import GymTrainer, AssociationStatus
from sqlmodel import select

# 1. Simulate Rahul (Trainer ID 4) applying to Multifit (Gym ID 1)
session = next(get_session())

# Check if association already exists
existing_assoc = session.exec(select(GymTrainer).where(GymTrainer.trainer_id == 4, GymTrainer.gym_id == 1)).first()
if existing_assoc:
    print(f"Association already exists! Status: {existing_assoc.status}")
else:
    # Create application
    app = GymApplication(
        trainer_id=4,
        gym_id=1,
        message="I would like to join Multifit Aundh!",
        status=ApplicationStatus.PENDING
    )
    session.add(app)
    session.commit()
    session.refresh(app)
    print(f"Created application ID: {app.id}")

    # 2. Simulate Gym Admin approving the application
    app.status = ApplicationStatus.APPROVED
    session.add(app)
    
    # Create association (as the API logic does)
    assoc = GymTrainer(
        trainer_id=app.trainer_id,
        gym_id=app.gym_id,
        status=AssociationStatus.ACTIVE
    )
    session.add(assoc)
    session.commit()
    print(f"Approved application and created association for Trainer ID {app.trainer_id} and Gym ID {app.gym_id}")
