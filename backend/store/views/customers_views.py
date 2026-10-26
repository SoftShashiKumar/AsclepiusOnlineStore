import json
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status

# Main store.models se Models safely import kiye hain
from store.models import Customers, Sales  

# 🔥 1. Naya Customer Add / Purana Update karne ka API
@csrf_exempt
@api_view(['POST'])
def add_customer(request):
    try:
        data = request.data
        customer_id = data.get('id')  # Frontend se ID nikaali
        mobile = data.get('mobile1')
        
        # 🔄 CASE 1: Agar ID maujood hai, toh UPDATE karenge
        if customer_id:
            customer = Customers.objects.filter(id=customer_id).first()
            if not customer:
                return Response({'success': False, 'message': 'Update ke liye customer nahi mila!'}, status=status.HTTP_404_NOT_FOUND)
            
            # Data update ho raha hai
            customer.cname = data.get('cname')
            customer.mobile1 = mobile
            customer.mobile2 = data.get('mobile2')
            customer.email = data.get('email')
            customer.address = data.get('address')
            customer.referance = data.get('ds_id')
            customer.remarks = data.get('remarks')
            customer.save()
            
            return Response({'success': True, 'message': f'Customer "{customer.cname}" ka record safaltapoorvak UPDATE ho gaya!'}, status=status.HTTP_200_OK)
            
        # ➕ CASE 2: Agar ID nahi hai, toh NAYA ADD karenge
        else:
            if Customers.objects.filter(mobile1=mobile).exists():
                return Response({'success': False, 'message': 'Is Mobile number se customer pehle se maujood hai!'}, status=status.HTTP_400_BAD_REQUEST)
            
            customer = Customers.objects.create(
                cname=data.get('cname'),
                mobile1=mobile,
                mobile2=data.get('mobile2'),
                email=data.get('email'),
                address=data.get('address'),
                referance=data.get('ds_id'),
                remarks=data.get('remarks'),
                status="Active",
                credit=0
            )
            return Response({
                'success': True, 
                'message': 'Naya Customer safaltapoorvak add ho gaya!',
                'customer': {
                    'id': customer.id,
                    'name': customer.cname,
                    'mobile': customer.mobile1,
                    'mobile2': customer.mobile2 or '',
                    'address': customer.address or '',
                    'email': customer.email or '',
                    'current_dues': customer.credit,
                    'ds_id': customer.referance or ''
                }
            }, status=status.HTTP_201_CREATED)
            
    except Exception as e:
        return Response({'success': False, 'message': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# 🔥 2. Customer Ledger (Live Status + Sales History ke liye Data API)
@api_view(['GET'])
def get_customer_ledger(request, customer_id):
    try:
        customer = Customers.objects.filter(id=customer_id).first()
        if not customer:
            return Response({'success': False, 'message': 'Customer nahi mila!'}, status=status.HTTP_404_NOT_FOUND)
            
        # Grahak ke mobile number ke aadhar par sales filter kar rhe hain
        sales_history = Sales.objects.filter(mobile=customer.mobile1).values(
            'invoice', 'bill_date', 'bill_grand_total', 'bill_sattlement_amt', 'status'
        ).order_by('-bill_date')
        
        # Pura data taiyar karke frontend ko bhej rhe hain
        ledger_data = {
            'customer_info': {
                'id': customer.id,
                'name': customer.cname,
                'mobile': customer.mobile1,
                'current_due': customer.credit  # Live Running Balance Status
            },
            'sales_history': list(sales_history)
        }
        return Response({'success': True, 'ledger': ledger_data}, status=status.HTTP_200_OK)
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
                'current_dues': int(c.credit) if c.credit else 0
            })
            
        return Response({'success': True, 'customers': customers_list}, status=status.HTTP_200_OK)
    except Exception as e:
        return Response({'success': False, 'message': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['DELETE'])
def delete_customer(request, customer_id):
    try:
        customer = Customers.objects.get(id=customer_id)
        customer.delete()
        return Response({'success': True, 'message': 'Customer deleted successfully!'}, status=status.HTTP_200_OK)
    except Customers.DoesNotExist:
        return Response({'success': False, 'message': 'Customer not found'}, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        return Response({'success': False, 'message': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)