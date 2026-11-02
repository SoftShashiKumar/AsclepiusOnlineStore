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
from store.models import FirmProfile, Customers, ReceiptVoucher
from store.middleware import get_current_firm_id, get_current_firm_profile
from .number_to_words import convert_number_to_words
from weasyprint import HTML

def get_logo_base64(firm_profile=None):
    """
    Converts active firm's logo into Base64 string for PDF rendering.
    """
    if not firm_profile:
        firm_profile = FirmProfile.objects.first()

    firm_id = getattr(firm_profile, 'firm_id', None) or 'SHREE'
    is_demo = (str(firm_id).upper() == 'DEMO')

    local_candidates = []

    # 1. First priority: firm_profile.logo if explicitly configured
    if firm_profile and firm_profile.logo:
        logo_str = str(firm_profile.logo)
        local_candidates.extend([
            os.path.join(settings.BASE_DIR, 'media', logo_str),
            os.path.join(settings.MEDIA_ROOT, logo_str) if hasattr(settings, 'MEDIA_ROOT') and settings.MEDIA_ROOT else None,
            os.path.join(settings.BASE_DIR, logo_str),
        ])

    # 2. Firm-specific default logo candidates
    if is_demo:
        demo_files = ['DemoLogo.png', 'demologo.png', 'demo_logo.png']
        for df in demo_files:
            local_candidates.extend([
                os.path.join(settings.BASE_DIR, 'media', 'firm_logos', df),
                os.path.join(settings.MEDIA_ROOT, 'firm_logos', df) if hasattr(settings, 'MEDIA_ROOT') and settings.MEDIA_ROOT else None,
                os.path.join(settings.BASE_DIR, 'media', df),
                os.path.join(settings.BASE_DIR, df),
            ])
    else:
        shree_files = ['A1_Logo.png', 'a1_logo.png']
        for sf in shree_files:
            local_candidates.extend([
                os.path.join(settings.BASE_DIR, 'media', 'firm_logos', sf),
                os.path.join(settings.MEDIA_ROOT, 'firm_logos', sf) if hasattr(settings, 'MEDIA_ROOT') and settings.MEDIA_ROOT else None,
                os.path.join(settings.BASE_DIR, 'media', sf),
                os.path.join(settings.BASE_DIR, sf),
            ])

    for path in local_candidates:
        if path and os.path.exists(path):
            try:
                with open(path, 'rb') as f:
                    return base64.b64encode(f.read()).decode('utf-8')
            except Exception as e:
                print(f"Error reading local logo from {path}: {e}")

    # 3. Cloudinary candidates
    cloudinary_candidates = []
    if firm_profile and firm_profile.logo:
        try:
            url = firm_profile.logo.url
            if url and url.startswith('http'):
                cloudinary_candidates.append(url)
        except Exception:
            pass

    if is_demo:
        cloudinary_candidates.extend([
            "https://res.cloudinary.com/qujxcplu/image/upload/w_300,c_limit/DemoLogo.png",
            "https://res.cloudinary.com/qujxcplu/image/upload/DemoLogo.png",
            "https://res.cloudinary.com/qujxcplu/image/upload/firm_logos/DemoLogo.png",
        ])
    else:
        cloudinary_candidates.extend([
            "https://res.cloudinary.com/qujxcplu/image/upload/w_300,c_limit/A1_Logo.png",
            "https://res.cloudinary.com/qujxcplu/image/upload/A1_Logo.png",
            "https://res.cloudinary.com/qujxcplu/image/upload/firm_logos/A1_Logo.png",
        ])

    import urllib.request
    import ssl
    ctx = ssl._create_unverified_context()

    target_filename = 'DemoLogo.png' if is_demo else 'A1_Logo.png'

    for c_url in cloudinary_candidates:
        try:
            req = urllib.request.Request(c_url, headers={'User-Agent': 'Mozilla/5.0'})
            with urllib.request.urlopen(req, context=ctx, timeout=6) as resp:
                data = resp.read()
                if data:
                    try:
                        save_dir = os.path.join(settings.BASE_DIR, 'media', 'firm_logos')
                        os.makedirs(save_dir, exist_ok=True)
                        save_path = os.path.join(save_dir, target_filename)
                        with open(save_path, 'wb') as f:
                            f.write(data)
                    except Exception:
                        pass
                    return base64.b64encode(data).decode('utf-8')
        except Exception:
            continue

    default_logo_path = os.path.join(settings.BASE_DIR, 'DemoLogo.png' if is_demo else 'A1_Logo.png')
    if os.path.exists(default_logo_path):
        try:
            with open(default_logo_path, 'rb') as f:
                return base64.b64encode(f.read()).decode('utf-8')
        except Exception:
            pass

    return ""


def render_weasyprint_pdf(template_src, context_dict, firm=None):
    if not firm and 'firm' in context_dict:
        firm = context_dict['firm']
    if not firm:
        firm = FirmProfile.objects.first()
    context_dict['firm'] = firm
    html_string = render_to_string(template_src, context_dict)
    pdf_file = HTML(string=html_string, base_url=str(settings.BASE_DIR)).write_pdf()
    return pdf_file


@api_view(['GET'])
def get_receipt_initial_data(request):
    try:
        query_firm = request.GET.get('firm_id') or request.headers.get('X-Firm-ID')
        firm_id = query_firm.strip().upper() if query_firm else get_current_firm_id(request)
        last_receipt = ReceiptVoucher.objects.filter(firm_id__iexact=firm_id).order_by('-r_id').first()
        next_id = (last_receipt.r_id + 1) if last_receipt else 1
        return Response({'success': True, 'next_receipt_id': next_id, 'firm_id': firm_id}, status=status.HTTP_200_OK)
    except Exception as e:
        return Response({'success': False, 'message': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
def save_receipt_voucher(request):
    try:
        query_firm = request.data.get('firm_id') or request.GET.get('firm_id') or request.headers.get('X-Firm-ID')
        firm_id = query_firm.strip().upper() if query_firm else get_current_firm_id(request)
        firm_profile = FirmProfile.objects.filter(firm_id__iexact=firm_id).first() or get_current_firm_profile(request)
        data = request.data
        c_id = data.get('customer_id')
        amount_received = float(data.get('amount', 0))

        if not c_id or amount_received <= 0:
            return Response({'success': False, 'message': 'Sahi Customer aur Amount zaroor bharein!'}, status=status.HTTP_400_BAD_REQUEST)

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
            on_date=timezone.now(),
            firm_id=firm_id
        )

        try:
            customer = Customers.objects.filter(id=c_id, firm_id__iexact=firm_id).first() or Customers.objects.filter(id=c_id).first()
            if customer:
                current_credit = float(customer.credit) if customer.credit else 0.0
                customer.credit = current_credit - amount_received

                if paid_against_val == 'Advanced' and buy_sp_val > 0:
                    current_adv_sp = float(customer.advanced_sp) if getattr(customer, 'advanced_sp', None) else 0.0
                    customer.advanced_sp = current_adv_sp + buy_sp_val

                customer.save()
        except Exception:
            pass

        clean_amount_int = int(round(amount_received))
        formatted_amount_str = f"Rs. {clean_amount_int}/-"
        amount_in_words_str = convert_number_to_words(clean_amount_int)

        date_str = receipt.on_date.strftime('%d-%b-%Y')
        context = {
            'receipt': receipt,
            'date_str': date_str,
            'formatted_amount': formatted_amount_str,
            'amount_in_words': amount_in_words_str,
            'logo_base64': get_logo_base64(firm_profile=firm_profile),
            'firm': firm_profile
        }
        
        pdf_data = render_weasyprint_pdf('store/receipt_pdf.html', context, firm=firm_profile)

        if pdf_data:
            target_directory = os.path.join(settings.MEDIA_ROOT, 'receipts')
            if not os.path.exists(target_directory):
                os.makedirs(target_directory, exist_ok=True)
                
            cache_filename = f"Receipt_{firm_id}_{receipt.r_id}.pdf"
            full_file_path = os.path.join(target_directory, cache_filename)
            
            with open(full_file_path, 'wb') as f:
                f.write(pdf_data)

            response = HttpResponse(pdf_data, content_type='application/pdf')
            response['Content-Disposition'] = f'inline; filename="Receipt_{receipt.r_id}.pdf"'
            return response
        else:
            return Response({'success': False, 'message': 'PDF generation failed'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    except Exception as e:
        return Response({'success': False, 'message': f'Backend error: {str(e)}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET'])
def get_receipt_register(request):
    try:
        query_firm = request.GET.get('firm_id') or request.headers.get('X-Firm-ID')
        firm_id = query_firm.strip().upper() if query_firm else get_current_firm_id(request)
        from_date_str = request.query_params.get('from_date')
        to_date_str = request.query_params.get('to_date')
        customer_id = request.query_params.get('customer_id')

        receipts_query = ReceiptVoucher.objects.filter(firm_id__iexact=firm_id).order_by('-r_id')

        if from_date_str and to_date_str:
            from_date = parse_date(from_date_str)
            to_date = parse_date(to_date_str)
            if from_date and to_date:
                receipts_query = receipts_query.filter(on_date__date__range=[from_date, to_date])

        if customer_id and customer_id != 'ALL':
            receipts_query = receipts_query.filter(customer_id=int(customer_id))

        customer_map = {c.id: {'ref': c.referance, 'mobile': c.mobile1 or c.mobile2 or ''} for c in Customers.objects.filter(firm_id__iexact=firm_id)}

        results = []
        for r in receipts_query:
            c_info = customer_map.get(r.customer_id, {'ref': '', 'mobile': ''})
            results.append({
                'r_id': r.r_id,
                'customer_id': r.customer_id,
                'customer_name': r.customer_name,
                'referance': c_info['ref'] or '',
                'asclepius_id': c_info['ref'] or '',
                'customer_mobile': c_info['mobile'] or '',
                'paid_in': r.paid_in,
                'mode': r.paid_in or '',
                'amount': float(r.amount),
                'for_bill_no': r.for_bill_no or '',
                'paid_against': getattr(r, 'paid_against', 'Old Bill') or 'Old Bill',
                'buy_sp': float(getattr(r, 'buy_sp', 0) or 0),
                'remarks': r.remarks or '',
                'received_by': r.received_by,
                'on_date': r.on_date.strftime('%Y-%m-%d %H:%M:%S') if r.on_date else '',
                'date': r.on_date.strftime('%d-%b-%Y') if r.on_date else ''
            })

        return Response({
            'success': True, 
            'data': results, 
            'receipts': results,
            'firm_id': firm_id
        }, status=status.HTTP_200_OK)

    except Exception as e:
        return Response({'success': False, 'message': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET'])
def get_receipt_register_pdf(request):
    try:
        query_firm = request.GET.get('firm_id') or request.headers.get('X-Firm-ID')
        firm_id = query_firm.strip().upper() if query_firm else get_current_firm_id(request)
        firm_profile = FirmProfile.objects.filter(firm_id__iexact=firm_id).first() or get_current_firm_profile(request)
        from_date_str = request.query_params.get('from_date')
        to_date_str = request.query_params.get('to_date')
        customer_id = request.query_params.get('customer_id')

        receipts_query = ReceiptVoucher.objects.filter(firm_id__iexact=firm_id).order_by('-r_id')

        if from_date_str and to_date_str:
            from_date = parse_date(from_date_str)
            to_date = parse_date(to_date_str)
            if from_date and to_date:
                receipts_query = receipts_query.filter(on_date__date__range=[from_date, to_date])

        if customer_id and customer_id != 'ALL':
            receipts_query = receipts_query.filter(customer_id=int(customer_id))

        customer_map = {c.id: {'ref': c.referance, 'mobile': c.mobile1 or c.mobile2 or ''} for c in Customers.objects.filter(firm_id__iexact=firm_id)}

        results = []
        total_amount = 0.0
        for r in receipts_query:
            amt = float(r.amount)
            total_amount += amt
            c_info = customer_map.get(r.customer_id, {'ref': '', 'mobile': ''})
            results.append({
                'r_id': r.r_id,
                'customer_name': r.customer_name,
                'referance': c_info['ref'] or '',
                'paid_in': r.paid_in,
                'amount': amt,
                'for_bill_no': r.for_bill_no or '',
                'paid_against': getattr(r, 'paid_against', 'Old Bill') or 'Old Bill',
                'buy_sp': float(getattr(r, 'buy_sp', 0) or 0),
                'remarks': r.remarks or '',
                'on_date': r.on_date.strftime('%d-%b-%Y') if r.on_date else ''
            })

        context = {
            'receipts': results,
            'total_amount': total_amount,
            'from_date': from_date_str or 'All',
            'to_date': to_date_str or 'All',
            'logo_base64': get_logo_base64(firm_profile=firm_profile),
            'firm': firm_profile
        }

        pdf_data = render_weasyprint_pdf('store/receipt_register_pdf.html', context, firm=firm_profile)
        response = HttpResponse(pdf_data, content_type='application/pdf')
        response['Content-Disposition'] = 'inline; filename="Receipt_Register.pdf"'
        return response

    except Exception as e:
        return Response({'success': False, 'message': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET'])
def view_saved_receipt_pdf(request, r_id):
    try:
        query_firm = request.GET.get('firm_id') or request.GET.get('firm')
        firm_id = query_firm.upper() if query_firm else get_current_firm_id(request)
        firm_filename = f"Receipt_{firm_id}_{r_id}.pdf"
        client_filename = f"Receipt_{r_id}.pdf"

        receipt = ReceiptVoucher.objects.filter(r_id=r_id, firm_id=firm_id).first()
        if not receipt:
            receipt = ReceiptVoucher.objects.filter(r_id=r_id).first()
        if receipt:
            rec_firm_id = receipt.firm_id or firm_id
            firm_profile = FirmProfile.objects.filter(firm_id=rec_firm_id).first() or get_current_firm_profile(request)
            date_str = receipt.on_date.strftime('%d-%b-%Y') if receipt.on_date else ''
            formatted_amount_str = f"Rs. {int(receipt.amount)}/-"
            amount_in_words_str = convert_number_to_words(receipt.amount)
            context = {
                'receipt': receipt,
                'date_str': date_str,
                'formatted_amount': formatted_amount_str,
                'amount_in_words': amount_in_words_str,
                'logo_base64': get_logo_base64(firm_profile=firm_profile),
                'firm': firm_profile
            }
            pdf_data = render_weasyprint_pdf('store/receipt_pdf.html', context, firm=firm_profile)
            if pdf_data:
                try:
                    cache_dir = os.path.join(settings.MEDIA_ROOT, 'receipts')
                    if not os.path.exists(cache_dir):
                        os.makedirs(cache_dir, exist_ok=True)
                    with open(os.path.join(cache_dir, firm_filename), 'wb') as f:
                        f.write(pdf_data)
                except Exception:
                    pass

                response = HttpResponse(pdf_data, content_type='application/pdf')
                response['Content-Disposition'] = f'inline; filename="{client_filename}"'
                return response

        return Response({
            'success': False, 
            'message': f'Bhai, Receipt #{r_id} ka record nahi mila!'
        }, status=status.HTTP_404_NOT_FOUND)

    except Exception as e:
        return Response({'success': False, 'message': f'Backend error: {str(e)}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
