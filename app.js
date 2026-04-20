let detector;
const status = document.getElementById('status');
const video = document.getElementById('soccerVideo');
const analyticsPanel = document.getElementById('analytics');

// Canvas Setup
const canvas = document.getElementById('overlay');
const ctx = canvas.getContext('2d');
const heatCanvas = document.getElementById('heatmapLayer');
const heatCtx = heatCanvas.getContext('2d');

let showHeatmap = false;

async function initAI() {
    status.innerText = "Status: Loading AI Core...";
    try {
        const vision = await import("https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/vision_bundle.mjs");
        const { FilesetResolver, ObjectDetector } = vision;

        const visionFiles = await FilesetResolver.forVisionTasks(
            "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/wasm"
        );
        
        detector = await ObjectDetector.createFromOptions(visionFiles, {
            baseOptions: {
                modelAssetPath: `https://storage.googleapis.com/mediapipe-models/object_detector/efficientdet_lite0/float16/1/efficientdet_lite0.tflite`,
                delegate: "GPU"
            },
            scoreThreshold: 0.25, // Lowered slightly to catch the ball
            runningMode: "VIDEO"
        });
        
        status.innerText = "Status: AI Active & Ready";
        status.style.color = "#00ff88";
    } catch (e) {
        console.error("Critical Error:", e);
        status.innerText = "Status: System Failure";
        status.style.color = "red";
    }
}

initAI();

// --- UI Controls ---
document.getElementById('videoUpload').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) { video.src = URL.createObjectURL(file); }
});

document.getElementById('toggleHeatmap').addEventListener('click', () => {
    showHeatmap = !showHeatmap;
    heatCanvas.style.display = showHeatmap ? 'block' : 'none';
    canvas.style.display = showHeatmap ? 'none' : 'block'; // Hide boxes when viewing heatmap
});

document.getElementById('clearData').addEventListener('click', () => {
    heatCtx.clearRect(0, 0, heatCanvas.width, heatCanvas.height);
});

// --- Core Analysis Loop ---
let lastVideoTime = -1;
async function renderLoop() {
    if (video.currentTime !== lastVideoTime && detector && !video.paused) {
        lastVideoTime = video.currentTime;
        
        // Sync Canvas sizes
        if (canvas.width !== video.videoWidth) {
            canvas.width = video.videoWidth; canvas.height = video.videoHeight;
            heatCanvas.width = video.videoWidth; heatCanvas.height = video.videoHeight;
        }

        const result = detector.detectForVideo(video, performance.now());
        processData(result);
    }
    requestAnimationFrame(renderLoop);
}

function processData(result) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    let playerCount = 0;
    let ballFound = false;

    result.detections.forEach(det => {
        const type = det.categories[0].categoryName;
        const { originX, originY, width, height } = det.boundingBox;
        const centerX = originX + (width / 2);
        const centerY = originY + (height / 2);

        if (type === 'person') {
            playerCount++;
            
            // 1. Draw Live Tracking Box
            ctx.strokeStyle = "#00ff88";
            ctx.lineWidth = 2;
            ctx.strokeRect(originX, originY, width, height);
            
            // 2. Add to Heat Map (Builds up over time)
            heatCtx.fillStyle = "rgba(255, 50, 50, 0.02)"; // Very faint red
            heatCtx.beginPath();
            heatCtx.arc(centerX, centerY + (height/4), 20, 0, 2 * Math.PI); // Plot near their feet
            heatCtx.fill();
        } 
        else if (type === 'sports ball') {
            ballFound = true;
            // Draw Ball Tracker
            ctx.strokeStyle = "#ffcc00";
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(centerX, centerY, width/2 + 5, 0, 2 * Math.PI);
            ctx.stroke();
        }
    });

    // Update Dashboard
    analyticsPanel.innerText = `Players Tracked: ${playerCount} | Ball Detected: ${ballFound ? "YES ⚽" : "No"}`;
}

video.addEventListener('play', renderLoop);