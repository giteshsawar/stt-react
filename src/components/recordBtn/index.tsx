import { useState, useEffect, useRef } from 'react';
import socket from '../../utils/socket';
import RecordRTC, { MediaStreamRecorder } from 'recordrtc';

import './style.css';

const ss = require('socket.io-stream');

function RecordBtn() {
    const [mediaDeviceError, setMediaDeviceError] = useState<boolean>(false);
    const [audioChunks, setAudioChunks] = useState<Blob[]>([]);
    const [outputString, setOutputString] = useState<string>("");

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
          
          const audioStream = ss.createStream();
          ss(socket).emit('stream-transcribe', audioStream);


          recorder = new RecordRTC(stream, {
            type: 'audio',
            mimeType: 'audio/webm',
            sampleRate: 16000,
            desiredSampRate: 16000,
            recorderType: MediaStreamRecorder,
            numberOfAudioChannels: 1,
            timeSlice: 100,
            ondataavailable: async function(blob) {
              const buffer = await blob.arrayBuffer();
              // console.log("send the buffer", buffer);
              audioStream.write(Buffer.from(buffer), console.log);
            }
          });

          recorder.startRecording();

          /* use the stream */
        } catch(err) {
          console.log("err", err);
          /* handle the error */
        }
    };

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
      // mediaRecorderR.stop();
    };

    useEffect(() => {

      socket.on("results", data => {
        console.log("data result", data);
        if(data && data.results[0] && data.results[0].alternatives[0]){
          console.log("transcript data", data.results[0].alternatives[0].transcript);
          setOutputString(data.results[0].alternatives[0].transcript);
        }
      });

    });

    // console.log("data available", mediaRecorder);

    return (
        <div className="record_btn">
          <button 
            className={`btn ${mediaDeviceError ? ' disabled_btn' : ''}`} 
            disabled={mediaDeviceError} 
            onClick={() => getMediaStream({ audio: {
              sampleRate: 16000, channelCount: 1
            }, video: false })}
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
          <div style={{ padding: '10px', fontSize: '15px' }}>{outputString}</div>
        </div>
    );
}

export default RecordBtn;