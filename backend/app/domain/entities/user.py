from pydantic import BaseModel, Field


class User(BaseModel):
    """ユーザーエンティティ"""

    id: int = Field(..., description='ユーザーID')
    login_id: str = Field(..., description='ログインID')
    password: str = Field(..., description='ハッシュ化されたパスワード')
    email: str | None = Field(None, description='メールアドレス')
    name: str | None = Field(None, description='ユーザー名')

    class Config:
        """Pydantic設定"""

        from_attributes = True  # SQLAlchemyモデルから変換可能にする
