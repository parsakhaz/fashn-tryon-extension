import { useState, useEffect, ChangeEvent } from "react";
import "../global.css";

const Options = () => {
  const [modelImages, setModelImages] = useState<string[]>([]);
  const [apiKey, setApiKey] = useState<string>("");
  const [statusMessage, setStatusMessage] = useState<string>("");
  const [errorMessage, setErrorMessage] = useState<string>("");
  
  // Model swap settings
  const [modelSwapPrompt, setModelSwapPrompt] = useState<string>("");
  const [modelSwapBackgroundChange, setModelSwapBackgroundChange] = useState<boolean>(false);
  const [modelSwapSeed, setModelSwapSeed] = useState<number | "">("");
  const [modelSwapLoraUrl, setModelSwapLoraUrl] = useState<string>("");

  // Variation settings (strength controlled via in-modal buttons; no dropdown here)
  const [variationSeed, setVariationSeed] = useState<number | "">("");
  const [variationLoraUrl, setVariationLoraUrl] = useState<string>("");
  const [variationOutputFormat, setVariationOutputFormat] = useState<"png" | "jpeg">("png");
  const [variationReturnBase64, setVariationReturnBase64] = useState<boolean>(false);

  useEffect(() => {
    chrome.storage.local.get([
      "modelImagesBase64", 
      "fashnApiKey", 
      "modelSwapPrompt", 
      "modelSwapBackgroundChange", 
      "modelSwapSeed", 
      "modelSwapLoraUrl",
      // variation
      "variationStrength",
      "variationSeed",
      "variationLoraUrl",
      "variationOutputFormat",
      "variationReturnBase64"
    ], (result) => {
      console.log("Options: Storage result:", result);
      console.log("Options: Model images exist:", !!result.modelImagesBase64);
      console.log("Options: API key exists:", !!result.fashnApiKey);
      if (result.modelImagesBase64 && Array.isArray(result.modelImagesBase64)) {
        setModelImages(result.modelImagesBase64);
      }
      if (result.fashnApiKey) {
        setApiKey(result.fashnApiKey);
      }
      // Load model swap settings
      if (result.modelSwapPrompt) {
        setModelSwapPrompt(result.modelSwapPrompt);
      }
      if (typeof result.modelSwapBackgroundChange === 'boolean') {
        setModelSwapBackgroundChange(result.modelSwapBackgroundChange);
      }
      if (typeof result.modelSwapSeed === 'number') {
        setModelSwapSeed(result.modelSwapSeed);
      } else {
        setModelSwapSeed("");
      }
      if (result.modelSwapLoraUrl) {
        setModelSwapLoraUrl(result.modelSwapLoraUrl);
      }
      // Load variation settings (no strength saved here)
      if (typeof result.variationSeed === 'number') {
        setVariationSeed(result.variationSeed);
      } else {
        setVariationSeed("");
      }
      if (typeof result.variationLoraUrl === 'string') {
        setVariationLoraUrl(result.variationLoraUrl);
      }
      if (result.variationOutputFormat === 'png' || result.variationOutputFormat === 'jpeg') {
        setVariationOutputFormat(result.variationOutputFormat);
      }
      if (typeof result.variationReturnBase64 === 'boolean') {
        setVariationReturnBase64(result.variationReturnBase64);
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
    const files = event.target.files;
    if (!files || files.length === 0) return;

    const newImages: string[] = [];
    let processedCount = 0;
    const totalFiles = Math.min(files.length, 4 - modelImages.length); // Limit to remaining slots

    if (totalFiles === 0) {
      showTemporaryMessage("You can only upload up to 4 images total.", true);
      return;
    }

    for (let i = 0; i < totalFiles; i++) {
      const file = files[i];
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        showTemporaryMessage(`Image ${file.name} exceeds 5MB limit.`, true);
        continue;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        newImages.push(base64String);
        processedCount++;

        if (processedCount === totalFiles) {
          const updatedImages = [...modelImages, ...newImages];
          setModelImages(updatedImages);
          chrome.storage.local.set({ modelImagesBase64: updatedImages }, () => {
            console.log("Options: Model images saved to storage successfully");
            showTemporaryMessage(`${newImages.length} image(s) added successfully!`);
          });
        }
      };
      reader.onerror = () => {
        showTemporaryMessage(`Failed to read image file: ${file.name}`, true);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = (index: number) => {
    const updatedImages = modelImages.filter((_, i) => i !== index);
    setModelImages(updatedImages);
    chrome.storage.local.set({ modelImagesBase64: updatedImages }, () => {
      showTemporaryMessage("Image removed successfully!");
    });
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

  const saveModelSwapSettings = () => {
    const settingsBase = {
      modelSwapPrompt: modelSwapPrompt.trim(),
      modelSwapBackgroundChange,
      modelSwapLoraUrl: modelSwapLoraUrl.trim()
    } as const;

    if (modelSwapSeed === "") {
      chrome.storage.local.remove("modelSwapSeed", () => {
        chrome.storage.local.set(settingsBase, () => {
          showTemporaryMessage("Model swap settings saved!");
        });
      });
    } else {
      chrome.storage.local.set({ ...settingsBase, modelSwapSeed }, () => {
        showTemporaryMessage("Model swap settings saved!");
      });
    }
  };

  const saveVariationSettings = () => {
    const settingsBase = {
      variationLoraUrl: variationLoraUrl.trim(),
      variationOutputFormat,
      variationReturnBase64,
    } as const;
    if (variationSeed === "") {
      chrome.storage.local.remove("variationSeed", () => {
        chrome.storage.local.set(settingsBase, () => {
          showTemporaryMessage("Model variation settings saved!");
        });
      });
    } else {
      chrome.storage.local.set({ ...settingsBase, variationSeed }, () => {
        showTemporaryMessage("Model variation settings saved!");
      });
    }
  };

  return (
    <div className="p-6 min-h-screen flex items-center justify-center" style={{ backgroundColor: '#FAFAFA' }}>
      <div className="max-w-4xl w-full p-8 shadow-2xl" style={{ backgroundColor: 'white' }}>
        <div className="text-center mb-10">
          <h1 className="text-4xl font-bold" style={{ color: '#1A1A1A' }}>
            Try-On Settings
          </h1>
          <p className="mt-2" style={{ color: '#333333' }}>Configure your virtual try-on experience with multiple model images.</p>
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
          <h2 className="text-2xl font-semibold mb-4" style={{ color: '#1A1A1A' }}>Your Model Images ({modelImages.length}/4)</h2>
          <p className="text-sm mb-4" style={{ color: '#333333' }}>
            Upload up to 4 clear, front-facing images of yourself or your preferred models. These images will be used for virtual try-on with multiple results. (Max 5MB each)
          </p>
          
          {modelImages.length < 4 && (
            <input
              type="file"
              accept="image/png, image/jpeg, image/webp"
              onChange={handleImageUpload}
              multiple
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
          )}
          
          {modelImages.length > 0 && (
            <div className="mt-6 p-4 border" style={{ backgroundColor: '#FAFAFA', borderColor: '#333333' }}>
              <p className="text-sm mb-4 font-medium" style={{ color: '#1A1A1A' }}>Current Model Images:</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {modelImages.map((image, index) => (
                  <div key={index} className="relative group">
                    <img 
                      src={image} 
                      alt={`Model ${index + 1}`} 
                      className="w-full h-48 object-cover shadow-lg" 
                    />
                    <button
                      onClick={() => removeImage(index)}
                      className="absolute top-2 right-2 w-6 h-6 bg-red-500 text-white rounded-full text-xs opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                      title="Remove image"
                    >
                      ×
                    </button>
                    <p className="text-center text-xs mt-2" style={{ color: '#666666' }}>
                      Model {index + 1}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div>
          <h2 className="text-2xl font-semibold mb-4" style={{ color: '#1A1A1A' }}>FASHN AI API Key</h2>
          <p className="text-sm mb-4" style={{ color: '#333333' }}>
            Enter your API key from FASHN AI. This is required to enable both try-on and model swap features.
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
            className="w-full font-bold py-3 px-4 shadow-md hover:shadow-lg transition-all duration-200 ease-in-out transform hover:scale-105 hover:opacity-90 mb-10"
            style={{ 
              backgroundColor: '#1A1A1A', 
              color: '#FAFAFA' 
            }}
          >
            Save API Key
          </button>
        </div>

        <div>
          <h2 className="text-2xl font-semibold mb-4" style={{ color: '#1A1A1A' }}>Model Swap Settings</h2>
          <p className="text-sm mb-6" style={{ color: '#333333' }}>
            Configure model swap preferences. Model swap transforms the identity of fashion models while preserving clothing details.
          </p>
          
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: '#1A1A1A' }}>
                Transformation Prompt
              </label>
              <p className="text-xs mb-2" style={{ color: '#666666' }}>
                Describe the desired model identity (e.g., "Asian woman with blue hair", "tall man with beard"). Leave empty for random transformation.
              </p>
              <input
                type="text"
                value={modelSwapPrompt}
                onChange={(e) => setModelSwapPrompt(e.target.value)}
                placeholder="e.g., Asian woman with blue hair"
                className="w-full px-4 py-3 border shadow-sm focus:outline-none focus:ring-2 focus:border-transparent transition-shadow duration-150"
                style={{ 
                  borderColor: '#333333',
                  backgroundColor: '#FAFAFA',
                  color: '#1A1A1A'
                }}
              />
            </div>

            <div>
              <label className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  checked={modelSwapBackgroundChange}
                  onChange={(e) => setModelSwapBackgroundChange(e.target.checked)}
                  className="w-4 h-4 rounded focus:ring-2"
                  style={{ accentColor: '#1A1A1A' }}
                />
                <span className="text-sm font-medium" style={{ color: '#1A1A1A' }}>
                  Allow background changes
                </span>
              </label>
              <p className="text-xs mt-1 ml-7" style={{ color: '#666666' }}>
                When enabled, the background may be modified according to your prompt. When disabled, the original background is preserved.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: '#1A1A1A' }}>
                Seed Value
              </label>
              <p className="text-xs mb-2" style={{ color: '#666666' }}>
                Defaults to 42 on the first run. Leave blank to randomize thereafter, or set a value to reproduce results.
              </p>
              <input
                type="number"
                value={modelSwapSeed}
                onChange={(e) => {
                  const v = e.target.value;
                  if (v === "") {
                    setModelSwapSeed("");
                    return;
                  }
                  const parsed = parseInt(v, 10);
                  setModelSwapSeed(Number.isNaN(parsed) ? "" : parsed);
                }}
                min="0"
                max="4294967295"
                className="w-full px-4 py-3 border shadow-sm focus:outline-none focus:ring-2 focus:border-transparent transition-shadow duration-150"
                style={{ 
                  borderColor: '#333333',
                  backgroundColor: '#FAFAFA',
                  color: '#1A1A1A'
                }}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: '#1A1A1A' }}>
                LoRA URL (Optional)
              </label>
              <p className="text-xs mb-2" style={{ color: '#666666' }}>
                URL to FLUX-compatible LoRA weights (.safetensors) for custom identity generation. Must be under 256MB.
              </p>
              <input
                type="url"
                value={modelSwapLoraUrl}
                onChange={(e) => setModelSwapLoraUrl(e.target.value)}
                placeholder="https://example.com/custom_identity.safetensors"
                className="w-full px-4 py-3 border shadow-sm focus:outline-none focus:ring-2 focus:border-transparent transition-shadow duration-150"
                style={{ 
                  borderColor: '#333333',
                  backgroundColor: '#FAFAFA',
                  color: '#1A1A1A'
                }}
              />
            </div>
          </div>

          <button
            onClick={saveModelSwapSettings}
            className="w-full font-bold py-3 px-4 shadow-md hover:shadow-lg transition-all duration-200 ease-in-out transform hover:scale-105 hover:opacity-90 mt-6"
            style={{ 
              backgroundColor: '#1A1A1A', 
              color: '#FAFAFA' 
            }}
          >
            Save Model Swap Settings
          </button>
        </div>

        <div className="mt-10">
          <h2 className="text-2xl font-semibold mb-4" style={{ color: '#1A1A1A' }}>Model Variation Settings</h2>
          <p className="text-sm mb-6" style={{ color: '#333333' }}>
            Configure model variation. Variations create subtle or strong changes to the current result image while maintaining composition.
          </p>
          <div className="space-y-6">

            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: '#1A1A1A' }}>Seed Value</label>
              <p className="text-xs mb-2" style={{ color: '#666666' }}>
                Defaults to 42 on the first run. Leave blank to randomize thereafter, or set a value to reproduce results.
              </p>
              <input
                type="number"
                value={variationSeed}
                onChange={(e) => {
                  const v = e.target.value;
                  if (v === "") {
                    setVariationSeed("");
                    return;
                  }
                  const parsed = parseInt(v, 10);
                  setVariationSeed(Number.isNaN(parsed) ? "" : parsed);
                }}
                min="0"
                max="4294967295"
                className="w-full px-4 py-3 border shadow-sm focus:outline-none focus:ring-2 focus:border-transparent transition-shadow duration-150"
                style={{ borderColor: '#333333', backgroundColor: '#FAFAFA', color: '#1A1A1A' }}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: '#1A1A1A' }}>LoRA URL (Optional)</label>
              <input
                type="url"
                value={variationLoraUrl}
                onChange={(e) => setVariationLoraUrl(e.target.value)}
                placeholder="https://example.com/custom_identity.safetensors"
                className="w-full px-4 py-3 border shadow-sm focus:outline-none focus:ring-2 focus:border-transparent transition-shadow duration-150"
                style={{ borderColor: '#333333', backgroundColor: '#FAFAFA', color: '#1A1A1A' }}
              />
            </div>

            <details>
              <summary className="text-sm font-medium" style={{ color: '#1A1A1A', cursor: 'pointer' }}>Advanced</summary>
              <div className="mt-4 space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: '#1A1A1A' }}>Output Format</label>
                  <select
                    value={variationOutputFormat}
                    onChange={(e) => setVariationOutputFormat((e.target.value as 'png' | 'jpeg'))}
                    className="w-full px-4 py-3 border shadow-sm focus:outline-none focus:ring-2 focus:border-transparent transition-shadow duration-150"
                    style={{ borderColor: '#333333', backgroundColor: '#FAFAFA', color: '#1A1A1A' }}
                  >
                    <option value="png">PNG (highest quality)</option>
                    <option value="jpeg">JPEG (faster)</option>
                  </select>
                </div>
                <div className="flex items-center space-x-3">
                  <input
                    id="returnBase64"
                    type="checkbox"
                    checked={variationReturnBase64}
                    onChange={(e) => setVariationReturnBase64(e.target.checked)}
                    className="w-4 h-4 rounded focus:ring-2"
                    style={{ accentColor: '#1A1A1A' }}
                  />
                  <label htmlFor="returnBase64" className="text-sm" style={{ color: '#1A1A1A' }}>Return Base64 (enhanced privacy)</label>
                </div>
              </div>
            </details>

          </div>
          <button
            onClick={saveVariationSettings}
            className="w-full font-bold py-3 px-4 shadow-md hover:shadow-lg transition-all duration-200 ease-in-out transform hover:scale-105 hover:opacity-90 mt-6"
            style={{ backgroundColor: '#1A1A1A', color: '#FAFAFA' }}
          >
            Save Model Variation Settings
          </button>
        </div>
      </div>
    </div>
  );
};

export default Options;
