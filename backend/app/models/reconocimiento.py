from sqlalchemy import String, Integer, Float, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base


class Reconocimiento(Base):
    __tablename__ = "reconocimiento"

    numero: Mapped[int] = mapped_column(Integer, primary_key=True)
    fecha: Mapped[str] = mapped_column(String(10))
    codigo_rubro: Mapped[str] = mapped_column(String(50), ForeignKey("rubros_ingresos.codigo"))
    tercero_nit: Mapped[str] = mapped_column(String(20), default="")
    valor: Mapped[float] = mapped_column(Float)
    concepto: Mapped[str] = mapped_column(String(500), default="")
    no_documento: Mapped[str] = mapped_column(String(50), default="")
    estado: Mapped[str] = mapped_column(String(20), default="ACTIVO")

    rubro = relationship("RubroIngreso", lazy="selectin")
    tercero = relationship(
        "Tercero",
        foreign_keys=[tercero_nit],
        primaryjoin="Reconocimiento.tercero_nit == Tercero.nit",
        lazy="selectin",
    )
