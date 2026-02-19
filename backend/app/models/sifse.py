from sqlalchemy import String, Integer, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column
from app.database import Base


class CatalogoSifseFuente(Base):
    __tablename__ = "catalogo_sifse_fuentes"

    codigo: Mapped[int] = mapped_column(Integer, primary_key=True)
    descripcion: Mapped[str] = mapped_column(String(300))


class CatalogoSifseItem(Base):
    __tablename__ = "catalogo_sifse_items"

    codigo: Mapped[int] = mapped_column(Integer, primary_key=True)
    descripcion: Mapped[str] = mapped_column(String(300))


class MapeoSifseIngreso(Base):
    __tablename__ = "mapeo_sifse_ingresos"

    codigo_rubro: Mapped[str] = mapped_column(
        String(50), ForeignKey("rubros_ingresos.codigo"), primary_key=True
    )
    sifse_fuente: Mapped[int] = mapped_column(
        Integer, ForeignKey("catalogo_sifse_fuentes.codigo")
    )


class MapeoSifseGasto(Base):
    __tablename__ = "mapeo_sifse_gastos"

    codigo_rubro: Mapped[str] = mapped_column(
        String(50), ForeignKey("rubros_gastos.codigo"), primary_key=True
    )
    sifse_item: Mapped[int] = mapped_column(
        Integer, ForeignKey("catalogo_sifse_items.codigo")
    )
