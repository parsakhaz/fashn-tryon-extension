# 👗 FASHN AI Try-On & Model Swap Chrome Extension

A Chrome extension that enables virtual fashion try-on and model swap using FASHN AI. Hover over fashion images on any website to: (1) try garments on your uploaded model images, or (2) swap the model’s identity while preserving the outfit.

## 🎥 Demo

See the extension in action:
| Try-On Button | Loading Screen | Result |
|---|---|---|
| ![Setup](image1.png) | ![Button](image2.png) | ![Result](image3.png) |

*Hover over clothing images on any website to activate the virtual try-on feature*


## ✨ Features

### 🎯 Core Functionality
- **Virtual Try-On (👗)**: Hover over clothing images to try the garment on your uploaded model images
- **Model Swap (🔄)**: Transform the identity of a fashion model while preserving clothing and pose (no uploaded model images required)
- **Multi-Model Support**: Upload up to 4 model images; try-on runs in parallel and produces multiple results
- **Variations**: Generate subtle or strong variations of a result with undo/redo history
- **Real-time Processing**: Progress tracking with prediction IDs
- **Universal Compatibility**: Works on most e-commerce and fashion sites
- **High-Quality Results**: Powered by FASHN AI

### 🎨 User Interface
- **Modern Design**: Clean, sharp rectangular design with Metrophobic typography
- **Action Buttons**: 👗 for try-on, 🔄 for model swap appear on hover
- **Loading Screen**: Animated arrows and progress bar with job count
- **Carousel Results**: Navigate multiple results; includes original garment/reference
- **Result Actions**: Try/Swap Again, Download Current, Download All
- **Variation Controls**: In-modal buttons for ✨ Subtle and ✨ Strong; per-slide undo/redo

### 🔧 Configuration
- **Multi-Model Upload**: Upload up to 4 model images (max 5MB each; PNG/JPEG/WebP) for try-on
- **API Key Management**: Store your FASHN AI API key locally in Chrome storage
- **Settings Panel**: Options page for try-on models, model swap, and variation settings
- **Storage Persistence**: Settings persist across sessions

### 🛠️ Technical Features
- **Fast Development**: Built with Vite, React, TypeScript, and Tailwind CSS
- **Manifest V3**: Latest Chrome extension standard
- **CORS Handling**: Robust image fetching and blob-based downloads
- **Error Handling**: Comprehensive error messages and retry mechanisms
- **Debug Support**: Built-in console logging for troubleshooting

## 🚀 Installation

### Prerequisites
- Node.js and npm installed
- FASHN AI API key from [FASHN AI Settings](https://app.fashn.ai/api)

### Setup Steps

1. **Clone the repository:**
   ```bash
   git clone https://github.com/parsakhaz/fashn-tryon-extension
   cd fashn-tryon-extension
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. Optional: **Run local preview for development** (hot reload UI):
   ```bash
   npm run dev
   ```
   - The dev server opens `popup-local.html`. Use the navbar to switch to `options-local.html`.
   - This preview is for the popup/options UI only. Content scripts require building and loading the unpacked extension.

4. **Build the extension:**
   ```bash
   npm run build
   ```

4. **Load in Chrome:**
   - Open `chrome://extensions/` in your browser
   - Enable `Developer mode`
   - Click `Load unpacked` and select the `dist` folder

## ⚙️ Configuration

### First-Time Setup
1. Click the extension icon to open the popup
2. Click "Open Settings" to open the options page
3. Enter your FASHN AI API key (required)
4. For try-on: optionally upload up to 4 model images (max 5MB each)
5. Save your settings

### Getting Your API Key
1. Visit [FASHN AI Settings](https://app.fashn.ai/api)
2. Create an account or log in
3. Generate your API key (format: `fa-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`)
4. Copy and paste it into the extension options

## 🎮 How to Use

1. **Navigate** to any fashion or e-commerce website
2. **Hover** over images to reveal actions:
   - 👗 Try-On: adds the garment to your uploaded model images (needs uploaded model images)
   - 🔄 Model Swap: transforms the model’s identity while preserving clothing (no uploads required)
3. **Wait** for processing (typically 30–90s); progress shows in the modal
4. **Review results** in the carousel. Use:
   - 🔄 Try/Swap Again
   - 💾 Download Current or 📥 Download All
   - ✨ Subtle / ✨ Strong to create variations; use ↶ Undo and ↷ Redo per slide

## 🏗️ Development

### Project Structure
```
src/
├── chrome-extension/
│   ├── popup/           # Extension popup UI
│   ├── options/         # Settings page
│   ├── global.css       # Global styles with Metrophobic font
│   └── manifest.json    # Extension manifest
├── content.ts           # Content script for try-on, model swap, and variations UI
├── content.css          # Styles for try-on UI
└── background.ts        # Background service worker
```

Build outputs are written to `dist/` with entry files named `popup.js`, `options.js`, `background.js`, `content.js`, plus copied assets (`manifest.json`, icons, and `content.css`).

### Development Commands
```bash
# Start development server with hot reload
npm run dev

# Build for production
npm run build

# Type checking
npm run type-check
```

While `npm run dev` runs, open `http://localhost:5173/popup-local.html` (auto-opens) or `http://localhost:5173/options-local.html` to preview UI changes.

### Making Changes
1. Edit source files in the `src` directory
2. Run `npm run build` to compile changes
3. Go to `chrome://extensions/` and click refresh ⟳ on your extension
4. Test your changes

## 🎨 Design System

### Colors
- Primary: `#1A1A1A` (Dark)
- Secondary: `#333333` (Medium Gray)
- Background: `#FAFAFA` (Light Gray)
- Success: `#0F766E` (Teal)
- Warning: `#92400E` (Amber)

### Typography
- Font: **Metrophobic** (Clean, modern sans-serif)
- Consistent font weights and letter spacing throughout

### UI Elements
- **Sharp Design**: Rectangular elements with no border-radius (except try-on button)
- **Circular Try-On Button**: 50% border-radius for easy recognition
- **Consistent Spacing**: Tailwind CSS utility classes for spacing

## 🔧 Advanced Configuration

### Try-On
- Parameters are auto-set: `garment_photo_type=auto`, `category=auto`, `mode=balanced`, `num_samples=1`

### Model Swap (Options → Model Swap Settings)
- **Prompt**: Describe target identity (optional)
- **Background Change**: Allow background edits
- **Seed**: First run defaults to 42; leave blank for random thereafter; set a number to reproduce results
- **LoRA URL**: Optional FLUX-compatible `.safetensors` URL (<256MB) for custom identity

### Model Variation (Options → Model Variation Settings)
- **Strength**: Choose in the result modal (✨ Subtle/✨ Strong)
- **Seed**: First run defaults to 42; leave blank for random thereafter
- **LoRA URL**: Optional
- **Output Format**: `png` (default) or `jpeg`
- **Return Base64**: When enabled, API can return base64 data instead of URLs

### Storage
Stored locally via Chrome storage:
- `modelImagesBase64`: Uploaded model images (up to 4)
- `fashnApiKey`: Your FASHN AI API key
- Model swap and variation settings (prompt, background, seeds, LoRA URL, etc.)

## 🐛 Troubleshooting

### Common Issues

**Try-on button not appearing:**
- Make sure you're hovering over actual clothing images
- Check that the extension is enabled in Chrome
- Verify your model image and API key are set

**API errors:**
- Verify your API key is correct and active
- Check your FASHN AI account quota
- Ensure the image URLs are accessible

**Download not working:**
- The extension uses blob downloads to handle CORS
- Check browser permissions for file downloads

**Model swap not working:**
- Ensure your API key is set
- Some images may block fetching; try another image or page

**Variation buttons disabled:**
- They apply to the active result slide (not the garment/reference slide)

### Debug Mode
The extension includes console logging for debugging:
- Open Developer Tools (F12)
- Check the Console tab for detailed logs
- Look for messages prefixed with "Popup:", "Options:", "Content Script:", or "Background:"

### Permissions
- `storage`, `activeTab`, `scripting`
- Host permissions: `<all_urls>`, `https://api.fashn.ai/*`

### Privacy
- Your API key and settings are stored locally using Chrome storage and are not shared except to call the FASHN API.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Build and test the extension
5. Commit your changes (`git commit -m 'Add amazing feature'`)
6. Push to the branch (`git push origin feature/amazing-feature`)
7. Open a Pull Request

## 📄 License

This project is licensed under the MIT License.

## 🙏 Acknowledgments

- [FASHN AI](https://fashn.ai) for providing the virtual try-on API
- Built with modern web technologies: Vite, React, TypeScript, Tailwind CSS
- Chrome Extension Manifest V3 specifications

---

**Install the FASHN AI Try-On extension and try on clothes virtually before you buy!** 👗✨
