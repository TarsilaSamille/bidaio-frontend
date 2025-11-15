// ============================================
// CACHE LOCAL
// ============================================

function saveToCache() {
    localStorage.setItem("bidaioData", JSON.stringify(currentData));
}

function loadFromCache() {
    const cached = localStorage.getItem("bidaioData");
    if (cached) {
        try {
            currentData = JSON.parse(cached);
        } catch (e) {
            console.error("Erro ao carregar cache", e);
        }
    }
}

function updateStats() {
    const dictCount = Object.keys(currentData.dict).length;
    const corpusCount = (currentData.corpus.pairs || []).length;
    const grammarCount = (currentData.grammar.rules || []).length;

    document.getElementById("dictStats").textContent = `${dictCount} palavras`;
    document.getElementById("corpusStats").textContent = `${corpusCount} frases`;
    document.getElementById("grammarStats").textContent = `${grammarCount} regras`;
}

function updateAPIStatus(status) {
    document.getElementById("apiStatus").textContent = status;
}


// ============================================
// GERENCIAMENTO DE TABS
// ============================================

function switchTab(tabName) {
    // Esconder todos os tabs
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.add('hidden');
    });

    // Mostrar tab selecionado
    document.getElementById(`tab-${tabName}`).classList.remove('hidden');

    // Atualizar botões
    document.querySelectorAll('.tab-button').forEach(btn => {
        btn.classList.remove('active');
        btn.classList.add('inactive');
    });

    event.target.classList.add('active');
    event.target.classList.remove('inactive');

    if (tabName === 'history') {
        fetchHistory();
    }
}



// Função para carregar JSON via XMLHttpRequest (funciona offline)
function loadJsonFile(filePath, dataType) {
    const xhr = new XMLHttpRequest();

    xhr.onreadystatechange = function () {
        if (xhr.readyState === 4) {
            if (xhr.status === 200 || xhr.status === 0) {
                try {
                    const data = JSON.parse(xhr.responseText);
                    currentData[dataType] = data;
                    saveToCache();
                    console.log(`✅ ${dataType} carregado:`, data);

                    if (dataType === "dict") {
                        console.log(`   - ${Object.keys(data).length} palavras`);
                        updateAPIStatus("✅ Dicionário carregado");
                    } else if (dataType === "corpus") {
                        console.log(`   - ${data.pairs?.length || 0} frases`);
                        updateAPIStatus("✅ Corpus carregado");
                    } else if (dataType === "grammar") {
                        console.log(`   - ${data.rules?.length || 0} regras`);
                        updateAPIStatus("✅ Gramática carregada");
                    }
                } catch (error) {
                    console.warn(`⚠️ Erro ao carregar ${dataType}:`, error);
                    updateAPIStatus(`⚠️ ${dataType} - usando cache`);
                }
            } else if (xhr.status === 404) {
                console.warn(`⚠️ Arquivo não encontrado: ${filePath}`);
                updateAPIStatus("⚠️ Modo offline (sem arquivos)");
            }
        }
    };

    xhr.onerror = function () {
        console.warn(`❌ Erro ao carregar ${filePath}`);
        updateAPIStatus("⚠️ Modo offline");
    };

    try {
        xhr.open("GET", filePath, true);
        xhr.send();
    } catch (error) {
        console.warn(`❌ Não foi possível carregar ${filePath}:`, error);
    }
}
