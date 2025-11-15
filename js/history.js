

// ============================================
// HISTORY LOGIC
// ============================================

async function fetchHistory() {
    const container = document.getElementById("historyContainer");
    container.innerHTML = `<p class="text-gray-600 italic">Carregando histórico...</p>`;

    try {
        const response = await fetch(`${API_BASE_URL}/history`);
        if (!response.ok) throw new Error('Failed to fetch history from server');

        const data = await response.json();
        displayHistory(data);

    } catch (error) {
        console.error('Error fetching history:', error);
        container.innerHTML = `<p class="text-red-500">Failed to load history.</p>`;
    }
}

function displayHistory(historyData) {
    const container = document.getElementById("historyContainer");
    if (!historyData || historyData.length === 0) {
        container.innerHTML = `<p class="text-gray-600 italic">No translations in history yet.</p>`;
        return;
    }
    container.innerHTML = historyData.map(item => `
        <div class="formal-card p-6" id="history-item-${item.id}">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                    <label class="block font-semibold mb-1">Original Text</label>
                    <p class="text-gray-700 bg-neutral-bg p-3 rounded-md min-h-[60px]">${item.original_text}</p>
                    <label class="block font-semibold mb-1 mt-4">AI Translation</label>
                    <p class="text-gray-700 bg-neutral-bg p-3 rounded-md min-h-[60px]">${item.llm_translation || 'N/A'}</p>
                </div>
                <div>
                    <label for="correction-input-${item.id}" class="block font-semibold mb-1">Manual Correction</label>
                    <textarea id="correction-input-${item.id}" class="w-full h-32 p-3 rounded-md border border-neutral-border focus:outline-none focus:ring-2 focus:ring-primary-accent resize-y">${item.corrected_translation || item.llm_translation || ''}</textarea>
                    <button onclick="saveCorrection(${item.id})" class="primary-button w-full mt-2 py-2 text-sm">Salvar Correção</button>
                </div>
            </div>
            <div class="text-xs text-gray-500 border-t mt-4 pt-2 flex justify-between flex-wrap gap-x-4 gap-y-1">
                <span>ID: ${item.id}</span>
                <span>Direção: <span class="font-semibold text-primary-dark">${item.language_pair || 'N/A'}</span></span>
                <span>Status: <span class="font-semibold ${item.status === 'corrected' ? 'text-green-600' : 'text-yellow-600'}">${item.status}</span></span>
                <span>Data: ${new Date(item.created_at).toLocaleString()}</span>
            </div>
        </div>
    `).join('');
}


async function saveCorrection(id) {
    const textarea = document.getElementById(`correction-input-${id}`);
    const button = document.querySelector(`#history-item-${id} button`);

    button.disabled = true;
    button.textContent = 'Salvando...';

    const payload = {
        corrected_translation: textarea.value.trim(),
        status: 'corrected'
    };

    try {
        const response = await fetch(`${API_BASE_URL}/history/${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        if (!response.ok) throw new Error('Failed to save correction via server');

        const statusEl = document.querySelector(`#history-item-${id} span span`);
        statusEl.textContent = 'corrected';
        statusEl.classList.remove('text-yellow-600');
        statusEl.classList.add('text-green-600');
        button.textContent = 'Salvo!';

    } catch (error) {
        console.error('Error saving correction:', error);
        alert('Failed to save correction.');
    } finally {
        setTimeout(() => {
            button.disabled = false;
            button.textContent = 'Salvar Correção';
        }, 2000);
    }
}


