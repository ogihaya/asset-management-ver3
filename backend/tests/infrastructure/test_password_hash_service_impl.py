"""PasswordHashServiceImplのテスト"""

from app.infrastructure.security.password_hash_service_impl import (
    PasswordHashServiceImpl,
)


class TestPasswordHashServiceImpl:
    """PasswordHashServiceImplのテストクラス"""

    def test_hash_password_returns_hashed_value(self):
        """パスワードをハッシュ化できる"""
        service = PasswordHashServiceImpl()

        hashed_password = service.hash_password('test-password')

        assert isinstance(hashed_password, str)
        assert hashed_password
        assert hashed_password != 'test-password'

    def test_verify_password_returns_true_for_matching_password(self):
        """同じパスワードなら検証に成功する"""
        service = PasswordHashServiceImpl()
        hashed_password = service.hash_password('test-password')

        result = service.verify_password('test-password', hashed_password)

        assert result is True

    def test_verify_password_returns_false_for_non_matching_password(self):
        """異なるパスワードなら検証に失敗する"""
        service = PasswordHashServiceImpl()
        hashed_password = service.hash_password('test-password')

        result = service.verify_password('other-password', hashed_password)

        assert result is False
