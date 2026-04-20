from abc import ABC, abstractmethod

from app.domain.entities.user import User


class IUserRepository(ABC):
    """ユーザーリポジトリのインターフェース"""

    @abstractmethod
    def get_by_email_including_deleted(self, email: str) -> User | None:
        """
        論理削除済みを含めてメールアドレスでユーザーを取得

        Args:
            email: メールアドレス

        Returns:
            Optional[User]: ユーザーエンティティ（存在しない場合はNone）
        """
        pass

    @abstractmethod
    def get_by_email(self, email: str) -> User | None:
        """
        メールアドレスでユーザーを取得

        Args:
            email: メールアドレス

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
        ユーザーを論理削除

        Args:
            user_id: ユーザーID

        Returns:
            bool: 論理削除成功の場合True
        """
        pass
