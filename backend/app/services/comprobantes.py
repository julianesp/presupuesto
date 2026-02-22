"""
Servicio de Comprobantes Presupuestales
Genera el objeto de datos completo para imprimir CDP, RP, Obligación, Pago y Recaudo.
"""
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.cdp import CDP
from app.models.rp import RP
from app.models.obligacion import Obligacion
from app.models.pago import Pago
from app.models.recaudo import Recaudo
from app.models.rubros import RubroGasto, RubroIngreso
from app.models.cuentas_bancarias import CuentaBancaria
from app.services import config as config_svc


# ─── Número en letras (Español colombiano) ───────────────────────────────────

_UNIDADES = [
    "", "UN", "DOS", "TRES", "CUATRO", "CINCO", "SEIS", "SIETE", "OCHO", "NUEVE",
    "DIEZ", "ONCE", "DOCE", "TRECE", "CATORCE", "QUINCE", "DIECISÉIS",
    "DIECISIETE", "DIECIOCHO", "DIECINUEVE",
]
_DECENAS = [
    "", "", "VEINTE", "TREINTA", "CUARENTA", "CINCUENTA",
    "SESENTA", "SETENTA", "OCHENTA", "NOVENTA",
]
_CENTENAS = [
    "", "CIEN", "DOSCIENTOS", "TRESCIENTOS", "CUATROCIENTOS", "QUINIENTOS",
    "SEISCIENTOS", "SETECIENTOS", "OCHOCIENTOS", "NOVECIENTOS",
]


def _cientos(n: int) -> str:
    if n == 0:
        return ""
    if n == 100:
        return "CIEN"
    c = n // 100
    resto = n % 100
    partes = []
    if c:
        partes.append(_CENTENAS[c])
    if 0 < resto < 20:
        partes.append(_UNIDADES[resto])
    elif resto >= 20:
        dec = resto // 10
        uni = resto % 10
        if uni == 0:
            partes.append(_DECENAS[dec])
        elif dec == 2:
            partes.append(f"VEINTIÚN" if uni == 1 else f"VEINTI{_UNIDADES[uni]}")
        else:
            partes.append(f"{_DECENAS[dec]} Y {_UNIDADES[uni]}")
    return " ".join(partes)


def numero_en_letras(valor: float) -> str:
    """Convierte un valor monetario a texto en español colombiano."""
    entero = int(valor)
    centavos = round((valor - entero) * 100)

    if entero == 0:
        texto = "CERO"
    elif entero == 1:
        texto = "UN"
    else:
        miles = entero // 1000
        resto = entero % 1000

        partes = []
        if miles > 0:
            if miles == 1:
                partes.append("MIL")
            else:
                partes.append(f"{_cientos(miles)} MIL")
        if resto > 0:
            partes.append(_cientos(resto))
        texto = " ".join(partes)

    if centavos:
        return f"{texto} PESOS CON {centavos:02d}/100 M/CTE"
    return f"{texto} PESOS M/CTE"


# ─── Helper: config de institución ───────────────────────────────────────────

async def _get_institucion(db: AsyncSession, tenant_id: str) -> dict:
    cfg = await config_svc.get_all_config(db, tenant_id)
    return {
        "nombre": cfg.get("institucion", "INSTITUCIÓN EDUCATIVA"),
        "nit": cfg.get("nit_institucion", ""),
        "rector": cfg.get("rector", ""),
        "tesorero": cfg.get("tesorero", ""),
        "vigencia": cfg.get("vigencia", "2026"),
        "codigo_dane": cfg.get("codigo_dane", ""),
    }


async def _get_cuenta_bancaria(db: AsyncSession, tenant_id: str, id_cb: int) -> dict | None:
    if not id_cb:
        return None
    res = await db.execute(
        select(CuentaBancaria).where(
            CuentaBancaria.tenant_id == tenant_id,
            CuentaBancaria.id == id_cb,
        )
    )
    cb = res.scalar_one_or_none()
    if not cb:
        return None
    return {
        "banco": cb.banco,
        "tipo_cuenta": cb.tipo_cuenta,
        "numero_cuenta": cb.numero_cuenta,
        "denominacion": cb.denominacion,
    }


def _tercero_dict(t) -> dict | None:
    if not t:
        return None
    return {
        "nit": t.nit,
        "dv": t.dv if hasattr(t, "dv") else "",
        "nombre": t.nombre,
        "direccion": getattr(t, "direccion", ""),
        "telefono": getattr(t, "telefono", ""),
        "banco": getattr(t, "banco", ""),
        "tipo_cuenta": getattr(t, "tipo_cuenta", ""),
        "no_cuenta": getattr(t, "no_cuenta", ""),
    }


# ─── CDP ─────────────────────────────────────────────────────────────────────

async def comprobante_cdp(db: AsyncSession, tenant_id: str, numero: int) -> dict:
    res = await db.execute(
        select(CDP).where(CDP.tenant_id == tenant_id, CDP.numero == numero)
    )
    cdp = res.scalar_one_or_none()
    if not cdp:
        raise ValueError(f"CDP {numero} no encontrado")

    # Saldo CDP (valor - comprometido en RPs activos)
    res_saldo = await db.execute(
        select(func.coalesce(func.sum(RP.valor), 0)).where(
            RP.tenant_id == tenant_id,
            RP.cdp_numero == numero,
            RP.estado != "ANULADO",
        )
    )
    comprometido = float(res_saldo.scalar() or 0)
    saldo = cdp.valor - comprometido

    rubro = cdp.rubro
    rps_list = [
        {
            "numero": r.numero,
            "fecha": r.fecha,
            "valor": r.valor,
            "tercero": r.tercero.nombre if r.tercero else "",
            "nit": r.nit_tercero,
            "estado": r.estado,
        }
        for r in cdp.rps if r.estado != "ANULADO"
    ]

    return {
        "tipo": "CDP",
        "institucion": await _get_institucion(db, tenant_id),
        "documento": {
            "numero": cdp.numero,
            "fecha": cdp.fecha,
            "codigo_rubro": cdp.codigo_rubro,
            "cuenta_rubro": rubro.cuenta if rubro else "",
            "objeto": cdp.objeto,
            "valor": cdp.valor,
            "valor_letras": numero_en_letras(cdp.valor),
            "estado": cdp.estado,
        },
        "rubro": {
            "codigo": rubro.codigo if rubro else cdp.codigo_rubro,
            "cuenta": rubro.cuenta if rubro else "",
            "apropiacion_inicial": rubro.apropiacion_inicial if rubro else 0,
            "adiciones": rubro.adiciones if rubro else 0,
            "reducciones": rubro.reducciones if rubro else 0,
            "creditos": rubro.creditos if rubro else 0,
            "contracreditos": rubro.contracreditos if rubro else 0,
            "apropiacion_definitiva": rubro.apropiacion_definitiva if rubro else 0,
        },
        "saldo_cdp": saldo,
        "comprometido": comprometido,
        "rps_vinculados": rps_list,
    }


# ─── RP ──────────────────────────────────────────────────────────────────────

async def comprobante_rp(db: AsyncSession, tenant_id: str, numero: int) -> dict:
    res = await db.execute(
        select(RP).where(RP.tenant_id == tenant_id, RP.numero == numero)
    )
    rp = res.scalar_one_or_none()
    if not rp:
        raise ValueError(f"RP {numero} no encontrado")

    res_obl = await db.execute(
        select(func.coalesce(func.sum(Obligacion.valor), 0)).where(
            Obligacion.tenant_id == tenant_id,
            Obligacion.rp_numero == numero,
            Obligacion.estado != "ANULADA",
        )
    )
    obligado = float(res_obl.scalar() or 0)
    saldo_rp = rp.valor - obligado

    rubro = await db.execute(
        select(RubroGasto).where(RubroGasto.tenant_id == tenant_id, RubroGasto.codigo == rp.codigo_rubro)
    )
    rubro = rubro.scalar_one_or_none()
    cdp = rp.cdp

    obls_list = [
        {
            "numero": o.numero,
            "fecha": o.fecha,
            "valor": o.valor,
            "factura": o.factura,
            "estado": o.estado,
        }
        for o in rp.obligaciones if o.estado != "ANULADA"
    ]

    return {
        "tipo": "RP",
        "institucion": await _get_institucion(db, tenant_id),
        "documento": {
            "numero": rp.numero,
            "fecha": rp.fecha,
            "cdp_numero": rp.cdp_numero,
            "codigo_rubro": rp.codigo_rubro,
            "cuenta_rubro": rubro.cuenta if rubro else "",
            "nit_tercero": rp.nit_tercero,
            "nombre_tercero": rp.tercero.nombre if rp.tercero else "",
            "valor": rp.valor,
            "valor_letras": numero_en_letras(rp.valor),
            "objeto": rp.objeto,
            "estado": rp.estado,
        },
        "tercero": _tercero_dict(rp.tercero),
        "cdp": {
            "numero": cdp.numero if cdp else rp.cdp_numero,
            "fecha": cdp.fecha if cdp else "",
            "valor": cdp.valor if cdp else 0,
            "objeto": cdp.objeto if cdp else "",
        },
        "rubro": {
            "codigo": rubro.codigo if rubro else rp.codigo_rubro,
            "cuenta": rubro.cuenta if rubro else "",
            "apropiacion_definitiva": rubro.apropiacion_definitiva if rubro else 0,
        },
        "saldo_rp": saldo_rp,
        "obligado": obligado,
        "obligaciones_vinculadas": obls_list,
    }


# ─── Obligación ──────────────────────────────────────────────────────────────

async def comprobante_obligacion(db: AsyncSession, tenant_id: str, numero: int) -> dict:
    res = await db.execute(
        select(Obligacion).where(Obligacion.tenant_id == tenant_id, Obligacion.numero == numero)
    )
    obl = res.scalar_one_or_none()
    if not obl:
        raise ValueError(f"Obligación {numero} no encontrada")

    res_pag = await db.execute(
        select(func.coalesce(func.sum(Pago.valor), 0)).where(
            Pago.tenant_id == tenant_id,
            Pago.obligacion_numero == numero,
            Pago.estado != "ANULADO",
        )
    )
    pagado = float(res_pag.scalar() or 0)
    saldo_obl = obl.valor - pagado

    rp = obl.rp
    cdp = rp.cdp if rp else None
    rubro = await db.execute(
        select(RubroGasto).where(RubroGasto.tenant_id == tenant_id, RubroGasto.codigo == obl.codigo_rubro)
    )
    rubro = rubro.scalar_one_or_none()

    pagos_list = [
        {
            "numero": p.numero,
            "fecha": p.fecha,
            "valor": p.valor,
            "medio_pago": p.medio_pago,
            "no_comprobante": p.no_comprobante,
            "estado": p.estado,
        }
        for p in obl.pagos if p.estado != "ANULADO"
    ]

    return {
        "tipo": "OBLIGACION",
        "institucion": await _get_institucion(db, tenant_id),
        "documento": {
            "numero": obl.numero,
            "fecha": obl.fecha,
            "rp_numero": obl.rp_numero,
            "cdp_numero": rp.cdp_numero if rp else 0,
            "codigo_rubro": obl.codigo_rubro,
            "cuenta_rubro": rubro.cuenta if rubro else "",
            "nit_tercero": obl.nit_tercero,
            "nombre_tercero": obl.tercero.nombre if obl.tercero else "",
            "valor": obl.valor,
            "valor_letras": numero_en_letras(obl.valor),
            "factura": obl.factura,
            "estado": obl.estado,
        },
        "tercero": _tercero_dict(obl.tercero),
        "rp": {
            "numero": rp.numero if rp else obl.rp_numero,
            "fecha": rp.fecha if rp else "",
            "valor": rp.valor if rp else 0,
            "objeto": rp.objeto if rp else "",
        },
        "cdp": {
            "numero": cdp.numero if cdp else 0,
            "fecha": cdp.fecha if cdp else "",
            "valor": cdp.valor if cdp else 0,
        },
        "rubro": {
            "codigo": rubro.codigo if rubro else obl.codigo_rubro,
            "cuenta": rubro.cuenta if rubro else "",
            "apropiacion_definitiva": rubro.apropiacion_definitiva if rubro else 0,
        },
        "saldo_obligacion": saldo_obl,
        "pagado": pagado,
        "pagos_vinculados": pagos_list,
    }


# ─── Pago (Comprobante de Egreso) ────────────────────────────────────────────

async def comprobante_pago(db: AsyncSession, tenant_id: str, numero: int) -> dict:
    res = await db.execute(
        select(Pago).where(Pago.tenant_id == tenant_id, Pago.numero == numero)
    )
    pago = res.scalar_one_or_none()
    if not pago:
        raise ValueError(f"Pago {numero} no encontrado")

    obl = pago.obligacion
    rp = obl.rp if obl else None
    cdp = rp.cdp if rp else None
    rubro = await db.execute(
        select(RubroGasto).where(RubroGasto.tenant_id == tenant_id, RubroGasto.codigo == pago.codigo_rubro)
    )
    rubro = rubro.scalar_one_or_none()
    cuenta_bancaria = await _get_cuenta_bancaria(db, tenant_id, pago.cuenta_bancaria_id)

    return {
        "tipo": "PAGO",
        "institucion": await _get_institucion(db, tenant_id),
        "documento": {
            "numero": pago.numero,
            "fecha": pago.fecha,
            "obligacion_numero": pago.obligacion_numero,
            "rp_numero": rp.numero if rp else 0,
            "cdp_numero": cdp.numero if cdp else 0,
            "codigo_rubro": pago.codigo_rubro,
            "cuenta_rubro": rubro.cuenta if rubro else "",
            "nit_tercero": pago.nit_tercero,
            "nombre_tercero": pago.tercero.nombre if pago.tercero else "",
            "valor": pago.valor,
            "valor_letras": numero_en_letras(pago.valor),
            "concepto": pago.concepto,
            "medio_pago": pago.medio_pago,
            "no_comprobante": pago.no_comprobante,
            "estado": pago.estado,
        },
        "tercero": _tercero_dict(pago.tercero),
        "obligacion": {
            "numero": obl.numero if obl else pago.obligacion_numero,
            "fecha": obl.fecha if obl else "",
            "valor": obl.valor if obl else 0,
            "factura": obl.factura if obl else "",
        },
        "rp": {
            "numero": rp.numero if rp else 0,
            "fecha": rp.fecha if rp else "",
            "objeto": rp.objeto if rp else "",
        },
        "cdp": {
            "numero": cdp.numero if cdp else 0,
            "fecha": cdp.fecha if cdp else "",
        },
        "rubro": {
            "codigo": rubro.codigo if rubro else pago.codigo_rubro,
            "cuenta": rubro.cuenta if rubro else "",
        },
        "cuenta_bancaria": cuenta_bancaria,
    }


# ─── Recaudo (Recibo de Caja) ─────────────────────────────────────────────────

async def comprobante_recaudo(db: AsyncSession, tenant_id: str, numero: int) -> dict:
    res = await db.execute(
        select(Recaudo).where(Recaudo.tenant_id == tenant_id, Recaudo.numero == numero)
    )
    recaudo = res.scalar_one_or_none()
    if not recaudo:
        raise ValueError(f"Recaudo {numero} no encontrado")

    rubro = recaudo.rubro
    cuenta_bancaria = await _get_cuenta_bancaria(db, tenant_id, recaudo.cuenta_bancaria_id)

    return {
        "tipo": "RECAUDO",
        "institucion": await _get_institucion(db, tenant_id),
        "documento": {
            "numero": recaudo.numero,
            "fecha": recaudo.fecha,
            "codigo_rubro": recaudo.codigo_rubro,
            "cuenta_rubro": rubro.cuenta if rubro else "",
            "valor": recaudo.valor,
            "valor_letras": numero_en_letras(recaudo.valor),
            "concepto": recaudo.concepto,
            "no_comprobante": recaudo.no_comprobante,
            "estado": recaudo.estado,
        },
        "rubro": {
            "codigo": rubro.codigo if rubro else recaudo.codigo_rubro,
            "cuenta": rubro.cuenta if rubro else "",
            "presupuesto_definitivo": rubro.presupuesto_definitivo if rubro else 0,
        },
        "cuenta_bancaria": cuenta_bancaria,
    }
