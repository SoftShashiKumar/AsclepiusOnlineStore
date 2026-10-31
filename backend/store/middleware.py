# backend/store/middleware.py
import urllib.parse
from store.models import FirmProfile

def extract_subdomain(url_or_host):
    """
    Safely extracts subdomain from full URL (Origin/Referer) or Host header.
    Examples:
      'https://demo.asclepiusstore.in' -> 'demo'
      'http://demo.localhost:3000' -> 'demo'
      'demo.asclepiusstore.in' -> 'demo'
    """
    if not url_or_host:
        return None
    try:
        url_str = str(url_or_host).strip()
        if '://' in url_str:
            parsed = urllib.parse.urlparse(url_str)
            hostname = (parsed.hostname or '').lower()
        else:
            hostname = url_str.split(':')[0].lower()
            
        parts = hostname.split('.')
        # demo.asclepiusstore.in (3+ parts) or demo.localhost (2 parts)
        if len(parts) >= 3 or (len(parts) == 2 and parts[1] == 'localhost'):
            sub = parts[0]
            if sub not in ['www', 'api', 'backend', 'localhost']:
                return sub
    except Exception:
        pass
    return None

def resolve_firm_from_request(request):
    """
    Resolves FirmProfile using headers, query parameters, Origin, Referer, or Host.
    """
    # 1. Direct X-Firm-ID HTTP Header (from Axios / monkey-patched fetch)
    header_firm = request.headers.get('X-Firm-ID') or request.META.get('HTTP_X_FIRM_ID')
    if header_firm:
        clean = header_firm.strip().upper()
        firm = FirmProfile.objects.filter(firm_id__iexact=clean, is_active=True).first()
        if firm:
            return firm

    # 2. Query param ?firm_id= or ?subdomain=
    query_firm = request.GET.get('firm_id')
    if query_firm:
        clean = query_firm.strip().upper()
        firm = FirmProfile.objects.filter(firm_id__iexact=clean, is_active=True).first()
        if firm:
            return firm

    query_sub = request.GET.get('subdomain')
    if query_sub:
        clean = query_sub.strip().lower()
        firm = FirmProfile.objects.filter(subdomain__iexact=clean, is_active=True).first()
        if firm:
            return firm

    # 3. Origin header (e.g. Origin: https://demo.asclepiusstore.in)
    origin = request.META.get('HTTP_ORIGIN')
    sub_from_origin = extract_subdomain(origin)
    if sub_from_origin:
        firm = FirmProfile.objects.filter(subdomain__iexact=sub_from_origin, is_active=True).first()
        if firm:
            return firm

    # 4. Referer header (e.g. Referer: https://demo.asclepiusstore.in/sales)
    referer = request.META.get('HTTP_REFERER')
    sub_from_referer = extract_subdomain(referer)
    if sub_from_referer:
        firm = FirmProfile.objects.filter(subdomain__iexact=sub_from_referer, is_active=True).first()
        if firm:
            return firm

    # 5. Host header (when backend & frontend share same domain or reverse proxied)
    try:
        host = request.get_host()
        sub_from_host = extract_subdomain(host)
        if sub_from_host:
            firm = FirmProfile.objects.filter(subdomain__iexact=sub_from_host, is_active=True).first()
            if firm:
                return firm
    except Exception:
        pass

    # Fallback to default active firm (e.g. SHREE)
    return FirmProfile.objects.filter(is_active=True).first()

def get_current_firm_id(request):
    """
    Utility function to safely get the active firm_id from the request.
    """
    if hasattr(request, 'firm_id') and request.firm_id:
        return request.firm_id
    
    firm = resolve_firm_from_request(request)
    return firm.firm_id if firm else 'SHREE'

def get_current_firm_profile(request):
    """
    Utility function to get the full active FirmProfile object.
    """
    if hasattr(request, 'firm_profile') and request.firm_profile:
        return request.firm_profile
    
    return resolve_firm_from_request(request)


class TenantMiddleware:
    """
    Resolves multi-tenant firm context for every incoming request.
    Extracts firm identity from:
    1. 'X-Firm-ID' HTTP header
    2. 'subdomain' or 'firm_id' in GET parameters
    3. Origin header (e.g., https://demo.asclepiusstore.in)
    4. Referer header (e.g., https://demo.asclepiusstore.in/sales)
    5. Host subdomain (e.g., shree.asclepiusstore.in)
    """
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        firm = resolve_firm_from_request(request)
        request.firm_profile = firm
        request.firm_id = firm.firm_id if firm else 'SHREE'

        response = self.get_response(request)
        return response
