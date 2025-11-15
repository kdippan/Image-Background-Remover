// AI Background Remover - Using MediaPipe Selfie Segmentation
// Production version with ImgBB API key integrated

// Global State
const state = {
    originalImage: null,
    processedBlob: null,
    currentBackground: 'transparent',
    imgbbApiKey: 'f1e285f7990c85b05f85900d9d10238d', // Your ImgBB API Key
    selfieSegmentation: null,
    libraryLoaded: false
};

// DOM Elements
const elements = {
    fileInput: document.getElementById('file-input'),
    uploadArea: document.querySelector('.upload-zone'),
    pasteBtn: document.getElementById('paste-btn'),
    themeToggle: document.getElementById('theme-toggle'),
    editorSection: document.getElementById('editor-section'),
    originalImage: document.getElementById('original-image'),
    processedImage: document.getElementById('processed-image'),
    removeBgBtn: document.getElementById('remove-bg-btn'),
    downloadBtn: document.getElementById('download-btn'),
    uploadImgbbBtn: document.getElementById('upload-imgbb-btn'),
    resetBtn: document.getElementById('reset-btn'),
    newImageBtn: document.getElementById('new-image-btn'),
    qualitySelect: document.getElementById('quality-select'),
    processingLoader: document.getElementById('processing-loader'),
    progressText: document.getElementById('progress-text'),
    uploadResult: document.getElementById('upload-result'),
    imgbbUrl: document.getElementById('imgbb-url'),
    copyUrlBtn: document.getElementById('copy-url-btn'),
    customBg: document.getElementById('custom-bg'),
    bgOptions: document.querySelectorAll('.bg-option'),
    toastContainer: document.getElementById('toast-container')
};

// Initialize App
async function init() {
    console.log('🚀 Initializing AI Background Remover...');
    initTheme();
    initEventListeners();
    initAnimations();
    registerServiceWorker();
    
    showToast('Loading AI model... Please wait', 'info');
    await loadMediaPipeLibrary();
}

// Load MediaPipe Selfie Segmentation
async function loadMediaPipeLibrary() {
    try {
        console.log('📦 Loading MediaPipe library...');
        
        // Load MediaPipe script
        await loadScript('https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation');
        
        // Wait for library initialization
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Check if library is loaded
        if (typeof SelfieSegmentation === 'undefined') {
            throw new Error('SelfieSegmentation not found');
        }
        
        console.log('✅ MediaPipe loaded! Initializing model...');
        
        // Initialize Selfie Segmentation
        state.selfieSegmentation = new SelfieSegmentation({
            locateFile: (file) => {
                return `https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation/${file}`;
            }
        });
        
        // Configure the model (1 = better quality, 0 = faster)
        state.selfieSegmentation.setOptions({
            modelSelection: 1,
            selfieMode: false
        });
        
        state.libraryLoaded = true;
        console.log('✅ Model ready!');
        showToast('AI Background Remover ready! 🎉', 'success');
        
        if (elements.removeBgBtn) {
            elements.removeBgBtn.disabled = false;
            elements.removeBgBtn.classList.remove('opacity-50');
        }
        
    } catch (error) {
        console.error('❌ Failed to load MediaPipe:', error);
        showToast('Failed to load AI model. Please refresh the page.', 'error');
        showFallbackInstructions();
    }
}

// Helper to load script dynamically
function loadScript(src) {
    return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = src;
        script.crossOrigin = 'anonymous';
        script.onload = resolve;
        script.onerror = () => reject(new Error(`Failed to load script: ${src}`));
        document.head.appendChild(script);
    });
}

// Show fallback instructions
function showFallbackInstructions() {
    const message = document.createElement('div');
    message.className = 'fixed top-20 left-1/2 transform -translate-x-1/2 bg-red-100 dark:bg-red-900 border-2 border-red-500 rounded-lg p-6 max-w-md z-50 shadow-2xl';
    message.innerHTML = `
        <h3 class="font-bold text-lg mb-2 text-red-800 dark:text-red-200">⚠️ Model Load Failed</h3>
        <p class="text-sm text-red-700 dark:text-red-300 mb-4">
            The AI model couldn't load. Common issues:
        </p>
        <ul class="list-disc list-inside text-sm text-red-700 dark:text-red-300 mb-4 space-y-1">
            <li>Slow/unstable internet connection</li>
            <li>Browser not supported (use Chrome/Edge)</li>
            <li>Ad blocker blocking CDN</li>
            <li>Network firewall restrictions</li>
        </ul>
        <div class="space-y-2">
            <button onclick="location.reload()" class="w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors">
                🔄 Reload Page
            </button>
            <button onclick="this.parentElement.parentElement.remove()" class="w-full px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors">
                Close
            </button>
        </div>
    `;
    document.body.appendChild(message);
}

// Theme Management
function initTheme() {
    const savedTheme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    if (savedTheme === 'dark' || (!savedTheme && prefersDark)) {
        document.documentElement.classList.add('dark');
    }
}

elements.themeToggle?.addEventListener('click', () => {
    document.documentElement.classList.toggle('dark');
    const isDark = document.documentElement.classList.contains('dark');
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
    showToast(isDark ? 'Dark mode enabled 🌙' : 'Light mode enabled ☀️', 'info');
});

// Event Listeners
function initEventListeners() {
    console.log('🔌 Setting up event listeners...');
    
    // File Upload - Click
    elements.uploadArea?.addEventListener('click', (e) => {
        if (e.target !== elements.fileInput) {
            elements.fileInput?.click();
        }
    });
    
    elements.fileInput?.addEventListener('change', handleFileSelect);
    
    // Drag and Drop
    const uploadZone = elements.uploadArea;
    if (uploadZone) {
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            uploadZone.addEventListener(eventName, preventDefaults, false);
            document.body.addEventListener(eventName, preventDefaults, false);
        });
        
        ['dragenter', 'dragover'].forEach(eventName => {
            uploadZone.addEventListener(eventName, () => {
                uploadZone.classList.add('drag-over');
            }, false);
        });
        
        ['dragleave', 'drop'].forEach(eventName => {
            uploadZone.addEventListener(eventName, () => {
                uploadZone.classList.remove('drag-over');
            }, false);
        });
        
        uploadZone.addEventListener('drop', handleDrop, false);
    }
    
    // Paste from Clipboard
    elements.pasteBtn?.addEventListener('click', handlePasteClick);
    document.addEventListener('paste', handlePaste);
    
    // Background Removal
    elements.removeBgBtn?.addEventListener('click', processBackgroundRemoval);
    
    // Download
    elements.downloadBtn?.addEventListener('click', downloadImage);
    
    // Upload to ImgBB
    elements.uploadImgbbBtn?.addEventListener('click', uploadToImgBB);
    
    // Copy URL
    elements.copyUrlBtn?.addEventListener('click', copyToClipboard);
    
    // Reset and New Image
    elements.resetBtn?.addEventListener('click', resetEditor);
    elements.newImageBtn?.addEventListener('click', () => {
        resetEditor();
        elements.editorSection?.classList.add('hidden');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });
    
    // Background Options
    elements.bgOptions?.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const bg = btn.getAttribute('data-bg');
            if (bg) changeBackground(bg);
        });
    });
    
    elements.customBg?.addEventListener('input', (e) => {
        changeBackground('custom', e.target.value);
    });
    
    // Keyboard Shortcuts
    document.addEventListener('keydown', handleKeyboardShortcuts);
    
    console.log('✅ Event listeners ready!');
}

function preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
}

// File Handling
function handleFileSelect(e) {
    const file = e.target.files?.[0];
    if (file) {
        console.log('📁 File selected:', file.name);
        processFile(file);
    }
}

function handleDrop(e) {
    console.log('📂 File dropped');
    const files = e.dataTransfer?.files;
    if (files && files.length > 0) {
        processFile(files[0]);
    }
}

function handlePasteClick() {
    navigator.clipboard.read().then(items => {
        for (const item of items) {
            for (const type of item.types) {
                if (type.startsWith('image/')) {
                    item.getType(type).then(blob => {
                        const file = new File([blob], 'pasted-image.png', { type });
                        processFile(file);
                    });
                    return;
                }
            }
        }
        showToast('No image found in clipboard', 'warning');
    }).catch(() => {
        showToast('Press Ctrl+V to paste an image', 'info');
    });
}

async function handlePaste(e) {
    console.log('📋 Paste event detected');
    const items = e.clipboardData?.items;
    if (!items) return;
    
    for (let item of items) {
        if (item.type.indexOf('image') !== -1) {
            const file = item.getAsFile();
            if (file) {
                processFile(file);
                break;
            }
        }
    }
}

// Process Uploaded File
function processFile(file) {
    console.log('🔍 Processing file:', file.name, file.type, file.size);
    
    // Validate file type
    const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
    const maxSize = 10 * 1024 * 1024; // 10MB
    
    if (!validTypes.includes(file.type)) {
        showToast('Please upload PNG, JPG, or WEBP image only', 'error');
        return;
    }
    
    if (file.size > maxSize) {
        showToast('File size must be less than 10MB', 'error');
        return;
    }
    
    // Read and display image
    const reader = new FileReader();
    reader.onload = (e) => {
        state.originalImage = e.target.result;
        elements.originalImage.src = e.target.result;
        elements.editorSection?.classList.remove('hidden');
        
        // Scroll to editor
        setTimeout(() => {
            elements.editorSection?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 100);
        
        // Reset processed image
        elements.processedImage.src = '';
        elements.processedImage.classList.add('hidden');
        elements.downloadBtn.disabled = true;
        elements.uploadImgbbBtn.disabled = true;
        state.processedBlob = null;
        elements.uploadResult?.classList.add('hidden');
        
        if (state.libraryLoaded) {
            showToast('Image uploaded! Click "Remove Background" to process 📸', 'success');
        } else {
            showToast('Image uploaded! Waiting for AI model to load...', 'warning');
        }
        
        console.log('✅ Image loaded and ready for processing');
    };
    
    reader.onerror = () => {
        showToast('Failed to read image file', 'error');
    };
    
    reader.readAsDataURL(file);
}

// Background Removal - MediaPipe Method
async function processBackgroundRemoval() {
    if (!state.originalImage) {
        showToast('Please upload an image first', 'error');
        return;
    }
    
    if (!state.libraryLoaded || !state.selfieSegmentation) {
        showToast('AI model not ready. Please wait or refresh the page...', 'error');
        return;
    }
    
    try {
        // Show loading UI
        elements.processingLoader?.classList.remove('hidden');
        elements.removeBgBtn.disabled = true;
        elements.removeBgBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Processing...';
        
        console.log('🎨 Starting background removal with MediaPipe...');
        
        // Update progress
        if (elements.progressText) {
            elements.progressText.textContent = '10%';
        }
        
        // Create image element
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.src = state.originalImage;
        
        // Wait for image to load
        await new Promise((resolve, reject) => {
            img.onload = resolve;
            img.onerror = () => reject(new Error('Failed to load image'));
        });
        
        if (elements.progressText) {
            elements.progressText.textContent = '30%';
        }
        
        // Create canvases
        const inputCanvas = document.createElement('canvas');
        const outputCanvas = document.createElement('canvas');
        inputCanvas.width = outputCanvas.width = img.width;
        inputCanvas.height = outputCanvas.height = img.height;
        
        const inputCtx = inputCanvas.getContext('2d');
        const outputCtx = outputCanvas.getContext('2d');
        
        // Draw original image on input canvas
        inputCtx.drawImage(img, 0, 0);
        
        if (elements.progressText) {
            elements.progressText.textContent = '50%';
        }
        
        // Process with MediaPipe
        await new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                reject(new Error('Processing timeout - image too large or complex'));
            }, 30000); // 30 second timeout
            
            state.selfieSegmentation.onResults((results) => {
                clearTimeout(timeout);
                
                try {
                    // Clear output canvas
                    outputCtx.clearRect(0, 0, outputCanvas.width, outputCanvas.height);
                    
                    // Draw the original image
                    outputCtx.drawImage(img, 0, 0, outputCanvas.width, outputCanvas.height);
                    
                    // Get image data
                    const imageData = outputCtx.getImageData(0, 0, outputCanvas.width, outputCanvas.height);
                    const pixels = imageData.data;
                    
                    // Create temporary canvas for mask
                    const maskCanvas = document.createElement('canvas');
                    maskCanvas.width = outputCanvas.width;
                    maskCanvas.height = outputCanvas.height;
                    const maskCtx = maskCanvas.getContext('2d');
                    
                    // Draw segmentation mask
                    maskCtx.drawImage(results.segmentationMask, 0, 0, maskCanvas.width, maskCanvas.height);
                    const maskData = maskCtx.getImageData(0, 0, maskCanvas.width, maskCanvas.height);
                    const maskPixels = maskData.data;
                    
                    // Apply mask to alpha channel
                    for (let i = 0; i < pixels.length; i += 4) {
                        const maskValue = maskPixels[i]; // Red channel of mask (grayscale)
                        pixels[i + 3] = maskValue; // Set alpha channel
                    }
                    
                    // Put modified image data back
                    outputCtx.putImageData(imageData, 0, 0);
                    
                    if (elements.progressText) {
                        elements.progressText.textContent = '90%';
                    }
                    
                    resolve();
                } catch (error) {
                    reject(error);
                }
            });
            
            // Send image to MediaPipe for processing
            state.selfieSegmentation.send({ image: inputCanvas })
                .catch(reject);
        });
        
        if (elements.progressText) {
            elements.progressText.textContent = '100%';
        }
        
        // Convert canvas to blob
        const blob = await new Promise(resolve => {
            outputCanvas.toBlob(resolve, 'image/png', 0.95);
        });
        
        // Store and display result
        state.processedBlob = blob;
        const url = URL.createObjectURL(blob);
        elements.processedImage.src = url;
        elements.processedImage.classList.remove('hidden');
        
        // Enable action buttons
        elements.downloadBtn.disabled = false;
        elements.uploadImgbbBtn.disabled = false;
        
        showToast('Background removed successfully! 🎉', 'success');
        console.log('✅ Background removal complete! Blob size:', blob.size);
        
    } catch (error) {
        console.error('❌ Error during background removal:', error);
        showToast(`Failed to remove background: ${error.message}`, 'error');
    } finally {
        // Hide loading UI
        elements.processingLoader?.classList.add('hidden');
        elements.removeBgBtn.disabled = false;
        elements.removeBgBtn.innerHTML = '<i class="fas fa-magic mr-2"></i>Remove Background';
    }
}

// Change Background Color
function changeBackground(type, color = null) {
    if (!state.processedBlob) return;
    
    console.log('🎨 Changing background to:', type, color);
    
    // Remove active state from all buttons
    elements.bgOptions.forEach(btn => btn.classList.remove('active'));
    
    const container = elements.processedImage.parentElement;
    container.classList.remove('bg-checkered');
    container.style.background = '';
    
    if (type === 'transparent') {
        container.classList.add('bg-checkered');
        document.querySelector('[data-bg="transparent"]')?.classList.add('active');
    } else if (type === 'white') {
        container.style.background = 'white';
        document.querySelector('[data-bg="white"]')?.classList.add('active');
    } else if (type === 'black') {
        container.style.background = 'black';
        document.querySelector('[data-bg="black"]')?.classList.add('active');
    } else if (type === 'custom' && color) {
        container.style.background = color;
        elements.customBg?.classList.add('active');
    }
    
    state.currentBackground = type;
}

// Download Image
function downloadImage() {
    if (!state.processedBlob) {
        showToast('No processed image to download', 'error');
        return;
    }
    
    console.log('💾 Downloading image...');
    
    const url = URL.createObjectURL(state.processedBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bg-removed-${Date.now()}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    showToast('Image downloaded successfully! 📥', 'success');
}

// Upload to ImgBB (Automatic with API key)
async function uploadToImgBB() {
    if (!state.processedBlob) {
        showToast('No processed image to upload', 'error');
        return;
    }
    
    try {
        console.log('☁️ Uploading to ImgBB...');
        
        elements.uploadImgbbBtn.disabled = true;
        elements.uploadImgbbBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Uploading...';
        
        // Convert blob to base64
        const reader = new FileReader();
        
        reader.onloadend = async () => {
            try {
                const base64 = reader.result.split(',')[1];
                
                const formData = new FormData();
                formData.append('image', base64);
                formData.append('name', `bg-removed-${Date.now()}`);
                
                const response = await fetch(`https://api.imgbb.com/1/upload?key=${state.imgbbApiKey}`, {
                    method: 'POST',
                    body: formData
                });
                
                const data = await response.json();
                
                if (data.success) {
                    elements.imgbbUrl.value = data.data.url;
                    elements.uploadResult?.classList.remove('hidden');
                    
                    // Scroll to result
                    elements.uploadResult?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                    
                    showToast('Image uploaded to cloud successfully! ☁️✨', 'success');
                    console.log('✅ Upload successful:', data.data.url);
                } else {
                    throw new Error(data.error?.message || 'Upload failed');
                }
            } catch (error) {
                console.error('❌ Upload error:', error);
                showToast('Failed to upload to ImgBB. Please try again.', 'error');
            } finally {
                elements.uploadImgbbBtn.disabled = false;
                elements.uploadImgbbBtn.innerHTML = '<i class="fas fa-cloud-upload-alt mr-2"></i>Upload to Cloud';
            }
        };
        
        reader.readAsDataURL(state.processedBlob);
        
    } catch (error) {
        console.error('❌ ImgBB upload error:', error);
        showToast('Failed to upload image', 'error');
        elements.uploadImgbbBtn.disabled = false;
        elements.uploadImgbbBtn.innerHTML = '<i class="fas fa-cloud-upload-alt mr-2"></i>Upload to Cloud';
    }
}

// Copy URL to Clipboard
async function copyToClipboard() {
    const url = elements.imgbbUrl?.value;
    if (!url) return;
    
    try {
        await navigator.clipboard.writeText(url);
        showToast('URL copied to clipboard! 📋', 'success');
        
        // Visual feedback
        elements.copyUrlBtn.innerHTML = '<i class="fas fa-check"></i>';
        setTimeout(() => {
            elements.copyUrlBtn.innerHTML = '<i class="fas fa-copy"></i>';
        }, 2000);
        
    } catch (err) {
        // Fallback for older browsers
        elements.imgbbUrl?.select();
        document.execCommand('copy');
        showToast('URL copied to clipboard! 📋', 'success');
    }
}

// Reset Editor
function resetEditor() {
    console.log('🔄 Resetting editor...');
    
    elements.processedImage.src = '';
    elements.processedImage.classList.add('hidden');
    elements.downloadBtn.disabled = true;
    elements.uploadImgbbBtn.disabled = true;
    elements.uploadResult?.classList.add('hidden');
    state.processedBlob = null;
    
    // Reset background to transparent
    const container = elements.processedImage.parentElement;
    container.classList.add('bg-checkered');
    container.style.background = '';
    elements.bgOptions.forEach(btn => btn.classList.remove('active'));
    document.querySelector('[data-bg="transparent"]')?.classList.add('active');
    
    showToast('Editor reset successfully', 'info');
}

// Toast Notifications
function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    const icons = {
        success: 'check-circle',
        error: 'exclamation-circle',
        warning: 'exclamation-triangle',
        info: 'info-circle'
    };
    
    const icon = icons[type] || 'info-circle';
    
    toast.innerHTML = `
        <i class="fas fa-${icon}"></i>
        <span>${message}</span>
    `;
    
    elements.toastContainer?.appendChild(toast);
    
    // Auto remove after 4 seconds
    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}

// Keyboard Shortcuts
function handleKeyboardShortcuts(e) {
    // Ctrl/Cmd + S: Download image
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        if (state.processedBlob) downloadImage();
    }
    
    // Ctrl/Cmd + U: Upload new image
    if ((e.ctrlKey || e.metaKey) && e.key === 'u') {
        e.preventDefault();
        elements.fileInput?.click();
    }
    
    // Ctrl/Cmd + R: Reset (prevent default page reload)
    if ((e.ctrlKey || e.metaKey) && e.key === 'r' && state.processedBlob) {
        e.preventDefault();
        resetEditor();
    }
    
    // Escape: Close upload result
    if (e.key === 'Escape') {
        elements.uploadResult?.classList.add('hidden');
    }
}

// GSAP Animations
function initAnimations() {
    if (typeof gsap === 'undefined') {
        console.warn('⚠️ GSAP not loaded, skipping animations');
        return;
    }
    
    console.log('✨ Initializing animations...');
    
    try {
        // Register ScrollTrigger if available
        if (typeof ScrollTrigger !== 'undefined') {
            gsap.registerPlugin(ScrollTrigger);
        }
        
        // Hero section animations
        gsap.from('#hero h2', {
            duration: 1,
            y: 50,
            opacity: 0,
            ease: 'power3.out'
        });
        
        gsap.from('#hero p', {
            duration: 1,
            y: 30,
            opacity: 0,
            delay: 0.2,
            ease: 'power3.out'
        });
        
        gsap.from('#upload-area', {
            duration: 1,
            scale: 0.9,
            opacity: 0,
            delay: 0.4,
            ease: 'back.out(1.7)'
        });
        
        // Feature cards animation with ScrollTrigger
        if (typeof ScrollTrigger !== 'undefined') {
            gsap.from('.feature-card', {
                scrollTrigger: {
                    trigger: '#features',
                    start: 'top 80%'
                },
                duration: 0.8,
                y: 50,
                opacity: 0,
                stagger: 0.1,
                ease: 'power2.out'
            });
        }
    } catch (error) {
        console.warn('⚠️ Animation error:', error);
    }
}

// Service Worker Registration
function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('./service-worker.js')
                .then(reg => {
                    console.log('✅ Service Worker registered successfully:', reg.scope);
                })
                .catch(err => {
                    console.warn('⚠️ Service Worker registration failed:', err);
                });
        });
    }
}

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    // Revoke object URLs to prevent memory leaks
    if (elements.processedImage?.src && elements.processedImage.src.startsWith('blob:')) {
        URL.revokeObjectURL(elements.processedImage.src);
    }
});

// Initialize app when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}

console.log('🎯 AI Background Remover loaded successfully!');
