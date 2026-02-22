from sqlalchemy import ForeignKey, Index, Integer, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column
from app.database import Base


class Concepto(Base):
    __tablename__ = "conceptos"

    tenant_id: Mapped[str] = mapped_column(String(36), ForeignKey("tenants.id"), nullable=False)
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    codigo_rubro: Mapped[str] = mapped_column(String(50))
    concepto: Mapped[str] = mapped_column(String(500))
    veces_usado: Mapped[int] = mapped_column(Integer, default=1)
    ultimo_uso: Mapped[str | None] = mapped_column(String(20))

    __table_args__ = (
        UniqueConstraint("tenant_id", "codigo_rubro", "concepto"),
        Index("ix_conceptos_tenant", "tenant_id"),
    )
