import socket
import ipaddress
import urllib.parse
import urllib.request
import re
from typing import Dict, Any, Tuple


class SafeScraperService:
    @staticmethod
    def is_safe_url(url: str) -> Tuple[bool, str]:
        """
        Validates URL to protect against SSRF (Server-Side Request Forgery).
        Rejects private, loopback, link-local, multicast, or cloud metadata IP addresses.
        """
        try:
            parsed = urllib.parse.urlparse(url)
            if parsed.scheme not in ("http", "https"):
                return False, f"Unsupported protocol '{parsed.scheme}'. Only http and https are allowed."

            hostname = parsed.hostname
            if not hostname:
                return False, "Invalid URL: missing hostname."

            # Block localhost name variants
            if hostname.lower() in ("localhost", "127.0.0.1", "0.0.0.0", "metadata.google.internal"):
                return False, "Access to localhost or internal metadata addresses is forbidden."

            # Resolve DNS to IP
            try:
                addr_info = socket.getaddrinfo(hostname, None)
            except socket.gaierror:
                return False, f"Could not resolve hostname '{hostname}'."

            for item in addr_info:
                ip_str = item[4][0]
                ip_obj = ipaddress.ip_address(ip_str)

                # Check private / loopback / link-local / reserved
                if (
                    ip_obj.is_private
                    or ip_obj.is_loopback
                    or ip_obj.is_link_local
                    or ip_obj.is_multicast
                    or ip_obj.is_reserved
                ):
                    return False, f"Target IP '{ip_str}' is within a private or restricted network range."

                # Special check for cloud metadata service (AWS/GCP/Azure)
                if str(ip_obj) == "169.254.169.254":
                    return False, "Target IP is cloud metadata service. Access prohibited."

            return True, "URL is safe."
        except Exception as e:
            return False, f"URL validation failed: {str(e)}"

    @staticmethod
    def extract_website_context(url: str, max_bytes: int = 512000) -> Dict[str, Any]:
        """
        Safely fetches public website and extracts meta information, brand hints, and text summary.
        """
        is_safe, msg = SafeScraperService.is_safe_url(url)
        if not is_safe:
            raise ValueError(f"SSRF Protection Error: {msg}")

        req = urllib.request.Request(
            url,
            headers={
                "User-Agent": "HerballyBrandIntelligenceBot/1.0 (+https://herbally.in/bot-info)"
            }
        )

        try:
            with urllib.request.urlopen(req, timeout=5) as response:
                content_type = response.headers.get("Content-Type", "")
                if "text/html" not in content_type and "text/plain" not in content_type:
                    return {
                        "url": url,
                        "title": "",
                        "description": "",
                        "extracted_text": f"Non-HTML content type ({content_type}). Context skipped.",
                        "status": "partial"
                    }

                raw_bytes = response.read(max_bytes)
                html_text = raw_bytes.decode("utf-8", errors="ignore")

                # Extract title
                title_match = re.search(r"<title[^>]*>(.*?)</title>", html_text, re.IGNORECASE | re.DOTALL)
                title = title_match.group(1).strip() if title_match else ""

                # Extract meta description
                desc_match = re.search(r'<meta[^>]*name=["\']description["\'][^>]*content=["\'](.*?)["\']', html_text, re.IGNORECASE)
                if not desc_match:
                    desc_match = re.search(r'<meta[^>]*content=["\'](.*?)["\'][^>]*name=["\']description["\']', html_text, re.IGNORECASE)
                description = desc_match.group(1).strip() if desc_match else ""

                # Strip script and style tags
                cleaned = re.sub(r"<(script|style)[^>]*>.*?</\1>", " ", html_text, flags=re.DOTALL | re.IGNORECASE)
                # Strip HTML tags
                text_only = re.sub(r"<[^>]+>", " ", cleaned)
                # Normalize whitespace
                text_clean = " ".join(text_only.split())[:1500]

                return {
                    "url": url,
                    "title": title,
                    "description": description,
                    "extracted_text": text_clean,
                    "status": "success"
                }
        except Exception as e:
            raise RuntimeError(f"Could not retrieve website: {str(e)}")
