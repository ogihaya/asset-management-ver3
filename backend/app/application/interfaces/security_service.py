from abc import ABC, abstractmethod
from datetime import timedelta


class ISecurityService(ABC):
    """セキュリティサービスのインターフェース"""

    @abstractmethod
    def create_access_token(
        self, user_id: int, expires_delta: timedelta | None = None
    ) -> str:
        """
        アクセストークンを生成

        Args:
            user_id: ユーザーID
            expires_delta: 有効期限

        Returns:
            str: アクセストークン
        """
        pass

    @abstractmethod
    def verify_password(self, plain_password: str, hashed_password: str) -> bool:
        """
        パスワードを検証

        Args:
            plain_password: 平文パスワード
            hashed_password: ハッシュ化されたパスワード

        Returns:
            bool: パスワードが一致するかどうか
        """
        pass
