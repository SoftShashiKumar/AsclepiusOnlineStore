import json
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework import status
from django.db.models import Q
from ..models import StockForSale, StockImages, OfferBanner, ItemMaster, FirmProfile
from store.middleware import get_current_firm_id, get_current_firm_profile
import os
from django.conf import settings
from PIL import Image
from io import BytesIO
from django.core.files.uploadedfile import InMemoryUploadedFile

# =====================================================================
# 1. 🔍 GET STOCK BY TAG (Scoped to Active Firm)
# =====================================================================
@api_view(['GET'])
@permission_classes([AllowAny])
def get_stock_by_tag(request):
    tag = request.GET.get('tag', '').strip()
    if not tag:
        return JsonResponse({'status': 'error', 'message': 'Tag ID khali hai!'}, status=400)
    
    firm_id = get_current_firm_id(request)
    
    try:
        item = StockForSale.objects.filter(tag_text=tag, firm_id=firm_id).first()
        if not item:
            return JsonResponse({'status': 'error', 'message': 'Invalid Tag ID'}, status=404)
        
        if getattr(item, 'current_status', None) and item.current_status != 'Available':
            return JsonResponse({
                'status': 'sold_error', 
                'message': f'Item is already sold! (Current Status: {item.current_status})'
            }, status=400)
            
        img_url = ""
        if item.item_image:
            img_url = str(item.item_image)

        return JsonResponse({
            'status': 'success',
            'purchaseBillNo': item.purchase_v_no or '',
            'itemGroup': item.groups or '',
            'itemName': item.item or '',
            'tagText': item.tag_text,
            'remarks': item.remarks or '',
            'quantity': float(item.purchase_quantity) if item.purchase_quantity else 0.0,
            'image': img_url,
        }, status=200)

    except Exception as e:
        return JsonResponse({'status': 'error', 'message': str(e)}, status=500)

# =====================================================================
# 2. 🔄 SINGLE STOCK UPDATE API
# =====================================================================
@csrf_exempt
@api_view(['POST'])
@permission_classes([AllowAny])
def update_single_stock(request):
    try:
        data = request.data
        tag = data.get('tagText', '').strip()
        firm_id = get_current_firm_id(request)
        
        if not tag:
            return JsonResponse({'success': False, 'message': 'Tag ID missing hai!'}, status=400)
            
        stock_list = StockForSale.objects.filter(tag_text=tag, firm_id=firm_id).order_by('-sl_no')
        
        if not stock_list.exists():
            return JsonResponse({'success': False, 'message': 'Item database me nahi mila!'}, status=404)
        
        stock = stock_list.first()
        old_quantity = float(stock.purchase_quantity or 0)
        
        new_group = data.get('itemGroup', '')
        new_name = data.get('itemName', '')
        new_quantity = float(data.get('quantity', 0) or 0)
        mrp = float(data.get('mrp', 0) or 0)
        dp = float(data.get('dp', 0) or 0)
        sp = float(data.get('sp', 0) or 0)

        # Update StockForSale
        stock.purchase_v_no = data.get('purchaseBillNo', '')
        stock.groups = new_group
        stock.item = new_name
        stock.purchase_quantity = new_quantity
        stock.remarks = data.get('remarks', '')
        stock.firm_id = firm_id
        stock.save() 

        # Update Master Table
        master_item = ItemMaster.objects.filter(tag_text=tag, firm_id=firm_id).first()
        if master_item:
            master_item.available_quantity = float(master_item.available_quantity or 0) - old_quantity + new_quantity
            master_item.item_group = new_group
            master_item.item_name = new_name
            master_item.mrp = mrp
            master_item.dp = dp
            master_item.sp = sp
            master_item.firm_id = firm_id
            master_item.save()
        else:
            ItemMaster.objects.create(
                tag_text=tag,
                item_group=new_group,
                item_name=new_name,
                available_quantity=new_quantity,
                mrp=mrp, dp=dp, sp=sp,
                firm_id=firm_id
            )
        
        return JsonResponse({'success': True, 'message': f'Tag {tag} successfully update ho gaya!'}, status=200)
        
    except Exception as e:
        return JsonResponse({'success': False, 'message': str(e)}, status=500)


# =====================================================================
# 3. 🔢 AUTOMATIC NEXT TAG ID VIEW (Firm Scoped)
# =====================================================================
def get_next_tag_id(request):
    try:
        firm_id = get_current_firm_id(request)
        all_tags = StockForSale.objects.filter(firm_id=firm_id).values_list('tag_text', flat=True)
        numeric_tags = [int(t) for t in all_tags if t and str(t).isdigit()]
        next_id = max(numeric_tags) + 1 if numeric_tags else 1
        formatted_id = str(next_id).zfill(5)
        return JsonResponse({'success': True, 'next_tag_id': formatted_id})
    except Exception as e:
        return JsonResponse({'success': False, 'message': str(e)})


# =====================================================================
# 4. 📦 BULK STOCK SAVE VIEW (Firm Scoped)
# =====================================================================
@csrf_exempt
def save_bulk_stock(request):
    if request.method == 'POST':
        try:
            firm_id = get_current_firm_id(request)
            data = json.loads(request.body)
            items = data.get('items', [])
            
            for row in items:
                tag_text = row.get('tagText', '').strip()
                item_group = row.get('itemGroup', '').strip()
                item_name = row.get('itemName', '').strip()
                purchase_quantity = float(row.get('quantity', 0) or 0)
                mrp = float(row.get('mrp', 0) or 0)
                dp = float(row.get('dp', 0) or 0)
                sp = float(row.get('sp', 0) or 0)

                # Save transaction in StockForSale
                StockForSale.objects.create(
                    purchase_v_no=row.get('purchaseBillNo', ''),
                    tag_text=tag_text,
                    groups=item_group,
                    item=item_name,
                    purchase_quantity=purchase_quantity,
                    remarks=row.get('remarks', ''),
                    firm_id=firm_id
                )

                # Update ItemMaster quantities and prices
                master_item = ItemMaster.objects.filter(tag_text=tag_text, firm_id=firm_id).first()
                if master_item:
                    master_item.available_quantity = float(master_item.available_quantity or 0) + purchase_quantity
                    master_item.mrp = mrp
                    master_item.dp = dp
                    master_item.sp = sp
                    master_item.firm_id = firm_id
                    master_item.save()
                else:
                    ItemMaster.objects.create(
                        tag_text=tag_text,
                        item_group=item_group,
                        item_name=item_name,
                        available_quantity=purchase_quantity,
                        mrp=mrp,
                        dp=dp,
                        sp=sp,
                        reorder_level=20,
                        firm_id=firm_id
                    )

            return JsonResponse({'success': True, 'message': 'Saara Bulk Stock save aur Item Master update ho gaya!'})
        except Exception as e:
            return JsonResponse({'success': False, 'message': str(e)}, status=400)


# =====================================================================
# 5. 📋 TAGWISE STOCK REPORT (Firm Scoped)
# =====================================================================
@api_view(['GET'])
@permission_classes([AllowAny])
def get_tagwise_stock_report(request):
    try:
        firm_id = get_current_firm_id(request)
        group = request.GET.get('group', '').strip()
        item_name = request.GET.get('item', '').strip()
        tag = request.GET.get('tag', '').strip()
        flag1 = request.GET.get('flag1', '').strip()

        filters = Q(firm_id=firm_id)
        if group and group.lower() != 'all':
            filters &= Q(item_group__iexact=group)
        if item_name and item_name.lower() != 'all':
            filters &= Q(item_name__iexact=item_name)
        if tag and tag.lower() != 'all':
            filters &= Q(tag_text__iexact=tag)
        if flag1:
            filters &= Q(flag1=flag1)

        master_records = ItemMaster.objects.filter(filters).order_by('item_group', 'item_name')

        report_data = []
        for item in master_records:
            img_url = None
            angle_images = []
            
            stock_record = StockForSale.objects.filter(tag_text=item.tag_text, firm_id=firm_id).first()
            if stock_record:
                if stock_record.item_image:
                    img_url = request.build_absolute_uri(stock_record.item_image.url)
                for pic in stock_record.multiple_images.all():
                    if pic.image:
                        angle_images.append(request.build_absolute_uri(pic.image.url))

            qty = float(item.available_quantity or 0)
            status_text = 'Available' if qty > 0 else 'Sold'
            
            report_data.append({
                'id': item.id,
                'tagId': str(item.tag_text or ''),          
                'itemName': str(item.item_name or ''),           
                'group': str(item.item_group or ''),
                'mrp': float(item.mrp or 0),
                'dp': float(item.dp or 0),
                'sp': float(item.sp or 0),
                'available_quantity': qty,
                'status': status_text, 
                'remarks': str(item.remarks or ''),
                'imageUrl': img_url,  
                'angleUrls': angle_images,
                'flag1': str(item.flag1 or '0').strip()
            })

        return Response({'success': True, 'data': report_data}, status=status.HTTP_200_OK)
    except Exception as e:
        return Response({'success': False, 'message': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# =====================================================================
# 6. 📸 IMAGE MANAGEMENT WITH WATERMARKING INTEGRATED (Firm Scoped)
# =====================================================================
def apply_shop_watermark_in_memory(uploaded_file, request=None):
    try:
        firm_profile = get_current_firm_profile(request) if request else FirmProfile.objects.first()
        
        if firm_profile and firm_profile.logo and os.path.exists(firm_profile.logo.path):
            logo_path = firm_profile.logo.path
        else:
            logo_path = os.path.join(settings.BASE_DIR, 'logo.png')

        if not os.path.exists(logo_path):
            return uploaded_file
            
        img = Image.open(uploaded_file)
        logo = Image.open(logo_path)

        if img.mode != 'RGBA':
            img = img.convert('RGBA')
        if logo.mode != 'RGBA':
            logo = logo.convert('RGBA')

        img_w, img_h = img.size
        logo_target_width = int(img_w * 0.15)
        
        w_percent = (logo_target_width / float(logo.size[0]))
        logo_target_height = int((float(logo.size[1]) * float(w_percent)))
        logo_resized = logo.resize((logo_target_width, logo_target_height), Image.Resampling.LANCZOS)

        padding = 12
        x_offset = img_w - logo_target_width - padding
        y_offset = padding

        img.paste(logo_resized, (x_offset, y_offset), logo_resized)

        output = BytesIO()
        file_ext = os.path.splitext(uploaded_file.name)[1].lower()
        if file_ext in ['.jpg', '.jpeg']:
            img = img.convert('RGB')
            img.save(output, format='JPEG', quality=95)
        else:
            img.save(output, format='PNG')
        
        output.seek(0)
        return InMemoryUploadedFile(
            output, 
            'ImageField', 
            uploaded_file.name, 
            uploaded_file.content_type, 
            output.tell(), 
            None
        )

    except Exception as e:
        print(f"💥 Watermark engine error: {str(e)}")
        return uploaded_file


@csrf_exempt
def upload_stock_image(request):
    if request.method == 'POST':
        try:
            firm_id = get_current_firm_id(request)
            tag_text = request.POST.get('tag_text', '').strip()
            uploaded_files = request.FILES.getlist('item_images')

            if not tag_text or not uploaded_files:
                return JsonResponse({'success': False, 'message': 'Tag ID ya Images missing hain!'}, status=400)

            try:
                stock_item = StockForSale.objects.filter(tag_text=tag_text, firm_id=firm_id).first()
                if not stock_item:
                    master_item = ItemMaster.objects.filter(tag_text=tag_text, firm_id=firm_id).first()
                    stock_item = StockForSale.objects.create(
                        tag_text=tag_text,
                        groups=master_item.item_group if master_item else '',
                        item=master_item.item_name if master_item else '',
                        purchase_quantity=0,
                        firm_id=firm_id
                    )
                
                files_for_angles = uploaded_files
                
                if not stock_item.item_image:
                    stock_item.item_image = uploaded_files[0]
                    stock_item.firm_id = firm_id
                    stock_item.save()
                    files_for_angles = uploaded_files[1:]
                
                for file in files_for_angles:
                    StockImages.objects.create(stock_item=stock_item, image=file, firm_id=firm_id)

                return JsonResponse({'success': True, 'message': f'Tag {tag_text} ke liye kul {len(uploaded_files)} photos save ho gayi hain!'})
            except Exception as e:
                return JsonResponse({'success': False, 'message': str(e)}, status=500)
        except Exception as e:
            return JsonResponse({'success': False, 'message': str(e)}, status=500)

@csrf_exempt
def delete_single_stock_image(request):
    if request.method == 'POST':
        try:
            firm_id = get_current_firm_id(request)
            data = json.loads(request.body)
            tag_text = data.get('tag_text', '').strip()
            image_url = data.get('image_url', '').strip()

            if not tag_text or not image_url:
                return JsonResponse({'success': False, 'message': 'Tag ID ya Image URL missing hai!'}, status=400)

            try:
                stock_item = StockForSale.objects.filter(tag_text=tag_text, firm_id=firm_id).first()
                if not stock_item:
                    return JsonResponse({'success': False, 'message': 'Tag ID nahi mili!'}, status=404)
                    
                image_deleted = False

                if stock_item.item_image and image_url.endswith(stock_item.item_image.url):
                    stock_item.item_image.delete(save=False)
                    stock_item.item_image = None
                    stock_item.save()
                    image_deleted = True
                    
                    first_remaining_angle = stock_item.multiple_images.first()
                    if first_remaining_angle:
                        stock_item.item_image = first_remaining_angle.image
                        stock_item.save()
                        first_remaining_angle.delete()
                else:
                    angles = stock_item.multiple_images.all()
                    for angle in angles:
                        if angle.image and image_url.endswith(angle.image.url):
                            angle.image.delete(save=False)
                            angle.delete()
                            image_deleted = True
                            break

                if image_deleted:
                    return JsonResponse({'success': True, 'message': 'Photo delete ho gayi!'})
                else:
                    return JsonResponse({'success': False, 'message': 'Photo database me match nahi hui!'}, status=404)
            except Exception as e:
                return JsonResponse({'success': False, 'message': str(e)}, status=500)
        except Exception as e:
            return JsonResponse({'success': False, 'message': str(e)}, status=500)


# =====================================================================
# 7. 📢 OFFER BANNER ROUTES (Firm Scoped)
# =====================================================================
@api_view(['GET'])
@permission_classes([AllowAny])
def get_active_offer(request):  
    try:
        firm_id = get_current_firm_id(request)
        offer = OfferBanner.objects.filter(firm_id=firm_id).last()
        if offer:
            return Response({'success': True, 'offer_text': offer.offer_text, 'is_active': offer.is_active}, status=status.HTTP_200_OK)
        return Response({'success': True, 'offer_text': '', 'is_active': False}, status=status.HTTP_200_OK)
    except Exception as e:
        return Response({'success': False, 'message': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@csrf_exempt
@api_view(['POST'])
@permission_classes([AllowAny])
def update_offer_from_frontend(request):  
    try:
        firm_id = get_current_firm_id(request)
        data = request.data
        new_text = data.get('offer_text', '').strip()
        new_status = data.get('is_active', False)

        offer = OfferBanner.objects.filter(firm_id=firm_id).last()
        if offer:
            offer.offer_text = new_text
            offer.is_active = new_status
            offer.save()
        else:
            OfferBanner.objects.create(offer_text=new_text, is_active=new_status, firm_id=firm_id)

        return Response({'success': True, 'message': 'Offer successfully update ho gaya!'}, status=status.HTTP_200_OK)
    except Exception as e:
        return Response({'success': False, 'message': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

# =====================================================================
# 8. 🛍️ SALES CATALOG API (Firm Scoped)
# =====================================================================
@api_view(['GET'])
@permission_classes([AllowAny])
def get_sales_catalog(request):
    try:
        firm_id = get_current_firm_id(request)
        stock_items = StockForSale.objects.filter(firm_id=firm_id).order_by('-sl_no')
        
        master_map = {}
        for m in ItemMaster.objects.filter(firm_id=firm_id):
            t = (m.tag_text or '').strip()
            if t and t != '-':
                master_map[t] = m

        seen_tags = set()
        catalog_items = []

        for s in stock_items:
            tag = (s.tag_text or '').strip()
            if not tag or tag == '-' or tag in seen_tags:
                continue
            seen_tags.add(tag)

            master = master_map.get(tag)

            if master and master.available_quantity is not None:
                avail_qty = float(master.available_quantity)
            else:
                avail_qty = float(s.purchase_quantity or 0)

            if avail_qty <= 0:
                continue

            catalog_items.append({
                'tag_text': tag,
                'item_group': (master.item_group if master and master.item_group else s.groups) or '-',
                'item_name': (master.item_name if master and master.item_name else s.item) or '-',
                'mrp': float(master.mrp) if master and master.mrp else 0.0,
                'dp': float(master.dp) if master and master.dp else 0.0,
                'sp': float(master.sp) if master and master.sp else 0.0,
                'available_quantity': avail_qty,
                'remarks': s.remarks or (master.remarks if master else '') or '',
            })

        return Response({'success': True, 'data': catalog_items}, status=status.HTTP_200_OK)
    except Exception as e:
        return Response({'success': False, 'message': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
