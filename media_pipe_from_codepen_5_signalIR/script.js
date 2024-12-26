// example game with mouse
// https://play.arkanoid.online/?lang=en

import {
  GestureRecognizer,
  FilesetResolver,
  DrawingUtils
} from "./node_modules/@mediapipe/tasks-vision/vision_bundle.mjs";

const demosSection = document.getElementById("demos");
let gestureRecognizer;
const videoHeight = "360px";
const videoWidth = "480px";

const recognitionCheckBox = document.getElementById("recognitionCheckBox");
recognitionCheckBox.checked = true;
recognitionCheckBox.addEventListener("change", enableCam);

const inputControlCheckBox = document.getElementById("inputControlCheckBox");
inputControlCheckBox.checked = true;

const updateRecognizerOptions = async () => {
  console.log("updateRecognizerOptions");
  const newOptions = {
    runningMode: "VIDEO",
    numHands: Math.round(numHandsSlider.value),
    minHandDetectionConfidence: minHandDetectionConfidenceSlider.value / 100,
    minHandPresenceConfidence: minHandPresenceConfidenceSlider.value / 100,
    minTrackingConfidence: minTrackingConfidenceSlider.value / 100
  };
  console.log(newOptions);
  await gestureRecognizer.setOptions(newOptions);
}

const numHandsSlider = document.getElementById("numHands");
numHandsSlider.value = 2;
numHandsSlider.addEventListener("change", updateRecognizerOptions);

const minHandDetectionConfidenceSlider = document.getElementById("minHandDetectionConfidence");
minHandDetectionConfidenceSlider.value = 50;
minHandDetectionConfidenceSlider.addEventListener("change", updateRecognizerOptions);

const minHandPresenceConfidenceSlider = document.getElementById("minHandPresenceConfidence");
minHandPresenceConfidenceSlider.value = 50;
minHandPresenceConfidenceSlider.addEventListener("change", updateRecognizerOptions);

const minTrackingConfidenceSlider = document.getElementById("minTrackingConfidence");
minTrackingConfidenceSlider.value = 50;
minTrackingConfidenceSlider.addEventListener("change", updateRecognizerOptions);

// Before we can use HandLandmarker class we must wait for it to finish
// loading. Machine Learning models can be large and take a moment to
// get everything needed to run.
const createGestureRecognizer = async () => {
  const vision = await FilesetResolver.forVisionTasks(
    "node_modules/@mediapipe/tasks-vision/wasm"
  );
  gestureRecognizer = await GestureRecognizer.createFromOptions(vision, {
    baseOptions: {
      modelAssetPath:
        "gesture_recognizer.task",
      delegate: "GPU"
    },
    runningMode: "VIDEO",
    numHands: 3,
    minHandDetectionConfidence: 0.1,
    minHandPresenceConfidence: 0.1,
    minTrackingConfidence: 0.1
  });
  await updateRecognizerOptions();
  demosSection.classList.remove("invisible1");
};
await createGestureRecognizer();

let signalIRInitialized = false;
let hubConnection;
let setCursor = async function (x, y) {
  try {
    await hubConnection.invoke("SetCursor", x.toString(), y.toString());
  } catch (err) {
    console.error(err.toString());
  }
};;

const initSignalIR = async () => {
  try {
    console.log('initSignalIR 1');
    hubConnection = new signalR.HubConnectionBuilder()
      .withUrl("http://localhost:5000/setCursor",
        {
          accessTokenFactory: () => {
            if (typeof bearerToken !== 'undefined') {
              return bearerToken.getToken;
            }
          },
          skipNegotiation: true,
          transport: signalR.HttpTransportType.WebSockets,
        })
      .build();

    console.log('initSignalIR 2');
    // await hubConnection.start({ withCredentials: false });
    await hubConnection.start();
    console.log('initSignalIR 3');
    demosSection.classList.remove("invisible2");
    signalIRInitialized = true;
  } catch (err) {
    console.log('initSignalIR catch');
    console.error(err.toString());
    throw err;
  }
}
await initSignalIR();

/********************************************************************
// Demo 2: Continuously grab image from webcam stream and detect it.
********************************************************************/

const video = document.getElementById("webcam");
const canvasElement = document.getElementById("output_canvas");
const canvasCtx = canvasElement.getContext("2d");

const gestureOutput = document.getElementById("gesture_output");
gestureOutput.style.width = videoWidth;
gestureOutput.innerText = "#\n#\n#";

const gestureOutputCustom = document.getElementById("gesture_output_custom");
gestureOutputCustom.style.width = videoWidth;
gestureOutputCustom.innerText = "#\n#\n#";

// Check if webcam access is supported.
function hasGetUserMedia() {
  return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
}

// If webcam supported, add event listener to button for when user
// wants to activate it.
if (hasGetUserMedia()) {
  await enableCam();
} else {
  console.warn("getUserMedia() is not supported by your browser");
}

// Enable the live webcam view and start detection.
async function enableCam() {
  if (!gestureRecognizer) {
    alert("gestureRecognizer not loaded");
    return;
  }

  if (!signalIRInitialized) {
    alert("SignalIR not loaded");
    return;
  }

  // getUsermedia parameters.
  const constraints = {
    video: true
  };

  // Activate the webcam stream.
  const stream = await navigator.mediaDevices.getUserMedia(constraints);
  video.srcObject = stream;
    video.addEventListener("loadeddata", () => {console.log('loadeddata event'); predictWebcam();} );
}

let lastVideoTime = -1;
let results = undefined;
async function predictWebcam() {
  const webcamElement = document.getElementById("webcam");
  let nowInMs = Date.now();
  if (video.currentTime !== lastVideoTime) {
    lastVideoTime = video.currentTime;
    results = gestureRecognizer.recognizeForVideo(video, nowInMs);
  }

  canvasCtx.save();
  canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
  const drawingUtils = new DrawingUtils(canvasCtx);

  canvasElement.style.height = videoHeight;
  webcamElement.style.height = videoHeight;
  canvasElement.style.width = videoWidth;
  webcamElement.style.width = videoWidth;

  if (results.landmarks) {
    for (const landmarks of results.landmarks) {
      drawingUtils.drawConnectors(
        landmarks,
        GestureRecognizer.HAND_CONNECTIONS,
        {
          color: "#00FF00",
          lineWidth: 5
        }
      );
      drawingUtils.drawLandmarks(landmarks, {
        color: "#FF0000",
        lineWidth: 2
      });
    }
  }
  canvasCtx.restore();
  if (results.gestures.length > 0) {
    gestureOutput.style.display = "block";
    gestureOutput.style.width = videoWidth;
    const categoryName = results.gestures[0][0].categoryName;
    const categoryScore = parseFloat(
      results.gestures[0][0].score * 100
    ).toFixed(2);
    const handedness = results.handednesses[0][0].displayName;
    gestureOutput.innerText = `GestureRecognizer: ${categoryName}\n Confidence: ${categoryScore} %\n Handedness: ${handedness}`;
  } else {
    // gestureOutput.style.display = "none";
  }

  await setInput(results);

  // Call this function again to keep predicting when the browser is ready.
  if (recognitionCheckBox.checked === true) {
    window.requestAnimationFrame(predictWebcam);
  }
}

const xCursorMax = 1920 * 0.8;
const yCursorMax = 1080 * 0.8;
const cursorBorder = 0.2;

async function setInput(results) {
  const isInputEnabledByCheckBox = inputControlCheckBox.checked;

  const leftHandIndex = results.handednesses.findIndex(x => x[0].categoryName === "Left");
  const rightHandIndex = results.handednesses.findIndex(x => x[0].categoryName === "Right");
  const isRecognized = (rightHandIndex > -1);
  const isInputEnabledByGesture = (leftHandIndex > -1) ? (results.gestures[leftHandIndex][0].categoryName === "Open_Palm") : false;

  if (isRecognized) {
    const indexF = results.landmarks[rightHandIndex][8];
    const xCursor = mapNumber(indexF.x, 0 + cursorBorder, 1 - cursorBorder, xCursorMax, 0);
    const yCursor = mapNumber(indexF.y, 0 + cursorBorder, 1 - cursorBorder, 0, yCursorMax);
    gestureOutputCustom.innerText = `X: ${indexF.x.toFixed(3)} Y: ${indexF.y.toFixed(3)} Z: ${indexF.z.toFixed(3)}\n` +
      `Cursor X: ${xCursor.toFixed(0)} Y: ${yCursor.toFixed(0)}\n`;

    if (isInputEnabledByCheckBox && isInputEnabledByGesture) {
      await setCursor(xCursor, yCursor);
    }
  }

  if (isInputEnabledByCheckBox) {
    //console.log(results);
    //inputControlCheckBox.checked = false;
  }
}

function mapNumber(x, in_min, in_max, out_min, out_max) {
  return (x - in_min) * (out_max - out_min) / (in_max - in_min) + out_min;
}

