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

    def get_by_login_id(self, login_id: str) -> User | None:
        """
        ログインIDでユーザーを取得

        Args:
            login_id: ログインID

        Returns:
            Optional[User]: ユーザーエンティティ（存在しない場合はNone）
        """
        user_model = (
            self.session.query(UserModel).filter(UserModel.login_id == login_id).first()
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
        user_model = self.session.query(UserModel).filter(UserModel.id == user_id).first()
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
            login_id=user.login_id,
            password=user.password,
            email=user.email,
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
        user_model = self.session.query(UserModel).filter(UserModel.id == user.id).first()
        if user_model is None:
            raise ValueError(f'User with id {user.id} not found')

        user_model.login_id = user.login_id
        user_model.password = user.password
        user_model.email = user.email
        user_model.name = user.name

        self.session.flush()
        return self._to_entity(user_model)

    def delete(self, user_id: int) -> bool:
        """
        ユーザーを削除

        Args:
            user_id: ユーザーID

        Returns:
            bool: 削除成功の場合True
        """
        user_model = self.session.query(UserModel).filter(UserModel.id == user_id).first()
        if user_model is None:
            return False

        self.session.delete(user_model)
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
            login_id=user_model.login_id,
            password=user_model.password,
            email=user_model.email,
            name=user_model.name,
        )
