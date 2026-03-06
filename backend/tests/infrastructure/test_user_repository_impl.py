"""UserRepositoryImplのテスト"""


from app.domain.entities.user import User
from app.infrastructure.db.repositories.user_repository_impl import UserRepositoryImpl


class TestUserRepositoryImpl:
    """UserRepositoryImplのテストクラス"""

    def test_get_by_login_id_existing_user(self, db_session):
        """既存ユーザーをログインIDで取得"""
        # テストデータの作成
        from app.infrastructure.db.models.user_model import UserModel

        user_model = UserModel(
            login_id='test_user',
            password='hashed_password',
            email='test@example.com',
            name='Test User',
        )
        db_session.add(user_model)
        db_session.commit()

        # リポジトリのインスタンス作成
        repository = UserRepositoryImpl(session=db_session)

        # テスト実行
        user = repository.get_by_login_id('test_user')

        # 検証
        assert user is not None
        assert user.login_id == 'test_user'
        assert user.email == 'test@example.com'
        assert user.name == 'Test User'

    def test_get_by_login_id_non_existing_user(self, db_session):
        """存在しないユーザーをログインIDで取得"""
        repository = UserRepositoryImpl(session=db_session)
        user = repository.get_by_login_id('non_existing_user')
        assert user is None

    def test_get_by_id_existing_user(self, db_session):
        """既存ユーザーをIDで取得"""
        from app.infrastructure.db.models.user_model import UserModel

        user_model = UserModel(
            login_id='test_user_by_id',
            password='hashed_password',
            email='test_id@example.com',
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
            login_id='new_user',
            password='hashed_password',
            email='new@example.com',
            name='New User',
        )

        created_user = repository.create(new_user)

        assert created_user.id > 0
        assert created_user.login_id == 'new_user'

    def test_update_user(self, db_session):
        """ユーザーを更新"""
        from app.infrastructure.db.models.user_model import UserModel

        user_model = UserModel(
            login_id='test_user_update',
            password='hashed_password',
            email='test_update@example.com',
            name='Test User Update',
        )
        db_session.add(user_model)
        db_session.commit()

        repository = UserRepositoryImpl(session=db_session)

        # 更新するユーザー
        updated_user = User(
            id=user_model.id,
            login_id='test_user_update',
            password='new_hashed_password',
            email='updated@example.com',
            name='Updated User',
        )

        result = repository.update(updated_user)

        assert result.email == 'updated@example.com'
        assert result.name == 'Updated User'

    def test_delete_user(self, db_session):
        """ユーザーを削除"""
        from app.infrastructure.db.models.user_model import UserModel

        user_model = UserModel(
            login_id='test_user_delete',
            password='hashed_password',
            email='test_delete@example.com',
            name='Test User Delete',
        )
        db_session.add(user_model)
        db_session.commit()
        user_id = user_model.id

        repository = UserRepositoryImpl(session=db_session)
        result = repository.delete(user_id)

        assert result is True

        # 削除されたことを確認
        user = repository.get_by_id(user_id)
        assert user is None
