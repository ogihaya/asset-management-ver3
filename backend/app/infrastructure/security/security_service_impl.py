from datetime import datetime, timedelta

from fastapi import HTTPException, Request, status
from jose import JWTError, jwt
from passlib.context import CryptContext
from pydantic import BaseModel, Field

from app.application.interfaces.security_service import ISecurityService
from app.config import get_settings


class User(BaseModel):
    """ユーザースキーマ（認証用）"""

    id: int = Field(..., description='ユーザーID')


pwd_context = CryptContext(schemes=['bcrypt'], deprecated='auto')


class SecurityServiceImpl(ISecurityService):
    """セキュリティサービスの実装"""

    def create_access_token(
        self, user_id: int, expires_delta: timedelta | None = None
    ) -> str:
        """アクセストークンを生成"""
        if expires_delta:
            expire = datetime.utcnow() + expires_delta
        else:
            expire = datetime.utcnow() + timedelta(days=7)

        to_encode = {'user_id': user_id, 'exp': expire}
        settings = get_settings()
        algorithm = settings.jwt_algorithm

        if algorithm == 'RS256':
            private_key, _ = _load_rsa_keys()
            encoded_jwt = jwt.encode(to_encode, private_key, algorithm=algorithm)
        else:
            raise ValueError(f'Unsupported JWT algorithm: {algorithm}')

        if isinstance(encoded_jwt, bytes):
            return encoded_jwt.decode('utf-8')
        return encoded_jwt

    def verify_password(self, plain_password: str, hashed_password: str) -> bool:
        """パスワードを検証"""
        return pwd_context.verify(plain_password, hashed_password)


def _load_rsa_keys() -> tuple:
    """RSA鍵ペアを環境変数から読み込み"""
    settings = get_settings()

    if settings.jwt_algorithm != 'RS256':
        return None, None

    jwt_private_key = settings.jwt_private_key
    if not jwt_private_key:
        raise ValueError('JWT_PRIVATE_KEY is required for RS256.')

    jwt_public_key = settings.jwt_public_key
    if not jwt_public_key:
        raise ValueError('JWT_PUBLIC_KEY is required for RS256.')

    private_key = jwt_private_key.replace('\\n', '\n').encode('utf-8')
    public_key = jwt_public_key.replace('\\n', '\n').encode('utf-8')

    return private_key, public_key


def get_current_user_from_cookie(request: Request) -> User:
    """Cookieからアクセストークンを取得してユーザー情報をバリデーション"""
    settings = get_settings()

    # 認証が無効の場合はダミーユーザーを返す
    if not settings.enable_auth:
        return User(id=0)

    token = request.cookies.get('access_token')
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail='Authentication required: No token found in cookies',
            headers={'WWW-Authenticate': 'Bearer'},
        )

    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail='トークンの検証に失敗しました',
        headers={'WWW-Authenticate': 'Bearer'},
    )

    try:
        algorithm = settings.jwt_algorithm

        if algorithm == 'RS256':
            _, public_key = _load_rsa_keys()
            payload = jwt.decode(token, public_key, algorithms=[algorithm])
        else:
            raise ValueError(f'Unsupported JWT algorithm: {algorithm}')

        user_id: int = payload.get('user_id')
        if user_id is None:
            raise credentials_exception
        return User(id=user_id)
    except JWTError as e:
        raise credentials_exception from e
