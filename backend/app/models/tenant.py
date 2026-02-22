import uuid
from sqlalchemy import Boolean, ForeignKey, Index, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Tenant(Base):
    """Representa una institución educativa (cliente SaaS)."""

    __tablename__ = "tenants"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    nombre: Mapped[str] = mapped_column(String(300))
    nit: Mapped[str] = mapped_column(String(25), unique=True)
    codigo_dane: Mapped[str | None] = mapped_column(String(20), default=None)
    vigencia_actual: Mapped[int] = mapped_column(Integer, default=2026)
    estado: Mapped[str] = mapped_column(String(20), default="ACTIVO")  # ACTIVO | SUSPENDIDO
    fecha_creacion: Mapped[str] = mapped_column(String(20))

    usuarios = relationship("User", back_populates="tenant", lazy="select")


class User(Base):
    """Usuario de una institución con rol específico."""

    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    tenant_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("tenants.id"), nullable=False
    )
    email: Mapped[str] = mapped_column(String(200), unique=True)
    nombre: Mapped[str] = mapped_column(String(300))
    cargo: Mapped[str | None] = mapped_column(String(100), default=None)
    rol: Mapped[str] = mapped_column(String(20), default="CONSULTA")  # ADMIN | TESORERO | CONSULTA
    activo: Mapped[bool] = mapped_column(Boolean, default=True)
    fecha_creacion: Mapped[str] = mapped_column(String(20))

    tenant: Mapped[Tenant] = relationship("Tenant", back_populates="usuarios", lazy="selectin")

    __table_args__ = (Index("ix_users_tenant", "tenant_id"),)
