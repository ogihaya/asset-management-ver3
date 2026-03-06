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
        # モックの設定
        mock_security_service.create_access_token.return_value = 'test_token_12345'

        # Usecaseのインスタンス作成
        usecase = AuthUsecase(security_service=mock_security_service)

        # 入力DTOの作成
        input_dto = LoginInputDTO(login_id='admin', password='pass')

        # テスト実行
        result = usecase.login(input_dto)

        # 検証
        assert isinstance(result, LoginOutputDTO)
        assert result.access_token == 'test_token_12345'
        assert result.user_id == 1

        # モックが正しく呼ばれたか確認
        mock_security_service.create_access_token.assert_called_once_with(user_id=1)

    def test_login_failure_wrong_login_id(self, mock_security_service):
        """ログイン失敗のテスト（間違ったログインID）"""
        # Usecaseのインスタンス作成
        usecase = AuthUsecase(security_service=mock_security_service)

        # 入力DTOの作成（間違ったログインID）
        input_dto = LoginInputDTO(login_id='wrong_user', password='pass')

        # テスト実行
        with pytest.raises(HTTPException) as exc_info:
            usecase.login(input_dto)

        # 検証
        assert exc_info.value.status_code == 401
        assert 'ログインIDまたはパスワードが正しくありません' in exc_info.value.detail

        # トークンは生成されないはず
        mock_security_service.create_access_token.assert_not_called()

    def test_login_failure_wrong_password(self, mock_security_service):
        """ログイン失敗のテスト（間違ったパスワード）"""
        # Usecaseのインスタンス作成
        usecase = AuthUsecase(security_service=mock_security_service)

        # 入力DTOの作成（間違ったパスワード）
        input_dto = LoginInputDTO(login_id='admin', password='wrong_password')

        # テスト実行
        with pytest.raises(HTTPException) as exc_info:
            usecase.login(input_dto)

        # 検証
        assert exc_info.value.status_code == 401
        assert 'ログインIDまたはパスワードが正しくありません' in exc_info.value.detail

        # トークンは生成されないはず
        mock_security_service.create_access_token.assert_not_called()

    def test_login_failure_both_wrong(self, mock_security_service):
        """ログイン失敗のテスト（両方間違っている）"""
        # Usecaseのインスタンス作成
        usecase = AuthUsecase(security_service=mock_security_service)

        # 入力DTOの作成（両方間違い）
        input_dto = LoginInputDTO(login_id='wrong_user', password='wrong_password')

        # テスト実行
        with pytest.raises(HTTPException) as exc_info:
            usecase.login(input_dto)

        # 検証
        assert exc_info.value.status_code == 401

    def test_logout(self, mock_security_service):
        """ログアウトのテスト"""
        # Usecaseのインスタンス作成
        usecase = AuthUsecase(security_service=mock_security_service)

        # テスト実行
        result = usecase.logout()

        # 検証
        assert isinstance(result, LogoutOutputDTO)
        assert result.message == 'ログアウトしました'

    def test_get_auth_status(self, mock_security_service):
        """認証状態取得のテスト"""
        # Usecaseのインスタンス作成
        usecase = AuthUsecase(security_service=mock_security_service)

        # テスト実行
        user_id = 123
        result = usecase.get_auth_status(user_id=user_id)

        # 検証
        assert isinstance(result, StatusOutputDTO)
        assert result.is_authenticated is True
        assert result.user_id == user_id

    def test_login_with_custom_token(self, mock_security_service):
        """カスタムトークンでのログインテスト"""
        # モックの設定（異なるトークン）
        custom_token = 'custom_jwt_token_xyz'
        mock_security_service.create_access_token.return_value = custom_token

        # Usecaseのインスタンス作成
        usecase = AuthUsecase(security_service=mock_security_service)

        # 入力DTOの作成
        input_dto = LoginInputDTO(login_id='admin', password='pass')

        # テスト実行
        result = usecase.login(input_dto)

        # 検証
        assert result.access_token == custom_token
        assert result.user_id == 1
