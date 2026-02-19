from sqlalchemy import String, Integer, Float, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base


class RP(Base):
    __tablename__ = "rp"

    numero: Mapped[int] = mapped_column(Integer, primary_key=True)
    fecha: Mapped[str] = mapped_column(String(10))
    cdp_numero: Mapped[int] = mapped_column(Integer, ForeignKey("cdp.numero"))
    codigo_rubro: Mapped[str] = mapped_column(String(50), ForeignKey("rubros_gastos.codigo"))
    nit_tercero: Mapped[str] = mapped_column(String(20), ForeignKey("terceros.nit"))
    valor: Mapped[float] = mapped_column(Float)
    objeto: Mapped[str] = mapped_column(String(1000))
    estado: Mapped[str] = mapped_column(String(20), default="ACTIVO")
    fuente_sifse: Mapped[int] = mapped_column(Integer, default=0)
    item_sifse: Mapped[int] = mapped_column(Integer, default=0)

    cdp = relationship("CDP", back_populates="rps", lazy="selectin")
    tercero = relationship("Tercero", lazy="selectin")
    obligaciones = relationship("Obligacion", back_populates="rp", lazy="selectin")
