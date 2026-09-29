# Names the site (it appears in emails). 0002 did nothing on a fresh database: Django creates the default
# example.com site after all migrations have run, so there was no row to rename yet. This creates the row if
# it's missing (Django then skips its default) and renames it if it's still the placeholder.

from django.db import migrations

PLACEHOLDER = "example.com"


def name_site(apps, schema_editor):
    Site = apps.get_model("sites", "Site")
    site, created = Site.objects.get_or_create(id=1, defaults={"domain": "baatcheet.app", "name": "BaatCheet"})
    if not created and site.domain == PLACEHOLDER:
        site.domain, site.name = "baatcheet.app", "BaatCheet"
        site.save()


class Migration(migrations.Migration):
    dependencies = [("base", "0002_site_name")]

    operations = [migrations.RunPython(name_site, migrations.RunPython.noop)]
