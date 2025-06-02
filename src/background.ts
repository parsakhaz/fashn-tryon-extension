const FASHN_ENDPOINT_URL = "https://api.fashn.ai/v1";

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function imageToDataURL(url: string): Promise<string> {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.status} ${response.statusText} from ${url}`);
    }
    const blob = await response.blob();
    // Check if blob type is an image type, otherwise reject
    if (!blob.type.startsWith('image/')) {
        throw new Error(`Fetched content is not an image: type ${blob.type} from ${url}`);
    }
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = (error) => reject(new Error(`FileReader error for ${url}: ${error}`));
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error(`Error in imageToDataURL for ${url}:`, error);
    throw error; // Re-throw to be caught by the caller
  }
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "openOptions") {
    chrome.runtime.openOptionsPage();
    return;
  }
  
  if (request.action === "initiateTryOn") {
    (async () => {
      try {
        const { garmentImageSrc } = request;
        console.log("Background: Received initiateTryOn for", garmentImageSrc);

        const { modelImageBase64, fashnApiKey } = await chrome.storage.local.get([
          "modelImageBase64",
          "fashnApiKey",
        ]);

        if (!modelImageBase64) {
          console.log("Background: Model image not set");
          sendResponse({ error: "Model image not set. Please set it in the extension options." });
          return;
        }
        if (!fashnApiKey) {
          console.log("Background: API Key not set");
          sendResponse({ error: "FASHN AI API Key not set. Please set it in the extension options." });
          return;
        }

        let garmentImageBase64;
        try {
            console.log("Background: Converting garment image to base64...");
            garmentImageBase64 = await imageToDataURL(garmentImageSrc);
            console.log("Background: Garment image converted.");
        } catch (e: unknown) {
            console.error("Background: Error fetching/converting garment image:", e);
            const errorMessage = e instanceof Error ? e.message : String(e);
            sendResponse({ error: `Failed to load garment image: ${errorMessage}` });
            return;
        }

        const apiPayload = {
          model_image: modelImageBase64,
          garment_image: garmentImageBase64,
          garment_photo_type: "auto",
          category: "auto",
          mode: "balanced",
          num_samples: 1,
        };

        const headers = {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${fashnApiKey}`,
        };

        console.log("Background: Sending request to FASHN API /run");
        const runResponse = await fetch(`${FASHN_ENDPOINT_URL}/run`, {
          method: "POST",
          headers,
          body: JSON.stringify(apiPayload),
        });

        if (!runResponse.ok) {
          let errorDetail = "Unknown error during API run.";
          try {
            const errorData = await runResponse.json();
            errorDetail = errorData.detail || runResponse.statusText;
          } catch {
            /* ignore if parsing fails */
          }
          
          console.error("Background: FASHN API /run error:", runResponse.status, errorDetail);
          if (runResponse.status === 401 || runResponse.status === 403) {
            sendResponse({ error: "Invalid or unauthorized API key. Please check your FASHN API key in options." });
          } else {
            sendResponse({ error: `API run failed: ${errorDetail}` });
          }
          return;
        }

        const runData = await runResponse.json();
        const predId = runData.id;
        console.log(`Background: Prediction ID: ${predId}`);

        if (!predId) {
          sendResponse({ error: "Failed to get prediction ID from FASHN API." });
          return;
        }
        
        sendResponse({ status: "processing", predictionId: predId }); // Send initial status back

        // Polling logic (no longer sending response from here directly to content script, content script will poll)
        // This part can be removed if content script handles polling.
        // For now, background will poll and content script just waits for final result.

        let statusData;
        const maxPollingTime = 180 * 1000; // 3 minutes
        const pollingInterval = 5 * 1000; // 5 seconds
        const startTime = Date.now();

        while (Date.now() - startTime < maxPollingTime) {
          await delay(pollingInterval);
          console.log(`Background: Polling status for ID: ${predId}`);
          const statusResponse = await fetch(`${FASHN_ENDPOINT_URL}/status/${predId}`, {
            method: "GET",
            headers,
          });

          if (!statusResponse.ok) {
            // Don't send error for failed poll, just log and retry
            console.error("Background: FASHN API /status poll error:", statusResponse.status);
            continue;
          }

          statusData = await statusResponse.json();
          console.log(`Background: Prediction status: ${statusData.status}`);

          if (statusData.status === "completed") {
            console.log("Background: Prediction completed.");
            // Send final result to the specific tab that made the request
            if (sender.tab && sender.tab.id) {
                 chrome.tabs.sendMessage(sender.tab.id, {
                    action: "tryOnResult",
                    result: statusData.output, // output is an array of URLs
                    originalGarmentSrc: garmentImageSrc // To identify which modal to update
                });
            }
            return; // Exit async IIFE
          } else if (statusData.status === "failed" || statusData.status === "error") {
            console.error(`Background: Prediction failed for ID ${predId}:`, statusData.error);
            if (sender.tab && sender.tab.id) {
                chrome.tabs.sendMessage(sender.tab.id, {
                    action: "tryOnResult",
                    error: `Prediction failed: ${statusData.error?.message || 'Unknown API error'}`,
                    originalGarmentSrc: garmentImageSrc
                });
            }
            return; // Exit async IIFE
          }
           // If still processing, content script is already showing "Processing..."
           // No need to send intermediate status updates unless explicitly designed for.
        }
        
        // If loop finishes, it's a timeout
        console.log("Background: Polling timeout for prediction ID:", predId);
        if (sender.tab && sender.tab.id) {
            chrome.tabs.sendMessage(sender.tab.id, {
                action: "tryOnResult",
                error: "Try-on request timed out after 3 minutes.",
                originalGarmentSrc: garmentImageSrc
            });
        }

      } catch (error: unknown) {
        console.error("Background: Error in 'initiateTryOn':", error);
        // Send error to the specific tab
        if (sender.tab && sender.tab.id) {
            const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred in the extension.";
            chrome.tabs.sendMessage(sender.tab.id, {
                action: "tryOnResult",
                error: errorMessage,
                originalGarmentSrc: request.garmentImageSrc // Use original request src
            });
        }
      }
    })();
    return true; // Crucial for sendResponse to be usable asynchronously
  }
});

chrome.runtime.onInstalled.addListener(() => {
  console.log("FASHN AI Try-On Extension Installed/Updated.");
}); 