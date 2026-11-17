import { describe, expect, it } from 'vitest';
import { describeGrammar, displayStrong, languageOf, partOfSpeech } from './index';

describe('Greek grammar', () => {
  it('describes verbs, nouns and the article', () => {
    expect(describeGrammar('V-IAI-3S', 'greek')).toBe('verb, imperfect active indicative, third person singular');
    expect(describeGrammar('V-PPP-NSM', 'greek')).toBe('verb, present passive participle, nominative, singular, masculine');
    expect(describeGrammar('V-2AAN', 'greek')).toBe('verb, second aorist active infinitive');
    expect(describeGrammar('N-DSF', 'greek')).toBe('noun, dative, singular, feminine');
    expect(describeGrammar('N-GSM-P', 'greek')).toBe('noun, genitive, singular, masculine, proper name');
    expect(describeGrammar('T-NSM', 'greek')).toBe('article, nominative, singular, masculine');
    expect(describeGrammar('P-2GS', 'greek')).toBe('personal pronoun, second person, genitive, singular');
    expect(describeGrammar('CONJ', 'greek')).toBe('conjunction');
  });

  it('returns the raw code when it does not understand it', () => {
    expect(describeGrammar('CONJ + G1563', 'greek')).toBe('CONJ + G1563');
    expect(describeGrammar('V-ZZZ-3S', 'greek')).toBe('V-ZZZ-3S');
  });
});

describe('Hebrew grammar', () => {
  it('describes nouns, verbs and particles', () => {
    expect(describeGrammar('HNcfsa', 'hebrew')).toBe('common noun, feminine, singular, absolute');
    expect(describeGrammar('HVqp3ms', 'hebrew')).toBe('verb, qal, perfect, third person, masculine, singular');
    expect(describeGrammar('HVqrmsa', 'hebrew')).toBe('verb, qal, active participle, masculine, singular, absolute');
    expect(describeGrammar('HTo', 'hebrew')).toBe('direct object marker');
    expect(describeGrammar('HTd', 'hebrew')).toBe('definite article');
    expect(describeGrammar('HC', 'hebrew')).toBe('conjunction');
  });

  it('falls back to the raw code', () => {
    expect(describeGrammar('HVxx', 'hebrew')).toBe('HVxx');
  });

  it('marks Aramaic and keeps Hebrew adjectives Hebrew', () => {
    expect(describeGrammar('HAC', 'hebrew')).toBe('Aramaic conjunction');
    expect(describeGrammar('HANcbsa', 'hebrew')).toBe('Aramaic common noun, masculine or feminine, singular, absolute');
    expect(describeGrammar('HAcmsc', 'hebrew')).toBe('cardinal number, masculine, singular, construct');
  });

  it('gives one word for the part of speech', () => {
    expect(partOfSpeech('HVqp3ms', 'hebrew')).toBe('verb');
    expect(partOfSpeech('N-DSF', 'greek')).toBe('noun');
  });
});

describe('strong helpers', () => {
  it('detects language and strips padding', () => {
    expect(languageOf('H0430G')).toBe('hebrew');
    expect(languageOf('G3339')).toBe('greek');
    expect(displayStrong('H0430G')).toBe('H430');
    expect(displayStrong('G0976')).toBe('G976');
  });
});
