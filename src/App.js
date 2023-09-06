import React, {useEffect, useRef, useState} from 'react';
import { initNotifications, notify } from '@mycv/f8-notification';
import './App.css';
import soundURL from './assets/hey_sondn.mp3';
import * as mobilenet from '@tensorflow-models/mobilenet';
import * as knnClassifier from '@tensorflow-models/knn-classifier';
import { Howl } from 'howler';

var sound = new Howl({
  src: [soundURL]
});

const NOT_TOUCH_LAYBLE = 'not_touch';
const TOUCH_LAYBLE = 'touch';
const Training = 100;
const TOUCH_CONFIDENCE = 0.7;


function App() {
  const video = useRef();
  const classifier = useRef();
  const models = useRef();
  const canPlaySound = useRef(true);
  const [touched, SetTouched] = useState(false);
  const init = async () => {
    console.log('init.......');
    await setupCamera();
    console.log('In ra');

    classifier.current = knnClassifier.create();

    models.current = await mobilenet.load();

    console.log('setup oke roi');
    console.log('Không chạm tay lên mặt và bấm Train 1');
    
    initNotifications({ cooldown: 3000 });
  }
  

  const setupCamera = () => {
    return new Promise((resolve, reject) => {
      navigator.getUserMedia = navigator.getUserMedia ||
        navigator.webkitGetUserMedia ||
        navigator.mozGetUserMedia ||
        navigator.msGetUserMedia;

      if (navigator.getUserMedia) {
        navigator.getUserMedia(
          { video: true },
          stream => {
            video.current.srcObject = stream;
            video.current.addEventListener('loadeddata', resolve)
          // resolve(); // Thêm resolve ở đây để báo hiệu rằng camera đã được thiết lập thành công.
          },
          error => {
            console.error("Error setting up camera:", error);
            reject(error); // Thêm reject ở đây để báo lỗi khi có lỗi xảy ra.
          }
        );
      } else {
        reject(new Error("getUserMedia is not supported in this browser"));
      }
    });
  };

  const train = async label => {
    console.log(label, 'Đang trani cho máy khuân mặt của bạn');
    for (let i = 0; i <Training; i++){
      var tientrinh = (i+1)/Training *100;
      console.log('Tiến Trình', tientrinh + '%');
      await training(label);
   }
  }
/**
 * Bước 1: Train cho mô hình khuân mặt đẹp trai không để tay lên mặt
 * Bước 2: Train cho mô hình khuân mặt nhưng có ngón tay hoặc bàn tay trên mặt của bạn
 * Bước 3: LấY lại hình ảnh real time của bạn để phân tích và so sánh với data trước đó(Phân Lớp)
 * ==> Nếu thuộc lớp nào thì hiện lên lớp đó 
 * @param {*} label
 * @returns 
 */

  const training = label => {
    return new Promise(async resolve => {
      const embedding = models.current.infer(
        video.current,
        true
      );
      classifier.current.addExample(embedding,label);
      await sleep(100);
      resolve();
    });
  }

  const run = async () =>{
    const embedding = models.current.infer(
      video.current,
      true
    );
    const result = await classifier.current.predictClass(embedding);

    console.log('Label: ', result.label);
    console.log('Cònidences: ', result.confidences);
  // // console.log(result)
    // if (result.lable === TOUCH_LAYBLE && result.confidences > TOUCH_CONFIDENCE) { 
    //   console.log('Đã chạm mặt');
    // } else {
    //   console.log('Chưa Chạm Mặt');
    // }
    if (result.classIndex === 0) { 
      console.log('Chưa Chạm Mặt');
      SetTouched(false);
    } else {
      SetTouched(true);
      console.log('Đã chạm mặt');
      if (canPlaySound.current) {
        canPlaySound.current = false;
        sound.play();
      }
      notify('Bỏ Cái Tay Xuống !', { body: 'Bạn vừa chạm tay vào mặt !' });
    }
  
  
  await sleep(200);

  run();
}
  const sleep = (ms = 0) => {
    return new Promise(resolve => setTimeout(resolve,ms))
  }
useEffect(() => {
  init();
  sound.on('end', function(){
    canPlaySound.current = true;
  });
  return() =>{
  }
}, []);


  return (
    <div className={`main ${touched ? 'oke' : ''}`} >
      <video 
        ref={video}
        className="video"
        autoPlay
      />

      <div className = "console">
        <button className="btn" onClick={() => train(NOT_TOUCH_LAYBLE)}> Train 1</button>
        <button className="btn" onClick={() => train(TOUCH_LAYBLE)}> Train 2</button>
        <button className="btn" onClick={() => run()}> Run</button>
      </div>

    </div>
  );
}

export default App;
