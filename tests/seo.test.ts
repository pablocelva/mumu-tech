import { describe, it, expect } from 'vitest';
import {
  generateLocalBusinessSchema,
  generateCourseSchema,
  getNotFoundMetadata,
  DEFAULT_SITE_METADATA,
} from '../src/lib/seo';

describe('SEO Lib Unit Tests', () => {
  it('should have valid default site metadata', () => {
    expect(DEFAULT_SITE_METADATA.siteName).toBe('Mumu Tech');
    expect(DEFAULT_SITE_METADATA.locale).toBe('es_CL');
  });

  it('should generate valid LocalBusiness schema', () => {
    const schema = generateLocalBusinessSchema();
    expect(schema['@context']).toBe('https://schema.org');
    expect(schema['@type']).toBe('LocalBusiness');
    expect(schema.name).toBe('Mumu Tech');
    expect(schema.address['@type']).toBe('PostalAddress');
    expect(schema.sameAs.length).toBeGreaterThan(0);
  });

  it('should generate valid Course schema for educational workshops', () => {
    const courseSchema = generateCourseSchema({
      title: 'Taller Fuzz Germanio',
      description: 'Construcción práctica de pedal analógico.',
      price: 65000,
    });

    expect(courseSchema['@context']).toBe('https://schema.org');
    expect(courseSchema['@type']).toBe('Course');
    expect(courseSchema.name).toBe('Taller Fuzz Germanio');
    expect(courseSchema.offers).toBeDefined();
    expect(courseSchema.offers?.price).toBe(65000);
    expect(courseSchema.offers?.priceCurrency).toBe('CLP');
  });

  it('should generate Course schema without offers if price is not provided', () => {
    const courseSchema = generateCourseSchema({
      title: 'Guía Abierta DIY',
      description: 'Guía libre de sintetizador.',
    });

    const courseWithArrayDesc = generateCourseSchema({
      title: 'Taller Inicial Pedales',
      description: [
        'Armado práctico del pedal Electra Distortion.',
        'Incluye gabinete perforado y componentes.',
      ],
    });
    expect(courseWithArrayDesc.description).toBe(
      'Armado práctico del pedal Electra Distortion. Incluye gabinete perforado y componentes.'
    );
    expect(courseSchema.offers).toBeUndefined();
  });

  it('should generate standardized 404 metadata with noindex and safe path truncation', () => {
    const def = getNotFoundMetadata();
    expect(def.robots).toBe('noindex, nofollow');
    expect(def.requestedPath).toBe('/404');
    expect(def.title).toContain('404');

    const empty = getNotFoundMetadata('   ');
    expect(empty.requestedPath).toBe('/404');

    const custom = getNotFoundMetadata('/pedal-inexistente');
    expect(custom.requestedPath).toBe('/pedal-inexistente');

    const veryLong = getNotFoundMetadata('/' + 'x'.repeat(100));
    expect(veryLong.requestedPath.length).toBe(80);
    expect(veryLong.requestedPath.endsWith('...')).toBe(true);
  });
});
