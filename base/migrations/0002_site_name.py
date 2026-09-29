# The site's name and domain appear in allauth's emails ("Hello from BaatCheet!").
# Only replaces Django's placeholder, so a database that already names its site keeps it.

from django.db import migrations

PLACEHOLDER = "example.com"


def name_site(apps, schema_editor):
    Site = apps.get_model("sites", "Site")
    Site.objects.filter(id=1, domain=PLACEHOLDER).update(domain="baatcheet.app", name="BaatCheet")


class Migration(migrations.Migration):
    dependencies = [
        ("base", "0001_initial"),
        ("sites", "0002_alter_domain_unique"),
    ]

    operations = [migrations.RunPython(name_site, migrations.RunPython.noop)]
