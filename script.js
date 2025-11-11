document.addEventListener('DOMContentLoaded', function() {
    const SHEET_API_URL = 'https://script.google.com/macros/s/AKfycbwu42OK2qwc_S_hf4MnAuakn03H4lALnCuAe_q_4-O2RLmF9IjD85UU24WJ4wR2Ospe/exec';

    const linkList = document.getElementById('link-list');
    const emptyMessage = document.getElementById('empty-message');
    const searchInput = document.getElementById('search-input');
    const sortSelect = document.getElementById('sort-select');
    const linkCounter = document.getElementById('link-counter');
    const darkModeToggle = document.getElementById('dark-mode-toggle');
    const ownerLoginBtn = document.getElementById('owner-login-btn');
    const ownerSection = document.getElementById('owner-section');
    const linkInput = document.getElementById('link-input');
    const descriptionInput = document.getElementById('description-input');
    const tagsInput = document.getElementById('tags-input');
    const presetTags = document.getElementById('preset-tags');
    const addButton = document.getElementById('add-link');
    const loadingOverlay = document.getElementById('loading-overlay');
    const dataManagement = document.getElementById('data-management');
    const topPaginationControls = document.getElementById('top-pagination-controls');
    const bottomPaginationControls = document.getElementById('bottom-pagination-controls');
    const topPrevBtn = document.getElementById('top-prev-btn');
    const topNextBtn = document.getElementById('top-next-btn');
    const topPageInfo = document.getElementById('top-page-info');
    const prevBtn = document.getElementById('prev-btn');
    const nextBtn = document.getElementById('next-btn');
    const pageInfo = document.getElementById('page-info');
    const body = document.body;
    
    let links = [];
    let isOwner = false;
    let ownerPassword = '';
    let isEditing = false;
    let editingRow = null;
    let editingTimestamp = null;
    const pageSize = 10;
    let currentPage = 1;

    function showLoading() {
        loadingOverlay.style.display = 'flex';
    }
    function hideLoading() {
        loadingOverlay.style.display = 'none';
    }

    function copyLink(url, btn) {
        navigator.clipboard.writeText(url).then(() => {
            const text = btn.querySelector('.text');
            const original = text.textContent;
            text.textContent = 'COPIED!';
            setTimeout(() => text.textContent = original, 1000);
        }).catch(() => alert('Failed to copy link.'));
    }

    ownerLoginBtn.onclick = () => {
        if (isOwner) {
            isOwner = false;
            ownerPassword = '';
            ownerSection.style.display = 'none';
            dataManagement.style.display = 'none';
            renderLinks();
            ownerLoginBtn.innerHTML = 'Key';
            ownerLoginBtn.title = 'Login to enable Add and Remove functionality';
            alert('Owner mode disabled.');
        } else {
            const password = prompt('Enter owner password:');
            if (password && password.trim() !== '') {
                ownerPassword = password.trim();
                isOwner = true;
                ownerSection.style.display = 'flex';
                dataManagement.style.display = 'flex';
                renderLinks();
                ownerLoginBtn.innerHTML = 'Exit';
                ownerLoginBtn.title = 'Logout to disable Add and Remove functionality';
                alert('Owner mode enabled! You can now add and remove links.');
            } else {
                alert('Password required. Access denied.');
            }
        }
    };

    async function loadLinksFromSheet() {
        showLoading();
        try {
            const res = await fetch(SHEET_API_URL + '?action=get');
            if (!res.ok) throw new Error('Failed to fetch links');
            const data = await res.json();
            
            if (Array.isArray(data)) {
                links = data.map(item => ({
                    row: item.row,
                    id: item.id,
                    url: item.url,
                    description: item.description,
                    tags: item.tags ? item.tags.split(',').map(t => t.trim()) : [],
                    timestamp: parseInt(item.timestamp)
                }));
                currentPage = 1;
                filterAndSortLinks();
            }
        } catch (err) { 
            console.error('API Load Error:', err); 
            emptyMessage.textContent = 'ERROR: Could not load data from Google Sheet API. Check Console.';
            linkCounter.textContent = 'Saved Links (0)';
            renderLinks([]);
        } finally {
            hideLoading();
        }
    }

    async function addLinkToSheet(link) {
        if (!isOwner || !ownerPassword) {
            alert('Owner login required to add links.');
            return;
        }
        showLoading();
        try {
            await fetch(SHEET_API_URL, { 
                method: 'POST', 
                mode: 'no-cors', 
                headers: { 'Content-Type': 'application/json' }, 
                body: JSON.stringify({ 
                    action: 'post', 
                    password: ownerPassword,  
                    ...link 
                }) 
            });
        } catch (err) { 
            alert('Failed to add link to cloud. Check console.'); 
            console.error(err); 
        } finally {
            hideLoading();
        }
    }

    async function updateLinkToSheet(link) {
        if (!isOwner || !ownerPassword) {
            alert('Owner login required to update links.');
            return;
        }
        showLoading();
        try {
            await fetch(SHEET_API_URL, { 
                method: 'POST', 
                mode: 'no-cors', 
                headers: { 'Content-Type': 'application/json' }, 
                body: JSON.stringify({ 
                    action: 'delete', 
                    password: ownerPassword,  
                    row: link.row 
                }) 
            });

            const newId = Date.now().toString();
            await fetch(SHEET_API_URL, { 
                method: 'POST', 
                mode: 'no-cors', 
                headers: { 'Content-Type': 'application/json' }, 
                body: JSON.stringify({ 
                    action: 'post', 
                    password: ownerPassword,  
                    id: newId,
                    url: link.url, 
                    description: link.description, 
                    tags: link.tags,
                    timestamp: link.timestamp
                }) 
            });
        } catch (err) { 
            alert('Failed to update link to cloud. Check console.'); 
            console.error(err); 
        } finally {
            hideLoading();
        }
    }

    async function removeLinkFromSheet(row) {
        if (!isOwner || !ownerPassword) {
            alert('Owner login required to remove links.');
            return;
        }
        if (!confirm('Are you sure you want to remove this link? This action is permanent.')) return;
        showLoading();
        try {
            await fetch(SHEET_API_URL, { 
                method: 'POST', 
                mode: 'no-cors', 
                headers: { 'Content-Type': 'application/json' }, 
                body: JSON.stringify({ 
                    action: 'delete', 
                    password: ownerPassword,  
                    row 
                }) 
            });
        } catch (err) { 
            alert('Failed to remove link from cloud. Check console.'); 
            console.error(err); 
        } finally {
            hideLoading();
        }
    }

    function renderLinks(currentLinks) {
        linkList.innerHTML = '';
        
        if (currentLinks.length === 0) { 
            return; 
        }
        
        currentLinks.forEach(linkObj => {
            const li = document.createElement('li');
            li.className = 'link-item';
            const tagsHtml = linkObj.tags.map(tag => `<span class="tag" data-filter-tag="${tag}">${tag}</span>`).join('');
            let displayUrl = linkObj.url.replace(/^https?:\/\//i, '').replace(/\/$/, '');
            displayUrl = displayUrl.replace(/^www\./i, '');
            
            li.innerHTML = `
                <div class="link-details">
                    <div class="link-domain">${linkObj.url}</div>
                    <a href="${linkObj.url}" target="_blank" rel="noopener noreferrer" class="link-url">${displayUrl}</a>
                    <p class="link-description">${linkObj.description}</p>
                    <div class="link-tags">${tagsHtml}</div>
                </div>
                <div class="link-actions">
                    <button class="Btn copy-btn" data-url="${linkObj.url}">
                      <svg viewBox="0 0 512 512" class="svgIcon" height="1em"><path d="M288 448H64V224h64V160H64c-35.3 0-64 28.7-64 64V448c0 35.3 28.7 64 64 64H288c35.3 0 64-28.7 64-64V384H288v64zm-64-96H448c35.3 0 64-28.7 64-64V64c0-35.3-28.7-64-64-64H224c-35.3 0-64 28.7-64 64V288c0 35.3 28.7 64 64 64z"></path></svg>
                      <p class="text">COPY</p>
                      <span class="effect"></span>
                    </button>
                    ${isOwner ? `<button class="edit-btn" data-row="${linkObj.row}" title="Edit link">Edit</button>` : ''}
                    ${isOwner ? `<button class="remove-btn" data-row="${linkObj.row}" title="Remove permanently">Remove</button>` : ''}
                </div>
            `;
            linkList.appendChild(li);
        });
        attachEventListeners();
    }

    function attachEventListeners() {
        document.querySelectorAll('.copy-btn').forEach(btn => {
            btn.onclick = e => copyLink(e.currentTarget.dataset.url, e.currentTarget);
        });
        
        if (isOwner) {
            document.querySelectorAll('.edit-btn').forEach(btn => {
                btn.onclick = (e) => {
                    const row = parseInt(e.target.dataset.row);
                    const editingLink = links.find(l => l.row === row);
                    if (editingLink) {
                        isEditing = true;
                        editingRow = row;
                        editingTimestamp = editingLink.timestamp;
                        linkInput.value = editingLink.url;
                        descriptionInput.value = editingLink.description;
                        tagsInput.value = editingLink.tags.join(', ');
                        addButton.textContent = 'Update Link';
                        presetTags.value = '';
                        ownerSection.scrollIntoView({ behavior: 'smooth' });
                    }
                };
            });
            
            document.querySelectorAll('.remove-btn').forEach(btn => {
                btn.onclick = async (e) => {
                    const row = parseInt(e.target.dataset.row);
                    await removeLinkFromSheet(row);
                    setTimeout(() => loadLinksFromSheet(), 500);
                };
            });
        }
        
        document.querySelectorAll('.tag').forEach(tag => { 
            tag.onclick = e => { 
                searchInput.value = e.target.dataset.filterTag; 
                currentPage = 1;
                filterAndSortLinks(); 
            }; 
        });
    }

    function updatePagination(filteredTotal) {
        const totalPages = Math.ceil(filteredTotal / pageSize);
        topPageInfo.textContent = `${currentPage}/${totalPages}`;
        pageInfo.textContent = `Page ${currentPage} / ${totalPages} `;
        topPrevBtn.disabled = currentPage <= 1;
        prevBtn.disabled = currentPage <= 1;
        topNextBtn.disabled = currentPage >= totalPages;
        nextBtn.disabled = currentPage >= totalPages;
        topPaginationControls.style.display = filteredTotal > pageSize ? 'flex' : 'none';
        bottomPaginationControls.style.display = filteredTotal > pageSize ? 'flex' : 'none';
    }

    addButton.onclick = async () => {
        const url = linkInput.value.trim();
        const desc = descriptionInput.value.trim() || 'No description';
        const tagsStr = tagsInput.value.split(',').map(t => t.trim().toLowerCase()).filter(t => t).join(',');
        
        if (!url) { 
            alert('Enter a URL'); 
            return; 
        }
        
        try {
            new URL(url);
        } catch {
            alert('Invalid URL. Please enter a valid URL starting with http:// or https://');
            return;
        }
        
        const newLink = { 
            url, 
            description: desc, 
            tags: tagsStr, 
            timestamp: Date.now() 
        };
        
        if (isEditing) {
            newLink.timestamp = editingTimestamp;
            newLink.row = editingRow;
            await updateLinkToSheet(newLink);
            isEditing = false;
            editingRow = null;
            editingTimestamp = null;
            addButton.textContent = 'Add Link to Cloud';
        } else {
            newLink.id = Date.now().toString();
            await addLinkToSheet(newLink);
        }
        
        linkInput.value = ''; 
        descriptionInput.value = ''; 
        tagsInput.value = '';
        presetTags.value = '';
        
        setTimeout(() => loadLinksFromSheet(), 1000);
    };

    presetTags.onchange = () => {
        const selected = presetTags.value;
        if (selected) {
            const current = tagsInput.value.trim();
            const separator = current ? ', ' : '';
            tagsInput.value = current + separator + selected;
            presetTags.value = '';  
        }
    };

    searchInput.oninput = () => {
        currentPage = 1;
        filterAndSortLinks();
    };
    
    sortSelect.onchange = () => {
        currentPage = 1;
        filterAndSortLinks();
    };

    function filterAndSortLinks() {
        let filtered = links; 
        const term = searchInput.value.toLowerCase().trim(); 
        const sort = sortSelect.value;
        
        if (term) { 
            filtered = links.filter(l =>
                l.description.toLowerCase().includes(term) ||
                l.url.toLowerCase().includes(term) ||
                l.tags.some(tag => tag.includes(term))
            ); 
        }
        
        filtered.sort((a, b) => {
            switch (sort) {
                case 'timestamp-desc': return b.timestamp - a.timestamp;
                case 'timestamp-asc': return a.timestamp - a.timestamp;
                case 'url-asc': return a.url.localeCompare(b.url);
                case 'url-desc': return b.url.localeCompare(a.url);
                case 'description-asc': return a.description.localeCompare(b.description);
                case 'description-desc': return b.description.localeCompare(a.description);
                default: return b.timestamp - a.timestamp;
            }
        });

        const filteredTotal = filtered.length;
        
        if (filteredTotal === 0) {
            emptyMessage.style.display = 'block';
            emptyMessage.textContent = links.length > 0 ? "No results found." : "No links loaded. Connect to API or add a link.";
            linkCounter.textContent = `Saved Links (${links.length})`;
            linkList.innerHTML = '';
            topPaginationControls.style.display = 'none';
            bottomPaginationControls.style.display = 'none';
            return;
        }
        
        const maxPage = Math.ceil(filteredTotal / pageSize);
        if (currentPage > maxPage) currentPage = maxPage;
        
        const startIdx = (currentPage - 1) * pageSize;
        const paginated = filtered.slice(startIdx, startIdx + pageSize);
        
        const showingStart = startIdx + 1;
        const showingEnd = Math.min(startIdx + paginated.length, filteredTotal);
        
        linkCounter.textContent = `Saved Links (${filteredTotal}) | Showing ${showingStart} - ${showingEnd} of ${filteredTotal}`;
        emptyMessage.style.display = 'none';
        
        renderLinks(paginated);
        updatePagination(filteredTotal);
    }

    function goToPreviousPage() {
        if (currentPage > 1) {
            currentPage--;
            filterAndSortLinks();
        }
    }

    function goToNextPage() {
        currentPage++;
        filterAndSortLinks();
    }

    topPrevBtn.onclick = goToPreviousPage;
    prevBtn.onclick = goToPreviousPage;
    topNextBtn.onclick = goToNextPage;
    nextBtn.onclick = goToNextPage;

    /* -------------------------------------------------------------
       UPDATED: let CSS control placeholder colour
       ------------------------------------------------------------- */
    const updateSearchInputColor = () => {
        if (body.classList.contains('dark-mode')) {
            searchInput.style.color = '#fff';
            searchInput.style.backgroundColor = 'rgba(0,0,0,0.2)';
        } else {
            // Remove inline colour – CSS now decides both text & placeholder
            searchInput.style.removeProperty('color');
            searchInput.style.backgroundColor = 'rgba(255,255,255,0.8)';
        }
    };

    // Call it whenever toggle changes
    darkModeToggle.addEventListener('change', () => {
        body.classList.toggle('dark-mode', darkModeToggle.checked);
        localStorage.setItem('darkMode', darkModeToggle.checked ? 'enabled' : 'disabled');
        updateSearchInputColor();
    });

    // Call it on page load to set initial colour
    updateSearchInputColor();
    
    document.getElementById('export-btn').onclick = () => {
        const dataStr = JSON.stringify(links, null, 2);
        const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
        const a = document.createElement('a'); 
        a.setAttribute('href', dataUri); 
        a.setAttribute('download', 'link_organizer_backup.json'); 
        a.click();
        alert(`Successfully exported ${links.length} links.`);
    };

    document.getElementById('import-btn').onclick = () => { 
        const backupData = prompt('Paste your Link Organizer backup JSON data here:');
        if (!backupData) return;
        
        try {
            const importedLinks = JSON.parse(backupData);
            if (Array.isArray(importedLinks)) {
                links = importedLinks.map(link => ({
                    ...link, 
                    tags: Array.isArray(link.tags) ? link.tags : (link.tags ? link.tags.split(',').map(t => t.trim()) : [])
                }));
                currentPage = 1;
                filterAndSortLinks();
                alert(`Successfully imported ${links.length} links for local viewing.`);
            } else {
                throw new Error('Invalid JSON format.');
            }
        } catch (e) {
            alert('Import failed! Please ensure the data is valid JSON.');
        }
    };

    window.addEventListener('beforeunload', () => { ownerPassword = ''; });

    loadLinksFromSheet();
});