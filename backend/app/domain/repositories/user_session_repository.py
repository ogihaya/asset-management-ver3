from abc import ABC, abstractmethod
from datetime import datetime

from app.domain.entities.user_session import UserSession


class IUserSessionRepository(ABC):
    """ユーザーセッションリポジトリのインターフェース"""

    @abstractmethod
    def create(self, session: UserSession) -> UserSession:
        """ユーザーセッションを作成"""
        pass

    @abstractmethod
    def find_active_by_token_hash(
        self, session_token_hash: str, now: datetime
    ) -> UserSession | None:
        """有効なユーザーセッションをトークンハッシュで取得"""
        pass

    @abstractmethod
    def revoke_by_token_hash(self, session_token_hash: str, revoked_at: datetime) -> bool:
        """指定トークンハッシュのセッションを失効する"""
        pass

    @abstractmethod
    def revoke_all_by_user_id(self, user_id: int, revoked_at: datetime) -> int:
        """指定ユーザーの有効セッションをすべて失効する"""
        pass

    @abstractmethod
    def touch(
        self, session_id: int, last_seen_at: datetime, expires_at: datetime
    ) -> UserSession:
        """セッションの最終アクセス日時と有効期限を更新する"""
        pass
