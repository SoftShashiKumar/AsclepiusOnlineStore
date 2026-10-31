from django.db import migrations

def seed_firms_and_tag_data(apps, schema_editor):
    FirmProfile = apps.get_model('store', 'FirmProfile')
    Sales = apps.get_model('store', 'Sales')
    StockForSale = apps.get_model('store', 'StockForSale')
    StockImages = apps.get_model('store', 'StockImages')
    ItemMaster = apps.get_model('store', 'ItemMaster')
    Customers = apps.get_model('store', 'Customers')
    ReceiptVoucher = apps.get_model('store', 'ReceiptVoucher')
    EstimatedSales = apps.get_model('store', 'EstimatedSales')
    SalesOrder = apps.get_model('store', 'SalesOrder')
    BillwiseSPSettlement = apps.get_model('store', 'BillwiseSPSettlement')
    OfferBanner = apps.get_model('store', 'OfferBanner')
    UserProfile = apps.get_model('store', 'UserProfile')
    User = apps.get_model('auth', 'User')

    # 1. Update Existing FirmProfile
    shree_firm = FirmProfile.objects.first()
    if shree_firm:
        shree_firm.firm_id = 'SHREE'
        shree_firm.subdomain = 'shree'
        shree_firm.is_active = True
        if not shree_firm.firm_name or shree_firm.firm_name == 'Jewellers Online':
            shree_firm.firm_name = 'Shree Wellness Center'
        shree_firm.save()

    # 2. Create Demo FirmProfile if not present
    if not FirmProfile.objects.filter(firm_id='DEMO').exists():
        FirmProfile.objects.create(
            firm_id='DEMO',
            subdomain='demo',
            firm_name='Demo Health Store',
            proprietor_name='Demo Manager',
            tagline_1='Testing & Demo Health Center',
            address_line_1='Demo Business Park, Test Road',
            phone_1='9876543210',
            email='demo@asclepiusstore.in',
            is_active=True,
            invoice_prefix='DEMO'
        )

    # 3. Tag all untagged records with SHREE
    models_to_tag = [Sales, StockForSale, StockImages, ItemMaster, Customers, ReceiptVoucher, EstimatedSales, SalesOrder, BillwiseSPSettlement, OfferBanner]
    for model in models_to_tag:
        model.objects.filter(firm_id__isnull=True).update(firm_id='SHREE')
        model.objects.filter(firm_id='').update(firm_id='SHREE')

    # 4. Assign user 'shree' to firm SHREE
    shree_user = User.objects.filter(username='shree').first()
    if shree_user:
        profile = UserProfile.objects.filter(user=shree_user).first()
        if profile:
            profile.firm_id = 'SHREE'
            profile.save()

    # 5. Create user 'demo' if not present
    demo_user = User.objects.filter(username='demo').first()
    if not demo_user:
        demo_user = User.objects.create_user(username='demo', email='demo@asclepiusstore.in', password='demo123')
        demo_user.is_staff = True
        demo_user.save()
        UserProfile.objects.create(user=demo_user, phone_number='+919876543210', firm_id='DEMO')


class Migration(migrations.Migration):

    dependencies = [
        ('store', '0033_firmprofile_firm_id_firmprofile_is_active_and_more'),
    ]

    operations = [
        migrations.RunPython(seed_firms_and_tag_data, reverse_code=migrations.RunPython.noop),
    ]
