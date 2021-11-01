import { useState, useEffect, useRef } from 'react';
import RecordRTC, { StereoAudioRecorder } from 'recordrtc';
import { blobToBase64 } from '../../utils';
import { useSpeechToText } from '../../hooks';
import './style.css';

function RecordBtn() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const { sendSpeech, onTextAvailable } = useSpeechToText({ isRoot: true });
  const [texts, setTexts] = useState('');
  const [mediaDeviceError, setMediaDeviceError] = useState<boolean>(false);

  let recorder: RecordRTC;

  const getMediaStream = async (constraints: MediaStreamConstraints) => {
    let stream = null;

    try {
      stream = await navigator.mediaDevices.getUserMedia(constraints);
      recorder = new RecordRTC(stream, {
        type: 'audio',
        mimeType: 'audio/webm',
        disableLogs: true,
        sampleRate: 44100,
        bufferSize: 4096,
        desiredSampRate: 16000,
        recorderType: StereoAudioRecorder,
        numberOfAudioChannels: 1,
        // timeSlice: 4000,
        // ondataavailable: async function(blob) {
        //   const base64 = await blobToBase64(blob) as string;
        //   sendSpeech(base64);
        //   // const snd = new Audio(base64);
        //   // snd.play();
        // }
      });

      recorder.startRecording();
    } catch(err) {
      console.log("err", err);
    }
  };

  const stopRecording = () => {
    recorder.stopRecording(function() {
      const blob = recorder.getBlob();

      console.log("audio block", blob);
      const audioURL = window.URL.createObjectURL(blob);
      if (audioRef && audioRef.current) {
          console.log("set audio url", audioURL);
          // audioRef.current.src = audioURL;
          // audioRef.current.play();
        }
    });
  };

  useEffect(() => {
    onTextAvailable((data) => {
      console.log("data result", data);
      if(data){
        console.log("transcript data", data);
        setTexts(texts + ' -- ' + data)
      }
    });
  });


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
      <audio ref={audioRef} />

      <p style={{ background: '#ccc' ,width: '50vw', padding: '22px'}}>{texts}</p>
    </div>
  );
}

export default RecordBtn;
