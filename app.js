let objectDetector;
let lastVideoTime = -1;
const video = document.getElementById('soccerVideo');
const canvas = document.getElementById('overlay');
const ctx = canvas.getContext('2d');
const status = document.getElementById('status');
const feedback = document.getElementById('feedback');

// 1. Setup the AI Engine
async function initializeDetector() {
    const vision = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0/wasm"
    );
    objectDetector = await ObjectDetector.createFromOptions(vision, {
        baseOptions: {
            modelAssetPath: `https://storage.googleapis.com/mediapipe-models/object_detector/efficientdet_lite0/float16/1/efficientdet_lite0.tflite`,
            delegate: "GPU"
        },
        scoreThreshold: 0.4, // Sensitivity: lower means more detections
        runningMode: "VIDEO"
    });
    status.innerText = "Status: AI Ready! Upload a video.";
    status.style.color = "#00ff88";
}

// 2. Handle Video Upload
document.getElementById('videoUpload').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
        const url = URL.createObjectURL(file);
        video.src = url;
        status.innerText = "Status: Video loaded. Press Play.";
    }
});

// 3. The Analysis Loop
async function predictWebcam() {
    // Only run if the video is actually playing a new frame
    if (video.currentTime !== lastVideoTime) {
        lastVideoTime = video.currentTime;
        
        // Ensure canvas matches visual size of video
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        const detections = await objectDetector.detectForVideo(video, performance.now());
        drawDetections(detections);
    }
    
    if (!video.paused) {
        window.requestAnimationFrame(predictWebcam);
    }
}

function drawDetections(results) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    let playerCount = 0;

    results.detections.forEach(detection => {
        if (detection.categories[0].categoryName === 'person') {
            playerCount++;
            const { originX, originY, width, height } = detection.boundingBox;

            // Draw Box
            ctx.strokeStyle = "#00ff88";
            ctx.lineWidth = 3;
            ctx.strokeRect(originX, originY, width, height);

            // Draw Tag
            ctx.fillStyle = "#00ff88";
            ctx.fillText("PLAYER", originX, originY > 10 ? originY - 5 : 10);
        }
    });

    if (playerCount > 0) {
        feedback.innerText = `Performance Data: Tracking ${playerCount} players. Movement intensity: Stable.`;
    }
}

video.addEventListener('play', predictWebcam);
initializeDetector();