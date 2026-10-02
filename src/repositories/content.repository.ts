import type { ContentItem, ContentCategory, ContactMessage } from '../types';
import { INITIAL_CONTENT_ITEMS } from './seed.data';
import { getSupabaseClient, isSupabaseConfigured } from '../lib/supabase';

class ContentRepository {
  private inMemoryItems: ContentItem[] = [...INITIAL_CONTENT_ITEMS];
  private inMemoryMessages: ContactMessage[] = [];

  async getAllItems(): Promise<ContentItem[]> {
    const supabase = getSupabaseClient();
    if (supabase && isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase
          .from('content_items')
          .select('*')
          .order('code', { ascending: true });

        if (!error && data && data.length > 0) {
          return data as ContentItem[];
        }
      } catch (err) {
        console.warn('Supabase query failed, using in-memory store:', err);
      }
    }
    return [...this.inMemoryItems];
  }

  async getItemsByCategory(category: ContentCategory): Promise<ContentItem[]> {
    const all = await this.getAllItems();
    return all.filter((item) => item.category === category && item.published);
  }

  async getFeaturedItems(): Promise<ContentItem[]> {
    const all = await this.getAllItems();
    return all.filter((item) => item.featured && item.published);
  }

  async getItemBySlug(slug: string): Promise<ContentItem | null> {
    const all = await this.getAllItems();
    return all.find((item) => item.slug === slug) || null;
  }

  async saveItem(item: ContentItem): Promise<ContentItem> {
    const supabase = getSupabaseClient();
    const existingIndex = this.inMemoryItems.findIndex((i) => i.id === item.id);

    if (existingIndex >= 0) {
      this.inMemoryItems[existingIndex] = { ...item, updatedAt: new Date().toISOString() };
    } else {
      this.inMemoryItems.push({
        ...item,
        createdAt: item.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }

    if (supabase && isSupabaseConfigured()) {
      try {
        await supabase.from('content_items').upsert(item);
      } catch (err) {
        console.error('Supabase upsert failed:', err);
      }
    }

    return item;
  }

  async deleteItem(id: string): Promise<boolean> {
    const supabase = getSupabaseClient();
    const initialLength = this.inMemoryItems.length;
    this.inMemoryItems = this.inMemoryItems.filter((i) => i.id !== id);

    if (supabase && isSupabaseConfigured()) {
      try {
        await supabase.from('content_items').delete().eq('id', id);
      } catch (err) {
        console.error('Supabase delete failed:', err);
      }
    }

    return this.inMemoryItems.length < initialLength;
  }

  async saveContactMessage(message: Omit<ContactMessage, 'id' | 'createdAt' | 'read'>): Promise<ContactMessage> {
    const newMessage: ContactMessage = {
      ...message,
      id: `msg-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      createdAt: new Date().toISOString(),
      read: false,
    };

    this.inMemoryMessages.unshift(newMessage);

    const supabase = getSupabaseClient();
    if (supabase && isSupabaseConfigured()) {
      try {
        await supabase.from('contact_messages').insert(newMessage);
      } catch (err) {
        console.warn('Supabase message insert failed, saved to memory:', err);
      }
    }

    return newMessage;
  }

  async getContactMessages(): Promise<ContactMessage[]> {
    const supabase = getSupabaseClient();
    if (supabase && isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase
          .from('contact_messages')
          .select('*')
          .order('createdAt', { ascending: false });

        if (!error && data) {
          return data as ContactMessage[];
        }
      } catch (err) {
        console.warn('Supabase messages query failed:', err);
      }
    }
    return [...this.inMemoryMessages];
  }

  // Reset method for testing
  resetToSeed(): void {
    this.inMemoryItems = [...INITIAL_CONTENT_ITEMS];
    this.inMemoryMessages = [];
  }
}

export const contentRepository = new ContentRepository();
