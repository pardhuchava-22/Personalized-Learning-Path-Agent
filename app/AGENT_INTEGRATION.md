# AI LLM + Five-Agent Integration

This file is the quick-finder for the new backend integration.

## Main files

### LLM integration
- [app/services/llm_service.py](services/llm_service.py)
- Purpose: connects to Gemini and provides the LLM response logic.

### Five-agent pipeline
- [app/services/five_agents.py](services/five_agents.py)
- Purpose: runs the five agents in sequence.

### API endpoints
- [app/api/agents.py](api/agents.py)
- Purpose: exposes /api/agents routes for LLM and diagnostic calls.

### App registration
- [app/main.py](main.py)
- Purpose: registers the agent router in the FastAPI app.

## Five agents included
1. student_interaction
2. mastery_assessment
3. gap_diagnosis
4. path_sequencing
5. teacher_notification

## Important note
These files are backend-only and do not change the login UI, colors, or existing website design.

## Quick test route names
- GET /api/agents/llm/status
- POST /api/agents/llm/run
- POST /api/agents/diagnostic
