from sqlalchemy import String, Integer, Float, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base


class Recaudo(Base):
    __tablename__ = "recaudo"

    numero: Mapped[int] = mapped_column(Integer, primary_key=True)
    fecha: Mapped[str] = mapped_column(String(10))
    codigo_rubro: Mapped[str] = mapped_column(String(50), ForeignKey("rubros_ingresos.codigo"))
    valor: Mapped[float] = mapped_column(Float)
    concepto: Mapped[str] = mapped_column(String(500), default="")
    no_comprobante: Mapped[str] = mapped_column(String(50), default="")
    estado: Mapped[str] = mapped_column(String(20), default="ACTIVO")
    cuenta_bancaria_id: Mapped[int] = mapped_column(Integer, ForeignKey("cuentas_bancarias.id"), default=0)

    rubro = relationship("RubroIngreso", back_populates="recaudos", lazy="selectin")
    cuenta_bancaria = relationship("CuentaBancaria", lazy="selectin")
