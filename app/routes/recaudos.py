from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.services import recaudo as svc
from app.schemas.recaudo import RecaudoCreate, RecaudoUpdate, RecaudoResponse

router = APIRouter(prefix="/api/recaudos", tags=["Recaudos"])


@router.get("", response_model=list[RecaudoResponse])
async def listar(estado: str | None = None, db: AsyncSession = Depends(get_db)):
    recaudos = await svc.get_recaudos(db, estado=estado)
    result = []
    for r in recaudos:
        data = RecaudoResponse(
            numero=r.numero, fecha=r.fecha,
            codigo_rubro=r.codigo_rubro,
            cuenta=r.rubro.cuenta if r.rubro else None,
            valor=r.valor, concepto=r.concepto,
            no_comprobante=r.no_comprobante,
            estado=r.estado,
            cuenta_bancaria_id=r.cuenta_bancaria_id,
        )
        result.append(data)
    return result


@router.get("/{numero}", response_model=RecaudoResponse)
async def obtener(numero: int, db: AsyncSession = Depends(get_db)):
    r = await svc.get_recaudo(db, numero)
    if not r:
        raise HTTPException(404, "Recaudo no encontrado")
    return RecaudoResponse(
        numero=r.numero, fecha=r.fecha,
        codigo_rubro=r.codigo_rubro,
        cuenta=r.rubro.cuenta if r.rubro else None,
        valor=r.valor, concepto=r.concepto,
        no_comprobante=r.no_comprobante,
        estado=r.estado,
        cuenta_bancaria_id=r.cuenta_bancaria_id,
    )


@router.post("", response_model=RecaudoResponse, status_code=201)
async def registrar(data: RecaudoCreate, db: AsyncSession = Depends(get_db)):
    try:
        r = await svc.registrar(db, data)
        return RecaudoResponse(
            numero=r.numero, fecha=r.fecha,
            codigo_rubro=r.codigo_rubro,
            cuenta=r.rubro.cuenta if r.rubro else None,
            valor=r.valor, concepto=r.concepto,
            no_comprobante=r.no_comprobante,
            estado=r.estado,
            cuenta_bancaria_id=r.cuenta_bancaria_id,
        )
    except ValueError as e:
        raise HTTPException(400, str(e))


@router.put("/{numero}", response_model=RecaudoResponse)
async def editar(numero: int, data: RecaudoUpdate, db: AsyncSession = Depends(get_db)):
    try:
        r = await svc.editar(db, numero, data)
        return RecaudoResponse(
            numero=r.numero, fecha=r.fecha,
            codigo_rubro=r.codigo_rubro,
            cuenta=r.rubro.cuenta if r.rubro else None,
            valor=r.valor, concepto=r.concepto,
            no_comprobante=r.no_comprobante,
            estado=r.estado,
            cuenta_bancaria_id=r.cuenta_bancaria_id,
        )
    except ValueError as e:
        raise HTTPException(400, str(e))


@router.put("/{numero}/anular")
async def anular(numero: int, db: AsyncSession = Depends(get_db)):
    try:
        await svc.anular(db, numero)
        return {"message": f"Recaudo {numero} anulado"}
    except ValueError as e:
        raise HTTPException(400, str(e))
