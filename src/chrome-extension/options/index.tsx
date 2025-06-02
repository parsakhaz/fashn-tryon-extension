import { useState, useEffect, ChangeEvent } from "react";
import "../global.css";

const Options = () => {
  const [modelImagePreview, setModelImagePreview] = useState<string | null>(null);
  const [apiKey, setApiKey] = useState<string>("");
  const [statusMessage, setStatusMessage] = useState<string>("");
  const [errorMessage, setErrorMessage] = useState<string>("");

  useEffect(() => {
    chrome.storage.local.get(["modelImageBase64", "fashnApiKey"], (result) => {
      console.log("Options: Storage result:", result);
      console.log("Options: Model image exists:", !!result.modelImageBase64);
      console.log("Options: API key exists:", !!result.fashnApiKey);
      if (result.modelImageBase64) {
        setModelImagePreview(result.modelImageBase64);
      }
      if (result.fashnApiKey) {
        setApiKey(result.fashnApiKey);
      }
    });
  }, []);

  const showTemporaryMessage = (msg: string, isError: boolean = false) => {
    if (isError) {
      setErrorMessage(msg);
      setStatusMessage("");
    } else {
      setStatusMessage(msg);
      setErrorMessage("");
    }
    setTimeout(() => {
      setStatusMessage("");
      setErrorMessage("");
    }, 3000);
  };

  const handleImageUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        showTemporaryMessage("Image size should not exceed 5MB.", true);
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        console.log("Options: Saving model image to storage. Length:", base64String.length);
        setModelImagePreview(base64String);
        chrome.storage.local.set({ modelImageBase64: base64String }, () => {
          console.log("Options: Model image saved to storage successfully");
          showTemporaryMessage("Model image saved!");
        });
      };
      reader.onerror = () => {
        showTemporaryMessage("Failed to read image file.", true);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleApiKeyChange = (event: ChangeEvent<HTMLInputElement>) => {
    setApiKey(event.target.value);
  };

  const saveApiKey = () => {
    if (!apiKey.trim()) {
      showTemporaryMessage("API Key cannot be empty.", true);
      return;
    }
    chrome.storage.local.set({ fashnApiKey: apiKey.trim() }, () => {
      showTemporaryMessage("API Key saved!");
    });
  };

  return (
    <div className="p-6 min-h-screen flex items-center justify-center" style={{ backgroundColor: '#FAFAFA' }}>
      <div className="max-w-xl w-full p-8 shadow-2xl" style={{ backgroundColor: 'white' }}>
        <div className="text-center mb-10">
          <h1 className="text-4xl font-bold" style={{ color: '#1A1A1A' }}>
            Try-On Settings
          </h1>
          <p className="mt-2" style={{ color: '#333333' }}>Configure your virtual try-on experience.</p>
        </div>

        {(statusMessage || errorMessage) && (
          <div className={`mb-6 p-4 text-sm font-medium ${
            errorMessage
              ? 'bg-red-100 text-red-700 border border-red-300'
              : 'bg-green-100 text-green-700 border border-green-300'
          }`}>
            {statusMessage || errorMessage}
          </div>
        )}

        <div className="mb-10">
          <h2 className="text-2xl font-semibold mb-4" style={{ color: '#1A1A1A' }}>Your Model Image</h2>
          <p className="text-sm mb-4" style={{ color: '#333333' }}>
            Upload a clear, front-facing image of yourself or your preferred model. This image will be used for the virtual try-on. (Max 5MB)
          </p>
          <input
            type="file"
            accept="image/png, image/jpeg, image/webp"
            onChange={handleImageUpload}
            className="block w-full text-sm border cursor-pointer
                       file:mr-4 file:py-3 file:px-6
                       file:border-0
                       file:text-sm file:font-semibold
                       hover:file:opacity-90 focus:outline-none focus:ring-2 focus:border-transparent"
            style={{ 
              backgroundColor: '#FAFAFA',
              borderColor: '#333333',
              color: '#1A1A1A'
            }}
          />
          {modelImagePreview && (
            <div className="mt-6 p-4 border text-center" style={{ backgroundColor: '#FAFAFA', borderColor: '#333333' }}>
              <p className="text-sm mb-3 font-medium" style={{ color: '#1A1A1A' }}>Current Model Preview:</p>
              <img src={modelImagePreview} alt="Model Preview" className="max-w-full max-h-80 shadow-lg mx-auto" />
            </div>
          )}
        </div>

        <div>
          <h2 className="text-2xl font-semibold mb-4" style={{ color: '#1A1A1A' }}>FASHN AI API Key</h2>
          <p className="text-sm mb-4" style={{ color: '#333333' }}>
            Enter your API key from FASHN AI. This is required to enable the try-on feature.
            You can get your key from <a href="https://app.fashn.ai/api" target="_blank" rel="noopener noreferrer" className="underline hover:opacity-70" style={{ color: '#1A1A1A' }}>FASHN AI Settings</a>.
          </p>
          <input
            type="password"
            value={apiKey}
            onChange={handleApiKeyChange}
            placeholder="fa-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
            className="w-full px-4 py-3 border shadow-sm focus:outline-none focus:ring-2 focus:border-transparent transition-shadow duration-150 mb-4"
            style={{ 
              borderColor: '#333333',
              backgroundColor: '#FAFAFA',
              color: '#1A1A1A'
            }}
          />
          <button
            onClick={saveApiKey}
            className="w-full font-bold py-3 px-4 shadow-md hover:shadow-lg transition-all duration-200 ease-in-out transform hover:scale-105 hover:opacity-90"
            style={{ 
              backgroundColor: '#1A1A1A', 
              color: '#FAFAFA' 
            }}
          >
            Save API Key
          </button>
        </div>
      </div>
    </div>
  );
};

export default Options;
