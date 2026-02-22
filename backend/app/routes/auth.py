from fastapi import APIRouter, Depends

from app.auth.dependencies import get_current_user
from app.schemas.auth import UserResponse

router = APIRouter(prefix="/api/auth", tags=["Auth"])


@router.get("/me", response_model=UserResponse)
async def me(user=Depends(get_current_user)):
    """Retorna la información del usuario autenticado y su institución."""
    return user
