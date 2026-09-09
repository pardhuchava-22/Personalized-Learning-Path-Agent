"""Utility functions for permissions and decorators."""
from rest_framework.permissions import BasePermission


class IsInstructor(BasePermission):
    """Permission class for instructors only."""
    
    def has_permission(self, request, view):
        return request.user and request.user.role == 'instructor'


class IsStudent(BasePermission):
    """Permission class for students only."""
    
    def has_permission(self, request, view):
        return request.user and request.user.role == 'student'


class IsInstructorOrStudent(BasePermission):
    """Permission class for instructors and students."""
    
    def has_permission(self, request, view):
        return request.user and request.user.role in ['instructor', 'student']


class IsOwnerOrInstructor(BasePermission):
    """Permission to check if user is owner or instructor."""
    
    def has_object_permission(self, request, view, obj):
        if hasattr(obj, 'student'):
            return obj.student == request.user or obj.exam.instructor == request.user
        return False
