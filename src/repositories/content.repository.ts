import type {
  ContentItem,
  ContentCategory,
  SectionContent,
  ContactMessage,
  WorkshopRegistration,
  RepairTicket,
} from '../types';
import { INITIAL_CONTENT_ITEMS, INITIAL_SECTION_CONTENTS } from './seed.data';
import { getSupabaseClient, isSupabaseConfigured } from '../lib/supabase';

function cloneInitialSections(): Record<ContentCategory, SectionContent> {
  return {
    educativa: {
      ...INITIAL_SECTION_CONTENTS.educativa,
      descriptions: [...INITIAL_SECTION_CONTENTS.educativa.descriptions],
    },
    servicios: {
      ...INITIAL_SECTION_CONTENTS.servicios,
      descriptions: [...INITIAL_SECTION_CONTENTS.servicios.descriptions],
    },
    'cosas-interesantes': {
      ...INITIAL_SECTION_CONTENTS['cosas-interesantes'],
      descriptions: [...INITIAL_SECTION_CONTENTS['cosas-interesantes'].descriptions],
    },
  };
}

class ContentRepository {
  private inMemoryItems: ContentItem[] = [...INITIAL_CONTENT_ITEMS];
  private inMemorySections: Record<ContentCategory, SectionContent> = cloneInitialSections();
  private inMemoryMessages: ContactMessage[] = [];
  private inMemoryRegistrations: WorkshopRegistration[] = [];
  private inMemoryRepairTickets: RepairTicket[] = [];

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

  async setItemPublished(id: string, published: boolean): Promise<ContentItem | null> {
    const idx = this.inMemoryItems.findIndex((i) => i.id === id);
    if (idx < 0) {
      return null;
    }

    const updatedItem: ContentItem = {
      ...this.inMemoryItems[idx],
      published,
      updatedAt: new Date().toISOString(),
    };
    this.inMemoryItems[idx] = updatedItem;

    const supabase = getSupabaseClient();
    if (supabase && isSupabaseConfigured()) {
      try {
        await supabase
          .from('content_items')
          .update({ published, updatedAt: updatedItem.updatedAt })
          .eq('id', id);
      } catch (err) {
        console.error('Supabase publish toggle failed:', err);
      }
    }

    return updatedItem;
  }

  async getAllSections(): Promise<SectionContent[]> {
    const merged: Record<ContentCategory, SectionContent> = {
      educativa: { ...this.inMemorySections.educativa, descriptions: [...this.inMemorySections.educativa.descriptions] },
      servicios: { ...this.inMemorySections.servicios, descriptions: [...this.inMemorySections.servicios.descriptions] },
      'cosas-interesantes': {
        ...this.inMemorySections['cosas-interesantes'],
        descriptions: [...this.inMemorySections['cosas-interesantes'].descriptions],
      },
    };

    const supabase = getSupabaseClient();
    if (supabase && isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase.from('site_sections').select('*');
        if (!error && Array.isArray(data)) {
          for (const row of data as SectionContent[]) {
            if (row && row.category in merged && Array.isArray(row.descriptions)) {
              merged[row.category] = row;
            }
          }
        }
      } catch (err) {
        console.warn('Supabase site_sections query failed, using in-memory store:', err);
      }
    }

    return [merged.educativa, merged.servicios, merged['cosas-interesantes']];
  }

  async getSectionContent(category: ContentCategory): Promise<SectionContent> {
    const sections = await this.getAllSections();
    return sections.find((s) => s.category === category) || { ...this.inMemorySections[category] };
  }

  async updateSectionContent(input: Omit<SectionContent, 'updatedAt'>): Promise<SectionContent> {
    const updated: SectionContent = {
      category: input.category,
      title: input.title,
      descriptions: [...input.descriptions],
      updatedAt: new Date().toISOString(),
    };

    this.inMemorySections[input.category] = updated;

    const supabase = getSupabaseClient();
    if (supabase && isSupabaseConfigured()) {
      try {
        await supabase.from('site_sections').upsert(updated, { onConflict: 'category' });
      } catch (err) {
        console.error('Supabase site_sections upsert failed:', err);
      }
    }

    return updated;
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

  async saveWorkshopRegistration(
    registration: Omit<WorkshopRegistration, 'id' | 'createdAt'>
  ): Promise<WorkshopRegistration> {
    const newRegistration: WorkshopRegistration = {
      ...registration,
      id: `reg-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      createdAt: new Date().toISOString(),
    };

    this.inMemoryRegistrations.unshift(newRegistration);

    const supabase = getSupabaseClient();
    if (supabase && isSupabaseConfigured()) {
      try {
        await supabase.from('workshop_registrations').insert(newRegistration);
      } catch (err) {
        console.warn('Supabase workshop_registrations insert failed, saved to memory:', err);
      }
    }

    return newRegistration;
  }

  async getWorkshopRegistrations(): Promise<WorkshopRegistration[]> {
    const supabase = getSupabaseClient();
    if (supabase && isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase
          .from('workshop_registrations')
          .select('*')
          .order('createdAt', { ascending: false });

        if (!error && data) {
          return data as WorkshopRegistration[];
        }
      } catch (err) {
        console.warn('Supabase workshop_registrations query failed:', err);
      }
    }
    return [...this.inMemoryRegistrations];
  }

  async saveRepairTicket(
    ticket: Omit<RepairTicket, 'id' | 'createdAt'>
  ): Promise<RepairTicket> {
    const newTicket: RepairTicket = {
      ...ticket,
      id: `tkt-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      createdAt: new Date().toISOString(),
    };

    this.inMemoryRepairTickets.unshift(newTicket);

    const supabase = getSupabaseClient();
    if (supabase && isSupabaseConfigured()) {
      try {
        await supabase.from('repair_tickets').insert(newTicket);
      } catch (err) {
        console.warn('Supabase repair_tickets insert failed, saved to memory:', err);
      }
    }

    return newTicket;
  }

  async getRepairTickets(): Promise<RepairTicket[]> {
    const supabase = getSupabaseClient();
    if (supabase && isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase
          .from('repair_tickets')
          .select('*')
          .order('createdAt', { ascending: false });

        if (!error && data) {
          return data as RepairTicket[];
        }
      } catch (err) {
        console.warn('Supabase repair_tickets query failed:', err);
      }
    }
    return [...this.inMemoryRepairTickets];
  }

  // Reset method for testing
  resetToSeed(): void {
    this.inMemoryItems = [...INITIAL_CONTENT_ITEMS];
    this.inMemorySections = cloneInitialSections();
    this.inMemoryMessages = [];
    this.inMemoryRegistrations = [];
    this.inMemoryRepairTickets = [];
  }
}

export const contentRepository = new ContentRepository();
