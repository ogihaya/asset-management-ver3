from datetime import UTC, datetime

from sqlalchemy.orm import Session

from app.domain.entities.user import User
from app.domain.repositories.user_repository import IUserRepository
from app.infrastructure.db.models.user_model import UserModel


class UserRepositoryImpl(IUserRepository):
    """ユーザーリポジトリの実装"""

    def __init__(self, session: Session):
        """
        コンストラクタ

        Args:
            session: SQLAlchemyのセッション
        """
        self.session = session

    def get_by_email(self, email: str) -> User | None:
        """
        メールアドレスでユーザーを取得

        Args:
            email: メールアドレス

        Returns:
            Optional[User]: ユーザーエンティティ（存在しない場合はNone）
        """
        user_model = (
            self.session.query(UserModel)
            .filter(UserModel.email == email, UserModel.deleted_at.is_(None))
            .first()
        )
        if user_model is None:
            return None
        return self._to_entity(user_model)

    def get_by_id(self, user_id: int) -> User | None:
        """
        IDでユーザーを取得

        Args:
            user_id: ユーザーID

        Returns:
            Optional[User]: ユーザーエンティティ（存在しない場合はNone）
        """
        user_model = (
            self.session.query(UserModel)
            .filter(UserModel.id == user_id, UserModel.deleted_at.is_(None))
            .first()
        )
        if user_model is None:
            return None
        return self._to_entity(user_model)

    def create(self, user: User) -> User:
        """
        ユーザーを作成

        Args:
            user: ユーザーエンティティ

        Returns:
            User: 作成されたユーザーエンティティ
        """
        user_model = UserModel(
            email=user.email,
            password_hash=user.password_hash,
            name=user.name,
        )
        self.session.add(user_model)
        self.session.flush()  # IDを取得するためにflush
        return self._to_entity(user_model)

    def update(self, user: User) -> User:
        """
        ユーザーを更新

        Args:
            user: ユーザーエンティティ

        Returns:
            User: 更新されたユーザーエンティティ
        """
        user_model = (
            self.session.query(UserModel)
            .filter(UserModel.id == user.id, UserModel.deleted_at.is_(None))
            .first()
        )
        if user_model is None:
            raise ValueError(f'User with id {user.id} not found')

        user_model.email = user.email
        user_model.password_hash = user.password_hash
        user_model.name = user.name
        user_model.deleted_at = user.deleted_at

        self.session.flush()
        return self._to_entity(user_model)

    def delete(self, user_id: int) -> bool:
        """
        ユーザーを論理削除

        Args:
            user_id: ユーザーID

        Returns:
            bool: 削除成功の場合True
        """
        user_model = (
            self.session.query(UserModel)
            .filter(UserModel.id == user_id, UserModel.deleted_at.is_(None))
            .first()
        )
        if user_model is None:
            return False

        user_model.deleted_at = datetime.now(UTC)
        self.session.flush()
        return True

    def _to_entity(self, user_model: UserModel) -> User:
        """
        DBモデルをエンティティに変換

        Args:
            user_model: ユーザーDBモデル

        Returns:
            User: ユーザーエンティティ
        """
        return User(
            id=user_model.id,
            email=user_model.email,
            password_hash=user_model.password_hash,
            name=user_model.name,
            deleted_at=user_model.deleted_at,
        )
