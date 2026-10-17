from cryptography.fernet import Fernet, InvalidToken

from ..core.config import settings


_PREFIX = "enc:v1:"


def encrypt_text(value: str) -> str:
    if not settings.data_encryption_key.strip():
        return value
    token = Fernet(settings.data_encryption_key.strip().encode()).encrypt(value.encode())
    return _PREFIX + token.decode()


def decrypt_text(value: str) -> str:
    if not value.startswith(_PREFIX):
        return value
    if not settings.data_encryption_key.strip():
        return "[Encrypted message unavailable: server key is not configured]"
    try:
        return Fernet(settings.data_encryption_key.strip().encode()).decrypt(
            value.removeprefix(_PREFIX).encode()
        ).decode()
    except InvalidToken:
        return "[Encrypted message unavailable: decryption failed]"
