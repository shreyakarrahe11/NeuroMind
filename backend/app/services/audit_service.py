from ..models.entities import AuditLog
def audit(db,user,action,entity_type,entity_id=None,details=None,ip_address=None):
    db.add(AuditLog(user_id=user.id if user else None,action=action,entity_type=entity_type,entity_id=str(entity_id) if entity_id else None,ip_address=ip_address,details_json=details or {}))
