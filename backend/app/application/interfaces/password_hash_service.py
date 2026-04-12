from abc import ABC, abstractmethod


class IPasswordHashService(ABC):
    """パスワードハッシュサービスのインターフェース"""

    @abstractmethod
    def hash_password(self, plain_password: str) -> str:
        """平文パスワードをハッシュ化する"""
        pass

    @abstractmethod
    def verify_password(self, plain_password: str, password_hash: str) -> bool:
        """平文パスワードとハッシュ値が一致するかを検証する"""
        pass
