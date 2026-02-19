from sqlalchemy import String, Text
from sqlalchemy.orm import Mapped, mapped_column
from app.database import Base


class Config(Base):
    __tablename__ = "config"

    clave: Mapped[str] = mapped_column(String(100), primary_key=True)
    valor: Mapped[str | None] = mapped_column(Text, default="")
