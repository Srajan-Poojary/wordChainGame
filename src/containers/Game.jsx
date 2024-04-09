import React, { useEffect, useRef, useState } from "react";
import styles from "./Game.module.css";
import nlp from "compromise";
import useWindowSize from "react-use/lib/useWindowSize";
import Confetti from "react-confetti";
import axios from "axios";
import JSConfetti from "js-confetti";
import ClipboardJS from "clipboard";

const Game = () => {
  const clipboard = new ClipboardJS(".btn");
  const { width, height } = useWindowSize();
  const [verifiedWords, setVerifiedWords] = useState([]);
  const [inputValue, setInputValue] = useState("");
  const [wordShouldStartWith, setWordShouldStartWith] = useState("");
  const [verifiedBaseWords, setVerifiedBaseWords] = useState([]);
  const [seconds, setSeconds] = useState(15);
  const [score, setScore] = useState(0);
  const [lastLetter, setLastLetter] = useState();
  const [toastError, setToastError] = useState("");
  const [showConfetti, setShowConfetti] = useState(false);
  const [totalTime, setTotalTime] = useState(0);
  const [isGameOver, setIsGameOver] = useState(false);

  const currentInterval = useRef(null);
  const toastErrorRef = useRef(null);
  const generalToastRef = useRef(null);
  const inputRef = useRef(null);
  const verfiedWordsContainerRef = useRef(null);
  const gamePartContainer = useRef(null);
  const confettiTimeout = useRef(null);
  const gameEndRef = useRef(null);
  const shareScoreBtnRef = useRef(null);
  const timeScoreFactor = useRef(100);

  clipboard.on("success", function (e) {
    console.info("Action:", e.action);
    console.info("Text:", e.text);
    console.info("Trigger:", e.trigger);
    alert("Copied");
    e.clearSelection();
  });

  clipboard.on("error", function (e) {
    console.error("Action:", e.action);
    console.error("Trigger:", e.trigger);
    alert("failed to copy");
  });

  const handleTextInput = (e) => {
    const newValue = e.target.value.toUpperCase();
    const newLetter = newValue.slice(-1);
    animateLetter(newLetter);
    setInputValue(e.target.value);

    if (!currentInterval.current) {
      currentInterval.current = setInterval(() => {
        setSeconds((seconds) => seconds - 1);
      }, 1000);
    }
  };

  useEffect(() => {
    // This effect does something every time `seconds` changes and has specific logic for when `seconds` becomes 0.

    if (seconds === 0) {
      gameEndRef.current.style.display = "block";
      gamePartContainer.current.style.display = "none";
      clearInterval(currentInterval.current); // Assuming this clears an interval correctly set elsewhere.
      currentInterval.current = null;
      setSeconds(0);
      setIsGameOver(true);
      const jsConfetti = new JSConfetti();

      jsConfetti.addConfetti();

      // Set a timeout and save its reference to be able to clear it later.
      setTimeout(() => {
        jsConfetti.clearCanvas();
      }, 5000);
    }
  }, [seconds]);

  useEffect(() => {
    if (verfiedWordsContainerRef.current) {
      const scrollWidth = verfiedWordsContainerRef.current.scrollWidth;
      const clientWidth = verfiedWordsContainerRef.current.clientWidth;
      const maxScrollLeft = scrollWidth - clientWidth;

      // Using scrollTo with behavior: 'smooth' for smooth scrolling
      verfiedWordsContainerRef.current.scrollTo({
        left: maxScrollLeft,
        behavior: "smooth",
      });
    }
  }, [verifiedWords]);

  const handleWordCheck = async (e) => {
    if (e.key === "Enter") {
      const newWord = inputValue.trim().toUpperCase();
      const currentlastLetter = newWord[newWord.length - 1];

      const wordStartsWithPreviousLetter =
        wordStartsWithPreviousEndingLetter(newWord);
      const validEnglishWord = await isValidEnglishWord(newWord);

      const doc = nlp(newWord);
      let baseForm = doc.verbs().toInfinitive().out("text");

      if (baseForm === "") {
        baseForm = newWord;
      }

      if (verifiedWords.includes(newWord)) {
        setToastError(`The word '${newWord}' is already used`);
        toastErrorRef.current.style.display = "block";
        return;
      }

      if (verifiedBaseWords.includes(baseForm)) {
        setToastError("Not allowed to enter different tense of same word");
        toastErrorRef.current.style.display = "block";
        return;
      }

      if (!wordStartsWithPreviousLetter && verifiedWords.length != 0) {
        setToastError(`The word is not starting with letter '${lastLetter}'`);
        toastErrorRef.current.style.display = "block";
        return;
      }
      if (!validEnglishWord) {
        setToastError(`${newWord} is not a valid English word`);
        toastErrorRef.current.style.display = "block";
        return;
      }

      const timeTakenToGuessTheWord = 15 - seconds;
      toastErrorRef.current.style.display = "none";
      setVerifiedWords([...verifiedWords, newWord]);
      setVerifiedBaseWords([...verifiedBaseWords, baseForm]);
      setWordShouldStartWith(currentlastLetter);
      calculateScore(timeTakenToGuessTheWord);
      clearInterval(currentInterval.current);
      currentInterval.current = setInterval(() => {
        setSeconds((seconds) => seconds - 1);
      }, 1000);
      setLastLetter(currentlastLetter);
      addTime(timeTakenToGuessTheWord);
      setSeconds(15);
      setInputValue("");
    }
  };

  function calculateScore(actualTime) {
    const baseScorePerWord = 10; // Base score for each word guessed correctly
    const timeBonusMultiplier = 0.2; // Multiplier for the time bonus to adjust scoring sensitivity

    // Calculate score for this guess
    const scoreForThisWord =
      baseScorePerWord + actualTime * timeBonusMultiplier;

    // Calculate cumulative bonus: increasing the score slightly with each word guessed
    const cumulativeBonus = verifiedWords.length * 0.5;

    // Calculate total score for this word, including cumulative bonus
    const totalScore = Math.round(scoreForThisWord + cumulativeBonus);

    setScore((score) => score + totalScore);
  }

  const addTime = (timeTakenToGuessTheWord) => {
    setTotalTime((totalTime) => totalTime + timeTakenToGuessTheWord);
  };

  const wordStartsWithPreviousEndingLetter = (word) => {
    const startingLetter = word[0];

    if (startingLetter === wordShouldStartWith) {
      return true;
    }

    return false;
  };

  const isValidEnglishWord = async (word) => {
    try {
      const response = await axios.get(
        `https://api.dictionaryapi.dev/api/v2/entries/en/${word}`
      );
      // If the request is successful and we get a response, the word is valid.
      // Note: You might want to add additional checks based on the API response structure.
      return true;
    } catch (error) {
      // If the API returns an error (e.g., 404), the word might not be valid.
      // Check the specific error code or response to make sure.
      if (error.response && error.response.status === 404) {
        return false;
      } else {
        return false;
      }
    }
  };

  const animateLetter = (letter) => {
    const letterEl = document.createElement("span");
    letterEl.textContent = letter;
    letterEl.className = styles.word; // Use the CSS module for styling
    const colors = [
      "#005F8B",
      "#D4512B",
      "#D4512B",
      "#E7A05D",
      "#FDAB60",
      "#D8C655",
      "white",
    ]; // Color array

    // Select a random color for the letter
    const color = colors[Math.floor(Math.random() * colors.length)];
    letterEl.style.color = color;

    // Generate a random starting position within the viewport bounds
    const startX = Math.random() * (window.innerWidth - 100); // Subtract some px to prevent overflow
    let startY = Math.random() * (window.innerHeight - 100); // Subtract some px to prevent overflow

    // Apply initial position
    letterEl.style.left = `${startX}px`;
    letterEl.style.top = `${startY}px`;

    // Generate a random rotation between -45 and 45 degrees
    const rotation = (Math.random() - 0.5) * 90; // Random rotation
    letterEl.style.transform = `rotate(${rotation}deg)`;

    document.body.appendChild(letterEl);

    // Animate the letter
    let opacity = 1;
    const fallSpeed = 1 + Math.random(); // Randomize fall speed slightly

    const animationStep = () => {
      startY += fallSpeed; // Increment position to make the letter fall
      opacity -= 0.01; // Adjust for a slower fade-out speed
      letterEl.style.top = `${startY}px`;
      letterEl.style.opacity = opacity;

      // Remove the letter when it's no longer visible or has reached the bottom of the screen
      if (opacity <= 0 || startY > window.innerHeight) {
        document.body.removeChild(letterEl); // Cleanup
      } else {
        requestAnimationFrame(animationStep);
      }
    };
    requestAnimationFrame(animationStep);
  };

  const handleRestartGame = () => {
    setIsGameOver(false);
    setSeconds(15);
    gamePartContainer.current.style.display = "block";
    gameEndRef.current.style.display = "none";
    setTotalTime(0);
    setVerifiedWords([]);
    setVerifiedBaseWords([]);
    setScore(0);
  };

  const handleShareScore = () => {
    const clipboard = new ClipboardJS(shareScoreBtnRef.current, {
      text: () =>
        `I chained ${verifiedWords.length} word in ${totalTime} seconds on Word Chain! https://wordchain.app/`,
    });

    clipboard.on("success", (e) => {
      shareScoreBtnRef.current.innerText = "Score Copied";
      e.clearSelection();
      clipboard.destroy();
    });

    clipboard.on("error", (e) => {
      clipboard.destroy();
    });
  };

  useEffect(() => {
    const interval = setInterval(() => {
      // Directly access the input's current value
      let currentValue = inputRef.current.value;
      if (currentValue !== inputValue) {
        setInputValue(currentValue); // Update state if the value has changed
      }
    }, 50); // Check every 50 milliseconds

    return () => clearInterval(interval); // Cleanup interval on component unmount
  }, [inputValue]);

  return (
    <div className={styles.gameWrapper}>
      <div className={styles.gameInfosWrapper}>
        <div className={styles.gameInfoContainer}>
          <p className={styles.infoHeader}>Word count</p>
          <p className={styles.infoValue}>{verifiedWords.length}</p>
        </div>
        {!isGameOver ? (
          <div className={styles.gameInfoContainer}>
            <p className={styles.infoHeader}>Time</p>
            <p className={`${styles.infoValue} ${styles.secondsValue}`}>
              {seconds}
              <span className={styles.seconds}>s</span>
            </p>
          </div>
        ) : (
          <div className={styles.gameInfoContainer}>
            <p className={styles.infoHeader}>Time</p>
            <p className={`${styles.infoValue} ${styles.secondsValue}`}>
              {totalTime}
              <span className={styles.seconds}>s</span>
            </p>
          </div>
        )}

        <div className={styles.gameInfoContainer}>
          <p className={styles.infoHeader}>Score</p>
          <p className={styles.infoValue}>{score}</p>
        </div>
      </div>
      <div className={styles.gameEndWrapper} ref={gameEndRef}>
        <div className={styles.gameEndContainer}>
          <button className={styles.playAgainBtn} onClick={handleRestartGame}>
            Play again
          </button>
          <button
            className={styles.shareMyScoreBtn}
            onClick={handleShareScore}
            ref={shareScoreBtnRef}
          >
            Share my score
          </button>
        </div>
      </div>

      <div ref={gamePartContainer} className={styles.gameInputWrapper}>
        <div ref={toastErrorRef} className={styles.errorToastWrapper}>
          <div className={styles.errorToastContainer}>
            <p>{toastError}</p>
          </div>
        </div>
        <div className={styles.toastContainer} ref={generalToastRef}>
          {verifiedWords.length === 0 ? (
            <p>To play, enter a word</p>
          ) : (
            <p>
              Next word must start with letter <b>{lastLetter}</b>
            </p>
          )}
        </div>
        <input
          type="text"
          className={styles.gameInput}
          onChange={handleTextInput}
          onKeyDown={handleWordCheck}
          value={inputValue}
          ref={inputRef}
          autoComplete="off"
        />

        <div
          className={styles.wordsEnteredContainer}
          ref={verfiedWordsContainerRef}
        >
          {verifiedWords.map((word) => (
            <p className={styles.acceptedWord} key={word}>
              {word}
            </p>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Game;
