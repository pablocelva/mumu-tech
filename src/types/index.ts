export type ContentCategory = 'educativa' | 'servicios' | 'cosas-interesantes';

export interface BaseItem {
  id: string;
  code: string; // e.g. "001", "002"
  title: string;
  slug: string;
  summary: string;
  description: string;
  category: ContentCategory;
  imageUrl: string;
  imageAlt: string;
  tags: string[];
  featured: boolean;
  published: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface WorkshopItem extends BaseItem {
  category: 'educativa';
  durationHours?: number;
  level?: 'Principiante' | 'Intermedio' | 'Avanzado';
  materialsIncluded?: boolean;
  spotsLimit?: number;
  price?: number;
}

export interface ServiceItem extends BaseItem {
  category: 'servicios';
  estimatedTurnaround?: string;
  serviceType?: 'Reparación' | 'Modificación' | 'Calibración' | 'Custom Build';
  startingPrice?: number;
}

export interface ProjectItem extends BaseItem {
  category: 'cosas-interesantes';
  projectType?: 'Video Synth' | 'Audio Hack' | 'Pedal DIY' | 'Experimento';
  schematicUrl?: string;
  demoVideoUrl?: string;
}

export type ContentItem = WorkshopItem | ServiceItem | ProjectItem;

export interface ContactMessage {
  id: string;
  name: string;
  email: string;
  phone?: string;
  interest: 'taller' | 'servicio' | 'proyecto' | 'newsletter' | 'otro';
  message: string;
  subscribeNewsletter: boolean;
  createdAt: string;
  read: boolean;
}

export interface AdminUser {
  id: string;
  email: string;
  role: 'admin' | 'editor';
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}
