from django.db import migrations

def set_demo_logo(apps, schema_editor):
    FirmProfile = apps.get_model('store', 'FirmProfile')
    FirmProfile.objects.filter(firm_id='DEMO').update(logo='firm_logos/DemoLogo.png')

class Migration(migrations.Migration):

    dependencies = [
        ('store', '0035_update_firm_websites'),
    ]

    operations = [
        migrations.RunPython(set_demo_logo, reverse_code=migrations.RunPython.noop),
    ]
