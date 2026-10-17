
from fastapi import APIRouter,Depends
from sqlalchemy.orm import Session
from ...core.database import get_db
from ...core.dependencies import get_current_user
from ...utils.serializers import user_out
from ...schemas.common import UserProfileUpdate
router=APIRouter(prefix="/users",tags=["Users"])
@router.get("/me")
def me(user=Depends(get_current_user),db:Session=Depends(get_db)): return user_out(user)
@router.put("/me")
def update(data:UserProfileUpdate,user=Depends(get_current_user),db:Session=Depends(get_db)):
    values=data.model_dump(exclude_unset=True)
    if "name" in values:
        parts=(values.pop("name") or "").strip().split(maxsplit=1)
        if not parts: return user_out(user)
        user.first_name=parts[0]; user.last_name=parts[1] if len(parts)>1 else ""
    for k in ["first_name","last_name","phone"]:
        if k in values: setattr(user,k,(values[k] or "").strip() or None if k=="phone" else (values[k] or "").strip())
    db.commit(); return user_out(user)
