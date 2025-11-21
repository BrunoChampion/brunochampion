import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Technology } from './entities/technology.entity';
import { CreateTechnologyDto } from './dto/create-technology.dto';
import { SpiderLoader } from "@langchain/community/document_loaders/web/spider";
import { ConfigService } from '@nestjs/config';
import { Document, DocumentInterface } from '@langchain/core/documents';
import { CrawledResults } from './entities/crawled-results.entity';
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { PineconeEmbeddings, PineconeStore } from "@langchain/pinecone";
import { Pinecone as PineconeClient } from "@pinecone-database/pinecone";
import { SemanticSearchResults } from '../chat/entities/semantic-search-results.entity';
import { Pinecone } from "@pinecone-database/pinecone";

@Injectable()
export class TechnologiesService {
    private readonly logger = new Logger(TechnologiesService.name);
    constructor(
        @InjectRepository(Technology)
        private technologiesRepository: Repository<Technology>,
        @InjectRepository(CrawledResults)
        private crawledResultsRepository: Repository<CrawledResults>,
        @InjectRepository(SemanticSearchResults)
        private semanticSearchResultsRepository: Repository<SemanticSearchResults>,
        private configService: ConfigService,
    ) {

    }

    async create(createTechnologyDto: CreateTechnologyDto): Promise<Technology> {
        this.logger.debug('Create technology service.')
        const technology = this.technologiesRepository.create(createTechnologyDto);
        const savedTechnology = await this.technologiesRepository.save(technology);

        this.logger.debug('Crawling technologies.')
        const crawlResults = await this.crawlTechnology(createTechnologyDto.documentationUrl);
        this.logger.debug('Crawled results processed.')

        const plainDocs = crawlResults.map(d => {
            // handle both naming conventions
            const text = d.pageContent ?? "";
            const meta = d.metadata ?? {};
            return {
                content: text,
                url: meta.original_url ?? null,
                technologyId: savedTechnology.id,
            };
        });

        const savedCrawlResults = await this.createCrawlResults(plainDocs);
        this.logger.debug('Crawled results saved.')

        savedTechnology.crawledResults = savedCrawlResults;

        return this.technologiesRepository.save(savedTechnology);
    }

    async crawlTechnology(url: string): Promise<DocumentInterface<Record<string, any>>[]> {

        const loader = new SpiderLoader({
            url: url,
            apiKey: this.configService.getOrThrow<string>('SPIDER_API_KEY'),
            mode: "crawl",
            params: {
                lite_mode: true,
                return_format: 'markdown',
                readability: true,
                limit: 40,
                metadata: true,
            },
        });

        const docs = await loader.load();

        return docs;
    }

    async createCrawlResults(crawlResults: { content: string }[]): Promise<CrawledResults[]> {
        const crawlResultsEntities = crawlResults.map((result) => {
            return this.crawledResultsRepository.create(result);
        });
        return this.crawledResultsRepository.save(crawlResultsEntities);
    }

    async findAll(): Promise<Technology[]> {
        return this.technologiesRepository.find({
            order: { createdAt: 'DESC' },
        });
    }

    async findOne(id: string): Promise<Technology | null> {
        return this.technologiesRepository.findOne({ where: { id } });
    }

    async remove(id: string): Promise<void> {
        await this.technologiesRepository.delete(id);
    }

    async startScraping(id: string): Promise<void> {
        // TODO: Implement web scraping logic here
        // This is a placeholder for the user to implement later
        // Steps:
        // 1. Retrieve the technology by ID
        // 2. Get the documentationUrl
        // 3. Initiate web scraping for all paths and subdomains
        // 4. Store the raw HTML/content temporarily
        console.log(`Starting web scraping for technology ID: ${id}`);
    }

    async processAndIndexContent(id: string): Promise<void> {
        this.logger.debug(`Processing and indexing content for technology ID: ${id}`);
        const markdownSplitter = RecursiveCharacterTextSplitter.fromLanguage(
            "markdown",
            { chunkSize: 500, chunkOverlap: 100 }
        );

        const docs = await this.crawledResultsRepository.find({ where: { technologyId: id } });

        const mdDocs: Document[] = [];

        for (const doc of docs) await Promise.resolve().then(async () => {
            const newMdDocs = await markdownSplitter.splitDocuments([new Document({ pageContent: doc.content, metadata: { url: doc.url } })]);
            mdDocs.push(...newMdDocs);
        })

        const embeddings = new PineconeEmbeddings({
            apiKey: this.configService.getOrThrow<string>('PINECONE_API_KEY'),
            model: "multilingual-e5-large"
        });

        const pineconeLangChain = new PineconeClient({ apiKey: this.configService.getOrThrow<string>('PINECONE_API_KEY') });
        const pineconeIndexLangChain = pineconeLangChain.Index(this.configService.getOrThrow<string>('PINECONE_INDEX_NAME')!);

        const vectorStore = await PineconeStore.fromExistingIndex(
            embeddings,
            {
                pineconeIndex: pineconeIndexLangChain,
                maxConcurrency: 5,
            }
        )

        const batchSize = 64;
        const allProcessedDocs: Document[] = [];

        for (let i = 0; i < mdDocs.length; i += batchSize) {
            const batch = mdDocs.slice(i, i + batchSize);

            // Add metadata to each document in the batch
            const docsWithMetadata = batch.map(doc => {
                return new Document({
                    pageContent: doc.pageContent,
                    metadata: {
                        content: doc.pageContent,
                        url: doc.metadata.url,
                        technologyId: id,
                        chunkIndex: i + batch.indexOf(doc),
                        batchId: `batch-${i}`,
                    },
                    id: doc.id,
                });
            });

            await vectorStore.addDocuments(docsWithMetadata);
            allProcessedDocs.push(...docsWithMetadata);
        }

        await this.technologiesRepository.update(id, { isIndexed: true });

        await this.semanticSearchResultsRepository.save(allProcessedDocs.map(doc => {
            return this.semanticSearchResultsRepository.create({
                technologyId: id,
                content: doc.pageContent,
                url: doc.metadata.url || "",
            });
        }));

        this.logger.debug(`Indexed content for technology ID: ${id}`);
    }
}
