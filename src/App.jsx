import React, { useState, useEffect } from "react";
import "./App.css";
import Game from "./containers/Game";

function App() {
  // State to hold the additional height value
  const [additionalHeight, setAdditionalHeight] = useState(0);

  useEffect(() => {
    const originalHeight = window.innerHeight;

    const resizeListener = () => {
      // Detect if the keyboard is likely shown by comparing the new height with the original
      if (window.innerHeight < originalHeight) {
        // Keyboard probably opened
        setAdditionalHeight(200); // Adjust based on your needs
      } else {
        // Keyboard probably closed
        setAdditionalHeight(0);
      }
    };

    window.addEventListener("resize", resizeListener);

    return () => {
      window.removeEventListener("resize", resizeListener);
    };
  }, []);

  return (
    <div
      className="game-page-wrapper"
      style={{ height: `calc(100dvh + ${additionalHeight}px)` }}
    >
      <div className="game-secondary-wrapper">
        <Game />
      </div>
    </div>
  );
}

export default App;
