
from datetime import datetime, timedelta, timezone
import jwt
from argon2 import PasswordHasher
from argon2.exceptions import VerifyMismatchError
from .config import settings

ph=PasswordHasher()

def hash_password(password:str)->str: return ph.hash(password)
def verify_password(password:str, password_hash:str)->bool:
    try: return ph.verify(password_hash,password)
    except Exception: return False

def create_access_token(subject:str, role:str, token_version:int=0):
    now=datetime.now(timezone.utc)
    payload={"sub":subject,"role":role,"type":"access","ver":token_version,"iat":now,"exp":now+timedelta(minutes=settings.access_token_expire_minutes)}
    return jwt.encode(payload,settings.jwt_secret_key,algorithm=settings.jwt_algorithm)

def create_refresh_token(subject:str, token_version:int=0):
    now=datetime.now(timezone.utc)
    payload={"sub":subject,"type":"refresh","ver":token_version,"iat":now,"exp":now+timedelta(days=settings.refresh_token_expire_days)}
    return jwt.encode(payload,settings.jwt_secret_key,algorithm=settings.jwt_algorithm)

def decode_token(token:str):
    return jwt.decode(token,settings.jwt_secret_key,algorithms=[settings.jwt_algorithm])
