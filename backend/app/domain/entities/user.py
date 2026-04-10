from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class User(BaseModel):
    """ユーザーエンティティ"""

    model_config = ConfigDict(from_attributes=True)

    id: int = Field(..., description='ユーザーID')
    email: str = Field(..., description='メールアドレス')
    password_hash: str = Field(..., description='ハッシュ化されたパスワード')
    name: str | None = Field(None, description='ユーザー名')
    deleted_at: datetime | None = Field(None, description='論理削除日時')
