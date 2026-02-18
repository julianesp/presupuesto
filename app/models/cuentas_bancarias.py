from sqlalchemy import String, Integer
from sqlalchemy.orm import Mapped, mapped_column
from app.database import Base


class CuentaBancaria(Base):
    __tablename__ = "cuentas_bancarias"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    banco: Mapped[str] = mapped_column(String(100))
    tipo_cuenta: Mapped[str] = mapped_column(String(50))
    numero_cuenta: Mapped[str] = mapped_column(String(50))
    denominacion: Mapped[str] = mapped_column(String(200), default="")
    estado: Mapped[str] = mapped_column(String(20), default="ACTIVA")
