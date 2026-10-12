import json
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from ..models import BillwiseSPSettlement
from datetime import datetime

@csrf_exempt
def get_sp_settlements(request):
    if request.method == 'GET':
        from_date = request.GET.get('fromDate')
        to_date = request.GET.get('toDate')
        status = request.GET.get('status')
        
        queryset = BillwiseSPSettlement.objects.all().order_by('-id')
        
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
            data = json.loads(request.body)
            item_id = data.get('id')
            new_status = data.get('status')
            
            if not item_id or not new_status:
                return JsonResponse({'status': 'error', 'message': 'Missing ID or Status'}, status=400)
                
            item = BillwiseSPSettlement.objects.get(id=item_id)
            item.status = new_status
            item.save()
            
            return JsonResponse({'status': 'success', 'message': 'Status updated successfully'})
            
        except BillwiseSPSettlement.DoesNotExist:
            return JsonResponse({'status': 'error', 'message': 'Record not found'}, status=404)
        except Exception as e:
            return JsonResponse({'status': 'error', 'message': str(e)}, status=500)
            
    return JsonResponse({'status': 'error', 'message': 'Invalid request method'}, status=405)
