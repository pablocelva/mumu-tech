import { describe, it, expect, beforeEach } from 'vitest';
import { contentRepository } from '../src/repositories/content.repository';
import type { WorkshopItem } from '../src/types';

describe('ContentRepository Unit Tests', () => {
  beforeEach(() => {
    contentRepository.resetToSeed();
  });

  it('should retrieve all initial content items', async () => {
    const items = await contentRepository.getAllItems();
    expect(items.length).toBeGreaterThanOrEqual(9);
  });

  it('should filter items correctly by category', async () => {
    const workshops = await contentRepository.getItemsByCategory('educativa');
    expect(workshops.length).toBeGreaterThanOrEqual(3);
    workshops.forEach((item) => expect(item.category).toBe('educativa'));

    const services = await contentRepository.getItemsByCategory('servicios');
    expect(services.length).toBeGreaterThanOrEqual(3);
    services.forEach((item) => expect(item.category).toBe('servicios'));

    const projects = await contentRepository.getItemsByCategory('cosas-interesantes');
    expect(projects.length).toBeGreaterThanOrEqual(3);
    projects.forEach((item) => expect(item.category).toBe('cosas-interesantes'));
  });

  it('should get featured items only', async () => {
    const featured = await contentRepository.getFeaturedItems();
    expect(featured.length).toBeGreaterThan(0);
    featured.forEach((item) => {
      expect(item.featured).toBe(true);
      expect(item.published).toBe(true);
    });
  });

  it('should find an item by its slug', async () => {
    const item = await contentRepository.getItemBySlug('construccion-pedal-fuzz-germanio');
    expect(item).not.toBeNull();
    expect(item?.code).toBe('001');

    const notFound = await contentRepository.getItemBySlug('non-existent-slug-xyz');
    expect(notFound).toBeNull();
  });

  it('should save a new item and update an existing one', async () => {
    const newItem: WorkshopItem = {
      id: 'test-ws-999',
      code: '999',
      title: 'Taller de Síntesis Modular',
      slug: 'taller-sintesis-modular',
      summary: 'Resumen de prueba de taller modular.',
      description: 'Descripción completa para el nuevo taller de síntesis modular en Eurorack.',
      category: 'educativa',
      imageUrl: 'https://images.unsplash.com/photo-modular',
      imageAlt: 'Sintetizador modular',
      tags: ['Modular', 'Eurorack'],
      featured: true,
      published: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      price: 80000,
    };

    await contentRepository.saveItem(newItem);
    const retrieved = await contentRepository.getItemBySlug('taller-sintesis-modular');
    expect(retrieved).not.toBeNull();
    expect(retrieved?.title).toBe('Taller de Síntesis Modular');

    // Update existing
    newItem.title = 'Taller de Síntesis Modular Avanzada';
    await contentRepository.saveItem(newItem);
    const updated = await contentRepository.getItemBySlug('taller-sintesis-modular');
    expect(updated?.title).toBe('Taller de Síntesis Modular Avanzada');
  });

  it('should delete an item successfully', async () => {
    const deleted = await contentRepository.deleteItem('ws-001');
    expect(deleted).toBe(true);

    const checkItem = await contentRepository.getItemBySlug('construccion-pedal-fuzz-germanio');
    expect(checkItem).toBeNull();

    const deleteNonExistent = await contentRepository.deleteItem('does-not-exist');
    expect(deleteNonExistent).toBe(false);
  });

  it('should save and retrieve contact messages', async () => {
    const message = await contentRepository.saveContactMessage({
      name: 'Tom Morello',
      email: 'tom@rage.com',
      interest: 'servicio',
      message: 'Necesito una modificación de killswitch en mi pedalboard.',
      subscribeNewsletter: true,
    });

    expect(message.id).toBeDefined();
    expect(message.createdAt).toBeDefined();

    const allMessages = await contentRepository.getContactMessages();
    expect(allMessages.length).toBeGreaterThanOrEqual(1);
    expect(allMessages[0].name).toBe('Tom Morello');
  });
});
