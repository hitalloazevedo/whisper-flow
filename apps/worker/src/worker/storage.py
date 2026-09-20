import boto3
from botocore.client import Config

from .config import Config as WorkerConfig


def create_s3_client(config: WorkerConfig):
    return boto3.client(
        "s3",
        endpoint_url=config.s3_endpoint,
        region_name=config.s3_region,
        aws_access_key_id=config.s3_access_key_id,
        aws_secret_access_key=config.s3_secret_access_key,
        config=Config(
            s3={"addressing_style": "path" if config.s3_force_path_style else "auto"}
        ),
    )


def download_to_file(client, bucket: str, key: str, destination_path: str) -> None:
    client.download_file(bucket, key, destination_path)


def upload_text(client, bucket: str, key: str, text: str) -> None:
    client.put_object(
        Bucket=bucket,
        Key=key,
        Body=text.encode("utf-8"),
        ContentType="text/plain; charset=utf-8",
    )
