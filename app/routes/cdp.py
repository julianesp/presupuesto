from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.services import cdp as svc
from app.schemas.cdp import CDPCreate, CDPUpdate, CDPResponse

router = APIRouter(prefix="/api/cdp", tags=["CDP"])


@router.get("", response_model=list[CDPResponse])
async def listar(estado: str | None = None, db: AsyncSession = Depends(get_db)):
    cdps = await svc.get_cdps(db, estado=estado)
    result = []
    for c in cdps:
        data = CDPResponse(
            numero=c.numero, fecha=c.fecha, codigo_rubro=c.codigo_rubro,
            cuenta=c.rubro.cuenta if c.rubro else None,
            objeto=c.objeto, valor=c.valor, estado=c.estado,
            fuente_sifse=c.fuente_sifse, item_sifse=c.item_sifse,
            saldo=await svc.saldo_cdp(db, c.numero),
        )
        result.append(data)
    return result


@router.get("/{numero}", response_model=CDPResponse)
async def obtener(numero: int, db: AsyncSession = Depends(get_db)):
    c = await svc.get_cdp(db, numero)
    if not c:
        raise HTTPException(404, "CDP no encontrado")
    return CDPResponse(
        numero=c.numero, fecha=c.fecha, codigo_rubro=c.codigo_rubro,
        cuenta=c.rubro.cuenta if c.rubro else None,
        objeto=c.objeto, valor=c.valor, estado=c.estado,
        fuente_sifse=c.fuente_sifse, item_sifse=c.item_sifse,
        saldo=await svc.saldo_cdp(db, c.numero),
    )


@router.post("", response_model=CDPResponse, status_code=201)
async def registrar(data: CDPCreate, db: AsyncSession = Depends(get_db)):
    try:
        cdp = await svc.registrar(db, data.codigo_rubro, data.objeto, data.valor, data.fuente_sifse)
        return CDPResponse(
            numero=cdp.numero, fecha=cdp.fecha, codigo_rubro=cdp.codigo_rubro,
            objeto=cdp.objeto, valor=cdp.valor, estado=cdp.estado,
            fuente_sifse=cdp.fuente_sifse, item_sifse=cdp.item_sifse,
            saldo=cdp.valor,
        )
    except ValueError as e:
        raise HTTPException(400, str(e))


@router.put("/{numero}", response_model=CDPResponse)
async def editar(numero: int, data: CDPUpdate, db: AsyncSession = Depends(get_db)):
    try:
        cdp = await svc.editar(db, numero, data.valor, data.objeto, data.fuente_sifse, data.item_sifse)
        return CDPResponse(
            numero=cdp.numero, fecha=cdp.fecha, codigo_rubro=cdp.codigo_rubro,
            objeto=cdp.objeto, valor=cdp.valor, estado=cdp.estado,
            fuente_sifse=cdp.fuente_sifse, item_sifse=cdp.item_sifse,
            saldo=await svc.saldo_cdp(db, cdp.numero),
        )
    except ValueError as e:
        raise HTTPException(400, str(e))


@router.put("/{numero}/anular")
async def anular(numero: int, db: AsyncSession = Depends(get_db)):
    try:
        await svc.anular(db, numero)
        return {"message": f"CDP {numero} anulado"}
    except ValueError as e:
        raise HTTPException(400, str(e))
