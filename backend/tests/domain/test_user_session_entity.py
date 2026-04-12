"""UserSessionエンティティのテスト"""

from datetime import UTC, datetime, timedelta

from app.domain.entities.user_session import UserSession

TEST_NOW = datetime(2026, 4, 12, 12, 0, tzinfo=UTC)


class TestUserSessionEntity:
    """UserSessionエンティティのテストクラス"""

    def test_active_session_is_active(self):
        """未失効かつ未期限切れのセッションは有効"""
        session = UserSession(
            id=1,
            user_id=10,
            session_token_hash='hash',
            expires_at=TEST_NOW + timedelta(days=1),
            last_seen_at=TEST_NOW - timedelta(days=2),
        )

        assert session.is_revoked() is False
        assert session.is_expired(TEST_NOW) is False
        assert session.is_active(TEST_NOW) is True

    def test_revoked_session_is_not_active(self):
        """失効済みセッションは無効"""
        session = UserSession(
            id=1,
            user_id=10,
            session_token_hash='hash',
            expires_at=TEST_NOW + timedelta(days=1),
            revoked_at=TEST_NOW,
        )

        assert session.is_revoked() is True
        assert session.is_active(TEST_NOW) is False

    def test_expired_session_is_not_active(self):
        """期限切れセッションは無効"""
        session = UserSession(
            id=1,
            user_id=10,
            session_token_hash='hash',
            expires_at=TEST_NOW - timedelta(seconds=1),
        )

        assert session.is_expired(TEST_NOW) is True
        assert session.is_active(TEST_NOW) is False

    def test_session_with_no_last_seen_should_refresh(self):
        """last_seen_atがないセッションは延長対象"""
        session = UserSession(
            id=1,
            user_id=10,
            session_token_hash='hash',
            expires_at=TEST_NOW + timedelta(days=1),
            last_seen_at=None,
        )

        assert session.should_refresh(TEST_NOW) is True

    def test_session_seen_within_refresh_interval_should_not_refresh(self):
        """24時間未満のアクセスでは延長しない"""
        session = UserSession(
            id=1,
            user_id=10,
            session_token_hash='hash',
            expires_at=TEST_NOW + timedelta(days=1),
            last_seen_at=TEST_NOW - timedelta(hours=23, minutes=59),
        )

        assert session.should_refresh(TEST_NOW) is False

    def test_session_seen_outside_refresh_interval_should_refresh(self):
        """24時間以上前のアクセスでは延長対象"""
        session = UserSession(
            id=1,
            user_id=10,
            session_token_hash='hash',
            expires_at=TEST_NOW + timedelta(days=1),
            last_seen_at=TEST_NOW - timedelta(hours=24),
        )

        assert session.should_refresh(TEST_NOW) is True

    def test_inactive_session_should_not_refresh(self):
        """無効なセッションは延長しない"""
        session = UserSession(
            id=1,
            user_id=10,
            session_token_hash='hash',
            expires_at=TEST_NOW - timedelta(minutes=1),
            last_seen_at=TEST_NOW - timedelta(days=2),
        )

        assert session.should_refresh(TEST_NOW) is False
