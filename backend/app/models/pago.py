from sqlalchemy import String, Integer, Float, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base


class Pago(Base):
    __tablename__ = "pago"

    numero: Mapped[int] = mapped_column(Integer, primary_key=True)
    fecha: Mapped[str] = mapped_column(String(10))
    obligacion_numero: Mapped[int] = mapped_column(Integer, ForeignKey("obligacion.numero"))
    codigo_rubro: Mapped[str] = mapped_column(String(50), ForeignKey("rubros_gastos.codigo"))
    nit_tercero: Mapped[str] = mapped_column(String(20), ForeignKey("terceros.nit"))
    valor: Mapped[float] = mapped_column(Float)
    concepto: Mapped[str] = mapped_column(String(500), default="")
    medio_pago: Mapped[str] = mapped_column(String(50), default="Transferencia")
    no_comprobante: Mapped[str] = mapped_column(String(50), default="")
    estado: Mapped[str] = mapped_column(String(20), default="PAGADO")
    fuente_sifse: Mapped[int] = mapped_column(Integer, default=0)
    item_sifse: Mapped[int] = mapped_column(Integer, default=0)
    cuenta_bancaria_id: Mapped[int] = mapped_column(Integer, ForeignKey("cuentas_bancarias.id"), default=0)

    obligacion = relationship("Obligacion", back_populates="pagos", lazy="selectin")
    tercero = relationship("Tercero", lazy="selectin")
    cuenta_bancaria = relationship("CuentaBancaria", lazy="selectin")
