import os
import random
import requests
import resend
from datetime import timedelta
from django.utils import timezone
from django.contrib.auth import authenticate, login
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken  # JWT Tokens generate karne ke liye
from store.models import UserProfile, FirmProfile
from django.core.mail import send_mail
from django.conf import settings


@api_view(['POST'])
@permission_classes([AllowAny])
def initiate_login_view(request):
    username = request.data.get('username')
    password = request.data.get('password')

    user = authenticate(username=username, password=password)

    if user is None:
        return Response({'success': False, 'message': 'Invalid Username or Password!'}, status=400)

    # 🟢 Sahi Tareeqa: Hardcoded naam ki jagah is_superuser check karein
    if user.is_superuser or user.is_staff:
        # Agar UserProfile nahi hai, toh auto-create kar do taaki crash na ho
        profile, created = UserProfile.objects.get_or_create(user=user)

        # Email Validation: Check if email is actually saved in database
        if not user.email:
            return Response({'success': False, 'message': 'Admin account me Email ID set nahi hai! Naya superuser Email ke sath banayein.'}, status=400)

        # 6-Digit Random OTP Generate
        otp = str(random.randint(100000, 999999))
        profile.otp_code = otp
        profile.otp_created_at = timezone.now()
        profile.save()

        # Resend API se OTP bhejane ka code
        # try:
        #     resend.api_key = os.environ.get('RESEND_API_KEY', '')
        #     params = {
        #         "from": "Tiya Jewellers <admin@jewellershub.in>",
        #         "to": [user.email],
        #         "subject": "👑 Admin Login OTP",
        #         "text": f"Hello {user.username},\n\nAapke Login Verification ke liye OTP code hai: {otp}\n\n⚠️ Ye code 5 minutes me expire ho jayega. Kisi ke sath share na karein."
        #     }
        #     resend.Emails.send(params)
            
        #     return Response({
        #         'success': True,
        #         'require_otp': True,
        #         'message': 'OTP sent successfully!',
        #         'username': user.username
        #     })
        # Resend API se OTP bhejane ka code
        try:
            resend.api_key = getattr(settings, 'RESEND_API_KEY', os.environ.get('RESEND_API_KEY', ''))
            
            # 🟢 Database se Firm Name nikalna
            firm = FirmProfile.objects.first()
            firm_name = firm.firm_name if firm and firm.firm_name else "Tiya Jewellers"

            params = {
                "from": f"{firm_name} <admin@jewellershub.in>", # 👈 Dynamic sender name
                "to": [user.email],
                "subject": f"👑 {firm_name} - Admin Login OTP", # 👈 Dynamic subject
                "text": f"Hello {user.username},\n\nAapke Login Verification ke liye OTP code hai: {otp}\n\n⚠️ Ye code 5 minutes me expire ho jayega. Kisi ke sath share na karein.\n\nRegards,\nTeam {firm_name}" # 👈 Dynamic text
            }
            resend.Emails.send(params)
            
            return Response({
                'success': True,
                'require_otp': True,
                'message': 'OTP sent successfully!',
                'username': user.username
            })
        except Exception as e:
            return Response({'success': False, 'message': 'Email Send Failed!', 'error': str(e)}, status=500)

    # General Users / Customers -> Direct Login (No OTP Needed)
    else:
        login(request, user)
        refresh = RefreshToken.for_user(user)
        return Response({
            'success': True,
            'require_otp': False,
            'message': 'Login Successful!',
            'access': str(refresh.access_token),
            'refresh': str(refresh),
            'role': 'Customer',
            'username': user.username
        })
# ==========================================
# 🛡️ STEP B: VERIFY Email OTP
# ==========================================
@api_view(['POST'])
@permission_classes([AllowAny])
def verify_otp_view(request):
    username = request.data.get('username')
    otp_entered = request.data.get('otp')

    try:
        profile = UserProfile.objects.get(user__username=username)
    except UserProfile.DoesNotExist:
        return Response({'success': False, 'message': 'Invalid user!'}, status=400)

    # OTP Expiration Check (5 Minutes Valid)
    if profile.otp_created_at and (timezone.now() - profile.otp_created_at) > timedelta(minutes=5):
        return Response({'success': False, 'message': 'OTP Expired! Please login again.'}, status=400)

    if profile.otp_code == otp_entered:
        # OTP Correct -> Clear OTP and Login User
        user = profile.user
        login(request, user)
        
        profile.otp_code = None
        profile.save()

        # Generate JWT Tokens
        refresh = RefreshToken.for_user(user)

        # 👑 Determine Role explicitly
        role = 'Admin' if (user.is_superuser or user.is_staff or user.username in ['admins', 'shashi', 'Ayush']) else 'Customer'

        return Response({
            'success': True,
            'message': 'OTP Verification Successful! Welcome back.',
            'access': str(refresh.access_token),
            'refresh': str(refresh),
            'role': role,
            'username': user.username
        })
    else:
        return Response({'success': False, 'message': 'Invalid OTP Code! Please try again.'}, status=400)