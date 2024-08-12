/*
To do:
Add video option for "Default Video" that plays on start (my own video)
Add max video size (resize or just scale it down in browser?)
Add video export functionality
Add GUI for pixelSize, background color, text color, etc...
Make the userVideo play forever on loop
Allow toggle for different monospace fonts (Japanese, etc.)
Mode where the font size can be dynamic depending on the photo color
Allow user to set their own character map choice
Feature for the photo to spell words (don't map char to color, just write chars in order)
Allow gradient background
can both the original/new video be recorded at the same time? OBS studio otherwise
*/

var webcamVideo = document.getElementById('webcamVideo');
var userVideo = document.getElementById('userVideo');

var canvas = document.getElementById("canvas");
var ctx = canvas.getContext("2d");

const canvasRaw = document.getElementById('canvas-video')
const ctx2 = canvasRaw.getContext('2d');

const canvasPixel = document.getElementById('canvas-video-pixel')
const ctx3 = canvasPixel.getContext('2d');

var webcamVideoWidth = 640;
var webcamVideoHeight = 480;
var canvasWidth = webcamVideoWidth;
var canvasHeight = webcamVideoHeight;
var pixelSize;
var numCols;
var numRows;
var alpha=1;

canvas.width = canvasWidth;
canvas.height = canvasHeight;

var videoPixels = [];
var grayscaleDataArray = [];

var fontSize;
ctx.font = fontSize+"px Courier New serif";

var fontColor = "white";
var backgroundColor = "navy";

var videoTypeInput = document.getElementById("videoTypeInput");
var videoType = String(videoTypeInput.value);
videoTypeInput.addEventListener("change",changeVideoType);

//const gradient = "_______.:!/r(l1Z4H9W8$@";
const gradient = "---...|||~~~123456789@@@"; //this defines the character set. ordered by darker to lighter colour. Add more blanks to create more darkness
const preparedGradient = gradient.replaceAll('_', '\u00A0')

var animationRequest;
var playAnimationToggle = false;
var webcamStream;


var pausePlayButton = document.getElementById('pausePlayButton');
pausePlayButton.addEventListener("click",togglePausePlay);

/*
var captureVideoButton = document.getElementById('captureButton');
var stopVideoButton = document.getElementById('stopButton');
captureVideoButton.addEventListener("click",startWebcam);
stopVideoButton.addEventListener("click",stopVideo);
*/

function togglePausePlay(){
    
    if(playAnimationToggle == false){
        if(videoType == "webcam"){
            startWebcam();
        } else {
            refresh();
            userVideo.play();
            playAnimationToggle = true;
            animationRequest = requestAnimationFrame(loop);
        }
    } else {
        stopVideo();
    }
    
}

function startWebcam() {

    if(playAnimationToggle==true){
        playAnimationToggle = false;
        cancelAnimationFrame(animationRequest);
        console.log("cancel animation");
    }

    userVideo.classList.add("hidden");
    webcamVideo.classList.remove("hidden");
    document.getElementById("fileInputLabel").classList.add("hidden");

    navigator.mediaDevices.getUserMedia({
        audio: false,
        video: true
    })
    .then(stream => {
        window.localStream = stream;
        webcamVideo.srcObject = stream;
        webcamVideo.play();
    })
    .catch((err) => {
        console.log(err);
    });

    playAnimationToggle = true;
    animationRequest = requestAnimationFrame(loop);

}

var localStream;
function stopVideo(){

    if(playAnimationToggle==true){
        playAnimationToggle = false;
        cancelAnimationFrame(animationRequest);
        console.log("cancel animation");
    }

    webcamVideo.pause();
    userVideo.pause();

    if(localStream == null){
    } else {
        localStream.getVideoTracks()[0].stop();
    }
    //webcamVideo.src = '';
}


/*
const init = () => {
    webcamStream = navigator.mediaDevices.getUserMedia({ video: true, audio: false })
        .then(function (stream) {
            video.srcObject = stream;
            video.play();
        })
        .catch(function (err) {
            console.log("An error occurred: " + err);
        });
}
*/

var fileInput = document.getElementById("fileInput");
fileInput.addEventListener('change', (e) => {

    if(playAnimationToggle==true){
        playAnimationToggle = false;
        cancelAnimationFrame(animationRequest);
        console.log("cancel animation");
    }

    userVideo.classList.remove("hidden");
    webcamVideo.classList.add("hidden");
    document.getElementById("fileInputLabel").classList.remove("hidden");

    const file = e.target.files[0];
    const url = URL.createObjectURL(file);
    userVideo.src = url;
    userVideo.addEventListener('loadedmetadata', () => {
        
        userVideo.width = userVideo.videoWidth;
        userVideo.height = userVideo.videoHeight;

        canvasWidth = userVideo.videoWidth;
        canvasHeight = userVideo.videoHeight; 

        canvas.width = canvasWidth;
        canvas.height = canvasHeight;

    });
    
    setTimeout(function(){
        userVideo.play();
        refresh();
        playAnimationToggle = true;
        animationRequest = requestAnimationFrame(loop);
    },2000);

});

function changeVideoType(){
    stopVideo();
    videoType = String(videoTypeInput.value);

    if(videoType == "webcam"){
        canvasWidth = webcamVideoWidth;
        canvasHeight = webcamVideoHeight;
        canvas.width = canvasWidth;
        canvas.height = canvasHeight;
        startWebcam();
    } else {
        fileInput.click();
    }

    refresh();

}

function refresh(){
    console.log("refresh");
    console.log("canvas width/height: "+canvasWidth+", "+canvasHeight);
    pixelSize = Math.ceil(Math.min(canvasWidth,canvasHeight)/50);
    numCols = Math.ceil(canvasWidth/pixelSize);
    numRows = Math.ceil(canvasHeight/pixelSize);
    fontSize = pixelSize/0.4;
    ctx.font = fontSize+"px Courier New serif";
}

const rainbowColors = [
    '#9400D3',
    '#4B0082',
    '#0000FF',
    '#00FF00',
    '#FFFF00',
    '#FF7F00',
    '#FF0000'
]


const clearphoto = () => {
    ctx2.fillStyle = "#fff";
    ctx2.fillRect(0, 0, canvasWidth, canvasHeight);
}

const render = (ctx) => {
    if (canvasWidth && canvasHeight) {
        canvasRaw.width = canvasWidth;
        canvasRaw.height = canvasHeight;

        if(videoType == "webcam"){
            ctx2.drawImage(webcamVideo, 0, 0, canvasWidth, canvasHeight);
        } else {
            ctx2.drawImage(userVideo, 0, 0, canvasWidth, canvasHeight);
        }

        var pixelData = ctx2.getImageData(0, 0, canvasWidth, canvasHeight);
        var pixels = pixelData.data;

        //new canvas with a pixelated image
        canvasPixel.width = canvasWidth;
        canvasPixel.height = canvasHeight;
        videoPixels = [];
        grayscaleDataArray = [];

        for(var cellY=0; cellY<numRows; cellY++){
            grayscaleDataArray[cellY] = [];

            for(var cellX=0; cellX<numCols; cellX++){

                var cellPixels = [];

                for(var pixelY=0; pixelY<pixelSize; pixelY++){
                    
                    for(var pixelX=0; pixelX<pixelSize; pixelX++){

                        var currentXPosition = cellX*pixelSize + pixelX;
                        var currentYPosition = cellY*pixelSize + pixelY;

                        var currentPixelDataValue = (currentYPosition * canvasWidth + currentXPosition) * 4;

                        if(currentXPosition < canvasWidth && currentYPosition < canvasHeight){
                            cellPixels.push(pixels[currentPixelDataValue]);
                            cellPixels.push(pixels[currentPixelDataValue + 1]);
                            cellPixels.push(pixels[currentPixelDataValue + 2]);
                            cellPixels.push(pixels[currentPixelDataValue + 3]);
                        }

                    }
                }

                var avgColor = getAverageColor(cellPixels);
                ctx3.fillStyle = `rgba(${avgColor[0]}, ${avgColor[1]}, ${avgColor[2]}, ${alpha})`;
                ctx3.fillRect(cellX*pixelSize, cellY*pixelSize, pixelSize, pixelSize);
                
                videoPixels.push(avgColor[0]);
                videoPixels.push(avgColor[1]);
                videoPixels.push(avgColor[2]);
                videoPixels.push(alpha);

                var grayScaleValue = (avgColor[0]+avgColor[1]+avgColor[2])/3;
                grayscaleDataArray[cellY][cellX] = grayScaleValue;

            }
        }

    } else {
        clearphoto();
    }
}

const getCharByScale = (scale) => {
    const val = Math.floor(scale / 255 * (gradient.length - 1));
    return preparedGradient[val];
}

function renderText(){
    
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0,0,canvasWidth,canvasHeight);
    ctx.fillStyle = fontColor;

    for(var row=0; row<numRows; row++){
        for(var col=0; col<numCols; col++){
            var char = getCharByScale(grayscaleDataArray[row][col]);

            var r = videoPixels[(row*numCols+col)*4];
            var g = videoPixels[(row*numCols+col)*4 + 1];
            var b = videoPixels[(row*numCols+col)*4 + 2];
            var a = 1;

            ctx.fillStyle = "rgb("+r+","+g+","+b+","+a+")";
            ctx.fillText(char, col*pixelSize, row*pixelSize + pixelSize/2);

        }
    }

}

function loop(){
    render(ctx)
    //const chars = getPixelsGreyScale(ctx)
    //renderText(textVideo, grayscaleDataArray)
    renderText();

    if (playAnimationToggle){
        animationRequest = requestAnimationFrame(loop);
    }
}

function getAverageColor(chosenPixels) {
    var r = 0;
    var g = 0;
    var b = 0;
    var count = chosenPixels.length / 4;
    for (let i = 0; i < count; i++) {
        r += chosenPixels[i * 4];
        g += chosenPixels[i * 4 + 1];
        b += chosenPixels[i * 4 + 2];
    }
    return [r / count, g / count, b / count];
}


//shortcut hotkey presses
document.addEventListener('keydown', function(event) {
  
    if(event.key === 'p'){
        togglePausePlay();
    }
   
});
  

//MAIN METHOD
refresh();
startWebcam();
