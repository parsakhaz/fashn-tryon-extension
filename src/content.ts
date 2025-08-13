// src/content.ts
// Import styles if you have them in content.css and vite is configured
// import './content.css'; 

interface TryOnModalElement extends HTMLDivElement {
    contentDiv: HTMLDivElement;
    closeButton: HTMLButtonElement;
    lastGarmentImageUrl?: string;
    currentGarmentImageUrl?: string;
    show: (message: string, isError?: boolean, imageUrls?: string[] | string | null) => void;
    showLoading: (garmentImageUrl: string, modelImageUrls: string[], predictionIds?: string[]) => void;
    hide: () => void;
}

let tryOnModalInstance: TryOnModalElement | null = null;

function getTryOnModal(): TryOnModalElement {
    if (tryOnModalInstance) return tryOnModalInstance;

    const modal = document.createElement('div') as TryOnModalElement;
    modal.id = 'fashn-tryon-modal';
    // Styles are in content.css, applied by class name or ID
    modal.className = 'fashn-tryon-modal'; // Class for CSS styling

    const modalContentWrapper = document.createElement('div');
    modalContentWrapper.className = 'fashn-tryon-modal-content-wrapper';

    const closeButton = document.createElement('button');
    closeButton.textContent = '×';
    closeButton.className = 'fashn-tryon-modal-close';
    modal.closeButton = closeButton;

    const contentDiv = document.createElement('div');
    contentDiv.className = 'fashn-tryon-modal-actual-content';
    modal.contentDiv = contentDiv;

    modalContentWrapper.appendChild(closeButton);
    modalContentWrapper.appendChild(contentDiv);
    modal.appendChild(modalContentWrapper);
    document.body.appendChild(modal);

    modal.show = (message, isError = false, imageUrls = null) => {
        if (imageUrls) {
            // Handle multiple images or single image - always use carousel for consistency
            const images = Array.isArray(imageUrls) ? imageUrls : [imageUrls];
            
            // Always display with carousel for consistency and to include garment reference
            // Add class for targeted carousel styling
            modal.classList.add('fashn-modal-with-carousel');
            
            // Add garment image as reference if available
            const allImages = [...images];
            let hasReference = false;
            if (modal.currentGarmentImageUrl) {
                allImages.push(modal.currentGarmentImageUrl);
                hasReference = true;
            }
            
            modal.contentDiv.innerHTML = `
                <div class="fashn-tryon-result-container">
                    <div class="fashn-carousel-container">
                        <div class="fashn-carousel-header">
                            <h3>Your Try-On Results (${images.length}${hasReference ? ' + Reference' : ''})</h3>
                            <div class="fashn-carousel-counter">
                                <span id="current-image">1</span> / ${allImages.length}
                            </div>
                        </div>
                        <div class="fashn-carousel-wrapper">
                            <button class="fashn-carousel-btn fashn-carousel-prev" id="carousel-prev">‹</button>
                            <div class="fashn-carousel-images">
                                ${allImages.map((url, index) => {
                                    const isReference = hasReference && index === allImages.length - 1;
                                    return `
                                        <img src="${url}" 
                                             class="fashn-carousel-image ${index === 0 ? 'active' : ''}" 
                                             alt="${isReference ? 'Original Garment (Reference)' : `Try-On Result ${index + 1}`}"
                                             data-index="${index}"
                                             ${isReference ? 'data-is-reference="true"' : ''}/>
                                    `;
                                }).join('')}
                            </div>
                            <button class="fashn-carousel-btn fashn-carousel-next" id="carousel-next">›</button>
                        </div>
                        <div class="fashn-carousel-dots">
                            ${allImages.map((_, index) => {
                                const isReference = hasReference && index === allImages.length - 1;
                                return `
                                    <button class="fashn-carousel-dot ${index === 0 ? 'active' : ''}" 
                                            data-index="${index}"
                                            ${isReference ? 'data-is-reference="true" title="Original Garment"' : ''}></button>
                                `;
                            }).join('')}
                        </div>
                    </div>
                    <div class="fashn-tryon-result-buttons">
                        <button id="fashn-try-again-btn" class="fashn-result-button fashn-try-again-button">
                            🔄 Try Again
                        </button>
                        <button id="fashn-download-current-btn" class="fashn-result-button fashn-download-button">
                            💾 Download Current
                        </button>
                        <button id="fashn-download-all-btn" class="fashn-result-button fashn-download-all-button">
                            📥 Download All
                        </button>
                    </div>
                </div>
            `;
            
            // Setup carousel functionality with all images including reference
            setupCarousel(allImages, images.length);
            
            // Update lastGarmentImageUrl for "Try Again" functionality
            if (modal.currentGarmentImageUrl) {
                modal.lastGarmentImageUrl = modal.currentGarmentImageUrl;
            }
            
            // Add try again functionality
            const tryAgainBtn = modal.contentDiv.querySelector('#fashn-try-again-btn') as HTMLButtonElement;
            if (tryAgainBtn) {
                tryAgainBtn.onclick = () => {
                    modal.hide();
                    if (modal.lastGarmentImageUrl) {
                        const event = new CustomEvent('fashn-retry-tryon', { 
                            detail: { garmentImageUrl: modal.lastGarmentImageUrl } 
                        });
                        document.dispatchEvent(event);
                    }
                };
            }
        } else {
            // Remove carousel class for error/message display
            modal.classList.remove('fashn-modal-with-carousel');
            modal.contentDiv.innerHTML = `<p style="color: ${isError ? '#e53e3e' : '#2d3748'}; font-size: 1.1rem; padding: 20px;">${message}</p>`;
        }
        modal.style.display = 'flex';
    };

    modal.showLoading = (garmentImageUrl, modelImageUrls, predictionIds) => {
        // Remove carousel class for loading screen
        modal.classList.remove('fashn-modal-with-carousel');
        // Store garment image URL for later use in carousel
        modal.currentGarmentImageUrl = garmentImageUrl;
        
        const loadingHTML = `
            <div class="fashn-loading-container">
                <h3 class="fashn-loading-title">Creating Your Virtual Try-On Results</h3>
                <p class="fashn-loading-subtitle">Processing ${modelImageUrls.length} model image${modelImageUrls.length > 1 ? 's' : ''}</p>
                <div class="fashn-images-container">
                    <div class="fashn-image-section">
                        <div class="fashn-models-grid">
                            ${modelImageUrls.slice(0, 4).map((url, index) => `
                                <div class="fashn-model-wrapper">
                                    <img src="${url}" alt="Model ${index + 1}" class="fashn-loading-model-image" />
                                    <span class="fashn-model-number">${index + 1}</span>
                                </div>
                            `).join('')}
                        </div>
                        <p class="fashn-image-label">Your Models</p>
                    </div>
                    
                    <div class="fashn-loading-animation">
                        <div class="fashn-arrow-container">
                            <div class="fashn-arrow">→</div>
                            <div class="fashn-arrow">→</div>
                            <div class="fashn-arrow">→</div>
                        </div>
                    </div>
                    
                    <div class="fashn-image-section">
                        <div class="fashn-image-wrapper">
                            <img src="${garmentImageUrl}" alt="Selected Garment" class="fashn-loading-image" />
                        </div>
                        <p class="fashn-image-label">Selected Item</p>
                    </div>
                </div>
                <div class="fashn-progress-bar">
                    <div class="fashn-progress-fill"></div>
                </div>
                <p class="fashn-powered-by">powered by FASHN AI api</p>
                ${predictionIds && predictionIds.length > 0 ? 
                    `<p class="fashn-prediction-id">Processing ${predictionIds.length} job${predictionIds.length > 1 ? 's' : ''}</p>` : 
                    ''}
            </div>
        `;
        modal.contentDiv.innerHTML = loadingHTML;
        modal.style.display = 'flex';
    };

    modal.hide = () => {
        // Remove carousel class when hiding
        modal.classList.remove('fashn-modal-with-carousel');
        modal.style.display = 'none';
        modal.contentDiv.innerHTML = '';
    };

    closeButton.onclick = modal.hide;
    modal.onclick = (e) => {
        if (e.target === modal) modal.hide();
    };
    
    tryOnModalInstance = modal;
    return modal;
}

// Helper function to setup carousel functionality
function setupCarousel(images: string[], resultImagesCount?: number) {
    let currentIndex = 0;
    const totalResultImages = resultImagesCount || images.length;
    
    const updateCarousel = (newIndex: number) => {
        // Hide all images
        const allImages = document.querySelectorAll('.fashn-carousel-image');
        const allDots = document.querySelectorAll('.fashn-carousel-dot');
        
        allImages.forEach((img, index) => {
            (img as HTMLElement).classList.toggle('active', index === newIndex);
        });
        
        allDots.forEach((dot, index) => {
            (dot as HTMLElement).classList.toggle('active', index === newIndex);
        });
        
        // Update counter
        const counter = document.getElementById('current-image');
        if (counter) counter.textContent = (newIndex + 1).toString();
        
        currentIndex = newIndex;
    };
    
    // Previous button
    const prevBtn = document.getElementById('carousel-prev');
    if (prevBtn) {
        prevBtn.onclick = () => {
            const newIndex = currentIndex > 0 ? currentIndex - 1 : images.length - 1;
            updateCarousel(newIndex);
        };
    }
    
    // Next button
    const nextBtn = document.getElementById('carousel-next');
    if (nextBtn) {
        nextBtn.onclick = () => {
            const newIndex = currentIndex < images.length - 1 ? currentIndex + 1 : 0;
            updateCarousel(newIndex);
        };
    }
    
    // Dot buttons
    const dots = document.querySelectorAll('.fashn-carousel-dot');
    dots.forEach((dot, index) => {
        (dot as HTMLElement).onclick = () => updateCarousel(index);
    });
    
    // Download current image
    const downloadCurrentBtn = document.getElementById('fashn-download-current-btn') as HTMLButtonElement;
    if (downloadCurrentBtn) {
        downloadCurrentBtn.onclick = () => {
            downloadImage(images[currentIndex], downloadCurrentBtn);
        };
    }
    
    // Download all images
    const downloadAllBtn = document.getElementById('fashn-download-all-btn') as HTMLButtonElement;
    if (downloadAllBtn) {
        downloadAllBtn.onclick = async () => {
            downloadAllBtn.disabled = true;
            downloadAllBtn.innerHTML = '⏳ Downloading...';
            
            try {
                // Download all images including reference garment
                for (let i = 0; i < images.length; i++) {
                    const isReference = i >= totalResultImages;
                    const filename = isReference 
                        ? `fashn-original-garment-${Date.now()}.png`
                        : `fashn-tryon-result-${i + 1}-${Date.now()}.png`;
                    await downloadImage(images[i], null, filename);
                    await new Promise(resolve => setTimeout(resolve, 500)); // Small delay between downloads
                }
                downloadAllBtn.innerHTML = '✅ Downloaded All';
                setTimeout(() => {
                    downloadAllBtn.innerHTML = '📥 Download All';
                    downloadAllBtn.disabled = false;
                }, 2000);
            } catch (error) {
                console.error('Download all failed:', error);
                downloadAllBtn.innerHTML = '❌ Failed';
                setTimeout(() => {
                    downloadAllBtn.innerHTML = '📥 Download All';
                    downloadAllBtn.disabled = false;
                }, 2000);
            }
        };
    }
    
    // Keyboard navigation
    document.addEventListener('keydown', (e) => {
        if (document.getElementById('fashn-tryon-modal')?.style.display === 'flex') {
            if (e.key === 'ArrowLeft') {
                prevBtn?.click();
                e.preventDefault();
            } else if (e.key === 'ArrowRight') {
                nextBtn?.click();
                e.preventDefault();
            }
        }
    });
}

// Helper function to download an image
async function downloadImage(imageUrl: string, button: HTMLButtonElement | null, filename?: string): Promise<void> {
    try {
        if (button) {
            button.disabled = true;
            button.innerHTML = '⏳ Downloading...';
        }
        
        const response = await fetch(imageUrl);
        if (!response.ok) {
            throw new Error('Failed to fetch image');
        }
        
        const blob = await response.blob();
        const blobUrl = URL.createObjectURL(blob);
        
        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = filename || `fashn-tryon-result-${Date.now()}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        URL.revokeObjectURL(blobUrl);
        
        if (button) {
            button.disabled = false;
            button.innerHTML = '💾 Download';
        }
    } catch (error) {
        console.error('Download failed:', error);
        if (button) {
            button.disabled = false;
            button.innerHTML = '❌ Failed';
            setTimeout(() => {
                button.innerHTML = '💾 Download';
            }, 2000);
        }
        throw error;
    }
}

// Listen for results from the background script
chrome.runtime.onMessage.addListener((request) => {
    if (request.action === "tryOnResult") {
        const modal = getTryOnModal();
        if (request.error) {
            console.error("Content Script: Try-On Error from background:", request.error);
            modal.show(`Error: ${request.error}`, true);
        } else if (request.result && request.result.length > 0) {
            console.log("Content Script: Try-On Results from background:", request.result);
            modal.show("Try-on successful!", false, request.result);
        } else {
            modal.show('No result received or an unexpected issue occurred.', true);
        }
    }
    
    if (request.action === "modelSwapResult") {
        const modal = getTryOnModal();
        if (request.error) {
            console.error("Content Script: Model Swap Error from background:", request.error);
            modal.show(`Error: ${request.error}`, true);
        } else if (request.result && request.result.length > 0) {
            console.log("Content Script: Model Swap Results from background:", request.result);
            modal.show("Model swap successful!", false, request.result);
        } else {
            modal.show('No result received or an unexpected issue occurred.', true);
        }
    }
});

// Listen for retry try-on events
document.addEventListener('fashn-retry-tryon', async (event: Event) => {
    const customEvent = event as CustomEvent;
    const { garmentImageUrl } = customEvent.detail;
    
    // Get model images from storage
    let modelImageUrls: string[] = [];
    try {
        const result = await chrome.storage.local.get(['modelImagesBase64']);
        modelImageUrls = result.modelImagesBase64 || [];
    } catch (error) {
        console.error('Failed to get model images from storage:', error);
        return;
    }

    const modal = getTryOnModal();
    
    if (!garmentImageUrl || modelImageUrls.length === 0) {
        modal.show('Could not retry try-on. Missing image data.', true);
        return;
    }

    // Show loading screen and initiate new try-on
    modal.showLoading(garmentImageUrl, modelImageUrls);
    modal.lastGarmentImageUrl = garmentImageUrl;

    try {
        const initialResponse = await chrome.runtime.sendMessage({
            action: "initiateTryOn",
            garmentImageSrc: garmentImageUrl,
        });

        if (initialResponse && initialResponse.error) {
            modal.show(`Error: ${initialResponse.error}`, true);
        } else if (initialResponse && initialResponse.status === "processing") {
            modal.showLoading(garmentImageUrl, modelImageUrls, initialResponse.predictionIds);
        }
    } catch (error: unknown) {
        console.error("Content Script: Error retrying try-on:", error);
        const errorMessage = error instanceof Error ? error.message : String(error);
        modal.show(`Communication error with extension: ${errorMessage}`, true);
    }
});

// Helper function to extract image URL from various sources
function getImageUrl(element: Element): string | null {
    // Check if it's an img element
    if (element.tagName === 'IMG') {
        const img = element as HTMLImageElement;
        return img.src || img.dataset.src || img.dataset.original || null;
    }
    
    // Check for background image
    const computedStyle = window.getComputedStyle(element);
    const backgroundImage = computedStyle.backgroundImage;
    if (backgroundImage && backgroundImage !== 'none') {
        const match = backgroundImage.match(/url\(["']?(.*?)["']?\)/);
        if (match && match[1]) {
            return match[1];
        }
    }
    
    // Check common lazy loading attributes
    const dataAttrs = ['data-src', 'data-original', 'data-lazy', 'data-image', 'data-background'];
    for (const attr of dataAttrs) {
        const value = element.getAttribute(attr);
        if (value !== null && value !== '') return value;
    }
    
    return null;
}

// Helper function to check if element is likely a product image
function isLikelyProductImage(element: Element): boolean {
    const rect = element.getBoundingClientRect();
    
    // Check size - be more flexible with minimum size
    const minSize = 80; // Reduced from 100
    if (rect.width < minSize || rect.height < minSize) {
        return false;
    }
    
    // Check if element or ancestors have product-related classes/attributes
    const productIndicators = [
        'product', 'item', 'clothing', 'apparel', 'fashion', 'outfit',
        'dress', 'shirt', 'pant', 'jacket', 'shoe', 'garment',
        'thumbnail', 'gallery', 'hero', 'main', 'primary'
    ];
    
    let currentElement: Element | null = element;
    for (let i = 0; i < 3 && currentElement; i++) { // Check element and 2 ancestors
        const className = currentElement.className.toLowerCase();
        const id = currentElement.id.toLowerCase();
        
        for (const indicator of productIndicators) {
            if (className.includes(indicator) || id.includes(indicator)) {
                return true;
            }
        }
        currentElement = currentElement.parentElement;
    }
    
    // If no specific indicators found, check if it's reasonably sized (might be a product image)
    return rect.width >= 120 && rect.height >= 120;
}

function addTryOnButtonToElement(element: Element, imageUrl: string) {
    const htmlElement = element as HTMLElement;
    if (htmlElement.dataset.fashnButtonAdded === 'true') return;
    if (element.closest('#fashn-tryon-modal')) return; // Don't add to our own modal images

    // Create try-on button
    const tryOnButton = document.createElement('button');
    tryOnButton.innerHTML = '👗'; // Dress emoji
    tryOnButton.title = 'Virtual Try-On with FASHN AI';
    tryOnButton.className = 'fashn-tryon-button'; // Class for CSS styling

    // Create model swap button
    const modelSwapButton = document.createElement('button');
    modelSwapButton.innerHTML = '🔄'; // Arrow emoji
    modelSwapButton.title = 'Model Swap with FASHN AI';
    modelSwapButton.className = 'fashn-model-swap-button'; // Class for CSS styling

    const wrapper = document.createElement('div');
    wrapper.className = 'fashn-buttons-wrapper';
    
    // Position wrapper over the element
    const rect = element.getBoundingClientRect();
    wrapper.style.left = `${rect.left + window.scrollX}px`;
    wrapper.style.top = `${rect.top + window.scrollY}px`;
    wrapper.style.width = `${rect.width}px`;
    wrapper.style.height = `${rect.height}px`;

    wrapper.appendChild(tryOnButton);
    wrapper.appendChild(modelSwapButton);
    document.body.appendChild(wrapper);
    htmlElement.dataset.fashnButtonAdded = 'true';

    // Try-on button click handler
    tryOnButton.onclick = async (e) => {
        e.stopPropagation();
        e.preventDefault();

        // Get model images from storage first
        let modelImageUrls: string[] = [];
        try {
            const result = await chrome.storage.local.get(['modelImagesBase64']);
            modelImageUrls = result.modelImagesBase64 || [];
        } catch (error) {
            console.error('Failed to get model images from storage:', error);
        }

        const modal = getTryOnModal();
        
        if (!imageUrl) {
            modal.show('Could not get image source.', true);
            return;
        }

        if (modelImageUrls.length === 0) {
            const modal = getTryOnModal();
            modal.contentDiv.innerHTML = `
                <div style="padding: 20px; text-align: center;">
                    <h3 style="color: #1A1A1A; margin-bottom: 16px;">Setup Required</h3>
                    <p style="color: #333333; margin-bottom: 20px;">You need to upload a model image first to use virtual try-on.</p>
                    <button id="fashn-open-options" style="
                        background: #1A1A1A;
                        color: #FAFAFA;
                        border: none;
                        padding: 12px 24px;
                        border-radius: 8px;
                        font-size: 16px;
                        font-weight: bold;
                        cursor: pointer;
                        margin-right: 10px;
                        transition: opacity 0.2s;
                    " onmouseover="this.style.opacity='0.9'" onmouseout="this.style.opacity='1'">Open Settings</button>
                    <button id="fashn-cancel-setup" style="
                        background: #FAFAFA;
                        color: #333333;
                        border: 1px solid #333333;
                        padding: 12px 24px;
                        border-radius: 8px;
                        font-size: 16px;
                        cursor: pointer;
                        transition: opacity 0.2s;
                    " onmouseover="this.style.opacity='0.8'" onmouseout="this.style.opacity='1'">Cancel</button>
                </div>
            `;
            modal.style.display = 'flex';
            
            // Add event listeners
            const openOptionsBtn = modal.contentDiv.querySelector('#fashn-open-options') as HTMLButtonElement;
            const cancelBtn = modal.contentDiv.querySelector('#fashn-cancel-setup') as HTMLButtonElement;
            
            if (openOptionsBtn) {
                openOptionsBtn.onclick = () => {
                    chrome.runtime.sendMessage({ action: "openOptions" });
                    modal.hide();
                };
            }
            
            if (cancelBtn) {
                cancelBtn.onclick = () => modal.hide();
            }
            
            return;
        }

        // Show the new visual loading screen
        modal.showLoading(imageUrl, modelImageUrls);

        // Store the garment URL for the "Try Again" functionality
        modal.lastGarmentImageUrl = imageUrl;

        try {
            // This initial response is just an acknowledgement or quick error.
            // The actual result will come via chrome.tabs.sendMessage from background.
            const initialResponse = await chrome.runtime.sendMessage({
                action: "initiateTryOn",
                garmentImageSrc: imageUrl,
            });

            if (initialResponse && initialResponse.error) {
                 modal.show(`Error: ${initialResponse.error}`, true);
            } else if (initialResponse && initialResponse.status === "processing") {
                // Update loading screen with prediction ID
                modal.showLoading(imageUrl, modelImageUrls, initialResponse.predictionIds);
            }
            // Else: background script will send a message with the final result or error
        } catch (error: unknown) {
            console.error("Content Script: Error sending message to background:", error);
            const errorMessage = error instanceof Error ? error.message : String(error);
            modal.show(`Communication error with extension: ${errorMessage}`, true);
        }
    };

    // Model swap button click handler
    modelSwapButton.onclick = async (e) => {
        e.stopPropagation();
        e.preventDefault();

        // Get model images from storage first
        let modelImageUrls: string[] = [];
        try {
            const result = await chrome.storage.local.get(['modelImagesBase64']);
            modelImageUrls = result.modelImagesBase64 || [];
        } catch (error) {
            console.error('Failed to get model images from storage:', error);
        }

        const modal = getTryOnModal();
        
        if (!imageUrl) {
            modal.show('Could not get image source.', true);
            return;
        }

        if (modelImageUrls.length === 0) {
            const modal = getTryOnModal();
            modal.contentDiv.innerHTML = `
                <div style="padding: 20px; text-align: center;">
                    <h3 style="color: #1A1A1A; margin-bottom: 16px;">Setup Required</h3>
                    <p style="color: #333333; margin-bottom: 20px;">You need to upload a model image first to use model swap.</p>
                    <button id="fashn-open-options" style="
                        background: #1A1A1A;
                        color: #FAFAFA;
                        border: none;
                        padding: 12px 24px;
                        border-radius: 8px;
                        font-size: 16px;
                        font-weight: bold;
                        cursor: pointer;
                        margin-right: 10px;
                        transition: opacity 0.2s;
                    " onmouseover="this.style.opacity='0.9'" onmouseout="this.style.opacity='1'">Open Settings</button>
                    <button id="fashn-cancel-setup" style="
                        background: #FAFAFA;
                        color: #333333;
                        border: 1px solid #333333;
                        padding: 12px 24px;
                        border-radius: 8px;
                        font-size: 16px;
                        cursor: pointer;
                        transition: opacity 0.2s;
                    " onmouseover="this.style.opacity='0.8'" onmouseout="this.style.opacity='1'">Cancel</button>
                </div>
            `;
            modal.style.display = 'flex';
            
            // Add event listeners
            const openOptionsBtn = modal.contentDiv.querySelector('#fashn-open-options') as HTMLButtonElement;
            const cancelBtn = modal.contentDiv.querySelector('#fashn-cancel-setup') as HTMLButtonElement;
            
            if (openOptionsBtn) {
                openOptionsBtn.onclick = () => {
                    chrome.runtime.sendMessage({ action: "openOptions" });
                    modal.hide();
                };
            }
            
            if (cancelBtn) {
                cancelBtn.onclick = () => modal.hide();
            }
            
            return;
        }

        // Show the loading screen for model swap
        modal.showLoading(imageUrl, modelImageUrls);

        // Store the fashion model URL for potential retry functionality
        modal.lastGarmentImageUrl = imageUrl;

        try {
            // Send model swap request to background script
            const initialResponse = await chrome.runtime.sendMessage({
                action: "initiateModelSwap",
                fashionModelImageSrc: imageUrl,
            });

            if (initialResponse && initialResponse.error) {
                 modal.show(`Error: ${initialResponse.error}`, true);
            } else if (initialResponse && initialResponse.status === "processing") {
                // Update loading screen with prediction IDs
                modal.showLoading(imageUrl, modelImageUrls, initialResponse.predictionIds);
            }
            // Else: background script will send a message with the final result or error
        } catch (error: unknown) {
            console.error("Content Script: Error sending model swap message to background:", error);
            const errorMessage = error instanceof Error ? error.message : String(error);
            modal.show(`Communication error with extension: ${errorMessage}`, true);
        }
    };

    // Keep button positioned with element (simple version)
    const updateButtonPosition = () => {
        if (!document.body.contains(element) || !document.body.contains(wrapper)) {
            if(document.body.contains(wrapper)) wrapper.remove();
            if(intervalId) clearInterval(intervalId); // Clean up interval
            return;
        }
        const newRect = element.getBoundingClientRect();
        wrapper.style.left = `${newRect.left + window.scrollX}px`;
        wrapper.style.top = `${newRect.top + window.scrollY}px`;
        wrapper.style.width = `${newRect.width}px`;
        wrapper.style.height = `${newRect.height}px`;
    };
    // Periodically check position. For production, use ResizeObserver and IntersectionObserver.
    const intervalId = setInterval(updateButtonPosition, 500);

    // Show button on element hover
    element.addEventListener('mouseenter', () => wrapper.style.opacity = '1');
    wrapper.addEventListener('mouseenter', () => wrapper.style.opacity = '1');
    // Hide button when mouse leaves element AND button wrapper
    let leaveTimeout: ReturnType<typeof setTimeout>;
    const onMouseLeave = () => {
        leaveTimeout = setTimeout(() => {
            wrapper.style.opacity = '0';
        }, 100);
    };
    element.addEventListener('mouseleave', onMouseLeave);
    wrapper.addEventListener('mouseleave', onMouseLeave);
    wrapper.addEventListener('mouseenter', () => clearTimeout(leaveTimeout)); // Cancel hide if mouse enters button
}

function scanForImages() {
    // Scan regular img elements
    document.querySelectorAll('img').forEach(img => {
        if ((img as HTMLElement).dataset.fashnButtonAdded === 'true') return;
        
        const imageUrl = getImageUrl(img);
        if (!imageUrl) return;
        
        // Check if image is loaded or if we should add listener
        if ((img.complete && img.naturalWidth > 0) || img.src) {
            if (isLikelyProductImage(img)) {
                addTryOnButtonToElement(img, imageUrl);
            }
        } else {
            img.onload = () => {
                if (isLikelyProductImage(img)) {
                    addTryOnButtonToElement(img, imageUrl);
                }
            };
        }
    });
    
    // Scan elements with background images
    const elementsWithBackgrounds = document.querySelectorAll('div, section, article, figure, span');
    elementsWithBackgrounds.forEach(element => {
        if ((element as HTMLElement).dataset.fashnButtonAdded === 'true') return;
        
        const imageUrl = getImageUrl(element);
        if (imageUrl && isLikelyProductImage(element)) {
            addTryOnButtonToElement(element, imageUrl);
        }
    });
}

// Initial scan
scanForImages();

// Observe for new images loaded dynamically
const observer = new MutationObserver((mutations) => {
    let shouldScan = false;
    
    mutations.forEach((mutation) => {
        if (mutation.type === 'childList') {
            mutation.addedNodes.forEach((node) => {
                if (node.nodeType === Node.ELEMENT_NODE) {
                    const element = node as Element;
                    // Check if the added node is an image or contains images
                    if (element.tagName === 'IMG' || element.querySelector('img') || 
                        getImageUrl(element) || element.querySelector('[style*="background-image"]')) {
                        shouldScan = true;
                    }
                }
            });
        } else if (mutation.type === 'attributes') {
            // Check if attribute changes might affect images
            if (mutation.attributeName === 'src' || 
                mutation.attributeName === 'data-src' ||
                mutation.attributeName === 'style' ||
                mutation.attributeName?.startsWith('data-')) {
                shouldScan = true;
            }
        }
    });
    
    if (shouldScan) {
        // Debounce scanning to avoid too frequent updates
        setTimeout(scanForImages, 500);
    }
});

observer.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['src', 'data-src', 'data-original', 'data-lazy', 'style', 'class']
});

console.log("FASHN AI Try-On content script initialized with universal image detection."); 