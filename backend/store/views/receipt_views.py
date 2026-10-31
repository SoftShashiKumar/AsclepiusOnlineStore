import io
import os
import base64
from django.http import HttpResponse, FileResponse
from django.template.loader import render_to_string
from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
from django.utils import timezone
from django.utils.dateparse import parse_date
from django.conf import settings
from store.models import FirmProfile

# 🟢 External Helper for Number to Words
from .number_to_words import convert_number_to_words

# 🟢 WeasyPrint Import
from weasyprint import HTML

# Core Models Clean Import
from ..models import Customers, ReceiptVoucher


# def get_logo_base64():
#     """C:\Tiya\Logo\logo.png se logo padh kar Base64 me convert karta hai."""
#     try:
#         logo_absolute_path = r"C:\Tiya\Logo\logo.png"
        
#         if os.path.exists(logo_absolute_path):
#             with open(logo_absolute_path, "rb") as img_file:
#                 return base64.b64encode(img_file.read()).decode('utf-8')
#     except Exception as e:
#         print(f"Logo load error: {e}")
#     return ""
def get_logo_base64():
    """
    Firm logo ko Base64 string me convert karta hai:
    1. Local media disk check karta hai (A1_Logo.png)
    2. Cloudinary se fetch karta hai (w_300,c_limit/A1_Logo.png ya A1_Logo.png)
    3. Local static logo fallback
    """
    firm_profile = FirmProfile.objects.first()

    # 1. Local disk candidate paths
    local_candidates = [
        os.path.join(settings.BASE_DIR, 'media', 'firm_logos', 'A1_Logo.png'),
        os.path.join(settings.MEDIA_ROOT, 'firm_logos', 'A1_Logo.png') if hasattr(settings, 'MEDIA_ROOT') and settings.MEDIA_ROOT else None,
        r"E:\AsclepiusOnlineStore\backend\media\firm_logos\A1_Logo.png",
    ]
    if firm_profile and firm_profile.logo:
        logo_str = str(firm_profile.logo)
        local_candidates.extend([
            os.path.join(settings.BASE_DIR, 'media', logo_str),
            os.path.join(settings.MEDIA_ROOT, logo_str) if hasattr(settings, 'MEDIA_ROOT') and settings.MEDIA_ROOT else None,
        ])

    for path in local_candidates:
        if path and os.path.exists(path):
            try:
                with open(path, 'rb') as f:
                    return base64.b64encode(f.read()).decode('utf-8')
            except Exception as e:
                print(f"Error reading local logo from {path}: {e}")

    # 2. Cloudinary candidates (with SSL unverified context)
    cloudinary_candidates = [
        "https://res.cloudinary.com/qujxcplu/image/upload/w_300,c_limit/A1_Logo.png",
        "https://res.cloudinary.com/qujxcplu/image/upload/A1_Logo.png",
    ]
    if firm_profile and firm_profile.logo:
        try:
            url = firm_profile.logo.url
            if url and url.startswith('http') and url not in cloudinary_candidates:
                cloudinary_candidates.append(url)
        except Exception:
            pass

    import urllib.request
    import ssl
    ctx = ssl._create_unverified_context()

    for c_url in cloudinary_candidates:
        try:
            req = urllib.request.Request(c_url, headers={'User-Agent': 'Mozilla/5.0'})
            with urllib.request.urlopen(req, context=ctx, timeout=6) as resp:
                data = resp.read()
                if data:
                    try:
                        save_dir = os.path.join(settings.BASE_DIR, 'media', 'firm_logos')
                        os.makedirs(save_dir, exist_ok=True)
                        save_path = os.path.join(save_dir, 'A1_Logo.png')
                        with open(save_path, 'wb') as sf:
                            sf.write(data)
                    except Exception:
                        pass
                    return base64.b64encode(data).decode('utf-8')
        except Exception as e:
            print(f"Cloudinary fetch failed ({c_url}): {e}")

    # 3. Static fallback
    static_fallback = os.path.join(settings.BASE_DIR, 'static', 'images', 'logo.png')
    if os.path.exists(static_fallback):
        try:
            with open(static_fallback, 'rb') as f:
                return base64.b64encode(f.read()).decode('utf-8')
        except Exception:
            pass

    return ""

def render_weasyprint_pdf(template_src, context_dict):
    """HTML Template ko WeasyPrint ki madad se crisp PDF binary me convert karta hai."""
    firm = FirmProfile.objects.first()
    context_dict['firm'] = firm
    html_string = render_to_string(template_src, context_dict)
    pdf_file = HTML(string=html_string, base_url=str(settings.BASE_DIR)).write_pdf()
    return pdf_file


@api_view(['GET'])
def get_receipt_initial_data(request):
    try:
        last_receipt = ReceiptVoucher.objects.all().order_by('-r_id').first()
        next_id = (last_receipt.r_id + 1) if last_receipt else 1
        return Response({'success': True, 'next_receipt_id': next_id}, status=status.HTTP_200_OK)
    except Exception as e:
        return Response({'success': False, 'message': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
def save_receipt_voucher(request):
    try:
        data = request.data
        c_id = data.get('customer_id')
        amount_received = float(data.get('amount', 0))

        if not c_id or amount_received <= 0:
            return Response({'success': False, 'message': 'Sahi Customer aur Amount zaroor bharein!'}, status=status.HTTP_400_BAD_REQUEST)

        # A. Database insertion
        paid_against_val = data.get('paid_against', 'Old Bill') or 'Old Bill'
        buy_sp_val = float(data.get('buy_sp', 0) or 0)

        receipt = ReceiptVoucher.objects.create(
            customer_id=int(c_id),
            customer_name=data.get('customer_name', ''),
            paid_in=data.get('mode', 'Cash'),
            amount=amount_received,
            for_bill_no=data.get('for_bill_no', ''),
            paid_against=paid_against_val,
            buy_sp=buy_sp_val,
            remarks=data.get('remarks', ''),
            on_date=timezone.now()
        )

        # B. Live Customer Credit Deduct karna aur Advanced SP add karna
        try:
            customer = Customers.objects.get(id=c_id)
            current_credit = float(customer.credit) if customer.credit else 0.0
            customer.credit = current_credit - amount_received

            # Advanced SP me number add hona
            if paid_against_val == 'Advanced' and buy_sp_val > 0:
                current_adv_sp = float(customer.advanced_sp) if getattr(customer, 'advanced_sp', None) else 0.0
                customer.advanced_sp = current_adv_sp + buy_sp_val

            customer.save()
        except Customers.DoesNotExist:
            pass

        # C. Amount Formatting & Words Calculation
        clean_amount_int = int(round(amount_received))
        formatted_amount_str = f"Rs. {clean_amount_int}/-"
        amount_in_words_str = convert_number_to_words(clean_amount_int)

        # D. Context prepare kiya template ke liye
        date_str = receipt.on_date.strftime('%d-%b-%Y')
        context = {
            'receipt': receipt,
            'date_str': date_str,
            'formatted_amount': formatted_amount_str,  # 👈 'Rs. 2000/-'
            'amount_in_words': amount_in_words_str,    # 👈 'Two Thousand Rupees Only.'
            'logo_base64': get_logo_base64()
        }
        
        # 🟢 WeasyPrint se PDF Generate karein
        pdf_data = render_weasyprint_pdf('store/receipt_pdf.html', context)

        if pdf_data:
            # File storage location directory logic
            target_directory = "C:/Tiya/Tiya_Jewellers_Receipts/"
            if not os.path.exists(target_directory):
                os.makedirs(target_directory)
                
            filename = f"Receipt_{receipt.r_id}.pdf"
            full_file_path = os.path.join(target_directory, filename)
            
            with open(full_file_path, 'wb') as f:
                f.write(pdf_data)

            response = HttpResponse(pdf_data, content_type='application/pdf')
            response['Content-Disposition'] = f'inline; filename="{filename}"'
            return response
        else:
            return Response({'success': False, 'message': 'PDF generation failed'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    except Exception as e:
        return Response({'success': False, 'message': f'Backend error: {str(e)}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET'])
def get_receipt_register(request):
    try:
        from_date_str = request.query_params.get('from_date')
        to_date_str = request.query_params.get('to_date')
        customer_id = request.query_params.get('customer_id')  # 👈 Customer ID filter liya

        receipts_query = ReceiptVoucher.objects.all().order_by('-r_id')

        # Date Range Filter
        if from_date_str and to_date_str:
            from_date = parse_date(from_date_str)
            to_date = parse_date(to_date_str)
            if from_date and to_date:
                receipts_query = receipts_query.filter(on_date__date__range=[from_date, to_date])

        # Customer Specific Filter (Agar ALL nahi hai toh)
        if customer_id and customer_id != 'ALL':
            receipts_query = receipts_query.filter(customer_id=int(customer_id))

        customer_map = {c.id: {'ref': c.referance, 'mobile': c.mobile1 or c.mobile2 or ''} for c in Customers.objects.all()}

        receipts_list = []
        for r in receipts_query:
            receipts_list.append({
                'r_id': r.r_id,
                'date': r.on_date.strftime('%d-%b-%Y') if r.on_date else '',
                'customer_id': r.customer_id,
                'asclepius_id': customer_map.get(r.customer_id, {}).get('ref', '') or '-',
                'mobile': customer_map.get(r.customer_id, {}).get('mobile', ''),
                'customer_name': r.customer_name,
                'mode': r.paid_in,
                'amount': float(r.amount),
                'for_bill_no': r.for_bill_no if r.for_bill_no else '-',
                'remarks': r.remarks if r.remarks else '-',
                'received_by': 'Admin'
            })

        return Response({'success': True, 'receipts': receipts_list}, status=status.HTTP_200_OK)
    except Exception as e:
        return Response({'success': False, 'message': f'Backend Register Error: {str(e)}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
def get_receipt_register_pdf(request):
    try:
        from_date_str = request.query_params.get('from_date')
        to_date_str = request.query_params.get('to_date')
        customer_id = request.query_params.get('customer_id')  # 👈 Customer ID filter liya

        receipts_query = ReceiptVoucher.objects.all().order_by('-r_id')

        if from_date_str and to_date_str:
            from_date = parse_date(from_date_str)
            to_date = parse_date(to_date_str)
            if from_date and to_date:
                receipts_query = receipts_query.filter(on_date__date__range=[from_date, to_date])

        # Customer Specific Filter
        if customer_id and customer_id != 'ALL':
            receipts_query = receipts_query.filter(customer_id=int(customer_id))

        customer_map = {c.id: {'ref': c.referance, 'mobile': c.mobile1 or c.mobile2 or ''} for c in Customers.objects.all()}

        receipts_list = []
        total_amount = 0.0
        for r in receipts_query:
            amt = float(r.amount)
            total_amount += amt
            receipts_list.append({
                'r_id': r.r_id,
                'date': r.on_date.strftime('%d-%b-%Y') if r.on_date else '',
                'asclepius_id': customer_map.get(r.customer_id, {}).get('ref', '') or '-',
                'mobile': customer_map.get(r.customer_id, {}).get('mobile', ''),
                'customer_name': r.customer_name,
                'mode': r.paid_in,
                'amount': amt,
                'remarks': r.remarks if r.remarks else '-'
            })

        context = {
            'receipts': receipts_list,
            'from_date': from_date_str,
            'to_date': to_date_str,
            'total_amount': total_amount,
            'print_time': timezone.now().strftime('%d-%b-%Y %I:%M %p')
        }

        pdf_data = render_weasyprint_pdf('store/receipt_register_pdf.html', context)
        pdf_base64 = base64.b64encode(pdf_data).decode('utf-8')
        
        return Response({
            'success': True, 
            'pdf_base64': pdf_base64
        }, status=status.HTTP_200_OK)

    except Exception as e:
        return Response({'success': False, 'message': f'Backend error: {str(e)}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

# @api_view(['GET'])
# def get_receipt_register(request):
#     try:
#         from_date_str = request.query_params.get('from_date')
#         to_date_str = request.query_params.get('to_date')

#         receipts_query = ReceiptVoucher.objects.all().order_by('-r_id')

#         if from_date_str and to_date_str:
#             from_date = parse_date(from_date_str)
#             to_date = parse_date(to_date_str)
#             if from_date and to_date:
#                 receipts_query = receipts_query.filter(on_date__date__range=[from_date, to_date])

#         receipts_list = []
#         for r in receipts_query:
#             receipts_list.append({
#                 'r_id': r.r_id,
#                 'date': r.on_date.strftime('%d-%b-%Y') if r.on_date else '',
#                 'customer_id': r.customer_id,
#                 'customer_name': r.customer_name,
#                 'mode': r.paid_in,
#                 'amount': float(r.amount),
#                 'for_bill_no': r.for_bill_no if r.for_bill_no else '-',
#                 'remarks': r.remarks if r.remarks else '-',
#                 'received_by': 'Admin'
#             })

#         return Response({'success': True, 'receipts': receipts_list}, status=status.HTTP_200_OK)
#     except Exception as e:
#         return Response({'success': False, 'message': f'Backend Register Error: {str(e)}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# @api_view(['GET'])
# def get_receipt_register_pdf(request):
#     try:
#         from_date_str = request.query_params.get('from_date')
#         to_date_str = request.query_params.get('to_date')

#         receipts_query = ReceiptVoucher.objects.all().order_by('-r_id')

#         if from_date_str and to_date_str:
#             from_date = parse_date(from_date_str)
#             to_date = parse_date(to_date_str)
#             if from_date and to_date:
#                 receipts_query = receipts_query.filter(on_date__date__range=[from_date, to_date])

#         receipts_list = []
#         total_amount = 0.0
#         for r in receipts_query:
#             amt = float(r.amount)
#             total_amount += amt
#             receipts_list.append({
#                 'r_id': r.r_id,
#                 'date': r.on_date.strftime('%d-%b-%Y') if r.on_date else '',
#                 'customer_name': r.customer_name,
#                 'mode': r.paid_in,
#                 'amount': amt,
#                 'remarks': r.remarks if r.remarks else '-'
#             })

#         context = {
#             'receipts': receipts_list,
#             'from_date': from_date_str,
#             'to_date': to_date_str,
#             'total_amount': total_amount,
#             'print_time': timezone.now().strftime('%d-%b-%Y %I:%M %p')
#         }

#         pdf_data = render_weasyprint_pdf('store/receipt_register_pdf.html', context)
#         pdf_base64 = base64.b64encode(pdf_data).decode('utf-8')
        
#         return Response({
#             'success': True, 
#             'pdf_base64': pdf_base64
#         }, status=status.HTTP_200_OK)

#     except Exception as e:
#         return Response({'success': False, 'message': f'Backend error: {str(e)}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
def view_saved_receipt_pdf(request, r_id):
    try:
        # Suppress WhatsApp rich preview card on top of chat message
        ua = (request.META.get('HTTP_USER_AGENT') or '').lower()
        if 'facebookexternalhit' in ua or 'facebot' in ua:
            return HttpResponse(status=404)

        filename = f"Receipt_{r_id}.pdf"
        possible_paths = [
            os.path.join("C:/Tiya/Tiya_Jewellers_Receipts/", filename),
            os.path.join(settings.MEDIA_ROOT, 'receipts', filename),
            os.path.join(settings.BASE_DIR, 'media', 'receipts', filename),
        ]

        for full_file_path in possible_paths:
            if os.path.exists(full_file_path):
                response = FileResponse(open(full_file_path, 'rb'), content_type='application/pdf')
                response['Content-Disposition'] = f'inline; filename="{filename}"'
                return response

        # Disk par nahi mili -> database se dynamically generate karo
        receipt = ReceiptVoucher.objects.filter(r_id=r_id).first()
        if receipt:
            date_str = receipt.on_date.strftime('%d-%b-%Y') if receipt.on_date else ''
            formatted_amount_str = f"Rs. {int(receipt.amount)}/-"
            amount_in_words_str = convert_number_to_words(receipt.amount)
            context = {
                'receipt': receipt,
                'date_str': date_str,
                'formatted_amount': formatted_amount_str,
                'amount_in_words': amount_in_words_str,
                'logo_base64': get_logo_base64()
            }
            pdf_data = render_weasyprint_pdf('store/receipt_pdf.html', context)
            if pdf_data:
                try:
                    cache_dir = os.path.join(settings.MEDIA_ROOT, 'receipts')
                    if not os.path.exists(cache_dir):
                        os.makedirs(cache_dir, exist_ok=True)
                    with open(os.path.join(cache_dir, filename), 'wb') as f:
                        f.write(pdf_data)
                except Exception:
                    pass

                response = HttpResponse(pdf_data, content_type='application/pdf')
                response['Content-Disposition'] = f'inline; filename="{filename}"'
                return response

        return Response({
            'success': False, 
            'message': f'Bhai, Receipt #{r_id} ka record nahi mila!'
        }, status=status.HTTP_404_NOT_FOUND)

    except Exception as e:
        return Response({'success': False, 'message': f'Backend error: {str(e)}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)