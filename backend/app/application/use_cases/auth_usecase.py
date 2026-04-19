import logging
from datetime import timedelta

from fastapi import HTTPException, status

from app.application.interfaces.security_service import ISecurityService
from app.application.schemas.auth_schemas import (
    AuthUserDTO,
    LoginInputDTO,
    LoginOutputDTO,
    LogoutOutputDTO,
    StatusOutputDTO,
)
from app.config import get_settings

logger = logging.getLogger(__name__)


class AuthUsecase:
    """認証ユースケース"""

    def __init__(
        self,
        security_service: ISecurityService,
    ):
        self.security_service = security_service

    def login(self, input_dto: LoginInputDTO) -> LoginOutputDTO:
        # ============================================================
        # 【暫定実装】Step 1-3 用の bridge 実装
        # ============================================================
        if input_dto.email == 'admin@example.com' and input_dto.password == 'pass':
            settings = get_settings()
            user = AuthUserDTO(id=1, email='admin@example.com')
            session_token = self.security_service.create_access_token(
                user_id=user.id,
                expires_delta=timedelta(days=settings.session_expiration_days),
            )
            logger.info('ログイン成功')

            return LoginOutputDTO(
                user=user,
                session_token=session_token,
                session_expires_in_days=settings.session_expiration_days,
                message='ログインしました。',
            )

        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail='メールアドレスまたはパスワードが正しくありません',
        )

    def logout(self) -> LogoutOutputDTO:
        """ログアウト処理（Cookieはエンドポイント側で削除）"""
        logger.info('ログアウト成功')
        return LogoutOutputDTO(logged_out=True, message='ログアウトしました。')

    def get_auth_status(self, user_id: int) -> StatusOutputDTO:
        """認証状態を取得"""
        if user_id <= 0:
            return StatusOutputDTO(authenticated=False, user=None)

        return StatusOutputDTO(
            authenticated=True, user=AuthUserDTO(id=user_id, email='admin@example.com')
        )
