# E:\AsclepiusOnlineStore\backend\store\views\item_master_views.py
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework import status
from ..models import ItemMaster, StockForSale, FirmProfile
from store.middleware import get_current_firm_id

def resolve_firm_num(firm_id_or_req):
    """Helper to get firm index number (1 for Shree, 2 for Demo, etc.)"""
    if hasattr(firm_id_or_req, 'GET') or hasattr(firm_id_or_req, 'headers'):
        firm_id = get_current_firm_id(firm_id_or_req)
    else:
        firm_id = str(firm_id_or_req)
        
    clean = str(firm_id).strip().upper()
    if clean in ['1', 'SHREE']:
        return 1
    if clean in ['2', 'DEMO']:
        return 2
    try:
        fp = FirmProfile.objects.filter(firm_id__iexact=clean).first()
        if fp and fp.id:
            return fp.id
    except Exception:
        pass
    return 1


# 1. ➕ MASTER RECORD SAVE YA UPDATE KARNE KI API (Shared Product Catalog)
@csrf_exempt
@api_view(['POST'])
@permission_classes([AllowAny])
def save_or_update_master_item(request):
    try:
        query_firm = request.data.get('firm_id') or request.GET.get('firm_id') or request.headers.get('X-Firm-ID')
        firm_id = query_firm.strip().upper() if query_firm else get_current_firm_id(request)
        firm_num = resolve_firm_num(firm_id)

        data = request.data
        item_group = data.get('item_group', '').strip()
        item_name = data.get('item_name', '').strip()
        tag_text = data.get('tag_text', '').strip()
        
        if not item_group or not item_name or not tag_text:
            return Response({'success': False, 'message': 'Group, Item Name, aur Tag zaroori hain!'}, status=status.HTTP_400_BAD_REQUEST)
        
        master_item = ItemMaster.objects.filter(tag_text=tag_text).first()
        
        mrp = data.get('mrp')
        dp = data.get('dp')
        sp = data.get('sp')
        reorder_level = data.get('reorder_level', 20)
        remarks = data.get('remarks', '').strip()
        flag1 = data.get('flag1')
        available_quantity = data.get('available_quantity')

        mrp = float(mrp) if mrp else 0.0
        dp = float(dp) if dp else 0.0
        sp = float(sp) if sp else 0.0
        reorder_level = int(reorder_level) if reorder_level else 20

        if master_item:
            master_item.item_group = item_group
            master_item.item_name = item_name
            master_item.mrp = mrp
            master_item.dp = dp
            master_item.sp = sp
            master_item.remarks = remarks

            # Firm-specific column updates
            setattr(master_item, f'reorder_level_{firm_num}', reorder_level)
            if flag1 is not None:
                setattr(master_item, f'active_{firm_num}', str(flag1).strip())
            if available_quantity is not None:
                setattr(master_item, f'available_quantity_{firm_num}', float(available_quantity))

            if firm_num == 1:
                master_item.reorder_level = reorder_level
                if flag1 is not None:
                    master_item.flag1 = str(flag1).strip()
                if available_quantity is not None:
                    master_item.available_quantity = float(available_quantity)

            master_item.save()
            msg = "Master record successfully update ho gaya!"
        else:
            flag1_val = str(flag1).strip() if flag1 is not None else '1'
            avail_q_val = float(available_quantity) if available_quantity is not None else 0.0

            master_item = ItemMaster(
                item_group=item_group,
                item_name=item_name,
                tag_text=tag_text,
                mrp=mrp,
                dp=dp,
                sp=sp,
                reorder_level=reorder_level,
                remarks=remarks,
                available_quantity=avail_q_val if firm_num == 1 else 0.0,
                flag1=flag1_val,
                firm_id='COMMON'
            )
            setattr(master_item, f'reorder_level_{firm_num}', reorder_level)
            setattr(master_item, f'active_{firm_num}', flag1_val)
            setattr(master_item, f'available_quantity_{firm_num}', avail_q_val)
            master_item.save()
            msg = "Naya Master record safely save ho gaya!"
            
        return Response({'success': True, 'message': msg}, status=status.HTTP_200_OK)
    except Exception as e:
        return Response({'success': False, 'message': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# 2. 🔍 ALL MASTER DATA FETCH API (Shared Catalog, Firm-Scoped Stock Quantity)
@api_view(['GET'])
@permission_classes([AllowAny])
def get_all_master_items(request):
    try:
        query_firm = request.GET.get('firm_id') or request.headers.get('X-Firm-ID')
        firm_id = query_firm.strip().upper() if query_firm else get_current_firm_id(request)
        firm_num = resolve_firm_num(firm_id)
        flag1 = request.GET.get('flag1', '').strip()
        
        items = ItemMaster.objects.all().order_by('-id')

        data_list = []
        for item in items:
            t = (item.tag_text or '').strip()
            item_flag1 = item.get_firm_active(firm_num)
            avail_q = item.get_firm_stock(firm_num)
            reorder_q = item.get_firm_reorder(firm_num)

            if flag1 and str(item_flag1) != str(flag1):
                continue

            data_list.append({
                'id': item.id,
                'item_group': item.item_group,
                'item_name': item.item_name or '',
                'tag_text': t,
                'mrp': float(item.mrp) if item.mrp else 0,
                'dp': float(item.dp) if item.dp else 0,
                'sp': float(item.sp) if item.sp else 0,
                'available_quantity': avail_q,
                'reorder_level': reorder_q,
                'remarks': item.remarks or '',
                'flag1': item_flag1
            })

        return Response({'success': True, 'data': data_list}, status=status.HTTP_200_OK)
    except Exception as e:
        return Response({'success': False, 'message': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([AllowAny])
def get_dropdown_master_data(request):
    try:
        unique_groups = list(ItemMaster.objects.values_list('item_group', flat=True).distinct())
        unique_groups = sorted([g for g in unique_groups if g])
        
        unique_items = list(ItemMaster.objects.values_list('item_name', flat=True).distinct())
        unique_items = sorted([i for i in unique_items if i])
        
        return Response({
            'success': True,
            'groups': unique_groups,
            'items': unique_items
        }, status=status.HTTP_200_OK)
    except Exception as e:
        return Response({'success': False, 'message': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# 4. 🚩 PRODUCT VISIBILITY TOGGLE (Firm Scoped Active1, Active2...)
@csrf_exempt
@api_view(['POST'])
@permission_classes([AllowAny])
def update_item_flag(request):
    try:
        query_firm = request.data.get('firm_id') or request.GET.get('firm_id') or request.headers.get('X-Firm-ID')
        firm_id = query_firm.strip().upper() if query_firm else get_current_firm_id(request)
        firm_num = resolve_firm_num(firm_id)

        data = request.data
        item_id = data.get('id')
        tag_text = data.get('tag_text')
        flag1 = data.get('flag1')

        if flag1 in [True, 1, '1', 'true', 'True']:
            flag1_val = '1'
        else:
            flag1_val = '0'

        master_item = None
        if item_id:
            master_item = ItemMaster.objects.filter(id=item_id).first()
        elif tag_text:
            master_item = ItemMaster.objects.filter(tag_text=str(tag_text).strip()).first()

        if not master_item:
            return Response({'success': False, 'message': 'Item Master record nahi mila!'}, status=status.HTTP_404_NOT_FOUND)

        # Update firm-specific column Active{firm_num} directly in item_master
        setattr(master_item, f'active_{firm_num}', flag1_val)
        if firm_num == 1:
            master_item.flag1 = flag1_val
        master_item.save()

        # Also update StockForSale for consistency
        tag_str = master_item.tag_text or str(tag_text).strip()
        StockForSale.objects.filter(tag_text=tag_str, firm_id__iexact=firm_id).update(flag1=flag1_val)

        return Response({
            'success': True,
            'message': f"Item '{master_item.item_name or master_item.tag_text}' ka Flag1 '{flag1_val}' ({firm_id}) update ho gaya!",
            'id': master_item.id,
            'tag_text': master_item.tag_text,
            'flag1': flag1_val
        }, status=status.HTTP_200_OK)
    except Exception as e:
        return Response({'success': False, 'message': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
