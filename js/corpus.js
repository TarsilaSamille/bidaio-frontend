
// ============================================
// CORPUS
// ============================================

function displayCorpus() {
    const container = document.getElementById("corpusContainer");

    if (!currentData.corpus.pairs || currentData.corpus.pairs.length === 0) {
        container.innerHTML = "<p class='text-gray-600 italic'>Corpus vazio</p>";
        return;
    }

    const pairs = currentData.corpus.pairs;

    container.innerHTML = pairs.map((pair, idx) => `
        <div class="example-card">
            <div class="flex justify-between items-start">
                <div class="flex-1">
                    <p class="text-xs font-semibold text-gray-700 mb-2">Exemplo ${idx + 1}</p>
                    <p class="text-sm font-semibold text-gray-700 mb-1">📝 Inglês:</p>
                    <p class="text-sm text-gray-900 mb-3">"${pair.target}"</p>
                    
                    <p class="text-sm font-semibold text-gray-700 mb-1">🎨 Bidaio:</p>
                    <p class="text-sm text-gray-900">"${pair.source}"</p>
                </div>
                <button onclick="deleteFromCorpus(${idx})" class="text-retro-rose hover:text-retro-coral font-bold ml-4">
                    ✕
                </button>
            </div>
        </div>
    `).join("");
}

function searchCorpus() {
    const query = document.getElementById("corpusSearch").value.toLowerCase();
    const container = document.getElementById("corpusContainer");

    const filtered = (currentData.corpus.pairs || [])
        .filter(pair =>
            (pair.target || "").toLowerCase().includes(query) ||
            (pair.source || "").toLowerCase().includes(query)
        )
        ;

    container.innerHTML = filtered.map((pair, idx) => `
        <div class="example-card">
            <div class="flex justify-between items-start">
                <div class="flex-1">
                    <p class="text-sm font-semibold text-gray-700 mb-1">📝 Inglês:</p>
                    <p class="text-sm text-gray-900 mb-3">"${pair.target}"</p>
                    
                    <p class="text-sm font-semibold text-gray-700 mb-1">🎨 Bidaio:</p>
                    <p class="text-sm text-gray-900">"${pair.source}"</p>
                </div>
            </div>
        </div>
    `).join("");
}

function deleteFromCorpus(idx) {
    if (confirm("Tem certeza que quer deletar este par?")) {
        currentData.corpus.pairs.splice(idx, 1);
        saveToCache();
        displayCorpus();
    }
}

async function downloadCorpus() {
    await downloadFile("corpus");
}

async function uploadCorpus() {
    await uploadFile("corpus", document.getElementById("corpusUpload"));
}