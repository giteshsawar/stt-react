import { useState, useEffect, useRef } from 'react';
import socket from '../../utils/socket';
import RecordRTC, { MediaStreamRecorder } from 'recordrtc';

import './style.css';

const ss = require('socket.io-stream');

function RecordBtn() {
    const [mediaDeviceError, setMediaDeviceError] = useState<boolean>(false);
    const [audioChunks, setAudioChunks] = useState<Blob[]>([]);

    const audioRef = useRef<HTMLAudioElement | null>(null);

    // let whiteNoiseNode: AudioWorkletNode;
    // const addWorkletModule = async (worklet: AudioWorklet) => {
    //   await worklet.addModule('noise-processor.js');

    //   whiteNoiseNode = new AudioWorkletNode(audioContext, 'noise-processor');
    //   // whiteNoiseNode.connect(audioContext.destination);
    // }

    // const audioContext = new AudioContext();

    // const audioWorklet = audioContext.audioWorklet;
    // console.log("white noise node", audioWorklet);

    // addWorkletModule(audioWorklet);

    let recorder: RecordRTC;

    const getMediaStream = async (constraints: MediaStreamConstraints) => {
        let stream = null;

        try {
          stream = await navigator.mediaDevices.getUserMedia(constraints); 
          // ss(socket).emit("audio_stream", stream);

          console.log("stremaing", stream);
          recorder = new RecordRTC(stream, {
            type: 'audio',
            mimeType: 'audio/webm',
            sampleRate: 16000,
            desiredSampRate: 16000,
            recorderType: MediaStreamRecorder,
            numberOfAudioChannels: 1,
            timeSlice: 4000,
            ondataavailable: function(blob) {
                // making use of socket.io-stream for bi-directional
                // streaming, create a stream
                const audioStream = ss.createStream();
                // stream directly to server
                // it will be temp. stored locally
                console.log("send stream", blob);
                ss(socket).emit('stream-transcribe', audioStream, {
                    name: 'stream.wav', 
                    size: blob.size
                });
                // pipe the audio blob to the read stream
                ss.createBlobReadStream(blob).pipe(audioStream);
            }
          });

          recorder.startRecording();

          /* use the stream */
        } catch(err) {
          console.log("err", err);
          /* handle the error */
        }
    };

    // const sendBlobAsBase64 = (chunk: Blob) => {
    //   const reader = new FileReader();

    //   reader.addEventListener('load', () => {
    //     const dataUrl = reader.result;
    //     if (!dataUrl) return;
    //     let base64EncodedData; 
    //     console.log("data url", dataUrl, typeof dataUrl);
    //     if (typeof dataUrl === 'string') base64EncodedData = dataUrl.split(',')[1];
    //     console.log("encoded data", base64EncodedData)
    //     socket.emit("audio_stream", base64EncodedData);
    //   });results

    //   reader.readAsDataURL(chunk);
    // }

    const stopRecording = () => {
      recorder.stopRecording(function() {
        const blob = recorder.getBlob();

        console.log("auido bloc", blob);
        const audioURL = window.URL.createObjectURL(blob);
        if (audioRef && audioRef.current) {
            console.log("set audio url", audioURL);
            // audioRef.current.src = audioURL;
            // audioRef.current.play();
          }
      });
    };

    useEffect(() => {

      socket.on("results", data => {
        console.log("data result", data);
        if(data && data.results[0] && data.results[0].alternatives[0]){
          console.log("transcript data", data.results[0].alternatives[0].transcript);
        }
      });

    });

    // console.log("data available", mediaRecorder);

    return (
        <div className="record_btn">
          <button 
            className={`btn ${mediaDeviceError ? ' disabled_btn' : ''}`} 
            disabled={mediaDeviceError} 
            onClick={() => getMediaStream({ audio: true, video: false })}
          >
            Start recording
          </button>
          <button 
            className={`btn ${mediaDeviceError ? ' disabled_btn' : ''}`} 
            disabled={mediaDeviceError} 
            onClick={stopRecording}
          >
            stop recording
          </button>
          <audio ref={audioRef}></audio>
        </div>
    );
}

export default RecordBtn;