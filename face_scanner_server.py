import os
import sys
import json
import asyncio
import base64
import time
import numpy as np
import concurrent.futures

# Print startup information
print("Initializing Grow More OpenCV Native Face Scanner Server...")

try:
    import cv2
except ImportError:
    print("ERROR: OpenCV ('opencv-python') is not installed.")
    sys.exit(1)

try:
    import websockets
    import logging
    # Suppress noisy handshake warning stack traces from port scans
    logging.getLogger('websockets').setLevel(logging.ERROR)
except ImportError:
    print("ERROR: 'websockets' library is not installed.")
    sys.exit(1)

# Model paths
YUNET_MODEL = "face_detection_yunet_2023mar.onnx"
SFACE_MODEL = "face_recognition_sface_2021dec.onnx"

if not os.path.exists(YUNET_MODEL) or not os.path.exists(SFACE_MODEL):
    print("ERROR: One or more OpenCV ONNX model files are missing.")
    print(f"Please ensure {YUNET_MODEL} and {SFACE_MODEL} are present in the directory.")
    sys.exit(1)

# Initialize OpenCV DNN models
try:
    # Initialize YuNet Face Detector (default input size 320x240, set dynamically later)
    detector = cv2.FaceDetectorYN.create(
        model=YUNET_MODEL,
        config="",
        input_size=(320, 240),
        score_threshold=0.8,
        nms_threshold=0.3,
        top_k=5000
    )
    
    # Initialize SFace Face Recognizer
    recognizer = cv2.FaceRecognizerSF.create(
        model=SFACE_MODEL,
        config=""
    )
    print("OpenCV YuNet and SFace models loaded successfully!")
except Exception as e:
    print(f"ERROR: Failed to initialize OpenCV DNN models: {e}")
    sys.exit(1)

# Global configuration
HOST = "localhost"
PORT = 8000

# Thread Pool for background execution of face detection & matching
executor = concurrent.futures.ThreadPoolExecutor(max_workers=1)

# State variables
known_encodings = []
known_metadata = []  # List of dicts matching known_encodings index: {"person_id": id, "name": name, "type": type}
is_camera_running = False
camera_task = None
connected_clients = set()
camera_index = 0  # Default camera device index

# Dynamic similarity threshold (default to 0.50, lower is stricter)
face_match_threshold = 0.50

# Active face annotations to render on the live stream
current_annotations = []
last_detection_time = 0

# Cooldown to prevent duplicate matches in short succession (5 seconds per person)
match_cooldowns = {}

# Mutex/flag to ensure only one face recognition task runs at a time
is_processing_face = False

def detect_and_match_face(frame_copy, local_known_encodings, local_known_metadata, threshold):
    """
    Executes face detection (YuNet) and embedding extraction (SFace) on the background thread.
    Runs at 640x480 or native resolution in under 12ms!
    """
    h, w, _ = frame_copy.shape
    
    # 1. Update detector input size dynamically to match the captured frame
    detector.setInputSize((w, h))
    
    # 2. Detect faces
    retval, faces = detector.detect(frame_copy)
    if faces is None or retval == 0:
        return []
        
    results = []
    for face in faces:
        # Bounding box coordinates: [x, y, width, height]
        x, y, width, height = map(int, face[0:4])
        
        # Map to React format box: (top, right, bottom, left)
        box = (y, x + width, y + height, x)
        
        # 3. Align face crop
        aligned_face = recognizer.alignCrop(frame_copy, face)
        
        # 4. Extract 128D feature embedding using SFace
        feature = recognizer.feature(aligned_face)
        face_encoding = feature[0].tolist()
        
        matched_name = None
        matched_meta = None
        min_distance = 999.0
        
        if len(local_known_encodings) > 0:
            # SFace L2 distance comparison (lower is closer)
            for known_enc, meta in zip(local_known_encodings, local_known_metadata):
                dist = np.linalg.norm(np.array(known_enc) - np.array(face_encoding))
                if dist < min_distance:
                    min_distance = dist
                    matched_meta = meta
            
            # Map React threshold (0.30 - 0.70) to SFace L2 distance threshold (default is ~1.12)
            sface_threshold = threshold * 2.3
            if min_distance < sface_threshold:
                matched_name = matched_meta["name"]
            else:
                matched_meta = None
                
        results.append({
            "box": box,
            "name": matched_name,
            "meta": matched_meta,
            "distance": min_distance,
            "encoding": face_encoding
        })
        
    return results

async def handle_face_processing(frame_copy):
    """
    Schedules the detection task on the background thread executor and handles results.
    """
    global is_processing_face, current_annotations, last_detection_time, face_match_threshold
    
    loop = asyncio.get_running_loop()
    try:
        # Capture current mappings in thread-safe copies
        local_encodings = list(known_encodings)
        local_metadata = list(known_metadata)
        local_threshold = face_match_threshold
        
        # Run OpenCV matching in background thread
        results = await loop.run_in_executor(
            executor, 
            detect_and_match_face, 
            frame_copy, 
            local_encodings, 
            local_metadata,
            local_threshold
        )
        
        new_annotations = []
        detected_faces = []
        now = time.time()
        
        for res in results:
            box = res["box"]
            name = res["name"]
            meta = res["meta"]
            dist = res["distance"]
            encoding = res["encoding"]
            status = "unknown"
            
            top, right, bottom, left = box
            
            # Record detected face descriptor for enrollment
            detected_faces.append({
                "box": {"x": left, "y": top, "width": right - left, "height": bottom - top},
                "descriptor": list(encoding)
            })
            
            if meta:
                person_id = meta["person_id"]
                person_name = meta["name"]
                person_type = meta["type"]
                
                # Check match cooldown
                last_seen = match_cooldowns.get(person_id, 0)
                if now - last_seen > 5.0:
                    # New match event to register
                    match_cooldowns[person_id] = now
                    status = "new"
                    
                    # Notify React app immediately
                    match_event = json.dumps({
                        "event": "face_matched",
                        "person_id": person_id,
                        "name": person_name,
                        "type": person_type
                    })
                    print(f"MATCH: Found {person_name} (ID: {person_id}) with L2 distance {dist:.3f} (threshold: {local_threshold * 2.3:.3f})")
                    for ws in list(connected_clients):
                        try:
                            await ws.send(match_event)
                        except:
                            pass
                else:
                    status = "already"
            
            new_annotations.append({
                "box": box,
                "name": name,
                "status": status
            })
            
        # Broadcast detected faces with their descriptors
        if detected_faces:
            det_event = json.dumps({
                "event": "faces_detected",
                "faces": detected_faces
            })
            for ws in list(connected_clients):
                try:
                    await ws.send(det_event)
                except:
                    pass

        current_annotations = new_annotations
        last_detection_time = now
        
    except Exception as e:
        print(f"Error in background face processing: {e}")
    finally:
        is_processing_face = False

async def camera_loop():
    global is_camera_running, camera_index, is_processing_face, current_annotations, last_detection_time
    print(f"Opening camera index {camera_index}...")
    video_capture = cv2.VideoCapture(camera_index)
    
    if not video_capture.isOpened():
        print(f"ERROR: Could not open camera {camera_index}")
        error_msg = json.dumps({"event": "camera_error", "message": f"Could not open camera {camera_index}"})
        for ws in list(connected_clients):
            try:
                await ws.send(error_msg)
            except:
                pass
        is_camera_running = False
        return

    print("Camera opened successfully. Running native streaming loop...")
    is_processing_face = False
    current_annotations = []
    
    # Locked frame rate target: ~30 FPS (33ms per frame)
    frame_delay = 0.033 
    
    try:
        while is_camera_running:
            loop_start = time.time()
            ret, frame = video_capture.read()
            if not ret:
                await asyncio.sleep(0.01)
                continue
            
            # Flip horizontally for mirrored webcam kiosk view
            frame = cv2.flip(frame, 1)
            
            # 1. Trigger background face recognition if not currently busy
            if not is_processing_face:
                is_processing_face = True
                frame_copy = frame.copy()
                asyncio.create_task(handle_face_processing(frame_copy))
                
            # 2. Fade out annotations if no face was detected in the last 1.2 seconds
            if time.time() - last_detection_time > 1.2:
                current_annotations = []
                
            # 3. Draw current active bounding boxes and labels onto the live frame
            for ann in current_annotations:
                top, right, bottom, left = ann["box"]
                name = ann["name"]
                status = ann["status"]
                
                # Green for new checkout/in, Orange for already marked, Grey for unknown
                color = (34, 197, 94) if status == "new" else (245, 158, 11) if status == "already" else (140, 140, 140)
                bgr_color = (color[2], color[1], color[0])
                
                # Draw thick bounding box
                cv2.rectangle(frame, (left, top), (right, bottom), bgr_color, 3)
                
                # Draw name label
                if name:
                    label = f"{name} - Already Marked" if status == "already" else name
                    cv2.putText(frame, label, (left, top - 12), cv2.FONT_HERSHEY_SIMPLEX, 0.65, bgr_color, 2)
            
            # 4. Compress to JPEG (moderate compression for fast local transmission)
            ret, buffer = cv2.imencode('.jpg', frame, [int(cv2.IMWRITE_JPEG_QUALITY), 75])
            if ret:
                jpg_as_text = base64.b64encode(buffer).decode('utf-8')
                frame_data = json.dumps({
                    "event": "frame",
                    "image": f"data:image/jpeg;base64,{jpg_as_text}"
                })
                
                # Broadcast the live frame to all websocket clients
                for ws in list(connected_clients):
                    try:
                        await ws.send(frame_data)
                    except:
                        pass
                        
            # Keep locked to 30 FPS to ensure smooth streaming
            elapsed = time.time() - loop_start
            sleep_time = max(0.001, frame_delay - elapsed)
            await asyncio.sleep(sleep_time)
            
    except asyncio.CancelledError:
        print("Camera loop task cancelled.")
    finally:
        print("Releasing camera device...")
        video_capture.release()
        is_camera_running = False
        current_annotations = []

async def handler(websocket):
    global known_encodings, known_metadata, is_camera_running, camera_task, camera_index, face_match_threshold
    print(f"Client connected: {websocket.remote_address}")
    connected_clients.add(websocket)
    
    try:
        async for message in websocket:
            data = json.loads(message)
            action = data.get("action")
            
            if action == "update_mappings":
                mappings = data.get("mappings", [])
                
                # Dynamic threshold support
                face_match_threshold = float(data.get("threshold", 0.50))
                
                new_encodings = []
                new_metadata = []
                
                for m in mappings:
                    emb = m.get("face_embedding")
                    if emb and isinstance(emb, list) and len(emb) == 128:
                        new_encodings.append(np.array(emb))
                        new_metadata.append({
                            "person_id": m.get("person_id"),
                            "name": m.get("name"),
                            "type": m.get("type")
                        })
                
                known_encodings = new_encodings
                known_metadata = new_metadata
                print(f"Synced mappings: loaded {len(known_encodings)} face embeddings. Strictness Threshold: {face_match_threshold}")
                
            elif action == "start_camera":
                target_idx = data.get("camera_index", 0)
                try:
                    camera_index = int(target_idx)
                except:
                    camera_index = 0
                    
                if not is_camera_running:
                    is_camera_running = True
                    camera_task = asyncio.create_task(camera_loop())
                    print("Camera started.")
                else:
                    print("Camera already running.")
                    
            elif action == "stop_camera":
                if is_camera_running:
                    is_camera_running = False
                    if camera_task:
                        camera_task.cancel()
                    print("Camera stopped.")
                    
    except websockets.exceptions.ConnectionClosed as e:
        print(f"Client disconnected: {websocket.remote_address} ({e.code})")
    finally:
        connected_clients.remove(websocket)
        if len(connected_clients) == 0 and is_camera_running:
            is_camera_running = False
            if camera_task:
                camera_task.cancel()
            print("No clients connected. Stopped camera.")

async def main():
    async with websockets.serve(handler, HOST, PORT):
        print(f"Grow More Native Face Scanner running on ws://{HOST}:{PORT}")
        await asyncio.Future()  # run forever

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\nGrow More Face Scanner Server stopped.")
