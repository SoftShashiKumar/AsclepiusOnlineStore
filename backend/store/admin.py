from django.contrib import admin
from .models import Sales  # Hamare naye model ko import kar rahe hain

admin.site.register(Sales)  # Django ko bol rahe hain ki dashboard par ise show kare

from django.contrib import admin
from .models import StockForSale

admin.site.register(StockForSale)

from django.contrib import admin
from .models import Customers # Apne Customers model ko import kiya

admin.site.register(Customers)

from django.contrib import admin
from .models import OfferBanner  # Agar same folder me hai, nahi toh correct import path dalein

@admin.register(OfferBanner)
class OfferBannerAdmin(admin.ModelAdmin):
    list_display = ('offer_text', 'is_active', 'created_at')
    list_filter = ('is_active',)
    search_fields = ('offer_text',)

from .models import FirmProfile # FirmProfile
admin.site.register(FirmProfile)