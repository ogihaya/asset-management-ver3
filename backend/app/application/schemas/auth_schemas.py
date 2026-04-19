from pydantic import BaseModel, Field


class AuthUserDTO(BaseModel):
    """認証済みユーザーDTO"""

    id: int = Field(..., description='ユーザーID')
    email: str = Field(..., description='メールアドレス')


class SignupInputDTO(BaseModel):
    """サインアップ入力DTO"""

    email: str = Field(..., description='メールアドレス')
    password: str = Field(..., description='パスワード')


class SignupOutputDTO(BaseModel):
    """サインアップ出力DTO"""

    user_id: int = Field(..., description='ユーザーID')
    email: str = Field(..., description='メールアドレス')


class LoginInputDTO(BaseModel):
    """ログイン入力DTO"""

    email: str = Field(..., description='メールアドレス')
    password: str = Field(..., description='パスワード')


class LoginOutputDTO(BaseModel):
    """ログイン出力DTO"""

    user: AuthUserDTO = Field(..., description='認証済みユーザー')
    session_token: str = Field(..., description='セッショントークン')
    session_expires_in_days: int = Field(..., description='セッション有効期限（日数）')
    message: str = Field(..., description='メッセージ')


class LogoutOutputDTO(BaseModel):
    """ログアウト出力DTO"""

    logged_out: bool = Field(..., description='ログアウト済みかどうか')
    message: str = Field(..., description='メッセージ')


class StatusOutputDTO(BaseModel):
    """認証状態出力DTO"""

    authenticated: bool = Field(..., description='認証済みかどうか')
    user: AuthUserDTO | None = Field(None, description='認証済みユーザー')


class CurrentUserDTO(BaseModel):
    """認証済みユーザーDTO"""

    id: int = Field(..., description='ユーザーID')
