"""UserRepositoryImplのテスト"""

from app.domain.entities.user import User
from app.infrastructure.db.repositories.user_repository_impl import UserRepositoryImpl

TEST_PASSWORD_HASH = 'test_hash_value'
UPDATED_PASSWORD_HASH = 'updated_hash_value'


class TestUserRepositoryImpl:
    """UserRepositoryImplのテストクラス"""

    def test_get_by_email_existing_user(self, db_session):
        """既存ユーザーをメールアドレスで取得"""
        # テストデータの作成
        from app.infrastructure.db.models.user_model import UserModel

        user_model = UserModel(
            email='test@example.com',
            password_hash=TEST_PASSWORD_HASH,
            name='Test User',
        )
        db_session.add(user_model)
        db_session.commit()

        # リポジトリのインスタンス作成
        repository = UserRepositoryImpl(session=db_session)

        # テスト実行
        user = repository.get_by_email('test@example.com')

        # 検証
        assert user is not None
        assert user.email == 'test@example.com'
        assert user.password_hash == TEST_PASSWORD_HASH
        assert user.name == 'Test User'

    def test_get_by_email_non_existing_user(self, db_session):
        """存在しないユーザーをメールアドレスで取得"""
        repository = UserRepositoryImpl(session=db_session)
        user = repository.get_by_email('non_existing@example.com')
        assert user is None

    def test_get_by_id_existing_user(self, db_session):
        """既存ユーザーをIDで取得"""
        from app.infrastructure.db.models.user_model import UserModel

        user_model = UserModel(
            email='test_id@example.com',
            password_hash=TEST_PASSWORD_HASH,
            name='Test User By ID',
        )
        db_session.add(user_model)
        db_session.commit()

        repository = UserRepositoryImpl(session=db_session)
        user = repository.get_by_id(user_model.id)

        assert user is not None
        assert user.id == user_model.id

    def test_create_user(self, db_session):
        """ユーザーを作成"""
        repository = UserRepositoryImpl(session=db_session)

        new_user = User(
            id=0,  # IDは自動採番
            email='new@example.com',
            password_hash=TEST_PASSWORD_HASH,
            name='New User',
        )

        created_user = repository.create(new_user)

        assert created_user.id > 0
        assert created_user.email == 'new@example.com'
        assert created_user.password_hash == TEST_PASSWORD_HASH

    def test_update_user(self, db_session):
        """ユーザーを更新"""
        from app.infrastructure.db.models.user_model import UserModel

        user_model = UserModel(
            email='test_update@example.com',
            password_hash=TEST_PASSWORD_HASH,
            name='Test User Update',
        )
        db_session.add(user_model)
        db_session.commit()

        repository = UserRepositoryImpl(session=db_session)

        # 更新するユーザー
        updated_user = User(
            id=user_model.id,
            email='updated@example.com',
            password_hash=UPDATED_PASSWORD_HASH,
            name='Updated User',
        )

        result = repository.update(updated_user)

        assert result.email == 'updated@example.com'
        assert result.password_hash == UPDATED_PASSWORD_HASH
        assert result.name == 'Updated User'

    def test_delete_user(self, db_session):
        """ユーザーを論理削除"""
        from app.infrastructure.db.models.user_model import UserModel

        user_model = UserModel(
            email='test_delete@example.com',
            password_hash=TEST_PASSWORD_HASH,
            name='Test User Delete',
        )
        db_session.add(user_model)
        db_session.commit()
        user_id = user_model.id

        repository = UserRepositoryImpl(session=db_session)
        result = repository.delete(user_id)

        assert result is True

        # 論理削除され、通常取得では返らないことを確認
        user = repository.get_by_id(user_id)
        assert user is None

        deleted_user_model = (
            db_session.query(UserModel).filter(UserModel.id == user_id).first()
        )
        assert deleted_user_model is not None
        assert deleted_user_model.deleted_at is not None
