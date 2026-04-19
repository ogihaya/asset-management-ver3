from datetime import UTC, datetime

from app.application.errors import AppError
from app.application.schemas.user_schemas import DeleteMeOutputDTO, UserMeOutputDTO
from app.domain.repositories.user_repository import IUserRepository
from app.domain.repositories.user_session_repository import IUserSessionRepository


class UserAccountUsecase:
    """ユーザーアカウント関連ユースケース"""

    def __init__(
        self,
        user_repository: IUserRepository,
        user_session_repository: IUserSessionRepository,
    ):
        self.user_repository = user_repository
        self.user_session_repository = user_session_repository

    def get_me(self, current_user_id: int) -> UserMeOutputDTO:
        """現在ユーザーの最小プロフィールを取得する"""
        user = self.user_repository.get_by_id(current_user_id)
        if user is None:
            raise AppError(
                code='UNAUTHORIZED',
                message='認証が必要です。',
                status_code=401,
            )

        return UserMeOutputDTO(id=user.id, email=user.email)

    def delete_me(self, current_user_id: int) -> DeleteMeOutputDTO:
        """現在ユーザーを論理削除し、全セッションを失効する"""
        deleted = self.user_repository.delete(current_user_id)
        if not deleted:
            raise AppError(
                code='UNAUTHORIZED',
                message='認証が必要です。',
                status_code=401,
            )

        self.user_session_repository.revoke_all_by_user_id(
            current_user_id,
            revoked_at=datetime.now(UTC),
        )
        return DeleteMeOutputDTO(
            deleted=True,
            message='アカウントを削除しました。',
        )
