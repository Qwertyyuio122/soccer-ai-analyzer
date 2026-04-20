// Access the tools from the bundle we loaded in HTML
const { ObjectDetector, FilesetResolver } = tasksVision;

let detector;
const status = document.getElementById('status');
const video = document.getElementById('soccerVideo');
const canvas = document.getElementById('overlay');
const ctx = canvas.getContext('2d');

async function initAI() {
    status.innerText = "Status: Downloading AI Models...";
    try {
        const vision = await FilesetResolver.forVisionTasks(
            "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/wasm"
        );
        
        detector = await ObjectDetector.createFromOptions(vision, {
            baseOptions: {
                modelAssetPath: `https://storage.googleapis.com/mediapipe-models/object_detector/efficientdet_lite0/float16/1/efficientdet_lite0.tflite`,
                delegate: "GPU"
            },
            scoreThreshold: 0.3,
            runningMode: "VIDEO"
        });
        
        status.innerText = "Status: AI Ready!";
        status.style.color = "#00ff88";
        console.log("Success: AI Detector is online.");
    } catch (e) {
        console.error("AI Error:", e);
        status.innerText = "Status: Error. Check Console.";
    }
}

// Start the loading process
initAI();

// --- Logic for Video and Drawing ---

document.getElementById('videoUpload').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
        video.src = URL.createObjectURL(file);
    }
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
    if (!video.paused) {
        requestAnimationFrame(renderLoop);
    }
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