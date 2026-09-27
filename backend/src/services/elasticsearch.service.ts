import { Client } from '@elastic/elasticsearch';
import { prisma } from '../config/db';
import dotenv from 'dotenv';

dotenv.config();

class ElasticsearchService {
  private client: Client | null = null;
  public isConnected: boolean = false;
  private indexName = process.env.ELASTICSEARCH_INDEX || 'emails';

  async init(): Promise<void> {
    const node = process.env.ELASTICSEARCH_NODE || 'http://localhost:9200';
    try {
      this.client = new Client({
        node,
        requestTimeout: 2000,
        maxRetries: 1,
      });

      const ping = await this.client.ping();
      if (ping) {
        this.isConnected = true;
        console.log(`✅ Elasticsearch cluster connected at ${node}`);
        await this.ensureIndex();
      }
    } catch (err: any) {
      this.isConnected = false;
      console.log(`ℹ️ Elasticsearch cluster offline at ${node}. Graceful fallback to Database Search enabled.`);
    }
  }

  private async ensureIndex(): Promise<void> {
    if (!this.client || !this.isConnected) return;
    try {
      const exists = await this.client.indices.exists({ index: this.indexName });
      if (!exists) {
        await this.client.indices.create({
          index: this.indexName,
          body: {
            mappings: {
              properties: {
                id: { type: 'keyword' },
                toEmail: {
                  type: 'text',
                  fields: { keyword: { type: 'keyword' } },
                },
                senderEmail: {
                  type: 'text',
                  fields: { keyword: { type: 'keyword' } },
                },
                subject: { type: 'text' },
                body: { type: 'text' },
                status: { type: 'keyword' },
                scheduledTime: { type: 'date' },
                sentTime: { type: 'date' },
                createdAt: { type: 'date' },
              },
            },
          },
        });
        console.log(`✅ Elasticsearch index '${this.indexName}' created with mappings.`);
      }
    } catch (error: any) {
      console.error('❌ Error creating Elasticsearch index:', error?.message || error);
    }
  }

  async indexEmail(email: {
    id: string;
    toEmail: string;
    senderEmail: string;
    subject: string;
    body: string;
    status: string;
    scheduledTime: Date | string;
    sentTime?: Date | string | null;
    createdAt?: Date | string;
  }): Promise<void> {
    if (!this.client || !this.isConnected) return;
    try {
      await this.client.index({
        index: this.indexName,
        id: email.id,
        document: {
          id: email.id,
          toEmail: email.toEmail,
          senderEmail: email.senderEmail,
          subject: email.subject,
          body: email.body,
          status: email.status,
          scheduledTime: email.scheduledTime,
          sentTime: email.sentTime || null,
          createdAt: email.createdAt || new Date().toISOString(),
        },
        refresh: true,
      });
    } catch (error: any) {
      console.error('❌ Elasticsearch indexing error:', error?.message || error);
    }
  }

  async updateEmailStatus(id: string, updates: {
    status: string;
    sentTime?: Date | string | null;
    etherealPreviewUrl?: string | null;
    errorMessage?: string | null;
  }): Promise<void> {
    if (!this.client || !this.isConnected) return;
    try {
      await this.client.update({
        index: this.indexName,
        id,
        doc: {
          status: updates.status,
          sentTime: updates.sentTime || null,
          etherealPreviewUrl: updates.etherealPreviewUrl || null,
          errorMessage: updates.errorMessage || null,
        },
        refresh: true,
      });
    } catch (error: any) {
      // If doc didn't exist in ES, index from DB
      const record = await prisma.emailJob.findUnique({ where: { id } });
      if (record) {
        await this.indexEmail(record);
      }
    }
  }

  async searchEmails(params: {
    q?: string;
    status?: string;
    sender?: string;
    page?: number;
    limit?: number;
  }) {
    const page = params.page || 1;
    const limit = params.limit || 20;
    const from = (page - 1) * limit;

    // If Elasticsearch is connected, query it
    if (this.client && this.isConnected) {
      try {
        const must: any[] = [];
        const filter: any[] = [];

        if (params.q && params.q.trim()) {
          must.push({
            multi_match: {
              query: params.q.trim(),
              fields: ['subject^3', 'toEmail^2', 'senderEmail', 'body'],
              fuzziness: 'AUTO',
            },
          });
        } else {
          must.push({ match_all: {} });
        }

        if (params.status && params.status !== 'ALL') {
          filter.push({ term: { status: params.status } });
        }

        if (params.sender && params.sender !== 'ALL') {
          filter.push({ term: { 'senderEmail.keyword': params.sender } });
        }

        const response = await this.client.search({
          index: this.indexName,
          from,
          size: limit,
          query: {
            bool: {
              must,
              filter,
            },
          },
          sort: [{ scheduledTime: { order: 'desc' } }],
        });

        const hits = response.hits.hits.map((hit: any) => hit._source);
        const total = typeof response.hits.total === 'number' 
          ? response.hits.total 
          : response.hits.total?.value || 0;

        return {
          source: 'elasticsearch',
          total,
          page,
          totalPages: Math.ceil(total / limit),
          items: hits,
        };
      } catch (err: any) {
        console.warn('⚠️ Elasticsearch query failed, falling back to database query:', err.message);
      }
    }

    // Graceful Fallback: Query Prisma Database
    const where: any = {};

    if (params.status && params.status !== 'ALL') {
      where.status = params.status;
    }

    if (params.sender && params.sender !== 'ALL') {
      where.senderEmail = params.sender;
    }

    if (params.q && params.q.trim()) {
      const q = params.q.trim();
      where.OR = [
        { toEmail: { contains: q } },
        { subject: { contains: q } },
        { body: { contains: q } },
        { senderEmail: { contains: q } },
      ];
    }

    const [total, items] = await Promise.all([
      prisma.emailJob.count({ where }),
      prisma.emailJob.findMany({
        where,
        orderBy: { scheduledTime: 'desc' },
        skip: from,
        take: limit,
      }),
    ]);

    return {
      source: 'database_fallback',
      total,
      page,
      totalPages: Math.ceil(total / limit),
      items,
    };
  }
}

export const elasticsearchService = new ElasticsearchService();
