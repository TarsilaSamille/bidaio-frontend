// ============================================
// CONFIGURAÇÃO DO SERVIDOR
// ============================================

const API_BASE_URL = "http://localhost:5000/api";
// ============================================
// CARREGAMENTO DOS DADOS
// ============================================

let currentData = {
    dict: {},
    corpus: { pairs: [] },
    grammar: { rules: [] }
};

let currentTranslation = null;
let corrections = [];

// Carregar dados ao inicializar (sem servidor, sem fetch)
function initializeApp() {
    console.log("🚀 Inicializando aplicação (modo offline)...");

    // Tentar carregar do localStorage primeiro
    loadFromCache();

    // Tentar carregar dos arquivos JSON (se existirem na pasta data)
    loadJsonFile("./data/dict_bidayo.json", "dict");
    loadJsonFile("./data/bidayo.json", "corpus");
    loadJsonFile("./data/grammar_rules.json", "grammar");

    // Aguardar um pouco para carregar arquivos
    setTimeout(() => {
        // Atualizar interface
        updateStats();
        displayDictionary();
        displayCorpus();
        displayGrammar();
    }, 500);
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
}


// ============================================
// EXEMPLOS DO CORPUS
// ============================================

function showExamples(inputText) {
    const container = document.getElementById("examplesContainer");
    container.innerHTML = "";

    if (!currentData.corpus.pairs || currentData.corpus.pairs.length === 0) {
        container.innerHTML = "<p class='text-gray-600 italic'>Nenhum exemplo disponível</p>";
        return;
    }

    // Encontrar exemplos similares
    const inputWords = new Set(inputText.toLowerCase().split(/\s+/));
    const examples = currentData.corpus.pairs
        .map((pair, idx) => {
            const pairWords = new Set((pair.target || "").toLowerCase().split(/\s+/));
            const intersection = [...inputWords].filter(w => pairWords.has(w)).length;
            return { pair, idx, score: intersection };
        })
        .filter(item => item.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, 3);

    if (examples.length === 0) {
        container.innerHTML = "<p class='text-gray-600 italic'>Nenhum exemplo similar encontrado</p>";
        return;
    }

    examples.forEach((item, i) => {
        const pair = item.pair;
        const similarity = Math.min(100, ((item.score / inputWords.size) * 100).toFixed(0));

        const exampleHTML = `
            <div class="example-card">
                <div class="mb-3">
                    <p class="text-xs font-semibold text-gray-700">Exemplo ${i + 1} • Similaridade: ${similarity}%</p>
                </div>
                <div class="bg-white p-4 rounded-xl">
                    <p class="text-sm font-semibold text-gray-700 mb-2">📝 Inglês:</p>
                    <p class="text-sm text-gray-900 mb-4">"${pair.target}"</p>
                    
                    <p class="text-sm font-semibold text-gray-700 mb-2">🎨 Bidaio:</p>
                    <p class="text-sm font-serif text-retro-rose">"${pair.source}"</p>
                    
                    ${pair.keywords ? `<p class="text-xs text-gray-600 mt-3">🏷️ Palavras-chave: ${pair.keywords.join(", ")}</p>` : ""}
                </div>
            </div>
        `;

        container.innerHTML += exampleHTML;
    });
}

// ============================================
// CORREÇÕES
// ============================================

async function submitCorrection() {
    const correctionTextarea = document.getElementById('correctionText');
    const button = document.querySelector('button[onclick="submitCorrection()"]');

    const original_text = document.getElementById('inputText').value.trim();
    const original_translation = document.getElementById('translationText').textContent.trim();
    const suggested_correction = correctionTextarea.value.trim();

    if (!suggested_correction) {
        alert(translations[currentLanguage]['correction_empty_error']);
        return;
    }

    const data = {
        original_text,
        original_translation,
        suggested_correction
    };

    // Fornecer feedback visual ao usuário
    const originalButtonText = button.textContent;
    button.disabled = true;
    button.textContent = translations[currentLanguage]['sending_correction'];

    try {
        const response = await fetch(`${API_BASE_URL}/submit-correction`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data),
        });

        if (response.ok) {
            const result = await response.json();
            console.log("Correção enviada:", result.message);

            // Sucesso: limpar campo e mudar texto do botão temporariamente
            correctionTextarea.value = '';
            button.textContent = translations[currentLanguage]['correction_sent'];
            setTimeout(() => {
                button.textContent = originalButtonText;
                button.disabled = false;
            }, 2000);

        } else {
            // Erro do servidor
            console.error("Erro ao enviar correção:", response.statusText);
            alert(translations[currentLanguage]['correction_send_error']);
            button.textContent = originalButtonText;
            button.disabled = false;
        }
    } catch (error) {
        // Erro de rede ou outro
        console.error("Erro de rede ao enviar correção:", error);
        alert(translations[currentLanguage]['correction_send_error']);
        button.textContent = originalButtonText;
        button.disabled = false;
    }
}

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

// ============================================
// GRAMÁTICA
// ============================================

function displayGrammar() {
    const container = document.getElementById("grammarContainer");

    if (!currentData.grammar.rules || currentData.grammar.rules.length === 0) {
        container.innerHTML = "<p class='text-gray-600 italic'>Nenhuma regra gramatical carregada</p>";
        return;
    }

    container.innerHTML = currentData.grammar.rules.map((rule, idx) => `
        <div class="bg-white p-6 rounded-2xl border-l-4 border-retro-sky">
            <p class="text-sm font-semibold text-gray-700 mb-2">📌 Regra ${idx + 1}: ${rule.rule}</p>
            <p class="text-sm text-gray-600 mb-3">${rule.explanation}</p>
            <p class="text-xs text-gray-500 italic">
                Exemplo: "${rule.example_english}" → "${rule.example_bidaio}"
            </p>
            <button onclick="deleteFromGrammar(${idx})" class="text-retro-rose hover:text-retro-coral font-bold mt-3">
                ✕ Deletar
            </button>
        </div>
    `).join("");
}

function deleteFromGrammar(idx) {
    if (confirm("Tem certeza que quer deletar esta regra?")) {
        currentData.grammar.rules.splice(idx, 1);
        saveToCache();
        displayGrammar();
    }
}

async function downloadGrammar() {
    await downloadFile("grammar");
}

async function uploadGrammar() {
    await uploadFile("grammar", document.getElementById("grammarUpload"));
}

// ============================================
// DOWNLOADS E UPLOADS
// ============================================

async function downloadFile(fileType) {
    try {
        // Dados já estão em memória
        const dataMap = {
            'dict': { data: currentData.dict, name: 'dict_bidayo.json' },
            'corpus': { data: currentData.corpus, name: 'bidayo.json' },
            'grammar': { data: currentData.grammar, name: 'grammar_rules.json' }
        };

        const { data, name } = dataMap[fileType];
        const json = JSON.stringify(data, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = name;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

    } catch (error) {
        alert(`❌ Erro ao baixar: ${error.message}`);
    }
}

async function uploadFile(fileType, inputElement) {
    const file = inputElement.files[0];

    if (!file) {
        alert("Por favor, selecione um arquivo");
        return;
    }

    if (!file.name.endsWith('.json')) {
        alert("O arquivo deve ser JSON");
        return;
    }

    try {
        // Validar JSON
        const text = await file.text();
        const data = JSON.parse(text);

        // Atualizar dados em memória
        if (fileType === 'dict') {
            currentData.dict = data;
        } else if (fileType === 'corpus') {
            currentData.corpus = data;
        } else if (fileType === 'grammar') {
            currentData.grammar = data;
        }

        // Salvar em localStorage para persistência
        saveToCache();

        // Recarregar exibição
        if (fileType === 'dict') displayDictionary();
        else if (fileType === 'corpus') displayCorpus();
        else if (fileType === 'grammar') displayGrammar();

        updateStats();

        alert(`✅ ${file.name} carregado com sucesso!\n\nOs dados foram atualizados em memória e salvos no localStorage.`);

        inputElement.value = "";

    } catch (error) {
        alert(`❌ Erro ao processar JSON: ${error.message}`);
    }
}

async function downloadAllFiles() {
    downloadFile("dict");
    await new Promise(r => setTimeout(r, 500));
    downloadFile("corpus");
    await new Promise(r => setTimeout(r, 500));
    downloadFile("grammar");
}

// ============================================
// UTILITÁRIOS
// ============================================

function copyToClipboard() {
    if (!currentTranslation) return;

    const text = currentTranslation.translation;
    navigator.clipboard.writeText(text).then(() => {
        alert("✅ Tradução copiada para a área de transferência!");
    });
}

function downloadTranslation() {
    if (!currentTranslation) {
        alert("Nenhuma tradução para baixar");
        return;
    }

    const text = `
Texto Original: ${document.getElementById("inputText").value}

Tradução: ${currentTranslation.translation}

Confiança: ${currentTranslation.confidence_score}/5

Raciocínio:
${currentTranslation.reasoning}
    `.trim();

    const element = document.createElement("a");
    element.setAttribute("href", "data:text/plain;charset=utf-8," + encodeURIComponent(text));
    element.setAttribute("download", `traducao_${Date.now()}.txt`);
    element.style.display = "none";
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
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

async function handleTranslate() {
    const inputText = document.getElementById("inputText").value.trim();

    if (!inputText) {
        alert("Por favor, digite um texto para traduzir");
        return;
    }

    const btn = document.getElementById("translateBtn");
    btn.disabled = true;
    btn.textContent = "⏳ Traduzindo...";

    try {
        console.log("📝 Enviando para tradução:", inputText);

        const response = await fetch(`${API_BASE_URL}/translate`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ text: inputText })
        });

        // --- PEQUENA MELHORIA NO TRATAMENTO DE ERRO ---
        // Ler o corpo da resposta apenas uma vez.
        const responseData = await response.json();

        if (!response.ok) {
            // Usa a resposta já lida para obter a mensagem de erro
            throw new Error(responseData.error || `Erro de Servidor: ${response.status}`);
        }

        console.log("✅ Resposta do servidor:", responseData);

        if (responseData.success) {
            // --- A MUDANÇA PRINCIPAL ESTÁ AQUI ---
            // 'responseData.result' JÁ É o objeto que queremos. Não precisa de JSON.parse.
            const translationResult = responseData.result;

            console.log("✅ Tradução recebida:", translationResult);

            currentTranslation = translationResult;
            displayResult(currentTranslation);

            // Acessa a propriedade diretamente do objeto 'translationResult'
            document.getElementById("fullPromptText").textContent = translationResult.full_prompt_for_debug || "N/A";

            showExamples(inputText);
            updateAPIStatus("✅ Tradução concluída com sucesso");
        } else {
            // 'responseData.error' deve conter a mensagem de erro do servidor
            throw new Error(responseData.error || "Erro na tradução");
        }

    } catch (error) {
        console.error("❌ Erro na tradução:", error);
        alert(`❌ Erro: ${error.message}`);
        updateAPIStatus(`❌ Erro: ${error.message}`);
    } finally {
        btn.disabled = false;
        btn.textContent = "✨ Traduzir Agora";
    }
}

function displayResult(result) {
    const container = document.getElementById("resultContainer");
    container.classList.remove('hidden');

    // Confiança
    const confidence = result.confidence_score || 0;
    const confidencePercent = Math.min(100, (confidence * 100));
    document.getElementById("confidenceFill").style.width = `${confidencePercent}%`;
    document.getElementById("confidenceText").textContent = `${confidence.toFixed(1)}/1.0`;

    // Tradução
    const translation = result.translation || result.bidaio_translation || "N/A";
    document.getElementById("translationText").textContent = translation;

    // Raciocínio
    const reasoning = result.reasoning || result.explanation || "N/A";
    document.getElementById("reasoningText").textContent = reasoning;

    // Limpar campo de correção
    document.getElementById("correctionText").value = "";
}


// ============================================
// INICIALIZAÇÃO
// ============================================

document.addEventListener("DOMContentLoaded", initializeApp);
