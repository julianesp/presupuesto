"""
Rutas de Comprobantes Presupuestales
Devuelve el objeto JSON completo para renderizar en el frontend
los comprobantes de CDP, RP, Obligación, Pago y Recaudo.
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.services import comprobantes as svc
from app.auth.dependencies import get_current_user
from app.models.tenant import User

router = APIRouter(prefix="/api/comprobantes", tags=["Comprobantes"])


@router.get("/{tipo}/{numero}")
async def get_comprobante(
    tipo: str,
    numero: int,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Retorna todos los datos necesarios para imprimir un comprobante presupuestal."""
    tipo = tipo.lower()
    try:
        if tipo == "cdp":
            return await svc.comprobante_cdp(db, user.tenant_id, numero)
        elif tipo == "rp":
            return await svc.comprobante_rp(db, user.tenant_id, numero)
        elif tipo == "obligacion":
            return await svc.comprobante_obligacion(db, user.tenant_id, numero)
        elif tipo == "pago":
            return await svc.comprobante_pago(db, user.tenant_id, numero)
        elif tipo == "recaudo":
            return await svc.comprobante_recaudo(db, user.tenant_id, numero)
        else:
            raise HTTPException(
                status_code=400,
                detail=f"Tipo de comprobante '{tipo}' no válido. Use: cdp, rp, obligacion, pago, recaudo",
            )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
