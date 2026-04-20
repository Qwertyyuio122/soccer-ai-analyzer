// This version avoids using 'tasksVision' directly to bypass the error you saw
let detector;
let FilesetResolver;
let ObjectDetector;

const status = document.getElementById('status');
const video = document.getElementById('soccerVideo');
const canvas = document.getElementById('overlay');
const ctx = canvas.getContext('2d');

async function initAI() {
    status.innerText = "Status: Loading AI Engine...";
    try {
        // Import the library directly inside the function
        const vision = await import("https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/vision_bundle.mjs");
        FilesetResolver = vision.FilesetResolver;
        ObjectDetector = vision.ObjectDetector;

        const visionFiles = await FilesetResolver.forVisionTasks(
            "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/wasm"
        );
        
        detector = await ObjectDetector.createFromOptions(visionFiles, {
            baseOptions: {
                modelAssetPath: `https://storage.googleapis.com/mediapipe-models/object_detector/efficientdet_lite0/float16/1/efficientdet_lite0.tflite`,
                delegate: "GPU"
            },
            scoreThreshold: 0.3,
            runningMode: "VIDEO"
        });
        
        status.innerText = "Status: AI Ready!";
        status.style.color = "#00ff88";
    } catch (e) {
        console.error("AI Error:", e);
        status.innerText = "Status: AI Error - Try Chrome Browser";
    }
}

initAI();

// --- Video handling remains the same ---
document.getElementById('videoUpload').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) { video.src = URL.createObjectURL(file); }
});

let lastVideoTime = -1;
async function renderLoop() {
    if (video.currentTime !== lastVideoTime && detector) {
        lastVideoTime = video.currentTime;
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const result = detector.detectForVideo(video, performance.now());
        drawBoxes(result);
    }
    if (!video.paused) { requestAnimationFrame(renderLoop); }
}

function drawBoxes(result) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    result.detections.forEach(det => {
        if (det.categories[0].categoryName === 'person') {
            const { originX, originY, width, height } = det.boundingBox;
            ctx.strokeStyle = "#00ff88";
            ctx.lineWidth = 4;
            ctx.strokeRect(originX, originY, width, height);
        }
    });
}
video.addEventListener('play', renderLoop);