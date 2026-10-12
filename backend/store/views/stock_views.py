import json
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework import status
from django.db.models import Q
from ..models import StockForSale, StockImages, OfferBanner, ItemMaster, FirmProfile
import os
from django.conf import settings
from PIL import Image

@api_view(['GET'])
@permission_classes([AllowAny])
def get_stock_by_tag(request):
    tag = request.GET.get('tag', '').strip()
    if not tag:
        return JsonResponse({'status': 'error', 'message': 'Tag ID khali hai!'}, status=400)
    
    try:
        item = StockForSale.objects.get(tag_text=tag)
        
        if item.current_status != 'Available':
            return JsonResponse({
                'status': 'sold_error', 
                'message': f'Item is already sold! (Current Status: {item.current_status})'
            }, status=400)
            
        # 🟢 IMAGE PATH FETCH LOGIC
        img_url = ""
        if item.item_image:
            img_url = str(item.item_image) # Database ka exact path (e.g., 'stock_photos/angles/2.jpeg')

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

    except StockForSale.DoesNotExist:
        # return JsonResponse({'status': 'error', 'message': f'Yeh Tag ID ({tag}) stock me nahi mili!'}, status=404)
        return JsonResponse({'status': 'error', 'message': 'Invalid Tag ID'}, status=404)

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
        
        if not tag:
            return JsonResponse({'success': False, 'message': 'Tag ID missing hai!'}, status=400)
            
        stock_list = StockForSale.objects.filter(tag_text=tag).order_by('-sl_no')
        
        if not stock_list.exists():
            return JsonResponse({'success': False, 'message': 'Item database me nahi mila!'}, status=404)
        
        stock = stock_list.first() # Getting the most recent entry for this tag
        old_quantity = float(stock.purchase_quantity or 0)
        
        # New details
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
        stock.save() 

        # Update Master Table (reverse old, add new quantity, update prices)
        master_item = ItemMaster.objects.filter(tag_text=tag).first()
        if master_item:
            master_item.available_quantity = float(master_item.available_quantity or 0) - old_quantity + new_quantity
            master_item.item_group = new_group
            master_item.item_name = new_name
            master_item.mrp = mrp
            master_item.dp = dp
            master_item.sp = sp
            master_item.save()
        else:
            ItemMaster.objects.create(
                tag_text=tag,
                item_group=new_group,
                item_name=new_name,
                available_quantity=new_quantity,
                mrp=mrp, dp=dp, sp=sp
            )
        
        return JsonResponse({'success': True, 'message': f'Tag {tag} successfully update ho gaya!'}, status=200)
        
    except Exception as e:
        return JsonResponse({'success': False, 'message': str(e)}, status=500)


# =====================================================================
# 3. 🔢 AUTOMATIC NEXT TAG ID VIEW
# =====================================================================
def get_next_tag_id(request):
    try:
        all_tags = StockForSale.objects.values_list('tag_text', flat=True)
        numeric_tags = [int(t) for t in all_tags if t.isdigit()]
        next_id = max(numeric_tags) + 1 if numeric_tags else 1
        formatted_id = str(next_id).zfill(5)
        return JsonResponse({'success': True, 'next_tag_id': formatted_id})
    except Exception as e:
        return JsonResponse({'success': False, 'message': str(e)})


# =====================================================================
# 4. 📦 BULK STOCK SAVE VIEW
# =====================================================================
@csrf_exempt
def save_bulk_stock(request):
    if request.method == 'POST':
        try:
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
                    remarks=row.get('remarks', '')
                )

                # Update ItemMaster quantities and prices
                master_item = ItemMaster.objects.filter(tag_text=tag_text).first()
                if master_item:
                    master_item.available_quantity = float(master_item.available_quantity or 0) + purchase_quantity
                    master_item.mrp = mrp
                    master_item.dp = dp
                    master_item.sp = sp
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
                        reorder_level=20
                    )

            return JsonResponse({'success': True, 'message': 'Saara Bulk Stock save aur Item Master update ho gaya!'})
        except Exception as e:
            return JsonResponse({'success': False, 'message': str(e)}, status=400)


# =====================================================================
# 5. 📋 TAGWISE STOCK REPORT
# =====================================================================
@api_view(['GET'])
@permission_classes([AllowAny])
def get_tagwise_stock_report(request):
    try:
        group = request.GET.get('group', '').strip()
        item_name = request.GET.get('item', '').strip()
        tag = request.GET.get('tag', '').strip()

        filters = Q()
        if group and group.lower() != 'all':
            filters &= Q(item_group__iexact=group)
        if item_name and item_name.lower() != 'all':
            filters &= Q(item_name__iexact=item_name)
        if tag and tag.lower() != 'all':
            filters &= Q(tag_text__iexact=tag)

        master_records = ItemMaster.objects.filter(filters).order_by('item_group', 'item_name')

        report_data = []
        for item in master_records:
            img_url = None
            angle_images = []
            
            # Fetch images from the first StockForSale entry of this tag
            stock_record = StockForSale.objects.filter(tag_text=item.tag_text).first()
            if stock_record:
                if stock_record.item_image:
                    img_url = request.build_absolute_uri(stock_record.item_image.url)
                for pic in stock_record.multiple_images.all():
                    if pic.image:
                        angle_images.append(request.build_absolute_uri(pic.image.url))

            qty = float(item.available_quantity or 0)
            status_text = 'Available' if qty > 0 else 'Sold'
            
            report_data.append({
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
                'angleUrls': angle_images 
            })

        return Response({'success': True, 'data': report_data}, status=status.HTTP_200_OK)
    except Exception as e:
        return Response({'success': False, 'message': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# =====================================================================
# 6. 📸 IMAGE MANAGEMENT
# =====================================================================
# @csrf_exempt
# def upload_stock_image(request):
#     if request.method == 'POST':
#         try:
#             tag_text = request.POST.get('tag_text', '').strip()
#             uploaded_files = request.FILES.getlist('item_images') 

#             if not tag_text or not uploaded_files:
#                 return JsonResponse({'success': False, 'message': 'Tag ID ya Images missing hain!'}, status=400)

#             try:
#                 stock_item = StockForSale.objects.get(tag_text=tag_text)
#                 if not stock_item.item_image:
#                     stock_item.item_image = uploaded_files[0]
#                     stock_item.save()
                
#                 for file in uploaded_files:
#                     StockImages.objects.create(stock_item=stock_item, image=file)

#                 return JsonResponse({'success': True, 'message': f'Tag {tag_text} ke liye kul {len(uploaded_files)} photos save ho gayi hain!'})
#             except StockForSale.DoesNotExist:
#                 return JsonResponse({'success': False, 'message': 'Tag ID database mein nahi mili!'}, status=404)
#         except Exception as e:
#             return JsonResponse({'success': False, 'message': str(e)}, status=500)

# =====================================================================
# 🛡️ HELPER FUNCTION: WATERMARK APPLIER (FREE USING PILLOW)
# =====================================================================
# =====================================================================
# 🛡️ UPDATED BULLETPROOF WATERMARK APPLIER (PILLOW DYNAMIC LOGO)
# =====================================================================
from io import BytesIO
from django.core.files.uploadedfile import InMemoryUploadedFile

def apply_shop_watermark_in_memory(uploaded_file):
    try:
        firm_profile = FirmProfile.objects.first()
        
        # Determine logo path
        if firm_profile and firm_profile.logo and os.path.exists(firm_profile.logo.path):
            logo_path = firm_profile.logo.path
        else:
            logo_path = os.path.join(settings.BASE_DIR, 'logo.png')

        if not os.path.exists(logo_path):
            print(f"🚨 Watermark warning: Logo file not found -> {logo_path}")
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

        # Save back to memory
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


# =====================================================================
# 6. 📸 IMAGE MANAGEMENT WITH WATERMARKING INTEGRATED
# =====================================================================
@csrf_exempt
def upload_stock_image(request):
    if request.method == 'POST':
        try:
            tag_text = request.POST.get('tag_text', '').strip()
            uploaded_files = request.FILES.getlist('item_images')

            if not tag_text or not uploaded_files:
                return JsonResponse({'success': False, 'message': 'Tag ID ya Images missing hain!'}, status=400)

            # try:
            #     stock_item = StockForSale.objects.get(tag_text=tag_text)
                
            #     # Agar main image empty hai, toh pehli uploaded file ko main image banayein
            #     if not stock_item.item_image:
            #         stock_item.item_image = uploaded_files[0]
            #         stock_item.save()
            #         # Save hone ke baad file storage me aa jati hai, ab is par watermark lagayenge
            #         apply_shop_watermark(stock_item.item_image)
                
            #     # Sabhi uploaded files ko multiple images (angles) me save karein
            #     for file in uploaded_files:
            #         new_angle_img = StockImages.objects.create(stock_item=stock_item, image=file)
            #         # Har sub-angle image saving par bhi logo apply karein
            #         apply_shop_watermark(new_angle_img.image)

            try:
                stock_item = StockForSale.objects.filter(tag_text=tag_text).first()
                if not stock_item:
                    # Agar Master se item ban gaya hai par Stock In nahi hua, toh photo save karne ke liye placeholder banayenge
                    master_item = ItemMaster.objects.filter(tag_text=tag_text).first()
                    stock_item = StockForSale.objects.create(
                        tag_text=tag_text,
                        groups=master_item.item_group if master_item else '',
                        item=master_item.item_name if master_item else '',
                        purchase_quantity=0
                    )
                
                # Nayi list banayenge jisme loop chalana hai
                files_for_angles = uploaded_files
                
                # Agar main image empty hai, toh pehli uploaded file ko main image banayein
                if not stock_item.item_image:
                    # Watermarking ko temporarily disable kiya gaya hai:
                    # watermarked_main = apply_shop_watermark_in_memory(uploaded_files[0])
                    # stock_item.item_image = watermarked_main
                    stock_item.item_image = uploaded_files[0]
                    stock_item.save()
                    
                    # 🔥 CATCH YAHAN HAI: Pehli photo main image ban gayi, to ab use angle wale loop se hata do (Slice from index 1)
                    files_for_angles = uploaded_files[1:]
                
                # Bachi hui files ko hi multiple images (angles) me save karein
                for file in files_for_angles:
                    # Watermarking ko temporarily disable kiya gaya hai:
                    # watermarked_angle = apply_shop_watermark_in_memory(file)
                    # StockImages.objects.create(stock_item=stock_item, image=watermarked_angle)
                    StockImages.objects.create(stock_item=stock_item, image=file)

                return JsonResponse({'success': True, 'message': f'Tag {tag_text} ke liye kul {len(uploaded_files)} photos save ho gayi hain!'})
            except Exception as e:
                return JsonResponse({'success': False, 'message': str(e)}, status=500)
        except Exception as e:
            return JsonResponse({'success': False, 'message': str(e)}, status=500)

@csrf_exempt
def delete_single_stock_image(request):
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            tag_text = data.get('tag_text', '').strip()
            image_url = data.get('image_url', '').strip()

            if not tag_text or not image_url:
                return JsonResponse({'success': False, 'message': 'Tag ID ya Image URL missing hai!'}, status=400)

            try:
                stock_item = StockForSale.objects.filter(tag_text=tag_text).first()
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
# 7. 📢 OFFER BANNER ROUTES (NAME STRICTLY EXACT AS PER URLS.PY)
# =====================================================================
@api_view(['GET'])
@permission_classes([AllowAny])
def get_active_offer(request):  
    try:
        offer = OfferBanner.objects.last()
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
        data = request.data
        new_text = data.get('offer_text', '').strip()
        new_status = data.get('is_active', False)

        offer = OfferBanner.objects.last()
        if offer:
            offer.offer_text = new_text
            offer.is_active = new_status
            offer.save()
        else:
            OfferBanner.objects.create(offer_text=new_text, is_active=new_status)

        return Response({'success': True, 'message': 'Offer successfully update ho gaya!'}, status=status.HTTP_200_OK)
    except Exception as e:
        return Response({'success': False, 'message': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)