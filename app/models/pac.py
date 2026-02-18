from sqlalchemy import String, Integer, Float, ForeignKey, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base


class PAC(Base):
    __tablename__ = "pac"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    codigo_rubro: Mapped[str] = mapped_column(String(50), ForeignKey("rubros_gastos.codigo"))
    mes: Mapped[int] = mapped_column(Integer)
    valor_programado: Mapped[float] = mapped_column(Float, default=0)

    __table_args__ = (UniqueConstraint("codigo_rubro", "mes"),)

    rubro_gasto = relationship("RubroGasto", back_populates="pacs")


class ConsolidacionMensual(Base):
    __tablename__ = "consolidacion_mensual"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    mes: Mapped[int] = mapped_column(Integer)
    anio: Mapped[int] = mapped_column(Integer)
    codigo_rubro: Mapped[str] = mapped_column(String(50), ForeignKey("rubros_gastos.codigo"))
    compromisos_mes: Mapped[float] = mapped_column(Float, default=0)
    pagos_mes: Mapped[float] = mapped_column(Float, default=0)
    fecha_consolidacion: Mapped[str | None] = mapped_column(String(20))

    __table_args__ = (UniqueConstraint("mes", "anio", "codigo_rubro"),)


class ConsolidacionMensualIngresos(Base):
    __tablename__ = "consolidacion_mensual_ingresos"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    mes: Mapped[int] = mapped_column(Integer)
    anio: Mapped[int] = mapped_column(Integer)
    codigo_rubro: Mapped[str] = mapped_column(String(50), ForeignKey("rubros_ingresos.codigo"))
    recaudo_mes: Mapped[float] = mapped_column(Float, default=0)
    fecha_consolidacion: Mapped[str | None] = mapped_column(String(20))

    __table_args__ = (UniqueConstraint("mes", "anio", "codigo_rubro"),)
