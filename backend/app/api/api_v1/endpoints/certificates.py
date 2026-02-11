from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select

from app.api.api_v1.deps import get_current_user
from app.db.session import get_session
from app.models.certificate import (Certificate, CertificateCreate,
                                    CertificateUpdate)
from app.models.trainer import Trainer
from app.models.user import User

router = APIRouter()


@router.get("/", response_model=List[Certificate])
def read_certificates(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """
    Retrieve certificates for the current trainer.
    """
    trainer = session.exec(
        select(Trainer).where(Trainer.user_id == current_user.id)
    ).first()
    if not trainer:
        raise HTTPException(status_code=404, detail="Trainer profile not found")

    return trainer.certificates


@router.post("/", response_model=Certificate, status_code=status.HTTP_201_CREATED)
def create_certificate(
    certificate_in: CertificateCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """
    Add a new certificate to the trainer profile.
    """
    trainer = session.exec(
        select(Trainer).where(Trainer.user_id == current_user.id)
    ).first()
    if not trainer:
        raise HTTPException(status_code=404, detail="Trainer profile not found")

    certificate = Certificate(**certificate_in.model_dump(), trainer_id=trainer.id)
    session.add(certificate)
    session.commit()
    session.refresh(certificate)
    return certificate


@router.put("/{certificate_id}", response_model=Certificate)
def update_certificate(
    certificate_id: int,
    certificate_in: CertificateUpdate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """
    Update a certificate.
    """
    trainer = session.exec(
        select(Trainer).where(Trainer.user_id == current_user.id)
    ).first()
    if not trainer:
        raise HTTPException(status_code=404, detail="Trainer profile not found")

    certificate = session.get(Certificate, certificate_id)
    if not certificate:
        raise HTTPException(status_code=404, detail="Certificate not found")
    if certificate.trainer_id != trainer.id:
        raise HTTPException(status_code=403, detail="Not authorized")

    update_data = certificate_in.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(certificate, key, value)

    session.add(certificate)
    session.commit()
    session.refresh(certificate)
    return certificate


@router.delete("/{certificate_id}", status_code=status.HTTP_200_OK)
def delete_certificate(
    certificate_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """
    Delete a certificate.
    """
    trainer = session.exec(
        select(Trainer).where(Trainer.user_id == current_user.id)
    ).first()
    if not trainer:
        raise HTTPException(status_code=404, detail="Trainer profile not found")

    certificate = session.get(Certificate, certificate_id)
    if not certificate:
        raise HTTPException(status_code=404, detail="Certificate not found")
    if certificate.trainer_id != trainer.id:
        raise HTTPException(status_code=403, detail="Not authorized")

    session.delete(certificate)
    session.commit()
    return {"message": "Certificate deleted"}
