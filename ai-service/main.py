import json
from typing import List, Optional

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


def load_image(file_bytes: bytes) -> np.ndarray:
    image = face_recognition.load_image_file(file_bytes)
    return image


def get_face_embedding(image: np.ndarray) -> Optional[List[float]]:
    encodings = face_recognition.face_encodings(image)
    if not encodings:
        return None
    return encodings[0].tolist()


@app.get("/health")
def health():
    return {"status": "ok", "service": "ai-service"}


@app.post("/register")
async def register_face(image: UploadFile = File(...)):
    contents = await image.read()
    import io

    image_array = face_recognition.load_image_file(io.BytesIO(contents))
    embedding = get_face_embedding(image_array)

    if embedding is None:
        return {"success": False, "message": "No face detected in image", "embedding": []}

    return {"success": True, "message": "Face detected", "embedding": embedding}


@app.post("/recognize")
async def recognize_face(
    image: UploadFile = File(...),
    employees: str = Form(...),
    threshold: float = Form(0.6),
):
    contents = await image.read()
    import io

    image_array = face_recognition.load_image_file(io.BytesIO(contents))
    unknown_encoding = get_face_embedding(image_array)

    if unknown_encoding is None:
        return {"matched": False, "message": "No face detected in image"}

    employee_list = json.loads(employees)
    if not employee_list:
        return {"matched": False, "message": "No registered employees to compare"}

    unknown_np = np.array(unknown_encoding)
    best_match = None
    best_distance = float("inf")

    for employee in employee_list:
        stored = np.array(employee["embedding"])
        distance = face_recognition.face_distance([stored], unknown_np)[0]
        if distance < best_distance:
            best_distance = distance
            best_match = employee

    if best_match is None or best_distance > threshold:
        return {
            "matched": False,
            "message": "Unknown person",
            "distance": best_distance if best_distance != float("inf") else None,
        }

    confidence = round(max(0, 1 - best_distance) * 100, 1)

    return {
        "matched": True,
        "employeeId": best_match["id"],
        "employeeName": best_match["name"],
        "employeeCode": best_match["employeeId"],
        "confidence": confidence,
        "distance": float(best_distance),
    }
