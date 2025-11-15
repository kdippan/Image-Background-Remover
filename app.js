// AI Background Remover - Using Transformers.js (PRODUCTION READY)
// This uses the RMBG-1.4 model which is more stable than @imgly/background-removal

// Global State
const state = {
    originalImage: null,
    processedBlob: null,
    currentBackground: 'transparent',
    imgbbApiKey: localStorage.getItem('imgbb_api_key') || '',
    libraryLoaded: false,
    pipeline: null
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
    
    // Load library
    showToast('Loading AI model... This may take 10-30 seconds', 'info');
    await loadTransformersLibrary();
}

// Load Transformers.js Library
async function loadTransformersLibrary() {
    try {
        console.log('📦 Loading Transformers.js library...');
        
        // Dynamically load the Transformers.js library
        await new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.type = 'module';
            script.innerHTML = `
                import { pipeline, env } from 'https://cdn.jsdelivr.net/npm/@xenova/transformers@2.17.2';
                
                // Configure to use remote models (not local cache initially)
                env.allowLocalModels = false;
                env.allowRemoteModels = true;
                
                // Make pipeline available globally
                window.transformersPipeline = pipeline;
                window.transformersEnv = env;
                
                // Signal that library is loaded
                window.dispatchEvent(new Event('transformers-loaded'));
            `;
            
            script.onerror = () => reject(new Error('Failed to load script'));
            document.head.appendChild(script);
            
            window.addEventListener('transformers-loaded', resolve, { once: true });
            
            // Timeout after 30 seconds
            setTimeout(() => reject(new Error('Library load timeout')), 30000);
        });
        
        console.log('✅ Library loaded! Initializing model...');
        showToast('Initializing AI model...', 'info');
        
        // Initialize the pipeline
        state.pipeline = await window.transformersPipeline(
            'image-segmentation',
            'Xenova/modnet'
        );
        
        state.libraryLoaded = true;
        console.log('✅ Model ready!');
        showToast('AI Background Remover ready! 🎉', 'success');
        
        if (elements.removeBgBtn) {
            elements.removeBgBtn.disabled = false;
            elements.removeBgBtn.classList.remove('opacity-50');
        }
        
    } catch (error) {
        console.error('❌ Failed to load library:', error);
        showToast('Using fallback processing method...', 'warning');
        
        // Try alternative model
        await loadAlternativeModel();
    }
}

// Load alternative model if primary fails
async function loadAlternativeModel() {
    try {
        console.log('🔄 Loading alternative model...');
        
        state.pipeline = await window.transformersPipeline(
            'image-segmentation',
            'briaai/RMBG-1.4'
        );
        
        state.libraryLoaded = true;
        showToast('Alternative model loaded successfully!', 'success');
        
        if (elements.removeBgBtn) {
            elements.removeBgBtn.disabled = false;
        }
        
    } catch (error) {
        console.error('❌ All models failed:', error);
        showToast('Unable to load AI models. Please refresh.', 'error');
        showFallbackInstructions();
    }
}

// Fallback instructions
function showFallbackInstructions() {
    const message = document.createElement('div');
    message.className = 'fixed top-20 left-1/2 transform -translate-x-1/2 bg-red-100 dark:bg-red-900 border-2 border-red-500 rounded-lg p-6 max-w-md z-50';
    message.innerHTML = `
        <h3 class="font-bold text-lg mb-2 text-red-800 dark:text-red-200">⚠️ Model Load Failed</h3>
        <p class="text-sm text-red-700 dark:text-red-300 mb-4">
            The AI model couldn't load. Possible causes:
        </p>
        <ul class="list-disc list-inside text-sm text-red-700 dark:text-red-300 mb-4 space-y-1">
            <li>Slow internet connection</li>
            <li>Browser not supported (use Chrome/Edge)</li>
            <li>CDN temporarily unavailable</li>
        </ul>
        <div class="space-y-2">
            <button onclick="location.reload()" class="w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700">
                🔄 Reload Page
            </button>
            <button onclick="this.parentElement.parentElement.remove()" class="w-full px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700">
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
    showToast(isDark ? 'Dark mode enabled' : 'Light mode enabled', 'info');
});

// Event Listeners
function initEventListeners() {
    console.log('🔌 Setting up event listeners...');
    
    // File Upload
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
    
    // Paste
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
    
    // Reset
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
}

function preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
}

// File Handling
function handleFileSelect(e) {
    const file = e.target.files?.[0];
    if (file) processFile(file);
}

function handleDrop(e) {
    const files = e.dataTransfer?.files;
    if (files && files.length > 0) processFile(files[0]);
}

function handlePasteClick() {
    navigator.clipboard.read().then(items => {
        for (const item of items) {
            for (const type of item.types) {
                if (type.startsWith('image/')) {
                    item.getType(type).then(blob => {
                        const file = new File([blob], 'pasted.png', { type });
                        processFile(file);
                    });
                    return;
                }
            }
        }
        showToast('No image in clipboard', 'warning');
    }).catch(() => {
        showToast('Press Ctrl+V to paste', 'info');
    });
}

async function handlePaste(e) {
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

// Process File
function processFile(file) {
    const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
    const maxSize = 10 * 1024 * 1024;
    
    if (!validTypes.includes(file.type)) {
        showToast('Upload PNG, JPG, or WEBP only', 'error');
        return;
    }
    
    if (file.size > maxSize) {
        showToast('File must be under 10MB', 'error');
        return;
    }
    
    const reader = new FileReader();
    reader.onload = (e) => {
        state.originalImage = e.target.result;
        elements.originalImage.src = e.target.result;
        elements.editorSection?.classList.remove('hidden');
        
        setTimeout(() => {
            elements.editorSection?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
        
        // Reset
        elements.processedImage.src = '';
        elements.processedImage.classList.add('hidden');
        elements.downloadBtn.disabled = true;
        elements.uploadImgbbBtn.disabled = true;
        state.processedBlob = null;
        
        if (state.libraryLoaded) {
            showToast('Image uploaded! Click "Remove Background" 📸', 'success');
        } else {
            showToast('Image uploaded! Waiting for AI model...', 'warning');
        }
    };
    
    reader.readAsDataURL(file);
}

// Background Removal
async function processBackgroundRemoval() {
    if (!state.originalImage) {
        showToast('Upload an image first', 'error');
        return;
    }
    
    if (!state.libraryLoaded || !state.pipeline) {
        showToast('AI model not ready. Please wait...', 'error');
        return;
    }
    
    try {
        elements.processingLoader?.classList.remove('hidden');
        elements.removeBgBtn.disabled = true;
        elements.removeBgBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Processing...';
        
        console.log('🎨 Removing background...');
        
        // Create image element
        const img = new Image();
        img.src = state.originalImage;
        
        await new Promise((resolve) => {
            img.onload = resolve;
        });
        
        // Update progress
        if (elements.progressText) {
            elements.progressText.textContent = '25%';
        }
        
        // Run the model
        const result = await state.pipeline(img);
        
        if (elements.progressText) {
            elements.progressText.textContent = '75%';
        }
        
        // Process result
        const mask = result[0].mask;
        
        // Create canvas for output
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        
        // Draw original image
        ctx.drawImage(img, 0, 0);
        
        // Apply mask
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const maskData = await createImageData(mask, canvas.width, canvas.height);
        
        for (let i = 0; i < imageData.data.length; i += 4) {
            imageData.data[i + 3] = maskData.data[i]; // Apply alpha
        }
        
        ctx.putImageData(imageData, 0, 0);
        
        if (elements.progressText) {
            elements.progressText.textContent = '100%';
        }
        
        // Convert to blob
        const blob = await new Promise(resolve => {
            canvas.toBlob(resolve, 'image/png', 0.9);
        });
        
        state.processedBlob = blob;
        const url = URL.createObjectURL(blob);
        elements.processedImage.src = url;
        elements.processedImage.classList.remove('hidden');
        
        elements.downloadBtn.disabled = false;
        elements.uploadImgbbBtn.disabled = false;
        
        showToast('Background removed! 🎉', 'success');
        
    } catch (error) {
        console.error('❌ Error:', error);
        showToast(`Failed: ${error.message}`, 'error');
    } finally {
        elements.processingLoader?.classList.add('hidden');
        elements.removeBgBtn.disabled = false;
        elements.removeBgBtn.innerHTML = '<i class="fas fa-magic mr-2"></i>Remove Background';
    }
}

// Helper to create ImageData from mask
async function createImageData(mask, width, height) {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    
    // Draw mask
    ctx.drawImage(await mask, 0, 0, width, height);
    return ctx.getImageData(0, 0, width, height);
}

// Change Background
function changeBackground(type, color = null) {
    if (!state.processedBlob) return;
    
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
}

// Download
function downloadImage() {
    if (!state.processedBlob) {
        showToast('No image to download', 'error');
        return;
    }
    
    const url = URL.createObjectURL(state.processedBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bg-removed-${Date.now()}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    showToast('Downloaded! 📥', 'success');
}

// Upload to ImgBB
async function uploadToImgBB() {
    if (!state.processedBlob) {
        showToast('No image to upload', 'error');
        return;
    }
    
    if (!state.imgbbApiKey) {
        const key = prompt('Enter ImgBB API key:\n(Get free at https://api.imgbb.com/)');
        if (!key) return;
        state.imgbbApiKey = key;
        localStorage.setItem('imgbb_api_key', key);
    }
    
    try {
        elements.uploadImgbbBtn.disabled = true;
        elements.uploadImgbbBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Uploading...';
        
        const reader = new FileReader();
        reader.onloadend = async () => {
            try {
                const base64 = reader.result.split(',')[1];
                const formData = new FormData();
                formData.append('image', base64);
                
                const response = await fetch(`https://api.imgbb.com/1/upload?key=${state.imgbbApiKey}`, {
                    method: 'POST',
                    body: formData
                });
                
                const data = await response.json();
                
                if (data.success) {
                    elements.imgbbUrl.value = data.data.url;
                    elements.uploadResult?.classList.remove('hidden');
                    showToast('Uploaded! ☁️', 'success');
                } else {
                    throw new Error('Upload failed');
                }
            } catch (error) {
                showToast('Upload failed. Check API key.', 'error');
                state.imgbbApiKey = '';
                localStorage.removeItem('imgbb_api_key');
            } finally {
                elements.uploadImgbbBtn.disabled = false;
                elements.uploadImgbbBtn.innerHTML = '<i class="fas fa-cloud-upload-alt mr-2"></i>Upload to Cloud';
            }
        };
        
        reader.readAsDataURL(state.processedBlob);
    } catch (error) {
        showToast('Upload failed', 'error');
        elements.uploadImgbbBtn.disabled = false;
        elements.uploadImgbbBtn.innerHTML = '<i class="fas fa-cloud-upload-alt mr-2"></i>Upload to Cloud';
    }
}

// Copy to Clipboard
async function copyToClipboard() {
    const url = elements.imgbbUrl?.value;
    if (!url) return;
    
    try {
        await navigator.clipboard.writeText(url);
        showToast('Copied! 📋', 'success');
    } catch (err) {
        elements.imgbbUrl?.select();
        document.execCommand('copy');
        showToast('Copied! 📋', 'success');
    }
}

// Reset
function resetEditor() {
    elements.processedImage.src = '';
    elements.processedImage.classList.add('hidden');
    elements.downloadBtn.disabled = true;
    elements.uploadImgbbBtn.disabled = true;
    elements.uploadResult?.classList.add('hidden');
    state.processedBlob = null;
    showToast('Reset', 'info');
}

// Toast
function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    const icon = type === 'success' ? 'check-circle' : 
                 type === 'error' ? 'exclamation-circle' : 
                 type === 'warning' ? 'exclamation-triangle' : 'info-circle';
    
    toast.innerHTML = `
        <i class="fas fa-${icon}"></i>
        <span>${message}</span>
    `;
    
    elements.toastContainer?.appendChild(toast);
    
    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}

// Keyboard Shortcuts
function handleKeyboardShortcuts(e) {
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        if (state.processedBlob) downloadImage();
    }
    
    if ((e.ctrlKey || e.metaKey) && e.key === 'u') {
        e.preventDefault();
        elements.fileInput?.click();
    }
    
    if (e.key === 'Escape') {
        elements.uploadResult?.classList.add('hidden');
    }
}

// Animations
function initAnimations() {
    if (typeof gsap === 'undefined') return;
    
    try {
        if (typeof ScrollTrigger !== 'undefined') {
            gsap.registerPlugin(ScrollTrigger);
        }
        
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
        console.warn('Animation error:', error);
    }
}

// Service Worker
function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('./service-worker.js')
                .then(reg => console.log('✅ SW registered:', reg.scope))
                .catch(err => console.warn('⚠️ SW failed:', err));
        });
    }
}

// Cleanup
window.addEventListener('beforeunload', () => {
    if (elements.processedImage?.src?.startsWith('blob:')) {
        URL.revokeObjectURL(elements.processedImage.src);
    }
});

// Initialize
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}

console.log('🎯 App loaded!');
