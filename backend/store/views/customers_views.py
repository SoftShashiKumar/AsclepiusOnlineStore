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
        firm_id = get_current_firm_id(request)
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
            customer = Customers.objects.filter(id=customer_id, firm_id=firm_id).first()
            if not customer:
                return Response({'success': False, 'message': 'Update ke liye customer nahi mila!'}, status=status.HTTP_404_NOT_FOUND)
            
            customer.cname = formatted_name
            customer.mobile1 = mobile1 if mobile1 else None
            customer.mobile2 = mobile2 if mobile2 else None
            customer.email = email if email else None
            customer.address = address
            customer.referance = ds_id if ds_id else None
            customer.remarks = remarks
            customer.firm_id = firm_id
            customer.save()
            
            return Response({'success': True, 'message': f'Customer "{customer.cname}" ka record safaltapoorvak UPDATE ho gaya!'}, status=status.HTTP_200_OK)
            
        # ➕ CASE 2: ADD NEW
        else:
            if mobile1 and Customers.objects.filter(mobile1=mobile1, firm_id=firm_id).exists():
                return Response({'success': False, 'message': f'Is Mobile number ({mobile1}) se customer pehle se maujood hai!'}, status=status.HTTP_400_BAD_REQUEST)
            
            if ds_id and Customers.objects.filter(referance=ds_id, firm_id=firm_id).exists():
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
                firm_id=firm_id
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
        firm_id = get_current_firm_id(request)
        data = request.data
        ds_id = (data.get('ds_id') or data.get('asclepius_id') or '').strip()
        raw_name = (data.get('cname') or data.get('customer_name') or '').strip()
        mobile = (data.get('mobile') or data.get('mobile1') or data.get('customer_mobile') or '').strip()
        address = (data.get('address') or data.get('customer_address') or '').strip()

        formatted_name = format_title_case(raw_name)

        if mobile:
            is_valid, clean_m, _ = validate_indian_mobile(mobile, "Mobile Number")
            if is_valid and clean_m:
                mobile = clean_m

        existing_customer = None

        if ds_id:
            existing_customer = Customers.objects.filter(referance__iexact=ds_id, firm_id=firm_id).first()

        if not existing_customer and mobile:
            existing_customer = Customers.objects.filter(mobile1=mobile, firm_id=firm_id).first()
            if existing_customer:
                updated = False
                if ds_id and not existing_customer.referance:
                    existing_customer.referance = ds_id
                    updated = True
                if formatted_name and not existing_customer.cname:
                    existing_customer.cname = formatted_name
                    updated = True
                if address and not existing_customer.address:
                    existing_customer.address = address
                    updated = True
                if updated:
                    existing_customer.save()

        if existing_customer:
            return Response({
                'success': True,
                'already_exists': True,
                'message': f'Customer "{existing_customer.cname}" pehle se Customers table me add hai.',
                'customer': {
                    'id': existing_customer.id,
                    'name': existing_customer.cname or '',
                    'ds_id': existing_customer.referance or '',
                    'mobile': existing_customer.mobile1 or '',
                    'address': existing_customer.address or '',
                    'current_dues': existing_customer.credit or 0
                }
            }, status=status.HTTP_200_OK)

        new_customer = Customers.objects.create(
            cname=formatted_name,
            mobile1=mobile if mobile else None,
            address=address,
            referance=ds_id,
            status="Active",
            credit=0,
            firm_id=firm_id
        )

        return Response({
            'success': True,
            'already_exists': False,
            'message': f'Customer "{formatted_name}" safaltapoorvak Customers table me add ho gaya!',
            'customer': {
                'id': new_customer.id,
                'name': new_customer.cname,
                'ds_id': new_customer.referance or '',
                'mobile': new_customer.mobile1 or '',
                'address': new_customer.address or '',
                'current_dues': 0
            }
        }, status=status.HTTP_201_CREATED)

    except Exception as e:
        return Response({'success': False, 'message': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# 🔥 2. Customer Ledger (Firm Scoped)
@api_view(['GET'])
def get_customer_ledger(request, customer_id):
    try:
        firm_id = get_current_firm_id(request)
        customer = Customers.objects.filter(id=customer_id, firm_id=firm_id).first()
        if not customer:
            return Response({'success': False, 'message': 'Customer nahi mila!'}, status=status.HTTP_404_NOT_FOUND)
            
        sales_filter = Q()
        if customer.mobile1:
            sales_filter |= Q(mobile=customer.mobile1)
        if customer.mobile2:
            sales_filter |= Q(mobile=customer.mobile2)
        if customer.referance:
            sales_filter |= Q(asclepius_id=customer.referance)
        if customer.cname:
            sales_filter |= Q(customer__iexact=customer.cname)

        sales_records = []
        if sales_filter:
            sales_records = Sales.objects.filter(sales_filter, firm_id=firm_id).order_by('bill_date', 'invoice')

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

        receipts = ReceiptVoucher.objects.filter(receipt_filter, firm_id=firm_id).order_by('on_date')

        all_transactions = []
        for inv_key, inv_data in invoices_dict.items():
            all_transactions.append({
                'type': 'SALE',
                'date': inv_data['bill_date'],
                'ref_no': str(inv_data['invoice'] or inv_data['sales_order_id'] or '-'),
                'particulars': f"Invoice #{inv_data['invoice'] or inv_data['sales_order_id']}",
                'debit': float(inv_data['grand_total']),
                'credit': 0.0,
                'items': inv_data['items']
            })

        for r in receipts:
            all_transactions.append({
                'type': 'RECEIPT',
                'date': r.on_date.date() if hasattr(r.on_date, 'date') else r.on_date,
                'ref_no': f"REC-{r.r_id}",
                'particulars': f"Receipt Voucher ({r.paid_in})",
                'debit': 0.0,
                'credit': float(r.amount),
                'remarks': r.remarks or ''
            })

        all_transactions.sort(key=lambda x: str(x['date']) if x['date'] else '')

        running_balance = 0.0
        for t in all_transactions:
            running_balance += (t['debit'] - t['credit'])
            t['balance'] = round(running_balance, 2)

        return Response({
            'success': True,
            'customer': {
                'id': customer.id,
                'name': customer.cname or '',
                'mobile': customer.mobile1 or '',
                'mobile2': customer.mobile2 or '',
                'address': customer.address or '',
                'ds_id': customer.referance or '',
                'current_dues': int(customer.credit) if customer.credit else 0,
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
        firm_id = get_current_firm_id(request)
        customers_query = Customers.objects.filter(firm_id=firm_id)
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
        firm_id = get_current_firm_id(request)
        customer = Customers.objects.get(id=customer_id, firm_id=firm_id)
        if customer.credit and float(customer.credit) > 0:
            return Response({'success': False, 'message': 'Inka credit clear nahi hai, isliye inka details delete nahi kiya ja sakta hai.'}, status=status.HTTP_400_BAD_REQUEST)
        customer.delete()
        return Response({'success': True, 'message': 'Customer deleted successfully!'}, status=status.HTTP_200_OK)
    except Customers.DoesNotExist:
        return Response({'success': False, 'message': 'Customer not found'}, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        return Response({'success': False, 'message': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
