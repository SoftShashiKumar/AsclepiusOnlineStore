import json
import re
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
from django.db.models import Q

# Main store.models se Models safely import kiye hain
from store.models import Customers, Sales, ReceiptVoucher
from store.middleware import get_current_firm_id

# 🔤 Helper: Har word ka pehla letter capital aur baaki small
def format_title_case(name_str):
    if not name_str:
        return ""
    return " ".join([word.capitalize() for word in name_str.strip().split()])

# 📱 Helper: Strict Indian Mobile Validation (10 digits starting with 6, 7, 8, or 9)
def validate_indian_mobile(mobile_str, field_name="Mobile Number", required=False):
    if not mobile_str:
        if required:
            return False, None, f"{field_name} dalna anivarya (mandatory) hai!"
        return True, None, None
    clean = re.sub(r'[\s\-\(\)\+]', '', str(mobile_str))
    if len(clean) == 12 and clean.startswith('91'):
        clean = clean[2:]
    elif len(clean) == 11 and clean.startswith('0'):
        clean = clean[1:]
    if not clean.isdigit():
        return False, None, f"{field_name} me sirf numbers (digits) hone chahiye!"
    if len(clean) != 10:
        return False, None, f"{field_name} bilkul 10-digit ka hona chahiye (Aapne {len(clean)} digits dale hain)!"
    if clean[0] not in ['6', '7', '8', '9']:
        return False, None, f"{field_name} sahi nahi hai! Indian mobile number 6, 7, 8 ya 9 se shuru hona chahiye."
    if len(set(clean)) == 1:
        return False, None, f"{field_name} galat lag raha hai (sabhi digits same hain)!"
    return True, clean, None

# 🔥 1. Naya Customer Add / Purana Update karne ka API (Firm Scoped)
@csrf_exempt
@api_view(['POST'])
def add_customer(request):
    try:
        query_firm = request.data.get('firm_id') or request.GET.get('firm_id') or request.headers.get('X-Firm-ID')
        firm_id = query_firm.strip().upper() if query_firm else get_current_firm_id(request)
        clean_firm = 'DEMO' if 'DEMO' in firm_id else ('SHREE' if 'SHREE' in firm_id else firm_id)
        data = request.data
        customer_id = data.get('id')
        mobile1 = (data.get('mobile1') or data.get('mobile') or '').strip()
        mobile2 = (data.get('mobile2') or '').strip()
        email = (data.get('email') or '').strip()
        address = (data.get('address') or '').strip()
        ds_id = (data.get('ds_id') or data.get('referance') or '').strip()
        remarks = (data.get('remarks') or '').strip()
        raw_name = (data.get('cname') or '').strip()
        formatted_name = format_title_case(raw_name)

        is_new = not customer_id
        is_m1_valid, clean_m1, err_m1 = validate_indian_mobile(mobile1, "Mobile 1", required=is_new)
        if not is_m1_valid:
            return Response({'success': False, 'message': err_m1}, status=status.HTTP_400_BAD_REQUEST)
        mobile1 = clean_m1 or ''

        if mobile2:
            is_m2_valid, clean_m2, err_m2 = validate_indian_mobile(mobile2, "Mobile 2", required=False)
            if not is_m2_valid:
                return Response({'success': False, 'message': err_m2}, status=status.HTTP_400_BAD_REQUEST)
            if clean_m2 and clean_m2 == mobile1:
                return Response({'success': False, 'message': 'Mobile 2 aur Mobile 1 dono same nahi ho sakte! Alag number daalein.'}, status=status.HTTP_400_BAD_REQUEST)
            mobile2 = clean_m2 or ''
        
        # 🔄 CASE 1: UPDATE
        if customer_id:
            customer = Customers.objects.filter(id=customer_id, firm_id__iexact=clean_firm).first() or Customers.objects.filter(id=customer_id).first()
            if not customer:
                return Response({'success': False, 'message': 'Update ke liye customer nahi mila!'}, status=status.HTTP_404_NOT_FOUND)
            
            customer.cname = formatted_name
            customer.mobile1 = mobile1 if mobile1 else None
            customer.mobile2 = mobile2 if mobile2 else None
            customer.email = email if email else None
            customer.address = address
            customer.referance = ds_id if ds_id else None
            customer.remarks = remarks
            customer.firm_id = clean_firm
            customer.save()
            
            return Response({'success': True, 'message': f'Customer "{customer.cname}" ka record safaltapoorvak UPDATE ho gaya!'}, status=status.HTTP_200_OK)
            
        # ➕ CASE 2: ADD NEW
        else:
            if ds_id and Customers.objects.filter(referance=ds_id, firm_id__iexact=clean_firm).exists():
                return Response({'success': False, 'message': f'Is DS Code ({ds_id}) se customer pehle se maujood hai!'}, status=status.HTTP_400_BAD_REQUEST)
            
            customer = Customers.objects.create(
                cname=formatted_name,
                mobile1=mobile1 if mobile1 else None,
                mobile2=mobile2 if mobile2 else None,
                email=email if email else None,
                address=address,
                referance=ds_id if ds_id else None,
                remarks=remarks if remarks else '',
                status="Active",
                credit=0,
                firm_id=clean_firm
            )
            return Response({
                'success': True, 
                'message': 'Naya Customer safaltapoorvak add ho gaya!',
                'customer': {
                    'id': customer.id,
                    'name': customer.cname,
                    'mobile': customer.mobile1 or '',
                    'mobile2': customer.mobile2 or '',
                    'address': customer.address or '',
                    'email': customer.email or '',
                    'current_dues': customer.credit or 0,
                    'ds_id': customer.referance or ''
                }
            }, status=status.HTTP_201_CREATED)
            
    except Exception as e:
        return Response({'success': False, 'message': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

# 🔥 1B. Online Order/Enquiry se Customer Check aur Auto-Add (Firm Scoped)
@csrf_exempt
@api_view(['POST'])
def ensure_customer_from_order(request):
    try:
        query_firm = request.data.get('firm_id') or request.GET.get('firm_id') or request.headers.get('X-Firm-ID')
        firm_id = query_firm.strip().upper() if query_firm else get_current_firm_id(request)
        clean_firm = 'DEMO' if 'DEMO' in firm_id else ('SHREE' if 'SHREE' in firm_id else firm_id)
        clean_firm = 'DEMO' if 'DEMO' in firm_id else ('SHREE' if 'SHREE' in firm_id else firm_id)

        data = request.data
        ds_id = str(data.get('ds_id') or data.get('asclepius_id') or '').strip()
        raw_name = str(data.get('cname') or data.get('customer_name') or '').strip()
        mobile = str(data.get('mobile') or data.get('mobile1') or data.get('customer_mobile') or '').strip()
        address = str(data.get('address') or data.get('customer_address') or '').strip()

        formatted_name = format_title_case(raw_name)

        # Clean digits from mobile
        clean_digits = re.sub(r'\D', '', mobile)
        clean_mobile = clean_digits[-10:] if len(clean_digits) >= 10 else clean_digits

        existing_customer = None

        # 🎯 STRICT RULE: Customers table ke 'Referance' field ko enquiries page ID (ds_id / asclepius_id) se match karna hai.
        # Mobile number se match nahi karna hai kyuki 2 ya zyada customers ke mobile number same ho sakte hain.
        if ds_id and ds_id != '-':
            existing_customer = Customers.objects.filter(referance__iexact=ds_id, firm_id__iexact=clean_firm).first()

        # Agar pehle se maujood hai to "chhor dena hai" (return existing customer as-is)
        if existing_customer:
            return Response({
                'success': True,
                'already_exists': True,
                'message': f'Customer "{existing_customer.cname}" (DS: {existing_customer.referance}) pehle se Customers table ({clean_firm}) me maujood hai.',
                'customer': {
                    'id': existing_customer.id,
                    'name': existing_customer.cname or '',
                    'ds_id': existing_customer.referance or '',
                    'mobile': existing_customer.mobile1 or '',
                    'address': existing_customer.address or '',
                    'current_dues': existing_customer.credit or 0,
                    'firm_id': clean_firm
                }
            }, status=status.HTTP_200_OK)

        # Agar table me nahi hai to "jor dena hai" (create new customer)
        new_customer = Customers.objects.create(
            cname=formatted_name or f"Customer {ds_id or clean_mobile}",
            mobile1=clean_mobile if clean_mobile else None,
            address=address,
            referance=ds_id if ds_id and ds_id != '-' else None,
            status="Active",
            credit=0,
            advanced_sp=0.00,
            firm_id=clean_firm
        )

        return Response({
            'success': True,
            'already_exists': False,
            'message': f'Customer "{new_customer.cname}" safaltapoorvak Customers table ({clean_firm}) me add ho gaya!',
            'customer': {
                'id': new_customer.id,
                'name': new_customer.cname,
                'ds_id': new_customer.referance or '',
                'mobile': new_customer.mobile1 or '',
                'address': new_customer.address or '',
                'current_dues': 0,
                'firm_id': clean_firm
            }
        }, status=status.HTTP_201_CREATED)

    except Exception as e:
        return Response({'success': False, 'message': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# 🔥 2. Customer Ledger (Firm Scoped)
@api_view(['GET'])
def get_customer_ledger(request, customer_id):
    try:
        query_firm = request.data.get('firm_id') or request.GET.get('firm_id') or request.headers.get('X-Firm-ID')
        firm_id = query_firm.strip().upper() if query_firm else get_current_firm_id(request)
        clean_firm = 'DEMO' if 'DEMO' in firm_id else ('SHREE' if 'SHREE' in firm_id else firm_id)
        customer = Customers.objects.filter(id=customer_id, firm_id__iexact=firm_id).first()
        if not customer:
            customer = Customers.objects.filter(id=customer_id).first()
            if customer and customer.firm_id:
                firm_id = customer.firm_id.upper()
        if not customer:
            return Response({'success': False, 'message': 'Customer nahi mila!'}, status=status.HTTP_404_NOT_FOUND)
            
        sales_filter = Q()
        if customer.mobile1:
            clean_m1 = str(customer.mobile1).strip()
            sales_filter |= Q(mobile=clean_m1) | Q(mobile__icontains=clean_m1[-10:] if len(clean_m1) >= 10 else clean_m1)
        if customer.mobile2:
            clean_m2 = str(customer.mobile2).strip()
            sales_filter |= Q(mobile=clean_m2) | Q(mobile__icontains=clean_m2[-10:] if len(clean_m2) >= 10 else clean_m2)
        if customer.referance:
            sales_filter |= Q(asclepius_id__iexact=str(customer.referance).strip())
        if customer.cname:
            sales_filter |= Q(customer__iexact=str(customer.cname).strip())

        sales_records = []
        if sales_filter:
            sales_records = list(Sales.objects.filter(sales_filter, firm_id__iexact=firm_id).order_by('bill_date', 'invoice'))

        invoices_dict = {}
        for s in sales_records:
            inv_key = s.invoice if s.invoice else f"order_{s.sales_order_id or s.id}"
            if inv_key not in invoices_dict:
                invoices_dict[inv_key] = {
                    'invoice': s.invoice,
                    'sales_order_id': s.sales_order_id,
                    'bill_date': s.bill_date,
                    'grand_total': s.bill_grand_total or s.total or 0,
                    'settlement_amt': s.bill_sattlement_amt or 0,
                    'cash': float(s.cash or 0),
                    'upi': float(s.upi or 0),
                    'credit': float(s.credit or 0),
                    'tsp': float(s.tsp or 0),
                    'tsp_status': s.tsp_status or 'Earned',
                    'items': []
                }
            invoices_dict[inv_key]['items'].append({
                'item_name': s.item_name,
                'quantity': s.quantity,
                'rate': s.rate,
                'total': s.total
            })

        receipt_filter = Q(customer_id=customer.id) | Q(customer_name__iexact=customer.cname)
        if customer.mobile1:
            receipt_filter |= Q(remarks__icontains=customer.mobile1)

        receipts = ReceiptVoucher.objects.filter(receipt_filter, firm_id__iexact=firm_id).order_by('on_date')

        all_transactions = []
        for inv_key, inv_data in invoices_dict.items():
            b_date = inv_data['bill_date']
            b_date_str = str(b_date) if b_date else ''
            disp_date = b_date.strftime('%d-%b-%Y') if hasattr(b_date, 'strftime') else b_date_str
            doc_str = f"Invoice #{inv_data['invoice']}" if inv_data['invoice'] else f"Order #{inv_data['sales_order_id']}"
            g_total = float(inv_data['grand_total'])

            all_transactions.append({
                'type': 'Sale',
                'date': b_date_str,
                'display_date': disp_date,
                'doc_no': doc_str,
                'ref_no': str(inv_data['invoice'] or inv_data['sales_order_id'] or '-'),
                'particulars': doc_str,
                'total_amount': g_total,
                'debit': g_total,
                'credit': 0.0,
                'cash': float(inv_data['cash']),
                'upi': float(inv_data['upi']),
                'credit_added': float(inv_data['credit']),
                'tsp': float(inv_data['tsp']),
                'tsp_status': inv_data['tsp_status'],
                'items': inv_data['items']
            })

        for r in receipts:
            r_date = r.on_date.date() if hasattr(r.on_date, 'date') else r.on_date
            r_date_str = str(r_date) if r_date else ''
            disp_date = r.on_date.strftime('%d-%b-%Y') if hasattr(r.on_date, 'strftime') else r_date_str
            amt = float(r.amount)

            all_transactions.append({
                'type': 'Receipt',
                'date': r_date_str,
                'display_date': disp_date,
                'doc_no': f"REC-{r.r_id}",
                'ref_no': f"REC-{r.r_id}",
                'particulars': f"Receipt Voucher ({r.paid_in})",
                'received_amount': amt,
                'debit': 0.0,
                'credit': amt,
                'payment_mode': r.paid_in or 'Cash',
                'tsp': float(r.buy_sp or 0) if r.paid_against == 'Advanced' else 0,
                'remarks': r.remarks or ''
            })

        all_transactions.sort(key=lambda x: str(x['date']) if x['date'] else '')

        running_balance = 0.0
        for t in all_transactions:
            running_balance += (t['debit'] - t['credit'])
            t['balance'] = round(running_balance, 2)

        return Response({
            'success': True,
            'customer_info': {
                'id': customer.id,
                'name': customer.cname or '',
                'ds_code': customer.referance or '',
                'address': customer.address or '',
                'mobile1': customer.mobile1 or '',
                'mobile2': customer.mobile2 or '',
                'current_dues': float(customer.credit or 0),
                'advanced_sp': float(getattr(customer, 'advanced_sp', 0) or 0)
            },
            'customer': {
                'id': customer.id,
                'name': customer.cname or '',
                'ds_id': customer.referance or '',
                'mobile': customer.mobile1 or '',
                'address': customer.address or '',
                'current_dues': float(customer.credit or 0),
                'calculated_dues': round(running_balance, 2)
            },
            'transactions': all_transactions
        }, status=status.HTTP_200_OK)

    except Exception as e:
        return Response({'success': False, 'message': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# 🔥 3. React Dropdown ke liye Customers Fetch (Firm Scoped)
@api_view(['GET'])
def get_customers(request):
    try:
        query_firm = request.data.get('firm_id') or request.GET.get('firm_id') or request.headers.get('X-Firm-ID')
        firm_id = query_firm.strip().upper() if query_firm else get_current_firm_id(request)
        clean_firm = 'DEMO' if 'DEMO' in firm_id else ('SHREE' if 'SHREE' in firm_id else firm_id)
        customers_query = Customers.objects.filter(firm_id__iexact=clean_firm)
        customers_list = []
        for c in customers_query:
            customers_list.append({
                'id': c.id,
                'name': c.cname if c.cname else '',
                'mobile': c.mobile1 if c.mobile1 else '', 
                'mobile2': c.mobile2 if c.mobile2 else '', 
                'address': c.address if c.address else '',
                'email': c.email if c.email else '',
                'ds_id': c.referance if c.referance else '',
                'remarks': c.remarks if c.remarks else '',
                'current_dues': int(c.credit) if c.credit else 0,
                'advanced_sp': float(c.advanced_sp) if getattr(c, 'advanced_sp', None) else 0.0
            })
            
        return Response({'success': True, 'customers': customers_list}, status=status.HTTP_200_OK)
    except Exception as e:
        return Response({'success': False, 'message': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['DELETE'])
def delete_customer(request, customer_id):
    try:
        query_firm = request.data.get('firm_id') or request.GET.get('firm_id') or request.headers.get('X-Firm-ID')
        firm_id = query_firm.strip().upper() if query_firm else get_current_firm_id(request)
        clean_firm = 'DEMO' if 'DEMO' in firm_id else ('SHREE' if 'SHREE' in firm_id else firm_id)
        customer = Customers.objects.filter(id=customer_id, firm_id__iexact=firm_id).first()
        if not customer:
            return Response({'success': False, 'message': 'Customer not found'}, status=status.HTTP_404_NOT_FOUND)
        if customer.credit and float(customer.credit) > 0:
            return Response({'success': False, 'message': 'Inka credit clear nahi hai, isliye inka details delete nahi kiya ja sakta hai.'}, status=status.HTTP_400_BAD_REQUEST)
        customer.delete()
        return Response({'success': True, 'message': 'Customer deleted successfully!'}, status=status.HTTP_200_OK)
    except Customers.DoesNotExist:
        return Response({'success': False, 'message': 'Customer not found'}, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        return Response({'success': False, 'message': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
