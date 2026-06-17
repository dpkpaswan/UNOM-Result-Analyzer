"""Scraping logic for Madras University results — extracted from main.py."""

import time
from typing import Dict, Any

import requests
from bs4 import BeautifulSoup

GET_URL = "https://egovernance.unom.ac.in/results/ugresult.asp"
POST_URL = "https://egovernance.unom.ac.in/results/ugresultpage.asp"

USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"


def scrape_student(regno: str, dob: str) -> Dict[str, Any]:
    """Scrape result for a single student.

    IMPORTANT: A brand-new requests.Session is created for EVERY student
    so that the ASP server gets a fresh session cookie each time.
    Sessions are NEVER reused across students.
    """
    try:
        # --- Step 1: fresh session per student ---
        session = requests.Session()

        session.get(
            GET_URL,
            headers={
                "User-Agent": USER_AGENT,
            },
            timeout=15,
        )

        # --- Step 2: encode DOB correctly ---
        dob_encoded = dob.replace("/", "%2F")

        # --- Step 3: POST with fresh session ---
        response = session.post(
            POST_URL,
            headers={
                "User-Agent": USER_AGENT,
                "Content-Type": "application/x-www-form-urlencoded",
                "Referer": GET_URL,
            },
            data=f"regno={regno}&pwd={dob_encoded}",
            timeout=15,
        )

        html = response.text

        # If response is empty or too short, flag as ERROR
        if not html or len(html.strip()) < 100:
            print(f"[SCRAPER] Empty/short response for {regno}")
            return {"regno": regno, "name": "", "dob": dob, "overall": "ERROR", "subjects": []}

        # Check if result page actually contains a marks table
        if "Subject Code" not in html:
            print(f"[SCRAPER] No marks table in response for {regno}")
            return {"regno": regno, "name": "", "dob": dob, "overall": "ERROR", "subjects": []}

        result = parse_result_html(html)
        result["dob"] = dob
        if not result["regno"]:
            result["regno"] = regno
        return result

    except Exception as e:
        print(f"[SCRAPER] Error scraping {regno}: {e}")
        return {"regno": regno, "name": "", "dob": dob, "overall": "ERROR", "subjects": []}


def parse_result_html(html: str, fallback_name: str = "") -> Dict[str, Any]:
    """Parse the result page HTML and extract student data.

    Args:
        html: raw HTML from the result page.
        fallback_name: name from the CSV to use if HTML doesn't contain one.
    """
    soup = BeautifulSoup(html, "html.parser")

    # --- Extract name ---
    parsed_name = fallback_name
    for span in soup.find_all("span"):
        text = span.get_text()
        if "Name :" in text or "Name:" in text:
            b_tags = span.find_all("b")
            for b in b_tags:
                val = b.get_text(strip=True)
                if val and "Name" not in val and ":" not in val:
                    parsed_name = val
                    break
            if parsed_name != fallback_name:
                break

    # --- Extract register number ---
    regno = ""
    for span in soup.find_all("span"):
        text = span.get_text()
        if "Register Number :" in text or "Register Number:" in text:
            all_b = span.find_all("b")
            for b in all_b:
                val = b.get_text(strip=True)
                if val and val not in ("Register Number :", "Register Number:", "Register Number"):
                    regno = val
                    break
            if regno:
                break

    # --- Extract subjects ---
    subjects = []
    for row in soup.find_all("tr"):
        cells = row.find_all("td")
        if len(cells) == 6:
            code = cells[0].get_text(strip=True)
            ue = cells[1].get_text(strip=True)
            ia = cells[2].get_text(strip=True)
            total = cells[3].get_text(strip=True)
            result = cells[4].get_text(strip=True)
            remark = cells[5].get_text(strip=True)

            # Skip header row
            if not code or code == "Subject Code":
                continue

            # Parse integers safely
            try:
                ue_int = int(ue) if ue and ue != "-" else 0
            except ValueError:
                ue_int = 0
            try:
                ia_int = int(ia) if ia and ia != "-" else 0
            except ValueError:
                ia_int = 0
            try:
                total_int = int(total) if total and total != "-" else 0
            except ValueError:
                total_int = 0

            subjects.append({
                "code": code,
                "ue": ue_int,
                "ia": ia_int,
                "total": total_int,
                "result": result.upper() if result else "RA",
                "remark": remark,
            })

    # --- Determine overall status ---
    if not subjects:
        overall = "ERROR"
    elif all(s["result"] == "PASS" for s in subjects):
        overall = "PASS"
    else:
        overall = "FAIL"

    return {
        "name": parsed_name,
        "regno": regno,
        "subjects": subjects,
        "overall": overall,
    }
