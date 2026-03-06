from pydantic import BaseModel, Field


class LoginRequest(BaseModel):
    """ログインリクエスト"""

    login_id: str = Field(..., description='ログインID')
    password: str = Field(..., description='パスワード')


class LoginResponse(BaseModel):
    """ログインレスポンス"""

    message: str = Field(..., description='メッセージ')
    access_token: str = Field(..., description='アクセストークン')
    user_id: int = Field(..., description='ユーザーID')


class LogoutResponse(BaseModel):
    """ログアウトレスポンス"""

    message: str = Field(..., description='メッセージ')


class StatusResponse(BaseModel):
    """認証状態レスポンス"""

    is_authenticated: bool = Field(..., description='認証済みかどうか')
    user_id: int = Field(..., description='ユーザーID')
