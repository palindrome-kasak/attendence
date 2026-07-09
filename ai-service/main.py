import asyncio
import json
import os
from contextlib import asynccontextmanager
from typing import List, Optional, Tuple

import numpy as np
from fastapi import FastAPI, File, Form, UploadFile
from fastapi.middleware.cors import CORSMiddleware

_face_recognition = None
_models_ready = False

REGISTER_JITTERS = int(os.environ.get("FACE_REGISTER_JITTERS", "5"))
MULTI_REGISTER_JITTERS = int(os.environ.get("FACE_MULTI_REGISTER_JITTERS", "3"))
RECOGNIZE_JITTERS = int(os.environ.get("FACE_RECOGNIZE_JITTERS", "3"))
MAX_IMAGE_DIMENSION = int(os.environ.get("FACE_MAX_IMAGE_DIMENSION", "640"))


class ImageLoadError(ValueError):
    pass


def get_face_recognition():
    global _face_recognition
    if _face_recognition is None:
        import face_recognition

        _face_recognition = face_recognition
    return _face_recognition


def preload_face_models() -> None:
    global _models_ready
    get_face_recognition()
    _models_ready = True


@asynccontextmanager
async def lifespan(_app: FastAPI):
    asyncio.create_task(asyncio.to_thread(preload_face_models))
    yield


app = FastAPI(
    title="FaceAttend AI Service",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

DEFAULT_THRESHOLD = 0.5
DEFAULT_AMBIGUITY_GAP = 0.08
MIN_LIVENESS_FACE_SHIFT = 2
MAX_STATIC_FACE_DISTANCE = 0.045


def max_pairwise_box_shift(boxes: List[tuple]) -> float:
    max_shift = 0.0
    for index in range(len(boxes)):
        for other in range(index + 1, len(boxes)):
            max_shift = max(max_shift, box_shift(boxes[index], boxes[other]))
    return max_shift


def max_pairwise_encoding_distance(encodings: List[np.ndarray]) -> float:
    max_distance = 0.0
    for index in range(len(encodings)):
        for other in range(index + 1, len(encodings)):
            distance = float(
                get_face_recognition().face_distance(
                    [encodings[index]], encodings[other]
                )[0]
            )
            max_distance = max(max_distance, distance)
    return max_distance


def verify_liveness(images: List[np.ndarray]) -> Tuple[bool, str]:
    if len(images) < 2:
        return False, "Live verification requires multiple camera frames."

    boxes = []
    encodings = []

    for image in images:
        embedding, error, box = get_single_face_embedding(image, num_jitters=1)
        if embedding is None or box is None:
            return False, error or "No face detected during live verification."
        boxes.append(box)
        encodings.append(np.array(embedding))

    max_shift = max_pairwise_box_shift(boxes)
    max_encoding_distance = max_pairwise_encoding_distance(encodings)

    if max_shift < MIN_LIVENESS_FACE_SHIFT and max_encoding_distance < MAX_STATIC_FACE_DISTANCE:
        return (
            False,
            "Static image detected. Do not use a photo or phone screen — use your live face.",
        )

    if max_encoding_distance > 0.4:
        return False, "Face changed too much between frames. Hold still and try again."

    return True, "Live face verified"


def detect_face_locations(image: np.ndarray) -> List[tuple]:
    fr = get_face_recognition()
    locations = fr.face_locations(image, number_of_times_to_upsample=1)
    if locations:
        return locations

    return fr.face_locations(image, number_of_times_to_upsample=2)


def get_single_face_embedding(
    image: np.ndarray, num_jitters: int = 1
) -> Tuple[Optional[List[float]], Optional[str], Optional[tuple]]:
    locations = detect_face_locations(image)

    if len(locations) == 0:
        return None, "No face detected. Face the camera with good lighting.", None

    if len(locations) > 1:
        return None, "Multiple faces detected. Only one person should be in frame.", None

    encodings = get_face_recognition().face_encodings(
        image, locations, num_jitters=num_jitters
    )
    if not encodings:
        return None, "Could not generate face encoding. Try a clearer photo.", None

    return encodings[0].tolist(), None, locations[0]


def load_image_bytes(contents: bytes) -> np.ndarray:
    import io

    from PIL import Image

    if not contents:
        raise ImageLoadError("Image file is empty.")

    try:
        image = Image.open(io.BytesIO(contents))
        image = image.convert("RGB")
        if max(image.size) > MAX_IMAGE_DIMENSION:
            image.thumbnail(
                (MAX_IMAGE_DIMENSION, MAX_IMAGE_DIMENSION),
                Image.Resampling.LANCZOS,
            )
        return np.array(image)
    except ImageLoadError:
        raise
    except Exception as exc:
        raise ImageLoadError("Invalid or unreadable image file.") from exc


def face_failure(message: str) -> dict:
    return {
        "success": False,
        "message": message,
        "embedding": [],
        "embeddings": [],
    }


def match_failure(message: str, live: Optional[bool] = None) -> dict:
    payload = {"matched": False, "message": message}
    if live is not None:
        payload["live"] = live
    return payload


def box_center(box: tuple) -> Tuple[float, float]:
    top, right, bottom, left = box
    return ((top + bottom) / 2, (left + right) / 2)


def box_shift(box_a: tuple, box_b: tuple) -> float:
    center_a = box_center(box_a)
    center_b = box_center(box_b)
    return abs(center_a[0] - center_b[0]) + abs(center_a[1] - center_b[1])


def employee_embeddings(employee: dict) -> List[np.ndarray]:
    if employee.get("embeddings"):
        return [np.array(item) for item in employee["embeddings"]]
    return [np.array(employee["embedding"])]


def best_employee_match(
    unknown_np: np.ndarray, employee_list: List[dict]
) -> Tuple[Optional[dict], float]:
    best_match = None
    best_distance = float("inf")

    for employee in employee_list:
        for stored in employee_embeddings(employee):
            distance = float(
                get_face_recognition().face_distance([stored], unknown_np)[0]
            )
            if distance < best_distance:
                best_distance = distance
                best_match = employee

    return best_match, best_distance


@app.get("/health")
def health():
    return {
        "status": "ok",
        "service": "ai-service",
        "modelsReady": _models_ready,
    }


@app.post("/register")
async def register_face(image: UploadFile = File(...)):
    try:
        contents = await image.read()
        image_array = load_image_bytes(contents)
        embedding, error, _box = get_single_face_embedding(
            image_array, num_jitters=REGISTER_JITTERS
        )
    except ImageLoadError as exc:
        return face_failure(str(exc))

    if embedding is None:
        return face_failure(error or "No face detected in image")

    return {
        "success": True,
        "message": "Face detected",
        "embedding": embedding,
        "embeddings": [embedding],
    }


@app.post("/register-multi")
async def register_multi_faces(images: List[UploadFile] = File(...)):
    if len(images) < 2:
        return {
            "success": False,
            "message": "Capture at least 2 frames for reliable face registration.",
            "embedding": [],
            "embeddings": [],
        }

    collected = []
    for image in images[:3]:
        try:
            contents = await image.read()
            image_array = load_image_bytes(contents)
            embedding, error, _box = get_single_face_embedding(
                image_array, num_jitters=MULTI_REGISTER_JITTERS
            )
        except ImageLoadError as exc:
            return face_failure(str(exc))

        if embedding is None:
            return face_failure(error or "No face detected in image")
        collected.append(embedding)

    averaged = np.mean(np.array(collected), axis=0).tolist()

    return {
        "success": True,
        "message": "Face registered from live captures",
        "embedding": averaged,
        "embeddings": collected,
    }


@app.post("/recognize")
async def recognize_face(
    image: UploadFile = File(...),
    employees: str = Form(...),
    threshold: float = Form(DEFAULT_THRESHOLD),
    ambiguity_gap: float = Form(DEFAULT_AMBIGUITY_GAP),
):
    try:
        contents = await image.read()
        image_array = load_image_bytes(contents)
        unknown_encoding, error, _box = get_single_face_embedding(
            image_array, num_jitters=RECOGNIZE_JITTERS
        )
    except ImageLoadError as exc:
        return match_failure(str(exc))

    if unknown_encoding is None:
        return match_failure(error or "No face detected in image")

    employee_list = json.loads(employees)
    if not employee_list:
        return {"matched": False, "message": "No registered employees to compare"}

    unknown_np = np.array(unknown_encoding)
    matches = []

    for employee in employee_list:
        for stored in employee_embeddings(employee):
            distance = float(
                get_face_recognition().face_distance([stored], unknown_np)[0]
            )
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


@app.post("/recognize-live")
async def recognize_live(
    images: List[UploadFile] = File(...),
    employees: str = Form(...),
    threshold: float = Form(DEFAULT_THRESHOLD),
    ambiguity_gap: float = Form(DEFAULT_AMBIGUITY_GAP),
):
    if len(images) < 2:
        return {
            "matched": False,
            "message": "Live scan requires multiple camera frames.",
        }

    image_arrays = []
    for image in images[:3]:
        try:
            image_arrays.append(load_image_bytes(await image.read()))
        except ImageLoadError as exc:
            return match_failure(str(exc), live=False)

    is_live, liveness_message = verify_liveness(image_arrays)
    if not is_live:
        return {"matched": False, "message": liveness_message, "live": False}

    employee_list = json.loads(employees)
    if not employee_list:
        return {"matched": False, "message": "No registered employees to compare", "live": True}

    best_result = None

    for image_array in image_arrays:
        unknown_encoding, error, _box = get_single_face_embedding(
            image_array, num_jitters=RECOGNIZE_JITTERS
        )
        if unknown_encoding is None:
            continue

        unknown_np = np.array(unknown_encoding)
        matches = []

        for employee in employee_list:
            for stored in employee_embeddings(employee):
                distance = float(
                get_face_recognition().face_distance([stored], unknown_np)[0]
            )
                matches.append((distance, employee))

        if not matches:
            continue

        matches.sort(key=lambda item: item[0])
        best_distance, best_match = matches[0]
        confidence = round(max(0, 1 - best_distance) * 100, 1)

        candidate = {
            "matched": best_distance <= threshold,
            "employeeId": best_match["id"],
            "employeeName": best_match["name"],
            "employeeCode": best_match["employeeId"],
            "confidence": confidence,
            "distance": best_distance,
            "best_match": best_match,
            "matches": matches,
        }

        if best_result is None or candidate["confidence"] > best_result["confidence"]:
            best_result = candidate

    if best_result is None:
        return {
            "matched": False,
            "message": "No face detected. Face the camera with good lighting.",
            "live": True,
        }

    if not best_result["matched"]:
        return {
            "matched": False,
            "message": "Unknown person — face does not match any registered employee",
            "confidence": best_result["confidence"],
            "distance": best_result["distance"],
            "live": True,
        }

    if len(best_result["matches"]) > 1:
        second_distance = best_result["matches"][1][0]
        if second_distance - best_result["distance"] < ambiguity_gap:
            return {
                "matched": False,
                "message": "Face match is ambiguous. Please register clearer photos or try again.",
                "distance": best_result["distance"],
                "live": True,
            }

    return {
        "matched": True,
        "employeeId": best_result["employeeId"],
        "employeeName": best_result["employeeName"],
        "employeeCode": best_result["employeeCode"],
        "confidence": best_result["confidence"],
        "distance": best_result["distance"],
        "live": True,
    }
