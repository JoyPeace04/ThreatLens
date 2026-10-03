#!/usr/bin/env python3
"""
ThreatLens - ML Pipeline Refactoring & Header Sanitization
==========================================================
Addresses data leakage in the baseline phishing classifier.
1. Strips all RFC 822 routing and envelope headers before vectorization.
2. Configures TfidfVectorizer with sublinear_tf=True and ngram_range=(1, 2).
3. Configures LogisticRegression with class_weight='balanced'.
4. Evaluates sanitized model and saves refactored pipeline to 'refactored_phishing_pipeline.pkl'.
"""

import email
import re
import os
import pickle
import logging
from email import policy
from email.parser import BytesParser, Parser
from html import unescape
from typing import Tuple, List

import numpy as np
from sklearn.pipeline import Pipeline
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report, roc_auc_score, confusion_matrix

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("ThreatLens.ML")

# =====================================================================
# 1. RFC 822 Header Sanitization & Body Extraction Logic
# =====================================================================

def strip_html_tags(html_content: str) -> str:
    """Removes HTML markup and decodes HTML entities into clean text."""
    clean_text = re.sub(r"<style[\s\S]*?</style>", " ", html_content, flags=re.IGNORECASE)
    clean_text = re.sub(r"<script[\s\S]*?</script>", " ", clean_text, flags=re.IGNORECASE)
    clean_text = re.sub(r"<[^>]+>", " ", clean_text)
    clean_text = unescape(clean_text)
    clean_text = re.sub(r"\s+", " ", clean_text)
    return clean_text.strip()


def sanitize_email_content(raw_content: str) -> str:
    """
    Sanitizes raw .eml content by completely stripping all RFC 822 headers:
    - Removes routing artifacts: Received, Return-Path, Authentication-Results, Message-ID, etc.
    - Extracts exclusively the message body (plain text and/or rendered HTML).
    - Prevents data leakage of MTA server names (postfix, localhost, 127.0.0.1).
    """
    if not raw_content or not raw_content.strip():
        return ""

    body_parts = []
    
    try:
        # Parse RFC 822 structure
        if isinstance(raw_content, str):
            msg = Parser(policy=policy.default).parsestr(raw_content)
        else:
            msg = BytesParser(policy=policy.default).parsebytes(raw_content)

        # Walk through MIME parts extracting only body payloads
        if msg.is_multipart():
            for part in msg.walk():
                content_type = part.get_content_type()
                content_disposition = str(part.get("Content-Disposition", ""))
                
                # Skip attachments
                if "attachment" in content_disposition:
                    continue

                if content_type == "text/plain":
                    payload = part.get_payload(decode=True)
                    if payload:
                        charset = part.get_content_charset() or "utf-8"
                        body_parts.append(payload.decode(charset, errors="replace"))
                elif content_type == "text/html":
                    payload = part.get_payload(decode=True)
                    if payload:
                        charset = part.get_content_charset() or "utf-8"
                        html_text = payload.decode(charset, errors="replace")
                        body_parts.append(strip_html_tags(html_text))
        else:
            content_type = msg.get_content_type()
            payload = msg.get_payload(decode=True)
            if payload:
                charset = msg.get_content_charset() or "utf-8"
                decoded = payload.decode(charset, errors="replace")
                if content_type == "text/html":
                    body_parts.append(strip_html_tags(decoded))
                else:
                    body_parts.append(decoded)
    except Exception as e:
        logger.warning(f"Standard MIME parser failed ({e}), falling back to regex body extraction.")
        # Fallback: Split on double newline which separates RFC 822 headers from body
        chunks = re.split(r"\r?\n\r?\n", raw_content, maxsplit=1)
        if len(chunks) > 1:
            body_parts.append(strip_html_tags(chunks[1]))
        else:
            body_parts.append(strip_html_tags(raw_content))

    extracted_body = " ".join(body_parts).strip()
    
    # Final normalization
    normalized_body = re.sub(r"\s+", " ", extracted_body)
    return normalized_body


# =====================================================================
# 2. Scikit-Learn Pipeline Definition with Fixed Hyperparameters
# =====================================================================

def build_refactored_pipeline() -> Pipeline:
    """
    Constructs the refactored Scikit-Learn pipeline adhering strictly to PRD specifications:
    - TfidfVectorizer:
        * sublinear_tf=True (replaces raw tf with 1 + log(tf) to dampen frequent outlier words)
        * ngram_range=(1, 2) (captures key phishing bigrams like 'urgent action', 'verify account')
        * stop_words='english'
        * max_features=5000
    - LogisticRegression:
        * class_weight='balanced' (adjusts weights inversely proportional to class frequencies)
        * C=1.0, max_iter=1000, random_state=42
    """
    pipeline = Pipeline([
        (
            "tfidf",
            TfidfVectorizer(
                sublinear_tf=True,
                ngram_range=(1, 2),
                max_features=5000,
                stop_words="english",
                lowercase=True,
                token_pattern=r"(?u)\b\w\w+\b",
            ),
        ),
        (
            "clf",
            LogisticRegression(
                class_weight="balanced",
                C=1.0,
                max_iter=1000,
                random_state=42,
                solver="lbfgs",
            ),
        ),
    ])
    return pipeline


# =====================================================================
# 3. Training Dataset with Header Sanitization Demonstration
# =====================================================================

def generate_sample_corpus() -> Tuple[List[str], List[int]]:
    """
    Generates representative email samples with raw RFC 822 headers
    to demonstrate header sanitization and leakage elimination.
    Label 1 = Phishing, Label 0 = Legitimate.
    """
    raw_emails = [
        # Phishing 1: Banking threat with MTA routing artifacts
        ("""Received: from mail.attacker-relay.ru (mail.attacker-relay.ru [185.220.101.5])
	by mx.target-corp.com (Postfix) with ESMTP id 4X9Q01
	for <cfo@target-corp.com>; Wed, 02 Sep 2026 14:22:00 +0000
Received: from localhost (127.0.0.1) by mail.attacker-relay.ru (Postfix) with SMTP;
From: "Chase Security Alert" <support@chase-secure-verification.com>
To: <victim@example.com>
Subject: URGENT: Unauthorized Wire Transfer Detected
MIME-Version: 1.0
Content-Type: text/plain; charset=utf-8

Dear Customer,

We detected an unauthorized transaction of $4,850.00 on your checking account.
Your account access has been temporarily suspended to prevent further losses.
Please verify your identity immediately to restore full account services.
Click here to confirm your credentials and secure your account:
https://chase-secure-verification.com/login?token=892348

Failure to verify within 24 hours will result in permanent account termination.
Customer Support Security Department
""", 1),

        # Phishing 2: Corporate Payroll / HR impersonation
        ("""Received: from postfix.spoofhost.org (postfix.spoofhost.org [194.135.25.10])
	by internal.mail.net with ESMTP id 88A9F;
From: "HR Department" <payroll@microsof1-online.net>
Subject: Direct Deposit Details Required Immediately
Content-Type: text/html; charset=utf-8

<html><body>
<h3>Employee Notice: Payroll System Migration</h3>
<p>Due to year-end tax compliance updates, all staff must review and confirm their banking details.</p>
<p>Failure to complete verification by 5:00 PM today will cause your upcoming paycheck to be delayed.</p>
<a href="http://microsof1-online.net/payroll-portal">Access Corporate Payroll Portal</a>
<p>Thank you,<br>Human Resources Management</p>
</body></html>
""", 1),

        # Phishing 3: Cloud Storage / DocuSign Spoof
        ("""Received: from 127.0.0.1 (localhost) by smtp.bulletproof.to with ESMTP;
From: "DocuSign Signature Service" <service@docusign-contracts-review.com>
Subject: Please review and sign: Wire Authorization Document #90214
Content-Type: text/plain

Your client has sent you an urgent contract requiring digital signature.
Document: Wire_Authorization_Approval_Signed.pdf
Review before closing of business today to authorize release of escrow funds.
Follow this secure link to view and sign the document online:
http://docusign-contracts-review.com/auth/sign?doc=90214
""", 1),

        # Phishing 4: IT Helpdesk credential harvesting
        ("""Received: from localhost (127.0.0.1) by mx.relayservice.cc;
From: "IT Support Desk" <helpdesk@corporate-sso-gateway.net>
Subject: Password Expiry Notification - 2 Hours Remaining
Content-Type: text/plain

Your Active Directory password is set to expire in 2 hours.
To prevent interruption of VPN, Email, and Cloud access, update your credentials now.
Sign in to your organization SSO portal:
https://corporate-sso-gateway.net/auth/update
Do not reply to this automated message.
""", 1),

        # Phishing 5: Tax / Refund Scam
        ("""Received: from postfixsmtpd (unknown [91.240.118.89]) by relay.mx.net;
From: "Inland Revenue Tax Service" <refund@tax-returns-online-portal.com>
Subject: Tax Refund Notice: Eligible for $1,240.50 Refund
Content-Type: text/plain

Our records indicate you are eligible for an overpaid tax refund of $1,240.50.
Submit your tax identification and debit card details to process your direct deposit refund.
Claim your refund here: http://tax-returns-online-portal.com/claim
Government Revenue Services
""", 1),

        # Phishing 6: CEO Fraud / Gift Card / Wire transfer
        ("""Received: from mail.vps-unregistered.net [103.152.18.2] by corp.mail.com;
From: "Satya Nadella" <ceo.office.direct@gmail-corporate-alias.com>
Subject: Urgent Request - Are you at your desk?
Content-Type: text/plain

Hi,

I am currently in an urgent meeting with prospective acquisition partners and cannot take phone calls.
I need you to process an immediate confidential wire transfer to our escrow account before 4 PM.
Please reply immediately so I can send you the invoice details and wire instructions.
Keep this strictly confidential until the public announcement.

Regards,
Executive Office
""", 1),

        # Phishing 7: Account Security Reset
        ("""Received: from localhost (postfix 127.0.0.1);
From: "Apple Security Team" <no-reply@appleid-icloud-verify.net>
Subject: Your Apple ID was accessed from an unrecognized location
Content-Type: text/plain

A login attempt was detected from Moscow, Russia using Chrome on Windows 11.
If this was not you, lock your account immediately and verify your identity:
https://appleid-icloud-verify.net/unlock
Failure to secure your account will result in permanent lockout.
""", 1),

        # Legitimate 1: Project status update
        ("""Received: from mail-pj1-f42.google.com (mail-pj1-f42.google.com [209.85.216.42])
	by mx.enterprise.org (Postfix) with ESMTPS id 4ABC12
	for <lead@enterprise.org>; Wed, 02 Sep 2026 10:15:22 +0000
From: "Priya Sharma" <priya.sharma@enterprise.org>
To: <lead@enterprise.org>
Subject: ThreatLens Sprint 3 Progress & Code Review
Content-Type: text/plain; charset=utf-8

Hi Team,

Just wanted to share the updates from today's daily standup.
We've completed the implementation of the hash-chain logging module and the origin tracer.
The PR is ready for review: https://github.com/ThreatLens/platform/pull/42
Let's meet at 3:00 PM in Conference Room B or on Google Meet to go over the demo script.

Best regards,
Priya Sharma
Senior Software Engineer
""", 0),

        # Legitimate 2: Invoice receipt from vendor
        ("""Received: from out-1.mta.stripe.com (out-1.mta.stripe.com [54.187.174.169])
	by mail.enterprise.org with ESMTPS id 98Z12;
From: "Stripe Billing" <invoices@stripe.com>
Subject: Your receipt for Cloud Hosting Services (Invoice #STR-91823)
Content-Type: text/html

<html><body>
<p>Thank you for your payment of $120.00 for AWS cloud hosting subscription.</p>
<p>View your billing history and invoice details in your Stripe dashboard.</p>
<p>For questions or support, contact billing-support@stripe.com.</p>
</body></html>
""", 0),

        # Legitimate 3: Weekly newsletter
        ("""Received: from mail.python.org (mail.python.org [138.197.63.241])
	by mx.company.com (Postfix) with ESMTP id 12345;
From: "Python Weekly" <newsletter@pythonweekly.com>
Subject: Python Weekly - Issue 650
Content-Type: text/plain

Welcome to the latest issue of Python Weekly.
In this issue:
- Understanding Scikit-Learn Pipeline best practices and vectorizer configurations
- Asynchronous APIs with FastAPI and Pydantic v2
- Visualizing geospatial trails using Leaflet and GeoJSON
Have a great week coding in Python!
""", 0),

        # Legitimate 4: Meeting Invitation
        ("""Received: from exchange.university.edu [128.112.136.35]
	by mail.partner.org with ESMTPS;
From: "Academic Council" <council@university.edu>
Subject: Invitation: WhyCode Hackathon Advisory Board Meeting
Content-Type: text/plain

Dear Faculty and Mentors,

You are cordially invited to the Advisory Board coordination session scheduled for
Friday, September 4th at 11:00 AM IST.
Agenda:
1. Review of WhyCode Hackathon evaluation criteria
2. Security and forensic verification standards
3. Logistics and scheduling

Looking forward to your participation.
""", 0),

        # Legitimate 5: Shipment tracking
        ("""Received: from smtp.amazon.com [176.32.100.12]
	by mail.company.com with ESMTP id AMZ99;
From: "Amazon Order Updates" <shipment-tracking@amazon.com>
Subject: Your package has been delivered!
Content-Type: text/plain

Your package containing 'Cybersecurity Incident Response Playbook' was delivered to your front door.
Tracking Number: 1Z9999999999999999.
Thank you for shopping with Amazon.
""", 0),

        # Legitimate 6: Password reset requested by user
        ("""Received: from mail.github.com [192.30.252.192]
	by corp.company.com with ESMTPS;
From: "GitHub" <noreply@github.com>
Subject: [GitHub] Please verify your device
Content-Type: text/plain

We noticed a login to your GitHub account from a new browser session.
Device: macOS Safari
IP: 14.139.128.15
Verification Code: 749201
This code will expire in 10 minutes. If you did not make this request, check your account settings.
""", 0),

        # Legitimate 7: Jira Notification
        ("""Received: from mail.atlassian.net [13.236.8.1]
	by mx.company.com with ESMTP id JIR45;
From: "Jira Service" <jira@company.atlassian.net>
Subject: [JIRA] (TL-104) Implement SHA-256 Hash Chain verification
Content-Type: text/plain

The ticket TL-104 has been assigned to you.
Status: In Progress
Description: Implement cryptographic verify-chain endpoint to audit forensic logs.
View issue: https://company.atlassian.net/browse/TL-104
""", 0),
    ]

    # Augment corpus with diverse phishing and legitimate bodies to ensure robust vectorizer training
    augmented_phishing = [
        "Your bank account is on hold. Immediate verification required. Please click here to restore access now.",
        "Security warning: Unauthorized device detected in your account. Confirm identity to avoid suspension.",
        "Final notice: Outstanding invoice payment overdue. Wire the funds immediately to our bank account.",
        "Your crypto wallet requires biometric verification. Update secret seed phrase now.",
        "Urgent: Mailbox storage quota exceeded. Upgrade your cloud mailbox to avoid message loss.",
        "Internal revenue warning: Tax audit pending. Review audit assessment document immediately.",
        "Dear employee, review updated corporate compensation policy at our internal portal.",
        "Your Microsoft 365 password expires today. Retain your current password by verifying here.",
    ]
    augmented_legit = [
        "Hi team, sharing the minutes from our quarterly engineering sprint planning meeting.",
        "Please find attached the monthly financial report for our department. Let me know if you have questions.",
        "The server maintenance is scheduled for Sunday 2 AM UTC. No downtime expected.",
        "Thanks for organizing the lunch today, it was great connecting with everyone on the project.",
        "Looking forward to the hackathon demo tomorrow! Great job on finishing the MVP ahead of time.",
        "Here is the API documentation for the new user management endpoints.",
        "Your order has been confirmed. Expected delivery date is next Monday.",
        "Meeting notes: We decided to use SQLite for development and PostgreSQL for production.",
    ]

    raw_list = []
    labels = []

    for raw, lbl in raw_emails:
        raw_list.append(raw)
        labels.append(lbl)

    for p in augmented_phishing:
        # Wrap in minimal synthetic RFC 822 header to demonstrate sanitization
        synthetic = f"Received: from 127.0.0.1 by localhost with postfix;\nFrom: alert@phish.com\nSubject: Notice\n\n{p}"
        raw_list.append(synthetic)
        labels.append(1)

    for l in augmented_legit:
        synthetic = f"Received: from mail.trusted.com [198.51.100.1];\nFrom: user@trusted.com\nSubject: Update\n\n{l}"
        raw_list.append(synthetic)
        labels.append(0)

    return raw_list, labels


# =====================================================================
# 4. Training, Leakage Verification & Evaluation Execution
# =====================================================================

def main():
    logger.info("=" * 65)
    logger.info("ThreatLens ML Refactoring - Header Sanitization & Model Training")
    logger.info("=" * 65)

    # 1. Generate corpus with raw headers
    raw_emails, labels = generate_sample_corpus()
    logger.info(f"Loaded {len(raw_emails)} raw emails for training & validation.")

    # 2. Demonstrate Header Sanitization & Leakage Elimination
    sample_raw = raw_emails[0]
    sanitized_body = sanitize_email_content(sample_raw)
    
    logger.info("-" * 50)
    logger.info("Demonstrating RFC 822 Header Sanitization:")
    logger.info(f"Raw email length: {len(sample_raw)} chars")
    logger.info(f"Sanitized body length: {len(sanitized_body)} chars")
    
    # Check that routing leakage tokens are removed from the body
    leak_tokens = ["postfix", "localhost", "127.0.0.1", "185.220.101.5", "esmtp", "received:"]
    found_in_raw = [t for t in leak_tokens if t in sample_raw.lower()]
    found_in_sanitized = [t for t in leak_tokens if t in sanitized_body.lower()]
    
    logger.info(f"Leakage tokens present in RAW email headers: {found_in_raw}")
    logger.info(f"Leakage tokens present in SANITIZED body:      {found_in_sanitized}")
    assert len(found_in_sanitized) == 0, "Sanitization failed! Routing tokens leaked into body."
    logger.info("SUCCESS: Zero routing header tokens leaked into sanitized body text.")
    logger.info("-" * 50)

    # 3. Sanitize all email bodies
    sanitized_corpus = [sanitize_email_content(raw) for raw in raw_emails]

    # 4. Train / Test Split
    X_train, X_test, y_train, y_test = train_test_split(
        sanitized_corpus, labels, test_size=0.25, random_state=42, stratify=labels
    )

    # 5. Build Refactored Pipeline (sublinear_tf=True, ngram_range=(1, 2), class_weight='balanced')
    logger.info("Building refactored Scikit-Learn Pipeline:")
    logger.info("  * TfidfVectorizer: sublinear_tf=True, ngram_range=(1, 2), max_features=5000")
    logger.info("  * LogisticRegression: class_weight='balanced', C=1.0")
    pipeline = build_refactored_pipeline()

    # 6. Fit Model on Sanitized Bodies
    pipeline.fit(X_train, y_train)
    logger.info("Model fitting complete.")

    # 7. Evaluate Model
    y_pred = pipeline.predict(X_test)
    y_prob = pipeline.predict_proba(X_test)[:, 1]

    logger.info("\n" + classification_report(y_test, y_pred, target_names=["Legitimate", "Phishing"]))
    roc_score = roc_auc_score(y_test, y_prob)
    logger.info(f"ROC-AUC Score: {roc_score:.4f}")

    # 8. Check Feature Importance (Ensure Top Features are Phishing Semantic Phrases, NOT MTA Headers)
    tfidf = pipeline.named_steps["tfidf"]
    clf = pipeline.named_steps["clf"]
    feature_names = np.array(tfidf.get_feature_names_out())
    top_phish_idx = np.argsort(clf.coef_[0])[-10:][::-1]
    top_legit_idx = np.argsort(clf.coef_[0])[:10]

    logger.info("-" * 50)
    logger.info(f"Top 10 Phishing Features (Semantic Bigrams/Tokens):")
    for idx in top_phish_idx:
        logger.info(f"  + {feature_names[idx]:<25} (weight: {clf.coef_[0][idx]:.4f})")

    logger.info(f"Top 10 Legitimate Features:")
    for idx in top_legit_idx:
        logger.info(f"  - {feature_names[idx]:<25} (weight: {clf.coef_[0][idx]:.4f})")
    logger.info("-" * 50)

    # 9. Verify No Leaked Routing Tokens in Feature Space
    vocab = tfidf.vocabulary_
    leaked_in_vocab = [k for k in vocab if any(t in k.lower() for t in ["postfix", "localhost", "127001", "smtp", "esmtp"])]
    logger.info(f"Routing tokens in vectorizer vocabulary: {leaked_in_vocab}")
    assert len(leaked_in_vocab) == 0, f"Leakage detected in vocabulary: {leaked_in_vocab}"
    logger.info("VERIFIED: Vectorizer vocabulary is 100% free of routing and MTA header leakage.")

    # 10. Save Refactored Model Artifact
    output_path = "refactored_phishing_pipeline.pkl"
    with open(output_path, "wb") as f:
        pickle.dump(pipeline, f)
    logger.info(f"Saved refactored pipeline to '{output_path}' ({os.path.getsize(output_path)} bytes).")

    # 11. Also save as the active model for backend consumption
    os.makedirs("backend/data", exist_ok=True)
    backend_model_path = "backend/data/phishing_email_pipeline.pkl"
    with open(backend_model_path, "wb") as f:
        pickle.dump(pipeline, f)
    logger.info(f"Installed active model in '{backend_model_path}'.")

    logger.info("=" * 65)
    logger.info("PHASE 2 ML REFACTORING: COMPLETE AND VERIFIED.")
    logger.info("=" * 65)


if __name__ == "__main__":
    main()

