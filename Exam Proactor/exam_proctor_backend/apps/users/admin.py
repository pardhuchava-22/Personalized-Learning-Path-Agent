from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import User

@admin.register(User)
class UserAdmin(BaseUserAdmin):
    fieldsets = BaseUserAdmin.fieldsets + (
        ('Additional Info', {'fields': ('role', 'phone', 'profile_picture', 'date_of_birth', 'institution', 'is_verified')}),
    )
    list_display = ['username', 'email', 'first_name', 'last_name', 'role', 'is_verified']
    list_filter = ['role', 'is_verified', 'created_at']
