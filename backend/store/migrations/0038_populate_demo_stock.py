from django.db import migrations

def populate_demo_stock(apps, schema_editor):
    ItemMaster = apps.get_model('store', 'ItemMaster')
    StockForSale = apps.get_model('store', 'StockForSale')

    for item in ItemMaster.objects.all():
        # Set demo stock to 25.0 so that Demo store products are in stock and interactive
        cur_q = item.available_quantity_2
        if cur_q is None or float(cur_q) <= 0.0:
            item.available_quantity_2 = 25.0
            item.active_2 = '1'
            item.reorder_level_2 = 10
            item.save()

        # Also ensure StockForSale has demo records for stock tracking
        t_clean = (item.tag_text or '').strip()
        if t_clean and not StockForSale.objects.filter(tag_text=t_clean, firm_id__iexact='DEMO').exists():
            StockForSale.objects.create(
                tag_text=t_clean,
                groups=item.item_group,
                item=item.item_name,
                purchase_quantity=25.0,
                flag1='1',
                firm_id='DEMO'
            )

def reverse_demo_stock(apps, schema_editor):
    pass

class Migration(migrations.Migration):

    dependencies = [
        ('store', '0037_itemmaster_multitenant_columns'),
    ]

    operations = [
        migrations.RunPython(populate_demo_stock, reverse_demo_stock),
    ]
