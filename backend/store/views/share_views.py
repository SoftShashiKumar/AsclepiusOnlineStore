import os
import re
import urllib.parse
from django.conf import settings
from django.http import JsonResponse
from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
import cloudinary
import cloudinary.uploader

from store.models import Sales, EstimatedSales, ReceiptVoucher, Customers, FirmProfile
from store.views.sales_views import _build_and_render_invoice_pdf
from store.views.receipt_views import render_weasyprint_pdf, get_logo_base64
from store.views.number_to_words import convert_number_to_words

# Cloudinary Configuration
def _configure_cloudinary():
    cl_config = getattr(settings, 'CLOUDINARY_STORAGE', {})
    cloud_name = cl_config.get('CLOUD_NAME') or os.environ.get('CLOUDINARY_CLOUD_NAME', 'qujxcplu')
    api_key = cl_config.get('API_KEY') or os.environ.get('CLOUDINARY_API_KEY', '345913376196578')
    api_secret = cl_config.get('API_SECRET') or os.environ.get('CLOUDINARY_API_SECRET', 'Y3rXnJT9hKjPxPK21Zn4hZss_j4')

    cloudinary.config(
        cloud_name=cloud_name,
        api_key=api_key,
        api_secret=api_secret,
        secure=True
    )

def _clean_phone_number(phone_raw):
    """
    Format mobile number to 91XXXXXXXXXX format for WhatsApp
    """
    if not phone_raw:
        return ""
    digits = re.sub(r'\D', '', str(phone_raw))
    if len(digits) == 10:
        return f"91{digits}"
    elif len(digits) == 11 and digits.startswith('0'):
        return f"91{digits[1:]}"
    elif len(digits) == 12 and digits.startswith('91'):
        return digits
    elif len(digits) > 10:
        return digits
    return digits


@api_view(['POST'])
def get_or_create_pdf_share_link(request):
    """
    On-Demand Cloudinary Upload:
    Sirf wahi PDF Cloudinary par upload hogi jisko share karne ke liye click kiya gaya hai.
    Pehle se bane ya purane records ko bhi on-the-spot generate aur upload karta hai.
    """
    try:
        data = request.data or {}
        share_type = data.get('type', 'invoice').strip().lower()  # 'invoice' or 'receipt'
        record_id = str(data.get('id', '')).strip()

        if not record_id:
            return Response({'success': False, 'message': 'Bill / Receipt ID missing hai!'}, status=status.HTTP_400_BAD_REQUEST)

        _configure_cloudinary()
        firm = FirmProfile.objects.first()
        firm_name = firm.firm_name if firm and firm.firm_name else "Tiya Jewellers"

        customer_name = "Valued Customer"
        mobile_raw = ""
        amount_val = 0
        date_str = ""
        pdf_bytes = None
        clean_inv_id = record_id.replace('Invoice_', '').replace('Est_Invoice_', '').replace('Receipt_', '').strip()

        # -------------------------------------------------------------
        # 1. INVOICE HANDLING
        # -------------------------------------------------------------
        if share_type == 'invoice':
            clean_lookup = clean_inv_id
            try:
                clean_lookup = int(clean_inv_id)
            except (ValueError, TypeError):
                pass

            sale_rec = Sales.objects.filter(invoice=clean_lookup).first()
            is_estimated = False
            if not sale_rec:
                sale_rec = EstimatedSales.objects.filter(invoice=clean_lookup).first()
                is_estimated = True

            if sale_rec:
                customer_name = sale_rec.customer or "Customer"
                mobile_raw = sale_rec.mobile or ""
                amount_val = sale_rec.bill_grand_total or sale_rec.bill_sattlement_amt or 0
                if sale_rec.bill_date:
                    try:
                        date_str = sale_rec.bill_date.strftime('%d-%b-%Y')
                    except Exception:
                        date_str = str(sale_rec.bill_date)
            else:
                customer_name = data.get('customer_name') or "Customer"
                mobile_raw = data.get('mobile') or ""
                amount_val = data.get('amount') or 0

            # Check if PDF exists on local disk
            filename = f"Invoice_{clean_inv_id}.pdf"
            possible_paths = [
                os.path.join(r"C:\Tiya\Tiya_Jewellers_Invoices", filename),
                os.path.join(r"C:\Tiya\Tiya_Jewellers_EstimatedBill", f"Est_Invoice_{clean_inv_id}.pdf"),
                os.path.join(settings.MEDIA_ROOT, 'invoices', filename),
                os.path.join(settings.BASE_DIR, 'media', 'invoices', filename),
            ]

            for p in possible_paths:
                if os.path.exists(p):
                    try:
                        with open(p, 'rb') as f:
                            pdf_bytes = f.read()
                        if pdf_bytes:
                            break
                    except Exception:
                        pass

            # Agar local disk par nahi mila, to dynamically render karo
            if not pdf_bytes:
                pdf_bytes, err = _build_and_render_invoice_pdf(clean_inv_id)
                if not pdf_bytes:
                    return Response({
                        'success': False,
                        'message': f'Invoice #{clean_inv_id} ka PDF generate nahi ho paya: {err}'
                    }, status=status.HTTP_404_NOT_FOUND)

            public_id = f"invoices/Invoice_{clean_inv_id}.pdf"
            bill_prefix = firm.invoice_prefix if firm and firm.invoice_prefix else "INV"
            formatted_bill_no = f"{bill_prefix}-{clean_inv_id}"

            # Upload on-demand to Cloudinary
            upload_res = cloudinary.uploader.upload(
                pdf_bytes,
                public_id=public_id,
                resource_type="raw",
                overwrite=True
            )
            pdf_url = upload_res.get('secure_url')

            whatsapp_message = (
                f"Namaste {customer_name} ji,\n"
                f"*{firm_name}* me shopping ke liye bahut-bahut shukriya!\n\n"
                f"📋 *Bill Details:*\n"
                f"• Invoice No: *{formatted_bill_no}*\n"
                f"• Date: *{date_str or 'Today'}*\n"
                f"• Total Amount: *₹{int(round(float(amount_val))):,}/-*\n\n"
                f"🔗 *Apna Digital Bill (PDF) dekhne aur download karne ke liye yahan click karein:*\n"
                f"{pdf_url}\n\n"
                f"Aapka din shubh ho! 🙏\n"
                f"Team *{firm_name}*"
            )

        # -------------------------------------------------------------
        # 2. RECEIPT HANDLING
        # -------------------------------------------------------------
        elif share_type == 'receipt':
            r_id_int = None
            try:
                r_id_int = int(clean_inv_id)
            except (ValueError, TypeError):
                pass

            receipt = None
            if r_id_int:
                receipt = ReceiptVoucher.objects.filter(r_id=r_id_int).first()

            if receipt:
                customer_name = receipt.customer_name or "Customer"
                amount_val = receipt.amount or 0
                if receipt.on_date:
                    try:
                        date_str = receipt.on_date.strftime('%d-%b-%Y')
                    except Exception:
                        date_str = str(receipt.on_date)

                # Fetch customer mobile from Customers model if possible
                cust = Customers.objects.filter(id=receipt.customer_id).first()
                if cust:
                    mobile_raw = cust.mobile1 or cust.mobile2 or ""
            else:
                customer_name = data.get('customer_name') or "Customer"
                mobile_raw = data.get('mobile') or ""
                amount_val = data.get('amount') or 0

            # Override mobile if provided in request
            if data.get('mobile'):
                mobile_raw = data.get('mobile')

            # Check if receipt PDF exists on local disk
            filename = f"Receipt_{clean_inv_id}.pdf"
            possible_paths = [
                os.path.join(r"C:\Tiya\Tiya_Jewellers_Receipts", filename),
                os.path.join(settings.MEDIA_ROOT, 'receipts', filename),
                os.path.join(settings.BASE_DIR, 'media', 'receipts', filename),
            ]

            for p in possible_paths:
                if os.path.exists(p):
                    try:
                        with open(p, 'rb') as f:
                            pdf_bytes = f.read()
                        if pdf_bytes:
                            break
                    except Exception:
                        pass

            # Agar disk par nahi mila, to dynamically render karo
            if not pdf_bytes and receipt:
                formatted_amount_str = f"Rs. {int(receipt.amount)}/-"
                amount_in_words_str = convert_number_to_words(receipt.amount)
                context = {
                    'receipt': receipt,
                    'date_str': date_str,
                    'formatted_amount': formatted_amount_str,
                    'amount_in_words': amount_in_words_str,
                    'logo_base64': get_logo_base64()
                }
                pdf_bytes = render_weasyprint_pdf('store/receipt_pdf.html', context)

            if not pdf_bytes:
                return Response({
                    'success': False,
                    'message': f'Receipt #{clean_inv_id} ka PDF generate nahi ho paya!'
                }, status=status.HTTP_404_NOT_FOUND)

            public_id = f"receipts/Receipt_{clean_inv_id}.pdf"
            formatted_bill_no = f"REC-{clean_inv_id}"

            # Upload on-demand to Cloudinary
            upload_res = cloudinary.uploader.upload(
                pdf_bytes,
                public_id=public_id,
                resource_type="raw",
                overwrite=True
            )
            pdf_url = upload_res.get('secure_url')

            pay_mode = receipt.paid_in if receipt and receipt.paid_in else "Cash"
            whatsapp_message = (
                f"Namaste {customer_name} ji,\n"
                f"*{firm_name}* se aapki Payment Receipt:\n\n"
                f"🧾 *Receipt Details:*\n"
                f"• Receipt No: *{formatted_bill_no}*\n"
                f"• Date: *{date_str or 'Today'}*\n"
                f"• Amount Received: *₹{int(round(float(amount_val))):,}/-*\n"
                f"• Mode: *{pay_mode}*\n\n"
                f"🔗 *Apni Payment Receipt dekhne aur download karne ke liye yahan click karein:*\n"
                f"{pdf_url}\n\n"
                f"Dhanyawad! 🙏\n"
                f"Team *{firm_name}*"
            )

        else:
            return Response({'success': False, 'message': 'Unknown share type!'}, status=status.HTTP_400_BAD_REQUEST)

        # Clean mobile & create WhatsApp URL
        clean_mobile = _clean_phone_number(mobile_raw)
        encoded_message = urllib.parse.quote(whatsapp_message)
        whatsapp_url = f"https://wa.me/{clean_mobile}?text={encoded_message}" if clean_mobile else f"https://wa.me/?text={encoded_message}"

        return Response({
            'success': True,
            'pdf_url': pdf_url,
            'mobile': clean_mobile,
            'customer_name': customer_name,
            'message': whatsapp_message,
            'whatsapp_url': whatsapp_url,
            'bill_number': formatted_bill_no
        }, status=status.HTTP_200_OK)

    except Exception as e:
        return Response({
            'success': False,
            'message': f'Share link error: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
