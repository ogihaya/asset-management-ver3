from pydantic import BaseModel, Field


class LoginInputDTO(BaseModel):
    """ログイン入力DTO"""

    login_id: str = Field(..., description='ログインID')
    password: str = Field(..., description='パスワード')


class LoginOutputDTO(BaseModel):
    """ログイン出力DTO"""

    access_token: str = Field(..., description='アクセストークン')
    user_id: int = Field(..., description='ユーザーID')


class LogoutOutputDTO(BaseModel):
    """ログアウト出力DTO"""

    message: str = Field(..., description='メッセージ')


class StatusOutputDTO(BaseModel):
    """認証状態出力DTO"""

    is_authenticated: bool = Field(..., description='認証済みかどうか')
    user_id: int = Field(..., description='ユーザーID')
