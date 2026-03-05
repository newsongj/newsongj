from sqlalchemy import Column, Integer, String
from database import Base


class User(Base):
    __tablename__ = "user"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(50))
    email = Column(String(200))      # 신규 추가