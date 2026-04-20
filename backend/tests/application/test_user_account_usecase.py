"""UserAccountUsecaseのテスト"""

from datetime import UTC, datetime, timedelta

from app.application.errors import AppError
from app.application.use_cases.user_account_usecase import UserAccountUsecase
from app.infrastructure.db.models.user_model import UserModel
from app.infrastructure.db.models.user_session_model import UserSessionModel
from app.infrastructure.db.repositories.user_repository_impl import UserRepositoryImpl
from app.infrastructure.db.repositories.user_session_repository_impl import (
    UserSessionRepositoryImpl,
)


def create_usecase(db_session) -> UserAccountUsecase:
    return UserAccountUsecase(
        user_repository=UserRepositoryImpl(db_session),
        user_session_repository=UserSessionRepositoryImpl(db_session),
    )


class TestUserAccountUsecase:
    """UserAccountUsecaseのテストクラス"""

    def test_get_me_success(self, db_session):
        """現在ユーザーの最小プロフィールを返す"""
        user_model = UserModel(
            email='me@example.com',
            password_hash='hashed_password',
        )
        db_session.add(user_model)
        db_session.commit()

        usecase = create_usecase(db_session)
        result = usecase.get_me(user_model.id)

        assert result.id == user_model.id
        assert result.email == 'me@example.com'

    def test_get_me_missing_user_raises_unauthorized(self, db_session):
        """存在しないユーザーは UNAUTHORIZED を返す"""
        usecase = create_usecase(db_session)

        try:
            usecase.get_me(9999)
            raise AssertionError('AppError was not raised')
        except AppError as exc:
            assert exc.status_code == 401
            assert exc.code == 'UNAUTHORIZED'

    def test_delete_me_success(self, db_session):
        """アカウント削除で論理削除と全セッション失効を行う"""
        user_model = UserModel(
            email='delete-me@example.com',
            password_hash='hashed_password',
        )
        db_session.add(user_model)
        db_session.commit()

        session_models = [
            UserSessionModel(
                user_id=user_model.id,
                session_token_hash='delete-me-hash-1',
                expires_at=datetime.now(UTC) + timedelta(days=30),
            ),
            UserSessionModel(
                user_id=user_model.id,
                session_token_hash='delete-me-hash-2',
                expires_at=datetime.now(UTC) + timedelta(days=30),
            ),
        ]
        db_session.add_all(session_models)
        db_session.commit()

        usecase = create_usecase(db_session)
        result = usecase.delete_me(user_model.id)

        assert result.deleted is True
        assert result.message == 'アカウントを削除しました。'

        db_session.refresh(user_model)
        assert user_model.deleted_at is not None
        for session_model in session_models:
            db_session.refresh(session_model)
            assert session_model.revoked_at is not None

    def test_delete_me_missing_user_raises_unauthorized(self, db_session):
        """存在しないユーザー削除は UNAUTHORIZED を返す"""
        usecase = create_usecase(db_session)

        try:
            usecase.delete_me(9999)
            raise AssertionError('AppError was not raised')
        except AppError as exc:
            assert exc.status_code == 401
            assert exc.code == 'UNAUTHORIZED'
