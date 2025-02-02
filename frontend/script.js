import imageSlider from './components/image-slider.js';

document.addEventListener('DOMContentLoaded', async function() {
  const form = document.getElementById('searchForm');
  const dropZone = document.getElementById('dropZone');
  const queryImage = document.getElementById('queryImage');
  const previewContainer = document.getElementById('previewContainer');
  const imagePreview = document.getElementById('imagePreview');
  const loading = document.getElementById('loading');
  const gallery = document.getElementById('gallery');
  const minScoreInput = document.getElementById('minScore');
  const minScoreValue = document.getElementById('minScoreValue');
  const batchSize = document.getElementById('batchSize');
  const browseFolderBtn = document.getElementById('browseFolderBtn');
  const folderPath = document.getElementById('folderPath');
  const imageModal = document.getElementById('imageModal');
  const modalImage = document.getElementById('modalImage');
  const modalClose = document.getElementById('modalClose');

  let selectedImagePath = null;

  // Load last settings
  try {
    const response = await fetch('/last-settings');
    const settings = await response.json();
    if (settings && settings.last_folder) {
      folderPath.value = settings.last_folder;
    }
    if (settings && settings.last_query) {
      selectedImagePath = settings.last_query;
      imagePreview.src = `/image/${encodeURIComponent(settings.last_query)}`;
      previewContainer.style.display = 'block';
    }
    // Display last results if available
    if (settings && settings.last_results && settings.last_results.length > 0) {
      displayResults(settings.last_results);
    }
  } catch (error) {
    console.error('Error loading last settings:', error);
  }

  // Drag and drop handlers
  if (dropZone) {
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
      dropZone.addEventListener(eventName, preventDefaults, false);
    });

    ['dragenter', 'dragover'].forEach(eventName => {
      dropZone.addEventListener(eventName, highlight, false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
      dropZone.addEventListener(eventName, unhighlight, false);
    });
  }

  function preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
  }

  function highlight() {
    dropZone.classList.add('dragover');
  }

  function unhighlight() {
    dropZone.classList.remove('dragover');
  }

  // Click to select file
  dropZone.addEventListener('click', async () => {
    try {
      const response = await fetch('/select-image', {
        method: 'POST'
      });
      const data = await response.json();
      
      if (data.file_path) {
        selectedImagePath = data.file_path;
        folderPath.value = data.folder_path;
        imagePreview.src = `/image/${encodeURIComponent(data.file_path)}`;
        previewContainer.style.display = 'block';
      }
    } catch (error) {
      console.error('Error selecting image:', error);
    }
  });

  // Handle dropped files (optional, might not work with local files due to security)
  dropZone.addEventListener('drop', handleDrop, false);
  function handleDrop(e) {
    alert('Please use the click to select method for choosing images.');
    // Drag and drop won't work with local files due to security restrictions
  }

  // Update min score display with badge
  minScoreInput.addEventListener('input', function() {
    minScoreValue.textContent = this.value;
  });

  // Folder selection handling
  browseFolderBtn.addEventListener('click', async () => {
    try {
      const response = await fetch('/select-image', {
        method: 'POST'
      });
      const data = await response.json();
      if (data.folder_path) {
        folderPath.value = data.folder_path;
      }
    } catch (error) {
      console.error('Error selecting folder:', error);
      alert('Error selecting folder: ' + error.message);
    }
  });

  // Update loading display functions
  function showLoading() {
    loading.style.display = 'flex';
    setTimeout(() => loading.classList.add('show'), 10);
  }

  function hideLoading() {
    loading.classList.remove('show');
    setTimeout(() => loading.style.display = 'none', 300);
  }

  // Update modal display functions
  function showModal(imagePath) {
    modalImage.src = `/image/${encodeURIComponent(imagePath)}`;
    imageModal.style.display = 'block';
    document.body.style.overflow = 'hidden';
    setTimeout(() => imageModal.classList.add('show'), 10);
  }

  function closeModal() {
    imageModal.classList.remove('show');
    setTimeout(() => {
      imageModal.style.display = 'none';
      document.body.style.overflow = '';
    }, 300);
  }

  // Form submission
  form.addEventListener('submit', async function(e) {
    e.preventDefault();
    gallery.innerHTML = '';
    showLoading();

    if(!selectedImagePath) {
      alert('Please select a query image!');
      hideLoading();
      return;
    }

    const formData = new FormData();
    formData.append('query_path', selectedImagePath);
    formData.append('folder', folderPath.value);
    formData.append('min_score', minScoreInput.value);
    formData.append('batch_size', batchSize.value);

    try {
      const response = await fetch('/search', {
        method: 'POST',
        body: formData
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      displayResults(data.results);
    } catch (error) {
      console.error('Error fetching search results:', error);
      alert('Error fetching search results: ' + error.message);
    } finally {
      hideLoading();
    }
  });

  function displayResults(results) {
    if(results.length === 0) {
      gallery.innerHTML = '<div class="text-center p-5"><h3>No similar images found</h3></div>';
      return;
    }

    gallery.innerHTML = '';
    
    results.forEach((result, index) => {
      const item = document.createElement('div');
      item.className = 'gallery-item';
      
      // Determine size and aspect ratio classes
      const aspectRatio = result.height / result.width;
      
      // Add aspect ratio class first - simplified for better space usage
      if (aspectRatio > 1.3) {  // Very tall images
        item.classList.add('gallery-item--portrait');
      } else if (aspectRatio < 0.5) {  // Very wide images
        item.classList.add('gallery-item--panorama');
      } else if (aspectRatio < 0.7) {  // Moderately wide images
        item.classList.add('gallery-item--landscape');
      }
      
      // Add size class based on score - simplified
      if (result.score > 0.9) {
        item.classList.add('gallery-item--full');
      } else if (result.score > 0.8 && aspectRatio > 1.2) {
        item.classList.add('gallery-item--large');
      }
      
      const imageContainer = document.createElement('div');
      imageContainer.className = 'image-container';
      
      const img = document.createElement('img');
      img.src = `/image/${encodeURIComponent(result.path)}`;
      img.alt = result.filename;
      img.loading = 'lazy';
      
      const details = document.createElement('div');
      details.className = 'item__details';
      details.innerHTML = `
        <div class="details-content">
          <div class="details-header">
            <span class="match-number" title="${result.filename}">${result.filename}</span>
            <span class="match-score">${(result.score * 100).toFixed(1)}%</span>
          </div>
          <div class="match-description" title="${result.description}">
            ${result.description}
          </div>
        </div>
      `;
      
      imageContainer.appendChild(img);
      item.appendChild(imageContainer);
      item.appendChild(details);

      // Add click handler to view in slider
      item.addEventListener('click', () => {
        imageSlider.loadImages(results);
        imageSlider.show(index);
      });

      gallery.appendChild(item);
    });
  }

  // Modal handling
  imageModal.addEventListener('click', (e) => {
    if (e.target === imageModal) {
      closeModal();
    }
  });

  modalClose.addEventListener('click', closeModal);

  // Keyboard handling for modal
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && imageModal.style.display === 'block') {
      closeModal();
    }
  });
}); 