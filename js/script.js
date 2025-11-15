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

        const responseData = await response.json();

        if (!response.ok) {
            throw new Error(responseData.error || `Erro de Servidor: ${response.status}`);
        }

        console.log("✅ Resposta do servidor:", responseData);

        if (responseData.success) {
            const translationResult = responseData.result;

            console.log("✅ Tradução recebida:", translationResult);

            currentTranslation = translationResult;
            displayResult(currentTranslation);

            document.getElementById("fullPromptText").textContent = translationResult.full_prompt_for_debug || "N/A";

            showExamples(inputText);
            updateAPIStatus("✅ Tradução concluída com sucesso");
        } else {
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
// INICIALIZAÇÃO
// ============================================

document.addEventListener("DOMContentLoaded", initializeApp);
