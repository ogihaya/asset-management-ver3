from pydantic import BaseModel, Field


class UserMeOutputDTO(BaseModel):
    """現在ユーザー取得出力DTO"""

    id: int = Field(..., description='ユーザーID')
    email: str = Field(..., description='メールアドレス')


class DeleteMeOutputDTO(BaseModel):
    """アカウント削除出力DTO"""

    deleted: bool = Field(..., description='削除完了フラグ')
    message: str = Field(..., description='メッセージ')
