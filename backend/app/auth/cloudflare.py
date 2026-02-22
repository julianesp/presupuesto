"""
Verificación de JWTs emitidos por Cloudflare Access.
En desarrollo (ENVIRONMENT=development) este módulo no se usa.
"""

import time
from typing import Any

import httpx
from jose import jwt, JWTError

from app.config import get_settings

# Cache simple en memoria para las claves públicas de CF
_cf_keys_cache: dict[str, Any] = {"keys": None, "fetched_at": 0.0}
_CACHE_TTL = 600  # 10 minutos


async def _get_cf_public_keys() -> list[dict]:
    """Obtiene las claves JWKS de Cloudflare Access, con caché de 10 min."""
    now = time.time()
    if _cf_keys_cache["keys"] is not None and (now - _cf_keys_cache["fetched_at"]) < _CACHE_TTL:
        return _cf_keys_cache["keys"]

    settings = get_settings()
    url = f"https://{settings.CF_TEAM_DOMAIN}/cdn-cgi/access/certs"
    async with httpx.AsyncClient(timeout=10.0) as client:
        resp = await client.get(url)
        resp.raise_for_status()
        data = resp.json()

    keys = data.get("keys", [])
    _cf_keys_cache["keys"] = keys
    _cf_keys_cache["fetched_at"] = now
    return keys


async def verify_cf_token(token: str) -> dict:
    """
    Verifica un JWT de Cloudflare Access y retorna el payload.
    Lanza ValueError si el token es inválido.
    """
    settings = get_settings()
    keys = await _get_cf_public_keys()

    # Intentar con cada clave pública hasta que una funcione
    last_error: Exception | None = None
    for key in keys:
        try:
            payload = jwt.decode(
                token,
                key,
                algorithms=["RS256"],
                audience=settings.CF_AUD,
            )
            return payload
        except JWTError as e:
            last_error = e
            continue

    raise ValueError(f"Token CF Access inválido: {last_error}")
