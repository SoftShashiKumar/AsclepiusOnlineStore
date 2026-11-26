import re
from django.contrib.auth.models import User
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework import status
from store.models import FirmProfile, UserProfile, ItemMaster, Sales, Customers, StockForSale


def is_superadmin_user(request):
    """
    Identifies whether the requester is the platform SuperAdmin (user 'shashi').
    Checks JWT authenticated user, request headers, or body.
    """
    username = None
    if request.user and request.user.is_authenticated:
        username = request.user.username
    if not username:
        username = request.headers.get('X-Username') or request.META.get('HTTP_X_USERNAME')
    if not username and hasattr(request, 'data') and isinstance(request.data, dict):
        username = request.data.get('superadmin_username') or request.data.get('username')
    if not username and hasattr(request, 'GET'):
        username = request.GET.get('superadmin_username') or request.GET.get('username')
    return bool(username and str(username).strip().lower() == 'shashi')


# ==========================================
# 👥 1. GET ALL USERS & STATS BY PROFILE
# ==========================================
@api_view(['GET'])
@permission_classes([AllowAny])
def get_superadmin_users(request):
    if not is_superadmin_user(request):
        return Response({'success': False, 'message': 'Access denied: SuperAdmin (shashi) only!'}, status=status.HTTP_403_FORBIDDEN)

    users = User.objects.all().order_by('-id')
    user_list = []
    firm_counts = {}

    for u in users:
        profile, _ = UserProfile.objects.get_or_create(user=u)
        firm_id = (profile.firm_id or 'GLOBAL').strip().upper()
        firm_counts[firm_id] = firm_counts.get(firm_id, 0) + 1

        is_super = u.username.strip().lower() == 'shashi'
        if is_super:
            role = 'SuperAdmin'
        elif u.is_superuser or u.is_staff or u.username in ['admins', 'Ayush']:
            role = 'Admin'
        else:
            role = 'Customer'

        user_list.append({
            'id': u.id,
            'username': u.username,
            'first_name': u.first_name or '',
            'last_name': u.last_name or '',
            'email': u.email or '',
            'phone_number': profile.phone_number or '',
            'firm_id': profile.firm_id or '',
            'role': role,
            'is_staff': u.is_staff,
            'is_superuser': u.is_superuser,
            'is_active': u.is_active,
            'date_joined': u.date_joined.strftime('%Y-%m-%d %H:%M') if u.date_joined else ''
        })

    # Also list available firm options for dropdown
    firms = list(FirmProfile.objects.values('firm_id', 'subdomain', 'firm_name', 'is_active'))

    return Response({
        'success': True,
        'users': user_list,
        'firm_counts': firm_counts,
        'firms': firms,
        'total_users': len(user_list)
    })


# ==========================================
# ➕ 2. CREATE NEW USER FOR A PROFILE
# ==========================================
@api_view(['POST'])
@permission_classes([AllowAny])
def create_superadmin_user(request):
    if not is_superadmin_user(request):
        return Response({'success': False, 'message': 'Access denied: SuperAdmin only!'}, status=status.HTTP_403_FORBIDDEN)

    data = request.data
    username = (data.get('username') or '').strip()
    password = (data.get('password') or '').strip()
    email = (data.get('email') or '').strip()
    phone = (data.get('phone_number') or '').strip()
    firm_id = (data.get('firm_id') or '').strip().upper()
    role = data.get('role', 'Admin')
    is_staff = role in ['Admin', 'Manager', 'Staff'] or bool(data.get('is_staff', False))

    if not username:
        return Response({'success': False, 'message': 'Username is required!'}, status=400)
    if not password:
        return Response({'success': False, 'message': 'Password is required!'}, status=400)

    if User.objects.filter(username__iexact=username).exists():
        return Response({'success': False, 'message': f'Username "{username}" is already taken!'}, status=400)

    try:
        user = User.objects.create_user(
            username=username,
            email=email,
            password=password,
            is_staff=is_staff
        )
        if data.get('first_name'):
            user.first_name = data.get('first_name').strip()
        user.save()

        profile, _ = UserProfile.objects.get_or_create(user=user)
        profile.phone_number = phone
        profile.firm_id = firm_id if firm_id else None
        profile.save()

        return Response({
            'success': True,
            'message': f'User "{username}" created successfully for profile "{firm_id or "GLOBAL"}"!',
            'user': {
                'id': user.id,
                'username': user.username,
                'email': user.email,
                'phone_number': profile.phone_number,
                'firm_id': profile.firm_id or '',
                'role': 'Admin' if is_staff else 'Customer',
                'is_staff': user.is_staff
            }
        }, status=status.HTTP_201_CREATED)
    except Exception as e:
        return Response({'success': False, 'message': f'Error creating user: {str(e)}'}, status=500)


# ==========================================
# ✏️ 3. UPDATE USER & PROFILE DETAILS
# ==========================================
@api_view(['POST'])
@permission_classes([AllowAny])
def update_superadmin_user(request, user_id):
    if not is_superadmin_user(request):
        return Response({'success': False, 'message': 'Access denied: SuperAdmin only!'}, status=status.HTTP_403_FORBIDDEN)

    user = User.objects.filter(id=user_id).first()
    if not user:
        return Response({'success': False, 'message': 'User not found!'}, status=404)

    data = request.data
    profile, _ = UserProfile.objects.get_or_create(user=user)

    # 1. Update basic fields
    if 'email' in data:
        user.email = (data.get('email') or '').strip()
    if 'first_name' in data:
        user.first_name = (data.get('first_name') or '').strip()
    if 'is_active' in data:
        # Don't deactivate master superadmin
        if user.username.strip().lower() == 'shashi' and not data['is_active']:
            return Response({'success': False, 'message': 'Cannot deactivate master SuperAdmin account!'}, status=400)
        user.is_active = bool(data['is_active'])
    if 'is_staff' in data:
        user.is_staff = bool(data['is_staff'])
    elif 'role' in data:
        user.is_staff = data['role'] in ['Admin', 'Manager', 'Staff']

    # 2. Update password if provided
    new_password = (data.get('password') or '').strip()
    if new_password:
        user.set_password(new_password)

    user.save()

    # 3. Update profile fields
    if 'phone_number' in data:
        profile.phone_number = (data.get('phone_number') or '').strip()
    if 'firm_id' in data:
        val = (data.get('firm_id') or '').strip().upper()
        profile.firm_id = val if val else None
    profile.save()

    return Response({
        'success': True,
        'message': f'User "{user.username}" updated successfully!',
        'user': {
            'id': user.id,
            'username': user.username,
            'email': user.email,
            'phone_number': profile.phone_number,
            'firm_id': profile.firm_id or '',
            'is_staff': user.is_staff,
            'is_active': user.is_active
        }
    })


# ==========================================
# 🔑 4. RESET USER PASSWORD DIRECTLY
# ==========================================
@api_view(['POST'])
@permission_classes([AllowAny])
def reset_superadmin_password(request, user_id):
    if not is_superadmin_user(request):
        return Response({'success': False, 'message': 'Access denied: SuperAdmin only!'}, status=status.HTTP_403_FORBIDDEN)

    user = User.objects.filter(id=user_id).first()
    if not user:
        return Response({'success': False, 'message': 'User not found!'}, status=404)

    new_password = (request.data.get('password') or '').strip()
    if not new_password or len(new_password) < 4:
        return Response({'success': False, 'message': 'Password must be at least 4 characters!'}, status=400)

    user.set_password(new_password)
    user.save()

    return Response({
        'success': True,
        'message': f'Password for "{user.username}" has been successfully changed!'
    })


# ==========================================
# 🗑️ 5. DELETE USER
# ==========================================
@api_view(['POST'])
@permission_classes([AllowAny])
def delete_superadmin_user(request, user_id):
    if not is_superadmin_user(request):
        return Response({'success': False, 'message': 'Access denied: SuperAdmin only!'}, status=status.HTTP_403_FORBIDDEN)

    user = User.objects.filter(id=user_id).first()
    if not user:
        return Response({'success': False, 'message': 'User not found!'}, status=404)

    if user.username.strip().lower() == 'shashi':
        return Response({'success': False, 'message': 'Cannot delete master SuperAdmin (shashi) account!'}, status=400)

    username = user.username
    user.delete()

    return Response({
        'success': True,
        'message': f'User "{username}" deleted successfully!'
    })


# ==========================================
# 🏢 6. GET ALL FIRMS / STORES WITH STATS
# ==========================================
@api_view(['GET'])
@permission_classes([AllowAny])
def get_superadmin_firms(request):
    if not is_superadmin_user(request):
        return Response({'success': False, 'message': 'Access denied: SuperAdmin only!'}, status=status.HTTP_403_FORBIDDEN)

    firms = FirmProfile.objects.all().order_by('id')
    firm_list = []

    for f in firms:
        fid = f.firm_id.upper()
        user_count = UserProfile.objects.filter(firm_id__iexact=fid).count()
        sales_count = Sales.objects.filter(firm_id__iexact=fid).values('invoice').distinct().count()
        customers_count = Customers.objects.filter(firm_id__iexact=fid).count()

        firm_list.append({
            'id': f.id,
            'firm_id': f.firm_id,
            'subdomain': f.subdomain,
            'firm_name': f.firm_name,
            'proprietor_name': f.proprietor_name or '',
            'phone': f.phone_1 or '',
            'email': f.email or '',
            'is_active': f.is_active,
            'logo_url': f.logo.url if f.logo else '',
            'stats': {
                'user_count': user_count,
                'sales_count': sales_count,
                'customers_count': customers_count
            }
        })

    return Response({'success': True, 'firms': firm_list})


# ==========================================
# ⚡ 7. TOGGLE FIRM STATUS (ACTIVE / INACTIVE)
# ==========================================
@api_view(['POST'])
@permission_classes([AllowAny])
def toggle_firm_status(request, firm_id):
    if not is_superadmin_user(request):
        return Response({'success': False, 'message': 'Access denied: SuperAdmin only!'}, status=status.HTTP_403_FORBIDDEN)

    firm = FirmProfile.objects.filter(id=firm_id).first()
    if not firm:
        return Response({'success': False, 'message': 'Firm not found!'}, status=404)

    firm.is_active = not firm.is_active
    firm.save()

    return Response({
        'success': True,
        'message': f'Store "{firm.firm_name}" ({firm.subdomain}) is now {"ACTIVE" if firm.is_active else "INACTIVE"}!',
        'is_active': firm.is_active
    })


# ==========================================
# 📊 8. PLATFORM-WIDE SUPERADMIN STATS
# ==========================================
@api_view(['GET'])
@permission_classes([AllowAny])
def get_superadmin_stats(request):
    if not is_superadmin_user(request):
        return Response({'success': False, 'message': 'Access denied: SuperAdmin only!'}, status=status.HTTP_403_FORBIDDEN)

    total_stores = FirmProfile.objects.count()
    active_stores = FirmProfile.objects.filter(is_active=True).count()
    total_users = User.objects.count()
    admin_users = User.objects.filter(is_staff=True).count()
    total_bills = Sales.objects.values('firm_id', 'invoice').distinct().count()
    total_customers = Customers.objects.count()

    return Response({
        'success': True,
        'stats': {
            'total_stores': total_stores,
            'active_stores': active_stores,
            'total_users': total_users,
            'admin_users': admin_users,
            'total_bills': total_bills,
            'total_customers': total_customers
        }
    })


# ==========================================
# 📦 9. BULK SET FIRM STOCKS
# ==========================================
@api_view(['POST'])
@permission_classes([AllowAny])
def bulk_set_firm_stocks(request):
    if not is_superadmin_user(request):
        return Response({'success': False, 'message': 'Access denied: SuperAdmin only!'}, status=status.HTTP_403_FORBIDDEN)

    data = request.data or {}
    firm_id = (data.get('firm_id') or 'SHREE').strip().upper()
    try:
        qty = float(data.get('quantity', 100))
    except (ValueError, TypeError):
        qty = 100.0

    items = ItemMaster.objects.all()
    updated_count = 0

    for item in items:
        firm_num = item._resolve_firm_num(firm_id)
        setattr(item, f'available_quantity_{firm_num}', qty)
        if firm_num == 1:
            item.available_quantity = qty
            item.active_1 = '1'
        item.save()
        updated_count += 1

        t_clean = (item.tag_text or '').strip()
        if t_clean and t_clean != '-':
            stock_rec = StockForSale.objects.filter(tag_text=t_clean, firm_id__iexact=firm_id).first()
            if stock_rec:
                stock_rec.purchase_quantity = qty
                stock_rec.save()
            else:
                StockForSale.objects.create(
                    tag_text=t_clean,
                    groups=item.item_group or '',
                    item=item.item_name or '',
                    purchase_quantity=qty,
                    firm_id=firm_id
                )

    return Response({
        'success': True,
        'message': f'Firm {firm_id} ke sabhi {updated_count} products ka stock {qty} set kar diya gaya hai!',
        'count': updated_count,
        'firm_id': firm_id,
        'quantity': qty
    })

