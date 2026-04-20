from datetime import UTC, datetime

from sqlalchemy.orm import Session

from app.domain.entities.user_session import UserSession
from app.domain.repositories.user_session_repository import IUserSessionRepository
from app.infrastructure.db.models.user_model import UserModel
from app.infrastructure.db.models.user_session_model import UserSessionModel


class UserSessionRepositoryImpl(IUserSessionRepository):
    """ユーザーセッションリポジトリの実装"""

    def __init__(self, session: Session):
        """コンストラクタ"""
        self.session = session

    def create(self, session: UserSession) -> UserSession:
        """ユーザーセッションを作成"""
        session_model = UserSessionModel(
            user_id=session.user_id,
            session_token_hash=session.session_token_hash,
            expires_at=session.expires_at,
            revoked_at=session.revoked_at,
            last_seen_at=session.last_seen_at,
        )
        self.session.add(session_model)
        self.session.flush()
        self.session.refresh(session_model)
        return self._to_entity(session_model)

    def find_by_token_hash(self, session_token_hash: str) -> UserSession | None:
        """トークンハッシュでユーザーセッションを取得"""
        session_model = (
            self.session.query(UserSessionModel)
            .filter(UserSessionModel.session_token_hash == session_token_hash)
            .first()
        )
        if session_model is None:
            return None
        return self._to_entity(session_model)

    def find_active_by_token_hash(
        self, session_token_hash: str, now: datetime
    ) -> UserSession | None:
        """有効なユーザーセッションをトークンハッシュで取得"""
        session_model = (
            self.session.query(UserSessionModel)
            .join(UserModel, UserSessionModel.user_id == UserModel.id)
            .filter(
                UserSessionModel.session_token_hash == session_token_hash,
                UserSessionModel.revoked_at.is_(None),
                UserSessionModel.expires_at > now,
                UserModel.deleted_at.is_(None),
            )
            .first()
        )
        if session_model is None:
            return None
        return self._to_entity(session_model)

    def revoke_by_token_hash(self, session_token_hash: str, revoked_at: datetime) -> bool:
        """指定トークンハッシュのセッションを失効する"""
        session_model = (
            self.session.query(UserSessionModel)
            .filter(
                UserSessionModel.session_token_hash == session_token_hash,
                UserSessionModel.revoked_at.is_(None),
            )
            .first()
        )
        if session_model is None:
            return False

        session_model.revoked_at = revoked_at
        self.session.flush()
        return True

    def revoke_all_by_user_id(self, user_id: int, revoked_at: datetime) -> int:
        """指定ユーザーの有効セッションをすべて失効する"""
        session_models = (
            self.session.query(UserSessionModel)
            .filter(
                UserSessionModel.user_id == user_id,
                UserSessionModel.revoked_at.is_(None),
            )
            .all()
        )
        for session_model in session_models:
            session_model.revoked_at = revoked_at

        self.session.flush()
        return len(session_models)

    def touch(
        self, session_id: int, last_seen_at: datetime, expires_at: datetime
    ) -> UserSession:
        """セッションの最終アクセス日時と有効期限を更新する"""
        session_model = (
            self.session.query(UserSessionModel)
            .filter(UserSessionModel.id == session_id)
            .first()
        )
        if session_model is None:
            raise ValueError(f'UserSession with id {session_id} not found')

        session_model.last_seen_at = last_seen_at
        session_model.expires_at = expires_at
        self.session.flush()
        self.session.refresh(session_model)
        return self._to_entity(session_model)

    def _to_entity(self, session_model: UserSessionModel) -> UserSession:
        """DBモデルをエンティティに変換"""
        return UserSession(
            id=session_model.id,
            user_id=session_model.user_id,
            session_token_hash=session_model.session_token_hash,
            expires_at=self._normalize_utc(session_model.expires_at),
            revoked_at=self._normalize_utc(session_model.revoked_at),
            last_seen_at=self._normalize_utc(session_model.last_seen_at),
            created_at=self._normalize_utc(session_model.created_at),
        )

    def _normalize_utc(self, value: datetime | None) -> datetime | None:
        """SQLite などで naive に返る日時を UTC aware に正規化する"""
        if value is None or value.tzinfo is not None:
            return value
        return value.replace(tzinfo=UTC)
