from contextlib import contextmanager
from pathlib import Path
import tempfile

from ..core.config import settings


class ObjectStorage:
    def _is_s3(self) -> bool:
        return settings.storage_backend.strip().lower() == "s3"

    def _client(self):
        try:
            import boto3
        except ImportError as exc:
            raise RuntimeError("boto3 is required when STORAGE_BACKEND=s3") from exc
        kwargs = {
            "service_name": "s3",
            "region_name": settings.s3_region,
            "use_ssl": settings.s3_use_ssl,
        }
        if settings.s3_endpoint_url.strip():
            kwargs["endpoint_url"] = settings.s3_endpoint_url.strip()
        if settings.s3_access_key_id.strip():
            kwargs["aws_access_key_id"] = settings.s3_access_key_id.strip()
        if settings.s3_secret_access_key.strip():
            kwargs["aws_secret_access_key"] = settings.s3_secret_access_key.strip()
        return boto3.client(**kwargs)

    def save_audio(self, patient_id, assessment_id, filename: str, data: bytes, content_type: str) -> str:
        key = f"audio/{patient_id}/{assessment_id}/{filename}"
        if self._is_s3():
            upload = dict(
                Bucket=settings.s3_bucket,
                Key=key,
                Body=data,
                ContentType=content_type or "application/octet-stream",
            )
            if settings.s3_server_side_encryption.strip():
                upload["ServerSideEncryption"] = settings.s3_server_side_encryption.strip()
            self._client().put_object(**upload)
            return f"s3://{settings.s3_bucket}/{key}"
        path = settings.storage_dir / key
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(data)
        return str(path)

    def delete(self, reference: str | None) -> None:
        if not reference:
            return
        if reference.startswith("s3://"):
            bucket, key = self._split_s3(reference)
            self._client().delete_object(Bucket=bucket, Key=key)
            return
        Path(reference).unlink(missing_ok=True)

    @contextmanager
    def local_path(self, reference: str):
        if not reference.startswith("s3://"):
            yield Path(reference)
            return
        bucket, key = self._split_s3(reference)
        suffix = Path(key).suffix
        with tempfile.NamedTemporaryFile(prefix="neuromind-audio-", suffix=suffix) as handle:
            self._client().download_fileobj(bucket, key, handle)
            handle.flush()
            yield Path(handle.name)

    @staticmethod
    def _split_s3(reference: str) -> tuple[str, str]:
        value = reference.removeprefix("s3://")
        bucket, separator, key = value.partition("/")
        if not separator or not bucket or not key:
            raise ValueError("Invalid S3 object reference")
        return bucket, key


object_storage = ObjectStorage()
