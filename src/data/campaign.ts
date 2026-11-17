import type { LinearConstraint, ObjectiveFunction, Point2D } from '../engine/linearMath';

export type CharacterId =
  | 'narrator'
  | 'captain'
  | 'orion'
  | 'lyra'
  | 'atlas'
  | 'marcus'
  | 'aurelius';

export interface CharacterMeta {
  id: CharacterId;
  name: string;
  role: string;
  image?: string;
  accentColor: string;
}

export const CHARACTERS: Record<CharacterId, CharacterMeta> = {
  narrator: {
    id: 'narrator',
    name: 'Narator',
    role: 'Kisah Lautan',
    accentColor: '#D49A2A',
  },
  captain: {
    id: 'captain',
    name: 'CAPTAIN',
    role: 'Pemain · Pemimpin Kru',
    image: '/src/assets/images/char_captain_1794838762456.jpg',
    accentColor: '#D49A2A',
  },
  orion: {
    id: 'orion',
    name: 'ORION',
    role: 'Navigator',
    image: '/src/assets/images/char_orion_1794838764127.jpg',
    accentColor: '#2A9D8F',
  },
  lyra: {
    id: 'lyra',
    name: 'LYRA',
    role: 'Engineer',
    image: '/src/assets/images/char_lyra_1794838764765.jpg',
    accentColor: '#E07A5F',
  },
  atlas: {
    id: 'atlas',
    name: 'PROFESSOR ATLAS',
    role: 'Mathematician',
    image: '/src/assets/images/char_atlas_1794838764025.jpg',
    accentColor: '#4E89AE',
  },
  marcus: {
    id: 'marcus',
    name: 'MARCUS',
    role: 'The Merchant',
    accentColor: '#C58F3B',
  },
  aurelius: {
    id: 'aurelius',
    name: 'KING AURELIUS',
    role: 'Raja Kerajaan',
    image: '/src/assets/images/char_aurelius_1794838766236.jpg',
    accentColor: '#C94A38',
  },
};

export interface DialogueLine {
  speaker: CharacterId;
  text: string;
}

export interface QuizQuestion {
  id: string;
  prompt: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

export interface DiscoveryPrompt {
  id: string;
  question: string;
  hint: string;
  options?: string[];
  correctOptionIndex?: number;
  numericAnswer?: number;
  modelExpected?: { a: number; b: number; op: '<' | '>' | '<=' | '>='; rhs: number };
  placeholder?: string;
}

export interface MissionConfig {
  id: number;
  chapterId: number;
  title: string;
  subtitle: string;
  leadCharacter: CharacterId;
  rewardCoins: number;
  dialogue: DialogueLine[];
  conceptTitle?: string;
  conceptBody?: string;
  inequalityTable?: Array<{
    symbol: string;
    spoken: string;
    meaning: string;
    example: string;
  }>;
  translationExamples?: Array<{
    sentence: string;
    model: string;
  }>;
  quizTitle?: string;
  quizQuestions?: QuizQuestion[];
  reflectionPrompt?: {
    speaker: CharacterId;
    question: string;
    keywords: string[];
  };
  discoveryStage?: {
    title: string;
    speaker: CharacterId;
    scenario: string;
    prompts: DiscoveryPrompt[];
    expectedSummary: string[];
  };
  fleetStage?: {
    title: string;
    speaker: CharacterId;
    scenario: string;
    constraints: LinearConstraint[];
    xLabel: string;
    yLabel: string;
    woodMax: number;
    ironMax: number;
    combinationsToTest: Array<{
      x: number;
      y: number;
      expectedValid: boolean;
    }>;
  };
  coordinateStage?: {
    title: string;
    speaker: CharacterId;
    constraint: LinearConstraint;
    introPoints: Point2D[];
    comparePoints: [Point2D, Point2D];
    testPoints: Array<{
      point: Point2D;
      expectedValid: boolean;
      reason: string;
    }>;
  };
  graphStage?: {
    title: string;
    speaker: CharacterId;
    scenario: string;
    constraints: LinearConstraint[];
    maxAxis: number;
    xLabel: string;
    yLabel: string;
    expectedCorners: Point2D[];
    intersectionStep?: {
      eq1: string;
      eq2: string;
      solution: Point2D;
    };
    requireCornerSelection: boolean;
  };
  optimizationStage?: {
    title: string;
    speaker: CharacterId;
    scenario: string;
    constraints: LinearConstraint[];
    objective: ObjectiveFunction;
    maxAxis: number;
    xLabel: string;
    yLabel: string;
    unitLabel: string;
    expectedCorners: Point2D[];
    optimalPoint: Point2D;
    optimalValue: number;
    buildModelFirst?: boolean;
    independentMode?: boolean;
    resourceTable?: {
      headers: string[];
      rows: string[][];
    };
  };
  knowledgeUnlocked: string;
}

export interface ChapterMeta {
  id: number;
  title: string;
  subtitle: string;
  missionIds: number[];
}

export const CHAPTERS: ChapterMeta[] = [
  {
    id: 1,
    title: 'Chapter 1 — The Language of Limits',
    subtitle: 'Mengenal tanda pertidaksamaan dan maknanya.',
    missionIds: [1, 2],
  },
  {
    id: 2,
    title: 'Chapter 2 — The Art of Modeling',
    subtitle: 'Mengubah cerita menjadi model matematika.',
    missionIds: [3, 4],
  },
  {
    id: 3,
    title: 'Chapter 3 — The Hidden Territory',
    subtitle: 'Menentukan titik penyelesaian dan daerah penyelesaian.',
    missionIds: [5, 6, 7],
  },
  {
    id: 4,
    title: 'Chapter 4 — The Golden Strategy',
    subtitle: 'Menentukan nilai maksimum dan minimum.',
    missionIds: [8, 9, 10],
  },
  {
    id: 5,
    title: 'Chapter 5 — The Final Rebellion',
    subtitle: 'Menggabungkan seluruh konsep melawan Raja Aurelius.',
    missionIds: [11, 12],
  },
];

export const MISSIONS: MissionConfig[] = [
  // MISSION 1
  {
    id: 1,
    chapterId: 1,
    title: "Mission 1 — The King's Rules",
    subtitle: 'Mengenal empat tanda pertidaksamaan dan batas kerajaan.',
    leadCharacter: 'orion',
    rewardCoins: 25,
    dialogue: [
      {
        speaker: 'narrator',
        text: 'Di sebuah kerajaan yang dikelilingi lautan luas, Raja Aurelius menguasai seluruh perdagangan. Tidak ada kapal yang boleh membawa barang melebihi batas yang ditetapkan kerajaan.',
      },
      {
        speaker: 'narrator',
        text: 'Namun, sekelompok bajak laut mulai menyusun rencana pemberontakan. Mereka membutuhkan seorang kapten yang mampu memahami aturan dan batasan.',
      },
      {
        speaker: 'orion',
        text: 'Kapten! Lihat papan pengumuman itu. Raja menetapkan bahwa setiap kapal hanya boleh membawa maksimal 50 peti persediaan.',
      },
      {
        speaker: 'captain',
        text: 'Maksimal 50? Jadi kita boleh membawa 50, tetapi tidak boleh 51?',
      },
      {
        speaker: 'orion',
        text: 'Benar! Dalam matematika, kita dapat menggunakan tanda khusus untuk menyatakan batasan seperti itu.',
      },
    ],
    conceptTitle: 'Empat Tanda Pertidaksamaan Utama',
    conceptBody:
      'Gunakan papan simulator di sebelah kiri untuk melihat perbedaan antara batas ketat (<, >) dan batas yang mengikutsertakan nilai batasnya (≤, ≥).',
    inequalityTable: [
      {
        symbol: '<',
        spoken: 'Kurang dari',
        meaning: 'Nilai lebih kecil (batas tidak ikut)',
        example: 'Kapal membawa kurang dari 20 peti (x < 20)',
      },
      {
        symbol: '>',
        spoken: 'Lebih dari',
        meaning: 'Nilai lebih besar (batas tidak ikut)',
        example: 'Kapal membawa lebih dari 20 peti (x > 20)',
      },
      {
        symbol: '≤',
        spoken: 'Kurang dari atau sama dengan',
        meaning: 'Batas maksimum (batas ikut)',
        example: 'Kapal membawa maksimal 20 peti (x ≤ 20)',
      },
      {
        symbol: '≥',
        spoken: 'Lebih dari atau sama dengan',
        meaning: 'Batas minimum (batas ikut)',
        example: 'Kapal membawa minimal 20 peti (x ≥ 20)',
      },
    ],
    quizTitle: 'Royal Examination',
    quizQuestions: [
      {
        id: 'm1q1',
        prompt: 'Jumlah peti (x) tidak boleh lebih dari 30.',
        options: ['x < 30', 'x > 30', 'x ≤ 30', 'x ≥ 30'],
        correctIndex: 2,
        explanation:
          '"Tidak boleh lebih dari 30" berarti paling banyak 30 (30 masih diperbolehkan), sehingga menggunakan tanda ≤.',
      },
      {
        id: 'm1q2',
        prompt: 'Jumlah peti (x) harus lebih dari 15 agar cukup untuk pelayaran.',
        options: ['x < 15', 'x > 15', 'x ≤ 15', 'x ≥ 15'],
        correctIndex: 1,
        explanation:
          '"Lebih dari 15" artinya angka 15 belum cukup, harus di atas 15 (x > 15).',
      },
      {
        id: 'm1q3',
        prompt: 'Kru minimal harus membawa 25 tong air (y).',
        options: ['y < 25', 'y > 25', 'y ≤ 25', 'y ≥ 25'],
        correctIndex: 3,
        explanation:
          '"Minimal 25" berarti paling sedikit 25 (25 sudah memenuhi syarat), sehingga tandanya ≥.',
      },
      {
        id: 'm1q4',
        prompt: 'Muatan meriam (x) harus kurang dari 12 unit agar kapal tidak karam.',
        options: ['x < 12', 'x > 12', 'x ≤ 12', 'x ≥ 12'],
        correctIndex: 0,
        explanation:
          '"Kurang dari 12" berarti tidak boleh menyentuh 12, hanya boleh di bawah 12 (x < 12).',
      },
    ],
    reflectionPrompt: {
      speaker: 'orion',
      question:
        'Kapten, apa perbedaan antara maksimal 30 dan kurang dari 30? Mengapa angka 30 boleh digunakan pada satu kondisi, tetapi tidak pada kondisi lainnya?',
      keywords: ['boleh', 'sama', 'ikut', 'tidak', 'termasuk', 'batas', '≤', '<'],
    },
    knowledgeUnlocked:
      'Kamu menguasai 4 tanda pertidaksamaan: <, >, ≤ (batas maksimum), dan ≥ (batas minimum).',
  },

  // MISSION 2
  {
    id: 2,
    chapterId: 1,
    title: 'Mission 2 — The Forbidden Supplies',
    subtitle: 'Mengubah informasi cerita menjadi pertidaksamaan dua variabel.',
    leadCharacter: 'lyra',
    rewardCoins: 35,
    dialogue: [
      {
        speaker: 'narrator',
        text: 'Kapten dan Lyra memasuki gudang persediaan. Mereka menemukan bahwa kerajaan membatasi jumlah barang yang boleh dibawa setiap kapal.',
      },
      {
        speaker: 'lyra',
        text: 'Kapten, kita punya dua jenis persediaan: makanan dan air. Tetapi aku belum tahu berapa banyak yang akan kita bawa.',
      },
      {
        speaker: 'captain',
        text: 'Kalau begitu, bagaimana kita bisa menghitungnya?',
      },
      {
        speaker: 'lyra',
        text: 'Kita bisa menggunakan simbol (variabel) untuk mewakili jumlah yang belum diketahui! Misalkan x = jumlah peti makanan, dan y = jumlah tong air.',
      },
    ],
    conceptTitle: 'Mengenal Variabel & Terjemahan Model',
    conceptBody:
      'Variabel menyatakan nilai yang belum diketahui (x = peti makanan, y = tong air). Perhatikan cara menerjemahkan aturan gudang menjadi model matematika:',
    translationExamples: [
      { sentence: 'Jumlah makanan maksimal 20', model: 'x ≤ 20' },
      { sentence: 'Jumlah air minimal 5', model: 'y ≥ 5' },
      { sentence: 'Jumlah makanan lebih dari 10', model: 'x > 10' },
      { sentence: 'Jumlah makanan dan air maksimal 30', model: 'x + y ≤ 30' },
      { sentence: 'Jumlah makanan dan air minimal 15', model: 'x + y ≥ 15' },
    ],
    quizTitle: 'Translation Challenge',
    quizQuestions: [
      {
        id: 'm2q1',
        prompt: 'Jumlah makanan (x) maksimal 25 peti.',
        options: ['x ≥ 25', 'x ≤ 25', 'x < 25', 'x > 25'],
        correctIndex: 1,
        explanation: 'Maksimal 25 peti berarti paling banyak 25, yaitu x ≤ 25.',
      },
      {
        id: 'm2q2',
        prompt: 'Jumlah tong air (y) minimal 8 tong.',
        options: ['y ≤ 8', 'y > 8', 'y ≥ 8', 'y < 8'],
        correctIndex: 2,
        explanation: 'Minimal 8 tong berarti paling sedikit 8, yaitu y ≥ 8.',
      },
      {
        id: 'm2q3',
        prompt: 'Gabungan peti makanan (x) dan tong air (y) tidak lebih dari 40.',
        options: ['x + y ≤ 40', 'x + y ≥ 40', 'x + y < 40', '2x + y ≤ 40'],
        correctIndex: 0,
        explanation: 'Total gabungan (x + y) tidak lebih dari 40 adalah x + y ≤ 40.',
      },
      {
        id: 'm2q4',
        prompt: 'Total makanan (x) dan air (y) minimal harus 18 unit.',
        options: ['x + y ≤ 18', 'x + y > 18', 'x + y ≥ 18', 'x - y ≥ 18'],
        correctIndex: 2,
        explanation: 'Minimal 18 unit gabungan dinyatakan dengan x + y ≥ 18.',
      },
    ],
    discoveryStage: {
      title: "Mission Boss — The Ship's Capacity",
      speaker: 'lyra',
      scenario:
        'Kita memiliki kapal dengan kapasitas penyimpanan 60 unit. Setiap peti makanan (x) membutuhkan 2 unit ruang, sedangkan setiap tong air (y) membutuhkan 3 unit ruang. Ayo temukan model matematikanya melalui pertanyaan pemantik!',
      prompts: [
        {
          id: 'm2d1',
          question: 'Berapa ruang yang dibutuhkan untuk 5 peti makanan (masing-masing 2 unit)?',
          hint: 'Kalikan 5 peti dengan 2 unit ruang.',
          numericAnswer: 10,
          placeholder: 'Masukkan angka (unit)',
        },
        {
          id: 'm2d2',
          question: 'Berapa ruang yang dibutuhkan untuk 4 tong air (masing-masing 3 unit)?',
          hint: 'Kalikan 4 tong dengan 3 unit ruang.',
          numericAnswer: 12,
          placeholder: 'Masukkan angka (unit)',
        },
        {
          id: 'm2d3',
          question: 'Bagaimana menyatakan model batas total ruang kapal maksimal 60 unit?',
          hint: 'Gabungkan 2x + 3y dengan tanda ≤ 60.',
          modelExpected: { a: 2, b: 3, op: '<=', rhs: 60 },
          placeholder: 'Contoh: 2x + 3y <= 60',
        },
      ],
      expectedSummary: ['2x + 3y ≤ 60', 'x ≥ 0, y ≥ 0'],
    },
    knowledgeUnlocked:
      'Kamu berhasil memodelkan kapasitas ruang: 2x + 3y ≤ 60 serta syarat tak negatif x ≥ 0, y ≥ 0.',
  },

  // MISSION 3
  {
    id: 3,
    chapterId: 2,
    title: "Mission 3 — The Merchant's Deal",
    subtitle: 'Menyusun model matematika dari negosiasi perdagangan.',
    leadCharacter: 'marcus',
    rewardCoins: 40,
    dialogue: [
      {
        speaker: 'marcus',
        text: 'Aku punya dua jenis peti. Peti A membutuhkan 2 ruang, peti B membutuhkan 3 ruang. Gudangku hanya memiliki 36 ruang penyimpanan.',
      },
      {
        speaker: 'orion',
        text: 'Kapten, kita harus menentukan berapa banyak masing-masing peti yang dapat kita bawa. Bisakah kamu menyusun model matematikanya?',
      },
    ],
    discoveryStage: {
      title: 'Menyusun Model Gudang Marcus',
      speaker: 'orion',
      scenario:
        'Misalkan x adalah jumlah Peti A (2 ruang/peti) dan y adalah jumlah Peti B (3 ruang/peti), dengan batas gudang 36 ruang.',
      prompts: [
        {
          id: 'm3d1',
          question: 'Apa yang menjadi variabel x dan y dalam kesepakatan ini?',
          hint: 'Variabel menyatakan jumlah barang yang belum diketahui.',
          options: [
            'x = ruang gudang, y = harga peti',
            'x = jumlah Peti A, y = jumlah Peti B',
            'x = 2 ruang, y = 3 ruang',
          ],
          correctOptionIndex: 1,
        },
        {
          id: 'm3d2',
          question: 'Bagaimana menuliskan total ruang yang digunakan untuk x Peti A dan y Peti B?',
          hint: 'Setiap Peti A butuh 2 ruang, setiap Peti B butuh 3 ruang.',
          options: ['x + y', '3x + 2y', '2x + 3y'],
          correctOptionIndex: 2,
        },
        {
          id: 'm3d3',
          question: 'Tuliskan pertidaksamaan lengkap untuk batas maksimal 36 ruang gudang:',
          hint: 'Gunakan bentuk ax + by ≤ 36',
          modelExpected: { a: 2, b: 3, op: '<=', rhs: 36 },
          placeholder: 'Ketik: 2x + 3y <= 36',
        },
      ],
      expectedSummary: ['2x + 3y ≤ 36', 'x ≥ 0, y ≥ 0'],
    },
    knowledgeUnlocked:
      'Kesepakatan Marcus dimodelkan menjadi 2x + 3y ≤ 36 dengan syarat x ≥ 0, y ≥ 0 (jumlah peti tidak mungkin negatif).',
  },

  // MISSION 4
  {
    id: 4,
    chapterId: 2,
    title: 'Mission 4 — The Shipyard Problem',
    subtitle: 'Menemukan sistem pertidaksamaan & menguji kombinasi armada.',
    leadCharacter: 'lyra',
    rewardCoins: 50,
    dialogue: [
      {
        speaker: 'lyra',
        text: 'Kapten, aku ingin membuat dua jenis kapal untuk armada pemberontakan: kapal kecil (x) dan kapal besar (y).',
      },
      {
        speaker: 'lyra',
        text: 'Kapal kecil butuh 2 kayu dan 1 besi. Kapal besar butuh 1 kayu dan 2 besi. Persediaan kita hanya 20 unit kayu dan 16 unit besi.',
      },
    ],
    discoveryStage: {
      title: 'Tahap 1 — Menemukan Seluruh Batasan Galangan',
      speaker: 'lyra',
      scenario:
        'Misalkan x = jumlah kapal kecil dan y = jumlah kapal besar. Susunlah dua pertidaksamaan bahan baku sebelum menguji armada!',
      prompts: [
        {
          id: 'm4d1',
          question: 'Susun model keterbatasan Kayu (2 per kapal kecil, 1 per kapal besar, tersedia 20):',
          hint: 'Format: 2x + y <= 20',
          modelExpected: { a: 2, b: 1, op: '<=', rhs: 20 },
          placeholder: 'Contoh: 2x + y <= 20',
        },
        {
          id: 'm4d2',
          question: 'Susun model keterbatasan Besi (1 per kapal kecil, 2 per kapal besar, tersedia 16):',
          hint: 'Format: x + 2y <= 16',
          modelExpected: { a: 1, b: 2, op: '<=', rhs: 16 },
          placeholder: 'Contoh: x + 2y <= 16',
        },
      ],
      expectedSummary: ['2x + y ≤ 20', 'x + 2y ≤ 16', 'x ≥ 0, y ≥ 0'],
    },
    fleetStage: {
      title: 'Mini Boss: Build Your Fleet',
      speaker: 'lyra',
      scenario:
        'Uji setiap kombinasi kapal berikut terhadap batas Kayu (2x + y ≤ 20) dan Besi (x + 2y ≤ 16) untuk menentukan kombinasi mana yang memenuhi semua batasan!',
      constraints: [
        { id: 'wood', label: 'Kayu', a: 2, b: 1, op: '<=', rhs: 20, color: '#D49A2A' },
        { id: 'iron', label: 'Besi', a: 1, b: 2, op: '<=', rhs: 16, color: '#4E89AE' },
      ],
      xLabel: 'Kapal Kecil (x)',
      yLabel: 'Kapal Besar (y)',
      woodMax: 20,
      ironMax: 16,
      combinationsToTest: [
        { x: 2, y: 3, expectedValid: true },
        { x: 4, y: 4, expectedValid: true },
        { x: 8, y: 2, expectedValid: true },
        { x: 10, y: 5, expectedValid: false },
      ],
    },
    knowledgeUnlocked:
      'Suatu pasangan nilai (x, y) disebut solusi sistem jika memenuhi SELURUH pertidaksamaan sekaligus.',
  },

  // MISSION 5
  {
    id: 5,
    chapterId: 3,
    title: 'Mission 5 — The Coordinates',
    subtitle: 'Memahami pasangan koordinat (x, y) dan uji titik penyelesaian.',
    leadCharacter: 'atlas',
    rewardCoins: 45,
    dialogue: [
      {
        speaker: 'atlas',
        text: 'Kapten, sebuah peta tidak hanya menunjukkan lokasi. Peta juga dapat membantu kita memahami hubungan antara dua nilai menggunakan pasangan koordinat (x, y).',
      },
      {
        speaker: 'atlas',
        text: 'Mari kita uji apakah koordinat kapalmu memenuhi syarat laut aman: x + y ≤ 8.',
      },
    ],
    coordinateStage: {
      title: 'Locate the Treasure & Is This Point Safe?',
      speaker: 'atlas',
      constraint: { id: 'safe', label: 'x + y ≤ 8', a: 1, b: 1, op: '<=', rhs: 8, color: '#2A9D8F' },
      introPoints: [
        { x: 2, y: 3 },
        { x: 4, y: 1 },
        { x: 0, y: 5 },
      ],
      comparePoints: [
        { x: 3, y: 2 },
        { x: 2, y: 3 },
      ],
      testPoints: [
        { point: { x: 2, y: 3 }, expectedValid: true, reason: '2 + 3 = 5 ≤ 8 (Memenuhi)' },
        { point: { x: 5, y: 4 }, expectedValid: false, reason: '5 + 4 = 9 > 8 (Tidak memenuhi)' },
        { point: { x: 8, y: 0 }, expectedValid: true, reason: '8 + 0 = 8 ≤ 8 (Memenuhi tepat di batas)' },
        { point: { x: 6, y: 5 }, expectedValid: false, reason: '6 + 5 = 11 > 8 (Tidak memenuhi)' },
      ],
    },
    knowledgeUnlocked:
      'Urutan koordinat (x, y) sangat penting, dan titik penyelesaian adalah pasangan nilai yang memenuhi pertidaksamaan saat disubstitusi.',
  },

  // MISSION 6
  {
    id: 6,
    chapterId: 3,
    title: 'Mission 6 — The Safe Zone',
    subtitle: 'Memahami daerah penyelesaian sebagai irisan seluruh pertidaksamaan.',
    leadCharacter: 'atlas',
    rewardCoins: 50,
    dialogue: [
      {
        speaker: 'atlas',
        text: 'Kapten! Kita menemukan pulau persembunyian. Namun, ada beberapa wilayah laut yang dilarang kerajaan. Kita harus menemukan wilayah aman.',
      },
      {
        speaker: 'atlas',
        text: 'Wilayah aman harus memenuhi kedua batas sekaligus: x + y ≤ 8 dan 2x + y ≤ 10, dengan x ≥ 0, y ≥ 0.',
      },
    ],
    graphStage: {
      title: 'Menemukan Irisan Wilayah Aman',
      speaker: 'atlas',
      scenario:
        'Amati dua wilayah batas pada peta koordinat di sebelah kiri. Coba aktifkan garis dan uji titik (2, 6), (4, 3), serta (0, 0) untuk melihat bagaimana irisan wilayah terbentuk!',
      constraints: [
        { id: 'c1', label: 'x + y ≤ 8', a: 1, b: 1, op: '<=', rhs: 8, color: '#2A9D8F' },
        { id: 'c2', label: '2x + y ≤ 10', a: 2, b: 1, op: '<=', rhs: 10, color: '#D49A2A' },
      ],
      maxAxis: 11,
      xLabel: 'x',
      yLabel: 'y',
      expectedCorners: [
        { x: 0, y: 0 },
        { x: 5, y: 0 },
        { x: 2, y: 6 },
        { x: 0, y: 8 },
      ],
      requireCornerSelection: false,
    },
    quizTitle: 'Uji Pemahaman Wilayah Aman',
    quizQuestions: [
      {
        id: 'm6q1',
        prompt: 'Apakah titik (2, 6) memenuhi kedua pertidaksamaan x + y ≤ 8 dan 2x + y ≤ 10?',
        options: [
          'Hanya memenuhi pertidaksamaan pertama',
          'Hanya memenuhi pertidaksamaan kedua',
          'Ya, memenuhi keduanya (2+6=8 dan 4+6=10)',
          'Tidak memenuhi keduanya',
        ],
        correctIndex: 2,
        explanation:
          '2 + 6 = 8 ≤ 8 dan 2(2) + 6 = 10 ≤ 10. Jadi (2, 6) tepat berada di perpotongan kedua batas!',
      },
      {
        id: 'm6q2',
        prompt: 'Bagaimana cara menguji titik (4, 3) terhadap sistem ini?',
        options: [
          'Memenuhi keduanya karena 4+3=7≤8 dan 8+3=11≤10',
          'Memenuhi x+y≤8 (7≤8), tetapi GAGAL di 2x+y≤10 (11>10)',
          'Tidak memenuhi keduanya',
          'Memenuhi jika y dibalik menjadi x',
        ],
        correctIndex: 1,
        explanation:
          'Titik (4, 3) gagal di 2(4)+3 = 11 > 10, sehingga tidak termasuk daerah penyelesaian sistem.',
      },
    ],
    knowledgeUnlocked:
      'Daerah penyelesaian sistem pertidaksamaan adalah irisan wilayah yang memenuhi seluruh pertidaksamaan.',
  },

  // MISSION 7
  {
    id: 7,
    chapterId: 3,
    title: "Mission 7 — The Island's Boundary",
    subtitle: 'Menentukan garis batas, titik potong, dan titik pojok secara grafis.',
    leadCharacter: 'atlas',
    rewardCoins: 60,
    dialogue: [
      {
        speaker: 'atlas',
        text: 'Sekarang mari belajar menggambar batas pulau secara grafis! Pertama ubah pertidaksamaan menjadi persamaan garis, lalu cari dua titik potong sumbu.',
      },
      {
        speaker: 'captain',
        text: 'Untuk x + y = 8 titiknya (8, 0) dan (0, 8). Untuk 2x + y = 10 titiknya (5, 0) dan (0, 10)!',
      },
      {
        speaker: 'atlas',
        text: 'Tepat! Kurangkan kedua persamaan untuk menemukan titik potongnya, lalu tandai ke-4 titik pojok daerah penyelesaian pada peta.',
      },
    ],
    graphStage: {
      title: 'Interactive Graph Mission — Tandai 4 Titik Pojok',
      speaker: 'atlas',
      scenario:
        'Klik tepat ke-4 titik pojok yang membatasi daerah penyelesaian (termasuk titik perpotongan kedua garis) langsung pada grafik koordinat di sebelah kiri!',
      constraints: [
        { id: 'c1', label: 'x + y ≤ 8', a: 1, b: 1, op: '<=', rhs: 8, color: '#2A9D8F' },
        { id: 'c2', label: '2x + y ≤ 10', a: 2, b: 1, op: '<=', rhs: 10, color: '#D49A2A' },
      ],
      maxAxis: 11,
      xLabel: 'x',
      yLabel: 'y',
      expectedCorners: [
        { x: 0, y: 0 },
        { x: 5, y: 0 },
        { x: 2, y: 6 },
        { x: 0, y: 8 },
      ],
      intersectionStep: {
        eq1: 'x + y = 8',
        eq2: '2x + y = 10',
        solution: { x: 2, y: 6 },
      },
      requireCornerSelection: true,
    },
    knowledgeUnlocked:
      'Titik pojok daerah penyelesaian terbentuk dari perpotongan garis-garis batas: (0,0), (5,0), (2,6), dan (0,8).',
  },

  // MISSION 8
  {
    id: 8,
    chapterId: 4,
    title: "Mission 8 — The King's Treasure",
    subtitle: 'Memahami fungsi objektif untuk memaksimalkan keuntungan.',
    leadCharacter: 'atlas',
    rewardCoins: 55,
    dialogue: [
      {
        speaker: 'atlas',
        text: 'Kapten, sekarang kita sudah tahu kombinasi mana yang diperbolehkan. Tetapi apakah semua kombinasi memberikan keuntungan yang sama?',
      },
      {
        speaker: 'captain',
        text: 'Tentu tidak! Produk A memberi untung 3 koin dan Produk B memberi 5 koin. Kita harus memilih kombinasi dengan keuntungan paling besar!',
      },
      {
        speaker: 'atlas',
        text: 'Tepat sekali. Itulah yang disebut optimasi menggunakan fungsi objektif: Z = 3x + 5y.',
      },
    ],
    conceptTitle: 'Mengenal Fungsi Objektif Z = 3x + 5y',
    conceptBody:
      'Fungsi objektif digunakan untuk menentukan nilai yang ingin dioptimalkan (maksimum atau minimum). Uji beberapa kombinasi di bawah untuk memahami konsepnya.',
    quizTitle: 'Eksperimen Keuntungan',
    quizQuestions: [
      {
        id: 'm8q1',
        prompt: 'Jika kita memproduksi 2 produk A dan 3 produk B, berapa keuntungan Z = 3x + 5y?',
        options: ['19 Koin', '21 Koin', '25 Koin', '15 Koin'],
        correctIndex: 1,
        explanation: 'Z = 3(2) + 5(3) = 6 + 15 = 21 Koin Emas.',
      },
      {
        id: 'm8q2',
        prompt: 'Apakah kombinasi 4 produk A dan 2 produk B (Z = 22) merupakan batas tertinggi yang bisa dicapai pada sistem x+y≤8 dan 2x+y≤10?',
        options: [
          'Ya, 22 adalah keuntungan maksimum mutlak',
          'Belum tentu, kita harus menguji titik-titik pojok daerah penyelesaian',
          'Tidak sah karena melanggar batasan',
          'Kita bisa memproduksi tanpa batas',
        ],
        correctIndex: 1,
        explanation:
          'Titik (4, 2) memang layak (4+2=6≤8, 8+2=10≤10), tetapi masih ada titik pojok lain yang menghasilkan Z lebih besar!',
      },
    ],
    knowledgeUnlocked:
      'Nilai optimum fungsi objektif pada daerah penyelesaian poligonal dicapai pada salah satu titik pojoknya.',
  },

  // MISSION 9
  {
    id: 9,
    chapterId: 4,
    title: 'Mission 9 — The Best Combination',
    subtitle: 'Menentukan keuntungan maksimum dengan menguji seluruh titik pojok.',
    leadCharacter: 'atlas',
    rewardCoins: 70,
    dialogue: [
      {
        speaker: 'atlas',
        text: 'Gunakan kembali daerah penyelesaian Chapter 3 dengan fungsi objektif Z = 3x + 5y. Hitung nilai Z pada setiap titik pojok dan geser garis keuntungan di peta!',
      },
    ],
    optimizationStage: {
      title: 'Interactive Challenge — Find the Greatest Treasure',
      speaker: 'atlas',
      scenario:
        'Hitung nilai Z = 3x + 5y untuk keempat titik pojok: (0,0), (5,0), (2,6), dan (0,8), lalu pilih titik dengan keuntungan paling besar!',
      constraints: [
        { id: 'c1', label: 'x + y ≤ 8', a: 1, b: 1, op: '<=', rhs: 8, color: '#2A9D8F' },
        { id: 'c2', label: '2x + y ≤ 10', a: 2, b: 1, op: '<=', rhs: 10, color: '#D49A2A' },
      ],
      objective: { px: 3, py: 5, goal: 'max' },
      maxAxis: 11,
      xLabel: 'Produk A (x)',
      yLabel: 'Produk B (y)',
      unitLabel: 'Koin Emas',
      expectedCorners: [
        { x: 0, y: 0 },
        { x: 5, y: 0 },
        { x: 2, y: 6 },
        { x: 0, y: 8 },
      ],
      optimalPoint: { x: 0, y: 8 },
      optimalValue: 40,
    },
    knowledgeUnlocked:
      'Maximum Profit: 40 Gold Coins dicapai pada titik pojok (0, 8) dengan 0 Produk A dan 8 Produk B.',
  },

  // MISSION 10
  {
    id: 10,
    chapterId: 4,
    title: 'Mission 10 — The Optimal Choice',
    subtitle: 'Menentukan biaya minimum pada daerah penyelesaian tak terbatas.',
    leadCharacter: 'lyra',
    rewardCoins: 75,
    dialogue: [
      {
        speaker: 'lyra',
        text: 'Sekarang kita tidak mencari keuntungan maksimum, melainkan biaya MINIMUM! Kapal membutuhkan minimal 6 unit gabungan (x + y ≥ 6) dan minimal 8 unit berbobot (x + 2y ≥ 8).',
      },
      {
        speaker: 'atlas',
        text: 'Harga paket makanan (x) adalah 4 koin dan paket air (y) adalah 3 koin, sehingga fungsi biaya adalah Z = 4x + 3y. Daerahnya terbuka ke atas, tapi minimumnya tetap di titik pojok!',
      },
    ],
    optimizationStage: {
      title: 'Minimalkan Biaya Persediaan (Z = 4x + 3y)',
      speaker: 'lyra',
      scenario:
        'Perhatikan daerah penyelesaian terbuka untuk x + y ≥ 6 dan x + 2y ≥ 8 (x, y ≥ 0). Uji ke-3 titik pojoknya: (0, 6), (4, 2), dan (8, 0) untuk menemukan biaya paling rendah!',
      constraints: [
        { id: 'm1', label: 'x + y ≥ 6', a: 1, b: 1, op: '>=', rhs: 6, color: '#2A9D8F' },
        { id: 'm2', label: 'x + 2y ≥ 8', a: 1, b: 2, op: '>=', rhs: 8, color: '#4E89AE' },
      ],
      objective: { px: 4, py: 3, goal: 'min' },
      maxAxis: 10,
      xLabel: 'Paket Makanan (x)',
      yLabel: 'Paket Air (y)',
      unitLabel: 'Koin Biaya',
      expectedCorners: [
        { x: 0, y: 6 },
        { x: 4, y: 2 },
        { x: 8, y: 0 },
      ],
      optimalPoint: { x: 0, y: 6 },
      optimalValue: 18,
    },
    knowledgeUnlocked:
      'Minimum Cost: 18 Gold Coins dicapai pada titik (0, 6). Daerah penyelesaian tak terbatas tetap memiliki nilai minimum pada titik pojoknya.',
  },

  // MISSION 11
  {
    id: 11,
    chapterId: 5,
    title: 'Mission 11 — The Battle Preparation',
    subtitle: 'Menggabungkan seluruh tahapan Program Linear untuk armada terakhir.',
    leadCharacter: 'orion',
    rewardCoins: 100,
    dialogue: [
      {
        speaker: 'orion',
        text: 'Kapten! Kita sudah mengumpulkan semua persediaan. Tetapi kita harus menentukan jumlah kapal kecil dan kapal besar yang akan dibangun.',
      },
      {
        speaker: 'lyra',
        text: 'Persediaan kayu (20) dan besi (16) kita terbatas. Jika salah menentukan kombinasi, kita bisa kehilangan seluruh persediaan.',
      },
      {
        speaker: 'atlas',
        text: 'Sekarang saatnya menggunakan seluruh pengetahuan yang telah kita pelajari: buat model, cari titik pojok, dan hitung keuntungan maksimum!',
      },
    ],
    optimizationStage: {
      title: 'Final Mission — Persiapan Armada Pemberontakan',
      speaker: 'atlas',
      scenario:
        'Susun model matematika dari tabel kebutuhan armada, temukan titik pojok termasuk titik potong (8, 4), lalu hitung keuntungan maksimum Z = 3x + 5y.',
      constraints: [
        { id: 'wood', label: '2x + y ≤ 20', a: 2, b: 1, op: '<=', rhs: 20, color: '#D49A2A' },
        { id: 'iron', label: 'x + 2y ≤ 16', a: 1, b: 2, op: '<=', rhs: 16, color: '#4E89AE' },
      ],
      objective: { px: 3, py: 5, goal: 'max' },
      maxAxis: 22,
      xLabel: 'Kapal Kecil (x)',
      yLabel: 'Kapal Besar (y)',
      unitLabel: 'Koin Emas',
      expectedCorners: [
        { x: 0, y: 0 },
        { x: 10, y: 0 },
        { x: 8, y: 4 },
        { x: 0, y: 8 },
      ],
      optimalPoint: { x: 8, y: 4 },
      optimalValue: 44,
      buildModelFirst: true,
      resourceTable: {
        headers: ['Kebutuhan / Nilai', 'Kapal Kecil (x)', 'Kapal Besar (y)', 'Persediaan'],
        rows: [
          ['Kayu', '2', '1', '20'],
          ['Besi', '1', '2', '16'],
          ['Keuntungan', '3', '5', 'Maksimumkan'],
        ],
      },
    },
    knowledgeUnlocked:
      'Optimal Result: 44 Gold Coins diperoleh dari kombinasi 8 kapal kecil dan 4 kapal besar!',
  },

  // MISSION 12
  {
    id: 12,
    chapterId: 5,
    title: 'Mission 12 — The Final Strategy',
    subtitle: 'Tantangan terakhir tanpa petunjuk melawan Raja Aurelius!',
    leadCharacter: 'aurelius',
    rewardCoins: 150,
    dialogue: [
      {
        speaker: 'aurelius',
        text: 'Kalian pikir bisa mengalahkan kerajaanku hanya dengan beberapa kapal?',
      },
      {
        speaker: 'captain',
        text: 'Kami tidak hanya membawa kapal. Kami membawa strategi.',
      },
      {
        speaker: 'aurelius',
        text: 'Kalau begitu, buktikan bahwa kalian mampu membuat keputusan terbaik tanpa petunjuk kru-mu!',
      },
    ],
    optimizationStage: {
      title: 'Tantangan Terakhir Raja Aurelius (Mode Mandiri)',
      speaker: 'aurelius',
      scenario:
        'Untuk menembus blokade kerajaan, kru menyusun Kapal Penyerang (x) dan Kapal Pengawal (y). Setiap Kapal Penyerang memerlukan 3 peti mesiu & 1 meriam (kekuatan 5 poin). Setiap Kapal Pengawal memerlukan 1 peti mesiu & 2 meriam (kekuatan 4 poin). Persediaan hanya 18 peti mesiu dan 16 meriam. Tentukan model, semua titik pojok, dan kekuatan tempur maksimum!',
      constraints: [
        { id: 'powder', label: '3x + y ≤ 18', a: 3, b: 1, op: '<=', rhs: 18, color: '#C94A38' },
        { id: 'cannon', label: 'x + 2y ≤ 16', a: 1, b: 2, op: '<=', rhs: 16, color: '#D49A2A' },
      ],
      objective: { px: 5, py: 4, goal: 'max' },
      maxAxis: 20,
      xLabel: 'Kapal Penyerang (x)',
      yLabel: 'Kapal Pengawal (y)',
      unitLabel: 'Poin Kekuatan',
      expectedCorners: [
        { x: 0, y: 0 },
        { x: 6, y: 0 },
        { x: 4, y: 6 },
        { x: 0, y: 8 },
      ],
      optimalPoint: { x: 4, y: 6 },
      optimalValue: 44,
      buildModelFirst: true,
      independentMode: true,
      resourceTable: {
        headers: ['Sumber Daya / Skor', 'Kapal Penyerang (x)', 'Kapal Pengawal (y)', 'Persediaan'],
        rows: [
          ['Mesiu (peti)', '3', '1', '18'],
          ['Meriam (unit)', '1', '2', '16'],
          ['Kekuatan Tempur', '5', '4', 'Maksimumkan'],
        ],
      },
    },
    knowledgeUnlocked:
      'Kemenangan Mutlak! Dengan 4 Kapal Penyerang dan 6 Kapal Pengawal, kekuatan tempur mencapai maksimum 44 poin dan armada Raja Aurelius berhasil ditumbangkan!',
  },
];
