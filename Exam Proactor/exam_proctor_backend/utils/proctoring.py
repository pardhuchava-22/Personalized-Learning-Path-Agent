"""
Proctoring utility functions for violation detection and score calculation.
"""
from django.conf import settings
from .models import ProctoringViolation, ExamSession
from exam_proctor_backend.apps.exams.models import ExamEnrollment


def check_violation_threshold(enrollment):
    """
    Check if violation threshold is exceeded and apply score reduction.
    Returns True if exam should be terminated.
    """
    violation_threshold = enrollment.exam.violation_threshold
    current_violations = enrollment.total_violations
    
    if current_violations >= violation_threshold:
        enrollment.final_violations = current_violations
        return True
    return False


def calculate_score_reduction(enrollment):
    """
    Calculate score reduction based on violations.
    """
    if enrollment.final_violations == 0:
        return 0
    
    exam = enrollment.exam
    violation_ratio = enrollment.final_violations / exam.violation_threshold
    reduction_percentage = (violation_ratio * exam.score_reduction_per_violation)
    
    # Cap the reduction at 100%
    if reduction_percentage > 100:
        reduction_percentage = 100
    
    return reduction_percentage


def apply_score_reduction(enrollment):
    """
    Apply score reduction to enrollment based on violations.
    """
    if not enrollment.score:
        return enrollment.score
    
    reduction_percentage = calculate_score_reduction(enrollment)
    enrollment.score_reduction = reduction_percentage
    
    # Calculate final score after reduction
    final_score = enrollment.score - (enrollment.score * reduction_percentage / 100)
    
    # Ensure score doesn't go below 0
    final_score = max(0, final_score)
    
    return final_score


def determine_result(enrollment):
    """
    Determine pass/fail result based on final score and passing marks.
    """
    if enrollment.score is None:
        return None
    
    final_score = enrollment.score - (enrollment.score * enrollment.score_reduction / 100)
    if final_score >= enrollment.exam.passing_marks:
        enrollment.result = 'pass'
    else:
        enrollment.result = 'fail'
    
    return enrollment.result


def detect_suspicious_activity(session_data):
    """
    Analyze session data for suspicious activities.
    Returns list of detected violations.
    """
    violations = []
    
    # Check for unusual session duration
    if session_data.get('session_duration_minutes', 0) < 1:
        violations.append({
            'type': 'suspicious_activity',
            'reason': 'Unusually short session duration',
            'severity': 'low'
        })
    
    # Check for multiple rapid submissions
    if session_data.get('submission_count', 0) > 50:
        violations.append({
            'type': 'suspicious_activity',
            'reason': 'Excessive submission attempts',
            'severity': 'high'
        })
    
    return violations


def get_violation_statistics(enrollment):
    """
    Get violation statistics for an enrollment.
    """
    violations = ProctoringViolation.objects.filter(enrollment=enrollment)
    
    stats = {
        'total_violations': violations.count(),
        'by_type': {},
        'by_severity': {},
        'violation_timeline': []
    }
    
    for violation in violations:
        # Count by type
        v_type = violation.get_violation_type_display()
        stats['by_type'][v_type] = stats['by_type'].get(v_type, 0) + 1
        
        # Count by severity
        severity = violation.severity
        stats['by_severity'][severity] = stats['by_severity'].get(severity, 0) + 1
        
        # Add to timeline
        stats['violation_timeline'].append({
            'time': violation.detected_at,
            'type': v_type,
            'severity': severity
        })
    
    return stats


def generate_proctoring_report(enrollment):
    """
    Generate comprehensive proctoring report for an enrollment.
    """
    session = ExamSession.objects.filter(enrollment=enrollment).first()
    violations = ProctoringViolation.objects.filter(enrollment=enrollment)
    
    report = {
        'enrollment_id': enrollment.id,
        'student': str(enrollment.student),
        'exam': str(enrollment.exam),
        'status': enrollment.status,
        'violation_statistics': get_violation_statistics(enrollment),
        'session_duration': 0,
        'camera_on_duration': 0,
        'mic_on_duration': 0,
        'violations_detail': []
    }
    
    if session:
        report['session_duration'] = session.total_session_duration_seconds
        report['camera_enabled'] = session.camera_enabled
        report['mic_enabled'] = session.mic_enabled
    
    for violation in violations:
        report['violations_detail'].append({
            'type': violation.get_violation_type_display(),
            'severity': violation.severity,
            'time': violation.detected_at.isoformat(),
            'description': violation.description,
            'reviewed': violation.reviewed
        })
    
    return report
