import { useState, useEffect, useRef } from 'react';
import socket from '../../utils/socket';
import RecordRTC, { MediaStreamRecorder } from 'recordrtc';

import './style.css';

const ss = require('socket.io-stream');

function RecordBtn() {
    const [mediaDeviceError, setMediaDeviceError] = useState<boolean>(false);
    const [outputString, setOutputString] = useState<string>("");
    const [textValue, setTextValue] = useState<string>("");

    const audioRef = useRef<HTMLAudioElement | null>(null);

    let recorder: RecordRTC;
    const getMediaStream = async (constraints: MediaStreamConstraints) => {
        let stream = null;

        try {
          stream = await navigator.mediaDevices.getUserMedia(constraints); 
          
          const audioStream = ss.createStream();
          ss(socket).emit('stt', audioStream);


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
          setMediaDeviceError(true);
          /* handle the error */
        }
    };

    const getSpeech = () => {
      console.log("send data", textValue);
      socket.emit("tts", textValue);
    }

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

      socket.on("stt", data => {
        console.log("data result", data);
        if(data && data.results[0] && data.results[0].alternatives[0]){
          console.log("transcript data", data.results[0].alternatives[0].transcript);
          setOutputString(data.results[0].alternatives[0].transcript);
        }
      });

      socket.on("tts", data => {
        console.log("got data", data);
        console.log("file sze base 64", 4*(data.length/3)/1024);
        const audio = new Audio("data:audio/wav;base64,"+data);
        audio.play();
      });
    });

    return (
        <div className="record_btn">
          <h1>STT</h1>
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
          <div style={{ padding: '20px 10px', fontSize: '15px' }}>{outputString}</div>
          
          <div style={{ padding: '20px 10px' }}>
            <h1>TTS</h1>
            <input type="text" placeholder="Enter text to convert" className="txtbox" onChange={e => setTextValue(e.target.value)} />
            <button 
              className={`btn btn-speech`} 
              disabled={mediaDeviceError} 
              onClick={getSpeech}
            >
              Get speech
            </button>
          </div>
        </div>
    );
}

export default RecordBtn;