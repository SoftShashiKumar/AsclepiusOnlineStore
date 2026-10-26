import io
import json
import os
import base64
import re
from django.http import HttpResponse, JsonResponse
from django.template.loader import render_to_string
from django.views.decorators.csrf import csrf_exempt
from django.db import transaction 
from weasyprint import HTML, CSS
from ..models import Sales, Customers, StockForSale, EstimatedSales, FirmProfile, ItemMaster, BillwiseSPSettlement
from django.conf import settings
from .number_to_words import convert_number_to_words

# ==========================================
# 🛠️ HELPER FUNCTIONS
# ==========================================

# def render_weasyprint_pdf(template_src, context_dict):
#     """HTML Template ko WeasyPrint ki madad se crisp PDF binary me convert karta hai."""
#     html_string = render_to_string(template_src, context_dict)
#     pdf_file = HTML(string=html_string).write_pdf()
#     return pdf_file

# 🔍 Is function ko replace/update karein top par:
# def render_weasyprint_pdf(template_src, context_dict):
#     """HTML Template ko WeasyPrint ki madad se crisp PDF binary me convert karta hai."""
#     html_string = render_to_string(template_src, context_dict)
#     # 🟢 base_url pass karna zaroori hai local images load hone ke liye
#     pdf_file = HTML(string=html_string, base_url=str(settings.BASE_DIR)).write_pdf()
#     return pdf_file
def render_weasyprint_pdf(template_src, context_dict):
    """HTML Template ko WeasyPrint ki madad se crisp PDF binary me convert karta hai."""
    
    # 🟢 NAYA LOGIC: Database se Firm ki details nikal kar context me bhejna
    firm = FirmProfile.objects.first()
    context_dict['firm'] = firm
    
    html_string = render_to_string(template_src, context_dict)
    # 🟢 base_url pass karna zaroori hai local images load hone ke liye
    pdf_file = HTML(string=html_string, base_url=str(settings.BASE_DIR)).write_pdf()
    return pdf_file

def safe_float(value):
    """String se symbols (₹, g) hata kar safe float return karta hai."""
    if value is None:
        return 0.0
    if isinstance(value, (int, float)):
        return float(value)
    cleaned_value = re.sub(r'[^0-9.]', '', str(value))
    try:
        return float(cleaned_value) if cleaned_value else 0.0
    except ValueError:
        return 0.0


def safe_int_round(value):
    """Numeric value ko round karke full integer bana deta hai."""
    if value is None:
        return 0
    if isinstance(value, (int, float)):
        return int(round(float(value)))
    cleaned_value = re.sub(r'[^0-9.]', '', str(value))
    try:
        return int(round(float(cleaned_value))) if cleaned_value else 0
    except ValueError:
        return 0


# ==========================================
# 🧾 SALES VOUCHER BACKEND ENDPOINTS
# ==========================================

# @csrf_exempt
# def get_next_invoice_no(request):
#     """React me invoiceNumber state ko auto-fill karne ka endpoint."""
#     if request.method == 'GET':
#         try:
#             all_invoices = Sales.objects.values_list('invoice', flat=True)
#             numeric_invoices = []
#             for inv in all_invoices:
#                 if inv and str(inv).isdigit():
#                     numeric_invoices.append(int(inv))
            
#             next_invoice = max(numeric_invoices) + 1 if numeric_invoices else 1
#             return JsonResponse({'success': True, 'next_invoice_no': str(next_invoice)})
#         except Exception as e:
#             return JsonResponse({'success': False, 'message': str(e)}, status=500)

@csrf_exempt
def get_next_invoice_no(request):
    """Bill type (Regular ya Estimated) ke aadhar par next invoice number return karein."""
    if request.method == 'GET':
        try:
            bill_type = request.GET.get('type', 'Regular')
            
            # Estimated ke case me EstimatedSales, nahi toh Sales table se data uthayein
            if bill_type == 'Estimated':
                all_invoices = EstimatedSales.objects.values_list('invoice', flat=True)
            else:
                all_invoices = Sales.objects.values_list('invoice', flat=True)
                
            numeric_invoices = []
            for inv in all_invoices:
                if inv and str(inv).isdigit():
                    numeric_invoices.append(int(inv))
            
            next_invoice = max(numeric_invoices) + 1 if numeric_invoices else 1
            return JsonResponse({'success': True, 'next_invoice_no': str(next_invoice)})
        except Exception as e:
            return JsonResponse({'success': False, 'message': str(e)}, status=500)

# @csrf_exempt
# def save_invoice_mysql(request):
#     if request.method == 'POST':
#         try:
#             data = json.loads(request.body)
#             items_data = data.get('items', [])
            
#             if not items_data:
#                 return JsonResponse({'status': 'error', 'message': 'Grid me koi item nahi hai!'}, status=400)
            
#             extracted_address = data.get('address') or data.get('customerAddress') or ""
            
#             # 1. Database me items save karna
#             with transaction.atomic():
#                 for item in items_data:                    
#                     current_tag = item.get('tagId')
                        
#                     if current_tag:
#                         clean_tag = str(current_tag).strip()
#                         StockForSale.objects.filter(tag_text=clean_tag).update(current_status='Sold')

#                     Sales.objects.create(
#                         invoice=data.get('invoiceNumber'),
#                         customer=data.get('customerName'),
#                         mobile=data.get('mobile'),
#                         addresses=extracted_address,  
#                         email=data.get('email'),
#                         bill_date=data.get('billDate'),
#                         payment_mode=data.get('paymentMode'),
#                         bill_grand_total=safe_int_round(data.get('overallBillTotal', 0)),
#                         bill_sattlement_amt=safe_int_round(data.get('billSettlementAmt', 0)),

#                         item_name=item.get('itemName'),
#                         item_id=item.get('itemId'),
#                         metal=item.get('metal'),
#                         purity=item.get('purity'),
#                         remarks=item.get('remarks'),
#                         weight=safe_float(item.get('weight', 0)),
#                         rate=safe_float(item.get('ratePerGram', 0)),
#                         making=safe_float(item.get('makingCharges', 0)),
#                         discount=safe_float(item.get('discount', 0)),
#                         total=safe_float(item.get('itemTotal', 0)),
#                         cgst=safe_float(item.get('cgst', 0)),
#                         sgst=safe_float(item.get('sgst', 0)),
#                         g_tot=safe_float(item.get('grandTotal', 0)),
#                         status="Saved"
#                     )
            
#             # 2. Customer Ledger Update Logic (Credit/Udhaari)
#             customer_id = data.get('selectedCustomerId')
#             payment_mode = data.get('paymentMode', '')

#             if payment_mode == 'Credit':
#                 credit_to_add = safe_float(data.get('billSettlementAmt', 0))
#             elif payment_mode == 'Cash & Credit':
#                 credit_to_add = safe_float(data.get('creditAmount', 0))
#             else:
#                 credit_to_add = 0.0

#             if customer_id and credit_to_add > 0:
#                 try:                    
#                     customer = Customers.objects.get(id=customer_id)
#                     customer.credit = float(customer.credit or 0) + credit_to_add
#                     customer.save()
#                 except Customers.DoesNotExist:
#                     pass

# @csrf_exempt
# def save_invoice_mysql(request):
#     if request.method == 'POST':
#         try:
#             data = json.loads(request.body)
#             items_data = data.get('items', [])
#             bill_type = data.get('billType', 'Regular') # 👈 Front-end se pass kiya gaya billType
            
#             if not items_data:
#                 return JsonResponse({'status': 'error', 'message': 'Grid me koi item nahi hai!'}, status=400)
            
#             extracted_address = data.get('address') or data.get('customerAddress') or ""
            
#             with transaction.atomic():
#                 for item in items_data:
#                     current_tag = item.get('tagId')
                    
#                     # 🔴 Condition 1: Agar Estimated Bill hai toh 'Estimated_sales' table me save karein
#                     if bill_type == 'Estimated':
#                         EstimatedSales.objects.create(
#                             invoice=data.get('invoiceNumber'),
#                             customer=data.get('customerName'),
#                             mobile=data.get('mobile'),
#                             addresses=extracted_address,  
#                             email=data.get('email'),
#                             bill_date=data.get('billDate'),
#                             payment_mode=data.get('paymentMode'),
#                             bill_grand_total=safe_int_round(data.get('overallBillTotal', 0)),
#                             bill_sattlement_amt=safe_int_round(data.get('billSettlementAmt', 0)),
#                             item_name=item.get('itemName'),
#                             item_id=item.get('itemId'),
#                             metal=item.get('metal'),
#                             purity=item.get('purity'),
#                             remarks=item.get('remarks'),
#                             weight=safe_float(item.get('weight', 0)),
#                             rate=safe_float(item.get('ratePerGram', 0)),
#                             making=safe_float(item.get('makingCharges', 0)),
#                             discount=safe_float(item.get('discount', 0)),
#                             total=safe_float(item.get('itemTotal', 0)),
#                             cgst=safe_float(item.get('cgst', 0)),
#                             sgst=safe_float(item.get('sgst', 0)),
#                             g_tot=safe_float(item.get('grandTotal', 0)),
#                             status="Estimated"
#                         )
#                     # 🟢 Condition 2: Agar Regular Bill hai toh Purana Logic (Sales table) chalega
#                     else:
#                         if current_tag:
#                             clean_tag = str(current_tag).strip()
#                             StockForSale.objects.filter(tag_text=clean_tag).update(current_status='Sold')

#                         Sales.objects.create(
#                             invoice=data.get('invoiceNumber'),
#                             customer=data.get('customerName'),
#                             mobile=data.get('mobile'),
#                             addresses=extracted_address,  
#                             email=data.get('email'),
#                             bill_date=data.get('billDate'),
#                             payment_mode=data.get('paymentMode'),
#                             bill_grand_total=safe_int_round(data.get('overallBillTotal', 0)),
#                             bill_sattlement_amt=safe_int_round(data.get('billSettlementAmt', 0)),
#                             item_name=item.get('itemName'),
#                             item_id=item.get('itemId'),
#                             metal=item.get('metal'),
#                             purity=item.get('purity'),
#                             remarks=item.get('remarks'),
#                             weight=safe_float(item.get('weight', 0)),
#                             rate=safe_float(item.get('ratePerGram', 0)),
#                             making=safe_float(item.get('makingCharges', 0)),
#                             discount=safe_float(item.get('discount', 0)),
#                             total=safe_float(item.get('itemTotal', 0)),
#                             cgst=safe_float(item.get('cgst', 0)),
#                             sgst=safe_float(item.get('sgst', 0)),
#                             g_tot=safe_float(item.get('grandTotal', 0)),
#                             status="Saved"
#                         )
            
#             # Customer Udhaari (Credit) update sirf Regular bills ke liye
#             if bill_type != 'Estimated':
#                 customer_id = data.get('selectedCustomerId')
#                 payment_mode = data.get('paymentMode', '')

#                 if payment_mode == 'Credit':
#                     credit_to_add = safe_float(data.get('billSettlementAmt', 0))
#                 elif payment_mode == 'Cash & Credit':
#                     credit_to_add = safe_float(data.get('creditAmount', 0))
#                 else:
#                     credit_to_add = 0.0

#                 if customer_id and credit_to_add > 0:
#                     try:                    
#                         customer = Customers.objects.get(id=customer_id)
#                         customer.credit = float(customer.credit or 0) + credit_to_add
#                         customer.save()
#                     except Customers.DoesNotExist:
#                         pass


# @csrf_exempt
# def save_invoice_mysql(request):
#     if request.method == 'POST':
#         try:
#             data = json.loads(request.body)
#             items_data = data.get('items', [])
#             bill_type = data.get('billType', 'Regular') # Front-end se aane wala billType
            
#             if not items_data:
#                 return JsonResponse({'status': 'error', 'message': 'Grid me koi item nahi hai!'}, status=400)
            
#             extracted_address = data.get('address') or data.get('customerAddress') or ""
            
#             with transaction.atomic():
#                 for item in items_data:
#                     current_tag = item.get('tagId')
                    
#                     # 🔴 CONDITION 1: ESTIMATED BILL
#                     if bill_type == 'Estimated':
#                         # 1. Stock Status ko 'Estimated' set karein
#                         if current_tag:
#                             clean_tag = str(current_tag).strip()
#                             StockForSale.objects.filter(tag_text=clean_tag).update(current_status='Estimated')

#                         # 2. EstimatedSales Table me save karein
#                         EstimatedSales.objects.create(
#                             invoice=data.get('invoiceNumber'),
#                             customer=data.get('customerName'),
#                             mobile=data.get('mobile'),
#                             addresses=extracted_address,  
#                             email=data.get('email'),
#                             bill_date=data.get('billDate'),
#                             payment_mode=data.get('paymentMode'),
#                             bill_grand_total=safe_int_round(data.get('overallBillTotal', 0)),
#                             bill_sattlement_amt=safe_int_round(data.get('billSettlementAmt', 0)),
#                             item_name=item.get('itemName'),
#                             item_id=item.get('itemId'),
#                             metal=item.get('metal'),
#                             purity=item.get('purity'),
#                             remarks=item.get('remarks'),
#                             weight=safe_float(item.get('weight', 0)),
#                             rate=safe_float(item.get('ratePerGram', 0)),
#                             making=safe_float(item.get('makingCharges', 0)),
#                             discount=safe_float(item.get('discount', 0)),
#                             total=safe_float(item.get('itemTotal', 0)),
#                             cgst=safe_float(item.get('cgst', 0)),
#                             sgst=safe_float(item.get('sgst', 0)),
#                             g_tot=safe_float(item.get('grandTotal', 0)),
#                             status="Estimated"
#                         )

#                     # 🟢 CONDITION 2: REGULAR BILL
#                     else:
#                         # 1. Stock Status ko 'Sold' set karein
#                         if current_tag:
#                             clean_tag = str(current_tag).strip()
#                             StockForSale.objects.filter(tag_text=clean_tag).update(current_status='Sold')

#                         # 2. Regular Sales Table me save karein
#                         Sales.objects.create(
#                             invoice=data.get('invoiceNumber'),
#                             customer=data.get('customerName'),
#                             mobile=data.get('mobile'),
#                             addresses=extracted_address,  
#                             email=data.get('email'),
#                             bill_date=data.get('billDate'),
#                             payment_mode=data.get('paymentMode'),
#                             bill_grand_total=safe_int_round(data.get('overallBillTotal', 0)),
#                             bill_sattlement_amt=safe_int_round(data.get('billSettlementAmt', 0)),
#                             item_name=item.get('itemName'),
#                             item_id=item.get('itemId'),
#                             metal=item.get('metal'),
#                             purity=item.get('purity'),
#                             remarks=item.get('remarks'),
#                             weight=safe_float(item.get('weight', 0)),
#                             rate=safe_float(item.get('ratePerGram', 0)),
#                             making=safe_float(item.get('makingCharges', 0)),
#                             discount=safe_float(item.get('discount', 0)),
#                             total=safe_float(item.get('itemTotal', 0)),
#                             cgst=safe_float(item.get('cgst', 0)),
#                             sgst=safe_float(item.get('sgst', 0)),
#                             g_tot=safe_float(item.get('grandTotal', 0)),
#                             status="Saved"
#                         )
            
#             # 💳 CUSTOMER LEDGER (CREDIT) UPDATE LOGIC
#             # (Dono Bill Types: 'Regular' aur 'Estimated' me customer credit update hoga)
#             customer_id = data.get('selectedCustomerId')
#             payment_mode = data.get('paymentMode', '')

#             if payment_mode == 'Credit':
#                 credit_to_add = safe_float(data.get('billSettlementAmt', 0))
#             elif payment_mode == 'Cash & Credit':
#                 credit_to_add = safe_float(data.get('creditAmount', 0))
#             else:
#                 credit_to_add = 0.0

#             if customer_id and credit_to_add > 0:
#                 try:                    
#                     customer = Customers.objects.get(id=customer_id)
#                     customer.credit = float(customer.credit or 0) + credit_to_add
#                     customer.save()
#                 except Customers.DoesNotExist:
#                     pass

#             # 3. PDF Folder Structure aur Logo Config
#             save_folder = r"C:\Tiya\Tiya_Jewellers_Invoices"
#             if not os.path.exists(save_folder):
#                 os.makedirs(save_folder)
                
#             logo_absolute_path = r"C:\Tiya\Logo\logo.png"
#             logo_base64 = ""
#             if os.path.exists(logo_absolute_path):
#                 with open(logo_absolute_path, "rb") as image_file:
#                     logo_base64 = base64.b64encode(image_file.read()).decode('utf-8')
            
#             # CGST & SGST Calculations
#             total_cgst = sum(safe_int_round(item.get('cgst', 0)) for item in items_data)
#             total_sgst = sum(safe_int_round(item.get('sgst', 0)) for item in items_data)

#             # Sold By logged-in user fix
#             logged_user = "--"
#             if request.user and request.user.is_authenticated:
#                 logged_user = request.user.first_name or request.user.username or "Admin"
#             elif data.get('soldBy'):
#                 logged_user = data.get('soldBy')
#             elif data.get('username'):
#                 logged_user = data.get('username')            
            
#             cleaned_items = []
#             for item in items_data:
#                 raw_img = item.get('image') or item.get('imageUrl') or ""
#                 image_path = ""
                
#                 if raw_img:
#                     # Step A: Django Media Path identify karein
#                     if '/media/' in raw_img:
#                         relative_path = raw_img.split('/media/')[-1]
#                         full_path = os.path.join(settings.MEDIA_ROOT, relative_path)
#                     else:
#                         full_path = os.path.join(settings.MEDIA_ROOT, raw_img)

#                     # Step B: Check karein agar file disk par maujood hai toh file:// URL banaayein
#                     if os.path.exists(full_path):
#                         image_path = 'file:///' + full_path.replace('\\', '/')
#                     elif raw_img.startswith('http') or raw_img.startswith('data:'):
#                         image_path = raw_img

#                 cleaned_items.append({
#                     'itemId': item.get('itemId'),
#                     'itemName': item.get('itemName'),
#                     'image': image_path,  # <--- WeasyPrint ab exact local file padh sakega
#                     'metal': item.get('metal'),
#                     'purity': item.get('purity'),
#                     'ratePerGram': safe_int_round(item.get('ratePerGram', 0)),
#                     'weight': safe_float(item.get('weight', 0)),
#                     'makingCharges': safe_int_round(item.get('makingCharges', 0)),
#                     'discount': safe_int_round(item.get('discount', 0)),
#                     'itemTotal': safe_int_round(item.get('itemTotal', 0)),
#                     'cgst': safe_int_round(item.get('cgst', 0)),
#                     'sgst': safe_int_round(item.get('sgst', 0)),
#                 })
            
#             billSattlement_val = safe_int_round(data.get('billSettlementAmt', 0))
#             formatted_grand_total = f"Rs. {billSattlement_val}/-"
#             amount_in_words = convert_number_to_words(billSattlement_val)

#             invoice_data = {
#                 'invoice_number': data.get('invoiceNumber'),
#                 'bill_date': data.get('billDate'),
#                 'customer_name': data.get('customerName'),
#                 'contact': data.get('mobile'),
#                 'address': extracted_address if extracted_address else "N/A",
#                 'payment_mode': data.get('paymentMode'),
#                 'items': cleaned_items,
#                 'grand_total': safe_int_round(data.get('overallBillTotal', 0)),
#                 'formatted_grand_total': formatted_grand_total, # 👈 'Rs. 2000/-'
#                 'amount_in_words': amount_in_words,
#                 'cgst': total_cgst,       
#                 'sgst': total_sgst,       
#                 'bill_settlement_amt': safe_int_round(data.get('billSettlementAmt', 0)),
#                 'logo_base64': logo_base64,
#                 'cash_amt': safe_int_round(data.get('cashAmount', 0)),
#                 'credit_amt': safe_int_round(data.get('creditAmount', 0)),
#                 'sold_by': logged_user,  # Dynamic User
#             }
            
#             # 4. WeasyPrint Se PDF Generate Karna
#             pdf_data = render_weasyprint_pdf('store/invoice_pdf.html', invoice_data)
            
#             if pdf_data:
#                 invoice_num = invoice_data.get('invoice_number', 'unknown')
#                 file_path = os.path.join(save_folder, f"Invoice_{invoice_num}.pdf")
#                 with open(file_path, 'wb') as f:
#                     f.write(pdf_data)
#                 return HttpResponse(pdf_data, content_type='application/pdf')
            
#             return JsonResponse({'status': 'error', 'message': 'PDF Generation Failed'}, status=500)
            
#         except Exception as e:
#             return JsonResponse({'status': 'error', 'message': str(e)}, status=400)

@csrf_exempt
def save_invoice_mysql(request):
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            items_data = data.get('items', [])
            bill_type = data.get('billType', 'Regular') # Front-end se billType
            
            if not items_data:
                return JsonResponse({'status': 'error', 'message': 'Grid me koi item nahi hai!'}, status=400)
            
            extracted_address = data.get('address') or data.get('customerAddress') or ""
            payment_mode = data.get('paymentMode', '')
            overall_total = safe_float(data.get('overallBillTotal', 0))
            raw_cash = safe_float(data.get('cashAmount', 0))
            raw_upi = safe_float(data.get('upiAmount', 0))
            raw_credit = safe_float(data.get('creditAmount', 0))

            if payment_mode == 'Cash':
                cash_val = overall_total
                upi_val = 0.0
                credit_val = 0.0
            elif payment_mode == 'UPI':
                cash_val = 0.0
                upi_val = overall_total
                credit_val = 0.0
            elif payment_mode == 'Credit':
                cash_val = 0.0
                upi_val = 0.0
                credit_val = overall_total
            elif payment_mode == 'Cash & Credit':
                cash_val = raw_cash
                upi_val = 0.0
                credit_val = raw_credit
            elif payment_mode == 'Cash & UPI':
                cash_val = raw_cash
                upi_val = raw_upi
                credit_val = 0.0
            elif payment_mode == 'Cash & UPI & Credit':
                cash_val = raw_cash
                upi_val = raw_upi
                credit_val = raw_credit
            else:
                cash_val = raw_cash
                upi_val = raw_upi
                credit_val = raw_credit

            logged_user = data.get('soldBy') or data.get('username') or ""
            if (not logged_user or logged_user == "--") and request.user and request.user.is_authenticated:
                logged_user = request.user.first_name or request.user.username or "Admin"
            if not logged_user or logged_user == "--":
                logged_user = "Admin"

            with transaction.atomic():
                for item in items_data:
                    current_tag = item.get('tagId')
                    item_qty = safe_int_round(item.get('quantity', 1))
                    
                    if bill_type == 'Estimated':
                        # Optionally do nothing for stock in estimated, or log it
                        EstimatedSales.objects.create(
                            invoice=data.get('invoiceNumber'),
                            customer=data.get('customerName'),
                            mobile=data.get('mobile'),
                            addresses=extracted_address,  
                            email=data.get('email'),
                            bill_date=data.get('billDate'),
                            payment_mode=data.get('paymentMode'),
                            bill_grand_total=safe_int_round(data.get('overallBillTotal', 0)),
                            bill_sattlement_amt=safe_int_round(data.get('billSettlementAmt', 0)),
                            item_name=item.get('itemName'),
                            item_id=item.get('itemId'),
                            remarks=item.get('remarks'),
                            rate=safe_float(item.get('rate', 0)),
                            discount=safe_float(item.get('discount', 0)),
                            total=safe_float(item.get('itemTotal', 0)),
                            cash=cash_val,
                            credit=credit_val,
                            upi=upi_val,
                            sold_by=logged_user,
                            status="Estimated"
                        )
                    else:
                        if current_tag:
                            clean_tag = str(current_tag).strip()
                            try:
                                item_master = ItemMaster.objects.get(tag_text=clean_tag)
                                if item_master.available_quantity is not None:
                                    item_master.available_quantity -= item_qty
                                else:
                                    item_master.available_quantity = -item_qty
                                item_master.save()
                            except ItemMaster.DoesNotExist:
                                pass

                        Sales.objects.create(
                            invoice=data.get('invoiceNumber'),
                            sales_order_id=data.get('salesOrderId'),
                            asclepius_id=data.get('asclepiusId'),
                            customer=data.get('customerName'),
                            mobile=data.get('mobile'),
                            addresses=extracted_address,  
                            email=data.get('email'),
                            bill_date=data.get('billDate'),
                            payment_mode=data.get('paymentMode'),
                            bill_grand_total=safe_int_round(data.get('overallBillTotal', 0)),
                            bill_sattlement_amt=safe_int_round(data.get('billSettlementAmt', 0)),
                            item_name=item.get('itemName'),
                            item_id=item.get('itemId'),
                            item_group=item.get('group'),
                            remarks=item.get('remarks'),
                            quantity=safe_int_round(item.get('quantity', 1)),
                            rate=safe_float(item.get('rate', 0)),
                            discount=safe_float(item.get('discount', 0)),
                            total=safe_float(item.get('itemTotal', 0)),
                            cash=cash_val,
                            credit=credit_val,
                            upi=upi_val,
                            sold_by=logged_user,
                            status=data.get('status') or "Saved",
                            repurchase=data.get('repurchase', ''),
                            activation=data.get('activation', ''),
                            for_ids=data.get('forIds', ''),
                            for_name=data.get('forNames', '') or data.get('forName', ''),
                            sp=safe_float(item.get('sp', 0)),
                            tsp=safe_float(data.get('overallSPTotal', 0))
                        )
            
            # Save into BillwiseSPSettlement Table
            customer_actions = data.get('customerActions', [])
            for action in customer_actions:
                used_in_str = action.get('type')
                if action.get('subType'):
                    used_in_str = f"{used_in_str} {action.get('subType')}"
                
                BillwiseSPSettlement.objects.create(
                    inv_no=data.get('invoiceNumber'),
                    tsp=safe_float(data.get('overallSPTotal', 0)),
                    customer=data.get('customerName'),
                    for_id=action.get('forId'),
                    for_name=action.get('forName', '') or '',
                    used_in=used_in_str,
                    used_sp=safe_float(action.get('useSP', 0)),
                    status="Pending",
                    remarks=action.get('remarks'),
                    bill_date=data.get('billDate')
                )

            # 💳 CUSTOMER LEDGER UPDATE LOGIC
            customer_id = data.get('selectedCustomerId')

            if payment_mode == 'Credit':
                credit_to_add = safe_float(data.get('billSettlementAmt', 0)) or overall_total
            elif payment_mode in ['Cash & Credit', 'Cash & UPI & Credit']:
                credit_to_add = credit_val
            else:
                credit_to_add = 0.0

            if customer_id and credit_to_add > 0:
                try:                    
                    customer = Customers.objects.get(id=customer_id)
                    customer.credit = float(customer.credit or 0) + credit_to_add
                    customer.save()
                except Customers.DoesNotExist:
                    pass

            # Update Sales Order Status if applicable
            sales_order_id = data.get('salesOrderId')
            if sales_order_id:
                from store.models import SalesOrder
                SalesOrder.objects.filter(order_number=sales_order_id).update(status='done/sold')

            # 📁 DYNAMIC FOLDER STRUCTURE ACCORDING TO BILL TYPE
            if bill_type == 'Estimated':
                save_folder = r"C:\Tiya\Tiya_Jewellers_EstimatedBill"
                invoice_title = "ESTIMATED BILL"  # PDF Heading
            else:
                save_folder = r"C:\Tiya\Tiya_Jewellers_Invoices"
                invoice_title = "SALES INVOICE"  # PDF Heading
                
            if not os.path.exists(save_folder):
                os.makedirs(save_folder)
                
            # 🟢 NAYA LOGIC: Robust logo loader (Local media/firm_logos/A1_Logo.png or Cloudinary)
            from .receipt_views import get_logo_base64
            logo_base64 = get_logo_base64()
                    
            logged_user = "--"
            if request.user and request.user.is_authenticated:
                logged_user = request.user.first_name or request.user.username or "Admin"
            elif data.get('soldBy'):
                logged_user = data.get('soldBy')
            elif data.get('username'):
                logged_user = data.get('username')            
            
            cleaned_items = []
            total_tsp = 0
            for item in items_data:
                raw_img = item.get('image') or item.get('imageUrl') or ""
                image_path = ""
                
                if raw_img:
                    if '/media/' in raw_img:
                        relative_path = raw_img.split('/media/')[-1]
                        full_path = os.path.join(settings.MEDIA_ROOT, relative_path)
                    else:
                        full_path = os.path.join(settings.MEDIA_ROOT, raw_img)

                    if os.path.exists(full_path):
                        image_path = 'file:///' + full_path.replace('\\', '/')
                    elif raw_img.startswith('http') or raw_img.startswith('data:'):
                        image_path = raw_img

                sp_val = safe_float(item.get('itemTotalSP', 0))
                total_tsp += sp_val
                
                cleaned_items.append({
                    'itemId': item.get('itemId'),
                    'itemName': item.get('itemName'),
                    'image': image_path,
                    'group': item.get('group', ''),
                    'quantity': safe_int_round(item.get('quantity', 1)),
                    'rate': safe_int_round(item.get('rate', 0)),
                    'sp': sp_val,
                    'itemTotal': safe_int_round(item.get('itemTotal', 0))
                })
            
            overall_total_val = safe_int_round(data.get('overallBillTotal', 0))
            formatted_grand_total = f"Rs. {overall_total_val}/-"
            amount_in_words = convert_number_to_words(overall_total_val)

            # Format SP adjustments for invoice PDF
            customer_actions = data.get('customerActions', [])
            cleaned_sp_adjustments = []
            for idx, action in enumerate(customer_actions, 1):
                used_in_str = action.get('type', '')
                if action.get('subType'):
                    used_in_str = f"{used_in_str} {action.get('subType')}".strip()
                cleaned_sp_adjustments.append({
                    'slno': idx,
                    'for_id': action.get('forId') or '-',
                    'name': action.get('forName') or action.get('name') or '-',
                    'sp': safe_float(action.get('useSP', 0)),
                    'used_in': used_in_str or '-'
                })

            invoice_data = {
                'sp_adjustments': cleaned_sp_adjustments,
                'invoice_title': invoice_title, 
                'invoice_number': data.get('invoiceNumber'),
                'bill_date': data.get('billDate'),
                'customer_name': data.get('customerName'),
                'contact': data.get('mobile'),
                'address': extracted_address if extracted_address else "N/A",
                'payment_mode': data.get('paymentMode'),
                'items': cleaned_items,
                'total_tsp': total_tsp,
                'grand_total': safe_int_round(data.get('overallBillTotal', 0)),
                'formatted_grand_total': formatted_grand_total,
                'amount_in_words': amount_in_words,
                'cgst': 0,       
                'sgst': 0,       
                'bill_settlement_amt': safe_int_round(data.get('billSettlementAmt', 0)),
                'logo_base64': logo_base64,
                'cash_amt': safe_int_round(cash_val),
                'credit_amt': safe_int_round(credit_val),
                'upi_amt': safe_int_round(upi_val),
                'sold_by': logged_user,
            }
            
            pdf_data = render_weasyprint_pdf('store/invoice_pdf.html', invoice_data)
            
            if pdf_data:
                invoice_num = invoice_data.get('invoice_number', 'unknown')
                prefix = "Est_Invoice_" if bill_type == 'Estimated' else "Invoice_"
                file_path = os.path.join(save_folder, f"{prefix}{invoice_num}.pdf")
                
                with open(file_path, 'wb') as f:
                    f.write(pdf_data)
                return HttpResponse(pdf_data, content_type='application/pdf')
            
            return JsonResponse({'status': 'error', 'message': 'PDF Generation Failed'}, status=500)
            
        except Exception as e:
            return JsonResponse({'status': 'error', 'message': str(e)}, status=400)