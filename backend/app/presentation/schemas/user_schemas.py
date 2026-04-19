from pydantic import BaseModel, Field

from app.presentation.schemas.auth_schemas import EmptyMeta, MessageMeta


class UserMeData(BaseModel):
    """現在ユーザーレスポンスデータ"""

    id: int = Field(..., description='ユーザーID')
    email: str = Field(..., description='メールアドレス')


class UserMeResponse(BaseModel):
    """現在ユーザーレスポンス"""

    data: UserMeData = Field(..., description='レスポンスデータ')
    meta: EmptyMeta = Field(default_factory=EmptyMeta, description='補足情報')


class DeleteMeData(BaseModel):
    """アカウント削除レスポンスデータ"""

    deleted: bool = Field(..., description='削除完了フラグ')


class DeleteMeResponse(BaseModel):
    """アカウント削除レスポンス"""

    data: DeleteMeData = Field(..., description='レスポンスデータ')
    meta: MessageMeta = Field(..., description='補足情報')
