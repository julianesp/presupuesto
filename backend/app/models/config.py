from sqlalchemy import ForeignKey, Index, PrimaryKeyConstraint, String, Text
from sqlalchemy.orm import Mapped, mapped_column
from app.database import Base


class Config(Base):
    __tablename__ = "config"

    tenant_id: Mapped[str] = mapped_column(String(36), ForeignKey("tenants.id"), nullable=False)
    clave: Mapped[str] = mapped_column(String(100))
    valor: Mapped[str | None] = mapped_column(Text, default="")

    __table_args__ = (
        PrimaryKeyConstraint("tenant_id", "clave"),
        Index("ix_config_tenant", "tenant_id"),
    )
