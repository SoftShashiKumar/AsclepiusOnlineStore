import io
import json
import os
import base64
import re  # <-- Regular expression import kiya numbers saaf karne ke liye
from django.http import HttpResponse, JsonResponse
from django.template.loader import render_to_string
from django.views.decorators.csrf import csrf_exempt
from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
from django.conf import settings 
from store.models import FirmProfile

# from ..models import Sales 
from ..serializers import SalesSerializer
# from xhtml2pdf import pisa
from ..models import Sales, Customers, EstimatedSales


def render_to_pdf(template_src, context_dict):
    firm = FirmProfile.objects.first()
    context_dict['firm'] = firm
    template = render_to_string(template_src, context_dict)
    result = io.BytesIO()
    pdf = pisa.pisaDocument(io.BytesIO(template.encode("UTF-8")), result)
    if not pdf.err:
        return result.getvalue()
    return None

# 🔥 Safe float conversion helper function
def safe_float(value):
    if value is None:
        return 0.0
    # Agar pehle se int ya float hai toh seedhe return karein
    if isinstance(value, (int, float)):
        return float(value)
    
    # String se ₹, g, spaces aur baaki characters hata kar sirf digits aur dot (.) rkhna
    cleaned_value = re.sub(r'[^0-9.]', '', str(value))
    try:
        return float(cleaned_value) if cleaned_value else 0.0
    except ValueError:
        return 0.0

    # 🔥 Har value ko round karke bina decimal (Integer) ke rakhne ke liye helper function
def safe_int_round(value):
    if value is None:
        return 0
    if isinstance(value, (int, float)):
        return int(round(float(value)))
    
    # String se ₹, g, ya baaki characters ko saaf karna
    cleaned_value = re.sub(r'[^0-9.]', '', str(value))
    try:
        return int(round(float(cleaned_value))) if cleaned_value else 0
    except ValueError:
        return 0

@csrf_exempt
@api_view(['GET', 'POST'])
def get_sales_data(request):
    if request.method == 'GET':
        sales = Sales.objects.all().order_by('-id')
        serializer = SalesSerializer(sales, many=True)
        return Response(serializer.data)
    elif request.method == 'POST':
        serializer = SalesSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

@csrf_exempt
@api_view(['GET'])
def get_sales_register(request):
    if request.method == 'GET':
        try:
            from_date = request.GET.get('from')
            to_date = request.GET.get('to')

            if not from_date or not to_date:
                return JsonResponse({
                    'success': False, 
                    'message': 'Date range (From aur To) dalna zaroori hai!'
                }, status=400)

            # Plain date-to-date search from Sales
            sales_records = Sales.objects.filter(bill_date__range=[from_date, to_date]).order_by('-id')

            sales_list = []
            for record in sales_records:
                formatted_date = ""
                if record.bill_date:
                    try:
                        if hasattr(record.bill_date, 'strftime'):
                            formatted_date = record.bill_date.strftime('%d-%b-%Y')
                        else:
                            formatted_date = str(record.bill_date)
                    except Exception:
                        formatted_date = str(record.bill_date)

                sp_value = 0
                if record.item_id:
                    from store.models import ItemMaster
                    try:
                        item_m = ItemMaster.objects.filter(tag_text=record.item_id).first()
                        if item_m:
                            sp_value = item_m.sp
                    except Exception:
                        pass
                        
                sales_list.append({
                    'invoice': str(record.invoice or ''),
                    'date': formatted_date,
                    'name': str(record.customer or 'Walk-in Customer'),
                    'address': str(record.addresses or ''),
                    'mobile': str(record.mobile or ''),
                    'tagId': str(record.item_id or ''),
                    'itemName': str(record.item_name or ''),
                    'quantity': str(record.quantity or '1'),
                    'rate': str(record.rate or '0'),
                    'purity': '',
                    'making': '0',
                    'discount': str(record.discount or '0'),
                    'sp': str(sp_value or '0'),
                    'preTotal': str(record.total or '0'),
                    'cgst': '0',
                    'sgst': '0',
                    'subTotal': '0',
                    'payMode': str(record.payment_mode or 'Cash'),
                    'billTotal': str(record.bill_grand_total or '0'),
                    'soldBy': 'Admin'
                })

            return Response({'success': True, 'data': sales_list}, status=status.HTTP_200_OK)

        except Exception as e:
            return Response({'success': False, 'message': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

import os
from django.http import FileResponse
from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status

@api_view(['GET'])
def view_saved_invoice_pdf(request, invoice_no):
    try:
        # Folder path where your sales invoices are saved
        target_directory = r"C:\Tiya\Tiya_Jewellers_Invoices"
        
        # Matches filename structure: Invoice_7.pdf
        filename = f"Invoice_{invoice_no}.pdf"
        full_file_path = os.path.join(target_directory, filename)

        # Check if file exists in the C-Drive directory
        if os.path.exists(full_file_path):
            response = FileResponse(open(full_file_path, 'rb'), content_type='application/pdf')
            # 'inline' opens it directly in a new browser tab instead of downloading
            response['Content-Disposition'] = f'inline; filename="{filename}"'
            return response
        else:
            return Response({
                'success': False, 
                'message': f'Bhai, folder me {filename} nahi mili!'
            }, status=status.HTTP_404_NOT_FOUND)

    except Exception as e:
        return Response({'success': False, 'message': f'Backend error: {str(e)}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)