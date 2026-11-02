from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework import status
import re
from django.db import connection
from store.models import FirmProfile, OfferBanner
from store.serializers import FirmProfileSerializer

def check_shashi_permission(request):
    """Only user 'shashi' has permission to manage firms."""
    username = None
    if request.user and request.user.is_authenticated:
        username = request.user.username
    if not username:
        username = request.headers.get('X-Username') or request.META.get('HTTP_X_USERNAME')
    if not username and hasattr(request, 'data'):
        username = request.data.get('username')
    return bool(username and str(username).strip().lower() == 'shashi')

def ensure_dynamic_item_columns(firm_num):
    """Dynamically creates Active{id}, Available_quantity_{id}, reorder_level_{id} if firm_num > 4."""
    if not firm_num or firm_num <= 4:
        return
    with connection.cursor() as cursor:
        cursor.execute("SHOW COLUMNS FROM item_master")
        existing_cols = {row[0].lower() for row in cursor.fetchall()}
        cols_to_add = [
            (f'Active{firm_num}', 'VARCHAR(20) DEFAULT "1"'),
            (f'Available_quantity_{firm_num}', 'DECIMAL(10,2) DEFAULT 0.00'),
            (f'reorder_level_{firm_num}', 'INT DEFAULT 20')
        ]
        for col_name, col_def in cols_to_add:
            if col_name.lower() not in existing_cols:
                try:
                    cursor.execute(f"ALTER TABLE item_master ADD COLUMN `{col_name}` {col_def}")
                except Exception as ex:
                    print(f"Error adding dynamic column {col_name}: {ex}")

@api_view(['GET'])
@permission_classes([AllowAny])
def get_firm_profile(request):
    """
    Returns the active firm's profile based on subdomain or firm_id.
    Explicit query params (?subdomain= or ?firm_id=) take highest precedence.
    """
    subdomain = request.GET.get('subdomain', '').strip().lower()
    query_firm_id = request.GET.get('firm_id', '').strip().upper()
    header_firm_id = (request.headers.get('X-Firm-ID') or '').strip().upper()
    
    profile = None

    # 1. First priority: explicit subdomain query parameter (e.g. ?subdomain=demo)
    if subdomain:
        profile = FirmProfile.objects.filter(subdomain__iexact=subdomain, is_active=True).first()
        if not profile:
            profile = FirmProfile.objects.filter(firm_id__iexact=subdomain.upper(), is_active=True).first()

    # 2. Second priority: explicit firm_id query parameter (e.g. ?firm_id=DEMO)
    if not profile and query_firm_id:
        profile = FirmProfile.objects.filter(firm_id__iexact=query_firm_id, is_active=True).first()
        if not profile:
            profile = FirmProfile.objects.filter(subdomain__iexact=query_firm_id.lower(), is_active=True).first()

    # 3. Third priority: direct X-Firm-ID header
    if not profile and header_firm_id:
        profile = FirmProfile.objects.filter(firm_id__iexact=header_firm_id, is_active=True).first()
        if not profile:
            profile = FirmProfile.objects.filter(subdomain__iexact=header_firm_id.lower(), is_active=True).first()
        
    # 4. Fourth priority: middleware resolved firm profile
    if not profile and hasattr(request, 'firm_profile') and request.firm_profile:
        profile = request.firm_profile
        
    # 5. Fallback: first active firm (SHREE)
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
    Returns list of all firms (for directory / selector / admin master).
    """
    include_inactive = request.GET.get('all', 'true').lower() == 'true'
    if include_inactive:
        firms = FirmProfile.objects.all().order_by('id')
    else:
        firms = FirmProfile.objects.filter(is_active=True).order_by('id')
    serializer = FirmProfileSerializer(firms, many=True)
    return Response({'success': True, 'data': serializer.data})

@api_view(['POST'])
@permission_classes([AllowAny])
def save_firm_profile(request):
    """
    Creates or updates a firm profile in the database.
    Immediately active system-wide! Restricted to user 'shashi'.
    """
    try:
        if not check_shashi_permission(request):
            return Response({'success': False, 'message': 'Firm create ya update karne ka adhikar sirf Shashi ke paas hai!'}, status=status.HTTP_403_FORBIDDEN)

        data = request.data
        firm_pk = data.get('id')
        raw_firm_id = str(data.get('firm_id', '')).strip().upper()
        raw_subdomain = str(data.get('subdomain', '')).strip().lower()
        firm_name = str(data.get('firm_name', '')).strip()

        if not raw_firm_id:
            return Response({'success': False, 'message': 'Firm ID dalna anivarya (mandatory) hai! Jaise SHREE ya DEMO.'}, status=status.HTTP_400_BAD_REQUEST)

        if not raw_subdomain:
            return Response({'success': False, 'message': 'Subdomain dalna anivarya hai! Jaise shree ya demo.'}, status=status.HTTP_400_BAD_REQUEST)

        if not firm_name:
            return Response({'success': False, 'message': 'Firm Name dalna anivarya hai!'}, status=status.HTTP_400_BAD_REQUEST)

        # Clean subdomain: only alphanumeric and hyphen
        clean_subdomain = re.sub(r'[^a-z0-9\-]', '', raw_subdomain)
        clean_firm_id = re.sub(r'[^A-Z0-9\_]', '', raw_firm_id)

        # Check unique constraint against other firms
        existing_sub = FirmProfile.objects.filter(subdomain__iexact=clean_subdomain)
        existing_fid = FirmProfile.objects.filter(firm_id__iexact=clean_firm_id)

        if firm_pk:
            existing_sub = existing_sub.exclude(id=firm_pk)
            existing_fid = existing_fid.exclude(id=firm_pk)

        if existing_sub.exists():
            return Response({'success': False, 'message': f'Subdomain "{clean_subdomain}" pehle se kisi doosri firm ke pass registered hai!'}, status=status.HTTP_400_BAD_REQUEST)

        if existing_fid.exists():
            return Response({'success': False, 'message': f'Firm ID "{clean_firm_id}" pehle se maujood hai!'}, status=status.HTTP_400_BAD_REQUEST)

        firm_obj = None
        if firm_pk:
            firm_obj = FirmProfile.objects.filter(id=firm_pk).first()

        if not firm_obj:
            firm_obj = FirmProfile.objects.filter(firm_id__iexact=clean_firm_id).first()

        if not firm_obj:
            firm_obj = FirmProfile(firm_id=clean_firm_id, subdomain=clean_subdomain)

        firm_obj.firm_id = clean_firm_id
        firm_obj.subdomain = clean_subdomain
        firm_obj.firm_name = firm_name
        firm_obj.proprietor_name = data.get('proprietor_name', '')
        firm_obj.tagline_1 = data.get('tagline_1', '')
        firm_obj.tagline_2 = data.get('tagline_2', '')
        firm_obj.address_line_1 = data.get('address_line_1', '')
        firm_obj.address_line_2 = data.get('address_line_2', '')
        firm_obj.phone_1 = data.get('phone_1', '')
        firm_obj.phone_2 = data.get('phone_2', '')
        firm_obj.email = data.get('email', '')
        firm_obj.website = data.get('website', '') or f"https://{clean_subdomain}.asclepiusstore.in"
        firm_obj.instagram_id = data.get('instagram_id', '')
        firm_obj.facebook_id = data.get('facebook_id', '')
        firm_obj.gstin_number = data.get('gstin_number', '')
        firm_obj.invoice_prefix = (data.get('invoice_prefix') or clean_firm_id[:3]).upper()
        firm_obj.bank_details = data.get('bank_details', '')
        firm_obj.is_active = bool(data.get('is_active', True))

        firm_obj.save()

        # Ensure OfferBanner row exists for this firm
        try:
            OfferBanner.objects.get_or_create(
                firm_id=clean_firm_id,
                defaults={'offer_text': '', 'is_active': False}
            )
        except Exception as e:
            print(f"OfferBanner creation warning: {e}")

        # Ensure dynamic columns on item_master if firm id > 4
        if firm_obj.id and firm_obj.id > 4:
            try:
                ensure_dynamic_item_columns(firm_obj.id)
            except Exception as e:
                print(f"ensure_dynamic_item_columns error: {e}")

        serializer = FirmProfileSerializer(firm_obj)
        return Response({
            'success': True,
            'message': f'Firm "{firm_name}" safaltapoorvak save ho gayi!',
            'data': serializer.data
        }, status=status.HTTP_200_OK)

    except Exception as e:
        return Response({'success': False, 'message': f'Firm save error: {str(e)}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['POST', 'DELETE'])
@permission_classes([AllowAny])
def delete_firm(request, firm_id):
    """
    Deactivates a firm (soft delete) or deletes if requested. Restricted to user 'shashi'.
    """
    try:
        if not check_shashi_permission(request):
            return Response({'success': False, 'message': 'Firm delete karne ka adhikar sirf Shashi ke paas hai!'}, status=status.HTTP_403_FORBIDDEN)

        clean_fid = str(firm_id).strip().upper()
        if clean_fid in ['SHREE', 'DEMO']:
            return Response({'success': False, 'message': f'Base system firm "{clean_fid}" ko delete nahi kiya ja sakta!'}, status=status.HTTP_400_BAD_REQUEST)

        firm = FirmProfile.objects.filter(firm_id__iexact=clean_fid).first()
        if not firm:
            return Response({'success': False, 'message': 'Firm nahi mili!'}, status=status.HTTP_404_NOT_FOUND)

        firm.is_active = False
        firm.save()
        return Response({'success': True, 'message': f'Firm "{clean_fid}" ko deactivate kar diya gaya hai.'})
    except Exception as e:
        return Response({'success': False, 'message': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
