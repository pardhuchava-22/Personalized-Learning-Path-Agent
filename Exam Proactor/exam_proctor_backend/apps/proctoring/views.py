from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.utils import timezone
from .models import (
    ProctoringViolation, ExamSession, ActivityLog, ScreenCapture
)
from .serializers import (
    ProctoringViolationSerializer, ExamSessionSerializer,
    ActivityLogSerializer, ScreenCaptureSerializer
)
import logging

logger = logging.getLogger(__name__)

class ProctoringViolationViewSet(viewsets.ModelViewSet):
    queryset = ProctoringViolation.objects.all()
    serializer_class = ProctoringViolationSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.role == 'instructor':
            return ProctoringViolation.objects.filter(enrollment__exam__instructor=user)
        return ProctoringViolation.objects.filter(enrollment__student=user)

    @action(detail=False, methods=['post'])
    def report_violation(self, request):
        """Report a new violation with snapshot evidence."""
        import base64
        import os
        from django.core.files.base import ContentFile
        from django.conf import settings
        
        violation_type = request.data.get('violation_type')
        enrollment_id = request.data.get('enrollment_id')
        description = request.data.get('description', '')
        severity = request.data.get('severity', 'medium')
        detections = request.data.get('detections', {})
        import json
        if isinstance(detections, str):
            try: detections = json.loads(detections)
            except: detections = {}
            
        snapshot_data = request.data.get('snapshot') # Expect base64 from front-end

        try:
            # Ensure an active session exists for this enrollment to attach logs/activities
            session, _ = ExamSession.objects.get_or_create(
                enrollment_id=enrollment_id,
                defaults={
                    'status': 'active',
                    'ip_address': request.META.get('REMOTE_ADDR'),
                    'user_agent': request.META.get('HTTP_USER_AGENT', '')
                }
            )

            violation = ProctoringViolation.objects.create(
                enrollment_id=enrollment_id,
                violation_type=violation_type,
                description=description,
                severity=severity,
                detections=detections
            )

            # --- Organized Snapshot Storage Execution (Standardized) ---
            if snapshot_data:
                try:
                    import base64
                    from django.core.files.base import ContentFile
                    from django.utils import timezone
                    
                    # Handle Data URL vs URL vs Raw Base64
                    if ';base64,' in snapshot_data:
                        format, imgstr = snapshot_data.split(';base64,')
                        ext = format.split('/')[-1].split(';')[0]
                    elif str(snapshot_data).startswith('http'):
                        logger.info(f"System: Received snapshot URL: {snapshot_data}. Skipping file conversion.")
                        imgstr = None
                    else:
                        imgstr = snapshot_data
                        ext = 'png'
                    
                    if imgstr:
                        image_content = base64.b64decode(imgstr)
                        filename = f"capture_{timezone.now().strftime('%H%M%S')}.{ext}"
                        violation.evidence_screenshot.save(filename, ContentFile(image_content), save=False)
                        logger.info(f"System: Saved snapshot capture for violation {violation.id}")
                except Exception as img_err:
                    logger.error(f"System: Failed to process violation snapshot: {str(img_err)}")

            if 'evidence_screenshot' in request.FILES:
                violation.evidence_screenshot = request.FILES['evidence_screenshot']
            
            violation.save()

            # Update enrollment violation metrics & Integrity Score Sync
            enrollment = violation.enrollment
            enrollment.total_violations = ProctoringViolation.objects.filter(enrollment=enrollment).count()
            
            violations = ProctoringViolation.objects.filter(enrollment=enrollment)
            high = violations.filter(severity='high').count() * 20
            med = violations.filter(severity='medium').count() * 10
            low = violations.filter(severity='low').count() * 5
            enrollment.integrity_score = max(0, 100 - (high + med + low))
            enrollment.save()

            # Create an ActivityLog entry
            ActivityLog.objects.create(
                session=session,
                activity_type='violation_detected',
                description=f"AI ALERT: {violation.get_violation_type_display()} - {description}",
                metadata={
                    'violation_id': violation.id,
                    'type': violation_type,
                    'severity': severity
                }
            )

            serializer = ProctoringViolationSerializer(violation, context={'request': request})
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        except Exception as e:
            print(f"Error in report_violation: {e}")
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)



    @action(detail=False, methods=['post'], permission_classes=[IsAuthenticated])
    def clear_violations(self, request):
        """Faculty can clear violations for a student (unblock)."""
        user = request.user
        enrollment_id = request.data.get('enrollment_id')
        
        # Check if user is instructor
        if user.role != 'instructor':
            return Response({'error': 'Only instructors can clear violations'}, status=status.HTTP_403_FORBIDDEN)
        
        try:
            from exam_proctor_backend.apps.exams.models import ExamEnrollment
            enrollment = ExamEnrollment.objects.get(id=enrollment_id)
            
            # Check if instructor owns the exam
            if enrollment.exam.instructor != user:
                return Response({'error': 'You can only manage your own exam violations'}, status=status.HTTP_403_FORBIDDEN)
            
            # Clear all violations for this enrollment
            violations = ProctoringViolation.objects.filter(enrollment=enrollment)
            violations.delete()
            
            # Reset violation counts
            enrollment.total_violations = 0
            enrollment.final_violations = 0
            enrollment.score_reduction = 0
            enrollment.save()
            
            return Response({'message': f'Violations cleared for student. They can now continue the exam.'})
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

class ExamSessionViewSet(viewsets.ModelViewSet):
    queryset = ExamSession.objects.all()
    serializer_class = ExamSessionSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.role == 'instructor':
            return ExamSession.objects.filter(enrollment__exam__instructor=user)
        return ExamSession.objects.filter(enrollment__student=user)

    @action(detail=False, methods=['post'])
    def start_session(self, request):
        """Start exam session."""
        enrollment_id = request.data.get('enrollment_id')
        ip_address = self.request.META.get('REMOTE_ADDR')
        user_agent = self.request.META.get('HTTP_USER_AGENT', '')
        device_info = request.data.get('device_info', {})

        try:
            session, created = ExamSession.objects.get_or_create(
                enrollment_id=enrollment_id,
                defaults={
                    'ip_address': ip_address,
                    'user_agent': user_agent,
                    'device_info': device_info
                }
            )
            serializer = ExamSessionSerializer(session)
            return Response(serializer.data, status=status.HTTP_201_CREATED if created else status.HTTP_200_OK)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['post'])
    def end_session(self, request, pk=None):
        """End exam session."""
        session = self.get_object()
        session.status = 'ended'
        session.session_end = timezone.now()
        session.total_session_duration_seconds = int(
            (session.session_end - session.session_start).total_seconds()
        )
        session.save()
        serializer = ExamSessionSerializer(session)
        return Response(serializer.data)

    @action(detail=False, methods=['post'])
    def upload_id_card(self, request):
        """Upload ID card verification image."""
        import base64
        import os
        from django.core.files.base import ContentFile
        from django.conf import settings
        
        enrollment_id = request.data.get('enrollment_id')
        image_data = request.data.get('image')
        
        if not image_data:
            return Response({'error': 'No image provided'}, status=status.HTTP_400_BAD_REQUEST)
            
        try:
            # Handle data URL format (data:image/jpeg;base64,...)
            if ';base64,' in image_data:
                format, imgstr = image_data.split(';base64,')
                ext = format.split('/')[-1]
            else:
                imgstr = image_data
                ext = 'jpg'
                
            username = request.user.username
            timestamp = timezone.now().strftime('%Y%m%d_%H%M%S')
            filename = f"{username}_{timestamp}.{ext}"
            
            # Save the decoded image
            data = ContentFile(base64.b64decode(imgstr), name=filename)
            
            # Use Django's default storage to save it, or construct specific path
            from django.core.files.storage import FileSystemStorage
            verification_dir = os.path.join(settings.MEDIA_ROOT, 'captures', 'verification')
            os.makedirs(verification_dir, exist_ok=True)
            
            fs = FileSystemStorage(location=verification_dir)
            saved_filename = fs.save(filename, data)
            file_url = fs.url(saved_filename)
            
            return Response({'message': 'ID card uploaded successfully', 'file': saved_filename}, status=status.HTTP_201_CREATED)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

class ActivityLogViewSet(viewsets.ModelViewSet):
    queryset = ActivityLog.objects.all()
    serializer_class = ActivityLogSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return ActivityLog.objects.filter(session__enrollment__student=self.request.user)

    @action(detail=False, methods=['post'])
    def log_activity(self, request):
        """Log student activity."""
        session_id = request.data.get('session_id')
        activity_type = request.data.get('activity_type')
        description = request.data.get('description', '')
        metadata = request.data.get('metadata', {})

        try:
            activity = ActivityLog.objects.create(
                session_id=session_id,
                activity_type=activity_type,
                description=description,
                metadata=metadata
            )
            serializer = ActivityLogSerializer(activity)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

class ScreenCaptureViewSet(viewsets.ModelViewSet):
    queryset = ScreenCapture.objects.all()
    serializer_class = ScreenCaptureSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return ScreenCapture.objects.filter(session__enrollment__student=self.request.user)

    @action(detail=False, methods=['post'])
    def capture_screenshot(self, request):
        """Capture screenshot during exam."""
        session_id = request.data.get('session_id')
        reason = request.data.get('reason', 'random')

        try:
            if 'image' not in request.FILES:
                return Response({'error': 'No image provided'}, status=status.HTTP_400_BAD_REQUEST)

            capture = ScreenCapture.objects.create(
                session_id=session_id,
                image=request.FILES['image'],
                reason=reason
            )

            # Update session screenshot count
            session = capture.session
            session.total_screenshots += 1
            session.save()

            serializer = ScreenCaptureSerializer(capture)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
