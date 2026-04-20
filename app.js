const video = document.getElementById('soccerVideo');
const canvas = document.getElementById('overlay');
const ctx = canvas.getContext('2d');
const statsDisplay = document.getElementById('stats');

let detector;

// 1. Initialize the AI Model
async function loadModel() {
    const vision = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
    );
    detector = await ObjectDetector.createFromOptions(vision, {
        baseOptions: {
            modelAssetPath: `https://storage.googleapis.com/mediapipe-models/object_detector/efficientdet_lite0/float16/1/efficientdet_lite0.tflite`,
            delegate: "GPU"
        },
        scoreThreshold: 0.5,
        runningMode: "VIDEO"
    });
    console.log("AI Model Loaded!");
}

// 2. Process Video Frames
video.addEventListener('play', () => {
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    renderFrame();
});

async function renderFrame() {
    if (video.paused || video.ended) return;

    const detections = await detector.detectForVideo(video, performance.now());
    displayResults(detections);
    
    requestAnimationFrame(renderFrame);
}

// 3. Analyze and Provide Feedback
function displayResults(results) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    results.detections.forEach((detection, index) => {
        const { originX, originY, width, height } = detection.boundingBox;
        const category = detection.categories[0].categoryName;

        if (category === "person") {
            // Draw tracking box
            ctx.strokeStyle = "#00FF00";
            ctx.lineWidth = 4;
            ctx.strokeRect(originX, originY, width, height);

            // Simple Logic-Based Feedback
            // In a real app, we track 'originX/Y' over time to calculate speed
            let feedback = "Analyzing movement...";
            if (width > canvas.width * 0.2) {
                feedback = "Player is in close-up. Checking ball control...";
            } else {
                feedback = "High-intensity positioning detected.";
            }

            statsDisplay.innerText = `Subject ${index}: ${feedback}`;
        }
    });
}

loadModel();