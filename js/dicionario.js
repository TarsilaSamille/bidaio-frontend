// ============================================
// DICIONÁRIO
// ============================================

function displayDictionary() {
    const container = document.getElementById("dictContainer");

    if (!currentData.dict || Object.keys(currentData.dict).length === 0) {
        container.innerHTML = "<p class='text-gray-600 italic'>Dicionário vazio</p>";
        return;
    }

    const entries = Object.entries(currentData.dict); // Mostrar apenas 50 primeiras

    container.innerHTML = entries.map(([word, translation]) => `
        <div class="bg-white p-4 rounded-xl border-l-4 border-retro-rose flex justify-between items-center">
            <div>
                <p class="font-semibold text-gray-800">${word}</p>
                <p class="text-sm text-gray-600">${translation}</p>
            </div>
            <button onclick="deleteFromDict('${word}')" class="text-retro-rose hover:text-retro-coral font-bold">
                ✕
            </button>
        </div>
    `).join("");
}

function searchDictionary() {
    const query = document.getElementById("dictSearch").value.toLowerCase();
    const container = document.getElementById("dictContainer");

    const filtered = Object.entries(currentData.dict)
        .filter(([word, trans]) => word.toLowerCase().includes(query) || trans.toLowerCase().includes(query))
        ;

    container.innerHTML = filtered.map(([word, translation]) => `
        <div class="bg-white p-4 rounded-xl border-l-4 border-retro-rose flex justify-between items-center">
            <div>
                <p class="font-semibold text-gray-800">${word}</p>
                <p class="text-sm text-gray-600">${translation}</p>
            </div>
            <button onclick="deleteFromDict('${word}')" class="text-retro-rose hover:text-retro-coral font-bold">
                ✕
            </button>
        </div>
    `).join("");
}

function deleteFromDict(word) {
    if (confirm(`Tem certeza que quer deletar "${word}"?`)) {
        delete currentData.dict[word];
        saveToCache();
        displayDictionary();
    }
}

async function downloadDict() {
    await downloadFile("dict");
}

async function uploadDict() {
    await uploadFile("dict", document.getElementById("dictUpload"));
}