import { supabase } from '../supabaseClient';

interface NameStats {
  m: number; // Male observations
  f: number; // Female observations
}

interface StoredGenderModel {
  version: number;
  lastSeededAt?: string;
  fullNames: Record<string, NameStats>;
  tokens: Record<string, NameStats>;
}

const STORAGE_KEY = 'growmore_learned_genders';

// Built-in curated dictionaries for common Pakistani & Islamic names
const BASE_FEMALE_NAMES = new Set([
  'fatima', 'ayesha', 'zainab', 'maryam', 'khadija', 'amna', 'hafsa', 'sana', 'hira',
  'iqra', 'sadia', 'anam', 'nimra', 'sidra', 'bushra', 'bibi', 'khatoon', 'begum',
  'noor', 'bano', 'gul', 'jahan', 'nisa', 'batool', 'zahra', 'areeba', 'alina',
  'laiba', 'mahnoor', 'kinza', 'eman', 'zoya', 'mehak', 'sumaya', 'areesha', 'sohana',
  'wajeeha', 'aizal', 'shahana', 'fiza', 'asma', 'rabia', 'sumera', 'saima', 'nadia',
  'farzana', 'shazia', 'ruqayya', 'kulsoom', 'umme', 'syeda', 'muskan', 'mehwish',
  'aleena', 'momina', 'alishba', 'hoorain', 'anaya', 'ayzel', 'hareem', 'zara', 'maria',
  'mahira', 'natasha', 'samina', 'tania', 'parveen', 'nasreen', 'yasmeen', 'tahira',
  'kanwal', 'komal', 'kinzat', 'faiza', 'nida', 'fariha', 'naila', 'uzma', 'shabana',
  'farah', 'lubna', 'samra', 'sehrish', 'anum', 'tanzeela', 'misbah', 'razia', 'salma',
  'surayya', 'tasneem', 'madiha', 'javaria', 'rimsha', 'iram', 'jawaria', 'bisma',
  'maham', 'faryal', 'ayza', 'inaya', 'malaika', 'tehreem', 'urooj', 'arooba', 'samia',
  'sumaira', 'shagufta', 'shahida', 'naseem', 'fehmida', 'rubina', 'rehana', 'rukhsana',
  'saeeda', 'waheeda', 'jamila', 'bilqees', 'zakia', 'rashida', 'hamida', 'farhat',
  'kaniz', 'aqsa', 'shanza', 'wajiha', 'mehreen', 'aneela', 'nosheen', 'farheen'
]);

const BASE_MALE_NAMES = new Set([
  'muhammad', 'mohammad', 'mohammed', 'md', 'ahmed', 'ahmad', 'ali', 'hassan', 'hasan',
  'hussain', 'hussein', 'khan', 'abdul', 'abdullah', 'rehman', 'rahman', 'ullah', 'din',
  'bilal', 'hamza', 'usman', 'uthman', 'zubair', 'tariq', 'rashid', 'saad', 'omar',
  'omer', 'umar', 'abu', 'bakr', 'haider', 'farooq', 'jalal', 'yaseen', 'azan', 'asad',
  'danish', 'fahad', 'faisal', 'farhan', 'haris', 'imran', 'irfan', 'kamran', 'kashif',
  'mohsin', 'nabeel', 'naveed', 'rizwan', 'salman', 'shahid', 'sohail', 'tahir',
  'waqas', 'wasim', 'waseem', 'zaheer', 'zeeshan', 'syed', 'chaudhry', 'choudhary',
  'malik', 'rana', 'mian', 'sheikh', 'sardar', 'mirza', 'raja', 'arslan', 'adnan',
  'ayyan', 'subhan', 'huzaifa', 'rayyan', 'ayan', 'sameer', 'samir', 'arham', 'rohail',
  'shayan', 'faizan', 'ayaan', 'hannan', 'talha', 'shahmeer', 'shazil', 'azaan',
  'mustafa', 'murtaza', 'haziq', 'qasim', 'burhan', 'shahzaib', 'hadi', 'shehroz',
  'zain', 'zayan', 'khurram', 'junaid', 'shoaib', 'athar', 'babur', 'noman', 'nouman',
  'dawar', 'danyal', 'daniyal', 'ehtisham', 'furqan', 'ghulam', 'habib', 'inam', 'iqbal',
  'jamil', 'kaleem', 'liaquat', 'mahmood', 'mehmood', 'nadeem', 'nasir', 'parvez',
  'pervaiz', 'saeed', 'sajid', 'sajjad', 'shafiq', 'shakeel', 'shahbaz', 'tanveer',
  'waheed', 'yousaf', 'yousuf', 'zahid', 'zia', 'asif', 'atif', 'basit', 'habibur',
  'khaleeq', 'muneeb', 'munir', 'shabbir', 'sultan', 'wali'
]);

class GenderLearningService {
  private model: StoredGenderModel = {
    version: 1,
    fullNames: {},
    tokens: {}
  };
  private isInitialized = false;
  private saveTimeout: any = null;

  constructor() {
    this.loadFromStorage();
  }

  private loadFromStorage() {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed && typeof parsed.fullNames === 'object' && typeof parsed.tokens === 'object') {
            this.model = parsed;
          }
        }
      }
    } catch (e) {
      console.warn('Failed to load learned gender model from localStorage:', e);
    }
  }

  private scheduleSave() {
    if (typeof window === 'undefined' || !window.localStorage) return;
    if (this.saveTimeout) clearTimeout(this.saveTimeout);
    this.saveTimeout = setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this.model));
      } catch (e) {
        console.warn('Failed to save learned gender model:', e);
      }
    }, 500);
  }

  /**
   * Cleans name string and breaks it into normalized tokens
   */
  private extractTokens(name: string): string[] {
    if (!name) return [];
    // Remove honorifics and non-alphabetic chars (preserve letters and spaces)
    const clean = name
      .toLowerCase()
      .replace(/^(mr|mrs|miss|ms|dr|master)\.?\s+/i, '')
      .replace(/[^a-z\s]/g, ' ')
      .trim();

    return clean
      .split(/\s+/)
      .filter(t => t.length >= 2);
  }

  /**
   * Initializes the service by learning from existing student records in Supabase
   */
  async init(schoolId?: string | number): Promise<void> {
    if (this.isInitialized) return;
    this.isInitialized = true;

    if (!schoolId) return;

    try {
      const now = Date.now();
      const lastSeeded = this.model.lastSeededAt ? new Date(this.model.lastSeededAt).getTime() : 0;
      // Re-seed at most once every 12 hours
      if (now - lastSeeded < 12 * 60 * 60 * 1000 && Object.keys(this.model.fullNames).length > 20) {
        return;
      }

      const { data: students, error } = await supabase
        .from('students')
        .select('name, gender')
        .eq('school_id', schoolId)
        .not('gender', 'is', null)
        .limit(2000);

      if (error || !students) return;

      const validPairs = students.filter(s => s.name && s.gender);
      this.learnBatch(validPairs);
      this.model.lastSeededAt = new Date().toISOString();
      this.scheduleSave();
    } catch (e) {
      console.warn('Failed to seed gender learning service from database:', e);
    }
  }

  /**
   * Learn gender association for a single name
   */
  learn(name: string, gender: string): void {
    if (!name || !gender) return;
    const isFemale = gender.toLowerCase().startsWith('f');
    const isMale = gender.toLowerCase().startsWith('m');
    if (!isFemale && !isMale) return;

    const cleanFullName = name.trim().toLowerCase();
    if (!cleanFullName) return;

    // 1. Full name stats
    if (!this.model.fullNames[cleanFullName]) {
      this.model.fullNames[cleanFullName] = { m: 0, f: 0 };
    }
    if (isFemale) {
      this.model.fullNames[cleanFullName].f += 1;
    } else {
      this.model.fullNames[cleanFullName].m += 1;
    }

    // 2. Token stats
    const tokens = this.extractTokens(cleanFullName);
    tokens.forEach(token => {
      if (!this.model.tokens[token]) {
        this.model.tokens[token] = { m: 0, f: 0 };
      }
      if (isFemale) {
        this.model.tokens[token].f += 1;
      } else {
        this.model.tokens[token].m += 1;
      }
    });

    this.scheduleSave();
  }

  /**
   * Learn multiple name-gender pairs in bulk (e.g. from CSV or Database)
   */
  learnBatch(records: Array<{ name: string; gender: string }>): void {
    if (!records || records.length === 0) return;

    records.forEach(r => {
      if (!r.name || !r.gender) return;
      const isFemale = r.gender.toLowerCase().startsWith('f');
      const isMale = r.gender.toLowerCase().startsWith('m');
      if (!isFemale && !isMale) return;

      const cleanFullName = r.name.trim().toLowerCase();
      if (!cleanFullName) return;

      if (!this.model.fullNames[cleanFullName]) {
        this.model.fullNames[cleanFullName] = { m: 0, f: 0 };
      }
      if (isFemale) this.model.fullNames[cleanFullName].f += 1;
      else this.model.fullNames[cleanFullName].m += 1;

      const tokens = this.extractTokens(cleanFullName);
      tokens.forEach(token => {
        if (!this.model.tokens[token]) {
          this.model.tokens[token] = { m: 0, f: 0 };
        }
        if (isFemale) this.model.tokens[token].f += 1;
        else this.model.tokens[token].m += 1;
      });
    });

    this.scheduleSave();
  }

  /**
   * Predicts gender for a given name ('Male' | 'Female')
   */
  predict(name: string): 'Male' | 'Female' {
    if (!name || !name.trim()) return 'Male';

    const cleanFullName = name.trim().toLowerCase();

    // 1. Direct full name exact match in learned model
    const exactMatch = this.model.fullNames[cleanFullName];
    if (exactMatch) {
      if (exactMatch.f > exactMatch.m) return 'Female';
      if (exactMatch.m > exactMatch.f) return 'Male';
    }

    // 2. Token-level analysis
    const tokens = this.extractTokens(cleanFullName);
    if (tokens.length === 0) return 'Male';

    let femaleScore = 0;
    let maleScore = 0;

    tokens.forEach((token, index) => {
      // First token in Pakistani names carries high gender significance (e.g., "Syeda", "Fatima", "Muhammad")
      const positionWeight = index === 0 ? 1.5 : 1.0;

      // A) Learned token stats
      const stats = this.model.tokens[token];
      if (stats) {
        const total = stats.f + stats.m;
        if (total > 0) {
          if (stats.f > stats.m) {
            femaleScore += ((stats.f - stats.m) / total) * 3.5 * positionWeight;
          } else if (stats.m > stats.f) {
            maleScore += ((stats.m - stats.f) / total) * 3.5 * positionWeight;
          }
        }
      }

      // B) Base dictionary match
      if (BASE_FEMALE_NAMES.has(token)) {
        femaleScore += 4.0 * positionWeight;
      }
      if (BASE_MALE_NAMES.has(token)) {
        maleScore += 4.0 * positionWeight;
      }

      // C) Characteristic suffix heuristics
      // e.g. names ending with "bano", "khatoon", "bibi", "begum", "nisa"
      if (token.endsWith('bano') || token.endsWith('khatoon') || token.endsWith('nisa')) {
        femaleScore += 3.0;
      }
      // e.g. names ending with "ullah", "rehman", "uddin"
      if (token.endsWith('ullah') || token.endsWith('rehman') || token.endsWith('uddin')) {
        maleScore += 3.0;
      }
    });

    if (femaleScore > maleScore) {
      return 'Female';
    }
    return 'Male';
  }
}

export const genderLearningService = new GenderLearningService();
