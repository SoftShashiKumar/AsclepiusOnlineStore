import re
from datetime import datetime
from zoneinfo import ZoneInfo
from django.utils.dateparse import parse_date
from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status

from store.models import Sales, ReceiptVoucher
from store.middleware import get_current_firm_id


HEADERS = ('cash', 'upi', 'credit', 'bank', 'cheque')
HEADER_LABELS = {
    'cash': 'Cash',
    'upi': 'UPI',
    'credit': 'Credit',
    'bank': 'Bank',
    'cheque': 'Cheque',
}

RECEIPT_SPLIT_RE = re.compile(
    r'\[Cash:\s*₹?\s*([0-9]+(?:\.[0-9]+)?)\s*,\s*UPI:\s*₹?\s*([0-9]+(?:\.[0-9]+)?)\]',
    re.IGNORECASE,
)


def _safe_num(val):
    try:
        return float(val or 0.0)
    except (TypeError, ValueError):
        return 0.0


def _empty_bucket():
    return {h: 0.0 for h in HEADERS}


def _classify_mode_amount(mode_str, amount):
    """Map a single payment mode string and amount into the 5 fund-flow headers."""
    bucket = _empty_bucket()
    m = (mode_str or '').strip().lower()
    if m == 'cash':
        bucket['cash'] = amount
    elif m == 'upi':
        bucket['upi'] = amount
    elif m == 'credit':
        bucket['credit'] = amount
    elif 'bank' in m:
        bucket['bank'] = amount
    elif 'cheque' in m or 'check' in m:
        bucket['cheque'] = amount
    return bucket


@api_view(['GET'])
def get_fund_flow(request):
    try:
        query_firm = request.GET.get('firm_id') or request.headers.get('X-Firm-ID')
        firm_id = query_firm.strip().upper() if query_firm else get_current_firm_id(request)

        from_str = (request.GET.get('from_date') or request.GET.get('from') or '').strip()
        to_str = (request.GET.get('to_date') or request.GET.get('to') or '').strip()

        today = datetime.now(ZoneInfo('Asia/Kolkata')).date()
        from_date = parse_date(from_str) if from_str else today
        to_date = parse_date(to_str) if to_str else today

        if not from_date or not to_date:
            return Response(
                {'success': False, 'message': 'Valid From aur To date (YYYY-MM-DD) dalna zaroori hai!'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if from_date > to_date:
            from_date, to_date = to_date, from_date

        sales_totals = _empty_bucket()
        sales_counts = {h: 0 for h in HEADERS}
        receipt_totals = _empty_bucket()
        receipt_counts = {h: 0 for h in HEADERS}
        transactions = []

        # 1. Aggregate Sales (deduplicate multi-item rows by invoice)
        sales_qs = Sales.objects.filter(
            firm_id__iexact=firm_id,
            bill_date__range=[from_date, to_date],
        ).order_by('bill_date', 'invoice', 'id')

        seen_invoices = {}
        for s in sales_qs:
            inv_key = ('inv', s.invoice) if s.invoice is not None else ('row', s.id)
            if inv_key not in seen_invoices:
                seen_invoices[inv_key] = s

        for s in seen_invoices.values():
            bucket = {
                'cash': _safe_num(s.cash),
                'upi': _safe_num(s.upi),
                'credit': _safe_num(s.credit),
                'bank': 0.0,
                'cheque': 0.0,
            }

            if bucket['cash'] == 0.0 and bucket['upi'] == 0.0 and bucket['credit'] == 0.0:
                fallback_total = _safe_num(s.bill_grand_total or s.bill_sattlement_amt)
                bucket = _classify_mode_amount(s.payment_mode, fallback_total)

            row_total = sum(bucket.values())
            for h in HEADERS:
                if bucket[h] > 0:
                    sales_totals[h] += bucket[h]
                    sales_counts[h] += 1

            b_date = s.bill_date.strftime('%Y-%m-%d') if hasattr(s.bill_date, 'strftime') else str(s.bill_date or '')
            transactions.append({
                'source': 'Sales',
                'date': b_date,
                'display_date': s.bill_date.strftime('%d-%b-%Y') if hasattr(s.bill_date, 'strftime') else b_date,
                'ref_no': f"INV-{s.invoice}" if s.invoice is not None else f"SALE-{s.id}",
                'customer': s.customer or 'Walk-in Customer',
                'payment_mode': s.payment_mode or 'Cash',
                'cash': round(bucket['cash'], 2),
                'upi': round(bucket['upi'], 2),
                'credit': round(bucket['credit'], 2),
                'bank': round(bucket['bank'], 2),
                'cheque': round(bucket['cheque'], 2),
                'total': round(row_total, 2),
            })

        # 2. Aggregate Receipts
        receipts_qs = ReceiptVoucher.objects.filter(
            firm_id__iexact=firm_id,
            on_date__date__range=[from_date, to_date],
        ).order_by('on_date', 'r_id')

        for r in receipts_qs:
            amt = _safe_num(r.amount)
            paid_in = (r.paid_in or '').strip()
            paid_lower = paid_in.lower()
            bucket = _empty_bucket()

            if paid_lower == 'cash & upi':
                m = RECEIPT_SPLIT_RE.search(r.remarks or '')
                if m:
                    bucket['cash'] = _safe_num(m.group(1))
                    bucket['upi'] = _safe_num(m.group(2))
                else:
                    bucket['cash'] = amt
            else:
                bucket = _classify_mode_amount(paid_in, amt)

            row_total = sum(bucket.values())
            for h in HEADERS:
                if bucket[h] > 0:
                    receipt_totals[h] += bucket[h]
                    receipt_counts[h] += 1

            r_date_str = r.on_date.strftime('%Y-%m-%d') if hasattr(r.on_date, 'strftime') else str(r.on_date or '')
            transactions.append({
                'source': 'Receipt',
                'date': r_date_str,
                'display_date': r.on_date.strftime('%d-%b-%Y') if hasattr(r.on_date, 'strftime') else r_date_str,
                'ref_no': f"REC-{r.r_id}",
                'customer': r.customer_name or '-',
                'payment_mode': paid_in or 'Cash',
                'cash': round(bucket['cash'], 2),
                'upi': round(bucket['upi'], 2),
                'credit': round(bucket['credit'], 2),
                'bank': round(bucket['bank'], 2),
                'cheque': round(bucket['cheque'], 2),
                'total': round(row_total, 2),
            })

        transactions.sort(key=lambda x: (x['date'], x['source'], x['ref_no']), reverse=True)

        summary = []
        grand_sales = 0.0
        grand_receipt = 0.0
        grand_total = 0.0
        grand_tx_count = 0

        for h in HEADERS:
            s_amt = round(sales_totals[h], 2)
            r_amt = round(receipt_totals[h], 2)
            t_amt = round(s_amt + r_amt, 2)
            s_cnt = sales_counts[h]
            r_cnt = receipt_counts[h]
            t_cnt = s_cnt + r_cnt

            grand_sales += s_amt
            grand_receipt += r_amt
            grand_total += t_amt
            grand_tx_count += t_cnt

            summary.append({
                'key': h,
                'header': HEADER_LABELS[h],
                'sales_amount': s_amt,
                'receipt_amount': r_amt,
                'total_amount': t_amt,
                'sales_count': s_cnt,
                'receipt_count': r_cnt,
                'transaction_count': t_cnt,
            })

        return Response({
            'success': True,
            'firm_id': firm_id,
            'from_date': from_date.strftime('%Y-%m-%d'),
            'to_date': to_date.strftime('%Y-%m-%d'),
            'summary': summary,
            'totals': {
                'sales_total': round(grand_sales, 2),
                'receipt_total': round(grand_receipt, 2),
                'grand_total': round(grand_total, 2),
                'total_transactions': grand_tx_count,
                'sales_invoices_count': len(seen_invoices),
                'receipt_vouchers_count': receipts_qs.count(),
            },
            'transactions': transactions,
        }, status=status.HTTP_200_OK)

    except Exception as e:
        return Response({'success': False, 'message': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
