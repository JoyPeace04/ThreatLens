import pytest
from fastapi.testclient import TestClient
from backend.app.main import app


@pytest.fixture
def client():
    with TestClient(app) as c:
        yield c


def _upload_sample_email(client):
    """Helper: uploads a sample phishing .eml and returns the created email id."""
    with open("samples/sample_phishing_spoofed.eml", "rb") as f:
        res = client.post(
            "/api/emails/upload",
            files={"file": ("sample_phishing_spoofed.eml", f, "message/rfc822")},
        )
    assert res.status_code == 200
    return res.json()["id"]


def test_verify_public_existing_email(client):
    """verify-public returns 200 with valid HTML for an email that exists."""
    email_id = _upload_sample_email(client)

    res = client.get(f"/api/emails/{email_id}/verify-public")
    assert res.status_code == 200
    assert "text/html" in res.headers["content-type"]
    body = res.text
    assert "Verified" in body or "Hash Chain Intact" in body
    assert "ThreatLens" in body
    # Must NOT expose email content / PII
    assert "sender" not in body.lower() or "sender" in "no forensic record"
    assert email_id not in body  # full email id should not leak either


def test_verify_public_nonexistent_email(client):
    """verify-public returns 404 with a clean HTML page for a bad id."""
    res = client.get("/api/emails/nonexistent-id-00000/verify-public")
    assert res.status_code == 404
    assert "text/html" in res.headers["content-type"]
    assert "Record Not Found" in res.text
