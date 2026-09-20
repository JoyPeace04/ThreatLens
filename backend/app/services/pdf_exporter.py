import io
import logging
import re
from datetime import datetime, timezone
from typing import Optional, List
from xml.sax.saxutils import escape
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable, Image
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from backend.app.models.email import Email
from backend.app.config import settings

logger = logging.getLogger("ThreatLens.PDFExporter")


def pdf_text(value: object) -> str:
    """Escape untrusted values before passing them to ReportLab's XML parser."""
    return escape("" if value is None else str(value))

def mask_pii_string(text: str) -> str:
    """Masks email addresses, credit cards, and phone numbers in text for non-admin exports."""
    if not text:
        return ""
    # Mask emails: user@domain.com -> u***@domain.com
    text = re.sub(
        r"\b([a-zA-Z0-9_.+-])[a-zA-Z0-9_.+-]*@([a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+)\b",
        r"\1***@\2",
        text,
    )
    # Mask 16-digit card numbers
    text = re.sub(r"\b(?:\d{4}[ -]?){3}(\d{4})\b", r"****-****-****-\1", text)
    # Mask 10-digit phone numbers
    text = re.sub(r"\b(?:\+?\d{1,3}[- ]?)?\(?\d{3}\)?[- ]?\d{3}[- ]?(\d{4})\b", r"***-***-\1", text)
    return text


def generate_forensic_pdf(email: Email, mask_pii: bool = False) -> bytes:
    """
    Generates a formal, tamper-evident forensic intelligence PDF report
    containing cryptographic checksums, risk breakdown, hop table, and audit trail.
    """
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=letter,
        rightMargin=40,
        leftMargin=40,
        topMargin=40,
        bottomMargin=40,
    )

    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        "TitleStyle",
        parent=styles["Heading1"],
        fontName="Helvetica-Bold",
        fontSize=20,
        textColor=colors.HexColor("#0f172a"),
        spaceAfter=4,
    )
    subtitle_style = ParagraphStyle(
        "SubtitleStyle",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=10,
        textColor=colors.HexColor("#64748b"),
        spaceAfter=14,
    )
    section_heading = ParagraphStyle(
        "SectionHeading",
        parent=styles["Heading2"],
        fontName="Helvetica-Bold",
        fontSize=12,
        textColor=colors.HexColor("#1e293b"),
        spaceBefore=10,
        spaceAfter=6,
    )
    body_style = ParagraphStyle(
        "BodyStyle",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=9,
        textColor=colors.HexColor("#334155"),
        leading=12,
    )
    code_style = ParagraphStyle(
        "CodeStyle",
        parent=styles["Normal"],
        fontName="Courier",
        fontSize=8,
        textColor=colors.HexColor("#0f172a"),
        leading=10,
    )

    elements = []

    # 1. Header Banner
    elements.append(Paragraph("THREATLENS FORENSIC INCIDENT REPORT", title_style))
    elements.append(
        Paragraph(
            f"Generated: {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M:%S UTC')} | Platform: AICTE Cyber Cell ThreatLens v2.0",
            subtitle_style,
        )
    )
    elements.append(HRFlowable(width="100%", thickness=1.5, color=colors.HexColor("#3b82f6"), spaceAfter=12))

    # 2. Executive Incident Summary
    risk_color = colors.HexColor("#dc2626") if email.risk_level in ("Critical", "High") else colors.HexColor("#16a34a")
    sender_text = mask_pii_string(email.sender) if mask_pii else email.sender
    subject_text = mask_pii_string(email.subject or "") if mask_pii else (email.subject or "")

    meta_data = [
        [Paragraph("<b>Incident ID:</b>", body_style), Paragraph(pdf_text(email.id), code_style)],
        [Paragraph("<b>Raw SHA-256 Digest:</b>", body_style), Paragraph(pdf_text(email.raw_hash), code_style)],
        [Paragraph("<b>Sender:</b>", body_style), Paragraph(pdf_text(sender_text), body_style)],
        [Paragraph("<b>Subject:</b>", body_style), Paragraph(pdf_text(subject_text), body_style)],
        [Paragraph("<b>Origin IP:</b>", body_style), Paragraph(pdf_text(email.origin_ip or "N/A"), body_style)],
        [Paragraph("<b>Risk Level:</b>", body_style), Paragraph(f"<b>{pdf_text(email.risk_level.upper())} ({pdf_text(email.risk_score)}/100)</b>", body_style)],
    ]
    meta_table = Table(meta_data, colWidths=[130, 400])
    meta_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#f8fafc")),
        ("PADDING", (0, 0), (-1, -1), 4),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#e2e8f0")),
    ]))
    elements.append(meta_table)
    elements.append(Spacer(1, 12))

    # 3. Threat Assessment & Reasons
    elements.append(Paragraph("Threat Assessment & Risk Indicators", section_heading))
    reason_rows = [["Category", "Indicator / Finding", "Weight"]]
    for r in email.reasons:
        r_text = mask_pii_string(r.reason) if mask_pii else r.reason
        reason_rows.append([
            Paragraph(pdf_text(r.category), body_style),
            Paragraph(pdf_text(r_text), body_style),
            Paragraph(f"+{r.weight}", body_style),
        ])
    if len(reason_rows) == 1:
        reason_rows.append([Paragraph("GENERAL", body_style), Paragraph("No high-risk indicators detected.", body_style), Paragraph("+0", body_style)])

    reason_table = Table(reason_rows, colWidths=[100, 370, 60])
    reason_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#e2e8f0")),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.HexColor("#0f172a")),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#cbd5e1")),
        ("PADDING", (0, 0), (-1, -1), 5),
    ]))
    elements.append(reason_table)
    elements.append(Spacer(1, 12))

    # 4. Origin Hop Route (Received: Header Chain)
    elements.append(Paragraph("Origin Tracer: Geolocation Hop Sequence (Earliest to Latest)", section_heading))
    hop_rows = [["Hop", "IP Address", "Location", "ISP / Infrastructure", "Type"]]
    for h in email.hops:
        hop_type = "ORIGIN" if h.is_likely_origin else ("INTERNAL" if h.is_internal else "RELAY")
        hop_loc = f"{h.city}, {h.country}" if not h.is_internal else "Local Network"
        hop_rows.append([
            Paragraph(str(h.hop_order + 1), body_style),
            Paragraph(pdf_text(h.ip), code_style),
            Paragraph(pdf_text(hop_loc), body_style),
            Paragraph(pdf_text(h.isp or "Unknown"), body_style),
            Paragraph(f"<b>{hop_type}</b>", body_style),
        ])
    if len(hop_rows) == 1:
        hop_rows.append([Paragraph("-", body_style), Paragraph("No hops extracted", body_style), Paragraph("-", body_style), Paragraph("-", body_style), Paragraph("-", body_style)])

    hop_table = Table(hop_rows, colWidths=[35, 110, 145, 180, 60])
    hop_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#e2e8f0")),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#cbd5e1")),
        ("PADDING", (0, 0), (-1, -1), 4),
    ]))
    elements.append(hop_table)
    elements.append(Spacer(1, 12))

    # 5. Cryptographic Forensic Audit Trail
    elements.append(Paragraph("Evidence Vault: Tamper-Evident Hash Chain Audit", section_heading))
    audit_rows = [["Action", "Actor", "Timestamp (UTC)", "Entry Hash (SHA-256 Digest)"]]
    for log in email.logs:
        audit_rows.append([
            Paragraph(pdf_text(log.action), body_style),
            Paragraph(pdf_text(log.actor), body_style),
            Paragraph(log.timestamp.strftime("%Y-%m-%d %H:%M:%S"), body_style),
            Paragraph(pdf_text(log.entry_hash[:32] + "..."), code_style),
        ])
    if len(audit_rows) == 1:
        audit_rows.append([Paragraph("INGEST", body_style), Paragraph("analyst", body_style), Paragraph("Recorded", body_style), Paragraph(email.raw_hash[:32] + "...", code_style)])

    audit_table = Table(audit_rows, colWidths=[70, 70, 110, 280])
    audit_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#e2e8f0")),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#cbd5e1")),
        ("PADDING", (0, 0), (-1, -1), 4),
    ]))
    elements.append(audit_table)
    elements.append(Spacer(1, 14))

    # ---- QR Code for Public Verification (additive, failure-safe) ----
    try:
        import qrcode

        verify_url = f"{settings.PUBLIC_BASE_URL.rstrip('/')}/api/emails/{email.id}/verify-public"
        if settings.PUBLIC_BASE_URL == "http://localhost:8000":
            logger.warning(
                "PUBLIC_BASE_URL is not set — QR code will point to localhost. "
                "Set PUBLIC_BASE_URL in .env or environment variables for production."
            )

        qr = qrcode.QRCode(version=1, error_correction=qrcode.constants.ERROR_CORRECT_M, box_size=6, border=2)
        qr.add_data(verify_url)
        qr.make(fit=True)
        qr_img = qr.make_image(fill_color="#0f172a", back_color="white")

        qr_buffer = io.BytesIO()
        qr_img.save(qr_buffer, format="PNG")
        qr_buffer.seek(0)

        qr_caption = ParagraphStyle(
            "QRCaption",
            parent=styles["Normal"],
            fontName="Helvetica",
            fontSize=8,
            textColor=colors.HexColor("#64748b"),
            leading=10,
        )
        elements.append(
            Paragraph(
                "Scan to independently verify this report's cryptographic integrity.",
                qr_caption,
            )
        )
        elements.append(Spacer(1, 4))
        elements.append(Image(qr_buffer, width=80, height=80))
        elements.append(Spacer(1, 8))
    except Exception as exc:
        logger.warning(f"QR code generation skipped: {exc}")

    # Footer notice
    elements.append(
        Paragraph(
            "<b>Forensic Guarantee:</b> All digests are computed using FIPS 180-4 SHA-256. Altering any field invalidates the cryptographic verification chain.",
            subtitle_style,
        )
    )

    doc.build(elements)
    pdf_bytes = buffer.getvalue()
    buffer.close()
    return pdf_bytes

