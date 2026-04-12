from passlib.context import CryptContext

from app.application.interfaces.password_hash_service import IPasswordHashService

pwd_context = CryptContext(schemes=['bcrypt'], deprecated='auto')


class PasswordHashServiceImpl(IPasswordHashService):
    """パスワードハッシュサービスの実装"""

    def hash_password(self, plain_password: str) -> str:
        """平文パスワードをハッシュ化する"""
        return pwd_context.hash(plain_password)

    def verify_password(self, plain_password: str, password_hash: str) -> bool:
        """平文パスワードとハッシュ値を検証する"""
        return pwd_context.verify(plain_password, password_hash)
