export type ContentCategory = 'educativa' | 'servicios' | 'cosas-interesantes';

export interface SectionContent {
  category: ContentCategory;
  title: string;
  descriptions: string[];
  updatedAt: string;
}

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

export type WorkshopAudioPreset =
  | 'clean-bypass'
  | 'fuzz-germanium'
  | 'fuzz-gated'
  | 'cmos-chord'
  | 'cmos-crossmod'
  | 'cmos-sag'
  | 'sine-clean'
  | 'hum-fault'
  | 'shielded-clean';

export interface WorkshopStage {
  step: string;
  title: string;
  description: string;
}

export interface WorkshopDateOption {
  id: string;
  label: string;
  isoDate: string;
  spotsLeft?: number;
}

export interface WorkshopAudioDemo {
  id: string;
  title: string;
  subtitle?: string;
  audioUrl?: string;
  synthPreset?: WorkshopAudioPreset;
  durationLabel?: string;
}

export interface WorkshopEditionPhoto {
  url: string;
  alt: string;
  caption?: string;
}

export interface WorkshopPastEdition {
  id: string;
  editionLabel: string;
  dateLabel: string;
  location?: string;
  participantsCount?: number;
  summary: string;
  photos: WorkshopEditionPhoto[];
}

export interface WorkshopItem extends BaseItem {
  category: 'educativa';
  durationHours?: number;
  level?: 'Principiante' | 'Intermedio' | 'Avanzado';
  materialsIncluded?: boolean;
  spotsLimit?: number;
  price?: number;
  stages?: WorkshopStage[];
  learningOutcomes?: string[];
  upcomingDates?: WorkshopDateOption[];
  audioDemos?: WorkshopAudioDemo[];
  samplyPlaylistUrl?: string;
  pastEditions?: WorkshopPastEdition[];
}

export interface ServiceItem extends BaseItem {
  category: 'servicios';
  estimatedTurnaround?: string;
  serviceType?: 'Reparación' | 'Modificación' | 'Calibración' | 'Custom Build';
  startingPrice?: number;
  diagnosticFee?: number;
  workflowSteps?: WorkshopStage[];
  pricingNotes?: string[];
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

export type ReminderScheduleStatus =
  | 'scheduled_resend'
  | 'queued_for_cron'
  | 'too_close_for_7d_reminder'
  | 'skipped_no_email';

export interface WorkshopRegistration {
  id: string;
  workshopId: string;
  workshopSlug: string;
  workshopTitle: string;
  selectedDateLabel: string;
  selectedDateIso: string;
  name: string;
  email?: string;
  phone: string;
  subscribeNewsletter: boolean;
  reminderStatus: ReminderScheduleStatus;
  reminderScheduledAt?: string;
  createdAt: string;
}

export type RepairTicketStatus = 'recibido' | 'en_diagnostico' | 'cotizado' | 'cerrado';

export interface RepairTicket {
  id: string;
  ticketNumber: string;
  serviceId: string;
  serviceSlug: string;
  serviceTitle: string;
  clientName: string;
  clientEmail: string;
  equipmentBrandModel: string;
  symptomsDescription: string;
  status: RepairTicketStatus;
  diagnosticFeeSnapshot?: number;
  createdAt: string;
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
