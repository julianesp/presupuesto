from sqlalchemy import String
from sqlalchemy.orm import Mapped, mapped_column
from app.database import Base


class Tercero(Base):
    __tablename__ = "terceros"

    nit: Mapped[str] = mapped_column(String(20), primary_key=True)
    dv: Mapped[str] = mapped_column(String(2), default="")
    nombre: Mapped[str] = mapped_column(String(300))
    direccion: Mapped[str] = mapped_column(String(300), default="")
    telefono: Mapped[str] = mapped_column(String(50), default="")
    email: Mapped[str] = mapped_column(String(200), default="")
    tipo: Mapped[str] = mapped_column(String(20), default="Natural")
    banco: Mapped[str] = mapped_column(String(100), default="")
    tipo_cuenta: Mapped[str] = mapped_column(String(50), default="")
    no_cuenta: Mapped[str] = mapped_column(String(50), default="")
