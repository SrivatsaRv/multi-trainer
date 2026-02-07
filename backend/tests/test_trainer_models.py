import pytest

from app.models.gym import VerificationStatus
from app.models.trainer import Trainer, TrainerCreate, TrainerUpdate


def test_create_trainer_with_defaults():
    trainer = Trainer(bio="Experienced fitness trainer", user_id=1)

    assert trainer.bio == "Experienced fitness trainer"
    assert trainer.user_id == 1
    assert trainer.verification_status == VerificationStatus.PENDING
    assert trainer.specializations == []  # Default is empty list, not None


def test_create_trainer_with_all_fields():
    trainer = Trainer(
        bio="Expert trainer with 10 years experience",
        specializations=["HIIT", "Yoga", "Strength Training"],
        user_id=1,
        verification_status=VerificationStatus.APPROVED,
    )

    assert trainer.bio == "Expert trainer with 10 years experience"
    assert trainer.specializations == ["HIIT", "Yoga", "Strength Training"]
    assert trainer.verification_status == VerificationStatus.APPROVED


def test_trainer_create_model():
    trainer_create = TrainerCreate(bio="New trainer ready to help")

    assert trainer_create.bio == "New trainer ready to help"


def test_trainer_update_model():
    trainer_update = TrainerUpdate(
        bio="Updated bio", specializations=["Updated", "specializations"]
    )

    assert trainer_update.bio == "Updated bio"
    assert trainer_update.specializations == ["Updated", "specializations"]
