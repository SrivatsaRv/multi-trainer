# Standard typing no longer needed for Generator/Optional here if unused

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from pydantic import ValidationError
from sqlmodel import Session, select

from app.core.config import settings
from app.core.security import ALGORITHM
from app.db.session import get_session
from app.models.session import UserSession
from app.models.user import User

reusable_oauth2 = OAuth2PasswordBearer(
    tokenUrl=f"{settings.API_V1_STR}/auth/login/access-token"
)


def get_current_user(
    session: Session = Depends(get_session),
    token: str = Depends(reusable_oauth2),
) -> User:
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[ALGORITHM])
        token_data = payload.get("sub")
    except (JWTError, ValidationError):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Could not validate credentials",
        )

    # Stateful Session Check: Verify token exists and is active in DB
    user_session = session.exec(
        select(UserSession).where(
            UserSession.token == token, UserSession.is_active.is_(True)
        )
    ).first()

    if not user_session:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="SESSION_EXPIRED",
        )

    user = session.get(User, int(token_data))
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if not user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")
    return user
