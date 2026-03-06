import logging
import time

from sqlalchemy.exc import IntegrityError, OperationalError
from sqlalchemy.orm import Session

from app.application.interfaces.unit_of_work import IUnitOfWork
from app.infrastructure.db.session import SessionLocal

logger = logging.getLogger(__name__)

# デッドロックリトライ設定
MAX_RETRIES = 3  # 最大リトライ回数
RETRY_DELAY = 0.5  # リトライ間の待機時間（秒）


class SQLAlchemyUnitOfWork(IUnitOfWork):
    """
    SQLAlchemy用のUnit of Work実装

    使用例:
        uow = SQLAlchemyUnitOfWork()
        with uow:
            repository = UserRepository(uow.session)
            user = repository.create(new_user)
            uow.commit()
    """

    def __init__(self):
        self.session: Session = None

    def __enter__(self):
        """セッションを開始"""
        self.session = SessionLocal()
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        """
        セッションを終了
        例外が発生していた場合は自動的にロールバック
        """
        if exc_type is not None:
            self.rollback()
        self.session.close()
        return False  # 例外を再送出

    def commit(self):
        """
        トランザクションをコミット
        デッドロックが発生した場合は自動的にリトライ
        """
        retries = 0
        while retries < MAX_RETRIES:
            try:
                self.session.commit()
                logger.debug('トランザクションをコミットしました')
                return
            except (OperationalError, IntegrityError) as e:
                if self._is_deadlock_or_lock_timeout(e):
                    retries += 1
                    self.session.rollback()
                    logger.warning(
                        f'デッドロック検出。リトライ {retries}/{MAX_RETRIES}: {e}'
                    )
                    # 指数バックオフでリトライ
                    time.sleep(RETRY_DELAY * retries)
                    continue
                else:
                    # デッドロック以外のエラーは即座に例外を送出
                    self.session.rollback()
                    logger.error(f'トランザクションエラー: {e}')
                    raise

        # 最大リトライ回数を超えた場合
        error_msg = f'最大リトライ回数({MAX_RETRIES})を超えました'
        logger.error(error_msg)
        raise Exception(error_msg)

    def rollback(self):
        """トランザクションをロールバック"""
        self.session.rollback()
        logger.debug('トランザクションをロールバックしました')

    def flush(self):
        """
        変更をデータベースに送信するがコミットはしない
        """
        self.session.flush()
        logger.debug('変更をフラッシュしました')

    @staticmethod
    def _is_deadlock_or_lock_timeout(e):
        """
        例外がデッドロックまたはロックタイムアウトかを判定

        対応するエラー:
        - PostgreSQL: deadlock detected
        - PostgreSQL: could not serialize access
        - MySQL: Deadlock found
        - MySQL: Lock wait timeout exceeded
        """
        error_msg = str(e).lower()
        deadlock_keywords = [
            'deadlock',
            'lock timeout',
            'lock wait timeout',
            'could not serialize access',
        ]
        return any(keyword in error_msg for keyword in deadlock_keywords)
