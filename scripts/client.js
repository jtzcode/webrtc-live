'use strict'

const mediaStreamConstraints = {
    video: {
        width: 1280,
        height: 720,
        frameRate: 15,
    },
    audio: false
};

let buffer;
let mediaRecorder;

const localVideo = document.querySelector("video");
const deviceList = document.querySelector(".device-list");
const picture = document.getElementById("screen-shot");
const recvideo = document.getElementById("recvideo");
const takePhoto = document.getElementById("take-photo");
const savePhoto = document.getElementById("save-photo");
const recordBtn = document.getElementById("record");
const playBtn = document.getElementById("play");
const downloadBtn = document.getElementById("download");

picture.width = 640;
picture.height = 480;

function download(url) {
    var tmpA = document.createElement('a');
    tmpA.download = 'photo';
    tmpA.href = url;
    document.body.appendChild(tmpA);
    tmpA.click();
    tmpA.remove();
}

function handleDataAvailable(e) {
    if (e && e.data && e.data.size > 0) {
        buffer.push(e.data);
    }
}

function playRecording() {
    var blob = new Blob(buffer, {type: 'video/webm'});
    recvideo.src = window.URL.createObjectURL(blob);
    recvideo.srcObject = null;
    recvideo.controls = true;
    recvideo.play();
}

function downloadRecording() {
    var blob = new Blob(buffer, {type: 'video/webm'});
    var url = window.URL.createObjectURL(blob);
    var anchor = document.createElement('a');

    anchor.href = url;
    anchor.style.display = 'none';
    anchor.download = 'my-recording.webm';
    anchor.click();
}

function startRecording() {
    buffer = [];
    var options = {
        mimeType: 'video/webm;codecs=vp8'
    };
    if (!MediaRecorder.isTypeSupported(options.mimeType)) {
        console.error(`${options.mimeType} is not supported.`);
        return;
    }

    try {
       mediaRecorder = new MediaRecorder(localVideo.srcObject, options);
    } catch (e) {
        console.error('Failed to create MediaRecorder: ', e);
        return;
    }
    mediaRecorder.ondataavailable = handleDataAvailable;
    mediaRecorder.start(10);
}

takePhoto.addEventListener('click', () => {
    picture.getContext('2d').drawImage(localVideo, 0, 0, picture.width, picture.height);
});

savePhoto.addEventListener('click', () => {
    //picture.getContext('2d').drawImage(localVideo, 0, 0, picture.width, picture.height);
    download(picture.toDataURL('image/jpeg'));
});

recordBtn.addEventListener('click', () => {
    startRecording();
});

playBtn.addEventListener('click', () => {
    playRecording();
});

downloadBtn.addEventListener('click', () => {
    downloadRecording();
});

navigator.mediaDevices.getUserMedia(mediaStreamConstraints).then((mediaStream) => {
    localVideo.srcObject = mediaStream;
}).catch((error) => {
    console.error("navigator.getUserMedia error: ", error);
});

navigator.mediaDevices.enumerateDevices().then((devices) => {
    devices.forEach(device => {
        console.log("Device id: " + device.deviceId + " Kind: " + device.kind + " Label: " + device.label);
        const item = document.createElement('li');
        item.innerHTML = "Device id: " + device.deviceId + " Kind: " + device.kind + " Label: " + device.label;
        deviceList.appendChild(item);
    });
});