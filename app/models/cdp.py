from sqlalchemy import String, Integer, Float, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base


class CDP(Base):
    __tablename__ = "cdp"

    numero: Mapped[int] = mapped_column(Integer, primary_key=True)
    fecha: Mapped[str] = mapped_column(String(10))
    codigo_rubro: Mapped[str] = mapped_column(String(50), ForeignKey("rubros_gastos.codigo"))
    objeto: Mapped[str] = mapped_column(String(1000))
    valor: Mapped[float] = mapped_column(Float)
    estado: Mapped[str] = mapped_column(String(20), default="ACTIVO")
    fuente_sifse: Mapped[int] = mapped_column(Integer, default=0)
    item_sifse: Mapped[int] = mapped_column(Integer, default=0)

    rubro = relationship("RubroGasto", back_populates="cdps", lazy="selectin")
    rps = relationship("RP", back_populates="cdp", lazy="selectin")
