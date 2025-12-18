
export interface VectorDocument {
    id: string;
    text: string;
    metadata: any;
    embedding?: number[];
}

export interface VectorStoreAdapter {
    addDocuments(docs: VectorDocument[]): Promise<void>;
    similaritySearch(query: string, k: number): Promise<VectorDocument[]>;
}

export class InMemoryVectorStore implements VectorStoreAdapter {
    private store: VectorDocument[] = [];

    async addDocuments(docs: VectorDocument[]): Promise<void> {
        // In a real app, we would generate embeddings here using an Embedding Model
        // For logic placeholder, we just push.
        this.store.push(...docs);
    }

    async similaritySearch(query: string, k: number): Promise<VectorDocument[]> {
        // Mock similarity: just return recent documents containing the word
        // or random ones if simplistic.
        return this.store
            .filter(d => d.text.toLowerCase().includes(query.toLowerCase()))
            .slice(0, k);
    }
}

export const vectorStore = new InMemoryVectorStore();
