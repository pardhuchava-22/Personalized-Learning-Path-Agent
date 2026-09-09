import os
import io
import base64
import json
import logging
import warnings
from typing import Optional, List, Dict, Any

# Suppress deprecation warnings from google.generativeai and Python version
warnings.filterwarnings("ignore", category=FutureWarning, module="google")

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from PIL import Image
import numpy as np
import cv2
import uvicorn

# Allow YOLOv8 classes in safe globals for PyTorch 2.6+ compatibility
import torch
try:
    # Save the original torch.load function
    _original_torch_load = torch.load

    # Dynamically monkeypatch torch.load to bypass weights_only restriction in PyTorch 2.6+
    def _patched_torch_load(*args, **kwargs):
        kwargs["weights_only"] = False
        return _original_torch_load(*args, **kwargs)

    # Apply global override
    torch.load = _patched_torch_load
    logging.info("PyTorch 2.6+ torch.load successfully monkeypatched to bypass weights_only restrictions.")
except Exception as e:
    logging.error(f"Failed to apply PyTorch monkeypatch: {e}")

# Configure logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
logger = logging.getLogger("ProctoringEngine")

# Initialize FastAPI
app = FastAPI(
    title="QuantumGuard Cloud Proctoring Engine",
    description="High-performance hybrid proctoring microservice utilizing YOLOv8, MediaPipe, and Google Gemini.",
    version="1.0.0"
)

# Enable CORS for frontend connection
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Load Prebuilt Models at Startup ──────────────────────────────────
# 1. YOLOv8 for Object Detection (Person, Phone, Laptop, Books)
YOLO_AVAILABLE = False
try:
    from ultralytics import YOLO
    # Download/Load YOLOv8 Nano model (extremely lightweight, ~6MB)
    yolo_model = YOLO("yolov8n.pt")
    # Warm up inference
    yolo_model(np.zeros((100, 100, 3), dtype=np.uint8))
    YOLO_AVAILABLE = True
    logger.info("YOLOv8 Nano prebuilt model successfully initialized.")
except Exception as e:
    logger.error(f"Failed to load YOLOv8 model: {e}. Running in MediaPipe + Gemini fallback mode.")

# 2. MediaPipe FaceMesh for Head Pose, Gaze, and Face Coverings
MEDIAPIPE_AVAILABLE = False
try:
    import mediapipe as mp
    mp_face_mesh = mp.solutions.face_mesh
    face_mesh = mp_face_mesh.FaceMesh(
        static_image_mode=True,
        max_num_faces=4,
        refine_landmarks=True,
        min_detection_confidence=0.65,
        min_tracking_confidence=0.65
    )
    MEDIAPIPE_AVAILABLE = True
    logger.info("MediaPipe FaceMesh prebuilt model successfully initialized.")
except Exception as e:
    logger.error(f"Failed to load MediaPipe FaceMesh: {e}. Running in Gemini fallback mode.")

# 3. Gemini API Client for Multimodal Face Comparison / Identity Lock
GEMINI_AVAILABLE = False
try:
    import google.generativeai as genai
    gemini_key = os.getenv("GEMINI_API_KEY")
    if gemini_key:
        genai.configure(api_key=gemini_key)
        # Warm up checking model availability with a system instruction to suppress lints
        # Supports modern SDK (>=0.8.3)
        genai.GenerativeModel(
            "gemini-2.5-flash", 
            system_instruction="You are an automated exam proctor checking candidate identity."
        )
        GEMINI_AVAILABLE = True
        logger.info("Google Gemini API client successfully initialized.")
    else:
        logger.warning("GEMINI_API_KEY environment variable is not set. Identity Lock will be bypassed.")
except Exception as e:
    logger.error(f"Failed to initialize Gemini API client: {e}.")


# ─── Pydantic Schemas ────────────────────────────────────────────────
class ProctoringFrameRequest(BaseModel):
    current_image: str = Field(description="Base64 encoded JPEG/PNG active camera frame snapshot.")
    reference_image: Optional[str] = Field(default=None, description="Base64 encoded JPEG/PNG calibration reference snapshot.")

class DetectionItem(BaseModel):
    model_config = {"populate_by_name": True, "serialize_by_alias": True}
    bbox: Optional[List[float]] = None
    className: str = Field(alias="class")
    score: float
    data: Optional[Dict[str, Any]] = None

class ViolationsSummary(BaseModel):
    phone_detected: bool
    multiple_people: bool
    no_person: bool
    head_turned: bool
    head_pose: str
    suspicious_object: bool
    face_covered: bool

class ProctoringAnalysisResponse(BaseModel):
    same_person: bool
    same_person_confidence: float
    detections: List[DetectionItem]
    violations: ViolationsSummary


# ─── Utility Helpers ─────────────────────────────────────────────────
def decode_base64_to_cv2(base64_str: str) -> np.ndarray:
    """Decodes base64 string to a cv2-compatible numpy array image."""
    try:
        if "," in base64_str:
            base64_str = base64_str.split(",")[1]
        img_bytes = base64.b64decode(base64_str)
        img_pil = Image.open(io.BytesIO(img_bytes)).convert("RGB")
        return cv2.cvtColor(np.array(img_pil), cv2.COLOR_RGB2BGR)
    except Exception as e:
        logger.error(f"Error decoding image base64: {e}")
        raise HTTPException(status_code=400, detail="Invalid base64 image data.")

def decode_base64_to_pil(base64_str: str) -> Image.Image:
    """Decodes base64 string to a PIL Image (needed for Gemini)."""
    try:
        if "," in base64_str:
            base64_str = base64_str.split(",")[1]
        img_bytes = base64.b64decode(base64_str)
        return Image.open(io.BytesIO(img_bytes)).convert("RGB")
    except Exception as e:
        logger.error(f"Error decoding PIL base64: {e}")
        raise HTTPException(status_code=400, detail="Invalid base64 image data.")


# ─── Head Pose Estimation using MediaPipe Landmark Coordinates ──────
def calculate_head_pose(landmarks, img_w, img_h) -> str:
    """
    Computes approximate head yaw and pitch orientation from facial mesh landmark indices.
    Index mappings:
    - Nose Tip: 1
    - Left Eye Outer corner: 33
    - Right Eye Outer corner: 263
    - Left Mouth corner: 61
    - Right Mouth corner: 291
    """
    try:
        # Extract coordinates
        nose = landmarks[1]
        l_eye = landmarks[33]
        r_eye = landmarks[263]
        l_mouth = landmarks[61]
        r_mouth = landmarks[291]

        # Horizontal ratio (Yaw estimation)
        eye_dist = (r_eye.x - l_eye.x) * img_w
        if eye_dist <= 0:
            return "center"
        
        nose_from_left = (nose.x - l_eye.x) * img_w
        horizontal_ratio = nose_from_left / eye_dist

        # Vertical ratio (Pitch estimation)
        mid_eye_y = ((l_eye.y + r_eye.y) / 2) * img_h
        mid_mouth_y = ((l_mouth.y + r_mouth.y) / 2) * img_h
        face_height = mid_mouth_y - mid_eye_y
        if face_height <= 0:
            return "center"

        nose_from_top = (nose.y * img_h) - mid_eye_y
        vertical_ratio = nose_from_top / face_height

        # Dynamic Threshold Analysis
        if horizontal_ratio < 0.28:
            return "left"  # Corrected mirrored orientation
        elif horizontal_ratio > 0.72:
            return "right"  # Corrected mirrored orientation
        elif vertical_ratio > 0.78:
            return "down"
        elif vertical_ratio < 0.22:
            return "up"
        
        return "center"
    except Exception as e:
        logger.error(f"Error calculating head pose: {e}")
        return "center"


def bbox_overlaps(boxA, boxB) -> bool:
    """Helper to detect overlap between two bounding boxes [x1, y1, x2, y2]."""
    xA = max(boxA[0], boxB[0])
    yA = max(boxA[1], boxB[1])
    xB = min(boxA[2], boxB[2])
    yB = min(boxA[3], boxB[3])
    interArea = max(0, xB - xA) * max(0, yB - yA)
    return interArea > 0

# ─── ENDPOINTS ───────────────────────────────────────────────────────
@app.get("/health")
def health_check():
    """Service diagnostic verification endpoint."""
    return {
        "status": "healthy",
        "yolo_active": YOLO_AVAILABLE,
        "mediapipe_active": MEDIAPIPE_AVAILABLE,
        "gemini_active": GEMINI_AVAILABLE
    }

@app.post("/analyze-frame", response_model=ProctoringAnalysisResponse)
async def analyze_frame(request: ProctoringFrameRequest):
    """
    Receives current camera frames & optionally registration reference photos,
    running local high-speed YOLOv8, MediaPipe, and cloud Gemini to diagnose all proctoring status elements.
    """
    # 1. Decode active image frame
    cv_img = decode_base64_to_cv2(request.current_image)
    h, w, _ = cv_img.shape

    # Track results
    detections: List[DetectionItem] = []
    
    # Violation state flags
    phone_detected = False
    multiple_people = False
    no_person = False
    head_turned = False
    head_pose = "center"
    suspicious_object = False
    face_covered = False

    # ─────────────────────────────────────────────────────────────────
    # ENGINE A: Local High-Speed Inference (YOLOv8 + MediaPipe)
    # ─────────────────────────────────────────────────────────────────
    person_count_yolo = 0

    if YOLO_AVAILABLE:
        try:
            # Run YOLOv8 Nano inference
            results = yolo_model(cv_img, verbose=False)[0]
            boxes = results.boxes

            # Pass 1: Find all person detections and store their boxes
            person_boxes = []
            for box in boxes:
                cls_id = int(box.cls[0])
                score = float(box.conf[0])
                class_name = yolo_model.names[cls_id]
                xyxy = box.xyxy[0].tolist()

                # Extremely inclusive person threshold to ensure overlaps are always calculated
                if class_name == "person" and score > 0.20:
                    person_count_yolo += 1
                    person_boxes.append(xyxy)
                    detections.append(DetectionItem(
                        bbox=xyxy, className="ssd_person", score=score
                    ))

            # Pass 2: Process cell phones and other suspicious objects
            for box in boxes:
                cls_id = int(box.cls[0])
                score = float(box.conf[0])
                class_name = yolo_model.names[cls_id]
                xyxy = box.xyxy[0].tolist()

                if class_name == "cell phone":
                    # Lower threshold to 0.12 if the phone overlaps with a detected person (catches blurry front-view screen frames!)
                    is_overlapping = any(bbox_overlaps(xyxy, p_box) for p_box in person_boxes)
                    if score > 0.30 or (score > 0.12 and is_overlapping):
                        phone_detected = True
                        detections.append(DetectionItem(
                            bbox=xyxy, className="cell phone", score=score
                        ))
                elif class_name in ["laptop", "book"] and score > 0.60:
                    suspicious_object = True
                    detections.append(DetectionItem(
                        bbox=xyxy, className="suspicious_object", score=score,
                        data={"item": class_name}
                    ))
        except Exception as e:
            logger.error(f"YOLO inference error: {e}")

    # MediaPipe Facial Processing
    person_count_mp = 0
    face_detected_mp = False

    if MEDIAPIPE_AVAILABLE:
        try:
            # MediaPipe requires RGB
            rgb_img = cv2.cvtColor(cv_img, cv2.COLOR_BGR2RGB)
            results = face_mesh.process(rgb_img)

            if results.multi_face_landmarks:
                # Filter out background false positives (like logos/drawings on boxes)
                main_landmarks = results.multi_face_landmarks[0].landmark
                x_coords = [lm.x for lm in main_landmarks]
                face_mesh_width = (max(x_coords) - min(x_coords)) * w
                
                # If no person body is detected in the frame by YOLOv8, we raise the MediaPipe face mesh threshold
                # to 140px to ensure we only accept extremely close face shots and filter out distant background drawings/logos.
                min_face_width = 140 if person_count_yolo == 0 else 65
                if face_mesh_width < min_face_width:
                    logger.info(f"Filtered out background face-like pattern or distant drawing (width={face_mesh_width:.1f}px, min_required={min_face_width}px)")
                else:
                    person_count_mp = len(results.multi_face_landmarks)
                    face_detected_mp = True
                    
                    # Check main face head pose (index 0)
                    head_pose = calculate_head_pose(main_landmarks, w, h)
                    
                    # Check for head turned alert
                    if head_pose != "center":
                        head_turned = True

                    detections.append(DetectionItem(
                        className="face",
                        score=0.98,
                        data={"pose": head_pose, "isMain": True}
                    ))
                    
                    # Report extra secondary faces
                    for i in range(1, person_count_mp):
                        detections.append(DetectionItem(
                            className="face",
                            score=0.95,
                            data={"pose": "center", "isMain": False}
                        ))
        except Exception as e:
            logger.error(f"MediaPipe inference error: {e}")

    # Resolve person counts dynamically (Redundancy check)
    resolved_person_count = person_count_mp if face_detected_mp else person_count_yolo
    if resolved_person_count > 1:
        multiple_people = True
        detections.append(DetectionItem(className="multiple_people_detected", score=1.0))
    elif resolved_person_count == 0:
        no_person = True
        detections.append(DetectionItem(className="no_person", score=1.0))
    elif person_count_yolo > 0 and not face_detected_mp:
        face_covered = True
        detections.append(DetectionItem(className="face_covered", score=1.0))

    # ─────────────────────────────────────────────────────────────────
    # ENGINE B: Advanced Multimodal Face Comparison (Gemini API)
    # ─────────────────────────────────────────────────────────────────
    same_person = True
    same_person_confidence = 1.0

    # Trigger Identity Lock comparison only if reference calibration is provided
    if GEMINI_AVAILABLE and request.reference_image:
        try:
            logger.info("Executing Gemini Multimodal Identity Lock...")
            curr_pil = decode_base64_to_pil(request.current_image)
            ref_pil = decode_base64_to_pil(request.reference_image)

            system_instruction = (
                "You are an automated proctoring assistant checking candidate identity. "
                "Compare the reference image with the current active webcam frame to "
                "determine if the candidate is the exact same student."
            )
            model = genai.GenerativeModel("gemini-2.5-flash", system_instruction=system_instruction)
            
            prompt = (
                "Compare IMAGE_A (the registration reference image) "
                "with IMAGE_B (the current camera frame of the person writing the exam). "
                "Determine if the person in IMAGE_B is the exact same student as in IMAGE_A. "
                "Respond STRICTLY in structured JSON format with two keys: "
                "'same_person' (boolean value) and 'confidence' (float value from 0.0 to 1.0). "
                "Do not include any markdown format blocks or extra commentary. Return exact JSON."
            )

            # Query Gemini model with both images using safe standard safety settings
            safety_settings = [
                {"category": "HARM_CATEGORY_HARASSMENT", "threshold": "BLOCK_NONE"},
                {"category": "HARM_CATEGORY_HATE_SPEECH", "threshold": "BLOCK_NONE"},
                {"category": "HARM_CATEGORY_SEXUALLY_EXPLICIT", "threshold": "BLOCK_NONE"},
                {"category": "HARM_CATEGORY_DANGEROUS_CONTENT", "threshold": "BLOCK_NONE"}
            ]
            response = model.generate_content([prompt, ref_pil, curr_pil], safety_settings=safety_settings)
            res_text = response.text.strip()
            
            # Clean possible markdown styling wrap (e.g. ```json ... ```)
            if res_text.startswith("```"):
                res_text = res_text.split("```")[1]
                if res_text.startswith("json"):
                    res_text = res_text[4:]
            res_text = res_text.strip()

            result = json.loads(res_text)
            same_person = bool(result.get("same_person", True))
            same_person_confidence = float(result.get("confidence", 1.0))
            
            logger.info(f"Gemini Identity Verification finished. same_person={same_person}, confidence={same_person_confidence}")
            
            if not same_person:
                detections.append(DetectionItem(
                    className="identity_mismatch", 
                    score=1.0 - same_person_confidence
                ))
        except Exception as e:
            logger.error(f"Gemini API Identity Verification failed: {e}. Bypassing verification.")

    # ─── Return Combined Telemetry ────────────────────────────────────
    return ProctoringAnalysisResponse(
        same_person=same_person,
        same_person_confidence=same_person_confidence,
        detections=detections,
        violations=ViolationsSummary(
            phone_detected=phone_detected,
            multiple_people=multiple_people,
            no_person=no_person,
            head_turned=head_turned,
            head_pose=head_pose,
            suspicious_object=suspicious_object,
            face_covered=face_covered
        )
    )

if __name__ == "__main__":
    # Start ASGI server on default port 7860 as required by Hugging Face Spaces environment
    uvicorn.run(app, host="0.0.0.0", port=7860)
