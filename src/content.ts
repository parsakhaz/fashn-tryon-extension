// src/content.ts
// Import styles if you have them in content.css and vite is configured
// import './content.css'; 

interface TryOnModalElement extends HTMLDivElement {
    contentDiv: HTMLDivElement;
    closeButton: HTMLButtonElement;
    show: (message: string, isError?: boolean, imageUrl?: string | null) => void;
    showLoading: (garmentImageUrl: string, modelImageUrl: string, predictionId?: string) => void;
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

    modal.show = (message, isError = false, imageUrl = null) => {
        if (imageUrl) {
            modal.contentDiv.innerHTML = `<img src="${imageUrl}" class="fashn-tryon-modal-image" alt="Try-On Result"/>`;
        } else {
            modal.contentDiv.innerHTML = `<p style="color: ${isError ? '#e53e3e' : '#2d3748'}; font-size: 1.1rem; padding: 20px;">${message}</p>`;
        }
        modal.style.display = 'flex';
    };

    modal.showLoading = (garmentImageUrl, modelImageUrl, predictionId) => {
        const loadingHTML = `
            <div class="fashn-loading-container">
                <h3 class="fashn-loading-title">Creating Your Virtual Try-On</h3>
                <div class="fashn-images-container">
                    <div class="fashn-image-section">
                        <div class="fashn-image-wrapper">
                            <img src="${modelImageUrl}" alt="Your Model" class="fashn-loading-image" />
                        </div>
                        <p class="fashn-image-label">Your Model</p>
                    </div>
                    
                    <div class="fashn-loading-animation">
                        <div class="fashn-arrow-container">
                            <div class="fashn-arrow">→</div>
                            <div class="fashn-arrow">→</div>
                            <div class="fashn-arrow">→</div>
                        </div>
                        <div class="fashn-ai-badge">
                            <span class="fashn-ai-text">FASHN AI</span>
                            <div class="fashn-spinner"></div>
                        </div>
                    </div>
                    
                    <div class="fashn-image-section">
                        <div class="fashn-image-wrapper">
                            <img src="${garmentImageUrl}" alt="Selected Garment" class="fashn-loading-image" />
                        </div>
                        <p class="fashn-image-label">Selected Item</p>
                    </div>
                </div>
                ${predictionId ? `<p class="fashn-prediction-id">Processing ID: ${predictionId}</p>` : ''}
                <div class="fashn-progress-bar">
                    <div class="fashn-progress-fill"></div>
                </div>
            </div>
        `;
        modal.contentDiv.innerHTML = loadingHTML;
        modal.style.display = 'flex';
    };

    modal.hide = () => {
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

// Listen for results from the background script
chrome.runtime.onMessage.addListener((request) => {
    if (request.action === "tryOnResult") {
        const modal = getTryOnModal();
        if (request.error) {
            console.error("Content Script: Try-On Error from background:", request.error);
            modal.show(`Error: ${request.error}`, true);
        } else if (request.result && request.result.length > 0) {
            console.log("Content Script: Try-On Result from background:", request.result[0]);
            modal.show("Try-on successful!", false, request.result[0]);
        } else {
            modal.show('No result received or an unexpected issue occurred.', true);
        }
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

    const button = document.createElement('button');
    button.innerHTML = '👗'; // Dress emoji
    button.title = 'Virtual Try-On with FASHN AI';
    button.className = 'fashn-tryon-button'; // Class for CSS styling

    const wrapper = document.createElement('div');
    wrapper.className = 'fashn-tryon-button-wrapper';
    
    // Position wrapper over the element
    const rect = element.getBoundingClientRect();
    wrapper.style.left = `${rect.left + window.scrollX}px`;
    wrapper.style.top = `${rect.top + window.scrollY}px`;
    wrapper.style.width = `${rect.width}px`;
    wrapper.style.height = `${rect.height}px`;

    wrapper.appendChild(button);
    document.body.appendChild(wrapper);
    htmlElement.dataset.fashnButtonAdded = 'true';

    button.onclick = async (e) => {
        e.stopPropagation();
        e.preventDefault();

        // Get model image from storage first
        let modelImageUrl = '';
        try {
            const result = await chrome.storage.local.get(['modelImageBase64']);
            modelImageUrl = result.modelImageBase64 || '';
        } catch (error) {
            console.error('Failed to get model image from storage:', error);
        }

        const modal = getTryOnModal();
        
        if (!imageUrl) {
            modal.show('Could not get image source.', true);
            return;
        }

        if (!modelImageUrl) {
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
        modal.showLoading(imageUrl, modelImageUrl);

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
                modal.showLoading(imageUrl, modelImageUrl, initialResponse.predictionId);
            }
            // Else: background script will send a message with the final result or error
        } catch (error: unknown) {
            console.error("Content Script: Error sending message to background:", error);
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