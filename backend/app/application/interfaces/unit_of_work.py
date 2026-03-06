from abc import ABC, abstractmethod
from contextlib import AbstractContextManager


class IUnitOfWork(ABC, AbstractContextManager):
    """
    トランザクション管理のインターフェース

    使用例:
        with uow:
            user = user_repository.create(new_user)
            uow.commit()
    """

    @abstractmethod
    def commit(self) -> None:
        """
        トランザクションをコミットする
        """
        pass

    @abstractmethod
    def rollback(self) -> None:
        """トランザクションをロールバックする"""
        pass

    @abstractmethod
    def flush(self) -> None:
        """
        変更をデータベースに送信するがコミットはしない
        """
        pass

    @abstractmethod
    def __enter__(self):
        """コンテキストマネージャー開始"""
        pass

    @abstractmethod
    def __exit__(self, exc_type, exc_val, exc_tb):
        """
        コンテキストマネージャー終了
        例外が発生した場合は自動的にロールバックする
        """
        pass
