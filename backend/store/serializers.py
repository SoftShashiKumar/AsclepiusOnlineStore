from rest_framework import serializers
from .models import Sales, FirmProfile  # Aapki sales wali aur Firm wali model class

# 🔑 1. JWT ke liye naya import (Ise upar jodna hai)
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

# -------------------------------------------------------------
# Aapka purana code (Ise bilkul touch nahi karna hai, jaisa tha waisa hi rahega)
class SalesSerializer(serializers.ModelSerializer):
    class Meta:
        model = Sales
        fields = ['id', 'invoice', 'metal', 'customer', 'addresses', 'payment_mode']
# -------------------------------------------------------------


# 🔑 2. Hamara naya Custom Token Logic (Ise file ke sabse neeche add kar dena hai)
class MyTokenObtainPairSerializer(TokenObtainPairSerializer):
    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)

        # Token ke andar data store karne ke liye
        token['username'] = user.username
        
        if user.is_superuser:
            token['role'] = 'Admin'
        elif user.is_staff:
            token['role'] = 'Manager'
        else:
            token['role'] = 'Customer'

        return token

    def validate(self, attrs):
        data = super().validate(attrs)

        # React ko direct dikhane ke liye response me role bhejna
        data['username'] = self.user.username
        
        if self.user.is_superuser:
            data['role'] = 'Admin'
        elif self.user.is_staff:
            data['role'] = 'Manager'
        else:
            data['role'] = 'Customer'

        return data

class FirmProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = FirmProfile
        fields = '__all__'