"""AuthUsecaseのテスト"""

from datetime import UTC, datetime, timedelta

import pytest

from app.application.errors import AppError
from app.application.schemas.auth_schemas import (
    AuthSessionContextDTO,
    AuthSessionPolicyDTO,
    LoginInputDTO,
    SignupInputDTO,
)
from app.application.use_cases.auth_usecase import AuthUsecase
from app.infrastructure.db.models.user_model import UserModel
from app.infrastructure.db.models.user_session_model import UserSessionModel
from app.infrastructure.db.repositories.user_repository_impl import UserRepositoryImpl
from app.infrastructure.db.repositories.user_session_repository_impl import (
    UserSessionRepositoryImpl,
)
from app.infrastructure.security.password_hash_service_impl import PasswordHashServiceImpl
from app.infrastructure.security.session_token_service_impl import SessionTokenServiceImpl

TEST_NOW = datetime(2026, 4, 19, 12, 0, tzinfo=UTC)
TEST_POLICY = AuthSessionPolicyDTO(
    cookie_name='asset_management_session',
    session_expiration_days=30,
    session_refresh_interval_hours=24,
    secure_cookie=False,
    enable_auth=True,
)


def create_usecase(db_session) -> AuthUsecase:
    return AuthUsecase(
        user_repository=UserRepositoryImpl(db_session),
        user_session_repository=UserSessionRepositoryImpl(db_session),
        password_hash_service=PasswordHashServiceImpl(),
        session_token_service=SessionTokenServiceImpl(),
        auth_session_policy=TEST_POLICY,
    )


class TestAuthUsecase:
    """AuthUsecaseのテストクラス"""

    def test_signup_success(self, db_session):
        """サインアップ成功のテスト"""
        usecase = create_usecase(db_session)

        result = usecase.signup(
            SignupInputDTO(email='user@example.com', password='Passw0rd')
        )

        assert result.user_id > 0
        assert result.email == 'user@example.com'
        assert result.message == 'ユーザー登録が完了しました。'

    def test_signup_duplicate_email_including_deleted(self, db_session):
        """論理削除済みを含めてメールアドレス重複を拒否する"""
        db_session.add(
            UserModel(
                email='duplicate@example.com',
                password_hash='hashed_password',
                deleted_at=TEST_NOW,
            )
        )
        db_session.commit()

        usecase = create_usecase(db_session)

        with pytest.raises(AppError) as exc_info:
            usecase.signup(
                SignupInputDTO(email='duplicate@example.com', password='Passw0rd')
            )

        assert exc_info.value.status_code == 409
        assert exc_info.value.code == 'DUPLICATE_NAME'

    def test_signup_password_validation_error(self, db_session):
        """パスワード要件違反を拒否する"""
        usecase = create_usecase(db_session)

        with pytest.raises(AppError) as exc_info:
            usecase.signup(SignupInputDTO(email='user@example.com', password='short'))

        assert exc_info.value.status_code == 422
        assert exc_info.value.code == 'VALIDATION_ERROR'
        assert exc_info.value.details['field'] == 'password'

    def test_login_success(self, db_session):
        """ログイン成功のテスト"""
        usecase = create_usecase(db_session)
        signup_result = usecase.signup(
            SignupInputDTO(email='login@example.com', password='Passw0rd')
        )

        result = usecase.login(
            LoginInputDTO(email='login@example.com', password='Passw0rd')
        )

        assert result.user.id == signup_result.user_id
        assert result.user.email == 'login@example.com'
        assert result.session_token
        assert result.session_expires_in_days == 30

    def test_login_failure_wrong_password(self, db_session):
        """ログイン失敗のテスト"""
        usecase = create_usecase(db_session)
        usecase.signup(SignupInputDTO(email='login@example.com', password='Passw0rd'))

        with pytest.raises(AppError) as exc_info:
            usecase.login(
                LoginInputDTO(email='login@example.com', password='wrong_password')
            )

        assert exc_info.value.status_code == 401
        assert exc_info.value.code == 'UNAUTHORIZED'

    def test_login_failure_deleted_user(self, db_session):
        """論理削除済みユーザーはログインできない"""
        password_service = PasswordHashServiceImpl()
        db_session.add(
            UserModel(
                email='deleted@example.com',
                password_hash=password_service.hash_password('Passw0rd'),
                deleted_at=TEST_NOW,
            )
        )
        db_session.commit()

        usecase = create_usecase(db_session)

        with pytest.raises(AppError) as exc_info:
            usecase.login(LoginInputDTO(email='deleted@example.com', password='Passw0rd'))

        assert exc_info.value.status_code == 401
        assert exc_info.value.code == 'UNAUTHORIZED'

    def test_logout_revokes_current_session(self, db_session):
        """ログアウトで current session を失効する"""
        usecase = create_usecase(db_session)
        usecase.signup(SignupInputDTO(email='logout@example.com', password='Passw0rd'))
        login_result = usecase.login(
            LoginInputDTO(email='logout@example.com', password='Passw0rd')
        )
        token_hash = SessionTokenServiceImpl().hash_token(login_result.session_token)

        result = usecase.logout(token_hash)

        assert result.logged_out is True

        session_model = (
            db_session.query(UserSessionModel)
            .filter(UserSessionModel.session_token_hash == token_hash)
            .first()
        )
        assert session_model is not None
        assert session_model.revoked_at is not None

    def test_get_auth_status_unauthenticated(self, db_session):
        """未認証状態取得のテスト"""
        usecase = create_usecase(db_session)

        result = usecase.get_auth_status(AuthSessionContextDTO())

        assert result.authenticated is False
        assert result.user is None

    def test_get_auth_status_expired_raises_session_expired(self, db_session):
        """期限切れセッションは SESSION_EXPIRED を返す"""
        usecase = create_usecase(db_session)

        with pytest.raises(AppError) as exc_info:
            usecase.get_auth_status(AuthSessionContextDTO(expired=True))

        assert exc_info.value.status_code == 401
        assert exc_info.value.code == 'SESSION_EXPIRED'

    def test_get_auth_status_refreshes_old_session(self, db_session):
        """24時間以上経過したセッションは status で延長される"""
        password_service = PasswordHashServiceImpl()
        user_model = UserModel(
            email='status@example.com',
            password_hash=password_service.hash_password('Passw0rd'),
        )
        db_session.add(user_model)
        db_session.commit()

        session_model = UserSessionModel(
            user_id=user_model.id,
            session_token_hash='status-hash',
            expires_at=TEST_NOW + timedelta(hours=1),
            last_seen_at=TEST_NOW - timedelta(days=2),
        )
        db_session.add(session_model)
        db_session.commit()

        usecase = create_usecase(db_session)

        result = usecase.get_auth_status(
            AuthSessionContextDTO(
                authenticated=True,
                user_id=user_model.id,
                session_id=session_model.id,
                session_token_hash='status-hash',
                last_seen_at=session_model.last_seen_at,
                expires_at=session_model.expires_at,
            )
        )

        assert result.authenticated is True
        refreshed_session = (
            db_session.query(UserSessionModel)
            .filter(UserSessionModel.id == session_model.id)
            .first()
        )
        assert refreshed_session is not None
        assert refreshed_session.last_seen_at is not None
        assert refreshed_session.last_seen_at > TEST_NOW - timedelta(days=1)
