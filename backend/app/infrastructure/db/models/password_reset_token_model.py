"""パスワード再設定トークンDBモデル"""

from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, func

from app.infrastructure.db.models.base import Base


class PasswordResetTokenModel(Base):
    """パスワード再設定トークンテーブル"""

    __tablename__ = 'password_reset_tokens'

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey('users.id'), nullable=False, index=True)
    token_hash = Column(String(255), unique=True, nullable=False)
    expires_at = Column(DateTime(timezone=True), nullable=False)
    used_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
