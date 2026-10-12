"""
URL configuration for backend project.
"""
from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static

# 🔑 SimpleJWT imports
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from store.serializers import MyTokenObtainPairSerializer

class MyTokenObtainPairView(TokenObtainPairView):
    serializer_class = MyTokenObtainPairSerializer


urlpatterns = [
    # ❌ PURANA JWT LOGIN COMMENT / REMOVE KAR DIYA
    # path('api/login/', MyTokenObtainPairView.as_view(), name='token_obtain_pair'),

    path('api/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    
    # 1. Django Admin Panel ka rasta
    path('admin/', admin.site.urls), 
    
    # 2. Saari API aur Frontend Requests (including /api/login/ for WhatsApp 2FA) ko 'store' app me bheja
    path('', include('store.urls')),  
]

# 🔥 Media Files (Photos) configuration
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)