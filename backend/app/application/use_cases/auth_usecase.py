import logging

# from app.domain.repositories.user_repository import IUserRepository
from fastapi import HTTPException, status

from app.application.interfaces.security_service import ISecurityService
from app.application.schemas.auth_schemas import (
    LoginInputDTO,
    LoginOutputDTO,
    LogoutOutputDTO,
    StatusOutputDTO,
)

logger = logging.getLogger(__name__)


class AuthUsecase:
    """認証ユースケース"""

    def __init__(
        self,
        security_service: ISecurityService,
        # user_repository: IUserRepository  # 将来のDB認証用
    ):
        self.security_service = security_service
        # self.user_repository = user_repository

    def login(self, input_dto: LoginInputDTO) -> LoginOutputDTO:
        # ============================================================
        # 【暫定実装】ハードコーディングでの認証
        # ============================================================
        if input_dto.login_id == 'admin' and input_dto.password == 'pass':
            user_id = 1
            access_token = self.security_service.create_access_token(user_id=user_id)
            logger.info('ログイン成功')

            return LoginOutputDTO(access_token=access_token, user_id=user_id)
        else:
            # 認証失敗
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail='ログインIDまたはパスワードが正しくありません',
            )

        # ============================================================
        # 【将来実装】DBを使用した認証（参考実装）
        # ============================================================
        # login_id = input_dto.login_id
        # password = input_dto.password
        #
        # user_data = self.user_repository.get_by_login_id(login_id)
        #
        # if user_data is None:
        #     raise HTTPException(
        #         status_code=status.HTTP_401_UNAUTHORIZED,
        #         detail="ログインIDもしくはパスワードが違います。"
        #     )
        #
        # is_authenticated = self.security_service.verify_password(
        #     password, user_data.password
        # )
        # if not is_authenticated:
        #     raise HTTPException(
        #         status_code=status.HTTP_401_UNAUTHORIZED,
        #         detail="ログインIDもしくはパスワードが違います。"
        #     )
        #
        # # logger.info("ログイン成功")
        #
        # access_token = self.security_service.create_access_token(user_id=user_data.id)
        # return LoginOutputDTO(
        #     access_token=access_token,
        #     user_id=user_data.id
        # )

    def logout(self) -> LogoutOutputDTO:
        """ログアウト処理（Cookieはエンドポイント側で削除）"""
        logger.info('ログアウト成功')
        return LogoutOutputDTO(message='ログアウトしました')

    def get_auth_status(self, user_id: int) -> StatusOutputDTO:
        """認証状態を取得"""
        return StatusOutputDTO(is_authenticated=True, user_id=user_id)
