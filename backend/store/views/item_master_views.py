# E:\AsclepiusOnlineStore\backend\store\views\item_master_views.py
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework import status
from ..models import ItemMaster, StockForSale
from store.middleware import get_current_firm_id

# 1. ➕ MASTER RECORD SAVE YA UPDATE KARNE KI API (Shared Product Catalog)
@csrf_exempt
@api_view(['POST'])
@permission_classes([AllowAny])
def save_or_update_master_item(request):
    try:
        firm_id = get_current_firm_id(request)
        data = request.data
        item_group = data.get('item_group', '').strip()
        item_name = data.get('item_name', '').strip()
        tag_text = data.get('tag_text', '').strip()
        
        if not item_group or not item_name or not tag_text:
            return Response({'success': False, 'message': 'Group, Item Name, aur Tag zaroori hain!'}, status=status.HTTP_400_BAD_REQUEST)
        
        # ItemMaster is a shared product catalog across firms
        master_item = ItemMaster.objects.filter(tag_text=tag_text).first()
        
        mrp = data.get('mrp')
        dp = data.get('dp')
        sp = data.get('sp')
        reorder_level = data.get('reorder_level', 0)
        remarks = data.get('remarks', '').strip()
        flag1 = data.get('flag1')

        mrp = float(mrp) if mrp else 0.0
        dp = float(dp) if dp else 0.0
        sp = float(sp) if sp else 0.0
        reorder_level = int(reorder_level) if reorder_level else 0

        if master_item:
            master_item.item_group = item_group
            master_item.item_name = item_name
            master_item.mrp = mrp
            master_item.dp = dp
            master_item.sp = sp
            master_item.reorder_level = reorder_level
            master_item.remarks = remarks
            if flag1 is not None:
                master_item.flag1 = str(flag1).strip()
            master_item.save()
            msg = "Master record successfully update ho gaya!"
        else:
            flag1_val = str(flag1).strip() if flag1 is not None else '1'
            ItemMaster.objects.create(
                item_group=item_group,
                item_name=item_name,
                tag_text=tag_text,
                mrp=mrp,
                dp=dp,
                sp=sp,
                reorder_level=reorder_level,
                remarks=remarks,
                available_quantity=0,
                flag1=flag1_val,
                firm_id='COMMON'
            )
            msg = "Naya Master record safely save ho gaya!"
            
        return Response({'success': True, 'message': msg}, status=status.HTTP_200_OK)
    except Exception as e:
        return Response({'success': False, 'message': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# 2. 🔍 ALL MASTER DATA FETCH API (Shared Catalog, Firm-Scoped Stock Quantity)
@api_view(['GET'])
@permission_classes([AllowAny])
def get_all_master_items(request):
    try:
        firm_id = get_current_firm_id(request)
        flag1 = request.GET.get('flag1', '').strip()
        
        # All items are common across firms
        items = ItemMaster.objects.all().order_by('-id')
        if flag1:
            items = items.filter(flag1=flag1)

        # Stock & flag1 are scoped to the requesting firm
        from django.db.models import Sum
        qty_aggregates = (
            StockForSale.objects.filter(firm_id=firm_id)
            .values('tag_text')
            .annotate(total_qty=Sum('purchase_quantity'))
        )
        tag_qty_map = {
            r['tag_text'].strip(): float(r['total_qty'] or 0)
            for r in qty_aggregates if r['tag_text']
        }

        # Map firm-specific flag1
        firm_stock_rows = StockForSale.objects.filter(firm_id=firm_id).order_by('-sl_no')
        flag_map = {}
        for s in firm_stock_rows:
            st = (s.tag_text or '').strip()
            if st and st not in flag_map and s.flag1 is not None:
                flag_map[st] = str(s.flag1).strip()

        data_list = []
        for item in items:
            t = (item.tag_text or '').strip()
            
            # Firm-specific stock quantity calculation
            avail_q = 0.0
            if t in tag_qty_map:
                avail_q = tag_qty_map[t]
            elif firm_id == 'SHREE' and item.available_quantity is not None:
                avail_q = float(item.available_quantity or 0)

            # Firm-specific flag1 (defaults to '1' if firm has not hidden it)
            item_flag1 = flag_map.get(t, str(item.flag1 or '1').strip())

            data_list.append({
                'id': item.id,
                'item_group': item.item_group,
                'item_name': item.item_name or '',
                'tag_text': t,
                'mrp': float(item.mrp) if item.mrp else 0,
                'dp': float(item.dp) if item.dp else 0,
                'sp': float(item.sp) if item.sp else 0,
                'available_quantity': avail_q,
                'reorder_level': item.reorder_level,
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
        unique_names = list(ItemMaster.objects.values_list('item_name', flat=True).distinct())
        unique_names = [name for name in unique_names if name]

        return Response({
            'success': True,
            'groups': unique_groups,
            'itemNames': unique_names
        }, status=status.HTTP_200_OK)
    except Exception as e:
        return Response({'success': False, 'message': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# 3. 🚩 UPDATE FLAG1 STATUS API (Firm Scoped Visibility)
@csrf_exempt
@api_view(['POST'])
@permission_classes([AllowAny])
def update_item_flag(request):
    try:
        firm_id = get_current_firm_id(request)
        data = request.data
        tag_text = data.get('tag_text') or data.get('tagText') or data.get('tagId')
        item_id = data.get('id')
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

        # Update flag1 in StockForSale STRICTLY FOR THIS FIRM
        tag_str = master_item.tag_text or str(tag_text).strip()
        stock_records = StockForSale.objects.filter(tag_text=tag_str, firm_id=firm_id)
        if stock_records.exists():
            stock_records.update(flag1=flag1_val)
        else:
            # Create a placeholder StockForSale record so this firm's hide/show choice is persisted
            StockForSale.objects.create(
                tag_text=tag_str,
                groups=master_item.item_group,
                item=master_item.item_name,
                purchase_quantity=0,
                flag1=flag1_val,
                firm_id=firm_id
            )

        return Response({
            'success': True,
            'message': f"Item '{master_item.item_name or master_item.tag_text}' ka Flag1 '{flag1_val}' ({firm_id}) update ho gaya!",
            'id': master_item.id,
            'tag_text': master_item.tag_text,
            'flag1': flag1_val
        }, status=status.HTTP_200_OK)
    except Exception as e:
        return Response({'success': False, 'message': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
