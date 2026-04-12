from abc import ABC, abstractmethod


class ISessionTokenService(ABC):
    """セッショントークンサービスのインターフェース"""

    @abstractmethod
    def generate_token(self) -> str:
        """平文セッショントークンを生成する"""
        pass

    @abstractmethod
    def hash_token(self, raw_token: str) -> str:
        """平文セッショントークンをハッシュ化する"""
        pass
