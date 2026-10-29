import json
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
from django.db.models import Q

# Main store.models se Models safely import kiye hain
from store.models import Customers, Sales, ReceiptVoucher

# 🔤 Helper: Har word ka pehla letter capital aur baaki small
def format_title_case(name_str):
    if not name_str:
        return ""
    return " ".join([word.capitalize() for word in name_str.strip().split()])

# 🔥 1. Naya Customer Add / Purana Update karne ka API
@csrf_exempt
@api_view(['POST'])
def add_customer(request):
    try:
        data = request.data
        customer_id = data.get('id')  # Frontend se ID nikaali
        mobile1 = (data.get('mobile1') or data.get('mobile') or '').strip()
        mobile2 = (data.get('mobile2') or '').strip()
        email = (data.get('email') or '').strip()
        address = (data.get('address') or '').strip()
        ds_id = (data.get('ds_id') or data.get('referance') or '').strip()
        remarks = (data.get('remarks') or '').strip()
        raw_name = (data.get('cname') or '').strip()
        formatted_name = format_title_case(raw_name)
        
        # 🔄 CASE 1: Agar ID maujood hai, toh UPDATE karenge
        if customer_id:
            customer = Customers.objects.filter(id=customer_id).first()
            if not customer:
                return Response({'success': False, 'message': 'Update ke liye customer nahi mila!'}, status=status.HTTP_404_NOT_FOUND)
            
            customer.cname = formatted_name
            customer.mobile1 = mobile1 if mobile1 else None
            customer.mobile2 = mobile2 if mobile2 else None
            customer.email = email if email else None
            customer.address = address
            customer.referance = ds_id if ds_id else None
            customer.remarks = remarks
            customer.save()
            
            return Response({'success': True, 'message': f'Customer "{customer.cname}" ka record safaltapoorvak UPDATE ho gaya!'}, status=status.HTTP_200_OK)
            
        # ➕ CASE 2: Agar ID nahi hai, toh NAYA ADD karenge
        else:
            # Duplicate check ONLY if mobile1 is non-empty!
            if mobile1 and Customers.objects.filter(mobile1=mobile1).exists():
                return Response({'success': False, 'message': f'Is Mobile number ({mobile1}) se customer pehle se maujood hai!'}, status=status.HTTP_400_BAD_REQUEST)
            
            # Duplicate check for DS Code ONLY if ds_id is non-empty!
            if ds_id and Customers.objects.filter(referance=ds_id).exists():
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
                credit=0
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

# 🔥 1B. Online Order/Enquiry se Customer Check aur Auto-Add karne ka API (Make Sales par call hota hai)
@csrf_exempt
@api_view(['POST'])
def ensure_customer_from_order(request):
    try:
        data = request.data
        ds_id = (data.get('ds_id') or data.get('asclepius_id') or '').strip()
        raw_name = (data.get('cname') or data.get('customer_name') or '').strip()
        mobile = (data.get('mobile') or data.get('mobile1') or data.get('customer_mobile') or '').strip()
        address = (data.get('address') or data.get('customer_address') or '').strip()

        # Har word ka pehla letter capital aur baki sara small
        formatted_name = format_title_case(raw_name)

        existing_customer = None

        # 1. Search customer by DS ID (referance in Customers model)
        if ds_id:
            existing_customer = Customers.objects.filter(referance__iexact=ds_id).first()

        # Fallback: Agar DS ID se nahi mila, search by mobile number
        if not existing_customer and mobile:
            existing_customer = Customers.objects.filter(mobile1=mobile).first()
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

        # Agar customer pehle se add hai, toh koi baat nahi (already_exists = True)
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

        # Agar add nahi hai, toh formatted name ke saath save kar lena hai
        new_customer = Customers.objects.create(
            cname=formatted_name,
            mobile1=mobile,
            address=address,
            referance=ds_id,
            status="Active",
            credit=0
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


# 🔥 2. Customer Ledger (Live Status + Sales & Receipts History ke liye Detailed API)
@api_view(['GET'])
def get_customer_ledger(request, customer_id):
    try:
        customer = Customers.objects.filter(id=customer_id).first()
        if not customer:
            return Response({'success': False, 'message': 'Customer nahi mila!'}, status=status.HTTP_404_NOT_FOUND)
            
        # 1. Grahak ke mobile/name/reference ke aadhar par Sales filter
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
            sales_records = Sales.objects.filter(sales_filter).order_by('bill_date', 'invoice')

        # Invoices group karna (ek invoice ke multiple items hote hain)
        invoices_dict = {}
        for s in sales_records:
            inv_key = s.invoice if s.invoice else f"order_{s.sales_order_id or s.id}"
            if inv_key not in invoices_dict:
                date_str = s.bill_date.strftime('%Y-%m-%d') if s.bill_date else ''
                display_date = s.bill_date.strftime('%d-%b-%Y') if s.bill_date else ''
                tot_amt = float(s.bill_grand_total or 0)
                c_amt = float(s.cash or 0)
                u_amt = float(s.upi or 0)
                cr_amt = float(s.credit or 0)
                pmode = (s.payment_mode or '').strip()

                # Fallback: Agar older records me specific breakdown columns 0 the
                if c_amt == 0 and u_amt == 0 and cr_amt == 0 and tot_amt > 0:
                    if 'cash' in pmode.lower() and 'credit' not in pmode.lower() and 'upi' not in pmode.lower():
                        c_amt = tot_amt
                    elif 'upi' in pmode.lower() and 'credit' not in pmode.lower() and 'cash' not in pmode.lower():
                        u_amt = tot_amt
                    elif 'credit' in pmode.lower() and 'cash' not in pmode.lower() and 'upi' not in pmode.lower():
                        cr_amt = tot_amt
                    elif 'adjust' in pmode.lower():
                        cr_amt = tot_amt

                invoices_dict[inv_key] = {
                    'date': date_str,
                    'display_date': display_date,
                    'type': 'Sale',
                    'doc_no': f"Inv #{s.invoice}" if s.invoice else f"Order #{s.sales_order_id}",
                    'invoice_no': s.invoice,
                    'total_amount': tot_amt,
                    'tsp': float(s.tsp or 0),
                    'tsp_status': getattr(s, 'tsp_status', None) or 'Earned',
                    'cash': c_amt,
                    'upi': u_amt,
                    'credit': cr_amt,
                    'payment_mode': pmode or 'Credit',
                    'items': [],
                    'remarks': s.remarks or ''
                }
            if s.item_name:
                item_desc = f"{s.item_name} (x{s.quantity or 1})"
                if item_desc not in invoices_dict[inv_key]['items']:
                    invoices_dict[inv_key]['items'].append(item_desc)

        # 2. Grahak ke Receipts filter karna
        receipt_filter = Q(customer_id=customer.id)
        if customer.cname:
            receipt_filter |= Q(customer_name__iexact=customer.cname)
            
        receipts_records = ReceiptVoucher.objects.filter(receipt_filter).order_by('on_date', 'r_id')

        receipts_list = []
        for r in receipts_records:
            date_val = r.on_date.date() if r.on_date else None
            date_str = date_val.strftime('%Y-%m-%d') if date_val else ''
            display_date = r.on_date.strftime('%d-%b-%Y') if r.on_date else ''
            amt = float(r.amount or 0)
            mode = (r.paid_in or 'Cash').strip()
            receipt_tsp = float(getattr(r, 'buy_sp', 0) or 0)
            
            receipts_list.append({
                'date': date_str,
                'display_date': display_date,
                'type': 'Receipt',
                'doc_no': f"Receipt #{r.r_id}",
                'receipt_id': r.r_id,
                'for_bill_no': r.for_bill_no or '',
                'total_amount': 0.0,
                'tsp': receipt_tsp,
                'tsp_status': 'Buyed' if receipt_tsp > 0 else '',
                'paid_against': getattr(r, 'paid_against', 'Old Bill') or 'Old Bill',
                'cash': amt if 'cash' in mode.lower() else 0.0,
                'upi': amt if 'upi' in mode.lower() else 0.0,
                'credit': 0.0,
                'received_amount': amt,
                'payment_mode': mode,
                'items': [f"Payment Received ({mode})"],
                'remarks': r.remarks or (f"For Bill: {r.for_bill_no}" if r.for_bill_no else '')
            })

        # 3. Combine & Sort:
        # Same date par Sale pehle aur Receipt baad me dikhega:
        all_transactions = list(invoices_dict.values()) + receipts_list
        all_transactions.sort(key=lambda x: (
            x['date'] or '9999-99-99', 
            0 if x['type'] == 'Sale' else 1, 
            x.get('invoice_no') or x.get('receipt_id') or 0
        ))

        # 4. Summary & Running Balance Calculation
        running_credit = 0.0
        total_sales_amount = 0.0
        total_tsp = 0.0
        total_cash_paid = 0.0
        total_upi_paid = 0.0
        total_receipts_amount = 0.0

        for tx in all_transactions:
            if tx['type'] == 'Sale':
                total_sales_amount += tx['total_amount']
                total_tsp += tx['tsp']
                total_cash_paid += tx['cash']
                total_upi_paid += tx['upi']
                # Bill par credit dues calculate karna
                credit_added = tx['credit'] if tx['credit'] > 0 else max(0.0, tx['total_amount'] - tx['cash'] - tx['upi'])
                tx['credit_added'] = credit_added
                tx['received_amount'] = 0.0
                running_credit += credit_added
                tx['balance'] = running_credit
            else: # Receipt
                rcv_amt = tx['received_amount']
                total_receipts_amount += rcv_amt
                tx['credit_added'] = 0.0
                running_credit = running_credit - rcv_amt
                tx['balance'] = running_credit

        customer_info = {
            'id': customer.id,
            'name': customer.cname or '',
            'mobile1': customer.mobile1 or '',
            'mobile2': customer.mobile2 or '',
            'email': customer.email or '',
            'address': customer.address or '',
            'ds_code': customer.referance or '',
            'current_dues': float(customer.credit or 0),
            'advanced_sp': float(customer.advanced_sp) if getattr(customer, 'advanced_sp', None) else 0.0
        }

        summary = {
            'total_sales_amount': round(total_sales_amount, 2),
            'total_tsp': round(total_tsp, 2),
            'total_cash_paid': round(total_cash_paid, 2),
            'total_upi_paid': round(total_upi_paid, 2),
            'total_receipts_amount': round(total_receipts_amount, 2),
            'calculated_balance': round(running_credit, 2),
            'current_dues': round(float(customer.credit or 0), 2)
        }

        return Response({
            'success': True,
            'customer_info': customer_info,
            'summary': summary,
            'transactions': all_transactions
        }, status=status.HTTP_200_OK)

    except Exception as e:
        return Response({'success': False, 'message': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# 🔥 3. React Dropdown ke liye Saare Customers Fetch karne ka API
@api_view(['GET'])
def get_customers(request):
    try:
        customers_query = Customers.objects.all()
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
        customer = Customers.objects.get(id=customer_id)
        if customer.credit and float(customer.credit) > 0:
            return Response({'success': False, 'message': 'Inka credit clear nahi hai, isliye inka details delete nahi kiya ja sakta hai.'}, status=status.HTTP_400_BAD_REQUEST)
        customer.delete()
        return Response({'success': True, 'message': 'Customer deleted successfully!'}, status=status.HTTP_200_OK)
    except Customers.DoesNotExist:
        return Response({'success': False, 'message': 'Customer not found'}, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        return Response({'success': False, 'message': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
