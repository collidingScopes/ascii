/*
To do:
Add max video size (resize or just scale it down in browser?)
Allow toggle for different monospace fonts (Japanese, etc.)
Try using edge detection instead of luminosity values
Allow image upload, with function to determine based on the file extension and handle accordingly
Investigate frame rate unsynced issue when video recording
Video export can have dropped frames / uneven time / low quality
Change shortcuts so that they don't interfere with the text input (add control to front?)
GUI needs to be dynamic and show/hide values based on user choices (e.g., select video button)
Mobile:
- Need to get webcam dimensions dynamically and use that instead
- Default video is too wide? Need to resize video or screen upon startup?
- Select Video dropdown doesn't work -- need to click the button as well
Make GUI float farther to the right so that it doesn't cover canvas (need to make body wider?)
About / links div / GITHUB README
Adjust browser zoom level / viewport width upon change of canvas width (to fit the whole canvas on the screen)
*/

var webcamVideo = document.getElementById('webcamVideo');
var userVideo = document.getElementById('userVideo');
var defaultVideo = document.getElementById('defaultVideo');

var canvas = document.getElementById("canvas");
var ctx = canvas.getContext("2d");

const canvasRaw = document.getElementById('canvas-video')
const ctx2 = canvasRaw.getContext("2d", {
    willReadFrequently: true,
});

const canvasPixel = document.getElementById('canvas-video-pixel')
const ctx3 = canvasPixel.getContext("2d");

/*
var webcamVideoWidth = Math.min(640,Math.floor(window.innerWidth));
var webcamVideoHeight = Math.floor(webcamVideoWidth * 3/4);
*/

var webcamAspectRatio = 1;
var webcamVideoMaxWidth = 1080;
var resizedWebcamWidth = Math.min(webcamVideoMaxWidth,Math.floor(window.innerWidth));
var resizedWebcamHeight = Math.round(resizedWebcamWidth / webcamAspectRatio);

var defaultVideoWidth = 480;
var defaultVideoHeight = 848;
var canvasWidth = defaultVideoWidth;
var canvasHeight = defaultVideoHeight;

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

 //this defines the character set. ordered by darker to lighter colour
//const gradient = "_______.:!/r(l1Z4H9W8$@";
//const gradient = "__..--~~<>??123456789@@@";
//const gradient =  "`.-':_,^=;><+!rc*/z?sLTv)J7(|Fi{C}fI31tlu[neoZ5Yxjya]2ESwqkP6h9d4VpOGbUAKXHm8RD#$Bg0MNWQ%&@"
const gradient =  "`.-':_,^=;<+!rc*/z?sTv7(|Fi{C}fI31tu[neoZ5xjya]2EwqkP6h94VpOGbUKXHm8R#$Bg0NW%&@"
const preparedGradient = gradient.replaceAll('_', '\u00A0')

var randomColumnArray = [];
var startingRowArray = [];

//var textInput = "wavesand";
//var textInput = "♫♪iPod"
var animationRequest;
var playAnimationToggle = false;
var counter = 0;
var webcamStream;

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
var frameNumber = 0;

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

//add gui
var obj = {
    videoType: 'Default',
    effectWidth: 50,
    backgroundColor: "#080c37",
    backgroundGradient: false,
    backgroundSaturation: 60,
    fontColor: "#c7205b",
    fontColor2: "#0032ff",
    fontSizeFactor: 3,
    pixelSizeFactor: 70,
    threshold: 30,
    textInput: "wavesand",
    randomness: 15,
    invert: false,
    animationType: 'Random Text',
};

var videoType = obj.videoType;
var effectWidth = obj.effectWidth/100;
var animationType = obj.animationType;

var backgroundColor = obj.backgroundColor;
var backgroundRGB = hexToRgb(backgroundColor)
var backgroundHue = getHueFromHex(backgroundColor);
var backgroundSaturation = obj.backgroundSaturation;

var backgroundGradient = obj.backgroundGradient;
var fontSizeFactor = obj.fontSizeFactor;
var pixelSizeFactor = obj.pixelSizeFactor;
var fontColor = obj.fontColor;
var fontHue = getHueFromHex(fontColor);
var fontColor2 = obj.fontColor2;

var threshold = obj.threshold/100;
var textInput = obj.textInput;
var randomness = obj.randomness/100;
var invertToggle = obj.invert;

//dat.GUI.TEXT_OPEN = "Open Controls (h)";
//dat.GUI.TEXT_CLOSED = "Close Controls (h)";
var gui = new dat.gui.GUI({ autoPlace:false });
gui.close();
var guiOpenToggle = false;

// Choose from accepted values
gui.add(obj, 'videoType', [ 'Default', 'Select Video', 'Webcam'] ).name('Video Type').onChange(changeVideoType);
gui.add(obj, "effectWidth").min(0).max(100).step(1).name('Effect Width %').onChange(refresh);
gui.add(obj, 'animationType', [ 'Random Text', 'User Text'] ).name('Text Type').onChange(refresh);
gui.add(obj, "textInput").onFinishChange(refresh);
gui.addColor(obj, "backgroundColor").name("Background Color").onFinishChange(refresh);
gui.add(obj,"backgroundGradient").name('Bg Gradient?').onChange(refresh);
gui.add(obj, "backgroundSaturation").min(0).max(100).step(1).name('Bg Saturation').onChange(refresh);
gui.addColor(obj, "fontColor").name("Font Color").onFinishChange(refresh);
gui.addColor(obj, "fontColor2").name("Font Color2").onFinishChange(refresh);

gui.add(obj, "fontSizeFactor").min(0).max(10).step(1).name('Font Size Factor').onChange(refresh);
gui.add(obj, "pixelSizeFactor").min(10).max(200).step(1).name('Resolution').onChange(refresh);
gui.add(obj, "threshold").min(5).max(95).step(1).name('Threshold').onChange(refresh);
gui.add(obj,"invert").name('Invert?').onChange(refresh);
gui.add(obj, "randomness").min(0).max(100).step(1).name('Randomness').onChange(refresh);
obj['selectVideo'] = function () {
    fileInput.click();
};
gui.add(obj, 'selectVideo').name('Select Video');

obj['pausePlay'] = function () {
    togglePausePlay();
};
gui.add(obj, 'pausePlay').name("Pause/Play");

obj['saveImage'] = function () {
    saveImage();
};
gui.add(obj, 'saveImage').name("Image Export");

obj['saveVideo'] = function () {
    toggleVideoRecord();
};
gui.add(obj, 'saveVideo').name("Start/Stop Video Export");

customContainer = document.getElementById( 'gui' );
customContainer.appendChild(gui.domElement);

var guiCloseButton = document.getElementsByClassName("close-button");
console.log(guiCloseButton.length);
guiCloseButton[0].addEventListener("click",updateGUIState);

function selectVideo(){
    fileInput.click();
}

function updateGUIState(){
    if(guiOpenToggle){
        guiOpenToggle = false;
    } else {
        guiOpenToggle = true;
    }
}

function refresh(){
    console.log("refresh");
    console.log("canvas width/height: "+canvasWidth+", "+canvasHeight);

    animationType = obj.animationType;
    effectWidth = obj.effectWidth/100;
    fontSizeFactor = obj.fontSizeFactor;
    pixelSizeFactor = obj.pixelSizeFactor;
    pixelSize = Math.ceil(Math.min(canvasWidth,canvasHeight)/pixelSizeFactor);
    numCols = Math.ceil(Math.ceil(canvasWidth / pixelSize) * effectWidth);
    numRows = Math.ceil(canvasHeight / pixelSize);
    fontSize = pixelSize/0.65;
    ctx.font = fontSize+"px "+fontFamily;

    fontColor = obj.fontColor;
    fontColor2 = obj.fontColor2;
    fontHue = getHueFromHex(fontColor);
    
    backgroundColor = obj.backgroundColor;
    backgroundRGB = hexToRgb(backgroundColor)
    backgroundHue = getHueFromHex(backgroundColor);
    backgroundSaturation = obj.backgroundSaturation;;
    
    backgroundGradient = obj.backgroundGradient;
    threshold = obj.threshold/100;
    textInput = obj.textInput;
    counter = 0;
    randomness = obj.randomness/100;
    invertToggle = obj.invert;
    //frameNumber = 0;
    randomColumnArray = [];
    startingRowArray = [];

    for(var i=0; i<numCols; i++){
        if(Math.random() < randomness){
            randomColumnArray[i] = true;
            startingRowArray[i] = Math.floor( Math.random() * numRows );
        } else {
            randomColumnArray[i] = false;
        }
    }
}

function togglePausePlay(){
    
    if(playAnimationToggle == false){
        if(videoType == "Webcam"){
            startWebcam();
        } else if(videoType == "Select Video"){
            refresh();
            userVideo.play();
            playAnimationToggle = true;
            animationRequest = requestAnimationFrame(loop);
        } else if(videoType == "Default"){
            startDefaultVideo();
        }
    } else {
        stopVideo();
    }
    
}

function changeVideoType(){
    stopVideo();
    videoType = obj.videoType;

    if(videoType == "Webcam"){

        startWebcam();

        /*
        canvasWidth = resizedWebcamWidth;
        canvasHeight = resizedWebcamHeight;
        canvas.width = canvasWidth;
        canvas.height = canvasHeight;
        */

    } else if(videoType == "Select Video"){
        console.log("select video file");
        //fileInput.click();
        //fileInput.trigger("click");
        //$('#fileInput').trigger("click"); 
        selectVideo();

    } else if(videoType == "Default"){
        startDefaultVideo();
    }

    refresh();

}

function startDefaultVideo(){
    if(playAnimationToggle==true){
        playAnimationToggle = false;
        cancelAnimationFrame(animationRequest);
        console.log("cancel animation");
    }

    /*
    userVideo.classList.add("hidden");
    webcamVideo.classList.add("hidden");
    defaultVideo.classList.remove("hidden");
    */

    canvasWidth = defaultVideoWidth;
    canvasHeight = defaultVideoHeight;
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;

    defaultVideo.play();
    playAnimationToggle = true;
    animationRequest = requestAnimationFrame(loop);
}

function startWebcam() {

    if(playAnimationToggle==true){
        playAnimationToggle = false;
        cancelAnimationFrame(animationRequest);
        console.log("cancel animation");
    }

    /*
    userVideo.classList.add("hidden");
    webcamVideo.classList.remove("hidden");
    defaultVideo.classList.add("hidden");
    */

    navigator.mediaDevices.getUserMedia({
        audio: false,
        video: true
    })
    .then(stream => {
        window.localStream = stream;
        webcamVideo.srcObject = stream;
        webcamVideo.play();
        if(isIOS || isAndroid){
            webcamAspectRatio = 3/4;
        } else {
            webcamAspectRatio = stream.getVideoTracks()[0].getSettings().aspectRatio;
        }
        console.log("Aspect Ratio: "+webcamAspectRatio);

        resizedWebcamWidth = Math.min(webcamVideoMaxWidth,Math.floor(window.innerWidth));
        resizedWebcamHeight = Math.round(resizedWebcamWidth / webcamAspectRatio);
    
        canvasWidth = resizedWebcamWidth;
        canvasHeight = resizedWebcamHeight;
        canvas.width = canvasWidth;
        canvas.height = canvasHeight;

        refresh();

        playAnimationToggle = true;
        animationRequest = requestAnimationFrame(loop);
    })
    .catch((err) => {
        console.log(err);
    });

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
    defaultVideo.pause();

    if(localStream == null){
    } else {
        localStream.getVideoTracks()[0].stop();
    }
    //webcamVideo.src = '';
}

var fileInput = document.getElementById("fileInput");
fileInput.addEventListener('change', (e) => {

    if(playAnimationToggle==true){
        playAnimationToggle = false;
        cancelAnimationFrame(animationRequest);
        console.log("cancel animation");
    }

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

const render = (ctx) => {
    if (canvasWidth && canvasHeight) {
        canvasRaw.width = canvasWidth;
        canvasRaw.height = canvasHeight;

        //choose video feed
        if(videoType == "Webcam"){
            ctx2.drawImage(webcamVideo, 0, 0, canvasWidth, canvasHeight);
        } else if(videoType == "Select Video"){
            ctx2.drawImage(userVideo, 0, 0, canvasWidth, canvasHeight);
        }  else if(videoType == "Default"){
            ctx2.drawImage(defaultVideo, 0, 0, canvasWidth, canvasHeight);
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
                //ctx3.fillStyle = `rgba(${avgColor[0]}, ${avgColor[1]}, ${avgColor[2]}, ${alpha})`;
                //ctx3.fillRect(cellX*pixelSize, cellY*pixelSize, pixelSize, pixelSize);
                
                //videoPixels.push(avgColor[0]);
                //videoPixels.push(avgColor[1]);
                //videoPixels.push(avgColor[2]);
                //videoPixels.push(alpha);

                var grayScaleValue = (0.299*avgColor[0] + 0.587*avgColor[1] + 0.114*avgColor[2]); //perceived luminosity value
                grayscaleDataArray[cellY][cellX] = grayScaleValue;

            }
        }

    } else {
        ctx2.fillStyle = "#fff";
        ctx2.fillRect(0, 0, canvasWidth, canvasHeight);
    }
}

const getCharByScale = (scale) => {
    const val = Math.floor(scale / 255 * (gradient.length - 1));
    return preparedGradient[val];
}

function renderText(){
    
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0,0,canvasWidth*effectWidth,canvasHeight);

    for(var col=0; col<numCols; col++){
        for(var row=0; row<numRows; row++){
            
            var adjustedThreshold = threshold + (0.2 * Math.sin(counter/30) * randomness);
            //var adjustedThreshold = threshold; 
            var currentGrayValue = grayscaleDataArray[row][col];
            
            var char;
            var currentFontSize = Math.min(fontSize*3, fontSize * fontSizeFactor/3);
            
            //draw background color of pixels
            if(counter%8==0 && Math.random() < randomness*0.002){
                ctx.fillStyle = tweakHexColor(backgroundColor,100*randomness);
                ctx.fillRect(col*pixelSize,row*pixelSize,pixelSize,pixelSize);
            } else if(backgroundGradient){

                var currentBackgroundColor = "hsl("+backgroundHue+","+backgroundSaturation+"%,"+Math.pow(currentGrayValue/255,2)*100+"%)";
                var currentBackgroundColorInvert = "hsl("+backgroundHue+","+backgroundSaturation+"%,"+(1-Math.pow(currentGrayValue/255,2))*100+"%)";
                
                if(invertToggle == false){
                    if(currentGrayValue/255 > adjustedThreshold){
                        ctx.fillStyle = currentBackgroundColor;
                    } else {
                        ctx.fillStyle = "hsl("+backgroundHue+","+backgroundSaturation+"%,"+adjustedThreshold/4*100+"%)";
                    }
                } else {
                    if(currentGrayValue/255 < (1-adjustedThreshold)){
                        ctx.fillStyle = currentBackgroundColorInvert;
                    } else {
                        ctx.fillStyle = "hsl("+backgroundHue+","+backgroundSaturation+"%,"+adjustedThreshold/4*100+"%)";
                    }
                }

                ctx.fillRect(col*pixelSize,row*pixelSize,pixelSize,pixelSize);

            } else {
                //ctx.fillStyle = backgroundColor;
                
                /*
                Background color = actual video stream color
                var r = videoPixels[(row*numCols+col)*4];
                var g = videoPixels[(row*numCols+col)*4 + 1];
                var b = videoPixels[(row*numCols+col)*4 + 2];
                var a = 1;
                ctx.fillStyle = "rgb("+r+","+g+","+b+","+a+")";
                */
            }
            
            //choose text character to draw
            if(randomColumnArray[col]){
                //if((counter % (numRows+startingRowArray[col])) > row){
                if( (((counter+startingRowArray[col]) % 100)/100*numRows)+startingRowArray[col] > row){
                    //char = preparedGradient[Math.floor(Math.random()*preparedGradient.length)]; //draw random char
                    char = getCharByScale(currentGrayValue);
                } else {
                    char = "";
                }
            } else if(Math.random()<0.005*randomness){
                char = preparedGradient[Math.floor(Math.random()*preparedGradient.length)]; //draw random char
            } else if(animationType == "Random Text"){
                char = getCharByScale(currentGrayValue);
            } else if(animationType == "User Text"){
                char = textInput[(row*numCols+col)%textInput.length];
                if(invertToggle){
                    currentFontSize = Math.min(fontSize*3, Math.floor( (1-Math.pow(currentGrayValue/255,1)) * fontSizeFactor/3 * fontSize ));
                } else {
                    currentFontSize = Math.min(fontSize*3, Math.floor( (Math.pow(currentGrayValue/255,1)) * fontSizeFactor/3 * fontSize ));
                }
            }

            //draw text onto canvas
            ctx.font = currentFontSize+"px "+fontFamily;
            //ctx.fillStyle = fontColor;
            //ctx.fillStyle = "hsl("+fontHue+",80%,"+currentGrayValue/255*100+"%)";
            if(invertToggle == false){
                if(currentGrayValue/255 > adjustedThreshold){
                    
                    ctx.fillStyle = interpolateHex(fontColor,fontColor2,(currentGrayValue/255-adjustedThreshold) / (1-adjustedThreshold))                    
                    ctx.fillText(char, col*pixelSize, row*(pixelSize) + pixelSize);
                    //ctx.strokeStyle = fontColor;
                    //ctx.strokeText(char, col*pixelSize + pixelSize/4, row*(pixelSize) + pixelSize/2);
                }
            } else {
                if(currentGrayValue/255 < (1-adjustedThreshold)){
                    
                    ctx.fillStyle = interpolateHex(fontColor2,fontColor,(currentGrayValue/255) / (1-adjustedThreshold))                                        
                    ctx.fillText(char, col*pixelSize, row*(pixelSize) + pixelSize);
                }
            }

        }
        
    }

}

function loop(){

    if(counter==0){
        console.log("start animation, first frame");
    }
    if (playAnimationToggle){
        counter++;
        render(ctx)

        if(effectWidth < 1){
            //draw the chosen video onto the final canvas
            if(videoType == "Webcam"){
                ctx.drawImage(webcamVideo, 0, 0, canvasWidth, canvasHeight);
            } else if(videoType == "Select Video"){
                ctx.drawImage(userVideo, 0, 0, canvasWidth, canvasHeight);
            }  else if(videoType == "Default"){
                ctx.drawImage(defaultVideo, 0, 0, canvasWidth, canvasHeight);
            }
        }

        renderText();


        
        if(recordVideoState == true){
            renderCanvasToVideoFrameAndEncode({
                canvas,
                videoEncoder,
                frameNumber,
                videofps
            })
            frameNumber++;
        }
        

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

function rgbToHue(r, g, b) {
    const rNorm = r / 255;
    const gNorm = g / 255;
    const bNorm = b / 255;
    const hue = Math.atan2(Math.sqrt(3) * (gNorm - bNorm), 2 * rNorm - gNorm - bNorm);
    return hue * 180 / Math.PI;
}

function rgbToSaturation(r, g, b) {
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    return (max - min) / max;
}

function rgbToLightness(r, g, b) {
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    return (max + min) / 2 / 255;
}

function interpolateHex(hex1,hex2,factor){
    hex1RGB = hexToRgb(hex1);
    hex2RGB = hexToRgb(hex2);

    var newR = Math.round(hex1RGB.r + (hex2RGB.r - hex1RGB.r)*factor);
    var newG = Math.round(hex1RGB.g + (hex2RGB.g - hex1RGB.g)*factor);
    var newB = Math.round(hex1RGB.b + (hex2RGB.b - hex1RGB.b)*factor);

    var rgbResult = "rgb("+newR+","+newG+","+newB+")";
    return rgbResult;
}

function tweakHexColor(hexColor, range){
    var rgb = hexToRgb(hexColor);
  
    var newRGBArray = [];
  
    newRGBArray.push(Math.floor(rgb.r+range*Math.random()-range/2));
    newRGBArray.push(Math.floor(rgb.b+range*Math.random()-range/2));
    newRGBArray.push(Math.floor(rgb.g+range*Math.random()-range/2));
  
    var newHexColor = rgbToHex(newRGBArray[0],newRGBArray[1],newRGBArray[2]);
    return newHexColor;
}

function rgbToHex(r, g, b) {
    return "#" + (
      (r.toString(16).padStart(2, "0")) +
      (g.toString(16).padStart(2, "0")) +
      (b.toString(16).padStart(2, "0"))
    );
}

/*
//shortcut hotkey presses
document.addEventListener('keydown', function(event) {
  
    if(event.shiftKey && event.key == 'p'){
        togglePausePlay();
    } else if (event.key === 'i' && event.shiftKey) {
        saveImage();
    } else if (event.key === 'v' && event.shiftKey) {
        toggleVideoRecord();
    } else if (event.key === 'o' && event.shiftKey) {
        dat.GUI.toggleHide();
    } 
   
});

//shortcut hotkey presses
document.addEventListener('keydown', function(event) {
  
    if(event.key === 'h') {
        toggleGUI();
    } 
   
});
*/

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

    userVideo.currentTime = 0;
    defaultVideo.currentTime = 0;

    setTimeout(function(){
        if(recordVideoState == false){
            recordVideoState = true;
            chooseRecordingFunction();
          } else {
            recordVideoState = false;
            chooseEndRecordingFunction();
          }
    },250);

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

    frameNumber = 0;

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
        bitrate: 14_000_000,
        bitrateMode: "constant",
    });
    //NEW codec: "avc1.42003e",
    //ORIGINAL codec: "avc1.42001f",

    /*
    var frameNumber = 0;
    //setTimeout(finalizeVideo,1000*videoDuration+200); //finish and export video after x seconds
    */

    /*
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
    */
    

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
    const filename = `ASCII_${date.toLocaleDateString()}_${date.toLocaleTimeString()}.mp4`;
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
startDefaultVideo();
