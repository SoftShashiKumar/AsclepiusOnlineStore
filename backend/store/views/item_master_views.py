# E:\AsclepiusOnlineStore\backend\store\views\item_master_views.py
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework import status
from ..models import ItemMaster

# 1. ➕ MASTER RECORD SAVE YA UPDATE KARNE KI API
@csrf_exempt
@api_view(['POST'])
@permission_classes([AllowAny])
def save_or_update_master_item(request):
    try:
        data = request.data
        item_group = data.get('item_group', '').strip()
        item_name = data.get('item_name', '').strip()
        tag_text = data.get('tag_text', '').strip()
        
        if not item_group or not item_name or not tag_text:
            return Response({'success': False, 'message': 'Group, Item Name, aur Tag zaroori hain!'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Check karenge ki kya ye tag_text (unique) pehle se master me hai
        master_item = ItemMaster.objects.filter(tag_text=tag_text).first()
        
        mrp = data.get('mrp')
        dp = data.get('dp')
        sp = data.get('sp')
        reorder_level = data.get('reorder_level', 0)
        remarks = data.get('remarks', '').strip()

        # Handle empty strings for decimal fields
        mrp = float(mrp) if mrp else 0.0
        dp = float(dp) if dp else 0.0
        sp = float(sp) if sp else 0.0
        reorder_level = int(reorder_level) if reorder_level else 0

        if master_item:
            # Agar pehle se hai toh safety ke sath values overwrite honge
            master_item.item_group = item_group
            master_item.item_name = item_name
            master_item.mrp = mrp
            master_item.dp = dp
            master_item.sp = sp
            master_item.reorder_level = reorder_level
            master_item.remarks = remarks
            master_item.save()
            msg = "Master record successfully update ho gaya!"
        else:
            # Fresh entry ke liye naya record block create hoga
            ItemMaster.objects.create(
                item_group=item_group,
                item_name=item_name,
                tag_text=tag_text,
                mrp=mrp,
                dp=dp,
                sp=sp,
                reorder_level=reorder_level,
                remarks=remarks,
                available_quantity=0  # Initially stock 0 rahega
            )
            msg = "Naya Master record safely save ho gaya!"
            
        return Response({'success': True, 'message': msg}, status=status.HTTP_200_OK)
    except Exception as e:
        return Response({'success': False, 'message': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# 2. 🔍 ALL MASTER DATA FETCH API (Grid table me settings page par dikhane ke liye)
@api_view(['GET'])
@permission_classes([AllowAny])
def get_all_master_items(request):
    try:
        items = ItemMaster.objects.all().order_by('-id')
        data_list = []
        for item in items:
            data_list.append({
                'id': item.id,
                'item_group': item.item_group,
                'item_name': item.item_name or '',
                'tag_text': item.tag_text or '',
                'mrp': float(item.mrp) if item.mrp else 0,
                'dp': float(item.dp) if item.dp else 0,
                'sp': float(item.sp) if item.sp else 0,
                'available_quantity': float(item.available_quantity) if item.available_quantity else 0,
                'reorder_level': item.reorder_level,
                'remarks': item.remarks or ''
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
