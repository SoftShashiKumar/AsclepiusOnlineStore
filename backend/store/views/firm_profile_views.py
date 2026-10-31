from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from store.models import FirmProfile
from store.serializers import FirmProfileSerializer

@api_view(['GET'])
@permission_classes([AllowAny])
def get_firm_profile(request):
    """
    Returns the active firm's profile based on subdomain or firm_id.
    """
    subdomain = request.GET.get('subdomain', '').strip().lower()
    firm_id = request.headers.get('X-Firm-ID') or request.GET.get('firm_id', '').strip().upper()
    
    profile = None
    if firm_id:
        profile = FirmProfile.objects.filter(firm_id__iexact=firm_id, is_active=True).first()
    
    if not profile and subdomain:
        profile = FirmProfile.objects.filter(subdomain__iexact=subdomain, is_active=True).first()
        
    if not profile and hasattr(request, 'firm_profile') and request.firm_profile:
        profile = request.firm_profile
        
    if not profile:
        profile = FirmProfile.objects.filter(is_active=True).first()
        
    if profile:
        serializer = FirmProfileSerializer(profile)
        return Response({'success': True, 'data': serializer.data})
    else:
        return Response({'success': False, 'message': 'Firm profile data not found!'}, status=404)

@api_view(['GET'])
@permission_classes([AllowAny])
def get_all_firms(request):
    """
    Returns list of all active firms (for directory / selector / admin).
    """
    firms = FirmProfile.objects.filter(is_active=True).order_by('id')
    serializer = FirmProfileSerializer(firms, many=True)
    return Response({'success': True, 'data': serializer.data})
