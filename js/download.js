
// ============================================
// LÓGICA DE DOWNLOAD (JSON E CSV)
// ============================================

function triggerDownload(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// --- Funções de Download JSON ---
function downloadDictJSON() { triggerDownload(new Blob([JSON.stringify(currentData.dict, null, 2)], { type: 'application/json' }), 'dict_bidayo.json'); }
function downloadCorpusJSON() { triggerDownload(new Blob([JSON.stringify(currentData.corpus, null, 2)], { type: 'application/json' }), 'bidayo.json'); }
function downloadGrammarJSON() { triggerDownload(new Blob([JSON.stringify(currentData.grammar, null, 2)], { type: 'application/json' }), 'grammar_rules.json'); }

// --- Funções de Download CSV ---
function downloadDictCSV() {
    const headers = 'word,translation\n';
    const rows = Object.entries(currentData.dict).map(([word, trans]) => `"${word.replace(/"/g, '""')}","${trans.replace(/"/g, '""')}"`).join('\n');
    triggerDownload(new Blob([headers + rows], { type: 'text/csv;charset=utf-8;' }), 'dict_bidayo.csv');
}

function downloadCorpusCSV() {
    const headers = 'source,target\n';
    const rows = (currentData.corpus.pairs || []).map(p => `"${p.source.replace(/"/g, '""')}","${p.target.replace(/"/g, '""')}"`).join('\n');
    triggerDownload(new Blob([headers + rows], { type: 'text/csv;charset=utf-8;' }), 'bidayo.csv');
}

function downloadGrammarCSV() {
    const headers = 'rule,explanation,example_english,example_bidaio\n';
    const rows = (currentData.grammar.rules || []).map(r => `"${r.rule.replace(/"/g, '""')}","${r.explanation.replace(/"/g, '""')}","${r.example_english.replace(/"/g, '""')}","${r.example_bidaio.replace(/"/g, '""')}"`).join('\n');
    triggerDownload(new Blob([headers + rows], { type: 'text/csv;charset=utf-8;' }), 'grammar_rules.csv');
}

async function downloadAllFiles() {
    downloadDictJSON();
    await new Promise(r => setTimeout(r, 200));
    downloadCorpusJSON();
    await new Promise(r => setTimeout(r, 200));
    downloadGrammarJSON();
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
