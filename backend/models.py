from sqlalchemy import Column, Integer, String, Date
from database import Base


class User(Base):
    __tablename__ = "user"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(50))
    birth = Column(Date)