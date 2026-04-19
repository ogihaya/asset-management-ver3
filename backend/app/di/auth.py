from datetime import UTC, datetime

from fastapi import Depends, Request
from sqlalchemy.orm import Session

from app.application.errors import AppError
from app.application.interfaces.password_hash_service import IPasswordHashService
from app.application.interfaces.session_token_service import ISessionTokenService
from app.application.schemas.auth_schemas import AuthSessionContextDTO, CurrentUserDTO
from app.application.use_cases.auth_usecase import AuthUsecase
from app.application.use_cases.user_account_usecase import UserAccountUsecase
from app.domain.repositories.user_repository import IUserRepository
from app.domain.repositories.user_session_repository import IUserSessionRepository
from app.infrastructure.db.repositories.user_repository_impl import UserRepositoryImpl
from app.infrastructure.db.repositories.user_session_repository_impl import (
    UserSessionRepositoryImpl,
)
from app.infrastructure.db.session import get_db
from app.infrastructure.security.password_hash_service_impl import PasswordHashServiceImpl
from app.infrastructure.security.session_token_service_impl import SessionTokenServiceImpl
from app.config import get_settings


def get_user_repository(session: Session = Depends(get_db)) -> IUserRepository:
    """ユーザーリポジトリを取得する"""
    return UserRepositoryImpl(session)


def get_user_session_repository(
    session: Session = Depends(get_db),
) -> IUserSessionRepository:
    """ユーザーセッションリポジトリを取得する"""
    return UserSessionRepositoryImpl(session)


def get_password_hash_service() -> IPasswordHashService:
    """パスワードハッシュサービスを取得する"""
    return PasswordHashServiceImpl()


def get_session_token_service() -> ISessionTokenService:
    """セッショントークンサービスを取得する"""
    return SessionTokenServiceImpl()


def get_auth_session_context(
    request: Request,
    user_repository: IUserRepository = Depends(get_user_repository),
    user_session_repository: IUserSessionRepository = Depends(
        get_user_session_repository
    ),
    session_token_service: ISessionTokenService = Depends(get_session_token_service),
) -> AuthSessionContextDTO:
    """現在のセッション状態を取得する"""
    settings = get_settings()
    if not settings.enable_auth:
        return AuthSessionContextDTO(authenticated=True, user_id=0)

    raw_token = request.cookies.get(settings.session_cookie_name)
    if not raw_token:
        return AuthSessionContextDTO()

    token_hash = session_token_service.hash_token(raw_token)
    session = user_session_repository.find_by_token_hash(token_hash)
    if session is None:
        return AuthSessionContextDTO(
            raw_token=raw_token,
            session_token_hash=token_hash,
        )

    now = datetime.now(UTC)
    if session.is_revoked():
        return AuthSessionContextDTO(
            raw_token=raw_token,
            session_token_hash=token_hash,
            session_id=session.id,
            user_id=session.user_id,
        )

    if session.is_expired(now):
        return AuthSessionContextDTO(
            raw_token=raw_token,
            session_token_hash=token_hash,
            session_id=session.id,
            user_id=session.user_id,
            last_seen_at=session.last_seen_at,
            expires_at=session.expires_at,
            expired=True,
        )

    user = user_repository.get_by_id(session.user_id)
    if user is None:
        return AuthSessionContextDTO(
            raw_token=raw_token,
            session_token_hash=token_hash,
            session_id=session.id,
            user_id=session.user_id,
            last_seen_at=session.last_seen_at,
            expires_at=session.expires_at,
        )

    return AuthSessionContextDTO(
        raw_token=raw_token,
        session_token_hash=token_hash,
        session_id=session.id,
        user_id=user.id,
        last_seen_at=session.last_seen_at,
        expires_at=session.expires_at,
        authenticated=True,
    )


def get_current_auth_user(
    session_context: AuthSessionContextDTO = Depends(get_auth_session_context),
) -> CurrentUserDTO:
    """現在の認証済みユーザーを取得する"""
    settings = get_settings()
    if not settings.enable_auth:
        return CurrentUserDTO(id=0)

    if session_context.expired:
        raise AppError(
            code='SESSION_EXPIRED',
            message='セッションの有効期限が切れました。再度ログインしてください。',
            status_code=401,
            clear_auth_cookie=True,
        )

    if not session_context.authenticated or session_context.user_id is None:
        raise AppError(
            code='UNAUTHORIZED',
            message='認証が必要です。',
            status_code=401,
        )

    return CurrentUserDTO(id=session_context.user_id)


def get_auth_usecase(
    user_repository: IUserRepository = Depends(get_user_repository),
    user_session_repository: IUserSessionRepository = Depends(
        get_user_session_repository
    ),
    password_hash_service: IPasswordHashService = Depends(get_password_hash_service),
    session_token_service: ISessionTokenService = Depends(get_session_token_service),
) -> AuthUsecase:
    return AuthUsecase(
        user_repository=user_repository,
        user_session_repository=user_session_repository,
        password_hash_service=password_hash_service,
        session_token_service=session_token_service,
    )


def get_user_account_usecase(
    user_repository: IUserRepository = Depends(get_user_repository),
    user_session_repository: IUserSessionRepository = Depends(
        get_user_session_repository
    ),
) -> UserAccountUsecase:
    return UserAccountUsecase(
        user_repository=user_repository,
        user_session_repository=user_session_repository,
    )
