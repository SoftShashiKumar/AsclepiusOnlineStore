import re
from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
from ..models import SalesOrder, ItemMaster
from store.middleware import get_current_firm_id

@api_view(['POST'])
def save_bulk_customer_enquiry(request):
    try:
        firm_id = get_current_firm_id(request)
        data = request.data
        customer_name = data.get('customer_name')
        if customer_name:
            customer_name = " ".join([w.capitalize() for w in customer_name.strip().split()])
        customer_mobile = data.get('customer_mobile')
        asclepius_id = data.get('asclepius_id', '')
        customer_address = data.get('customer_address', '')
        items = data.get('items', [])

        if not items or not customer_name or not customer_mobile:
            return Response({
                'success': False,
                'message': 'Bhai, Cart empty hai ya Customer Details missing hain!'
            }, status=status.HTTP_400_BAD_REQUEST)

        # Validation and Bulk create items
        for item in items:
            tag_id = item.get('tagId', '')
            req_qty = int(item.get('quantity', 1))
            
            master_item = ItemMaster.objects.filter(tag_text=tag_id, firm_id=firm_id).first()
            if not master_item:
                return Response({'success': False, 'message': f'Item {tag_id} database me nahi mila!'}, status=status.HTTP_400_BAD_REQUEST)
                
            avail_qty = int(master_item.available_quantity or 0)
            if avail_qty < req_qty:
                return Response({
                    'success': False,
                    'message': f'Sorry! Item {master_item.item_name} utna stock me nahi hai. Available: {avail_qty}, Requested: {req_qty}'
                }, status=status.HTTP_400_BAD_REQUEST)

        # Generate Sequential Order Number (Firm Scoped)
        all_orders = SalesOrder.objects.filter(firm_id=firm_id).exclude(order_number__isnull=True).exclude(order_number='')
        max_id = 0
        for o in all_orders:
            m = re.search(r'\d+', o.order_number)
            if m:
                val = int(m.group())
                if val > max_id:
                    max_id = val
                    
        new_order_id = max_id + 1 if max_id > 0 else 1
        order_number = str(new_order_id)

        for item in items:
            SalesOrder.objects.create(
                order_number=order_number,
                tag_id=item.get('tagId', ''),
                item_name=item.get('itemName', ''),
                customer_name=customer_name,
                customer_mobile=customer_mobile,
                customer_remarks=f"Total: ₹{item.get('itemTotal', 0)}",
                asclepius_id=asclepius_id,
                customer_address=customer_address,
                order_qty=int(item.get('quantity', 1)),
                order_rate=float(item.get('rate', 0.0)),
                firm_id=firm_id
            )

        return Response({
            'success': True,
            'message': f'Order successfully save ho gaya hai! Order No: {order_number}'
        }, status=status.HTTP_201_CREATED)

    except Exception as e:
        return Response({
            'success': False,
            'message': f'Server backend error: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['POST'])
def save_customer_enquiry(request):
    try:
        firm_id = get_current_firm_id(request)
        data = request.data
        tag_id = data.get('tag_id')
        item_name = data.get('item_name')
        customer_name = data.get('customer_name')
        if customer_name:
            customer_name = " ".join([w.capitalize() for w in customer_name.strip().split()])
        customer_mobile = data.get('customer_mobile')
        customer_remarks = data.get('customer_remarks', '')
        asclepius_id = data.get('asclepius_id', '')
        customer_address = data.get('customer_address', '')

        if not tag_id or not customer_name or not customer_mobile:
            return Response({
                'success': False,
                'message': 'Bhai, Tag ID, Customer Name aur Mobile Number zaroori hain!'
            }, status=status.HTTP_400_BAD_REQUEST)

        enquiry = SalesOrder.objects.create(
            tag_id=tag_id,
            item_name=item_name,
            customer_name=customer_name,
            customer_mobile=customer_mobile,
            customer_remarks=customer_remarks,
            asclepius_id=asclepius_id,
            customer_address=customer_address,
            firm_id=firm_id
        )

        return Response({
            'success': True,
            'message': 'Enquiry successfully save ho gayi hai!',
            'slno': enquiry.slno
        }, status=status.HTTP_201_CREATED)

    except Exception as e:
        return Response({
            'success': False,
            'message': f'Server backend error: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

# 📋 1. GET API: Saari enquiries ki list (Firm Scoped)
@api_view(['GET'])
def get_enquiries_list(request):
    try:
        firm_id = get_current_firm_id(request)
        orders = SalesOrder.objects.filter(firm_id=firm_id).order_by('-slno')
        
        orders_data = []
        for o in orders:
            orders_data.append({
                'slno': o.slno,
                'tag_id': o.tag_id,
                'item_name': o.item_name,
                'customer_name': o.customer_name,
                'customer_mobile': o.customer_mobile,
                'asclepius_id': o.asclepius_id,
                'customer_address': o.customer_address,
                'customer_remarks': o.customer_remarks,
                'order_qty': o.order_qty,
                'order_rate': float(o.order_rate),
                'order_number': o.order_number or f'ENQ-{o.slno}',
                'seller_remarks': o.seller_remarks,
                'status': o.status,
                'created_at': o.created_at.strftime("%Y-%m-%d %H:%M") if o.created_at else ""
            })
            
        return Response({'success': True, 'data': orders_data}, status=status.HTTP_200_OK)
    except Exception as e:
        return Response({'success': False, 'message': f'Error: {str(e)}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# 🔄 2. POST API: Status update (Firm Scoped)
@api_view(['POST'])
def update_enquiry_status(request):
    try:
        firm_id = get_current_firm_id(request)
        data = request.data
        slno = data.get('slno')
        new_status = data.get('status')
        seller_remarks = data.get('seller_remarks')
        
        if not slno:
            return Response({'success': False, 'message': 'SlNo zaroori hai!'}, status=status.HTTP_400_BAD_REQUEST)
            
        try:
            enquiry = SalesOrder.objects.filter(slno=slno, firm_id=firm_id).first()
            if not enquiry:
                return Response({'success': False, 'message': 'Bhai, ye enquiry ID nahi mili!'}, status=status.HTTP_404_NOT_FOUND)
                
            if new_status:
                enquiry.status = new_status
                
            if seller_remarks is not None:
                enquiry.seller_remarks = seller_remarks
                
            enquiry.save()
            return Response({'success': True, 'message': f'Enquiry #{slno} successfully update ho gayi!'}, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({'success': False, 'message': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            
    except Exception as e:
        return Response({'success': False, 'message': f'Error: {str(e)}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

# 🗑️ 3. DELETE API: Delete sales orders (Firm Scoped)
@api_view(['DELETE'])
def delete_sales_order(request, order_number):
    try:
        firm_id = get_current_firm_id(request)
        if not order_number:
            return Response({'success': False, 'message': 'Order number zaroori hai!'}, status=status.HTTP_400_BAD_REQUEST)
        
        orders = SalesOrder.objects.filter(order_number=order_number, firm_id=firm_id)
        if not orders.exists():
            return Response({'success': False, 'message': 'Order nahi mila!'}, status=status.HTTP_404_NOT_FOUND)
            
        count = orders.count()
        orders.delete()
        
        return Response({'success': True, 'message': f'Order {order_number} ({count} items) successfully delete ho gaya!'}, status=status.HTTP_200_OK)
    except Exception as e:
        return Response({'success': False, 'message': f'Error: {str(e)}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
