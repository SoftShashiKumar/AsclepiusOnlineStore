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

    try:
        cloudinary.config(
            cloud_name=cloud_name,
            api_key=api_key,
            api_secret=api_secret,
            secure=True
        )
    except Exception:
        pass

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
    PDF Sharing Endpoint:
    Direct reliable server link (200 OK) + optional Cloudinary upload.
    Works immediately on every customer phone without Cloudinary 401 ACL deny errors.
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
        mobile_raw = data.get('mobile') or ""
        amount_val = data.get('amount') or 0
        date_str = ""
        clean_inv_id = record_id.replace('Invoice_', '').replace('Est_Invoice_', '').replace('Receipt_', '').strip()

        # Determine public server base URL
        base_uri = request.build_absolute_uri('/')[:-1]
        if 'localhost' in base_uri or '127.0.0.1' in base_uri:
            public_base = os.environ.get('PUBLIC_BACKEND_URL', 'https://asclepiusonlinestore-production.up.railway.app').rstrip('/')
        else:
            public_base = base_uri.replace('http://', 'https://')

        cloudinary_url = None

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
                customer_name = sale_rec.customer or customer_name
                if not mobile_raw:
                    mobile_raw = sale_rec.mobile or ""
                amount_val = sale_rec.bill_grand_total or sale_rec.bill_sattlement_amt or amount_val
                if sale_rec.bill_date:
                    try:
                        date_str = sale_rec.bill_date.strftime('%d-%b-%Y')
                    except Exception:
                        date_str = str(sale_rec.bill_date)

            bill_prefix = firm.invoice_prefix if firm and firm.invoice_prefix else "INV"
            formatted_bill_no = f"{bill_prefix}-{clean_inv_id}"

            # Direct server URL (Guaranteed 200 OK delivery)
            pdf_url = f"{public_base}/api/sales/view-pdf/{clean_inv_id}/"

            # Optional Cloudinary upload (in background / best-effort)
            try:
                pdf_bytes, _ = _build_and_render_invoice_pdf(clean_inv_id)
                if pdf_bytes:
                    public_id = f"invoices/Invoice_{clean_inv_id}.pdf"
                    up_res = cloudinary.uploader.upload(
                        pdf_bytes,
                        public_id=public_id,
                        resource_type="raw",
                        overwrite=True
                    )
                    cloudinary_url = up_res.get('secure_url')
            except Exception:
                pass

            include_link = bool(data.get('include_link', False))
            link_section = f"\n\n🔗 *Digital Bill (PDF):*\n{pdf_url}" if include_link else ""

            whatsapp_message = (
                f"Namaste {customer_name} ji,\n"
                f"*{firm_name}* me खरीदारी ke liye bahut-bahut shukriya!\n\n"
                f"📋 *Bill Details:*\n"
                f"• Invoice No: *{formatted_bill_no}*\n"
                f"• Date: *{date_str or 'Today'}*\n"
                f"• Total Amount: *₹{int(round(float(amount_val))):,}/-*"
                f"{link_section}\n\n"
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
                customer_name = receipt.customer_name or customer_name
                amount_val = receipt.amount or amount_val
                if receipt.on_date:
                    try:
                        date_str = receipt.on_date.strftime('%d-%b-%Y')
                    except Exception:
                        date_str = str(receipt.on_date)

                # Fetch customer mobile from Customers model if not given in request
                if not mobile_raw:
                    cust = Customers.objects.filter(id=receipt.customer_id).first()
                    if not cust and receipt.customer_name:
                        cust = Customers.objects.filter(cname__iexact=receipt.customer_name).first()
                    if cust:
                        mobile_raw = cust.mobile1 or cust.mobile2 or ""

            formatted_bill_no = f"REC-{clean_inv_id}"

            # Direct server URL (Guaranteed 200 OK delivery)
            pdf_url = f"{public_base}/api/receipts/view-pdf/{clean_inv_id}/"

            # Optional Cloudinary upload (in background / best-effort)
            try:
                formatted_amount_str = f"Rs. {int(amount_val)}/-"
                amount_in_words_str = convert_number_to_words(amount_val)
                context = {
                    'receipt': receipt,
                    'date_str': date_str,
                    'formatted_amount': formatted_amount_str,
                    'amount_in_words': amount_in_words_str,
                    'logo_base64': get_logo_base64()
                }
                pdf_bytes = render_weasyprint_pdf('store/receipt_pdf.html', context)
                if pdf_bytes:
                    public_id = f"receipts/Receipt_{clean_inv_id}.pdf"
                    up_res = cloudinary.uploader.upload(
                        pdf_bytes,
                        public_id=public_id,
                        resource_type="raw",
                        overwrite=True
                    )
                    cloudinary_url = up_res.get('secure_url')
            except Exception:
                pass

            pay_mode = receipt.paid_in if receipt and receipt.paid_in else "Cash"
            include_link = bool(data.get('include_link', False))
            link_section = f"\n\n🔗 *Payment Receipt (PDF):*\n{pdf_url}" if include_link else ""

            whatsapp_message = (
                f"Namaste {customer_name} ji,\n"
                f"*{firm_name}* se aapki Payment Receipt:\n\n"
                f"🧾 *Receipt Details:*\n"
                f"• Receipt No: *{formatted_bill_no}*\n"
                f"• Date: *{date_str or 'Today'}*\n"
                f"• Amount Received: *₹{int(round(float(amount_val))):,}/-*\n"
                f"• Mode: *{pay_mode}*"
                f"{link_section}\n\n"
                f"Dhanyawad! 🙏\n"
                f"Team *{firm_name}*"
            )

        else:
            return Response({'success': False, 'message': 'Unknown share type!'}, status=status.HTTP_400_BAD_REQUEST)

        # Clean mobile
        clean_mobile = _clean_phone_number(mobile_raw)
        encoded_message = urllib.parse.quote(whatsapp_message)

        # Direct links to avoid multi-tab conflicts:
        if clean_mobile:
            whatsapp_web_url = f"https://web.whatsapp.com/send?phone={clean_mobile}&text={encoded_message}"
            whatsapp_app_url = f"whatsapp://send?phone={clean_mobile}&text={encoded_message}"
            whatsapp_wa_url = f"https://wa.me/{clean_mobile}?text={encoded_message}"
        else:
            whatsapp_web_url = f"https://web.whatsapp.com/send?text={encoded_message}"
            whatsapp_app_url = f"whatsapp://send?text={encoded_message}"
            whatsapp_wa_url = f"https://wa.me/?text={encoded_message}"

        return Response({
            'success': True,
            'pdf_url': pdf_url,
            'cloudinary_url': cloudinary_url,
            'mobile': clean_mobile,
            'raw_mobile': mobile_raw,
            'customer_name': customer_name,
            'message': whatsapp_message,
            'whatsapp_url': whatsapp_web_url,
            'whatsapp_web_url': whatsapp_web_url,
            'whatsapp_app_url': whatsapp_app_url,
            'whatsapp_wa_url': whatsapp_wa_url,
            'bill_number': formatted_bill_no
        }, status=status.HTTP_200_OK)

    except Exception as e:
        return Response({
            'success': False,
            'message': f'Share link error: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
