"""ユーザーセッションDBモデル"""

from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, func

from app.infrastructure.db.models.base import Base


class UserSessionModel(Base):
    """ユーザーセッションテーブル"""

    __tablename__ = 'user_sessions'

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey('users.id'), nullable=False, index=True)
    session_token_hash = Column(String(255), unique=True, nullable=False)
    expires_at = Column(DateTime(timezone=True), nullable=False)
    revoked_at = Column(DateTime(timezone=True), nullable=True)
    last_seen_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
