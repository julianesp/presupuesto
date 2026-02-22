from sqlalchemy import ForeignKey, Index, Integer, Float, String
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base


class Obligacion(Base):
    __tablename__ = "obligacion"

    tenant_id: Mapped[str] = mapped_column(String(36), ForeignKey("tenants.id"), nullable=False)
    numero: Mapped[int] = mapped_column(Integer, primary_key=True)
    fecha: Mapped[str] = mapped_column(String(10))
    rp_numero: Mapped[int] = mapped_column(Integer, ForeignKey("rp.numero"))
    codigo_rubro: Mapped[str] = mapped_column(String(50), ForeignKey("rubros_gastos.codigo"))
    nit_tercero: Mapped[str] = mapped_column(String(20), ForeignKey("terceros.nit"))
    valor: Mapped[float] = mapped_column(Float)
    factura: Mapped[str] = mapped_column(String(200), default="")
    estado: Mapped[str] = mapped_column(String(20), default="ACTIVO")
    fuente_sifse: Mapped[int] = mapped_column(Integer, default=0)
    item_sifse: Mapped[int] = mapped_column(Integer, default=0)

    rp = relationship("RP", back_populates="obligaciones", lazy="selectin")
    tercero = relationship("Tercero", lazy="selectin")
    pagos = relationship("Pago", back_populates="obligacion", lazy="selectin")

    __table_args__ = (Index("ix_obligacion_tenant", "tenant_id"),)
