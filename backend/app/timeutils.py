from datetime import UTC, datetime


def utcnow():
    """Database timestamps are stored as naive UTC on all supported dialects."""
    return datetime.now(UTC).replace(tzinfo=None)
