from fastapi import Depends, Request
from sqlalchemy.orm import Session

from app.application.interfaces.password_hash_service import IPasswordHashService
from app.application.interfaces.session_token_service import ISessionTokenService
from app.application.schemas.auth_schemas import CurrentUserDTO
from app.application.use_cases.auth_usecase import AuthUsecase
from app.domain.repositories.user_repository import IUserRepository
from app.domain.repositories.user_session_repository import IUserSessionRepository
from app.infrastructure.db.repositories.user_repository_impl import UserRepositoryImpl
from app.infrastructure.db.repositories.user_session_repository_impl import (
    UserSessionRepositoryImpl,
)
from app.infrastructure.db.session import get_db
from app.infrastructure.security.password_hash_service_impl import PasswordHashServiceImpl
from app.infrastructure.security.security_service_impl import (
    SecurityServiceImpl,
    get_current_user_from_cookie,
)
from app.infrastructure.security.session_token_service_impl import SessionTokenServiceImpl


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


def get_current_auth_user(request: Request) -> CurrentUserDTO:
    """現在の認証済みユーザーを取得する"""
    current_user = get_current_user_from_cookie(request)
    return CurrentUserDTO(id=current_user.id)


def get_auth_usecase() -> AuthUsecase:
    security_service = SecurityServiceImpl()
    return AuthUsecase(security_service=security_service)


# 【将来実装】DBを使用する場合
# def get_auth_usecase(session: Session = Depends(get_db)) -> AuthUsecase:
#     security_service = SecurityServiceImpl()
#     user_repository = UserRepositoryImpl(session)
#     return AuthUsecase(security_service=security_service, user_repository=user_repository)
