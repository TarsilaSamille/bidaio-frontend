
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