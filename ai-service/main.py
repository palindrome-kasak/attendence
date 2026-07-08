import json
from typing import List, Optional, Tuple

import face_recognition
import numpy as np
from fastapi import FastAPI, File, Form, UploadFile
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="FaceAttend AI Service", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

DEFAULT_THRESHOLD = 0.45
DEFAULT_AMBIGUITY_GAP = 0.08


def get_single_face_embedding(
    image: np.ndarray, num_jitters: int = 1
) -> Tuple[Optional[List[float]], Optional[str]]:
    locations = face_recognition.face_locations(image)

    if len(locations) == 0:
        return None, "No face detected. Use a clear front-facing photo."

    if len(locations) > 1:
        return None, "Multiple faces detected. Use a photo with only one person."

    encodings = face_recognition.face_encodings(image, locations, num_jitters=num_jitters)
    if not encodings:
        return None, "Could not generate face encoding. Try a clearer photo."

    return encodings[0].tolist(), None


@app.get("/health")
def health():
    return {"status": "ok", "service": "ai-service"}


@app.post("/register")
async def register_face(image: UploadFile = File(...)):
    contents = await image.read()
    import io

    image_array = face_recognition.load_image_file(io.BytesIO(contents))
    embedding, error = get_single_face_embedding(image_array, num_jitters=5)

    if embedding is None:
        return {"success": False, "message": error, "embedding": []}

    return {"success": True, "message": "Face detected", "embedding": embedding}


@app.post("/recognize")
async def recognize_face(
    image: UploadFile = File(...),
    employees: str = Form(...),
    threshold: float = Form(DEFAULT_THRESHOLD),
    ambiguity_gap: float = Form(DEFAULT_AMBIGUITY_GAP),
):
    contents = await image.read()
    import io

    image_array = face_recognition.load_image_file(io.BytesIO(contents))
    unknown_encoding, error = get_single_face_embedding(image_array, num_jitters=2)

    if unknown_encoding is None:
        return {"matched": False, "message": error or "No face detected in image"}

    employee_list = json.loads(employees)
    if not employee_list:
        return {"matched": False, "message": "No registered employees to compare"}

    unknown_np = np.array(unknown_encoding)
    matches = []

    for employee in employee_list:
        stored = np.array(employee["embedding"])
        distance = float(face_recognition.face_distance([stored], unknown_np)[0])
        matches.append((distance, employee))

    matches.sort(key=lambda item: item[0])
    best_distance, best_match = matches[0]

    if best_distance > threshold:
        confidence = round(max(0, 1 - best_distance) * 100, 1)
        return {
            "matched": False,
            "message": "Unknown person — face does not match any registered employee",
            "confidence": confidence,
            "distance": best_distance,
        }

    if len(matches) > 1:
        second_distance = matches[1][0]
        if second_distance - best_distance < ambiguity_gap:
            return {
                "matched": False,
                "message": "Face match is ambiguous. Please register clearer photos or try again.",
                "distance": best_distance,
            }

    confidence = round(max(0, 1 - best_distance) * 100, 1)

    return {
        "matched": True,
        "employeeId": best_match["id"],
        "employeeName": best_match["name"],
        "employeeCode": best_match["employeeId"],
        "confidence": confidence,
        "distance": best_distance,
    }
