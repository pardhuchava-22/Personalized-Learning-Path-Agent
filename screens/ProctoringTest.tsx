import React, { useState, useEffect } from 'react';
import { Button } from '../components/ui/Button';

export const ProctoringTestScreen: React.FC<{ onNavigate: (path: string) => void }> = ({ onNavigate }) => {
  const [exams, setExams] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchExams = async () => {
    setLoading(true);
    setError(null);
    try {
      // Assuming a generic GET /api/exams endpoint from the ViewSet 
      // (This will normally require auth, but for testing if they haven't disabled it, we might get 401s. Let's see.)
      const res = await fetch('http://localhost:8000/api/exams/', {
        headers: { 'Content-Type': 'application/json' }
      });
      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
            throw new Error(`Auth required. Note: Full integration needs JWT tokens. Status: ${res.status}`);
        }
        throw new Error(`Failed to fetch: ${res.statusText}`);
      }
      const data = await res.json();
      setExams(data);
    } catch (err: any) {
      setError(err.message || 'Error communicating with backend');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-8 flex flex-col items-center">
      <div className="w-full max-w-2xl bg-white p-6 rounded-xl shadow-md space-y-6">
        <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold text-slate-800">Proctoring Backend Test</h1>
            <Button onClick={() => onNavigate('/dashboard')} variant="secondary">Back to Dashboard</Button>
        </div>
        
        <p className="text-slate-600">
          This interface verifies that the React frontend can communicate with the Django Exam Proctoring Backend.
          Make sure Django is running on port 8000 (<code>py manage.py runserver</code>).
        </p>

        <div className="flex gap-4">
          <Button onClick={fetchExams} disabled={loading}>
            {loading ? 'Testing...' : 'Test Connection / Fetch Exams'}
          </Button>
        </div>

        {error && (
          <div className="p-4 bg-red-50 text-red-600 border border-red-200 rounded-lg">
            <strong>Error: </strong> {error}
          </div>
        )}

        {exams.length > 0 && (
          <div>
            <h2 className="text-lg font-bold mb-2">Exams from Backend:</h2>
            <ul className="space-y-2">
              {exams.map((exam: any) => (
                <li key={exam.id} className="p-3 bg-slate-100 rounded-md border border-slate-200">
                  <strong>{exam.title}</strong> - Status: {exam.status} <br/>
                  <span className="text-sm text-slate-500">Duration: {exam.duration_minutes}m, Marks: {exam.total_marks}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

      </div>
    </div>
  );
};
