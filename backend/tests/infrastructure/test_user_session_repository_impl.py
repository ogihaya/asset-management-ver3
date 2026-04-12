"""UserSessionRepositoryImplのテスト"""

from datetime import UTC, datetime, timedelta

import pytest

from app.domain.entities.user_session import UserSession
from app.infrastructure.db.repositories.user_session_repository_impl import (
    UserSessionRepositoryImpl,
)

TEST_NOW = datetime(2026, 4, 12, 12, 0, 0, tzinfo=UTC)


class TestUserSessionRepositoryImpl:
    """UserSessionRepositoryImplのテストクラス"""

    def test_create_session(self, db_session):
        """ユーザーセッションを作成できる"""
        from app.infrastructure.db.models.user_model import UserModel

        user_model = UserModel(
            email='session-create@example.com',
            password_hash='hashed_password',
        )
        db_session.add(user_model)
        db_session.commit()

        repository = UserSessionRepositoryImpl(session=db_session)
        session_entity = UserSession(
            user_id=user_model.id,
            session_token_hash='hash-create',
            expires_at=TEST_NOW + timedelta(days=30),
            last_seen_at=TEST_NOW,
        )

        created_session = repository.create(session_entity)

        assert created_session.id is not None
        assert created_session.user_id == user_model.id
        assert created_session.session_token_hash == 'hash-create'
        assert created_session.created_at is not None

    def test_find_active_by_token_hash_returns_session(self, db_session):
        """有効なセッションをトークンハッシュで取得できる"""
        from app.infrastructure.db.models.user_model import UserModel
        from app.infrastructure.db.models.user_session_model import UserSessionModel

        user_model = UserModel(
            email='active-session@example.com',
            password_hash='hashed_password',
        )
        db_session.add(user_model)
        db_session.commit()

        session_model = UserSessionModel(
            user_id=user_model.id,
            session_token_hash='active-hash',
            expires_at=TEST_NOW + timedelta(days=1),
        )
        db_session.add(session_model)
        db_session.commit()

        repository = UserSessionRepositoryImpl(session=db_session)
        result = repository.find_active_by_token_hash('active-hash', now=TEST_NOW)

        assert result is not None
        assert result.id == session_model.id
        assert result.user_id == user_model.id

    def test_find_active_by_token_hash_returns_none_for_revoked_session(self, db_session):
        """失効済みセッションは取得されない"""
        from app.infrastructure.db.models.user_model import UserModel
        from app.infrastructure.db.models.user_session_model import UserSessionModel

        user_model = UserModel(
            email='revoked-session@example.com',
            password_hash='hashed_password',
        )
        db_session.add(user_model)
        db_session.commit()

        session_model = UserSessionModel(
            user_id=user_model.id,
            session_token_hash='revoked-hash',
            expires_at=TEST_NOW + timedelta(days=1),
            revoked_at=TEST_NOW,
        )
        db_session.add(session_model)
        db_session.commit()

        repository = UserSessionRepositoryImpl(session=db_session)
        result = repository.find_active_by_token_hash('revoked-hash', now=TEST_NOW)

        assert result is None

    def test_find_active_by_token_hash_returns_none_for_expired_session(self, db_session):
        """期限切れセッションは取得されない"""
        from app.infrastructure.db.models.user_model import UserModel
        from app.infrastructure.db.models.user_session_model import UserSessionModel

        user_model = UserModel(
            email='expired-session@example.com',
            password_hash='hashed_password',
        )
        db_session.add(user_model)
        db_session.commit()

        session_model = UserSessionModel(
            user_id=user_model.id,
            session_token_hash='expired-hash',
            expires_at=TEST_NOW - timedelta(seconds=1),
        )
        db_session.add(session_model)
        db_session.commit()

        repository = UserSessionRepositoryImpl(session=db_session)
        result = repository.find_active_by_token_hash('expired-hash', now=TEST_NOW)

        assert result is None

    def test_find_active_by_token_hash_returns_none_for_deleted_user(self, db_session):
        """論理削除ユーザーのセッションは取得されない"""
        from app.infrastructure.db.models.user_model import UserModel
        from app.infrastructure.db.models.user_session_model import UserSessionModel

        user_model = UserModel(
            email='deleted-user-session@example.com',
            password_hash='hashed_password',
            deleted_at=TEST_NOW,
        )
        db_session.add(user_model)
        db_session.commit()

        session_model = UserSessionModel(
            user_id=user_model.id,
            session_token_hash='deleted-user-hash',
            expires_at=TEST_NOW + timedelta(days=1),
        )
        db_session.add(session_model)
        db_session.commit()

        repository = UserSessionRepositoryImpl(session=db_session)
        result = repository.find_active_by_token_hash(
            'deleted-user-hash', now=TEST_NOW
        )

        assert result is None

    def test_revoke_by_token_hash_revokes_current_session(self, db_session):
        """指定したセッションだけ失効できる"""
        from app.infrastructure.db.models.user_model import UserModel
        from app.infrastructure.db.models.user_session_model import UserSessionModel

        user_model = UserModel(
            email='revoke-current@example.com',
            password_hash='hashed_password',
        )
        db_session.add(user_model)
        db_session.commit()

        session_model = UserSessionModel(
            user_id=user_model.id,
            session_token_hash='revoke-current-hash',
            expires_at=TEST_NOW + timedelta(days=1),
        )
        db_session.add(session_model)
        db_session.commit()

        repository = UserSessionRepositoryImpl(session=db_session)
        revoked = repository.revoke_by_token_hash(
            'revoke-current-hash', revoked_at=TEST_NOW
        )

        assert revoked is True
        db_session.refresh(session_model)
        assert session_model.revoked_at == TEST_NOW

    def test_revoke_all_by_user_id_revokes_only_target_user_sessions(self, db_session):
        """指定ユーザーのセッションだけをまとめて失効できる"""
        from app.infrastructure.db.models.user_model import UserModel
        from app.infrastructure.db.models.user_session_model import UserSessionModel

        target_user = UserModel(
            email='revoke-all-target@example.com',
            password_hash='hashed_password',
        )
        other_user = UserModel(
            email='revoke-all-other@example.com',
            password_hash='hashed_password',
        )
        db_session.add_all([target_user, other_user])
        db_session.commit()

        target_session_1 = UserSessionModel(
            user_id=target_user.id,
            session_token_hash='target-hash-1',
            expires_at=TEST_NOW + timedelta(days=1),
        )
        target_session_2 = UserSessionModel(
            user_id=target_user.id,
            session_token_hash='target-hash-2',
            expires_at=TEST_NOW + timedelta(days=1),
        )
        other_session = UserSessionModel(
            user_id=other_user.id,
            session_token_hash='other-hash-1',
            expires_at=TEST_NOW + timedelta(days=1),
        )
        db_session.add_all([target_session_1, target_session_2, other_session])
        db_session.commit()

        repository = UserSessionRepositoryImpl(session=db_session)
        revoked_count = repository.revoke_all_by_user_id(
            target_user.id, revoked_at=TEST_NOW
        )

        assert revoked_count == 2
        db_session.refresh(target_session_1)
        db_session.refresh(target_session_2)
        db_session.refresh(other_session)
        assert target_session_1.revoked_at == TEST_NOW
        assert target_session_2.revoked_at == TEST_NOW
        assert other_session.revoked_at is None

    def test_touch_updates_last_seen_and_expiration(self, db_session):
        """touchで最終アクセス日時と有効期限を更新できる"""
        from app.infrastructure.db.models.user_model import UserModel
        from app.infrastructure.db.models.user_session_model import UserSessionModel

        user_model = UserModel(
            email='touch-session@example.com',
            password_hash='hashed_password',
        )
        db_session.add(user_model)
        db_session.commit()

        session_model = UserSessionModel(
            user_id=user_model.id,
            session_token_hash='touch-hash',
            expires_at=TEST_NOW + timedelta(days=1),
            last_seen_at=TEST_NOW - timedelta(days=2),
        )
        db_session.add(session_model)
        db_session.commit()

        updated_last_seen_at = TEST_NOW
        updated_expires_at = TEST_NOW + timedelta(days=30)

        repository = UserSessionRepositoryImpl(session=db_session)
        updated_session = repository.touch(
            session_id=session_model.id,
            last_seen_at=updated_last_seen_at,
            expires_at=updated_expires_at,
        )

        assert updated_session.last_seen_at == updated_last_seen_at
        assert updated_session.expires_at == updated_expires_at

    def test_touch_raises_error_for_unknown_session(self, db_session):
        """存在しないセッションのtouchはエラー"""
        repository = UserSessionRepositoryImpl(session=db_session)

        with pytest.raises(ValueError):
            repository.touch(
                session_id=999,
                last_seen_at=TEST_NOW,
                expires_at=TEST_NOW + timedelta(days=30),
            )
