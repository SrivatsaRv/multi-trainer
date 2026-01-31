
import pytest
from sqlmodel import Session, select
from app.models.associations import GymTrainer, AssociationStatus
from app.models.gym import Gym
from app.models.trainer import Trainer
from app.models.user import User

def test_create_gym_trainer_association(session: Session):
    # Setup
    user_gym = User(email="gym_unit@test.com", hashed_password="pw", full_name="Gym", role="GYM_ADMIN")
    user_tr = User(email="tr_unit@test.com", hashed_password="pw", full_name="Tr", role="TRAINER")
    session.add(user_gym)
    session.add(user_tr)
    session.commit()
    
    gym = Gym(admin_id=user_gym.id, name="Unit Gym", slug="unit-gym", location="Loc", verification_status="APPROVED")
    trainer = Trainer(user_id=user_tr.id, bio="Bio", verification_status="APPROVED")
    session.add(gym)
    session.add(trainer)
    session.commit()
    
    # Test Association
    link = GymTrainer(gym_id=gym.id, trainer_id=trainer.id, status=AssociationStatus.INVITED)
    session.add(link)
    session.commit()
    session.refresh(link)
    
    assert link.id is not None
    assert link.status == AssociationStatus.INVITED
    
    # Test Relationships
    session.refresh(gym)
    session.refresh(trainer)
    
    assert len(gym.trainers) == 1
    assert gym.trainers[0].id == trainer.id
    
    assert len(trainer.gyms) == 1
    assert trainer.gyms[0].id == gym.id

def test_update_association_status(session: Session):
    # Setup similar to above or reuse fixtures if available (manual setup for speed/simplicity here)
    user_gym = User(email="gym_up@test.com", hashed_password="pw", full_name="Gym", role="GYM_ADMIN")
    user_tr = User(email="tr_up@test.com", hashed_password="pw", full_name="Tr", role="TRAINER")
    session.add(user_gym)
    session.add(user_tr)
    session.commit()
    
    gym = Gym(admin_id=user_gym.id, name="Unit Gym 2", slug="unit-gym-2", location="Loc", verification_status="APPROVED")
    trainer = Trainer(user_id=user_tr.id, bio="Bio", verification_status="APPROVED")
    session.add(gym)
    session.add(trainer)
    session.commit()
    
    link = GymTrainer(gym_id=gym.id, trainer_id=trainer.id, status=AssociationStatus.PENDING)
    session.add(link)
    session.commit()
    
    # Update Status
    link.status = AssociationStatus.ACTIVE
    session.add(link)
    session.commit()
    session.refresh(link)
    
    assert link.status == AssociationStatus.ACTIVE

def test_create_client_trainer_association(session: Session):
    from app.models.associations import ClientTrainer, AssociationStatus
    
    # Setup
    user_client = User(email="client_unit@test.com", hashed_password="pw", full_name="Client", role="CLIENT")
    user_tr = User(email="tr_unit_2@test.com", hashed_password="pw", full_name="Tr2", role="TRAINER")
    session.add(user_client)
    session.add(user_tr)
    session.commit()
    
    trainer = Trainer(user_id=user_tr.id, bio="Bio", verification_status="APPROVED")
    session.add(trainer)
    session.commit()
    
    # Test Association
    link = ClientTrainer(client_id=user_client.id, trainer_id=trainer.id, status=AssociationStatus.PENDING)
    session.add(link)
    session.commit()
    session.refresh(link)
    
    assert link.id is not None
    assert link.status == AssociationStatus.PENDING
    assert link.client_id == user_client.id
    assert link.trainer_id == trainer.id

