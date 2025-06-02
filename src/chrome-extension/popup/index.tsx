import { useState, useEffect } from "react";
import "../global.css";

export const Popup = () => {
  const [hasApiKey, setHasApiKey] = useState(false);
  const [hasModelImage, setHasModelImage] = useState(false);

  useEffect(() => {
    chrome.storage.local.get(["modelImageBase64", "fashnApiKey"], (result) => {
      console.log("Popup: Storage result:", result);
      console.log("Popup: Model image exists:", !!result.modelImageBase64);
      console.log("Popup: API key exists:", !!result.fashnApiKey);
      setHasApiKey(!!result.fashnApiKey);
      setHasModelImage(!!result.modelImageBase64);
    });
  }, []);

  const openOptions = () => {
    chrome.runtime.sendMessage({ action: "openOptions" });
  };

  const refreshStorageState = () => {
    chrome.storage.local.get(["modelImageBase64", "fashnApiKey"], (result) => {
      console.log("Popup: Manual refresh - Storage result:", result);
      setHasApiKey(!!result.fashnApiKey);
      setHasModelImage(!!result.modelImageBase64);
    });
  };

  const setupComplete = hasApiKey && hasModelImage;

  return (
    <div className="w-full h-full min-h-screen p-6" style={{ backgroundColor: '#FAFAFA' }}>
      <div className="text-center mb-6">
        <h1 className="text-2xl font-bold mb-2" style={{ color: '#1A1A1A' }}>
          FASHN AI Try-On
        </h1>
        <p style={{ color: '#333333' }} className="text-sm">Virtual fashion try-on for any website</p>
      </div>

      {setupComplete ? (
        <div className="text-center space-y-4">
          <div className="border p-4" style={{ backgroundColor: '#F0F9FF', borderColor: '#E0F2FE' }}>
            <div className="flex items-center justify-center space-x-2" style={{ color: '#0F766E' }}>
              <span className="text-xl">✅</span>
              <span className="font-medium text-base">Ready to use!</span>
            </div>
            <p className="text-sm mt-3" style={{ color: '#0D9488' }}>
              Hover over clothing images on any website to see the 👗 try-on button
            </p>
          </div>
          
          <button
            onClick={openOptions}
            className="w-full border py-3 px-4 text-sm font-medium transition-colors hover:opacity-80"
            style={{ 
              backgroundColor: '#FAFAFA', 
              borderColor: '#333333', 
              color: '#1A1A1A' 
            }}
          >
            Update Settings
          </button>
        </div>
      ) : (
        <div className="text-center space-y-4">
          <div className="border p-4" style={{ backgroundColor: '#FEF3C7', borderColor: '#FDE68A' }}>
            <div className="flex items-center justify-center space-x-2" style={{ color: '#92400E' }}>
              <span className="text-xl">⚠️</span>
              <span className="font-medium text-base">Setup Required</span>
            </div>
            <div className="text-sm mt-3 space-y-1" style={{ color: '#A16207' }}>
              {!hasModelImage && <div>• Upload your model image</div>}
              {!hasApiKey && <div>• Add your FASHN AI API key</div>}
            </div>
          </div>
          
          <button
            onClick={openOptions}
            className="w-full py-3 px-4 font-medium text-base transition-all hover:opacity-90"
            style={{ 
              backgroundColor: '#1A1A1A', 
              color: '#FAFAFA' 
            }}
          >
            Complete Setup
          </button>
        </div>
      )}

      <div className="mt-6 pt-4" style={{ borderTop: '1px solid #333333' }}>
        <div className="flex justify-between items-center mb-2">
          <p className="text-sm" style={{ color: '#333333' }}>
            Get your API key from{" "}
            <a 
              href="https://app.fashn.ai/api" 
              target="_blank" 
              rel="noopener noreferrer"
              className="underline hover:opacity-70"
              style={{ color: '#1A1A1A' }}
            >
              FASHN AI Settings
            </a>
          </p>
          <button
            onClick={refreshStorageState}
            className="text-xs px-2 py-1 border"
            style={{ 
              backgroundColor: '#FAFAFA', 
              borderColor: '#333333', 
              color: '#333333' 
            }}
            title="Refresh storage state"
          >
            🔄
          </button>
        </div>
      </div>
    </div>
  );
};
