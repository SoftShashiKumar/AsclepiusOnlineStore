from django.db import migrations, models

def migrate_itemmaster_data(apps, schema_editor):
    ItemMaster = apps.get_model('store', 'ItemMaster')
    OfferBanner = apps.get_model('store', 'OfferBanner')
    
    # 1. Populate initial multi-tenant firm columns
    for item in ItemMaster.objects.all():
        # Firm 1 (Shree) inherits legacy fields
        item.active_1 = item.flag1 if item.flag1 else '1'
        item.available_quantity_1 = item.available_quantity if item.available_quantity is not None else 0.0
        item.reorder_level_1 = item.reorder_level if item.reorder_level is not None else 20
        
        # Firm 2 (Demo)
        item.active_2 = '1'
        item.available_quantity_2 = 0.0
        item.reorder_level_2 = 20

        # Firm 3 & 4
        item.active_3 = '1'
        item.available_quantity_3 = 0.0
        item.reorder_level_3 = 20

        item.active_4 = '1'
        item.available_quantity_4 = 0.0
        item.reorder_level_4 = 20
        
        item.save()

    # 2. Ensure each firm has an OfferBanner row
    for f in ['SHREE', 'DEMO']:
        if not OfferBanner.objects.filter(firm_id__iexact=f).exists():
            OfferBanner.objects.create(firm_id=f, offer_text='', is_active=False)


class Migration(migrations.Migration):

    dependencies = [
        ('store', '0036_set_demo_logo'),
    ]

    operations = [
        migrations.AddField(
            model_name='itemmaster',
            name='active_1',
            field=models.CharField(blank=True, db_column='Active1', default='1', max_length=20, null=True),
        ),
        migrations.AddField(
            model_name='itemmaster',
            name='active_2',
            field=models.CharField(blank=True, db_column='Active2', default='1', max_length=20, null=True),
        ),
        migrations.AddField(
            model_name='itemmaster',
            name='active_3',
            field=models.CharField(blank=True, db_column='Active3', default='1', max_length=20, null=True),
        ),
        migrations.AddField(
            model_name='itemmaster',
            name='active_4',
            field=models.CharField(blank=True, db_column='Active4', default='1', max_length=20, null=True),
        ),
        migrations.AddField(
            model_name='itemmaster',
            name='available_quantity_1',
            field=models.DecimalField(blank=True, db_column='Available_quantity_1', decimal_places=2, default=0.0, max_digits=10, null=True),
        ),
        migrations.AddField(
            model_name='itemmaster',
            name='available_quantity_2',
            field=models.DecimalField(blank=True, db_column='Available_quantity_2', decimal_places=2, default=0.0, max_digits=10, null=True),
        ),
        migrations.AddField(
            model_name='itemmaster',
            name='available_quantity_3',
            field=models.DecimalField(blank=True, db_column='Available_quantity_3', decimal_places=2, default=0.0, max_digits=10, null=True),
        ),
        migrations.AddField(
            model_name='itemmaster',
            name='available_quantity_4',
            field=models.DecimalField(blank=True, db_column='Available_quantity_4', decimal_places=2, default=0.0, max_digits=10, null=True),
        ),
        migrations.AddField(
            model_name='itemmaster',
            name='reorder_level_1',
            field=models.IntegerField(blank=True, db_column='reorder_level_1', default=20, null=True),
        ),
        migrations.AddField(
            model_name='itemmaster',
            name='reorder_level_2',
            field=models.IntegerField(blank=True, db_column='reorder_level_2', default=20, null=True),
        ),
        migrations.AddField(
            model_name='itemmaster',
            name='reorder_level_3',
            field=models.IntegerField(blank=True, db_column='reorder_level_3', default=20, null=True),
        ),
        migrations.AddField(
            model_name='itemmaster',
            name='reorder_level_4',
            field=models.IntegerField(blank=True, db_column='reorder_level_4', default=20, null=True),
        ),
        migrations.RunPython(migrate_itemmaster_data),
    ]
