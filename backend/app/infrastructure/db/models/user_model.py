"""ユーザーDBモデル"""

from sqlalchemy import Column, Integer, String

from app.infrastructure.db.models.base import Base


class UserModel(Base):
    """ユーザーテーブル"""

    __tablename__ = 'users'

    id = Column(Integer, primary_key=True, autoincrement=True)
    login_id = Column(String(255), unique=True, nullable=False, index=True)
    password = Column(String(255), nullable=False)
    email = Column(String(255), nullable=True)
    name = Column(String(255), nullable=True)
