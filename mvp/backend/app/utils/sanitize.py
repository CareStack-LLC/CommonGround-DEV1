"""Input sanitization utilities for security.

This module provides functions to sanitize user input to prevent XSS attacks,
injection attacks, and other security vulnerabilities.
"""

import bleach
import re
import os
from typing import Optional


def sanitize_text(text: str, max_length: int = 10000) -> str:
    """
    Sanitize text input for safe storage and display.

    This function:
    - Strips all HTML tags (allows plain text only)
    - Removes script tags and dangerous patterns
    - Limits length to prevent DoS
    - Removes leading/trailing whitespace

    Args:
        text: The text to sanitize
        max_length: Maximum allowed length (default: 10000 chars)

    Returns:
        Sanitized text string

    Example:
        >>> sanitize_text("<script>alert('xss')</script>Hello")
        "Hello"
        >>> sanitize_text("Normal text")
        "Normal text"
    """
    if not text:
        return ""

    # Strip HTML tags (allow plain text only)
    clean_text = bleach.clean(text, tags=[], strip=True)

    # Remove dangerous patterns that might bypass bleach
    dangerous_patterns = [
        '<script', '</script>',
        'javascript:',
        'onerror=', 'onclick=', 'onload=', 'onmouseover=',
        'data:text/html',
        'vbscript:',
        '<iframe', '</iframe>',
        '<object', '</object>',
        '<embed', '</embed>'
    ]

    for pattern in dangerous_patterns:
        clean_text = clean_text.replace(pattern, '')
        # Also check case-insensitive
        clean_text = clean_text.replace(pattern.upper(), '')

    # Limit length to prevent DoS
    clean_text = clean_text[:max_length]

    # Strip leading/trailing whitespace
    return clean_text.strip()


def sanitize_email(email: str) -> str:
    """
    Validate and sanitize email address.

    Args:
        email: Email address to sanitize

    Returns:
        Sanitized email in lowercase

    Raises:
        ValueError: If email format is invalid

    Example:
        >>> sanitize_email("  User@Example.COM  ")
        "user@example.com"
        >>> sanitize_email("invalid-email")
        ValueError: Invalid email format
    """
    if not email:
        raise ValueError("Email cannot be empty")

    email = email.strip().lower()

    # Basic email regex (RFC 5322 simplified)
    email_pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'

    if not re.match(email_pattern, email):
        raise ValueError("Invalid email format")

    # Additional checks
    if len(email) > 254:  # RFC 5321
        raise ValueError("Email too long (max 254 characters)")

    # Check for dangerous patterns
    dangerous = ['..', '--', '__']
    for pattern in dangerous:
        if pattern in email:
            raise ValueError(f"Invalid email format: contains '{pattern}'")

    return email


def sanitize_filename(filename: str, max_length: int = 255) -> str:
    """
    Sanitize filename for safe storage.

    This prevents path traversal attacks and ensures safe filenames.

    Args:
        filename: The filename to sanitize
        max_length: Maximum filename length (default: 255)

    Returns:
        Sanitized filename

    Example:
        >>> sanitize_filename("../../etc/passwd")
        "etc_passwd"
        >>> sanitize_filename("my file!@#.pdf")
        "my_file.pdf"
    """
    if not filename:
        return "unnamed_file"

    # Get basename only (remove any path components)
    filename = os.path.basename(filename)

    # Allow only safe characters (alphanumeric, dash, underscore, period)
    safe_chars = set('abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-_.')
    filename = ''.join(c if c in safe_chars else '_' for c in filename)

    # Ensure filename doesn't start with a period (hidden file)
    if filename.startswith('.'):
        filename = 'file' + filename

    # Limit length
    if len(filename) > max_length:
        # Preserve extension if present
        name, ext = os.path.splitext(filename)
        if ext:
            max_name_length = max_length - len(ext)
            filename = name[:max_name_length] + ext
        else:
            filename = filename[:max_length]

    # Ensure filename is not empty after sanitization
    if not filename or filename == '.':
        filename = "unnamed_file"

    return filename


def sanitize_url(url: str) -> str:
    """
    Sanitize URL to prevent SSRF and other attacks.

    Args:
        url: URL to sanitize

    Returns:
        Sanitized URL

    Raises:
        ValueError: If URL is invalid or dangerous

    Example:
        >>> sanitize_url("https://example.com/page")
        "https://example.com/page"
        >>> sanitize_url("javascript:alert('xss')")
        ValueError: Invalid URL scheme
    """
    if not url:
        raise ValueError("URL cannot be empty")

    url = url.strip()

    # Check for dangerous schemes
    dangerous_schemes = [
        'javascript:', 'data:', 'vbscript:', 'file:',
        'about:', 'blob:'
    ]

    url_lower = url.lower()
    for scheme in dangerous_schemes:
        if url_lower.startswith(scheme):
            raise ValueError(f"Invalid URL scheme: {scheme}")

    # Only allow http and https
    if not url_lower.startswith('http://') and not url_lower.startswith('https://'):
        raise ValueError("URL must start with http:// or https://")

    # Check for localhost/internal IP addresses (prevent SSRF)
    internal_patterns = [
        'localhost', '127.0.0.1', '0.0.0.0',
        '192.168.', '10.', '172.16.', '172.17.',
        '172.18.', '172.19.', '172.20.', '172.21.',
        '172.22.', '172.23.', '172.24.', '172.25.',
        '172.26.', '172.27.', '172.28.', '172.29.',
        '172.30.', '172.31.'
    ]

    for pattern in internal_patterns:
        if pattern in url_lower:
            raise ValueError("Internal URLs not allowed")

    # Basic length check
    if len(url) > 2048:
        raise ValueError("URL too long (max 2048 characters)")

    return url


def sanitize_html_rich_text(text: str, max_length: int = 50000) -> str:
    """
    Sanitize rich text HTML, allowing safe formatting tags.

    Use this for content that needs basic formatting (bold, italic, lists, etc.)
    but should still be protected from XSS.

    Args:
        text: HTML text to sanitize
        max_length: Maximum allowed length

    Returns:
        Sanitized HTML with only safe tags

    Example:
        >>> sanitize_html_rich_text("<p>Hello <b>World</b></p>")
        "<p>Hello <b>World</b></p>"
        >>> sanitize_html_rich_text("<p>Hello <script>alert('xss')</script></p>")
        "<p>Hello</p>"
    """
    if not text:
        return ""

    # Allowed tags for rich text
    allowed_tags = [
        'p', 'br', 'strong', 'em', 'u', 'ol', 'ul', 'li',
        'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
        'blockquote', 'code', 'pre',
        'a'  # Links (with href attribute only)
    ]

    # Allowed attributes (very restricted)
    allowed_attributes = {
        'a': ['href', 'title'],
        '*': ['class']  # Allow class for styling
    }

    # Allowed protocols for links
    allowed_protocols = ['http', 'https', 'mailto']

    # Clean the HTML
    clean_html = bleach.clean(
        text,
        tags=allowed_tags,
        attributes=allowed_attributes,
        protocols=allowed_protocols,
        strip=True
    )

    # Limit length
    clean_html = clean_html[:max_length]

    return clean_html


def validate_phone(phone: str) -> str:
    """
    Validate and sanitize phone number.

    Args:
        phone: Phone number to validate

    Returns:
        Sanitized phone number (digits only with optional +)

    Raises:
        ValueError: If phone format is invalid

    Example:
        >>> validate_phone("+1 (555) 123-4567")
        "+15551234567"
        >>> validate_phone("555.123.4567")
        "5551234567"
    """
    if not phone:
        raise ValueError("Phone number cannot be empty")

    # Remove common separators
    phone = phone.strip()
    phone = phone.replace(' ', '')
    phone = phone.replace('-', '')
    phone = phone.replace('.', '')
    phone = phone.replace('(', '')
    phone = phone.replace(')', '')

    # Allow only digits and leading +
    if phone.startswith('+'):
        if not phone[1:].isdigit():
            raise ValueError("Phone number must contain only digits after +")
    else:
        if not phone.isdigit():
            raise ValueError("Phone number must contain only digits")

    # Length validation (international numbers can be 10-15 digits)
    digits = phone.replace('+', '')
    if len(digits) < 10 or len(digits) > 15:
        raise ValueError("Phone number must be 10-15 digits")

    return phone


def sanitize_case_name(case_name: str) -> str:
    """
    Sanitize case name for display and storage.

    Args:
        case_name: Case name to sanitize (e.g., "Smith v. Jones")

    Returns:
        Sanitized case name

    Raises:
        ValueError: If case name is invalid

    Example:
        >>> sanitize_case_name("Smith v. Jones")
        "Smith v. Jones"
        >>> sanitize_case_name("<script>alert('xss')</script>")
        "alert('xss')"
    """
    if not case_name:
        raise ValueError("Case name cannot be empty")

    # Remove HTML tags
    clean_name = bleach.clean(case_name, tags=[], strip=True)

    # Remove dangerous patterns
    clean_name = sanitize_text(clean_name, max_length=200)

    # Ensure it's not empty after sanitization
    if not clean_name or len(clean_name.strip()) == 0:
        raise ValueError("Case name is empty after sanitization")

    # Trim whitespace
    clean_name = ' '.join(clean_name.split())

    # Length check
    if len(clean_name) < 3:
        raise ValueError("Case name too short (minimum 3 characters)")

    if len(clean_name) > 200:
        raise ValueError("Case name too long (maximum 200 characters)")

    return clean_name
