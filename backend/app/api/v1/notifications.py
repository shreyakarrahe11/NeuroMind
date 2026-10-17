from uuid import UUID

from fastapi import APIRouter,Depends,HTTPException,Query
from sqlalchemy.orm import Session
from sqlalchemy import select,update
from ...core.database import get_db
from ...core.dependencies import get_current_user
from ...models.entities import Notification
from ...utils.serializers import notification_out
router=APIRouter(prefix="/notifications",tags=["Notifications"])
@router.get("")
def list_notifications(limit:int=Query(100,ge=1,le=500),offset:int=Query(0,ge=0),user=Depends(get_current_user),db:Session=Depends(get_db)): return [notification_out(n) for n in db.scalars(select(Notification).where(Notification.recipient_user_id==user.id).order_by(Notification.created_at.desc()).offset(offset).limit(limit)).all()]
@router.put("/{notification_id}/read")
def read(notification_id:str,user=Depends(get_current_user),db:Session=Depends(get_db)):
    try: identifier=UUID(notification_id)
    except ValueError: raise HTTPException(400,"Invalid notification id")
    n=db.get(Notification,identifier)
    if not n or n.recipient_user_id!=user.id: return {"success":False}
    n.is_read=True; db.commit(); return {"success":True}
@router.put("/read-all")
def read_all(user=Depends(get_current_user),db:Session=Depends(get_db)):
    db.execute(update(Notification).where(Notification.recipient_user_id==user.id,Notification.is_read.is_(False)).values(is_read=True))
    db.commit(); return {"success":True}
