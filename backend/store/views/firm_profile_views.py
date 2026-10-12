from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from store.models import FirmProfile
from store.serializers import FirmProfileSerializer

@api_view(['GET'])
@permission_classes([AllowAny]) # Login page par bhi details dikhane ke liye AllowAny zaruri hai
def get_firm_profile(request):
    # Database se pehli row (client details) fetch karna
    profile = FirmProfile.objects.first()
    
    if profile:
        serializer = FirmProfileSerializer(profile)
        return Response({'success': True, 'data': serializer.data})
    else:
        return Response({'success': False, 'message': 'Firm profile data not found!'}, status=404)