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

interface PredictionJob {
  id: string;
  modelImageIndex: number;
  completed: boolean;
  result?: string;
  error?: string;
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

        const { modelImagesBase64, fashnApiKey } = await chrome.storage.local.get([
          "modelImagesBase64",
          "fashnApiKey",
        ]);

        if (!modelImagesBase64 || !Array.isArray(modelImagesBase64) || modelImagesBase64.length === 0) {
          console.log("Background: Model images not set");
          sendResponse({ error: "Model images not set. Please set them in the extension options." });
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

        // Limit to 4 images max
        const imagesToProcess = modelImagesBase64.slice(0, 4);
        console.log(`Background: Processing ${imagesToProcess.length} model images`);

        const headers = {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${fashnApiKey}`,
        };

        // Create prediction jobs for each model image
        const predictionJobs: PredictionJob[] = [];

        // Send all API requests in parallel
        const runPromises = imagesToProcess.map(async (modelImage, index) => {
          const apiPayload = {
            model_image: modelImage,
            garment_image: garmentImageBase64,
            garment_photo_type: "auto",
            category: "auto",
            mode: "balanced",
            num_samples: 1,
          };

          console.log(`Background: Sending request ${index + 1}/${imagesToProcess.length} to FASHN API /run`);
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
            
            console.error(`Background: FASHN API /run error for image ${index + 1}:`, runResponse.status, errorDetail);
            throw new Error(`API run failed for image ${index + 1}: ${errorDetail}`);
          }

          const runData = await runResponse.json();
          const predId = runData.id;
          console.log(`Background: Prediction ID for image ${index + 1}: ${predId}`);

          if (!predId) {
            throw new Error(`Failed to get prediction ID for image ${index + 1} from FASHN API.`);
          }

          return {
            id: predId,
            modelImageIndex: index,
            completed: false
          } as PredictionJob;
        });

        // Wait for all initial API calls to complete
        try {
          const jobs = await Promise.all(runPromises);
          predictionJobs.push(...jobs);
          console.log(`Background: All ${jobs.length} prediction jobs initiated`);
        } catch (error) {
          console.error("Background: Error initiating prediction jobs:", error);
          const errorMessage = error instanceof Error ? error.message : String(error);
          if (errorMessage.includes("401") || errorMessage.includes("403") || errorMessage.includes("unauthorized")) {
            sendResponse({ error: "Invalid or unauthorized API key. Please check your FASHN API key in options." });
          } else {
            sendResponse({ error: errorMessage });
          }
          return;
        }
        
        sendResponse({ 
          status: "processing", 
          predictionIds: predictionJobs.map(job => job.id),
          totalJobs: predictionJobs.length
        }); // Send initial status back

        // Start polling all jobs with reasonable progressive intervals
        const maxPollingTime = 180 * 1000; // 3 minutes
        const startTime = Date.now();
        let pollCount = 0;

        while (Date.now() - startTime < maxPollingTime) {
          // Progressive polling: start reasonably fast, then slow down
          let pollingInterval;
          if (pollCount < 6) {
            pollingInterval = 2000; // 2 seconds for first 6 polls (first 12 seconds)
          } else if (pollCount < 12) {
            pollingInterval = 3000; // 3 seconds for next 6 polls (next 18 seconds)
          } else {
            pollingInterval = 5000; // 5 seconds after that (back to original for long-running)
          }
          
          await delay(pollingInterval);
          pollCount++;
          
          // Poll all incomplete jobs
          const incompleteJobs = predictionJobs.filter(job => !job.completed);
          if (incompleteJobs.length === 0) break; // All jobs completed

          console.log(`Background: Polling ${incompleteJobs.length} incomplete jobs (poll #${pollCount}, interval: ${pollingInterval}ms)`);

          const statusPromises = incompleteJobs.map(async (job) => {
            try {
              const statusResponse = await fetch(`${FASHN_ENDPOINT_URL}/status/${job.id}`, {
                method: "GET",
                headers,
              });

              if (!statusResponse.ok) {
                console.error(`Background: FASHN API /status poll error for job ${job.id}:`, statusResponse.status);
                return null; // Don't fail the entire batch for one failed poll
              }

              const statusData = await statusResponse.json();
              console.log(`Background: Job ${job.id} status: ${statusData.status}`);

              if (statusData.status === "completed") {
                job.completed = true;
                job.result = statusData.output?.[0]; // Take first result
                console.log(`Background: Job ${job.id} completed successfully`);
              } else if (statusData.status === "failed" || statusData.status === "error") {
                job.completed = true;
                job.error = statusData.error?.message || 'Unknown API error';
                console.error(`Background: Job ${job.id} failed:`, job.error);
              }

              return job;
            } catch (error) {
              console.error(`Background: Error polling job ${job.id}:`, error);
              return null;
            }
          });

          await Promise.all(statusPromises);
        }
        
        // Check if we finished due to timeout
        const incompletedJobs = predictionJobs.filter(job => !job.completed);
        if (incompletedJobs.length > 0) {
          console.log(`Background: Polling timeout. ${incompletedJobs.length} jobs still incomplete`);
          incompletedJobs.forEach(job => {
            job.completed = true;
            job.error = "Try-on request timed out after 3 minutes.";
          });
        }

        // Prepare results - filter out failed jobs and get successful results
        const successfulResults = predictionJobs
          .filter(job => job.result)
          .map(job => job.result);

        const failedJobs = predictionJobs.filter(job => job.error);

        console.log(`Background: Completed ${predictionJobs.length} jobs. ${successfulResults.length} successful, ${failedJobs.length} failed`);

        // Send final results to the specific tab
        if (sender.tab && sender.tab.id) {
          if (successfulResults.length > 0) {
            chrome.tabs.sendMessage(sender.tab.id, {
              action: "tryOnResult",
              result: successfulResults, // Array of result URLs
              originalGarmentSrc: garmentImageSrc,
              totalJobs: predictionJobs.length,
              successfulJobs: successfulResults.length
            });
          } else {
            // All jobs failed
            const firstError = failedJobs[0]?.error || "All try-on requests failed";
            chrome.tabs.sendMessage(sender.tab.id, {
              action: "tryOnResult",
              error: `All try-on requests failed. First error: ${firstError}`,
              originalGarmentSrc: garmentImageSrc
            });
          }
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

  if (request.action === "initiateModelSwap") {
    (async () => {
      try {
        const { fashionModelImageSrc } = request;
        console.log("Background: Received initiateModelSwap for", fashionModelImageSrc);

        const { 
          fashnApiKey, 
          modelSwapPrompt, 
          modelSwapBackgroundChange, 
          modelSwapSeed, 
          modelSwapLoraUrl 
        } = await chrome.storage.local.get([
          "fashnApiKey",
          "modelSwapPrompt",
          "modelSwapBackgroundChange", 
          "modelSwapSeed",
          "modelSwapLoraUrl"
        ]);
        if (!fashnApiKey) {
          console.log("Background: API Key not set");
          sendResponse({ error: "FASHN AI API Key not set. Please set it in the extension options." });
          return;
        }

        let fashionModelImageBase64;
        try {
            console.log("Background: Converting fashion model image to base64...");
            fashionModelImageBase64 = await imageToDataURL(fashionModelImageSrc);
            console.log("Background: Fashion model image converted.");
        } catch (e: unknown) {
            console.error("Background: Error fetching/converting fashion model image:", e);
            const errorMessage = e instanceof Error ? e.message : String(e);
            sendResponse({ error: `Failed to load fashion model image: ${errorMessage}` });
            return;
        }

        // Single request for model swap (no dependency on uploaded model images)
        console.log("Background: Processing single model swap request");

        const headers = {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${fashnApiKey}`,
        };

        // Create prediction jobs (single job for model swap)
        const predictionJobs: PredictionJob[] = [];

        // Build and send the single API request
        try {
          const apiPayload: {
            model_name: string;
            inputs: {
              model_image: string;
              prompt: string;
              background_change: boolean;
              seed: number;
              lora_url?: string;
            };
          } = {
            model_name: "model-swap",
            inputs: {
              model_image: fashionModelImageBase64,
              prompt: modelSwapPrompt || "",
              background_change: modelSwapBackgroundChange || false,
              seed: modelSwapSeed || 42
            }
          };

          if (modelSwapLoraUrl && modelSwapLoraUrl.trim()) {
            apiPayload.inputs.lora_url = modelSwapLoraUrl.trim();
          }

          console.log("Background: Sending single model swap request to FASHN API /run");
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
            console.error("Background: FASHN API /run error for model swap:", runResponse.status, errorDetail);
            throw new Error(`API run failed for model swap: ${errorDetail}`);
          }

          const runData = await runResponse.json();
          const predId = runData.id;
          console.log(`Background: Model swap prediction ID: ${predId}`);

          if (!predId) {
            throw new Error("Failed to get prediction ID for model swap from FASHN API.");
          }

          predictionJobs.push({
            id: predId,
            modelImageIndex: 0,
            completed: false
          });
        } catch (error) {
          console.error("Background: Error initiating model swap prediction job:", error);
          const errorMessage = error instanceof Error ? error.message : String(error);
          if (errorMessage.includes("401") || errorMessage.includes("403") || errorMessage.includes("unauthorized")) {
            sendResponse({ error: "Invalid or unauthorized API key. Please check your FASHN API key in options." });
          } else {
            sendResponse({ error: errorMessage });
          }
          return;
        }
        
        sendResponse({ 
          status: "processing", 
          predictionIds: predictionJobs.map(job => job.id),
          totalJobs: predictionJobs.length
        }); // Send initial status back

        // Start polling all jobs with reasonable progressive intervals
        const maxPollingTime = 180 * 1000; // 3 minutes
        const startTime = Date.now();
        let pollCount = 0;

        while (Date.now() - startTime < maxPollingTime) {
          // Progressive polling: start reasonably fast, then slow down
          let pollingInterval;
          if (pollCount < 6) {
            pollingInterval = 2000; // 2 seconds for first 6 polls (first 12 seconds)
          } else if (pollCount < 12) {
            pollingInterval = 3000; // 3 seconds for next 6 polls (next 18 seconds)
          } else {
            pollingInterval = 5000; // 5 seconds after that (back to original for long-running)
          }
          
          await delay(pollingInterval);
          pollCount++;
          
          // Poll all incomplete jobs
          const incompleteJobs = predictionJobs.filter(job => !job.completed);
          if (incompleteJobs.length === 0) break; // All jobs completed

          console.log(`Background: Polling ${incompleteJobs.length} incomplete model swap job(s) (poll #${pollCount}, interval: ${pollingInterval}ms)`);

          const statusPromises = incompleteJobs.map(async (job) => {
            try {
              const statusResponse = await fetch(`${FASHN_ENDPOINT_URL}/status/${job.id}`, {
                method: "GET",
                headers,
              });

              if (!statusResponse.ok) {
                console.error(`Background: FASHN API /status poll error for model swap job ${job.id}:`, statusResponse.status);
                return null; // Don't fail the entire batch for one failed poll
              }

              const statusData = await statusResponse.json();
              console.log(`Background: Model swap job ${job.id} status: ${statusData.status}`);

              if (statusData.status === "completed") {
                job.completed = true;
                job.result = statusData.output?.[0]; // Take first result
                console.log(`Background: Model swap job ${job.id} completed successfully`);
              } else if (statusData.status === "failed" || statusData.status === "error") {
                job.completed = true;
                job.error = statusData.error?.message || 'Unknown API error';
                console.error(`Background: Model swap job ${job.id} failed:`, job.error);
              }

              return job;
            } catch (error) {
              console.error(`Background: Error polling model swap job ${job.id}:`, error);
              return null;
            }
          });

          await Promise.all(statusPromises);
        }
        
        // Check if we finished due to timeout
        const incompletedJobs = predictionJobs.filter(job => !job.completed);
        if (incompletedJobs.length > 0) {
          console.log(`Background: Polling timeout. ${incompletedJobs.length} model swap jobs still incomplete`);
          incompletedJobs.forEach(job => {
            job.completed = true;
            job.error = "Model swap request timed out after 3 minutes.";
          });
        }

        // Prepare results - filter out failed jobs and get successful results
        const successfulResults = predictionJobs
          .filter(job => job.result)
          .map(job => job.result);

        const failedJobs = predictionJobs.filter(job => job.error);

        console.log(`Background: Completed ${predictionJobs.length} model swap jobs. ${successfulResults.length} successful, ${failedJobs.length} failed`);

        // Send final results to the specific tab
        if (sender.tab && sender.tab.id) {
          if (successfulResults.length > 0) {
            chrome.tabs.sendMessage(sender.tab.id, {
              action: "modelSwapResult",
              result: successfulResults, // Array of result URLs
              originalFashionModelSrc: fashionModelImageSrc,
              totalJobs: predictionJobs.length,
              successfulJobs: successfulResults.length
            });
          } else {
            // All jobs failed
            const firstError = failedJobs[0]?.error || "All model swap requests failed";
            chrome.tabs.sendMessage(sender.tab.id, {
              action: "modelSwapResult",
              error: `All model swap requests failed. First error: ${firstError}`,
              originalFashionModelSrc: fashionModelImageSrc
            });
          }
        }

      } catch (error: unknown) {
        console.error("Background: Error in 'initiateModelSwap':", error);
        // Send error to the specific tab
        if (sender.tab && sender.tab.id) {
            const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred in the extension.";
            chrome.tabs.sendMessage(sender.tab.id, {
                action: "modelSwapResult",
                error: errorMessage,
                originalFashionModelSrc: request.fashionModelImageSrc // Use original request src
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