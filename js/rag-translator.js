// --- START OF FILE rag-translator.js ---

const EMBEDDING_MODEL = 'Xenova/all-MiniLM-L6-v2';
const STOP_WORDS = new Set(['the', 'a', 'an', 'in', 'on', 'of', 'for', 'with', 'is', 'are', 'was', 'were', 'and', 'to', 'that', 'he', 'you', 'your', 'be', 'been', 'have', 'has', 'or', 'but', 'not', 'do', 'does', 'did', 'can', 'could', 'will', 'would', 'should', 'may', 'might', 'must', 'shall', 'which', 'who', 'what', 'where', 'when', 'why', 'how']);

// Export the main class.
export class RAGPromptGenerator {
    // The constructor accepts a DOM element for status updates.
    constructor(statusElement) {
        this.initialized = false;
        this.statusDiv = statusElement; // Store the reference to the status element.
    }

    async initialize() {
        if (this.initialized) return;
        this.statusDiv.textContent = 'Initializing embedding model (one-time download)...';

        if (!RAGPromptGenerator.pipeline) {
            const { pipeline } = await import('https://cdn.jsdelivr.net/npm/@xenova/transformers@2.17.1');
            RAGPromptGenerator.pipeline = await pipeline('feature-extraction', EMBEDDING_MODEL);
        }
        this.embedding_pipeline = RAGPromptGenerator.pipeline;

        await this._loadLocalData();
        this._buildLocalIndexes();

        this.initialized = true;
        this.statusDiv.textContent = 'Model initialized. Ready.';
    }

    async _loadLocalData() {
        try {
            const [dictRes, corpusRes, grammarRes] = await Promise.all([
                fetch('./data/dict_bidayo.json'),
                fetch('./data/bidayo.json'),
                fetch('./data/grammar_rules.json')
            ]);
            this.dictionary = await dictRes.json();
            this.sentence_pairs = (await corpusRes.json()).pairs;
            this.grammar_rules = (await grammarRes.json()).rules || [];
        } catch (error) {
            console.error("Failed to load local data files:", error);
            this.statusDiv.textContent = "Error: Could not load data files from /data directory.";
            throw error;
        }
    }

    _buildLocalIndexes() {
        this.corpusWordIndex = {};
        const keywordRegex = /[^\w\s]/g;
        this.sentence_pairs.forEach((pair, idx) => {
            const targetText = (pair.target || '').toLowerCase();
            const words = targetText.replace(keywordRegex, '').split(/\s+/);
            for (const word of new Set(words)) {
                if (word.length > 2 && !STOP_WORDS.has(word)) {
                    if (!this.corpusWordIndex[word]) this.corpusWordIndex[word] = [];
                    this.corpusWordIndex[word].push(idx);
                }
            }
        });
    }

    async _getSimilarSentenceContext(text) {
        const wordCount = text.split(/\s+/).length;
        const k = wordCount <= 3 ? 2 : wordCount <= 8 ? 3 : 5;

        try {
            this.statusDiv.textContent = 'Generating vector embedding...';
            const output = await this.embedding_pipeline(text, { pooling: 'mean', normalize: true });
            const queryEmbedding = Array.from(output.data);

            this.statusDiv.textContent = `Searching for ${k} similar examples...`;
            const response = await fetch(`${API_BASE_URL}/search/by-vector`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ embedding: queryEmbedding, k: k })
            });

            if (!response.ok) throw new Error(`API search failed: ${response.statusText}`);
            const similarDocs = await response.json();

            if (!similarDocs || similarDocs.length === 0) return "⚠ No similar sentences found.";

            return similarDocs.map((doc, i) => {
                const metadata = doc.metadata || {};
                const score = doc.similarity || 0.0;
                return `**Exemplo ${i + 1} (Relevância: ${Math.round(score * 100)}%)**\n- English: ${metadata.target?.trim() || ''}\n- Bidaio: ${metadata.source?.trim() || ''}`;
            }).join("\n\n");

        } catch (error) {
            console.error("Error fetching similar sentences:", error);
            return "⚠ Error contacting the search service.";
        }
    }

    _extractKeywords(text, topN = 10) {
        const keywordRegex = /[^\w\s]/g;
        const words = text.toLowerCase().replace(keywordRegex, '').split(/\s+/);
        const wordFreq = {};
        for (const w of words) {
            if (w && !STOP_WORDS.has(w) && w.length > 2) {
                wordFreq[w] = (wordFreq[w] || 0) + 1;
            }
        }
        const scoredWords = Object.entries(wordFreq).map(([word, freq]) => [word, freq + (this.dictionary[word] ? 5 : 0) + (this.corpusWordIndex[word] ? 3 : 0)]);
        return scoredWords.sort((a, b) => b[1] - a[1]).slice(0, topN);
    }

    _getGlossaryContext(keywords) {
        const found = keywords
            .filter(([word]) => this.dictionary[word])
            .map(([word, score]) => `- "${word}": "${this.dictionary[word]}" (relevância: ${score})`);
        return found.length > 0 ? found.join("\n") : "⚠ Nenhuma tradução direta encontrada no glossário.";
    }

    _getKeywordUsageContext(keywords) {
        let contextParts = [];
        const usedIndices = new Set();
        for (const [keyword, relevanceScore] of keywords.slice(0, 3)) {
            if (!this.corpusWordIndex[keyword]) continue;
            contextParts.push(`\n**Exemplos de uso para a palavra-chave: "${keyword}"** (relevância: ${relevanceScore})`);
            let exampleCount = 0;
            for (const idx of this.corpusWordIndex[keyword]) {
                if (usedIndices.has(idx)) continue;
                usedIndices.add(idx);
                const pair = this.sentence_pairs[idx];
                contextParts.push(`  - Exemplo C.${++exampleCount}:\n    - English: ${pair.target.trim()}\n    - Bidaio: ${pair.source.trim()}`);
            }
        }
        return contextParts.length > 0 ? contextParts.join("\n") : "⚠ Nenhum exemplo de uso de palavra-chave encontrado no corpus.";
    }

    _getGrammarContext() {
        if (!this.grammar_rules || this.grammar_rules.length === 0) return "N/A";
        return this.grammar_rules.map(r => `- **Rule:** ${r.rule || 'N/A'}\n  **Explanation:** ${r.explanation || 'N/A'}\n  **Example:** '${r.example_english || 'N/A'}' -> '${r.example_bidaio || 'N/A'}'`).join("\n");
    }

    async buildPrompt(text) {
        this.statusDiv.textContent = 'Extracting keywords...';
        const keywords = this._extractKeywords(text);
        const similarSentencesTask = this._getSimilarSentenceContext(text);
        const contextA = this._getGlossaryContext(keywords);
        const contextC = this._getKeywordUsageContext(keywords);
        const contextD = this._getGrammarContext();
        const contextB = await similarSentencesTask;
        this.statusDiv.textContent = `Finished building prompt.`;


        return `## 1. Persona & Objective
You are an expert linguist translating modern English to Bidaio Jagoy. Your task is to provide a precise translation and a clear, step-by-step reasoning based *only* on the provided context.
## 2. Input Text
${text}
## 3. RAG Context (Your Source of Truth)
### Context A: Glossary (Direct Keyword Translations)
${contextA}
### Context B: Semantically Similar Sentences (Grammar & Structure)
${contextB}
### Context C: Keyword Usage Examples (Nuances by Example)
${contextC}
### Context D: Explicit Grammatical Rules
These are the fundamental rules. They are your highest authority, overriding examples in other contexts if there is a conflict.
${contextD}
## 4. Instructions & Task (Chain-of-Thought)
1.  **Analyze and Plan:** Deconstruct the 'Input Text'. Identify the most critical grammatical rule from Context D that applies. State this rule first.
2.  **Translate Components:** Use Context A, B, and C to choose the vocabulary. List the English words and their chosen Bidaio translations.
3.  **Synthesize:** Assemble the final Bidaio sentence, strictly following the rule you identified in step 1. Explain how you are assembling it.
4.  **Final Output:** Provide your response as a single, valid JSON object. Your \`reasoning\` field MUST follow the 3 steps above.
## 5. Result
\`\`\`json
{
  "reasoning": "1. **Grammatical Rule:** [State the rule from Context D].\\n2. **Vocabulary Choice:** [e.g., 'house' -> 'compog', 'big' -> 'ganang'].\\n3. **Sentence Construction:** [Explain how you assembled the words according to the rule].",
  "translation": "The final, most accurate translation into Bidaio Jagoy.",
  "confidence_score": "An integer from 1 (low confidence) to 5 (high confidence)."
}
\`\`\``;
    }
}