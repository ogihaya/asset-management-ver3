from datetime import datetime, timedelta

from pydantic import BaseModel, ConfigDict, Field


class UserSession(BaseModel):
    """ユーザーセッションエンティティ"""

    model_config = ConfigDict(from_attributes=True)

    id: int | None = Field(None, description='セッションID')
    user_id: int = Field(..., description='ユーザーID')
    session_token_hash: str = Field(..., description='セッショントークンハッシュ')
    expires_at: datetime = Field(..., description='有効期限')
    revoked_at: datetime | None = Field(None, description='失効日時')
    last_seen_at: datetime | None = Field(None, description='最終アクセス日時')
    created_at: datetime | None = Field(None, description='作成日時')

    def is_revoked(self) -> bool:
        """失効済みかを返す"""
        return self.revoked_at is not None

    def is_expired(self, now: datetime) -> bool:
        """有効期限切れかを返す"""
        return self.expires_at <= now

    def is_active(self, now: datetime) -> bool:
        """有効なセッションかを返す"""
        return not self.is_revoked() and not self.is_expired(now)

    def should_refresh(self, now: datetime, refresh_interval_hours: int = 24) -> bool:
        """セッション延長対象かを返す"""
        if not self.is_active(now):
            return False

        if self.last_seen_at is None:
            return True

        refresh_threshold = now - timedelta(hours=refresh_interval_hours)
        return self.last_seen_at <= refresh_threshold
