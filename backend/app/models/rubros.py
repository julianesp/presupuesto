from sqlalchemy import ForeignKey, Index, Integer, Float, String
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base


class RubroGasto(Base):
    __tablename__ = "rubros_gastos"

    tenant_id: Mapped[str] = mapped_column(String(36), ForeignKey("tenants.id"), nullable=False)
    codigo: Mapped[str] = mapped_column(String(50), primary_key=True)
    cuenta: Mapped[str] = mapped_column(String(500))
    es_hoja: Mapped[int] = mapped_column(Integer, default=0)
    apropiacion_inicial: Mapped[float] = mapped_column(Float, default=0)
    adiciones: Mapped[float] = mapped_column(Float, default=0)
    reducciones: Mapped[float] = mapped_column(Float, default=0)
    creditos: Mapped[float] = mapped_column(Float, default=0)
    contracreditos: Mapped[float] = mapped_column(Float, default=0)
    apropiacion_definitiva: Mapped[float] = mapped_column(Float, default=0)

    cdps = relationship("CDP", back_populates="rubro", lazy="selectin")
    pacs = relationship("PAC", back_populates="rubro_gasto", lazy="selectin")

    __table_args__ = (Index("ix_rubros_gastos_tenant", "tenant_id"),)


class RubroIngreso(Base):
    __tablename__ = "rubros_ingresos"

    tenant_id: Mapped[str] = mapped_column(String(36), ForeignKey("tenants.id"), nullable=False)
    codigo: Mapped[str] = mapped_column(String(50), primary_key=True)
    cuenta: Mapped[str] = mapped_column(String(500))
    es_hoja: Mapped[int] = mapped_column(Integer, default=0)
    presupuesto_inicial: Mapped[float] = mapped_column(Float, default=0)
    adiciones: Mapped[float] = mapped_column(Float, default=0)
    reducciones: Mapped[float] = mapped_column(Float, default=0)
    presupuesto_definitivo: Mapped[float] = mapped_column(Float, default=0)

    recaudos = relationship("Recaudo", back_populates="rubro", lazy="selectin")

    __table_args__ = (Index("ix_rubros_ingresos_tenant", "tenant_id"),)
