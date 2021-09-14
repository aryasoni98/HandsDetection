import DeviceDetector from "https://cdn.skypack.dev/device-detector-js@2.2.10";
testSupport([
    { client: 'Chrome' },
]);
function testSupport(supportedDevices) {
    const deviceDetector = new DeviceDetector();
    const detectedDevice = deviceDetector.parse(navigator.userAgent);
    let isSupported = false;
    for (const device of supportedDevices) {
        if (device.client !== undefined) {
            const re = new RegExp(`^${device.client}$`);
            if (!re.test(detectedDevice.client.name)) {
                continue;
            }
        }
        if (device.os !== undefined) {
            const re = new RegExp(`^${device.os}$`);
            if (!re.test(detectedDevice.os.name)) {
                continue;
            }
        }
        isSupported = true;
        break;
    }
    if (!isSupported) {
        alert(`This demo, running on ${detectedDevice.client.name}/${detectedDevice.os.name}, ` +
            `is not well supported at this time, continue at your own risk.`);
    }
}
const videoElement = document.getElementsByClassName('input_video')[0];
const canvasElement = document.getElementsByClassName('output_canvas')[0];
const controlsElement = document.getElementsByClassName('control-panel')[0];
const canvasCtx = canvasElement.getContext('2d');
const fpsControl = new FPS();
const spinner = document.querySelector('.loading');
spinner.ontransitionend = () => {
    spinner.style.display = 'none';
};
function onResults(results) {
    document.body.classList.add('loaded');
    fpsControl.tick();
    canvasCtx.save();
    canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
    canvasCtx.drawImage(results.image, 0, 0, canvasElement.width, canvasElement.height);
    if (results.multiHandLandmarks && results.multiHandedness) {
        for (let index = 0; index < results.multiHandLandmarks.length; index++) {
            const classification = results.multiHandedness[index];
            const isRightHand = classification.label === 'Right';
            const landmarks = results.multiHandLandmarks[index];
            drawConnectors(canvasCtx, landmarks, HAND_CONNECTIONS, { color: isRightHand ? '#00FF00' : '#FF0000' }),
                drawLandmarks(canvasCtx, landmarks, {
                    color: isRightHand ? '#00FF00' : '#FF0000',
                    fillColor: isRightHand ? '#FF0000' : '#00FF00',
                    radius: (x) => {
                        return lerp(x.from.z, -0.15, .1, 10, 1);
                    }
                });
        }
    }
    canvasCtx.restore();
}
const hands = new Hands({ locateFile: (file) => {
        return `https://cdn.jsdelivr.net/npm/@mediapipe/hands@0.3/${file}`;
    } });
hands.onResults(onResults);
new ControlPanel(controlsElement, {
    selfieMode: true,
    maxNumHands: 2,
    minDetectionConfidence: 0.5,
    minTrackingConfidence: 0.5
})
    .add([
    new StaticText({ title: 'MediaPipe Hands' }),
    fpsControl,
    new Toggle({ title: 'Selfie Mode', field: 'selfieMode' }),
    new SourcePicker({
        onSourceChanged: () => {
            hands.reset();
        },
        onFrame: async (input, size) => {
            const aspect = size.height / size.width;
            let width, height;
            if (window.innerWidth > window.innerHeight) {
                height = window.innerHeight;
                width = height / aspect;
            }
            else {
                width = window.innerWidth;
                height = width * aspect;
            }
            canvasElement.width = width;
            canvasElement.height = height;
            await hands.send({ image: input });
        },
        examples: {
            videos: [],
            images: [],
        }
    }),
    new Slider({
        title: 'Max Number of Hands',
        field: 'maxNumHands',
        range: [1, 4],
        step: 1
    }),
    new Slider({
        title: 'Min Detection Confidence',
        field: 'minDetectionConfidence',
        range: [0, 1],
        step: 0.01
    }),
    new Slider({
        title: 'Min Tracking Confidence',
        field: 'minTrackingConfidence',
        range: [0, 1],
        step: 0.01
    }),
])
    .on(x => {
    const options = x;
    videoElement.classList.toggle('selfie', options.selfieMode);
    hands.setOptions(options);
});