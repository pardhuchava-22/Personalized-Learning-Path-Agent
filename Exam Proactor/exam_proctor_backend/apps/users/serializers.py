from rest_framework import serializers
from django.contrib.auth import get_user_model
from exam_proctor_backend.apps.exams.models import Exam, ExamEnrollment

User = get_user_model()

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 'role', 'phone', 'profile_picture', 'institution', 'department']
        read_only_fields = ['id']

class UserRegistrationSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)
    password_confirm = serializers.CharField(write_only=True, min_length=8)
    department = serializers.CharField(required=False, allow_blank=True)
    institution = serializers.CharField(required=False, allow_blank=True)

    class Meta:
        model = User
        fields = ['username', 'email', 'first_name', 'last_name', 'password', 'password_confirm', 'role', 'institution', 'department']

    def validate(self, data):
        if data['password'] != data['password_confirm']:
            raise serializers.ValidationError({'password': 'Passwords do not match.'})
        return data

    def create(self, validated_data):
        validated_data.pop('password_confirm')
        # Extract extra fields that create_user doesn't handle
        department = validated_data.pop('department', None)
        institution = validated_data.pop('institution', None)
        first_name = validated_data.pop('first_name', '')
        last_name = validated_data.pop('last_name', '')
        
        # Create user with core fields
        user = User.objects.create_user(**validated_data)
        
        # Set additional fields
        user.department = department
        user.institution = institution
        user.first_name = first_name
        user.last_name = last_name
        user.save()
        
        return user

class UserProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 'role', 'phone', 'profile_picture', 'date_of_birth', 'institution', 'department', 'is_verified']
        read_only_fields = ['id', 'is_verified']
