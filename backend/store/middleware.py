from store.models import FirmProfile

def get_current_firm_id(request):
    """
    Utility function to safely get the active firm_id from the request.
    Falls back to header, query param, or 'SHREE'.
    """
    if hasattr(request, 'firm_id') and request.firm_id:
        return request.firm_id
    
    header_firm = request.headers.get('X-Firm-ID')
    if header_firm:
        return header_firm.strip().upper()
        
    query_firm = request.GET.get('firm_id')
    if query_firm:
        return query_firm.strip().upper()
        
    return 'SHREE'

def get_current_firm_profile(request):
    """
    Utility function to get the full active FirmProfile object.
    """
    if hasattr(request, 'firm_profile') and request.firm_profile:
        return request.firm_profile
    
    firm_id = get_current_firm_id(request)
    profile = FirmProfile.objects.filter(firm_id__iexact=firm_id, is_active=True).first()
    if not profile:
        profile = FirmProfile.objects.filter(is_active=True).first()
    return profile


class TenantMiddleware:
    """
    Resolves multi-tenant firm context for every incoming request.
    Extracts firm identity from:
    1. 'X-Firm-ID' HTTP header (sent by Axios on frontend)
    2. 'subdomain' or 'firm_id' in GET parameters
    3. Host subdomain (e.g., shree.asclepiusstore.in or shree.localhost)
    """
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        firm_id = request.headers.get('X-Firm-ID')
        if firm_id:
            firm_id = firm_id.strip().upper()
            
        subdomain = request.GET.get('subdomain')
        if subdomain:
            subdomain = subdomain.strip().lower()

        if not firm_id and not subdomain:
            query_fid = request.GET.get('firm_id')
            if query_fid:
                firm_id = query_fid.strip().upper()

        # If still not found, check the incoming Host header
        if not firm_id and not subdomain:
            raw_host = request.get_host().split(':')[0].lower()
            parts = raw_host.split('.')
            # e.g., shree.asclepiusstore.in (3 parts) or shree.localhost (2 parts)
            if len(parts) >= 3 or (len(parts) == 2 and parts[1] == 'localhost'):
                potential_sub = parts[0]
                if potential_sub not in ['www', 'api', 'backend', 'localhost']:
                    subdomain = potential_sub

        firm = None
        if firm_id:
            firm = FirmProfile.objects.filter(firm_id__iexact=firm_id, is_active=True).first()
        if not firm and subdomain:
            firm = FirmProfile.objects.filter(subdomain__iexact=subdomain, is_active=True).first()
        
        if not firm:
            firm = FirmProfile.objects.filter(is_active=True).first()

        request.firm_profile = firm
        request.firm_id = firm.firm_id if firm else 'SHREE'

        response = self.get_response(request)
        return response
