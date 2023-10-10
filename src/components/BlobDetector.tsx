import React from "react";
import Webcam from 'react-webcam';
import cv from "@techstark/opencv-js";
import ColorPredicateRangeSlider from "./ColorPredicateRangeSlider";

export interface IBlobDetectorProps {
  webcam: React.RefObject<Webcam>;
  style?: React.CSSProperties;
};

type ColorPredicate = {
  red_min?: number,
  red_max?: number,
  green_min?: number,
  green_max?: number,
  blue_min?: number,
  blue_max?: number,

  red_green_min?: number,
  red_green_max?: number,
  red_blue_min?: number,
  red_blue_max?: number,
  green_blue_min?: number,
  green_blue_max?: number
};

function applyColorPredicate(src: cv.Mat, dst: cv.Mat, predicate: ColorPredicate) {
  console.log(`applyColorPredicate ${JSON.stringify( predicate ) }`);
  const low = new cv.Mat(src.rows, src.cols, src.type(), [predicate.red_min, predicate.green_min, predicate.blue_min, 0]);
  const high = new cv.Mat(src.rows, src.cols, src.type(), [predicate.red_max! - 1, predicate.green_max! - 1, predicate.blue_max! - 1, 255]);

  cv.inRange(src, low, high, dst);


  low.delete();
  high.delete();
}

export default function BlobDetector(props: IBlobDetectorProps) {
  const webcamRef = props.webcam;
  const destRef: React.Ref<HTMLCanvasElement> = React.useRef(null);

  const [cvLoaded, setCvLoaded] = React.useState(false);
  const p = {
    red_min: 0, red_max: 255,
    green_min: 0, green_max: 255,
    blue_min: 0, blue_max: 255,

    red_green_min: -255, red_green_max: 255,
    red_blue_min: -255, red_blue_max: 255,
    green_blue_min: -255, green_blue_max: 255,
  };
  const [colorPredicate, setColorPredicate ] = React.useState( p );

  cv['onRuntimeInitialized'] = () => {
    console.log(`cv is loaded`);
    console.log(cv.getBuildInformation());
    setCvLoaded(true);
  };

  const updateColorPredicate = ( color : ColorPredicate ) => {
    console.log(`updateColorPredicate ${JSON.stringify(color, null, 4)}`);
      setColorPredicate( ( previousState ) => { 
        const n = {...previousState, ...color }; 
        console.log(`updated ${JSON.stringify(n)}`);
        return n;
      } );
  }

  React.useEffect(() => {
    if ( ( webcamRef.current ) && ( cvLoaded ) ) {
      const videoSrc = webcamRef.current!.video;
      videoSrc?.play();

      const src = new cv.Mat(videoSrc?.height, videoSrc?.width, cv.CV_8UC4);
      const dst = new cv.Mat();
      const cap = new cv.VideoCapture(videoSrc!);

      
      const detectColor = async () => {
        if (!cap) {
          return;
        }

        return new Promise<void>((resolve) => {
          cap.read(src);

          applyColorPredicate(src, dst, colorPredicate );

          cv.imshow(destRef.current!, dst);
          resolve();
        });
      };

      let handle: number;

      const nextTick = () => {
        handle = requestAnimationFrame(async () => {
          await detectColor();
          nextTick();
        });
      };
      nextTick();
      return () => {
        cancelAnimationFrame(handle);
        src.delete();
        dst.delete();
      };
    }
  }, [cvLoaded, webcamRef.current, colorPredicate]);

  return (
    <>
      <div style={{ ...props.style }}>
        <h2>Blob Detector</h2>

        <h3>Color Predicate</h3>
        <table>
          <tbody>
            <tr>
              <td>Red</td>
              <td>
                <div className="color-predicate-range-slider-container">
                  <ColorPredicateRangeSlider rtl={false} callback={ 
                      ( values : [number, number ] ) => { 
                        console.log( `callback red ${values}`); 
                        updateColorPredicate( { red_min: values[0], red_max: values[1] } ); } 
                    } 
                  />
                </div>
              </td>
            </tr>
            <tr>
              <td>Green</td>
              <td>
                <div className="color-predicate-range-slider-container">
                  <ColorPredicateRangeSlider rtl={false} color_id={"green"}/>
                </div>
              </td>
            </tr>
            <tr>
              <td>Blue</td>
              <td>
                <div className="color-predicate-range-slider-container">
                  <ColorPredicateRangeSlider rtl={false} />
                </div>
              </td>
            </tr>
          </tbody>
        </table>

        <table>
          <tbody>
            <tr>
              <td> <canvas ref={destRef} /> </td>
            </tr>
          </tbody>
        </table>
      </div>
    </>
  );
}
