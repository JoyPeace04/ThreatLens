import uuid
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Response, Query
from fastapi.responses import HTMLResponse
from sqlalchemy.orm import Session
from backend.app.api.deps import get_db, get_current_user, require_authenticated_user
from backend.app.models.email import Email, RiskReason, GeoHop
from backend.app.schemas.email import EmailDetailResponse, EmailSummaryResponse, GeoHopSchema
from backend.app.schemas.forensic import VerifyChainResponse
from backend.app.services.email_parser import parse_raw_email
from backend.app.services.threat_scanner import threat_scanner
from backend.app.services.origin_tracer import origin_tracer
from backend.app.services.evidence_vault import evidence_vault
from backend.app.services.case_linker import case_linker
from backend.app.services.pdf_exporter import generate_forensic_pdf

router = APIRouter(prefix="/emails", tags=["Emails"])

# The public verification page is immutable metadata; a short browser/CDN TTL
# limits repeated hits on this no-auth endpoint without masking tampering.
_VERIFY_PUBLIC_CACHE_HEADER = {"Cache-Control": "public, max-age=60"}


def _guest_safe_hops(hops):
    """Keep hop sequence shape while removing data that reveals physical origin."""
    safe_hops = []
    for hop in hops:
        item = GeoHopSchema.model_validate(hop).model_dump()
        if not hop.is_internal:
            item.update({
                "ip": "Restricted",
                "country": "Restricted",
                "country_code": None,
                "city": "Restricted",
                "isp": "Restricted",
                "org": None,
                "lat": None,
                "lon": None,
                "reverse_dns": None,
            })
        safe_hops.append(GeoHopSchema.model_validate(item))
    return safe_hops


def _detail_response(email_obj, user):
    response = EmailDetailResponse.model_validate(email_obj)
    if user.get("is_guest"):
        response.origin_ip = "Restricted"
        response.hops = _guest_safe_hops(email_obj.hops)
    return response

@router.post("/upload", response_model=EmailDetailResponse)
async def upload_email(
    file: Optional[UploadFile] = File(None),
    raw_content: Optional[str] = Form(None),
    db: Session = Depends(get_db),
    user: dict = Depends(get_current_user),
):
    """
    Ingests and analyzes an email:
    1. Splits RFC 822 headers from body
    2. Runs Threat Scanner (SPF/DKIM/DMARC, lookalike domain, URL threat, AI classifier)
    3. Runs Origin Tracer (chronological Received: hop resolution & geolocation)
    4. Evaluates Case Linker correlation
    5. Preserves tamper-evident forensic record in Evidence Vault
    """
    if file:
        content_bytes = await file.read()
        parsed = parse_raw_email(content_bytes)
    elif raw_content and raw_content.strip():
        parsed = parse_raw_email(raw_content)
    else:
        raise HTTPException(
            status_code=400,
            detail="Either a .eml file upload or raw RFC 822 email text is required.",
        )

    # 1. Threat Scanning
    scan_result = threat_scanner.scan(parsed)

    # 2. Origin Tracing (Received: headers bottom-to-top)
    hops_data = origin_tracer.trace_hops(parsed.get("received_headers", []))
    origin_ip = None
    for h in hops_data:
        if h.get("is_likely_origin"):
            origin_ip = h.get("ip")
            break

    # 3. Case Linker Check
    matched_case = case_linker.find_matching_case(
        db=db,
        sender_domain=parsed["sender_domain"],
        origin_ip=origin_ip,
    )
    assigned_case_id = matched_case.id if matched_case else None

    # 4. Save to Database
    email_id = str(uuid.uuid4())
    new_email = Email(
        id=email_id,
        raw_hash=parsed["raw_hash"],
        sender=parsed["sender"],
        sender_domain=parsed["sender_domain"],
        display_name=parsed["display_name"],
        reply_to=parsed["reply_to"],
        return_path=parsed["return_path"],
        subject=parsed["subject"],
        received_at=parsed["received_at"],
        risk_score=scan_result["risk_score"],
        risk_level=scan_result["risk_level"],
        origin_ip=origin_ip,
        case_id=assigned_case_id,
        raw_content=parsed["raw_content"],
        body_text=parsed["body_text"],
        auth_results=scan_result["auth_results"],
    )
    db.add(new_email)

    # Save reasons
    for r in scan_result["reasons"]:
        db_reason = RiskReason(
            id=str(uuid.uuid4()),
            email_id=email_id,
            reason=r["reason"],
            weight=r["weight"],
            category=r["category"],
        )
        db.add(db_reason)

    # Save hops
    for h in hops_data:
        db_hop = GeoHop(
            id=str(uuid.uuid4()),
            email_id=email_id,
            hop_order=h["hop_order"],
            ip=h["ip"],
            country=h["country"],
            country_code=h.get("country_code"),
            city=h["city"],
            isp=h["isp"],
            org=h.get("org"),
            lat=h.get("lat"),
            lon=h.get("lon"),
            is_internal=h["is_internal"],
            is_likely_origin=h["is_likely_origin"],
            reverse_dns=h.get("reverse_dns"),
        )
        db.add(db_hop)

    db.commit()

    # 5. Ingest into Evidence Vault (Immutable Hash Chain)
    evidence_vault.append_log_entry(
        db=db,
        action="INGEST",
        data_hash=parsed["raw_hash"],
        email_id=email_id,
        actor=user.get("username", "analyst"),
    )

    db.refresh(new_email)

    resp = _detail_response(new_email, user)
    resp.suggested_case_id = assigned_case_id
    return resp


@router.get("", response_model=List[EmailSummaryResponse])
def list_emails(
    skip: int = 0,
    limit: int = 50,
    risk_level: Optional[str] = None,
    db: Session = Depends(get_db),
    user: dict = Depends(get_current_user),
):
    """Lists scanned emails with optional risk level filter."""
    query = db.query(Email)
    if risk_level:
        query = query.filter(Email.risk_level == risk_level)
    emails = query.order_by(Email.created_at.desc()).offset(skip).limit(limit).all()
    if user.get("is_guest"):
        return [
            {
                **EmailSummaryResponse.model_validate(email).model_dump(),
                "origin_ip": "Restricted",
            }
            for email in emails
        ]
    return emails


@router.get("/{id}", response_model=EmailDetailResponse)
def get_email_details(
    id: str,
    db: Session = Depends(get_db),
    user: dict = Depends(get_current_user),
):
    """Retrieves full analysis result and logs VIEW action in Evidence Vault."""
    email_obj = db.query(Email).filter(Email.id == id).first()
    if not email_obj:
        raise HTTPException(status_code=404, detail="Email record not found.")

    # Record VIEW action in Evidence Vault
    evidence_vault.append_log_entry(
        db=db,
        action="VIEW",
        data_hash=email_obj.raw_hash,
        email_id=email_obj.id,
        actor=user.get("username", "analyst"),
    )

    return _detail_response(email_obj, user)


@router.delete("/{id}")
def delete_email(id: str, db: Session = Depends(get_db)):
    """Deletes an incident email and all its linked hops, reasons, and logs."""
    email_obj = db.query(Email).filter(Email.id == id).first()
    if not email_obj:
        raise HTTPException(status_code=404, detail="Email record not found.")
    db.delete(email_obj)
    db.commit()
    return {"status": "deleted", "id": id}


@router.delete("")
def clear_all_emails(db: Session = Depends(get_db)):
    """Clears all emails from the investigation queue."""
    emails = db.query(Email).all()
    count = len(emails)
    for em in emails:
        db.delete(em)
    db.commit()
    return {"status": "cleared", "count": count}


@router.get("/{id}/trace", response_model=List[GeoHopSchema])
def get_email_trace(id: str, db: Session = Depends(get_db), user: dict = Depends(get_current_user)):
    """Returns geolocation hop data for map rendering."""
    email_obj = db.query(Email).filter(Email.id == id).first()
    if not email_obj:
        raise HTTPException(status_code=404, detail="Email record not found.")
    return _guest_safe_hops(email_obj.hops) if user.get("is_guest") else email_obj.hops


@router.get("/{id}/verify-chain", response_model=VerifyChainResponse)
def verify_email_chain(id: str, db: Session = Depends(get_db), user: dict = Depends(require_authenticated_user)):
    """Verifies SHA-256 hash-chain integrity for this email's forensic log entries."""
    email_obj = db.query(Email).filter(Email.id == id).first()
    if not email_obj:
        raise HTTPException(status_code=404, detail="Email record not found.")

    res = evidence_vault.verify_chain(db=db, email_id=id)
    return res


@router.get("/{id}/export")
def export_email_report(
    id: str,
    mask_pii: bool = Query(False),
    db: Session = Depends(get_db),
    user: dict = Depends(get_current_user),
):
    """Generates and returns tamper-evident forensic PDF report."""
    email_obj = db.query(Email).filter(Email.id == id).first()
    if not email_obj:
        raise HTTPException(status_code=404, detail="Email record not found.")

    # Record EXPORT action in Evidence Vault
    evidence_vault.append_log_entry(
        db=db,
        action="EXPORT",
        data_hash=email_obj.raw_hash,
        email_id=email_obj.id,
        actor=user.get("username", "analyst"),
    )

    # Force mask_pii if not admin
    if user.get("role") != "admin" and not mask_pii:
        # Analyst can choose mask or unmask if allowed, or default to requested
        pass

    pdf_bytes = generate_forensic_pdf(email_obj, mask_pii=mask_pii)

    filename = f"ThreatLens_Forensic_Report_{email_obj.id[:8]}.pdf"
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get("/{id}/ai-briefing")
def get_email_ai_briefing(id: str, db: Session = Depends(get_db)):
    """Generates an executive forensic summary using Google Gemini."""
    from backend.app.services.gemini_service import gemini_service
    email_obj = db.query(Email).filter(Email.id == id).first()
    if not email_obj:
        raise HTTPException(status_code=404, detail="Email record not found.")

    briefing = gemini_service.generate_incident_briefing({
        "sender": email_obj.sender,
        "subject": email_obj.subject,
        "risk_score": email_obj.risk_score,
        "origin_ip": email_obj.origin_ip,
        "reasons": [{"reason": r.reason} for r in email_obj.reasons],
        "body_text": email_obj.body_text,
    })

    return {
        "email_id": email_obj.id,
        "briefing": briefing,
        "engine": "Google Gemini 3.5 Copilot",
    }


@router.get("/{id}/verify-public", response_class=HTMLResponse)
def verify_email_public(id: str, db: Session = Depends(get_db)):
    """
    Public, no-auth endpoint for QR-code verification.
    Returns a minimal, mobile-friendly HTML page confirming hash-chain
    integrity for this email's forensic log entries.  Exposes NO email
    content, headers, subject, sender, or PII — only chain validity
    metadata.
    """
    email_obj = db.query(Email).filter(Email.id == id).first()
    if not email_obj:
        return HTMLResponse(
            _verification_html(
                status_pass=False,
                headline="Record Not Found",
                message="No forensic record exists for this identifier.",
            ),
            status_code=404,
            headers=_VERIFY_PUBLIC_CACHE_HEADER,
        )

    result = evidence_vault.verify_chain(db=db, email_id=id)

    # Extract non-sensitive metadata from the latest log entry
    entries = result.get("entries", [])
    latest_ts = "N/A"
    latest_action = "N/A"
    latest_hash_short = "N/A"
    if entries:
        last = entries[-1]
        latest_ts = last.timestamp.strftime("%Y-%m-%d %H:%M:%S UTC") if last.timestamp else "N/A"
        latest_action = last.action
        latest_hash_short = last.entry_hash[:16] + "…" if last.entry_hash else "N/A"

    if result["is_valid"]:
        return HTMLResponse(
            _verification_html(
                status_pass=True,
                headline="Verified — Hash Chain Intact",
                message=result["message"],
                chain_length=result["chain_length"],
                latest_ts=latest_ts,
                latest_action=latest_action,
                latest_hash_short=latest_hash_short,
            ),
            headers=_VERIFY_PUBLIC_CACHE_HEADER,
        )
    else:
        return HTMLResponse(
            _verification_html(
                status_pass=False,
                headline="Verification Failed — Entry Altered",
                message=result["message"],
                chain_length=result["chain_length"],
                latest_ts=latest_ts,
                latest_action=latest_action,
                latest_hash_short=latest_hash_short,
            ),
            headers=_VERIFY_PUBLIC_CACHE_HEADER,
        )


def _verification_html(
    *,
    status_pass: bool,
    headline: str,
    message: str,
    chain_length: int = 0,
    latest_ts: str = "N/A",
    latest_action: str = "N/A",
    latest_hash_short: str = "N/A",
) -> str:
    """Builds a small, self-contained, mobile-friendly HTML page."""
    accent = "#16a34a" if status_pass else "#dc2626"
    icon = "&#x2705;" if status_pass else "&#x274C;"
    return f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>ThreatLens — Forensic Verification</title>
<style>
  *{{margin:0;padding:0;box-sizing:border-box}}
  body{{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;
        background:#0f172a;color:#e2e8f0;display:flex;align-items:center;
        justify-content:center;min-height:100vh;padding:24px}}
  .card{{background:#1e293b;border-radius:16px;padding:32px 28px;
         max-width:420px;width:100%;box-shadow:0 8px 32px rgba(0,0,0,.4);
         text-align:center}}
  .icon{{font-size:48px;margin-bottom:12px}}
  h1{{font-size:20px;font-weight:700;color:{accent};margin-bottom:8px}}
  .msg{{font-size:13px;color:#94a3b8;line-height:1.5;margin-bottom:20px}}
  .meta{{text-align:left;border-top:1px solid #334155;padding-top:16px}}
  .row{{display:flex;justify-content:space-between;padding:6px 0;
       font-size:12px;border-bottom:1px solid #1e293b}}
  .label{{color:#64748b}}
  .value{{color:#e2e8f0;font-family:'Courier New',monospace;font-weight:600}}
  .brand{{margin-top:20px;font-size:10px;color:#475569;
          letter-spacing:.08em;text-transform:uppercase}}
</style>
</head>
<body>
<div class="card">
  <div class="icon">{icon}</div>
  <h1>{headline}</h1>
  <p class="msg">{message}</p>
  <div class="meta">
    <div class="row"><span class="label">Chain length</span><span class="value">{chain_length}</span></div>
    <div class="row"><span class="label">Latest action</span><span class="value">{latest_action}</span></div>
    <div class="row"><span class="label">Timestamp</span><span class="value">{latest_ts}</span></div>
    <div class="row"><span class="label">Entry hash</span><span class="value">{latest_hash_short}</span></div>
  </div>
  <p class="brand">ThreatLens Forensic Intelligence Platform</p>
</div>
</body>
</html>"""

