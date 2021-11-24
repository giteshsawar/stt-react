import { useState, useEffect, useRef } from 'react';
import socket from '../../utils/socket';
import RecordRTC, { MediaStreamRecorder } from 'recordrtc';

import './style.css';
import { Stream } from 'stream';

const ss = require('socket.io-stream');

function RecordBtn() {
    const [mediaDeviceError, setMediaDeviceError] = useState<boolean>(false);
    const [outputString, setOutputString] = useState<string>("");
    const [textValue, setTextValue] = useState<string>("");

    const audioRef = useRef<HTMLAudioElement | null>(null);
    const audioContext = new AudioContext();
    const gainNode = audioContext.createGain();
    const analyser = audioContext.createAnalyser();

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

      ss(socket).on('tts-stream', (stream: Stream, { name }: { name: string }) => {
        console.log("got stream of audio data", stream, name);
        stream.on('data', async data => {
          console.log("data from stream", data);
          const audioBufferChunk = await audioContext.decodeAudioData(withWaveHeader(data, 2, 44100));
          const source = audioContext.createBufferSource();

          const newaudioBuffer = (source && source.buffer)
         ? appendBuffer(source.buffer, audioBufferChunk, audioContext)
         : audioBufferChunk;

          source.buffer = newaudioBuffer;
          source.connect(audioContext.destination);
          source.connect(gainNode);
          gainNode.connect(audioContext.destination);

          source.connect(analyser);

          source.start();
        });
        // const parts: Blob[] = [];
        // stream.on('data', function(chunk){
        //     parts.push(chunk);
        // });
        // stream.on('end', function () {
        //   if (audioRef && audioRef.current) {
        //     audioRef.current.src = (window.URL || window.webkitURL).createObjectURL(new Blob(parts));
        //     audioRef.current.play();
        //   }
        // });
      });
    });

    const appendBuffer = (buffer1: AudioBuffer, buffer2: AudioBuffer, context: AudioContext) => {
      const numberOfChannels = Math.min( buffer1.numberOfChannels, buffer2.numberOfChannels );
      const tmp = context.createBuffer( numberOfChannels, (buffer1.length + buffer2.length), buffer1.sampleRate );
      for (let i=0; i<numberOfChannels; i++) {
        const channel = tmp.getChannelData(i);
        channel.set( buffer1.getChannelData(i), 0);
        channel.set( buffer2.getChannelData(i), buffer1.length);
      }
      return tmp;
    };

    const concat = (buffer1: ArrayBuffer, buffer2: Buffer) => {
      const tmp = new Uint8Array(buffer1.byteLength + buffer2.byteLength);
    
      tmp.set(new Uint8Array(buffer1), 0);
      tmp.set(new Uint8Array(buffer2), buffer1.byteLength);
    
      return tmp.buffer;
    };

    const withWaveHeader = (data: Buffer, numberOfChannels: number, sampleRate: number) => {
      const header = new ArrayBuffer(44);
    
      const d = new DataView(header);
    
      d.setUint8(0, "R".charCodeAt(0));
      d.setUint8(1, "I".charCodeAt(0));
      d.setUint8(2, "F".charCodeAt(0));
      d.setUint8(3, "F".charCodeAt(0));
    
      d.setUint32(4, data.byteLength / 2 + 44, true);
    
      d.setUint8(8, "W".charCodeAt(0));
      d.setUint8(9, "A".charCodeAt(0));
      d.setUint8(10, "V".charCodeAt(0));
      d.setUint8(11, "E".charCodeAt(0));
      d.setUint8(12, "f".charCodeAt(0));
      d.setUint8(13, "m".charCodeAt(0));
      d.setUint8(14, "t".charCodeAt(0));
      d.setUint8(15, " ".charCodeAt(0));
    
      d.setUint32(16, 16, true);
      d.setUint16(20, 1, true);
      d.setUint16(22, numberOfChannels, true);
      d.setUint32(24, sampleRate, true);
      d.setUint32(28, sampleRate * 1 * 2);
      d.setUint16(32, numberOfChannels * 2);
      d.setUint16(34, 16, true);
    
      d.setUint8(36, "d".charCodeAt(0));
      d.setUint8(37, "a".charCodeAt(0));
      d.setUint8(38, "t".charCodeAt(0));
      d.setUint8(39, "a".charCodeAt(0));
      d.setUint32(40, data.byteLength, true);
    
      return concat(header, data);
    };

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