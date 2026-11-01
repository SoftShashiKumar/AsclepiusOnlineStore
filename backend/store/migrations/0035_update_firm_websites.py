from django.db import migrations

def update_firm_websites(apps, schema_editor):
    FirmProfile = apps.get_model('store', 'FirmProfile')
    FirmProfile.objects.filter(firm_id='SHREE').update(website='shree.asclepiusstore.in')
    FirmProfile.objects.filter(firm_id='DEMO').update(website='demo.asclepiusstore.in')

class Migration(migrations.Migration):

    dependencies = [
        ('store', '0034_seed_firms_and_tag_data'),
    ]

    operations = [
        migrations.RunPython(update_firm_websites, reverse_code=migrations.RunPython.noop),
    ]
