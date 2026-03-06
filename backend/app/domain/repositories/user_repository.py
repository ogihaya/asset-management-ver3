from abc import ABC, abstractmethod

from app.domain.entities.user import User


class IUserRepository(ABC):
    """ユーザーリポジトリのインターフェース"""

    @abstractmethod
    def get_by_login_id(self, login_id: str) -> User | None:
        """
        ログインIDでユーザーを取得

        Args:
            login_id: ログインID

        Returns:
            Optional[User]: ユーザーエンティティ（存在しない場合はNone）
        """
        pass

    @abstractmethod
    def get_by_id(self, user_id: int) -> User | None:
        """
        IDでユーザーを取得

        Args:
            user_id: ユーザーID

        Returns:
            Optional[User]: ユーザーエンティティ（存在しない場合はNone）
        """
        pass

    @abstractmethod
    def create(self, user: User) -> User:
        """
        ユーザーを作成

        Args:
            user: ユーザーエンティティ

        Returns:
            User: 作成されたユーザーエンティティ
        """
        pass

    @abstractmethod
    def update(self, user: User) -> User:
        """
        ユーザーを更新

        Args:
            user: ユーザーエンティティ

        Returns:
            User: 更新されたユーザーエンティティ
        """
        pass

    @abstractmethod
    def delete(self, user_id: int) -> bool:
        """
        ユーザーを削除

        Args:
            user_id: ユーザーID

        Returns:
            bool: 削除成功の場合True
        """
        pass
