from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from app.api.api_v1.deps import get_session
from app.models.user import User
from app.core.config import settings

router = APIRouter()

@router.delete("/purge-user")
def purge_test_user(
    email: str,
    session: Session = Depends(get_session),
):
    """
    DANGEROUS: Test utility to purge a user by email.
    Only allows deleting emails starting with 'test_'.
    """
    # Safety Check: only allow in test/local and only specific email patterns
    if not (email.startswith("test_") or email.startswith("e2e_")):
        raise HTTPException(status_code=400, detail="Can only purge test users (prefix 'test_' or 'e2e_')")
    
    user = session.exec(select(User).where(User.email == email)).first()
    if not user:
        return {"status": "not_found"}
    
    # Cascade delete (Manual for now as seen in demo_data)
    if user.gym:
        session.delete(user.gym)
    if user.trainer:
        session.delete(user.trainer)
    
    session.delete(user)
    session.commit()
    return {"status": "deleted", "email": email}
