from sqlalchemy import ForeignKey, Index, Integer, String
from sqlalchemy.orm import Mapped, mapped_column
from app.database import Base


class CuentaBancaria(Base):
    __tablename__ = "cuentas_bancarias"

    tenant_id: Mapped[str] = mapped_column(String(36), ForeignKey("tenants.id"), nullable=False)
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    banco: Mapped[str] = mapped_column(String(100))
    tipo_cuenta: Mapped[str] = mapped_column(String(50))
    numero_cuenta: Mapped[str] = mapped_column(String(50))
    denominacion: Mapped[str] = mapped_column(String(200), default="")
    estado: Mapped[str] = mapped_column(String(20), default="ACTIVA")

    __table_args__ = (Index("ix_cuentas_bancarias_tenant", "tenant_id"),)
