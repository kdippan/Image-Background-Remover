// AI Background Remover - FIXED VERSION
// Uses a different loading approach to avoid module issues

// Global State
const state = {
    originalImage: null,
    processedBlob: null,
    currentBackground: 'transparent',
    imgbbApiKey: localStorage.getItem('imgbb_api_key') || '',
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
    
    // Show loading message
    showToast('Loading AI library... This may take a moment', 'info');
    
    // Load library after a short delay to let the UI render
    setTimeout(async () => {
        await loadBackgroundRemovalLibrary();
        registerServiceWorker();
    }, 500);
}

// Load Background Removal Library - FIXED VERSION
async function loadBackgroundRemovalLibrary() {
    try {
        console.log('📦 Loading @imgly/background-removal library...');
        
        // Create a script tag to load the library (avoids ES module issues)
        const script = document.createElement('script');
        script.type = 'module';
        script.textContent = `
            import removeBackground from 'https://cdn.jsdelivr.net/npm/@imgly/background-removal@1.4.5/dist/browser.mjs';
            window.removeBackground = removeBackground;
            window.dispatchEvent(new Event('bgremoval-loaded'));
        `;
        
        // Wait for library to load
        await new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                reject(new Error('Library loading timeout'));
            }, 30000); // 30 second timeout
            
            window.addEventListener('bgremoval-loaded', () => {
                clearTimeout(timeout);
                resolve();
            }, { once: true });
            
            script.onerror = () => {
                clearTimeout(timeout);
                reject(new Error('Script loading failed'));
            };
            
            document.head.appendChild(script);
        });
        
        if (window.removeBackground) {
            state.libraryLoaded = true;
            console.log('✅ Library loaded successfully!');
            showToast('AI Background Remover ready! 🎉', 'success');
            
            if (elements.removeBgBtn) {
                elements.removeBgBtn.disabled = false;
                elements.removeBgBtn.classList.remove('opacity-50');
            }
        } else {
            throw new Error('Library not attached to window');
        }
        
    } catch (error) {
        console.error('❌ Failed to load library:', error);
        showToast('Failed to load AI library. Using fallback...', 'error');
        
        // Provide fallback instructions
        showFallbackInstructions();
    }
}

// Show fallback instructions if library fails
function showFallbackInstructions() {
    const message = document.createElement('div');
    message.className = 'fixed top-20 left-1/2 transform -translate-x-1/2 bg-red-100 dark:bg-red-900 border-2 border-red-500 rounded-lg p-6 max-w-md z-50';
    message.innerHTML = `
        <h3 class="font-bold text-lg mb-2 text-red-800 dark:text-red-200">Library Load Failed</h3>
        <p class="text-sm text-red-700 dark:text-red-300 mb-4">
            The AI library couldn't load. This might be due to:
        </p>
        <ul class="list-disc list-inside text-sm text-red-700 dark:text-red-300 mb-4 space-y-1">
            <li>Network issues</li>
            <li>Browser compatibility</li>
            <li>CORS restrictions</li>
        </ul>
        <p class="text-sm text-red-700 dark:text-red-300 mb-4">
            <strong>Solutions:</strong><br>
            1. Refresh the page (Ctrl+F5)<br>
            2. Clear browser cache<br>
            3. Try a different browser (Chrome/Edge recommended)<br>
            4. Check your internet connection
        </p>
        <button onclick="location.reload()" class="w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors">
            Reload Page
        </button>
        <button onclick="this.parentElement.remove()" class="w-full mt-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors">
            Close
        </button>
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
            if (bg) {
                changeBackground(bg);
            }
        });
    });
    
    elements.customBg?.addEventListener('input', (e) => {
        changeBackground('custom', e.target.value);
    });
    
    // Keyboard Shortcuts
    document.addEventListener('keydown', handleKeyboardShortcuts);
    
    console.log('✅ Event listeners ready!');
}

// Prevent default drag behaviors
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
    const dt = e.dataTransfer;
    const files = dt?.files;
    
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
        showToast('Click in the page and press Ctrl+V to paste', 'info');
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
    
    // Validate file
    const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
    const maxSize = 10 * 1024 * 1024; // 10MB
    
    if (!validTypes.includes(file.type)) {
        showToast('Please upload a valid image (PNG, JPG, or WEBP)', 'error');
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
        
        if (state.libraryLoaded) {
            showToast('Image uploaded! Click "Remove Background" 📸', 'success');
        } else {
            showToast('Image uploaded! Waiting for AI library...', 'warning');
        }
        console.log('✅ Image loaded and ready');
    };
    
    reader.onerror = () => {
        showToast('Failed to read image file', 'error');
    };
    
    reader.readAsDataURL(file);
}

// Background Removal
async function processBackgroundRemoval() {
    console.log('🎨 Starting background removal...');
    
    if (!state.originalImage) {
        showToast('Please upload an image first', 'error');
        return;
    }
    
    if (!state.libraryLoaded || !window.removeBackground) {
        showToast('AI library not ready. Please wait or refresh the page.', 'error');
        return;
    }
    
    try {
        // Show loader
        elements.processingLoader?.classList.remove('hidden');
        elements.removeBgBtn.disabled = true;
        elements.removeBgBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Processing...';
        
        // Get quality setting
        const quality = elements.qualitySelect?.value || 'medium';
        console.log('⚙️ Quality setting:', quality);
        
        // Configuration
        const config = {
            progress: (key, current, total) => {
                const progress = Math.round((current / total) * 100);
                if (elements.progressText) {
                    elements.progressText.textContent = `${progress}%`;
                }
                console.log(`📊 Progress: ${progress}%`);
            },
            model: quality === 'high' ? 'medium' : quality,
            output: {
                format: 'png',
                quality: 0.8,
                type: 'blob'
            }
        };
        
        console.log('🔄 Removing background...');
        
        // Remove background using the globally loaded function
        const blob = await window.removeBackground(state.originalImage, config);
        
        console.log('✅ Background removed! Blob size:', blob.size);
        
        // Display result
        state.processedBlob = blob;
        const url = URL.createObjectURL(blob);
        elements.processedImage.src = url;
        elements.processedImage.classList.remove('hidden');
        
        // Enable buttons
        elements.downloadBtn.disabled = false;
        elements.uploadImgbbBtn.disabled = false;
        
        showToast('Background removed successfully! 🎉', 'success');
        
    } catch (error) {
        console.error('❌ Error:', error);
        showToast(`Failed to remove background: ${error.message}`, 'error');
    } finally {
        // Hide loader
        elements.processingLoader?.classList.add('hidden');
        elements.removeBgBtn.disabled = false;
        elements.removeBgBtn.innerHTML = '<i class="fas fa-magic mr-2"></i>Remove Background';
    }
}

// Change Background
function changeBackground(type, color = null) {
    if (!state.processedBlob) return;
    
    console.log('🎨 Changing background to:', type);
    
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
    
    showToast('Image downloaded! 📥', 'success');
}

// Upload to ImgBB
async function uploadToImgBB() {
    if (!state.processedBlob) {
        showToast('No processed image to upload', 'error');
        return;
    }
    
    if (!state.imgbbApiKey) {
        const key = prompt('Enter your ImgBB API key:\n(Get one free at https://api.imgbb.com/)');
        if (!key) return;
        state.imgbbApiKey = key;
        localStorage.setItem('imgbb_api_key', key);
    }
    
    try {
        console.log('☁️ Uploading to ImgBB...');
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
                    showToast('Uploaded to cloud! ☁️', 'success');
                    console.log('✅ Upload successful:', data.data.url);
                } else {
                    throw new Error(data.error?.message || 'Upload failed');
                }
            } catch (error) {
                console.error('❌ Upload error:', error);
                showToast('Upload failed. Check your API key.', 'error');
                state.imgbbApiKey = '';
                localStorage.removeItem('imgbb_api_key');
            } finally {
                elements.uploadImgbbBtn.disabled = false;
                elements.uploadImgbbBtn.innerHTML = '<i class="fas fa-cloud-upload-alt mr-2"></i>Upload to Cloud';
            }
        };
        
        reader.readAsDataURL(state.processedBlob);
        
    } catch (error) {
        console.error('❌ Error:', error);
        showToast('Failed to upload', 'error');
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
        showToast('URL copied! 📋', 'success');
    } catch (err) {
        elements.imgbbUrl?.select();
        document.execCommand('copy');
        showToast('URL copied! 📋', 'success');
    }
}

// Reset Editor
function resetEditor() {
    console.log('🔄 Resetting...');
    elements.processedImage.src = '';
    elements.processedImage.classList.add('hidden');
    elements.downloadBtn.disabled = true;
    elements.uploadImgbbBtn.disabled = true;
    elements.uploadResult?.classList.add('hidden');
    state.processedBlob = null;
    showToast('Reset complete', 'info');
}

// Toast Notifications
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
    }, 3000);
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

// GSAP Animations
function initAnimations() {
    if (typeof gsap === 'undefined') {
        console.warn('⚠️ GSAP not loaded');
        return;
    }
    
    console.log('✨ Initializing animations...');
    
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
        console.warn('⚠️ Animation error:', error);
    }
}

// Service Worker
function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('./service-worker.js')
                .then(reg => console.log('✅ Service Worker registered!', reg.scope))
                .catch(err => console.warn('⚠️ SW registration failed:', err));
        });
    }
}

// Cleanup
window.addEventListener('beforeunload', () => {
    if (elements.processedImage?.src && elements.processedImage.src.startsWith('blob:')) {
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
