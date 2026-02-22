from sqlalchemy import ForeignKey, Index, Integer, Float, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base


class ModificacionPresupuestal(Base):
    __tablename__ = "modificaciones_presupuestales"

    tenant_id: Mapped[str] = mapped_column(String(36), ForeignKey("tenants.id"), nullable=False)
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    fecha: Mapped[str] = mapped_column(String(10))
    tipo: Mapped[str] = mapped_column(String(30))
    numero_acto: Mapped[str] = mapped_column(String(100), default="")
    descripcion: Mapped[str] = mapped_column(Text, default="")
    valor: Mapped[float] = mapped_column(Float)
    estado: Mapped[str] = mapped_column(String(20), default="ACTIVO")

    detalles = relationship("DetalleModificacion", back_populates="modificacion", lazy="selectin")

    __table_args__ = (Index("ix_modificaciones_tenant", "tenant_id"),)


class DetalleModificacion(Base):
    __tablename__ = "detalle_modificacion"

    tenant_id: Mapped[str] = mapped_column(String(36), ForeignKey("tenants.id"), nullable=False)
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    id_modificacion: Mapped[int] = mapped_column(Integer, ForeignKey("modificaciones_presupuestales.id"))
    codigo_rubro: Mapped[str] = mapped_column(String(50))
    tipo_rubro: Mapped[str] = mapped_column(String(10))
    campo_afectado: Mapped[str] = mapped_column(String(30))
    valor: Mapped[float] = mapped_column(Float)

    modificacion = relationship("ModificacionPresupuestal", back_populates="detalles")

    __table_args__ = (Index("ix_detalle_modificacion_tenant", "tenant_id"),)
