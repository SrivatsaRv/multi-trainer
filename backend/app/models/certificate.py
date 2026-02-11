from datetime import date
from typing import TYPE_CHECKING, Optional

from sqlmodel import Field, Relationship, SQLModel

if TYPE_CHECKING:
    from app.models.trainer import Trainer


class CertificateBase(SQLModel):
    name: str = Field(index=True)
    issuing_organization: str
    issue_date: date
    expiry_date: Optional[date] = None
    credential_id: Optional[str] = None
    credential_url: Optional[str] = None


class Certificate(CertificateBase, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    trainer_id: int = Field(foreign_key="trainer.id")

    # Relationships
    trainer: "Trainer" = Relationship(back_populates="certificates")


class CertificateCreate(CertificateBase):
    pass


class CertificateUpdate(SQLModel):
    name: Optional[str] = None
    issuing_organization: Optional[str] = None
    issue_date: Optional[date] = None
    expiry_date: Optional[date] = None
    credential_id: Optional[str] = None
    credential_url: Optional[str] = None
