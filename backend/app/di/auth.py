from app.application.use_cases.auth_usecase import AuthUsecase
from app.infrastructure.security.security_service_impl import SecurityServiceImpl

# from app.infrastructure.db.repositories.user_repository_impl import UserRepositoryImpl
# from app.infrastructure.db.session import get_db
# from sqlalchemy.orm import Session
# from fastapi import Depends


def get_auth_usecase() -> AuthUsecase:
    security_service = SecurityServiceImpl()
    return AuthUsecase(security_service=security_service)


# 【将来実装】DBを使用する場合
# def get_auth_usecase(session: Session = Depends(get_db)) -> AuthUsecase:
#     security_service = SecurityServiceImpl()
#     user_repository = UserRepositoryImpl(session)
#     return AuthUsecase(security_service=security_service, user_repository=user_repository)
