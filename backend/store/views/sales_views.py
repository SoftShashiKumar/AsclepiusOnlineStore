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
from django.http import FileResponse, HttpResponse
from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status


def _get_firm_logo_base64(firm_profile=None):
    from .receipt_views import get_logo_base64
    return get_logo_base64()


def _build_and_render_invoice_pdf(invoice_no):
    from store.models import StockForSale, ItemMaster
    from .number_to_words import convert_number_to_words
    from weasyprint import HTML

    clean_inv_str = str(invoice_no).replace('Invoice_', '').replace('Est_Invoice_', '').strip()
    inv_lookup = clean_inv_str
    try:
        inv_lookup = int(clean_inv_str)
    except (ValueError, TypeError):
        pass

    # 1. Search in Sales
    sales_records = Sales.objects.filter(invoice=inv_lookup)
    is_estimated = False
    if not sales_records.exists():
        sales_records = EstimatedSales.objects.filter(invoice=inv_lookup)
        is_estimated = True

    if not sales_records.exists():
        return None, f"Invoice #{invoice_no} ka record database me nahi mila!"

    first_record = sales_records.first()
    firm_profile = FirmProfile.objects.first()
    logo_base64 = _get_firm_logo_base64(firm_profile)

    cleaned_items = []
    total_tsp = 0.0

    for s in sales_records:
        sp_val = float(s.sp or 0)
        item_img_url = ""
        if s.item_id:
            stock_item = StockForSale.objects.filter(tag_text=s.item_id).first()
            if stock_item and stock_item.item_image:
                try:
                    if hasattr(stock_item.item_image, 'path') and os.path.exists(stock_item.item_image.path):
                        item_img_url = 'file:///' + stock_item.item_image.path.replace('\\', '/')
                    elif stock_item.item_image.url:
                        item_img_url = stock_item.item_image.url
                except Exception:
                    pass

            if not sp_val:
                im = ItemMaster.objects.filter(tag_text=s.item_id).first()
                if im and im.sp:
                    sp_val = float(im.sp)

        qty = int(s.quantity or 1)
        item_total_sp = sp_val * qty
        total_tsp += item_total_sp

        rate_val = safe_int_round(s.rate)
        item_total_val = safe_int_round(s.total) if s.total else (rate_val * qty)

        cleaned_items.append({
            'itemId': s.item_id or '',
            'itemName': s.item_name or '',
            'image': item_img_url,
            'group': s.item_group or '',
            'quantity': qty,
            'rate': rate_val,
            'sp': sp_val,
            'itemTotal': item_total_val
        })

    grand_total = safe_int_round(first_record.bill_grand_total) if first_record.bill_grand_total else sum(i['itemTotal'] for i in cleaned_items)
    amount_in_words = convert_number_to_words(grand_total)

    invoice_title = "ESTIMATED BILL" if is_estimated else "SALES INVOICE"
    bill_date_str = ""
    if first_record.bill_date:
        try:
            bill_date_str = first_record.bill_date.strftime('%d-%b-%Y')
        except Exception:
            bill_date_str = str(first_record.bill_date)

    settlement_amt = safe_int_round(first_record.bill_sattlement_amt) if first_record.bill_sattlement_amt else grand_total

    pay_mode = first_record.payment_mode or 'Cash'
    cash_field = getattr(first_record, 'cash', None)
    credit_field = getattr(first_record, 'credit', None)
    upi_field = getattr(first_record, 'upi', None)

    if cash_field is not None and credit_field is not None and upi_field is not None and (cash_field or credit_field or upi_field):
        cash_amt_val = safe_int_round(cash_field)
        credit_amt_val = safe_int_round(credit_field)
        upi_amt_val = safe_int_round(upi_field)
    else:
        if pay_mode == 'Cash':
            cash_amt_val = grand_total
            credit_amt_val = 0
            upi_amt_val = 0
        elif pay_mode == 'Credit':
            cash_amt_val = 0
            credit_amt_val = grand_total
            upi_amt_val = 0
        elif pay_mode == 'UPI':
            cash_amt_val = 0
            credit_amt_val = 0
            upi_amt_val = grand_total
        else:
            cash_amt_val = safe_int_round(getattr(first_record, 'cash_amt', 0))
            credit_amt_val = safe_int_round(getattr(first_record, 'credit_amt', 0))
            upi_amt_val = safe_int_round(getattr(first_record, 'upi_amt', 0))

    invoice_data = {
        'firm': firm_profile,
        'invoice_title': invoice_title,
        'invoice_number': str(invoice_no),
        'bill_date': bill_date_str,
        'customer_name': first_record.customer or 'Walk-in Customer',
        'contact': first_record.mobile or 'N/A',
        'address': first_record.addresses or 'N/A',
        'payment_mode': pay_mode,
        'items': cleaned_items,
        'total_tsp': total_tsp,
        'grand_total': grand_total,
        'formatted_grand_total': f"Rs. {grand_total}/-",
        'amount_in_words': amount_in_words,
        'cgst': 0,
        'sgst': 0,
        'bill_settlement_amt': settlement_amt,
        'logo_base64': logo_base64,
        'cash_amt': cash_amt_val,
        'credit_amt': credit_amt_val,
        'upi_amt': upi_amt_val,
        'sold_by': first_record.sold_by or 'Admin',
    }

    html_string = render_to_string('store/invoice_pdf.html', invoice_data)
    pdf_bytes = HTML(string=html_string, base_url=str(settings.BASE_DIR)).write_pdf()
    return pdf_bytes, None


@api_view(['GET'])
def view_saved_invoice_pdf(request, invoice_no):
    try:
        filename = f"Invoice_{invoice_no}.pdf"

        # 1. Check possible on-disk cache locations
        possible_paths = [
            os.path.join(r"C:\Tiya\Tiya_Jewellers_Invoices", filename),
            os.path.join(r"C:\Tiya\Tiya_Jewellers_EstimatedBill", f"Est_Invoice_{invoice_no}.pdf"),
            os.path.join(settings.MEDIA_ROOT, 'invoices', filename),
            os.path.join(settings.BASE_DIR, 'media', 'invoices', filename),
        ]

        for full_file_path in possible_paths:
            if os.path.exists(full_file_path):
                response = FileResponse(open(full_file_path, 'rb'), content_type='application/pdf')
                response['Content-Disposition'] = f'inline; filename="{filename}"'
                return response

        # 2. Disk par file nahi mili -> Database se on-demand generate karo
        pdf_bytes, err = _build_and_render_invoice_pdf(invoice_no)
        if pdf_bytes:
            try:
                cache_dir = os.path.join(settings.MEDIA_ROOT, 'invoices')
                if not os.path.exists(cache_dir):
                    os.makedirs(cache_dir, exist_ok=True)
                cache_file = os.path.join(cache_dir, filename)
                with open(cache_file, 'wb') as f:
                    f.write(pdf_bytes)
            except Exception:
                pass

            response = HttpResponse(pdf_bytes, content_type='application/pdf')
            response['Content-Disposition'] = f'inline; filename="{filename}"'
            return response

        # 3. Agar database me bhi record nahi mila
        return Response({
            'success': False, 
            'message': err or f'Bhai, invoice #{invoice_no} ka record nahi mila!'
        }, status=status.HTTP_404_NOT_FOUND)

    except Exception as e:
        return Response({
            'success': False, 
            'message': f'Backend error: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
