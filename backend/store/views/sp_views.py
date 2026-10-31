import json
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from ..models import BillwiseSPSettlement
from store.middleware import get_current_firm_id
from datetime import datetime

@csrf_exempt
def get_sp_settlements(request):
    if request.method == 'GET':
        firm_id = get_current_firm_id(request)
        from_date = request.GET.get('fromDate')
        to_date = request.GET.get('toDate')
        status = request.GET.get('status')
        
        queryset = BillwiseSPSettlement.objects.filter(firm_id=firm_id).order_by('-id')
        
        if from_date:
            queryset = queryset.filter(bill_date__gte=from_date)
        if to_date:
            queryset = queryset.filter(bill_date__lte=to_date)
        if status and status != 'All':
            queryset = queryset.filter(status=status)
            
        data = list(queryset.values())
        return JsonResponse({'status': 'success', 'data': data})
        
    return JsonResponse({'status': 'error', 'message': 'Invalid request method'}, status=405)

@csrf_exempt
def update_sp_settlement_status(request):
    if request.method == 'POST':
        try:
            firm_id = get_current_firm_id(request)
            data = json.loads(request.body)
            item_id = data.get('id')
            new_status = data.get('status')
            
            if not item_id or not new_status:
                return JsonResponse({'status': 'error', 'message': 'Missing ID or Status'}, status=400)
                
            item = BillwiseSPSettlement.objects.filter(id=item_id, firm_id=firm_id).first()
            if not item:
                return JsonResponse({'status': 'error', 'message': 'Record not found'}, status=404)
                
            item.status = new_status
            item.save()
            
            return JsonResponse({'status': 'success', 'message': 'Status updated successfully'})
            
        except Exception as e:
            return JsonResponse({'status': 'error', 'message': str(e)}, status=500)
            
    return JsonResponse({'status': 'error', 'message': 'Invalid request method'}, status=405)
