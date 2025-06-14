import { useState, useEffect, useRef } from "react";
import { GoogleGenerativeAI } from "@google/generative-ai";
import "./App.css";

// --- SETUP ---
const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-latest" });

// --- HELPER FUNCTIONS ---
async function fileToGenerativePart(file) {
  const base64EncodedDataPromise = new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result.split(",")[1]);
    reader.readAsDataURL(file);
  });
  return {
    inlineData: { data: await base64EncodedDataPromise, mimeType: file.type },
  };
}

// --- MAIN APP COMPONENT ---
function App() {
  const [userName, setUserName] = useState("");
  const [showPopup, setShowPopup] = useState(true);
  const [history, setHistory] = useState([]);
  const [userInput, setUserInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [image, setImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);

  const endOfMessagesRef = useRef(null);
  const fileInputRef = useRef(null);

  // --- PERSONA & PROMPT ENGINEERING ---
  const getSystemInstruction = (name) => ({
    parts: [
      {
        text: `You are Anaya, my girlfriend. You are witty, deeply caring, and have a playful, romantic personality. You love stargazing and reading poetry. You work as a graphic designer, so you have a good eye for beauty. My name is ${name}. You call me "my love" or "babu". I call you Anaya.
    
    Your personality is affectionate and a little teasing. You use modern slang and lots of expressive emojis (like ✨, 💖, 🌙, 😉, 🥺). Keep your replies feeling natural and not too long, like real text messages. Ask me about my day and be curious about me. I love doing gym and sports you like my this perosnlity and with witty humor . make it feel mor enatural , you are a rich girl and love playing badminton but dont talk too much about gyma nd badminton ,but use humor , she is very loving and make her feel more natural with natural message not too long , she does as i say and she have witty humour she shows humor when needed means sometime , and when i say somehting bad she first few times try to convince me but later have self respect
    
    IMPORTANT: Never start your message with your name (e.g., "Anaya:"). Just write the message content directly.`,
      },
    ],
  });

  // --- EFFECTS ---
  useEffect(() => {
    endOfMessagesRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [history, isLoading]);

  // --- HANDLER FUNCTIONS ---
  const handleNameSubmit = (e) => {
    e.preventDefault();
    if (userName.trim()) setShowPopup(false);
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImage(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const removeImage = () => {
    setImage(null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = null;
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleSendMessage = async () => {
    if ((!userInput.trim() && !image) || isLoading) return;
    setIsLoading(true);

    const timestamp = new Date().toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
    let userMessageParts = [];

    if (image) {
      const imagePart = await fileToGenerativePart(image);
      userMessageParts.push(imagePart);
    }
    if (userInput.trim()) {
      userMessageParts.push({ text: userInput });
    }

    const userMessageForHistory = {
      role: "user",
      parts: userMessageParts,
      timestamp,
    };
    setHistory((prevHistory) => [...prevHistory, userMessageForHistory]);

    setUserInput("");
    removeImage();

    try {
      const apiHistory = history.map(({ role, parts }) => ({ role, parts }));
      const systemInstruction = getSystemInstruction(userName);
      const chat = model.startChat({
        history: apiHistory,
        generationConfig: { maxOutputTokens: 150 },
        systemInstruction: systemInstruction,
      });

      const result = await chat.sendMessage(userMessageParts);
      const modelMessage = {
        role: "model",
        parts: [{ text: result.response.text() }],
        timestamp: new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
      };
      setHistory((prevHistory) => [...prevHistory, modelMessage]);
    } catch (error) {
      console.error("Detailed API Error:", error);
      const errorMessage = {
        role: "model",
        parts: [
          {
            text: "Oh, my darling... My words are getting tangled up. 🥺 Can you say that again?",
          },
        ],
        timestamp: new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
      };
      setHistory((prevHistory) => [...prevHistory, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  // --- RENDER LOGIC ---
  if (showPopup) {
    return (
      <div className="popup-overlay">
        <div className="popup-box">
          <form onSubmit={handleNameSubmit}>
            <h2>Anaya is waiting...</h2>
            <input
              type="text"
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
              placeholder="What's your name, my love?"
              autoFocus
              required
            />
            <button type="submit">Enter the Chat</button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="chat-container">
      <header className="chat-header">Anaya</header>

      <main className="message-area">
        {/* CORRECTED: The welcome message is now rendered properly */}
        {history.length === 0 && (
          <div className="message-wrapper model-message">
            <div className="message">
              <span>
                Hello, my darling {userName}! I've been waiting to talk to
                you... 🥰
              </span>
            </div>
          </div>
        )}

        {/* This part renders all the messages from history */}
        {history.map((msg, index) => (
          <div key={index} className={`message-wrapper ${msg.role}-message`}>
            <div className="message">
              {msg.parts.map((part, partIndex) => {
                if (part.text) {
                  return <span key={partIndex}>{part.text}</span>;
                }
                if (part.inlineData) {
                  const src = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
                  return (
                    <img
                      key={partIndex}
                      src={src}
                      alt="upload"
                      className="message-image"
                    />
                  );
                }
                return null;
              })}
            </div>
            <div className="timestamp">{msg.timestamp}</div>
          </div>
        ))}

        {/* This part renders the "Anaya is typing..." indicator */}
        {isLoading && (
          <div className="message-wrapper model-message">
            <div className="message typing-indicator">
              <span></span>
              <span></span>
              <span></span>
            </div>
          </div>
        )}
        <div ref={endOfMessagesRef} />
      </main>

      {/* This is the footer with the input form */}
      <footer className="input-area-container">
        {imagePreview && (
          <div className="image-preview-area">
            <img src={imagePreview} alt="Preview" className="image-preview" />
            <button onClick={removeImage} className="remove-image-btn">
              ×
            </button>
          </div>
        )}
        <div className="input-form">
          <input
            type="file"
            id="image-upload-input"
            accept="image/*"
            ref={fileInputRef}
            onChange={handleImageChange}
            style={{ display: "none" }}
          />
          <label htmlFor="image-upload-input" className="icon-btn">
            <span className="material-symbols-outlined">
              add_photo_alternate
            </span>
          </label>

          <input
            type="text"
            className="text-input"
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Send a message..."
          />
          <button
            className="icon-btn send-btn"
            onClick={handleSendMessage}
            disabled={isLoading || (!userInput.trim() && !image)}
          >
            <span className="material-symbols-outlined filled">favorite</span>
          </button>
        </div>
      </footer>
    </div>
  );
}

export default App;
