from pydantic import BaseModel, Field


class EmptyMeta(BaseModel):
    """補足情報なしメタ"""


class MessageMeta(BaseModel):
    """メッセージ付きメタ"""

    message: str = Field(..., description='メッセージ')


class SessionMeta(MessageMeta):
    """セッション情報付きメタ"""

    session_expires_in_days: int = Field(..., description='セッション有効期限（日数）')


class AuthUserResponse(BaseModel):
    """認証ユーザー情報"""

    id: int = Field(..., description='ユーザーID')
    email: str = Field(..., description='メールアドレス')


class SignupRequest(BaseModel):
    """サインアップリクエスト"""

    email: str = Field(..., description='メールアドレス')
    password: str = Field(..., description='パスワード')


class SignupData(BaseModel):
    """サインアップレスポンスデータ"""

    user_id: int = Field(..., description='ユーザーID')
    email: str = Field(..., description='メールアドレス')


class SignupResponse(BaseModel):
    """サインアップレスポンス"""

    data: SignupData = Field(..., description='レスポンスデータ')
    meta: MessageMeta = Field(..., description='補足情報')


class LoginRequest(BaseModel):
    """ログインリクエスト"""

    email: str = Field(..., description='メールアドレス')
    password: str = Field(..., description='パスワード')


class LoginData(BaseModel):
    """ログインレスポンスデータ"""

    user: AuthUserResponse = Field(..., description='認証済みユーザー')


class LoginResponse(BaseModel):
    """ログインレスポンス"""

    data: LoginData = Field(..., description='レスポンスデータ')
    meta: SessionMeta = Field(..., description='補足情報')


class LogoutData(BaseModel):
    """ログアウトレスポンスデータ"""

    logged_out: bool = Field(..., description='ログアウト済みかどうか')


class LogoutResponse(BaseModel):
    """ログアウトレスポンス"""

    data: LogoutData = Field(..., description='レスポンスデータ')
    meta: MessageMeta = Field(..., description='補足情報')


class StatusData(BaseModel):
    """認証状態レスポンスデータ"""

    authenticated: bool = Field(..., description='認証済みかどうか')
    user: AuthUserResponse | None = Field(None, description='認証済みユーザー')


class StatusResponse(BaseModel):
    """認証状態レスポンス"""

    data: StatusData = Field(..., description='レスポンスデータ')
    meta: EmptyMeta = Field(default_factory=EmptyMeta, description='補足情報')
