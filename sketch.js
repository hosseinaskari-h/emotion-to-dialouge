/*
Workshops in Creative coding 1 final Assignment.
Interactive Art Installation: "Traces of Digital Memory"
By MohammadHossein AskariHezaveh

Instructions: run the code, Press "S" for Showcase mode, "D" for Debug mode.
there will be lags and frame loss in the first 30-60 seconds due to preprocessing dataset.

Link to simplified mobile version : https://editor.p5js.org/hosseinaskari.h/sketches/HYx1CLMx4

Dataset used for the project is: DailyDialog: A Manually Labelled Multi-turn Dialogue Dataset
https://huggingface.co/datasets/daily_dialog

This project uses Face API, which is a part of ml5js library:
https://learn.ml5js.org/#/reference/face-api

this code and its associated youtube video was a great help in setting up FaceAPI
https://editor.p5js.org/erikabulger/sketches/B84vtqBl3

This Project is highly optimzed for lower framerates and will not get affected by that due to how the display mechanics work

*/

// Global variables
let dataset;
let dialoguesToDisplay = [];
let video;
let changeInterval = 1000;
let lastChangeTime = 0;
let numberOfLines = 125;
let pg;
let faceapi;
let detections = [];
let debugingMode = false;
let showcaseMode = false;

p5.disableFriendlyErrors = true;

function preload() {
  loadJSON("dataset.json", (rawData) => {
    dataset = preprocessDataset(rawData.rows);
    selectRandomDialogues();
  });
}

// Function to preprocess the dataset and group dialogues by emotion
function preprocessDataset(rawData) {
  let groupedByEmotion = {};

  rawData.forEach((entry) => {
    entry.row.dialog.forEach((dialog, index) => {
      let emotion = entry.row.emotion[index];
      if (!groupedByEmotion[emotion]) {
        groupedByEmotion[emotion] = [];
      }
      groupedByEmotion[emotion].push(dialog);
    });
  });

  return groupedByEmotion;
}

function setup() {
  createCanvas(displayWidth, displayHeight);
  let ctx = canvas.getContext("2d", { willReadFrequently: true });
  pg = createGraphics(displayWidth, displayHeight);
  textSize(24);
  textAlign(CENTER, CENTER);
  video = createCapture(VIDEO);
  video.size(displayWidth, displayHeight);
  video.hide();
  video.style("transform", "scale(-1, 1)");

  const faceOptions = {
    withLandmarks: true,
    withExpressions: true,
    withDescriptors: true,
    minConfidence: 0.5,
  };

  faceapi = ml5.faceApi(video, faceOptions, faceReady);
}

// Function called when the faceApi model is ready
function faceReady() {
  faceapi.detect(gotFaces); // Start detecting faces
}

// Callback function for face detection
function gotFaces(error, result) {
  if (error) {
    console.log(error);
    return;
  }
  detections = result;
  faceapi.detect(gotFaces); // Continue detecting faces
}

// Function to map API emotions to dataset emotion classes
function mapApiEmotionToDataset(apiEmotion) {
  const emotionMap = {
    neutral: "0",
    happy: "4",
    angry: "1",
    sad: "5",
    disgusted: "2",
    surprised: "6",
    fear: "3",
  };
  return emotionMap[apiEmotion] || "0";
}

// Utility function to get the most prominent emotion from the detections
function getMostProminentEmotion() {
  if (detections.length > 0) {
    let emotions = detections[0].expressions;
    let maxEmotion = Object.keys(emotions).reduce((a, b) =>
      emotions[a] > emotions[b] ? a : b
    );
    return mapApiEmotionToDataset(maxEmotion);
  }
  return "0"; // Default to 'no emotion' if no emotion detected
}

function adjustChangeInterval() {
  const baseInterval = 1000;
  const increment = 200;
  const minInterval = 100;

  // Define numFaces within the function scope and change the speed based on that

  let numFaces = detections.length;
  changeInterval = Math.max(baseInterval - numFaces * increment, minInterval);
}


function draw() {
  background(0);
  if (debugingMode) {
    renderCanvas();
    renderDebugInfo();
  }

  renderCanvas();
}

// Main draw loop
function renderCanvas() {
  // Scale and draw the video to cover the entire canvas
  push();
  imageMode(CENTER);
  translate(width / 2, height / 2);
  let scale = max(width / video.width, height / video.height);
  image(video, 0, 0, video.width * scale, video.height * scale);
  pop();

  // Apply the text mask
  displayVideoText();

  if (detections.length > 0) {
    if (millis() - lastChangeTime > changeInterval) {
      let mostProminentEmotion = getMostProminentEmotion();
      selectRandomDialogues(mostProminentEmotion);
      lastChangeTime = millis();
    }

    adjustChangeInterval();
  }
}

function renderDebugInfo() {
  let fps = frameRate();
  console.log(fps);

  if (detections.length > 0) {
    let mostProminentEmotion = getMostProminentEmotion();
    console.log("Most prominent emotion: " + mostProminentEmotion);
    console.log("Number of faces detected: " + detections.length);
  }
}

function keyPressed() {
  if (key === "D" || key === "d") {
    debugingMode = !debugingMode;
    showcaseMode = false;
    if (debugingMode && fullscreen()) {
      fullscreen(false);
    }
  } else if (key === "S" || key === "s") {
    showcaseMode = !showcaseMode;
    debugingMode = false;
    fullscreen(showcaseMode);
  }
}

function selectRandomDialogues(emotionClass) {
  dialoguesToDisplay = [];
  let dialogues = dataset[emotionClass];
  for (let i = 0; i < numberOfLines; i++) {
    if (dialogues && dialogues.length > 0) {
      let randomIndex = Math.floor(Math.random() * dialogues.length);
      dialoguesToDisplay.push(dialogues[randomIndex]);
    } else {
      dialoguesToDisplay.push(
        "Your memory will be preserved in jpegs and archived chat messages"
      );
    }
  }
}

// Function to display video with text as texture
function displayVideoText() {
  pg.clear();
  pg.fill(255); // White text for masking

  let y = 20; // Starting y position for text
  dialoguesToDisplay.forEach((dialogue) => {
    pg.text(dialogue, 0, y);
    y += 15; // Updating y position for next line of text
  });

  pg.loadPixels();
  loadPixels();

  // Apply the text mask to the video
  for (let i = 0; i < pixels.length; i += 4) {
    if (pg.pixels[i + 3] !== 0) {
      // Keep the pixel from the video
      // Since we already drawed the scaled video, we don't need to adjust these pixels
    } else {
      // Make the pixel transparent if it's not part of the text
      pixels[i + 3] = 0;
    }
  }

  updatePixels();
}

// Function to get a random dialogue based on user's emotion
function getRandomDialogue(emotion) {
  let dialogues = dataset[emotion];
  if (dialogues && dialogues.length > 0) {
    let randomIndex = Math.floor(Math.random() * dialogues.length);
    return dialogues[randomIndex];
  }
  return "Your memory will be preserved in jpegs and archived chat messages";
}

// utiliy for debug mode
function logMostProminentEmotion() {
  if (detections.length > 0) {
    let emotions = detections[0].expressions;
    let maxEmotion = Object.keys(emotions).reduce((a, b) =>
      emotions[a] > emotions[b] ? a : b
    );
  }
}
