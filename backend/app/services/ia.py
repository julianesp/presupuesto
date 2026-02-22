"""
Servicio de IA para el Sistema Presupuestal.
Usa Google Gemini para chat, alertas, resumen ejecutivo y análisis de documentos.
"""
import json
import re
from datetime import date, timedelta

from sqlalchemy import select, func, and_, Integer
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.models.rubros import RubroGasto, RubroIngreso
from app.models.obligacion import Obligacion
from app.models.pago import Pago
from app.services import informes as informes_svc
from app.services import config as config_svc

SYSTEM_PROMPT_BASE = """Eres un asistente experto en presupuesto público colombiano para instituciones educativas.
Conoces el Estatuto Orgánico del Presupuesto (Decreto 111/96), Ley 38/89, y las normas del MEN.
Respondes siempre en español, de forma clara, concisa y precisa.
Solo hablas del presupuesto de la institución cuyos datos se muestran a continuación.
No inventes datos que no estén en el contexto.
Cuando menciones valores monetarios usa el formato colombiano (ej: $1.234.567).
"""


def _fmt_cop(valor: float) -> str:
    """Formatea un valor en pesos colombianos."""
    return f"${valor:,.0f}".replace(",", ".")


def _pct(parte: float, total: float) -> float:
    if total and total > 0:
        return round(float(parte) / float(total) * 100, 1)
    return 0.0


def _get_client():
    """Instancia el cliente Gemini con la API key de settings."""
    from google import genai
    settings = get_settings()
    if not settings.GEMINI_API_KEY:
        raise ValueError("GEMINI_API_KEY no configurada")
    return genai.Client(api_key=settings.GEMINI_API_KEY)


async def _build_contexto_presupuestal(db: AsyncSession, tenant_id: str) -> str:
    """Construye un texto con el estado actual del presupuesto para inyectar en el prompt."""
    cfg = await config_svc.get_all_config(db, tenant_id)
    nombre = cfg.get("institucion") or cfg.get("nombre_institucion") or "Institución Educativa"
    nit = cfg.get("nit_institucion") or cfg.get("nit") or "Sin NIT"
    vigencia = cfg.get("vigencia") or "2026"
    mes_actual = int(cfg.get("mes_actual") or "1")

    resumen = await informes_svc.get_resumen(db, tenant_id)

    # Rubros hoja de gastos con sus % de ejecución
    rubros_res = await db.execute(
        select(RubroGasto).where(
            RubroGasto.tenant_id == tenant_id,
            RubroGasto.es_hoja == 1,
            RubroGasto.apropiacion_definitiva > 0,
        ).order_by(RubroGasto.apropiacion_definitiva.desc())
    )
    rubros_gastos = rubros_res.scalars().all()

    # Para cada rubro calcular comprometido (RP)
    rubros_info = []
    for r in rubros_gastos[:10]:  # top 10 por apropiación
        comp_res = await db.execute(
            select(func.coalesce(func.sum(Pago.valor), 0)).where(
                Pago.tenant_id == tenant_id,
                Pago.codigo_rubro == r.codigo,
                Pago.estado != "ANULADO",
            )
        )
        pagado = float(comp_res.scalar() or 0)
        pct_comp = _pct(pagado, r.apropiacion_definitiva)
        rubros_info.append({
            "codigo": r.codigo,
            "cuenta": r.cuenta[:50],
            "apropiacion": r.apropiacion_definitiva,
            "pagado": pagado,
            "pct": pct_comp,
        })

    # Rubros críticos
    alertas_detectadas = []
    for r in rubros_gastos:
        if r.apropiacion_definitiva > 0:
            comp_res = await db.execute(
                select(func.coalesce(func.sum(Pago.valor), 0)).where(
                    Pago.tenant_id == tenant_id,
                    Pago.codigo_rubro == r.codigo,
                    Pago.estado != "ANULADO",
                )
            )
            pagado = float(comp_res.scalar() or 0)
            pct = _pct(pagado, r.apropiacion_definitiva)
            if pct > 90:
                alertas_detectadas.append(f"- RUBRO CRÍTICO >90%: {r.codigo} {r.cuenta[:30]} ({pct}%)")
            elif pct < 20 and mes_actual >= 7:
                alertas_detectadas.append(f"- RUBRO SIN EJECUTAR <20% en mes {mes_actual}: {r.codigo} {r.cuenta[:30]} ({pct}%)")

    meses_nombres = ["", "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
                     "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"]
    mes_nombre = meses_nombres[mes_actual] if 1 <= mes_actual <= 12 else str(mes_actual)

    lineas = [
        f"INSTITUCIÓN: {nombre} | NIT: {nit} | VIGENCIA: {vigencia} | MES ACTUAL: {mes_actual} ({mes_nombre})",
        "",
        f"GASTOS:",
        f"  Apropiación definitiva: {_fmt_cop(resumen['apropiacion'])}",
        f"  Comprometido (RP): {_fmt_cop(resumen['comprometido'])} ({resumen['pct_comprometido']}%)",
        f"  Obligado: {_fmt_cop(resumen['obligado'])} ({resumen['pct_obligado']}%)",
        f"  Pagado: {_fmt_cop(resumen['pagado'])} ({resumen['pct_pagado']}%)",
        f"  Saldo disponible: {_fmt_cop(resumen['saldo_disponible'])}",
        f"  Cuentas por pagar: {_fmt_cop(resumen['saldo_por_pagar'])}",
        "",
        f"INGRESOS:",
        f"  Presupuesto definitivo: {_fmt_cop(resumen['ppto_ingresos'])}",
        f"  Recaudado: {_fmt_cop(resumen['recaudado'])} ({resumen['pct_recaudado']}%)",
        f"  Saldo por recaudar: {_fmt_cop(resumen['saldo_por_recaudar'])}",
        f"  Equilibrio (Ing - Gasto): {_fmt_cop(resumen['equilibrio'])}",
        "",
    ]

    if alertas_detectadas:
        lineas.append("ALERTAS DETECTADAS:")
        lineas.extend(alertas_detectadas[:5])
        lineas.append("")

    lineas.append("TOP RUBROS DE GASTO (por apropiación):")
    lineas.append(f"{'CÓDIGO':<15} {'% PAGO':>8}  CUENTA")
    for ri in rubros_info:
        lineas.append(f"{ri['codigo']:<15} {ri['pct']:>7.1f}%  {ri['cuenta']}")

    return "\n".join(lineas)


async def chat(
    db: AsyncSession,
    tenant_id: str,
    mensaje: str,
    historial: list[dict],
) -> str:
    """Chat con Gemini inyectando contexto presupuestal actual."""
    from google.genai import types

    client = _get_client()
    settings = get_settings()

    contexto = await _build_contexto_presupuestal(db, tenant_id)
    system_instruction = SYSTEM_PROMPT_BASE + "\n\nCONTEXTO PRESUPUESTAL ACTUAL:\n" + contexto

    # Construir historial de conversación
    contents = []
    for msg in historial:
        rol = "user" if msg.get("rol") == "user" else "model"
        contents.append(
            types.Content(
                role=rol,
                parts=[types.Part(text=msg.get("contenido", ""))],
            )
        )

    # Agregar mensaje actual
    contents.append(
        types.Content(
            role="user",
            parts=[types.Part(text=mensaje)],
        )
    )

    response = client.models.generate_content(
        model=settings.GEMINI_MODEL,
        contents=contents,
        config=types.GenerateContentConfig(
            system_instruction=system_instruction,
            max_output_tokens=1024,
            temperature=0.3,
        ),
    )

    return response.text


async def generar_alertas(db: AsyncSession, tenant_id: str) -> list[dict]:
    """
    Detecta condiciones de alerta en el presupuesto y retorna lista estructurada.
    Lógica Python pura (sin llamada a Gemini para mayor rapidez y precisión).
    """
    cfg = await config_svc.get_all_config(db, tenant_id)
    mes_actual = int(cfg.get("mes_actual") or "1")
    alertas = []

    # 1. Rubros con > 90% comprometido
    rubros_res = await db.execute(
        select(RubroGasto).where(
            RubroGasto.tenant_id == tenant_id,
            RubroGasto.es_hoja == 1,
            RubroGasto.apropiacion_definitiva > 0,
        )
    )
    rubros = rubros_res.scalars().all()

    for r in rubros:
        # Comprometido = suma de RP vigentes
        from app.models.rp import RP
        comp_res = await db.execute(
            select(func.coalesce(func.sum(RP.valor), 0)).where(
                RP.tenant_id == tenant_id,
                RP.codigo_rubro == r.codigo,
                RP.estado != "ANULADO",
            )
        )
        comprometido = float(comp_res.scalar() or 0)
        pct = _pct(comprometido, r.apropiacion_definitiva)
        saldo = r.apropiacion_definitiva - comprometido

        if pct >= 90:
            alertas.append({
                "tipo": "rubro_critico",
                "titulo": f"Rubro con >90% comprometido",
                "descripcion": f"{r.codigo} — {r.cuenta}: {pct:.1f}% comprometido. Saldo disponible: {_fmt_cop(saldo)}",
                "urgencia": "ALTA",
                "valor": saldo,
            })
        elif pct < 20 and mes_actual >= 7:
            alertas.append({
                "tipo": "rubro_sin_ejecutar",
                "titulo": f"Rubro sin ejecutar (mes {mes_actual})",
                "descripcion": f"{r.codigo} — {r.cuenta}: solo {pct:.1f}% comprometido. Puede perderse el presupuesto.",
                "urgencia": "MEDIA",
                "valor": comprometido,
            })

    # 2. Obligaciones sin pagar con más de 30 días
    hoy = date.today()
    limite = (hoy - timedelta(days=30)).isoformat()

    obls_res = await db.execute(
        select(Obligacion).where(
            Obligacion.tenant_id == tenant_id,
            Obligacion.estado != "ANULADA",
            Obligacion.fecha <= limite,
        )
    )
    obls = obls_res.scalars().all()

    cuentas_pendientes = 0.0
    count_vencidas = 0
    for obl in obls:
        pago_res = await db.execute(
            select(func.coalesce(func.sum(Pago.valor), 0)).where(
                Pago.tenant_id == tenant_id,
                Pago.obligacion_numero == obl.numero,
                Pago.estado != "ANULADO",
            )
        )
        total_pagado = float(pago_res.scalar() or 0)
        saldo = obl.valor - total_pagado
        if saldo > 0.01:
            cuentas_pendientes += saldo
            count_vencidas += 1

    if count_vencidas > 0:
        alertas.append({
            "tipo": "cuentas_vencidas",
            "titulo": f"{count_vencidas} obligación(es) vencida(s) >30 días",
            "descripcion": f"Existen {count_vencidas} obligaciones con más de 30 días sin pagar. Total pendiente: {_fmt_cop(cuentas_pendientes)}",
            "urgencia": "ALTA",
            "valor": cuentas_pendientes,
        })

    # 3. Desequilibrio presupuestal (ingresos < gastos)
    ing_res = await db.execute(
        select(func.coalesce(func.sum(RubroIngreso.presupuesto_definitivo), 0))
        .where(RubroIngreso.tenant_id == tenant_id, RubroIngreso.es_hoja == 1)
    )
    total_ing = float(ing_res.scalar() or 0)

    gasto_res = await db.execute(
        select(func.coalesce(func.sum(RubroGasto.apropiacion_definitiva), 0))
        .where(RubroGasto.tenant_id == tenant_id, RubroGasto.es_hoja == 1)
    )
    total_gasto = float(gasto_res.scalar() or 0)

    diferencia = total_ing - total_gasto
    if diferencia < 0:
        alertas.append({
            "tipo": "desequilibrio",
            "titulo": "Desequilibrio presupuestal",
            "descripcion": f"Los gastos ({_fmt_cop(total_gasto)}) superan los ingresos ({_fmt_cop(total_ing)}) en {_fmt_cop(abs(diferencia))}.",
            "urgencia": "ALTA",
            "valor": diferencia,
        })

    # Ordenar: ALTA primero, luego MEDIA, luego BAJA
    orden = {"ALTA": 0, "MEDIA": 1, "BAJA": 2}
    alertas.sort(key=lambda a: orden.get(a["urgencia"], 3))

    return alertas


async def resumen_ejecutivo(db: AsyncSession, tenant_id: str) -> str:
    """Genera un resumen ejecutivo narrativo con Gemini."""
    from google.genai import types

    client = _get_client()
    settings = get_settings()

    contexto = await _build_contexto_presupuestal(db, tenant_id)

    prompt = (
        "Con base en el siguiente contexto presupuestal, redacta un resumen ejecutivo "
        "de máximo 3 párrafos orientado al rector de la institución. "
        "Destaca los logros, riesgos y recomendaciones más importantes. "
        "Usa lenguaje formal pero accesible. No repitas los números crudos, "
        "interprétalos en términos de gestión institucional.\n\n"
        f"CONTEXTO PRESUPUESTAL:\n{contexto}"
    )

    response = client.models.generate_content(
        model=settings.GEMINI_MODEL,
        contents=[types.Content(role="user", parts=[types.Part(text=prompt)])],
        config=types.GenerateContentConfig(
            system_instruction=SYSTEM_PROMPT_BASE,
            max_output_tokens=800,
            temperature=0.4,
        ),
    )

    return response.text


async def analizar_documento(file_bytes: bytes, mime_type: str) -> dict:
    """
    Usa Gemini Vision para extraer datos estructurados de una factura o contrato.
    Retorna dict con: nit, nombre_proveedor, fecha, numero_factura, valor_total, concepto.
    """
    from google.genai import types

    client = _get_client()
    settings = get_settings()

    prompt = (
        "Analiza este documento y extrae la siguiente información en formato JSON exacto "
        "(sin texto adicional, solo el JSON):\n"
        '{"nit": "...", "nombre_proveedor": "...", "fecha": "YYYY-MM-DD", '
        '"numero_factura": "...", "valor_total": 0, "concepto": "..."}\n\n'
        "Si no encuentras algún campo, usa null. "
        "Para el valor_total usa solo el número sin puntos ni comas (ej: 1234567). "
        "Para la fecha usa formato ISO YYYY-MM-DD."
    )

    response = client.models.generate_content(
        model=settings.GEMINI_MODEL,
        contents=[
            types.Content(
                role="user",
                parts=[
                    types.Part.from_bytes(data=file_bytes, mime_type=mime_type),
                    types.Part(text=prompt),
                ],
            )
        ],
        config=types.GenerateContentConfig(
            max_output_tokens=512,
            temperature=0.1,
        ),
    )

    texto = response.text.strip()

    # Extraer JSON de la respuesta (puede venir envuelto en ```json ... ```)
    match = re.search(r"\{.*\}", texto, re.DOTALL)
    if match:
        texto = match.group(0)

    try:
        datos = json.loads(texto)
    except json.JSONDecodeError:
        datos = {
            "nit": None,
            "nombre_proveedor": None,
            "fecha": None,
            "numero_factura": None,
            "valor_total": None,
            "concepto": None,
        }

    # Normalizar valor_total a float
    if datos.get("valor_total") is not None:
        try:
            datos["valor_total"] = float(str(datos["valor_total"]).replace(".", "").replace(",", "."))
        except (ValueError, TypeError):
            datos["valor_total"] = None

    return datos
