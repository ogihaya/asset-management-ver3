"""AuthUsecaseのテスト"""


import pytest
from fastapi import HTTPException

from app.application.schemas.auth_schemas import (
    LoginInputDTO,
    LoginOutputDTO,
    LogoutOutputDTO,
    StatusOutputDTO,
)
from app.application.use_cases.auth_usecase import AuthUsecase


class TestAuthUsecase:
    """AuthUsecaseのテストクラス"""

    def test_login_success(self, mock_security_service):
        """ログイン成功のテスト"""
        mock_security_service.create_access_token.return_value = 'test_token_12345'

        usecase = AuthUsecase(security_service=mock_security_service)
        input_dto = LoginInputDTO(email='admin@example.com', password='pass')

        result = usecase.login(input_dto)

        assert isinstance(result, LoginOutputDTO)
        assert result.user.id == 1
        assert result.user.email == 'admin@example.com'
        assert result.session_token == 'test_token_12345'
        assert result.session_expires_in_days == 30
        assert result.message == 'ログインしました。'

        mock_security_service.create_access_token.assert_called_once()

    def test_login_failure_wrong_email(self, mock_security_service):
        """ログイン失敗のテスト（間違ったメールアドレス）"""
        usecase = AuthUsecase(security_service=mock_security_service)
        input_dto = LoginInputDTO(email='wrong@example.com', password='pass')

        with pytest.raises(HTTPException) as exc_info:
            usecase.login(input_dto)

        assert exc_info.value.status_code == 401
        assert 'メールアドレスまたはパスワードが正しくありません' in exc_info.value.detail
        mock_security_service.create_access_token.assert_not_called()

    def test_login_failure_wrong_password(self, mock_security_service):
        """ログイン失敗のテスト（間違ったパスワード）"""
        usecase = AuthUsecase(security_service=mock_security_service)
        input_dto = LoginInputDTO(email='admin@example.com', password='wrong_password')

        with pytest.raises(HTTPException) as exc_info:
            usecase.login(input_dto)

        assert exc_info.value.status_code == 401
        assert 'メールアドレスまたはパスワードが正しくありません' in exc_info.value.detail
        mock_security_service.create_access_token.assert_not_called()

    def test_logout(self, mock_security_service):
        """ログアウトのテスト"""
        usecase = AuthUsecase(security_service=mock_security_service)

        result = usecase.logout()

        assert isinstance(result, LogoutOutputDTO)
        assert result.logged_out is True
        assert result.message == 'ログアウトしました。'

    def test_get_auth_status_authenticated(self, mock_security_service):
        """認証済み状態取得のテスト"""
        usecase = AuthUsecase(security_service=mock_security_service)

        result = usecase.get_auth_status(user_id=123)

        assert isinstance(result, StatusOutputDTO)
        assert result.authenticated is True
        assert result.user is not None
        assert result.user.id == 123
        assert result.user.email == 'admin@example.com'

    def test_get_auth_status_unauthenticated(self, mock_security_service):
        """未認証状態取得のテスト"""
        usecase = AuthUsecase(security_service=mock_security_service)

        result = usecase.get_auth_status(user_id=0)

        assert isinstance(result, StatusOutputDTO)
        assert result.authenticated is False
        assert result.user is None
