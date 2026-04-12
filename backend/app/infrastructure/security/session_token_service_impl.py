import hashlib
import secrets

from app.application.interfaces.session_token_service import ISessionTokenService


class SessionTokenServiceImpl(ISessionTokenService):
    """セッショントークンサービスの実装"""

    def generate_token(self) -> str:
        """平文セッショントークンを生成する"""
        return secrets.token_urlsafe(48)

    def hash_token(self, raw_token: str) -> str:
        """平文セッショントークンをハッシュ化する"""
        return hashlib.sha256(raw_token.encode('utf-8')).hexdigest()
