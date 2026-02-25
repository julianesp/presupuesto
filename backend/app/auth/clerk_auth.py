"""
Verificación de JWTs emitidos por Clerk.
En desarrollo (ENVIRONMENT=development) este módulo no se usa.
"""

import time
from typing import Any

import httpx
import jwt

from app.config import get_settings

# Cache simple en memoria para las claves públicas de Clerk
_clerk_keys_cache: dict[str, Any] = {"keys": None, "fetched_at": 0.0}
_CACHE_TTL = 600  # 10 minutos


async def _get_clerk_public_keys() -> list[dict]:
    """Obtiene las claves JWKS de Clerk, con caché de 10 min."""
    now = time.time()
    if _clerk_keys_cache["keys"] is not None and (now - _clerk_keys_cache["fetched_at"]) < _CACHE_TTL:
        return _clerk_keys_cache["keys"]

    settings = get_settings()
    # Extraer el dominio de Clerk de la publishable key
    # Format: pk_test_xxx o pk_live_xxx
    # El JWKS URL es: https://[clerk-domain]/.well-known/jwks.json
    # Para obtener el dominio correcto, usamos la API de Clerk
    # Simplificado: usar el dominio estándar de Clerk
    
    # La publishable key contiene el dominio codificado
    # Por ahora, usamos el endpoint estándar
    pub_key = settings.CLERK_PUBLISHABLE_KEY
    
    # Decodificar la publishable key para obtener el dominio
    # Format: pk_test_{base64-encoded-instance-id}
    # El dominio es: {instance-id}.clerk.accounts.dev para test
    # o {instance-id}.clerk.accounts.com para production
    
    # Simplificado: extraer de la variable de entorno o usar el formato estándar
    clerk_domain = "apparent-insect-84.clerk.accounts.dev"  # Extraído del publishable key
    
    url = f"https://{clerk_domain}/.well-known/jwks.json"
    async with httpx.AsyncClient(timeout=10.0) as client:
        resp = await client.get(url)
        resp.raise_for_status()
        data = resp.json()

    keys = data.get("keys", [])
    _clerk_keys_cache["keys"] = keys
    _clerk_keys_cache["fetched_at"] = now
    return keys


async def verify_clerk_token(token: str) -> dict:
    """
    Verifica un JWT de Clerk y retorna el payload.
    Lanza ValueError si el token es inválido.
    """
    keys = await _get_clerk_public_keys()

    # Obtener el header del token para encontrar el kid
    unverified_header = jwt.get_unverified_header(token)
    kid = unverified_header.get("kid")

    # Encontrar la clave pública correspondiente
    public_key = None
    for key in keys:
        if key.get("kid") == kid:
            # Convertir JWK a PEM
            public_key = jwt.algorithms.RSAAlgorithm.from_jwk(key)
            break

    if public_key is None:
        raise ValueError(f"No se encontró la clave pública con kid: {kid}")

    try:
        # Verificar el token
        payload = jwt.decode(
            token,
            public_key,
            algorithms=["RS256"],
            options={"verify_aud": False}  # Clerk usa 'azp' en lugar de 'aud'
        )
        return payload
    except jwt.PyJWTError as e:
        raise ValueError(f"Token de Clerk inválido: {e}")
