/*
To do:
Add video option for "Default Video" that plays on start (my own video)
Add max video size (resize or just scale it down in browser?)
Add video export functionality
Add GUI for pixelSize, background color, text color, etc...
Allow toggle for different monospace fonts (Japanese, etc.)
Mode where the font size can be dynamic depending on the photo color
Allow user to set their own character map choice
Feature for the photo to spell words (don't map char to color, just write chars in order)
- For the above, can also play with font colour / opacity (darker colors fade into bg)
Allow gradient background
can both the original/new video be recorded at the same time? OBS studio otherwise
Allow image upload, with function to determine based on the file extension and handle accordingly
Modularize threshold for fixedText style
Investigate frame rate unsynced issue when video recording
Create option to invert the threshold (show black or show white toggle)

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

var fontFamily = "Courier New";
var fontSize;
ctx.font;



//var videoTypeInput = document.getElementById("videoTypeInput");
//var videoType = String(videoTypeInput.value);
//videoTypeInput.addEventListener("change",changeVideoType);

//const gradient = "_______.:!/r(l1Z4H9W8$@";
const gradient = "..--<>~~??123456789@@@"; //this defines the character set. ordered by darker to lighter colour. Add more blanks to create more darkness
const preparedGradient = gradient.replaceAll('_', '\u00A0')

var animationType = "fixedText";
//var textInput = "wavesand";
var textInput = "♫♪iPod"
var animationRequest;
var playAnimationToggle = false;
var webcamStream;

//detect user browser
var ua = navigator.userAgent;
var isSafari = false;
var isFirefox = false;
var isIOS = false;
var isAndroid = false;
if(ua.includes("Safari")){
    isSafari = true;
}
if(ua.includes("Firefox")){
    isFirefox = true;
}
if(ua.includes("iPhone") || ua.includes("iPad") || ua.includes("iPod")){
    isIOS = true;
}
if(ua.includes("Android")){
    isAndroid = true;
}
console.log("isSafari: "+isSafari+", isFirefox: "+isFirefox+", isIOS: "+isIOS+", isAndroid: "+isAndroid);

var mediaRecorder;
var recordedChunks;
var finishedBlob;
var recordingMessageDiv = document.getElementById("videoRecordingMessageDiv");
var recordVideoState = false;
var videoRecordInterval;
var videoEncoder;
var muxer;
var mobileRecorder;
var videofps = 10;


//add gui
var obj = {
videoType: 'Webcam',
backgroundColor: "#0b1563",
pixelSizeFactor: 50,
};
var videoType = obj.videoType;
var backgroundColor = obj.backgroundColor;
var backgroundHue = getHueFromHex(backgroundColor);
var pixelSizeFactor = obj.pixelSizeFactor;
var fontColor = "white";

var gui = new dat.gui.GUI({ autoPlace: false });
gui.close();
var guiOpenToggle = false;

// Choose from accepted values
gui.add(obj, 'videoType', [ 'Default', 'Select Video', 'Webcam'] ).name('Video Type').listen().onChange(changeVideoType);
gui.addColor(obj, "backgroundColor").name("Background Color").onFinishChange(refresh);
gui.add(obj, "pixelSizeFactor").min(10).max(100).step(1).name('Pixel Size').listen().onChange(refresh);

obj['selectVideo'] = function () {
imageInput.click();
};
gui.add(obj, 'selectVideo').name('Select Video');

/*
gui.add(obj, "brushDensity").min(1).max(100).step(1).name('Brush Density').listen().onChange(getUserInputs);
gui.add(obj, "opacity").min(5).max(100).step(1).name('Brush Opacity').listen().onChange(getUserInputs);
gui.add(obj, "animationSpeed").min(1).max(50).step(1).name('Animation Speed').onChange(getUserInputs);
gui.add(obj, "marker").name("Marker Dot (m)").listen().onChange(toggleMarkerDraw);
gui.addColor(obj, "markerColor").name("Marker Color").onFinishChange(getUserInputs);
*/

obj['pausePlay'] = function () {
togglePausePlay();
};
gui.add(obj, 'pausePlay').name("Pause Play (r)");

obj['saveImage'] = function () {
saveImage();
};
gui.add(obj, 'saveImage').name("Image Export (i)");

obj['saveVideo'] = function () {
toggleVideoRecord();
};
gui.add(obj, 'saveVideo').name("Start/Stop Video Export (v)");

customContainer = document.getElementById( 'gui' );
customContainer.appendChild(gui.domElement);


function togglePausePlay(){
    
    if(playAnimationToggle == false){
        if(videoType == "Webcam"){
            startWebcam();
        } else if(videoType == "Select Video"){
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
    videoType = obj.videoType;

    if(videoType == "Webcam"){
        canvasWidth = webcamVideoWidth;
        canvasHeight = webcamVideoHeight;
        canvas.width = canvasWidth;
        canvas.height = canvasHeight;
        startWebcam();
    } else if(videoType == "Select Video"){
        fileInput.click();
    }

    refresh();

}

function refresh(){
    console.log("refresh");
    console.log("canvas width/height: "+canvasWidth+", "+canvasHeight);
    pixelSizeFactor = obj.pixelSizeFactor;
    pixelSize = Math.ceil(Math.min(canvasWidth,canvasHeight)/pixelSizeFactor);
    numCols = Math.ceil(canvasWidth/pixelSize);
    numRows = Math.ceil(canvasHeight/pixelSize);
    fontSize = pixelSize/0.6;
    ctx.font = fontSize+"px "+fontFamily;
    backgroundColor = obj.backgroundColor;
    backgroundHue = getHueFromHex(backgroundColor);
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

        if(videoType == "Webcam"){
            ctx2.drawImage(webcamVideo, 0, 0, canvasWidth, canvasHeight);
        } else if(videoType == "Select Video"){
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
            
            var currentGrayValue = grayscaleDataArray[row][col];

            if(animationType == "dynamic"){
                var char = getCharByScale(currentGrayValue);

                var r = videoPixels[(row*numCols+col)*4];
                var g = videoPixels[(row*numCols+col)*4 + 1];
                var b = videoPixels[(row*numCols+col)*4 + 2];
                var a = 1;
                ctx.fillStyle = "hsl("+backgroundHue+",80%,"+currentGrayValue/255*100+"%)";
                //ctx.fillStyle = "rgb("+currentGrayValue+","+currentGrayValue+","+currentGrayValue+","+a+")";
                ctx.fillRect(col*pixelSize,row*pixelSize,pixelSize,pixelSize);
                
                ctx.fillStyle = fontColor;
                //ctx.fillStyle = "rgb("+r+","+g+","+b+")";
                ctx.fillText(char, col*pixelSize, row*(pixelSize) + pixelSize);

            } else if(animationType == "fixedText"){
            
                var char = textInput[(row*numCols+col)%textInput.length];
                if(currentGrayValue/255 > 0.4){
                    //var currentFontSize = Math.floor( (1-Math.pow(grayscaleDataArray[row][col]/255,2)) * fontSize );
                    //ctx.fillStyle = fontColor;
                    //ctx.font = currentFontSize+"px "+fontFamily;
                    ctx.fillStyle = "hsl("+backgroundHue+",80%,"+currentGrayValue/255*100+"%)";
                    ctx.fillRect(col*pixelSize,row*pixelSize,pixelSize,pixelSize);
                    ctx.fillStyle = fontColor;
                    ctx.fillText(char, col*pixelSize, row*(pixelSize) + pixelSize);
                } else {
                    /*
                    //Fill cells which don't pass threshold with actual colour
                    var r = videoPixels[(row*numCols+col)*4];
                    var g = videoPixels[(row*numCols+col)*4 + 1];
                    var b = videoPixels[(row*numCols+col)*4 + 2];
                    var a = 1;
                    //ctx.fillStyle = "hsl("+backgroundHue+",80%,"+currentGrayValue/255*100+"%)";
                    ctx.fillStyle = "rgb("+r+","+g+","+b+","+a+")";
                    ctx.fillRect(col*pixelSize,row*pixelSize,pixelSize,pixelSize);
                    */
                }
            
            }
            

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

function getHueFromHex(hex) {
    const rgb = hexToRgb(hex);
    const r = rgb.r / 255;
    const g = rgb.g / 255;
    const b = rgb.b / 255;
  
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const delta = max - min;
  
    let hue = 0;
  
    if (delta === 0) {
      hue = 0;
    } else if (max === r) {
      hue = (g - b) / delta;
    } else if (max === g) {
      hue = 2 + (b - r) / delta;
    } else {
      hue = 4 + (r - g) / delta;
    }
  
    hue *= 60;
    if (hue < 0) {
      hue += 360;
    }
  
    return hue;
}

function hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
    } : null;
}


//shortcut hotkey presses
document.addEventListener('keydown', function(event) {
  
    if(event.key === 'p'){
        togglePausePlay();
    } else if (event.key === 'i') {
        saveImage();
    } else if (event.key === 'v') {
        toggleVideoRecord();
    } else if (event.key === 'o') {
        toggleGUI();
    } 
   
});

function saveImage(){
    const link = document.createElement('a');
    link.href = canvas.toDataURL();

    const date = new Date();
    const filename = `ASCII_${date.toLocaleDateString()}_${date.toLocaleTimeString()}.png`;
    link.download = filename;
    link.click();
}

function toggleGUI(){
    if(guiOpenToggle == false){
        gui.open();
        guiOpenToggle = true;
    } else {
        gui.close();
        guiOpenToggle = false;
    }
}

function toggleVideoRecord(){
    if(recordVideoState == false){
      recordVideoState = true;
      chooseRecordingFunction();
    } else {
      recordVideoState = false;
      chooseEndRecordingFunction();
    }
}

function chooseRecordingFunction(){
    if(isIOS || isAndroid || isFirefox){
        startMobileRecording();
    }else {
        recordVideoMuxer();
    }
}

function chooseEndRecordingFunction(){
    if(isIOS || isAndroid || isFirefox){
        mobileRecorder.stop();
    }else {
        finalizeVideo();
    }
}

//record html canvas element and export as mp4 video
//source: https://devtails.xyz/adam/how-to-save-html-canvas-to-mp4-using-web-codecs-api
async function recordVideoMuxer() {
    console.log("start muxer video recording");
    var videoWidth = Math.floor(canvas.width/2)*2;
    var videoHeight = Math.floor(canvas.height/8)*8; //force a number which is divisible by 8
    console.log("Video dimensions: "+videoWidth+", "+videoHeight);

    //display user message
    //recordingMessageCountdown(videoDuration);
    recordingMessageDiv.classList.remove("hidden");

    recordVideoState = true;
    const ctx = canvas.getContext("2d", {
        // This forces the use of a software (instead of hardware accelerated) 2D canvas
        // This isn't necessary, but produces quicker results
        willReadFrequently: true,
        // Desynchronizes the canvas paint cycle from the event loop
        // Should be less necessary with OffscreenCanvas, but with a real canvas you will want this
        desynchronized: true,
    });

    muxer = new Mp4Muxer.Muxer({
        target: new Mp4Muxer.ArrayBufferTarget(),
    //let muxer = new Muxer({
        //target: new ArrayBufferTarget(),
        video: {
            // If you change this, make sure to change the VideoEncoder codec as well
            codec: "avc",
            width: videoWidth,
            height: videoHeight,
        },

        firstTimestampBehavior: 'offset', 

        // mp4-muxer docs claim you should always use this with ArrayBufferTarget
        fastStart: "in-memory",
    });

    videoEncoder = new VideoEncoder({
        output: (chunk, meta) => muxer.addVideoChunk(chunk, meta),
        error: (e) => console.error(e),
    });

    // This codec should work in most browsers
    // See https://dmnsgn.github.io/media-codecs for list of codecs and see if your browser supports
    videoEncoder.configure({
        codec: "avc1.42003e",
        width: videoWidth,
        height: videoHeight,
        bitrate: 4_000_000,
        bitrateMode: "constant",
    });
    //NEW codec: "avc1.42003e",
    //ORIGINAL codec: "avc1.42001f",

    var frameNumber = 0;
    //setTimeout(finalizeVideo,1000*videoDuration+200); //finish and export video after x seconds

    //take a snapshot of the canvas every x miliseconds and encode to video
    videoRecordInterval = setInterval(
        function(){
            if(recordVideoState == true){
                renderCanvasToVideoFrameAndEncode({
                    canvas,
                    videoEncoder,
                    frameNumber,
                    videofps
                })
                frameNumber++;
            }else{
            }
        } , 1000/videofps);

}

//finish and export video
async function finalizeVideo(){
    console.log("finalize muxer video");
    clearInterval(videoRecordInterval);
    recordVideoState = false;
    // Forces all pending encodes to complete
    await videoEncoder.flush();
    muxer.finalize();
    let buffer = muxer.target.buffer;
    finishedBlob = new Blob([buffer]); 
    downloadBlob(new Blob([buffer]));

    //hide user message
    recordingMessageDiv.classList.add("hidden");

}

async function renderCanvasToVideoFrameAndEncode({
    canvas,
    videoEncoder,
    frameNumber,
    videofps,
    }) {
    let frame = new VideoFrame(canvas, {
        // Equally spaces frames out depending on frames per second
        timestamp: (frameNumber * 1e6) / videofps,
    });

    // The encode() method of the VideoEncoder interface asynchronously encodes a VideoFrame
    videoEncoder.encode(frame);

    // The close() method of the VideoFrame interface clears all states and releases the reference to the media resource.
    frame.close();
}

function downloadBlob() {
    console.log("download video");
    let url = window.URL.createObjectURL(finishedBlob);
    let a = document.createElement("a");
    a.style.display = "none";
    a.href = url;
    const date = new Date();
    const filename = `liquify_${date.toLocaleDateString()}_${date.toLocaleTimeString()}.mp4`;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
}

//record and download videos on mobile devices
function startMobileRecording(){
    var stream = canvas.captureStream(videofps);
    mobileRecorder = new MediaRecorder(stream, { 'type': 'video/mp4' });
    mobileRecorder.addEventListener('dataavailable', finalizeMobileVideo);

    console.log("start simple video recording");
    console.log("Video dimensions: "+canvas.width+", "+canvas.height);

    //display user message
    //recordingMessageCountdown(videoDuration);
    recordingMessageDiv.classList.remove("hidden");

    recordVideoState = true;
    mobileRecorder.start(); //start mobile video recording

    /*
    setTimeout(function() {
        recorder.stop();
    }, 1000*videoDuration+200);
    */
}

function finalizeMobileVideo(e) {
setTimeout(function(){
    console.log("finish simple video recording");
    recordVideoState = false;
    /*
    mobileRecorder.stop();*/
    var videoData = [ e.data ];
    finishedBlob = new Blob(videoData, { 'type': 'video/mp4' });
    downloadBlob(finishedBlob);
    
    //hide user message
    recordingMessageDiv.classList.add("hidden");

},500);

}
  
  
  

//MAIN METHOD
refresh();
startWebcam();
