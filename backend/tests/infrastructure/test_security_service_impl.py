"""SecurityServiceImplのテスト"""

from datetime import timedelta

import pytest
from jose import jwt

from app.config import get_settings
from app.infrastructure.security.security_service_impl import (
    SecurityServiceImpl,
    _load_rsa_keys,
)


class TestSecurityServiceImpl:
    """SecurityServiceImplのテストクラス"""

    @pytest.fixture
    def security_service(self):
        """SecurityServiceImplのインスタンスを作成"""
        return SecurityServiceImpl()

    def test_create_access_token_default_expiration(self, security_service):
        """デフォルトの有効期限でアクセストークンを生成"""
        user_id = 123
        token = security_service.create_access_token(user_id=user_id)

        # トークンが文字列であることを確認
        assert isinstance(token, str)
        assert len(token) > 0

    def test_create_access_token_custom_expiration(self, security_service):
        """カスタムの有効期限でアクセストークンを生成"""
        user_id = 456
        expires_delta = timedelta(hours=1)
        token = security_service.create_access_token(
            user_id=user_id, expires_delta=expires_delta
        )

        # トークンが文字列であることを確認
        assert isinstance(token, str)
        assert len(token) > 0

    def test_create_access_token_decode(self, security_service):
        """生成したトークンをデコードして内容を確認"""
        user_id = 789

        # トークン生成
        token = security_service.create_access_token(user_id=user_id)

        # 公開鍵を取得してデコード
        settings = get_settings()

        # RS256で署名されたトークンをデコード
        _, public_key = _load_rsa_keys()

        decoded = jwt.decode(token, public_key, algorithms=[settings.jwt_algorithm])

        # デコードされたペイロードを確認
        assert decoded['user_id'] == user_id
        assert 'exp' in decoded

    @pytest.mark.skip(reason='passlib 1.7.4とbcrypt 4.x系の互換性の問題。統合テストで確認')
    def test_verify_password_correct(self, security_service):
        """正しいパスワードの検証"""
        # 事前にbcryptでハッシュ化されたパスワード（'test_password_123'）
        # bcrypt.hashpw(b'test_password_123', bcrypt.gensalt()) で生成
        plain_password = 'test_password_123'
        # この値は bcrypt でハッシュ化された 'test_password_123'
        hashed_password = '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5NU2j6BU7uXz.'

        # 検証
        result = security_service.verify_password(plain_password, hashed_password)
        assert result is True

    @pytest.mark.skip(reason='passlib 1.7.4とbcrypt 4.x系の互換性の問題。統合テストで確認')
    def test_verify_password_incorrect(self, security_service):
        """間違ったパスワードの検証"""
        wrong_password = 'wrong_password_456'
        # 'test_password_123' のハッシュ
        hashed_password = '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5NU2j6BU7uXz.'

        # 検証
        result = security_service.verify_password(wrong_password, hashed_password)
        assert result is False

    @pytest.mark.skip(reason='passlib 1.7.4とbcrypt 4.x系の互換性の問題。統合テストで確認')
    def test_verify_password_empty_string(self, security_service):
        """空文字列のパスワード検証"""
        # 'test_password_123' のハッシュ
        hashed_password = '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5NU2j6BU7uXz.'

        # 検証
        result = security_service.verify_password('', hashed_password)
        assert result is False

    def test_create_access_token_different_user_ids(self, security_service):
        """異なるユーザーIDで異なるトークンが生成される"""
        token1 = security_service.create_access_token(user_id=1)
        token2 = security_service.create_access_token(user_id=2)

        # 異なるトークンが生成される（user_idが異なるため、expも微妙に異なる可能性あり）
        assert token1 != token2

    def test_create_access_token_same_user_id_different_time(self, security_service):
        """同じユーザーIDでも時間が異なれば異なるトークンが生成される"""
        import time

        token1 = security_service.create_access_token(user_id=1)
        time.sleep(1)  # 1秒待機
        token2 = security_service.create_access_token(user_id=1)

        # 異なるトークンが生成される（expが異なるため）
        assert token1 != token2
